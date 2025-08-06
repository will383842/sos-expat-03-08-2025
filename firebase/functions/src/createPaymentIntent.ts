import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { stripeManager, StripePaymentData } from './StripeManager';
import { logError } from './utils/logs/logError';
import * as admin from 'firebase-admin';

// =========================================
// 🌍 DÉTECTION D'ENVIRONNEMENT INTELLIGENTE
// =========================================
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.NODE_ENV === 'dev' || 
                     !process.env.NODE_ENV; // Par défaut = dev
const isProduction = process.env.NODE_ENV === 'production';

// Variable de bypass d'urgence (à utiliser avec EXTRÊME précaution)
const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';

// Log de démarrage pour vérifier l'environnement
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}, Production: ${isProduction}, Bypass: ${BYPASS_MODE}`);

// Rate limiting store (en production, utiliser Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// =========================================
// 📋 INTERFACES ET TYPES
// =========================================
interface PaymentIntentRequestData {
  amount: number; // 🔧 FIX: MAINTENANT EN CENTIMES depuis le frontend
  currency?: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  commissionAmount: number; // 🔧 FIX: EN CENTIMES
  providerAmount: number; // 🔧 FIX: EN CENTIMES
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
  currency: string;
  serviceType: string;
  status: string;
  expiresAt: string;
}

// =========================================
// ⚙️ CONFIGURATION ADAPTÉE À L'ENVIRONNEMENT
// =========================================
const SECURITY_LIMITS = {
  RATE_LIMIT: {
    // Développement: Très permissif pour les tests
    // Test/Staging: Modéré
    // Production: Sécurisé mais raisonnable
    MAX_REQUESTS: isDevelopment ? 1000 : (isProduction ? 25 : 100),
    WINDOW_MS: isDevelopment ? 2 * 60 * 1000 : (isProduction ? 8 * 60 * 1000 : 5 * 60 * 1000), // 2min dev, 8min prod, 5min test
    GLOBAL_MAX: isDevelopment ? 10000 : (isProduction ? 1000 : 2000),
  },
  AMOUNT_LIMITS: {
    // 🔧 FIX: Limites EN CENTIMES (cohérent avec Stripe)
    MIN_AMOUNT: 500, // 5€ en centimes
    MAX_AMOUNT: 50000, // 500€ en centimes 
    MAX_DAILY_USER: 200000, // 2000€ par jour par utilisateur EN CENTIMES
  },
  VALIDATION: {
    MAX_METADATA_SIZE: isDevelopment ? 10000 : (isProduction ? 3000 : 5000),
    MAX_DESCRIPTION_LENGTH: isDevelopment ? 5000 : (isProduction ? 1500 : 2000),
    // Tolérance pour cohérence des montants EN CENTIMES
    AMOUNT_COHERENCE_TOLERANCE: isDevelopment ? 50 : (isProduction ? 5 : 10), // 🔧 FIX: EN CENTIMES
    // Tolérance pour validation business EN CENTIMES
    BUSINESS_AMOUNT_TOLERANCE: isDevelopment ? 5000 : (isProduction ? 1500 : 2500), // 🔧 FIX: EN CENTIMES
    ALLOWED_CURRENCIES: ['eur', 'usd', 'gbp'],
    ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'] as const,
  },
  DUPLICATES: {
    // Fenêtre de vérification des doublons
    WINDOW_MS: isDevelopment ? 30 * 1000 : (isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000), // 30s dev, 5min prod, 2min test
  }
} as const;

// =========================================
// 🛡️ FONCTIONS DE SÉCURITÉ ADAPTÉES
// =========================================

/**
 * Rate limiting avec configuration par environnement
 */
function checkRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  // Bypass complet en mode debug
  if (BYPASS_MODE) {
    logSecurityEvent('rate_limit_bypassed', { userId });
    return { allowed: true };
  }

  // Nettoyage automatique du cache en développement
  if (isDevelopment) {
    const now = Date.now();
    for (const [key, limit] of rateLimitStore.entries()) {
      if (now > limit.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  const now = Date.now();
  const key = `payment_${userId}`;
  const limit = rateLimitStore.get(key);

  // Nettoyer les anciens enregistrements
  if (limit && now > limit.resetTime) {
    rateLimitStore.delete(key);
  }

  const currentLimit = rateLimitStore.get(key) || { 
    count: 0, 
    resetTime: now + SECURITY_LIMITS.RATE_LIMIT.WINDOW_MS 
  };

  if (currentLimit.count >= SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS) {
    logSecurityEvent('rate_limit_exceeded', { 
      userId, 
      count: currentLimit.count, 
      limit: SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS 
    });
    return { allowed: false, resetTime: currentLimit.resetTime };
  }

  currentLimit.count++;
  rateLimitStore.set(key, currentLimit);
  return { allowed: true };
}

/**
 * 🔧 FIX: Validation business logic - montants EN CENTIMES
 */
async function validateBusinessLogic(
  data: PaymentIntentRequestData,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string }> {
  
  // Mode bypass complet
  if (BYPASS_MODE) {
    logSecurityEvent('business_validation_bypassed', { providerId: data.providerId });
    return { valid: true };
  }

  try {
    const providerDoc = await db.collection('users').doc(data.providerId).get();
    const providerData = providerDoc.data();

    if (!providerData) {
      return { valid: false, error: 'Prestataire non trouvé' };
    }

    // Vérifications de statut (importantes dans tous les environnements)
    if (providerData.status === 'suspended' || providerData.status === 'banned') {
      return { valid: false, error: 'Prestataire non disponible' };
    }

    // Validation allégée en développement
    if (isDevelopment) {
      logSecurityEvent('business_validation_dev_mode', { 
        providerId: data.providerId,
        amount: data.amount 
      });
      return { valid: true };
    }

    // 🔧 FIX: Validation des tarifs avec montants EN CENTIMES
    const expectedAmountCents = (providerData.price || (data.serviceType === 'lawyer_call' ? 49 : 19)) * 100;
    const tolerance = SECURITY_LIMITS.VALIDATION.BUSINESS_AMOUNT_TOLERANCE;
    const difference = Math.abs(data.amount - expectedAmountCents);
    
    if (difference > tolerance) {
      logSecurityEvent('business_amount_anomaly', { 
        expected: expectedAmountCents,
        received: data.amount,
        difference,
        tolerance,
        serviceType: data.serviceType
      });
      
      // En production, bloquer seulement si très éloigné
      if (isProduction && difference > 10000) { // 100€ d'écart EN CENTIMES = suspect
        return { valid: false, error: 'Montant très éloigné du tarif standard' };
      }
    }

    // 🔧 FIX: Vérification cohérence commission/prestataire EN CENTIMES
    const expectedCommissionCents = Math.round(expectedAmountCents * 0.20);
    const expectedProviderAmountCents = expectedAmountCents - expectedCommissionCents;
    
    const commissionDiff = Math.abs(data.commissionAmount - expectedCommissionCents);
    const providerDiff = Math.abs(data.providerAmount - expectedProviderAmountCents);
    
    if (commissionDiff > 500 || providerDiff > 500) { // Tolérance 5€ EN CENTIMES
      logSecurityEvent('commission_split_anomaly', {
        expectedCommission: expectedCommissionCents,
        receivedCommission: data.commissionAmount,
        expectedProvider: expectedProviderAmountCents,
        receivedProvider: data.providerAmount
      });
      
      // Bloquer seulement si très incohérent
      if (isProduction && (commissionDiff > 2000 || providerDiff > 2000)) { // 20€ EN CENTIMES
        return { valid: false, error: 'Répartition des montants très incohérente' };
      }
    }

    return { valid: true };

  } catch (error) {
    await logError('validateBusinessLogic', error);
    return { valid: false, error: 'Erreur lors de la validation business' };
  }
}

/**
 * 🔧 FIX: Validation sécuritaire des montants - REÇOIT DES CENTIMES
 */
async function validateAmountSecurity(
  amount: number, // ✅ REÇOIT MAINTENANT DES CENTIMES
  userId: string,
  db: admin.firestore.Firestore
): Promise<{ valid: boolean; error?: string }> {
  
  logSecurityEvent('amount_validation_start', { amount, userId });
  
  // 🔧 FIX: Limites EN CENTIMES - comparaisons directes
  if (amount < SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT) {
    return { 
      valid: false, 
      error: `Montant minimum de ${SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT / 100}€ requis` 
    };
  }

  if (amount > SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT) {
    return { 
      valid: false, 
      error: `Montant maximum de ${SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT / 100}€ dépassé` 
    };
  }

  // 2. Limite journalière (désactivée en développement)
  if (!isDevelopment) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyPaymentsQuery = await db.collection('payments')
        .where('clientId', '==', userId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
        .where('status', 'in', ['succeeded', 'requires_capture', 'processing'])
        .get();

      // 🔧 FIX: Calcul en centimes cohérent
      const dailyTotalCents = dailyPaymentsQuery.docs.reduce((total, doc) => {
        const paymentAmount = doc.data().amount || 0;
        // ✅ Assumer que les montants stockés sont en centimes (nouveau système)
        return total + paymentAmount;
      }, 0);

      logSecurityEvent('daily_limit_check', { 
        dailyTotalCents, 
        newAmountCents: amount, 
        limitCents: SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER 
      });

      if (dailyTotalCents + amount > SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER) {
        return { 
          valid: false, 
          error: `Limite journalière dépassée (${Math.round((dailyTotalCents + amount) / 100)}€/${SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER / 100}€)` 
        };
      }
    } catch (error) {
      await logError('validateAmountSecurity:dailyLimit', error);
      // Ne pas bloquer si erreur de calcul, juste logger
      logSecurityEvent('daily_limit_check_error', { error });
    }
  }

  return { valid: true };
}

/**
 * 🔧 FIX: Vérification des doublons - montants EN CENTIMES
 */
async function checkDuplicatePayments(
  clientId: string, 
  providerId: string, 
  amount: number, // EN CENTIMES
  db: admin.firestore.Firestore
): Promise<boolean> {
  
  // Bypass en mode debug
  if (BYPASS_MODE) {
    logSecurityEvent('duplicate_check_bypassed', { clientId, providerId, amount });
    return false;
  }

  try {
    const windowMs = SECURITY_LIMITS.DUPLICATES.WINDOW_MS;
    
    const existingPayments = await db.collection('payments')
      .where('clientId', '==', clientId)
      .where('providerId', '==', providerId)
      .where('amount', '==', amount) // Comparaison en centimes
      .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
      .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - windowMs)))
      .limit(1)
      .get();

    const hasDuplicate = !existingPayments.empty;
    
    logSecurityEvent('duplicate_check', { 
      clientId, 
      providerId, 
      amount, 
      amountInEuros: amount / 100,
      windowMs, 
      hasDuplicate 
    });

    return hasDuplicate;
  } catch (error) {
    await logError('checkDuplicatePayments', error);
    return false; // En cas d'erreur, ne pas bloquer
  }
}

/**
 * 🔧 FIX: Validation cohérence des montants - TOUS EN CENTIMES
 */
function validateAmountCoherence(
  amount: number,           // EN CENTIMES
  commissionAmount: number, // EN CENTIMES
  providerAmount: number    // EN CENTIMES
): { valid: boolean; error?: string; difference: number } {
  
  const totalCalculated = Math.round(commissionAmount + providerAmount);
  const amountRounded = Math.round(amount);
  const difference = Math.abs(totalCalculated - amountRounded);
  const tolerance = SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE;
  
  logSecurityEvent('amount_coherence_check', {
    amount: amountRounded,
    amountInEuros: amountRounded / 100,
    commission: commissionAmount,
    commissionInEuros: commissionAmount / 100,
    provider: providerAmount,
    providerInEuros: providerAmount / 100,
    total_calculated: totalCalculated,
    difference,
    tolerance,
    toleranceInEuros: tolerance / 100
  });
  
  if (difference > tolerance) {
    return {
      valid: false,
      error: `Incohérence montants: ${(difference / 100).toFixed(2)}€ d'écart (tolérance: ${(tolerance / 100).toFixed(2)}€)`,
      difference
    };
  }
  
  return { valid: true, difference };
}

/**
 * 🔧 FIX: Sanitization des données - PAS DE CONVERSION (déjà en centimes)
 */
function sanitizeInput(data: PaymentIntentRequestData): PaymentIntentRequestData {
  const maxNameLength = isDevelopment ? 500 : 200;
  const maxDescLength = SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
  const maxMetaKeyLength = isDevelopment ? 100 : 50;
  const maxMetaValueLength = isDevelopment ? 500 : 200;

  return {
    // 🔧 FIX: PAS de conversion - les montants sont déjà en centimes depuis le frontend
    amount: Math.round(Number(data.amount)), // Arrondir seulement
    currency: (data.currency || 'eur').toLowerCase().trim(),
    serviceType: data.serviceType,
    providerId: data.providerId.trim(),
    clientId: data.clientId.trim(),
    clientEmail: data.clientEmail?.trim().toLowerCase(),
    providerName: data.providerName?.trim().substring(0, maxNameLength),
    description: data.description?.trim().substring(0, maxDescLength),
    commissionAmount: Math.round(Number(data.commissionAmount)), // Arrondir seulement
    providerAmount: Math.round(Number(data.providerAmount)), // Arrondir seulement
    callSessionId: data.callSessionId?.trim(),
    metadata: data.metadata ? Object.fromEntries(
      Object.entries(data.metadata)
        .filter(([key, value]) => key.length <= maxMetaKeyLength && value.length <= maxMetaValueLength)
        .slice(0, isDevelopment ? 20 : 10)
    ) : {}
  };
}

/**
 * Logging adapté à l'environnement avec informations détaillées
 */
function logSecurityEvent(event: string, data: any) {
  const timestamp = new Date().toISOString();
  
  if (isDevelopment) {
    console.log(`🔧 [DEV-${timestamp}] ${event}:`, {
      ...data,
      // Ajouter conversions euros pour lisibilité en dev
      ...(data.amount && { amountEuros: data.amount / 100 }),
      ...(data.commissionAmount && { commissionEuros: data.commissionAmount / 100 }),
      ...(data.providerAmount && { providerEuros: data.providerAmount / 100 })
    });
  } else if (isProduction) {
    // En production: données sensibles masquées
    const sanitizedData = {
      ...data,
      // Masquer les IDs sensibles
      userId: data.userId ? data.userId.substring(0, 8) + '...' : undefined,
      clientId: data.clientId ? data.clientId.substring(0, 8) + '...' : undefined,
      providerId: data.providerId ? data.providerId.substring(0, 8) + '...' : undefined,
    };
    console.log(`🏭 [PROD-${timestamp}] ${event}:`, sanitizedData);
  } else {
    console.log(`🧪 [TEST-${timestamp}] ${event}:`, data);
  }
}

// =========================================
// 🚀 CLOUD FUNCTION PRINCIPALE
// =========================================
export const createPaymentIntent = onCall(
  {
    cors: [
      /localhost:\d+/,
      /127\.0\.0\.1:\d+/,
      /firebase\.com$/,
    ],
  },
  async (request: CallableRequest<PaymentIntentRequestData>) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();

    // Log de démarrage avec environnement
    logSecurityEvent('payment_intent_start', {
      requestId,
      environment: process.env.NODE_ENV,
      isDevelopment,
      isProduction,
      bypassMode: BYPASS_MODE
    });

    try {
      // ========================================
      // 1. VALIDATION DE L'AUTHENTIFICATION
      // ========================================
      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          'Authentification requise pour créer un paiement.'
        );
      }

      const userId = request.auth.uid;

      // 🔧 FIX: Debug des données reçues (montants maintenant en centimes)
      logSecurityEvent('payment_data_received', {
        amount: request.data.amount,
        amountInEuros: request.data.amount / 100,
        serviceType: request.data.serviceType,
        providerId: request.data.providerId?.substring(0, 10) + '...',
        commissionAmount: request.data.commissionAmount,
        commissionInEuros: request.data.commissionAmount / 100,
        providerAmount: request.data.providerAmount,
        providerInEuros: request.data.providerAmount / 100
      });

      // ========================================
      // 2. RATE LIMITING
      // ========================================
      const rateLimitResult = checkRateLimit(userId);
      if (!rateLimitResult.allowed) {
        const waitTime = Math.ceil((rateLimitResult.resetTime! - Date.now()) / 60000);
        throw new HttpsError(
          'resource-exhausted',
          `Trop de tentatives. Réessayez dans ${waitTime} minutes.`
        );
      }

      // ========================================
      // 3. SANITIZATION DES DONNÉES
      // ========================================
      const sanitizedData = sanitizeInput(request.data);
      
      logSecurityEvent('data_sanitized', {
        original_amount: request.data.amount,
        sanitized_amount: sanitizedData.amount,
        original_commission: request.data.commissionAmount,
        sanitized_commission: sanitizedData.commissionAmount,
        coherent: Math.abs(sanitizedData.amount - (sanitizedData.commissionAmount + sanitizedData.providerAmount)) <= 1
      });

      // ========================================
      // 4. VALIDATION DES DONNÉES DE BASE
      // ========================================
      const {
        amount,              // ✅ DÉJÀ EN CENTIMES depuis le frontend
        currency,
        serviceType,
        providerId,
        clientId,
        clientEmail,
        providerName,
        description,
        commissionAmount,    // ✅ DÉJÀ EN CENTIMES
        providerAmount,      // ✅ DÉJÀ EN CENTIMES
        callSessionId,
        metadata = {}
      } = sanitizedData;

      // Validation de base avec logs détaillés
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        logSecurityEvent('validation_error', { field: 'amount', value: amount, type: typeof amount });
        throw new HttpsError('invalid-argument', `Montant invalide: ${amount} centimes (${amount/100}€)`);
      }

      if (!serviceType || !SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
        logSecurityEvent('validation_error', { field: 'serviceType', value: serviceType });
        throw new HttpsError('invalid-argument', 'Type de service invalide');
      }

      if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
        logSecurityEvent('validation_error', { field: 'providerId', value: providerId });
        throw new HttpsError('invalid-argument', 'ID prestataire invalide');
      }

      if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
        logSecurityEvent('validation_error', { field: 'clientId', value: clientId });
        throw new HttpsError('invalid-argument', 'ID client invalide');
      }

      if (typeof commissionAmount !== 'number' || commissionAmount < 0) {
        logSecurityEvent('validation_error', { field: 'commissionAmount', value: commissionAmount });
        throw new HttpsError('invalid-argument', 'Montant commission invalide');
      }

      if (typeof providerAmount !== 'number' || providerAmount < 0) {
        logSecurityEvent('validation_error', { field: 'providerAmount', value: providerAmount });
        throw new HttpsError('invalid-argument', 'Montant prestataire invalide');
      }

      // ========================================
      // 5. VALIDATION DES PERMISSIONS
      // ========================================
      if (userId !== clientId) {
        logSecurityEvent('permission_denied', { userId, clientId });
        throw new HttpsError(
          'permission-denied', 
          'Vous ne pouvez créer un paiement que pour votre propre compte.'
        );
      }

      // ========================================
      // 6. VALIDATION DES ENUMS ET TYPES
      // ========================================
      const safeCurrency = (currency || 'eur') as 'eur' | 'usd' | 'gbp';
      if (!SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(safeCurrency)) {
        throw new HttpsError(
          'invalid-argument', 
          `Devise non supportée: ${currency}. Devises autorisées: ${SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.join(', ')}`
        );
      }

      // ========================================
      // 7. VALIDATION DE LA COHÉRENCE DES MONTANTS
      // ========================================
      const coherenceResult = validateAmountCoherence(amount, commissionAmount, providerAmount);
      if (!coherenceResult.valid) {
        // En production: bloquer, en dev: juste logger et continuer si pas trop éloigné
        if (isProduction || coherenceResult.difference > 100) { // 1€ EN CENTIMES
          throw new HttpsError('invalid-argument', coherenceResult.error!);
        } else {
          logSecurityEvent('amount_coherence_warning_accepted', coherenceResult);
        }
      }

      // ========================================
      // 8. VALIDATION SÉCURITAIRE DES MONTANTS
      // ========================================
      const db = admin.firestore();
      const amountValidation = await validateAmountSecurity(amount, userId, db);
      if (!amountValidation.valid) {
        throw new HttpsError('invalid-argument', amountValidation.error!);
      }

      // ========================================
      // 9. VALIDATION BUSINESS LOGIC
      // ========================================
      const businessValidation = await validateBusinessLogic(sanitizedData, db);
      if (!businessValidation.valid) {
        throw new HttpsError('failed-precondition', businessValidation.error!);
      }

      // ========================================
      // 10. VÉRIFICATION DES DOUBLONS
      // ========================================
      const hasDuplicate = await checkDuplicatePayments(clientId, providerId, amount, db);
      if (hasDuplicate) {
        throw new HttpsError(
          'already-exists', 
          'Un paiement similaire est déjà en cours de traitement.'
        );
      }

      // ========================================
      // 11. CRÉATION DU PAIEMENT VIA STRIPEMANAGER
      // ========================================
      logSecurityEvent('stripe_payment_creation_start', {
        amount,
        amountInEuros: amount / 100,
        serviceType,
        providerId: providerId.substring(0, 10) + '...'
      });

      // 🔧 FIX: Données pour StripeManager - montants DÉJÀ EN CENTIMES
      const stripePaymentData: StripePaymentData = {
        amount,           // DÉJÀ EN CENTIMES
        currency: safeCurrency,
        clientId,
        providerId,
        serviceType,
        providerType: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
        commissionAmount, // DÉJÀ EN CENTIMES
        providerAmount,   // DÉJÀ EN CENTIMES
        callSessionId,
        metadata: {
          clientEmail: clientEmail || '',
          providerName: providerName || '',
          description: description || `Service ${serviceType}`,
          requestId,
          environment: process.env.NODE_ENV || 'development',
          // Ajouter des références en euros pour debug
          originalAmountEuros: (amount / 100).toString(),
          originalCommissionEuros: (commissionAmount / 100).toString(),
          originalProviderAmountEuros: (providerAmount / 100).toString(),
          ...metadata
        }
      };

      // 🔍 DEBUG FINAL BACKEND
      console.log('💳 === BACKEND - DONNÉES FINALES ===');
      console.log('📥 Données reçues (EN CENTIMES):', {
        amount: `${amount} centimes (${amount/100}€)`,
        commission: `${commissionAmount} centimes (${commissionAmount/100}€)`,
        provider: `${providerAmount} centimes (${providerAmount/100}€)`,
        coherent: Math.abs(amount - (commissionAmount + providerAmount)) <= 1
      });
      console.log('✅ Validations passées:', {
        minimum_respecte: amount >= SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT,
        maximum_respecte: amount <= SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT,
        coherence_totale: coherenceResult.valid
      });
      console.log('📤 Envoi vers StripeManager:', {
        amount,
        commissionAmount,
        providerAmount
      });

      const result = await stripeManager.createPaymentIntent(stripePaymentData);

      if (!result.success) {
        logSecurityEvent('stripe_payment_creation_failed', {
          error: result.error,
          requestId
        });

        await logError('createPaymentIntent:stripe_error', {
          requestId,
          userId,
          serviceType,
          amount,
          amountInEuros: amount / 100,
          error: result.error
        });

        throw new HttpsError(
          'internal',
          'Erreur lors de la création du paiement. Veuillez réessayer.'
        );
      }

      // ========================================
      // 12. LOGGING ET AUDIT SÉCURISÉ
      // ========================================
      await db.collection('payment_audit_logs').add({
        action: 'payment_intent_created',
        requestId,
        paymentIntentId: result.paymentIntentId,
        clientId,
        providerId,
        amount, // EN CENTIMES
        amountInEuros: amount / 100, // Pour référence humaine
        commissionAmount, // EN CENTIMES
        commissionAmountInEuros: commissionAmount / 100,
        providerAmount, // EN CENTIMES
        providerAmountInEuros: providerAmount / 100,
        serviceType,
        callSessionId,
        environment: process.env.NODE_ENV || 'development',
        userAgent: request.rawRequest.headers['user-agent']?.substring(0, 200) || 'unknown',
        ipAddress: request.rawRequest.ip || 'unknown',
        processingTime: Date.now() - startTime,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      logSecurityEvent('payment_intent_created_success', {
        paymentIntentId: result.paymentIntentId,
        processingTime: Date.now() - startTime,
        amountProcessed: amount,
        amountInEuros: amount / 100
      });

      // ========================================
      // 13. RÉPONSE SÉCURISÉE ET TYPÉE
      // ========================================
      const response: SuccessResponse = {
        success: true,
        clientSecret: result.clientSecret!,
        paymentIntentId: result.paymentIntentId!,
        amount, // EN CENTIMES (cohérent avec Stripe)
        currency: currency || "eur",
        serviceType,
        status: 'requires_payment_method',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      return response;

    } catch (error: unknown) {
      // ========================================
      // 14. GESTION D'ERREURS SÉCURISÉE
      // ========================================
      const processingTime = Date.now() - startTime;
      
      logSecurityEvent('payment_intent_error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        environment: process.env.NODE_ENV,
        receivedAmount: request.data?.amount,
        receivedAmountEuros: request.data?.amount ? request.data.amount / 100 : 'unknown'
      });

      // Log détaillé pour debug
      await logError('createPaymentIntent:error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime,
        requestData: {
          amount: request.data.amount,
          amountInEuros: request.data.amount / 100,
          serviceType: request.data.serviceType,
          hasAuth: !!request.auth
        },
        userAuth: request.auth?.uid || 'not-authenticated',
        environment: process.env.NODE_ENV
      });

      // Si c'est déjà une HttpsError, la relancer telle quelle
      if (error instanceof HttpsError) {
        throw error;
      }

      // Pour toute autre erreur, réponse générique sécurisée
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId
      };

      throw new HttpsError(
        'internal',
        errorResponse.error,
        errorResponse
      );
    }
  }
);