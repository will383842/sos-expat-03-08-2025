import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logCallRecord } from './utils/logCallRecord';
import { logError } from './utils/logError';

// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 📞 WEBHOOK 1: Pour les appels PRESTATAIRE
export const twilioWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      AnsweredBy,
      CallDuration,
      From,
      To
    } = req.body;

    console.log('🔔 Webhook Twilio reçu:', {
      CallSid,
      CallStatus,
      AnsweredBy,
      CallDuration,
      From,
      To
    });

    // Trouver la session d'appel correspondante par CallSid d'abord, puis par numéro
    let callDoc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData> | null = null;
    let callId = '';
    let callData: admin.firestore.DocumentData | null = null;

    // Méthode 1: Chercher par CallSid stocké
    const callSessionsRef = db.collection('call_sessions');
    let snapshot = await callSessionsRef
      .where('twilioCallSid', '==', CallSid)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      callDoc = snapshot.docs[0];
      callId = callDoc.id;
      callData = callDoc.data();
    } else {
      // Méthode 2: Chercher par numéro de téléphone du prestataire
      snapshot = await callSessionsRef
        .where('providerPhone', '==', To)
        .where('status', 'in', ['scheduled', 'provider_attempt_1', 'provider_attempt_2', 'provider_attempt_3', 'provider_connected'])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        callDoc = snapshot.docs[0];
        callId = callDoc.id;
        callData = callDoc.data();
      }
    }

    if (!callDoc || !callData) {
      console.log('❌ Aucune session d\'appel trouvée pour:', { To, CallSid });
      res.status(200).send('No matching call session');
      return;
    }

    await logCallRecord({
      callId,
      status: `provider_webhook_${CallStatus}`,
      retryCount: callData.retryCount || 0,
      additionalData: {
        CallSid,
        AnsweredBy,
        CallDuration: CallDuration || '0'
      }
    });

    // ✅ PRESTATAIRE A RÉPONDU
    if (CallStatus === 'answered' || (CallStatus === 'completed' && AnsweredBy === 'human')) {
      console.log('✅ Prestataire a répondu:', callId);
      
      await callDoc.ref.update({
        status: 'connected',
        providerCallSid: CallSid,
        providerAnsweredAt: admin.firestore.Timestamp.now(),
        providerCallDuration: CallDuration || '0'
      });

      await logCallRecord({
        callId,
        status: 'provider_answered_confirmed',
        retryCount: callData.retryCount || 0
      });
    }
    // ❌ PRESTATAIRE N'A PAS RÉPONDU
    else if (CallStatus === 'no-answer' || CallStatus === 'busy' || CallStatus === 'failed') {
      console.log('❌ Prestataire n\'a pas répondu:', callId, CallStatus);
      
      await callDoc.ref.update({
        lastProviderAttemptStatus: CallStatus,
        lastProviderAttemptAt: admin.firestore.Timestamp.now()
      });

      await logCallRecord({
        callId,
        status: `provider_no_answer_${CallStatus}`,
        retryCount: callData.retryCount || 0
      });
    }
    // 📞 APPEL EN COURS
    else if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      console.log('📞 Appel prestataire en cours:', callId, CallStatus);
      
      await logCallRecord({
        callId,
        status: `provider_${CallStatus}`,
        retryCount: callData.retryCount || 0
      });
    }
    // 🔚 APPEL TERMINÉ
    else if (CallStatus === 'completed') {
      console.log('🔚 Appel prestataire terminé:', callId);
      
      await callDoc.ref.update({
        providerCallCompletedAt: admin.firestore.Timestamp.now(),
        providerFinalCallDuration: CallDuration || '0'
      });

      await logCallRecord({
        callId,
        status: 'provider_call_completed',
        retryCount: callData.retryCount || 0,
        additionalData: {
          providerDuration: CallDuration
        }
      });
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Erreur webhook Twilio:', error);
    await logError('twilioWebhook:error', error);
    res.status(500).send('Error processing webhook');
  }
});

// 📞 WEBHOOK 2: Pour les appels CLIENT
export const twilioClientWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      AnsweredBy,
      CallDuration,
      From,
      To
    } = req.body;

    console.log('🔔 Webhook Client Twilio reçu:', {
      CallSid,
      CallStatus,
      AnsweredBy,
      CallDuration,
      From,
      To
    });

    // Trouver la session d'appel correspondante
    let callDoc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData> | null = null;
    let callId = '';
    let callData: admin.firestore.DocumentData | null = null;

    const callSessionsRef = db.collection('call_sessions');
    
    // Méthode 1: Chercher par CallSid stocké pour le client
    let snapshot = await callSessionsRef
      .where('clientCallSid', '==', CallSid)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      callDoc = snapshot.docs[0];
      callId = callDoc.id;
      callData = callDoc.data();
    } else {
      // Méthode 2: Chercher par numéro de téléphone du client avec statut approprié
      snapshot = await callSessionsRef
        .where('clientPhone', '==', To)
        .where('status', 'in', ['provider_connected', 'client_attempt_1', 'client_attempt_2', 'client_attempt_3'])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        callDoc = snapshot.docs[0];
        callId = callDoc.id;
        callData = callDoc.data();
        
        // Mettre à jour le CallSid client si pas encore fait
        await callDoc.ref.update({
          clientCallSid: CallSid
        });
      }
    }

    if (!callDoc || !callData) {
      console.log('❌ Aucune session d\'appel client trouvée pour:', { To, CallSid });
      res.status(200).send('No matching client call session');
      return;
    }

    await logCallRecord({
      callId,
      status: `client_webhook_${CallStatus}`,
      retryCount: callData.clientRetryCount || 0,
      additionalData: {
        CallSid,
        AnsweredBy,
        CallDuration: CallDuration || '0'
      }
    });

    // ✅ CLIENT A RÉPONDU
    if (CallStatus === 'answered' || (CallStatus === 'completed' && AnsweredBy === 'human')) {
      console.log('✅ Client a répondu:', callId);
      
      await callDoc.ref.update({
        clientStatus: 'connected',
        clientCallSid: CallSid,
        clientAnsweredAt: admin.firestore.Timestamp.now(),
        clientCallDuration: CallDuration || '0',
        fullStatus: 'both_connected'
      });

      await logCallRecord({
        callId,
        status: 'client_answered_confirmed',
        retryCount: callData.clientRetryCount || 0
      });
    }
    // ❌ CLIENT N'A PAS RÉPONDU
    else if (CallStatus === 'no-answer' || CallStatus === 'busy' || CallStatus === 'failed') {
      console.log('❌ Client n\'a pas répondu:', callId, CallStatus);
      
      await callDoc.ref.update({
        lastClientAttemptStatus: CallStatus,
        lastClientAttemptAt: admin.firestore.Timestamp.now()
      });

      await logCallRecord({
        callId,
        status: `client_no_answer_${CallStatus}`,
        retryCount: callData.clientRetryCount || 0
      });
    }
    // 📞 APPEL EN COURS
    else if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      console.log('📞 Appel client en cours:', callId, CallStatus);
      
      await logCallRecord({
        callId,
        status: `client_${CallStatus}`,
        retryCount: callData.clientRetryCount || 0
      });
    }
    // 🔚 APPEL TERMINÉ
    else if (CallStatus === 'completed') {
      console.log('🔚 Appel terminé:', callId);
      
      await callDoc.ref.update({
        callCompletedAt: admin.firestore.Timestamp.now(),
        finalCallDuration: CallDuration || '0'
      });

      await logCallRecord({
        callId,
        status: 'call_completed',
        retryCount: callData.clientRetryCount || 0,
        additionalData: {
          totalDuration: CallDuration
        }
      });
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Erreur webhook Client Twilio:', error);
    await logError('twilioClientWebhook:error', error);
    res.status(500).send('Error processing webhook');
  }
});

// 🛠️ FONCTION UTILITAIRE: Recherche de session par CallSid (améliorée)
export const findCallSessionByCallSid = async (callSid: string) => {
  const db = admin.firestore();
  
  // Chercher dans les CallSid prestataire
  let snapshot = await db.collection('call_sessions')
    .where('providerCallSid', '==', callSid)
    .limit(1)
    .get();
  
  if (!snapshot.empty) {
    return { doc: snapshot.docs[0], type: 'provider' };
  }
  
  // Chercher dans les CallSid client
  snapshot = await db.collection('call_sessions')
    .where('clientCallSid', '==', callSid)
    .limit(1)
    .get();
  
  if (!snapshot.empty) {
    return { doc: snapshot.docs[0], type: 'client' };
  }

  // Chercher dans le CallSid principal (twilioCallSid)
  snapshot = await db.collection('call_sessions')
    .where('twilioCallSid', '==', callSid)
    .limit(1)
    .get();
  
  if (!snapshot.empty) {
    return { doc: snapshot.docs[0], type: 'main' };
  }
  
  return null;
};