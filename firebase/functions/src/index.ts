// ====== EXPORTS PRINCIPAUX ======

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
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import type { Request as ExpressRequest, Response } from 'express';

// Interface pour les requêtes avec rawBody (Firebase Functions)
interface FirebaseRequest extends ExpressRequest {
  rawBody: Buffer;
}

// Charger les variables d'environnement depuis .env
import * as dotenv from 'dotenv';
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
} catch (error) {
  console.log('ℹ️ Firestore déjà configuré');
}
console.log('✅ Firestore configuré pour ignorer les propriétés undefined');

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
  } catch (error) {
    console.error('❌ Erreur configuration Stripe:', error);
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
  } catch (error: unknown) {
    console.error('Error processing Stripe webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
  } catch (error: unknown) {
    console.error('❌ Erreur handlePaymentIntentSucceeded:', error);
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
  } catch (error: unknown) {
    console.error('Error handling payment intent failed:', error);
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
  } catch (error: unknown) {
    console.error('Error handling payment intent canceled:', error);
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
  } catch (error: any) {
    console.error('Error handling payment intent requires action:', error);
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
      
    } catch (error: unknown) {
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
  }
);

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
      
    } catch (error: unknown) {
      console.error('❌ Erreur nettoyage périodique:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        status: 'failed',
        error: errorMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);