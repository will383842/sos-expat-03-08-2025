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
exports.admin_templates_seed = exports.admin_testSend = exports.admin_routing_upsert = exports.admin_routing_get = exports.admin_templates_upsert = exports.admin_templates_get = exports.admin_templates_list = void 0;
// firebase/functions/src/admin/callables.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
/** Autorise UNIQUEMENT les comptes avec claim { admin: true } */
function assertAdmin(ctx) {
    var _a, _b;
    const uid = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const claims = (_b = ctx === null || ctx === void 0 ? void 0 : ctx.auth) === null || _b === void 0 ? void 0 : _b.token;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Auth requise.");
    if (!(claims === null || claims === void 0 ? void 0 : claims.admin))
        throw new https_1.HttpsError("permission-denied", "Réservé aux admins.");
}
/** 1) LISTE les IDs d'événements pour un locale donné */
exports.admin_templates_list = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    assertAdmin(req);
    const { locale } = req.data || {};
    if (!locale || !["fr-FR", "en"].includes(locale)) {
        throw new https_1.HttpsError("invalid-argument", "locale doit être 'fr-FR' ou 'en'.");
    }
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.collection(`message_templates/${locale}/items`).select().get();
    const eventIds = snap.docs.map((d) => d.id).sort();
    return { eventIds };
});
/** 2) GET: récupère un template pour (locale, eventId) */
exports.admin_templates_get = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    assertAdmin(req);
    const { locale, eventId } = req.data || {};
    if (!locale || !eventId) {
        throw new https_1.HttpsError("invalid-argument", "locale et eventId sont requis.");
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
    const doc = await ref.get();
    if (!doc.exists)
        return { exists: false };
    return { exists: true, data: doc.data() };
});
/** 3) UPSERT: crée/merge un template (locale, eventId) */
exports.admin_templates_upsert = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    assertAdmin(req);
    const { locale, eventId, payload } = req.data || {};
    if (!locale || !eventId || !payload) {
        throw new https_1.HttpsError("invalid-argument", "locale, eventId, payload requis.");
    }
    if (payload.email && (!payload.email.subject || !payload.email.html)) {
        throw new https_1.HttpsError("invalid-argument", "email.subject et email.html sont requis quand email est fourni.");
    }
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
    await ref.set(payload, { merge: true });
    return { ok: true };
});
/** 4) ROUTING GET: lit le doc unique message_routing/config */
exports.admin_routing_get = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    assertAdmin(req);
    const db = (0, firestore_1.getFirestore)();
    const ref = db.doc("message_routing/config");
    const doc = await ref.get();
    if (!doc.exists)
        return { exists: false, data: { events: {} } };
    return { exists: true, data: doc.data() };
});
/** 5) ROUTING UPSERT: merge une entrée de routing pour un eventId */
exports.admin_routing_upsert = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    assertAdmin(req);
    const { eventId, channels, rate_limit_h, delays } = req.data || {};
    if (!eventId || !Array.isArray(channels) || channels.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "eventId et channels (non vide) requis.");
    }
    const entry = {
        channels,
        rate_limit_h: Number(rate_limit_h) || 0,
        delays: delays || {}
    };
    const db = (0, firestore_1.getFirestore)();
    await db.doc("message_routing/config").set({ events: { [eventId]: entry } }, { merge: true });
    return { ok: true };
});
/** 6) TEST SEND: crée un doc message_events de test que le worker va traiter */
exports.admin_testSend = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    var _a;
    assertAdmin(req);
    const { locale, eventId, to, context } = req.data || {};
    if (!eventId)
        throw new https_1.HttpsError("invalid-argument", "eventId requis.");
    const loc = (locale && String(locale).toLowerCase().startsWith("fr")) ? "fr-FR" : "en";
    // Construit un contexte minimal avec l'email destination attendu par le provider email
    const ctx = Object.assign(Object.assign({}, context), { user: Object.assign({ email: to || ((_a = context === null || context === void 0 ? void 0 : context.user) === null || _a === void 0 ? void 0 : _a.email) || "test@example.com", preferredLanguage: loc }, context === null || context === void 0 ? void 0 : context.user) });
    const db = (0, firestore_1.getFirestore)();
    await db.collection("message_events").add({
        eventId,
        uid: (context === null || context === void 0 ? void 0 : context.uid) || "ADMIN_TEST",
        locale: loc,
        context: ctx,
        createdAt: new Date().toISOString(),
        source: "admin_testSend"
    });
    return { ok: true };
});
// ---- SEED DES TEMPLATES & ROUTING ----
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
exports.admin_templates_seed = (0, https_1.onCall)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60
}, async (req) => {
    assertAdmin(req); // réutilise la même fonction assertAdmin de ce fichier
    const db = (0, firestore_1.getFirestore)();
    // charge les JSON depuis src/assets
    const assetsDir = path.join(__dirname, "..", "assets");
    const fr = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-templates-fr.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-templates-en.json"), "utf8"));
    const routing = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-routing.json"), "utf8"));
    // upsert routing
    await db.doc("message_routing/config").set(routing, { merge: true });
    // upsert templates FR
    for (const [eventId, payload] of Object.entries(fr.items || {})) {
        await db.doc(`message_templates/fr-FR/items/${eventId}`).set(payload, { merge: true });
    }
    // upsert templates EN
    for (const [eventId, payload] of Object.entries(en.items || {})) {
        await db.doc(`message_templates/en/items/${eventId}`).set(payload, { merge: true });
    }
    return { ok: true, frCount: Object.keys(fr.items || {}).length, enCount: Object.keys(en.items || {}).length };
});
//# sourceMappingURL=callables.js.map