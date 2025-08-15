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
exports.initPricing = void 0;
// firebase/functions/src/initPricing.ts
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.initPricing = (0, https_1.onCall)({
    region: 'europe-west1',
    memory: '128MiB',
    timeoutSeconds: 30,
}, async (request) => {
    var _a;
    // Petite sécurité : besoin d’être connecté ET d’envoyer {confirm:true}
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentification requise.');
    }
    if (!((_a = request.data) === null || _a === void 0 ? void 0 : _a.confirm)) {
        throw new https_1.HttpsError('failed-precondition', "Passez { confirm: true } pour confirmer l'initialisation.");
    }
    const db = admin.firestore();
    // ⚠️ Jamais de “commission” : uniquement “frais de mise en relation”
    const pricing = {
        lawyer: {
            eur: { totalAmount: 49, connectionFeeAmount: 19, providerAmount: 30, duration: 25, currency: 'eur' },
            usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 30, duration: 25, currency: 'usd' },
        },
        expat: {
            eur: { totalAmount: 19, connectionFeeAmount: 9, providerAmount: 10, duration: 35, currency: 'eur' },
            usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 10, duration: 35, currency: 'usd' },
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(), // ✅ timestamp serveur auto
        updatedBy: 'admin_init',
    };
    await db.collection('admin_config').doc('pricing').set(pricing, { merge: true });
    return { success: true, message: 'admin_config/pricing initialisé.' };
});
//# sourceMappingURL=initPricing.js.map