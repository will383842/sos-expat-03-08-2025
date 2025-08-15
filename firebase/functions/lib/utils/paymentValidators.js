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
exports.PAYMENT_LIMITS = exports.PRICING_CONFIG = void 0;
exports.eurosToCents = eurosToCents;
exports.centsToEuros = centsToEuros;
exports.formatEuros = formatEuros;
exports.validateAmount = validateAmount;
exports.calculateSplit = calculateSplit;
exports.validateSplit = validateSplit;
exports.checkDailyLimit = checkDailyLimit;
exports.generatePaymentId = generatePaymentId;
exports.isSuspiciousAmount = isSuspiciousAmount;
exports.logPaymentAudit = logPaymentAudit;
const admin = __importStar(require("firebase-admin"));
/**
 * Configuration des montants par type de service
 */
exports.PRICING_CONFIG = {
    lawyer: {
        amount: 49,
        commission_rate: 0.2,
        duration: 25,
        currency: 'eur'
    },
    expat: {
        amount: 19,
        commission_rate: 0.2,
        duration: 35,
        currency: 'eur'
    }
};
/**
 * Limites de validation
 */
exports.PAYMENT_LIMITS = {
    MIN_AMOUNT_EUROS: 5,
    MAX_AMOUNT_EUROS: 500,
    MAX_DAILY_EUROS: 2000,
    AMOUNT_TOLERANCE_EUROS: 10,
    SPLIT_TOLERANCE_CENTS: 1
};
/**
 * Convertit un montant en euros vers des centimes
 * avec arrondi sécurisé pour éviter les problèmes de virgule flottante
 */
function eurosToCents(euros) {
    if (typeof euros !== 'number' || isNaN(euros)) {
        throw new Error(`Montant invalide: ${euros}`);
    }
    // Arrondir d'abord à 2 décimales puis convertir
    const rounded = Math.round(euros * 100) / 100;
    return Math.round(rounded * 100);
}
/**
 * Convertit des centimes vers des euros
 */
function centsToEuros(cents) {
    if (typeof cents !== 'number' || isNaN(cents)) {
        throw new Error(`Montant en centimes invalide: ${cents}`);
    }
    return Math.round(cents) / 100;
}
/**
 * Formate un montant en euros pour l'affichage
 */
function formatEuros(euros) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(euros);
}
/**
 * Valide qu'un montant est dans les limites acceptables
 */
function validateAmount(euros, type) {
    // Vérifications de base
    if (typeof euros !== 'number' || isNaN(euros)) {
        return { valid: false, error: 'Montant invalide' };
    }
    if (euros < exports.PAYMENT_LIMITS.MIN_AMOUNT_EUROS) {
        return {
            valid: false,
            error: `Montant minimum ${exports.PAYMENT_LIMITS.MIN_AMOUNT_EUROS}€`
        };
    }
    if (euros > exports.PAYMENT_LIMITS.MAX_AMOUNT_EUROS) {
        return {
            valid: false,
            error: `Montant maximum ${exports.PAYMENT_LIMITS.MAX_AMOUNT_EUROS}€`
        };
    }
    // Vérifier la cohérence avec le type de service
    const expectedAmount = exports.PRICING_CONFIG[type].amount;
    const difference = Math.abs(euros - expectedAmount);
    if (difference > exports.PAYMENT_LIMITS.AMOUNT_TOLERANCE_EUROS) {
        return {
            valid: true,
            warning: `Montant inhabituel: ${euros}€ (attendu: ${expectedAmount}€)`
        };
    }
    return { valid: true };
}
/**
 * Calcule la répartition commission/prestataire
 */
function calculateSplit(totalEuros, type) {
    const config = exports.PRICING_CONFIG[type];
    const commissionRate = config.commission_rate;
    // Calcul en euros avec arrondi à 2 décimales
    const commissionEuros = Math.round(totalEuros * commissionRate * 100) / 100;
    const providerEuros = Math.round((totalEuros - commissionEuros) * 100) / 100;
    // Conversion en centimes
    const totalCents = eurosToCents(totalEuros);
    const commissionCents = eurosToCents(commissionEuros);
    const providerCents = eurosToCents(providerEuros);
    // Vérification de cohérence
    const sumCents = commissionCents + providerCents;
    const isValid = Math.abs(sumCents - totalCents) <= exports.PAYMENT_LIMITS.SPLIT_TOLERANCE_CENTS;
    if (!isValid) {
        console.error('⚠️ Incohérence dans la répartition:', {
            totalCents,
            commissionCents,
            providerCents,
            sumCents,
            difference: sumCents - totalCents
        });
    }
    return {
        totalCents,
        commissionCents,
        providerCents,
        totalEuros,
        commissionEuros,
        providerEuros,
        isValid
    };
}
/**
 * Vérifie la cohérence d'une répartition existante
 */
function validateSplit(totalEuros, commissionEuros, providerEuros) {
    const sum = Math.round((commissionEuros + providerEuros) * 100) / 100;
    const total = Math.round(totalEuros * 100) / 100;
    const difference = Math.abs(sum - total);
    if (difference > 0.01) { // Tolérance de 1 centime
        return {
            valid: false,
            error: `Répartition incohérente: ${formatEuros(sum)} != ${formatEuros(total)}`,
            difference
        };
    }
    return { valid: true };
}
/**
 * Vérifie la limite journalière d'un utilisateur
 */
async function checkDailyLimit(userId, amountEuros, db) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
        const paymentsSnapshot = await db.collection('payments')
            .where('clientId', '==', userId)
            .where('createdAt', '>=', todayTimestamp)
            .where('status', 'in', ['succeeded', 'captured', 'processing'])
            .get();
        let currentTotal = 0;
        paymentsSnapshot.docs.forEach(doc => {
            const payment = doc.data();
            // Utiliser amountInEuros si disponible, sinon convertir depuis centimes
            const amount = payment.amountInEuros || centsToEuros(payment.amount);
            currentTotal += amount;
        });
        const newTotal = currentTotal + amountEuros;
        const allowed = newTotal <= exports.PAYMENT_LIMITS.MAX_DAILY_EUROS;
        return {
            allowed,
            currentTotal,
            limit: exports.PAYMENT_LIMITS.MAX_DAILY_EUROS,
            error: allowed ? undefined : `Limite journalière dépassée: ${formatEuros(newTotal)} / ${formatEuros(exports.PAYMENT_LIMITS.MAX_DAILY_EUROS)}`
        };
    }
    catch (error) {
        console.error('Erreur vérification limite journalière:', error);
        // En cas d'erreur, on autorise par défaut (pour ne pas bloquer les paiements)
        return {
            allowed: true,
            currentTotal: 0,
            limit: exports.PAYMENT_LIMITS.MAX_DAILY_EUROS
        };
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
/**
 * Vérifie si un montant est suspect (anti-fraude basique)
 */
function isSuspiciousAmount(euros, type, previousPayments = []) {
    const reasons = [];
    // Montant très différent du prix standard
    const expected = exports.PRICING_CONFIG[type].amount;
    const deviation = Math.abs(euros - expected) / expected;
    if (deviation > 0.5) { // 50% de déviation
        reasons.push(`Déviation importante du prix standard (${deviation * 100}%)`);
    }
    // Montant avec trop de décimales (tentative de manipulation)
    const decimals = (euros.toString().split('.')[1] || '').length;
    if (decimals > 2) {
        reasons.push(`Trop de décimales: ${decimals}`);
    }
    // Pattern de montants répétitifs suspects
    if (previousPayments.length >= 3) {
        const lastThree = previousPayments.slice(-3);
        if (lastThree.every(p => p === euros)) {
            reasons.push('Montants identiques répétés');
        }
    }
    // Montants ronds suspects pour ce type de service
    if (euros % 10 === 0 && euros !== expected) {
        reasons.push('Montant rond inhabituel');
    }
    return {
        suspicious: reasons.length > 0,
        reasons
    };
}
/**
 * Log de transaction pour audit
 */
async function logPaymentAudit(data, db) {
    try {
        await db.collection('payment_audit').add(Object.assign(Object.assign({}, data), { amountCents: eurosToCents(data.amountEuros), timestamp: admin.firestore.FieldValue.serverTimestamp(), environment: process.env.NODE_ENV || 'development' }));
    }
    catch (error) {
        console.error('Erreur log audit:', error);
        // Ne pas bloquer le process si le log échoue
    }
}
//# sourceMappingURL=paymentValidators.js.map