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
exports.restoreFromBackup = exports.startBackupHttp = exports.nightlyBackup = exports.listBackups = exports.manualBackup = void 0;
// functions/src/backup.ts
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const storage_1 = require("@google-cloud/storage");
const https_1 = require("firebase-functions/v2/https");
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
// 1) Fonction v2 pour backup manuel depuis l'admin
const _startBackup = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    // Vérifier les permissions admin
    const userDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Droits administrateur requis.');
    }
    return await runBackupInternal('manual', request.auth.uid);
});
// 2) Fonction v2 pour backup manuel (remplace la v1) - EXPORTED
exports.manualBackup = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Connexion requise.");
    }
    // Vérifier les permissions admin
    const userDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
        throw new https_1.HttpsError("permission-denied", "Droits administrateur requis.");
    }
    return await runBackupInternal("manual", request.auth.uid);
});
// 3) Pour l'automatique (Scheduler) - v2
const _scheduledBackup = (0, https_1.onRequest)(async (req, res) => {
    var _a;
    // Vérifier que la requête vient du scheduler (optionnel - vérifier headers ou token)
    const authHeader = req.get('Authorization');
    if (((_a = req.get('User-Agent')) === null || _a === void 0 ? void 0 : _a.includes('Google-Cloud-Scheduler')) || (authHeader === null || authHeader === void 0 ? void 0 : authHeader.includes('Bearer'))) {
        try {
            await runBackupInternal("automatic", "system");
            res.status(200).send("Backup completed successfully");
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
            console.error('Scheduled backup failed:', errorMessage);
            res.status(500).send(`Backup failed: ${errorMessage}`);
        }
    }
    else {
        res.status(403).send("Unauthorized - Scheduler only");
    }
});
// 4) Fonction pour lister les sauvegardes - EXPORTED
exports.listBackups = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    // Vérifier les permissions admin
    const userDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Droits administrateur requis.');
    }
    const { limit } = (request.data || {});
    const snap = await admin.firestore()
        .collection('backups')
        .orderBy('createdAt', 'desc')
        .limit(typeof limit === 'number' ? limit : 20)
        .get();
    return {
        backups: snap.docs.map(d => {
            var _a, _b, _c, _d, _e, _f;
            return (Object.assign(Object.assign({ id: d.id }, d.data()), { createdAt: ((_c = (_b = (_a = d.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || null, completedAt: ((_f = (_e = (_d = d.data().completedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || null }));
        })
    };
});
// === Reduced public surface ===
// Keep only: nightlyBackup, startBackupHttp, restoreFromBackup
exports.nightlyBackup = (0, https_1.onRequest)({ region: 'europe-west1', memory: '256MiB', cpu: 0.25, maxInstances: 1, minInstances: 0, concurrency: 1 }, async (req, res) => {
    try {
        await _scheduledBackup(req, res);
    }
    catch (e) {
        console.error('nightlyBackup failed', e);
        res.status(500).json({ ok: false, error: e === null || e === void 0 ? void 0 : e.message });
    }
});
exports.startBackupHttp = (0, https_1.onRequest)({ region: 'europe-west1', memory: '256MiB', cpu: 0.25, maxInstances: 1, minInstances: 0, concurrency: 1 }, async (req, res) => {
    try {
        const r = await _startBackup({ auth: { uid: 'http' } });
        res.json(r);
    }
    catch (e) {
        console.error('startBackupHttp failed', e);
        res.status(500).json({ ok: false, error: e === null || e === void 0 ? void 0 : e.message });
    }
});
exports.restoreFromBackup = (0, https_1.onCall)({ region: 'europe-west1', memory: '256MiB', cpu: 0.25, maxInstances: 1, minInstances: 0, concurrency: 1 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    return { ok: false, message: 'restoreFromBackup placeholder. Implement restore logic as needed.' };
});
//# sourceMappingURL=backup.js.map