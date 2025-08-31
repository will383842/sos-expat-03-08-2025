// firebase/functions/src/services/twilioCallManagerAdapter.ts - VERSION CORRIGÉE SANS RÉFÉRENCES CIRCULAIRES
import { getFirestore } from "firebase-admin/firestore";
import { logError } from "../utils/logs/logError";
import { logCallRecord } from "../utils/logs/logCallRecord";

/**
 * ✅ Fonction principale pour exécuter un appel via Cloud Tasks
 * Cette fonction utilise directement TwilioCallManager sans dépendances circulaires
 */
export async function beginOutboundCallForSession(callSessionId: string) {
  try {
    console.log(`🚀 [Adapter] Démarrage appel pour session: ${callSessionId}`);
    
    const db = getFirestore();

    // ✅ ÉTAPE 1: Vérifier que la session existe (collection standardisée)
    const sessionDoc = await db.collection("call_sessions").doc(callSessionId).get();
    
    if (!sessionDoc.exists) {
      console.error(`❌ [Adapter] Session ${callSessionId} introuvable`);
      throw new Error(`Session ${callSessionId} introuvable dans call_sessions`);
    }

    const sessionData = sessionDoc.data();
    console.log(`✅ [Adapter] Session trouvée, status: ${sessionData?.status}`);

    // ✅ ÉTAPE 2: Vérifier le paiement avant de continuer
    const paymentStatus = sessionData?.payment?.status;
    if (paymentStatus && paymentStatus !== "authorized") {
      console.error(`❌ [Adapter] Paiement non autorisé (status=${paymentStatus})`);
      throw new Error(`Paiement non autorisé pour session ${callSessionId} (status=${paymentStatus})`);
    }

    // ✅ ÉTAPE 3: Utiliser l'API CORRECTE du TwilioCallManager
    console.log(`📞 [Adapter] Importation TwilioCallManager...`);
    const { TwilioCallManager } = await import("../TwilioCallManager");
    
    console.log(`📞 [Adapter] Déclenchement de la séquence d'appel...`);
    const result = await TwilioCallManager.startOutboundCall({
      sessionId: callSessionId,
      delayMinutes: 0  // Immédiat car déjà programmé par Cloud Tasks
    });

    console.log(`✅ [Adapter] Appel initié avec succès:`, {
      sessionId: callSessionId,
      status: result?.status || 'unknown'
    });

    // ✅ ÉTAPE 4: Logger le succès
    await logCallRecord({
      callId: callSessionId,
      status: 'cloud_task_executed_successfully',
      retryCount: 0,
      additionalData: {
        adaptedVia: 'beginOutboundCallForSession',
        resultStatus: result?.status || 'unknown'
      }
    });

    return result;

  } catch (error) {
    console.error(`❌ [Adapter] Erreur lors de l'exécution pour ${callSessionId}:`, error);
    
    // Logger l'erreur
    await logError(`twilioCallManagerAdapter:beginOutboundCallForSession`, error);
    
    await logCallRecord({
      callId: callSessionId,
      status: 'cloud_task_execution_failed',
      retryCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      additionalData: {
        adaptedVia: 'beginOutboundCallForSession',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      }
    });

    throw error;
  }
}

/**
 * ✅ Version de compatibilité avec l'ancienne signature
 * Accepte les paramètres twilio et fromNumber mais ne les utilise pas
 */
export async function beginOutboundCallForSessionLegacy({
  callSessionId,
}: {
  callSessionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  twilio?: any; // Paramètre optionnel pour compatibilité
  fromNumber?: string; // Paramètre optionnel pour compatibilité
}) {
  // Déléguer à la fonction principale
  return beginOutboundCallForSession(callSessionId);
}
