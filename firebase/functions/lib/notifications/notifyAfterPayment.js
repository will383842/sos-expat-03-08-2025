"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAfterPayment = void 0;
exports.notifyAfterPaymentInternal = notifyAfterPaymentInternal;
const callScheduler_1 = require("../callScheduler");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const MessageManager_1 = require("../MessageManager");
// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
const CPU_OPTIMIZED_CONFIG = {
    memory: "128MiB",
    timeoutSeconds: 30,
    maxInstances: 5,
    minInstances: 0,
    concurrency: 10
};
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
        // Envoi des notifications au prestataire
        await MessageManager_1.messageManager.sendSmartMessage({
            to: provider.phoneNumber,
            templateId: 'provider_notification',
            variables: {
                requestTitle: callData.title || 'Consultation',
                language: messagePayload.language
            }
        });
        // Envoi des notifications au client
        await MessageManager_1.messageManager.sendSmartMessage({
            to: client.phoneNumber,
            templateId: 'client_notification',
            variables: {
                requestTitle: callData.title || 'Consultation',
                language: messagePayload.language
            }
        });
        console.log(`✅ Notifications envoyées via MessageManager pour callId: ${callId}`);
    }
    catch (error) {
        console.error(`❌ Erreur lors de l'envoi des notifications pour callId ${callId}:`, error);
        throw error;
    }
    // 🔁 Déclenche l'appel vocal entre client et prestataire dans 5 minutes
    await (0, callScheduler_1.scheduleCallSequence)(callData.sessionId || callId);
}
// ✅ Cloud Function (appelable depuis le frontend) - OPTIMISÉE CPU
exports.notifyAfterPayment = (0, https_1.onCall)(CPU_OPTIMIZED_CONFIG, // 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
async (request) => {
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