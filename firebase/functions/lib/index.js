"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testWebhook = exports.manuallyTriggerCallExecution = exports.getCloudTasksQueueStats = exports.testCloudTasksConnection = exports.getUltraDebugLogs = exports.getSystemHealthStatus = exports.generateSystemDebugReport = exports.scheduledCleanup = exports.scheduledFirestoreExport = exports.stripeWebhook = exports.adminBulkUpdateStatus = exports.adminSoftDeleteUser = exports.adminUpdateStatus = exports.executeCallTask = exports.notifyAfterPayment = exports.initializeMessageTemplates = exports.unifiedWebhook = exports.api = exports.createPaymentIntent = exports.createAndScheduleCall = exports.createAndScheduleCallHTTPS = exports.STRIPE_WEBHOOK_SECRET_LIVE = exports.STRIPE_WEBHOOK_SECRET_TEST = exports.STRIPE_MODE = exports.TASKS_AUTH_SECRET = exports.STRIPE_SECRET_KEY_LIVE = exports.STRIPE_SECRET_KEY_TEST = exports.TWILIO_PHONE_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = exports.EMAIL_PASS = exports.EMAIL_USER = void 0;
// ====== ULTRA DEBUG INITIALIZATION ======
const ultraDebugLogger_1 = require("./utils/ultraDebugLogger");
// Tracer tous les imports principaux
(0, ultraDebugLogger_1.traceGlobalImport)('firebase-functions/v2', 'index.ts');
(0, ultraDebugLogger_1.traceGlobalImport)('firebase-admin', 'index.ts');
(0, ultraDebugLogger_1.traceGlobalImport)('stripe', 'index.ts');
// === CPU/MEM CONFIGS to control vCPU usage ===
const emergencyConfig = {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1
};
ultraDebugLogger_1.ultraLogger.info('INDEX_INIT', 'Démarrage de l\'initialisation du fichier index.ts', {
    timestamp: Date.now(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
});
// ====== CONFIGURATION GLOBALE CENTRALISÉE ======
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
// 🔐 Déclarations **UNIQUEMENT** des secrets que tu utilises réellement
exports.EMAIL_USER = (0, params_1.defineSecret)("EMAIL_USER");
exports.EMAIL_PASS = (0, params_1.defineSecret)("EMAIL_PASS");
// export const EMAIL_FROM = defineSecret("EMAIL_FROM"); // optionnel
// Twilio (si utilisés)
exports.TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)("TWILIO_ACCOUNT_SID");
exports.TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)("TWILIO_AUTH_TOKEN");
exports.TWILIO_PHONE_NUMBER = (0, params_1.defineSecret)("TWILIO_PHONE_NUMBER");
// Stripe
exports.STRIPE_SECRET_KEY_TEST = (0, params_1.defineSecret)("STRIPE_SECRET_KEY_TEST");
exports.STRIPE_SECRET_KEY_LIVE = (0, params_1.defineSecret)("STRIPE_SECRET_KEY_LIVE");
// Cloud Tasks auth
exports.TASKS_AUTH_SECRET = (0, params_1.defineSecret)("TASKS_AUTH_SECRET");
// ✅ Centralise la liste globale
const GLOBAL_SECRETS = [
    exports.EMAIL_USER, exports.EMAIL_PASS,
    // EMAIL_FROM,
    exports.TWILIO_ACCOUNT_SID, exports.TWILIO_AUTH_TOKEN, exports.TWILIO_PHONE_NUMBER,
    exports.STRIPE_SECRET_KEY_TEST, exports.STRIPE_SECRET_KEY_LIVE,
    exports.TASKS_AUTH_SECRET,
].filter(Boolean);
// ⚠️ cast 'as any' pour accepter eventarc si les types ne sont pas à jour
(0, v2_1.setGlobalOptions)({
    region: "europe-west1",
    eventarc: { location: "europe-west1" },
    secrets: GLOBAL_SECRETS
});
// ====== IMPORTS PRINCIPAUX ======
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// 🦾 Cloud Tasks helper
const tasks_1 = require("./lib/tasks");
// ====== IMPORTS DES MODULES PRINCIPAUX ======
const createAndScheduleCallFunction_1 = require("./createAndScheduleCallFunction");
Object.defineProperty(exports, "createAndScheduleCallHTTPS", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
Object.defineProperty(exports, "createAndScheduleCall", { enumerable: true, get: function () { return createAndScheduleCallFunction_1.createAndScheduleCallHTTPS; } });
const executeCallTask_1 = require("./runtime/executeCallTask");
const MessageManager_1 = require("./MessageManager");
ultraDebugLogger_1.ultraLogger.debug('IMPORTS', 'Imports principaux chargés avec succès');
// ====== PARAMS & SECRETS ADDITIONNELS ======
exports.STRIPE_MODE = (0, params_1.defineString)('STRIPE_MODE'); // 'test' | 'live'
exports.STRIPE_WEBHOOK_SECRET_TEST = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET_TEST');
exports.STRIPE_WEBHOOK_SECRET_LIVE = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET_LIVE');
// Helpers de sélection de secrets selon le mode
function isLive() {
    return (exports.STRIPE_MODE.value() || 'test').toLowerCase() === 'live';
}
function getStripeSecretKey() {
    return isLive()
        ? (process.env.STRIPE_SECRET_KEY_LIVE || '')
        : (process.env.STRIPE_SECRET_KEY_TEST || '');
}
function getStripeWebhookSecret() {
    return isLive()
        ? (process.env.STRIPE_WEBHOOK_SECRET_LIVE || '')
        : (process.env.STRIPE_WEBHOOK_SECRET_TEST || '');
}
ultraDebugLogger_1.ultraLogger.debug('TYPES', 'Interfaces et types définis');
// ====== INITIALISATION FIREBASE ULTRA-DÉBUGGÉE ======
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
            // Configuration Firestore
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
// ====== LAZY LOADING DES MANAGERS ======
const stripeManagerInstance = null; // placeholder
let twilioCallManagerInstance = null; // réassigné après import
const messageManagerInstance = null; // placeholder
const getTwilioCallManager = (0, ultraDebugLogger_1.traceFunction)(async () => {
    if (!twilioCallManagerInstance) {
        const mod = (await Promise.resolve().then(() => __importStar(require('./TwilioCallManager'))));
        const resolved = mod.twilioCallManager ?? mod.default;
        if (!resolved) {
            throw new Error('TwilioCallManager introuvable dans ./TwilioCallManager (ni export nommé, ni export par défaut).');
        }
        twilioCallManagerInstance = resolved;
    }
    return twilioCallManagerInstance;
}, 'getTwilioCallManager', 'INDEX');
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
        const metadata = createDebugMetadata(functionName, request.auth?.uid);
        logFunctionStart(metadata, {
            hasAuth: !!request.auth,
            authUid: request.auth?.uid,
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
// ====== EXPORTS DIRECTS ======
ultraDebugLogger_1.ultraLogger.info('EXPORTS', 'Début du chargement des exports directs');
var createPaymentIntent_1 = require("./createPaymentIntent");
Object.defineProperty(exports, "createPaymentIntent", { enumerable: true, get: function () { return createPaymentIntent_1.createPaymentIntent; } });
var adminApi_1 = require("./adminApi");
Object.defineProperty(exports, "api", { enumerable: true, get: function () { return adminApi_1.api; } });
// Webhooks
var unifiedWebhook_1 = require("./Webhooks/unifiedWebhook");
Object.defineProperty(exports, "unifiedWebhook", { enumerable: true, get: function () { return unifiedWebhook_1.unifiedWebhook; } });
// Utilitaires complémentaires
var initializeMessageTemplates_1 = require("./initializeMessageTemplates");
Object.defineProperty(exports, "initializeMessageTemplates", { enumerable: true, get: function () { return initializeMessageTemplates_1.initializeMessageTemplates; } });
var notifyAfterPayment_1 = require("./notifications/notifyAfterPayment");
Object.defineProperty(exports, "notifyAfterPayment", { enumerable: true, get: function () { return notifyAfterPayment_1.notifyAfterPayment; } });
// Exports additionnels
__exportStar(require("./notificationPipeline/worker"), exports);
__exportStar(require("./admin/callables"), exports);
ultraDebugLogger_1.ultraLogger.info('EXPORTS', 'Exports directs configurés');
// ========================================
// 🦾 ENDPOINT CLOUD TASKS : exécuter l'appel
// ========================================
exports.executeCallTask = (0, https_1.onRequest)({
    region: "europe-west1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cpu: 0.25,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1
}, (req, res) => (0, executeCallTask_1.runExecuteCallTask)(req, res));
// ========================================
// FONCTIONS ADMIN (V2)
// ========================================
exports.adminUpdateStatus = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 30
}, wrapCallableFunction('adminUpdateStatus', async (request) => {
    const database = initializeFirebase();
    ultraDebugLogger_1.ultraLogger.debug('ADMIN_UPDATE_STATUS', 'Vérification des permissions admin', {
        hasAuth: !!request.auth,
        userRole: request.auth?.token?.role
    });
    if (!request.auth || request.auth.token?.role !== 'admin') {
        ultraDebugLogger_1.ultraLogger.warn('ADMIN_UPDATE_STATUS', 'Accès refusé - permissions admin requises', {
            userId: request.auth?.uid,
            userRole: request.auth?.token?.role
        });
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId, status, reason } = request.data;
    ultraDebugLogger_1.ultraLogger.info('ADMIN_UPDATE_STATUS', 'Mise à jour du statut utilisateur', {
        targetUserId: userId,
        newStatus: status,
        reason,
        adminId: request.auth.uid
    });
    await database.collection('users').doc(userId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await database.collection('adminLogs').add({
        action: 'updateStatus',
        userId,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp()
    });
    ultraDebugLogger_1.ultraLogger.info('ADMIN_UPDATE_STATUS', 'Statut utilisateur mis à jour avec succès', {
        targetUserId: userId,
        newStatus: status
    });
    return { ok: true };
}));
exports.adminSoftDeleteUser = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 30
}, wrapCallableFunction('adminSoftDeleteUser', async (request) => {
    const database = initializeFirebase();
    if (!request.auth || request.auth.token?.role !== 'admin') {
        ultraDebugLogger_1.ultraLogger.warn('ADMIN_SOFT_DELETE', 'Accès refusé', {
            userId: request.auth?.uid
        });
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { userId, reason } = request.data;
    ultraDebugLogger_1.ultraLogger.info('ADMIN_SOFT_DELETE', 'Suppression soft de l\'utilisateur', {
        targetUserId: userId,
        reason,
        adminId: request.auth.uid
    });
    await database.collection('users').doc(userId).update({
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: request.auth.uid,
        deletedReason: reason || null
    });
    await database.collection('adminLogs').add({
        action: 'softDelete',
        userId,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}));
exports.adminBulkUpdateStatus = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 30
}, wrapCallableFunction('adminBulkUpdateStatus', async (request) => {
    const database = initializeFirebase();
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
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
    ids.forEach((id) => batch.update(database.collection('users').doc(id), {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }));
    await batch.commit();
    await database.collection('adminLogs').add({
        action: 'bulkUpdateStatus',
        ids,
        status,
        reason: reason || null,
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}));
// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES (Stripe)
// ========================================
let stripe = null;
const getStripe = (0, ultraDebugLogger_1.traceFunction)(() => {
    if (!stripe) {
        ultraDebugLogger_1.ultraLogger.info('STRIPE_INIT', 'Initialisation de Stripe', { mode: isLive() ? 'live' : 'test' });
        let stripeSecretKey = '';
        try {
            stripeSecretKey = getStripeSecretKey();
            ultraDebugLogger_1.ultraLogger.debug('STRIPE_INIT', 'Clé Stripe récupérée via Secret Manager', {
                mode: isLive() ? 'live' : 'test',
                keyPrefix: stripeSecretKey?.slice(0, 7) + '...'
            });
        }
        catch (secretError) {
            ultraDebugLogger_1.ultraLogger.error('STRIPE_INIT', 'Secret Stripe non configuré', {
                error: secretError instanceof Error ? secretError.message : String(secretError)
            });
            return null;
        }
        if (stripeSecretKey && stripeSecretKey.startsWith('sk_')) {
            try {
                stripe = new stripe_1.default(stripeSecretKey, {
                    apiVersion: '2023-10-16'
                });
                ultraDebugLogger_1.ultraLogger.info('STRIPE_INIT', 'Stripe configuré avec succès', { mode: isLive() ? 'live' : 'test' });
            }
            catch (stripeError) {
                ultraDebugLogger_1.ultraLogger.error('STRIPE_INIT', 'Erreur configuration Stripe', { error: stripeError instanceof Error ? stripeError.message : String(stripeError) }, stripeError instanceof Error ? stripeError : undefined);
                stripe = null;
            }
        }
        else {
            ultraDebugLogger_1.ultraLogger.warn('STRIPE_INIT', 'Stripe non configuré - Secret Key manquante ou invalide', { mode: isLive() ? 'live' : 'test' });
        }
    }
    return stripe;
}, 'getStripe', 'INDEX');
// ====== HELPER POUR ENVOI AUTOMATIQUE DES MESSAGES ======
const sendPaymentNotifications = (0, ultraDebugLogger_1.traceFunction)(async (callSessionId, database) => {
    try {
        ultraDebugLogger_1.ultraLogger.info('PAYMENT_NOTIFICATIONS', 'Envoi des notifications post-paiement', { callSessionId });
        const snap = await database.collection('call_sessions').doc(callSessionId).get();
        if (!snap.exists) {
            ultraDebugLogger_1.ultraLogger.warn('PAYMENT_NOTIFICATIONS', 'Session introuvable', { callSessionId });
            return;
        }
        const cs = snap.data();
        const providerPhone = cs?.participants?.provider?.phone ?? cs?.providerPhone ?? '';
        const clientPhone = cs?.participants?.client?.phone ?? cs?.clientPhone ?? '';
        const language = cs?.metadata?.clientLanguages?.[0] ?? 'fr';
        const title = cs?.metadata?.title ?? cs?.title ?? 'Consultation';
        ultraDebugLogger_1.ultraLogger.debug('PAYMENT_NOTIFICATIONS', 'Données extraites', {
            callSessionId,
            providerPhone: providerPhone ? `${providerPhone.slice(0, 4)}...` : 'none',
            clientPhone: clientPhone ? `${clientPhone.slice(0, 4)}...` : 'none',
            language,
            title
        });
        const notifications = await Promise.allSettled([
            providerPhone
                ? MessageManager_1.messageManager.sendSmartMessage({
                    to: providerPhone,
                    templateId: 'provider_notification',
                    variables: { requestTitle: title, language },
                    preferWhatsApp: false
                })
                : Promise.resolve({ skipped: 'no_provider_phone' }),
            clientPhone
                ? MessageManager_1.messageManager.sendSmartMessage({
                    to: clientPhone,
                    templateId: 'client_notification',
                    variables: { requestTitle: title, language },
                    preferWhatsApp: false
                })
                : Promise.resolve({ skipped: 'no_client_phone' })
        ]);
        const results = notifications.map((result, index) => ({
            target: index === 0 ? 'provider' : 'client',
            status: result.status,
            ...(result.status === 'fulfilled' ? { result: result.value } : { error: result.reason })
        }));
        ultraDebugLogger_1.ultraLogger.info('PAYMENT_NOTIFICATIONS', 'Notifications envoyées', {
            callSessionId,
            results
        });
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('PAYMENT_NOTIFICATIONS', 'Erreur envoi notifications', {
            callSessionId,
            error: error instanceof Error ? error.message : String(error)
        }, error instanceof Error ? error : undefined);
    }
}, 'sendPaymentNotifications', 'STRIPE_WEBHOOKS');
// ====== WEBHOOK STRIPE ======
exports.stripeWebhook = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "512MiB",
    concurrency: 1,
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 5
}, wrapHttpFunction('stripeWebhook', async (req, res) => {
    const signature = req.headers['stripe-signature'];
    ultraDebugLogger_1.ultraLogger.debug('STRIPE_WEBHOOK', 'Webhook Stripe reçu', {
        hasSignature: !!signature,
        method: req.method,
        contentType: req.headers['content-type'],
        mode: isLive() ? 'live' : 'test'
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
        const event = stripeInstance.webhooks.constructEvent(rawBody.toString(), signature, getStripeWebhookSecret());
        const objectId = (() => {
            const o = event.data.object;
            return o && typeof o === 'object' && 'id' in o ? o.id : undefined;
        })();
        ultraDebugLogger_1.ultraLogger.info('STRIPE_WEBHOOK', 'Événement Stripe validé', {
            eventType: event.type,
            eventId: event.id,
            objectId
        });
        switch (event.type) {
            case 'payment_intent.created':
                ultraDebugLogger_1.ultraLogger.debug('STRIPE_WEBHOOK', 'payment_intent.created', { id: objectId });
                break;
            case 'payment_intent.processing':
                ultraDebugLogger_1.ultraLogger.debug('STRIPE_WEBHOOK', 'payment_intent.processing', { id: objectId });
                break;
            case 'payment_intent.requires_action':
                await handlePaymentIntentRequiresAction(event.data.object, database);
                break;
            case 'checkout.session.completed': {
                ultraDebugLogger_1.ultraLogger.info('STRIPE_WEBHOOK', 'checkout.session.completed', { id: objectId });
                const cs = event.data.object;
                const callSessionId = cs.metadata?.callSessionId || cs.metadata?.sessionId;
                if (callSessionId) {
                    await database
                        .collection('call_sessions')
                        .doc(callSessionId)
                        .set({
                        status: 'scheduled',
                        scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                        delaySeconds: 300,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        checkoutSessionId: cs.id,
                        paymentIntentId: typeof cs.payment_intent === 'string' ? cs.payment_intent : undefined
                    }, { merge: true });
                    await (0, tasks_1.scheduleCallTask)(callSessionId, 300);
                    ultraDebugLogger_1.ultraLogger.info('CHECKOUT_COMPLETED', 'Task planifiée à +300s', {
                        callSessionId,
                        delaySeconds: 300
                    });
                    // 🔔 ENVOI AUTOMATIQUE DES NOTIFICATIONS
                    await sendPaymentNotifications(callSessionId, database);
                }
                break;
            }
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object, database);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object, database);
                break;
            case 'payment_intent.canceled':
                await handlePaymentIntentCanceled(event.data.object, database);
                break;
            case 'charge.refunded':
                ultraDebugLogger_1.ultraLogger.warn('STRIPE_WEBHOOK', 'charge.refunded', { id: objectId });
                break;
            case 'refund.updated':
                ultraDebugLogger_1.ultraLogger.warn('STRIPE_WEBHOOK', 'refund.updated', { id: objectId });
                break;
            default:
                ultraDebugLogger_1.ultraLogger.debug('STRIPE_WEBHOOK', "Type d'événement non géré", {
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
// Handlers Stripe
const handlePaymentIntentSucceeded = (0, ultraDebugLogger_1.traceFunction)(async (paymentIntent, database) => {
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
                currency: paymentIntent.currency ?? 'eur',
                capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Base de données mise à jour');
        }
        // ✅ Fallback pour retrouver callSessionId
        let callSessionId = paymentIntent.metadata?.callSessionId || '';
        if (!callSessionId) {
            const snap = await database.collection('payments')
                .where('stripePaymentIntentId', '==', paymentIntent.id)
                .limit(1)
                .get();
            if (!snap.empty)
                callSessionId = snap.docs[0].data()?.callSessionId || '';
        }
        if (callSessionId) {
            ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Déclenchement des opérations post-paiement', {
                callSessionId
            });
            await database
                .collection('call_sessions')
                .doc(callSessionId)
                .set({
                status: 'scheduled',
                scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                delaySeconds: 300,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentIntentId: paymentIntent.id
            }, { merge: true });
            await (0, tasks_1.scheduleCallTask)(callSessionId, 300);
            ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Cloud Task créée pour appel à +300s', {
                callSessionId,
                delaySeconds: 300
            });
            // 🔔 ENVOI AUTOMATIQUE DES NOTIFICATIONS
            await sendPaymentNotifications(callSessionId, database);
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
    try {
        ultraDebugLogger_1.ultraLogger.warn('STRIPE_PAYMENT_FAILED', 'Paiement échoué', {
            paymentIntentId: paymentIntent.id,
            errorMessage: paymentIntent.last_payment_error?.message
        });
        const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'failed',
                currency: paymentIntent.currency ?? 'eur',
                failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        if (paymentIntent.metadata?.callSessionId) {
            try {
                ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_FAILED', 'Annulation appel programmé', {
                    callSessionId: paymentIntent.metadata.callSessionId
                });
                const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
                await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
            }
            catch (importError) {
                ultraDebugLogger_1.ultraLogger.warn('STRIPE_PAYMENT_FAILED', "Impossible d'importer cancelScheduledCall", {
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
                currency: paymentIntent.currency ?? 'eur',
                canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        if (paymentIntent.metadata?.callSessionId) {
            try {
                ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Annulation appel programmé', {
                    callSessionId: paymentIntent.metadata.callSessionId
                });
                const { cancelScheduledCall } = await Promise.resolve().then(() => __importStar(require('./callScheduler')));
                await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
            }
            catch (importError) {
                ultraDebugLogger_1.ultraLogger.warn('STRIPE_PAYMENT_CANCELED', "Impossible d'importer cancelScheduledCall", {
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
    try {
        ultraDebugLogger_1.ultraLogger.info('STRIPE_PAYMENT_REQUIRES_ACTION', 'Paiement nécessite une action', {
            paymentIntentId: paymentIntent.id,
            nextAction: paymentIntent.next_action?.type
        });
        const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'requires_action',
                currency: paymentIntent.currency ?? 'eur',
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
// FONCTIONS CRON POUR MAINTENANCE
// ========================================
exports.scheduledFirestoreExport = (0, scheduler_1.onSchedule)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
}, async () => {
    const metadata = createDebugMetadata('scheduledFirestoreExport');
    logFunctionStart(metadata);
    try {
        ultraDebugLogger_1.ultraLogger.info('SCHEDULED_BACKUP', 'Décollage sauvegarde automatique');
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
            collectionIds: []
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
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
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
exports.generateSystemDebugReport = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 120
}, wrapCallableFunction('generateSystemDebugReport', async (request) => {
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    ultraDebugLogger_1.ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Génération rapport de debug système');
    try {
        const database = initializeFirebase();
        const ultraDebugReport = await ultraDebugLogger_1.ultraLogger.generateDebugReport();
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
        const managersState = {
            stripeManagerInstance: !!stripeManagerInstance,
            twilioCallManagerInstance: !!twilioCallManagerInstance,
            messageManagerInstance: !!messageManagerInstance,
            firebaseInitialized: isFirebaseInitialized
        };
        const recentErrorsQuery = await database
            .collection('ultra_debug_logs')
            .where('level', '==', 'ERROR')
            .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        const recentErrors = recentErrorsQuery.docs.map((doc) => doc.data());
        const fullReport = {
            systemInfo,
            managersState,
            recentErrors: recentErrors.length,
            recentErrorDetails: recentErrors.slice(0, 10),
            ultraDebugReport: JSON.parse(ultraDebugReport)
        };
        const reportId = `debug_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await database.collection('debug_reports').doc(reportId).set({
            ...fullReport,
            generatedBy: request.auth.uid,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
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
        ultraDebugLogger_1.ultraLogger.error('SYSTEM_DEBUG_REPORT', 'Erreur génération rapport debug', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        throw new https_1.HttpsError('internal', 'Failed to generate debug report');
    }
}));
// ========================================
// FONCTION DE MONITORING EN TEMPS RÉEL
// ========================================
exports.getSystemHealthStatus = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 30
}, wrapCallableFunction('getSystemHealthStatus', async (request) => {
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    ultraDebugLogger_1.ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'Vérification état système');
    try {
        const database = initializeFirebase();
        const startTime = Date.now();
        const firestoreTest = Date.now();
        await database.collection('_health_check').limit(1).get();
        const firestoreLatency = Date.now() - firestoreTest;
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
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogsQuery = await database.collection('ultra_debug_logs').where('timestamp', '>=', last24h.toISOString()).get();
        const logsByLevel = {
            ERROR: 0,
            WARN: 0,
            INFO: 0,
            DEBUG: 0,
            TRACE: 0
        };
        recentLogsQuery.docs.forEach((doc) => {
            const data = doc.data();
            if (Object.prototype.hasOwnProperty.call(logsByLevel, data.level)) {
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
        ultraDebugLogger_1.ultraLogger.error('SYSTEM_HEALTH_CHECK', 'Erreur vérification état système', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        return {
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}));
// ========================================
// LOGS DEBUG ULTRA
// ========================================
exports.getUltraDebugLogs = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 30
}, wrapCallableFunction('getUltraDebugLogs', async (request) => {
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { limit = 100, level } = request.data || {};
    try {
        const database = initializeFirebase();
        let query = database.collection('ultra_debug_logs').orderBy('timestamp', 'desc').limit(Math.min(limit, 500));
        if (level && ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'].includes(level)) {
            query = query.where('level', '==', level);
        }
        const snapshot = await query.get();
        const logs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        return {
            success: true,
            logs,
            count: logs.length,
            filtered: !!level
        };
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('GET_ULTRA_DEBUG_LOGS', 'Erreur récupération logs', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        throw new https_1.HttpsError('internal', 'Failed to retrieve logs');
    }
}));
// ========================================
// FONCTIONS DE TEST ET UTILITAIRES
// ========================================
exports.testCloudTasksConnection = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 60
}, wrapCallableFunction('testCloudTasksConnection', async (request) => {
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        ultraDebugLogger_1.ultraLogger.info('TEST_CLOUD_TASKS', 'Test de connexion Cloud Tasks');
        const { createTestTask } = await Promise.resolve().then(() => __importStar(require('./lib/tasks')));
        const testPayload = request.data?.testPayload || { test: 'cloud_tasks_connection' };
        const taskId = await createTestTask(testPayload, 10);
        ultraDebugLogger_1.ultraLogger.info('TEST_CLOUD_TASKS', 'Tâche de test créée avec succès', {
            taskId,
            delaySeconds: 10
        });
        return {
            success: true,
            taskId,
            message: 'Tâche de test créée, elle s\'exécutera dans 10 secondes',
            testPayload,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('TEST_CLOUD_TASKS', 'Erreur test Cloud Tasks', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        throw new https_1.HttpsError('internal', `Test Cloud Tasks échoué: ${error instanceof Error ? error.message : error}`);
    }
}));
exports.getCloudTasksQueueStats = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 30
}, wrapCallableFunction('getCloudTasksQueueStats', async (request) => {
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        ultraDebugLogger_1.ultraLogger.info('QUEUE_STATS', 'Récupération statistiques queue Cloud Tasks');
        const { getQueueStats, listPendingTasks } = await Promise.resolve().then(() => __importStar(require('./lib/tasks')));
        const [stats, pendingTasks] = await Promise.all([
            getQueueStats(),
            listPendingTasks(20),
        ]);
        ultraDebugLogger_1.ultraLogger.info('QUEUE_STATS', 'Statistiques récupérées', {
            pendingTasksCount: stats.pendingTasks,
            queueName: stats.queueName,
            location: stats.location
        });
        return {
            success: true,
            stats,
            pendingTasksSample: pendingTasks,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('QUEUE_STATS', 'Erreur récupération statistiques queue', { error: error instanceof Error ? error.message : String(error) }, error instanceof Error ? error : undefined);
        throw new https_1.HttpsError('internal', `Erreur récupération stats: ${error instanceof Error ? error.message : error}`);
    }
}));
exports.manuallyTriggerCallExecution = (0, https_1.onCall)({
    ...emergencyConfig,
    timeoutSeconds: 60
}, wrapCallableFunction('manuallyTriggerCallExecution', async (request) => {
    if (!request.auth || request.auth.token?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    const { callSessionId } = request.data;
    if (!callSessionId) {
        throw new https_1.HttpsError('invalid-argument', 'callSessionId requis');
    }
    try {
        ultraDebugLogger_1.ultraLogger.info('MANUAL_CALL_TRIGGER', 'Déclenchement manuel d\'appel', {
            callSessionId,
            triggeredBy: request.auth.uid
        });
        const database = initializeFirebase();
        const sessionDoc = await database.collection('call_sessions').doc(callSessionId).get();
        if (!sessionDoc.exists) {
            throw new https_1.HttpsError('not-found', `Session ${callSessionId} introuvable`);
        }
        const sessionData = sessionDoc.data();
        ultraDebugLogger_1.ultraLogger.info('MANUAL_CALL_TRIGGER', 'Session trouvée', {
            callSessionId,
            currentStatus: sessionData?.status,
            paymentStatus: sessionData?.payment?.status
        });
        const { TwilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        const result = await TwilioCallManager.startOutboundCall({
            sessionId: callSessionId,
            delayMinutes: 0,
        });
        ultraDebugLogger_1.ultraLogger.info('MANUAL_CALL_TRIGGER', 'Appel déclenché avec succès', {
            callSessionId,
            resultStatus: result?.status
        });
        return {
            success: true,
            callSessionId,
            result,
            triggeredBy: request.auth.uid,
            timestamp: new Date().toISOString(),
            message: 'Appel déclenché manuellement avec succès'
        };
    }
    catch (error) {
        ultraDebugLogger_1.ultraLogger.error('MANUAL_CALL_TRIGGER', 'Erreur déclenchement manuel d\'appel', {
            callSessionId,
            error: error instanceof Error ? error.message : String(error),
            triggeredBy: request.auth.uid
        }, error instanceof Error ? error : undefined);
        throw new https_1.HttpsError('internal', `Erreur déclenchement appel: ${error instanceof Error ? error.message : error}`);
    }
}));
// ========================================
// WEBHOOK DE TEST POUR CLOUD TASKS
// ========================================
exports.testWebhook = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    concurrency: 1,
    timeoutSeconds: 60
}, wrapHttpFunction('testWebhook', async (_req, res) => {
    try {
        res.status(200).json({ ok: true, now: new Date().toISOString() });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e?.message ?? e) });
    }
}));
//# sourceMappingURL=index.js.map