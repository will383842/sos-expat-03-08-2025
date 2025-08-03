import { logCallRecord } from './utils/logCallRecord';
import { logError } from './utils/logError';
import * as admin from 'firebase-admin';
import { twilioClient } from './lib/twilio';
import { generateInvoice } from './invoices/generateInvoice';
import { sendNotificationToProvider } from './notifications/sendNotificationToProvider';
import { cancelPayment } from "./payments";

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

  const { providerPhone, clientPhone } = call;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  await delay(5 * 60 * 1000); // ⏳ Attente 5 minutes

  let providerAnswered = false;

  for (let i = 0; i < 3; i++) {
    try {
      await twilioClient.calls.create({
        to: providerPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        twiml: `<Response><Say voice="alice">Un client souhaite vous parler. Restez en ligne.</Say></Response>`,
        statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
        statusCallbackMethod: 'POST',
        timeout: 20,
      });

      await logCallRecord({
        callId: callSessionId,
        status: `attempt_${i + 1}`,
        retryCount: i + 1,
      });

      await delay(60 * 1000); // 🕐 Attente 1 min

      const updated = (await callRef.get()).data();
      if (updated?.status === 'connected') {
        providerAnswered = true;

        const startTime = admin.firestore.Timestamp.now();
        await logCallRecord({
          callId: callSessionId,
          status: 'connected',
          retryCount: i + 1,
        });

        await callRef.update({
          startTime,
          status: 'connected',
        });

        const endTime = admin.firestore.Timestamp.now();
        const duration = 30; // à ajuster dynamiquement si besoin

        
        try {
          const clientSnap = await db.collection('users').doc(call.clientId).get();
          const providerSnap = await db.collection('users').doc(call.providerId).get();
          const client = clientSnap.data();
          const provider = providerSnap.data();

          if (!client || !provider) break;

          const sharedLang =
            client.languages?.find((l: string) => provider.languages?.includes(l)) || 'en';

          // 🧾 GÉNÉRATION DE LA FACTURE
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

          // 🔔 NOTIFICATION MULTILINGUE
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
        } catch (err) {
          await logError('callScheduler:postConnectedError', err);
        }

        break;
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Tentative ${i + 1} échouée :`, errorMessage);

      await logError('callScheduler:tryCallProvider', e);
      await logCallRecord({
        callId: callSessionId,
        status: `error_attempt_${i + 1}`,
        retryCount: i + 1,
      });
    }
  }

  if (!providerAnswered) {
    await twilioClient.calls.create({
      to: clientPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `<Response><Say voice="alice">Le prestataire n'a pas répondu. Vous ne serez pas débité. Merci pour votre compréhension.</Say></Response>`,
    });

    await logCallRecord({
      callId: callSessionId,
      status: 'failed_all_attempts',
      retryCount: 3,
    });

    await callRef.update({
      status: 'cancelled_by_provider',
      refunded: true,
    });
    await cancelPayment(paymentIntentId);
  }
};
