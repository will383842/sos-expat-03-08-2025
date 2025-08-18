const admin = require("firebase-admin");
const functions = require("firebase-functions");
const { google } = require("googleapis");
const { Storage } = require("@google-cloud/storage");

admin.initializeApp();
const db = admin.firestore();

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || "sos-expat-backup"; // <- ton bucket
const STORAGE_SOURCE_BUCKET = `${PROJECT_ID}.appspot.com`;
const RETENTION_COUNT = 6;

const p = (n) => String(n).padStart(2, "0");
function stamp() {
  const d = new Date();
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return { date, ts };
}

// -------- FIRESTORE (export officiel) --------
async function exportFirestore(prefixUri) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/datastore"] });
  const firestore = google.firestore({ version: "v1", auth });
  const name = `projects/${PROJECT_ID}/databases/(default)`;
  await firestore.projects.databases.exportDocuments({ name, requestBody: { outputUriPrefix: prefixUri } });
  return `${prefixUri}/`;
}

// -------- AUTH (JSON de tous les users) --------
async function exportAuthUsers(gcsPath) {
  const storage = new Storage();
  const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
  const filePath = rest.join("/") || "auth/users.json";
  const file = storage.bucket(bucketName).file(filePath);

  const users = [];
  let next;
  do {
    const page = await admin.auth().listUsers(1000, next);
    users.push(...page.users.map(u => ({
      uid: u.uid, email: u.email, phoneNumber: u.phoneNumber, displayName: u.displayName,
      disabled: u.disabled, providerData: u.providerData, customClaims: u.customClaims, metadata: u.metadata
    })));
    next = page.pageToken;
  } while (next);

  await file.save(JSON.stringify({ count: users.length, users }, null, 2), { contentType: "application/json" });
  return `gs://${bucketName}/${filePath}`;
}

// -------- STORAGE (copie via Storage Transfer Service) --------
async function runStorageTransfer(prefixForThisBackup) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const sts = google.storagetransfer({ version: "v1", auth });

  const start = new Date();
  const req = {
    requestBody: {
      projectId: PROJECT_ID,
      transferSpec: {
        gcsDataSource: { bucketName: STORAGE_SOURCE_BUCKET },
        gcsDataSink: { bucketName: BACKUP_BUCKET, path: `app/${prefixForThisBackup}/storage/` },
        transferOptions: { overwriteObjectsAlreadyExistingInSink: true }
      },
      schedule: { scheduleStartDate: { year: start.getFullYear(), month: start.getMonth() + 1, day: start.getDate() } },
      status: "ENABLED",
      description: `backup-${prefixForThisBackup}`
    }
  };
  const res = await sts.transferJobs.create(req);
  return res.data.name || "";
}

// -------- FUNCTIONS (snapshot JSON) --------
async function exportFunctionsList(gcsPath) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const cf = google.cloudfunctions({ version: "v1", auth });

  const parent = `projects/${PROJECT_ID}/locations/-`;
  const resp = await cf.projects.locations.functions.list({ parent });
  const list = (resp.data.functions || []).map(f => ({
    name: f.name, runtime: f.runtime, entryPoint: f.entryPoint,
    region: f.name && f.name.split("/locations/")[1] ? f.name.split("/locations/")[1].split("/")[0] : null,
    httpsTrigger: !!f.httpsTrigger, eventTrigger: f.eventTrigger || null, updateTime: f.updateTime
  }));

  const storage = new Storage();
  const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
  const filePath = rest.join("/") || "functions/list.json";
  const file = storage.bucket(bucketName).file(filePath);
  await file.save(JSON.stringify({ count: list.length, functions: list }, null, 2), { contentType: "application/json" });
  return `gs://${bucketName}/${filePath}`;
}

// -------- Rétention --------
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
          await storage.bucket(bucketName).deleteFiles({ prefix, force: true }).catch(() => {});
        }
      }
    }
    await d.ref.delete().catch(() => {});
  }
}

// -------- Pipeline --------
async function runBackupInternal(type, createdBy) {
  const { date, ts } = stamp();
  const prefix = `${date}/${ts}`;
  const base = `gs://${BACKUP_BUCKET}/app/${prefix}`;

  const docRef = await db.collection("backups").add({
    type, status: "pending", createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy
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
      artifacts
    });

    await pruneOldBackups(RETENTION_COUNT);
    return { ok: true, artifacts };
  } catch (err) {
    await docRef.update({
      status: "failed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: (err && err.message) || String(err)
    });
    throw err;
  }
}

// -------- Fonctions exportées --------
exports.startBackup = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Connexion requise.");
  const claims = context.auth.token || {};
  if (claims.role !== "admin") throw new functions.https.HttpsError("permission-denied", "Admin requis.");
  return await runBackupInternal("manual", context.auth.uid);
});

exports.scheduledBackup = functions.https.onRequest(async (_req, res) => {
  try {
    await runBackupInternal("automatic", "system");
    res.status(200).send("ok");
  } catch (e) {
    res.status(500).send((e && e.message) || "error");
  }
});

// -------- Test simple (écrit un fichier dans ton bucket) --------
exports.testBackup = functions.https.onRequest(async (_req, res) => {
  try {
    const storage = new Storage();
    const file = storage.bucket(BACKUP_BUCKET).file("test.txt");
    await file.save("Hello SOS Expat!", { contentType: "text/plain" });
    res.status(200).send(`Test écrit dans gs://${BACKUP_BUCKET}/test.txt`);
  } catch (err) {
    res.status(500).send((err && err.message) || "Erreur testBackup");
  }
});
