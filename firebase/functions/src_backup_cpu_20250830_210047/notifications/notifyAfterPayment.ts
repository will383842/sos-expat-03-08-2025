// ✅ Import corrigé - utilisation de la nouvelle planification par tâches
import { scheduleCallTask } from '../lib/tasks';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { messageManager } from '../MessageManager';

// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
const CPU_OPTIMIZED_CONFIG = {
  region: 'europe-west1' as const,
  memory: '256MiB' as const,
  cpu: 0.25 as const,
  timeoutSeconds: 30,
  maxInstances: 3,
  minInstances: 0,
  concurrency: 1};

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
    language: Array.isArray(callData.clientLanguages) ? callData.clientLanguages[0] : 'fr'};

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

  // 🔁 Planifie l'appel vocal entre client et prestataire dans 5 minutes (300 secondes)
  const callSessionId = callData.sessionId || callId;
  await scheduleCallTask(callSessionId, 5 * 60); // 5 minutes en secondes
}

// ✅ Cloud Function (appelable depuis le frontend) - OPTIMISÉE CPU
export const notifyAfterPayment = onCall(
  CPU_OPTIMIZED_CONFIG, // 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
  async (request) => {
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
  }
);
