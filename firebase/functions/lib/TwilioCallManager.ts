import * as admin from 'firebase-admin';
import twilio from 'twilio';
import { logError } from '../utils/logError';
import { logCallRecord } from '../utils/logCallRecord';

export interface CallSessionState {
  id: string;
  status: 'pending' | 'provider_connecting' | 'client_connecting' | 'both_connecting' | 'active' | 'completed' | 'failed' | 'cancelled';
  participants: {
    provider: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: admin.firestore.Timestamp;
      disconnectedAt?: admin.firestore.Timestamp;
    };
    client: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: admin.firestore.Timestamp;
      disconnectedAt?: admin.firestore.Timestamp;
    };
  };
  conference: {
    sid?: string;
    name: string;
    startedAt?: admin.firestore.Timestamp;
    endedAt?: admin.firestore.Timestamp;
    duration?: number;
    recordingUrl?: string;
  };
  payment: {
    intentId: string;
    status: 'pending' | 'authorized' | 'captured' | 'refunded';
    amount: number;
    capturedAt?: admin.firestore.Timestamp;
    refundedAt?: admin.firestore.Timestamp;
  };
  metadata: {
    providerId: string;
    clientId: string;
    serviceType: 'lawyer_call' | 'expat_call';
    providerType: 'lawyer' | 'expat';
    maxDuration: number; // en secondes
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  };
}

export class TwilioCallManager {
  private twilioClient: twilio.Twilio;
  private db: admin.firestore.Firestore;

  constructor() {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    this.db = admin.firestore();
  }

  /**
   * Valide et formate un numéro de téléphone
   */
  private validatePhoneNumber(phone: string): string {
    // Nettoyer le numéro
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Vérifier le format international
    if (!cleaned.startsWith('+')) {
      throw new Error(`Numéro de téléphone invalide: ${phone}. Doit commencer par +`);
    }
    
    // Vérifier la longueur (entre 10 et 15 chiffres après le +)
    const digits = cleaned.substring(1);
    if (digits.length < 10 || digits.length > 15) {
      throw new Error(`Numéro de téléphone invalide: ${phone}. Longueur incorrecte`);
    }
    
    return cleaned;
  }

  /**
   * Crée une nouvelle session d'appel
   */
  async createCallSession(params: {
    sessionId: string;
    providerId: string;
    clientId: string;
    providerPhone: string;
    clientPhone: string;
    serviceType: 'lawyer_call' | 'expat_call';
    providerType: 'lawyer' | 'expat';
    paymentIntentId: string;
    amount: number;
  }): Promise<CallSessionState> {
    try {
      // Valider les numéros de téléphone
      const validProviderPhone = this.validatePhoneNumber(params.providerPhone);
      const validClientPhone = this.validatePhoneNumber(params.clientPhone);

      const maxDuration = params.providerType === 'lawyer' ? 1500 : 2100; // 25min ou 35min
      const conferenceName = `conf_${params.sessionId}`;

      const callSession: CallSessionState = {
        id: params.sessionId,
        status: 'pending',
        participants: {
          provider: {
            phone: validProviderPhone,
            status: 'pending'
          },
          client: {
            phone: validClientPhone,
            status: 'pending'
          }
        },
        conference: {
          name: conferenceName
        },
        payment: {
          intentId: params.paymentIntentId,
          status: 'authorized',
          amount: params.amount
        },
        metadata: {
          providerId: params.providerId,
          clientId: params.clientId,
          serviceType: params.serviceType,
          providerType: params.providerType,
          maxDuration,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        }
      };

      // Sauvegarder en base
      await this.db.collection('call_sessions').doc(params.sessionId).set(callSession);

      await logCallRecord({
        callId: params.sessionId,
        status: 'session_created',
        retryCount: 0
      });

      return callSession;
    } catch (error) {
      await logError('TwilioCallManager:createCallSession', error);
      throw error;
    }
  }

  /**
   * Lance la séquence d'appel avec conférence
   */
  async initiateCallSequence(sessionId: string, delayMinutes: number = 5): Promise<void> {
    try {
      // Attendre le délai spécifié
      await new Promise(resolve => setTimeout(resolve, delayMinutes * 60 * 1000));

      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        throw new Error(`Session d'appel non trouvée: ${sessionId}`);
      }

      await this.updateCallSessionStatus(sessionId, 'provider_connecting');

      // Étape 1: Appeler le prestataire (3 tentatives)
      const providerConnected = await this.callParticipantWithRetries(
        sessionId,
        'provider',
        callSession.participants.provider.phone,
        callSession.conference.name,
        callSession.metadata.maxDuration
      );

      if (!providerConnected) {
        await this.handleCallFailure(sessionId, 'provider_no_answer');
        return;
      }

      await this.updateCallSessionStatus(sessionId, 'client_connecting');

      // Étape 2: Appeler le client (3 tentatives)
      const clientConnected = await this.callParticipantWithRetries(
        sessionId,
        'client',
        callSession.participants.client.phone,
        callSession.conference.name,
        callSession.metadata.maxDuration
      );

      if (!clientConnected) {
        await this.handleCallFailure(sessionId, 'client_no_answer');
        return;
      }

      await this.updateCallSessionStatus(sessionId, 'both_connecting');
      
      await logCallRecord({
        callId: sessionId,
        status: 'both_participants_called',
        retryCount: 0
      });

    } catch (error) {
      await logError('TwilioCallManager:initiateCallSequence', error);
      await this.handleCallFailure(sessionId, 'system_error');
    }
  }

  /**
   * Appelle un participant avec gestion des tentatives
   */
  private async callParticipantWithRetries(
    sessionId: string,
    participantType: 'provider' | 'client',
    phoneNumber: string,
    conferenceName: string,
    timeLimit: number,
    maxRetries: number = 3
  ): Promise<boolean> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_attempt_${attempt}`,
          retryCount: attempt
        });

        const call = await this.twilioClient.calls.create({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER!,
          twiml: this.generateConferenceTwiML(
            conferenceName,
            participantType,
            timeLimit
          ),
          statusCallback: `${process.env.FUNCTION_URL}/twilioConferenceWebhook`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['ringing', 'answered', 'completed'],
          timeout: 20,
          record: true
        });

        // Mettre à jour avec le CallSid
        await this.updateParticipantCallSid(sessionId, participantType, call.sid);

        // Attendre un peu pour voir si l'appel aboutit
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 secondes

        // Vérifier le statut
        const updatedSession = await this.getCallSession(sessionId);
        const participant = updatedSession?.participants[participantType];
        
        if (participant?.status === 'connected') {
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_connected_attempt_${attempt}`,
            retryCount: attempt
          });
          return true;
        }

        // Si ce n'est pas la dernière tentative, attendre avant de réessayer
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 secondes entre les tentatives
        }

      } catch (error) {
        await logError(`TwilioCallManager:callParticipant:${participantType}:attempt_${attempt}`, error);
        
        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_error_attempt_${attempt}`,
          retryCount: attempt
        });
      }
    }

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_failed_all_attempts`,
      retryCount: maxRetries
    });

    return false;
  }

  /**
   * Génère le TwiML pour la conférence
   */
  private generateConferenceTwiML(
    conferenceName: string,
    participantType: 'provider' | 'client',
    timeLimit: number
  ): string {
    const welcomeMessage = participantType === 'provider' 
      ? "Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter."
      : "Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.";

    const participantLabel = participantType === 'provider' ? 'provider' : 'client';

    return `
      <Response>
        <Say voice="alice" language="fr-FR">${welcomeMessage}</Say>
        <Dial timeout="20" timeLimit="${timeLimit}">
          <Conference 
            statusCallback="${process.env.FUNCTION_URL}/twilioConferenceWebhook"
            statusCallbackMethod="POST"
            statusCallbackEvent="start end join leave mute hold"
            record="record-from-start"
            recordingStatusCallback="${process.env.FUNCTION_URL}/twilioRecordingWebhook"
            recordingStatusCallbackMethod="POST"
            participantLabel="${participantLabel}"
            waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient"
            maxParticipants="2"
            endConferenceOnExit="${participantType === 'provider'}"
          >
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>
    `.trim();
  }

  /**
   * Gère les échecs d'appel
   */
  private async handleCallFailure(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) return;

      // Mettre à jour le statut
      await this.updateCallSessionStatus(sessionId, 'failed');

      // Notifier les participants
      if (reason === 'provider_no_answer') {
        // Notifier le client que le prestataire n'a pas répondu
        await this.twilioClient.calls.create({
          to: callSession.participants.client.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          twiml: `<Response><Say voice="alice" language="fr-FR">Le prestataire n'a pas répondu. Vous ne serez pas débité. Merci pour votre compréhension.</Say></Response>`
        });
      } else if (reason === 'client_no_answer') {
        // Notifier le prestataire que le client n'a pas répondu
        await this.twilioClient.calls.create({
          to: callSession.participants.provider.phone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          twiml: `<Response><Say voice="alice" language="fr-FR">Le client n'a pas répondu. L'appel est annulé. Merci.</Say></Response>`
        });
      }

      // Rembourser le paiement
      await this.refundPayment(sessionId, reason);

      await logCallRecord({
        callId: sessionId,
        status: `call_failed_${reason}`,
        retryCount: 0
      });

    } catch (error) {
      await logError('TwilioCallManager:handleCallFailure', error);
    }
  }

  /**
   * Rembourse le paiement
   */
  private async refundPayment(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession?.payment.intentId) return;

      // Logique de remboursement Stripe (sera implémentée dans stripeManager)
      // Pour l'instant, on marque juste comme remboursé
      await this.db.collection('call_sessions').doc(sessionId).update({
        'payment.status': 'refunded',
        'payment.refundedAt': admin.firestore.Timestamp.now(),
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      });

      console.log(`Payment refunded for session ${sessionId}, reason: ${reason}`);
    } catch (error) {
      await logError('TwilioCallManager:refundPayment', error);
    }
  }

  /**
   * Met à jour le statut de la session
   */
  async updateCallSessionStatus(sessionId: string, status: CallSessionState['status']): Promise<void> {
    await this.db.collection('call_sessions').doc(sessionId).update({
      status,
      'metadata.updatedAt': admin.firestore.Timestamp.now()
    });
  }

  /**
   * Met à jour le CallSid d'un participant
   */
  async updateParticipantCallSid(sessionId: string, participantType: 'provider' | 'client', callSid: string): Promise<void> {
    await this.db.collection('call_sessions').doc(sessionId).update({
      [`participants.${participantType}.callSid`]: callSid,
      'metadata.updatedAt': admin.firestore.Timestamp.now()
    });
  }

  /**
   * Met à jour le statut d'un participant
   */
  async updateParticipantStatus(
    sessionId: string, 
    participantType: 'provider' | 'client', 
    status: CallSessionState['participants']['provider']['status'],
    timestamp?: admin.firestore.Timestamp
  ): Promise<void> {
    const updateData: any = {
      [`participants.${participantType}.status`]: status,
      'metadata.updatedAt': admin.firestore.Timestamp.now()
    };

    if (status === 'connected' && timestamp) {
      updateData[`participants.${participantType}.connectedAt`] = timestamp;
    } else if (status === 'disconnected' && timestamp) {
      updateData[`participants.${participantType}.disconnectedAt`] = timestamp;
    }

    await this.db.collection('call_sessions').doc(sessionId).update(updateData);
  }

  /**
   * Met à jour les informations de la conférence
   */
  async updateConferenceInfo(sessionId: string, updates: Partial<CallSessionState['conference']>): Promise<void> {
    const updateData: any = {
      'metadata.updatedAt': admin.firestore.Timestamp.now()
    };

    Object.entries(updates).forEach(([key, value]) => {
      updateData[`conference.${key}`] = value;
    });

    await this.db.collection('call_sessions').doc(sessionId).update(updateData);
  }

  /**
   * Récupère une session d'appel
   */
  async getCallSession(sessionId: string): Promise<CallSessionState | null> {
    try {
      const doc = await this.db.collection('call_sessions').doc(sessionId).get();
      return doc.exists ? doc.data() as CallSessionState : null;
    } catch (error) {
      await logError('TwilioCallManager:getCallSession', error);
      return null;
    }
  }

  /**
   * Trouve une session par conférence SID
   */
  async findSessionByConferenceSid(conferenceSid: string): Promise<CallSessionState | null> {
    try {
      const snapshot = await this.db.collection('call_sessions')
        .where('conference.sid', '==', conferenceSid)
        .limit(1)
        .get();

      return snapshot.empty ? null : snapshot.docs[0].data() as CallSessionState;
    } catch (error) {
      await logError('TwilioCallManager:findSessionByConferenceSid', error);
      return null;
    }
  }

  /**
   * Trouve une session par CallSid d'un participant
   */
  async findSessionByCallSid(callSid: string): Promise<{ session: CallSessionState; participantType: 'provider' | 'client' } | null> {
    try {
      // Chercher dans les CallSid des providers
      let snapshot = await this.db.collection('call_sessions')
        .where('participants.provider.callSid', '==', callSid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return {
          session: snapshot.docs[0].data() as CallSessionState,
          participantType: 'provider'
        };
      }

      // Chercher dans les CallSid des clients
      snapshot = await this.db.collection('call_sessions')
        .where('participants.client.callSid', '==', callSid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return {
          session: snapshot.docs[0].data() as CallSessionState,
          participantType: 'client'
        };
      }

      return null;
    } catch (error) {
      await logError('TwilioCallManager:findSessionByCallSid', error);
      return null;
    }
  }

  /**
   * Vérifie si l'appel doit être facturé
   */
  shouldCapturePayment(session: CallSessionState): boolean {
    const { provider, client } = session.participants;
    const { startedAt, duration } = session.conference;

    // Les deux participants doivent être connectés
    if (provider.status !== 'connected' || client.status !== 'connected') {
      return false;
    }

    // La conférence doit avoir commencé
    if (!startedAt) {
      return false;
    }

    // La durée doit être d'au moins 120 secondes (2 minutes)
    if (!duration || duration < 120) {
      return false;
    }

    // Le paiement ne doit pas déjà être capturé
    if (session.payment.status !== 'authorized') {
      return false;
    }

    return true;
  }

  /**
   * Capture le paiement pour une session
   */
  async capturePaymentForSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session || !this.shouldCapturePayment(session)) {
        return false;
      }

      // Marquer comme capturé (la logique Stripe sera dans stripeManager)
      await this.db.collection('call_sessions').doc(sessionId).update({
        'payment.status': 'captured',
        'payment.capturedAt': admin.firestore.Timestamp.now(),
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      });

      // Créer une demande d'avis
      await this.db.collection('reviews_requests').add({
        clientId: session.metadata.clientId,
        providerId: session.metadata.providerId,
        callSessionId: sessionId,
        callDuration: session.conference.duration,
        serviceType: session.metadata.serviceType,
        createdAt: admin.firestore.Timestamp.now(),
        status: 'pending'
      });

      await logCallRecord({
        callId: sessionId,
        status: 'payment_captured',
        retryCount: 0
      });

      console.log(`Payment captured for session ${sessionId}, duration: ${session.conference.duration}s`);
      return true;

    } catch (error) {
      await logError('TwilioCallManager:capturePaymentForSession', error);
      return false;
    }
  }
}

// Instance singleton
export const twilioCallManager = new TwilioCallManager();