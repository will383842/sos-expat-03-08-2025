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
exports.createPaymentIntent = void 0;
// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU au début du fichier
const https_1 = require("firebase-functions/v2/https");
const StripeManager_1 = require("./StripeManager"); // 👈 plus d'import du type StripePaymentData pour garder un payload 100% connectionFee
const logError_1 = require("./utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
const paymentValidators_1 = require("./utils/paymentValidators");
// =========================================
// 🔧 FIX CRITIQUE: OPTIMISATION CPU - Configuration légère dès le départ
// =========================================
const CPU_OPTIMIZED_CONFIG = {
    memory: '128MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 80,
    cors: [
        'http://localhost:3000',
        'http://localhost:5196',
        'http://localhost:8080',
        'https://sos-urgently-ac307.web.app',
        'https://sos-urgently-ac307.firebaseapp.com',
    ],
};
// =========================================
// 🌍 DÉTECTION D'ENVIRONNEMENT INTELLIGENTE (optimisée)
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
const rateLimitStore = new Map();
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
        ALLOWED_CURRENCIES: ['eur', 'usd'],
        ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'],
    },
    DUPLICATES: {
        WINDOW_MS: isDevelopment ? 30 * 1000 : isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000,
    },
};
// =========================================
// 🛡️ FONCTIONS DE SÉCURITÉ ADAPTÉES (optimisées)
// =========================================
/**
 * Rate limiting avec configuration par environnement (optimisé CPU)
 */
function checkRateLimit(userId) {
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
async function validateBusinessLogic(data, currency, db) {
    if (BYPASS_MODE) {
        logSecurityEvent('business_validation_bypassed', { providerId: data.providerId });
        return { valid: true };
    }
    try {
        const providerDoc = await db.collection('users').doc(data.providerId).get();
        const providerData = providerDoc.data();
        if (!providerData)
            return { valid: false, error: 'Prestataire non trouvé' };
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
        const expectedTotal = data.serviceType === 'lawyer_call'
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
    }
    catch (error) {
        await (0, logError_1.logError)('validateBusinessLogic', error);
        return { valid: false, error: 'Erreur lors de la validation business' };
    }
}
/**
 * Validation sécuritaire des montants — prend en compte la devise
 */
async function validateAmountSecurity(amount, // unité principale (EUR ou USD)
currency, userId, db) {
    logSecurityEvent('amount_validation_start', { amount, currency, userId });
    const { MIN_EUR, MAX_EUR, MAX_DAILY_EUR, MIN_USD, MAX_USD, MAX_DAILY_USD } = SECURITY_LIMITS.AMOUNT_LIMITS;
    const limits = currency === 'eur'
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
            const daily = await (0, paymentValidators_1.checkDailyLimit)(userId, amount, currency, db);
            if (!daily.allowed) {
                return { valid: false, error: daily.error };
            }
        }
        catch (error) {
            await (0, logError_1.logError)('validateAmountSecurity:dailyLimit', error);
            logSecurityEvent('daily_limit_check_error', { error });
        }
    }
    return { valid: true };
}
/**
 * Vérification des doublons (par devise) — montants dans l'unité principale
 */
async function checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db) {
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
    }
    catch (error) {
        await (0, logError_1.logError)('checkDuplicatePayments', error);
        return false;
    }
}
/**
 * Validation de cohérence: total = frais + prestataire (dans l'unité principale)
 */
function validateAmountCoherence(totalAmount, connectionFeeAmount, providerAmount) {
    const totalCalculated = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
    const amountRounded = Math.round(totalAmount * 100) / 100;
    const difference = Math.abs(totalCalculated - amountRounded);
    const tolerance = SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE;
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
 * Sanitization ET conversion des données en fonction de la devise
 */
function sanitizeAndConvertInput(data) {
    var _a, _b, _c, _d;
    const maxNameLength = isDevelopment ? 500 : 200;
    const maxDescLength = SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
    const maxMetaKeyLength = isDevelopment ? 100 : 50;
    const maxMetaValueLength = isDevelopment ? 500 : 200;
    const currency = (data.currency || 'eur').toLowerCase().trim();
    const amountInMainUnit = Number(data.amount);
    const connectionFeeAmountInMainUnit = Number(data.connectionFeeAmount);
    const providerAmountInMainUnit = Number(data.providerAmount);
    const amountInCents = (0, paymentValidators_1.toCents)(amountInMainUnit, currency);
    const connectionFeeAmountInCents = (0, paymentValidators_1.toCents)(connectionFeeAmountInMainUnit, currency);
    const providerAmountInCents = (0, paymentValidators_1.toCents)(providerAmountInMainUnit, currency);
    return {
        amountInMainUnit,
        amountInCents,
        connectionFeeAmountInMainUnit,
        connectionFeeAmountInCents,
        providerAmountInMainUnit,
        providerAmountInCents,
        currency,
        serviceType: data.serviceType,
        providerId: data.providerId.trim(),
        clientId: data.clientId.trim(),
        clientEmail: (_a = data.clientEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase(),
        providerName: (_b = data.providerName) === null || _b === void 0 ? void 0 : _b.trim().substring(0, maxNameLength),
        description: (_c = data.description) === null || _c === void 0 ? void 0 : _c.trim().substring(0, maxDescLength),
        callSessionId: (_d = data.callSessionId) === null || _d === void 0 ? void 0 : _d.trim(),
        metadata: data.metadata
            ? Object.fromEntries(Object.entries(data.metadata)
                .filter(([key, value]) => key.length <= maxMetaKeyLength && value.length <= maxMetaValueLength)
                .slice(0, isDevelopment ? 20 : 10))
            : {},
    };
}
/**
 * Logging adapté à l'environnement (optimisé)
 */
function logSecurityEvent(event, data) {
    const timestamp = new Date().toISOString();
    if (isDevelopment) {
        console.log(`🔧 [DEV-${timestamp}] ${event}:`, data);
    }
    else if (isProduction) {
        const sanitizedData = Object.assign(Object.assign({}, data), { userId: data.userId ? data.userId.substring(0, 8) + '...' : undefined, clientId: data.clientId ? data.clientId.substring(0, 8) + '...' : undefined, providerId: data.providerId ? data.providerId.substring(0, 8) + '...' : undefined });
        console.log(`🏭 [PROD-${timestamp}] ${event}:`, sanitizedData);
    }
    else {
        console.log(`🧪 [TEST-${timestamp}] ${event}:`, data);
    }
}
// =========================================
// 🚀 CLOUD FUNCTION PRINCIPALE (OPTIMISÉE CPU) — sans “commission”
// =========================================
exports.createPaymentIntent = (0, https_1.onCall)(CPU_OPTIMIZED_CONFIG, async (request) => {
    var _a, _b, _c, _d;
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
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
        }
        const userId = request.auth.uid;
        // Debug entrée
        console.log('💳 === BACKEND - DONNÉES REÇUES (optimisé CPU) ===');
        console.log('📥 Données brutes reçues:', {
            amount: request.data.amount,
            connectionFeeAmount: request.data.connectionFeeAmount,
            providerAmount: request.data.providerAmount,
            serviceType: request.data.serviceType,
            currency: request.data.currency || 'eur',
        });
        // 2) VALIDATION PRÉLIMINAIRE STRICTE
        if (typeof request.data.amount !== 'number' || isNaN(request.data.amount) || request.data.amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', `Montant invalide reçu: ${request.data.amount} (type: ${typeof request.data.amount})`);
        }
        if (typeof request.data.connectionFeeAmount !== 'number' ||
            isNaN(request.data.connectionFeeAmount) ||
            request.data.connectionFeeAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Frais de mise en relation invalides');
        }
        if (typeof request.data.providerAmount !== 'number' ||
            isNaN(request.data.providerAmount) ||
            request.data.providerAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Montant prestataire invalide');
        }
        // 3) RATE LIMITING
        const rateLimitResult = checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
            const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
            throw new https_1.HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitTime} minutes.`);
        }
        // 4) SANITIZE + CONVERT
        const sanitizedData = sanitizeAndConvertInput(request.data);
        console.log('💳 === APRÈS SANITIZATION (optimisé) ===');
        console.log('✅ Données sanitisées & converties:', {
            totalInMainUnit: sanitizedData.amountInMainUnit,
            totalInCents: sanitizedData.amountInCents,
            connectionFeeInMainUnit: sanitizedData.connectionFeeAmountInMainUnit,
            connectionFeeInCents: sanitizedData.connectionFeeAmountInCents,
            providerInMainUnit: sanitizedData.providerAmountInMainUnit,
            providerInCents: sanitizedData.providerAmountInCents,
            currency: sanitizedData.currency,
        });
        // 5) VALIDATION DE BASE
        const { amountInMainUnit, amountInCents, connectionFeeAmountInMainUnit, connectionFeeAmountInCents, providerAmountInMainUnit, providerAmountInCents, currency, serviceType, providerId, clientId, clientEmail, providerName, description, callSessionId, metadata, } = sanitizedData;
        if (!serviceType || !SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', 'Type de service invalide');
        }
        if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
            throw new https_1.HttpsError('invalid-argument', 'ID prestataire invalide');
        }
        if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
            throw new https_1.HttpsError('invalid-argument', 'ID client invalide');
        }
        // 6) VALIDATION DES ENUMS / TYPES
        if (!SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(currency)) {
            throw new https_1.HttpsError('invalid-argument', `Devise non supportée: ${currency}`);
        }
        // 7) VALIDATION COHÉRENCE (total = frais + prestataire)
        const coherence = validateAmountCoherence(amountInMainUnit, connectionFeeAmountInMainUnit, providerAmountInMainUnit);
        if (!coherence.valid) {
            if (isProduction || coherence.difference > 1) {
                throw new https_1.HttpsError('invalid-argument', coherence.error);
            }
            else {
                logSecurityEvent('amount_coherence_warning_accepted', coherence);
            }
        }
        // 8) VALIDATION SÉCURITAIRE (limites / daily)
        const db = admin.firestore();
        const sec = await validateAmountSecurity(amountInMainUnit, currency, userId, db);
        if (!sec.valid) {
            throw new https_1.HttpsError('invalid-argument', sec.error);
        }
        // 9) VALIDATION BUSINESS
        const biz = await validateBusinessLogic(request.data, currency, db);
        if (!biz.valid) {
            throw new https_1.HttpsError('failed-precondition', biz.error);
        }
        // 10) ANTI-DOUBLONS
        const hasDuplicate = await checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db);
        if (hasDuplicate) {
            throw new https_1.HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
        }
        // 11) CRÉATION PAIEMENT (Stripe) — payload 100% “frais de mise en relation”
        console.log('💳 === ENVOI VERS STRIPEMANAGER (optimisé) ===');
        const stripePayload = {
            amount: amountInCents, // centimes
            currency,
            clientId,
            providerId,
            serviceType,
            providerType: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
            connectionFeeAmount: connectionFeeAmountInCents, // centimes
            providerAmount: providerAmountInCents, // centimes
            callSessionId,
            metadata: Object.assign({ clientEmail: clientEmail || '', providerName: providerName || '', description: description || `Service ${serviceType}`, requestId, environment: process.env.NODE_ENV || 'development', 
                // Trace côté audit (unités principales)
                originalTotal: amountInMainUnit.toString(), originalConnectionFee: connectionFeeAmountInMainUnit.toString(), originalProviderAmount: providerAmountInMainUnit.toString(), originalCurrency: currency }, metadata),
        };
        const result = await StripeManager_1.stripeManager.createPaymentIntent(stripePayload);
        if (!(result === null || result === void 0 ? void 0 : result.success)) {
            await (0, logError_1.logError)('createPaymentIntent:stripe_error', {
                requestId,
                userId,
                serviceType,
                amountInMainUnit,
                amountInCents,
                error: result === null || result === void 0 ? void 0 : result.error,
            });
            throw new https_1.HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
        }
        // 12) AUDIT
        if (isProduction) {
            await (0, paymentValidators_1.logPaymentAudit)({
                paymentId: result.paymentIntentId,
                userId: clientId,
                amount: amountInMainUnit,
                currency,
                type: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
                action: 'create',
                metadata: {
                    connectionFeeAmountInMainUnit,
                    providerAmountInMainUnit,
                    amountInCents,
                    connectionFeeAmountInCents,
                    providerAmountInCents,
                    requestId,
                },
            }, db);
        }
        console.log('✅ Paiement créé:', {
            id: result.paymentIntentId,
            total: (0, paymentValidators_1.formatAmount)(amountInMainUnit, currency),
            connectionFee: (0, paymentValidators_1.formatAmount)(connectionFeeAmountInMainUnit, currency),
            provider: (0, paymentValidators_1.formatAmount)(providerAmountInMainUnit, currency),
        });
        // 13) RÉPONSE
        const response = {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount: amountInCents,
            currency,
            serviceType,
            status: 'requires_payment_method',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        return response;
    }
    catch (error) {
        // 14) ERREURS
        const processingTime = Date.now() - startTime;
        await (0, logError_1.logError)('createPaymentIntent:error', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            processingTime,
            requestData: {
                amount: (_a = request.data) === null || _a === void 0 ? void 0 : _a.amount,
                serviceType: (_b = request.data) === null || _b === void 0 ? void 0 : _b.serviceType,
                currency: ((_c = request.data) === null || _c === void 0 ? void 0 : _c.currency) || 'eur',
                hasAuth: !!request.auth,
            },
            userAuth: ((_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid) || 'not-authenticated',
            environment: process.env.NODE_ENV,
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorResponse = {
            success: false,
            error: "Une erreur inattendue s'est produite. Veuillez réessayer.",
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            requestId,
        };
        throw new https_1.HttpsError('internal', errorResponse.error, errorResponse);
    }
});
//# sourceMappingURL=createPaymentIntent.js.map