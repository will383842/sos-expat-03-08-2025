// ====== Dépendances ======
const admin = require("firebase-admin");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");
const { Storage } = require("@google-cloud/storage");

// ====== Init Firebase Admin ======
admin.initializeApp();
const db = admin.firestore();

// ====== Secrets ======
const BACKUP_CRON_TOKEN = defineSecret("BACKUP_CRON_TOKEN");

// ====== Config ======
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FUNCTIONS_PROJECT_ID;

const BACKUP_BUCKET = process.env.BACKUP_BUCKET || "sos-expat-backup"; // bucket Europe (europe-west1)
// index.js
const STORAGE_SOURCE_BUCKET = "sos-urgently-ac307.firebasestorage.app";
const RETENTION_COUNT = 6; // garder 6 sauvegardes

// ====== Scheduler (config) ======
const SCHEDULER_JOB_ID = "backup-nightly";
const SCHEDULER_REGION = "europe-west1";
const SCHEDULER_PARENT = `projects/${PROJECT_ID}/locations/${SCHEDULER_REGION}`;
function getStartBackupHttpUrl() {
  return `https://${SCHEDULER_REGION}-${PROJECT_ID}.cloudfunctions.net/startBackupHttp`;
}

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
        gcsDataSource: { bucketName: STORAGE_SOURCE_BUCKET }, // source us-central1
        gcsDataSink: {
          bucketName: BACKUP_BUCKET,
          path: `app/${prefixForThisBackup}/storage/`,
        }, // destination Europe
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

// ====== Export liste des Functions ======
async function exportFunctionsList(gcsPath) {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const cf = google.cloudfunctions({ version: "v1", auth });

  const parent = `projects/${PROJECT_ID}/locations/-`;
  const resp = await cf.projects.locations.functions.list({ parent });
  const list = (resp.data.functions || []).map((f) => ({
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
  }));

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

    // ✅ Ajout de prefix dans le document Firestore
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

// ====== Fonctions exportées ======

// Test HTTP: écrit test.txt dans le bucket Europe
exports.testBackup = onRequest({ region: "europe-west1" }, async (_req, res) => {
  try {
    const storage = new Storage();
    const file = storage.bucket(BACKUP_BUCKET).file("test.txt");
    await file.save("Hello SOS Expat!", { contentType: "text/plain" });
    res.status(200).send(`Test écrit dans gs://${BACKUP_BUCKET}/test.txt`);
  } catch (err) {
    res.status(500).send((err && err.message) || "Erreur testBackup");
  }
});

// Sauvegarde manuelle (callable, côté admin)
exports.startBackup = onCall({ region: "europe-west1" }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
  const claims = req.auth.token || {};
  if (claims.role !== "admin")
    throw new HttpsError("permission-denied", "Admin requis.");
  return await runBackupInternal("manual", req.auth.uid);
});

// Sauvegarde planifiée fixe (fallback à 03:00 Europe/Paris)
exports.nightlyBackup = onSchedule(
  { schedule: "0 3 * * *", timeZone: "Europe/Paris", region: "europe-west1" },
  async () => {
    await runBackupInternal("automatic", "scheduler-onSchedule");
  }
);

// HTTP déclenché par Cloud Scheduler (horaire modifiable)
exports.startBackupHttp = onRequest(
  { region: "europe-west1", secrets: [BACKUP_CRON_TOKEN] },
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
exports.getBackupSchedule = onCall({ region: "europe-west1" }, async (req) => {
  if (!req.auth || (req.auth.token?.role !== "admin"))
    throw new HttpsError("permission-denied", "Admin requis.");
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const cs = google.cloudscheduler({ version: "v1", auth });
  try {
    const { data } = await cs.projects.locations.jobs.get({
      name: `${SCHEDULER_PARENT}/jobs/${SCHEDULER_JOB_ID}`,
    });
    return {
      schedule: data.schedule || null,
      timeZone: data.timeZone || "Europe/Paris",
      uri: data.httpTarget?.uri || null,
    };
  } catch {
    return { schedule: null, timeZone: "Europe/Paris", uri: null };
  }
});

// Créer/modifier le planning (Cloud Scheduler)
exports.updateBackupSchedule = onCall(
  { region: "europe-west1", secrets: [BACKUP_CRON_TOKEN] },
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

    const body = {
      name: `${SCHEDULER_PARENT}/jobs/${SCHEDULER_JOB_ID}`,
      schedule: cron,
      timeZone,
      httpTarget: {
        uri: getStartBackupHttpUrl(),
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
        parent: SCHEDULER_PARENT,
        requestBody: body,
      });
    }
    return { ok: true };
  }
);

// Restaurer depuis un backup
exports.restoreFromBackup = onCall({ region: "europe-west1" }, async (req) => {
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
          schedule: {
            scheduleStartDate: {
              year: start.getFullYear(),
              month: start.getMonth() + 1,
              day: start.getDate(),
            },
          },
          status: "ENABLED",
          description: `restore-storage-${prefix}`,
        },
      })
    ).data.name;
  }

  // Auth restore (basique : recrée comptes + génère lien de réinitialisation)
  if (parts.auth === "basic") {
    const storage = new Storage();
    const file = storage
      .bucket(BACKUP_BUCKET)
      .file(`app/${prefix}/auth/users.json`);
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
});

// ====== Suppression d’un backup (fichiers + document) ======
exports.deleteBackup = onCall({ region: "europe-west1" }, async (req) => {
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
});

// ====== (Optionnel) Donner admin au compte connecté via secret (supprime après usage) ======
exports.grantAdminIfToken = onCall(
  { region: "europe-west1", secrets: [BACKUP_CRON_TOKEN] },
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
Notes d’exploitation (en commentaires pour ne pas casser le fichier JS)
================================================================================

# Secret pour sécuriser l’appel Scheduler -> startBackupHttp
# (choisir une valeur longue et privée)
# firebase functions:secrets:set BACKUP_CRON_TOKEN

# Donner les rôles nécessaires au service account des Functions
# Remplacez le projet par le vôtre si différent.

# gcloud projects add-iam-policy-binding sos-urgently-ac307 \
#   --member="serviceAccount:sos-urgently-ac307@appspot.gserviceaccount.com" \
#   --role="roles/cloudscheduler.admin"

# gcloud projects add-iam-policy-binding sos-urgently-ac307 \
#   --member="serviceAccount:sos-urgently-ac307@appspot.gserviceaccount.com" \
#   --role="roles/datastore.importExportAdmin"

# gcloud projects add-iam-policy-binding sos-urgently-ac307 \
#   --member="serviceAccount:sos-urgently-ac307@appspot.gserviceaccount.com" \
#   --role="roles/storagetransfer.admin"

# Après t’être donné admin via `grantAdminIfToken`, supprime cette callable:
# - Enlève exports.grantAdminIfToken de ce fichier
# - firebase deploy --only functions:backup
*/
