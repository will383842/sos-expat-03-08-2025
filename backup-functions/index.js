// ====== Dépendances ======
const admin = require("firebase-admin");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret, defineString } = require("firebase-functions/params");
console.log('[CFG] STRIPE_MODE =', STRIPE_MODE.value() ?? '(unset)');
const { google } = require("googleapis");
const { Storage } = require("@google-cloud/storage");

// ====== Init Firebase Admin ======
try { admin.initializeApp(); } catch (_) {}
const db = admin.firestore();

// ====== Secrets & Params (Functions v2) ======
const BACKUP_CRON_TOKEN = defineSecret("BACKUP_CRON_TOKEN"); // secret côté Cloud Functions v2
// L’URL réelle de la fonction v2 startBackupHttp (Cloud Run) : à définir après 1er déploiement
// Exemple: "https://startbackuphttp-XXXX-ew.a.run.app"
const START_BACKUP_HTTP_URL = defineString("START_BACKUP_HTTP_URL"); // param configurable (pas un secret)

// ====== Config ======
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FUNCTIONS_PROJECT_ID;

const BACKUP_BUCKET = process.env.BACKUP_BUCKET || "sos-expat-backup"; // bucket Europe (europe-west1)
const STORAGE_SOURCE_BUCKET = `${PROJECT_ID}.appspot.com`; // Source Storage par défaut
const RETENTION_COUNT = 6; // garder 6 sauvegardes

// ====== Outils ======
const p = (n) => String(n).padStart(2, "0");
function stamp() {
  const d = new Date();
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return { date, ts };
}

// ====== Export Firestore ======
async function exportFirestore(prefixUri) {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const firestore = google.firestore({ version: "v1", auth });
  const name = `projects/${PROJECT_ID}/databases/(default)`;
  await firestore.projects.databases.exportDocuments({
    name,
    requestBody: { outputUriPrefix: prefixUri },
  });
  return `${prefixUri}/`;
}

// ====== Export Auth (utilisateurs) ======
async function exportAuthUsers(gcsPath) {
  const storage = new Storage();
  const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
  const filePath = rest.join("/") || "auth/users.json";
  const file = storage.bucket(bucketName).file(filePath);

  const users = [];
  let next;
  do {
    const page = await admin.auth().listUsers(1000, next);
    users.push(
      ...page.users.map((u) => ({
        uid: u.uid,
        email: u.email,
        phoneNumber: u.phoneNumber,
        displayName: u.displayName,
        disabled: u.disabled,
        providerData: u.providerData,
        customClaims: u.customClaims,
        metadata: u.metadata,
      }))
    );
    next = page.pageToken;
  } while (next);

  await file.save(JSON.stringify({ count: users.length, users }, null, 2), {
    contentType: "application/json",
  });
  return `gs://${bucketName}/${filePath}`;
}

// ====== Copie du Storage (via Storage Transfer Service) ======
async function runStorageTransfer(prefixForThisBackup) {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const sts = google.storagetransfer({ version: "v1", auth });

  const start = new Date();
  const req = {
    requestBody: {
      projectId: PROJECT_ID,
      transferSpec: {
        gcsDataSource: { bucketName: STORAGE_SOURCE_BUCKET }, // source: bucket appspot
        gcsDataSink: {
          bucketName: BACKUP_BUCKET,
          path: `app/${prefixForThisBackup}/storage/`,
        }, // destination: BACKUP_BUCKET Europe
        transferOptions: { overwriteObjectsAlreadyExistingInSink: true },
      },
      schedule: {
        scheduleStartDate: {
          year: start.getFullYear(),
          month: start.getMonth() + 1,
          day: start.getDate(),
        },
      },
      status: "ENABLED",
      description: `backup-${prefixForThisBackup}`,
    },
  };
  const res = await sts.transferJobs.create(req);
  return res.data.name || "";
}

// ====== Export liste des Functions (Gen1/Gen2 mix) ======
async function exportFunctionsList(gcsPath) {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const cf = google.cloudfunctions({ version: "v1", auth }); // Gen1
  let list = [];

  try {
    const parent = `projects/${PROJECT_ID}/locations/-`;
    const resp = await cf.projects.locations.functions.list({ parent });
    list = (resp.data.functions || []).map((f) => ({
      name: f.name,
      runtime: f.runtime,
      entryPoint: f.entryPoint,
      region:
        f.name && f.name.includes("/locations/")
          ? f.name.split("/locations/")[1].split("/")[0]
          : null,
      httpsTrigger: !!f.httpsTrigger,
      eventTrigger: f.eventTrigger || null,
      updateTime: f.updateTime,
      gen: "gen1",
    }));
  } catch (_) {
    // ignore
  }

  // Optionnel: appeler Cloud Run Admin API pour Gen2 si besoin (non indispensable ici)

  const storage = new Storage();
  const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
  const filePath = rest.join("/") || "functions/list.json";
  const file = storage.bucket(bucketName).file(filePath);
  await file.save(JSON.stringify({ count: list.length, functions: list }, null, 2), {
    contentType: "application/json",
  });
  return `gs://${bucketName}/${filePath}`;
}

// ====== Rétention (garder N plus récentes) ======
async function pruneOldBackups(retention) {
  const storage = new Storage();
  const snap = await db.collection("backups").orderBy("createdAt", "desc").get();
  const docs = snap.docs;
  if (docs.length <= retention) return;

  for (const d of docs.slice(retention)) {
    const art = d.get("artifacts") || {};
    for (const v of Object.values(art)) {
      if (typeof v === "string" && v.startsWith("gs://")) {
        const [bucketName, ...pathParts] = v.replace("gs://", "").split("/");
        const prefix = pathParts.join("/");
        if (bucketName && prefix) {
          await storage
            .bucket(bucketName)
            .deleteFiles({ prefix, force: true })
            .catch(() => {});
        }
      }
    }
    await d.ref.delete().catch(() => {});
  }
}

// ====== Pipeline principale (une sauvegarde complète) ======
async function runBackupInternal(type, createdBy) {
  const { date, ts } = stamp();
  const prefix = `${date}/${ts}`;
  const base = `gs://${BACKUP_BUCKET}/app/${prefix}`;

  const docRef = await db.collection("backups").add({
    type,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy,
  });

  const artifacts = {};
  try {
    artifacts["firestore"] = await exportFirestore(`${base}/firestore`);
    artifacts["auth"] = await exportAuthUsers(`${base}/auth/users.json`);
    artifacts["functions"] = await exportFunctionsList(`${base}/functions/list.json`);
    artifacts["storageJob"] = await runStorageTransfer(prefix);

    await docRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      artifacts,
      prefix, // on enregistre le préfixe "YYYY-MM-DD/HHMMSS"
    });

    await pruneOldBackups(RETENTION_COUNT);
    return { ok: true, artifacts, prefix };
  } catch (err) {
    await docRef.update({
      status: "failed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: (err && err.message) || String(err),
    });
    throw err;
  }
}

// ====== Fonctions exportées (avec limites CPU/instances pour éviter le quota) ======

// Test HTTP: écrit test.txt dans le bucket Europe
exports.testBackup = onRequest(
  {
    region: "europe-west1",
    availableMemory: "256MiB",
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 30,
  },
  async (_req, res) => {
    try {
      const storage = new Storage();
      const file = storage.bucket(BACKUP_BUCKET).file("test.txt");
      await file.save("Hello SOS Expat!", { contentType: "text/plain" });
      res.status(200).send(`Test écrit dans gs://${BACKUP_BUCKET}/test.txt`);
    } catch (err) {
      res.status(500).send((err && err.message) || "Erreur testBackup");
    }
  }
);

// Sauvegarde manuelle (callable, côté admin)
exports.startBackup = onCall(
  {
    region: "europe-west1",
    availableMemory: "256MiB",
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 60,
  },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
    const claims = req.auth.token || {};
    if (claims.role !== "admin")
      throw new HttpsError("permission-denied", "Admin requis.");
    return await runBackupInternal("manual", req.auth.uid);
  }
);

// Sauvegarde planifiée fixe (fallback à 03:00 Europe/Paris)
exports.nightlyBackup = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    // (pas besoin d'options CPU ici, c'est un job scheduler)
  },
  async () => {
    await runBackupInternal("automatic", "scheduler-onSchedule");
  }
);

// HTTP déclenché par Cloud Scheduler (horaire modifiable)
exports.startBackupHttp = onRequest(
  {
    region: "europe-west1",
    availableMemory: "256MiB",
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 60,
    secrets: [BACKUP_CRON_TOKEN],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") return res.status(405).send("method-not-allowed");
      const token = req.get("x-backup-token") || "";
      if (!token || token !== BACKUP_CRON_TOKEN.value()) {
        return res.status(401).send("unauthorized");
      }
      const out = await runBackupInternal("scheduled-http", "scheduler");
      res.status(200).json(out);
    } catch (e) {
      res.status(500).send((e && e.message) || "error");
    }
  }
);

// Lire le planning actuel (Cloud Scheduler)
exports.getBackupSchedule = onCall(
  {
    region: "europe-west1",
    availableMemory: "256MiB",
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 30,
  },
  async (req) => {
    if (!req.auth || (req.auth.token?.role !== "admin"))
      throw new HttpsError("permission-denied", "Admin requis.");
    const auth = await google.auth.getClient({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const cs = google.cloudscheduler({ version: "v1", auth });
    try {
      const { data } = await cs.projects.locations.jobs.get({
        name: `projects/${PROJECT_ID}/locations/europe-west1/jobs/backup-nightly`,
      });
      return {
        schedule: data.schedule || null,
        timeZone: data.timeZone || "Europe/Paris",
        uri: data.httpTarget?.uri || null,
      };
    } catch {
      return { schedule: null, timeZone: "Europe/Paris", uri: null };
    }
  }
);

// Créer/modifier le planning (Cloud Scheduler)
exports.updateBackupSchedule = onCall(
  {
    region: "europe-west1",
    availableMemory: "256MiB",
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 30,
    secrets: [BACKUP_CRON_TOKEN],
  },
  async (req) => {
    if (!req.auth || (req.auth.token?.role !== "admin"))
      throw new HttpsError("permission-denied", "Admin requis.");
    const { cron, timeZone = "Europe/Paris" } = req.data || {};
    if (!cron || typeof cron !== "string")
      throw new HttpsError("invalid-argument", "cron requis.");

    const auth = await google.auth.getClient({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const cs = google.cloudscheduler({ version: "v1", auth });

    // ✅ Utilise l’URL réelle de la fonction v2, fournie en param START_BACKUP_HTTP_URL
    const uriParam = START_BACKUP_HTTP_URL.value();
    if (!uriParam) {
      // Guide explicite si le param n'est pas encore renseigné
      throw new HttpsError(
        "failed-precondition",
        "Le paramètre START_BACKUP_HTTP_URL n'est pas défini. Récupère l'URL de startBackupHttp après déploiement (console) puis exécute: firebase functions:config:set params.START_BACKUP_HTTP_URL=\"https://...a.run.app\""
      );
    }

    const body = {
      name: `projects/${PROJECT_ID}/locations/europe-west1/jobs/backup-nightly`,
      schedule: cron,
      timeZone,
      httpTarget: {
        uri: uriParam,
        httpMethod: "POST",
        headers: { "x-backup-token": BACKUP_CRON_TOKEN.value() },
      },
    };

    try {
      await cs.projects.locations.jobs.patch({
        name: body.name,
        updateMask: "schedule,timeZone,httpTarget",
        requestBody: body,
      });
    } catch {
      await cs.projects.locations.jobs.create({
        parent: `projects/${PROJECT_ID}/locations/europe-west1`,
        requestBody: body,
      });
    }
    return { ok: true };
  }
);

// Restaurer depuis un backup
exports.restoreFromBackup = onCall(
  {
    region: "europe-west1",
    availableMemory: "512MiB", // un peu plus large
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 20,
    timeoutSeconds: 540, // opérations longues
  },
  async (req) => {
    if (!req.auth || (req.auth.token?.role !== "admin"))
      throw new HttpsError("permission-denied", "Admin requis.");
    const { prefix, parts = { firestore: true, storage: true, auth: "basic" } } =
      req.data || {};
    if (!prefix) throw new HttpsError("invalid-argument", "prefix requis.");

    const base = `gs://${BACKUP_BUCKET}/app/${prefix}`;
    const authClient = await google.auth.getClient({
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/datastore",
      ],
    });

    const out = {};

    // Firestore import
    if (parts.firestore) {
      const firestore = google.firestore({ version: "v1", auth: authClient });
      const name = `projects/${PROJECT_ID}/databases/(default)`;
      const inputUriPrefix = `${base}/firestore`;
      out.firestore = (
        await firestore.projects.databases.importDocuments({
          name,
          requestBody: { inputUriPrefix },
        })
      ).data || true;
    }

    // Storage restore (backup -> appspot)
    if (parts.storage) {
      const sts = google.storagetransfer({ version: "v1", auth: authClient });
      const start = new Date();
      out.storageJob = (
        await sts.transferJobs.create({
          requestBody: {
            projectId: PROJECT_ID,
            transferSpec: {
              gcsDataSource: {
                bucketName: BACKUP_BUCKET,
                path: `app/${prefix}/storage/`,
              },
              gcsDataSink: { bucketName: `${PROJECT_ID}.appspot.com` },
              transferOptions: {
                overwriteObjectsAlreadyExistingInSink: true,
              },
            },
          },
          schedule: {
            scheduleStartDate: {
              year: start.getFullYear(),
              month: start.getMonth() + 1,
              day: start.getDate(),
            },
          },
          status: "ENABLED",
          description: `restore-storage-${prefix}`,
        })
      ).data.name;
    }

    // Auth restore (basique)
    if (parts.auth === "basic") {
      const storage = new Storage();
      const file = storage.bucket(BACKUP_BUCKET).file(`app/${prefix}/auth/users.json`);
      const [buf] = await file.download();
      const parsed = JSON.parse(buf.toString("utf-8"));
      const users = parsed?.users || [];
      for (const u of users) {
        try {
          await admin
            .auth()
            .updateUser(u.uid, {
              email: u.email || undefined,
              phoneNumber: u.phoneNumber || undefined,
              displayName: u.displayName || undefined,
              disabled: u.disabled || false,
            })
            .catch(async () => {
              await admin.auth().createUser({
                uid: u.uid,
                email: u.email,
                phoneNumber: u.phoneNumber,
                displayName: u.displayName,
                disabled: u.disabled || false,
              });
            });
          if (u.email) {
            // Génère un lien de réinitialisation (à envoyer via votre système d’emailing).
            await admin.auth().generatePasswordResetLink(u.email);
          }
        } catch {
          // ignore per-user errors to continue the loop
        }
      }
      out.auth = { restored: users.length, mode: "basic" };
    }

    return { ok: true, ...out };
  }
);

// ====== Suppression d’un backup (fichiers + document) ======
exports.deleteBackup = onCall(
  {
    region: "europe-west1",
    availableMemory: "256MiB",
    availableCpu: "0.167",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 60,
  },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
    const claims = req.auth.token || {};
    if (claims.role !== "admin") throw new HttpsError("permission-denied", "Admin requis.");

    const { docId } = req.data || {};
    if (!docId) throw new HttpsError("invalid-argument", "docId requis.");

    const ref = db.collection("backups").doc(docId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Backup introuvable.");

    const data = snap.data() || {};
    let prefix = data.prefix;

    // Fallback si jamais prefix manquait (anciens backups)
    if (!prefix) {
      const anyVal = data.artifacts?.firestore || data.artifacts?.auth || data.artifacts?.functions;
      const m = typeof anyVal === "string" ? anyVal.match(/app\/([^/]+\/[^/]+)/) : null;
      prefix = m ? m[1] : null;
    }

    // Supprime les fichiers du bucket
    if (prefix) {
      const storage = new Storage();
      await storage.bucket(BACKUP_BUCKET)
        .deleteFiles({ prefix: `app/${prefix}/`, force: true })
        .catch(() => {});
    }

    // Supprime le document Firestore
    await ref.delete();
    return { ok: true };
  }
);

// ====== (Optionnel) Donner admin au compte connecté via secret (supprime après usage) ======
exports.grantAdminIfToken = onCall(
  {
    region: "europe-west1",
    availableMemory: "128MiB",
    availableCpu: "0.083",
    minInstances: 0,
    maxInstances: 1,
    concurrency: 80,
    timeoutSeconds: 30,
    secrets: [BACKUP_CRON_TOKEN],
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Connexion requise.");
    }
    const provided = (req.data && req.data.token) || "";
    const expected = BACKUP_CRON_TOKEN.value();
    if (!expected || provided !== expected) {
      throw new HttpsError("permission-denied", "Token invalide.");
    }

    const uid = req.auth.uid;
    const user = await admin.auth().getUser(uid);
    const oldClaims = user.customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...oldClaims, role: "admin" });
    return { ok: true };
  }
);

/*
================================================================================
Notes d’exploitation
================================================================================

# 1) Déclare les secrets/params (une fois)
firebase functions:secrets:set BACKUP_CRON_TOKEN
firebase functions:config:set params.START_BACKUP_HTTP_URL="https://startbackuphttp-XXXX-ew.a.run.app"

# 2) Important: ne définis PAS BACKUP_CRON_TOKEN dans .env ni firebase.json
#    (sinon: "Secret overlaps non secret environment variable").

# 3) Déploiement conseillé par paquets (évite les pics CPU)
firebase deploy --only functions:startBackupHttp,functions:startBackup,functions:testBackup
firebase deploy --only functions:getBackupSchedule,functions:updateBackupSchedule
firebase deploy --only functions:restoreFromBackup,functions:deleteBackup,functions:grantAdminIfToken
firebase deploy --only functions:nightlyBackup

# 4) Renseigner START_BACKUP_HTTP_URL :
#    - Déploie startBackupHttp
#    - Récupère l’URL affichée (console ou CLI)
#    - Exécute la commande ci-dessus pour la stocker
#    - Puis set le cron via l’UI admin (ou directement updateBackupSchedule).
*/
