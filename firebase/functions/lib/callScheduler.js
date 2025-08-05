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
exports.getCallStatistics = exports.cleanupOldSessions = exports.resumePendingCalls = exports.cancelScheduledCall = exports.createAndScheduleCall = exports.scheduleCallSequence = void 0;
const logCallRecord_1 = require("./utils/logs/logCallRecord");
const logError_1 = require("./utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
const TwilioCallManager_1 = require("./TwilioCallManager");
// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Fonction principale pour programmer une séquence d'appel
 * Utilise maintenant le TwilioCallManager pour une gestion robuste
 */
const scheduleCallSequence = async (callSessionId, delayMinutes = 5) => {
    try {
        await (0, logCallRecord_1.logCallRecord)({
            callId: callSessionId,
            status: 'sequence_scheduled',
            retryCount: 0,
        });
        console.log(`⏰ Séquence d'appel programmée pour ${callSessionId} dans ${delayMinutes} minutes`);
        // Utiliser le TwilioCallManager pour la gestion robuste des appels
        await TwilioCallManager_1.twilioCallManager.initiateCallSequence(callSessionId, delayMinutes);
    }
    catch (error) {
        await (0, logError_1.logError)('scheduleCallSequence:error', error);
        // En cas d'erreur, marquer la session comme échouée
        try {
            await TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(callSessionId, 'failed');
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: 'sequence_failed',
                retryCount: 0,
            });
        }
        catch (updateError) {
            await (0, logError_1.logError)('scheduleCallSequence:updateError', updateError);
        }
    }
};
exports.scheduleCallSequence = scheduleCallSequence;
/**
 * Fonction pour créer une nouvelle session d'appel
 * Remplace l'ancienne logique dispersée
 */
const createAndScheduleCall = async (params) => {
    try {
        const sessionId = params.sessionId || `call_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Créer la session via le TwilioCallManager
        const callSession = await TwilioCallManager_1.twilioCallManager.createCallSession({
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
            (0, exports.scheduleCallSequence)(sessionId, params.delayMinutes || 5);
        });
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: 'call_session_created',
            retryCount: 0,
        });
        return callSession;
    }
    catch (error) {
        await (0, logError_1.logError)('createAndScheduleCall:error', error);
        throw error;
    }
};
exports.createAndScheduleCall = createAndScheduleCall;
/**
 * Fonction pour annuler une séquence d'appel programmée
 */
const cancelScheduledCall = async (callSessionId, reason) => {
    try {
        const session = await TwilioCallManager_1.twilioCallManager.getCallSession(callSessionId);
        if (!session) {
            throw new Error(`Session d'appel non trouvée: ${callSessionId}`);
        }
        // Mettre à jour le statut
        await TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(callSessionId, 'cancelled');
        // Rembourser si nécessaire (sera géré par le PaymentManager)
        if (session.payment.status === 'authorized') {
            await db.collection('call_sessions').doc(callSessionId).update({
                'payment.status': 'refunded',
                'payment.refundedAt': admin.firestore.Timestamp.now(),
                'metadata.updatedAt': admin.firestore.Timestamp.now()
            });
        }
        await (0, logCallRecord_1.logCallRecord)({
            callId: callSessionId,
            status: `call_cancelled_${reason}`,
            retryCount: 0,
        });
        console.log(`✅ Appel annulé: ${callSessionId}, raison: ${reason}`);
    }
    catch (error) {
        await (0, logError_1.logError)('cancelScheduledCall:error', error);
        throw error;
    }
};
exports.cancelScheduledCall = cancelScheduledCall;
/**
 * Fonction pour reprendre les appels en attente au redémarrage
 * Utile pour la récupération après un crash ou redéploiement
 */
const resumePendingCalls = async () => {
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
            const sessionId = doc.id;
            try {
                // Relancer la séquence d'appel immédiatement
                await TwilioCallManager_1.twilioCallManager.initiateCallSequence(sessionId, 0);
                await (0, logCallRecord_1.logCallRecord)({
                    callId: sessionId,
                    status: 'call_resumed_after_restart',
                    retryCount: 0,
                });
            }
            catch (error) {
                await (0, logError_1.logError)(`resumePendingCalls:session_${sessionId}`, error);
                // Marquer comme échoué si impossible de reprendre
                await TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(sessionId, 'failed');
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
 * Fonction de nettoyage des anciennes sessions
 * À exécuter périodiquement pour nettoyer les données
 */
const cleanupOldSessions = async (olderThanDays = 30) => {
    try {
        const cutoffDate = admin.firestore.Timestamp.fromMillis(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
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
    }
    catch (error) {
        await (0, logError_1.logError)('cleanupOldSessions:error', error);
    }
};
exports.cleanupOldSessions = cleanupOldSessions;
/**
 * Fonction pour obtenir des statistiques sur les appels
 */
const getCallStatistics = async (periodDays = 7) => {
    try {
        const startDate = admin.firestore.Timestamp.fromMillis(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
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
            const session = doc.data();
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
    }
    catch (error) {
        await (0, logError_1.logError)('getCallStatistics:error', error);
        throw error;
    }
};
exports.getCallStatistics = getCallStatistics;
//# sourceMappingURL=callScheduler.js.map