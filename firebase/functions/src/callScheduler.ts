import { logCallRecord } from './utils/logCallRecord';
import { logError } from './utils/logError';
import * as admin from 'firebase-admin';
import { twilioCallManager, CallSessionState } from './TwilioCallManager';

// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Fonction principale pour programmer une séquence d'appel
 * Utilise maintenant le TwilioCallManager pour une gestion robuste
 */
export const scheduleCallSequence = async (
  callSessionId: string, 
  delayMinutes: number = 5
): Promise<void> => {
  try {
    await logCallRecord({
      callId: callSessionId,
      status: 'sequence_scheduled',
      retryCount: 0,
    });

    console.log(`⏰ Séquence d'appel programmée pour ${callSessionId} dans ${delayMinutes} minutes`);

    // Utiliser le TwilioCallManager pour la gestion robuste des appels
    await twilioCallManager.initiateCallSequence(callSessionId, delayMinutes);

  } catch (error) {
    await logError('scheduleCallSequence:error', error);
    
    // En cas d'erreur, marquer la session comme échouée
    try {
      await twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
      
      await logCallRecord({
        callId: callSessionId,
        status: 'sequence_failed',
        retryCount: 0,
      });
    } catch (updateError) {
      await logError('scheduleCallSequence:updateError', updateError);
    }
  }
};

/**
 * Fonction pour créer une nouvelle session d'appel
 * Remplace l'ancienne logique dispersée
 */
export const createAndScheduleCall = async (params: {
  sessionId?: string;
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number;
  delayMinutes?: number;
}): Promise<CallSessionState> => {
  try {
    const sessionId = params.sessionId || `call_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Créer la session via le TwilioCallManager
    const callSession = await twilioCallManager.createCallSession({
      sessionId,
      providerId: params.providerId,
      clientId: params.clientId,
      providerPhone: params.providerPhone,
      clientPhone: params.clientPhone,
      serviceType: params.serviceType,
      providerType: params.providerType,
      paymentIntentId: params.paymentIntentId,
      amount: params.amount
    });

    // Programmer la séquence d'appel (en arrière-plan)
    setImmediate(() => {
      scheduleCallSequence(sessionId, params.delayMinutes || 5);
    });

    await logCallRecord({
      callId: sessionId,
      status: 'call_session_created',
      retryCount: 0,
    });

    return callSession;

  } catch (error) {
    await logError('createAndScheduleCall:error', error);
    throw error;
  }
};

/**
 * Fonction pour annuler une séquence d'appel programmée
 */
export const cancelScheduledCall = async (callSessionId: string, reason: string): Promise<void> => {
  try {
    const session = await twilioCallManager.getCallSession(callSessionId);
    if (!session) {
      throw new Error(`Session d'appel non trouvée: ${callSessionId}`);
    }

    // Mettre à jour le statut
    await twilioCallManager.updateCallSessionStatus(callSessionId, 'cancelled');

    // Rembourser si nécessaire (sera géré par le PaymentManager)
    if (session.payment.status === 'authorized') {
      await db.collection('call_sessions').doc(callSessionId).update({
        'payment.status': 'refunded',
        'payment.refundedAt': admin.firestore.Timestamp.now(),
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      });
    }

    await logCallRecord({
      callId: callSessionId,
      status: `call_cancelled_${reason}`,
      retryCount: 0,
    });

    console.log(`✅ Appel annulé: ${callSessionId}, raison: ${reason}`);

  } catch (error) {
    await logError('cancelScheduledCall:error', error);
    throw error;
  }
};

/**
 * Fonction pour reprendre les appels en attente au redémarrage
 * Utile pour la récupération après un crash ou redéploiement
 */
export const resumePendingCalls = async (): Promise<void> => {
  try {
    const now = admin.firestore.Timestamp.now();
    const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);

    // Chercher les sessions en attente créées il y a plus de 5 minutes
    const pendingSessions = await db.collection('call_sessions')
      .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
      .where('metadata.createdAt', '<=', fiveMinutesAgo)
      .get();

    console.log(`🔄 Récupération de ${pendingSessions.size} sessions d'appel en attente`);

    const resumePromises = pendingSessions.docs.map(async (doc) => {
      const session = doc.data() as CallSessionState;
      const sessionId = doc.id;

      try {
        // Relancer la séquence d'appel immédiatement
        await twilioCallManager.initiateCallSequence(sessionId, 0);
        
        await logCallRecord({
          callId: sessionId,
          status: 'call_resumed_after_restart',
          retryCount: 0,
        });

      } catch (error) {
        await logError(`resumePendingCalls:session_${sessionId}`, error);
        
        // Marquer comme échoué si impossible de reprendre
        await twilioCallManager.updateCallSessionStatus(sessionId, 'failed');
      }
    });

    await Promise.allSettled(resumePromises);
    console.log(`✅ Récupération des sessions terminée`);

  } catch (error) {
    await logError('resumePendingCalls:error', error);
  }
};

/**
 * Fonction de nettoyage des anciennes sessions
 * À exécuter périodiquement pour nettoyer les données
 */
export const cleanupOldSessions = async (olderThanDays: number = 30): Promise<void> => {
  try {
    const cutoffDate = admin.firestore.Timestamp.fromMillis(
      Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    );

    const oldSessions = await db.collection('call_sessions')
      .where('metadata.createdAt', '<=', cutoffDate)
      .where('status', 'in', ['completed', 'failed', 'cancelled'])
      .limit(100) // Traiter par batch pour éviter les timeouts
      .get();

    if (oldSessions.empty) {
      console.log('Aucune ancienne session à nettoyer');
      return;
    }

    console.log(`🧹 Nettoyage de ${oldSessions.size} anciennes sessions`);

    const batch = db.batch();
    oldSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ ${oldSessions.size} sessions supprimées`);

  } catch (error) {
    await logError('cleanupOldSessions:error', error);
  }
};

/**
 * Fonction pour obtenir des statistiques sur les appels
 */
export const getCallStatistics = async (periodDays: number = 7): Promise<{
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageDuration: number;
  successRate: number;
}> => {
  try {
    const startDate = admin.firestore.Timestamp.fromMillis(
      Date.now() - (periodDays * 24 * 60 * 60 * 1000)
    );

    const sessions = await db.collection('call_sessions')
      .where('metadata.createdAt', '>=', startDate)
      .get();

    const stats = {
      total: sessions.size,
      completed: 0,
      failed: 0,
      cancelled: 0,
      averageDuration: 0,
      successRate: 0
    };

    let totalDuration = 0;
    let completedWithDuration = 0;

    sessions.docs.forEach(doc => {
      const session = doc.data() as CallSessionState;
      
      switch (session.status) {
        case 'completed':
          stats.completed++;
          if (session.conference.duration) {
            totalDuration += session.conference.duration;
            completedWithDuration++;
          }
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    });

    stats.averageDuration = completedWithDuration > 0 ? totalDuration / completedWithDuration : 0;
    stats.successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return stats;

  } catch (error) {
    await logError('getCallStatistics:error', error);
    throw error;
  }
};