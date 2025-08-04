import { scheduleCallSequence } from '../callScheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

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

// ✅ Fonction interne (pour usage depuis d'autres Cloud Functions comme les webhooks)
export async function notifyAfterPaymentInternal(callId: string) {
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

  try {
    // ✅ Envoi des messages au prestataire
    await Promise.all([
      notifyProviderWhatsApp(provider.phoneNumber, messagePayload),
      notifyProviderSMS(provider.phoneNumber, messagePayload),
      notifyProviderVoice(provider.phoneNumber, `SOS Expat : un client vous appelle bientôt. Titre : ${callData.title}. Langue : ${messagePayload.language}.`)
    ]);

    // ✅ Envoi des messages au client
    await Promise.all([
      notifyClientWhatsApp(client.phoneNumber, messagePayload),
      notifyClientSMS(client.phoneNumber, messagePayload),
      notifyClientVoice(client.phoneNumber, `SOS Expat : nous avons notifié le prestataire. Vous serez bientôt appelé.`)
    ]);

    console.log(`✅ Notifications envoyées pour callId: ${callId}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi des notifications pour callId ${callId}:`, error);
    throw error;
  }

  // 🔁 Déclenche l'appel vocal entre client et prestataire dans 5 minutes
  await scheduleCallSequence(callData.sessionId || callId);
}

// ✅ Cloud Function (appelable depuis le frontend)
export const notifyAfterPayment = onCall(async (request) => {
  // Vérifier l'authentification
  if (!request.auth) {
    throw new Error('L\'utilisateur doit être authentifié');
  }

  const { callId } = request.data;
  
  if (!callId) {
    throw new Error('callId est requis');
  }

  try {
    await notifyAfterPaymentInternal(callId);
    
    return { 
      success: true, 
      message: 'Notifications envoyées avec succès',
      callId 
    };
  } catch (error) {
    console.error('❌ Erreur dans notifyAfterPayment Cloud Function:', error);
    throw new Error(`Erreur lors de l'envoi des notifications: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
});