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
exports.findCallSessionByCallSid = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const TwilioCallManager_1 = require("../TwilioCallManager");
const logCallRecord_1 = require("../utils/logs/logCallRecord");
const logError_1 = require("../utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
const twilio_1 = require("../lib/twilio");
/**
 * Webhook unifié pour les événements d'appels Twilio
 * Compatible avec le système TwilioCallManager moderne
 */
exports.twilioCallWebhook = (0, https_1.onRequest)({ region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    secrets: [twilio_1.TWILIO_ACCOUNT_SID, twilio_1.TWILIO_AUTH_TOKEN, twilio_1.TWILIO_PHONE_NUMBER] }, async (req, res) => {
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
            // Déconnexion précoce - utiliser la méthode du TwilioCallManager
            await TwilioCallManager_1.twilioCallManager.handleEarlyDisconnection(sessionId, participantType, duration);
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
 * Webhook pour les événements de conférence (délégué au système moderne)
 */
exports.twilioConferenceWebhook = (0, https_1.onRequest)({ region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    secrets: [twilio_1.TWILIO_ACCOUNT_SID, twilio_1.TWILIO_AUTH_TOKEN, twilio_1.TWILIO_PHONE_NUMBER] }, async (req, res) => {
    // Rediriger vers le webhook de conférence moderne
    const { twilioConferenceWebhook: modernWebhook } = await Promise.resolve().then(() => __importStar(require('./TwilioConferenceWebhook')));
    return modernWebhook(req, res);
});
/**
 * Webhook pour les événements d'enregistrement (délégué au système moderne)
 */
exports.twilioRecordingWebhook = (0, https_1.onRequest)({ region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    secrets: [twilio_1.TWILIO_ACCOUNT_SID, twilio_1.TWILIO_AUTH_TOKEN, twilio_1.TWILIO_PHONE_NUMBER] }, async (req, res) => {
    // Rediriger vers le webhook d'enregistrement moderne
    const { twilioRecordingWebhook: modernWebhook } = await Promise.resolve().then(() => __importStar(require('./TwilioRecordingWebhook')));
    return modernWebhook(req, res);
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