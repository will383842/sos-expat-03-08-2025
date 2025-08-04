"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logNotification = logNotification;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
async function logNotification(data) {
    await db.collection('notification_logs').add(Object.assign(Object.assign({}, data), { createdAt: new Date() }));
}
//# sourceMappingURL=logNotification.js.map