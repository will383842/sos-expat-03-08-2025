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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = void 0;
// 🔧 Firebase Functions v2 avec configuration complète + sélection Stripe test/live
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const StripeManager_1 = require("./StripeManager");
const logError_1 = require("./utils/logs/logError");
const paymentValidators_1 = require("./utils/paymentValidators");
// =========================================
// 🔧 Configuration Firebase Functions v2
// =========================================
const _FUNCTION_CONFIG = {
    region: 'europe-west1',
    memory: '256MiB',
    concurrency: 1,
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 3,
    // pas de cpu: 0.25/0.5 si concurrency > 1 ; ici on garde 1
};
// =========================================
// 🔐 Secrets / Params (NE MET JAMAIS TES CLÉS EN DUR)
// - Params: Config paramétrable (notamment STRIPE_MODE)
// =========================================
const STRIPE_SECRET_KEY_TEST = (0, params_1.defineSecret)('STRIPE_SECRET_KEY_TEST'); // sk_test_***
const STRIPE_SECRET_KEY_LIVE = (0, params_1.defineSecret)('STRIPE_SECRET_KEY_LIVE'); // sk_live_***
const STRIPE_MODE = (0, params_1.defineString)('STRIPE_MODE'); // "test" ou "live"
// Helper: renvoie le Secret à utiliser selon le mode actuel
const getStripeSecretParam = () => (STRIPE_MODE.value() === 'live' ? STRIPE_SECRET_KEY_LIVE : STRIPE_SECRET_KEY_TEST);
// =========================================
// 🌍 DÉTECTION D'ENVIRONNEMENT
// =========================================
const isDevelopment = process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';
const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}, Production: ${isProduction}, Bypass: ${BYPASS_MODE}, StripeMode: ${STRIPE_MODE.value() || '(unset)'}`);
// =========================================
// ☯️ Rate limit store (mémoire)
// =========================================
const rateLimitStore = new Map();
// =========================================
// 🛠️ UTILITAIRES SÉCURITÉ
// =========================================
function logSecurityEvent(event, data) {
    const timestamp = new Date().toISOString();
    if (isDevelopment) {
        console.log(`🔧 [DEV-${timestamp}] ${event}:`, data);
    }
    else if (isProduction) {
        const sanitizedData = Object.assign(Object.assign({}, data), { userId: data.userId ? String(data.userId).substring(0, 8) + '...' : undefined, clientId: data.clientId ? String(data.clientId).substring(0, 8) + '...' : undefined, providerId: data.providerId ? String(data.providerId).substring(0, 8) + '...' : undefined });
        console.log(`🏭 [PROD-${timestamp}] ${event}:`, sanitizedData);
    }
    else {
        console.log(`🧪 [TEST-${timestamp}] ${event}:`, data);
    }
}
function checkRateLimit(userId) {
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
    const currentLimit = rateLimitStore.get(key) ||
        {
            count: 0,
            resetTime: now + paymentValidators_1.SECURITY_LIMITS.RATE_LIMIT.WINDOW_MS,
        };
    if (currentLimit.count >= paymentValidators_1.SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS) {
        logSecurityEvent('rate_limit_exceeded', {
            userId,
            count: currentLimit.count,
            limit: paymentValidators_1.SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS,
        });
        return { allowed: false, resetTime: currentLimit.resetTime };
    }
    currentLimit.count++;
    rateLimitStore.set(key, currentLimit);
    return { allowed: true };
}
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
        const expectedTotal = data.serviceType === 'lawyer_call'
            ? currency === 'eur'
                ? 49
                : 55
            : currency === 'eur'
                ? 19
                : 25;
        const tolerance = 15;
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
async function validateAmountSecurity(amount, currency, userId, db) {
    logSecurityEvent('amount_validation_start', { amount, currency, userId });
    const { MIN_EUR, MAX_EUR, MAX_DAILY_EUR, MIN_USD, MAX_USD, MAX_DAILY_USD } = paymentValidators_1.SECURITY_LIMITS.AMOUNT_LIMITS;
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
    if (!isDevelopment) {
        try {
            const daily = await (0, paymentValidators_1.checkDailyLimit)(userId, amount, currency, db);
            if (!daily.allowed) {
                return { valid: false, error: daily.error };
            }
        }
        catch (error) {
            await (0, logError_1.logError)('validateAmountSecurity:dailyLimit', error);
            logSecurityEvent('daily_limit_check_error', {
                errorMessage: error instanceof Error ? error.message : String(error),
                name: error instanceof Error ? error.name : undefined,
            });
        }
    }
    return { valid: true };
}
async function checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db) {
    if (BYPASS_MODE) {
        logSecurityEvent('duplicate_check_bypassed', { clientId, providerId, amountInMainUnit, currency });
        return false;
    }
    try {
        const windowMs = paymentValidators_1.SECURITY_LIMITS.DUPLICATES.WINDOW_MS;
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
            hasDuplicate,
        });
        return hasDuplicate;
    }
    catch (error) {
        await (0, logError_1.logError)('checkDuplicatePayments', error);
        return false;
    }
}
function validateAmountCoherence(totalAmount, commissionAmount, providerAmount) {
    const totalCalculated = Math.round((commissionAmount + providerAmount) * 100) / 100;
    const amountRounded = Math.round(totalAmount * 100) / 100;
    const difference = Math.abs(totalCalculated - amountRounded);
    const tolerance = paymentValidators_1.SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE;
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
function sanitizeAndConvertInput(data) {
    var _a, _b, _c, _d;
    const maxNameLength = isDevelopment ? 500 : 200;
    const maxDescLength = paymentValidators_1.SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
    const maxMetaKeyLength = isDevelopment ? 100 : 50;
    const maxMetaValueLength = isDevelopment ? 500 : 200;
    const currency = (data.currency || 'eur').toLowerCase().trim();
    const amountInMainUnit = Number(data.amount);
    const commissionAmountInMainUnit = Number(data.commissionAmount);
    const providerAmountInMainUnit = Number(data.providerAmount);
    const amountInCents = (0, paymentValidators_1.toCents)(amountInMainUnit, currency);
    const commissionAmountInCents = (0, paymentValidators_1.toCents)(commissionAmountInMainUnit, currency);
    const providerAmountInCents = (0, paymentValidators_1.toCents)(providerAmountInMainUnit, currency);
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
        clientEmail: (_a = data.clientEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase(),
        providerName: (_b = data.providerName) === null || _b === void 0 ? void 0 : _b.trim().substring(0, maxNameLength),
        description: (_c = data.description) === null || _c === void 0 ? void 0 : _c.trim().substring(0, maxDescLength),
        callSessionId: (_d = data.callSessionId) === null || _d === void 0 ? void 0 : _d.trim(),
        metadata: data.metadata
            ? Object.fromEntries(Object.entries(data.metadata)
                .filter(([key, value]) => key.length <= maxMetaKeyLength && String(value).length <= maxMetaValueLength)
                .slice(0, isDevelopment ? 20 : 10))
            : {},
        coupon: (data.coupon
            ? {
                code: data.coupon.code,
                couponId: data.coupon.couponId,
                discountAmount: Number(data.coupon.discountAmount),
                discountType: data.coupon.discountType,
                discountValue: Number(data.coupon.discountValue),
            }
            : undefined),
    };
}
// =========================================
// 🚀 CLOUD FUNCTION PRINCIPALE
// =========================================
exports.createPaymentIntent = (0, https_1.onCall)({
    region: 'europe-west1',
    memory: '256MiB',
    concurrency: 1,
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 3,
    // pas de cpu: 0.25/0.5 si concurrency > 1 ; ici on garde 1
}, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    try {
        logSecurityEvent('payment_intent_start', {
            requestId,
            environment: process.env.NODE_ENV,
            stripeMode: STRIPE_MODE.value() || 'test',
            isDevelopment,
            isProduction,
            bypassMode: BYPASS_MODE,
        });
        // 1) AUTH
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
        }
        const userId = request.auth.uid;
        // 2) VALIDATION PRÉLIMINAIRE
        if (typeof request.data.amount !== 'number' || isNaN(request.data.amount) || request.data.amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', `Montant invalide reçu: ${request.data.amount} (type: ${typeof request.data.amount})`);
        }
        if (typeof request.data.commissionAmount !== 'number' ||
            isNaN(request.data.commissionAmount) ||
            request.data.commissionAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Commission invalide');
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
        // 5) VALIDATIONS - EXTRACTION DES VARIABLES
        const { amountInMainUnit, amountInCents, commissionAmountInMainUnit, commissionAmountInCents, providerAmountInMainUnit, providerAmountInCents, currency, serviceType, providerId, clientId, clientEmail, providerName, description, callSessionId, metadata, coupon, } = sanitizedData;
        if (!serviceType || !paymentValidators_1.SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', 'Type de service invalide');
        }
        if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
            throw new https_1.HttpsError('invalid-argument', 'ID prestataire invalide');
        }
        if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
            throw new https_1.HttpsError('invalid-argument', 'ID client invalide');
        }
        if (!paymentValidators_1.SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(currency)) {
            throw new https_1.HttpsError('invalid-argument', `Devise non supportée: ${currency}`);
        }
        // 6) Validation sécuritaire (montants + limites journalières)
        const db = admin.firestore();
        const sec = await validateAmountSecurity(amountInMainUnit, currency, userId, db);
        if (!sec.valid) {
            throw new https_1.HttpsError('invalid-argument', sec.error);
        }
        // 7) Validation business (prestataire / tarifs attendus)
        const biz = await validateBusinessLogic(request.data, currency, db);
        if (!biz.valid) {
            throw new https_1.HttpsError('failed-precondition', biz.error);
        }
        // 8) Anti-doublons
        const hasDuplicate = await checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db);
        if (hasDuplicate) {
            throw new https_1.HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
        }
        // === ADD: expected amount from admin + override (+ coupon)
        const serviceKind = (serviceType === 'lawyer_call' ? 'lawyer' : 'expat');
        const cfg = await (0, paymentValidators_1.getPricingConfig)(serviceKind, currency, admin.firestore());
        // Montant attendu de base (sans coupon)
        let expected = cfg.totalAmount;
        // (Optionnel sécurisé) revalider le coupon côté serveur
        if (coupon === null || coupon === void 0 ? void 0 : coupon.code) {
            const code = String(coupon.code || '').trim().toUpperCase();
            if (code) {
                const snap = await admin
                    .firestore()
                    .collection('coupons')
                    .where('code', '==', code)
                    .limit(1)
                    .get();
                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const cpn = doc.data();
                    const now = new Date();
                    const validFrom = (_c = (_b = (_a = cpn.valid_from) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : new Date((((_d = cpn.valid_from) === null || _d === void 0 ? void 0 : _d.seconds) || 0) * 1000);
                    const validUntil = (_g = (_f = (_e = cpn.valid_until) === null || _e === void 0 ? void 0 : _e.toDate) === null || _f === void 0 ? void 0 : _f.call(_e)) !== null && _g !== void 0 ? _g : new Date((((_h = cpn.valid_until) === null || _h === void 0 ? void 0 : _h.seconds) || 0) * 1000);
                    const inWindow = validFrom && validUntil && now >= validFrom && now <= validUntil;
                    const active = !!cpn.active;
                    const serviceOk = Array.isArray(cpn.services) ? cpn.services.includes(serviceType) : true;
                    const minOk = typeof cpn.min_order_amount === 'number' ? expected >= cpn.min_order_amount : true;
                    if (active && inWindow && serviceOk && minOk) {
                        let discount = 0;
                        if (cpn.type === 'fixed')
                            discount = Number(cpn.amount) || 0;
                        if (cpn.type === 'percentage')
                            discount =
                                Math.max(0, Math.round((expected * (Number(cpn.amount) || 0)) / 100 * 100) / 100);
                        // Cap / bornes facultatives si tu ajoutes maxDiscount côté coupon
                        discount = Math.min(discount, expected);
                        expected = Math.max(0, Math.round((expected - discount) * 100) / 100);
                    }
                }
            }
        }
        // Compare le montant reçu
        const diff = Math.abs(Number(amountInMainUnit) - Number(expected));
        if (diff > 0.5) {
            throw new https_1.HttpsError('invalid-argument', `Montant inattendu (reçu ${amountInMainUnit}, attendu ${expected})`);
        }
        // === END
        // 9) Validation cohérence interne (après borne "expected")
        const coherence = validateAmountCoherence(amountInMainUnit, commissionAmountInMainUnit, providerAmountInMainUnit);
        if (!coherence.valid) {
            if (isProduction || coherence.difference > 1) {
                throw new https_1.HttpsError('invalid-argument', coherence.error);
            }
            else {
                logSecurityEvent('amount_coherence_warning_accepted', coherence);
            }
        }
        // 🔐 Choix de la clé Stripe selon le mode
        const stripeSecretKey = getStripeSecretParam().value();
        // 🧭 Dérive le providerType
        const providerType = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
        // 10) Création du PaymentIntent via StripeManager
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
            metadata: Object.assign({ clientEmail: clientEmail || '', providerName: providerName || '', description: description || `Service ${serviceType}`, requestId, environment: process.env.NODE_ENV || 'development', originalTotal: amountInMainUnit.toString(), originalCommission: commissionAmountInMainUnit.toString(), originalProviderAmount: providerAmountInMainUnit.toString(), originalCurrency: currency, stripeMode: STRIPE_MODE.value() || 'test', 
                // === ADD when creating stripe payment intent
                coupon_code: (coupon === null || coupon === void 0 ? void 0 : coupon.code) || '', override: String(expected !== cfg.totalAmount) }, metadata),
        };
        const result = await StripeManager_1.stripeManager.createPaymentIntent(stripePayload, stripeSecretKey);
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
        // 11) Audit (prod uniquement)
        if (isProduction) {
            try {
                await (0, paymentValidators_1.logPaymentAudit)({
                    paymentId: result.paymentIntentId,
                    userId: clientId,
                    amount: amountInMainUnit,
                    currency: currency,
                    type: (serviceType === 'lawyer_call' ? 'lawyer' : 'expat'),
                    action: 'create',
                    metadata: {
                        commissionAmountInMainUnit,
                        providerAmountInMainUnit,
                        amountInCents,
                        commissionAmountInCents,
                        providerAmountInCents,
                        requestId,
                    },
                }, db);
            }
            catch (auditError) {
                console.warn('Audit logging failed:', auditError);
            }
        }
        console.log('✅ Paiement créé:', {
            id: result.paymentIntentId,
            total: (0, paymentValidators_1.formatAmount)(amountInMainUnit, currency),
            commission: (0, paymentValidators_1.formatAmount)(commissionAmountInMainUnit, currency),
            provider: (0, paymentValidators_1.formatAmount)(providerAmountInMainUnit, currency),
        });
        // Réponse de base
        const baseResponse = {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount: amountInCents, // on renvoie en cents côté client pour Stripe.js
            currency,
            serviceType,
            status: 'requires_payment_method',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        // Récupération sécurisée de l'account ID Stripe
        let accountId;
        try {
            const stripe = new stripe_1.default(getStripeSecretParam().value(), { apiVersion: '2023-10-16' });
            const account = await stripe.accounts.retrieve();
            accountId = account.id;
        }
        catch (error) {
            console.warn("Impossible de récupérer l'account ID Stripe:", error);
            accountId = undefined;
        }
        // Réponse finale avec informations supplémentaires
        const finalResponse = Object.assign(Object.assign({}, baseResponse), { stripeMode: STRIPE_MODE.value() || 'test', stripeAccountId: accountId });
        return finalResponse;
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        const errorData = {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime,
            requestData: {
                amount: (_j = request.data) === null || _j === void 0 ? void 0 : _j.amount,
                serviceType: (_k = request.data) === null || _k === void 0 ? void 0 : _k.serviceType,
                currency: ((_l = request.data) === null || _l === void 0 ? void 0 : _l.currency) || 'eur',
                hasAuth: !!request.auth,
                hasCommission: ((_m = request.data) === null || _m === void 0 ? void 0 : _m.commissionAmount) !== undefined,
            },
            userAuth: ((_o = request.auth) === null || _o === void 0 ? void 0 : _o.uid) || 'not-authenticated',
            environment: process.env.NODE_ENV,
            stripeMode: STRIPE_MODE.value() || 'test',
        };
        await (0, logError_1.logError)('createPaymentIntent:error', errorData);
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
/**
 * ✅ Récap déploiement / config
 *
 * 1) Stocke tes deux clés dans Secret Manager :
 *
 * 2) Ajoute le param STRIPE_MODE (config param, pas un secret) :
 *    firebase functions:config:set params_STRIPE_MODE="test"
 *    # ou "live" lors du basculement prod
 *
 * 3) Vérifie que ton front et ton back sont dans le même mode :
 *    - Front: publie pk_test_*** si STRIPE_MODE=test, pk_live_*** si STRIPE_MODE=live
 *    - Back : sélectionne la bonne sk_* via STRIPE_MODE
 *
 * 4) Déploie :
 *    firebase deploy --only functions
 */
void _FUNCTION_CONFIG;
//# sourceMappingURL=createPaymentIntent.js.map