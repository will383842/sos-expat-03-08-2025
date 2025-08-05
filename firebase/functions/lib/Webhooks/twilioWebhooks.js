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
exports.findCallSessionByCallSid = exports.twilioRecordingWebhookLegacy = exports.twilioConferenceWebhookLegacy = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const TwilioCallManager_1 = require("../TwilioCallManager");
const logCallRecord_1 = require("../utils/logs/logCallRecord");
const logError_1 = require("../utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
/**
 * Webhook unifié pour les événements d'appels Twilio
 * Compatible avec le système TwilioCallManager moderne
 */
exports.twilioCallWebhook = (0, https_1.onRequest)(async (req, res) => {
    try {
        const body = req.body;
        console.log('🔔 Call Webhook reçu:', {
            event: body.CallStatus,
            callSid: body.CallSid,
            from: body.From,
            to: body.To,
            duration: body.CallDuration
        });
        // Trouver la session d'appel par CallSid
        const sessionResult = await TwilioCallManager_1.twilioCallManager.findSessionByCallSid(body.CallSid);
        if (!sessionResult) {
            console.warn(`Session non trouvée pour CallSid: ${body.CallSid}`);
            res.status(200).send('Session not found');
            return;
        }
        const { session, participantType } = sessionResult;
        const sessionId = session.id;
        // Traiter les différents statuts d'appel
        switch (body.CallStatus) {
            case 'ringing':
                await handleCallRinging(sessionId, participantType, body);
                break;
            case 'answered':
            case 'in-progress':
                await handleCallAnswered(sessionId, participantType, body);
                break;
            case 'completed':
                await handleCallCompleted(sessionId, participantType, body);
                break;
            case 'failed':
            case 'busy':
            case 'no-answer':
                await handleCallFailed(sessionId, participantType, body);
                break;
            default:
                console.log(`Statut d'appel non géré: ${body.CallStatus}`);
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('❌ Erreur webhook appel:', error);
        await (0, logError_1.logError)('twilioCallWebhook:error', error);
        res.status(500).send('Webhook error');
    }
});
/**
 * Gère le statut "ringing"
 */
async function handleCallRinging(sessionId, participantType, body) {
    try {
        console.log(`📞 ${participantType} en cours de sonnerie: ${sessionId}`);
        await TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'ringing');
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: `${participantType}_ringing`,
            retryCount: 0,
            additionalData: {
                callSid: body.CallSid,
                timestamp: body.Timestamp
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleCallRinging', error);
    }
}
/**
 * Gère le statut "answered"
 */
async function handleCallAnswered(sessionId, participantType, body) {
    try {
        console.log(`✅ ${participantType} a répondu: ${sessionId}`);
        await TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'connected', admin.firestore.Timestamp.fromDate(new Date()));
        // Vérifier si les deux participants sont connectés
        const session = await TwilioCallManager_1.twilioCallManager.getCallSession(sessionId);
        if (session &&
            session.participants.provider.status === 'connected' &&
            session.participants.client.status === 'connected') {
            await TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(sessionId, 'active');
            await (0, logCallRecord_1.logCallRecord)({
                callId: sessionId,
                status: 'both_participants_connected',
                retryCount: 0
            });
        }
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: `${participantType}_answered`,
            retryCount: 0,
            additionalData: {
                callSid: body.CallSid,
                answeredBy: body.AnsweredBy
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleCallAnswered', error);
    }
}
/**
 * Gère le statut "completed"
 */
async function handleCallCompleted(sessionId, participantType, body) {
    try {
        const duration = parseInt(body.CallDuration || '0');
        console.log(`🏁 Appel ${participantType} terminé: ${sessionId}, durée: ${duration}s`);
        await TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'disconnected', admin.firestore.Timestamp.fromDate(new Date()));
        // Récupérer la session pour déterminer le traitement approprié
        const session = await TwilioCallManager_1.twilioCallManager.getCallSession(sessionId);
        if (!session) {
            console.warn(`Session non trouvée lors de la completion: ${sessionId}`);
            return;
        }
        // Si c'est une déconnexion normale (durée suffisante)
        if (duration >= 120) {
            await TwilioCallManager_1.twilioCallManager.handleCallCompletion(sessionId, duration);
        }
        else {
            // Déconnexion précoce
            await handleEarlyDisconnection(sessionId, participantType, duration);
        }
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: `${participantType}_call_completed`,
            retryCount: 0,
            duration: duration,
            additionalData: {
                callSid: body.CallSid,
                duration: duration
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleCallCompleted', error);
    }
}
/**
 * Gère la déconnexion précoce
 */
async function handleEarlyDisconnection(sessionId, participantType, duration) {
    console.log(`[Twilio] Déconnexion précoce - session: ${sessionId}, type: ${participantType}, durée: ${duration}s`);
    // Logique de gestion de déconnexion précoce
    await TwilioCallManager_1.twilioCallManager.handleCallFailure(sessionId, 'early_disconnection');
}
/**
 * Gère les échecs d'appel
 */
async function handleCallFailed(sessionId, participantType, body) {
    try {
        console.log(`❌ Appel ${participantType} échoué: ${sessionId}, raison: ${body.CallStatus}`);
        await TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, body.CallStatus === 'no-answer' ? 'no_answer' : 'disconnected');
        // Déterminer la raison de l'échec pour le traitement approprié
        let failureReason = 'system_error';
        if (body.CallStatus === 'no-answer') {
            failureReason = `${participantType}_no_answer`;
        }
        else if (body.CallStatus === 'busy') {
            failureReason = `${participantType}_busy`;
        }
        else if (body.CallStatus === 'failed') {
            failureReason = `${participantType}_failed`;
        }
        // Utiliser la logique de gestion d'échec du TwilioCallManager
        await TwilioCallManager_1.twilioCallManager.handleCallFailure(sessionId, failureReason);
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: `${participantType}_call_failed`,
            retryCount: 0,
            errorMessage: `Call failed: ${body.CallStatus}`,
            additionalData: {
                callSid: body.CallSid,
                failureReason: body.CallStatus
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleCallFailed', error);
    }
}
/**
 * Webhook pour les événements de conférence - Version moderne
 */
exports.twilioConferenceWebhook = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Importer dynamiquement le webhook moderne
        const { twilioConferenceWebhook: modernWebhook } = await Promise.resolve().then(() => __importStar(require('./TwilioConferenceWebhook')));
        return modernWebhook(req, res);
    }
    catch (error) {
        console.error('❌ Erreur import TwilioConferenceWebhook:', error);
        res.status(500).send('Conference webhook error');
    }
});
/**
 * Webhook pour les événements d'enregistrement - Version moderne
 */
exports.twilioRecordingWebhook = (0, https_1.onRequest)(async (req, res) => {
    try {
        // Importer dynamiquement le webhook moderne
        const { twilioRecordingWebhook: modernWebhook } = await Promise.resolve().then(() => __importStar(require('./TwilioRecordingWebhook')));
        return modernWebhook(req, res);
    }
    catch (error) {
        console.error('❌ Erreur import TwilioRecordingWebhook:', error);
        res.status(500).send('Recording webhook error');
    }
});
/**
 * VERSIONS LEGACY - Gardées pour compatibilité avec les anciens endpoints
 */
exports.twilioConferenceWebhookLegacy = (0, https_1.onRequest)(async (req, res) => {
    console.log('📞 Conference webhook legacy appelé');
    try {
        const body = req.body;
        console.log('Conference event:', body);
        // Traitement legacy minimal ou redirection
        res.status(200).send('Legacy conference webhook processed');
    }
    catch (error) {
        console.error('❌ Erreur conference webhook legacy:', error);
        res.status(500).send('Legacy conference webhook error');
    }
});
exports.twilioRecordingWebhookLegacy = (0, https_1.onRequest)(async (req, res) => {
    console.log('🎙️ Recording webhook legacy appelé');
    try {
        const body = req.body;
        console.log('Recording event:', body);
        // Traitement legacy minimal ou redirection
        res.status(200).send('Legacy recording webhook processed');
    }
    catch (error) {
        console.error('❌ Erreur recording webhook legacy:', error);
        res.status(500).send('Legacy recording webhook error');
    }
});
/**
 * Fonction utilitaire pour recherche de session (compatible avec l'ancien système)
 */
const findCallSessionByCallSid = async (callSid) => {
    try {
        const result = await TwilioCallManager_1.twilioCallManager.findSessionByCallSid(callSid);
        if (result) {
            return {
                doc: {
                    id: result.session.id,
                    data: () => result.session
                },
                type: result.participantType
            };
        }
        return null;
    }
    catch (error) {
        console.error('Error finding call session:', error);
        return null;
    }
};
exports.findCallSessionByCallSid = findCallSessionByCallSid;
//# sourceMappingURL=twilioWebhooks.js.map