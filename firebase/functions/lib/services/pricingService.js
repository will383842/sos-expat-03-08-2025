"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigCache = exports.convertCurrency = exports.validateAndCalculateAmounts = exports.getServiceAmounts = exports.getPricingConfig = void 0;
// firebase/functions/src/services/pricingService.ts
const firebase_1 = require("../utils/firebase");
// Configuration par défaut (fallback backend)
const DEFAULT_PRICING_CONFIG = {
    lawyer: {
        eur: { totalAmount: 49, connectionFeeAmount: 19, providerAmount: 30, duration: 25, currency: 'eur' },
        usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 30, duration: 25, currency: 'usd' }
    },
    expat: {
        eur: { totalAmount: 19, connectionFeeAmount: 9, providerAmount: 10, duration: 35, currency: 'eur' },
        usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 10, duration: 35, currency: 'usd' }
    }
};
/**
 * Récupère la configuration pricing côté backend
 */
const getPricingConfig = async () => {
    try {
        const configDoc = await firebase_1.db.doc('admin_config/pricing').get();
        if (configDoc.exists) {
            const data = configDoc.data();
            if (isValidPricingConfig(data)) {
                return data;
            }
            else {
                console.warn('Configuration pricing invalide, utilisation du fallback');
                return DEFAULT_PRICING_CONFIG;
            }
        }
        else {
            console.warn('Configuration pricing non trouvée, utilisation du fallback');
            return DEFAULT_PRICING_CONFIG;
        }
    }
    catch (error) {
        console.error('Erreur récupération pricing config:', error);
        return DEFAULT_PRICING_CONFIG;
    }
};
exports.getPricingConfig = getPricingConfig;
/**
 * Récupère les montants pour un service et devise spécifiques
 */
const getServiceAmounts = async (serviceType, currency = 'eur') => {
    const config = await (0, exports.getPricingConfig)();
    return config[serviceType][currency];
};
exports.getServiceAmounts = getServiceAmounts;
/**
 * Valide et calcule les montants pour une transaction
 */
const validateAndCalculateAmounts = async (serviceType, currency = 'eur', clientAmount) => {
    const errors = [];
    const config = await (0, exports.getServiceAmounts)(serviceType, currency);
    // Validation du montant client si fourni
    if (clientAmount !== undefined) {
        if (Math.abs(clientAmount - config.totalAmount) > 0.01) {
            errors.push(`Montant incorrect: attendu ${config.totalAmount}, reçu ${clientAmount}`);
        }
    }
    // Validation de la cohérence des montants
    const calculatedProviderAmount = config.totalAmount - config.connectionFeeAmount;
    if (Math.abs(calculatedProviderAmount - config.providerAmount) > 0.01) {
        errors.push('Erreur de calcul des montants dans la configuration');
    }
    return {
        isValid: errors.length === 0,
        config,
        errors
    };
};
exports.validateAndCalculateAmounts = validateAndCalculateAmounts;
/**
 * Convertit les montants d'une devise à l'autre
 * Utilise un taux de change fixe ou une API externe
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency)
        return amount;
    // Taux de change fixe (à remplacer par une API externe si besoin)
    const EUR_TO_USD_RATE = 1.1;
    const USD_TO_EUR_RATE = 0.91;
    if (fromCurrency === 'eur' && toCurrency === 'usd') {
        return Math.round(amount * EUR_TO_USD_RATE * 100) / 100;
    }
    else if (fromCurrency === 'usd' && toCurrency === 'eur') {
        return Math.round(amount * USD_TO_EUR_RATE * 100) / 100;
    }
    return amount;
};
exports.convertCurrency = convertCurrency;
/**
 * Récupère la configuration avec cache
 */
class PricingConfigCache {
    constructor() {
        this.cache = null;
        this.lastFetch = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }
    async get() {
        const now = Date.now();
        if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
            return this.cache;
        }
        this.cache = await (0, exports.getPricingConfig)();
        this.lastFetch = now;
        return this.cache;
    }
    clear() {
        this.cache = null;
        this.lastFetch = 0;
    }
}
exports.pricingConfigCache = new PricingConfigCache();
/**
 * Validation de la structure de configuration
 */
const isValidPricingConfig = (config) => {
    try {
        return (config &&
            typeof config === 'object' &&
            config.lawyer &&
            config.expat &&
            isValidServiceConfig(config.lawyer.eur) &&
            isValidServiceConfig(config.lawyer.usd) &&
            isValidServiceConfig(config.expat.eur) &&
            isValidServiceConfig(config.expat.usd));
    }
    catch {
        return false;
    }
};
const isValidServiceConfig = (config) => {
    return (config &&
        typeof config === 'object' &&
        typeof config.totalAmount === 'number' &&
        typeof config.connectionFeeAmount === 'number' &&
        typeof config.providerAmount === 'number' &&
        typeof config.duration === 'number' &&
        typeof config.currency === 'string' &&
        config.totalAmount > 0 &&
        config.connectionFeeAmount >= 0 &&
        config.providerAmount >= 0 &&
        config.duration > 0 &&
        ['eur', 'usd'].includes(config.currency));
};
//# sourceMappingURL=pricingService.js.map