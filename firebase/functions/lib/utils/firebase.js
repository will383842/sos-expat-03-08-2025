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
exports.Timestamp = exports.FieldValue = exports.auth = exports.messaging = exports.storage = exports.db = void 0;
// firebase/functions/src/utils/firebase.ts
const admin = __importStar(require("firebase-admin"));
// Initialiser Firebase Admin une seule fois
if (!admin.apps.length) {
    admin.initializeApp();
}
// Firestore (⚠️ pas de db.settings() ici, ça sera appliqué dans index.ts)
exports.db = admin.firestore();
// Autres services Firebase disponibles via Admin SDK
exports.storage = admin.storage();
exports.messaging = admin.messaging();
exports.auth = admin.auth();
// Constantes utiles pour manipuler Firestore
exports.FieldValue = admin.firestore.FieldValue;
exports.Timestamp = admin.firestore.Timestamp;
//# sourceMappingURL=firebase.js.map