"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInApp = sendInApp;
const firebase_1 = require("../../../utils/firebase");
async function sendInApp(uid, title, body, data) {
    await firebase_1.db.collection("inapp_notifications").add({
        uid,
        title,
        body,
        data: data || {},
        createdAt: new Date(),
        read: false
    });
}
//# sourceMappingURL=firestore.js.map