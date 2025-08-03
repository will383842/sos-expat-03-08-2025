import { scheduleCallSequence } from '../callScheduler';
import { getFirestore } from 'firebase-admin/firestore';

// WhatsApp
import { notifyProviderWhatsApp } from '../messages/whatsapp/notifyProviderWhatsApp';
import { notifyClientWhatsApp } from '../messages/whatsapp/notifyClientWhatsApp';

// SMS
import { notifyProviderSMS } from '../messages/sms/notifyProviderSMS';
import { notifyClientSMS } from '../messages/sms/notifyClientSMS';

// VOICE
import { notifyProviderVoice } from '../messages/voice/notifyProviderVoice';
import { notifyClientVoice } from '../messages/voice/notifyClientVoice';

const db = getFirestore();

export async function notifyAfterPayment(callId: string) {
  const callDoc = await db.collection('calls').doc(callId).get();
  const callData = callDoc.data();
  if (!callData) return;

  const providerDoc = await db.collection('users').doc(callData.providerId).get();
  const clientDoc = await db.collection('users').doc(callData.clientId).get();

  const provider = providerDoc.data();
  const client = clientDoc.data();
  if (!provider || !client) return;

  const messagePayload = {
    title: callData.title,
    language: Array.isArray(callData.clientLanguages) ? callData.clientLanguages[0] : 'fr',
  };

  // ✅ Envoi des messages au prestataire
  await notifyProviderWhatsApp(provider.phoneNumber, messagePayload);
  await notifyProviderSMS(provider.phoneNumber, messagePayload);
  await notifyProviderVoice(provider.phoneNumber, `SOS Expat : un client vous appelle bientôt. Titre : ${callData.title}. Langue : ${callData.language}.`);

  // ✅ Envoi des messages au client
  await notifyClientWhatsApp(client.phoneNumber, messagePayload);
  await notifyClientSMS(client.phoneNumber, messagePayload);
  await notifyClientVoice(client.phoneNumber, `SOS Expat : nous avons notifié le prestataire. Vous serez bientôt appelé.`);

  // 🔁 Déclenche l’appel vocal entre client et prestataire dans 5 minutes
  await scheduleCallSequence(callData.sessionId || callId);
}
