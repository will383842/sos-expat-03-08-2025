"use strict";
// functions/src/index.ts - Version finale v2 avec CORS intégré
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledCleanup = exports.scheduledFirestoreExport = exports.stripeWebhook = exports.adminMuteParticipant = exports.adminTransferCall = exports.adminJoinCall = exports.adminForceDisconnectCall = exports.adminBulkUpdateStatus = exports.adminSoftDeleteUser = exports.adminUpdateStatus = exports.api = exports.createPaymentIntent = exports.createAndScheduleCallHTTPS = exports.notifyAfterPayment = exports.initializeMessageTemplates = exports.cancelScheduledCall = exports.scheduleCallSequence = exports.twilioCallManager = exports.stripeManager = exports.messageManager = exports.modernRecordingWebhook = exports.modernConferenceWebhook = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
// ====== EXPORTS PRINCIPAUX ======
// Configuration globale pour toutes les fonctions
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({
    region: 'europe-west1',
});
// Export des webhooks modernisés (remplace les anciens)
var twilioWebhooks_1 = require("./Webhooks/twilioWebhooks");
Object.defineProperty(exports, "twilioCallWebhook", { enumerable: true, get: function () { return twilioWebhooks_1.twilioCallWebhook; } });
Object.defineProperty(exports, "twilioConferenceWebhook", { enumerable: true, get: function () { return twilioWebhooks_1.twilioConferenceWebhook; } });
Object.defineProperty(exports, "twilioRecordingWebhook", { enumerable: true, get: function () { return twilioWebhooks_1.twilioRecordingWebhook; } });
// Export des webhooks spécialisés
var TwilioConferenceWebhook_1 = require("./Webhooks/TwilioConferenceWebhook");
Object.defineProperty(exports, "modernConferenceWebhook", { enumerable: true, get: function () { return TwilioConferenceWebhook_1.twilioConferenceWebhook; } });
var TwilioRecordingWebhook_1 = require("./Webhooks/TwilioRecordingWebhook");
Object.defineProperty(exports, "modernRecordingWebhook", { enumerable: true, get: function () { return TwilioRecordingWebhook_1.twilioRecordingWebhook; } });
// Export des managers
var MessageManager_1 = require("./MessageManager");
Object.defineProperty(exports, "messageManager", { enumerable: true, get: function () { return MessageManager_1.messageManager; } });
var StripeManager_1 = require("./StripeManager");
Object.defineProperty(exports, "stripeManager", { enumerable: true, get: function () { return StripeManager_1.stripeManager; } });
var TwilioCallManager_1 = require("./TwilioCallManager");
Object.defineProperty(exports, "twilioCallManager", { enumerable: true, get: function () { return TwilioCallManager_1.twilioCallManager; } });
// Export des fonctions utilitaires
var callScheduler_1 = require("./callScheduler");
Object.defineProperty(exports, "scheduleCallSequence", { enumerable: true, get: function () { return callScheduler_1.scheduleCallSequence; } });
Object.defineProperty(exports, "cancelScheduledCall", { enumerable: true, get: function () { return callScheduler_1.cancelScheduledCall; } });
// Export de l'initialisation des templates
var initializeMessageTemplates_1 = require("./initializeMessageTemplates");
Object.defineProperty(exports, "initializeMessageTemplates", { enumerable: true, get: function () { return initializeMessageTemplates_1.initializeMessageTemplates; } });
// Export des fonctions de notification (si nécessaire)
var notifyAfterPayment_1 = require("./notifications/notifyAfterPayment");
Object.defineProperty(exports, "notifyAfterPayment", { enumerable: true, get: function () { return notifyAfterPayment_1.notifyAfterPayment; } });
// Export des fonctions réelles utilisées par le frontend
var createAndScheduleCallFunction_1 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCallHTTPS", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
var createPaymentIntent_1 = require("./createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntent", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntent; } });
// Export de l'API admin
var adminApi_1 = require("./adminApi");
Object.defineProperty(exports, "api", { enumerable: true, get: function () { return adminApi_1.api; } });
// ====== IMPORTS POUR FONCTIONS ======
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// Charger les variables d'environnement depuis .env
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Configuration Firestore
try {
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firestore configuré pour ignorer les propriétés undefined');
}
catch (firebaseError) {
    console.log('ℹ️ Firestore déjà configuré', firebaseError);
}
// ====== FONCTIONS PUBLIQUES SUPPRIMÉES ======
// Ces fonctions onRequest ne sont pas utilisées par le frontend
// Le frontend utilise les fonctions onCall directement
// ========================================
// FONCTIONS ADMIN (TOUTES EN V2 MAINTENANT)
// ========================================
exports.adminUpdateStatus = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
    var _a;
    // Vérifier que l'utilisateur est admin
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId, status, reason } = request.data;
    await db.collection("users").doc(userId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("adminLogs").add({
        action: "updateStatus",
        userId,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
exports.adminSoftDeleteUser = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
    var _a;
    // Vérifier que l'utilisateur est admin
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId, reason } = request.data;
    await db.collection("users").doc(userId).update({
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: request.auth.uid,
        deletedReason: reason || null,
    });
    await db.collection("adminLogs").add({
        action: "softDelete",
        userId,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
exports.adminBulkUpdateStatus = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
    var _a;
    // Vérifier que l'utilisateur est admin
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { ids, status, reason } = request.data;
    const batch = db.batch();
    ids.forEach((id) => batch.update(db.collection("users").doc(id), {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }));
    await batch.commit();
    await db.collection("adminLogs").add({
        action: "bulkUpdateStatus",
        ids,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
// ========================================
// FONCTIONS ADMIN POUR MONITORING DES APPELS (V2)
// ========================================
exports.adminForceDisconnectCall = (0, https_2.onCall)({
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30
}, async (request) => {
    var _a;
    // Vérifier que l'utilisateur est admin
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId, reason } = request.data;
    if (!sessionId) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId is required');
    }
    try {
        const { twilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        const success = await twilioCallManager.cancelCallSession(sessionId, reason || 'admin_force_disconnect', request.auth.uid);
        // Log l'action admin
        await db.collection("adminLogs").add({
            action: "forceDisconnectCall",
            sessionId,
            reason: reason || 'admin_force_disconnect',
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success,
            message: `Call ${sessionId} disconnected successfully`
        };
    }
    catch (callError) {
        console.error('Error force disconnecting call:', callError);
        throw new https_2.HttpsError('internal', 'Failed to disconnect call');
    }
});
exports.adminJoinCall = (0, https_2.onCall)({
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30
}, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId is required');
    }
    try {
        const { twilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        const session = await twilioCallManager.getCallSession(sessionId);
        if (!session || session.status !== 'active') {
            throw new https_2.HttpsError('failed-precondition', 'Call is not active');
        }
        // Générer un lien vers la console Twilio pour rejoindre la conférence
        const conferenceUrl = `https://console.twilio.com/us1/develop/voice/manage/conferences/${session.conference.sid}`;
        const accessToken = `admin_${request.auth.uid}_${Date.now()}`;
        // Log l'action admin
        await db.collection("adminLogs").add({
            action: "joinCall",
            sessionId,
            conferenceSid: session.conference.sid,
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            conferenceUrl,
            accessToken,
            conferenceSid: session.conference.sid,
            conferenceName: session.conference.name,
            message: 'Open Twilio Console to join the conference'
        };
    }
    catch (joinError) {
        console.error('Error joining call:', joinError);
        throw new https_2.HttpsError('internal', 'Failed to join call');
    }
});
exports.adminTransferCall = (0, https_2.onCall)({
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30
}, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId, newProviderId } = request.data;
    if (!sessionId || !newProviderId) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId and newProviderId are required');
    }
    try {
        // Vérifier que le nouveau prestataire existe
        const newProviderDoc = await db.collection('users').doc(newProviderId).get();
        if (!newProviderDoc.exists) {
            throw new https_2.HttpsError('not-found', 'New provider not found');
        }
        const newProvider = newProviderDoc.data();
        if (!(newProvider === null || newProvider === void 0 ? void 0 : newProvider.phone)) {
            throw new https_2.HttpsError('failed-precondition', 'New provider has no phone number');
        }
        // Vérifier que c'est bien un prestataire
        if (!['lawyer', 'expat'].includes(newProvider.role)) {
            throw new https_2.HttpsError('failed-precondition', 'User is not a provider');
        }
        // Mettre à jour la session avec le nouveau prestataire
        await db.collection('call_sessions').doc(sessionId).update({
            'metadata.originalProviderId': admin.firestore.FieldValue.arrayUnion(newProvider.id),
            'metadata.providerId': newProviderId,
            'metadata.providerName': `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim(),
            'metadata.providerType': newProvider.role,
            'participants.provider.phone': newProvider.phone,
            'metadata.updatedAt': admin.firestore.Timestamp.now(),
            transferHistory: admin.firestore.FieldValue.arrayUnion({
                transferredBy: request.auth.uid,
                transferredAt: admin.firestore.Timestamp.now(),
                newProviderId,
                newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim(),
                reason: 'admin_transfer'
            })
        });
        // Log l'action admin
        await db.collection("adminLogs").add({
            action: "transferCall",
            sessionId,
            newProviderId,
            newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim(),
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            message: `Call transferred to provider ${newProviderId}`,
            newProviderId,
            newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim()
        };
    }
    catch (transferError) {
        console.error('Error transferring call:', transferError);
        throw new https_2.HttpsError('internal', 'Failed to transfer call');
    }
});
exports.adminMuteParticipant = (0, https_2.onCall)({
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30
}, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId, participantType, mute = true } = request.data;
    if (!sessionId || !participantType) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId and participantType are required');
    }
    if (!['provider', 'client'].includes(participantType)) {
        throw new https_2.HttpsError('invalid-argument', 'participantType must be provider or client');
    }
    try {
        const { twilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        const session = await twilioCallManager.getCallSession(sessionId);
        if (!session || session.status !== 'active') {
            throw new https_2.HttpsError('failed-precondition', 'Call is not active');
        }
        const participant = session.participants[participantType];
        if (!participant.callSid) {
            throw new https_2.HttpsError('failed-precondition', 'Participant call SID not found');
        }
        // Mettre à jour le statut de mute dans la session
        await db.collection('call_sessions').doc(sessionId).update({
            [`participants.${participantType}.isMuted`]: mute,
            'metadata.updatedAt': admin.firestore.Timestamp.now(),
            adminActions: admin.firestore.FieldValue.arrayUnion({
                action: mute ? 'mute' : 'unmute',
                participantType,
                performedBy: request.auth.uid,
                performedAt: admin.firestore.Timestamp.now()
            })
        });
        // Log l'action admin
        await db.collection("adminLogs").add({
            action: mute ? "muteParticipant" : "unmuteParticipant",
            sessionId,
            participantType,
            callSid: participant.callSid,
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            message: `Participant ${participantType} ${mute ? 'muted' : 'unmuted'}`,
            participantType,
            muted: mute,
            note: 'Action recorded in session - Twilio Conference API integration required for actual mute/unmute'
        };
    }
    catch (muteError) {
        console.error('Error muting participant:', muteError);
        throw new https_2.HttpsError('internal', 'Failed to mute participant');
    }
});
// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES
// ========================================
// Configuration Stripe avec gestion d'erreurs
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    try {
        stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });
        console.log('✅ Stripe configuré avec succès');
    }
    catch (stripeError) {
        console.error('❌ Erreur configuration Stripe:', stripeError);
        stripe = null;
    }
}
else {
    console.warn('⚠️ Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide');
}
// ====== WEBHOOK STRIPE UNIFIÉ ======
exports.stripeWebhook = (0, https_1.onRequest)({
    memory: "256MiB",
    timeoutSeconds: 30
}, async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).send('Signature Stripe manquante');
        return;
    }
    if (!stripe) {
        res.status(500).send('Service Stripe non configuré');
        return;
    }
    try {
        const rawBody = req.rawBody;
        if (!rawBody) {
            res.status(400).send('Raw body manquant');
            return;
        }
        const event = stripe.webhooks.constructEvent(rawBody.toString(), signature, process.env.STRIPE_WEBHOOK_SECRET || '');
        console.log('🔔 Stripe webhook reçu:', event.type);
        // Traiter l'événement avec le nouveau système
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            case 'payment_intent.canceled':
                await handlePaymentIntentCanceled(event.data.object);
                break;
            case 'payment_intent.requires_action':
                await handlePaymentIntentRequiresAction(event.data.object);
                break;
            default:
                console.log(`Type d'événement Stripe non géré: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (webhookError) {
        console.error('Error processing Stripe webhook:', webhookError);
        const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
        res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
});
// Handlers pour les événements Stripe
async function handlePaymentIntentSucceeded(paymentIntent) {
    var _a;
    try {
        console.log('💰 Paiement réussi:', paymentIntent.id);
        // Mettre à jour le paiement dans Firestore
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'captured',
                capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Déclencher les notifications si nécessaire
        if ((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.callSessionId) {
            console.log('📞 Déclenchement des notifications post-paiement');
        }
        return true;
    }
    catch (succeededError) {
        console.error('❌ Erreur handlePaymentIntentSucceeded:', succeededError);
        return false;
    }
}
async function handlePaymentIntentFailed(paymentIntent) {
    var _a, _b;
    try {
        console.log('❌ Paiement échoué:', paymentIntent.id);
        // Mettre à jour le paiement dans Firestore
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'failed',
                failureReason: ((_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Annuler l'appel associé si nécessaire
        if ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.callSessionId) {
            // Import et utilisation de la fonction d'annulation
            try {
                const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
                await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
            }
            catch (importError) {
                console.warn('Could not import cancelScheduledCall:', importError);
            }
        }
        return true;
    }
    catch (failedError) {
        console.error('Error handling payment intent failed:', failedError);
        return false;
    }
}
async function handlePaymentIntentCanceled(paymentIntent) {
    var _a;
    try {
        console.log('🚫 Paiement annulé:', paymentIntent.id);
        // Mettre à jour le paiement dans Firestore
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'canceled',
                canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Annuler l'appel associé
        if ((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.callSessionId) {
            try {
                const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
                await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
            }
            catch (importError) {
                console.warn('Could not import cancelScheduledCall:', importError);
            }
        }
        return true;
    }
    catch (canceledError) {
        console.error('Error handling payment intent canceled:', canceledError);
        return false;
    }
}
async function handlePaymentIntentRequiresAction(paymentIntent) {
    try {
        console.log('⚠️ Paiement nécessite une action:', paymentIntent.id);
        // Mettre à jour le statut dans Firestore
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'requires_action',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return true;
    }
    catch (actionError) {
        console.error('Error handling payment intent requires action:', actionError);
        return false;
    }
}
// ====== FONCTIONS CRON POUR MAINTENANCE ======
exports.scheduledFirestoreExport = (0, scheduler_1.onSchedule)({
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
}, async () => {
    try {
        const projectId = process.env.GCLOUD_PROJECT;
        const bucketName = `${projectId}-backups`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        console.log(`🔄 Démarrage sauvegarde automatique: ${timestamp}`);
        // Créer le client pour l'API Firestore Admin
        const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
        // Exporter les collections Firestore
        const firestoreExportName = `firestore-export-${timestamp}`;
        const firestoreExportPath = `gs://${bucketName}/${firestoreExportName}`;
        const [firestoreOperation] = await firestoreClient.exportDocuments({
            name: `projects/${projectId}/databases/(default)`,
            outputUriPrefix: firestoreExportPath,
            // Exporter toutes les collections
            collectionIds: [],
        });
        console.log(`✅ Export Firestore démarré: ${firestoreOperation.name}`);
        // Enregistrer les logs de sauvegarde
        await admin.firestore().collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            firestoreExportPath,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        });
    }
    catch (exportError) {
        console.error('❌ Erreur sauvegarde automatique:', exportError);
        const errorMessage = exportError instanceof Error ? exportError.message : 'Unknown error';
        // Enregistrer l'erreur dans les logs
        await admin.firestore().collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: errorMessage
        });
    }
});
// ====== FONCTION DE NETTOYAGE PÉRIODIQUE ======
exports.scheduledCleanup = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * 0', // Tous les dimanches à 3h
    timeZone: 'Europe/Paris'
}, async () => {
    try {
        console.log('🧹 Démarrage nettoyage périodique');
        // Nettoyer les anciennes sessions d'appel via TwilioCallManager
        const { twilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        const cleanupResult = await twilioCallManager.cleanupOldSessions({
            olderThanDays: 90,
            keepCompletedDays: 30,
            batchSize: 100
        });
        console.log(`✅ Nettoyage terminé: ${cleanupResult.deleted} supprimées, ${cleanupResult.errors} erreurs`);
        // Enregistrer le résultat
        await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
            type: 'scheduled_cleanup',
            result: cleanupResult,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (cleanupError) {
        console.error('❌ Erreur nettoyage périodique:', cleanupError);
        const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
        await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
            type: 'scheduled_cleanup',
            status: 'failed',
            error: errorMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=index.js.map