"use strict";
// ====== EXPORTS PRINCIPAUX ======
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledCleanup = exports.scheduledFirestoreExport = exports.stripeWebhook = exports.createPaymentIntent = exports.createAndScheduleCall = exports.notifyAfterPayment = exports.initializeMessageTemplates = exports.cancelScheduledCall = exports.scheduleCallSequence = exports.twilioCallManager = exports.stripeManager = exports.messageManager = exports.modernRecordingWebhook = exports.modernConferenceWebhook = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
// Export des webhooks modernisés (remplace les anciens)
// Configuration globale pour toutes les fonctions
var v2_1 = require("firebase-functions/v2");
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
// Export des fonctions modernes
var createAndScheduleCallFunction_1 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCall", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
var createPaymentIntent_1 = require("./createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntent", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntent; } });
// ====== IMPORTS POUR FONCTIONS RESTANTES ======
var https_1 = require("firebase-functions/v2/https");
var scheduler_1 = require("firebase-functions/v2/scheduler");
var admin = require("firebase-admin");
var stripe_1 = require("stripe");
// Charger les variables d'environnement depuis .env
var dotenv = require("dotenv");
dotenv.config();
// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
    admin.initializeApp();
}
var db = admin.firestore();
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
var stripe = null;
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
exports.stripeWebhook = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var signature, rawBody, event_1, _a, error_1, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                signature = req.headers['stripe-signature'];
                if (!signature) {
                    res.status(400).send('Signature Stripe manquante');
                    return [2 /*return*/];
                }
                if (!stripe) {
                    res.status(500).send('Service Stripe non configuré');
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 12, , 13]);
                rawBody = req.rawBody;
                if (!rawBody) {
                    res.status(400).send('Raw body manquant');
                    return [2 /*return*/];
                }
                event_1 = stripe.webhooks.constructEvent(rawBody.toString(), signature, process.env.STRIPE_WEBHOOK_SECRET || '');
                console.log('🔔 Stripe webhook reçu:', event_1.type);
                _a = event_1.type;
                switch (_a) {
                    case 'payment_intent.succeeded': return [3 /*break*/, 2];
                    case 'payment_intent.payment_failed': return [3 /*break*/, 4];
                    case 'payment_intent.canceled': return [3 /*break*/, 6];
                    case 'payment_intent.requires_action': return [3 /*break*/, 8];
                }
                return [3 /*break*/, 10];
            case 2: return [4 /*yield*/, handlePaymentIntentSucceeded(event_1.data.object)];
            case 3:
                _b.sent();
                return [3 /*break*/, 11];
            case 4: return [4 /*yield*/, handlePaymentIntentFailed(event_1.data.object)];
            case 5:
                _b.sent();
                return [3 /*break*/, 11];
            case 6: return [4 /*yield*/, handlePaymentIntentCanceled(event_1.data.object)];
            case 7:
                _b.sent();
                return [3 /*break*/, 11];
            case 8: return [4 /*yield*/, handlePaymentIntentRequiresAction(event_1.data.object)];
            case 9:
                _b.sent();
                return [3 /*break*/, 11];
            case 10:
                console.log("Type d'\u00E9v\u00E9nement Stripe non g\u00E9r\u00E9: ".concat(event_1.type));
                _b.label = 11;
            case 11:
                res.json({ received: true });
                return [3 /*break*/, 13];
            case 12:
                error_1 = _b.sent();
                console.error('Error processing Stripe webhook:', error_1);
                errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                res.status(400).send("Webhook Error: ".concat(errorMessage));
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/];
        }
    });
}); });
// Handlers pour les événements Stripe
function handlePaymentIntentSucceeded(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        var paymentsQuery, paymentsSnapshot, paymentDoc, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log('💰 Paiement réussi:', paymentIntent.id);
                    paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
                    return [4 /*yield*/, paymentsQuery.get()];
                case 1:
                    paymentsSnapshot = _a.sent();
                    if (!!paymentsSnapshot.empty) return [3 /*break*/, 3];
                    paymentDoc = paymentsSnapshot.docs[0];
                    return [4 /*yield*/, paymentDoc.ref.update({
                            status: 'captured',
                            capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    // Déclencher les notifications si nécessaire
                    if (paymentIntent.metadata.callSessionId) {
                        // Utiliser le système de notification moderne
                        console.log('📞 Déclenchement des notifications post-paiement');
                    }
                    return [2 /*return*/, true];
                case 4:
                    error_2 = _a.sent();
                    console.error('❌ Erreur handlePaymentIntentSucceeded:', error_2);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function handlePaymentIntentFailed(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        var paymentsQuery, paymentsSnapshot, paymentDoc, cancelScheduledCall, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    console.log('❌ Paiement échoué:', paymentIntent.id);
                    paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
                    return [4 /*yield*/, paymentsQuery.get()];
                case 1:
                    paymentsSnapshot = _b.sent();
                    if (!!paymentsSnapshot.empty) return [3 /*break*/, 3];
                    paymentDoc = paymentsSnapshot.docs[0];
                    return [4 /*yield*/, paymentDoc.ref.update({
                            status: 'failed',
                            failureReason: ((_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    if (!paymentIntent.metadata.callSessionId) return [3 /*break*/, 6];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./callScheduler'); })];
                case 4:
                    cancelScheduledCall = (_b.sent()).cancelScheduledCall;
                    return [4 /*yield*/, cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed')];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [2 /*return*/, true];
                case 7:
                    error_3 = _b.sent();
                    console.error('Error handling payment intent failed:', error_3);
                    return [2 /*return*/, false];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function handlePaymentIntentCanceled(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        var paymentsQuery, paymentsSnapshot, paymentDoc, cancelScheduledCall, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    console.log('🚫 Paiement annulé:', paymentIntent.id);
                    paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
                    return [4 /*yield*/, paymentsQuery.get()];
                case 1:
                    paymentsSnapshot = _a.sent();
                    if (!!paymentsSnapshot.empty) return [3 /*break*/, 3];
                    paymentDoc = paymentsSnapshot.docs[0];
                    return [4 /*yield*/, paymentDoc.ref.update({
                            status: 'canceled',
                            canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    if (!paymentIntent.metadata.callSessionId) return [3 /*break*/, 6];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./callScheduler'); })];
                case 4:
                    cancelScheduledCall = (_a.sent()).cancelScheduledCall;
                    return [4 /*yield*/, cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled')];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [2 /*return*/, true];
                case 7:
                    error_4 = _a.sent();
                    console.error('Error handling payment intent canceled:', error_4);
                    return [2 /*return*/, false];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function handlePaymentIntentRequiresAction(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        var paymentsQuery, paymentsSnapshot, paymentDoc, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log('⚠️ Paiement nécessite une action:', paymentIntent.id);
                    paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
                    return [4 /*yield*/, paymentsQuery.get()];
                case 1:
                    paymentsSnapshot = _a.sent();
                    if (!!paymentsSnapshot.empty) return [3 /*break*/, 3];
                    paymentDoc = paymentsSnapshot.docs[0];
                    return [4 /*yield*/, paymentDoc.ref.update({
                            status: 'requires_action',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, true];
                case 4:
                    error_5 = _a.sent();
                    console.error('Error handling payment intent requires action:', error_5);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// ====== FONCTIONS CRON POUR MAINTENANCE ======
exports.scheduledFirestoreExport = (0, scheduler_1.onSchedule)({
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
}, function () { return __awaiter(void 0, void 0, void 0, function () {
    var projectId, bucketName, timestamp, firestoreClient, firestoreExportName, firestoreExportPath, firestoreOperation, error_6, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 5]);
                projectId = process.env.GCLOUD_PROJECT;
                bucketName = "".concat(projectId, "-backups");
                timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                console.log("\uD83D\uDD04 D\u00E9marrage sauvegarde automatique: ".concat(timestamp));
                firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
                firestoreExportName = "firestore-export-".concat(timestamp);
                firestoreExportPath = "gs://".concat(bucketName, "/").concat(firestoreExportName);
                return [4 /*yield*/, firestoreClient.exportDocuments({
                        name: "projects/".concat(projectId, "/databases/(default)"),
                        outputUriPrefix: firestoreExportPath,
                        // Exporter toutes les collections
                        collectionIds: [],
                    })];
            case 1:
                firestoreOperation = (_a.sent())[0];
                console.log("\u2705 Export Firestore d\u00E9marr\u00E9: ".concat(firestoreOperation.name));
                // Enregistrer les logs de sauvegarde
                return [4 /*yield*/, admin.firestore().collection('logs').doc('backups').collection('entries').add({
                        type: 'scheduled_backup',
                        firestoreExportPath: firestoreExportPath,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'completed'
                    })];
            case 2:
                // Enregistrer les logs de sauvegarde
                _a.sent();
                return [3 /*break*/, 5];
            case 3:
                error_6 = _a.sent();
                console.error('❌ Erreur sauvegarde automatique:', error_6);
                errorMessage = error_6 instanceof Error ? error_6.message : 'Unknown error';
                // Enregistrer l'erreur dans les logs
                return [4 /*yield*/, admin.firestore().collection('logs').doc('backups').collection('entries').add({
                        type: 'scheduled_backup',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'failed',
                        error: errorMessage
                    })];
            case 4:
                // Enregistrer l'erreur dans les logs
                _a.sent();
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// ====== FONCTION DE NETTOYAGE PÉRIODIQUE ======
exports.scheduledCleanup = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * 0', // Tous les dimanches à 3h
    timeZone: 'Europe/Paris'
}, function () { return __awaiter(void 0, void 0, void 0, function () {
    var twilioCallManager, cleanupResult, error_7, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 6]);
                console.log('🧹 Démarrage nettoyage périodique');
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./TwilioCallManager'); })];
            case 1:
                twilioCallManager = (_a.sent()).twilioCallManager;
                return [4 /*yield*/, twilioCallManager.cleanupOldSessions({
                        olderThanDays: 90,
                        keepCompletedDays: 30,
                        batchSize: 100
                    })];
            case 2:
                cleanupResult = _a.sent();
                console.log("\u2705 Nettoyage termin\u00E9: ".concat(cleanupResult.deleted, " supprim\u00E9es, ").concat(cleanupResult.errors, " erreurs"));
                // Enregistrer le résultat
                return [4 /*yield*/, admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
                        type: 'scheduled_cleanup',
                        result: cleanupResult,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 3:
                // Enregistrer le résultat
                _a.sent();
                return [3 /*break*/, 6];
            case 4:
                error_7 = _a.sent();
                console.error('❌ Erreur nettoyage périodique:', error_7);
                errorMessage = error_7 instanceof Error ? error_7.message : 'Unknown error';
                return [4 /*yield*/, admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
                        type: 'scheduled_cleanup',
                        status: 'failed',
                        error: errorMessage,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 5:
                _a.sent();
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
