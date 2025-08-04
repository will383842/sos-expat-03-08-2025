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
exports.logCallRecord = logCallRecord;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = (0, firestore_1.getFirestore)();
async function logCallRecord(data) {
    try {
        await db.collection('call_records').add(Object.assign(Object.assign({}, data), { createdAt: admin.firestore.FieldValue.serverTimestamp() // Utiliser serverTimestamp au lieu de new Date()
         }));
        console.log('Call record logged:', data);
    }
    catch (error) {
        console.error('Error logging call record:', error);
    }
}
//# sourceMappingURL=logCallRecord.js.map