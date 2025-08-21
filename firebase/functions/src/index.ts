// functions/src/index.ts - Version Ultra Debug avec traçage complet

// ====== ULTRA DEBUG INITIALIZATION ======
import { ultraLogger, traceFunction, traceGlobalImport } from './utils/ultraDebugLogger';

// Tracer tous les imports principaux
traceGlobalImport('firebase-functions/v2', 'index.ts');
traceGlobalImport('firebase-admin', 'index.ts');
traceGlobalImport('stripe', 'index.ts');

ultraLogger.info('INDEX_INIT', 'Démarrage de l\'initialisation du fichier index.ts', {
  timestamp: Date.now(),
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development'
});

// ====== CONFIGURATION GLOBALE ======
import { setGlobalOptions } from 'firebase-functions/v2';

const globalConfig = {
  region: 'europe-west1',
};

ultraLogger.debug('GLOBAL_CONFIG', 'Configuration globale Firebase Functions', globalConfig);

setGlobalOptions(globalConfig);

ultraLogger.info('GLOBAL_CONFIG', 'Configuration globale Firebase Functions appliquée', globalConfig);

// ====== IMPORTS PRINCIPAUX ======
import { onRequest } from 'firebase-functions/v2/https';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import type { Request as ExpressRequest, Response } from 'express';

ultraLogger.debug('IMPORTS', 'Imports principaux chargés avec succès');

// ====== INTERFACES DE DEBUGGING ======
interface UltraDebugMetadata {
  sessionId: string;
  requestId: string;
  userId?: string;
  functionName: string;
  startTime: number;
  environment: string;
}

interface DebuggedRequest extends ExpressRequest {
  debugMetadata?: UltraDebugMetadata;
}

interface FirebaseRequest extends DebuggedRequest {
  rawBody: Buffer;
}

// ====== TYPES POUR LES FONCTIONS ADMIN ======
interface AdminUpdateStatusData {
  userId: string;
  status: "active" | "pending" | "blocked" | "suspended";
  reason?: string;
}

interface AdminSoftDeleteData {
  userId: string;
  reason?: string;
}

interface AdminBulkUpdateData {
  ids: string[];
  status: "active" | "pending" | "blocked" | "suspended";
  reason?: string;
}

interface AdminCallActionData {
  sessionId: string;
  reason?: string;
}

interface AdminTransferCallData {
  sessionId: string;
  newProviderId: string;
}

interface AdminMuteParticipantData {
  sessionId: string;
  participantType: string;
  mute?: boolean;
}

interface CustomClaims {
  role?: string;
  [key: string]: unknown;
}

ultraLogger.debug('TYPES', 'Interfaces et types définis');

// ====== INITIALISATION FIREBASE ULTRA-DEBUGGÉE ======
let isFirebaseInitialized = false;
let db: admin.firestore.Firestore;
let initializationError: Error | null = null;

const initializeFirebase = traceFunction(() => {
  if (!isFirebaseInitialized && !initializationError) {
    try {
      ultraLogger.info('FIREBASE_INIT', 'Début d\'initialisation Firebase');
      
      const startTime = Date.now();
      
      if (!admin.apps.length) {
        ultraLogger.debug('FIREBASE_INIT', 'Aucune app Firebase détectée, initialisation...');
        admin.initializeApp();
        ultraLogger.info('FIREBASE_INIT', 'Firebase Admin SDK initialisé');
      } else {
        ultraLogger.debug('FIREBASE_INIT', 'Firebase déjà initialisé, utilisation de l\'instance existante');
      }
      
      db = admin.firestore();
      ultraLogger.debug('FIREBASE_INIT', 'Instance Firestore récupérée');
      
      // Configuration Firestore avec traçage
      try {
        db.settings({ ignoreUndefinedProperties: true });
        ultraLogger.info('FIREBASE_INIT', 'Firestore configuré avec ignoreUndefinedProperties: true');
      } catch (settingsError) {
        ultraLogger.warn('FIREBASE_INIT', 'Firestore déjà configuré (normal)', {
          error: settingsError instanceof Error ? settingsError.message : String(settingsError)
        });
      }
      
      const initTime = Date.now() - startTime;
      isFirebaseInitialized = true;
      
      ultraLogger.info('FIREBASE_INIT', 'Firebase initialisé avec succès', {
        initializationTime: `${initTime}ms`,
        projectId: admin.app().options.projectId,
        databaseURL: admin.app().options.databaseURL,
        storageBucket: admin.app().options.storageBucket
      });
      
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error(String(error));
      ultraLogger.error('FIREBASE_INIT', 'Erreur critique lors de l\'initialisation Firebase', {
        error: initializationError.message,
        stack: initializationError.stack
      }, initializationError);
      throw initializationError;
    }
  } else if (initializationError) {
    ultraLogger.error('FIREBASE_INIT', 'Tentative d\'utilisation après erreur d\'initialisation', {
      previousError: initializationError.message
    });
    throw initializationError;
  }
  
  return db;
}, 'initializeFirebase', 'INDEX');

// ====== LAZY LOADING DES MANAGERS ULTRA-DEBUGGÉ ======
let stripeManagerInstance: any = null;
let twilioCallManagerInstance: any = null;
let messageManagerInstance: any = null;

const getStripeManager = traceFunction(async () => {
  if (!stripeManagerInstance) {
    ultraLogger.info('LAZY_LOADING', 'Chargement du StripeManager');
    const startTime = Date.now();
    
    const { stripeManager } = await import('./StripeManager');
    stripeManagerInstance = stripeManager;
    
    const loadTime = Date.now() - startTime;
    ultraLogger.info('LAZY_LOADING', 'StripeManager chargé avec succès', {
      loadTime: `${loadTime}ms`
    });
  }
  return stripeManagerInstance;
}, 'getStripeManager', 'INDEX');

const getTwilioCallManager = traceFunction(async () => {
  if (!twilioCallManagerInstance) {
    ultraLogger.info('LAZY_LOADING', 'Chargement du TwilioCallManager');
    const startTime = Date.now();
    
    const { twilioCallManager } = await import('./TwilioCallManager');
    twilioCallManagerInstance = twilioCallManager;
    
    const loadTime = Date.now() - startTime;
    ultraLogger.info('LAZY_LOADING', 'TwilioCallManager chargé avec succès', {
      loadTime: `${loadTime}ms`
    });
  }
  return twilioCallManagerInstance;
}, 'getTwilioCallManager', 'INDEX');

const getMessageManager = traceFunction(async () => {
  if (!messageManagerInstance) {
    ultraLogger.info('LAZY_LOADING', 'Chargement du MessageManager');
    const startTime = Date.now();
    
    const { messageManager } = await import('./MessageManager');
    messageManagerInstance = messageManager;
    
    const loadTime = Date.now() - startTime;
    ultraLogger.info('LAZY_LOADING', 'MessageManager chargé avec succès', {
      loadTime: `${loadTime}ms`
    });
  }
  return messageManagerInstance;
}, 'getMessageManager', 'INDEX');

// ====== MIDDLEWARE DE DEBUG POUR TOUTES LES FONCTIONS ======
function createDebugMetadata(functionName: string, userId?: string): UltraDebugMetadata {
  return {
    sessionId: `${functionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    functionName,
    startTime: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  };
}

function logFunctionStart(metadata: UltraDebugMetadata, data?: any) {
  ultraLogger.info(`FUNCTION_${metadata.functionName.toUpperCase()}_START`, 
    `Début d'exécution de ${metadata.functionName}`, {
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      userId: metadata.userId,
      data: data ? JSON.stringify(data, null, 2) : undefined,
      memoryUsage: process.memoryUsage()
    });
}

function logFunctionEnd(metadata: UltraDebugMetadata, result?: any, error?: Error) {
  const executionTime = Date.now() - metadata.startTime;
  
  if (error) {
    ultraLogger.error(`FUNCTION_${metadata.functionName.toUpperCase()}_ERROR`, 
      `Erreur dans ${metadata.functionName}`, {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        executionTime: `${executionTime}ms`,
        error: error.message,
        stack: error.stack,
        memoryUsage: process.memoryUsage()
      }, error);
  } else {
    ultraLogger.info(`FUNCTION_${metadata.functionName.toUpperCase()}_END`, 
      `Fin d'exécution de ${metadata.functionName}`, {
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
function wrapCallableFunction<T>(
  functionName: string,
  originalFunction: (request: CallableRequest<T>) => Promise<any>
) {
  return async (request: CallableRequest<T>) => {
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
    } catch (error) {
      logFunctionEnd(metadata, undefined, error as Error);
      throw error;
    }
  };
}

// ====== WRAPPER POUR FONCTIONS HTTP ======
function wrapHttpFunction(
  functionName: string,
  originalFunction: (req: FirebaseRequest, res: Response) => Promise<void>
) {
  return async (req: FirebaseRequest, res: Response) => {
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
    } catch (error) {
      logFunctionEnd(metadata, undefined, error as Error);
      throw error;
    }
  };
}

// ====== EXPORTS DIRECTS AVEC DEBUG ======
ultraLogger.info('EXPORTS', 'Début du chargement des exports directs');

// Import et export des fonctions principales avec traçage
export const createAndScheduleCallHTTPS = (async () => {
  ultraLogger.debug('EXPORT_LOADING', 'Chargement de createAndScheduleCallHTTPS');
  const { createAndScheduleCallHTTPS: originalFunction } = await import('./createAndScheduleCallFunction');
  ultraLogger.info('EXPORT_LOADING', 'createAndScheduleCallHTTPS chargé');
  return originalFunction;
})();

export const createPaymentIntent = (async () => {
  ultraLogger.debug('EXPORT_LOADING', 'Chargement de createPaymentIntent');
  const { createPaymentIntent: originalFunction } = await import('./createPaymentIntent');
  ultraLogger.info('EXPORT_LOADING', 'createPaymentIntent chargé');
  return originalFunction;
})();

// Export de l'API admin avec debug
export const api = (async () => {
  ultraLogger.debug('EXPORT_LOADING', 'Chargement de l\'API admin');
  const { api: originalApi } = await import('./adminApi');
  ultraLogger.info('EXPORT_LOADING', 'API admin chargée');
  return originalApi;
})();

// Export des webhooks avec debug
export const twilioCallWebhook = (async () => {
  ultraLogger.debug('EXPORT_LOADING', 'Chargement des webhooks Twilio');
  const { twilioCallWebhook: original } = await import('./Webhooks/twilioWebhooks');
  ultraLogger.info('EXPORT_LOADING', 'twilioCallWebhook chargé');
  return original;
})();

export const twilioConferenceWebhook = (async () => {
  const { twilioConferenceWebhook: original } = await import('./Webhooks/twilioWebhooks');
  return original;
})();

export const twilioRecordingWebhook = (async () => {
  const { twilioRecordingWebhook: original } = await import('./Webhooks/twilioWebhooks');
  return original;
})();

// Export des webhooks modernisés
export const modernConferenceWebhook = (async () => {
  const { twilioConferenceWebhook: original } = await import('./Webhooks/TwilioConferenceWebhook');
  return original;
})();

export const modernRecordingWebhook = (async () => {
  const { twilioRecordingWebhook: original } = await import('./Webhooks/TwilioRecordingWebhook');
  return original;
})();

// Export des templates et notifications
export const initializeMessageTemplates = (async () => {
  const { initializeMessageTemplates: original } = await import('./initializeMessageTemplates');
  return original;
})();

export const notifyAfterPayment = (async () => {
  const { notifyAfterPayment: original } = await import('./notifications/notifyAfterPayment');
  return original;
})();

ultraLogger.info('EXPORTS', 'Exports directs configurés');

// ========================================
// FONCTIONS ADMIN ULTRA-DEBUGGÉES (V2)
// ========================================

export const adminUpdateStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminUpdateStatus', async (request: CallableRequest<AdminUpdateStatusData>) => {
    const database = initializeFirebase();
    
    ultraLogger.debug('ADMIN_UPDATE_STATUS', 'Vérification des permissions admin', {
      hasAuth: !!request.auth,
      userRole: (request.auth?.token as CustomClaims)?.role
    });
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      ultraLogger.warn('ADMIN_UPDATE_STATUS', 'Accès refusé - permissions admin requises', {
        userId: request.auth?.uid,
        userRole: (request.auth?.token as CustomClaims)?.role
      });
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, status, reason } = request.data;
    
    ultraLogger.info('ADMIN_UPDATE_STATUS', 'Mise à jour du statut utilisateur', {
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
    
    ultraLogger.info('ADMIN_UPDATE_STATUS', 'Statut utilisateur mis à jour avec succès', {
      targetUserId: userId,
      newStatus: status
    });
    
    return { ok: true };
  })
);

export const adminSoftDeleteUser = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminSoftDeleteUser', async (request: CallableRequest<AdminSoftDeleteData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      ultraLogger.warn('ADMIN_SOFT_DELETE', 'Accès refusé', {
        userId: request.auth?.uid
      });
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, reason } = request.data;
    
    ultraLogger.info('ADMIN_SOFT_DELETE', 'Suppression soft de l\'utilisateur', {
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
  })
);

export const adminBulkUpdateStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminBulkUpdateStatus', async (request: CallableRequest<AdminBulkUpdateData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { ids, status, reason } = request.data;
    
    ultraLogger.info('ADMIN_BULK_UPDATE', 'Mise à jour en lot', {
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
  })
);

// ========================================
// FONCTIONS ADMIN POUR MONITORING DES APPELS ULTRA-DEBUGGÉES
// ========================================

export const adminForceDisconnectCall = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminForceDisconnectCall', async (request: CallableRequest<AdminCallActionData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, reason } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    ultraLogger.info('ADMIN_FORCE_DISCONNECT', 'Déconnexion forcée d\'un appel', {
      sessionId,
      reason,
      adminId: request.auth.uid
    });

    try {
      const twilioCallManager = await getTwilioCallManager();
      const success = await twilioCallManager.cancelCallSession(
        sessionId, 
        reason || 'admin_force_disconnect', 
        request.auth.uid
      );

      await database.collection("adminLogs").add({
        action: "forceDisconnectCall",
        sessionId,
        reason: reason || 'admin_force_disconnect',
        adminId: request.auth.uid,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });

      ultraLogger.info('ADMIN_FORCE_DISCONNECT', 'Appel déconnecté avec succès', {
        sessionId,
        success
      });

      return { 
        success, 
        message: `Call ${sessionId} disconnected successfully` 
      };
    } catch (callError) {
      ultraLogger.error('ADMIN_FORCE_DISCONNECT', 'Erreur lors de la déconnexion', {
        sessionId,
        error: callError instanceof Error ? callError.message : String(callError)
      }, callError instanceof Error ? callError : undefined);
      throw new HttpsError('internal', 'Failed to disconnect call');
    }
  })
);

// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES ULTRA-DEBUGGÉE
// ========================================

let stripe: Stripe | null = null;

const getStripe = traceFunction((): Stripe | null => {
  if (!stripe) {
    ultraLogger.info('STRIPE_INIT', 'Initialisation de Stripe');
    
    const stripeConfig = functions.config().stripe;
    
    if (stripeConfig?.secret_key && stripeConfig.secret_key.startsWith('sk_')) {
      try {
        stripe = new Stripe(stripeConfig.secret_key, {
          apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
        });
        ultraLogger.info('STRIPE_INIT', 'Stripe configuré avec succès', {
          keyPrefix: stripeConfig.secret_key.substring(0, 7) + '...'
        });
      } catch (stripeError) {
        ultraLogger.error('STRIPE_INIT', 'Erreur configuration Stripe', {
          error: stripeError instanceof Error ? stripeError.message : String(stripeError)
        }, stripeError instanceof Error ? stripeError : undefined);
        stripe = null;
      }
    } else {
      ultraLogger.warn('STRIPE_INIT', 'Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide');
    }
  }
  
  return stripe;
}, 'getStripe', 'INDEX');

// ====== WEBHOOK STRIPE UNIFIÉ ULTRA-DEBUGGÉ ======
export const stripeWebhook = onRequest({
  memory: "256MiB",
  timeoutSeconds: 30
}, wrapHttpFunction('stripeWebhook', async (req: FirebaseRequest, res: Response) => {
  const signature = req.headers['stripe-signature'];
  
  ultraLogger.debug('STRIPE_WEBHOOK', 'Webhook Stripe reçu', {
    hasSignature: !!signature,
    method: req.method,
    contentType: req.headers['content-type']
  });
  
  if (!signature) {
    ultraLogger.warn('STRIPE_WEBHOOK', 'Signature Stripe manquante');
    res.status(400).send('Signature Stripe manquante');
    return;
  }

  const stripeInstance = getStripe();
  if (!stripeInstance) {
    ultraLogger.error('STRIPE_WEBHOOK', 'Service Stripe non configuré');
    res.status(500).send('Service Stripe non configuré');
    return;
  }
  
  try {
    const database = initializeFirebase();
    const rawBody = req.rawBody;
    if (!rawBody) {
      ultraLogger.warn('STRIPE_WEBHOOK', 'Raw body manquant');
      res.status(400).send('Raw body manquant');
      return;
    }

    const stripeConfig = functions.config().stripe;
    const event = stripeInstance.webhooks.constructEvent(
      rawBody.toString(),
      signature as string,
      stripeConfig?.webhook_secret || ''
    );
    
    ultraLogger.info('STRIPE_WEBHOOK', 'Événement Stripe validé', {
      eventType: event.type,
      eventId: event.id,
      objectId: (event.data.object as any)?.id
    });
    
    // Traiter l'événement avec le nouveau système
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, database);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, database);
        break;
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, database);
        break;
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent, database);
        break;
      default:
        ultraLogger.debug('STRIPE_WEBHOOK', 'Type d\'événement non géré', {
          eventType: event.type
        });
    }
    
    res.json({ received: true });
  } catch (webhookError: unknown) {
    ultraLogger.error('STRIPE_WEBHOOK', 'Erreur traitement webhook', {
      error: webhookError instanceof Error ? webhookError.message : String(webhookError),
      stack: webhookError instanceof Error ? webhookError.stack : undefined
    }, webhookError instanceof Error ? webhookError : undefined);
    
    const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
    res.status(400).send(`Webhook Error: ${errorMessage}`);
  }
}));

// Handlers pour les événements Stripe avec ultra debug
const handlePaymentIntentSucceeded = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Paiement réussi', {
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
      
      ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Base de données mise à jour');
    }

    if (paymentIntent.metadata?.callSessionId) {
      ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Déclenchement des notifications post-paiement', {
        callSessionId: paymentIntent.metadata.callSessionId
      });
    }

    return true;
  } catch (succeededError: unknown) {
    ultraLogger.error('STRIPE_PAYMENT_SUCCEEDED', 'Erreur traitement paiement réussi', {
      paymentIntentId: paymentIntent.id,
      error: succeededError instanceof Error ? succeededError.message : String(succeededError)
    }, succeededError instanceof Error ? succeededError : undefined);
    return false;
  }
}, 'handlePaymentIntentSucceeded', 'STRIPE_WEBHOOKS');

const handlePaymentIntentFailed = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.warn('STRIPE_PAYMENT_FAILED', 'Paiement échoué', {
      paymentIntentId: paymentIntent.id,
      errorMessage: paymentIntent.last_payment_error?.message
    });
    
    const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();
    
    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    if (paymentIntent.metadata?.callSessionId) {
      try {
        ultraLogger.info('STRIPE_PAYMENT_FAILED', 'Annulation appel programmé', {
          callSessionId: paymentIntent.metadata.callSessionId
        });
        const { cancelScheduledCall } = await import('./callScheduler');
        await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
      } catch (importError) {
        ultraLogger.warn('STRIPE_PAYMENT_FAILED', 'Impossible d\'importer cancelScheduledCall', {
          error: importError instanceof Error ? importError.message : String(importError)
        });
      }
    }
    
    return true;
  } catch (failedError: unknown) {
    ultraLogger.error('STRIPE_PAYMENT_FAILED', 'Erreur traitement échec paiement', {
      error: failedError instanceof Error ? failedError.message : String(failedError)
    }, failedError instanceof Error ? failedError : undefined);
    return false;
  }
}, 'handlePaymentIntentFailed', 'STRIPE_WEBHOOKS');

const handlePaymentIntentCanceled = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Paiement annulé', {
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
    
    if (paymentIntent.metadata?.callSessionId) {
      try {
        ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Annulation appel programmé', {
          callSessionId: paymentIntent.metadata.callSessionId
        });
        const { cancelScheduledCall } = await import('./callScheduler');
        await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
      } catch (importError) {
        ultraLogger.warn('STRIPE_PAYMENT_CANCELED', 'Impossible d\'importer cancelScheduledCall', {
          error: importError instanceof Error ? importError.message : String(importError)
        });
      }
    }
    
    return true;
  } catch (canceledError: unknown) {
    ultraLogger.error('STRIPE_PAYMENT_CANCELED', 'Erreur traitement annulation paiement', {
      error: canceledError instanceof Error ? canceledError.message : String(canceledError)
    }, canceledError instanceof Error ? canceledError : undefined);
    return false;
  }
}, 'handlePaymentIntentCanceled', 'STRIPE_WEBHOOKS');

const handlePaymentIntentRequiresAction = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('STRIPE_PAYMENT_REQUIRES_ACTION', 'Paiement nécessite une action', {
      paymentIntentId: paymentIntent.id,
      nextAction: paymentIntent.next_action?.type
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
  } catch (actionError: unknown) {
    ultraLogger.error('STRIPE_PAYMENT_REQUIRES_ACTION', 'Erreur traitement action requise', {
      error: actionError instanceof Error ? actionError.message : String(actionError)
    }, actionError instanceof Error ? actionError : undefined);
    return false;
  }
}, 'handlePaymentIntentRequiresAction', 'STRIPE_WEBHOOKS');

// ========================================
// FONCTIONS ADMIN SUPPLÉMENTAIRES ULTRA-DEBUGGÉES
// ========================================

export const adminJoinCall = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminJoinCall', async (request: CallableRequest<AdminCallActionData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    ultraLogger.info('ADMIN_JOIN_CALL', 'Admin rejoint un appel', {
      sessionId,
      adminId: request.auth.uid
    });

    try {
      const twilioCallManager = await getTwilioCallManager();
      const session = await twilioCallManager.getCallSession(sessionId);
      
      if (!session || session.status !== 'active') {
        ultraLogger.warn('ADMIN_JOIN_CALL', 'Appel non actif', {
          sessionId,
          sessionStatus: session?.status || 'not_found'
        });
        throw new HttpsError('failed-precondition', 'Call is not active');
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

      ultraLogger.info('ADMIN_JOIN_CALL', 'Informations de conférence générées', {
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
    } catch (joinError) {
      ultraLogger.error('ADMIN_JOIN_CALL', 'Erreur lors de la tentative de rejoindre l\'appel', {
        sessionId,
        error: joinError instanceof Error ? joinError.message : String(joinError)
      }, joinError instanceof Error ? joinError : undefined);
      throw new HttpsError('internal', 'Failed to join call');
    }
  })
);

export const adminTransferCall = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminTransferCall', async (request: CallableRequest<AdminTransferCallData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, newProviderId } = request.data;
    
    if (!sessionId || !newProviderId) {
      throw new HttpsError('invalid-argument', 'sessionId and newProviderId are required');
    }

    ultraLogger.info('ADMIN_TRANSFER_CALL', 'Transfert d\'appel initié', {
      sessionId,
      newProviderId,
      adminId: request.auth.uid
    });

    try {
      const newProviderDoc = await database.collection('users').doc(newProviderId).get();

      if (!newProviderDoc.exists) {
        ultraLogger.warn('ADMIN_TRANSFER_CALL', 'Nouveau prestataire non trouvé', {
          newProviderId
        });
        throw new HttpsError('not-found', 'New provider not found');
      }

      const newProvider = newProviderDoc.data();
      if (!newProvider?.phone) {
        ultraLogger.warn('ADMIN_TRANSFER_CALL', 'Nouveau prestataire sans numéro de téléphone', {
          newProviderId
        });
        throw new HttpsError('failed-precondition', 'New provider has no phone number');
      }

      if (!['lawyer', 'expat'].includes(newProvider.role)) {
        ultraLogger.warn('ADMIN_TRANSFER_CALL', 'Utilisateur n\'est pas un prestataire', {
          newProviderId,
          role: newProvider.role
        });
        throw new HttpsError('failed-precondition', 'User is not a provider');
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

      ultraLogger.info('ADMIN_TRANSFER_CALL', 'Transfert d\'appel terminé avec succès', {
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
    } catch (transferError) {
      ultraLogger.error('ADMIN_TRANSFER_CALL', 'Erreur lors du transfert d\'appel', {
        sessionId,
        newProviderId,
        error: transferError instanceof Error ? transferError.message : String(transferError)
      }, transferError instanceof Error ? transferError : undefined);
      throw new HttpsError('internal', 'Failed to transfer call');
    }
  })
);

export const adminMuteParticipant = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('adminMuteParticipant', async (request: CallableRequest<AdminMuteParticipantData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, participantType, mute = true } = request.data;
    
    if (!sessionId || !participantType) {
      throw new HttpsError('invalid-argument', 'sessionId and participantType are required');
    }

    if (!['provider', 'client'].includes(participantType)) {
      throw new HttpsError('invalid-argument', 'participantType must be provider or client');
    }

    ultraLogger.info('ADMIN_MUTE_PARTICIPANT', 'Mute/unmute participant', {
      sessionId,
      participantType,
      mute,
      adminId: request.auth.uid
    });

    try {
      const twilioCallManager = await getTwilioCallManager();
      const session = await twilioCallManager.getCallSession(sessionId);
      
      if (!session || session.status !== 'active') {
        ultraLogger.warn('ADMIN_MUTE_PARTICIPANT', 'Appel non actif', {
          sessionId,
          sessionStatus: session?.status || 'not_found'
        });
        throw new HttpsError('failed-precondition', 'Call is not active');
      }

      const participant = session.participants[participantType as 'provider' | 'client'];
      
      if (!participant.callSid) {
        ultraLogger.warn('ADMIN_MUTE_PARTICIPANT', 'CallSid participant non trouvé', {
          sessionId,
          participantType
        });
        throw new HttpsError('failed-precondition', 'Participant call SID not found');
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

      ultraLogger.info('ADMIN_MUTE_PARTICIPANT', 'Action mute/unmute enregistrée', {
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
    } catch (muteError) {
      ultraLogger.error('ADMIN_MUTE_PARTICIPANT', 'Erreur lors du mute/unmute', {
        sessionId,
        participantType,
        error: muteError instanceof Error ? muteError.message : String(muteError)
      }, muteError instanceof Error ? muteError : undefined);
      throw new HttpsError('internal', 'Failed to mute participant');
    }
  })
);

// ========================================
// FONCTIONS CRON POUR MAINTENANCE ULTRA-DEBUGGÉES
// ========================================

export const scheduledFirestoreExport = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
  },
  async () => {
    const metadata = createDebugMetadata('scheduledFirestoreExport');
    logFunctionStart(metadata);

    try {
      ultraLogger.info('SCHEDULED_BACKUP', 'Démarrage sauvegarde automatique');
      
      const database = initializeFirebase();
      const projectId = process.env.GCLOUD_PROJECT;
      const bucketName = `${projectId}-backups`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      ultraLogger.debug('SCHEDULED_BACKUP', 'Configuration sauvegarde', {
        projectId,
        bucketName,
        timestamp
      });
      
      const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
      
      const firestoreExportName = `firestore-export-${timestamp}`;
      const firestoreExportPath = `gs://${bucketName}/${firestoreExportName}`;
      
      ultraLogger.info('SCHEDULED_BACKUP', 'Lancement export Firestore', {
        exportPath: firestoreExportPath
      });
      
      const [firestoreOperation] = await firestoreClient.exportDocuments({
        name: `projects/${projectId}/databases/(default)`,
        outputUriPrefix: firestoreExportPath,
        collectionIds: [],
      });
      
      ultraLogger.info('SCHEDULED_BACKUP', 'Export Firestore démarré', {
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
      
    } catch (exportError: unknown) {
      ultraLogger.error('SCHEDULED_BACKUP', 'Erreur sauvegarde automatique', {
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
  }
);

export const scheduledCleanup = onSchedule(
  {
    schedule: '0 3 * * 0',
    timeZone: 'Europe/Paris'
  },
  async () => {
    const metadata = createDebugMetadata('scheduledCleanup');
    logFunctionStart(metadata);

    try {
      ultraLogger.info('SCHEDULED_CLEANUP', 'Démarrage nettoyage périodique');
      
      const twilioCallManager = await getTwilioCallManager();
      
      ultraLogger.debug('SCHEDULED_CLEANUP', 'Configuration nettoyage', {
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100
      });
      
      const cleanupResult = await twilioCallManager.cleanupOldSessions({
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100
      });
      
      ultraLogger.info('SCHEDULED_CLEANUP', 'Nettoyage terminé', {
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
      
    } catch (cleanupError: unknown) {
      ultraLogger.error('SCHEDULED_CLEANUP', 'Erreur nettoyage périodique', {
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
  }
);

// ========================================
// FONCTION DE DEBUG SYSTÈME
// ========================================

export const generateSystemDebugReport = onCall(
  { cors: true, memory: "512MiB", timeoutSeconds: 120 },
  wrapCallableFunction('generateSystemDebugReport', async (request: CallableRequest<{}>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Génération rapport de debug système');

    try {
      const database = initializeFirebase();
      
      // Générer le rapport ultra debug
      const ultraDebugReport = await ultraLogger.generateDebugReport();
      
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
      await database.collection('debug_reports').doc(reportId).set({
        ...fullReport,
        generatedBy: request.auth.uid,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Rapport de debug généré et sauvegardé', {
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

    } catch (error) {
      ultraLogger.error('SYSTEM_DEBUG_REPORT', 'Erreur génération rapport debug', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      throw new HttpsError('internal', 'Failed to generate debug report');
    }
  })
);

// ========================================
// FONCTION DE MONITORING EN TEMPS RÉEL
// ========================================

export const getSystemHealthStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('getSystemHealthStatus', async (request: CallableRequest<{}>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'Vérification état système');

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
      } catch (stripeError) {
        stripeStatus = 'error';
        ultraLogger.warn('SYSTEM_HEALTH_CHECK', 'Erreur test Stripe', {
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
          logsByLevel[data.level as keyof typeof logsByLevel]++;
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

      ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'État système vérifié', {
        status: healthStatus.status,
        responseTime: totalResponseTime,
        errorsLast24h: logsByLevel.ERROR
      });

      return healthStatus;

    } catch (error) {
      ultraLogger.error('SYSTEM_HEALTH_CHECK', 'Erreur vérification état système', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  })
);

// ========================================
// INITIALISATION FINALE ET LOGS DE DÉMARRAGE
// ========================================

ultraLogger.info('INDEX_COMPLETE', 'Fichier index.ts chargé avec succès', {
  totalFunctions: 15, // Nombre approximatif de fonctions exportées
  environment: process.env.NODE_ENV || 'development',
  memoryUsage: process.memoryUsage(),
  loadTime: Date.now() - parseInt(process.env.LOAD_START_TIME || '0') || 'unknown'
});

// Export de l'instance ultra logger pour utilisation externe
export { ultraLogger };

// Export d'une fonction utilitaire pour obtenir les logs
export const getUltraDebugLogs = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  wrapCallableFunction('getUltraDebugLogs', async (request: CallableRequest<{ limit?: number; level?: string }>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
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
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        logs,
        count: logs.length,
        filtered: !!level
      };

    } catch (error) {
      ultraLogger.error('GET_ULTRA_DEBUG_LOGS', 'Erreur récupération logs', {
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      throw new HttpsError('internal', 'Failed to retrieve logs');
    }
  })
);

ultraLogger.info('INDEX_EXPORTS_COMPLETE', 'Toutes les fonctions exportées et configurées avec ultra debug');