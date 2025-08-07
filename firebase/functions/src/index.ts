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

export { createAndScheduleCallHTTPS as createAndScheduleCall } from './createAndScheduleCallFunction';

// ====== FONCTIONS CLOUD EXISTANTES (MAINTENUES POUR COMPATIBILITÉ) ======

import { onCall, onRequest, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import twilio from 'twilio';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
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

// ========================================
// CONFIGURATION SÉCURISÉE DES SERVICES
// ========================================

// Configuration Twilio avec gestion d'erreurs
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio configuré avec succès');
  } catch (error) {
    console.error('❌ Erreur configuration Twilio:', error);
    twilioClient = null;
  }
} else {
  console.warn('⚠️ Twilio non configuré - Variables d\'environnement manquantes');
}

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

// Configuration Email avec gestion d'erreurs
let emailTransporter: nodemailer.Transporter | null = null;
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
  } catch (error) {
    console.error('❌ Erreur configuration Email:', error);
    emailTransporter = null;
  }
} else {
  console.warn('⚠️ Email non configuré - Variables d\'environnement manquantes');
}

// Export du client Twilio pour compatibility
export { twilioClient };

// Interface pour les données de notification
interface NotificationData {
  type: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  recipientCountry?: string;
  emailSubject?: string;
  emailHtml?: string;
  smsMessage?: string;
  whatsappMessage?: string;
}

// ====== FONCTION CLOUD POUR NOTIFICATIONS ======
export const sendEmail = onCall(
  async (request: CallableRequest<NotificationData>) => {
    const data = request.data;
  
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'L\'utilisateur doit être authentifié pour envoyer des notifications.'
      );
    }

    const { 
      type, 
      recipientEmail, 
      recipientPhone, 
      recipientName,
      recipientCountry,
      emailSubject,
      emailHtml,
      smsMessage,
      whatsappMessage 
    } = data;

    try {
      const results: Array<{ channel: string; success: boolean; error?: string }> = [];

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
          } catch (emailError: any) {
            console.error('❌ Erreur email:', emailError);
            results.push({ channel: 'email', success: false, error: emailError.message });
          }
        } else {
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
          } catch (smsError: any) {
            console.error('❌ Erreur SMS:', smsError);
            results.push({ channel: 'sms', success: false, error: smsError.message });
          }
        } else {
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
          } catch (whatsappError: any) {
            console.error('❌ Erreur WhatsApp:', whatsappError);
            results.push({ channel: 'whatsapp', success: false, error: whatsappError.message });
          }
        } else {
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

    } catch (error: any) {
      console.error('Erreur générale lors de l\'envoi de notification:', error);
      throw new HttpsError(
        'internal',
        'Erreur lors de l\'envoi de la notification',
        error
      );
    }
  }
);

// ====== FONCTION CLOUD POUR PUSH NOTIFICATIONS ======
interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendPushNotification = onCall(async (request: CallableRequest<PushNotificationData>) => {
  const data = request.data;
  
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié.'
    );
  }

  const { userId, title, body, data: notificationData } = data;

  try {
    // Récupérer les tokens FCM de l'utilisateur
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('Utilisateur non trouvé');
    }

    const userData = userDoc.data();
    const deviceTokens = userData?.deviceTokens || [];

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

  } catch (error: any) {
    console.error('Erreur envoi push notification:', error);
    throw new HttpsError(
      'internal',
      'Erreur lors de l\'envoi de la push notification',
      error
    );
  }
});

// ====== FONCTIONS PAIEMENT STRIPE (LEGACY - REMPLACÉES PAR STRIPEMANAGER) ======
interface PaymentIntentData {
  amount: number;
  currency?: string;
  clientId: string;
  providerId: string;
  serviceType: string;
  commissionAmount: number;
  providerAmount: number;
  metadata?: Record<string, string>;
}

// Fonction pour créer un PaymentIntent Stripe (legacy - utiliser createPaymentIntent.ts)
export const createPaymentIntentLegacy = onCall(async (request: CallableRequest<PaymentIntentData>) => {
  const data = request.data;
  
  // Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
    );
  }

  // Vérifier que Stripe est configuré
  if (!stripe) {
    throw new HttpsError(
      'failed-precondition',
      'Service de paiement non disponible. Configuration Stripe manquante.'
    );
  }

  const { amount, currency, clientId, providerId, serviceType, commissionAmount, providerAmount, metadata } = data;

  // Validation des données
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Montant manquant ou invalide.');
  }

  if (!clientId || !providerId || !serviceType) {
    throw new HttpsError('invalid-argument', 'Données requises manquantes.');
  }

  // Vérifier que l'utilisateur authentifié correspond au clientId
  if (request.auth.uid !== clientId) {
    throw new HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
  }

  try {
    console.log('Création PaymentIntent pour:', { amount, currency: currency || 'eur', serviceType, clientId, providerId });

    // Créer un PaymentIntent avec Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'eur',
      capture_method: 'manual', // Capture différée
      metadata: {
        clientId,
        providerId,
        serviceType,
        commissionAmount: commissionAmount.toString(),
        providerAmount: providerAmount.toString(),
        ...metadata
      },
      description: `Service ${serviceType} - Prestataire ${providerId}`
    });

    console.log('PaymentIntent créé avec succès:', paymentIntent.id);

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    };

  } catch (error: any) {
    console.error('❌ Erreur création PaymentIntent:', error);
    
    // Gestion spécifique des erreurs Stripe
    if (error.type === 'StripeCardError') {
      throw new HttpsError('invalid-argument', `Erreur de carte: ${error.message}`);
    }
    if (error.type === 'StripeInvalidRequestError') {
      throw new HttpsError('invalid-argument', `Requête invalide: ${error.message}`);
    }
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      `Erreur lors de la création du paiement: ${error.message || 'Erreur inconnue'}`,
      { originalError: error.message, code: error.code, type: error.type }
    );
  }
});

// ====== FONCTIONS APPEL (LEGACY - REMPLACÉES PAR TWILIOCALLMANAGER) ======
interface CreateAndScheduleCallData {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  providerType: string;
  serviceType: string;
  amount: number;
  duration: number;
  paymentIntentId: string;
}

// Fonction pour créer et programmer un appel (utilise le nouveau système)
export const createAndScheduleCallLegacy = onCall(async (request: CallableRequest<CreateAndScheduleCallData>) => {
  const data = request.data;
  
  // Vérifier l'authentification 
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
    );
  }

  const { 
    providerId,
    clientId, 
    providerPhone, 
    clientPhone, 
    providerType, 
    serviceType,
    amount,
    paymentIntentId 
  } = data;

  // Validation des données
  if (!providerId || !clientId || !providerPhone || !clientPhone || !paymentIntentId) {
    throw new HttpsError('invalid-argument', 'Données requises manquantes.');
  }

  // Vérifier que l'utilisateur authentifié correspond au clientId
  if (request.auth.uid !== clientId) {
    throw new HttpsError('permission-denied', 'Vous ne pouvez créer un appel que pour votre propre compte.');
  }

  try {
    console.log('🚀 Création session d\'appel via le nouveau système TwilioCallManager');

    // Utiliser le nouveau système TwilioCallManager
    const { createAndScheduleCall } = await import('./callScheduler');
    
    const callSession = await createAndScheduleCall({
      providerId,
      clientId,
      providerPhone,
      clientPhone,
      serviceType: serviceType as 'lawyer_call' | 'expat_call',
      providerType: providerType as 'lawyer' | 'expat',
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
    
  } catch (error: any) {
    console.error('❌ Erreur création session d\'appel:', error);
    throw new HttpsError(
      'internal',
      'Erreur lors de l\'initiation de l\'appel',
      error
    );
  }
});

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
  } catch (error: any) {
    console.error('Error processing Stripe webhook:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  async (event) => {
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
      
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde automatique:', error);
      
      // Enregistrer l'erreur dans les logs
      await admin.firestore().collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message
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
  async (event) => {
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
      
    } catch (error: any) {
      console.error('❌ Erreur nettoyage périodique:', error);
      
      await admin.firestore().collection('logs').doc('cleanup').collection('entries').add({
        type: 'scheduled_cleanup',
        status: 'failed',
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
);