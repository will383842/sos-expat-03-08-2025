import { logCallRecord } from './utils/logCallRecord';
import { logError } from './utils/logError';
import * as admin from 'firebase-admin';
import twilio from 'twilio';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialiser Twilio avec vos credentials
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

export const scheduleCallSequence = async (callSessionId: string) => {
  const db = admin.firestore();
  const callRef = db.collection('call_sessions').doc(callSessionId);
  const doc = await callRef.get();
  if (!doc.exists) return;

  const call = doc.data();
  if (!call) return;

  await logCallRecord({
    callId: callSessionId,
    status: 'scheduled',
    retryCount: 0,
  });

  const { providerPhone, clientPhone, paymentIntentId, providerType } = call;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  await delay(5 * 60 * 1000); // ⏳ Attente 5 minutes

  let providerAnswered = false;
  let clientAnswered = false;

  // ✳️ PARTIE A : APPEL DU PRESTATAIRE (3 tentatives)
  for (let i = 0; i < 3; i++) {
    try {
      await twilioClient.calls.create({
        to: providerPhone,
        from: process.env.TWILIO_PHONE_NUMBER!,
        twiml: `<Response><Say voice="alice">Un client souhaite vous parler. Restez en ligne.</Say></Response>`,
        statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
        statusCallbackMethod: 'POST',
        timeout: 20,
      });

      await logCallRecord({
        callId: callSessionId,
        status: `provider_attempt_${i + 1}`,
        retryCount: i + 1,
      });

      await delay(60 * 1000); // 🕐 Attente 1 min

      const updated = (await callRef.get()).data();
      if (updated?.status === 'connected') {
        providerAnswered = true;

        const startTime = admin.firestore.Timestamp.now();
        await logCallRecord({
          callId: callSessionId,
          status: 'provider_connected',
          retryCount: i + 1,
        });

        await callRef.update({
          startTime,
          status: 'provider_connected',
        });

        // ✳️ PARTIE B : APPEL DU CLIENT (3 tentatives) - NOUVEAU CODE
        for (let j = 0; j < 3; j++) {
          try {
            // Calcul du temps limite basé sur le type de prestataire
            const timeLimit = providerType === 'lawyer' ? 1500 : 2100; // 25min ou 35min en secondes
            
            const clientCall = await twilioClient.calls.create({
              to: clientPhone,
              from: process.env.TWILIO_PHONE_NUMBER!,
              twiml: `<Response>
                <Say voice="alice">Votre prestataire SOS Expat est disponible. Restez en ligne pour être mis en relation.</Say>
                <Dial timeout="20" timeLimit="${timeLimit}">${providerPhone}</Dial>
              </Response>`,
              statusCallback: `${process.env.FUNCTION_URL}/twilioClientWebhook`,
              statusCallbackMethod: 'POST',
              timeout: 20,
            });

            await logCallRecord({
              callId: callSessionId,
              status: `client_attempt_${j + 1}`,
              retryCount: j + 1,
            });

            await delay(10 * 1000); // ⚡ Attente 10 secondes avant de vérifier

            const statusSnap = await callRef.get();
            const statusData = statusSnap.data();
            
            if (statusData?.clientStatus === 'connected') {
              clientAnswered = true;
              
              await callRef.update({
                clientConnectedAt: admin.firestore.Timestamp.now(),
                clientStatus: 'connected',
                fullStatus: 'both_connected'
              });

              await logCallRecord({
                callId: callSessionId,
                status: 'client_connected',
                retryCount: j + 1,
              });

              break; // Client connecté, sortir de la boucle
            }
          } catch (error) {
            await logError('callScheduler:tryCallClient', error);
            await logCallRecord({
              callId: callSessionId,
              status: `client_error_attempt_${j + 1}`,
              retryCount: j + 1,
            });
          }
        }

        // Si le client n'a pas répondu après 3 tentatives
        if (!clientAnswered) {
          await callRef.update({
            status: 'client_no_answer',
            refunded: true,
          });

          // Prévenir le prestataire que le client n'a pas répondu
          await twilioClient.calls.create({
            to: providerPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            twiml: `<Response><Say voice="alice">Le client n'a pas répondu. L'appel est annulé. Merci.</Say></Response>`,
          });

          await logCallRecord({
            callId: callSessionId,
            status: 'failed_client_no_answer',
            retryCount: 3,
          });

          // Annuler le paiement
          if (paymentIntentId) {
            try {
              await stripe.paymentIntents.cancel(paymentIntentId);
              console.log(`Payment ${paymentIntentId} cancelled - client no answer`);
            } catch (error) {
              await logError('callScheduler:cancelPayment:clientNoAnswer', error);
            }
          }
          return;
        }

        // ✳️ PARTIE C : Si BOTH sont connectés, générer facture et notifications
        if (providerAnswered && clientAnswered) {
          try {
            const clientSnap = await db.collection('users').doc(call.clientId).get();
            const providerSnap = await db.collection('users').doc(call.providerId).get();
            const client = clientSnap.data();
            const provider = providerSnap.data();

            if (client && provider) {
              const sharedLang =
                client.languages?.find((l: string) => provider.languages?.includes(l)) || 'en';

              // 🧾 GÉNÉRATION DE LA FACTURE (à réactiver si nécessaire)
              /*
              await generateInvoice({
                invoiceNumber: `INV-${Date.now()}`,
                type: 'platform',
                callId: callSessionId,
                clientId: call.clientId,
                providerId: call.providerId,
                amount: call.amount || 1900,
                currency: 'EUR',
                downloadUrl: '',
                createdAt: admin.firestore.Timestamp.now(),
                status: 'issued',
                sentToAdmin: false,
                locale: sharedLang,
              });
              */

              // 🔔 NOTIFICATION MULTILINGUE (à réactiver si nécessaire)
              /*
              await sendNotificationToProvider({
                type: 'payment_received',
                recipientId: call.providerId,
                recipientEmail: provider.email,
                recipientPhone: provider.phone,
                recipientName: provider.firstName,
                recipientCountry: provider.country,
                title: sharedLang === 'fr' ? 'Paiement confirmé' : 'Payment confirmed',
                message:
                  sharedLang === 'fr'
                    ? `Vous avez reçu une demande confirmée de ${client.firstName}`
                    : `You have received a confirmed request from ${client.firstName}`,
                requestDetails: {
                  clientName: client.firstName,
                  clientCountry: client.country,
                  requestTitle: call.title || '',
                  requestDescription: call.description || '',
                  urgencyLevel: 'medium',
                  serviceType: call.serviceType || 'lawyer_call',
                  estimatedPrice: call.amount || 1900,
                  clientPhone: client.phone,
                  languages: [sharedLang],
                },
              });
              */
              
              console.log('Both participants connected successfully', { 
                callSessionId, 
                sharedLang,
                providerAnswered,
                clientAnswered 
              });
            }
          } catch (err) {
            await logError('callScheduler:postBothConnectedError', err);
          }
        }

        break; // Provider connecté, sortir de la boucle des tentatives prestataire
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Tentative prestataire ${i + 1} échouée :`, errorMessage);

      await logError('callScheduler:tryCallProvider', e);
      await logCallRecord({
        callId: callSessionId,
        status: `provider_error_attempt_${i + 1}`,
        retryCount: i + 1,
      });
    }
  }

  // Si le prestataire n'a pas répondu du tout après 3 tentatives
  if (!providerAnswered) {
    await twilioClient.calls.create({
      to: clientPhone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml: `<Response><Say voice="alice">Le prestataire n'a pas répondu. Vous ne serez pas débité. Merci pour votre compréhension.</Say></Response>`,
    });

    await logCallRecord({
      callId: callSessionId,
      status: 'failed_all_provider_attempts',
      retryCount: 3,
    });

    await callRef.update({
      status: 'cancelled_by_provider',
      refunded: true,
    });

    // Annuler le paiement Stripe si disponible
    if (paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
        console.log(`Payment ${paymentIntentId} cancelled successfully - provider no answer`);
      } catch (error) {
        console.error('Error cancelling payment:', error);
        await logError('callScheduler:cancelPayment:providerNoAnswer', error);
      }
    }
  }
};