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
/**
 * Configuration RÉELLE des montants - MODIFIABLE depuis l'admin
 * (uniquement en termes de frais de mise en relation)
 */
exports.DEFAULT_PRICING_CONFIG = {
    lawyer: {
        eur: {
            totalAmount: 49, // Prix total payé par le client
            connectionFeeAmount: 19, // ✅ Frais fixes de mise en relation
            providerAmount: 30, // ✅ Ce que reçoit le prestataire (49 - 19 = 30)
            duration: 25,
            currency: 'eur'
        },
        usd: {
            totalAmount: 55, // Prix total payé par le client
            connectionFeeAmount: 25, // ✅ Frais fixes de mise en relation
            providerAmount: 30, // ✅ Ce que reçoit le prestataire (55 - 25 = 30)
            duration: 25,
            currency: 'usd'
        }
    },
    expat: {
        eur: {
            totalAmount: 19, // Prix total payé par le client
            connectionFeeAmount: 9, // ✅ Frais fixes de mise en relation
            providerAmount: 10, // ✅ Ce que reçoit le prestataire (19 - 9 = 10)
            duration: 35,
            currency: 'eur'
        },
        usd: {
            totalAmount: 25, // Prix total payé par le client
            connectionFeeAmount: 15, // ✅ Frais fixes de mise en relation
            providerAmount: 10, // ✅ Ce que reçoit le prestataire (25 - 15 = 10)
            duration: 35,
            currency: 'usd'
        }
    }
};
/**
 * Limites de validation par devise
 */
exports.PAYMENT_LIMITS = {
    eur: {
        MIN_AMOUNT: 5,
        MAX_AMOUNT: 500,
        MAX_DAILY: 2000,
        TOLERANCE: 10
    },
    usd: {
        MIN_AMOUNT: 6,
        MAX_AMOUNT: 600,
        MAX_DAILY: 2400,
        TOLERANCE: 12
    },
    SPLIT_TOLERANCE_CENTS: 1
};
/**
 * Convertit un montant vers des centimes selon la devise
 */
function toCents(amount, currency = 'eur') {
    if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error(`Montant invalide: ${amount}`);
    }
    // Arrondir d'abord à 2 décimales puis convertir
    const rounded = Math.round(amount * 100) / 100;
    return Math.round(rounded * 100);
}
/**
 * Convertit des centimes vers l'unité principale selon la devise
 */
function fromCents(cents, currency = 'eur') {
    if (typeof cents !== 'number' || isNaN(cents)) {
        throw new Error(`Montant en centimes invalide: ${cents}`);
    }
    return Math.round(cents) / 100;
}
/**
 * Garde les anciennes fonctions pour compatibilité
 */
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
        maximumFractionDigits: 2
    }).format(amount);
}
/**
 * Garde l'ancienne fonction pour compatibilité
 */
const formatEuros = (euros) => formatAmount(euros, 'eur');
exports.formatEuros = formatEuros;
/**
 * Récupère la configuration de pricing depuis Firestore (avec cache)
 */
let pricingCache = null;
let pricingCacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
async function getPricingConfig(type, currency = 'eur', db) {
    var _a, _b, _c, _d;
    try {
        // Utiliser le cache si valide
        const now = Date.now();
        if (pricingCache && now < pricingCacheExpiry) {
            const cached = (_a = pricingCache[type]) === null || _a === void 0 ? void 0 : _a[currency];
            if (cached)
                return cached;
        }
        // Récupérer depuis Firestore si disponible
        if (db) {
            const configDoc = await db.collection('admin_config').doc('pricing').get();
            if (configDoc.exists) {
                const adminPricing = configDoc.data();
                // Mettre en cache
                pricingCache = adminPricing;
                pricingCacheExpiry = now + CACHE_DURATION;
                const adminConfig = (_b = adminPricing === null || adminPricing === void 0 ? void 0 : adminPricing[type]) === null || _b === void 0 ? void 0 : _b[currency];
                if (adminConfig && typeof adminConfig.totalAmount === 'number') {
                    return {
                        totalAmount: adminConfig.totalAmount,
                        connectionFeeAmount: adminConfig.connectionFeeAmount || 0,
                        providerAmount: (_c = adminConfig.providerAmount) !== null && _c !== void 0 ? _c : (adminConfig.totalAmount - (adminConfig.connectionFeeAmount || 0)),
                        duration: (_d = adminConfig.duration) !== null && _d !== void 0 ? _d : exports.DEFAULT_PRICING_CONFIG[type][currency].duration,
                        currency
                    };
                }
            }
        }
        // Fallback vers la config par défaut
        console.log(`💡 Utilisation config par défaut pour ${type}/${currency}`);
        return exports.DEFAULT_PRICING_CONFIG[type][currency];
    }
    catch (error) {
        console.error('Erreur récupération pricing config:', error);
        // Fallback vers config par défaut en cas d'erreur
        return exports.DEFAULT_PRICING_CONFIG[type][currency];
    }
}
/**
 * Valide qu'un montant est dans les limites acceptables selon la devise
 */
function validateAmount(amount, type, currency = 'eur') {
    // Vérifications de base
    if (typeof amount !== 'number' || isNaN(amount)) {
        return { valid: false, error: 'Montant invalide' };
    }
    const limits = exports.PAYMENT_LIMITS[currency];
    const config = exports.DEFAULT_PRICING_CONFIG[type][currency];
    if (amount < limits.MIN_AMOUNT) {
        return {
            valid: false,
            error: `Montant minimum ${limits.MIN_AMOUNT}${currency === 'eur' ? '€' : '$'}`
        };
    }
    if (amount > limits.MAX_AMOUNT) {
        return {
            valid: false,
            error: `Montant maximum ${limits.MAX_AMOUNT}${currency === 'eur' ? '€' : '$'}`
        };
    }
    // Cohérence avec le prix total attendu
    const expectedAmount = config.totalAmount;
    const difference = Math.abs(amount - expectedAmount);
    if (difference > limits.TOLERANCE) {
        return {
            valid: true,
            warning: `Montant inhabituel: ${formatAmount(amount, currency)} (attendu: ${formatAmount(expectedAmount, currency)})`
        };
    }
    return { valid: true };
}
/**
 * Calcule la répartition (frais de mise en relation / prestataire) selon la devise
 */
function calculateSplit(totalAmount, type, currency = 'eur') {
    const config = exports.DEFAULT_PRICING_CONFIG[type][currency];
    // Montants en unité principale avec arrondi à 2 décimales
    const connectionFeeAmount = Math.round(config.connectionFeeAmount * 100) / 100;
    const providerAmount = Math.round((totalAmount - connectionFeeAmount) * 100) / 100;
    // Conversion en centimes
    const totalCents = toCents(totalAmount, currency);
    const connectionFeeCents = toCents(connectionFeeAmount, currency);
    const providerCents = toCents(providerAmount, currency);
    // Vérification de cohérence
    const sumCents = connectionFeeCents + providerCents;
    const isValid = Math.abs(sumCents - totalCents) <= exports.PAYMENT_LIMITS.SPLIT_TOLERANCE_CENTS;
    if (!isValid) {
        console.error('⚠️ Incohérence dans la répartition:', {
            totalCents,
            connectionFeeCents,
            providerCents,
            sumCents,
            difference: sumCents - totalCents,
            currency
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
        isValid
    };
}
/**
 * Vérifie la cohérence d'une répartition existante selon la devise
 */
function validateSplit(totalAmount, connectionFeeAmount, providerAmount, currency = 'eur') {
    const sum = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
    const total = Math.round(totalAmount * 100) / 100;
    const difference = Math.abs(sum - total);
    if (difference > 0.01) { // Tolérance de 1 centime
        return {
            valid: false,
            error: `Répartition incohérente: ${formatAmount(sum, currency)} != ${formatAmount(total, currency)}`,
            difference
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
        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
        const paymentsSnapshot = await db.collection('payments')
            .where('clientId', '==', userId)
            .where('createdAt', '>=', todayTimestamp)
            .where('currency', '==', currency)
            .where('status', 'in', ['succeeded', 'captured', 'processing'])
            .get();
        let currentTotal = 0;
        paymentsSnapshot.docs.forEach(doc => {
            const payment = doc.data();
            // Utiliser le montant dans l'unité principale
            const paymentAmount = payment.amount || fromCents(payment.amountCents || 0, currency);
            currentTotal += paymentAmount;
        });
        const limits = exports.PAYMENT_LIMITS[currency];
        const newTotal = currentTotal + amount;
        const allowed = newTotal <= limits.MAX_DAILY;
        return {
            allowed,
            currentTotal,
            limit: limits.MAX_DAILY,
            error: allowed ? undefined : `Limite journalière dépassée: ${formatAmount(newTotal, currency)} / ${formatAmount(limits.MAX_DAILY, currency)}`
        };
    }
    catch (error) {
        console.error('Erreur vérification limite journalière:', error);
        // En cas d'erreur, on autorise par défaut (pour ne pas bloquer les paiements)
        return {
            allowed: true,
            currentTotal: 0,
            limit: exports.PAYMENT_LIMITS[currency].MAX_DAILY
        };
    }
}
/**
 * Vérifie si un montant est suspect selon la devise
 */
function isSuspiciousAmount(amount, type, currency = 'eur', previousPayments = []) {
    const reasons = [];
    // Montant très différent du prix total standard pour cette devise
    const expected = exports.DEFAULT_PRICING_CONFIG[type][currency].totalAmount;
    const deviation = Math.abs(amount - expected) / expected;
    if (deviation > 0.5) { // 50% de déviation
        reasons.push(`Déviation importante du prix standard (${Math.round(deviation * 100)}%)`);
    }
    // Montant avec trop de décimales (tentative de manipulation)
    const decimals = (amount.toString().split('.')[1] || '').length;
    if (decimals > 2) {
        reasons.push(`Trop de décimales: ${decimals}`);
    }
    // Pattern de montants répétitifs suspects
    if (previousPayments.length >= 3) {
        const lastThree = previousPayments.slice(-3);
        if (lastThree.every(p => p === amount)) {
            reasons.push('Montants identiques répétés');
        }
    }
    // Montants ronds suspects pour ce type de service
    if (amount % 10 === 0 && amount !== expected) {
        reasons.push('Montant rond inhabituel');
    }
    return {
        suspicious: reasons.length > 0,
        reasons
    };
}
/**
 * Log de transaction pour audit avec devise
 */
async function logPaymentAudit(data, db) {
    try {
        await db.collection('payment_audit').add(Object.assign(Object.assign({}, data), { amountCents: toCents(data.amount, data.currency), timestamp: admin.firestore.FieldValue.serverTimestamp(), environment: process.env.NODE_ENV || 'development' }));
    }
    catch (error) {
        console.error('Erreur log audit:', error);
        // Ne pas bloquer le process si le log échoue
    }
}
/**
 * Génère un identifiant de paiement unique
 */
function generatePaymentId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `pay_${timestamp}_${random}`;
}
//# sourceMappingURL=paymentValidators.js.map