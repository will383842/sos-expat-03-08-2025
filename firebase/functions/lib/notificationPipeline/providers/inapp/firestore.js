"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeInApp = writeInApp;
const firebase_1 = require("../../../utils/firebase");
async function writeInApp(params) {
    const { uid, title, body, eventId, data = {}, action } = params;
    const inappMessage = {
        uid,
        eventId: eventId || null,
        title,
        body,
        action: action || null,
        data,
        createdAt: new Date(),
        readAt: null,
        read: false
    };
    const docRef = await firebase_1.db.collection("inapp_notifications").add(inappMessage);
    console.log(`InApp message created: ${docRef.id} for user ${uid}`);
    return {
        messageId: docRef.id,
        uid
    };
}
//# sourceMappingURL=firestore.js.map