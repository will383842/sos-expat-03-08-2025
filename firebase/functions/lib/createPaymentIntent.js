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
const https_1 = require("firebase-functions/v2/https");
const StripeManager_1 = require("./StripeManager");
const logError_1 = require("./utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
// Rate limiting store (en production, utiliser Redis)
const rateLimitStore = new Map();
// Configuration des limites de sécurité
const SECURITY_LIMITS = {
    RATE_LIMIT: {
        MAX_REQUESTS: 5,
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        GLOBAL_MAX: 100, // Max global par minute
    },
    AMOUNT_LIMITS: {
        MIN_AMOUNT: 500, // 5€ en centimes
        MAX_AMOUNT: 50000, // 500€ en centimes
        MAX_DAILY_USER: 200000, // 2000€ par jour par utilisateur
    },
    VALIDATION: {
        MAX_METADATA_SIZE: 1000,
        MAX_DESCRIPTION_LENGTH: 500,
        ALLOWED_CURRENCIES: ['eur', 'usd', 'gbp'],
        ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'],
    },
};
/**
 * Rate limiting function - Protection contre le spam
 */
function checkRateLimit(userId) {
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
        return { allowed: false, resetTime: currentLimit.resetTime };
    }
    currentLimit.count++;
    rateLimitStore.set(key, currentLimit);
    return { allowed: true };
}
/**
 * Validation stricte des données métier
 */
async function validateBusinessLogic(data, db) {
    // 1. Vérifier la disponibilité du prestataire en temps réel
    try {
        const providerDoc = await db.collection('users').doc(data.providerId).get();
        const providerData = providerDoc.data();
        if (!providerData) {
            return { valid: false, error: 'Prestataire non trouvé' };
        }
        // Vérifier le statut du prestataire
        if (providerData.status === 'suspended' || providerData.status === 'banned') {
            return { valid: false, error: 'Prestataire non disponible' };
        }
        if (providerData.isAvailable === false) {
            return { valid: false, error: 'Prestataire actuellement indisponible' };
        }
        // 2. Vérifier les tarifs du prestataire
        const expectedAmount = providerData.price || (data.serviceType === 'lawyer_call' ? 4900 : 1900);
        if (Math.abs(data.amount - expectedAmount) > 100) { // Tolérance de 1€
            return { valid: false, error: 'Montant non conforme aux tarifs du prestataire' };
        }
        // 3. Vérifier la cohérence commission/prestataire
        const expectedCommission = Math.round(expectedAmount * 0.20);
        const expectedProviderAmount = expectedAmount - expectedCommission;
        if (Math.abs(data.commissionAmount - expectedCommission) > 10 ||
            Math.abs(data.providerAmount - expectedProviderAmount) > 10) {
            return { valid: false, error: 'Répartition des montants incorrecte' };
        }
        return { valid: true };
    }
    catch (error) {
        await (0, logError_1.logError)('validateBusinessLogic', error);
        return { valid: false, error: 'Erreur lors de la validation' };
    }
}
/**
 * Validation avancée des montants avec détection d'anomalies
 */
async function validateAmountSecurity(amount, userId, db) {
    // 1. Limites de base
    if (amount < SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT) {
        return { valid: false, error: `Montant minimum de ${SECURITY_LIMITS.AMOUNT_LIMITS.MIN_AMOUNT / 100}€ requis` };
    }
    if (amount > SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT) {
        return { valid: false, error: `Montant maximum de ${SECURITY_LIMITS.AMOUNT_LIMITS.MAX_AMOUNT / 100}€ dépassé` };
    }
    // 2. Limite journalière par utilisateur
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyPaymentsQuery = await db.collection('payments')
            .where('clientId', '==', userId)
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
            .where('status', 'in', ['succeeded', 'requires_capture', 'processing'])
            .get();
        const dailyTotal = dailyPaymentsQuery.docs.reduce((total, doc) => {
            return total + (doc.data().amount || 0);
        }, 0);
        if (dailyTotal + amount > SECURITY_LIMITS.AMOUNT_LIMITS.MAX_DAILY_USER) {
            return { valid: false, error: 'Limite journalière dépassée' };
        }
        return { valid: true };
    }
    catch (error) {
        await (0, logError_1.logError)('validateAmountSecurity', error);
        return { valid: false, error: 'Erreur lors de la validation sécuritaire' };
    }
}
/**
 * Sanitization des données d'entrée
 */
function sanitizeInput(data) {
    var _a, _b, _c, _d;
    return {
        amount: Math.round(Number(data.amount)),
        currency: (data.currency || 'eur').toLowerCase().trim(),
        serviceType: data.serviceType,
        providerId: data.providerId.trim(),
        clientId: data.clientId.trim(),
        clientEmail: (_a = data.clientEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase(),
        providerName: (_b = data.providerName) === null || _b === void 0 ? void 0 : _b.trim().substring(0, 100),
        description: (_c = data.description) === null || _c === void 0 ? void 0 : _c.trim().substring(0, SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH),
        commissionAmount: Math.round(Number(data.commissionAmount)),
        providerAmount: Math.round(Number(data.providerAmount)),
        callSessionId: (_d = data.callSessionId) === null || _d === void 0 ? void 0 : _d.trim(),
        metadata: data.metadata ? Object.fromEntries(Object.entries(data.metadata)
            .filter(([key, value]) => key.length <= 40 && value.length <= 100)
            .slice(0, 10) // Max 10 metadata items
        ) : {}
    };
}
/**
 * Cloud Function sécurisée pour créer un PaymentIntent Stripe
 * Version production ready avec toutes les sécurisations
 */
exports.createPaymentIntent = (0, https_1.onCall)({
    // ✅ Configuration CORS
    cors: [
        /localhost:\d+/,
        /127\.0\.0\.1:\d+/,
        /firebase\.com$/,
    ],
}, async (request) => {
    var _a, _b;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    try {
        // ========================================
        // 1. VALIDATION DE L'AUTHENTIFICATION
        // ========================================
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
        }
        const userId = request.auth.uid;
        // ========================================
        // 2. RATE LIMITING - PROTECTION SPAM
        // ========================================
        const rateLimitResult = checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
            const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
            throw new https_1.HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitTime} minutes.`);
        }
        // ========================================
        // 3. SANITIZATION DES DONNÉES
        // ========================================
        const sanitizedData = sanitizeInput(request.data);
        // ========================================
        // 4. VALIDATION DES DONNÉES DE BASE
        // ========================================
        const { amount, currency, serviceType, providerId, clientId, clientEmail, providerName, description, commissionAmount, providerAmount, callSessionId, metadata = {} } = sanitizedData;
        // Validation de base
        if (!amount || !serviceType || !providerId || !clientId || !commissionAmount || !providerAmount) {
            throw new https_1.HttpsError('invalid-argument', 'Données requises manquantes.');
        }
        // ========================================
        // 5. VALIDATION DES PERMISSIONS
        // ========================================
        if (userId !== clientId) {
            throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
        }
        // ========================================
        // 6. VALIDATION DES ENUMS ET TYPES
        // ========================================
        const safeCurrency = (currency || 'eur');
        if (!currency || !SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(currency)) {
            throw new https_1.HttpsError('invalid-argument', `Devise non supportée. Devises autorisées: ${SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.join(', ')}`);
        }
        if (!SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', `Type de service invalide. Types autorisés: ${SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.join(', ')}`);
        }
        // ========================================
        // 7. VALIDATION DE LA COHÉRENCE DES MONTANTS
        // ========================================
        if (Math.abs(commissionAmount + providerAmount - amount) > 1) { // Tolérance 1 centime pour arrondis
            throw new https_1.HttpsError('invalid-argument', 'La répartition des montants ne correspond pas au total.');
        }
        if (commissionAmount < 0 || providerAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Les montants ne peuvent pas être négatifs.');
        }
        // ========================================
        // 8. VALIDATION SÉCURITAIRE DES MONTANTS
        // ========================================
        const db = admin.firestore();
        const amountValidation = await validateAmountSecurity(amount, userId, db);
        if (!amountValidation.valid) {
            throw new https_1.HttpsError('invalid-argument', amountValidation.error);
        }
        // ========================================
        // 9. VALIDATION BUSINESS LOGIC
        // ========================================
        const businessValidation = await validateBusinessLogic(sanitizedData, db);
        if (!businessValidation.valid) {
            throw new https_1.HttpsError('failed-precondition', businessValidation.error);
        }
        // ========================================
        // 10. VÉRIFICATION DES DOUBLONS (Idempotency Check)
        // ========================================
        const idempotencyKey = `payment_${userId}_${providerId}_${amount}_${Date.now()}`;
        const existingPayments = await db.collection('payments')
            .where('clientId', '==', clientId)
            .where('providerId', '==', providerId)
            .where('amount', '==', amount)
            .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000))) // 5 min
            .limit(1)
            .get();
        if (!existingPayments.empty) {
            throw new https_1.HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
        }
        // ========================================
        // 11. CRÉATION DU PAIEMENT VIA STRIPEMANAGER
        // ========================================
        console.log(`[${requestId}] Création PaymentIntent - Service: ${serviceType}, Montant: ${amount}`);
        const stripePaymentData = {
            amount,
            currency: safeCurrency,
            clientId,
            providerId,
            serviceType,
            providerType: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
            commissionAmount,
            providerAmount,
            callSessionId,
            metadata: Object.assign({ clientEmail: clientEmail || '', providerName: providerName || '', description: description || `Service ${serviceType}`, requestId,
                idempotencyKey }, metadata)
        };
        const result = await StripeManager_1.stripeManager.createPaymentIntent(stripePaymentData);
        if (!result.success) {
            // Log détaillé pour debug (sans exposer aux clients)
            await (0, logError_1.logError)('createPaymentIntent:stripe_error', {
                requestId,
                userId,
                serviceType,
                amount,
                error: result.error
            });
            throw new https_1.HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
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
            amount,
            commissionAmount,
            providerAmount,
            serviceType,
            callSessionId,
            userAgent: ((_a = request.rawRequest.headers['user-agent']) === null || _a === void 0 ? void 0 : _a.substring(0, 200)) || 'unknown',
            ipAddress: request.rawRequest.ip || 'unknown',
            processingTime: Date.now() - startTime,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            environment: process.env.NODE_ENV || 'development'
        });
        console.log(`[${requestId}] PaymentIntent créé avec succès - Temps: ${Date.now() - startTime}ms`);
        // ========================================
        // 13. RÉPONSE SÉCURISÉE ET TYPÉE
        // ========================================
        const response = {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount,
            currency: currency || "eur",
            serviceType,
            status: 'requires_payment_method',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h expiration
        };
        return response;
    }
    catch (error) {
        // ========================================
        // 14. GESTION D'ERREURS SÉCURISÉE
        // ========================================
        const processingTime = Date.now() - startTime;
        // Log détaillé pour debug (jamais exposé aux clients)
        await (0, logError_1.logError)('createPaymentIntent:error', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            processingTime,
            requestData: {
                amount: request.data.amount,
                serviceType: request.data.serviceType,
                hasAuth: !!request.auth
            },
            userAuth: ((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid) || 'not-authenticated'
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