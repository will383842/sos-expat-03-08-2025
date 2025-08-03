import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import twilio from 'twilio';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
import { scheduleCallSequence } from './callScheduler';
import { notifyAfterPayment } from './notifications/notifyAfterPayment';
import { exec } from 'child_process';
import { promisify } from 'util';

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Initialiser Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Initialiser le service d'email (exemple avec Gmail/SMTP)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'notifications@sosexpats.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
});

// Promisifier exec pour l'utiliser avec async/await
const execAsync = promisify(exec);

// Middleware pour vérifier l'authentification
const validateAuth = async (req: functions.https.Request): Promise<string | null> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error: any) {
    console.error('Error verifying auth token:', error);
    return null;
  }
};

// Fonction Cloud pour envoyer des notifications
export const sendNotification = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
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
    }

    // 2. Envoyer le SMS via Twilio
    if (recipientPhone && smsMessage) {
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
    }

    // 3. Envoyer WhatsApp via Twilio
    if (recipientPhone && whatsappMessage) {
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
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de l\'envoi de la notification',
      error
    );
  }
});

// Fonction Cloud pour envoyer des notifications push via FCM
export const sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
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
    throw new functions.https.HttpsError(
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
export const createPaymentIntent = functions.https.onCall(async (data: PaymentIntentData, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
    );
  }

  const { amount, currency, clientId, providerId, serviceType, commissionAmount, providerAmount, metadata } = data;

  try {
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
      }
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    console.error('Error stack:', error.stack || 'No stack trace available');
    console.error('Error details:', {
      message: error.message || 'Unknown error',
      data: { amount, currency, clientId, providerId, serviceType }
    });
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de la création du paiement',
      error
    );
  }
});

// Fonction pour capturer un paiement
export const capturePayment = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
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
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de la capture du paiement',
      error
    );
  }
});

// Fonction pour annuler un paiement
export const cancelPayment = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
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
    throw new functions.https.HttpsError(
      'internal',
      'Erreur lors de l\'annulation du paiement',
      error
    );
  }
});

// Interface pour les données d'appel
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

// Fonction pour initier un appel Twilio
export const initiateCall = functions.https.onCall(async (data: CallData, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
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
      throw new functions.https.HttpsError(
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await callSessionRef.set(callSession);
    
    // Lance le processus d'appel après 5 minutes
    scheduleCallSequence(callSessionId); // ne pas await = en arrière-plan

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
    throw new functions.https.HttpsError(
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
export const updateCallStatus = functions.https.onCall(async (data: UpdateCallStatusData, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'L\'utilisateur doit être authentifié pour effectuer cette action.'
    );
  }

  const { callSessionId, status, details } = data;

  try {
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    const callSession = await callSessionRef.get();
    
    if (!callSession.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Session d\'appel non trouvée'
      );
    }
    
    const callSessionData = callSession.data();
    
    // Vérifier que l'utilisateur est autorisé à mettre à jour cette session
    if (context.auth.uid !== callSessionData?.clientId && 
        context.auth.uid !== callSessionData?.providerId && 
        !(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError(
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
    throw new functions.https.HttpsError(
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
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    res.status(400).send('Signature Stripe manquante');
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

// Webhook Twilio pour gérer les événements d'appel
export const twilioWebhook = functions.https.onRequest(async (req, res) => {
  // Vérifier l'authentification Twilio
  // Dans une implémentation réelle, vous devriez vérifier la signature Twilio
  
  try {
    const { action, callSessionId, phoneNumber, twiml, attempt } = req.body;
    
    // Traiter l'action
    switch (action) {
      case 'call-provider':
        await handleCallProvider(callSessionId, phoneNumber, twiml, attempt);
        break;
      case 'call-client':
        await handleCallClient(callSessionId, phoneNumber, twiml, attempt);
        break;
      case 'call-status':
        await handleCallStatus(callSessionId, req.body.status, req.body.details);
        break;
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Twilio webhook:', error);
    res.status(400).json({ success: false, error: error.message });
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
      await notifyAfterPayment(paymentIntent.metadata.callId);
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

// Fonctions de gestion des événements Twilio
async function handleCallProvider(callSessionId: string, phoneNumber: string, twiml: string, attempt: number) {
  try {
    // Récupérer les données de la session pour obtenir providerType
    const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
    const callSessionData = callSessionDoc.data();
    const providerType = callSessionData?.providerType || 'default';

    // Mettre à jour la session d'appel
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    await callSessionRef.update({
      status: 'calling_provider',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Effectuer l'appel via Twilio
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER || '',
      twiml,
      timeout: providerType === 'lawyer' ? 25 : 35, // Timeout en secondes
      statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    // Enregistrer la tentative
    await callSessionRef.update({
      providerAttempts: admin.firestore.FieldValue.arrayUnion({
        phoneNumber,
        status: 'ringing',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        callSid: call.sid
      })
    });
    
    return {
      success: true,
      callSid: call.sid,
      status: 'ringing'
    };
  } catch (error: any) {
    console.error('Error calling provider:', error);
    
    // Enregistrer l'erreur
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    await callSessionRef.update({
      providerAttempts: admin.firestore.FieldValue.arrayUnion({
        phoneNumber,
        status: 'failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message
      })
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleCallClient(callSessionId: string, phoneNumber: string, twiml: string, attempt: number) {
  try {
    // Récupérer les données de la session pour obtenir providerType
    const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
    const callSessionData = callSessionDoc.data();
    const providerType = callSessionData?.providerType || 'default';

    // Mettre à jour la session d'appel
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    await callSessionRef.update({
      status: 'calling_client',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Effectuer l'appel via Twilio
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER || '',
      twiml,
      timeout: providerType === 'lawyer' ? 25 : 35, // Timeout en secondes
      statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    // Enregistrer la tentative
    await callSessionRef.update({
      clientAttempts: admin.firestore.FieldValue.arrayUnion({
        phoneNumber,
        status: 'ringing',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        callSid: call.sid
      })
    });
    
    return {
      success: true,
      callSid: call.sid,
      status: 'ringing'
    };
  } catch (error: any) {
    console.error('Error calling client:', error);
    
    // Enregistrer l'erreur
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    await callSessionRef.update({
      clientAttempts: admin.firestore.FieldValue.arrayUnion({
        phoneNumber,
        status: 'failed',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message
      })
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleCallStatus(callSessionId: string, status: string, details: Record<string, any>) {
  try {
    const callSessionRef = db.collection('call_sessions').doc(callSessionId);
    const callSession = await callSessionRef.get();
    
    if (!callSession.exists) {
      throw new Error('Call session not found');
    }
    
    const updates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Mettre à jour le statut si nécessaire
    if (status === 'connected') {
      updates.status = 'connected';
      updates.connectedAt = admin.firestore.FieldValue.serverTimestamp();
    } else if (status === 'completed') {
      updates.status = 'completed';
      updates.endedAt = admin.firestore.FieldValue.serverTimestamp();

      const sessionData = callSession.data();
      const connectedAt = sessionData?.connectedAt?.toDate?.();

      if (connectedAt) {
        const endedAt = new Date();
        const durationSeconds = Math.round((endedAt.getTime() - connectedAt.getTime()) / 1000);
        updates.totalDuration = durationSeconds;

        // Si l'appel a duré plus de 0 secondes, capturer le paiement Stripe
        if (durationSeconds > 0 && sessionData?.paymentIntentId) {
          try {
            await stripe.paymentIntents.capture(sessionData.paymentIntentId);
            updates.paid = true;
            
            // Créer une demande d'avis post-appel pour le client
            await admin.firestore().collection('reviews_requests').add({
  clientId: sessionData?.clientId,
  providerId: sessionData?.providerId,
  callSessionId,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  status: 'pending'
});
      
          

// Appliquer les mises à jour
await callSessionRef.update(updates);

// Créer un log pour cette mise à jour
await db.collection('call_logs').add({
  callSessionId,
  type: 'status_change',
  status,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  details
});

return {
  success: true,
  status
};
} catch (error: any) {
  console.error('Error updating call status:', error);
  return {
    success: false,
    error: error.message
  };
}
}
// Import nécessaire en haut du fichier
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Fonction cron pour sauvegarder Firestore et Storage tous les jours à 2h du matin
export const scheduledFirestoreExport = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
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
        const { stdout, stderr } = await execPromise(`gsutil -m cp -r gs://${projectId}.appspot.com/* ${storageExportPath}`);
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
      
      return null;
    } catch (error: any) {
      console.error('Error performing scheduled backup:', error);
      
      // Enregistrer l'erreur dans les logs
      await admin.firestore().collection('logs').doc('backups').collection('entries').add({
        type: 'scheduled_backup',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message
      });
      
      return null;
    }
  });