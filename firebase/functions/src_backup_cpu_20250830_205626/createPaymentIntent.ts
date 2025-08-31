// ðŸ”§ Firebase Functions v2 avec configuration complÃ¨te + sÃ©lection Stripe test/live
import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

import { stripeManager } from './StripeManager';
import { logError } from './utils/logs/logError';
import {
  toCents,
  checkDailyLimit,
  logPaymentAudit,
  formatAmount} from './utils/paymentValidators';

// =========================================
// ðŸ”§ Configuration Firebase Functions v2
// =========================================
const _FUNCTION_CONFIG = {
  region: 'europe-west1',
  memory: '256MiB' as const,
  concurrency: 1,
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 3,
  // pas de cpu: 0.25/0.5 si concurrency > 1 ; ici on garde 1
};

// =========================================
// ðŸ”‘ Secrets / Params (NE MET JAMAIS TES CLÃ‰S EN DUR)
// - Params: Config paramÃ©trable (notamment STRIPE_MODE)
// =========================================
const STRIPE_SECRET_KEY_TEST = defineSecret('STRIPE_SECRET_KEY_TEST'); // sk_test_***
const STRIPE_SECRET_KEY_LIVE = defineSecret('STRIPE_SECRET_KEY_LIVE'); // sk_live_***
const STRIPE_MODE = defineString('STRIPE_MODE'); // "test" ou "live"

// Helper: renvoie le Secret Ã  utiliser selon le mode actuel
const getStripeSecretParam = () =>
  (STRIPE_MODE.value() === 'live' ? STRIPE_SECRET_KEY_LIVE : STRIPE_SECRET_KEY_TEST);

// =========================================
// ðŸŒ DÃ‰TECTION D'ENVIRONNEMENT
// =========================================
const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'dev' ||
  !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';

const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';

console.log(
  `ðŸŒ Environment: ${process.env.NODE_ENV || 'development'}, Production: ${isProduction}, Bypass: ${BYPASS_MODE}, StripeMode: ${STRIPE_MODE.value() || '(unset)'}`
);

// =========================================
// â™»ï¸ Rate limit store (mÃ©moire)
// =========================================
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// =========================================
// ðŸ“‹ INTERFACES ET TYPES
// =========================================
type SupportedCurrency = 'eur' | 'usd';
type SupportedServiceType = 'lawyer_call' | 'expat_call';

interface PaymentIntentRequestData {
  amount: number;
  currency?: SupportedCurrency;
  serviceType: SupportedServiceType;
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  commissionAmount: number;
  providerAmount: number;
  callSessionId?: string;
  metadata?: Record<string, string>;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

interface SuccessResponse {
  success: true;
  clientSecret: string;
  paymentIntentId: string;
  amount: number; // en cents
  currency: SupportedCurrency;
  serviceType: string;
  status: string;
  expiresAt: string;
}

// =========================================
/** âš™ï¸ CONFIGURATION RÃˆGLES DE SÃ‰CURITÃ‰ */
// =========================================
const SECURITY_LIMITS = {
  RATE_LIMIT: {
    MAX_REQUESTS: isDevelopment ? 1000 : isProduction ? 25 : 100,
    WINDOW_MS: isDevelopment ? 2 * 60 * 1000 : isProduction ? 8 * 60 * 1000 : 5 * 60 * 1000,
    GLOBAL_MAX: isDevelopment ? 10000 : isProduction ? 1000 : 2000},
  AMOUNT_LIMITS: {
    MIN_EUR: 5,
    MAX_EUR: 500,
    MAX_DAILY_EUR: 2000,
    MIN_USD: 6,
    MAX_USD: 600,
    MAX_DAILY_USD: 2400},
  VALIDATION: {
    MAX_METADATA_SIZE: isDevelopment ? 10000 : isProduction ? 3000 : 5000,
    MAX_DESCRIPTION_LENGTH: isDevelopment ? 5000 : isProduction ? 1500 : 2000,
    AMOUNT_COHERENCE_TOLERANCE: isDevelopment ? 0.5 : isProduction ? 0.05 : 0.1,
    ALLOWED_CURRENCIES: ['eur', 'usd'] as const,
    ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'] as const},
  DUPLICATES: {
    WINDOW_MS: isDevelopment ? 30 * 1000 : isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000}} as const;

// =========================================
// ðŸ›¡ï¸ UTILITAIRES SÃ‰CURITÃ‰
// =========================================
function logSecurityEvent(event: string, data: Record<string, unknown>) {
  const timestamp = new Date().toISOString();

  if (isDevelopment) {
    console.log(`ðŸ”§ [DEV-${timestamp}] ${event}:`, data);
  } else if (isProduction) {
    const sanitizedData = {
      ...data,
      userId: data.userId ? String(data.userId).substring(0, 8) + '...' : undefined,
      clientId: data.clientId ? String(data.clientId).substring(0, 8) + '...' : undefined,
      providerId: data.providerId ? String(data.providerId).substring(0, 8) + '...' : undefined};
    console.log(`ðŸ­ [PROD-${timestamp}] ${event}:`, sanitizedData);
  } else {
    console.log(`ðŸ§ª [TEST-${timestamp}] ${event}:`, data);
  }
}

function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  if (BYPASS_MODE) {
    logSecurityEvent('rate_limit_bypassed', { userId });
    return { allowed: true };
  }

  const now = Date.now();
  const key = `payment_${userId}`;
  const limit = rateLimitStore.get(key);

  if (isDevelopment && rateLimitStore.size > 100) {
    for (const [k, l] of rateLimitStore.entries()) {
      if (now > l.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (limit && now > limit.resetTime) {
    rateLimitStore.delete(key);
  }

  const currentLimit = rateLimitStore.get(key) || {
    count: 0,
    resetTime: now + SECURITY_LIMITS.RATE_LIMIT.WINDOW_MS};

  if (currentLimit.count >= SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS) {
    logSecurityEvent('rate_limit_exceeded', {
      userId,
      count: currentLimit.count,
      limit: SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS});
    return { allowed: false, resetTime: currentLimit.resetTime };
  }

  currentLimit.count++;
  rateLimitStore.set(key, currentLimit);
  return { allowed: true };
}

async function validateBusinessLogic(
  data: PaymentIntentRequestData,
  currency: SupportedCurrency,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string }> {
  if (BYPASS_MODE) {
    logSecurityEvent('business_validation_bypassed', { providerId: data.providerId });
    return { valid: true };
  }

  try {
    const providerDoc = await db.collection('users').doc(data.providerId).get();
    const providerData = providerDoc.data();

    if (!providerData) return { valid: false, error: 'Prestataire non trouvÃ©' };
    if (providerData.status === 'suspended' || providerData.status === 'banned') {
      return { valid: false, error: 'Prestataire non disponible' };
    }

    if (isDevelopment) {
      logSecurityEvent('business_validation_dev_mode', {
        providerId: data.providerId,
        amount: data.amount,
        currency});
      return { valid: true };
    }

    const expectedTotal =
      data.serviceType === 'lawyer_call'
        ? currency === 'eur' ? 49 : 55
        : currency === 'eur' ? 19 : 25;

    const tolerance = 15;
    const difference = Math.abs(Number(data.amount) - expectedTotal);

    if (difference > tolerance) {
      logSecurityEvent('business_amount_anomaly', {
        expected: expectedTotal,
        received: data.amount,
        difference,
        tolerance,
        serviceType: data.serviceType,
        currency});

      if (isProduction && difference > 100) {
        return { valid: false, error: 'Montant trÃ¨s Ã©loignÃ© du tarif standard' };
      }
    }

    return { valid: true };
  } catch (error) {
    await logError('validateBusinessLogic', error);
    return { valid: false, error: 'Erreur lors de la validation business' };
  }
}

async function validateAmountSecurity(
  amount: number,
  currency: SupportedCurrency,
  userId: string,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string }> {
  logSecurityEvent('amount_validation_start', { amount, currency, userId });

  const { MIN_EUR, MAX_EUR, MAX_DAILY_EUR, MIN_USD, MAX_USD, MAX_DAILY_USD } = SECURITY_LIMITS.AMOUNT_LIMITS;
  const limits =
    currency === 'eur'
      ? { min: MIN_EUR, max: MAX_EUR, daily: MAX_DAILY_EUR }
      : { min: MIN_USD, max: MAX_USD, daily: MAX_DAILY_USD };

  if (amount < limits.min) {
    return {
      valid: false,
      error: `Montant minimum de ${limits.min}${currency === 'eur' ? 'â‚¬' : '$'} requis`};
  }

  if (amount > limits.max) {
    return {
      valid: false,
      error: `Montant maximum de ${limits.max}${currency === 'eur' ? 'â‚¬' : '$'} dÃ©passÃ©`};
  }

  if (!isDevelopment) {
    try {
      const daily = await checkDailyLimit(userId, amount, currency, db);
      if (!daily.allowed) {
        return { valid: false, error: daily.error };
      }
    } catch (error) {
      await logError('validateAmountSecurity:dailyLimit', error);
      logSecurityEvent('daily_limit_check_error', {
        errorMessage: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : undefined});
    }
  }

  return { valid: true };
}

async function checkDuplicatePayments(
  clientId: string,
  providerId: string,
  amountInMainUnit: number,
  currency: SupportedCurrency,
  db: admin.firestore.Firestore
): Promise<boolean> {
  if (BYPASS_MODE) {
    logSecurityEvent('duplicate_check_bypassed', { clientId, providerId, amountInMainUnit, currency });
    return false;
  }

  try {
    const windowMs = SECURITY_LIMITS.DUPLICATES.WINDOW_MS;

    const existingPayments = await db
      .collection('payments')
      .where('clientId', '==', clientId)
      .where('providerId', '==', providerId)
      .where('currency', '==', currency)
      .where('amountInMainUnit', '==', amountInMainUnit)
      .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
      .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - windowMs)))
      .limit(1)
      .get();

    const hasDuplicate = !existingPayments.empty;

    logSecurityEvent('duplicate_check', {
      clientId,
      providerId,
      amountInMainUnit,
      currency,
      windowMs,
      hasDuplicate});

    return hasDuplicate;
  } catch (error) {
    await logError('checkDuplicatePayments', error);
    return false;
  }
}

function validateAmountCoherence(
  totalAmount: number,
  commissionAmount: number,
  providerAmount: number
): { valid: boolean; error?: string; difference: number } {
  const totalCalculated = Math.round((commissionAmount + providerAmount) * 100) / 100;
  const amountRounded = Math.round(totalAmount * 100) / 100;
  const difference = Math.abs(totalCalculated - amountRounded);
  const tolerance = SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE;

  console.log('ðŸ’° Validation cohÃ©rence (commissionAmount):', {
    totalAmount: amountRounded,
    commissionAmount,
    providerAmount,
    totalCalculated,
    difference,
    tolerance});

  if (difference > tolerance) {
    return {
      valid: false,
      error: `IncohÃ©rence montants: ${difference.toFixed(2)} d'Ã©cart (tolÃ©rance: ${tolerance.toFixed(2)})`,
      difference};
  }

  return { valid: true, difference };
}

function sanitizeAndConvertInput(data: PaymentIntentRequestData) {
  const maxNameLength = isDevelopment ? 500 : 200;
  const maxDescLength = SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
  const maxMetaKeyLength = isDevelopment ? 100 : 50;
  const maxMetaValueLength = isDevelopment ? 500 : 200;

  const currency = (data.currency || 'eur').toLowerCase().trim() as SupportedCurrency;

  const amountInMainUnit = Number(data.amount);
  const commissionAmountInMainUnit = Number(data.commissionAmount);
  const providerAmountInMainUnit = Number(data.providerAmount);

  const amountInCents = toCents(amountInMainUnit, currency);
  const commissionAmountInCents = toCents(commissionAmountInMainUnit, currency);
  const providerAmountInCents = toCents(providerAmountInMainUnit, currency);

  return {
    amountInMainUnit,
    amountInCents,
    commissionAmountInMainUnit,
    commissionAmountInCents,
    providerAmountInMainUnit,
    providerAmountInCents,
    currency,
    serviceType: data.serviceType,
    providerId: data.providerId.trim(),
    clientId: data.clientId.trim(),
    clientEmail: data.clientEmail?.trim().toLowerCase(),
    providerName: data.providerName?.trim().substring(0, maxNameLength),
    description: data.description?.trim().substring(0, maxDescLength),
    callSessionId: data.callSessionId?.trim(),
    metadata: data.metadata
      ? Object.fromEntries(
          Object.entries(data.metadata)
            .filter(([key, value]) => key.length <= maxMetaKeyLength && value.length <= maxMetaValueLength)
            .slice(0, isDevelopment ? 20 : 10)
        )
      : {}};
}

// =========================================
// ðŸš€ CLOUD FUNCTION PRINCIPALE
// =========================================
export const createPaymentIntent = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    concurrency: 1,
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 3,
    // pas de cpu: 0.25/0.5 si concurrency > 1 ; ici on garde 1
  },
  async (request: CallableRequest<PaymentIntentRequestData>) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    try {
      logSecurityEvent('payment_intent_start', {
        requestId,
        environment: process.env.NODE_ENV,
        stripeMode: STRIPE_MODE.value() || 'test',
        isDevelopment,
        isProduction,
        bypassMode: BYPASS_MODE});

      // 1) AUTH
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentification requise pour crÃ©er un paiement.');
      }
      const userId = request.auth.uid;

      // 2) VALIDATION PRÃ‰LIMINAIRE
      if (typeof request.data.amount !== 'number' || isNaN(request.data.amount) || request.data.amount <= 0) {
        throw new HttpsError(
          'invalid-argument',
          `Montant invalide reÃ§u: ${request.data.amount} (type: ${typeof request.data.amount})`
        );
      }
      if (
        typeof request.data.commissionAmount !== 'number' ||
        isNaN(request.data.commissionAmount) ||
        request.data.commissionAmount < 0
      ) {
        throw new HttpsError('invalid-argument', 'Commission invalide');
      }
      if (
        typeof request.data.providerAmount !== 'number' ||
        isNaN(request.data.providerAmount) ||
        request.data.providerAmount < 0
      ) {
        throw new HttpsError('invalid-argument', 'Montant prestataire invalide');
      }

      // 3) RATE LIMITING
      const rateLimitResult = checkRateLimit(userId);
      if (!rateLimitResult.allowed) {
        const waitTime = Math.ceil((rateLimitResult.resetTime! - Date.now()) / 60000);
        throw new HttpsError('resource-exhausted', `Trop de tentatives. RÃ©essayez dans ${waitTime} minutes.`);
      }

      // 4) SANITIZE + CONVERT
      const sanitizedData = sanitizeAndConvertInput(request.data);

      // 5) VALIDATIONS - EXTRACTION DES VARIABLES
      const {
        amountInMainUnit,
        amountInCents,
        commissionAmountInMainUnit,
        commissionAmountInCents,
        providerAmountInMainUnit,
        providerAmountInCents,
        currency,
        serviceType,
        providerId,
        clientId,
        clientEmail,
        providerName,
        description,
        callSessionId,
        metadata} = sanitizedData;

      if (!serviceType || !SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
        throw new HttpsError('invalid-argument', 'Type de service invalide');
      }
      if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
        throw new HttpsError('invalid-argument', 'ID prestataire invalide');
      }
      if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
        throw new HttpsError('invalid-argument', 'ID client invalide');
      }
      if (!SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(currency)) {
        throw new HttpsError('invalid-argument', `Devise non supportÃ©e: ${currency}`);
      }

      // 6) Validation cohÃ©rence interne
      const coherence = validateAmountCoherence(
        amountInMainUnit,
        commissionAmountInMainUnit,
        providerAmountInMainUnit
      );
      if (!coherence.valid) {
        if (isProduction || coherence.difference > 1) {
          throw new HttpsError('invalid-argument', coherence.error!);
        } else {
          logSecurityEvent('amount_coherence_warning_accepted', coherence);
        }
      }

      // 7) Validation sÃ©curitaire (montants + limites journaliÃ¨res)
      const db = admin.firestore();
      const sec = await validateAmountSecurity(amountInMainUnit, currency, userId, db);
      if (!sec.valid) {
        throw new HttpsError('invalid-argument', sec.error!);
      }

      // 8) Validation business (prestataire / tarifs attendus)
      const biz = await validateBusinessLogic(request.data, currency, db);
      if (!biz.valid) {
        throw new HttpsError('failed-precondition', biz.error!);
      }

      // 9) Anti-doublons
      const hasDuplicate = await checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db);
      if (hasDuplicate) {
        throw new HttpsError('already-exists', 'Un paiement similaire est dÃ©jÃ  en cours de traitement.');
      }

      // ðŸ”‘ Choix de la clÃ© Stripe selon le mode
      const stripeSecretKey = getStripeSecretParam().value();

      // ðŸ§­ DÃ©rive le providerType
      const providerType: 'lawyer' | 'expat' =
        serviceType === 'lawyer_call' ? 'lawyer' : 'expat';

      // 10) CrÃ©ation du PaymentIntent via StripeManager
      const stripePayload = {
        amount: amountInMainUnit,
        currency,
        clientId,
        providerId,
        serviceType,
        providerType,
        commissionAmount: commissionAmountInMainUnit,
        providerAmount: providerAmountInMainUnit,
        callSessionId,
        metadata: {
          clientEmail: clientEmail || '',
          providerName: providerName || '',
          description: description || `Service ${serviceType}`,
          requestId,
          environment: process.env.NODE_ENV || 'development',
          originalTotal: amountInMainUnit.toString(),
          originalCommission: commissionAmountInMainUnit.toString(),
          originalProviderAmount: providerAmountInMainUnit.toString(),
          originalCurrency: currency,
          stripeMode: STRIPE_MODE.value() || 'test',
          ...metadata}};

      const result = await stripeManager.createPaymentIntent(stripePayload, stripeSecretKey);

      if (!result?.success) {
        await logError('createPaymentIntent:stripe_error', {
          requestId,
          userId,
          serviceType,
          amountInMainUnit,
          amountInCents,
          error: result?.error});
        throw new HttpsError('internal', 'Erreur lors de la crÃ©ation du paiement. Veuillez rÃ©essayer.');
      }

      // 11) Audit (prod uniquement)
      if (isProduction) {
        try {
          await logPaymentAudit(
            {
              paymentId: result.paymentIntentId!,
              userId: clientId,
              amount: amountInMainUnit,
              currency: currency as 'eur' | 'usd',
              type: (serviceType === 'lawyer_call' ? 'lawyer' : 'expat') as 'lawyer' | 'expat',
              action: 'create' as const,
              metadata: {
                commissionAmountInMainUnit,
                providerAmountInMainUnit,
                amountInCents,
                commissionAmountInCents,
                providerAmountInCents,
                requestId}},
            db
          );
        } catch (auditError) {
          console.warn('Audit logging failed:', auditError);
        }
      }

      console.log('âœ… Paiement crÃ©Ã©:', {
        id: result.paymentIntentId,
        total: formatAmount(amountInMainUnit, currency),
        commission: formatAmount(commissionAmountInMainUnit, currency),
        provider: formatAmount(providerAmountInMainUnit, currency)});

      // RÃ©ponse de base
      const baseResponse: SuccessResponse = {
        success: true,
        clientSecret: result.clientSecret!,
        paymentIntentId: result.paymentIntentId!,
        amount: amountInCents, // on renvoie en cents cÃ´tÃ© client pour Stripe.js
        currency,
        serviceType,
        status: 'requires_payment_method',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()};

      // RÃ©cupÃ©ration sÃ©curisÃ©e de l'account ID Stripe
      let accountId: string | undefined;
      try {
        const stripe = new Stripe(getStripeSecretParam().value(), { apiVersion: '2023-10-16' });
        const account = await stripe.accounts.retrieve();
        accountId = account.id;
      } catch (error) {
        console.warn('Impossible de rÃ©cupÃ©rer l\'account ID Stripe:', error);
        accountId = undefined;
      }

      // RÃ©ponse finale avec informations supplÃ©mentaires
      const finalResponse: SuccessResponse & { stripeMode: string; stripeAccountId?: string } = {
        ...baseResponse,
        stripeMode: STRIPE_MODE.value() || 'test',
        stripeAccountId: accountId};

      return finalResponse;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;

      const errorData: Record<string, unknown> = {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        requestData: {
          amount: request.data?.amount,
          serviceType: request.data?.serviceType,
          currency: request.data?.currency || 'eur',
          hasAuth: !!request.auth,
          hasCommission: request.data?.commissionAmount !== undefined},
        userAuth: request.auth?.uid || 'not-authenticated',
        environment: process.env.NODE_ENV,
        stripeMode: STRIPE_MODE.value() || 'test'};

      await logError('createPaymentIntent:error', errorData);

      if (error instanceof HttpsError) throw error;

      const errorResponse: ErrorResponse = {
        success: false,
        error: "Une erreur inattendue s'est produite. Veuillez rÃ©essayer.",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId};

      throw new HttpsError('internal', errorResponse.error, errorResponse);
    }
  }
);

/**
 * âœ… RÃ©cap dÃ©ploiement / config
 *
 * 1) Stocke tes deux clÃ©s dans Secret Manager :
 *
 * 2) Ajoute le param STRIPE_MODE (config param, pas un secret) :
 *    firebase functions:config:set params_STRIPE_MODE="test"
 *    # ou "live" lors du basculement prod
 *
 * 3) VÃ©rifie que ton front et ton back sont dans le mÃªme mode :
 *    - Front: publie pk_test_*** si STRIPE_MODE=test, pk_live_*** si STRIPE_MODE=live
 *    - Back : sÃ©lectionne la bonne sk_* via STRIPE_MODE
 *
 * 4) DÃ©ploie :
 *    firebase deploy --only functions
 */

void _FUNCTION_CONFIG;
