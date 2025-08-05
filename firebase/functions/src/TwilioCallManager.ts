import * as admin from 'firebase-admin';
// 🔧 CHANGEMENT : Import conditionnel de Twilio
import type { Twilio } from 'twilio'; // Type seulement
import { logError } from './utils/logs/logError';
import { logCallRecord } from './utils/logs/logCallRecord';
import { messageManager } from './MessageManager';
import { stripeManager } from './StripeManager';

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
      attemptCount: number;
    };
    client: {
      phone: string;
      status: 'pending' | 'ringing' | 'connected' | 'disconnected' | 'no_answer';
      callSid?: string;
      connectedAt?: admin.firestore.Timestamp;
      disconnectedAt?: admin.firestore.Timestamp;
      attemptCount: number;
    };
  };
  conference: {
    sid?: string;
    name: string;
    startedAt?: admin.firestore.Timestamp;
    endedAt?: admin.firestore.Timestamp;
    duration?: number;
    recordingUrl?: string;
    recordingSid?: string;
  };
  payment: {
    intentId: string;
    status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
    amount: number;
    capturedAt?: admin.firestore.Timestamp;
    refundedAt?: admin.firestore.Timestamp;
    failureReason?: string;
  };
  metadata: {
    providerId: string;
    clientId: string;
    serviceType: 'lawyer_call' | 'expat_call';
    providerType: 'lawyer' | 'expat';
    maxDuration: number;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
    requestId?: string;
    clientLanguages?: string[];
    providerLanguages?: string[];
  };
}

// Configuration sécurisée pour la production
const CALL_CONFIG = {
  MAX_RETRIES: 3,
  CALL_TIMEOUT: 30,
  CONNECTION_WAIT_TIME: 45000, // 45 secondes
  MIN_CALL_DURATION: 120, // 2 minutes pour considérer comme succès
  MAX_CONCURRENT_CALLS: 50,
  WEBHOOK_VALIDATION: true,
} as const;

export class TwilioCallManager {
  private twilioClient: Twilio | null = null; // 🔧 CHANGEMENT : Nullable
  private db: admin.firestore.Firestore;
  private activeCalls = new Map<string, NodeJS.Timeout>();
  private callQueue: string[] = [];
  private isProcessingQueue = false;

  constructor() {
    // 🔧 CHANGEMENT : Ne plus valider/initialiser Twilio ici
    this.db = admin.firestore();

    // Démarrer le processeur de queue
    this.startQueueProcessor();
  }

  /**
   * 🔧 NOUVEAU : Initialisation lazy de Twilio
   */
  private async initializeTwilio(): Promise<Twilio> {
    if (this.twilioClient) {
      return this.twilioClient;
    }

    // Valider l'environnement au moment de l'utilisation
    this.validateEnvironment();

    try {
      // 🔧 CHANGEMENT : Import dynamique de Twilio
      const twilioModule = await import('twilio');
      const twilio = twilioModule.default;
      
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      console.log('✅ Twilio client initialisé avec succès');
      return this.twilioClient;

    } catch (error) {
      await logError('TwilioCallManager:initializeTwilio', error);
      throw new Error('Impossible d\'initialiser Twilio');
    }
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
      throw new Error(`Variables d'environnement Twilio manquantes: ${missing.join(', ')}`);
    }

    // Valider le format des URLs et numéros
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER!;
    if (!phoneNumber.startsWith('+') || phoneNumber.length < 10) {
      throw new Error('TWILIO_PHONE_NUMBER doit être au format international (+33...)');
    }

    const functionUrl = process.env.FUNCTION_URL!;
    if (!functionUrl.startsWith('https://')) {
      throw new Error('FUNCTION_URL doit commencer par https://');
    }
  }

  /**
   * Démarrer le processeur de queue pour gérer les appels en file d'attente
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.callQueue.length > 0) {
        this.isProcessingQueue = true;
        try {
          const sessionId = this.callQueue.shift();
          if (sessionId) {
            await this.processQueuedCall(sessionId);
          }
        } catch (error) {
          await logError('TwilioCallManager:queueProcessor', error);
        } finally {
          this.isProcessingQueue = false;
        }
      }
    }, 2000); // Vérifier toutes les 2 secondes
  }

  /**
   * Traiter un appel en file d'attente
   */
  private async processQueuedCall(sessionId: string): Promise<void> {
    try {
      const session = await this.getCallSession(sessionId);
      if (session && session.status === 'pending') {
        await this.initiateCallSequence(sessionId, 0); // Démarrer immédiatement
      }
    } catch (error) {
      await logError('TwilioCallManager:processQueuedCall', error);
    }
  }

  /**
   * Valide et formate un numéro de téléphone avec support international étendu
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

    // Validation renforcée des codes pays
    const validCountryCodes = [
      '1', '33', '44', '49', '34', '39', '32', '41', '31', '351', '352',
      '212', '213', '216', '225', '221', '223', '224', '226', '227', '228',
      '229', '230', '231', '232', '233', '234', '235', '236', '237', '238'
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
    requestId?: string;
    clientLanguages?: string[];
    providerLanguages?: string[];
  }): Promise<CallSessionState> {
    try {
      // Validation des paramètres obligatoires
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

      // Vérifier les limites de concurrence
      const activeSessions = await this.getActiveSessionsCount();
      if (activeSessions >= CALL_CONFIG.MAX_CONCURRENT_CALLS) {
        throw new Error('Limite d\'appels simultanés atteinte. Veuillez réessayer dans quelques minutes.');
      }

      const maxDuration = params.providerType === 'lawyer' ? 1500 : 2100; // 25min ou 35min
      const conferenceName = `conf_${params.sessionId}_${Date.now()}`;

      const callSession: CallSessionState = {
        id: params.sessionId,
        status: 'pending',
        participants: {
          provider: {
            phone: validProviderPhone,
            status: 'pending',
            attemptCount: 0
          },
          client: {
            phone: validClientPhone,
            status: 'pending',
            attemptCount: 0
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
          updatedAt: admin.firestore.Timestamp.now(),
          requestId: params.requestId,
          clientLanguages: params.clientLanguages || ['fr'],
          providerLanguages: params.providerLanguages || ['fr']
        }
      };

      // Vérifier si une session existe déjà
      const existingSession = await this.getCallSession(params.sessionId);
      if (existingSession) {
        throw new Error(`Session d'appel existe déjà: ${params.sessionId}`);
      }

      // Sauvegarder avec retry automatique
      await this.saveWithRetry(() => 
        this.db.collection('call_sessions').doc(params.sessionId).set(callSession)
      );

      await logCallRecord({
        callId: params.sessionId,
        status: 'session_created',
        retryCount: 0,
        additionalData: {
          serviceType: params.serviceType,
          amount: params.amount,
          requestId: params.requestId
        }
      });

      console.log(`✅ Session d'appel créée: ${params.sessionId}`);
      return callSession;

    } catch (error) {
      await logError('TwilioCallManager:createCallSession', error);
      throw error;
    }
  }

  /**
   * Lance la séquence d'appel avec gestion robuste des erreurs et queue
   */
  async initiateCallSequence(sessionId: string, delayMinutes: number = 5): Promise<void> {
    try {
      console.log(`🚀 Initialisation séquence d'appel pour ${sessionId} dans ${delayMinutes} minutes`);

      // Si délai, programmer l'exécution
      if (delayMinutes > 0) {
        const timeout = setTimeout(async () => {
          this.activeCalls.delete(sessionId);
          await this.executeCallSequence(sessionId);
        }, Math.min(delayMinutes, 10) * 60 * 1000); // Max 10 minutes

        this.activeCalls.set(sessionId, timeout);
        return;
      }

      // Exécution immédiate
      await this.executeCallSequence(sessionId);

    } catch (error) {
      await logError('TwilioCallManager:initiateCallSequence', error);
      await this.handleCallFailure(sessionId, 'system_error');
    }
  }

  /**
   * Exécute la séquence d'appel réelle
   */
  private async executeCallSequence(sessionId: string): Promise<void> {
    const callSession = await this.getCallSession(sessionId);
    if (!callSession) {
      throw new Error(`Session d'appel non trouvée: ${sessionId}`);
    }

    // Vérifier que la session est toujours valide
    if (callSession.status === 'cancelled' || callSession.status === 'failed') {
      console.log(`Session ${sessionId} déjà ${callSession.status}, arrêt de la séquence`);
      return;
    }

    // Vérifier que le paiement est toujours valide
    const paymentValid = await this.validatePaymentStatus(callSession.payment.intentId);
    if (!paymentValid) {
      await this.handleCallFailure(sessionId, 'payment_invalid');
      return;
    }

    await this.updateCallSessionStatus(sessionId, 'provider_connecting');

    // Étape 1: Appeler le prestataire (3 tentatives max)
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

    // Étape 2: Appeler le client (3 tentatives max)
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
  }

  /**
   * Valide le statut du paiement avant de commencer l'appel
   */
  private async validatePaymentStatus(paymentIntentId: string): Promise<boolean> {
    try {
      const payment = await stripeManager.getPayment(paymentIntentId);
      if (!payment || !payment.stripe) {
        return false;
      }

      const validStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'succeeded'];
      return validStatuses.includes(payment.stripe.status);

    } catch (error) {
      await logError('TwilioCallManager:validatePaymentStatus', error);
      return false;
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
    maxRetries: number = CALL_CONFIG.MAX_RETRIES
  ): Promise<boolean> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📞 Tentative ${attempt}/${maxRetries} pour ${participantType} - ${sessionId}`);

        // 🔧 CHANGEMENT : Initialiser Twilio ici
        const twilioClient = await this.initializeTwilio();

        // Incrémenter le compteur de tentatives
        await this.incrementAttemptCount(sessionId, participantType);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_attempt_${attempt}`,
          retryCount: attempt
        });

        // Créer l'appel avec configuration optimisée
        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER!,
          twiml: this.generateConferenceTwiML(
            conferenceName,
            participantType,
            timeLimit,
            sessionId
          ),
          statusCallback: `${process.env.FUNCTION_URL}/twilioConferenceWebhook`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
          timeout: CALL_CONFIG.CALL_TIMEOUT,
          record: true,
          recordingStatusCallback: `${process.env.FUNCTION_URL}/twilioRecordingWebhook`,
          recordingStatusCallbackMethod: 'POST',
          machineDetection: 'Enable', // Détection répondeur
          machineDetectionTimeout: 10
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
          await this.delay(15000 + (attempt * 5000)); // Délai progressif
        }

      } catch (error) {
        await logError(`TwilioCallManager:callParticipant:${participantType}:attempt_${attempt}`, error);
        
        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_error_attempt_${attempt}`,
          retryCount: attempt,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
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
   * Incrémenter le compteur de tentatives pour un participant
   */
  private async incrementAttemptCount(sessionId: string, participantType: 'provider' | 'client'): Promise<void> {
    try {
      await this.db.collection('call_sessions').doc(sessionId).update({
        [`participants.${participantType}.attemptCount`]: admin.firestore.FieldValue.increment(1),
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      });
    } catch (error) {
      await logError('TwilioCallManager:incrementAttemptCount', error);
    }
  }

  /**
   * Attend la connexion d'un participant avec timeout optimisé
   */
  private async waitForConnection(
    sessionId: string, 
    participantType: 'provider' | 'client', 
    attempt: number
  ): Promise<boolean> {
    const maxWaitTime = CALL_CONFIG.CONNECTION_WAIT_TIME;
    const checkInterval = 3000;
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
   * Génère le TwiML optimisé pour la conférence
   */
  private generateConferenceTwiML(
    conferenceName: string,
    participantType: 'provider' | 'client',
    timeLimit: number,
    sessionId: string
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
            sessionId="${sessionId}"
            waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient"
            maxParticipants="2"
            endConferenceOnExit="${participantType === 'provider'}"
            beep="false"
            startConferenceOnEnter="${participantType === 'provider'}"
            trim="trim-silence"
            recordingChannels="dual"
          >
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>
    `.trim();
  }

  /**
   * Gère les déconnexions précoces avec logique différenciée
   */
  async handleEarlyDisconnection(sessionId: string, participantType: string, duration: number): Promise<void> {
    try {
      console.log(`⚠️ Déconnexion précoce détectée: ${sessionId}, participant: ${participantType}, durée: ${duration}s`);
      
      const session = await this.getCallSession(sessionId);
      if (!session) {
        console.warn(`Session non trouvée pour déconnexion précoce: ${sessionId}`);
        return;
      }

      // Si la durée est inférieure à 2 minutes, considérer comme échec
      if (duration < CALL_CONFIG.MIN_CALL_DURATION) {
        await this.handleCallFailure(sessionId, `early_disconnect_${participantType}`);
        
        await logCallRecord({
          callId: sessionId,
          status: `early_disconnect_${participantType}`,
          retryCount: 0,
          additionalData: {
            participantType,
            duration,
            reason: 'Disconnection before minimum duration'
          }
        });
      } else {
        // Durée suffisante, traiter comme completion normale
        await this.handleCallCompletion(sessionId, duration);
      }

      console.log(`✅ Déconnexion précoce traitée pour ${sessionId}`);

    } catch (error) {
      await logError('TwilioCallManager:handleEarlyDisconnection', error);
    }
  }

  /**
   * Gère les échecs d'appel avec notifications intelligentes
   */
  async handleCallFailure(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) {
        console.warn(`Session non trouvée pour handleCallFailure: ${sessionId}`);
        return;
      }

      // Mettre à jour le statut
      await this.updateCallSessionStatus(sessionId, 'failed');

      // Déterminer la langue principale pour les notifications
      const clientLanguage = callSession.metadata.clientLanguages?.[0] || 'fr';
      const providerLanguage = callSession.metadata.providerLanguages?.[0] || 'fr';

      // Notifier les participants avec messages personnalisés
      try {
        const notificationPromises = [];

        if (reason === 'provider_no_answer' || reason === 'system_error') {
          notificationPromises.push(
            messageManager.sendSmartMessage({
              to: callSession.participants.client.phone,
              templateId: `call_failure_${reason}_client`,
              variables: {
                providerName: 'votre expert',
                serviceType: callSession.metadata.serviceType,
                language: clientLanguage
              }
            })
          );
        }

        if (reason === 'client_no_answer' || reason === 'system_error') {
          notificationPromises.push(
            messageManager.sendSmartMessage({
              to: callSession.participants.provider.phone,
              templateId: `call_failure_${reason}_provider`,
              variables: {
                clientName: 'le client',
                serviceType: callSession.metadata.serviceType,
                language: providerLanguage
              }
            })
          );
        }

        await Promise.allSettled(notificationPromises);

      } catch (notificationError) {
        await logError('TwilioCallManager:handleCallFailure:notification', notificationError);
      }

      // Rembourser automatiquement le paiement
      await this.processRefund(sessionId, reason);

      await logCallRecord({
        callId: sessionId,
        status: `call_failed_${reason}`,
        retryCount: 0,
        additionalData: {
          reason,
          paymentIntentId: callSession.payment.intentId
        }
      });

      console.log(`❌ Appel échoué: ${sessionId}, raison: ${reason}`);

    } catch (error) {
      await logError('TwilioCallManager:handleCallFailure', error);
    }
  }

  /**
   * Traite le remboursement avec intégration Stripe
   */
  private async processRefund(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession?.payment.intentId) {
        console.warn(`Pas de paiement à rembourser pour ${sessionId}`);
        return;
      }

      // Utiliser StripeManager pour le remboursement
      const refundResult = await stripeManager.refundPayment(
        callSession.payment.intentId,
        `Appel échoué: ${reason}`,
        sessionId
      );

      if (refundResult.success) {
        // Mettre à jour le statut du paiement dans la session
        await this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'refunded',
          'payment.refundedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        });

        console.log(`💰 Remboursement traité avec succès: ${sessionId}`);
      } else {
        console.error(`❌ Échec du remboursement pour ${sessionId}:`, refundResult.error);
      }

    } catch (error) {
      await logError('TwilioCallManager:processRefund', error);
    }
  }

  /**
   * Gère la fin d'un appel avec succès
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

      // Déterminer les langues pour les notifications
      const clientLanguage = callSession.metadata.clientLanguages?.[0] || 'fr';
      const providerLanguage = callSession.metadata.providerLanguages?.[0] || 'fr';

      // Envoyer les notifications de succès
      try {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        await Promise.allSettled([
          messageManager.sendSmartMessage({
            to: callSession.participants.client.phone,
            templateId: 'call_success_client',
            variables: {
              duration: minutes.toString(),
              seconds: seconds.toString(),
              serviceType: callSession.metadata.serviceType,
              language: clientLanguage
            }
          }),
          messageManager.sendSmartMessage({
            to: callSession.participants.provider.phone,
            templateId: 'call_success_provider',
            variables: {
              duration: minutes.toString(),
              seconds: seconds.toString(),
              serviceType: callSession.metadata.serviceType,
              language: providerLanguage
            }
          })
        ]);
      } catch (notificationError) {
        await logError('TwilioCallManager:handleCallCompletion:notification', notificationError);
      }

      // Capturer le paiement si éligible
      if (this.shouldCapturePayment(callSession, duration)) {
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
   * Vérifie si l'appel doit être facturé avec critères stricts
   */
  shouldCapturePayment(session: CallSessionState, duration?: number): boolean {
    const { provider, client } = session.participants;
    const { startedAt, duration: sessionDuration } = session.conference;

    // Utiliser la durée fournie ou celle de la session
    const actualDuration = duration || sessionDuration || 0;

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

    // La durée doit être d'au moins 2 minutes
    if (actualDuration < CALL_CONFIG.MIN_CALL_DURATION) {
      console.log(`Paiement non capturé: durée insuffisante (${actualDuration}s < ${CALL_CONFIG.MIN_CALL_DURATION}s)`);
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

      // Utiliser StripeManager pour capturer le paiement
      const captureResult = await stripeManager.capturePayment(
        session.payment.intentId,
        sessionId
      );

      if (captureResult.success) {
        // Mettre à jour le statut dans la session
        await this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'captured',
          'payment.capturedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        });

        // Créer une demande d'avis
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
      } else {
        console.error(`❌ Échec capture paiement pour ${sessionId}:`, captureResult.error);
        return false;
      }

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
                      session.participants.client.status === 'connected',
        requestId: session.metadata.requestId
      };

      await this.saveWithRetry(() =>
        this.db.collection('reviews_requests').add(reviewRequest)
      );

      console.log(`📝 Demande d'avis créée pour: ${session.id}`);

    } catch (error) {
      await logError('TwilioCallManager:createReviewRequest', error);
    }
  }

  /**
   * Annule une session d'appel
   */
  async cancelCallSession(sessionId: string, reason: string, cancelledBy?: string): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) {
        console.warn(`Session non trouvée pour annulation: ${sessionId}`);
        return false;
      }

      // Annuler le timeout si il existe
      const timeout = this.activeCalls.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeCalls.delete(sessionId);
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
      await this.processRefund(sessionId, `cancelled_${reason}`);

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
    try {
      const promises: Promise<void>[] = [];

      if (session.participants.provider.callSid) {
        promises.push(this.cancelTwilioCall(session.participants.provider.callSid));
      }

      if (session.participants.client.callSid) {
        promises.push(this.cancelTwilioCall(session.participants.client.callSid));
      }

      await Promise.allSettled(promises);

    } catch (error) {
      await logError('TwilioCallManager:cancelActiveCallsForSession', error);
    }
  }

  /**
   * Annule un appel Twilio spécifique
   */
  private async cancelTwilioCall(callSid: string): Promise<void> {
    try {
      const twilioClient = await this.initializeTwilio();
      await twilioClient.calls(callSid).update({ status: 'completed' });
      console.log(`📞 Appel Twilio annulé: ${callSid}`);
    } catch (error) {
      console.warn(`Impossible d'annuler l'appel Twilio ${callSid}:`, error);
    }
  }

  /**
   * Récupère le nombre de sessions actives pour la gestion de la concurrence
   */
  private async getActiveSessionsCount(): Promise<number> {
    try {
      const snapshot = await this.db.collection('call_sessions')
        .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting', 'both_connecting', 'active'])
        .get();

      return snapshot.size;
    } catch (error) {
      await logError('TwilioCallManager:getActiveSessionsCount', error);
      return 0;
    }
  }

  /**
   * Méthodes utilitaires
   */

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
  // Méthodes CRUD pour les sessions
  // =====================================================

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

  async updateParticipantStatus(
    sessionId: string, 
    participantType: 'provider' | 'client', 
    status: CallSessionState['participants']['provider']['status'],
    timestamp?: admin.firestore.Timestamp
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
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

  async updateConferenceInfo(sessionId: string, updates: Partial<CallSessionState['conference']>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
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

  async getCallSession(sessionId: string): Promise<CallSessionState | null> {
    try {
      const doc = await this.db.collection('call_sessions').doc(sessionId).get();
      return doc.exists ? doc.data() as CallSessionState : null;
    } catch (error) {
      await logError('TwilioCallManager:getCallSession', error);
      return null;
    }
  }

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
   * Ajouter à la queue d'appels
   */
  addToQueue(sessionId: string): void {
    if (!this.callQueue.includes(sessionId)) {
      this.callQueue.push(sessionId);
      console.log(`📞 Session ${sessionId} ajoutée à la queue (${this.callQueue.length} en attente)`);
    }
  }

  /**
   * Obtenir des statistiques détaillées
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
  }> {
    try {
      let query = this.db.collection('call_sessions') as admin.firestore.Query;

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
        averageRevenue: 0
      };

      let totalDuration = 0;
      let completedWithDuration = 0;
      let totalCapturedAmount = 0;
      let capturedPayments = 0;

      snapshot.docs.forEach((doc) => {
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

  /**
   * Nettoyage des sessions anciennes
   */
  async cleanupOldSessions(options: {
    olderThanDays?: number;
    keepCompletedDays?: number;
    batchSize?: number;
  } = {}): Promise<{ deleted: number; errors: number }> {
    const {
      olderThanDays = 90,
      keepCompletedDays = 30,
      batchSize = 50
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
        failedSnapshot.docs.forEach((doc) => {
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
        completedSnapshot.docs.forEach((doc) => {
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
}

// 🔧 CHANGEMENT : Instance singleton avec lazy loading
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