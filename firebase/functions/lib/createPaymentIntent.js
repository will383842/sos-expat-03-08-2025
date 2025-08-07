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
const StripeManager_1 = require("./StripeManager");
const logError_1 = require("./utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
// =========================================
// 🔧 FIX CRITIQUE: OPTIMISATION CPU - Configuration légère dès le départ
// =========================================
const CPU_OPTIMIZED_CONFIG = {
    memory: "128MiB",
    timeoutSeconds: 30,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 80
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
        MAX_REQUESTS: isDevelopment ? 1000 : (isProduction ? 25 : 100),
        WINDOW_MS: isDevelopment ? 2 * 60 * 1000 : (isProduction ? 8 * 60 * 1000 : 5 * 60 * 1000),
        GLOBAL_MAX: isDevelopment ? 10000 : (isProduction ? 1000 : 2000),
    },
    AMOUNT_LIMITS: {
        // 🔧 FIX: Limites EN EUROS (frontend) puis converties en centimes
        MIN_AMOUNT_EUROS: 5, // 5€ minimum
        MAX_AMOUNT_EUROS: 500, // 500€ maximum 
        MAX_DAILY_USER_EUROS: 2000, // 2000€ par jour par utilisateur
    },
    VALIDATION: {
        MAX_METADATA_SIZE: isDevelopment ? 10000 : (isProduction ? 3000 : 5000),
        MAX_DESCRIPTION_LENGTH: isDevelopment ? 5000 : (isProduction ? 1500 : 2000),
        // Tolérance pour cohérence des montants EN EUROS
        AMOUNT_COHERENCE_TOLERANCE_EUROS: isDevelopment ? 0.50 : (isProduction ? 0.05 : 0.10),
        // Tolérance pour validation business EN EUROS
        BUSINESS_AMOUNT_TOLERANCE_EUROS: isDevelopment ? 50 : (isProduction ? 15 : 25),
        ALLOWED_CURRENCIES: ['eur', 'usd', 'gbp'],
        ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'],
    },
    DUPLICATES: {
        WINDOW_MS: isDevelopment ? 30 * 1000 : (isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000),
    }
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
 * 🔧 FIX CRITIQUE: Validation business logic - montants EN EUROS reçus du frontend (optimisé)
 */
async function validateBusinessLogic(data, db) {
    if (BYPASS_MODE) {
        logSecurityEvent('business_validation_bypassed', { providerId: data.providerId });
        return { valid: true };
    }
    try {
        // 🔧 OPTIMISATION: Requête unique et rapide
        const providerDoc = await db.collection('users').doc(data.providerId).get();
        const providerData = providerDoc.data();
        if (!providerData) {
            return { valid: false, error: 'Prestataire non trouvé' };
        }
        if (providerData.status === 'suspended' || providerData.status === 'banned') {
            return { valid: false, error: 'Prestataire non disponible' };
        }
        if (isDevelopment) {
            logSecurityEvent('business_validation_dev_mode', {
                providerId: data.providerId,
                amount: data.amount
            });
            return { valid: true };
        }
        // 🔧 FIX: Validation des tarifs EN EUROS (calcul optimisé)
        const expectedAmountEuros = providerData.price || (data.serviceType === 'lawyer_call' ? 49 : 19);
        const tolerance = SECURITY_LIMITS.VALIDATION.BUSINESS_AMOUNT_TOLERANCE_EUROS;
        const difference = Math.abs(data.amount - expectedAmountEuros);
        if (difference > tolerance) {
            logSecurityEvent('business_amount_anomaly', {
                expected: expectedAmountEuros,
                received: data.amount,
                difference,
                tolerance,
                serviceType: data.serviceType
            });
            if (isProduction && difference > 100) { // 100€ d'écart = suspect
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
 * 🔧 FIX CRITIQUE: Validation sécuritaire des montants - REÇOIT DES EUROS, VALIDE EN EUROS (optimisé)
 */
async function validateAmountSecurity(amountInEuros, // ✅ REÇOIT DES EUROS du frontend
userId, db) {
    logSecurityEvent('amount_validation_start', { amountInEuros, userId });
    // 🔧 FIX: Limites EN EUROS - validation directe
    if (amountInEuros < SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT_EUROS) {
        return {
            valid: false,
            error: `Montant minimum de ${SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT_EUROS}€ requis`
        };
    }
    if (amountInEuros > SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT_EUROS) {
        return {
            valid: false,
            error: `Montant maximum de ${SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT_EUROS}€ dépassé`
        };
    }
    // 🔧 OPTIMISATION: Limite journalière uniquement en production pour économiser CPU
    if (!isDevelopment) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dailyPaymentsQuery = await db.collection('payments')
                .where('clientId', '==', userId)
                .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
                .where('status', 'in', ['succeeded', 'requires_capture', 'processing'])
                .limit(20) // 🔧 LIMITE pour économiser CPU
                .get();
            // 🔧 FIX: Calcul en euros cohérent (utiliser amountInEuros stocké)
            const dailyTotalEuros = dailyPaymentsQuery.docs.reduce((total, doc) => {
                const paymentData = doc.data();
                // Utiliser amountInEuros si disponible, sinon convertir depuis centimes
                const paymentAmountEuros = paymentData.amountInEuros || (paymentData.amount / 100);
                return total + paymentAmountEuros;
            }, 0);
            logSecurityEvent('daily_limit_check', {
                dailyTotalEuros,
                newAmountEuros: amountInEuros,
                limitEuros: SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER_EUROS
            });
            if (dailyTotalEuros + amountInEuros > SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER_EUROS) {
                return {
                    valid: false,
                    error: `Limite journalière dépassée (${Math.round(dailyTotalEuros + amountInEuros)}€/${SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER_EUROS}€)`
                };
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
 * 🔧 FIX CRITIQUE: Vérification des doublons - montants EN EUROS (optimisé)
 */
async function checkDuplicatePayments(clientId, providerId, amountInEuros, // EN EUROS
db) {
    if (BYPASS_MODE) {
        logSecurityEvent('duplicate_check_bypassed', { clientId, providerId, amountInEuros });
        return false;
    }
    try {
        const windowMs = SECURITY_LIMITS.DUPLICATES.WINDOW_MS;
        // 🔧 OPTIMISATION: Requête limitée et rapide
        const existingPayments = await db.collection('payments')
            .where('clientId', '==', clientId)
            .where('providerId', '==', providerId)
            .where('amountInEuros', '==', amountInEuros) // Comparaison en euros
            .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - windowMs)))
            .limit(1) // 🔧 LIMITE STRICTE pour économiser CPU
            .get();
        const hasDuplicate = !existingPayments.empty;
        logSecurityEvent('duplicate_check', {
            clientId,
            providerId,
            amountInEuros,
            windowMs,
            hasDuplicate
        });
        return hasDuplicate;
    }
    catch (error) {
        await (0, logError_1.logError)('checkDuplicatePayments', error);
        return false;
    }
}
/**
 * 🔧 FIX CRITIQUE: Validation cohérence des montants - TOUS EN EUROS (optimisé)
 */
function validateAmountCoherence(amountInEuros, // EN EUROS
commissionAmountInEuros, // EN EUROS
providerAmountInEuros // EN EUROS
) {
    const totalCalculated = Math.round((commissionAmountInEuros + providerAmountInEuros) * 100) / 100;
    const amountRounded = Math.round(amountInEuros * 100) / 100;
    const difference = Math.abs(totalCalculated - amountRounded);
    const tolerance = SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE_EUROS;
    logSecurityEvent('amount_coherence_check', {
        amountInEuros: amountRounded,
        commissionInEuros: commissionAmountInEuros,
        providerInEuros: providerAmountInEuros,
        totalCalculated,
        difference,
        tolerance
    });
    if (difference > tolerance) {
        return {
            valid: false,
            error: `Incohérence montants: ${difference.toFixed(2)}€ d'écart (tolérance: ${tolerance.toFixed(2)}€)`,
            difference
        };
    }
    return { valid: true, difference };
}
/**
 * 🔧 FIX CRITIQUE: Sanitization ET conversion des données EUROS → CENTIMES (optimisé)
 */
function sanitizeAndConvertInput(data) {
    var _a, _b, _c, _d;
    const maxNameLength = isDevelopment ? 500 : 200;
    const maxDescLength = SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
    const maxMetaKeyLength = isDevelopment ? 100 : 50;
    const maxMetaValueLength = isDevelopment ? 500 : 200;
    // 🔧 FIX CRITIQUE: Conversion sécurisée EUROS → CENTIMES
    const amountInEuros = Number(data.amount); // Garder tel quel (déjà en euros)
    const commissionAmountInEuros = Number(data.commissionAmount);
    const providerAmountInEuros = Number(data.providerAmount);
    const amountInCents = Math.round(amountInEuros * 100);
    const commissionAmountInCents = Math.round(commissionAmountInEuros * 100);
    const providerAmountInCents = Math.round(providerAmountInEuros * 100);
    return {
        amountInEuros,
        amountInCents,
        commissionAmountInEuros,
        commissionAmountInCents,
        providerAmountInEuros,
        providerAmountInCents,
        currency: (data.currency || 'eur').toLowerCase().trim(),
        serviceType: data.serviceType,
        providerId: data.providerId.trim(),
        clientId: data.clientId.trim(),
        clientEmail: (_a = data.clientEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase(),
        providerName: (_b = data.providerName) === null || _b === void 0 ? void 0 : _b.trim().substring(0, maxNameLength),
        description: (_c = data.description) === null || _c === void 0 ? void 0 : _c.trim().substring(0, maxDescLength),
        callSessionId: (_d = data.callSessionId) === null || _d === void 0 ? void 0 : _d.trim(),
        metadata: data.metadata ? Object.fromEntries(Object.entries(data.metadata)
            .filter(([key, value]) => key.length <= maxMetaKeyLength && value.length <= maxMetaValueLength)
            .slice(0, isDevelopment ? 20 : 10)) : {}
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
// 🚀 CLOUD FUNCTION PRINCIPALE CORRIGÉE (OPTIMISÉE CPU)
// =========================================
exports.createPaymentIntent = (0, https_1.onCall)(CPU_OPTIMIZED_CONFIG, // 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
async (request) => {
    var _a, _b, _c, _d, _e;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    logSecurityEvent('payment_intent_start', {
        requestId,
        environment: process.env.NODE_ENV,
        isDevelopment,
        isProduction,
        bypassMode: BYPASS_MODE
    });
    try {
        // ========================================
        // 1. VALIDATION DE L'AUTHENTIFICATION (optimisé)
        // ========================================
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
        }
        const userId = request.auth.uid;
        // 🔧 FIX CRITIQUE: Debug des données reçues (optimisé)
        console.log('💳 === BACKEND - DONNÉES REÇUES DU FRONTEND (optimisé CPU) ===');
        console.log('📥 Données brutes reçues:', {
            amount: request.data.amount,
            type: typeof request.data.amount,
            commissionAmount: request.data.commissionAmount,
            providerAmount: request.data.providerAmount,
            serviceType: request.data.serviceType
        });
        // ========================================
        // 2. VALIDATION PRÉLIMINAIRE STRICTE (optimisé)
        // ========================================
        if (typeof request.data.amount !== 'number' || isNaN(request.data.amount) || request.data.amount <= 0) {
            console.error('❌ MONTANT INVALIDE:', {
                amount: request.data.amount,
                type: typeof request.data.amount,
                isNaN: isNaN(request.data.amount)
            });
            throw new https_1.HttpsError('invalid-argument', `Montant invalide reçu: ${request.data.amount} (type: ${typeof request.data.amount})`);
        }
        if (typeof request.data.commissionAmount !== 'number' || isNaN(request.data.commissionAmount)) {
            console.error('❌ COMMISSION INVALIDE:', request.data.commissionAmount);
            throw new https_1.HttpsError('invalid-argument', 'Commission invalide');
        }
        if (typeof request.data.providerAmount !== 'number' || isNaN(request.data.providerAmount)) {
            console.error('❌ MONTANT PRESTATAIRE INVALIDE:', request.data.providerAmount);
            throw new https_1.HttpsError('invalid-argument', 'Montant prestataire invalide');
        }
        // ========================================
        // 3. RATE LIMITING (optimisé)
        // ========================================
        const rateLimitResult = checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
            const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
            throw new https_1.HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitTime} minutes.`);
        }
        // ========================================
        // 4. SANITIZATION ET CONVERSION DES DONNÉES (optimisé)
        // ========================================
        const sanitizedData = sanitizeAndConvertInput(request.data);
        console.log('💳 === APRÈS SANITIZATION (optimisé) ===');
        console.log('✅ Données sanitisées et converties:', {
            amountInEuros: sanitizedData.amountInEuros,
            amountInCents: sanitizedData.amountInCents,
            commissionInEuros: sanitizedData.commissionAmountInEuros,
            commissionInCents: sanitizedData.commissionAmountInCents,
            providerInEuros: sanitizedData.providerAmountInEuros,
            providerInCents: sanitizedData.providerAmountInCents
        });
        // ========================================
        // 5. VALIDATION DE BASE (optimisé)
        // ========================================
        const { amountInEuros, amountInCents, commissionAmountInEuros, commissionAmountInCents, providerAmountInEuros, providerAmountInCents, currency, serviceType, providerId, clientId, clientEmail, providerName, description, callSessionId, metadata } = sanitizedData;
        if (!serviceType || !SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', 'Type de service invalide');
        }
        if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
            throw new https_1.HttpsError('invalid-argument', 'ID prestataire invalide');
        }
        if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
            throw new https_1.HttpsError('invalid-argument', 'ID client invalide');
        }
        // ========================================
        // 6. VALIDATION DES PERMISSIONS (optimisé)
        // ========================================
        if (userId !== clientId) {
            throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
        }
        // ========================================
        // 7. VALIDATION DES ENUMS ET TYPES (optimisé)
        // ========================================
        const safeCurrency = currency;
        if (!SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(safeCurrency)) {
            throw new https_1.HttpsError('invalid-argument', `Devise non supportée: ${currency}`);
        }
        // ========================================
        // 8. VALIDATION DE LA COHÉRENCE DES MONTANTS EN EUROS (optimisé)
        // ========================================
        const coherenceResult = validateAmountCoherence(amountInEuros, commissionAmountInEuros, providerAmountInEuros);
        if (!coherenceResult.valid) {
            if (isProduction || coherenceResult.difference > 1) { // 1€
                throw new https_1.HttpsError('invalid-argument', coherenceResult.error);
            }
            else {
                logSecurityEvent('amount_coherence_warning_accepted', coherenceResult);
            }
        }
        // ========================================
        // 9. VALIDATION SÉCURITAIRE DES MONTANTS (EN EUROS) (optimisé)
        // ========================================
        const db = admin.firestore();
        const amountValidation = await validateAmountSecurity(amountInEuros, userId, db);
        if (!amountValidation.valid) {
            throw new https_1.HttpsError('invalid-argument', amountValidation.error);
        }
        // ========================================
        // 10. VALIDATION BUSINESS LOGIC (EN EUROS) (optimisé)
        // ========================================
        const businessValidation = await validateBusinessLogic(request.data, db);
        if (!businessValidation.valid) {
            throw new https_1.HttpsError('failed-precondition', businessValidation.error);
        }
        // ========================================
        // 11. VÉRIFICATION DES DOUBLONS (EN EUROS) (optimisé)
        // ========================================
        const hasDuplicate = await checkDuplicatePayments(clientId, providerId, amountInEuros, db);
        if (hasDuplicate) {
            throw new https_1.HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
        }
        // ========================================
        // 12. CRÉATION DU PAIEMENT VIA STRIPEMANAGER (EN CENTIMES) (optimisé)
        // ========================================
        console.log('💳 === ENVOI VERS STRIPEMANAGER (optimisé) ===');
        console.log('📤 Données envoyées au StripeManager (EN CENTIMES):', {
            amount: amountInCents,
            commissionAmount: commissionAmountInCents,
            providerAmount: providerAmountInCents
        });
        const stripePaymentData = {
            amount: amountInCents, // EN CENTIMES pour Stripe
            currency: safeCurrency,
            clientId,
            providerId,
            serviceType: serviceType,
            providerType: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
            commissionAmount: commissionAmountInCents, // EN CENTIMES
            providerAmount: providerAmountInCents, // EN CENTIMES
            callSessionId,
            metadata: Object.assign({ clientEmail: clientEmail || '', providerName: providerName || '', description: description || `Service ${serviceType}`, requestId, environment: process.env.NODE_ENV || 'development', 
                // Garder les références en euros pour l'audit
                originalAmountEuros: amountInEuros.toString(), originalCommissionEuros: commissionAmountInEuros.toString(), originalProviderAmountEuros: providerAmountInEuros.toString() }, metadata)
        };
        const result = await StripeManager_1.stripeManager.createPaymentIntent(stripePaymentData);
        if (!result.success) {
            console.error('❌ STRIPE ERROR:', result.error);
            await (0, logError_1.logError)('createPaymentIntent:stripe_error', {
                requestId,
                userId,
                serviceType,
                amountInEuros,
                amountInCents,
                error: result.error
            });
            throw new https_1.HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
        }
        // ========================================
        // 13. LOGGING ET AUDIT SÉCURISÉ (optimisé)
        // ========================================
        // 🔧 OPTIMISATION: Logging audit uniquement en production
        if (isProduction) {
            await db.collection('payment_audit_logs').add({
                action: 'payment_intent_created',
                requestId,
                paymentIntentId: result.paymentIntentId,
                clientId,
                providerId,
                amountInEuros, // EN EUROS pour l'audit humain
                amountInCents, // EN CENTIMES pour Stripe
                commissionAmountInEuros,
                commissionAmountInCents,
                providerAmountInEuros,
                providerAmountInCents,
                serviceType,
                callSessionId,
                environment: process.env.NODE_ENV || 'development',
                userAgent: ((_a = request.rawRequest.headers['user-agent']) === null || _a === void 0 ? void 0 : _a.substring(0, 200)) || 'unknown',
                ipAddress: request.rawRequest.ip || 'unknown',
                processingTime: Date.now() - startTime,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log('✅ === PAIEMENT CRÉÉ AVEC SUCCÈS (optimisé CPU) ===');
        console.log('🎉 PaymentIntent ID:', result.paymentIntentId);
        console.log('💰 Montant traité:', `${amountInEuros}€ (${amountInCents} centimes)`);
        // ========================================
        // 14. RÉPONSE SÉCURISÉE ET TYPÉE (optimisé)
        // ========================================
        const response = {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount: amountInCents, // EN CENTIMES (cohérent avec Stripe)
            currency: currency || "eur",
            serviceType,
            status: 'requires_payment_method',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        return response;
    }
    catch (error) {
        // ========================================
        // 15. GESTION D'ERREURS SÉCURISÉE (optimisé)
        // ========================================
        const processingTime = Date.now() - startTime;
        console.error('❌ === ERREUR DÉTAILLÉE (optimisé CPU) ===');
        console.error('💥 Erreur:', error);
        console.error('📊 Données reçues:', {
            amount: (_b = request.data) === null || _b === void 0 ? void 0 : _b.amount,
            type: typeof ((_c = request.data) === null || _c === void 0 ? void 0 : _c.amount),
            serviceType: (_d = request.data) === null || _d === void 0 ? void 0 : _d.serviceType,
            isAuthenticated: !!request.auth
        });
        await (0, logError_1.logError)('createPaymentIntent:error', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            processingTime,
            requestData: {
                amount: request.data.amount,
                type: typeof request.data.amount,
                serviceType: request.data.serviceType,
                hasAuth: !!request.auth
            },
            userAuth: ((_e = request.auth) === null || _e === void 0 ? void 0 : _e.uid) || 'not-authenticated',
            environment: process.env.NODE_ENV
        });
        // Si c'est déjà une HttpsError, la relancer telle quelle
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Pour toute autre erreur, réponse générique sécurisée
        const errorResponse = {
            success: false,
            error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
            requestId
        };
        throw new https_1.HttpsError('internal', errorResponse.error, errorResponse);
    }
});
//# sourceMappingURL=createPaymentIntent.js.map