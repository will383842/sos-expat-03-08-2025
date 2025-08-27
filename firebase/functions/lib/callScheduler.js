"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = exports.getCallStatistics = exports.cleanupOldSessions = exports.resumePendingCalls = exports.cancelScheduledCall = exports.createAndScheduleCall = exports.scheduleCallSequence = void 0;
exports.callSchedulerManager = getCallSchedulerManager;
// Configuration pour la production
const SCHEDULER_CONFIG = {
    DEFAULT_DELAY_MINUTES: 5,
    MAX_DELAY_MINUTES: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 5000,
    HEALTH_CHECK_INTERVAL: 60000, // 1 minute
    MAX_PENDING_SESSIONS: 100,
};
/**
 * 🔧 FIX: Classe pour gérer la planification et la surveillance des appels avec initialisation lazy
 */
class CallSchedulerManager {
    constructor() {
        this.scheduledCalls = new Map();
        this.healthCheckInterval = null;
        this.stats = {
            totalScheduled: 0,
            currentlyPending: 0,
            completedToday: 0,
            failedToday: 0,
            averageWaitTime: 0,
            queueLength: 0,
        };
        this.isInitialized = false;
        // 🔧 FIX: Ne pas initialiser immédiatement - attendre le premier appel
    }
    async initialize() {
        if (!this.isInitialized) {
            try {
                this.startHealthCheck();
                await this.loadInitialStats();
                this.isInitialized = true;
                console.log('✅ CallSchedulerManager initialisé');
            }
            catch (error) {
                console.error('❌ Erreur initialisation CallSchedulerManager:', error);
                throw error;
            }
        }
    }
    /**
     * Démarre la surveillance de santé du scheduler
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            }
            catch (error) {
                await (0, logError_1.logError)('CallScheduler:healthCheck', error);
            }
        }, SCHEDULER_CONFIG.HEALTH_CHECK_INTERVAL);
    }
    /**
     * Effectue une vérification de santé du système
     */
    async performHealthCheck() {
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
        }
        catch (error) {
            await (0, logError_1.logError)('CallScheduler:performHealthCheck', error);
        }
    }
    /**
     * Charge les statistiques initiales
     */
    async loadInitialStats() {
        try {
            const database = getDB();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
            // Compter les appels d'aujourd'hui
            const todayQuery = await database
                .collection('call_sessions')
                .where('metadata.createdAt', '>=', todayTimestamp)
                .get();
            this.stats.completedToday = 0;
            this.stats.failedToday = 0;
            todayQuery.docs.forEach((doc) => {
                const session = doc.data();
                if (session.status === 'completed') {
                    this.stats.completedToday++;
                }
                else if (session.status === 'failed') {
                    this.stats.failedToday++;
                }
            });
        }
        catch (error) {
            await (0, logError_1.logError)('CallScheduler:loadInitialStats', error);
        }
    }
    /**
     * Nettoie les sessions expirées
     */
    async cleanupExpiredSessions() {
        const expiredThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes
        for (const [sessionId, timeout] of this.scheduledCalls.entries()) {
            try {
                const twilioCallManager = await getTwilioCallManager();
                const session = await twilioCallManager.getCallSession(sessionId);
                if (!session || session.metadata.createdAt.toMillis() < expiredThreshold) {
                    clearTimeout(timeout);
                    this.scheduledCalls.delete(sessionId);
                    if (session && session.status === 'pending') {
                        await twilioCallManager.cancelCallSession(sessionId, 'expired', 'scheduler');
                    }
                    console.log(`🧹 Session expirée nettoyée: ${sessionId}`);
                }
            }
            catch (error) {
                console.warn(`Erreur lors du nettoyage de ${sessionId}:`, error);
            }
        }
    }
    /**
     * Redémarre les sessions bloquées
     */
    async restartStuckSessions(pendingSessions) {
        const stuckThreshold = Date.now() - 15 * 60 * 1000; // 15 minutes
        for (const session of pendingSessions) {
            if (session.metadata.createdAt.toMillis() < stuckThreshold &&
                !this.scheduledCalls.has(session.id)) {
                console.log(`🔄 Redémarrage session bloquée: ${session.id}`);
                try {
                    await this.scheduleCallSequence(session.id, 0); // Immédiat
                }
                catch (error) {
                    await (0, logError_1.logError)(`CallScheduler:restartStuckSession:${session.id}`, error);
                }
            }
        }
    }
    /**
     * Récupère les sessions en attente
     */
    async getPendingSessions() {
        try {
            const database = getDB();
            const snapshot = await database
                .collection('call_sessions')
                .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
                .orderBy('metadata.createdAt', 'desc')
                .limit(SCHEDULER_CONFIG.MAX_PENDING_SESSIONS)
                .get();
            return snapshot.docs.map((doc) => doc.data());
        }
        catch (error) {
            await (0, logError_1.logError)('CallScheduler:getPendingSessions', error);
            return [];
        }
    }
    /**
     * Programme une séquence d'appel
     */
    async scheduleCallSequence(callSessionId, delayMinutes = SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES) {
        try {
            // 🔧 FIX: Initialiser si nécessaire
            await this.initialize();
            // Valider les paramètres
            if (!callSessionId) {
                throw new Error('callSessionId est requis');
            }
            const sanitizedDelay = Math.min(Math.max(delayMinutes, 0), SCHEDULER_CONFIG.MAX_DELAY_MINUTES);
            // Vérifier que la session existe et est valide
            const twilioCallManager = await getTwilioCallManager();
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
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: 'sequence_scheduled',
                retryCount: 0,
                additionalData: {
                    delayMinutes: sanitizedDelay,
                    scheduledAt: new Date().toISOString(),
                },
            });
            console.log(`⏰ Séquence d'appel programmée pour ${callSessionId} dans ${sanitizedDelay} minutes`);
            // Programmer l'exécution
            const timeout = setTimeout(async () => {
                this.scheduledCalls.delete(callSessionId);
                await this.executeScheduledCall(callSessionId);
            }, sanitizedDelay * 60 * 1000);
            this.scheduledCalls.set(callSessionId, timeout);
            this.stats.totalScheduled++;
        }
        catch (error) {
            await (0, logError_1.logError)('CallScheduler:scheduleCallSequence', error);
            // En cas d'erreur, marquer la session comme échouée
            try {
                const twilioCallManager = await getTwilioCallManager();
                await twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
                await (0, logCallRecord_1.logCallRecord)({
                    callId: callSessionId,
                    status: 'sequence_failed',
                    retryCount: 0,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            catch (updateError) {
                await (0, logError_1.logError)('CallScheduler:scheduleCallSequence:updateError', updateError);
            }
        }
    }
    /**
     * Exécute un appel programmé avec gestion de retry
     */
    async executeScheduledCall(callSessionId) {
        let retryCount = 0;
        while (retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS) {
            try {
                console.log(`🚀 Exécution appel programmé: ${callSessionId} (tentative ${retryCount + 1}/${SCHEDULER_CONFIG.RETRY_ATTEMPTS})`);
                // Vérifier que la session est toujours valide
                const twilioCallManager = await getTwilioCallManager();
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
            }
            catch (error) {
                retryCount++;
                await (0, logError_1.logError)(`CallScheduler:executeScheduledCall:attempt_${retryCount}`, error);
                if (retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS) {
                    console.log(`⏳ Retry ${retryCount}/${SCHEDULER_CONFIG.RETRY_ATTEMPTS} pour ${callSessionId} dans ${SCHEDULER_CONFIG.RETRY_DELAY_MS}ms`);
                    await this.delay(SCHEDULER_CONFIG.RETRY_DELAY_MS * retryCount); // Délai progressif
                }
            }
        }
        // Toutes les tentatives ont échoué
        console.error(`❌ Échec de toutes les tentatives pour ${callSessionId}`);
        try {
            const twilioCallManager = await getTwilioCallManager();
            await twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
            this.stats.failedToday++;
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: 'sequence_failed_all_retries',
                retryCount: SCHEDULER_CONFIG.RETRY_ATTEMPTS,
            });
        }
        catch (updateError) {
            await (0, logError_1.logError)('CallScheduler:executeScheduledCall:finalUpdate', updateError);
        }
    }
    /**
     * Annule un appel programmé
     */
    async cancelScheduledCall(callSessionId, reason) {
        try {
            // 🔧 FIX: Initialiser si nécessaire
            await this.initialize();
            // Annuler le timeout
            const timeout = this.scheduledCalls.get(callSessionId);
            if (timeout) {
                clearTimeout(timeout);
                this.scheduledCalls.delete(callSessionId);
                console.log(`🚫 Planification annulée pour: ${callSessionId}`);
            }
            // Utiliser TwilioCallManager pour annuler la session
            const twilioCallManager = await getTwilioCallManager();
            await twilioCallManager.cancelCallSession(callSessionId, reason, 'scheduler');
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: `call_cancelled_${reason}`,
                retryCount: 0,
            });
            console.log(`✅ Appel annulé: ${callSessionId}, raison: ${reason}`);
        }
        catch (error) {
            await (0, logError_1.logError)('CallScheduler:cancelScheduledCall', error);
            throw error;
        }
    }
    /**
     * Obtient les statistiques du scheduler
     */
    getStats() {
        return Object.assign({}, this.stats);
    }
    /**
     * Ferme proprement le scheduler
     */
    shutdown() {
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
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
// 🔧 FIX: Instance singleton avec lazy loading
let callSchedulerManagerInstance = null;
function getCallSchedulerManager() {
    if (!callSchedulerManagerInstance) {
        callSchedulerManagerInstance = new CallSchedulerManager();
    }
    return callSchedulerManagerInstance;
}
/**
 * Fonction principale pour programmer une séquence d'appel
 */
const scheduleCallSequence = async (callSessionId, delayMinutes = SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES) => {
    const manager = getCallSchedulerManager();
    return manager.scheduleCallSequence(callSessionId, delayMinutes);
};
exports.scheduleCallSequence = scheduleCallSequence;
/**
 * ✅ Fonction pour créer et programmer un nouvel appel CORRIGÉE
 * - `amount` est **en EUROS** (unités réelles).
 * - ❌ Pas de vérification de "cohérence service/prix" ici.
 * - ✅ On garde uniquement la validation min/max.
 * - ❗️Aucune conversion centimes ici : la conversion unique vers centimes se fait
 *   au moment Stripe (dans la fonction de paiement en amont).
 */
const createAndScheduleCall = async (params) => {
    var _a;
    try {
        // Générer un ID unique si non fourni
        const sessionId = params.sessionId ||
            `call_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🆕 Création et planification d'un nouvel appel: ${sessionId}`);
        console.log(`💰 Montant (EUROS): ${params.amount} pour ${params.serviceType}`);
        // ✅ VALIDATION AMÉLIORÉE - Champs obligatoires avec messages spécifiques
        const requiredFields = {
            providerId: params.providerId,
            clientId: params.clientId,
            providerPhone: params.providerPhone,
            clientPhone: params.clientPhone,
            paymentIntentId: params.paymentIntentId,
            amount: params.amount
        };
        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === ''))
            .map(([key]) => key);
        if (missingFields.length > 0) {
            console.error(`❌ [createAndScheduleCall] Champs manquants:`, missingFields);
            throw new Error(`Paramètres obligatoires manquants pour créer l'appel: ${missingFields.join(', ')}`);
        }
        // ✅ Validation montant numérique
        if (typeof params.amount !== 'number' || isNaN(params.amount) || params.amount <= 0) {
            console.error(`❌ [createAndScheduleCall] Montant invalide:`, {
                amount: params.amount,
                type: typeof params.amount
            });
            throw new Error(`Montant invalide: ${params.amount} (type: ${typeof params.amount})`);
        }
        // ✅ Validation min/max (toujours en euros)
        if (params.amount < 5) {
            throw new Error('Montant minimum de 5€ requis');
        }
        if (params.amount > 500) {
            throw new Error('Montant maximum de 500€ dépassé');
        }
        // ✅ VALIDATION NUMÉROS DE TÉLÉPHONE
        const phoneRegex = /^\+[1-9]\d{8,14}$/;
        if (!phoneRegex.test(params.providerPhone)) {
            console.error(`❌ [createAndScheduleCall] Numéro prestataire invalide:`, params.providerPhone);
            throw new Error(`Numéro de téléphone prestataire invalide: ${params.providerPhone}`);
        }
        if (!phoneRegex.test(params.clientPhone)) {
            console.error(`❌ [createAndScheduleCall] Numéro client invalide:`, params.clientPhone);
            throw new Error(`Numéro de téléphone client invalide: ${params.clientPhone}`);
        }
        if (params.providerPhone === params.clientPhone) {
            console.error(`❌ [createAndScheduleCall] Numéros identiques:`, {
                providerPhone: params.providerPhone,
                clientPhone: params.clientPhone
            });
            throw new Error('Les numéros du prestataire et du client doivent être différents');
        }
        console.log(`✅ [createAndScheduleCall] Validation réussie pour ${sessionId}`);
        // ✅ Créer la session avec montants EN EUROS (aucune conversion ici)
        const twilioCallManager = await getTwilioCallManager();
        const callSession = await twilioCallManager.createCallSession({
            sessionId,
            providerId: params.providerId,
            clientId: params.clientId,
            providerPhone: params.providerPhone,
            clientPhone: params.clientPhone,
            serviceType: params.serviceType,
            providerType: params.providerType,
            paymentIntentId: params.paymentIntentId,
            amount: params.amount, // ✅ euros
            requestId: params.requestId,
            clientLanguages: params.clientLanguages,
            providerLanguages: params.providerLanguages,
        });
        // Programmer la séquence d'appel
        const delayMinutes = (_a = params.delayMinutes) !== null && _a !== void 0 ? _a : SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES;
        // Utiliser setImmediate pour éviter de bloquer la réponse
        setImmediate(async () => {
            try {
                await (0, exports.scheduleCallSequence)(sessionId, delayMinutes);
            }
            catch (error) {
                await (0, logError_1.logError)('createAndScheduleCall:scheduleError', error);
            }
        });
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: 'call_session_created',
            retryCount: 0,
            additionalData: {
                serviceType: params.serviceType,
                amountInEuros: params.amount, // audit humain
                delayMinutes,
                // ✅ AJOUT: Log des numéros pour debug
                hasProviderPhone: !!params.providerPhone,
                hasClientPhone: !!params.clientPhone,
                hasClientWhatsapp: !!params.clientWhatsapp,
                // infos additionnelles si disponibles (purement indicatives)
                currency: params.currency,
                amountCents: params.amountCents,
                platformAmountCents: params.platformAmountCents,
                platformFeePercent: params.platformFeePercent,
            },
        });
        console.log(`✅ Appel créé et programmé: ${sessionId} dans ${delayMinutes} minutes (montant gardé en euros)`);
        return callSession;
    }
    catch (error) {
        await (0, logError_1.logError)('createAndScheduleCall:error', error);
        throw error;
    }
};
exports.createAndScheduleCall = createAndScheduleCall;
/**
 * Fonction pour annuler un appel programmé
 */
const cancelScheduledCall = async (callSessionId, reason) => {
    const manager = getCallSchedulerManager();
    return manager.cancelScheduledCall(callSessionId, reason);
};
exports.cancelScheduledCall = cancelScheduledCall;
/**
 * Fonction pour reprendre les appels en attente au redémarrage
 */
const resumePendingCalls = async () => {
    try {
        console.log('🔄 Récupération des appels en attente...');
        const database = getDB();
        const now = admin.firestore.Timestamp.now();
        const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
        // Chercher les sessions en attente créées il y a plus de 5 minutes
        const pendingSessions = await database
            .collection('call_sessions')
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
            const sessionData = doc.data();
            try {
                // Vérifier si le paiement est toujours valide
                const paymentValid = await validatePaymentForResume(sessionData.payment.intentId);
                if (!paymentValid) {
                    const twilioCallManager = await getTwilioCallManager();
                    await twilioCallManager.cancelCallSession(sessionId, 'payment_invalid', 'resume_service');
                    return;
                }
                // Relancer la séquence d'appel immédiatement
                const twilioCallManager = await getTwilioCallManager();
                await twilioCallManager.initiateCallSequence(sessionId, 0);
                await (0, logCallRecord_1.logCallRecord)({
                    callId: sessionId,
                    status: 'call_resumed_after_restart',
                    retryCount: 0,
                });
                console.log(`✅ Session reprise: ${sessionId}`);
            }
            catch (error) {
                await (0, logError_1.logError)(`resumePendingCalls:session_${sessionId}`, error);
                // Marquer comme échoué si impossible de reprendre
                try {
                    const twilioCallManager = await getTwilioCallManager();
                    await twilioCallManager.updateCallSessionStatus(sessionId, 'failed');
                }
                catch (updateError) {
                    await (0, logError_1.logError)(`resumePendingCalls:updateStatus_${sessionId}`, updateError);
                }
            }
        });
        await Promise.allSettled(resumePromises);
        console.log(`✅ Récupération des sessions terminée`);
    }
    catch (error) {
        await (0, logError_1.logError)('resumePendingCalls:error', error);
    }
};
exports.resumePendingCalls = resumePendingCalls;
/**
 * Valide qu'un paiement est toujours valide pour reprise
 */
async function validatePaymentForResume(paymentIntentId) {
    try {
        const database = getDB();
        // Vérifier dans Firestore d'abord
        const paymentQuery = await database
            .collection('payments')
            .where('stripePaymentIntentId', '==', paymentIntentId)
            .limit(1)
            .get();
        if (paymentQuery.empty) {
            return false;
        }
        const paymentData = paymentQuery.docs[0].data();
        const validStatuses = [
            'pending',
            'requires_confirmation',
            'requires_action',
            'processing',
            'requires_capture',
        ];
        return validStatuses.includes(paymentData.status);
    }
    catch (error) {
        await (0, logError_1.logError)('validatePaymentForResume', error);
        return false;
    }
}
/**
 * Fonction de nettoyage des anciennes sessions
 */
const cleanupOldSessions = async (olderThanDays = 30) => {
    try {
        console.log(`🧹 Nettoyage des sessions de plus de ${olderThanDays} jours...`);
        const twilioCallManager = await getTwilioCallManager();
        const result = await twilioCallManager.cleanupOldSessions({
            olderThanDays,
            keepCompletedDays: 7, // Garder les complétées 7 jours
            batchSize: 50,
        });
        console.log(`✅ Nettoyage terminé: ${result.deleted} supprimées, ${result.errors} erreurs`);
    }
    catch (error) {
        await (0, logError_1.logError)('cleanupOldSessions:error', error);
    }
};
exports.cleanupOldSessions = cleanupOldSessions;
/**
 * ✅ Fonction pour obtenir des statistiques sur les appels avec montants en EUROS
 */
const getCallStatistics = async (periodDays = 7) => {
    try {
        const database = getDB();
        const startDate = admin.firestore.Timestamp.fromMillis(Date.now() - periodDays * 24 * 60 * 60 * 1000);
        const [schedulerStats, twilioCallManager] = await Promise.all([
            getCallSchedulerManager().getStats(),
            getTwilioCallManager(),
        ]);
        const callStats = await twilioCallManager.getCallStatistics({ startDate });
        // ✅ Calculs de revenus EN EUROS pour l'affichage
        let totalRevenueEuros = 0;
        let completedCallsWithRevenue = 0;
        // Récupérer les sessions complétées avec revenus
        const completedSessionsQuery = await database
            .collection('call_sessions')
            .where('metadata.createdAt', '>=', startDate)
            .where('status', '==', 'completed')
            .where('payment.status', '==', 'captured')
            .get();
        completedSessionsQuery.docs.forEach((doc) => {
            const session = doc.data();
            const amountInEuros = session.payment.amount; // stocké en euros
            totalRevenueEuros += amountInEuros;
            completedCallsWithRevenue++;
        });
        const averageAmountEuros = completedCallsWithRevenue > 0
            ? totalRevenueEuros / completedCallsWithRevenue
            : 0;
        return {
            scheduler: schedulerStats,
            calls: {
                total: callStats.total,
                completed: callStats.completed,
                failed: callStats.failed,
                cancelled: callStats.cancelled,
                averageDuration: callStats.averageDuration,
                successRate: callStats.successRate,
                totalRevenueEuros,
                averageAmountEuros,
            },
        };
    }
    catch (error) {
        await (0, logError_1.logError)('getCallStatistics:error', error);
        throw error;
    }
};
exports.getCallStatistics = getCallStatistics;
/**
 * Gestionnaire pour l'arrêt propre du service
 */
const gracefulShutdown = () => {
    console.log('🔄 Arrêt gracieux du CallScheduler...');
    if (callSchedulerManagerInstance) {
        callSchedulerManagerInstance.shutdown();
    }
};
exports.gracefulShutdown = gracefulShutdown;
// Gestionnaire de signaux pour arrêt propre
process.on('SIGTERM', exports.gracefulShutdown);
process.on('SIGINT', exports.gracefulShutdown);
// firebase/functions/src/callScheduler.ts
const logCallRecord_1 = require("./utils/logs/logCallRecord");
const logError_1 = require("./utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
// 🔧 FIX: Import mais pas d'initialisation immédiate
let twilioCallManagerInstance = null;
let stripeManagerInstance = null;
async function getTwilioCallManager() {
    if (!twilioCallManagerInstance) {
        const { twilioCallManager } = await Promise.resolve().then(() => __importStar(require('./TwilioCallManager')));
        twilioCallManagerInstance = twilioCallManager;
    }
    return twilioCallManagerInstance;
}
async function getStripeManager() {
    if (!stripeManagerInstance) {
        const { stripeManager } = await Promise.resolve().then(() => __importStar(require('./StripeManager')));
        stripeManagerInstance = stripeManager;
    }
    return stripeManagerInstance;
}
// 🔧 FIX: Initialisation Firebase lazy
let db = null;
function getDB() {
    if (!db) {
        // Assurer que Firebase Admin est initialisé
        if (!admin.apps.length) {
            admin.initializeApp();
        }
        db = admin.firestore();
    }
    return db;
}
//# sourceMappingURL=callScheduler.js.map