"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplate = getTemplate;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
async function getTemplate(locale, eventId) {
    var _a;
    const col = db.collection('message_templates').doc(locale);
    let doc = await col.collection('items').doc(eventId).get();
    if (!doc.exists && locale !== 'en') {
        doc = await db.collection('message_templates').doc('en').collection('items').doc(eventId).get();
    }
    if (!doc.exists)
        return null;
    const defaultsSnap = await col.collection('_meta').doc('defaults').get();
    return Object.assign(Object.assign({}, doc.data()), { defaults: (_a = defaultsSnap.data()) !== null && _a !== void 0 ? _a : {} });
}
//# sourceMappingURL=templates.js.map