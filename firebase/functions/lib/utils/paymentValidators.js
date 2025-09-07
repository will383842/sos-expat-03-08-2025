"use strict";
// firebase/functions/src/utils/paymentValidators.ts
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
exports.formatEuros = exports.centsToEuros = exports.eurosToCents = exports.PAYMENT_LIMITS = exports.DEFAULT_PRICING_CONFIG = void 0;
exports.toCents = toCents;
exports.fromCents = fromCents;
exports.formatAmount = formatAmount;
exports.getPricingConfig = getPricingConfig;
exports.validateAmount = validateAmount;
exports.calculateSplit = calculateSplit;
exports.validateSplit = validateSplit;
exports.checkDailyLimit = checkDailyLimit;
exports.isSuspiciousAmount = isSuspiciousAmount;
exports.logPaymentAudit = logPaymentAudit;
exports.generatePaymentId = generatePaymentId;
const admin = __importStar(require("firebase-admin"));
/* ────────────────────────────────────────────────────────────────────────────
   Configuration par défaut (modifiable dans l'admin)
   ──────────────────────────────────────────────────────────────────────────── */
exports.DEFAULT_PRICING_CONFIG = {
    lawyer: {
        eur: {
            totalAmount: 49,
            connectionFeeAmount: 19,
            providerAmount: 30,
            duration: 25,
            currency: 'eur',
        },
        usd: {
            totalAmount: 55,
            connectionFeeAmount: 25,
            providerAmount: 30,
            duration: 25,
            currency: 'usd',
        },
    },
    expat: {
        eur: {
            totalAmount: 19,
            connectionFeeAmount: 9,
            providerAmount: 10,
            duration: 35,
            currency: 'eur',
        },
        usd: {
            totalAmount: 25,
            connectionFeeAmount: 15,
            providerAmount: 10,
            duration: 35,
            currency: 'usd',
        },
    },
};
/* ────────────────────────────────────────────────────────────────────────────
   Limites de validation par devise
   ──────────────────────────────────────────────────────────────────────────── */
exports.PAYMENT_LIMITS = {
    eur: { MIN_AMOUNT: 5, MAX_AMOUNT: 500, MAX_DAILY: 2000, TOLERANCE: 10 },
    usd: { MIN_AMOUNT: 6, MAX_AMOUNT: 600, MAX_DAILY: 2400, TOLERANCE: 12 },
    SPLIT_TOLERANCE_CENTS: 1,
};
/* ────────────────────────────────────────────────────────────────────────────
   Helpers monétaires
   ──────────────────────────────────────────────────────────────────────────── */
/**
 * Convertit un montant (unité principale) en centimes selon la devise.
 * On centralise l'arrondi et on exploite le paramètre `currency`
 * (prêt pour d’autres devises avec un nombre de décimales différent).
 */
function toCents(amount, currency = 'eur') {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        throw new Error(`Montant invalide: ${amount}`);
    }
    const decimals = currency === 'usd' ? 2 : 2; // évolutif si d'autres devises
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor);
}
/**
 * Convertit des centimes vers l’unité principale selon la devise.
 */
function fromCents(cents, currency = 'eur') {
    if (typeof cents !== 'number' || Number.isNaN(cents)) {
        throw new Error(`Montant en centimes invalide: ${cents}`);
    }
    const decimals = currency === 'usd' ? 2 : 2;
    const factor = Math.pow(10, decimals);
    // On garde un arrondi propre à `decimals` pour éviter des flottants bizarres
    return Math.round((cents / factor) * factor) / factor;
}
/** Garde les anciennes fonctions pour compatibilité */
const eurosToCents = (euros) => toCents(euros, 'eur');
exports.eurosToCents = eurosToCents;
const centsToEuros = (cents) => fromCents(cents, 'eur');
exports.centsToEuros = centsToEuros;
/**
 * Formate un montant selon la devise
 */
function formatAmount(amount, currency = 'eur') {
    return new Intl.NumberFormat(currency === 'eur' ? 'fr-FR' : 'en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
/** Compatibilité historique */
const formatEuros = (euros) => formatAmount(euros, 'eur');
exports.formatEuros = formatEuros;
let pricingCache = null;
let pricingCacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
function toMillis(v) {
    if (typeof v === 'number')
        return v;
    // Firestore Timestamp
    if (v && typeof v === 'object') {
        const maybeTs = v;
        if (typeof maybeTs.toDate === 'function') {
            try {
                return maybeTs.toDate().getTime();
            }
            catch { /* ignore */ }
        }
        if (typeof maybeTs.seconds === 'number') {
            return maybeTs.seconds * 1000;
        }
    }
    return undefined;
}
async function getPricingConfig(type, currency = 'eur', db) {
    try {
        const now = Date.now();
        // 1) Cache
        if (pricingCache && now < pricingCacheExpiry) {
            const cached = pricingCache[type]?.[currency];
            if (cached && typeof cached.totalAmount === 'number') {
                return {
                    totalAmount: cached.totalAmount,
                    connectionFeeAmount: cached.connectionFeeAmount ?? 0,
                    providerAmount: cached.providerAmount ?? (cached.totalAmount - (cached.connectionFeeAmount ?? 0)),
                    duration: cached.duration ?? exports.DEFAULT_PRICING_CONFIG[type][currency].duration,
                    currency,
                };
            }
        }
        // 2) Firestore
        if (db) {
            const snap = await db.collection('admin_config').doc('pricing').get();
            if (snap.exists) {
                const adminPricing = snap.data();
                pricingCache = adminPricing;
                pricingCacheExpiry = now + CACHE_DURATION;
                const adminCfg = adminPricing?.[type]?.[currency];
                // Overrides
                const ovTable = type === 'lawyer'
                    ? adminPricing?.overrides?.lawyer
                    : adminPricing?.overrides?.expat;
                const ov = ovTable?.[currency];
                const active = ov?.enabled === true &&
                    (toMillis(ov?.startsAt) ? now >= toMillis(ov?.startsAt) : true) &&
                    (toMillis(ov?.endsAt) ? now <= toMillis(ov?.endsAt) : true);
                if (active && typeof ov?.totalAmount === 'number') {
                    const total = ov.totalAmount;
                    const conn = ov.connectionFeeAmount ?? 0;
                    return {
                        totalAmount: total,
                        connectionFeeAmount: conn,
                        providerAmount: typeof ov.providerAmount === 'number' ? ov.providerAmount : Math.max(0, total - conn),
                        duration: adminCfg?.duration ?? exports.DEFAULT_PRICING_CONFIG[type][currency].duration,
                        currency,
                    };
                }
                if (adminCfg && typeof adminCfg.totalAmount === 'number') {
                    const total = adminCfg.totalAmount;
                    const conn = adminCfg.connectionFeeAmount ?? 0;
                    return {
                        totalAmount: total,
                        connectionFeeAmount: conn,
                        providerAmount: typeof adminCfg.providerAmount === 'number' ? adminCfg.providerAmount : Math.max(0, total - conn),
                        duration: adminCfg.duration ?? exports.DEFAULT_PRICING_CONFIG[type][currency].duration,
                        currency,
                    };
                }
            }
        }
        // 3) Fallback
        // eslint-disable-next-line no-console
        console.log(`💡 Utilisation config par défaut pour ${type}/${currency}`);
        return exports.DEFAULT_PRICING_CONFIG[type][currency];
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Erreur récupération pricing config:', err);
        return exports.DEFAULT_PRICING_CONFIG[type][currency];
    }
}
/* ────────────────────────────────────────────────────────────────────────────
   Validations & calculs
   ──────────────────────────────────────────────────────────────────────────── */
/**
 * Valide qu'un montant est dans les limites acceptables selon la devise
 */
function validateAmount(amount, type, currency = 'eur') {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        return { valid: false, error: 'Montant invalide' };
    }
    const limits = exports.PAYMENT_LIMITS[currency];
    const config = exports.DEFAULT_PRICING_CONFIG[type][currency];
    if (amount < limits.MIN_AMOUNT) {
        return { valid: false, error: `Montant minimum ${limits.MIN_AMOUNT}${currency === 'eur' ? '€' : '$'}` };
    }
    if (amount > limits.MAX_AMOUNT) {
        return { valid: false, error: `Montant maximum ${limits.MAX_AMOUNT}${currency === 'eur' ? '€' : '$'}` };
    }
    // Cohérence vis-à-vis du prix standard
    const expected = config.totalAmount;
    const difference = Math.abs(amount - expected);
    if (difference > limits.TOLERANCE) {
        return {
            valid: true,
            warning: `Montant inhabituel: ${formatAmount(amount, currency)} (attendu: ${formatAmount(expected, currency)})`,
        };
    }
    return { valid: true };
}
/**
 * Calcule la répartition (frais / prestataire) selon la devise
 */
function calculateSplit(totalAmount, type, currency = 'eur') {
    const config = exports.DEFAULT_PRICING_CONFIG[type][currency];
    const connectionFeeAmount = Math.round(config.connectionFeeAmount * 100) / 100;
    const providerAmount = Math.round((totalAmount - connectionFeeAmount) * 100) / 100;
    const totalCents = toCents(totalAmount, currency);
    const connectionFeeCents = toCents(connectionFeeAmount, currency);
    const providerCents = toCents(providerAmount, currency);
    const sumCents = connectionFeeCents + providerCents;
    const isValid = Math.abs(sumCents - totalCents) <= exports.PAYMENT_LIMITS.SPLIT_TOLERANCE_CENTS;
    if (!isValid) {
        // eslint-disable-next-line no-console
        console.error('⚠️ Incohérence dans la répartition:', {
            totalCents, connectionFeeCents, providerCents, sumCents,
            difference: sumCents - totalCents, currency,
        });
    }
    return {
        totalCents,
        connectionFeeCents,
        providerCents,
        totalAmount,
        connectionFeeAmount,
        providerAmount,
        currency,
        isValid,
    };
}
/**
 * Vérifie la cohérence d'une répartition existante selon la devise
 */
function validateSplit(totalAmount, connectionFeeAmount, providerAmount, currency = 'eur') {
    const sum = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
    const total = Math.round(totalAmount * 100) / 100;
    const difference = Math.abs(sum - total);
    if (difference > 0.01) {
        return {
            valid: false,
            error: `Répartition incohérente: ${formatAmount(sum, currency)} != ${formatAmount(total, currency)}`,
            difference,
        };
    }
    return { valid: true };
}
/**
 * Vérifie la limite journalière d'un utilisateur selon la devise
 */
async function checkDailyLimit(userId, amount, currency = 'eur', db) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTs = admin.firestore.Timestamp.fromDate(today);
        const snap = await db
            .collection('payments')
            .where('clientId', '==', userId)
            .where('createdAt', '>=', todayTs)
            .where('currency', '==', currency)
            .where('status', 'in', ['succeeded', 'captured', 'processing'])
            .get();
        let currentTotal = 0;
        snap.docs.forEach(d => {
            const payment = d.data();
            const paymentAmount = typeof payment.amount === 'number'
                ? payment.amount
                : fromCents(typeof payment.amountCents === 'number' ? payment.amountCents : 0, currency);
            currentTotal += paymentAmount;
        });
        const limits = exports.PAYMENT_LIMITS[currency];
        const newTotal = currentTotal + amount;
        const allowed = newTotal <= limits.MAX_DAILY;
        return {
            allowed,
            currentTotal,
            limit: limits.MAX_DAILY,
            error: allowed
                ? undefined
                : `Limite journalière dépassée: ${formatAmount(newTotal, currency)} / ${formatAmount(limits.MAX_DAILY, currency)}`,
        };
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Erreur vérification limite journalière:', err);
        return { allowed: true, currentTotal: 0, limit: exports.PAYMENT_LIMITS[currency].MAX_DAILY };
    }
}
/**
 * Détermine si un montant paraît suspect
 */
function isSuspiciousAmount(amount, type, currency = 'eur', previousPayments = []) {
    const reasons = [];
    const expected = exports.DEFAULT_PRICING_CONFIG[type][currency].totalAmount;
    const deviation = Math.abs(amount - expected) / expected;
    if (deviation > 0.5)
        reasons.push(`Déviation importante du prix standard (${Math.round(deviation * 100)}%)`);
    const decimals = (amount.toString().split('.')[1] || '').length;
    if (decimals > 2)
        reasons.push(`Trop de décimales: ${decimals}`);
    if (previousPayments.length >= 3) {
        const lastThree = previousPayments.slice(-3);
        if (lastThree.every((p) => p === amount))
            reasons.push('Montants identiques répétés');
    }
    if (amount % 10 === 0 && amount !== expected)
        reasons.push('Montant rond inhabituel');
    return { suspicious: reasons.length > 0, reasons };
}
/**
 * Log d’audit (types stricts pour metadata)
 */
async function logPaymentAudit(data, db) {
    try {
        await db.collection('payment_audit').add({
            ...data,
            amountCents: toCents(data.amount, data.currency),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            environment: process.env.NODE_ENV || 'development',
        });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Erreur log audit:', err);
    }
}
/**
 * Génère un identifiant de paiement unique
 */
function generatePaymentId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    return `pay_${timestamp}_${random}`;
}
//# sourceMappingURL=paymentValidators.js.map