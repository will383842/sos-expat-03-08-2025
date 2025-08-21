// firebase/functions/src/createPaymentIntent.ts
// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU au début du fichier
import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { stripeManager } from './StripeManager';
import { logError } from './utils/logs/logError';
import * as admin from 'firebase-admin';
import {
  toCents,
  checkDailyLimit,
  logPaymentAudit,
  formatAmount,
} from './utils/paymentValidators';

// =========================================
// 🔧 FIX CRITIQUE: OPTIMISATION CPU - Configuration légère dès le départ
// =========================================
const CPU_OPTIMIZED_CONFIG = {
  memory: '128MiB' as const,
  timeoutSeconds: 30,
  maxInstances: 10,
  minInstances: 0,
  concurrency: 80,
  cors: [
    'http://localhost:3000',
    'http://localhost:5175',   // ✅ AJOUTÉ - votre vrai port !
    'http://localhost:5173',   // ✅ Gardé pour compatibilité
    'http://localhost:5196',   // ✅ Gardé pour compatibilité  
    'http://localhost:8080',
    'https://sos-urgently-ac307.web.app',
    'https://sos-urgently-ac307.firebaseapp.com',
  ],
};

// =========================================
// 🌍 DÉTECTION D'ENVIRONNEMENT INTELLIGENTE (optimisée)
// =========================================
const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'dev' ||
  !process.env.NODE_ENV; // Par défaut = dev
const isProduction = process.env.NODE_ENV === 'production';

// Variable de bypass d'urgence (à utiliser avec EXTRÊME précaution)
const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';

// Log de démarrage pour vérifier l'environnement
console.log(
  `🌍 Environment: ${process.env.NODE_ENV || 'development'}, Production: ${isProduction}, Bypass: ${BYPASS_MODE}`
);

// Rate limiting store (en production, utiliser Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// =========================================
/** 📋 INTERFACES ET TYPES (optimisé) */
// =========================================
type SupportedCurrency = 'eur' | 'usd';
type SupportedServiceType = 'lawyer_call' | 'expat_call';

// ✅ INTERFACE CORRIGÉE - utilise commissionAmount comme CallCheckout.tsx
interface PaymentIntentRequestData {
  amount: number; // Montant dans l'unité principale (EUR ou USD) — envoyé par le frontend
  currency?: SupportedCurrency;
  serviceType: SupportedServiceType;
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;

  /** ✅ Frais de commission (dans l'unité principale) - CORRESPOND au frontend */
  commissionAmount: number;

  /** ✅ Rémunération prestataire (dans l'unité principale) */
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
  amount: number; // EN CENTIMES dans la réponse (cohérent avec Stripe)
  currency: SupportedCurrency;
  serviceType: string;
  status: string;
  expiresAt: string;
}

// =========================================
// ⚙️ CONFIGURATION ADAPTÉE À L'ENVIRONNEMENT (optimisée)
// =========================================
const SECURITY_LIMITS = {
  RATE_LIMIT: {
    MAX_REQUESTS: isDevelopment ? 1000 : isProduction ? 25 : 100,
    WINDOW_MS: isDevelopment ? 2 * 60 * 1000 : isProduction ? 8 * 60 * 1000 : 5 * 60 * 1000,
    GLOBAL_MAX: isDevelopment ? 10000 : isProduction ? 1000 : 2000,
  },
  AMOUNT_LIMITS: {
    // Limites en unité principale (EUR ou USD selon la devise)
    MIN_EUR: 5,
    MAX_EUR: 500,
    MAX_DAILY_EUR: 2000,
    MIN_USD: 6,
    MAX_USD: 600,
    MAX_DAILY_USD: 2400,
  },
  VALIDATION: {
    MAX_METADATA_SIZE: isDevelopment ? 10000 : isProduction ? 3000 : 5000,
    MAX_DESCRIPTION_LENGTH: isDevelopment ? 5000 : isProduction ? 1500 : 2000,
    // Tolérance de cohérence (dans l'unité principale)
    AMOUNT_COHERENCE_TOLERANCE: isDevelopment ? 0.5 : isProduction ? 0.05 : 0.1,
    ALLOWED_CURRENCIES: ['eur', 'usd'] as const,
    ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'] as const,
  },
  DUPLICATES: {
    WINDOW_MS: isDevelopment ? 30 * 1000 : isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000,
  },
} as const;

// =========================================
// 🛡️ FONCTIONS DE SÉCURITÉ ADAPTÉES (optimisées)
// =========================================

/**
 * Rate limiting avec configuration par environnement (optimisé CPU)
 */
function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  if (BYPASS_MODE) {
    logSecurityEvent('rate_limit_bypassed', { userId });
    return { allowed: true };
  }

  const now = Date.now();
  const key = `payment_${userId}`;
  const limit = rateLimitStore.get(key);

  // Nettoyage léger uniquement en développement
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
    resetTime: now + SECURITY_LIMITS.RATE_LIMIT.WINDOW_MS,
  };

  if (currentLimit.count >= SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS) {
    logSecurityEvent('rate_limit_exceeded', {
      userId,
      count: currentLimit.count,
      limit: SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS,
    });
    return { allowed: false, resetTime: currentLimit.resetTime };
  }

  currentLimit.count++;
  rateLimitStore.set(key, currentLimit);
  return { allowed: true };
}

/**
 * Validation business logic (par devise) — montants dans l'unité principale
 */
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

    if (!providerData) return { valid: false, error: 'Prestataire non trouvé' };
    if (providerData.status === 'suspended' || providerData.status === 'banned') {
      return { valid: false, error: 'Prestataire non disponible' };
    }

    if (isDevelopment) {
      logSecurityEvent('business_validation_dev_mode', {
        providerId: data.providerId,
        amount: data.amount,
        currency,
      });
      return { valid: true };
    }

    // Tarifs attendus par type et devise (prix total client)
    const expectedTotal =
      data.serviceType === 'lawyer_call'
        ? currency === 'eur'
          ? 49
          : 55
        : currency === 'eur'
        ? 19
        : 25;

    const tolerance = 15; // Tolerance "business" (unités)
    const difference = Math.abs(Number(data.amount) - expectedTotal);

    if (difference > tolerance) {
      logSecurityEvent('business_amount_anomaly', {
        expected: expectedTotal,
        received: data.amount,
        difference,
        tolerance,
        serviceType: data.serviceType,
        currency,
      });

      if (isProduction && difference > 100) {
        return { valid: false, error: 'Montant très éloigné du tarif standard' };
      }
    }

    return { valid: true };
  } catch (error) {
    await logError('validateBusinessLogic', error);
    return { valid: false, error: 'Erreur lors de la validation business' };
  }
}

/**
 * Validation sécuritaire des montants — prend en compte la devise
 */
async function validateAmountSecurity(
  amount: number, // unité principale (EUR ou USD)
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
      error: `Montant minimum de ${limits.min}${currency === 'eur' ? '€' : '$'} requis`,
    };
  }

  if (amount > limits.max) {
    return {
      valid: false,
      error: `Montant maximum de ${limits.max}${currency === 'eur' ? '€' : '$'} dépassé`,
    };
  }

  // Limite journalière (via util partagé) — seulement hors dev
  if (!isDevelopment) {
    try {
      const daily = await checkDailyLimit(userId, amount, currency, db);
      if (!daily.allowed) {
        return { valid: false, error: daily.error };
      }
    } catch (error) {
      await logError('validateAmountSecurity:dailyLimit', error);
      logSecurityEvent('daily_limit_check_error', { error });
    }
  }

  return { valid: true };
}

/**
 * Vérification des doublons (par devise) — montants dans l'unité principale
 */
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
      .where('amountInMainUnit', '==', amountInMainUnit) // champ harmonisé (voir sanitize)
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
      hasDuplicate,
    });

    return hasDuplicate;
  } catch (error) {
    await logError('checkDuplicatePayments', error);
    return false;
  }
}

/**
 * ✅ Validation de cohérence: total = commission + prestataire (dans l'unité principale)
 */
function validateAmountCoherence(
  totalAmount: number,
  commissionAmount: number, // ✅ CHANGEMENT: commissionAmount au lieu de connectionFeeAmount
  providerAmount: number
): { valid: boolean; error?: string; difference: number } {
  const totalCalculated = Math.round((commissionAmount + providerAmount) * 100) / 100;
  const amountRounded = Math.round(totalAmount * 100) / 100;
  const difference = Math.abs(totalCalculated - amountRounded);
  const tolerance = SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE;

  console.log('💰 Validation cohérence (commissionAmount):', {
    totalAmount: amountRounded,
    commissionAmount,
    providerAmount,
    totalCalculated,
    difference,
    tolerance,
  });

  if (difference > tolerance) {
    return {
      valid: false,
      error: `Incohérence montants: ${difference.toFixed(2)} d'écart (tolérance: ${tolerance.toFixed(2)})`,
      difference,
    };
  }

  return { valid: true, difference };
}

/**
 * ✅ Sanitization ET conversion des données en fonction de la devise
 */
function sanitizeAndConvertInput(
  data: PaymentIntentRequestData
): {
  amountInMainUnit: number; // EUR ou USD
  amountInCents: number;
  commissionAmountInMainUnit: number; // ✅ CHANGEMENT
  commissionAmountInCents: number;    // ✅ CHANGEMENT
  providerAmountInMainUnit: number;
  providerAmountInCents: number;
  currency: SupportedCurrency;
  serviceType: SupportedServiceType;
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  callSessionId?: string;
  metadata: Record<string, string>;
} {
  const maxNameLength = isDevelopment ? 500 : 200;
  const maxDescLength = SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
  const maxMetaKeyLength = isDevelopment ? 100 : 50;
  const maxMetaValueLength = isDevelopment ? 500 : 200;

  const currency = (data.currency || 'eur').toLowerCase().trim() as SupportedCurrency;

  const amountInMainUnit = Number(data.amount);
  const commissionAmountInMainUnit = Number(data.commissionAmount); // ✅ CHANGEMENT
  const providerAmountInMainUnit = Number(data.providerAmount);

  const amountInCents = toCents(amountInMainUnit, currency);
  const commissionAmountInCents = toCents(commissionAmountInMainUnit, currency); // ✅ CHANGEMENT
  const providerAmountInCents = toCents(providerAmountInMainUnit, currency);

  return {
    amountInMainUnit,
    amountInCents,
    commissionAmountInMainUnit, // ✅ CHANGEMENT
    commissionAmountInCents,    // ✅ CHANGEMENT
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
      : {},
  };
}

/**
 * Logging adapté à l'environnement (optimisé)
 */
function logSecurityEvent(event: string, data: Record<string, unknown>) {
  const timestamp = new Date().toISOString();

  if (isDevelopment) {
    console.log(`🔧 [DEV-${timestamp}] ${event}:`, data);
  } else if (isProduction) {
    const sanitizedData = {
      ...data,
      userId: data.userId ? String(data.userId).substring(0, 8) + '...' : undefined,
      clientId: data.clientId ? String(data.clientId).substring(0, 8) + '...' : undefined,
      providerId: data.providerId ? String(data.providerId).substring(0, 8) + '...' : undefined,
    };
    console.log(`🏭 [PROD-${timestamp}] ${event}:`, sanitizedData);
  } else {
    console.log(`🧪 [TEST-${timestamp}] ${event}:`, data);
  }
}

// =========================================
// 🚀 CLOUD FUNCTION PRINCIPALE (OPTIMISÉE CPU) — INTERFACE CORRIGÉE
// =========================================
export const createPaymentIntent = onCall(
  CPU_OPTIMIZED_CONFIG,
  async (request: CallableRequest<PaymentIntentRequestData>) => {
    // CORS fix deployment - Updated 2025-01-20
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    logSecurityEvent('payment_intent_start', {
      requestId,
      environment: process.env.NODE_ENV,
      isDevelopment,
      isProduction,
      bypassMode: BYPASS_MODE,
    });

    try {
      // 1) AUTH
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
      }
      const userId = request.auth.uid;

      // ✅ Debug entrée avec interface corrigée
      console.log('💳 === BACKEND - DONNÉES REÇUES (interface corrigée) ===');
      console.log('📥 Données brutes reçues:', {
        amount: request.data.amount,
        commissionAmount: request.data.commissionAmount, // ✅ CHANGEMENT
        providerAmount: request.data.providerAmount,
        serviceType: request.data.serviceType,
        currency: request.data.currency || 'eur',
      });

      // 2) VALIDATION PRÉLIMINAIRE STRICTE
      if (typeof request.data.amount !== 'number' || isNaN(request.data.amount) || request.data.amount <= 0) {
        throw new HttpsError(
          'invalid-argument',
          `Montant invalide reçu: ${request.data.amount} (type: ${typeof request.data.amount})`
        );
      }
      
      // ✅ Validation avec commissionAmount
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
        throw new HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitTime} minutes.`);
      }

      // 4) SANITIZE + CONVERT
      const sanitizedData = sanitizeAndConvertInput(request.data);

      console.log('💳 === APRÈS SANITIZATION (interface corrigée) ===');
      console.log('✅ Données sanitisées & converties:', {
        totalInMainUnit: sanitizedData.amountInMainUnit,
        totalInCents: sanitizedData.amountInCents,
        commissionInMainUnit: sanitizedData.commissionAmountInMainUnit, // ✅ CHANGEMENT
        commissionInCents: sanitizedData.commissionAmountInCents,       // ✅ CHANGEMENT
        providerInMainUnit: sanitizedData.providerAmountInMainUnit,
        providerInCents: sanitizedData.providerAmountInCents,
        currency: sanitizedData.currency,
      });

      // 5) VALIDATION DE BASE
      const {
        amountInMainUnit,
        amountInCents,
        commissionAmountInMainUnit, // ✅ CHANGEMENT
        commissionAmountInCents,    // ✅ CHANGEMENT
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
        metadata,
      } = sanitizedData;

      if (!serviceType || !SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType as any)) {
        throw new HttpsError('invalid-argument', 'Type de service invalide');
      }
      if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
        throw new HttpsError('invalid-argument', 'ID prestataire invalide');
      }
      if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
        throw new HttpsError('invalid-argument', 'ID client invalide');
      }

      // 6) VALIDATION DES ENUMS / TYPES
      if (!SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(currency)) {
        throw new HttpsError('invalid-argument', `Devise non supportée: ${currency}`);
      }

      // 7) ✅ VALIDATION COHÉRENCE (total = commission + prestataire) - Interface corrigée
      const coherence = validateAmountCoherence(
        amountInMainUnit,
        commissionAmountInMainUnit, // ✅ CHANGEMENT
        providerAmountInMainUnit
      );
      if (!coherence.valid) {
        if (isProduction || coherence.difference > 1) {
          throw new HttpsError('invalid-argument', coherence.error!);
        } else {
          logSecurityEvent('amount_coherence_warning_accepted', coherence);
        }
      }

      // 8) VALIDATION SÉCURITAIRE (limites / daily)
      const db = admin.firestore();
      const sec = await validateAmountSecurity(amountInMainUnit, currency, userId, db);
      if (!sec.valid) {
        throw new HttpsError('invalid-argument', sec.error!);
      }

      // 9) VALIDATION BUSINESS
      const biz = await validateBusinessLogic(request.data, currency, db);
      if (!biz.valid) {
        throw new HttpsError('failed-precondition', biz.error!);
      }

      // 10) ANTI-DOUBLONS
      const hasDuplicate = await checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db);
      if (hasDuplicate) {
        throw new HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
      }

      // 11) ✅ CRÉATION PAIEMENT (Stripe) — payload avec commissionAmount
      console.log('💳 === ENVOI VERS STRIPEMANAGER (interface corrigée) ===');
      
      // ✅ Interface typée pour StripeManager
      interface StripeManagerPayload {
        amount: number;
        currency: SupportedCurrency;
        clientId: string;
        providerId: string;
        serviceType: SupportedServiceType;
        providerType: 'lawyer' | 'expat';
        commissionAmount: number;
        providerAmount: number;
        callSessionId?: string;
        metadata: Record<string, string>;
      }

      const stripePayload: StripeManagerPayload = {
        amount: amountInCents, // centimes
        currency,
        clientId,
        providerId,
        serviceType,
        providerType: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
        commissionAmount: commissionAmountInCents, // ✅ CHANGEMENT - StripeManager accepte commissionAmount
        providerAmount: providerAmountInCents, // centimes
        callSessionId,
        metadata: {
          clientEmail: clientEmail || '',
          providerName: providerName || '',
          description: description || `Service ${serviceType}`,
          requestId,
          environment: process.env.NODE_ENV || 'development',
          // Trace côté audit (unités principales)
          originalTotal: amountInMainUnit.toString(),
          originalCommission: commissionAmountInMainUnit.toString(), // ✅ CHANGEMENT
          originalProviderAmount: providerAmountInMainUnit.toString(),
          originalCurrency: currency,
          ...metadata,
        },
      };

      const result = await stripeManager.createPaymentIntent(stripePayload);

      if (!result?.success) {
        await logError('createPaymentIntent:stripe_error', {
          requestId,
          userId,
          serviceType,
          amountInMainUnit,
          amountInCents,
          error: result?.error,
        });
        throw new HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
      }

      // 12) AUDIT
      if (isProduction) {
        interface PaymentAuditData {
          paymentId: string;
          userId: string;
          amount: number;
          currency: SupportedCurrency;
          type: 'lawyer' | 'expat';
          action: 'create';
          metadata: {
            commissionAmountInMainUnit: number;
            providerAmountInMainUnit: number;
            amountInCents: number;
            commissionAmountInCents: number;
            providerAmountInCents: number;
            requestId: string;
          };
        }

        const auditData: PaymentAuditData = {
          paymentId: result.paymentIntentId!,
          userId: clientId,
          amount: amountInMainUnit,
          currency,
          type: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
          action: 'create',
          metadata: {
            commissionAmountInMainUnit, // ✅ CHANGEMENT
            providerAmountInMainUnit,
            amountInCents,
            commissionAmountInCents, // ✅ CHANGEMENT
            providerAmountInCents,
            requestId,
          },
        };

        await logPaymentAudit(auditData, db);
      }

      console.log('✅ Paiement créé (interface corrigée):', {
        id: result.paymentIntentId,
        total: formatAmount(amountInMainUnit, currency),
        commission: formatAmount(commissionAmountInMainUnit, currency), // ✅ CHANGEMENT
        provider: formatAmount(providerAmountInMainUnit, currency),
      });

      // 13) RÉPONSE
      const response: SuccessResponse = {
        success: true,
        clientSecret: result.clientSecret!,
        paymentIntentId: result.paymentIntentId!,
        amount: amountInCents,
        currency,
        serviceType,
        status: 'requires_payment_method',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      return response;
    } catch (error: unknown) {
      // 14) ERREURS
      const processingTime = Date.now() - startTime;

      const errorData: Record<string, unknown> = {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
        requestData: {
          amount: request.data?.amount,
          serviceType: request.data?.serviceType,
          currency: request.data?.currency || 'eur',
          hasAuth: !!request.auth,
          hasCommission: request.data?.commissionAmount !== undefined, // ✅ CHANGEMENT
        },
        userAuth: request.auth?.uid || 'not-authenticated',
        environment: process.env.NODE_ENV,
      };

      await logError('createPaymentIntent:error', errorData);

      if (error instanceof HttpsError) throw error;

      const errorResponse: ErrorResponse = {
        success: false,
        error: "Une erreur inattendue s'est produite. Veuillez réessayer.",
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId,
      };

      throw new HttpsError('internal', errorResponse.error, errorResponse);
    }
  }
);