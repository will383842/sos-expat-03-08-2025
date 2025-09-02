"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTemplate = getTemplate;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
async function getTemplate(locale, eventId) {
    var _a, _b, _c, _d, _e;
    const col = db.collection('message_templates').doc(locale);
    let doc = await col.collection('items').doc(eventId).get();
    // Fallback vers 'en' si le template n'existe pas dans la locale demandée
    if (!doc.exists && locale !== 'en') {
        doc = await db.collection('message_templates').doc('en').collection('items').doc(eventId).get();
    }
    if (!doc.exists) {
        const legacy = await db.collection('message_templates').doc(eventId).get();
        if (legacy.exists) {
            const data = legacy.data() || {};
            const content = String(data.content || data.text || '');
            return {
                email: { enabled: true, subject: data.subject || 'Nouvelle demande', html: data.html || '', text: data.text || content },
                sms: { enabled: true, text: content },
                whatsapp: { enabled: false, templateName: '' },
            };
        }
        return null;
    }
    const templateData = doc.data() || {};
    // ADAPTATEUR : Convertir l'ancien format vers le nouveau
    // Tes JSON actuels ont la structure : { "email": { "subject": "...", "html": "..." } }
    // On doit les convertir vers : { "email": { "enabled": true, "subject": "...", "html": "..." } }
    return {
        _meta: templateData._meta,
        email: templateData.email ? {
            enabled: ((_a = templateData.channels) === null || _a === void 0 ? void 0 : _a.email) !== false, // Par défaut enabled si pas spécifié
            subject: templateData.email.subject || "",
            html: templateData.email.html,
            text: templateData.email.text
        } : undefined,
        sms: templateData.sms ? {
            enabled: ((_b = templateData.channels) === null || _b === void 0 ? void 0 : _b.sms) !== false,
            text: templateData.sms.text || templateData.sms.message || ""
        } : undefined,
        whatsapp: templateData.whatsapp ? {
            enabled: ((_c = templateData.channels) === null || _c === void 0 ? void 0 : _c.whatsapp) !== false,
            templateName: templateData.whatsapp.twilio_template_name || "",
            params: templateData.whatsapp.params || []
        } : undefined,
        push: templateData.push ? {
            enabled: ((_d = templateData.channels) === null || _d === void 0 ? void 0 : _d.push) !== false,
            title: templateData.push.title || "",
            body: templateData.push.body || "",
            deeplink: templateData.push.deeplink
        } : undefined,
        inapp: templateData.inapp ? {
            enabled: ((_e = templateData.channels) === null || _e === void 0 ? void 0 : _e.inapp) !== false,
            title: templateData.inapp.title || "",
            body: templateData.inapp.body || templateData.inapp.message || ""
        } : undefined
    };
}
//# sourceMappingURL=templates.js.map