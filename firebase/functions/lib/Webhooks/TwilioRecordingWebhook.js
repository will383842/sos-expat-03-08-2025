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
exports.twilioRecordingWebhook = exports.TwilioRecordingWebhook = void 0;
exports.getSessionRecordings = getSessionRecordings;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const TwilioCallManager_1 = require("../TwilioCallManager");
const logCallRecord_1 = require("../utils/logs/logCallRecord");
const logError_1 = require("../utils/logs/logError");
/**
 * Webhook pour les événements d'enregistrement Twilio
 * Gère: completed, failed, absent
 */
exports.TwilioRecordingWebhook = (0, https_1.onRequest)({
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1
}, async (req, res) => {
    try {
        const body = req.body;
        console.log('🎬 Recording Webhook reçu:', {
            status: body.RecordingStatus,
            recordingSid: body.RecordingSid,
            duration: body.RecordingDuration,
            conferenceSid: body.ConferenceSid,
            callSid: body.CallSid
        });
        // Trouver la session d'appel
        let session = null;
        let sessionId = '';
        if (body.ConferenceSid) {
            session = await TwilioCallManager_1.twilioCallManager.findSessionByConferenceSid(body.ConferenceSid);
        }
        else if (body.CallSid) {
            const result = await TwilioCallManager_1.twilioCallManager.findSessionByCallSid(body.CallSid);
            session = (result === null || result === void 0 ? void 0 : result.session) || null;
        }
        if (!session) {
            console.warn(`Session non trouvée pour enregistrement: ${body.RecordingSid}`);
            res.status(200).send('Session not found');
            return;
        }
        sessionId = session.id;
        switch (body.RecordingStatus) {
            case 'completed':
                await handleRecordingCompleted(sessionId, body);
                break;
            case 'failed':
                await handleRecordingFailed(sessionId, body);
                break;
            case 'absent':
                await handleRecordingAbsent(sessionId, body);
                break;
            default:
                console.log(`Statut d'enregistrement non géré: ${body.RecordingStatus}`);
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('❌ Erreur webhook enregistrement:', error);
        await (0, logError_1.logError)('twilioRecordingWebhook:error', error);
        res.status(500).send('Webhook error');
    }
});
exports.twilioRecordingWebhook = exports.TwilioRecordingWebhook;
/**
 * Gère la completion d'un enregistrement
 */
async function handleRecordingCompleted(sessionId, body) {
    try {
        const duration = parseInt(body.RecordingDuration || '0', 10);
        console.log(`✅ Enregistrement complété: ${sessionId}, durée: ${duration}s`);
        // Mettre à jour la session avec l'URL d'enregistrement
        await TwilioCallManager_1.twilioCallManager.updateConferenceInfo(sessionId, {
            recordingUrl: body.RecordingUrl,
            duration
        });
        // Sauvegarder les métadonnées de l'enregistrement
        await saveRecordingMetadata(sessionId, body, 'completed');
        // Déclencher la logique de post-traitement si nécessaire
        await handlePostRecordingProcessing(sessionId, body);
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: 'recording_completed',
            retryCount: 0,
            duration,
            additionalData: {
                recordingSid: body.RecordingSid,
                recordingUrl: body.RecordingUrl,
                recordingDuration: duration
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleRecordingCompleted', error);
    }
}
/**
 * Gère l'échec d'un enregistrement
 */
async function handleRecordingFailed(sessionId, body) {
    try {
        console.log(`❌ Échec enregistrement: ${sessionId}`);
        // Sauvegarder les métadonnées de l'échec
        await saveRecordingMetadata(sessionId, body, 'failed');
        // Notifier l'équipe technique de l'échec
        await notifyRecordingFailure(sessionId, body);
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: 'recording_failed',
            retryCount: 0,
            errorMessage: 'Recording failed',
            additionalData: {
                recordingSid: body.RecordingSid,
                conferenceSid: body.ConferenceSid
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleRecordingFailed', error);
    }
}
/**
 * Gère l'absence d'enregistrement
 */
async function handleRecordingAbsent(sessionId, body) {
    try {
        console.log(`⚠️ Enregistrement absent: ${sessionId}`);
        // Sauvegarder les métadonnées de l'absence
        await saveRecordingMetadata(sessionId, body, 'absent');
        await (0, logCallRecord_1.logCallRecord)({
            callId: sessionId,
            status: 'recording_absent',
            retryCount: 0,
            additionalData: {
                recordingSid: body.RecordingSid,
                conferenceSid: body.ConferenceSid,
                reason: 'No recording available'
            }
        });
    }
    catch (error) {
        await (0, logError_1.logError)('handleRecordingAbsent', error);
    }
}
/**
 * Sauvegarde les métadonnées de l'enregistrement
 */
async function saveRecordingMetadata(sessionId, body, status) {
    try {
        const db = admin.firestore();
        const recordingData = {
            sessionId,
            recordingSid: body.RecordingSid,
            recordingUrl: body.RecordingUrl || null,
            recordingStatus: status,
            recordingDuration: parseInt(body.RecordingDuration || '0', 10),
            recordingChannels: parseInt(body.RecordingChannels || '1', 10),
            recordingSource: body.RecordingSource || 'conference',
            conferenceSid: body.ConferenceSid || null,
            callSid: body.CallSid || null,
            accountSid: body.AccountSid,
            webhookTimestamp: body.Timestamp,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            environment: process.env.NODE_ENV || 'development'
        };
        await db.collection('call_recordings').doc(body.RecordingSid).set(recordingData);
        console.log(`📹 Métadonnées enregistrement sauvegardées: ${body.RecordingSid}`);
    }
    catch (error) {
        await (0, logError_1.logError)('saveRecordingMetadata', error);
    }
}
/**
 * Gère le post-traitement après enregistrement
 */
async function handlePostRecordingProcessing(sessionId, body) {
    try {
        const session = await TwilioCallManager_1.twilioCallManager.getCallSession(sessionId);
        if (!session)
            return;
        const recordingDuration = parseInt(body.RecordingDuration || '0', 10);
        // Si l'enregistrement confirme que l'appel était assez long, capturer le paiement
        if (recordingDuration >= 120 && TwilioCallManager_1.twilioCallManager.shouldCapturePayment(session)) {
            console.log(`💰 Déclenchement capture paiement suite à enregistrement valide: ${sessionId}`);
            await TwilioCallManager_1.twilioCallManager.capturePaymentForSession(sessionId);
        }
        // Créer une notification pour informer de la disponibilité de l'enregistrement
        await notifyRecordingAvailable(sessionId, session, body);
    }
    catch (error) {
        await (0, logError_1.logError)('handlePostRecordingProcessing', error);
    }
}
/**
 * Notifie la disponibilité de l'enregistrement
 */
async function notifyRecordingAvailable(sessionId, session, body) {
    try {
        const db = admin.firestore();
        // Créer une notification pour l'équipe administrative
        await db.collection('admin_notifications').add({
            type: 'recording_available',
            sessionId,
            recordingSid: body.RecordingSid,
            recordingUrl: body.RecordingUrl,
            recordingDuration: parseInt(body.RecordingDuration || '0', 10),
            clientId: session.metadata.clientId,
            providerId: session.metadata.providerId,
            serviceType: session.metadata.serviceType,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            processed: false,
            priority: 'low'
        });
        // Log pour les métriques
        console.log(`📢 Notification enregistrement créée: ${sessionId}`);
    }
    catch (error) {
        await (0, logError_1.logError)('notifyRecordingAvailable', error);
    }
}
/**
 * Notifie l'équipe technique d'un échec d'enregistrement
 */
async function notifyRecordingFailure(sessionId, body) {
    try {
        const db = admin.firestore();
        // Créer une alerte technique
        await db.collection('technical_alerts').add({
            type: 'recording_failure',
            severity: 'medium',
            sessionId,
            recordingSid: body.RecordingSid,
            conferenceSid: body.ConferenceSid,
            callSid: body.CallSid,
            timestamp: body.Timestamp,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            resolved: false,
            assignedTo: null,
            details: {
                recordingStatus: body.RecordingStatus,
                accountSid: body.AccountSid
            }
        });
        console.log(`🚨 Alerte technique créée pour échec enregistrement: ${sessionId}`);
    }
    catch (error) {
        await (0, logError_1.logError)('notifyRecordingFailure', error);
    }
}
/**
 * Fonction utilitaire pour récupérer les enregistrements d'une session
 */
async function getSessionRecordings(sessionId) {
    try {
        const db = admin.firestore();
        const snapshot = await db
            .collection('call_recordings')
            .where('sessionId', '==', sessionId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        await (0, logError_1.logError)('getSessionRecordings', error);
        return [];
    }
}
//# sourceMappingURL=TwilioRecordingWebhook.js.map