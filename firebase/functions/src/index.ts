/* eslint-disable @typescript-eslint/no-explicit-any */

// ====== ULTRA DEBUG INITIALIZATION ======
import { ultraLogger, traceFunction, traceGlobalImport } from './utils/ultraDebugLogger';

// Tracer tous les imports principaux
traceGlobalImport('firebase-functions/v2', 'index.ts');
traceGlobalImport('firebase-admin', 'index.ts');
traceGlobalImport('stripe', 'index.ts');

// === CPU/MEM CONFIGS to control vCPU usage ===
const emergencyConfig = {
  region: "europe-west1",
  memory: "256MiB" as const,
  cpu: 0.25,
  maxInstances: 3,
  minInstances: 0,
  concurrency: 1
};

ultraLogger.info('INDEX_INIT', 'Démarrage de l\'initialisation du fichier index.ts', {
  timestamp: Date.now(),
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development'
});

// ====== CONFIGURATION GLOBALE CENTRALISÉE ======
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret, defineString } from "firebase-functions/params";

// 🔐 Déclarations **UNIQUEMENT** des secrets que tu utilises réellement
export const EMAIL_USER = defineSecret("EMAIL_USER");
export const EMAIL_PASS = defineSecret("EMAIL_PASS");
// 👉 Si tu veux vraiment un from explicite, garde cette ligne; sinon supprime-la et oublie EMAIL_FROM partout
// export const EMAIL_FROM = defineSecret("EMAIL_FROM");

// Twilio (utilisé par tes webhooks) — garde-les si utilisés, sinon commente
export const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
export const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

// Stripe (ton code createPaymentIntent l'utilise)
export const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
export const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");

// Cloud Tasks auth (si executeCallTask l'utilise)
export const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");

// ✅ Centralise la **liste globale**, en filtrant toute valeur falsy (évite 'undefined')
const GLOBAL_SECRETS = [
  EMAIL_USER, EMAIL_PASS,
  // EMAIL_FROM, // décommente si tu l'utilises vraiment
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
  STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE,
  TASKS_AUTH_SECRET,
].filter(Boolean) as any[];

// ⚠️ cast 'as any' pour accepter eventarc si tes types ne sont pas à jour
setGlobalOptions({
  region: "europe-west1",
  eventarc: { location: "europe-west1" },
  secrets: GLOBAL_SECRETS} as any);

// ====== IMPORTS PRINCIPAUX ======
import { onRequest, onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import type { Request as ExpressRequest, Response } from 'express';

// 🦾 Cloud Tasks helper (réutilise ton fichier existant)
import { scheduleCallTask } from './lib/tasks';

// ====== IMPORTS DES MODULES PRINCIPAUX (RECTIFIÉS) ======
import { createAndScheduleCallHTTPS } from "./createAndScheduleCallFunction";
import { runExecuteCallTask } from "./runtime/executeCallTask";
import { messageManager } from './MessageManager';

ultraLogger.debug('IMPORTS', 'Imports principaux chargés avec succès');

// ====== PARAMS & SECRETS ADDITIONNELS ======
// 👉 STRIPE_MODE est un PARAMÈTRE (pas un secret) pour éviter le conflit secret/env
export const STRIPE_MODE = defineString('STRIPE_MODE'); // 'test' | 'live'

// Webhook secrets Stripe spécifiques TEST/LIVE
export const STRIPE_WEBHOOK_SECRET_TEST = defineSecret('STRIPE_WEBHOOK_SECRET_TEST');
export const STRIPE_WEBHOOK_SECRET_LIVE = defineSecret('STRIPE_WEBHOOK_SECRET_LIVE');

// Helpers de sélection de secrets selon le mode (évalués à l'exécution uniquement)
function isLive(): boolean {
  // ⚠️ N'appelez pas .value() en top-level : ces helpers sont utilisés UNIQUEMENT dans les handlers
  return (STRIPE_MODE.value() || 'test').toLowerCase() === 'live';
}
function getStripeSecretKey(): string {
  // Les secrets sont injectés en variables d'environnement dans les fonctions qui les déclarent dans ``
  return isLive()
    ? (process.env.STRIPE_SECRET_KEY_LIVE || '')
    : (process.env.STRIPE_SECRET_KEY_TEST || '');
}
function getStripeWebhookSecret(): string {
  return isLive()
    ? (process.env.STRIPE_WEBHOOK_SECRET_LIVE || '')
    : (process.env.STRIPE_WEBHOOK_SECRET_TEST || '');
}

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
  status: 'active' | 'pending' | 'blocked' | 'suspended';
  reason?: string;
}

interface AdminSoftDeleteData {
  userId: string;
  reason?: string;
}

interface AdminBulkUpdateData {
  ids: string[];
  status: 'active' | 'pending' | 'blocked' | 'suspended';
  reason?: string;
}

interface CustomClaims {
  role?: string;
  [key: string]: unknown;
}

ultraLogger.debug('TYPES', 'Interfaces et types définis');

// ====== TYPES TWILIO (NOUVEAU) ======
type TwilioCallParticipant = { callSid?: string; isMuted?: boolean };
type TwilioCallSession = {
  status: 'active' | 'scheduled' | 'ended' | string;
  conference: { sid: string; name: string };
  participants: { provider: TwilioCallParticipant; client: TwilioCallParticipant };
};
type CleanupResult = { deleted: number; errors: number };

export interface TwilioCallManager {
  cancelCallSession(sessionId: string, reason: string, performedBy: string): Promise<boolean>;
  getCallSession(sessionId: string): Promise<TwilioCallSession | null>;
  cleanupOldSessions(opts: { olderThanDays: number; keepCompletedDays: number; batchSize: number }): Promise<CleanupResult>;
}

// ====== INITIALISATION FIREBASE ULTRA-DÉBUGGÉE ======
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
          error: settingsError instanceof Error ? settingsError.message : String(settingsError)});
      }

      const initTime = Date.now() - startTime;
      isFirebaseInitialized = true;

      ultraLogger.info('FIREBASE_INIT', 'Firebase initialisé avec succès', {
        initializationTime: `${initTime}ms`,
        projectId: admin.app().options.projectId,
        databaseURL: admin.app().options.databaseURL,
        storageBucket: admin.app().options.storageBucket});
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error(String(error));
      ultraLogger.error(
        'FIREBASE_INIT',
        'Erreur critique lors de l\'initialisation Firebase',
        {
          error: initializationError.message,
          stack: initializationError.stack},
        initializationError
      );
      throw initializationError;
    }
  } else if (initializationError) {
    ultraLogger.error('FIREBASE_INIT', 'Tentative d\'utilisation après erreur d\'initialisation', {
      previousError: initializationError.message});
    throw initializationError;
  }

  return db;
}, 'initializeFirebase', 'INDEX');

// ====== LAZY LOADING DES MANAGERS ULTRA-DÉBUGGÉ ======
const stripeManagerInstance: unknown = null; // placeholder
let twilioCallManagerInstance: TwilioCallManager | null = null; // réassigné après import
const messageManagerInstance: unknown = null; // placeholder

const getTwilioCallManager = traceFunction(async (): Promise<TwilioCallManager> => {
  if (!twilioCallManagerInstance) {
    const mod = (await import('./TwilioCallManager')) as {
      twilioCallManager?: TwilioCallManager;
      default?: TwilioCallManager;
    };

    const resolved = mod.twilioCallManager ?? mod.default;
    if (!resolved) {
      throw new Error('TwilioCallManager introuvable dans ./TwilioCallManager (ni export nommé, ni export par défaut).');
    }
    twilioCallManagerInstance = resolved;
  }
  return twilioCallManagerInstance;
}, 'getTwilioCallManager', 'INDEX');

// ====== MIDDLEWARE DE DEBUG POUR TOUTES LES FONCTIONS ======
function createDebugMetadata(functionName: string, userId?: string): UltraDebugMetadata {
  return {
    sessionId: `${functionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    functionName,
    startTime: Date.now(),
    environment: process.env.NODE_ENV || 'development'};
}

function logFunctionStart(metadata: UltraDebugMetadata, data?: unknown) {
  ultraLogger.info(`FUNCTION_${metadata.functionName.toUpperCase()}_START`, `Début d'exécution de ${metadata.functionName}`, {
    sessionId: metadata.sessionId,
    requestId: metadata.requestId,
    userId: metadata.userId,
    data: data ? JSON.stringify(data, null, 2) : undefined,
    memoryUsage: process.memoryUsage()});
}

function logFunctionEnd(metadata: UltraDebugMetadata, result?: unknown, error?: Error) {
  const executionTime = Date.now() - metadata.startTime;

  if (error) {
    ultraLogger.error(
      `FUNCTION_${metadata.functionName.toUpperCase()}_ERROR`,
      `Erreur dans ${metadata.functionName}`,
      {
        sessionId: metadata.sessionId,
        requestId: metadata.requestId,
        userId: metadata.userId,
        executionTime: `${executionTime}ms`,
        error: error.message,
        stack: error.stack,
        memoryUsage: process.memoryUsage()},
      error
    );
  } else {
    ultraLogger.info(`FUNCTION_${metadata.functionName.toUpperCase()}_END`, `Fin d'exécution de ${metadata.functionName}`, {
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      userId: metadata.userId,
      executionTime: `${executionTime}ms`,
      result: result ? JSON.stringify(result, null, 2) : undefined,
      memoryUsage: process.memoryUsage()});
  }
}

// ====== WRAPPER POUR FONCTIONS CALLABLE ======
function wrapCallableFunction<T>(functionName: string, originalFunction: (request: CallableRequest<T>) => Promise<unknown>) {
  return async (request: CallableRequest<T>) => {
    const metadata = createDebugMetadata(functionName, request.auth?.uid);

    logFunctionStart(metadata, {
      hasAuth: !!request.auth,
      authUid: request.auth?.uid,
      requestData: request.data});

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
function wrapHttpFunction(functionName: string, originalFunction: (req: FirebaseRequest, res: Response) => Promise<void>) {
  return async (req: FirebaseRequest, res: Response) => {
    const metadata = createDebugMetadata(functionName);
    (req as DebuggedRequest).debugMetadata = metadata;

    logFunctionStart(metadata, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body});

    try {
      await originalFunction(req, res);
      logFunctionEnd(metadata, { statusCode: res.statusCode });
    } catch (error) {
      logFunctionEnd(metadata, undefined, error as Error);
      throw error;
    }
  };
}

// ====== EXPORTS DIRECTS RECTIFIÉS ======
ultraLogger.info('EXPORTS', 'Début du chargement des exports directs');

// ⬇️ Exports des modules principaux
export { createAndScheduleCallHTTPS };
export { createAndScheduleCallHTTPS as createAndScheduleCall };
export { createPaymentIntent } from './createPaymentIntent';
export { api } from './adminApi';

// ✅ Un seul webhook Twilio unifié (les legacy ne doivent plus être exportés)
export { unifiedWebhook } from './Webhooks/unifiedWebhook';

// Utilitaires complémentaires
export { initializeMessageTemplates } from './initializeMessageTemplates';
export { notifyAfterPayment } from './notifications/notifyAfterPayment';

// ⬇️ EXPORTS AJOUTÉS - modules manquants
export * from "./notificationPipeline/worker";
export * from "./admin/callables";

ultraLogger.info('EXPORTS', 'Exports directs configurés');

// ========================================
// 🦾 ENDPOINT CLOUD TASKS : exécuter l'appel - 🔧 FIX: ALIGNÉ SUR EUROPE-WEST1
// ========================================
export const executeCallTask = onRequest(
  {
    region: "europe-west1", // 🔧 FIX CRITIQUE: Changé de us-central1 à europe-west1
    timeoutSeconds: 120,     // ✅ Aligné sur executeCallTask.ts
    memory: "512MiB",        // ✅ Aligné sur executeCallTask.ts
    cpu: 0.25,               // ✅ Aligné sur executeCallTask.ts
    maxInstances: 10,        // ✅ Aligné sur executeCallTask.ts
    minInstances: 0,         // ✅ Aligné sur executeCallTask.ts
    concurrency: 1           // ✅ Aligné sur executeCallTask.ts
  },
  (req, res) => runExecuteCallTask(req as any, res as any)
);

// ========================================
// FONCTIONS ADMIN ULTRA-DÉBUGGÉES (V2)
// ========================================
export const adminUpdateStatus = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30
  },
  wrapCallableFunction('adminUpdateStatus', async (request: CallableRequest<AdminUpdateStatusData>) => {
    const database = initializeFirebase();

    ultraLogger.debug('ADMIN_UPDATE_STATUS', 'Vérification des permissions admin', {
      hasAuth: !!request.auth,
      userRole: (request.auth?.token as CustomClaims)?.role});

    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      ultraLogger.warn('ADMIN_UPDATE_STATUS', 'Accès refusé - permissions admin requises', {
        userId: request.auth?.uid,
        userRole: (request.auth?.token as CustomClaims)?.role});
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, status, reason } = request.data;

    ultraLogger.info('ADMIN_UPDATE_STATUS', 'Mise à jour du statut utilisateur', {
      targetUserId: userId,
      newStatus: status,
      reason,
      adminId: request.auth.uid});

    await database.collection('users').doc(userId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()});

    await database.collection('adminLogs').add({
      action: 'updateStatus',
      userId,
      status,
      reason: reason || null,
      adminId: request.auth.uid,
      ts: admin.firestore.FieldValue.serverTimestamp()});

    ultraLogger.info('ADMIN_UPDATE_STATUS', 'Statut utilisateur mis à jour avec succès', {
      targetUserId: userId,
      newStatus: status});

    return { ok: true };
  })
);

export const adminSoftDeleteUser = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30
  },
  wrapCallableFunction('adminSoftDeleteUser', async (request: CallableRequest<AdminSoftDeleteData>) => {
    const database = initializeFirebase();

    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      ultraLogger.warn('ADMIN_SOFT_DELETE', 'Accès refusé', {
        userId: request.auth?.uid});
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, reason } = request.data;

    ultraLogger.info('ADMIN_SOFT_DELETE', 'Suppression soft de l\'utilisateur', {
      targetUserId: userId,
      reason,
      adminId: request.auth.uid});

    await database.collection('users').doc(userId).update({
      isDeleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: request.auth.uid,
      deletedReason: reason || null});

    await database.collection('adminLogs').add({
      action: 'softDelete',
      userId,
      reason: reason || null,
      adminId: request.auth.uid,
      ts: admin.firestore.FieldValue.serverTimestamp()});

    return { ok: true };
  })
);

export const adminBulkUpdateStatus = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30
  },
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
      batchSize: ids.length});

    const batch = database.batch();
    ids.forEach((id) =>
      batch.update(database.collection('users').doc(id), {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()})
    );
    await batch.commit();

    await database.collection('adminLogs').add({
      action: 'bulkUpdateStatus',
      ids,
      status,
      reason: reason || null,
      adminId: request.auth.uid,
      ts: admin.firestore.FieldValue.serverTimestamp()});

    return { ok: true };
  })
);

// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES ULTRA-DÉBUGGÉE (MIGRÉ)
// ========================================
let stripe: Stripe | null = null;

const getStripe = traceFunction((): Stripe | null => {
  if (!stripe) {
    ultraLogger.info('STRIPE_INIT', 'Initialisation de Stripe', { mode: isLive() ? 'live' : 'test' });

    let stripeSecretKey = '';
    try {
      stripeSecretKey = getStripeSecretKey();
      ultraLogger.debug('STRIPE_INIT', 'Clé Stripe récupérée via Secret Manager', {
        mode: isLive() ? 'live' : 'test',
        keyPrefix: stripeSecretKey?.slice(0, 7) + '...'});
    } catch (secretError) {
      ultraLogger.error('STRIPE_INIT', 'Secret Stripe non configuré', {
        error: secretError instanceof Error ? secretError.message : String(secretError)});
      return null;
    }

    if (stripeSecretKey && stripeSecretKey.startsWith('sk_')) {
      try {
        stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2023-10-16' as Stripe.LatestApiVersion});
        ultraLogger.info('STRIPE_INIT', 'Stripe configuré avec succès', { mode: isLive() ? 'live' : 'test' });
      } catch (stripeError) {
        ultraLogger.error(
          'STRIPE_INIT',
          'Erreur configuration Stripe',
          { error: stripeError instanceof Error ? stripeError.message : String(stripeError) },
          stripeError instanceof Error ? stripeError : undefined
        );
        stripe = null;
      }
    } else {
      ultraLogger.warn('STRIPE_INIT', 'Stripe non configuré - Secret Key manquante ou invalide', { mode: isLive() ? 'live' : 'test' });
    }
  }

  return stripe;
}, 'getStripe', 'INDEX');

// ====== HELPER POUR ENVOI AUTOMATIQUE DES MESSAGES ======
const sendPaymentNotifications = traceFunction(async (callSessionId: string, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('PAYMENT_NOTIFICATIONS', 'Envoi des notifications post-paiement', { callSessionId });

    const snap = await database.collection('call_sessions').doc(callSessionId).get();
    if (!snap.exists) {
      ultraLogger.warn('PAYMENT_NOTIFICATIONS', 'Session introuvable', { callSessionId });
      return;
    }

    const cs: any = snap.data();

    const providerPhone = cs?.participants?.provider?.phone ?? cs?.providerPhone ?? '';
    const clientPhone = cs?.participants?.client?.phone ?? cs?.clientPhone ?? '';
    const language = cs?.metadata?.clientLanguages?.[0] ?? 'fr';
    const title = cs?.metadata?.title ?? cs?.title ?? 'Consultation';

    ultraLogger.debug('PAYMENT_NOTIFICATIONS', 'Données extraites', {
      callSessionId,
      providerPhone: providerPhone ? `${providerPhone.slice(0, 4)}...` : 'none',
      clientPhone: clientPhone ? `${clientPhone.slice(0, 4)}...` : 'none',
      language,
      title
    });

    const notifications = await Promise.allSettled([
      providerPhone
        ? messageManager.sendSmartMessage({
            to: providerPhone,
            templateId: 'provider_notification',
            variables: { requestTitle: title, language },
            preferWhatsApp: false            //  <-- force SMS
          })
        : Promise.resolve({ skipped: 'no_provider_phone' }),
      clientPhone
        ? messageManager.sendSmartMessage({
            to: clientPhone,
            templateId: 'client_notification',
            variables: { requestTitle: title, language },
            preferWhatsApp: false            //  <-- force SMS
          })
        : Promise.resolve({ skipped: 'no_client_phone' })
    ]);

    const results = notifications.map((result, index) => ({
      target: index === 0 ? 'provider' : 'client',
      status: result.status,
      ...(result.status === 'fulfilled' ? { result: result.value } : { error: result.reason })
    }));

    ultraLogger.info('PAYMENT_NOTIFICATIONS', 'Notifications envoyées', {
      callSessionId,
      results
    });

  } catch (error) {
    ultraLogger.error(
      'PAYMENT_NOTIFICATIONS',
      'Erreur envoi notifications',
      {
        callSessionId,
        error: error instanceof Error ? error.message : String(error)
      },
      error instanceof Error ? error : undefined
    );
  }
}, 'sendPaymentNotifications', 'STRIPE_WEBHOOKS');

// ====== WEBHOOK STRIPE ULTRA-DÉBUGGÉ ======
export const stripeWebhook = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    concurrency: 1,
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 5
  },
  wrapHttpFunction('stripeWebhook', async (req: FirebaseRequest, res: Response) => {
    const signature = req.headers['stripe-signature'];

    ultraLogger.debug('STRIPE_WEBHOOK', 'Webhook Stripe reçu', {
      hasSignature: !!signature,
      method: req.method,
      contentType: req.headers['content-type'],
      mode: isLive() ? 'live' : 'test'});

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

      const event = stripeInstance.webhooks.constructEvent(
        rawBody.toString(),
        signature as string,
        getStripeWebhookSecret()
      );

      const objectId = (() => {
        const o = event.data.object as unknown;
        return o && typeof o === 'object' && 'id' in (o as Record<string, unknown>) ? (o as { id: string }).id : undefined;
      })();

      ultraLogger.info('STRIPE_WEBHOOK', 'Événement Stripe validé', {
        eventType: event.type,
        eventId: event.id,
        objectId});

      switch (event.type) {
        case 'payment_intent.created':
          ultraLogger.debug('STRIPE_WEBHOOK', 'payment_intent.created', { id: objectId });
          break;

        case 'payment_intent.processing':
          ultraLogger.debug('STRIPE_WEBHOOK', 'payment_intent.processing', { id: objectId });
          break;

        case 'payment_intent.requires_action':
          await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent, database);
          break;

        case 'checkout.session.completed': {
          ultraLogger.info('STRIPE_WEBHOOK', 'checkout.session.completed', { id: objectId });
          const cs = event.data.object as Stripe.Checkout.Session;
          const callSessionId = cs.metadata?.callSessionId || cs.metadata?.sessionId;
          if (callSessionId) {
            await database
              .collection('call_sessions')
              .doc(callSessionId)
              .set(
                {
                  status: 'scheduled',
                  scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                  delaySeconds: 300,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  checkoutSessionId: cs.id,
                  paymentIntentId: typeof cs.payment_intent === 'string' ? cs.payment_intent : undefined},
                { merge: true }
              );

            await scheduleCallTask(callSessionId, 300);

            ultraLogger.info('CHECKOUT_COMPLETED', 'Task planifiée à +300s', {
              callSessionId,
              delaySeconds: 300});

            // 🔔 ENVOI AUTOMATIQUE DES NOTIFICATIONS
            await sendPaymentNotifications(callSessionId, database);
          }
          break;
        }

        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, database);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, database);
          break;

        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, database);
          break;

        case 'charge.refunded':
          ultraLogger.warn('STRIPE_WEBHOOK', 'charge.refunded', { id: objectId });
          break;

        case 'refund.updated':
          ultraLogger.warn('STRIPE_WEBHOOK', 'refund.updated', { id: objectId });
          break;

        default:
          ultraLogger.debug('STRIPE_WEBHOOK', "Type d'événement non géré", {
            eventType: event.type});
      }

      res.json({ received: true });
    } catch (webhookError: unknown) {
      ultraLogger.error(
        'STRIPE_WEBHOOK',
        'Erreur traitement webhook',
        {
          error: webhookError instanceof Error ? webhookError.message : String(webhookError),
          stack: webhookError instanceof Error ? webhookError.stack : undefined},
        webhookError instanceof Error ? webhookError : undefined
      );

      const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
      res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
  })
);

// Handlers Stripe
const handlePaymentIntentSucceeded = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Paiement réussi', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency});

    const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();

    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'captured',
        currency: paymentIntent.currency ?? 'eur',
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()});

      ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Base de données mise à jour');
    }

    // ✅ Fallback pour retrouver callSessionId même sans metadata Stripe
    let callSessionId = paymentIntent.metadata?.callSessionId || '';

    if (!callSessionId) {
      const snap = await database.collection('payments')
        .where('stripePaymentIntentId', '==', paymentIntent.id)
        .limit(1)
        .get();
      if (!snap.empty) callSessionId = (snap.docs[0].data() as any)?.callSessionId || '';
    }

    if (callSessionId) {
      ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Déclenchement des opérations post-paiement', {
        callSessionId});

      await database
        .collection('call_sessions')
        .doc(callSessionId)
        .set(
          {
            status: 'scheduled',
            scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
            delaySeconds: 300,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentIntentId: paymentIntent.id},
          { merge: true }
        );

      await scheduleCallTask(callSessionId, 300);

      ultraLogger.info('STRIPE_PAYMENT_SUCCEEDED', 'Cloud Task créée pour appel à +300s', {
        callSessionId,
        delaySeconds: 300});

      // 🔔 ENVOI AUTOMATIQUE DES NOTIFICATIONS (SMS forcés)
      await sendPaymentNotifications(callSessionId, database);
    }

    return true;
  } catch (succeededError: unknown) {
    ultraLogger.error(
      'STRIPE_PAYMENT_SUCCEEDED',
      'Erreur traitement paiement réussi',
      {
        paymentIntentId: paymentIntent.id,
        error: succeededError instanceof Error ? succeededError.message : String(succeededError)},
      succeededError instanceof Error ? succeededError : undefined
    );
    return false;
  }
}, 'handlePaymentIntentSucceeded', 'STRIPE_WEBHOOKS');

const handlePaymentIntentFailed = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.warn('STRIPE_PAYMENT_FAILED', 'Paiement échoué', {
      paymentIntentId: paymentIntent.id,
      errorMessage: paymentIntent.last_payment_error?.message});

    const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();

    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'failed',
        currency: paymentIntent.currency ?? 'eur',
        failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    }

    if (paymentIntent.metadata?.callSessionId) {
      try {
        ultraLogger.info('STRIPE_PAYMENT_FAILED', 'Annulation appel programmé', {
          callSessionId: paymentIntent.metadata.callSessionId});
        const { cancelScheduledCall } = await import('./callScheduler');
        await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
      } catch (importError) {
        ultraLogger.warn('STRIPE_PAYMENT_FAILED', "Impossible d'importer cancelScheduledCall", {
          error: importError instanceof Error ? importError.message : String(importError)});
      }
    }

    return true;
  } catch (failedError: unknown) {
    ultraLogger.error(
      'STRIPE_PAYMENT_FAILED',
      'Erreur traitement échec paiement',
      {
        error: failedError instanceof Error ? failedError.message : String(failedError)},
      failedError instanceof Error ? failedError : undefined
    );
    return false;
  }
}, 'handlePaymentIntentFailed', 'STRIPE_WEBHOOKS');

const handlePaymentIntentCanceled = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Paiement annulé', {
      paymentIntentId: paymentIntent.id,
      cancellationReason: paymentIntent.cancellation_reason});

    const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();

    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'canceled',
        currency: paymentIntent.currency ?? 'eur',
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    }

    if (paymentIntent.metadata?.callSessionId) {
      try {
        ultraLogger.info('STRIPE_PAYMENT_CANCELED', 'Annulation appel programmé', {
          callSessionId: paymentIntent.metadata.callSessionId});
        const { cancelScheduledCall } = await import('./callScheduler');
        await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
      } catch (importError) {
        ultraLogger.warn('STRIPE_PAYMENT_CANCELED', "Impossible d'importer cancelScheduledCall", {
          error: importError instanceof Error ? importError.message : String(importError)});
      }
    }

    return true;
  } catch (canceledError: unknown) {
    ultraLogger.error(
      'STRIPE_PAYMENT_CANCELED',
      'Erreur traitement annulation paiement',
      {
        error: canceledError instanceof Error ? canceledError.message : String(canceledError)},
      canceledError instanceof Error ? canceledError : undefined
    );
    return false;
  }
}, 'handlePaymentIntentCanceled', 'STRIPE_WEBHOOKS');

const handlePaymentIntentRequiresAction = traceFunction(async (paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) => {
  try {
    ultraLogger.info('STRIPE_PAYMENT_REQUIRES_ACTION', 'Paiement nécessite une action', {
      paymentIntentId: paymentIntent.id,
      nextAction: paymentIntent.next_action?.type});

    const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();

    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'requires_action',
        currency: paymentIntent.currency ?? 'eur',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    }

    return true;
  } catch (actionError: unknown) {
    ultraLogger.error(
      'STRIPE_PAYMENT_REQUIRES_ACTION',
      'Erreur traitement action requise',
      {
        error: actionError instanceof Error ? actionError.message : String(actionError)},
      actionError instanceof Error ? actionError : undefined
    );
    return false;
  }
}, 'handlePaymentIntentRequiresAction', 'STRIPE_WEBHOOKS');

// ========================================
// FONCTIONS CRON POUR MAINTENANCE ULTRA-DÉBUGGÉES
// ========================================
export const scheduledFirestoreExport = onSchedule(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'},
  async () => {
    const metadata = createDebugMetadata('scheduledFirestoreExport');
    logFunctionStart(metadata);

    try {
      ultraLogger.info('SCHEDULED_BACKUP', 'Décollage sauvegarde automatique');

      const database = initializeFirebase();
      const projectId = process.env.GCLOUD_PROJECT;
      const bucketName = `${projectId}-backups`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      ultraLogger.debug('SCHEDULED_BACKUP', 'Configuration sauvegarde', {
        projectId,
        bucketName,
        timestamp});

      const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();

      const firestoreExportName = `firestore-export-${timestamp}`;
      const firestoreExportPath = `gs://${bucketName}/${firestoreExportName}`;

      ultraLogger.info('SCHEDULED_BACKUP', 'Lancement export Firestore', {
        exportPath: firestoreExportPath});

      const [firestoreOperation] = await firestoreClient.exportDocuments({
        name: `projects/${projectId}/databases/(default)`,
        outputUriPrefix: firestoreExportPath,
        collectionIds: [] });

      ultraLogger.info('SCHEDULED_BACKUP', 'Export Firestore démarré', {
        operationName: firestoreOperation.name});

      await database.collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        firestoreExportPath,
        operationName: firestoreOperation.name,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'});

      logFunctionEnd(metadata, { success: true, exportPath: firestoreExportPath });
    } catch (exportError: unknown) {
      ultraLogger.error(
        'SCHEDULED_BACKUP',
        'Erreur sauvegarde automatique',
        {
          error: exportError instanceof Error ? exportError.message : String(exportError),
          stack: exportError instanceof Error ? exportError.stack : undefined},
        exportError instanceof Error ? exportError : undefined
      );

      const errorMessage = exportError instanceof Error ? exportError.message : 'Unknown error';
      const database = initializeFirebase();

      await database.collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: errorMessage});

      logFunctionEnd(metadata, undefined, exportError instanceof Error ? exportError : new Error(String(exportError)));
    }
  }
);

export const scheduledCleanup = onSchedule(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
    schedule: '0 3 * * 0',
    timeZone: 'Europe/Paris'},
  async () => {
    const metadata = createDebugMetadata('scheduledCleanup');
    logFunctionStart(metadata);

    try {
      ultraLogger.info('SCHEDULED_CLEANUP', 'Démarrage nettoyage périodique');

      const twilioCallManager = await getTwilioCallManager();

      ultraLogger.debug('SCHEDULED_CLEANUP', 'Configuration nettoyage', {
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100});

      const cleanupResult = await twilioCallManager.cleanupOldSessions({
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100});

      ultraLogger.info('SCHEDULED_CLEANUP', 'Nettoyage terminé', {
        deleted: cleanupResult.deleted,
        errors: cleanupResult.errors});

      const database = initializeFirebase();
      await database.collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        result: cleanupResult,
        timestamp: admin.firestore.FieldValue.serverTimestamp()});

      logFunctionEnd(metadata, cleanupResult);
    } catch (cleanupError: unknown) {
      ultraLogger.error(
        'SCHEDULED_CLEANUP',
        'Erreur nettoyage périodique',
        {
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          stack: cleanupError instanceof Error ? cleanupError.stack : undefined},
        cleanupError instanceof Error ? cleanupError : undefined
      );

      const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
      const database = initializeFirebase();

      await database.collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        status: 'failed',
        error: errorMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp()});

      logFunctionEnd(metadata, undefined, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));
    }
  }
);

// ========================================
// FONCTION DE DEBUG SYSTÈME
// ========================================
export const generateSystemDebugReport = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 120
  },
  wrapCallableFunction('generateSystemDebugReport', async (request: CallableRequest<Record<string, never>>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Génération rapport de debug système');

    try {
      const database = initializeFirebase();

      const ultraDebugReport = await ultraLogger.generateDebugReport();

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
          NODE_ENV: process.env.NODE_ENV}};

      const managersState = {
        stripeManagerInstance: !!stripeManagerInstance,
        twilioCallManagerInstance: !!twilioCallManagerInstance,
        messageManagerInstance: !!messageManagerInstance,
        firebaseInitialized: isFirebaseInitialized};

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
        ultraDebugReport: JSON.parse(ultraDebugReport)};

      const reportId = `debug_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await database.collection('debug_reports').doc(reportId).set({
        ...fullReport,
        generatedBy: request.auth.uid,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()});

      ultraLogger.info('SYSTEM_DEBUG_REPORT', 'Rapport de debug généré et sauvegardé', {
        reportId,
        errorsCount: recentErrors.length});

      return {
        success: true,
        reportId,
        summary: {
          systemUptime: systemInfo.uptime,
          recentErrorsCount: recentErrors.length,
          managersLoaded: Object.values(managersState).filter(Boolean).length,
          memoryUsage: (systemInfo as any).memoryUsage.heapUsed},
        downloadUrl: `/admin/debug-reports/${reportId}`};
    } catch (error) {
      ultraLogger.error(
        'SYSTEM_DEBUG_REPORT',
        'Erreur génération rapport debug',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : undefined
      );

      throw new HttpsError('internal', 'Failed to generate debug report');
    }
  })
);

// ========================================
// FONCTION DE MONITORING EN TEMPS RÉEL
// ========================================
export const getSystemHealthStatus = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30
  },
  wrapCallableFunction('getSystemHealthStatus', async (request: CallableRequest<Record<string, never>>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'Vérification état système');

    try {
      const database = initializeFirebase();
      const startTime = Date.now();

      const firestoreTest = Date.now();
      await database.collection('_health_check').limit(1).get();
      const firestoreLatency = Date.now() - firestoreTest;

      let stripeStatus: 'not_configured' | 'healthy' | 'error' = 'not_configured';
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
          error: stripeError instanceof Error ? stripeError.message : String(stripeError)});
      }

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogsQuery = await database.collection('ultra_debug_logs').where('timestamp', '>=', last24h.toISOString()).get();

      const logsByLevel = {
        ERROR: 0,
        WARN: 0,
        INFO: 0,
        DEBUG: 0,
        TRACE: 0};

      recentLogsQuery.docs.forEach((doc) => {
        const data = doc.data() as any;
        if (Object.prototype.hasOwnProperty.call(logsByLevel, data.level)) {
          (logsByLevel as any)[data.level]++;
        }
      });

      const totalResponseTime = Date.now() - startTime;

      const healthStatus = {
        timestamp: new Date().toISOString(),
        status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy' | 'error',
        services: {
          firebase: {
            status: 'healthy',
            latency: firestoreLatency,
            initialized: isFirebaseInitialized},
          stripe: {
            status: stripeStatus,
            latency: stripeLatency}},
        managers: {
          stripeManager: !!stripeManagerInstance,
          twilioCallManager: !!twilioCallManagerInstance,
          messageManager: !!messageManagerInstance},
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'},
        metrics: {
          last24h: logsByLevel,
          responseTime: totalResponseTime}};

      if (firestoreLatency > 1000 || stripeStatus === 'error') {
        (healthStatus as any).status = 'degraded';
      }
      if ((logsByLevel as any).ERROR > 100) {
        (healthStatus as any).status = 'unhealthy';
      }

      ultraLogger.debug('SYSTEM_HEALTH_CHECK', 'État système vérifié', {
        status: (healthStatus as any).status,
        responseTime: totalResponseTime,
        errorsLast24h: (logsByLevel as any).ERROR});

      return healthStatus;
    } catch (error) {
      ultraLogger.error(
        'SYSTEM_HEALTH_CHECK',
        'Erreur vérification état système',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : undefined
      );

      return {
        timestamp: new Date().toISOString(),
        status: 'error' as const,
        error: error instanceof Error ? error.message : String(error)};
    }
  })
);

// ========================================
// LOGS DEBUG ULTRA
// ========================================
export const getUltraDebugLogs = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30
  },
  wrapCallableFunction('getUltraDebugLogs', async (request: CallableRequest<{ limit?: number; level?: string }>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { limit = 100, level } = request.data || {};

    try {
      const database = initializeFirebase();
      let query: FirebaseFirestore.Query = database.collection('ultra_debug_logs').orderBy('timestamp', 'desc').limit(Math.min(limit, 500));

      if (level && ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'].includes(level)) {
        query = query.where('level', '==', level);
      }

      const snapshot = await query.get();
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()}));

      return {
        success: true,
        logs,
        count: logs.length,
        filtered: !!level};
    } catch (error) {
      ultraLogger.error(
        'GET_ULTRA_DEBUG_LOGS',
        'Erreur récupération logs',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : undefined
      );

      throw new HttpsError('internal', 'Failed to retrieve logs');
    }
  })
);

// ========================================
// FONCTIONS DE TEST ET UTILITAIRES
// ========================================
export const testCloudTasksConnection = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 60
  },
  wrapCallableFunction('testCloudTasksConnection', async (request: CallableRequest<{ testPayload?: Record<string, unknown> }>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      ultraLogger.info('TEST_CLOUD_TASKS', 'Test de connexion Cloud Tasks');

      const { createTestTask } = await import('./lib/tasks');
      const testPayload = request.data?.testPayload || { test: 'cloud_tasks_connection' };

      const taskId = await createTestTask(testPayload, 10);

      ultraLogger.info('TEST_CLOUD_TASKS', 'Tâche de test créée avec succès', {
        taskId,
        delaySeconds: 10});

      return {
        success: true,
        taskId,
        message: 'Tâche de test créée, elle s\'exécutera dans 10 secondes',
        testPayload,
        timestamp: new Date().toISOString()};
    } catch (error) {
      ultraLogger.error(
        'TEST_CLOUD_TASKS',
        'Erreur test Cloud Tasks',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : undefined
      );

      throw new HttpsError('internal', `Test Cloud Tasks échoué: ${error instanceof Error ? error.message : error}`);
    }
  })
);

export const getCloudTasksQueueStats = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 30
  },
  wrapCallableFunction('getCloudTasksQueueStats', async (request: CallableRequest<Record<string, never>>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
      ultraLogger.info('QUEUE_STATS', 'Récupération statistiques queue Cloud Tasks');

      const { getQueueStats, listPendingTasks } = await import('./lib/tasks');

      const [stats, pendingTasks] = await Promise.all([
        getQueueStats(),
        listPendingTasks(20),
      ]);

      ultraLogger.info('QUEUE_STATS', 'Statistiques récupérées', {
        pendingTasksCount: (stats as any).pendingTasks,
        queueName: (stats as any).queueName,
        location: (stats as any).location});

      return {
        success: true,
        stats,
        pendingTasksSample: pendingTasks,
        timestamp: new Date().toISOString()};
    } catch (error) {
      ultraLogger.error(
        'QUEUE_STATS',
        'Erreur récupération statistiques queue',
        { error: error instanceof Error ? error.message : String(error) },
        error instanceof Error ? error : undefined
      );

      throw new HttpsError('internal', `Erreur récupération stats: ${error instanceof Error ? error.message : error}`);
    }
  })
);

export const manuallyTriggerCallExecution = onCall(
  {
    ...emergencyConfig,
    timeoutSeconds: 60
  },
  wrapCallableFunction('manuallyTriggerCallExecution', async (request: CallableRequest<{ callSessionId: string }>) => {
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { callSessionId } = request.data;

    if (!callSessionId) {
      throw new HttpsError('invalid-argument', 'callSessionId requis');
    }

    try {
      ultraLogger.info('MANUAL_CALL_TRIGGER', 'Déclenchement manuel d\'appel', {
        callSessionId,
        triggeredBy: request.auth.uid});

      const database = initializeFirebase();
      const sessionDoc = await database.collection('call_sessions').doc(callSessionId).get();

      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', `Session ${callSessionId} introuvable`);
      }

      const sessionData = sessionDoc.data();

      ultraLogger.info('MANUAL_CALL_TRIGGER', 'Session trouvée', {
        callSessionId,
        currentStatus: sessionData?.status,
        paymentStatus: (sessionData as any)?.payment?.status});

      const { TwilioCallManager } = await import('./TwilioCallManager');

      const result = await (TwilioCallManager as any).startOutboundCall({
        sessionId: callSessionId,
        delayMinutes: 0,
      });

      ultraLogger.info('MANUAL_CALL_TRIGGER', 'Appel déclenché avec succès', {
        callSessionId,
        resultStatus: (result as any)?.status});

      return {
        success: true,
        callSessionId,
        result,
        triggeredBy: request.auth.uid,
        timestamp: new Date().toISOString(),
        message: 'Appel déclenché manuellement avec succès'};
    } catch (error) {
      ultraLogger.error(
        'MANUAL_CALL_TRIGGER',
        'Erreur déclenchement manuel d\'appel',
        {
          callSessionId,
          error: error instanceof Error ? error.message : String(error),
          triggeredBy: request.auth.uid},
        error instanceof Error ? error : undefined
      );

      throw new HttpsError('internal', `Erreur déclenchement appel: ${error instanceof Error ? error.message : error}`);
    }
  })
);

// ========================================
// WEBHOOK DE TEST POUR CLOUD TASKS
// ========================================
export const testWebhook = onRequest(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    concurrency: 1,
    timeoutSeconds: 60
  },
  wrapHttpFunction('testWebhook', async (req: FirebaseRequest, res: Response) => {
    try {
      res.status(200).json({ ok: true, now: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message ?? e) });
    }
  })
);
