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
exports.scheduledCleanup = exports.scheduledFirestoreExport = exports.stripeWebhook = exports.createPaymentIntent = exports.createAndScheduleCall = exports.notifyAfterPayment = exports.initializeMessageTemplates = exports.cancelScheduledCall = exports.scheduleCallSequence = exports.twilioCallManager = exports.stripeManager = exports.messageManager = exports.modernRecordingWebhook = exports.modernConferenceWebhook = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
// Configuration globale pour toutes les fonctions
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({
    region: 'us-central1', // Garde la même région que ton frontend
    cors: true
});
(0, v2_1.setGlobalOptions)({
    region: 'europe-west1',
    cors: true
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
// Export des fonctions modernes
var createAndScheduleCallFunction_1 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCall", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
var createPaymentIntent_1 = require("./createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntent", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntent; } });
// ====== IMPORTS POUR FONCTIONS RESTANTES ======
const https_1 = require("firebase-functions/v2/https");
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
// ✅ AJOUTEZ CES DEUX LIGNES ICI
try {
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firestore configuré pour ignorer les propriétés undefined');
}
catch (error) {
    console.log('ℹ️ Firestore déjà configuré');
}
console.log('✅ Firestore configuré pour ignorer les propriétés undefined');
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
    catch (error) {
        console.error('❌ Erreur configuration Stripe:', error);
        stripe = null;
    }
}
else {
    console.warn('⚠️ Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide');
}
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).send(`Webhook Error: ${errorMessage}`);
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
    catch (error) {
        console.error('❌ Erreur sauvegarde automatique:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    catch (error) {
        console.error('❌ Erreur nettoyage périodique:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
            type: 'scheduled_cleanup',
            status: 'failed',
            error: errorMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
//# sourceMappingURL=index.js.map