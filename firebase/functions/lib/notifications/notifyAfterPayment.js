"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAfterPayment = void 0;
exports.notifyAfterPaymentInternal = notifyAfterPaymentInternal;
const callScheduler_1 = require("../callScheduler");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
// WhatsApp
const notifyProviderWhatsApp_1 = require("../messages/whatsapp/notifyProviderWhatsApp");
const notifyClientWhatsApp_1 = require("../messages/whatsapp/notifyClientWhatsApp");
// SMS
const notifyProviderSMS_1 = require("../messages/sms/notifyProviderSMS");
const notifyClientSMS_1 = require("../messages/sms/notifyClientSMS");
// VOICE
const notifyProviderVoice_1 = require("../messages/voice/notifyProviderVoice");
const notifyClientVoice_1 = require("../messages/voice/notifyClientVoice");
const db = (0, firestore_1.getFirestore)();
// ✅ Fonction interne (pour usage depuis d'autres Cloud Functions comme les webhooks)
async function notifyAfterPaymentInternal(callId) {
    const callDoc = await db.collection('calls').doc(callId).get();
    const callData = callDoc.data();
    if (!callData)
        return;
    const providerDoc = await db.collection('users').doc(callData.providerId).get();
    const clientDoc = await db.collection('users').doc(callData.clientId).get();
    const provider = providerDoc.data();
    const client = clientDoc.data();
    if (!provider || !client)
        return;
    const messagePayload = {
        title: callData.title,
        language: Array.isArray(callData.clientLanguages) ? callData.clientLanguages[0] : 'fr',
    };
    try {
        // ✅ Envoi des messages au prestataire
        await Promise.all([
            (0, notifyProviderWhatsApp_1.notifyProviderWhatsApp)(provider.phoneNumber, messagePayload),
            (0, notifyProviderSMS_1.notifyProviderSMS)(provider.phoneNumber, messagePayload),
            (0, notifyProviderVoice_1.notifyProviderVoice)(provider.phoneNumber, `SOS Expat : un client vous appelle bientôt. Titre : ${callData.title}. Langue : ${messagePayload.language}.`)
        ]);
        // ✅ Envoi des messages au client
        await Promise.all([
            (0, notifyClientWhatsApp_1.notifyClientWhatsApp)(client.phoneNumber, messagePayload),
            (0, notifyClientSMS_1.notifyClientSMS)(client.phoneNumber, messagePayload),
            (0, notifyClientVoice_1.notifyClientVoice)(client.phoneNumber, `SOS Expat : nous avons notifié le prestataire. Vous serez bientôt appelé.`)
        ]);
        console.log(`✅ Notifications envoyées pour callId: ${callId}`);
    }
    catch (error) {
        console.error(`❌ Erreur lors de l'envoi des notifications pour callId ${callId}:`, error);
        throw error;
    }
    // 🔁 Déclenche l'appel vocal entre client et prestataire dans 5 minutes
    await (0, callScheduler_1.scheduleCallSequence)(callData.sessionId || callId);
}
// ✅ Cloud Function (appelable depuis le frontend)
exports.notifyAfterPayment = (0, https_1.onCall)(async (request) => {
    // Vérifier l'authentification
    if (!request.auth) {
        throw new Error('L\'utilisateur doit être authentifié');
    }
    const { callId } = request.data;
    if (!callId) {
        throw new Error('callId est requis');
    }
    try {
        await notifyAfterPaymentInternal(callId);
        return {
            success: true,
            message: 'Notifications envoyées avec succès',
            callId
        };
    }
    catch (error) {
        console.error('❌ Erreur dans notifyAfterPayment Cloud Function:', error);
        throw new Error(`Erreur lors de l'envoi des notifications: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
});
//# sourceMappingURL=notifyAfterPayment.js.map