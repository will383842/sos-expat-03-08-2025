// functions/src/index.ts

// ====== EXPORTS PRINCIPAUX ======

// Configuration globale pour toutes les fonctions
import { setGlobalOptions } from 'firebase-functions/v2';
setGlobalOptions({
  region: 'europe-west1',
});

// Export des webhooks modernisés (remplace les anciens)
export { twilioCallWebhook, twilioConferenceWebhook, twilioRecordingWebhook } from './Webhooks/twilioWebhooks';

// Export des webhooks spécialisés
export { twilioConferenceWebhook as modernConferenceWebhook } from './Webhooks/TwilioConferenceWebhook'; 
export { twilioRecordingWebhook as modernRecordingWebhook } from './Webhooks/TwilioRecordingWebhook';

// Export des managers
export { messageManager } from './MessageManager';
export { stripeManager } from './StripeManager';
export { twilioCallManager } from './TwilioCallManager';

// Export des fonctions utilitaires
export { scheduleCallSequence, cancelScheduledCall } from './callScheduler';

// Export de l'initialisation des templates
export { initializeMessageTemplates } from './initializeMessageTemplates';

// Export des fonctions de notification (si nécessaire)
export { notifyAfterPayment } from './notifications/notifyAfterPayment';

// Export des fonctions modernes
export { createAndScheduleCallHTTPS as createAndScheduleCall } from './createAndScheduleCallFunction';
export { createPaymentIntent } from './createPaymentIntent';

// ====== IMPORTS POUR FONCTIONS RESTANTES ======

import { onRequest } from 'firebase-functions/v2/https';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
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

// Types pour les fonctions admin v2
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

// Interface pour les custom claims
interface CustomClaims {
  role?: string;
  [key: string]: unknown;
}

// Charger les variables d'environnement depuis .env
import * as dotenv from 'dotenv';
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
} catch (firebaseError) {
  console.log('ℹ️ Firestore déjà configuré', firebaseError);
}

// ========================================
// FONCTIONS ADMIN (TOUTES EN V2 MAINTENANT)
// ========================================

export const adminUpdateStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  async (request: CallableRequest<AdminUpdateStatusData>) => {
    // Vérifier que l'utilisateur est admin
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
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
  }
);

export const adminSoftDeleteUser = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  async (request: CallableRequest<AdminSoftDeleteData>) => {
    // Vérifier que l'utilisateur est admin
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
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
  }
);

export const adminBulkUpdateStatus = onCall(
  { cors: true, memory: "256MiB", timeoutSeconds: 30 },
  async (request: CallableRequest<AdminBulkUpdateData>) => {
    // Vérifier que l'utilisateur est admin
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
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
    // Vérifier que l'utilisateur est admin
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, reason } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    try {
      const { twilioCallManager } = await import('./TwilioCallManager');
      const success = await twilioCallManager.cancelCallSession(
        sessionId, 
        reason || 'admin_force_disconnect', 
        request.auth.uid
      );

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
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId } = request.data;
    
    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionId is required');
    }

    try {
      const { twilioCallManager } = await import('./TwilioCallManager');
      const session = await twilioCallManager.getCallSession(sessionId);
      
      if (!session || session.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Call is not active');
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
    if (!request.auth || (request.auth.token as CustomClaims)?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { sessionId, newProviderId } = request.data;
    
    if (!sessionId || !newProviderId) {
      throw new HttpsError('invalid-argument', 'sessionId and newProviderId are required');
    }

    try {
      // Vérifier que le nouveau prestataire existe
      const newProviderDoc = await db.collection('users').doc(newProviderId).get();

      if (!newProviderDoc.exists) {
        throw new HttpsError('not-found', 'New provider not found');
      }

      const newProvider = newProviderDoc.data();
      if (!newProvider?.phone) {
        throw new HttpsError('failed-precondition', 'New provider has no phone number');
      }

      // Vérifier que c'est bien un prestataire
      if (!['lawyer', 'expat'].includes(newProvider.role)) {
        throw new HttpsError('failed-precondition', 'User is not a provider');
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
      const { twilioCallManager } = await import('./TwilioCallManager');
      const session = await twilioCallManager.getCallSession(sessionId);
      
      if (!session || session.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Call is not active');
      }

      const participant = session.participants[participantType as 'provider' | 'client'];
      
      if (!participant.callSid) {
        throw new HttpsError('failed-precondition', 'Participant call SID not found');
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
    } catch (muteError) {
      console.error('Error muting participant:', muteError);
      throw new HttpsError('internal', 'Failed to mute participant');
    }
  }
);

// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES
// ========================================

// Configuration Stripe avec gestion d'erreurs
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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

// ====== WEBHOOK STRIPE UNIFIÉ ======
export const stripeWebhook = onRequest(async (req: FirebaseRequest, res: Response) => {
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

    const event = stripe.webhooks.constructEvent(
      rawBody.toString(),
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
    
    console.log('🔔 Stripe webhook reçu:', event.type);
    
    // Traiter l'événement avec le nouveau système
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
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

// Handlers pour les événements Stripe
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
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
  } catch (succeededError: unknown) {
    console.error('❌ Erreur handlePaymentIntentSucceeded:', succeededError);
    return false;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('❌ Paiement échoué:', paymentIntent.id);
    
    // Mettre à jour le paiement dans Firestore
    const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
    const paymentsSnapshot = await paymentsQuery.get();
    
    if (!paymentsSnapshot.empty) {
      const paymentDoc = paymentsSnapshot.docs[0];
      await paymentDoc.ref.update({
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Annuler l'appel associé si nécessaire
    if (paymentIntent.metadata.callSessionId) {
      const { cancelScheduledCall } = await import('./callScheduler');
      await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_failed');
    }
    
    return true;
  } catch (failedError: unknown) {
    console.error('Error handling payment intent failed:', failedError);
    return false;
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
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
      const { cancelScheduledCall } = await import('./callScheduler');
      await cancelScheduledCall(paymentIntent.metadata.callSessionId, 'payment_canceled');
    }
    
    return true;
  } catch (canceledError: unknown) {
    console.error('Error handling payment intent canceled:', canceledError);
    return false;
  }
}

async function handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
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
      
    } catch (exportError: unknown) {
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
  }
);

export { api } from './adminApi';

// ====== FONCTION DE NETTOYAGE PÉRIODIQUE ======
export const scheduledCleanup = onSchedule(
  {
    schedule: '0 3 * * 0', // Tous les dimanches à 3h
    timeZone: 'Europe/Paris'
  },
  async () => {
    try {
      console.log('🧹 Démarrage nettoyage périodique');
      
      // Nettoyer les anciennes sessions d'appel via TwilioCallManager
      const { twilioCallManager } = await import('./TwilioCallManager');
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
      
    } catch (cleanupError: unknown) {
      console.error('❌ Erreur nettoyage périodique:', cleanupError);
      
      const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
      
      await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        status: 'failed',
        error: errorMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);