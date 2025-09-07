import * as admin from 'firebase-admin';
// 🔧 Twilio client & num
import { getTwilioClient, getTwilioPhoneNumber } from './lib/twilio';
import { getFunctionsBaseUrl } from './utils/urlBase';
import { logError } from './utils/logs/logError';
import { logCallRecord } from './utils/logs/logCallRecord';
import { messageManager } from './MessageManager';
import { stripeManager } from './StripeManager';

// =============================
// Typage fort du JSON de prompts
// =============================
type LangCode =
  | 'fr' | 'en' | 'pt' | 'es' | 'de' | 'ru' | 'zh' | 'ar' | 'hi' | 'bn' | 'ur'
  | 'id' | 'ja' | 'tr' | 'it' | 'ko' | 'vi' | 'fa' | 'pl';

interface VoicePrompts {
  provider_intro: Record<LangCode, string>;
  client_intro: Record<LangCode, string>;
}

// 🔊 Textes d'intro multilingues (incluent S.O.S Expat)
import promptsJson from './content/voicePrompts.json';
const prompts = promptsJson as VoicePrompts;

export interface CallSessionState {
  id: string;
  status:
    | 'pending'
    | 'provider_connecting'
    | 'client_connecting'
    | 'both_connecting'
    | 'active'
    | 'completed'
    | 'failed'
    | 'cancelled';
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
    selectedLanguage?: string;
    ttsLocale?: string;
  };
}

// =============================
// Config appels
// =============================
const CALL_CONFIG = {
  MAX_RETRIES: 3,
  CALL_TIMEOUT: 60,              // 60 s
  CONNECTION_WAIT_TIME: 90_000,  // 90 s
  MIN_CALL_DURATION: 120,        // 2 min
  MAX_CONCURRENT_CALLS: 50,
  WEBHOOK_VALIDATION: true
} as const;

// =============================
// Locales TTS Twilio (principales)
// =============================
const VOICE_LOCALES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
  de: 'de-DE',
  ru: 'ru-RU',
  zh: 'zh-CN',
  ar: 'ar-SA',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ur: 'ur-PK',
  id: 'id-ID',
  ja: 'ja-JP',
  tr: 'tr-TR',
  it: 'it-IT',
  ko: 'ko-KR',
  vi: 'vi-VN',
  fa: 'fa-IR',
  pl: 'pl-PL'
};

// =============================
// Helpers langue & prompts
// =============================

function normalizeLangList(langs?: string[]): string[] {
  if (!langs || !Array.isArray(langs)) return [];
  const out: string[] = [];
  for (const raw of langs) {
    if (!raw) continue;
    const short = String(raw).toLowerCase().split(/[-_]/)[0];
    if (!out.includes(short)) out.push(short);
  }
  return out;
}

function availablePromptLangs(): LangCode[] {
  const providerLangs = Object.keys(prompts.provider_intro) as LangCode[];
  const clientLangs = Object.keys(prompts.client_intro) as LangCode[];
  return providerLangs.filter(l => clientLangs.includes(l));
}

function pickSessionLanguage(clientLangs: string[], providerLangs: string[]): string {
  const supported = new Set(availablePromptLangs());
  const c = normalizeLangList(clientLangs).filter(l => supported.has(l as LangCode));
  const p = normalizeLangList(providerLangs).filter(l => supported.has(l as LangCode));
  for (const lang of c) if (p.includes(lang)) return lang;
  if (c.length) return c[0];
  return 'en';
}

function localeFor(langKey: string): string {
  return VOICE_LOCALES[langKey] || VOICE_LOCALES['en'];
}

function getIntroText(participant: 'provider' | 'client', langKey: string): string {
  const langs = availablePromptLangs();
  const safeLang = (langs.includes(langKey as LangCode) ? langKey : 'en') as LangCode;
  const table = participant === 'provider' ? prompts.provider_intro : prompts.client_intro;
  return table[safeLang] ?? table.en ?? 'Please hold.';
}

// =====================================
// Payloads + type-guard pour startOutboundCall
// =====================================
interface StartOutboundCallExistingPayload {
  sessionId: string;
  delayMinutes?: number;
  delaySeconds?: number;
}
interface StartOutboundCallCreatePayload extends StartOutboundCallExistingPayload {
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
}
type StartOutboundCallInput =
  | StartOutboundCallExistingPayload
  | StartOutboundCallCreatePayload;

function isCreatePayload(i: StartOutboundCallInput): i is StartOutboundCallCreatePayload {
  return (
    'providerId' in i &&
    'providerPhone' in i &&
    'clientPhone' in i &&
    'paymentIntentId' in i &&
    'amount' in i
  );
}

export class TwilioCallManager {
  // ===== Singleton interne =====
  private static _instance: TwilioCallManager | null = null;
  static getInstance(): TwilioCallManager {
    if (!this._instance) this._instance = new TwilioCallManager();
    return this._instance;
  }

  /** ⚡️ API utilisée par l’adapter */
  static async startOutboundCall(input: StartOutboundCallInput): Promise<CallSessionState | void> {
    try {
      if (!input?.sessionId) throw new Error('startOutboundCall: "sessionId" requis');

      const mgr = TwilioCallManager.getInstance();
      const delayMinutes =
        typeof input.delayMinutes === 'number'
          ? input.delayMinutes
          : typeof input.delaySeconds === 'number'
            ? Math.ceil(input.delaySeconds / 60)
            : 0;

      // Existant ?
      const existing = await mgr.getCallSession(input.sessionId);
      if (existing) {
        await mgr.initiateCallSequence(input.sessionId, delayMinutes);
        return existing;
      }

      // Création + lancement
      if (!isCreatePayload(input)) {
        throw new Error('startOutboundCall: la session n’existe pas, champs de création manquants');
      }

      const created = await mgr.createCallSession({
        sessionId: input.sessionId,
        providerId: input.providerId,
        clientId: input.clientId,
        providerPhone: input.providerPhone,
        clientPhone: input.clientPhone,
        serviceType: input.serviceType,
        providerType: input.providerType,
        paymentIntentId: input.paymentIntentId,
        amount: input.amount,
        requestId: input.requestId,
        clientLanguages: input.clientLanguages,
        providerLanguages: input.providerLanguages
      });

      await mgr.initiateCallSequence(input.sessionId, delayMinutes);
      return created;
    } catch (error) {
      await logError('TwilioCallManager:startOutboundCall', error as unknown);
      throw error;
    }
  }

  // ===== Instance =====
  private db: admin.firestore.Firestore;
  private activeCalls = new Map<string, NodeJS.Timeout>();
  private callQueue: string[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.db = admin.firestore();
    this.startQueueProcessor();
  }

  /** Démarrer le processeur de queue */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.callQueue.length > 0) {
        this.isProcessingQueue = true;
        try {
          const sessionId = this.callQueue.shift();
          if (sessionId) await this.processQueuedCall(sessionId);
        } catch (error) {
          await logError('TwilioCallManager:queueProcessor', error as unknown);
        } finally {
          this.isProcessingQueue = false;
        }
      }
    }, 2000);
  }

  private async processQueuedCall(sessionId: string): Promise<void> {
    try {
      const session = await this.getCallSession(sessionId);
      if (session && session.status === 'pending') {
        await this.initiateCallSequence(sessionId, 0);
      }
    } catch (error) {
      await logError('TwilioCallManager:processQueuedCall', error as unknown);
    }
  }

  private validatePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') throw new Error('Numéro de téléphone requis');
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) throw new Error(`Numéro invalide: ${phone}. Format: +33XXXXXXXXX`);
    const digits = cleaned.substring(1);
    if (digits.length < 8 || digits.length > 15) throw new Error(`Numéro invalide: ${phone}. Longueur 8-15 chiffres après +`);
    return cleaned;
  }

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
      if (!params.sessionId || !params.providerId || !params.clientId) {
        throw new Error('Paramètres requis manquants: sessionId, providerId, clientId');
      }
      if (!params.paymentIntentId || !params.amount || params.amount <= 0) {
        throw new Error('Informations de paiement invalides');
      }

      const validProviderPhone = this.validatePhoneNumber(params.providerPhone);
      const validClientPhone = this.validatePhoneNumber(params.clientPhone);
      if (validProviderPhone === validClientPhone) {
        throw new Error('Les numéros du prestataire et du client doivent être différents');
      }

      const activeSessions = await this.getActiveSessionsCount();
      if (activeSessions >= CALL_CONFIG.MAX_CONCURRENT_CALLS) {
        throw new Error('Limite d\'appels simultanés atteinte. Réessayer dans quelques minutes.');
      }

      const maxDuration = params.providerType === 'lawyer' ? 1500 : 2100; // 25/35 min
      const conferenceName = `conf_${params.sessionId}_${Date.now()}`;

      const callSession: CallSessionState = {
        id: params.sessionId,
        status: 'pending',
        participants: {
          provider: { phone: validProviderPhone, status: 'pending', attemptCount: 0 },
          client: { phone: validClientPhone, status: 'pending', attemptCount: 0 }
        },
        conference: { name: conferenceName },
        payment: { intentId: params.paymentIntentId, status: 'authorized', amount: params.amount },
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

      const existingSession = await this.getCallSession(params.sessionId);
      if (existingSession) throw new Error(`Session d'appel existe déjà: ${params.sessionId}`);

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
      await logError('TwilioCallManager:createCallSession', error as unknown);
      throw error;
    }
  }

  async initiateCallSequence(sessionId: string, delayMinutes: number = 5): Promise<void> {
    try {
      console.log(`🚀 Init séquence d'appel ${sessionId} dans ${delayMinutes} min`);
      if (delayMinutes > 0) {
        const timeout = setTimeout(async () => {
          this.activeCalls.delete(sessionId);
          await this.executeCallSequence(sessionId);
        }, Math.min(delayMinutes, 10) * 60 * 1000);
        this.activeCalls.set(sessionId, timeout);
        return;
      }
      await this.executeCallSequence(sessionId);
    } catch (error) {
      await logError('TwilioCallManager:initiateCallSequence', error as unknown);
      await this.handleCallFailure(sessionId, 'system_error');
    }
  }

  private async executeCallSequence(sessionId: string): Promise<void> {
    const callSession = await this.getCallSession(sessionId);
    if (!callSession) throw new Error(`Session d'appel non trouvée: ${sessionId}`);

    if (callSession.status === 'cancelled' || callSession.status === 'failed') {
      console.log(`Session ${sessionId} déjà ${callSession.status}, stop`);
      return;
    }

    const paymentValid = await this.validatePaymentStatus(callSession.payment.intentId);
    if (!paymentValid) {
      await this.handleCallFailure(sessionId, 'payment_invalid');
      return;
    }

    const langKey = pickSessionLanguage(
      callSession.metadata.clientLanguages || [],
      callSession.metadata.providerLanguages || []
    );
    const ttsLocale = localeFor(langKey);

    await this.saveWithRetry(() =>
      this.db.collection('call_sessions').doc(sessionId).update({
        'metadata.selectedLanguage': langKey,
        'metadata.ttsLocale': ttsLocale,
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      })
    );

    await this.updateCallSessionStatus(sessionId, 'client_connecting');

    console.log(`📞 Étape 1: Appel client ${sessionId}`);
    const clientConnected = await this.callParticipantWithRetries(
      sessionId,
      'client',
      callSession.participants.client.phone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      ttsLocale,
      langKey
    );

    if (!clientConnected) {
      await this.handleCallFailure(sessionId, 'client_no_answer');
      return;
    }

    await this.updateCallSessionStatus(sessionId, 'provider_connecting');

    console.log(`📞 Étape 2: Appel prestataire (avocat) ${sessionId}`);
    const providerConnected = await this.callParticipantWithRetries(
      sessionId,
      'provider',
      callSession.participants.provider.phone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      ttsLocale,
      langKey,
      15_000
    );

    if (!providerConnected) {
      await this.handleCallFailure(sessionId, 'provider_no_answer');
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

  private async validatePaymentStatus(paymentIntentId: string): Promise<boolean> {
    try {
      const payment = await stripeManager.getPayment(paymentIntentId);
      if (!payment || typeof payment !== 'object') return false;
      const status = (payment as Record<string, unknown>).status;
      if (typeof status !== 'string') return false;

      const validStatuses = new Set<string>([
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'succeeded'
      ]);
      return validStatuses.has(status);
    } catch (error) {
      await logError('TwilioCallManager:validatePaymentStatus', error as unknown);
      return false;
    }
  }

  private async callParticipantWithRetries(
    sessionId: string,
    participantType: 'provider' | 'client',
    phoneNumber: string,
    conferenceName: string,
    timeLimit: number,
    ttsLocale: string,
    langKey: string,
    backoffOverrideMs?: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= CALL_CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`📞 Tentative ${attempt}/${CALL_CONFIG.MAX_RETRIES} → ${participantType} (${sessionId})`);

        await this.incrementAttemptCount(sessionId, participantType);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_attempt_${attempt}`,
          retryCount: attempt
        });

        const welcomeMessage = getIntroText(participantType, langKey);
        const twiml = this.generateConferenceTwiML(
          conferenceName,
          participantType,
          timeLimit,
          sessionId,
          ttsLocale,
          welcomeMessage
        );

        const twilioClient = getTwilioClient();
        const fromNumber = getTwilioPhoneNumber();
        const base = getFunctionsBaseUrl();

        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: fromNumber,
          twiml,
          statusCallback: `${base}/twilioCallWebhook`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
          timeout: CALL_CONFIG.CALL_TIMEOUT,
          record: true,
          recordingStatusCallback: `${base}/twilioRecordingWebhook`,
          recordingStatusCallbackMethod: 'POST',
          machineDetection: 'Enable',
          machineDetectionTimeout: 10
        });

        console.log(`📞 Appel créé: ${call.sid} (${participantType})`);
        await this.updateParticipantCallSid(sessionId, participantType, call.sid);

        const connected = await this.waitForConnection(sessionId, participantType, attempt);
        if (connected) {
          await logCallRecord({
            callId: sessionId,
            status: `${participantType}_connected_attempt_${attempt}`,
            retryCount: attempt
          });
          return true;
        }

        if (attempt < CALL_CONFIG.MAX_RETRIES) {
          if (typeof backoffOverrideMs === 'number') {
            await this.delay(backoffOverrideMs);
          } else {
            const progressive = 15_000 + attempt * 5_000;
            await this.delay(progressive);
          }
        }
      } catch (error) {
        await logError(`TwilioCallManager:callParticipant:${participantType}:attempt_${attempt}`, error as unknown);

        await logCallRecord({
          callId: sessionId,
          status: `${participantType}_error_attempt_${attempt}`,
          retryCount: attempt,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });

        if (attempt === CALL_CONFIG.MAX_RETRIES) break;
      }
    }

    await logCallRecord({
      callId: sessionId,
      status: `${participantType}_failed_all_attempts`,
      retryCount: CALL_CONFIG.MAX_RETRIES
    });

    return false;
  }

  private async incrementAttemptCount(sessionId: string, participantType: 'provider' | 'client'): Promise<void> {
    try {
      await this.db.collection('call_sessions').doc(sessionId).update({
        [`participants.${participantType}.attemptCount`]: admin.firestore.FieldValue.increment(1),
        'metadata.updatedAt': admin.firestore.Timestamp.now()
      });
    } catch (error) {
      await logError('TwilioCallManager:incrementAttemptCount', error as unknown);
    }
  }

  private async waitForConnection(
    sessionId: string,
    participantType: 'provider' | 'client',
    _attempt: number // ← renommé pour lever TS6133
  ): Promise<boolean> {
    const maxWaitTime = CALL_CONFIG.CONNECTION_WAIT_TIME;
    const checkInterval = 3000;
    const maxChecks = Math.floor(maxWaitTime / checkInterval);

    for (let check = 0; check < maxChecks; check++) {
      await this.delay(checkInterval);
      try {
        const session = await this.getCallSession(sessionId);
        if (!session) return false;

        const participant =
          participantType === 'provider'
            ? session.participants.provider
            : session.participants.client;

        if (participant.status === 'connected') return true;
        if (participant.status === 'disconnected' || participant.status === 'no_answer') return false;
      } catch (error) {
        console.warn(`Erreur waitForConnection: ${String(error)}`);
      }
    }
    return false;
  }

  private generateConferenceTwiML(
    conferenceName: string,
    participantType: 'provider' | 'client',
    timeLimit: number,
    sessionId: string,
    ttsLocale: string,
    welcomeMessage: string
  ): string {
    const participantLabel = participantType === 'provider' ? 'provider' : 'client';
    const waitUrl = 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient';
    const base = getFunctionsBaseUrl();

    return `
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(welcomeMessage)}</Say>
  <Dial timeout="${CALL_CONFIG.CALL_TIMEOUT}" timeLimit="${timeLimit}">
    <Conference
      statusCallback="${base}/twilioConferenceWebhook"
      statusCallbackMethod="POST"
      statusCallbackEvent="start end join leave mute hold"
      record="record-from-start"
      recordingStatusCallback="${base}/twilioRecordingWebhook"
      recordingStatusCallbackMethod="POST"
      participantLabel="${participantLabel}"
      sessionId="${sessionId}"
      waitUrl="${waitUrl}"
      maxParticipants="2"
      endConferenceOnExit="${participantType === 'provider'}"
      beep="false"
      startConferenceOnEnter="${participantType === 'provider'}"
      trim="trim-silence"
      recordingChannels="dual"
    >${conferenceName}</Conference>
  </Dial>
</Response>
    `.trim();
  }

  async handleEarlyDisconnection(sessionId: string, participantType: string, duration: number): Promise<void> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) return;

      if (duration < CALL_CONFIG.MIN_CALL_DURATION) {
        await this.handleCallFailure(sessionId, `early_disconnect_${participantType}`);
        await logCallRecord({
          callId: sessionId,
          status: `early_disconnect_${participantType}`,
          retryCount: 0,
          additionalData: { participantType, duration, reason: 'below_min_duration' }
        });
      } else {
        await this.handleCallCompletion(sessionId, duration);
      }
    } catch (error) {
      await logError('TwilioCallManager:handleEarlyDisconnection', error as unknown);
    }
  }

  async handleCallFailure(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) return;

      await this.updateCallSessionStatus(sessionId, 'failed');

      const clientLanguage = callSession.metadata.clientLanguages?.[0] || 'fr';
      const providerLanguage = callSession.metadata.providerLanguages?.[0] || 'fr';

      try {
        const notificationPromises: Array<Promise<unknown>> = [];

        if (reason === 'client_no_answer' || reason === 'system_error') {
          notificationPromises.push(
            messageManager.sendSmartMessage({
              to: callSession.participants.provider.phone,
              templateId: `call_failure_${reason}_provider`,
              variables: { clientName: 'le client', serviceType: callSession.metadata.serviceType, language: providerLanguage }
            })
          );
        }

        if (reason === 'provider_no_answer' || reason === 'system_error') {
          notificationPromises.push(
            messageManager.sendSmartMessage({
              to: callSession.participants.client.phone,
              templateId: `call_failure_${reason}_client`,
              variables: { providerName: 'votre expert', serviceType: callSession.metadata.serviceType, language: clientLanguage }
            })
          );
        }

        await Promise.allSettled(notificationPromises);
      } catch (notificationError) {
        await logError('TwilioCallManager:handleCallFailure:notification', notificationError as unknown);
      }

      await this.processRefund(sessionId, `failed_${reason}`);

      await logCallRecord({
        callId: sessionId,
        status: `call_failed_${reason}`,
        retryCount: 0,
        additionalData: { reason, paymentIntentId: callSession.payment.intentId }
      });
    } catch (error) {
      await logError('TwilioCallManager:handleCallFailure', error as unknown);
    }
  }

  private async processRefund(sessionId: string, reason: string): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession?.payment.intentId) return;

      const refundResult = await stripeManager.refundPayment(
        callSession.payment.intentId,
        `Appel échoué: ${reason}`,
        sessionId
      );

      if (refundResult.success) {
        await this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'refunded',
          'payment.refundedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        });
      } else {
        console.error(`❌ Remboursement KO ${sessionId}:`, refundResult.error);
      }
    } catch (error) {
      await logError('TwilioCallManager:processRefund', error as unknown);
    }
  }

  async handleCallCompletion(sessionId: string, duration: number): Promise<void> {
    try {
      const callSession = await this.getCallSession(sessionId);
      if (!callSession) return;

      await this.updateCallSessionStatus(sessionId, 'completed');

      const clientLanguage = callSession.metadata.clientLanguages?.[0] || 'fr';
      const providerLanguage = callSession.metadata.providerLanguages?.[0] || 'fr';

      try {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        await Promise.allSettled([
          messageManager.sendSmartMessage({
            to: callSession.participants.client.phone,
            templateId: 'call_success_client',
            variables: { duration: minutes.toString(), seconds: seconds.toString(), serviceType: callSession.metadata.serviceType, language: clientLanguage }
          }),
          messageManager.sendSmartMessage({
            to: callSession.participants.provider.phone,
            templateId: 'call_success_provider',
            variables: { duration: minutes.toString(), seconds: seconds.toString(), serviceType: callSession.metadata.serviceType, language: providerLanguage }
          })
        ]);
      } catch (notificationError) {
        await logError('TwilioCallManager:handleCallCompletion:notification', notificationError as unknown);
      }

      if (this.shouldCapturePayment(callSession, duration)) {
        await this.capturePaymentForSession(sessionId);
      }

      await logCallRecord({
        callId: sessionId,
        status: 'call_completed_success',
        retryCount: 0,
        additionalData: { duration }
      });
    } catch (error) {
      await logError('TwilioCallManager:handleCallCompletion', error as unknown);
    }
  }

  shouldCapturePayment(session: CallSessionState, duration?: number): boolean {
    const { provider, client } = session.participants;
    const { startedAt, duration: sessionDuration } = session.conference;
    const actualDuration = duration || sessionDuration || 0;

    if (provider.status !== 'connected' || client.status !== 'connected') return false;
    if (!startedAt) return false;
    if (actualDuration < CALL_CONFIG.MIN_CALL_DURATION) return false;
    if (session.payment.status !== 'authorized') return false;
    return true;
  }

  async capturePaymentForSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) return false;

      if (!this.shouldCapturePayment(session)) return false;
      if (session.payment.status === 'captured') return true;

      const captureResult = await stripeManager.capturePayment(session.payment.intentId, sessionId);

      if (captureResult.success) {
        await this.db.collection('call_sessions').doc(sessionId).update({
          'payment.status': 'captured',
          'payment.capturedAt': admin.firestore.Timestamp.now(),
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        });

        await this.createReviewRequest(session);

        await logCallRecord({
          callId: sessionId,
          status: 'payment_captured',
          retryCount: 0,
          additionalData: { amount: session.payment.amount, duration: session.conference.duration }
        });

        return true;
      } else {
        console.error(`❌ Capture KO ${sessionId}:`, captureResult.error);
        return false;
      }
    } catch (error) {
      await logError('TwilioCallManager:capturePaymentForSession', error as unknown);
      return false;
    }
  }

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
        callStartedAt: session.conference.startedAt,
        callEndedAt: session.conference.endedAt,
        bothConnected:
          session.participants.provider.status === 'connected' &&
          session.participants.client.status === 'connected',
        requestId: session.metadata.requestId
      };

      await this.saveWithRetry(() =>
        this.db.collection('reviews_requests').add(reviewRequest)
      );
    } catch (error) {
      await logError('TwilioCallManager:createReviewRequest', error as unknown);
    }
  }

  async cancelCallSession(sessionId: string, reason: string, cancelledBy?: string): Promise<boolean> {
    try {
      const session = await this.getCallSession(sessionId);
      if (!session) return false;

      const timeout = this.activeCalls.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.activeCalls.delete(sessionId);
      }

      await this.cancelActiveCallsForSession(session);

      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          status: 'cancelled',
          'metadata.updatedAt': admin.firestore.Timestamp.now(),
          cancelledAt: admin.firestore.Timestamp.now(),
          cancelledBy: cancelledBy || 'system',
          cancellationReason: reason
        })
      );

      await this.processRefund(sessionId, `cancelled_${reason}`);

      await logCallRecord({
        callId: sessionId,
        status: `cancelled_${reason}`,
        retryCount: 0,
        additionalData: { cancelledBy: cancelledBy || 'system' }
      });

      return true;
    } catch (error) {
      await logError('TwilioCallManager:cancelCallSession', error as unknown);
      return false;
    }
  }

  private async cancelActiveCallsForSession(session: CallSessionState): Promise<void> {
    try {
      const twilioClient = getTwilioClient();
      const promises: Promise<void>[] = [];
      if (session.participants.provider.callSid) {
        promises.push(this.cancelTwilioCall(session.participants.provider.callSid, twilioClient));
      }
      if (session.participants.client.callSid) {
        promises.push(this.cancelTwilioCall(session.participants.client.callSid, twilioClient));
      }
      await Promise.allSettled(promises);
    } catch (error) {
      await logError('TwilioCallManager:cancelActiveCallsForSession', error as unknown);
    }
  }

  private async cancelTwilioCall(
    callSid: string,
    twilioClient: ReturnType<typeof getTwilioClient>
  ): Promise<void> {
    try {
      await twilioClient.calls(callSid).update({ status: 'completed' });
    } catch (error) {
      console.warn(`Impossible d'annuler l'appel Twilio ${callSid}:`, error);
    }
  }

  private async getActiveSessionsCount(): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('call_sessions')
        .where('status', 'in', [
          'pending',
          'provider_connecting',
          'client_connecting',
          'both_connecting',
          'active'
        ])
        .get();
      return snapshot.size;
    } catch (error) {
      await logError('TwilioCallManager:getActiveSessionsCount', error as unknown);
      return 0;
    }
  }

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
        if (attempt === maxRetries) throw error;
        await this.delay(baseDelay * attempt);
      }
    }
    throw new Error('Unreachable');
  }

  // =============================
  // CRUD sessions
  // =============================
  async updateCallSessionStatus(sessionId: string, status: CallSessionState['status']): Promise<void> {
    try {
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          status,
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );
    } catch (error) {
      await logError('TwilioCallManager:updateCallSessionStatus', error as unknown);
      throw error;
    }
  }

  async updateParticipantCallSid(
    sessionId: string,
    participantType: 'provider' | 'client',
    callSid: string
  ): Promise<void> {
    try {
      await this.saveWithRetry(() =>
        this.db.collection('call_sessions').doc(sessionId).update({
          [`participants.${participantType}.callSid`]: callSid,
          'metadata.updatedAt': admin.firestore.Timestamp.now()
        })
      );
    } catch (error) {
      await logError('TwilioCallManager:updateParticipantCallSid', error as unknown);
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
      await logError('TwilioCallManager:updateParticipantStatus', error as unknown);
      throw error;
    }
  }

  async updateConferenceInfo(
    sessionId: string,
    updates: Partial<CallSessionState['conference']>
  ): Promise<void> {
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
      await logError('TwilioCallManager:updateConferenceInfo', error as unknown);
      throw error;
    }
  }

  async getCallSession(sessionId: string): Promise<CallSessionState | null> {
    try {
      const doc = await this.db.collection('call_sessions').doc(sessionId).get();
      return doc.exists ? (doc.data() as CallSessionState) : null;
    } catch (error) {
      await logError('TwilioCallManager:getCallSession', error as unknown);
      return null;
    }
  }

  async findSessionByConferenceSid(conferenceSid: string): Promise<CallSessionState | null> {
    try {
      const snapshot = await this.db
        .collection('call_sessions')
        .where('conference.sid', '==', conferenceSid)
        .limit(1)
        .get();
      return snapshot.empty ? null : (snapshot.docs[0].data() as CallSessionState);
    } catch (error) {
      await logError('TwilioCallManager:findSessionByConferenceSid', error as unknown);
      return null;
    }
  }

  async findSessionByCallSid(
    callSid: string
  ): Promise<{ session: CallSessionState; participantType: 'provider' | 'client' } | null> {
    try {
      let snapshot = await this.db
        .collection('call_sessions')
        .where('participants.provider.callSid', '==', callSid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return { session: snapshot.docs[0].data() as CallSessionState, participantType: 'provider' };
      }

      snapshot = await this.db
        .collection('call_sessions')
        .where('participants.client.callSid', '==', callSid)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return { session: snapshot.docs[0].data() as CallSessionState, participantType: 'client' };
      }

      return null;
    } catch (error) {
      await logError('TwilioCallManager:findSessionByCallSid', error as unknown);
      return null;
    }
  }

  addToQueue(sessionId: string): void {
    if (!this.callQueue.includes(sessionId)) {
      this.callQueue.push(sessionId);
      console.log(`📞 Session ${sessionId} ajoutée à la queue (${this.callQueue.length} en attente)`);
    }
  }

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

      if (options.startDate) query = query.where('metadata.createdAt', '>=', options.startDate);
      if (options.endDate) query = query.where('metadata.createdAt', '<=', options.endDate);
      if (options.providerType) query = query.where('metadata.providerType', '==', options.providerType);
      if (options.serviceType) query = query.where('metadata.serviceType', '==', options.serviceType);

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

      snapshot.docs.forEach(doc => {
        const session = doc.data() as CallSessionState;
        switch (session.status) {
          case 'pending':
          case 'provider_connecting':
          case 'client_connecting':
          case 'both_connecting':
          case 'active':
            stats.pending++; break;
          case 'completed':
            stats.completed++;
            if (session.conference.duration) {
              totalDuration += session.conference.duration;
              completedWithDuration++;
            }
            break;
          case 'failed':
            stats.failed++; break;
          case 'cancelled':
            stats.cancelled++; break;
        }
        if (session.payment.status === 'captured') {
          totalCapturedAmount += session.payment.amount;
          capturedPayments++;
        }
      });

      stats.averageDuration = completedWithDuration > 0 ? totalDuration / completedWithDuration : 0;
      stats.successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
      stats.totalRevenue = totalCapturedAmount;
      stats.averageRevenue = capturedPayments > 0 ? totalCapturedAmount / capturedPayments : 0;

      return stats;
    } catch (error) {
      await logError('TwilioCallManager:getCallStatistics', error as unknown);
      throw error;
    }
  }

  async cleanupOldSessions(options: {
    olderThanDays?: number;
    keepCompletedDays?: number;
    batchSize?: number;
  } = {}): Promise<{ deleted: number; errors: number }> {
    const { olderThanDays = 90, keepCompletedDays = 30, batchSize = 50 } = options;

    try {
      const now = admin.firestore.Timestamp.now();
      const generalCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - olderThanDays * 86_400_000);
      const completedCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - keepCompletedDays * 86_400_000);

      let deleted = 0;
      let errors = 0;

      const failedSnapshot = await this.db.collection('call_sessions')
        .where('metadata.createdAt', '<=', generalCutoff)
        .where('status', 'in', ['failed', 'cancelled'])
        .limit(batchSize)
        .get();

      if (!failedSnapshot.empty) {
        const batch = this.db.batch();
        failedSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        try {
          await batch.commit();
          deleted += failedSnapshot.size;
        } catch (error) {
          errors += failedSnapshot.size;
          await logError('TwilioCallManager:cleanupOldSessions:failed', error as unknown);
        }
      }

      const completedSnapshot = await this.db.collection('call_sessions')
        .where('metadata.createdAt', '<=', completedCutoff)
        .where('status', '==', 'completed')
        .limit(batchSize)
        .get();

      if (!completedSnapshot.empty) {
        const batch = this.db.batch();
        completedSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        try {
          await batch.commit();
          deleted += completedSnapshot.size;
        } catch (error) {
          errors += completedSnapshot.size;
          await logError('TwilioCallManager:cleanupOldSessions:completed', error as unknown);
        }
      }

      return { deleted, errors };
    } catch (error) {
      await logError('TwilioCallManager:cleanupOldSessions', error as unknown);
      return { deleted: 0, errors: 1 };
    }
  }
}

// 🔒 petite aide XML
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 🔧 Singleton export
export const twilioCallManager = TwilioCallManager.getInstance();
