import { onCall, onRequest, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import twilio from 'twilio';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
import { scheduleCallSequence } from './callScheduler';
// import { notifyAfterPayment } from './notifications/notifyAfterPayment'; // Temporairement commenté
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Request as ExpressRequest, Response } from 'express';

// Interface pour les requêtes avec rawBody (Firebase Functions)
interface FirebaseRequest extends ExpressRequest {
  rawBody: Buffer;
}

// Charger les variables d'environnement depuis .env
import * as dotenv from 'dotenv';
dotenv.config();

// Initialiser Firebase Admin
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
  console.warn('⚠️ Twilio non configuré - Variables d\'environnement manquantes:', {
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN
  });
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
  console.warn('⚠️ Stripe non configuré - STRIPE_SECRET_KEY manquante ou invalide:', {
    exists: !!process.env.STRIPE_SECRET_KEY,
    format: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 3) + '...' : 'N/A'
  });
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
  console.warn('⚠️ Email non configuré - Variables d\'environnement manquantes:', {
    EMAIL_USER: !!process.env.EMAIL_USER,
    EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD
  });
}

// Export du client Twilio pour TwilioCallManager
export { twilioClient };

// Promisifier exec pour l'utiliser avec async/await
const execAsync = promisify(exec);

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

// Import des webhooks Twilio existants (pas de re-définition)
export { twilioWebhook, twilioClientWebhook } from './Webhooks/twilioWebhooks';

// Fonction Cloud pour envoyer des notifications
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
  });

// Interface pour les données de push notification
interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Fonction Cloud pour envoyer des notifications push via FCM
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

// Interface pour PaymentIntent
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

// Fonction pour créer un PaymentIntent Stripe
export const createPaymentIntent = onCall(async (request: CallableRequest<PaymentIntentData>) => {
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
    console.error('Stack trace:', error.stack || 'No stack trace available');
    console.error('Données reçues:', { amount, currency, clientId, providerId, serviceType });

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

// Interface pour capturer un paiement
interface CapturePaymentData {
  paymentIntentId: string;
}

// Fonction pour capturer un paiement
export const capturePayment = onCall(async (request: CallableRequest<CapturePaymentData>) => {
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
      'Service de paiement non disponible.'
    );
  }

  const { paymentIntentId } = data;

  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    // Mettre à jour le statut dans Firestore
    const snapshot = await db.collection('payments').where('stripePaymentIntentId', '==', paymentIntentId).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        status: 'captured',
        capturedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return {
      success: true,
      status: paymentIntent.status
    };
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    throw new HttpsError(
      'internal',
      'Erreur lors de la capture du paiement',
      error
    );
  }
});

// Interface pour annuler un paiement
interface CancelPaymentData {
  paymentIntentId: string;
}

// Fonction pour annuler un paiement
export const cancelPayment = onCall(async (request: CallableRequest<CancelPaymentData>) => {
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
      'Service de paiement non disponible.'
    );
  }

  const { paymentIntentId } = data;

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    
    // Mettre à jour le statut dans Firestore
    const snapshot = await db.collection('payments').where('stripePaymentIntentId', '==', paymentIntentId).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        status: 'canceled',
        canceledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return {
      success: true,
      status: paymentIntent.status
    };
  } catch (error: any) {
    console.error('Error canceling payment:', error);
    throw new HttpsError(
      'internal',
      'Erreur lors de l\'annulation du paiement',
      error
    );
  }
});

// Interface pour les données d'appel (fonction initiateCall originale)
interface CallData {
  clientId: string;
  providerId: string;
  clientPhone: string;
  providerPhone: string;
  providerType: string;
  clientLanguage?: string;
  providerLanguage?: string;
  paymentIntentId: string;
}

// Interface pour createAndScheduleCall (nouvelle fonction pour CallCheckout)
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

// Nouvelle fonction pour créer et programmer un appel (pour CallCheckout)
export const createAndScheduleCall = onCall(async (request: CallableRequest<CreateAndScheduleCallData>) => {
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
    duration,
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
    // Générer un ID unique pour la session d'appel
    const sessionId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Créer une session d'appel dans Firestore
    const callSessionRef = db.collection('call_sessions').doc(sessionId);
    
    const callSession = {
      id: sessionId,
      clientId,
      providerId,
      clientPhone,
      providerPhone,
      status: 'pending',
      providerAttempts: [],
      clientAttempts: [],
      paymentIntentId,
      providerType,
      serviceType,
      amount,
      duration,
      
      // Nouveaux champs pour le tracking détaillé
      providerCallStatus: null,
      clientCallStatus: null,
      clientStatus: null,
      fullStatus: null,
      providerConnectedAt: null,
      clientConnectedAt: null,
      conversationStartedAt: null,
      conversationEndedAt: null,
      totalConversationDuration: null,
      paymentCaptured: false,
      paid: false,
      
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await callSessionRef.set(callSession);
    
    // Lance le processus d'appel après 5 minutes (ne pas await = en arrière-plan)
    scheduleCallSequence(sessionId);

    // Créer un log pour la session
    await db.collection('call_logs').add({
      callSessionId: sessionId,
      type: 'session_created',
      status: 'pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        clientId,
        providerId,
        providerType,
        serviceType,
        amount,
        duration
      }
    });

    console.log('✅ Session d\'appel créée:', sessionId);

    return {
      success: true,
      callSessionId: sessionId,
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

// Fonction pour initier un appel Twilio (fonction originale conservée)
export const initiateCall = onCall(async (request: CallableRequest<CallData>) => {
  const data = request.data;
  
  // Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
    );
  }

  const { 
    clientId, 
    providerId, 
    clientPhone, 
    providerPhone, 
    providerType, 
    clientLanguage, 
    providerLanguage, 
    paymentIntentId 
  } = data;

  try {
    // Vérifier que les numéros de téléphone sont valides
    if (!clientPhone || !providerPhone) {
      throw new HttpsError(
        'invalid-argument',
        'Les numéros de téléphone sont requis'
      );
    }

    // Créer une session d'appel dans Firestore
    const callSessionRef = db.collection('call_sessions').doc();
    const callSessionId = callSessionRef.id;
    
    const callSession = {
      id: callSessionId,
      clientId,
      providerId,
      clientPhone,
      providerPhone,
      status: 'initiating',
      providerAttempts: [],
      clientAttempts: [],
      paymentIntentId,
      providerType,
      clientLanguage: clientLanguage || 'fr-FR',
      providerLanguage: providerLanguage || 'fr-FR',
      
      // Nouveaux champs pour le tracking détaillé
      providerCallStatus: null,
      clientCallStatus: null,
      clientStatus: null,
      fullStatus: null,
      providerConnectedAt: null,
      clientConnectedAt: null,
      conversationStartedAt: null,
      conversationEndedAt: null,
      totalConversationDuration: null,
      paymentCaptured: false,
      paid: false,
      
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await callSessionRef.set(callSession);
    
    // Lance le processus d'appel après 5 minutes (ne pas await = en arrière-plan)
    scheduleCallSequence(callSessionId);

    // Créer un log pour la session
    await db.collection('call_logs').add({
      callSessionId,
      type: 'session_created',
      status: 'initiating',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        clientId,
        providerId,
        providerType
      }
    });

    return {
      success: true,
      callSessionId,
      status: 'initiating'
    };
  } catch (error: any) {
    console.error('Error initiating call:', error);
    throw new HttpsError(
      'internal',
      'Erreur lors de l\'initiation de l\'appel',
      error
    );
  }
});

// Interface pour la mise à jour du statut
interface UpdateCallStatusData {
  callSessionId: string;
  status: string;
  details?: Record<string, any>;
}

// Fonction pour mettre à jour le statut d'un appel
export const updateCallStatus = onCall(async (request: CallableRequest<UpdateCallStatusData>) => {
  const data = request.data;
  
  // Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
    );
  }

  const { callSessionId, status, details } = data;

  try {
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    const callSession = await callSessionRef.get();
    
    if (!callSession.exists) {
      throw new HttpsError(
        'not-found',
        'Session d\'appel non trouvée'
      );
    }
    
    const callSessionData = callSession.data();
    
    // Vérifier que l'utilisateur est autorisé à mettre à jour cette session
    if (request.auth.uid !== callSessionData?.clientId && 
        request.auth.uid !== callSessionData?.providerId && 
        !(await isAdmin(request.auth.uid))) {
      throw new HttpsError(
        'permission-denied',
        'Vous n\'êtes pas autorisé à mettre à jour cette session d\'appel'
      );
    }
    
    // Mettre à jour le statut
    await callSessionRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...details
    });
    
    // Créer un log pour cette mise à jour
    await db.collection('call_logs').add({
      callSessionId,
      type: 'status_change',
      previousStatus: callSessionData?.status || 'unknown',
      newStatus: status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details
    });
    
    return {
      success: true,
      status
    };
  } catch (error: any) {
    console.error('Error updating call status:', error);
    throw new HttpsError(
      'internal',
      'Erreur lors de la mise à jour du statut de l\'appel',
      error
    );
  }
});

// Fonction utilitaire pour vérifier si un utilisateur est admin
async function isAdmin(uid: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.role === 'admin';
  } catch (error: any) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Webhook Stripe pour gérer les événements de paiement
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
    
    // Traiter l'événement
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
    }
    
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Stripe webhook:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // ✅ Mise à jour du paiement
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

    // ✅ Mise à jour de l'appel + déclenchement des notifications
    if (paymentIntent.metadata.callId) {
      const callRef = db.collection('calls').doc(paymentIntent.metadata.callId);
      await callRef.update({
        status: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 🔔 Envoi des messages client et prestataire
      // Note: notifyAfterPayment est une fonction importée, pas une Cloud Function
      // Si c'est une Cloud Function, utilisez httpsCallable depuis le frontend
      console.log('Call completed, notifications should be sent from frontend');
    }

    return true;
  } catch (error: any) {
    console.error('❌ Erreur handlePaymentIntentSucceeded :', error);
    return false;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
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
    
    // Mettre à jour l'appel associé
    if (paymentIntent.metadata.callId) {
      const callRef = db.collection('calls').doc(paymentIntent.metadata.callId);
      await callRef.update({
        status: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return true;
  } catch (error: any) {
    console.error('Error handling payment intent failed:', error);
    return false;
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
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
    
    // Mettre à jour l'appel associé
    if (paymentIntent.metadata.callId) {
      const callRef = db.collection('calls').doc(paymentIntent.metadata.callId);
      await callRef.update({
        status: 'canceled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return true;
  } catch (error: any) {
    console.error('Error handling payment intent canceled:', error);
    return false;
  }
}

// Fonction cron pour sauvegarder Firestore et Storage tous les jours à 2h du matin
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
      
      console.log(`Firestore export operation started: ${firestoreOperation.name}`);
      
      // Exporter Storage
      const storageExportName = `storage-export-${timestamp}`;
      const storageExportPath = `gs://${bucketName}/${storageExportName}`;
      
      // Utiliser gsutil pour copier les fichiers Storage
      try {
        const { stderr } = await execAsync(`gsutil -m cp -r gs://${projectId}.appspot.com/* ${storageExportPath}`);
        console.log(`Storage export completed to ${storageExportPath}`);
        if (stderr) {
          console.warn(`Storage export warnings: ${stderr}`);
        }
      } catch (error: any) {
        console.error(`Storage export error: ${error.message}`);
      }
      
      // Enregistrer les logs de sauvegarde
      await admin.firestore().collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        firestoreExportPath,
        storageExportPath,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });
      
    } catch (error: any) {
      console.error('Error performing scheduled backup:', error);
      
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

// Export de la fonction d'initialisation des templates
export { initializeMessageTemplates } from './initializeMessageTemplates';

// Export de la fonction notifyAfterPayment (temporairement commenté)
// export { notifyAfterPayment } from './notifications/notifyAfterPayment';