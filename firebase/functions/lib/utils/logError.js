"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = logError;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
async function logError(context, error) {
    let message = 'Erreur inconnue';
    let stack = '';
    if (error instanceof Error) {
        message = error.message;
        stack = error.stack || '';
    }
    else {
        message = JSON.stringify(error);
    }
    await db.collection('error_logs').add({
        context,
        message,
        stack,
        createdAt: new Date()
    });
}
//# sourceMappingURL=logError.js.map