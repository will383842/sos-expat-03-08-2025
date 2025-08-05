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
    // Valider l'environnement avant d'initialiser
    this.validateEnvironment();
    
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    this.db = admin.firestore();
  }

  /**
   * Valide que toutes les variables d'environnement requises sont présentes
   */
  private validateEnvironment(): void {
    const required = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'FUNCTION_URL'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
    }

    // Valider le format des URLs
    if (process.env.FUNCTION_URL && !process.env.FUNCTION_URL.startsWith('https://')) {
      throw new Error('FUNCTION_URL doit commencer par https://');
    }
  }

  /**
   * Valide et formate un numéro de téléphone avec support international amélioré
   */
  private validatePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Numéro de téléphone requis');
    }

    // Nettoyer le numéro (garder seulement chiffres et +)
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    
    // Vérifier le format international
    if (!cleaned.startsWith('+')) {
      throw new Error(`Numéro de téléphone invalide: ${phone}. Format requis: +33XXXXXXXXX`);
    }
    
    // Vérifier la longueur (support international étendu)
    const digits = cleaned.substring(1);
    if (digits.length < 8 || digits.length > 15) {
      throw new Error(`Numéro de téléphone invalide: ${phone}. Longueur incorrecte (8-15 chiffres après +)`);
    }

    // Valider les codes pays les plus courants
    const validCountryCodes = [
      '1',    // US/Canada
      '33',   // France
      '44',   // UK
      '49',   // Germany
      '34',   // Spain
      '39',   // Italy
      '32',   // Belgium
      '41',   // Switzerland
      '31',   // Netherlands
      '351',  // Portugal
      '352',  // Luxembourg
      '212',  // Morocco
      '213',  // Algeria
      '216',  // Tunisia
      '225',  // Côte d'Ivoire
      '221',  // Senegal
    ];

    const hasValidCountryCode = validCountryCodes.some(code => digits.startsWith(code));
    if (!hasValidCountryCode) {
      console.warn(`Code pays potentiellement non supporté pour: ${phone}`);
    }
    
    return cleaned;
  }

  /**
   * Crée une nouvelle session d'appel avec validation renforcée
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
      // Validation des paramètres
      if (!params.sessionId || !params.providerId || !params.clientId) {
        throw new Error('Paramètres requis manquants: sessionId, providerId, clientId');
      }

      if (!params.paymentIntentId || !params.amount || params.amount <= 0) {
        throw new Error('Informations de paiement invalides');
      }

      // Valider les numéros de téléphone
      const validProviderPhone = this.validatePhoneNumber(params.providerPhone);
      const validClientPhone = this.validatePhoneNumber(params.clientPhone);

      // Vérifier que les numéros sont différents
      if (validProviderPhone === validClientPhone) {
        throw new Error('Les numéros du prestataire et du client doivent être différents');
      }

      const maxDuration = params.providerType === 'lawyer' ? 1500 : 2100; // 25min ou 35min
      const conferenceName = `conf_${params.sessionId}_${Date.now()}`;

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

      // Vérifier si une session existe déjà
      const existingSession = await this.getCallSession(params.sessionId);
      if (existingSession) {
        throw new Error(`Session d'appel existe déjà: ${params.sessionId}`);
      }

      // Sauvegarder en base avec retry
      await this.saveWithRetry(() => 
        this.db.collection('call_sessions').doc(params.sessionId).set(callSession)
      );

      await logCallRecord({
        callId: params.sessionId,
        status: 'session_created',
        retryCount: 0
      });

      console.log(`✅ Session d'appel créée: ${params.sessionId}`);
      return callSession;

    } catch (error) {
      await logError('TwilioCallManager:createCallSession', error);
      throw error;
    }
  }

  /**
   * Lance la séquence d'appel avec conférence et gestion d'erreurs améliorée
   */
  async initiateCallSequence(sessionId: string, delayMinutes: number = 5): Promise<void> {
    try {
      console.log(`🚀 Initialisation séquence d'appel pour ${sessionId} dans ${delayMinutes} minutes`);

      // Attendre le délai spécifié (avec timeout maximum de 10 minutes)
      const maxDelay = Math.min(delayMinutes, 10);
      await this.delay(maxDelay * 60 * 1000);

      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        throw new Error(`Session d'appel non trouvée: ${sessionId}`);
      }

      // Vérifier que la session est toujours valide
      if (callSession.status === 'cancelled' || callSession.status === 'failed') {
        console.log(`Session ${sessionId} déjà ${callSession.status}, arrêt de la séquence`);
        return;
      }

      await this.updateCallSessionStatus(sessionId, 'provider_connecting');

      // Étape 1: Appeler le prestataire (3 tentatives)
      console.log(`📞 Étape 1: Appel du prestataire pour ${sessionId}`);
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
      console.log(`📞 Étape 2: Appel du client pour ${sessionId}`);
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

      console.log(`✅ Séquence d'appel complétée pour ${sessionId}`);

    } catch (error) {
      await logError('TwilioCallManager:initiateCallSequence', error);
      await this.handleCallFailure(sessionId, 'system_error');
    }
  }

  /**
   * Appelle un participant avec gestion robuste des tentatives
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
        console.log(`📞 Tentative ${attempt}/${maxRetries} pour ${participantType} - ${sessionId}`);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_attempt_${attempt}`,
          retryCount: attempt
        });

        // Créer l'appel avec timeout approprié
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
          statusCallbackEvent: ['ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
          timeout: 30, // Augmenté de 20 à 30 secondes
          record: true,
          recordingStatusCallback: `${process.env.FUNCTION_URL}/twilioRecordingWebhook`,
          recordingStatusCallbackMethod: 'POST'
        });

        console.log(`📞 Appel créé: ${call.sid} pour ${participantType}`);

        // Mettre à jour avec le CallSid
        await this.updateParticipantCallSid(sessionId, participantType, call.sid);

        // Attendre et vérifier le statut avec timeout
        const connected = await this.waitForConnection(sessionId, participantType, attempt);
        
        if (connected) {
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_connected_attempt_${attempt}`,
            retryCount: attempt
          });
          return true;
        }

        // Si ce n'est pas la dernière tentative, attendre avant de réessayer
        if (attempt < maxRetries) {
          console.log(`⏳ Attente avant nouvelle tentative pour ${participantType} - ${sessionId}`);
          await this.delay(15000); // 15 secondes entre les tentatives
        }

      } catch (error) {
        await logError(`TwilioCallManager:callParticipant:${participantType}:attempt_${attempt}`, error);
        
        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_error_attempt_${attempt}`,
          retryCount: attempt
        });

        // Si c'est la dernière tentative, ne pas attendre
        if (attempt === maxRetries) {
          break;
        }
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
   * Attend la connexion d'un participant avec timeout
   */
  private async waitForConnection(
    sessionId: string, 
    participantType: 'provider' | 'client', 
    attempt: number
  ): Promise<boolean> {
    const maxWaitTime = 45000; // 45 secondes
    const checkInterval = 3000; // Vérifier toutes les 3 secondes
    const maxChecks = Math.floor(maxWaitTime / checkInterval);

    for (let check = 0; check < maxChecks; check++) {
      await this.delay(checkInterval);

      try {
        const session = await this.getCallSession(sessionId);
        if (!session) {
          console.log(`❌ Session non trouvée pendant l'attente: ${sessionId}`);
          return false;
        }

        const participant = session.participants[participantType];
        
        if (participant.status === 'connected') {
          console.log(`✅ ${participantType} connecté après ${(check + 1) * checkInterval / 1000}s`);
          return true;
        }

        if (participant.status === 'disconnected' || participant.status === 'no_answer') {
          console.log(`❌ ${participantType} ${participant.status} après ${(check + 1) * checkInterval / 1000}s`);
          return false;
        }

      } catch (error) {
        console.warn(`Erreur lors de la vérification de connexion: ${error}`);
      }
    }

    console.log(`⏱️ Timeout atteint pour ${participantType} tentative ${attempt}`);
    return false;
  }

  /**
   * Génère le TwiML pour la conférence avec améliorations
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
        <Dial timeout="30" timeLimit="${timeLimit}">
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
            beep="false"
            startConferenceOnEnter="${participantType === 'provider'}"
          >
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>
    `.trim();
  }

  /**
   * Gère les échecs d'appel avec notifications améliorées
   */
  private async handleCallFailure(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.warn(`Session non trouvée pour handleCallFailure: ${sessionId}`);
        return;
      }

      // Mettre à jour le statut
      await this.updateCallSessionStatus(sessionId, 'failed');

      // Messages personnalisés selon la raison
      const messages = {
        provider_no_answer: {
          client: "Le prestataire n'a pas répondu à nos appels. Vous ne serez pas débité. Nous vous remboursons automatiquement.",
          provider: "Vous avez manqué un appel client SOS Expat. La session a été annulée. Pensez à être disponible pour vos prochains créneaux."
        },
        client_no_answer: {
          client: "Nous n'avons pas pu vous joindre après plusieurs tentatives. L'appel a été annulé et vous ne serez pas débité.",
          provider: "Le client n'a pas répondu à nos appels. L'appel est annulé. Vous serez payé pour votre disponibilité selon nos conditions."
        },
        system_error: {
          client: "Un problème technique a empêché l'établissement de l'appel. Vous ne serez pas débité. Notre équipe technique a été notifiée.",
          provider: "Un problème technique a empêché l'établissement de l'appel. Notre équipe technique a été notifiée. Merci pour votre compréhension."
        }
      };

      // Notifier les participants avec gestion d'erreurs
      try {
        if (reason === 'provider_no_answer' || reason === 'system_error') {
          await this.sendNotificationCall(
            callSession.participants.client.phone,
            messages[reason as keyof typeof messages].client
          );
        }

        if (reason === 'client_no_answer' || reason === 'system_error') {
          await this.sendNotificationCall(
            callSession.participants.provider.phone,
            messages[reason as keyof typeof messages].provider
          );
        }
      } catch (notificationError) {
        await logError('TwilioCallManager:handleCallFailure:notification', notificationError);
        // Ne pas faire échouer la fonction si les notifications échouent
      }

      // Rembourser le paiement
      await this.refundPayment(sessionId, reason);

      await logCallRecord({
        callId: sessionId,
        status: `call_failed_${reason}`,
        retryCount: 0
      });

      console.log(`❌ Appel échoué: ${sessionId}, raison: ${reason}`);

    } catch (error) {
      await logError('TwilioCallManager:handleCallFailure', error);
    }
  }

  /**
   * Gère la fin d'un appel avec notifications de succès
   */
  async handleCallCompletion(sessionId: string, duration: number): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.warn(`Session non trouvée pour completion: ${sessionId}`);
        return;
      }

      // Mettre à jour le statut
      await this.updateCallSessionStatus(sessionId, 'completed');

      // Messages de fin d'appel
      const completionMessages = {
        client: `Votre appel SOS Expat est terminé (${Math.floor(duration / 60)}min ${duration % 60}s). Merci ! Vous pouvez laisser un avis sur votre expérience.`,
        provider: `Appel client terminé avec succès (${Math.floor(duration / 60)}min ${duration % 60}s). Merci pour votre service ! Le paiement sera traité sous 24h.`
      };

      // Envoyer les notifications de fin
      try {
        await Promise.all([
          this.sendNotificationCall(
            callSession.participants.client.phone,
            completionMessages.client
          ),
          this.sendNotificationCall(
            callSession.participants.provider.phone,
            completionMessages.provider
          )
        ]);
      } catch (notificationError) {
        await logError('TwilioCallManager:handleCallCompletion:notification', notificationError);
        // Continuer même si les notifications échouent
      }

      // Capturer le paiement si éligible
      if (this.shouldCapturePayment(callSession)) {
        await this.capturePaymentForSession(sessionId);
      }

      await logCallRecord({
        callId: sessionId,
        status: 'call_completed_success',
        retryCount: 0,
        additionalData: { duration }
      });

      console.log(`✅ Appel complété avec succès: ${sessionId}, durée: ${duration}s`);

    } catch (error) {
      await logError('TwilioCallManager:handleCallCompletion', error);
    }
  }

  /**
   * Gère les déconnexions précoces
   */
  async handleEarlyDisconnection(sessionId: string, disconnectedParticipant: 'provider' | 'client', duration: number): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.warn(`Session non trouvée pour early disconnection: ${sessionId}`);
        return;
      }

      const isEarlyDisconnection = duration < 120; // Moins de 2 minutes
      const otherParticipant = disconnectedParticipant === 'provider' ? 'client' : 'provider';

      // Messages selon qui a raccroché et la durée
      let messages = {
        disconnected: '',
        other: ''
      };

      if (isEarlyDisconnection) {
        if (disconnectedParticipant === 'provider') {
          messages = {
            disconnected: `Votre appel s'est terminé prématurément (${duration}s). Si c'était involontaire, vous pouvez contacter le support.`,
            other: `Le prestataire s'est déconnecté après ${duration} secondes. Vous ne serez pas facturé. Vous pouvez demander un autre expert.`
          };
        } else {
          messages = {
            disconnected: `Votre appel s'est terminé prématurément (${duration}s). Si c'était involontaire, vous pouvez nous contacter.`,
            other: `Le client s'est déconnecté après ${duration} secondes. Vous recevrez une compensation minimale pour votre temps.`
          };
        }

        // Remboursement automatique pour déconnexion précoce
        await this.refundPayment(sessionId, `early_disconnection_${disconnectedParticipant}`);
      } else {
        // Déconnexion normale après plus de 2 minutes
        if (disconnectedParticipant === 'provider') {
          messages = {
            disconnected: `Votre appel s'est terminé (${Math.floor(duration / 60)}min ${duration % 60}s). Merci pour votre service !`,
            other: `Votre appel s'est terminé (${Math.floor(duration / 60)}min ${duration % 60}s). Merci ! Vous pouvez laisser un avis.`
          };
        } else {
          messages = {
            disconnected: `Votre appel s'est terminé (${Math.floor(duration / 60)}min ${duration % 60}s). Merci ! Vous pouvez laisser un avis.`,
            other: `Appel terminé par le client (${Math.floor(duration / 60)}min ${duration % 60}s). Merci pour votre service !`
          };
        }

        // Capturer le paiement pour un appel normal
        if (this.shouldCapturePayment(callSession)) {
          await this.capturePaymentForSession(sessionId);
        }
      }

      // Envoyer les notifications
      try {
        const disconnectedPhone = callSession.participants[disconnectedParticipant].phone;
        const otherPhone = callSession.participants[otherParticipant].phone;

        await Promise.all([
          this.sendNotificationCall(disconnectedPhone, messages.disconnected),
          this.sendNotificationCall(otherPhone, messages.other)
        ]);
      } catch (notificationError) {
        await logError('TwilioCallManager:handleEarlyDisconnection:notification', notificationError);
      }

      // Mettre à jour le statut selon la durée
      const finalStatus = isEarlyDisconnection ? 'failed' : 'completed';
      await this.updateCallSessionStatus(sessionId, finalStatus);

      await logCallRecord({
        callId: sessionId,
        status: `${disconnectedParticipant}_disconnected_${isEarlyDisconnection ? 'early' : 'normal'}`,
        retryCount: 0,
        additionalData: { duration, disconnectedParticipant }
      });

      console.log(`📞 Déconnexion ${isEarlyDisconnection ? 'précoce' : 'normale'}: ${sessionId}, ${disconnectedParticipant}, ${duration}s`);

    } catch (error) {
      await logError('TwilioCallManager:handleEarlyDisconnection', error);
    }
  }

  /**
   * Gère les problèmes de paiement pendant l'appel
   */
  async handlePaymentIssue(sessionId: string, issueType: 'authorization_expired' | 'capture_failed' | 'insufficient_funds'): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.warn(`Session non trouvée pour payment issue: ${sessionId}`);
        return;
      }

      const paymentMessages = {
        authorization_expired: {
          client: "Votre autorisation de paiement a expiré pendant l'appel. Veuillez mettre à jour votre mode de paiement.",
          provider: "Un problème d'autorisation de paiement est survenu. Le client va être contacté pour régulariser."
        },
        capture_failed: {
          client: "Un problème est survenu lors du traitement de votre paiement. Notre équipe va vous contacter sous 24h.",
          provider: "Un problème de capture de paiement est survenu. Notre équipe finance va traiter votre rémunération manuellement."
        },
        insufficient_funds: {
          client: "Fonds insuffisants détectés. Veuillez mettre à jour votre mode de paiement pour éviter ce problème.",
          provider: "Un problème de fonds insuffisants du client a été détecté. Votre paiement sera traité par notre équipe finance."
        }
      };

      // Notifier les deux parties
      try {
        await Promise.all([
          this.sendNotificationCall(
            callSession.participants.client.phone,
            paymentMessages[issueType].client
          ),
          this.sendNotificationCall(
            callSession.participants.provider.phone,
            paymentMessages[issueType].provider
          )
        ]);
      } catch (notificationError) {
        await logError('TwilioCallManager:handlePaymentIssue:notification', notificationError);
      }

      // Marquer le paiement comme problématique
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'failed',
          'payment.failureReason': issueType,
          'payment.failedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );

      // Créer un ticket pour l'équipe finance
      await this.createFinanceTicket(sessionId, issueType, callSession);

      await logCallRecord({
        callId: sessionId,
        status: `payment_issue_${issueType}`,
        retryCount: 0
      });

      console.log(`💳 Problème de paiement: ${sessionId}, type: ${issueType}`);

    } catch (error) {
      await logError('TwilioCallManager:handlePaymentIssue', error);
    }
  }

  /**
   * Crée un ticket pour l'équipe finance
   */
  private async createFinanceTicket(sessionId: string, issueType: string, session: CallSessionState): Promise<void> {
    try {
      const ticket = {
        type: 'payment_issue',
        callSessionId: sessionId,
        issueType,
        amount: session.payment.amount,
        clientId: session.metadata.clientId,
        providerId: session.metadata.providerId,
        paymentIntentId: session.payment.intentId,
        callDuration: session.conference.duration || 0,
        priority: issueType === 'insufficient_funds' ? 'high' : 'medium',
        status: 'pending',
        createdAt: admin.firestore.Timestamp.now(),
        assignedTo: null
      };

      await this.saveWithRetry(() =>
        this.db.collection('finance_tickets').add(ticket)
      );

      console.log(`🎫 Ticket finance créé pour: ${sessionId}`);

    } catch (error) {
      await logError('TwilioCallManager:createFinanceTicket', error);
    }
  }

  /**
   * Envoie un appel de notification
   */
  private async sendNotificationCall(phoneNumber: string, message: string): Promise<void> {
    try {
      await this.twilioClient.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        twiml: `<Response><Say voice="alice" language="fr-FR">${message}</Say></Response>`,
        timeout: 20
      });
    } catch (error) {
      console.warn(`Échec notification call vers ${phoneNumber}:`, error);
      // Essayer SMS en fallback
      try {
        await this.twilioClient.messages.create({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: message
        });
      } catch (smsError) {
        console.warn(`Échec SMS fallback vers ${phoneNumber}:`, smsError);
      }
    }
  }

  /**
   * Rembourse le paiement avec gestion d'erreurs
   */
  private async refundPayment(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession?.payment.intentId) {
        console.warn(`Pas de paiement à rembourser pour ${sessionId}`);
        return;
      }

      // Marquer comme remboursé (la logique Stripe sera dans StripeManager)
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'refunded',
          'payment.refundedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );

      console.log(`💰 Paiement marqué pour remboursement: ${sessionId}, raison: ${reason}`);

    } catch (error) {
      await logError('TwilioCallManager:refundPayment', error);
    }
  }

  /**
   * Utilitaire pour créer un délai avec Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sauvegarde avec retry en cas d'échec
   */
  private async saveWithRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`Tentative ${attempt}/${maxRetries} échouée, retry dans ${baseDelay * attempt}ms`);
        await this.delay(baseDelay * attempt);
      }
    }
    throw new Error('Impossible d\'atteindre cette ligne');
  }

  // =====================================================
  // Méthodes existantes avec améliorations mineures
  // =====================================================

  /**
   * Met à jour le statut de la session
   */
  async updateCallSessionStatus(sessionId: string, status: CallSessionState['status']): Promise<void> {
    try {
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          status,
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );
    } catch (error) {
      await logError('TwilioCallManager:updateCallSessionStatus', error);
      throw error;
    }
  }

  /**
   * Met à jour le CallSid d'un participant
   */
  async updateParticipantCallSid(sessionId: string, participantType: 'provider' | 'client', callSid: string): Promise<void> {
    try {
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          [`participants.${participantType}.callSid`]: callSid,
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );
    } catch (error) {
      await logError('TwilioCallManager:updateParticipantCallSid', error);
      throw error;
    }
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
    try {
      const updateData: any = {
        [`participants.${participantType}.status`]: status,
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      };

      if (status === 'connected' && timestamp) {
        updateData[`participants.${participantType}.connectedAt`] = timestamp;
      } else if (status === 'disconnected' && timestamp) {
        updateData[`participants.${participantType}.disconnectedAt`] = timestamp;
      }

      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update(updateData)
      );
    } catch (error) {
      await logError('TwilioCallManager:updateParticipantStatus', error);
      throw error;
    }
  }

  /**
   * Met à jour les informations de la conférence
   */
  async updateConferenceInfo(sessionId: string, updates: Partial<CallSessionState['conference']>): Promise<void> {
    try {
      const updateData: any = {
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      };

      Object.entries(updates).forEach(([key, value]) => {
        updateData[`conference.${key}`] = value;
      });

      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update(updateData)
      );
    } catch (error) {
      await logError('TwilioCallManager:updateConferenceInfo', error);
      throw error;
    }
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
   * Vérifie si l'appel doit être facturé avec critères stricts
   */
  shouldCapturePayment(session: CallSessionState): boolean {
    const { provider, client } = session.participants;
    const { startedAt, duration } = session.conference;

    // Les deux participants doivent être connectés
    if (provider.status !== 'connected' || client.status !== 'connected') {
      console.log(`Paiement non capturé: participants non connectés (P:${provider.status}, C:${client.status})`);
      return false;
    }

    // La conférence doit avoir commencé
    if (!startedAt) {
      console.log('Paiement non capturé: conférence non démarrée');
      return false;
    }

    // La durée doit être d'au moins 120 secondes (2 minutes)
    if (!duration || duration < 120) {
      console.log(`Paiement non capturé: durée insuffisante (${duration}s < 120s)`);
      return false;
    }

    // Le paiement ne doit pas déjà être capturé
    if (session.payment.status !== 'authorized') {
      console.log(`Paiement non capturé: statut incorrect (${session.payment.status})`);
      return false;
    }

    return true;
  }

  /**
   * Capture le paiement pour une session avec validation renforcée
   */
  async capturePaymentForSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) {
        console.warn(`Session non trouvée pour capture paiement: ${sessionId}`);
        return false;
      }

      if (!this.shouldCapturePayment(session)) {
        console.log(`Conditions non remplies pour capture paiement: ${sessionId}`);
        return false;
      }

      // Double vérification de sécurité
      if (session.payment.status === 'captured') {
        console.warn(`Paiement déjà capturé pour: ${sessionId}`);
        return true;
      }

      // Marquer comme capturé (la logique Stripe sera dans StripeManager)
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'captured',
          'payment.capturedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );

      // Créer une demande d'avis avec données complètes
      await this.createReviewRequest(session);

      await logCallRecord({
        callId: sessionId,
        status: 'payment_captured',
        retryCount: 0,
        additionalData: {
          amount: session.payment.amount,
          duration: session.conference.duration
        }
      });

      console.log(`💰 Paiement capturé: ${sessionId}, durée: ${session.conference.duration}s, montant: ${session.payment.amount}`);
      return true;

    } catch (error) {
      await logError('TwilioCallManager:capturePaymentForSession', error);
      return false;
    }
  }

  /**
   * Crée une demande d'avis après un appel réussi
   */
  private async createReviewRequest(session: CallSessionState): Promise<void> {
    try {
      const reviewRequest = {
        clientId: session.metadata.clientId,
        providerId: session.metadata.providerId,
        callSessionId: session.id,
        callDuration: session.conference.duration || 0,
        serviceType: session.metadata.serviceType,
        providerType: session.metadata.providerType,
        callAmount: session.payment.amount,
        createdAt: admin.firestore.Timestamp.now(),
        status: 'pending',
        // Données additionnelles pour l'analyse
        callStartedAt: session.conference.startedAt,
        callEndedAt: session.conference.endedAt,
        bothConnected: session.participants.provider.status === 'connected' && 
                      session.participants.client.status === 'connected'
      };

      await this.saveWithRetry(() =>
        this.db.collection('reviews_requests').add(reviewRequest)
      );

      console.log(`📝 Demande d'avis créée pour: ${session.id}`);

    } catch (error) {
      await logError('TwilioCallManager:createReviewRequest', error);
      // Ne pas faire échouer la capture de paiement si la création d'avis échoue
    }
  }

  /**
   * Annule une session d'appel avec nettoyage complet
   */
  async cancelCallSession(sessionId: string, reason: string, cancelledBy?: string): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) {
        console.warn(`Session non trouvée pour annulation: ${sessionId}`);
        return false;
      }

      // Vérifier si l'annulation est possible
      const cancellableStatuses = ['pending', 'provider_connecting', 'client_connecting'];
      if (!cancellableStatuses.includes(session.status)) {
        console.warn(`Session ${sessionId} ne peut pas être annulée (statut: ${session.status})`);
        return false;
      }

      // Annuler les appels en cours si ils existent
      await this.cancelActiveCallsForSession(session);

      // Mettre à jour le statut
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          status: 'cancelled',
          'metadata.updatedAt': admin.firestore.Timestamp.now(),
          cancelledAt: admin.firestore.Timestamp.now(),
          cancelledBy: cancelledBy || 'system',
          cancellationReason: reason
        })
      );

      // Rembourser automatiquement
      await this.refundPayment(sessionId, `cancelled_${reason}`);

      await logCallRecord({
        callId: sessionId,
        status: `cancelled_${reason}`,
        retryCount: 0,
        additionalData: {
          cancelledBy: cancelledBy || 'system'
        }
      });

      console.log(`🚫 Session annulée: ${sessionId}, raison: ${reason}`);
      return true;

    } catch (error) {
      await logError('TwilioCallManager:cancelCallSession', error);
      return false;
    }
  }

  /**
   * Annule les appels actifs pour une session
   */
  private async cancelActiveCallsForSession(session: CallSessionState): Promise<void> {
    const callsToCancel = [];

    if (session.participants.provider.callSid) {
      callsToCancel.push({
        sid: session.participants.provider.callSid,
        type: 'provider'
      });
    }

    if (session.participants.client.callSid) {
      callsToCancel.push({
        sid: session.participants.client.callSid,
        type: 'client'
      });
    }

    for (const call of callsToCancel) {
      try {
        await this.twilioClient.calls(call.sid).update({ status: 'completed' });
        console.log(`📞 Appel ${call.type} annulé: ${call.sid}`);
      } catch (error) {
        console.warn(`Échec annulation appel ${call.type} ${call.sid}:`, error);
        // Continuer même si l'annulation échoue
      }
    }
  }

  /**
   * Obtient des statistiques détaillées sur les appels
   */
  async getCallStatistics(options: {
    startDate?: admin.firestore.Timestamp;
    endDate?: admin.firestore.Timestamp;
    providerType?: 'lawyer' | 'expat';
    serviceType?: 'lawyer_call' | 'expat_call';
  } = {}): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageDuration: number;
    successRate: number;
    totalRevenue: number;
    averageRevenue: number;
    providerStats: Record<string, number>;
    failureReasons: Record<string, number>;
  }> {
    try {
      let query = this.db.collection('call_sessions') as any;

      // Appliquer les filtres
      if (options.startDate) {
        query = query.where('metadata.createdAt', '>=', options.startDate);
      }
      if (options.endDate) {
        query = query.where('metadata.createdAt', '<=', options.endDate);
      }
      if (options.providerType) {
        query = query.where('metadata.providerType', '==', options.providerType);
      }
      if (options.serviceType) {
        query = query.where('metadata.serviceType', '==', options.serviceType);
      }

      const snapshot = await query.get();

      const stats = {
        total: snapshot.size,
        pending: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        averageDuration: 0,
        successRate: 0,
        totalRevenue: 0,
        averageRevenue: 0,
        providerStats: {} as Record<string, number>,
        failureReasons: {} as Record<string, number>
      };

      let totalDuration = 0;
      let completedWithDuration = 0;
      let totalCapturedAmount = 0;
      let capturedPayments = 0;

      snapshot.docs.forEach(doc => {
        const session = doc.data() as CallSessionState;
        
        // Compter par statut
        switch (session.status) {
          case 'pending':
          case 'provider_connecting':
          case 'client_connecting':
          case 'both_connecting':
          case 'active':
            stats.pending++;
            break;
          case 'completed':
            stats.completed++;
            if (session.conference.duration) {
              totalDuration += session.conference.duration;
              completedWithDuration++;
            }
            break;
          case 'failed':
            stats.failed++;
            // Analyser les raisons d'échec (à partir des logs)
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
        }

        // Statistiques financières
        if (session.payment.status === 'captured') {
          totalCapturedAmount += session.payment.amount;
          capturedPayments++;
        }

        // Statistiques par prestataire
        const providerId = session.metadata.providerId;
        stats.providerStats[providerId] = (stats.providerStats[providerId] || 0) + 1;
      });

      // Calculer les moyennes
      stats.averageDuration = completedWithDuration > 0 ? totalDuration / completedWithDuration : 0;
      stats.successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
      stats.totalRevenue = totalCapturedAmount;
      stats.averageRevenue = capturedPayments > 0 ? totalCapturedAmount / capturedPayments : 0;

      return stats;

    } catch (error) {
      await logError('TwilioCallManager:getCallStatistics', error);
      throw error;
    }
}
      public async cancelCallSession(sessionId: string): Promise<void> {
    const sessionRef = admin.firestore().collection('call_sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new Error(`Aucune session trouvée avec l'ID : ${sessionId}`);
    }

    await sessionRef.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Session ${sessionId} annulée avec succès.`);
  }

  

  /**
   * Nettoie les sessions anciennes selon les critères de rétention
   */
  async cleanupOldSessions(options: {
    olderThanDays?: number;
    keepCompletedDays?: number;
    batchSize?: number;
  } = {}): Promise<{
    deleted: number;
    errors: number;
  }> {
    const {
      olderThanDays = 90,      // Supprimer après 90 jours par défaut
      keepCompletedDays = 30,   // Garder les complétés 30 jours
      batchSize = 50           // Traiter par batch de 50
    } = options;

    try {
      const now = admin.firestore.Timestamp.now();
      const generalCutoff = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (olderThanDays * 24 * 60 * 60 * 1000)
      );
      const completedCutoff = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (keepCompletedDays * 24 * 60 * 60 * 1000)
      );

      let deleted = 0;
      let errors = 0;

      // Supprimer les sessions échouées/annulées anciennes
      const failedQuery = this.db.collection('call_sessions')
        .where('metadata.createdAt', '<=', generalCutoff)
        .where('status', 'in', ['failed', 'cancelled'])
        .limit(batchSize);

      const failedSnapshot = await failedQuery.get();
      
      if (!failedSnapshot.empty) {
        const batch = this.db.batch();
        failedSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        try {
          await batch.commit();
          deleted += failedSnapshot.size;
          console.log(`🗑️ Supprimé ${failedSnapshot.size} sessions échouées/annulées`);
        } catch (error) {
          errors += failedSnapshot.size;
          await logError('TwilioCallManager:cleanupOldSessions:failed', error);
        }
      }

      // Supprimer les sessions complétées très anciennes
      const completedQuery = this.db.collection('call_sessions')
        .where('metadata.createdAt', '<=', completedCutoff)
        .where('status', '==', 'completed')
        .limit(batchSize);

      const completedSnapshot = await completedQuery.get();
      
      if (!completedSnapshot.empty) {
        const batch = this.db.batch();
        completedSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        try {
          await batch.commit();
          deleted += completedSnapshot.size;
          console.log(`🗑️ Supprimé ${completedSnapshot.size} sessions complétées anciennes`);
        } catch (error) {
          errors += completedSnapshot.size;
          await logError('TwilioCallManager:cleanupOldSessions:completed', error);
        }
      }

      console.log(`✅ Nettoyage terminé: ${deleted} supprimées, ${errors} erreurs`);
      return { deleted, errors };

    } catch (error) {
      await logError('TwilioCallManager:cleanupOldSessions', error);
      return { deleted: 0, errors: 1 };
    }
  }

  /**
   * Récupère les sessions en attente (pour recovery après redémarrage)
   */
  async getPendingSessions(): Promise<CallSessionState[]> {
    try {
      const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - (5 * 60 * 1000)
      );

      const snapshot = await this.db.collection('call_sessions')
        .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
        .where('metadata.createdAt', '<=', fiveMinutesAgo)
        .orderBy('metadata.createdAt', 'desc')
        .limit(100)
        .get();

      return snapshot.docs.map(doc => doc.data() as CallSessionState);

    } catch (error) {
      await logError('TwilioCallManager:getPendingSessions', error);
      return [];
    }
  }

  /**
   * Valide l'intégrité d'une session
   */
  validateSessionIntegrity(session: CallSessionState): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Vérifications de base
    if (!session.id) issues.push('ID de session manquant');
    if (!session.metadata.providerId) issues.push('ID prestataire manquant');
    if (!session.metadata.clientId) issues.push('ID client manquant');
    if (!session.payment.intentId) issues.push('ID intention de paiement manquant');

    // Vérifications téléphones
    try {
      this.validatePhoneNumber(session.participants.provider.phone);
    } catch (error) {
      issues.push(`Téléphone prestataire invalide: ${error}`);
    }

    try {
      this.validatePhoneNumber(session.participants.client.phone);
    } catch (error) {
      issues.push(`Téléphone client invalide: ${error}`);
    }

    // Vérifications logiques
    if (session.participants.provider.phone === session.participants.client.phone) {
      issues.push('Téléphones prestataire et client identiques');
    }

    if (session.payment.amount <= 0) {
      issues.push('Montant de paiement invalide');
    }

    if (session.metadata.maxDuration <= 0) {
      issues.push('Durée maximale invalide');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// Instance singleton avec gestion d'erreur d'initialisation
let twilioCallManagerInstance: TwilioCallManager | null = null;

export const twilioCallManager = (() => {
  if (!twilioCallManagerInstance) {
    try {
      twilioCallManagerInstance = new TwilioCallManager();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de TwilioCallManager:', error);
      throw error;
    }
  }
  return twilioCallManagerInstance;
})();