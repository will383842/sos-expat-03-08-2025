import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { twilioCallManager } from '../TwilioCallManager';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { logError } from '../utils/logs/logError';
import { Request, Response } from 'express';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } from '../lib/twilio';

interface TwilioRecordingWebhookBody {
  RecordingSid: string;
  RecordingUrl: string;
  RecordingStatus: string;
  RecordingDuration: string;
  RecordingChannels: string;
  RecordingSource: string;

  // Informations de la conférence/appel
  ConferenceSid?: string;
  CallSid?: string;

  // Métadonnées
  AccountSid: string;
  Timestamp: string;
}

/**
 * Webhook pour les événements d'enregistrement Twilio
 * Gère: completed, failed, absent
 */
export const TwilioRecordingWebhook = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1
  },
  async (req: Request, res: Response) => {
    try {
      const body: TwilioRecordingWebhookBody = req.body;

      console.log('🎬 Recording Webhook reçu:', {
        status: body.RecordingStatus,
        recordingSid: body.RecordingSid,
        duration: body.RecordingDuration,
        conferenceSid: body.ConferenceSid,
        callSid: body.CallSid
      });

      // Trouver la session d'appel
      let session: any = null;
      let sessionId = '';

      if (body.ConferenceSid) {
        session = await twilioCallManager.findSessionByConferenceSid(body.ConferenceSid);
      } else if (body.CallSid) {
        const result = await twilioCallManager.findSessionByCallSid(body.CallSid);
        session = result?.session || null;
      }

      if (!session) {
        console.warn(`Session non trouvée pour enregistrement: ${body.RecordingSid}`);
        res.status(200).send('Session not found');
        return;
      }

      sessionId = session.id as string;

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
    } catch (error) {
      console.error('❌ Erreur webhook enregistrement:', error);
      await logError('twilioRecordingWebhook:error', error);
      res.status(500).send('Webhook error');
    }
  }
);

/**
 * Gère la completion d'un enregistrement
 */
async function handleRecordingCompleted(sessionId: string, body: TwilioRecordingWebhookBody) {
  try {
    const duration = parseInt(body.RecordingDuration || '0', 10);
    console.log(`✅ Enregistrement complété: ${sessionId}, durée: ${duration}s`);

    // Mettre à jour la session avec l'URL d'enregistrement
    await twilioCallManager.updateConferenceInfo(sessionId, {
      recordingUrl: body.RecordingUrl,
      duration
    });

    // Sauvegarder les métadonnées de l'enregistrement
    await saveRecordingMetadata(sessionId, body, 'completed');

    // Déclencher la logique de post-traitement si nécessaire
    await handlePostRecordingProcessing(sessionId, body);

    await logCallRecord({
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
  } catch (error) {
    await logError('handleRecordingCompleted', error);
  }
}

/**
 * Gère l'échec d'un enregistrement
 */
async function handleRecordingFailed(sessionId: string, body: TwilioRecordingWebhookBody) {
  try {
    console.log(`❌ Échec enregistrement: ${sessionId}`);

    // Sauvegarder les métadonnées de l'échec
    await saveRecordingMetadata(sessionId, body, 'failed');

    // Notifier l'équipe technique de l'échec
    await notifyRecordingFailure(sessionId, body);

    await logCallRecord({
      callId: sessionId,
      status: 'recording_failed',
      retryCount: 0,
      errorMessage: 'Recording failed',
      additionalData: {
        recordingSid: body.RecordingSid,
        conferenceSid: body.ConferenceSid
      }
    });
  } catch (error) {
    await logError('handleRecordingFailed', error);
  }
}

/**
 * Gère l'absence d'enregistrement
 */
async function handleRecordingAbsent(sessionId: string, body: TwilioRecordingWebhookBody) {
  try {
    console.log(`⚠️ Enregistrement absent: ${sessionId}`);

    // Sauvegarder les métadonnées de l'absence
    await saveRecordingMetadata(sessionId, body, 'absent');

    await logCallRecord({
      callId: sessionId,
      status: 'recording_absent',
      retryCount: 0,
      additionalData: {
        recordingSid: body.RecordingSid,
        conferenceSid: body.ConferenceSid,
        reason: 'No recording available'
      }
    });
  } catch (error) {
    await logError('handleRecordingAbsent', error);
  }
}

/**
 * Sauvegarde les métadonnées de l'enregistrement
 */
async function saveRecordingMetadata(
  sessionId: string,
  body: TwilioRecordingWebhookBody,
  status: 'completed' | 'failed' | 'absent'
) {
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
  } catch (error) {
    await logError('saveRecordingMetadata', error);
  }
}

/**
 * Gère le post-traitement après enregistrement
 */
async function handlePostRecordingProcessing(sessionId: string, body: TwilioRecordingWebhookBody) {
  try {
    const session = await twilioCallManager.getCallSession(sessionId);
    if (!session) return;

    const recordingDuration = parseInt(body.RecordingDuration || '0', 10);

    // Si l'enregistrement confirme que l'appel était assez long, capturer le paiement
    if (recordingDuration >= 120 && twilioCallManager.shouldCapturePayment(session)) {
      console.log(`💰 Déclenchement capture paiement suite à enregistrement valide: ${sessionId}`);
      await twilioCallManager.capturePaymentForSession(sessionId);
    }

    // Créer une notification pour informer de la disponibilité de l'enregistrement
    await notifyRecordingAvailable(sessionId, session, body);
  } catch (error) {
    await logError('handlePostRecordingProcessing', error);
  }
}

/**
 * Notifie la disponibilité de l'enregistrement
 */
async function notifyRecordingAvailable(
  sessionId: string,
  session: any,
  body: TwilioRecordingWebhookBody
) {
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
  } catch (error) {
    await logError('notifyRecordingAvailable', error);
  }
}

/**
 * Notifie l'équipe technique d'un échec d'enregistrement
 */
async function notifyRecordingFailure(sessionId: string, body: TwilioRecordingWebhookBody) {
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
  } catch (error) {
    await logError('notifyRecordingFailure', error);
  }
}

/**
 * Fonction utilitaire pour récupérer les enregistrements d'une session
 */
export async function getSessionRecordings(sessionId: string) {
  try {
    const db = admin.firestore();

    const snapshot = await db
      .collection('call_recordings')
      .where('sessionId', '==', sessionId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    await logError('getSessionRecordings', error);
    return [];
  }
}

/**
 * Alias d'export pour compatibilité avec les imports en lowercase.
 * Permet: import { twilioRecordingWebhook } from './TwilioRecordingWebhook'
 */
export { TwilioRecordingWebhook as twilioRecordingWebhook };