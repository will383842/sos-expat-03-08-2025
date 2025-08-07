"use strict";
// ====== EXPORTS PRINCIPAUX ======
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
exports.scheduledCleanup = exports.scheduledFirestoreExport = exports.stripeWebhook = exports.createAndScheduleCallLegacy = exports.createPaymentIntentLegacy = exports.sendPushNotification = exports.sendEmail = exports.twilioClient = exports.createAndScheduleCall = exports.notifyAfterPayment = exports.initializeMessageTemplates = exports.cancelScheduledCall = exports.scheduleCallSequence = exports.twilioCallManager = exports.stripeManager = exports.messageManager = exports.modernRecordingWebhook = exports.modernConferenceWebhook = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
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
var createAndScheduleCallFunction_1 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCall", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
// ====== FONCTIONS CLOUD EXISTANTES (MAINTENUES POUR COMPATIBILITÉ) ======
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const twilio_1 = __importDefault(require("twilio"));
const stripe_1 = __importDefault(require("stripe"));
const nodemailer = __importStar(require("nodemailer"));
// Charger les variables d'environnement depuis .env
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES
// ========================================
// Configuration Twilio avec gestion d'erreurs
let twilioClient = null;
exports.twilioClient = twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        exports.twilioClient = twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio configuré avec succès');
    }
    catch (error) {
        console.error('❌ Erreur configuration Twilio:', error);
        exports.twilioClient = twilioClient = null;
    }
}
else {
    console.warn('⚠️ Twilio non configuré - Variables d\'environnement manquantes');
}
// Configuration Stripe avec gestion d'erreurs
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    try {
        stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
        });
        console.log('✅ Stripe configuré avec succès');
    }
    catch (error) {
        console.error('❌ Erreur configuration Stripe:', error);
        stripe = null;
    }
}
else {
    console.warn('⚠️ Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide');
}
// Configuration Email avec gestion d'erreurs
let emailTransporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
        emailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        console.log('✅ Email configuré avec succès');
    }
    catch (error) {
        console.error('❌ Erreur configuration Email:', error);
        emailTransporter = null;
    }
}
else {
    console.warn('⚠️ Email non configuré - Variables d\'environnement manquantes');
}
// ====== FONCTION CLOUD POUR NOTIFICATIONS ======
exports.sendEmail = (0, https_1.onCall)(async (request) => {
    const data = request.data;
    // Vérifier l'authentification
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour envoyer des notifications.');
    }
    const { type, recipientEmail, recipientPhone, recipientName, recipientCountry, emailSubject, emailHtml, smsMessage, whatsappMessage } = data;
    try {
        const results = [];
        // 1. Envoyer l'email
        if (recipientEmail && emailSubject && emailHtml) {
            if (emailTransporter) {
                try {
                    await emailTransporter.sendMail({
                        from: '"SOS Expats" <notifications@sosexpats.com>',
                        to: recipientEmail,
                        subject: emailSubject,
                        html: emailHtml,
                        priority: 'high'
                    });
                    results.push({ channel: 'email', success: true });
                    console.log('✅ Email envoyé à:', recipientEmail);
                }
                catch (emailError) {
                    console.error('❌ Erreur email:', emailError);
                    results.push({ channel: 'email', success: false, error: emailError.message });
                }
            }
            else {
                results.push({ channel: 'email', success: false, error: 'Service email non configuré' });
            }
        }
        // 2. Envoyer le SMS via Twilio
        if (recipientPhone && smsMessage) {
            if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
                try {
                    await twilioClient.messages.create({
                        body: smsMessage,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: recipientPhone
                    });
                    results.push({ channel: 'sms', success: true });
                    console.log('✅ SMS envoyé à:', recipientPhone);
                }
                catch (smsError) {
                    console.error('❌ Erreur SMS:', smsError);
                    results.push({ channel: 'sms', success: false, error: smsError.message });
                }
            }
            else {
                results.push({ channel: 'sms', success: false, error: 'Service SMS non configuré' });
            }
        }
        // 3. Envoyer WhatsApp via Twilio
        if (recipientPhone && whatsappMessage) {
            if (twilioClient && process.env.TWILIO_WHATSAPP_NUMBER) {
                try {
                    await twilioClient.messages.create({
                        body: whatsappMessage,
                        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                        to: `whatsapp:${recipientPhone}`
                    });
                    results.push({ channel: 'whatsapp', success: true });
                    console.log('✅ WhatsApp envoyé à:', recipientPhone);
                }
                catch (whatsappError) {
                    console.error('❌ Erreur WhatsApp:', whatsappError);
                    results.push({ channel: 'whatsapp', success: false, error: whatsappError.message });
                }
            }
            else {
                results.push({ channel: 'whatsapp', success: false, error: 'Service WhatsApp non configuré' });
            }
        }
        // Enregistrer les résultats dans Firestore
        await db.collection('notification_logs').add({
            type,
            recipientEmail,
            recipientPhone,
            recipientName,
            recipientCountry,
            results,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: results.some(r => r.success)
        });
        return {
            success: results.some(r => r.success),
            results
        };
    }
    catch (error) {
        console.error('Erreur générale lors de l\'envoi de notification:', error);
        throw new https_1.HttpsError('internal', 'Erreur lors de l\'envoi de la notification', error);
    }
});
exports.sendPushNotification = (0, https_1.onCall)(async (request) => {
    const data = request.data;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié.');
    }
    const { userId, title, body, data: notificationData } = data;
    try {
        // Récupérer les tokens FCM de l'utilisateur
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('Utilisateur non trouvé');
        }
        const userData = userDoc.data();
        const deviceTokens = (userData === null || userData === void 0 ? void 0 : userData.deviceTokens) || [];
        if (deviceTokens.length === 0) {
            console.log('Aucun token FCM trouvé pour l\'utilisateur:', userId);
            return { success: false, message: 'Aucun token FCM' };
        }
        // Envoyer la notification push
        const message = {
            notification: {
                title,
                body
            },
            data: notificationData || {},
            tokens: deviceTokens
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Push notifications envoyées:', response.successCount, 'succès,', response.failureCount, 'échecs');
        return {
            success: response.successCount > 0,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    }
    catch (error) {
        console.error('Erreur envoi push notification:', error);
        throw new https_1.HttpsError('internal', 'Erreur lors de l\'envoi de la push notification', error);
    }
});
// Fonction pour créer un PaymentIntent Stripe (legacy - utiliser createPaymentIntent.ts)
exports.createPaymentIntentLegacy = (0, https_1.onCall)(async (request) => {
    const data = request.data;
    // Vérifier l'authentification
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    // Vérifier que Stripe est configuré
    if (!stripe) {
        throw new https_1.HttpsError('failed-precondition', 'Service de paiement non disponible. Configuration Stripe manquante.');
    }
    const { amount, currency, clientId, providerId, serviceType, commissionAmount, providerAmount, metadata } = data;
    // Validation des données
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Montant manquant ou invalide.');
    }
    if (!clientId || !providerId || !serviceType) {
        throw new https_1.HttpsError('invalid-argument', 'Données requises manquantes.');
    }
    // Vérifier que l'utilisateur authentifié correspond au clientId
    if (request.auth.uid !== clientId) {
        throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
    }
    try {
        console.log('Création PaymentIntent pour:', { amount, currency: currency || 'eur', serviceType, clientId, providerId });
        // Créer un PaymentIntent avec Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: currency || 'eur',
            capture_method: 'manual', // Capture différée
            metadata: Object.assign({ clientId,
                providerId,
                serviceType, commissionAmount: commissionAmount.toString(), providerAmount: providerAmount.toString() }, metadata),
            description: `Service ${serviceType} - Prestataire ${providerId}`
        });
        console.log('PaymentIntent créé avec succès:', paymentIntent.id);
        return {
            success: true,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status
        };
    }
    catch (error) {
        console.error('❌ Erreur création PaymentIntent:', error);
        // Gestion spécifique des erreurs Stripe
        if (error.type === 'StripeCardError') {
            throw new https_1.HttpsError('invalid-argument', `Erreur de carte: ${error.message}`);
        }
        if (error.type === 'StripeInvalidRequestError') {
            throw new https_1.HttpsError('invalid-argument', `Requête invalide: ${error.message}`);
        }
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Erreur lors de la création du paiement: ${error.message || 'Erreur inconnue'}`, { originalError: error.message, code: error.code, type: error.type });
    }
});
// Fonction pour créer et programmer un appel (utilise le nouveau système)
exports.createAndScheduleCallLegacy = (0, https_1.onCall)(async (request) => {
    const data = request.data;
    // Vérifier l'authentification 
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    const { providerId, clientId, providerPhone, clientPhone, providerType, serviceType, amount, paymentIntentId } = data;
    // Validation des données
    if (!providerId || !clientId || !providerPhone || !clientPhone || !paymentIntentId) {
        throw new https_1.HttpsError('invalid-argument', 'Données requises manquantes.');
    }
    // Vérifier que l'utilisateur authentifié correspond au clientId
    if (request.auth.uid !== clientId) {
        throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un appel que pour votre propre compte.');
    }
    try {
        console.log('🚀 Création session d\'appel via le nouveau système TwilioCallManager');
        // Utiliser le nouveau système TwilioCallManager
        const { createAndScheduleCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
        const callSession = await createAndScheduleCall({
            providerId,
            clientId,
            providerPhone,
            clientPhone,
            serviceType: serviceType,
            providerType: providerType,
            paymentIntentId,
            amount,
            delayMinutes: 5 // Délai standard de 5 minutes
        });
        console.log('✅ Session d\'appel créée:', callSession.id);
        return {
            success: true,
            callSessionId: callSession.id,
            status: 'pending'
        };
    }
    catch (error) {
        console.error('❌ Erreur création session d\'appel:', error);
        throw new https_1.HttpsError('internal', 'Erreur lors de l\'initiation de l\'appel', error);
    }
});
// ====== WEBHOOK STRIPE UNIFIÉ ======
exports.stripeWebhook = (0, https_1.onRequest)(async (req, res) => {
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
    catch (error) {
        console.error('Error processing Stripe webhook:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
// Handlers pour les événements Stripe
async function handlePaymentIntentSucceeded(paymentIntent) {
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
        if (paymentIntent.metadata.callSessionId) {
            // Utiliser le système de notification moderne
            console.log('📞 Déclenchement des notifications post-paiement');
        }
        return true;
    }
    catch (error) {
        console.error('❌ Erreur handlePaymentIntentSucceeded:', error);
        return false;
    }
}
async function handlePaymentIntentFailed(paymentIntent) {
    var _a;
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
        if (paymentIntent.metadata.callSessionId) {
            const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
            await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
        }
        return true;
    }
    catch (error) {
        console.error('Error handling payment intent failed:', error);
        return false;
    }
}
async function handlePaymentIntentCanceled(paymentIntent) {
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
        if (paymentIntent.metadata.callSessionId) {
            const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
            await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
        }
        return true;
    }
    catch (error) {
        console.error('Error handling payment intent canceled:', error);
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
    catch (error) {
        console.error('Error handling payment intent requires action:', error);
        return false;
    }
}
// ====== FONCTIONS CRON POUR MAINTENANCE ======
exports.scheduledFirestoreExport = (0, scheduler_1.onSchedule)({
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
}, async (event) => {
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
    catch (error) {
        console.error('❌ Erreur sauvegarde automatique:', error);
        // Enregistrer l'erreur dans les logs
        await admin.firestore().collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: error.message
        });
    }
});
// ====== FONCTION DE NETTOYAGE PÉRIODIQUE ======
exports.scheduledCleanup = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * 0', // Tous les dimanches à 3h
    timeZone: 'Europe/Paris'
}, async (event) => {
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
    catch (error) {
        console.error('❌ Erreur nettoyage périodique:', error);
        await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
            type: 'scheduled_cleanup',
            status: 'failed',
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=index.js.map