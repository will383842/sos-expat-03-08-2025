"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = exports.scheduledBackup = exports.manualBackup = void 0;
// functions/src/backup.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const googleapis_1 = require("googleapis");
const storage_1 = require("@google-cloud/storage");
admin.initializeApp();
const db = admin.firestore();
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || "sos-expat-backup"; // <-- ton bucket de backup
const STORAGE_SOURCE_BUCKET = `${PROJECT_ID}.appspot.com`; // <-- bucket Firebase Storage source
const RETENTION_COUNT = 6; // <-- garder 6 sauvegardes
const p = (n) => `${n}`.padStart(2, "0");
function stamp() {
    const d = new Date();
    const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return { date, ts };
}
/** ----------------- FIRESTORE EXPORT (officiel) ----------------- */
async function exportFirestore(prefixUri) {
    const auth = await googleapis_1.google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/datastore"] });
    const firestore = googleapis_1.google.firestore({ version: "v1", auth });
    const name = `projects/${PROJECT_ID}/databases/(default)`;
    await firestore.projects.databases.exportDocuments({
        name,
        requestBody: { outputUriPrefix: prefixUri } // tout Firestore (pas seulement des collections)
    });
    return `${prefixUri}/`;
}
/** ----------------- AUTH EXPORT (JSON de tous les users) ----------------- */
async function exportAuthUsers(gcsPath) {
    const storage = new storage_1.Storage();
    const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
    const filePath = rest.join("/") || "auth/users.json";
    const file = storage.bucket(bucketName).file(filePath);
    const users = [];
    let next;
    do {
        const page = await admin.auth().listUsers(1000, next);
        users.push(...page.users.map(u => ({
            uid: u.uid,
            email: u.email,
            phoneNumber: u.phoneNumber,
            displayName: u.displayName,
            disabled: u.disabled,
            providerData: u.providerData,
            customClaims: u.customClaims,
            metadata: u.metadata
        })));
        next = page.pageToken;
    } while (next);
    await file.save(JSON.stringify({ count: users.length, users }, null, 2), { contentType: "application/json" });
    return `gs://${bucketName}/${filePath}`;
}
/** ----------------- STORAGE COPY (Storage Transfer Service) ----------------- */
async function runStorageTransfer(prefixForThisBackup) {
    // Besoin: Storage Transfer API + rôle Storage Transfer Admin
    const auth = await googleapis_1.google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const sts = googleapis_1.google.storagetransfer({ version: "v1", auth });
    const start = new Date(); // démarrer maintenant
    const requestBody = {
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
    };
    const res = await sts.transferJobs.create({ requestBody });
    return res.data.name || ""; // ex: transferJobs/123456789
}
/** ----------------- FUNCTIONS SNAPSHOT (liste JSON) ----------------- */
async function exportFunctionsList(gcsPath) {
    const auth = await googleapis_1.google.auth.getClient({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const cf = googleapis_1.google.cloudfunctions({ version: "v1", auth }); // OK pour Gen1/Gen2 en "list"
    const parent = `projects/${PROJECT_ID}/locations/-`;
    const resp = await cf.projects.locations.functions.list({ parent });
    const list = (resp.data.functions || []).map(f => {
        var _a, _b;
        return ({
            name: f.name,
            runtime: f.runtime,
            entryPoint: f.entryPoint,
            region: (_b = (_a = f.name) === null || _a === void 0 ? void 0 : _a.split("/locations/")[1]) === null || _b === void 0 ? void 0 : _b.split("/")[0],
            httpsTrigger: !!f.httpsTrigger,
            eventTrigger: f.eventTrigger || null,
            updateTime: f.updateTime
        });
    });
    const storage = new storage_1.Storage();
    const [bucketName, ...rest] = gcsPath.replace("gs://", "").split("/");
    const filePath = rest.join("/") || "functions/list.json";
    const file = storage.bucket(bucketName).file(filePath);
    await file.save(JSON.stringify({ count: list.length, functions: list }, null, 2), { contentType: "application/json" });
    return `gs://${bucketName}/${filePath}`;
}
/** ----------------- RÉTENTION : garder N sauvegardes ----------------- */
async function pruneOldBackups(retention) {
    const storage = new storage_1.Storage();
    const snap = await db.collection("backups").orderBy("createdAt", "desc").get();
    const docs = snap.docs;
    if (docs.length <= retention)
        return;
    for (const d of docs.slice(retention)) {
        const art = (d.get("artifacts") || {});
        for (const v of Object.values(art)) {
            if (typeof v === "string" && v.startsWith("gs://")) {
                const [bucketName, ...pathParts] = v.replace("gs://", "").split("/");
                const prefix = pathParts.join("/");
                if (bucketName && prefix) {
                    await storage.bucket(bucketName).deleteFiles({ prefix, force: true }).catch(() => { });
                }
            }
        }
        await d.ref.delete().catch(() => { });
    }
}
/** ----------------- PIPELINE DE SAUVEGARDE COMPLÈTE ----------------- */
async function runBackupInternal(type, createdBy) {
    const { date, ts } = stamp();
    const prefix = `${date}/${ts}`;
    const base = `gs://${BACKUP_BUCKET}/app/${prefix}`;
    const docRef = await db.collection("backups").add({
        type,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy
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
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await docRef.update({
            status: "failed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: errorMessage
        });
        throw err;
    }
}
/** ----------------- FONCTIONS EXPOSÉES ----------------- */
// 1) Bouton "Sauvegarder maintenant" (depuis ton admin)
exports.manualBackup = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Connexion requise.");
    }
    // Vérifier les permissions admin (optionnel)
    const claims = context.auth.token;
    if (!claims.admin && !claims.isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Droits administrateur requis.");
    }
    return await runBackupInternal("manual", context.auth.uid);
});
// 2) Pour l'automatique (Scheduler OU scheduler Firebase)
exports.scheduledBackup = functions.https.onRequest(async (_req, res) => {
    try {
        await runBackupInternal("automatic", "system");
        res.status(200).send("ok");
    }
    catch (e) {
        const errorMessage = e instanceof Error ? e.message : "error";
        res.status(500).send(errorMessage);
    }
});
// 3) Fonction pour lister les sauvegardes (optionnel)
exports.listBackups = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Connexion requise.");
    }
    const claims = context.auth.token;
    if (!claims.admin && !claims.isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Droits administrateur requis.");
    }
    try {
        const limit = (data === null || data === void 0 ? void 0 : data.limit) || 10;
        const snap = await db.collection("backups")
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        const backups = snap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { backups };
    }
    catch (_a) {
        throw new functions.https.HttpsError("internal", "Erreur lors de la récupération des sauvegardes.");
    }
});
//# sourceMappingURL=backup.js.map