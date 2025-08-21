// functions/src/index.ts - Version finale v2 avec LAZY LOADING et config Firebase

// ====== CONFIGURATION GLOBALE ======
import { setGlobalOptions } from 'firebase-functions/v2';
setGlobalOptions({
  region: 'europe-west1',
});

// ====== IMPORTS SEULEMENT (PAS D'INITIALISATION) ======
import { onRequest } from 'firebase-functions/v2/https';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import type { Request as ExpressRequest, Response } from 'express';

// Interface pour les requêtes avec rawBody (Firebase Functions)
interface FirebaseRequest extends ExpressRequest {
  rawBody: Buffer;
}

// Types pour les fonctions admin
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

// ====== INITIALISATION FIREBASE (UNE SEULE FOIS) ======
let isFirebaseInitialized = false;
let db: admin.firestore.Firestore;

function initializeFirebase() {
  if (!isFirebaseInitialized) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      
      db = admin.firestore();
      
      // Configuration Firestore (une seule fois)
      try {
        db.settings({ ignoreUndefinedProperties: true });
        console.log('✅ Firestore configuré');
      } catch (settingsError) {
        // Firestore déjà configuré, c'est normal
        console.log('ℹ️ Firestore déjà configuré');
      }
      
      isFirebaseInitialized = true;
      console.log('✅ Firebase initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation Firebase:', error);
      throw error;
    }
  }
  return db;
}

// ====== LAZY LOADING DES MANAGERS ======
let stripeManagerInstance: any = null;
let twilioCallManagerInstance: any = null;
let messageManagerInstance: any = null;

async function getStripeManager() {
  if (!stripeManagerInstance) {
    const { stripeManager } = await import('./StripeManager');
    stripeManagerInstance = stripeManager;
  }
  return stripeManagerInstance;
}

async function getTwilioCallManager() {
  if (!twilioCallManagerInstance) {
    const { twilioCallManager } = await import('./TwilioCallManager');
    twilioCallManagerInstance = twilioCallManager;
  }
  return twilioCallManagerInstance;
}

async function getMessageManager() {
  if (!messageManagerInstance) {
    const { messageManager } = await import('./MessageManager');
    messageManagerInstance = messageManager;
  }
  return messageManagerInstance;
}

// ====== EXPORTS DIRECTS (SANS INITIALISATION) ======
// Export des fonctions réelles utilisées par le frontend
export { createAndScheduleCallHTTPS } from './createAndScheduleCallFunction';
export { createPaymentIntent } from './createPaymentIntent';

// Export de l'API admin
export { api } from './adminApi';

// Export des webhooks modernisés
export { twilioCallWebhook, twilioConferenceWebhook, twilioRecordingWebhook } from './Webhooks/twilioWebhooks';

// Export des webhooks spécialisés
export { twilioConferenceWebhook as modernConferenceWebhook } from './Webhooks/TwilioConferenceWebhook'; 
export { twilioRecordingWebhook as modernRecordingWebhook } from './Webhooks/TwilioRecordingWebhook';

// Export de l'initialisation des templates
export { initializeMessageTemplates } from './initializeMessageTemplates';

// Export des fonctions de notification (si nécessaire)
export { notifyAfterPayment } from './notifications/notifyAfterPayment';

// ========================================
// FONCTIONS ADMIN (TOUTES EN V2 MAINTENANT)
// ========================================

export const adminUpdateStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  async (request: CallableRequest<AdminUpdateStatusData>) => {
    // Initialiser Firebase au besoin
    const database = initializeFirebase();
    
    // Vérifier que l'utilisateur est admin
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, status, reason } = request.data;
    
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
    
    return { ok: true };
  }
);

export const adminSoftDeleteUser = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  async (request: CallableRequest<AdminSoftDeleteData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, reason } = request.data;
    
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
  }
);

export const adminBulkUpdateStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  async (request: CallableRequest<AdminBulkUpdateData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { ids, status, reason } = request.data;
    
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
  }
);

// ========================================
// FONCTIONS ADMIN POUR MONITORING DES APPELS (V2)
// ========================================

export const adminForceDisconnectCall = onCall(
  { 
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30 
  },
  async (request: CallableRequest<AdminCallActionData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, reason } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

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

      return { 
        success, 
        message: `Call ${sessionId} disconnected successfully` 
      };
    } catch (callError) {
      console.error('Error force disconnecting call:', callError);
      throw new HttpsError('internal', 'Failed to disconnect call');
    }
  }
);

export const adminJoinCall = onCall(
  { 
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30 
  },
  async (request: CallableRequest<AdminCallActionData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    try {
      const twilioCallManager = await getTwilioCallManager();
      const session = await twilioCallManager.getCallSession(sessionId);
      
      if (!session || session.status !== 'active') {
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

      return {
        conferenceUrl,
        accessToken,
        conferenceSid: session.conference.sid,
        conferenceName: session.conference.name,
        message: 'Open Twilio Console to join the conference'
      };
    } catch (joinError) {
      console.error('Error joining call:', joinError);
      throw new HttpsError('internal', 'Failed to join call');
    }
  }
);

export const adminTransferCall = onCall(
  { 
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30 
  },
  async (request: CallableRequest<AdminTransferCallData>) => {
    const database = initializeFirebase();
    
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, newProviderId } = request.data;
    
    if (!sessionId || !newProviderId) {
      throw new HttpsError('invalid-argument', 'sessionId and newProviderId are required');
    }

    try {
      const newProviderDoc = await database.collection('users').doc(newProviderId).get();

      if (!newProviderDoc.exists) {
        throw new HttpsError('not-found', 'New provider not found');
      }

      const newProvider = newProviderDoc.data();
      if (!newProvider?.phone) {
        throw new HttpsError('failed-precondition', 'New provider has no phone number');
      }

      if (!['lawyer', 'expat'].includes(newProvider.role)) {
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

      return { 
        success: true, 
        message: `Call transferred to provider ${newProviderId}`,
        newProviderId,
        newProviderName: `${newProvider.firstName || ''} ${newProvider.lastName || ''}`.trim()
      };
    } catch (transferError) {
      console.error('Error transferring call:', transferError);
      throw new HttpsError('internal', 'Failed to transfer call');
    }
  }
);

export const adminMuteParticipant = onCall(
  { 
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 30 
  },
  async (request: CallableRequest<AdminMuteParticipantData>) => {
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

    try {
      const twilioCallManager = await getTwilioCallManager();
      const session = await twilioCallManager.getCallSession(sessionId);
      
      if (!session || session.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Call is not active');
      }

      const participant = session.participants[participantType as 'provider' | 'client'];
      
      if (!participant.callSid) {
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

      return { 
        success: true, 
        message: `Participant ${participantType} ${mute ? 'muted' : 'unmuted'}`,
        participantType,
        muted: mute,
        note: 'Action recorded in session - Twilio Conference API integration required for actual mute/unmute'
      };
    } catch (muteError) {
      console.error('Error muting participant:', muteError);
      throw new HttpsError('internal', 'Failed to mute participant');
    }
  }
);

// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES (LAZY)
// ========================================

let stripe: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!stripe) {
    const stripeConfig = functions.config().stripe;
    
    if (stripeConfig?.secret_key && stripeConfig.secret_key.startsWith('sk_')) {
      try {
        stripe = new Stripe(stripeConfig.secret_key, {
          apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
        });
        console.log('✅ Stripe configuré avec succès');
      } catch (stripeError) {
        console.error('❌ Erreur configuration Stripe:', stripeError);
        stripe = null;
      }
    } else {
      console.warn('⚠️ Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide');
    }
  }
  
  return stripe;
}

// ====== WEBHOOK STRIPE UNIFIÉ ======
export const stripeWebhook = onRequest({
  memory: "256MiB",
  timeoutSeconds: 30
}, async (req: FirebaseRequest, res: Response) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    res.status(400).send('Signature Stripe manquante');
    return;
  }

  const stripeInstance = getStripe();
  if (!stripeInstance) {
    res.status(500).send('Service Stripe non configuré');
    return;
  }
  
  try {
    const database = initializeFirebase();
    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(400).send('Raw body manquant');
      return;
    }

    const stripeConfig = functions.config().stripe;
    const event = stripeInstance.webhooks.constructEvent(
      rawBody.toString(),
      signature as string,
      stripeConfig?.webhook_secret || ''
    );
    
    console.log('🔔 Stripe webhook reçu:', event.type);
    
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
        console.log(`Type d'événement Stripe non géré: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (webhookError: unknown) {
    console.error('Error processing Stripe webhook:', webhookError);
    const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
    res.status(400).send(`Webhook Error: ${errorMessage}`);
  }
});

// Handlers pour les événements Stripe (avec lazy loading)
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) {
  try {
    console.log('💰 Paiement réussi:', paymentIntent.id);
    
    const paymentsQuery = database.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();

    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'captured',
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    if (paymentIntent.metadata?.callSessionId) {
      console.log('📞 Déclenchement des notifications post-paiement');
    }

    return true;
  } catch (succeededError: unknown) {
    console.error('❌ Erreur handlePaymentIntentSucceeded:', succeededError);
    return false;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) {
  try {
    console.log('❌ Paiement échoué:', paymentIntent.id);
    
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
        const { cancelScheduledCall } = await import('./callScheduler');
        await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
      } catch (importError) {
        console.warn('Could not import cancelScheduledCall:', importError);
      }
    }
    
    return true;
  } catch (failedError: unknown) {
    console.error('Error handling payment intent failed:', failedError);
    return false;
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) {
  try {
    console.log('🚫 Paiement annulé:', paymentIntent.id);
    
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
        const { cancelScheduledCall } = await import('./callScheduler');
        await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
      } catch (importError) {
        console.warn('Could not import cancelScheduledCall:', importError);
      }
    }
    
    return true;
  } catch (canceledError: unknown) {
    console.error('Error handling payment intent canceled:', canceledError);
    return false;
  }
}

async function handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent, database: admin.firestore.Firestore) {
  try {
    console.log('⚠️ Paiement nécessite une action:', paymentIntent.id);
    
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
    console.error('Error handling payment intent requires action:', actionError);
    return false;
  }
}

// ====== FONCTIONS CRON POUR MAINTENANCE ======
export const scheduledFirestoreExport = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'Europe/Paris'
  },
  async () => {
    try {
      const database = initializeFirebase();
      const projectId = process.env.GCLOUD_PROJECT;
      const bucketName = `${projectId}-backups`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      console.log(`🔄 Démarrage sauvegarde automatique: ${timestamp}`);
      
      const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
      
      const firestoreExportName = `firestore-export-${timestamp}`;
      const firestoreExportPath = `gs://${bucketName}/${firestoreExportName}`;
      
      const [firestoreOperation] = await firestoreClient.exportDocuments({
        name: `projects/${projectId}/databases/(default)`,
        outputUriPrefix: firestoreExportPath,
        collectionIds: [],
      });
      
      console.log(`✅ Export Firestore démarré: ${firestoreOperation.name}`);
      
      await database.collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        firestoreExportPath,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });
      
    } catch (exportError: unknown) {
      console.error('❌ Erreur sauvegarde automatique:', exportError);
      
      const errorMessage = exportError instanceof Error ? exportError.message : 'Unknown error';
      const database = initializeFirebase();
      
      await database.collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: errorMessage
      });
    }
  }
);

export const scheduledCleanup = onSchedule(
  {
    schedule: '0 3 * * 0',
    timeZone: 'Europe/Paris'
  },
  async () => {
    try {
      console.log('🧹 Démarrage nettoyage périodique');
      
      const twilioCallManager = await getTwilioCallManager();
      const cleanupResult = await twilioCallManager.cleanupOldSessions({
        olderThanDays: 90,
        keepCompletedDays: 30,
        batchSize: 100
      });
      
      console.log(`✅ Nettoyage terminé: ${cleanupResult.deleted} supprimées, ${cleanupResult.errors} erreurs`);
      
      const database = initializeFirebase();
      await database.collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        result: cleanupResult,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (cleanupError: unknown) {
      console.error('❌ Erreur nettoyage périodique:', cleanupError);
      
      const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
      const database = initializeFirebase();
      
      await database.collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        status: 'failed',
        error: errorMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);