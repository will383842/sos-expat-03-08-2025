"use strict";
/* firebase/functions/src/createPaymentIntent.ts
   Cloud Functions v2 — createPaymentIntent (Stripe)
   - LIMITS déclaré en haut + getLimits() (jamais d’undefined)
   - checkRateLimit() avec fallback local (impossible à casser)
   - Lecture sécurisée des secrets via process.env (les secrets sont injectés par Functions v2)
   - Types stricts
*/
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
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// -- App code existant --
const StripeManager_1 = require("./StripeManager");
const logError_1 = require("./utils/logs/logError");
const paymentValidators_1 = require("./utils/paymentValidators");
/* ────────────────────────────────────────────────────────────────────────────
   (A) LIMITS — placé tout en haut, avant toute utilisation
   ──────────────────────────────────────────────────────────────────────────── */
const LIMITS = {
    RATE_LIMIT: { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 },
    AMOUNT_LIMITS: {
        MIN_EUR: 1,
        MAX_EUR: 500,
        MAX_DAILY_EUR: 1000,
        MIN_USD: 1,
        MAX_USD: 600,
        MAX_DAILY_USD: 1200,
    },
    VALIDATION: {
        AMOUNT_COHERENCE_TOLERANCE: 0.5,
        MAX_DESCRIPTION_LENGTH: 240,
        ALLOWED_CURRENCIES: ['eur', 'usd'],
        ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'],
    },
    DUPLICATES: { WINDOW_MS: 15 * 60 * 1000 },
};
/* (B) getLimits() — fallback si LIMITS était undefined (import circulaire, etc.) */
function getLimits() {
    return (LIMITS ?? {
        RATE_LIMIT: { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 },
        AMOUNT_LIMITS: {
            MIN_EUR: 1,
            MAX_EUR: 500,
            MAX_DAILY_EUR: 1000,
            MIN_USD: 1,
            MAX_USD: 600,
            MAX_DAILY_USD: 1200,
        },
        VALIDATION: {
            AMOUNT_COHERENCE_TOLERANCE: 0.5,
            MAX_DESCRIPTION_LENGTH: 240,
            ALLOWED_CURRENCIES: ['eur', 'usd'],
            ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'],
        },
        DUPLICATES: { WINDOW_MS: 15 * 60 * 1000 },
    });
}
/* ────────────────────────────────────────────────────────────────────────────
   Config & Params
   ──────────────────────────────────────────────────────────────────────────── */
const FUNCTION_OPTIONS = {
    region: 'europe-west1',
    memory: '256MiB',
    concurrency: 1,
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 3,
};
const STRIPE_SECRET_KEY_TEST = (0, params_1.defineSecret)('STRIPE_SECRET_KEY_TEST');
const STRIPE_SECRET_KEY_LIVE = (0, params_1.defineSecret)('STRIPE_SECRET_KEY_LIVE');
const STRIPE_MODE = (0, params_1.defineString)('STRIPE_MODE');
const isDevelopment = process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';
const BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';
logger.info(`🌍 Env=${process.env.NODE_ENV || 'development'} | PROD=${isProduction} | BYPASS=${BYPASS_MODE} | StripeMode=${STRIPE_MODE.value() || '(unset)'}`);
/* Secrets Stripe — lecture SAFE via process.env (les secrets sont injectés via l’option `secrets`) */
function getStripeSecretKeySafe() {
    const mode = (STRIPE_MODE.value() || 'test').toLowerCase();
    const key = mode === 'live' ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
    if (!key) {
        throw new https_1.HttpsError('failed-precondition', `Clé Stripe manquante pour le mode "${mode}". Ajoutez le secret ${mode === 'live' ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST'} dans Secret Manager et redéployez.`);
    }
    return key;
}
/* ────────────────────────────────────────────────────────────────────────────
   Mémoire rate limit
   ──────────────────────────────────────────────────────────────────────────── */
const rateLimitStore = new Map();
/* (D) checkRateLimit — **patch pare-balle** : n’utilise pas getLimits() ici */
function checkRateLimit(userId) {
    if (BYPASS_MODE)
        return { allowed: true };
    // 🔒 Pare-feu anti-undefined (plus robuste qu'un simple getLimits())
    const L = typeof LIMITS === 'object' && LIMITS.RATE_LIMIT
        ? LIMITS.RATE_LIMIT
        : { WINDOW_MS: 10 * 60 * 1000, MAX_REQUESTS: 6 };
    const now = Date.now();
    const key = `payment_${userId}`;
    let bucket = rateLimitStore.get(key);
    if (!bucket || now > bucket.resetTime) {
        bucket = { count: 0, resetTime: now + L.WINDOW_MS };
        rateLimitStore.set(key, bucket);
    }
    if (bucket.count >= L.MAX_REQUESTS) {
        return { allowed: false, resetTime: bucket.resetTime };
    }
    bucket.count += 1;
    return { allowed: true };
}
/* Validations */
async function validateBusinessLogic(data, currency, db) {
    if (BYPASS_MODE)
        return { valid: true };
    try {
        const providerDoc = await db.collection('users').doc(data.providerId).get();
        const providerData = providerDoc.data();
        if (!providerData)
            return { valid: false, error: 'Prestataire non trouvé' };
        if (providerData.status === 'suspended' || providerData.status === 'banned') {
            return { valid: false, error: 'Prestataire non disponible' };
        }
        if (!isProduction)
            return { valid: true };
        const expectedTotal = data.serviceType === 'lawyer_call'
            ? currency === 'eur'
                ? 49
                : 55
            : currency === 'eur'
                ? 19
                : 25;
        const diff = Math.abs(Number(data.amount) - expectedTotal);
        if (diff > 100)
            return { valid: false, error: 'Montant inhabituel pour ce service' };
        return { valid: true };
    }
    catch (err) {
        await (0, logError_1.logError)('validateBusinessLogic', err);
        return { valid: false, error: 'Erreur lors de la validation métier' };
    }
}
async function validateAmountSecurity(amount, currency, userId, db) {
    const A = getLimits().AMOUNT_LIMITS;
    const limits = currency === 'eur'
        ? { min: A.MIN_EUR, max: A.MAX_EUR, daily: A.MAX_DAILY_EUR }
        : { min: A.MIN_USD, max: A.MAX_USD, daily: A.MAX_DAILY_USD };
    if (amount < limits.min)
        return { valid: false, error: `Montant minimum ${limits.min}` };
    if (amount > limits.max)
        return { valid: false, error: `Montant maximum ${limits.max}` };
    if (!isDevelopment) {
        try {
            const daily = await (0, paymentValidators_1.checkDailyLimit)(userId, amount, currency, db);
            if (!daily.allowed)
                return { valid: false, error: daily.error };
        }
        catch (err) {
            await (0, logError_1.logError)('validateAmountSecurity:dailyLimit', err);
        }
    }
    return { valid: true };
}
async function checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db) {
    if (BYPASS_MODE)
        return false;
    try {
        const snap = await db
            .collection('payments')
            .where('clientId', '==', clientId)
            .where('providerId', '==', providerId)
            .where('currency', '==', currency)
            .where('amountInMainUnit', '==', amountInMainUnit)
            .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - getLimits().DUPLICATES.WINDOW_MS)))
            .limit(1)
            .get();
        return !snap.empty;
    }
    catch (err) {
        await (0, logError_1.logError)('checkDuplicatePayments', err);
        return false;
    }
}
function validateAmountCoherence(totalAmount, commissionAmount, providerAmount) {
    const totalCalculated = Math.round((commissionAmount + providerAmount) * 100) / 100;
    const amountRounded = Math.round(totalAmount * 100) / 100;
    const difference = Math.abs(totalCalculated - amountRounded);
    const tolerance = getLimits().VALIDATION.AMOUNT_COHERENCE_TOLERANCE;
    if (difference > tolerance) {
        return {
            valid: false,
            error: `Incohérence montants: ${difference.toFixed(2)} (tolérance ${tolerance.toFixed(2)})`,
            difference,
        };
    }
    return { valid: true, difference };
}
function sanitizeAndConvertInput(data) {
    const V = getLimits().VALIDATION;
    const maxNameLen = isDevelopment ? 500 : 200;
    const maxDescLen = V.MAX_DESCRIPTION_LENGTH;
    const maxMetaKeyLen = isDevelopment ? 100 : 50;
    const maxMetaValueLen = isDevelopment ? 500 : 200;
    const currency = (data.currency || 'eur').toLowerCase().trim();
    const amountInMainUnit = Number(data.amount);
    const commissionAmountInMainUnit = Number(data.commissionAmount);
    const providerAmountInMainUnit = Number(data.providerAmount);
    return {
        amountInMainUnit,
        amountInCents: (0, paymentValidators_1.toCents)(amountInMainUnit, currency),
        commissionAmountInMainUnit,
        commissionAmountInCents: (0, paymentValidators_1.toCents)(commissionAmountInMainUnit, currency),
        providerAmountInMainUnit,
        providerAmountInCents: (0, paymentValidators_1.toCents)(providerAmountInMainUnit, currency),
        currency,
        serviceType: data.serviceType,
        providerId: data.providerId.trim(),
        clientId: data.clientId.trim(),
        clientEmail: data.clientEmail?.trim().toLowerCase(),
        providerName: data.providerName?.trim().slice(0, maxNameLen),
        description: data.description?.trim().slice(0, maxDescLen),
        callSessionId: data.callSessionId?.trim(),
        metadata: data.metadata
            ? Object.fromEntries(Object.entries(data.metadata)
                .filter(([k, v]) => k.length <= maxMetaKeyLen && String(v).length <= maxMetaValueLen)
                .slice(0, isDevelopment ? 20 : 10))
            : {},
        coupon: data.coupon
            ? {
                code: data.coupon.code,
                couponId: data.coupon.couponId,
                discountAmount: Number(data.coupon.discountAmount),
                discountType: data.coupon.discountType,
                discountValue: Number(data.coupon.discountValue),
            }
            : undefined,
    };
}
/* (E) Log safe (aucune référence directe à LIMITS) */
{
    const L = getLimits();
    logger.info('[PI] LIMITS_ACTIVE', { hasLimits: !!L.RATE_LIMIT });
}
/* ────────────────────────────────────────────────────────────────────────────
   Signature de build (constante de fichier)
   ──────────────────────────────────────────────────────────────────────────── */
const BUILD_SIG = 'CPI-2025-09-03-v2-fallback-guard';
/* ────────────────────────────────────────────────────────────────────────────
   Callable
   ──────────────────────────────────────────────────────────────────────────── */
exports.createPaymentIntent = (0, https_1.onCall)({
    ...FUNCTION_OPTIONS,
    // Important: déclarer les secrets pour injection des env vars
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
}, async (request) => {
    // ── SIGNATURE DE BUILD — doit apparaître dans les logs Cloud Run après déploiement
    logger.info('[createPaymentIntent] BUILD_SIG', { BUILD_SIG });
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    /* 🔒 Garde-fou fail-fast sur les limites */
    {
        const L = getLimits();
        if (!L?.RATE_LIMIT) {
            logger.error('[FATAL] Limits missing', { L });
            throw new https_1.HttpsError('internal', 'Payment service misconfigured');
        }
    }
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
        }
        const userId = request.auth.uid;
        // Entrées minimales
        if (typeof request.data.amount !== 'number' || !Number.isFinite(request.data.amount) || request.data.amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', `Montant invalide: ${request.data.amount}`);
        }
        if (typeof request.data.commissionAmount !== 'number' || request.data.commissionAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Commission invalide');
        }
        if (typeof request.data.providerAmount !== 'number' || request.data.providerAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Montant prestataire invalide');
        }
        // Rate limit robuste (patch)
        const rl = checkRateLimit(userId);
        if (!rl.allowed) {
            const waitMin = Math.ceil(((rl.resetTime ?? Date.now()) - Date.now()) / 60000);
            throw new https_1.HttpsError('resource-exhausted', `Trop de tentatives. Réessayez dans ${waitMin} min.`);
        }
        // Normalisation
        const s = sanitizeAndConvertInput(request.data);
        const { amountInMainUnit, amountInCents, commissionAmountInMainUnit, providerAmountInMainUnit, currency, serviceType, providerId, clientId, clientEmail, providerName, description, callSessionId, metadata, coupon, } = s;
        const V = getLimits().VALIDATION;
        if (!V.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', 'Type de service invalide');
        }
        if (!providerId || providerId.length < 5)
            throw new https_1.HttpsError('invalid-argument', 'ID prestataire invalide');
        if (!clientId || clientId.length < 5)
            throw new https_1.HttpsError('invalid-argument', 'ID client invalide');
        if (!V.ALLOWED_CURRENCIES.includes(currency)) {
            throw new https_1.HttpsError('invalid-argument', `Devise non supportée: ${currency}`);
        }
        const db = admin.firestore();
        // Limites montants + quota quotidien
        const sec = await validateAmountSecurity(amountInMainUnit, currency, userId, db);
        if (!sec.valid)
            throw new https_1.HttpsError('invalid-argument', sec.error ?? 'Montant non valide');
        // Règles métier
        const biz = await validateBusinessLogic(request.data, currency, db);
        if (!biz.valid)
            throw new https_1.HttpsError('failed-precondition', biz.error ?? 'Règles métier non satisfaites');
        // Anti-doublons
        if (await checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db)) {
            throw new https_1.HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
        }
        // Prix attendu (admin_config/pricing + override + coupons empilables)
        const serviceKind = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
        const cfg = await (0, paymentValidators_1.getPricingConfig)(serviceKind, currency, db); // { totalAmount: number, ... }
        let expected = cfg.totalAmount;
        const pricingSnap = await db.collection('admin_config').doc('pricing').get();
        const pricingDoc = pricingSnap.exists ? pricingSnap.data() : {};
        const overrideMap = serviceKind === 'lawyer' ? pricingDoc?.overrides?.lawyer : pricingDoc?.overrides?.expat;
        const overrideNode = currency === 'eur' ? overrideMap?.eur : overrideMap?.usd;
        const now = new Date();
        const startsAt = overrideNode?.startsAt?.toDate?.() ?? null;
        const endsAt = overrideNode?.endsAt?.toDate?.() ?? null;
        const overrideActive = overrideNode?.enabled === true && (startsAt ? now >= startsAt : true) && (endsAt ? now <= endsAt : true);
        const stackableDefault = pricingDoc?.overrides?.settings?.stackableDefault;
        const stackable = typeof overrideNode?.stackableWithCoupons === 'boolean'
            ? overrideNode.stackableWithCoupons
            : (typeof stackableDefault === 'boolean' ? stackableDefault : false);
        if (!overrideActive || stackable) {
            if (coupon?.code) {
                const code = String(coupon.code).trim().toUpperCase();
                if (code) {
                    const snap = await db.collection('coupons').where('code', '==', code).limit(1).get();
                    if (!snap.empty) {
                        const cpn = snap.docs[0].data();
                        const now2 = new Date();
                        const validFrom = cpn.valid_from?.toDate?.();
                        const validUntil = cpn.valid_until?.toDate?.();
                        const active = cpn.active !== false;
                        const inWindow = (validFrom ? now2 >= validFrom : true) && (validUntil ? now2 <= validUntil : true);
                        const serviceOk = Array.isArray(cpn.services) ? cpn.services.includes(serviceType) : true;
                        const minOk = typeof cpn.min_order_amount === 'number' ? expected >= cpn.min_order_amount : true;
                        if (active && inWindow && serviceOk && minOk) {
                            let discount = 0;
                            if (cpn.type === 'fixed')
                                discount = Number(cpn.amount) || 0;
                            if (cpn.type === 'percentage') {
                                const pct = Number(cpn.amount) || 0;
                                discount = Math.max(0, Math.round((expected * pct) / 100 * 100) / 100);
                            }
                            if (typeof cpn.maxDiscount === 'number')
                                discount = Math.min(discount, cpn.maxDiscount);
                            discount = Math.min(discount, expected);
                            expected = Math.max(0, Math.round((expected - discount) * 100) / 100);
                        }
                    }
                }
            }
        }
        const diff = Math.abs(Number(amountInMainUnit) - Number(expected));
        if (diff > 0.5) {
            throw new https_1.HttpsError('invalid-argument', `Montant inattendu (reçu ${amountInMainUnit}, attendu ${expected})`);
        }
        const coherence = validateAmountCoherence(amountInMainUnit, commissionAmountInMainUnit, providerAmountInMainUnit);
        if (!coherence.valid && (isProduction || coherence.difference > 1)) {
            throw new https_1.HttpsError('invalid-argument', coherence.error ?? 'Incohérence montants');
        }
        // Clé Stripe (safe)
        const stripeSecretKey = getStripeSecretKeySafe();
        const providerType = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
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
                coupon_code: coupon?.code || '',
                override: String(expected !== cfg.totalAmount),
                promo_active: String(overrideActive),
                promo_stackable: String(stackable),
                ...metadata,
            },
        };
        const result = await StripeManager_1.stripeManager.createPaymentIntent(stripePayload, stripeSecretKey);
        if (!result?.success || !result.clientSecret || !result.paymentIntentId) {
            await (0, logError_1.logError)('createPaymentIntent:stripe_error', {
                requestId,
                userId,
                serviceType,
                amountInMainUnit,
                amountInCents,
                error: result?.error ?? 'unknown',
            });
            throw new https_1.HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
        }
        if (isProduction) {
            try {
                await (0, paymentValidators_1.logPaymentAudit)({
                    paymentId: result.paymentIntentId,
                    userId: clientId,
                    amount: amountInMainUnit,
                    currency,
                    type: providerType,
                    action: 'create',
                    metadata: {
                        amountInCents,
                        commissionAmountInMainUnit,
                        providerAmountInMainUnit,
                        requestId,
                    },
                }, admin.firestore());
            }
            catch (auditErr) {
                logger.warn('Audit logging failed', auditErr);
            }
        }
        let accountId;
        try {
            const stripe = new stripe_1.default(stripeSecretKey, { apiVersion: '2023-10-16' });
            const account = await stripe.accounts.retrieve();
            accountId = account.id;
        }
        catch (err) {
            logger.warn("Impossible de récupérer l'account Stripe", err);
        }
        return {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount: amountInCents,
            currency,
            serviceType,
            status: 'requires_payment_method',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            stripeMode: STRIPE_MODE.value() || 'test',
            stripeAccountId: accountId,
        };
    }
    catch (err) {
        const processingTime = Date.now() - startTime;
        await (0, logError_1.logError)('createPaymentIntent:error', {
            requestId,
            error: err instanceof https_1.HttpsError ? err.message : err?.message ?? 'unknown',
            processingTime,
            requestData: {
                amount: request.data?.amount,
                serviceType: request.data?.serviceType,
                currency: request.data?.currency || 'eur',
                hasAuth: !!request.auth,
                hasCommission: request.data?.commissionAmount !== undefined,
            },
            userAuth: request.auth?.uid || 'not-authenticated',
            environment: process.env.NODE_ENV,
            stripeMode: STRIPE_MODE.value() || 'test',
        });
        if (err instanceof https_1.HttpsError)
            throw err;
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
/*
Checklist de config:

1) Secrets:
   firebase functions:secrets:set STRIPE_SECRET_KEY_TEST
   firebase functions:secrets:set STRIPE_SECRET_KEY_LIVE

2) Param:
   firebase functions:params:set STRIPE_MODE="test"   # ou "live"

3) Build & Déploiement:
   npm --prefix firebase/functions ci
   npm --prefix firebase/functions run build   # attendu: 0 error
   firebase deploy --only functions:createPaymentIntent

4) Front ↔ Back:
   STRIPE_MODE=test  ↔ VITE_STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_MODE=live  ↔ VITE_STRIPE_PUBLIC_KEY=pk_live_...
*/
//# sourceMappingURL=createPaymentIntent.js.map