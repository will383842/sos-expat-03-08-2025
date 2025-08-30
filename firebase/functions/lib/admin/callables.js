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
exports.admin_templates_seed = void 0;
// src/admin/callables.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
// ⚠️ Pas de setGlobalOptions ici (il est unique dans src/index.ts)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = (0, firestore_1.getFirestore)();
exports.admin_templates_seed = (0, https_1.onCall)(async (_req) => {
    var _a, _b;
    const dir = path.join(__dirname, "..", "assets");
    // Vérification basique de présence des fichiers
    const routingPath = path.join(dir, "sos-expat-message-routing.json");
    const frPath = path.join(dir, "sos-expat-message-templates-fr.json");
    const enPath = path.join(dir, "sos-expat-message-templates-en.json");
    if (![routingPath, frPath, enPath].every((p) => fs.existsSync(p))) {
        throw new Error(`Fichiers manquants dans /assets. Requis: 
- ${path.basename(routingPath)}
- ${path.basename(frPath)}
- ${path.basename(enPath)}`);
    }
    const routing = JSON.parse(fs.readFileSync(routingPath, "utf8"));
    const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    // ROUTING
    await db
        .collection("message_routing")
        .doc("config")
        .set({
        version: (_a = routing.version) !== null && _a !== void 0 ? _a : 1,
        routing: (_b = routing.routing) !== null && _b !== void 0 ? _b : routing,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    const writeLocale = async (locale, payload) => {
        var _a;
        const root = db.collection("message_templates").doc(locale);
        // _meta/defaults
        if (!Array.isArray(payload) && payload.defaults) {
            await root
                .collection("_meta")
                .doc("defaults")
                .set(Object.assign(Object.assign({}, payload.defaults), { updatedAt: firestore_1.FieldValue.serverTimestamp() }), { merge: true });
        }
        const list = Array.isArray(payload)
            ? payload
            : ((_a = payload.templates) !== null && _a !== void 0 ? _a : []);
        // Écriture en lot (batch) pour performance
        const batch = db.batch();
        for (const t of list) {
            if (!(t === null || t === void 0 ? void 0 : t.id))
                continue;
            batch.set(root.collection("items").doc(String(t.id)), Object.assign(Object.assign({}, t), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
        }
        await batch.commit();
    };
    await writeLocale("fr-FR", fr);
    await writeLocale("en", en);
    return { ok: true };
});
//# sourceMappingURL=callables.js.map