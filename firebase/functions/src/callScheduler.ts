import { logCallRecord } from './utils/logs/logCallRecord';
import { logError } from './utils/logs/logError';
import * as admin from 'firebase-admin';
import { twilioCallManager, CallSessionState } from './TwilioCallManager';

// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuration pour la production
const SCHEDULER_CONFIG = {
  DEFAULT_DELAY_MINUTES: 5,
  MAX_DELAY_MINUTES: 10,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  MAX_PENDING_SESSIONS: 100,
} as const;

// Interface pour les paramètres de création d'appel
interface CreateCallParams {
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
  requestId?: string;
  clientLanguages?: string[];
  providerLanguages?: string[];
}

// Interface pour les statistiques de planification
interface SchedulerStats {
  totalScheduled: number;
  currentlyPending: number;
  completedToday: number;
  failedToday: number;
  averageWaitTime: number;
  queueLength: number;
}

/**
 * Classe pour gérer la planification et la surveillance des appels
 */
class CallSchedulerManager {
  private scheduledCalls = new Map<string, NodeJS.Timeout>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private stats: SchedulerStats = {
    totalScheduled: 0,
    currentlyPending: 0,
    completedToday: 0,
    failedToday: 0,
    averageWaitTime: 0,
    queueLength: 0
  };

  constructor() {
    this.startHealthCheck();
    this.loadInitialStats();
  }

  /**
   * Démarre la surveillance de santé du scheduler
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        await logError('CallScheduler:healthCheck', error);
      }
    }, SCHEDULER_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Effectue une vérification de santé du système
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Vérifier les sessions en attente
      const pendingSessions = await this.getPendingSessions();
      this.stats.currentlyPending = pendingSessions.length;
      this.stats.queueLength = this.scheduledCalls.size;

      // Nettoyer les sessions expirées
      await this.cleanupExpiredSessions();

      // Redémarrer les sessions bloquées
      await this.restartStuckSessions(pendingSessions);

      // Log des métriques pour monitoring
      console.log(`📊 Scheduler Health: ${this.stats.currentlyPending} pending, ${this.stats.queueLength} queued`);

    } catch (error) {
      await logError('CallScheduler:performHealthCheck', error);
    }
  }

  /**
   * Charge les statistiques initiales
   */
  private async loadInitialStats(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

      // Compter les appels d'aujourd'hui
      const todayQuery = await db.collection('call_sessions')
        .where('metadata.createdAt', '>=', todayTimestamp)
        .get();

      this.stats.completedToday = 0;
      this.stats.failedToday = 0;

      todayQuery.docs.forEach(doc => {
        const session = doc.data() as CallSessionState;
        if (session.status === 'completed') {
          this.stats.completedToday++;
        } else if (session.status === 'failed') {
          this.stats.failedToday++;
        }
      });

    } catch (error) {
      await logError('CallScheduler:loadInitialStats', error);
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const expiredThreshold = Date.now() - (30 * 60 * 1000); // 30 minutes

    for (const [sessionId, timeout] of this.scheduledCalls.entries()) {
      try {
        const session = await twilioCallManager.getCallSession(sessionId);
        
        if (!session || 
            session.metadata.createdAt.toMillis() < expiredThreshold) {
          
          clearTimeout(timeout);
          this.scheduledCalls.delete(sessionId);
          
          if (session && session.status === 'pending') {
            await twilioCallManager.cancelCallSession(sessionId, 'expired', 'scheduler');
          }
          
          console.log(`🧹 Session expirée nettoyée: ${sessionId}`);
        }
      } catch (error) {
        console.warn(`Erreur lors du nettoyage de ${sessionId}:`, error);
      }
    }
  }

  /**
   * Redémarre les sessions bloquées
   */
  private async restartStuckSessions(pendingSessions: CallSessionState[]): Promise<void> {
    const stuckThreshold = Date.now() - (15 * 60 * 1000); // 15 minutes

    for (const session of pendingSessions) {
      if (session.metadata.createdAt.toMillis() < stuckThreshold &&
          !this.scheduledCalls.has(session.id)) {
        
        console.log(`🔄 Redémarrage session bloquée: ${session.id}`);
        
        try {
          await this.scheduleCallSequence(session.id, 0); // Immédiat
        } catch (error) {
          await logError(`CallScheduler:restartStuckSession:${session.id}`, error);
        }
      }
    }
  }

  /**
   * Récupère les sessions en attente
   */
  private async getPendingSessions(): Promise<CallSessionState[]> {
    try {
      const snapshot = await db.collection('call_sessions')
        .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
        .orderBy('metadata.createdAt', 'desc')
        .limit(SCHEDULER_CONFIG.MAX_PENDING_SESSIONS)
        .get();

      return snapshot.docs.map(doc => doc.data() as CallSessionState);
    } catch (error) {
      await logError('CallScheduler:getPendingSessions', error);
      return [];
    }
  }

  /**
   * Programme une séquence d'appel
   */
  async scheduleCallSequence(
    callSessionId: string, 
    delayMinutes: number = SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES
  ): Promise<void> {
    try {
      // Valider les paramètres
      if (!callSessionId) {
        throw new Error('callSessionId est requis');
      }

      const sanitizedDelay = Math.min(Math.max(delayMinutes, 0), SCHEDULER_CONFIG.MAX_DELAY_MINUTES);

      // Vérifier que la session existe et est valide
      const session = await twilioCallManager.getCallSession(callSessionId);
      if (!session) {
        throw new Error(`Session d'appel non trouvée: ${callSessionId}`);
      }

      if (session.status !== 'pending') {
        console.log(`Session ${callSessionId} déjà ${session.status}, pas de planification nécessaire`);
        return;
      }

      // Annuler toute planification existante
      const existingTimeout = this.scheduledCalls.get(callSessionId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.scheduledCalls.delete(callSessionId);
      }

      await logCallRecord({
        callId: callSessionId,
        status: 'sequence_scheduled',
        retryCount: 0,
        additionalData: {
          delayMinutes: sanitizedDelay,
          scheduledAt: new Date().toISOString()
        }
      });

      console.log(`⏰ Séquence d'appel programmée pour ${callSessionId} dans ${sanitizedDelay} minutes`);

      // Programmer l'exécution
      const timeout = setTimeout(async () => {
        this.scheduledCalls.delete(callSessionId);
        await this.executeScheduledCall(callSessionId);
      }, sanitizedDelay * 60 * 1000);

      this.scheduledCalls.set(callSessionId, timeout);
      this.stats.totalScheduled++;

    } catch (error) {
      await logError('CallScheduler:scheduleCallSequence', error);
      
      // En cas d'erreur, marquer la session comme échouée
      try {
        await twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
        
        await logCallRecord({
          callId: callSessionId,
          status: 'sequence_failed',
          retryCount: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (updateError) {
        await logError('CallScheduler:scheduleCallSequence:updateError', updateError);
      }
    }
  }

  /**
   * Exécute un appel programmé avec gestion de retry
   */
  private async executeScheduledCall(callSessionId: string): Promise<void> {
    let retryCount = 0;
    
    while (retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS) {
      try {
        console.log(`🚀 Exécution appel programmé: ${callSessionId} (tentative ${retryCount + 1}/${SCHEDULER_CONFIG.RETRY_ATTEMPTS})`);
        
        // Vérifier que la session est toujours valide
        const session = await twilioCallManager.getCallSession(callSessionId);
        if (!session) {
          console.warn(`Session non trouvée lors de l'exécution: ${callSessionId}`);
          return;
        }

        if (session.status !== 'pending') {
          console.log(`Session ${callSessionId} status changed to ${session.status}, arrêt de l'exécution`);
          return;
        }

        // Utiliser le TwilioCallManager pour la gestion robuste des appels
        await twilioCallManager.initiateCallSequence(callSessionId, 0);
        
        console.log(`✅ Appel initié avec succès: ${callSessionId}`);
        return;

      } catch (error) {
        retryCount++;
        
        await logError(`CallScheduler:executeScheduledCall:attempt_${retryCount}`, error);
        
        if (retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS) {
          console.log(`⏳ Retry ${retryCount}/${SCHEDULER_CONFIG.RETRY_ATTEMPTS} pour ${callSessionId} dans ${SCHEDULER_CONFIG.RETRY_DELAY_MS}ms`);
          await this.delay(SCHEDULER_CONFIG.RETRY_DELAY_MS * retryCount); // Délai progressif
        }
      }
    }

    // Toutes les tentatives ont échoué
    console.error(`❌ Échec de toutes les tentatives pour ${callSessionId}`);
    
    try {
      await twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
      this.stats.failedToday++;
      
      await logCallRecord({
        callId: callSessionId,
        status: 'sequence_failed_all_retries',
        retryCount: SCHEDULER_CONFIG.RETRY_ATTEMPTS
      });
    } catch (updateError) {
      await logError('CallScheduler:executeScheduledCall:finalUpdate', updateError);
    }
  }

  /**
   * Annule un appel programmé
   */
  async cancelScheduledCall(callSessionId: string, reason: string): Promise<void> {
    try {
      // Annuler le timeout
      const timeout = this.scheduledCalls.get(callSessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.scheduledCalls.delete(callSessionId);
        console.log(`🚫 Planification annulée pour: ${callSessionId}`);
      }

      // Utiliser TwilioCallManager pour annuler la session
      await twilioCallManager.cancelCallSession(callSessionId, reason, 'scheduler');

      await logCallRecord({
        callId: callSessionId,
        status: `call_cancelled_${reason}`,
        retryCount: 0,
      });

      console.log(`✅ Appel annulé: ${callSessionId}, raison: ${reason}`);

    } catch (error) {
      await logError('CallScheduler:cancelScheduledCall', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques du scheduler
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Ferme proprement le scheduler
   */
  shutdown(): void {
    console.log('🔄 Arrêt du CallScheduler...');
    
    // Arrêter le health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Annuler tous les appels programmés
    for (const [sessionId, timeout] of this.scheduledCalls.entries()) {
      clearTimeout(timeout);
      console.log(`🚫 Appel programmé annulé lors de l'arrêt: ${sessionId}`);
    }
    
    this.scheduledCalls.clear();
    console.log('✅ CallScheduler arrêté proprement');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance singleton du scheduler
const callSchedulerManager = new CallSchedulerManager();

/**
 * Fonction principale pour programmer une séquence d'appel
 */
export const scheduleCallSequence = async (
  callSessionId: string, 
  delayMinutes: number = SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES
): Promise<void> => {
  return callSchedulerManager.scheduleCallSequence(callSessionId, delayMinutes);
};

/**
 * Fonction pour créer et programmer un nouvel appel
 */
export const createAndScheduleCall = async (params: CreateCallParams): Promise<CallSessionState> => {
  try {
    // Générer un ID unique si non fourni
    const sessionId = params.sessionId || `call_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🆕 Création et planification d'un nouvel appel: ${sessionId}`);

    // Valider les paramètres obligatoires
    if (!params.providerId || !params.clientId || !params.providerPhone || 
        !params.clientPhone || !params.paymentIntentId || !params.amount) {
      throw new Error('Paramètres obligatoires manquants pour créer l\'appel');
    }

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
      amount: params.amount,
      requestId: params.requestId,
      clientLanguages: params.clientLanguages,
      providerLanguages: params.providerLanguages
    });

    // Programmer la séquence d'appel
    const delayMinutes = params.delayMinutes || SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES;
    
    // Utiliser setImmediate pour éviter de bloquer la réponse
    setImmediate(async () => {
      try {
        await scheduleCallSequence(sessionId, delayMinutes);
      } catch (error) {
        await logError('createAndScheduleCall:scheduleError', error);
      }
    });

    await logCallRecord({
      callId: sessionId,
      status: 'call_session_created',
      retryCount: 0,
      additionalData: {
        serviceType: params.serviceType,
        amount: params.amount,
        delayMinutes: delayMinutes
      }
    });

    console.log(`✅ Appel créé et programmé: ${sessionId} dans ${delayMinutes} minutes`);
    return callSession;

  } catch (error) {
    await logError('createAndScheduleCall:error', error);
    throw error;
  }
};

/**
 * Fonction pour annuler un appel programmé
 */
export const cancelScheduledCall = async (callSessionId: string, reason: string): Promise<void> => {
  return callSchedulerManager.cancelScheduledCall(callSessionId, reason);
};

/**
 * Fonction pour reprendre les appels en attente au redémarrage
 */
export const resumePendingCalls = async (): Promise<void> => {
  try {
    console.log('🔄 Récupération des appels en attente...');
    
    const now = admin.firestore.Timestamp.now();
    const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);

    // Chercher les sessions en attente créées il y a plus de 5 minutes
    const pendingSessions = await db.collection('call_sessions')
      .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
      .where('metadata.createdAt', '<=', fiveMinutesAgo)
      .limit(50) // Limiter pour éviter la surcharge
      .get();

    if (pendingSessions.empty) {
      console.log('✅ Aucune session en attente à récupérer');
      return;
    }

    console.log(`🔄 Récupération de ${pendingSessions.size} sessions d'appel en attente`);

    const resumePromises = pendingSessions.docs.map(async (doc) => {
      const sessionId = doc.id;
      const sessionData = doc.data() as CallSessionState;

      try {
        // Vérifier si le paiement est toujours valide
        const paymentValid = await validatePaymentForResume(sessionData.payment.intentId);
        
        if (!paymentValid) {
          await twilioCallManager.cancelCallSession(sessionId, 'payment_invalid', 'resume_service');
          return;
        }

        // Relancer la séquence d'appel immédiatement
        await twilioCallManager.initiateCallSequence(sessionId, 0);
        
        await logCallRecord({
          callId: sessionId,
          status: 'call_resumed_after_restart',
          retryCount: 0,
        });

        console.log(`✅ Session reprise: ${sessionId}`);

      } catch (error) {
        await logError(`resumePendingCalls:session_${sessionId}`, error);
        
        // Marquer comme échoué si impossible de reprendre
        try {
          await twilioCallManager.updateCallSessionStatus(sessionId, 'failed');
        } catch (updateError) {
          await logError(`resumePendingCalls:updateStatus_${sessionId}`, updateError);
        }
      }
    });

    await Promise.allSettled(resumePromises);
    console.log(`✅ Récupération des sessions terminée`);

  } catch (error) {
    await logError('resumePendingCalls:error', error);
  }
};

/**
 * Valide qu'un paiement est toujours valide pour reprise
 */
async function validatePaymentForResume(paymentIntentId: string): Promise<boolean> {
  try {
    // Vérifier dans Firestore d'abord
    const paymentQuery = await db.collection('payments')
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      return false;
    }

    const paymentData = paymentQuery.docs[0].data();
    const validStatuses = ['pending', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture'];
    
    return validStatuses.includes(paymentData.status);

  } catch (error) {
    await logError('validatePaymentForResume', error);
    return false;
  }
}

/**
 * Fonction de nettoyage des anciennes sessions
 */
export const cleanupOldSessions = async (olderThanDays: number = 30): Promise<void> => {
  try {
    console.log(`🧹 Nettoyage des sessions de plus de ${olderThanDays} jours...`);
    
    const result = await twilioCallManager.cleanupOldSessions({
      olderThanDays,
      keepCompletedDays: 7, // Garder les complétées 7 jours
      batchSize: 50
    });

    console.log(`✅ Nettoyage terminé: ${result.deleted} supprimées, ${result.errors} erreurs`);

  } catch (error) {
    await logError('cleanupOldSessions:error', error);
  }
};

/**
 * Fonction pour obtenir des statistiques sur les appels
 */
export const getCallStatistics = async (periodDays: number = 7): Promise<{
  scheduler: SchedulerStats;
  calls: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageDuration: number;
    successRate: number;
  };
}> => {
  try {
    const startDate = admin.firestore.Timestamp.fromMillis(
      Date.now() - (periodDays * 24 * 60 * 60 * 1000)
    );

    const [schedulerStats, callStats] = await Promise.all([
      callSchedulerManager.getStats(),
      twilioCallManager.getCallStatistics({ startDate })
    ]);

    return {
      scheduler: schedulerStats,
      calls: {
        total: callStats.total,
        completed: callStats.completed,
        failed: callStats.failed,
        cancelled: callStats.cancelled,
        averageDuration: callStats.averageDuration,
        successRate: callStats.successRate
      }
    };

  } catch (error) {
    await logError('getCallStatistics:error', error);
    throw error;
  }
};

/**
 * Gestionnaire pour l'arrêt propre du service
 */
export const gracefulShutdown = (): void => {
  console.log('🔄 Arrêt gracieux du CallScheduler...');
  callSchedulerManager.shutdown();
};

// Gestionnaire de signaux pour arrêt propre
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Export du manager pour les tests
export { callSchedulerManager };