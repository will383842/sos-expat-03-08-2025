"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouting = getRouting;
exports.isRateLimited = isRateLimited;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
async function getRouting(eventId) {
    var _a, _b, _c;
    const conf = await db.collection('message_routing').doc('config').get();
    const routing = (_b = (_a = conf.data()) === null || _a === void 0 ? void 0 : _a.routing) !== null && _b !== void 0 ? _b : {};
    return (_c = routing[eventId]) !== null && _c !== void 0 ? _c : { channels: ['email'], rate_limit_h: 0 };
}
async function isRateLimited(uid, eventId, hours) {
    if (!hours || hours <= 0)
        return false;
    const since = firestore_1.Timestamp.fromMillis(Date.now() - hours * 3600 * 1000);
    const snap = await db.collection('message_deliveries')
        .where('uid', '==', uid)
        .where('eventId', '==', eventId)
        .where('createdAt', '>=', since)
        .where('status', 'in', ['queued', 'sent', 'delivered'])
        .limit(1).get();
    return !snap.empty;
}
//# sourceMappingURL=routing.js.map