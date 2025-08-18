// functions/src/backup.ts
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { google } from "googleapis";
import { Storage } from "@google-cloud/storage";

admin.initializeApp();
const db = admin.firestore();

const PROJECT_ID = process.env.GCLOUD_PROJECT!;
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || "sos-expat-backup";          // <-- ton bucket de backup
const STORAGE_SOURCE_BUCKET = `${PROJECT_ID}.appspot.com`;                      // <-- bucket Firebase Storage source
const RETENTION_COUNT = 6;                                                      // <-- garder 6 sauvegardes

type BackupDoc = {
  type: "manual" | "automatic";
  status: "pending" | "completed" | "failed";
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  createdBy: string;
  artifacts?: Record<string, string>;
  error?: string | null;
};

const p = (n: number) => `${n}`.padStart(2, "0");
function stamp() {
  const d = new Date();
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return { date, ts };
}

/** ----------------- FIRESTORE EXPORT (officiel) ----------------- */
async function exportFirestore(prefixUri: string) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/datastore"] });
  const firestore = google.firestore({ version: "v1", auth });
  const name = `projects/${PROJECT_ID}/databases/(default)`;

  await firestore.projects.databases.exportDocuments({
    name,
    requestBody: { outputUriPrefix: prefixUri }  // tout Firestore (pas seulement des collections)
  });

  return `${prefixUri}/`;
}

/** ----------------- AUTH EXPORT (JSON de tous les users) ----------------- */
async function exportAuthUsers(gcsPath: string) {
  const storage = new Storage();
  const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
  const filePath = rest.join("/") || "auth/users.json";
  const file = storage.bucket(bucketName).file(filePath);

  const users: any[] = [];
  let next: string | undefined;
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

/** ----------------- STORAGE COPY (Storage Transfer Service) ----------------- */
async function runStorageTransfer(prefixForThisBackup: string) {
  // Besoin: Storage Transfer API + rôle Storage Transfer Admin
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const sts = google.storagetransfer({ version: "v1", auth });

  const start = new Date(); // démarrer maintenant
  const request = {
    requestBody: {
      projectId: PROJECT_ID,
      transferSpec: {
        gcsDataSource: { bucketName: STORAGE_SOURCE_BUCKET },
        gcsDataSink: { bucketName: BACKUP_BUCKET, path: `app/${prefixForThisBackup}/storage/` },
        transferOptions: { overwriteObjectsAlreadyExistingInSink: true }
      },
      schedule: {
        scheduleStartDate: { year: start.getFullYear(), month: start.getMonth() + 1, day: start.getDate() }
      },
      status: "ENABLED",
      description: `backup-${prefixForThisBackup}`
    }
  };

  const res = await sts.transferJobs.create(request as any);
  return res.data.name || ""; // ex: transferJobs/123456789
}

/** ----------------- FUNCTIONS SNAPSHOT (liste JSON) ----------------- */
async function exportFunctionsList(gcsPath: string) {
  const auth = await google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const cf = google.cloudfunctions({ version: "v1", auth }); // OK pour Gen1/Gen2 en "list"

  const parent = `projects/${PROJECT_ID}/locations/-`;
  const resp = await cf.projects.locations.functions.list({ parent });
  const list = (resp.data.functions || []).map(f => ({
    name: f.name,
    runtime: f.runtime,
    entryPoint: f.entryPoint,
    region: f.name?.split("/locations/")[1]?.split("/")[0],
    httpsTrigger: !!f.httpsTrigger,
    eventTrigger: f.eventTrigger || null,
    updateTime: f.updateTime
  }));

  const storage = new Storage();
  const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
  const filePath = rest.join("/") || "functions/list.json";
  const file = storage.bucket(bucketName).file(filePath);
  await file.save(JSON.stringify({ count: list.length, functions: list }, null, 2), { contentType: "application/json" });
  return `gs://${bucketName}/${filePath}`;
}

/** ----------------- RÉTENTION : garder N sauvegardes ----------------- */
async function pruneOldBackups(retention: number) {
  const storage = new Storage();
  const snap = await db.collection("backups").orderBy("createdAt", "desc").get();
  const docs = snap.docs;
  if (docs.length <= retention) return;

  for (const d of docs.slice(retention)) {
    const art = (d.get("artifacts") || {}) as Record<string, string>;
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

/** ----------------- PIPELINE DE SAUVEGARDE COMPLÈTE ----------------- */
async function runBackupInternal(type: "manual" | "automatic", createdBy: string) {
  const { date, ts } = stamp();
  const prefix = `${date}/${ts}`;
  const base = `gs://${BACKUP_BUCKET}/app/${prefix}`;

  const docRef = await db.collection("backups").add({
    type, status: "pending", createdAt: admin.firestore.FieldValue.serverTimestamp(), createdBy
  } as BackupDoc);

  const artifacts: Record<string, string> = {};
  try {
    artifacts["firestore"] = await exportFirestore(`${base}/firestore`);
    artifacts["auth"] = await exportAuthUsers(`${base}/auth/users.json`);
    artifacts["functions"] = await exportFunctionsList(`${base}/functions/list.json`);
    artifacts["storageJob"] = await runStorageTransfer(prefix);

    await docRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      artifacts
    } as Partial<BackupDoc>);

    await pruneOldBackups(RETENTION_COUNT);
    return { ok: true, artifacts };
  } catch (err: any) {
    await docRef.update({
      status: "failed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: err?.message || String(err)
    } as Partial<BackupDoc>);
    throw err;
  }
}

/** ----------------- FONCTIONS EXPOSÉES ----------------- */
// 1) Bouton "Sauvegarder maintenant" (depuis ton admin)
export const startBackup = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Connexion requise.");
  const claims = context.auth.token as any;
  if (claims.role !== "admin") throw new functions.https.HttpsError("permission-denied", "Admin requis.");
  return await runBackupInternal("manual", context.auth.uid);
});

// 2) Pour l’automatique (Scheduler OU scheduler Firebase)
export const scheduledBackup = functions.https.onRequest(async (_req, res) => {
  try {
    await runBackupInternal("automatic", "system");
    res.status(200).send("ok");
  } catch (e: any) {
    res.status(500).send(e?.message || "error");
  }
});
