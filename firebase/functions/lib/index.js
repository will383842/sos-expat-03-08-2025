"use strict";
// functions/src/index.ts - Version Ultra Debug avec traçage complet et exports rectifiés
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
exports.getUltraDebugLogs = exports.ultraLogger = exports.getSystemHealthStatus = exports.generateSystemDebugReport = exports.scheduledCleanup = exports.scheduledFirestoreExport = exports.adminMuteParticipant = exports.adminTransferCall = exports.adminJoinCall = exports.stripeWebhook = exports.adminForceDisconnectCall = exports.adminBulkUpdateStatus = exports.adminSoftDeleteUser = exports.adminUpdateStatus = exports.notifyAfterPayment = exports.initializeMessageTemplates = exports.modernRecordingWebhook = exports.modernConferenceWebhook = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = exports.api = exports.createPaymentIntent = exports.createAndScheduleCall = exports.createAndScheduleCallHTTPS = void 0;
// ====== ULTRA DEBUG INITIALIZATION ======
const ultraDebugLogger_1 = require("./utils/ultraDebugLogger");
Object.defineProperty(exports, "ultraLogger", { enumerable: true, get: function () { return ultraDebugLogger_1.ultraLogger; } });
// Tracer tous les imports principaux
(0, ultraDebugLogger_1.traceGlobalImport)('firebase-functions/v2', 'index.ts');
(0, ultraDebugLogger_1.traceGlobalImport)('firebase-admin', 'index.ts');
(0, ultraDebugLogger_1.traceGlobalImport)('stripe', 'index.ts');
ultraDebugLogger_1.ultraLogger.info('INDEX_INIT', 'Démarrage de l\'initialisation du fichier index.ts', {
    timestamp: Date.now(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
});
// ====== CONFIGURATION GLOBALE ======
const v2_1 = require("firebase-functions/v2");
const globalConfig = {
    region: 'europe-west1',
};
ultraDebugLogger_1.ultraLogger.debug('GLOBAL_CONFIG', 'Configuration globale Firebase Functions', globalConfig);
(0, v2_1.setGlobalOptions)(globalConfig);
ultraDebugLogger_1.ultraLogger.info('GLOBAL_CONFIG', 'Configuration globale Firebase Functions appliquée', globalConfig);
// ====== IMPORTS PRINCIPAUX ======
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
ultraDebugLogger_1.ultraLogger.debug('IMPORTS', 'Imports principaux chargés avec succès');
ultraDebugLogger_1.ultraLogger.debug('TYPES', 'Interfaces et types définis');
// ====== INITIALISATION FIREBASE ULTRA-DEBUGGÉE ======
let isFirebaseInitialized = false;
let db;
let initializationError = null;
const initializeFirebase = (0, ultraDebugLogger_1.traceFunction)(() => {
    if (!isFirebaseInitialized && !initializationError) {
        try {
            ultraDebugLogger_1.ultraLogger.info('FIREBASE_INIT', 'Début d\'initialisation Firebase');
            const startTime = Date.now();
            if (!admin.apps.length) {
                ultraDebugLogger_1.ultraLogger.debug('FIREBASE_INIT', 'Aucune app Firebase détectée, initialisation...');
                admin.initializeApp();
                ultraDebugLogger_1.ultraLogger.info('FIREBASE_INIT', 'Firebase Admin SDK initialisé');
            }
            else {
                ultraDebugLogger_1.ultraLogger.debug('FIREBASE_INIT', 'Firebase déjà initialisé, utilisation de l\'instance existante');
            }
            db = admin.firestore();
            ultraDebugLogger_1.ultraLogger.debug('FIREBASE_INIT', 'Instance Firestore récupérée');
            // Configuration Firestore avec traçage
            try {
                db.settings({ ignoreUndefinedProperties: true });
                ultraDebugLogger_1.ultraLogger.info('FIREBASE_INIT', 'Firestore configuré avec ignoreUndefinedProperties: true');
            }
            catch (settingsError) {
                ultraDebugLogger_1.ultraLogger.warn('FIREBASE_INIT', 'Firestore déjà configuré (normal)', {
                    error: settingsError instanceof Error ? settingsError.message : String(settingsError)
                });
            }
            const initTime = Date.now() - startTime;
            isFirebaseInitialized = true;
            ultraDebugLogger_1.ultraLogger.info('FIREBASE_INIT', 'Firebase initialisé avec succès', {
                initializationTime: `${initTime}ms`,
                projectId: admin.app().options.projectId,
                databaseURL: admin.app().options.databaseURL,
                storageBucket: admin.app().options.storageBucket
            });
        }
        catch (error) {
            initializationError = error instanceof Error ? error : new Error(String(error));
            ultraDebugLogger_1.ultraLogger.error('FIREBASE_INIT', 'Erreur critique lors de l\'initialisation Firebase', {
                error: initializationError.message,
                stack: initializationError.stack
            }, initializationError);
            throw initializationError;
        }
    }
    else if (initializationError) {
        ultraDebugLogger_1.ultraLogger.error('FIREBASE_INIT', 'Tentative d\'utilisation après erreur d\'initialisation', {
            previousError: initializationError.message
        });
        throw initializationError;
    }
    return db;
}, 'initializeFirebase', 'INDEX');
// ====== LAZY LOADING DES MANAGERS ULTRA-DEBUGGÉ ======
let stripeManagerInstance = null;
let twilioCallManagerInstance = null;
let messageManagerInstance = null;
const getStripeManager = (0, ultraDebugLogger_1.traceFunction)(async () => {
    if (!stripeManagerInstance) {
        ultraDebugLogger_1.ultraLogger.info('LAZY_LOADING', 'Chargement du StripeManager');
        const startTime = Date.now();
        const { stripeManager } = await Promise.resolve().then(() => __importStar(require('./StripeManager')));
        stripeManagerInstance = stripeManager;
        const loadTime = Date.now() - startTime;
        ultraDebugLogger_1.ultraLogger.info('LAZY_LOADING', 'StripeManager chargé avec succès', {
            loadTime: `${loadTime}ms`
        });
    }
    return stripeManagerInstance;
}, 'getStripeManager', 'INDEX');
const getTwilioCallManager = (0, ultraDebugLogger_1.traceFunction)(async () => {
    if (!twilioCallManagerInstance) {
        ultraDebugLogger_1.ultraLogger.info('LAZY_LOADING', 'Chargement du TwilioCallManager');
        const startTime = Date.now();
        const { twilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        twilioCallManagerInstance = twilioCallManager;
        const loadTime = Date.now() - startTime;
        ultraDebugLogger_1.ultraLogger.info('LAZY_LOADING', 'TwilioCallManager chargé avec succès', {
            loadTime: `${loadTime}ms`
        });
    }
    return twilioCallManagerInstance;
}, 'getTwilioCallManager', 'INDEX');
const getMessageManager = (0, ultraDebugLogger_1.traceFunction)(async () => {
    if (!messageManagerInstance) {
        ultraDebugLogger_1.ultraLogger.info('LAZY_LOADING', 'Chargement du MessageManager');
        const startTime = Date.now();
        const { messageManager } = await Promise.resolve().then(() => __importStar(require('./MessageManager')));
        messageManagerInstance = messageManager;
        const loadTime = Date.now() - startTime;
        ultraDebugLogger_1.ultraLogger.info('LAZY_LOADING', 'MessageManager chargé avec succès', {
            loadTime: `${loadTime}ms`
        });
    }
    return messageManagerInstance;
}, 'getMessageManager', 'INDEX');
// ====== MIDDLEWARE DE DEBUG POUR TOUTES LES FONCTIONS ======
function createDebugMetadata(functionName, userId) {
    return {
        sessionId: `${functionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId,
        functionName,
        startTime: Date.now(),
        environment: process.env.NODE_ENV || 'development'
    };
}
function logFunctionStart(metadata, data) {
    ultraDebugLogger_1.ultraLogger.info(`FUNCTION_${metadata.functionName.toUpperCase()}_START`, `Début d'exécution de ${metadata.functionName}`, {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        data: data ? JSON.stringify(data, null, 2) : undefined,
        memoryUsage: process.memoryUsage()
    });
}
function logFunctionEnd(metadata, result, error) {
    const executionTime = Date.now() - metadata.startTime;
    if (error) {
        ultraDebugLogger_1.ultraLogger.error(`FUNCTION_${metadata.functionName.toUpperCase()}_ERROR`, `Erreur dans ${metadata.functionName}`, {
            sessionId: metadata.sessionId,
            requestId: metadata.requestId,
            userId: metadata.userId,
            executionTime: `${executionTime}ms`,
            error: error.message,
            stack: error.stack,
            memoryUsage: process.memoryUsage()
        }, error);
    }
    else {
        ultraDebugLogger_1.ultraLogger.info(`FUNCTION_${metadata.functionName.toUpperCase()}_END`, `Fin d'exécution de ${metadata.functionName}`, {
            sessionId: metadata.sessionId,
            requestId: metadata.requestId,
            userId: metadata.userId,
            executionTime: `${executionTime}ms`,
            result: result ? JSON.stringify(result, null, 2) : undefined,
            memoryUsage: process.memoryUsage()
        });
    }
}
// ====== WRAPPER POUR FONCTIONS CALLABLE ======
function wrapCallableFunction(functionName, originalFunction) {
    return async (request) => {
        var _a, _b;
        const metadata = createDebugMetadata(functionName, (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
        logFunctionStart(metadata, {
            hasAuth: !!request.auth,
            authUid: (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid,
            requestData: request.data
        });
        try {
            const result = await originalFunction(request);
            logFunctionEnd(metadata, result);
            return result;
        }
        catch (error) {
            logFunctionEnd(metadata, undefined, error);
            throw error;
        }
    };
}
// ====== WRAPPER POUR FONCTIONS HTTP ======
function wrapHttpFunction(functionName, originalFunction) {
    return async (req, res) => {
        const metadata = createDebugMetadata(functionName);
        req.debugMetadata = metadata;
        logFunctionStart(metadata, {
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
            body: req.body
        });
        try {
            await originalFunction(req, res);
            logFunctionEnd(metadata, { statusCode: res.statusCode });
        }
        catch (error) {
            logFunctionEnd(metadata, undefined, error);
            throw error;
        }
    };
}
// ====== EXPORTS DIRECTS RECTIFIÉS ======
ultraDebugLogger_1.ultraLogger.info('EXPORTS', 'Début du chargement des exports directs');
// Import et export des fonctions principales avec exports directs simples
var createAndScheduleCallFunction_1 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCallHTTPS", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
var createAndScheduleCallFunction_2 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCall", { enumerable: true, get: function () { return createAndScheduleCallFunction_2.createAndScheduleCallHTTPS; } });
var createPaymentIntent_1 = require("./createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntent", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntent; } });
// Export de l'API admin avec debug
var adminApi_1 = require("./adminApi");
Object.defineProperty(exports, "api", { enumerable: true, get: function () { return adminApi_1.api; } });
// Export des webhooks avec debug
var twilioWebhooks_1 = require("./Webhooks/twilioWebhooks");
Object.defineProperty(exports, "twilioCallWebhook", { enumerable: true, get: function () { return twilioWebhooks_1.twilioCallWebhook; } });
Object.defineProperty(exports, "twilioConferenceWebhook", { enumerable: true, get: function () { return twilioWebhooks_1.twilioConferenceWebhook; } });
Object.defineProperty(exports, "twilioRecordingWebhook", { enumerable: true, get: function () { return twilioWebhooks_1.twilioRecordingWebhook; } });
// Export des webhooks modernisés
var TwilioConferenceWebhook_1 = require("./Webhooks/TwilioConferenceWebhook");
Object.defineProperty(exports, "modernConferenceWebhook", { enumerable: true, get: function () { return TwilioConferenceWebhook_1.twilioConferenceWebhook; } });
var TwilioRecordingWebhook_1 = require("./Webhooks/TwilioRecordingWebhook");
Object.defineProperty(exports, "modernRecordingWebhook", { enumerable: true, get: function () { return TwilioRecordingWebhook_1.twilioRecordingWebhook; } });
// Export des templates et notifications
var initializeMessageTemplates_1 = require("./initializeMessageTemplates");
Object.defineProperty(exports, "initializeMessageTemplates", { enumerable: true, get: function () { return initializeMessageTemplates_1.initializeMessageTemplates; } });
var notifyAfterPayment_1 = require("./notifications/notifyAfterPayment");
Object.defineProperty(exports, "notifyAfterPayment", { enumerable: true, get: function () { return notifyAfterPayment_1.notifyAfterPayment; } });
ultraDebugLogger_1.ultraLogger.info('EXPORTS', 'Exports directs configurés');
// ========================================
// FONCTIONS ADMIN ULTRA-DEBUGGÉES (V2)
// ========================================
exports.adminUpdateStatus = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminUpdateStatus', async (request) => {
    var _a, _b, _c, _d, _e, _f;
    const database = initializeFirebase();
    ultraDebugLogger_1.ultraLogger.debug('ADMIN_UPDATE_STATUS', 'Vérification des permissions admin', {
        hasAuth: !!request.auth,
        userRole: (_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role
    });
    if (!request.auth || ((_c = request.auth.token) === null || _c === void 0 ? void 0 : _c.role) !== 'admin') {
        ultraDebugLogger_1.ultraLogger.warn('ADMIN_UPDATE_STATUS', 'Accès refusé - permissions admin requises', {
            userId: (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid,
            userRole: (_f = (_e = request.auth) === null || _e === void 0 ? void 0 : _e.token) === null || _f === void 0 ? void 0 : _f.role
        });
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId, status, reason } = request.data;
    ultraDebugLogger_1.ultraLogger.info('ADMIN_UPDATE_STATUS', 'Mise à jour du statut utilisateur', {
        targetUserId: userId,
        newStatus: status,
        reason,
        adminId: request.auth.uid
    });
    await database.collection("users").doc(userId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await database.collection("adminLogs").add({
        action: "updateStatus",
        userId,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    ultraDebugLogger_1.ultraLogger.info('ADMIN_UPDATE_STATUS', 'Statut utilisateur mis à jour avec succès', {
        targetUserId: userId,
        newStatus: status
    });
    return { ok: true };
}));
exports.adminSoftDeleteUser = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminSoftDeleteUser', async (request) => {
    var _a, _b;
    const database = initializeFirebase();
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        ultraDebugLogger_1.ultraLogger.warn('ADMIN_SOFT_DELETE', 'Accès refusé', {
            userId: (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid
        });
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId, reason } = request.data;
    ultraDebugLogger_1.ultraLogger.info('ADMIN_SOFT_DELETE', 'Suppression soft de l\'utilisateur', {
        targetUserId: userId,
        reason,
        adminId: request.auth.uid
    });
    await database.collection("users").doc(userId).update({
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: request.auth.uid,
        deletedReason: reason || null,
    });
    await database.collection("adminLogs").add({
        action: "softDelete",
        userId,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
}));
exports.adminBulkUpdateStatus = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminBulkUpdateStatus', async (request) => {
    var _a;
    const database = initializeFirebase();
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { ids, status, reason } = request.data;
    ultraDebugLogger_1.ultraLogger.info('ADMIN_BULK_UPDATE', 'Mise à jour en lot', {
        targetUserIds: ids,
        newStatus: status,
        reason,
        adminId: request.auth.uid,
        batchSize: ids.length
    });
    const batch = database.batch();
    ids.forEach((id) => batch.update(database.collection("users").doc(id), {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }));
    await batch.commit();
    await database.collection("adminLogs").add({
        action: "bulkUpdateStatus",
        ids,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
}));
// ========================================
// FONCTIONS ADMIN POUR MONITORING DES APPELS ULTRA-DEBUGGÉES
// ========================================
exports.adminForceDisconnectCall = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminForceDisconnectCall', async (request) => {
    var _a;
    const database = initializeFirebase();
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId, reason } = request.data;
    if (!sessionId) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId is required');
    }
    ultraDebugLogger_1.ultraLogger.info('ADMIN_FORCE_DISCONNECT', 'Déconnexion forcée d\'un appel', {
        sessionId,
        reason,
        adminId: request.auth.uid
    });
    try {
        const twilioCallManager = await getTwilioCallManager();
        const success = await twilioCallManager.cancelCallSession(sessionId, reason || 'admin_force_disconnect', request.auth.uid);
        await database.collection("adminLogs").add({
            action: "forceDisconnectCall",
            sessionId,
            reason: reason || 'admin_force_disconnect',
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        ultraDebugLogger_1.ultraLogger.info('ADMIN_FORCE_DISCONNECT', 'Appel déconnecté avec succès', {
            sessionId,
            success
        });
        return {
            success,
            message: `Call ${sessionId} disconnected successfully`
        };
    }
    catch (callError) {
        ultraDebugLogger_1.ultraLogger.error('ADMIN_FORCE_DISCONNECT', 'Erreur lors de la déconnexion', {
            sessionId,
            error: callError instanceof Error ? callError.message : String(callError)
        }, callError instanceof Error ? callError : undefined);
        throw new https_2.HttpsError('internal', 'Failed to disconnect call');
    }
}));
// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES ULTRA-DEBUGGÉE
// ========================================
let stripe = null;
const getStripe = (0, ultraDebugLogger_1.traceFunction)(() => {
    if (!stripe) {
        ultraDebugLogger_1.ultraLogger.info('STRIPE_INIT', 'Initialisation de Stripe');
        const stripeConfig = functions.config().stripe;
        if ((stripeConfig === null || stripeConfig === void 0 ? void 0 : stripeConfig.secret_key) && stripeConfig.secret_key.startsWith('sk_')) {
            try {
                stripe = new stripe_1.default(stripeConfig.secret_key, {
                    apiVersion: '2023-10-16',
                });
                ultraDebugLogger_1.ultraLogger.info('STRIPE_INIT', 'Stripe configuré avec succès', {
                    keyPrefix: stripeConfig.secret_key.substring(0, 7) + '...'
                });
            }
            catch (stripeError) {
                ultraDebugLogger_1.ultraLogger.error('STRIPE_INIT', 'Erreur configuration Stripe', {
                    error: stripeError instanceof Error ? stripeError.message : String(stripeError)
                }, stripeError instanceof Error ? stripeError : undefined);
                stripe = null;
            }
        }
        else {
            ultraDebugLogger_1.ultraLogger.warn('STRIPE_INIT', 'Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide');
        }
    }
    return stripe;
}, 'getStripe', 'INDEX');
// ====== WEBHOOK STRIPE UNIFIÉ ULTRA-DEBUGGÉ ======
exports.stripeWebhook = (0, https_1.onRequest)({
    memory: "256MiB",
    timeoutSeconds: 30
}, wrapHttpFunction('stripeWebhook', async (req, res) => {
    var _a;
    const signature = req.headers['stripe-signature'];
    ultraDebugLogger_1.ultraLogger.debug('STRIPE_WEBHOOK', 'Webhook Stripe reçu', {
        hasSignature: !!signature,
        method: req.method,
        contentType: req.headers['content-type']
    });
    if (!signature) {
        ultraDebugLogger_1.ultraLogger.warn('STRIPE_WEBHOOK', 'Signature Stripe manquante');
        res.status(400).send('Signature Stripe manquante');
        return;
    }
    const stripeInstance = getStripe();
    if (!stripeInstance) {
        ultraDebugLogger_1.ultraLogger.error('STRIPE_WEBHOOK', 'Service Stripe non configuré');
        res.status(500).send('Service Stripe non configuré');
        return;
    }
    try {
        const database = initializeFirebase();
        const rawBody = req.rawBody;
        if (!rawBody) {
            ultraDebugLogger_1.ultraLogger.warn('STRIPE_WEBHOOK', 'Raw body manquant');
            res.status(400).send('Raw body manquant');
            return;
        }
        const stripeConfig = functions.config().stripe;
        const event = stripeInstance.webhooks.constructEvent(rawBody.toString(), signature, (stripeConfig === null || stripeConfig === void 0 ? void 0 : stripeConfig.webhook_secret) || '');
        ultraDebugLogger_1.ultraLogger.info('STRIPE_WEBHOOK', 'Événement Stripe validé', {
            eventType: event.type,
            eventId: event.id,
            objectId: (_a = event.data.object) === null || _a === void 0 ? void 0 : _a.id
        });
        // Traiter l'événement avec le nouveau système
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object, database);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object, database);
                break;
            case 'payment_intent.canceled':
                await handlePaymentIntentCanceled(event.data.object, database);
                break;
            case 'payment_intent.requires_action':
                await handlePaymentIntentRequiresAction(event.data.object, database);
                break;
            default:
                ultraDebugLogger_1.ultraLogger.debug('STRIPE_WEBHOOK', 'Type d\'événement non géré', {
                    eventType: event.type
                });
        }
        res.json({ received: true });
    }
    catch (webhookError) {
        ultraDebugLogger_1.ultraLogger.error('STRIPE_WEBHOOK', 'Erreur traitement webhook', {
            error: webhookError instanceof Error ? webhookError.message : String(webhookError),
            stack: webhookError instanceof Error ? webhookError.stack : undefined
        }, webhookError instanceof Error ? webhookError : undefined);
        const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
        res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
}));
// Handlers pour les événements Stripe avec ultra debug
const handlePaymentIntentSucceeded = (0, ultraDebugLogger_1.traceFunction)(async (paymentIntent, database) => {
    var _a;
    try {
        ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Paiement réussi', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });
        const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'captured',
                capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Base de données mise à jour');
        }
        if ((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.callSessionId) {
            ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Déclenchement des notifications post-paiement', {
                callSessionId: paymentIntent.metadata.callSessionId
            });
        }
        return true;
    }
    catch (succeededError) {
        ultraDebugLogger_1.ultraLogger.error('STRIPE_PAYMENT_SUCCEEDED', 'Erreur traitement paiement réussi', {
            paymentIntentId: paymentIntent.id,
            error: succeededError instanceof Error ? succeededError.message : String(succeededError)
        }, succeededError instanceof Error ? succeededError : undefined);
        return false;
    }
}, 'handlePaymentIntentSucceeded', 'STRIPE_WEBHOOKS');
const handlePaymentIntentFailed = (0, ultraDebugLogger_1.traceFunction)(async (paymentIntent, database) => {
    var _a, _b, _c;
    try {
        ultraDebugLogger_1.ultraLogger.warn('STRIPE_PAYMENT_FAILED', 'Paiement échoué', {
            paymentIntentId: paymentIntent.id,
            errorMessage: (_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message
        });
        const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'failed',
                failureReason: ((_b = paymentIntent.last_payment_error) === null || _b === void 0 ? void 0 : _b.message) || 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        if ((_c = paymentIntent.metadata) === null || _c === void 0 ? void 0 : _c.callSessionId) {
            try {
                ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_FAILED', 'Annulation appel programmé', {
                    callSessionId: paymentIntent.metadata.callSessionId
                });
                const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
                await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
            }
            catch (importError) {
                ultraDebugLogger_1.ultraLogger.warn('STRIPE_PAYMENT_FAILED', 'Impossible d\'importer cancelScheduledCall', {
                    error: importError instanceof Error ? importError.message : String(importError)
                });
            }
        }
        return true;
    }
    catch (failedError) {
        ultraDebugLogger_1.ultraLogger.error('STRIPE_PAYMENT_FAILED', 'Erreur traitement échec paiement', {
            error: failedError instanceof Error ? failedError.message : String(failedError)
        }, failedError instanceof Error ? failedError : undefined);
        return false;
    }
}, 'handlePaymentIntentFailed', 'STRIPE_WEBHOOKS');
const handlePaymentIntentCanceled = (0, ultraDebugLogger_1.traceFunction)(async (paymentIntent, database) => {
    var _a;
    try {
        ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Paiement annulé', {
            paymentIntentId: paymentIntent.id,
            cancellationReason: paymentIntent.cancellation_reason
        });
        const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'canceled',
                canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        if ((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.callSessionId) {
            try {
                ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Annulation appel programmé', {
                    callSessionId: paymentIntent.metadata.callSessionId
                });
                const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
                await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
            }
            catch (importError) {
                ultraDebugLogger_1.ultraLogger.warn('STRIPE_PAYMENT_CANCELED', 'Impossible d\'importer cancelScheduledCall', {
                    error: importError instanceof Error ? importError.message : String(importError)
                });
            }
        }
        return true;
    }
    catch (canceledError) {
        ultraDebugLogger_1.ultraLogger.error('STRIPE_PAYMENT_CANCELED', 'Erreur traitement annulation paiement', {
            error: canceledError instanceof Error ? canceledError.message : String(canceledError)
        }, canceledError instanceof Error ? canceledError : undefined);
        return false;
    }
}, 'handlePaymentIntentCanceled', 'STRIPE_WEBHOOKS');
const handlePaymentIntentRequiresAction = (0, ultraDebugLogger_1.traceFunction)(async (paymentIntent, database) => {
    var _a;
    try {
        ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_REQUIRES_ACTION', 'Paiement nécessite une action', {
            paymentIntentId: paymentIntent.id,
            nextAction: (_a = paymentIntent.next_action) === null || _a === void 0 ? void 0 : _a.type
        });
        const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
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
        ultraDebugLogger_1.ultraLogger.error('STRIPE_PAYMENT_REQUIRES_ACTION', 'Erreur traitement action requise', {
            error: actionError instanceof Error ? actionError.message : String(actionError)
        }, actionError instanceof Error ? actionError : undefined);
        return false;
    }
}, 'handlePaymentIntentRequiresAction', 'STRIPE_WEBHOOKS');
// ========================================
// FONCTIONS ADMIN SUPPLÉMENTAIRES ULTRA-DEBUGGÉES
// ========================================
exports.adminJoinCall = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminJoinCall', async (request) => {
    var _a;
    const database = initializeFirebase();
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId is required');
    }
    ultraDebugLogger_1.ultraLogger.info('ADMIN_JOIN_CALL', 'Admin rejoint un appel', {
        sessionId,
        adminId: request.auth.uid
    });
    try {
        const twilioCallManager = await getTwilioCallManager();
        const session = await twilioCallManager.getCallSession(sessionId);
        if (!session || session.status !== 'active') {
            ultraDebugLogger_1.ultraLogger.warn('ADMIN_JOIN_CALL', 'Appel non actif', {
                sessionId,
                sessionStatus: (session === null || session === void 0 ? void 0 : session.status) || 'not_found'
            });
            throw new https_2.HttpsError('failed-precondition', 'Call is not active');
        }
        const conferenceUrl = `https://console.twilio.com/us1/develop/voice/manage/conferences/${session.conference.sid}`;
        const accessToken = `admin_${request.auth.uid}_${Date.now()}`;
        await database.collection("adminLogs").add({
            action: "joinCall",
            sessionId,
            conferenceSid: session.conference.sid,
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        ultraDebugLogger_1.ultraLogger.info('ADMIN_JOIN_CALL', 'Informations de conférence générées', {
            sessionId,
            conferenceSid: session.conference.sid,
            conferenceUrl
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
        ultraDebugLogger_1.ultraLogger.error('ADMIN_JOIN_CALL', 'Erreur lors de la tentative de rejoindre l\'appel', {
            sessionId,
            error: joinError instanceof Error ? joinError.message : String(joinError)
        }, joinError instanceof Error ? joinError : undefined);
        throw new https_2.HttpsError('internal', 'Failed to join call');
    }
}));
exports.adminTransferCall = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminTransferCall', async (request) => {
    var _a;
    const database = initializeFirebase();
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { sessionId, newProviderId } = request.data;
    if (!sessionId || !newProviderId) {
        throw new https_2.HttpsError('invalid-argument', 'sessionId and newProviderId are required');
    }
    ultraDebugLogger_1.ultraLogger.info('ADMIN_TRANSFER_CALL', 'Transfert d\'appel initié', {
        sessionId,
        newProviderId,
        adminId: request.auth.uid
    });
    try {
        const newProviderDoc = await database.collection('users').doc(newProviderId).get();
        if (!newProviderDoc.exists) {
            ultraDebugLogger_1.ultraLogger.warn('ADMIN_TRANSFER_CALL', 'Nouveau prestataire non trouvé', {
                newProviderId
            });
            throw new https_2.HttpsError('not-found', 'New provider not found');
        }
        const newProvider = newProviderDoc.data();
        if (!(newProvider === null || newProvider === void 0 ? void 0 : newProvider.phone)) {
            ultraDebugLogger_1.ultraLogger.warn('ADMIN_TRANSFER_CALL', 'Nouveau prestataire sans numéro de téléphone', {
                newProviderId
            });
            throw new https_2.HttpsError('failed-precondition', 'New provider has no phone number');
        }
        if (!['lawyer', 'expat'].includes(newProvider.role)) {
            ultraDebugLogger_1.ultraLogger.warn('ADMIN_TRANSFER_CALL', 'Utilisateur n\'est pas un prestataire', {
                newProviderId,
                role: newProvider.role
            });
            throw new https_2.HttpsError('failed-precondition', 'User is not a provider');
        }
        await database.collection('call_sessions').doc(sessionId).update({
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
        await database.collection("adminLogs").add({
            action: "transferCall",
            sessionId,
            newProviderId,
            newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim(),
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        ultraDebugLogger_1.ultraLogger.info('ADMIN_TRANSFER_CALL', 'Transfert d\'appel terminé avec succès', {
            sessionId,
            newProviderId,
            newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim()
        });
        return {
            success: true,
            message: `Call transferred to provider ${newProviderId}`,
            newProviderId,
            newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim()
        };
    }
    catch (transferError) {
        ultraDebugLogger_1.ultraLogger.error('ADMIN_TRANSFER_CALL', 'Erreur lors du transfert d\'appel', {
            sessionId,
            newProviderId,
            error: transferError instanceof Error ? transferError.message : String(transferError)
        }, transferError instanceof Error ? transferError : undefined);
        throw new https_2.HttpsError('internal', 'Failed to transfer call');
    }
}));
exports.adminMuteParticipant = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('adminMuteParticipant', async (request) => {
    var _a;
    const database = initializeFirebase();
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
    ultraDebugLogger_1.ultraLogger.info('ADMIN_MUTE_PARTICIPANT', 'Mute/unmute participant', {
        sessionId,
        participantType,
        mute,
        adminId: request.auth.uid
    });
    try {
        const twilioCallManager = await getTwilioCallManager();
        const session = await twilioCallManager.getCallSession(sessionId);
        if (!session || session.status !== 'active') {
            ultraDebugLogger_1.ultraLogger.warn('ADMIN_MUTE_PARTICIPANT', 'Appel non actif', {
                sessionId,
                sessionStatus: (session === null || session === void 0 ? void 0 : session.status) || 'not_found'
            });
            throw new https_2.HttpsError('failed-precondition', 'Call is not active');
        }
        const participant = session.participants[participantType];
        if (!participant.callSid) {
            ultraDebugLogger_1.ultraLogger.warn('ADMIN_MUTE_PARTICIPANT', 'CallSid participant non trouvé', {
                sessionId,
                participantType
            });
            throw new https_2.HttpsError('failed-precondition', 'Participant call SID not found');
        }
        await database.collection('call_sessions').doc(sessionId).update({
            [`participants.${participantType}.isMuted`]: mute,
            'metadata.updatedAt': admin.firestore.Timestamp.now(),
            adminActions: admin.firestore.FieldValue.arrayUnion({
                action: mute ? 'mute' : 'unmute',
                participantType,
                performedBy: request.auth.uid,
                performedAt: admin.firestore.Timestamp.now()
            })
        });
        await database.collection("adminLogs").add({
            action: mute ? "muteParticipant" : "unmuteParticipant",
            sessionId,
            participantType,
            callSid: participant.callSid,
            adminId: request.auth.uid,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
        ultraDebugLogger_1.ultraLogger.info('ADMIN_MUTE_PARTICIPANT', 'Action mute/unmute enregistrée', {
            sessionId,
            participantType,
            muted: mute
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
        ultraDebugLogger_1.ultraLogger.error('ADMIN_MUTE_PARTICIPANT', 'Erreur lors du mute/unmute', {
            sessionId,
            participantType,
            error: muteError instanceof Error ? muteError.message : String(muteError)
        }, muteError instanceof Error ? muteError : undefined);
        throw new https_2.HttpsError('internal', 'Failed to mute participant');
    }
}));
// ========================================
// FONCTIONS CRON POUR MAINTENANCE ULTRA-DEBUGGÉES
// ========================================
exports.scheduledFirestoreExport = (0, scheduler_1.onSchedule)({
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
}, async () => {
    const metadata = createDebugMetadata('scheduledFirestoreExport');
    logFunctionStart(metadata);
    try {
        ultraDebugLogger_1.ultraLogger.info('SCHEDULED_BACKUP', 'Démarrage sauvegarde automatique');
        const database = initializeFirebase();
        const projectId = process.env.GCLOUD_PROJECT;
        const bucketName = `${projectId}-backups`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        ultraDebugLogger_1.ultraLogger.debug('SCHEDULED_BACKUP', 'Configuration sauvegarde', {
            projectId,
            bucketName,
            timestamp
        });
        const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
        const firestoreExportName = `firestore-export-${timestamp}`;
        const firestoreExportPath = `gs://${bucketName}/${firestoreExportName}`;
        ultraDebugLogger_1.ultraLogger.info('SCHEDULED_BACKUP', 'Lancement export Firestore', {
            exportPath: firestoreExportPath
        });
        const [firestoreOperation] = await firestoreClient.exportDocuments({
            name: `projects/${projectId}/databases/(default)`,
            outputUriPrefix: firestoreExportPath,
            collectionIds: [],
        });
        ultraDebugLogger_1.ultraLogger.info('SCHEDULED_BACKUP', 'Export Firestore démarré', {
            operationName: firestoreOperation.name
        });
        await database.collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            firestoreExportPath,
            operationName: firestoreOperation.name,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        });
        logFunctionEnd(metadata, { success: true, exportPath: firestoreExportPath });
    }
    catch (exportError) {
        ultraDebugLogger_1.ultraLogger.error('SCHEDULED_BACKUP', 'Erreur sauvegarde automatique', {
            error: exportError instanceof Error ? exportError.message : String(exportError),
            stack: exportError instanceof Error ? exportError.stack : undefined
        }, exportError instanceof Error ? exportError : undefined);
        const errorMessage = exportError instanceof Error ? exportError.message : 'Unknown error';
        const database = initializeFirebase();
        await database.collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: errorMessage
        });
        logFunctionEnd(metadata, undefined, exportError instanceof Error ? exportError : new Error(String(exportError)));
    }
});
exports.scheduledCleanup = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * 0',
    timeZone: 'Europe/Paris'
}, async () => {
    const metadata = createDebugMetadata('scheduledCleanup');
    logFunctionStart(metadata);
    try {
        ultraDebugLogger_1.ultraLogger.info('SCHEDULED_CLEANUP', 'Démarrage nettoyage périodique');
        const twilioCallManager = await getTwilioCallManager();
        ultraDebugLogger_1.ultraLogger.debug('SCHEDULED_CLEANUP', 'Configuration nettoyage', {
            olderThanDays: 90,
            keepCompletedDays: 30,
            batchSize: 100
        });
        const cleanupResult = await twilioCallManager.cleanupOldSessions({
            olderThanDays: 90,
            keepCompletedDays: 30,
            batchSize: 100
        });
        ultraDebugLogger_1.ultraLogger.info('SCHEDULED_CLEANUP', 'Nettoyage terminé', {
            deleted: cleanupResult.deleted,
            errors: cleanupResult.errors
        });
        const database = initializeFirebase();
        await database.collection('logs').doc('cleanup').collection('entries').add({
            type: 'scheduled_cleanup',
            result: cleanupResult,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        logFunctionEnd(metadata, cleanupResult);
    }
    catch (cleanupError) {
        ultraDebugLogger_1.ultraLogger.error('SCHEDULED_CLEANUP', 'Erreur nettoyage périodique', {
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            stack: cleanupError instanceof Error ? cleanupError.stack : undefined
        }, cleanupError instanceof Error ? cleanupError : undefined);
        const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
        const database = initializeFirebase();
        await database.collection('logs').doc('cleanup').collection('entries').add({
            type: 'scheduled_cleanup',
            status: 'failed',
            error: errorMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        logFunctionEnd(metadata, undefined, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));
    }
});
// ========================================
// FONCTION DE DEBUG SYSTÈME
// ========================================
exports.generateSystemDebugReport = (0, https_2.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 120 }, wrapCallableFunction('generateSystemDebugReport', async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    ultraDebugLogger_1.ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Génération rapport de debug système');
    try {
        const database = initializeFirebase();
        // Générer le rapport ultra debug
        const ultraDebugReport = await ultraDebugLogger_1.ultraLogger.generateDebugReport();
        // Informations système
        const systemInfo = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            env: {
                FUNCTION_NAME: process.env.FUNCTION_NAME,
                FUNCTION_REGION: process.env.FUNCTION_REGION,
                GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
                NODE_ENV: process.env.NODE_ENV
            }
        };
        // État des managers
        const managersState = {
            stripe: !!stripeManagerInstance,
            twilioCallManager: !!twilioCallManagerInstance,
            messageManager: !!messageManagerInstance,
            firebaseInitialized: isFirebaseInitialized
        };
        // Statistiques des erreurs récentes
        const recentErrorsQuery = await database.collection('ultra_debug_logs')
            .where('level', '==', 'ERROR')
            .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        const recentErrors = recentErrorsQuery.docs.map(doc => doc.data());
        const fullReport = {
            systemInfo,
            managersState,
            recentErrors: recentErrors.length,
            recentErrorDetails: recentErrors.slice(0, 10), // Top 10 erreurs récentes
            ultraDebugReport: JSON.parse(ultraDebugReport)
        };
        // Sauvegarder le rapport
        const reportId = `debug_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await database.collection('debug_reports').doc(reportId).set(Object.assign(Object.assign({}, fullReport), { generatedBy: request.auth.uid, generatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        ultraDebugLogger_1.ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Rapport de debug généré et sauvegardé', {
            reportId,
            errorsCount: recentErrors.length
        });
        return {
            success: true,
            reportId,
            summary: {
                systemUptime: systemInfo.uptime,
                recentErrorsCount: recentErrors.length,
                managersLoaded: Object.values(managersState).filter(Boolean).length,
                memoryUsage: systemInfo.memoryUsage.heapUsed
            },
            downloadUrl: `/admin/debug-reports/${reportId}`
        };
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('SYSTEM_DEBUG_REPORT', 'Erreur génération rapport debug', {
            error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
        throw new https_2.HttpsError('internal', 'Failed to generate debug report');
    }
}));
// ========================================
// FONCTION DE MONITORING EN TEMPS RÉEL
// ========================================
exports.getSystemHealthStatus = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('getSystemHealthStatus', async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    ultraDebugLogger_1.ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'Vérification état système');
    try {
        const database = initializeFirebase();
        const startTime = Date.now();
        // Test connexion Firestore
        const firestoreTest = Date.now();
        await database.collection('_health_check').limit(1).get();
        const firestoreLatency = Date.now() - firestoreTest;
        // Test Stripe (si configuré)
        let stripeStatus = 'not_configured';
        let stripeLatency = 0;
        try {
            const stripeInstance = getStripe();
            if (stripeInstance) {
                const stripeTest = Date.now();
                await stripeInstance.paymentIntents.list({ limit: 1 });
                stripeLatency = Date.now() - stripeTest;
                stripeStatus = 'healthy';
            }
        }
        catch (stripeError) {
            stripeStatus = 'error';
            ultraDebugLogger_1.ultraLogger.warn('SYSTEM_HEALTH_CHECK', 'Erreur test Stripe', {
                error: stripeError instanceof Error ? stripeError.message : String(stripeError)
            });
        }
        // Statistiques récentes
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogsQuery = await database.collection('ultra_debug_logs')
            .where('timestamp', '>=', last24h.toISOString())
            .get();
        const logsByLevel = {
            ERROR: 0,
            WARN: 0,
            INFO: 0,
            DEBUG: 0,
            TRACE: 0
        };
        recentLogsQuery.docs.forEach(doc => {
            const data = doc.data();
            if (logsByLevel.hasOwnProperty(data.level)) {
                logsByLevel[data.level]++;
            }
        });
        const totalResponseTime = Date.now() - startTime;
        const healthStatus = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            services: {
                firebase: {
                    status: 'healthy',
                    latency: firestoreLatency,
                    initialized: isFirebaseInitialized
                },
                stripe: {
                    status: stripeStatus,
                    latency: stripeLatency
                }
            },
            managers: {
                stripeManager: !!stripeManagerInstance,
                twilioCallManager: !!twilioCallManagerInstance,
                messageManager: !!messageManagerInstance
            },
            system: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development'
            },
            metrics: {
                last24h: logsByLevel,
                responseTime: totalResponseTime
            }
        };
        // Déterminer le statut global
        if (firestoreLatency > 1000 || stripeStatus === 'error') {
            healthStatus.status = 'degraded';
        }
        if (logsByLevel.ERROR > 100) {
            healthStatus.status = 'unhealthy';
        }
        ultraDebugLogger_1.ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'État système vérifié', {
            status: healthStatus.status,
            responseTime: totalResponseTime,
            errorsLast24h: logsByLevel.ERROR
        });
        return healthStatus;
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('SYSTEM_HEALTH_CHECK', 'Erreur vérification état système', {
            error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
        return {
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}));
// ========================================
// INITIALISATION FINALE ET LOGS DE DÉMARRAGE
// ========================================
ultraDebugLogger_1.ultraLogger.info('INDEX_COMPLETE', 'Fichier index.ts chargé avec succès', {
    totalFunctions: 15, // Nombre approximatif de fonctions exportées
    environment: process.env.NODE_ENV || 'development',
    memoryUsage: process.memoryUsage(),
    loadTime: Date.now() - parseInt(process.env.LOAD_START_TIME || '0') || 'unknown'
});
// Export d'une fonction utilitaire pour obtenir les logs
exports.getUltraDebugLogs = (0, https_2.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 30 }, wrapCallableFunction('getUltraDebugLogs', async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new https_2.HttpsError('permission-denied', 'Admin access required');
    }
    const { limit = 100, level } = request.data || {};
    try {
        const database = initializeFirebase();
        let query = database.collection('ultra_debug_logs')
            .orderBy('timestamp', 'desc')
            .limit(Math.min(limit, 500)); // Max 500 pour éviter les timeouts
        if (level && ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'].includes(level)) {
            query = query.where('level', '==', level);
        }
        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return {
            success: true,
            logs,
            count: logs.length,
            filtered: !!level
        };
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('GET_ULTRA_DEBUG_LOGS', 'Erreur récupération logs', {
            error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
        throw new https_2.HttpsError('internal', 'Failed to retrieve logs');
    }
}));
ultraDebugLogger_1.ultraLogger.info('INDEX_EXPORTS_COMPLETE', 'Toutes les fonctions exportées et configurées avec ultra debug');
//# sourceMappingURL=index.js.map