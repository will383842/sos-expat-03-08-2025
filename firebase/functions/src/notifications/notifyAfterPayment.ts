import { scheduleCallSequence } from '../callScheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { messageManager } from '../MessageManager';

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
  // Envoi des notifications au prestataire
  await messageManager.sendSmartMessage({
    to: provider.phoneNumber,
    templateId: 'provider_notification',
    variables: {
      requestTitle: callData.title || 'Consultation',
      language: messagePayload.language
    }
  });

  // Envoi des notifications au client
  await messageManager.sendSmartMessage({
    to: client.phoneNumber,
    templateId: 'client_notification',
    variables: {
      requestTitle: callData.title || 'Consultation',
      language: messagePayload.language
    }
  });

  console.log(`✅ Notifications envoyées via MessageManager pour callId: ${callId}`);
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