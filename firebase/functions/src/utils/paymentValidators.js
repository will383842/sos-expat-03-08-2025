"use strict";
// firebase/functions/src/utils/paymentValidators.ts
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
var admin = require("firebase-admin");
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
function toCents(amount, currency) {
    if (currency === void 0) { currency = 'eur'; }
    if (typeof amount !== 'number' || isNaN(amount)) {
        throw new Error("Montant invalide: ".concat(amount));
    }
    // Arrondir d'abord à 2 décimales puis convertir
    var rounded = Math.round(amount * 100) / 100;
    return Math.round(rounded * 100);
}
/**
 * Convertit des centimes vers l'unité principale selon la devise
 */
function fromCents(cents, currency) {
    if (currency === void 0) { currency = 'eur'; }
    if (typeof cents !== 'number' || isNaN(cents)) {
        throw new Error("Montant en centimes invalide: ".concat(cents));
    }
    return Math.round(cents) / 100;
}
/**
 * Garde les anciennes fonctions pour compatibilité
 */
var eurosToCents = function (euros) { return toCents(euros, 'eur'); };
exports.eurosToCents = eurosToCents;
var centsToEuros = function (cents) { return fromCents(cents, 'eur'); };
exports.centsToEuros = centsToEuros;
/**
 * Formate un montant selon la devise
 */
function formatAmount(amount, currency) {
    if (currency === void 0) { currency = 'eur'; }
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
var formatEuros = function (euros) { return formatAmount(euros, 'eur'); };
exports.formatEuros = formatEuros;
/**
 * Récupère la configuration de pricing depuis Firestore (avec cache)
 */
var pricingCache = null;
var pricingCacheExpiry = 0;
var CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
function getPricingConfig(type_1) {
    return __awaiter(this, arguments, void 0, function (type, currency, db) {
        var now, cached, configDoc, adminPricing, adminConfig, error_1;
        var _a, _b, _c, _d;
        if (currency === void 0) { currency = 'eur'; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    now = Date.now();
                    if (pricingCache && now < pricingCacheExpiry) {
                        cached = (_a = pricingCache[type]) === null || _a === void 0 ? void 0 : _a[currency];
                        if (cached)
                            return [2 /*return*/, cached];
                    }
                    if (!db) return [3 /*break*/, 2];
                    return [4 /*yield*/, db.collection('admin_config').doc('pricing').get()];
                case 1:
                    configDoc = _e.sent();
                    if (configDoc.exists) {
                        adminPricing = configDoc.data();
                        // Mettre en cache
                        pricingCache = adminPricing;
                        pricingCacheExpiry = now + CACHE_DURATION;
                        adminConfig = (_b = adminPricing === null || adminPricing === void 0 ? void 0 : adminPricing[type]) === null || _b === void 0 ? void 0 : _b[currency];
                        if (adminConfig && typeof adminConfig.totalAmount === 'number') {
                            return [2 /*return*/, {
                                    totalAmount: adminConfig.totalAmount,
                                    connectionFeeAmount: adminConfig.connectionFeeAmount || 0,
                                    providerAmount: (_c = adminConfig.providerAmount) !== null && _c !== void 0 ? _c : (adminConfig.totalAmount - (adminConfig.connectionFeeAmount || 0)),
                                    duration: (_d = adminConfig.duration) !== null && _d !== void 0 ? _d : exports.DEFAULT_PRICING_CONFIG[type][currency].duration,
                                    currency: currency
                                }];
                        }
                    }
                    _e.label = 2;
                case 2:
                    // Fallback vers la config par défaut
                    console.log("\uD83D\uDCA1 Utilisation config par d\u00E9faut pour ".concat(type, "/").concat(currency));
                    return [2 /*return*/, exports.DEFAULT_PRICING_CONFIG[type][currency]];
                case 3:
                    error_1 = _e.sent();
                    console.error('Erreur récupération pricing config:', error_1);
                    // Fallback vers config par défaut en cas d'erreur
                    return [2 /*return*/, exports.DEFAULT_PRICING_CONFIG[type][currency]];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Valide qu'un montant est dans les limites acceptables selon la devise
 */
function validateAmount(amount, type, currency) {
    if (currency === void 0) { currency = 'eur'; }
    // Vérifications de base
    if (typeof amount !== 'number' || isNaN(amount)) {
        return { valid: false, error: 'Montant invalide' };
    }
    var limits = exports.PAYMENT_LIMITS[currency];
    var config = exports.DEFAULT_PRICING_CONFIG[type][currency];
    if (amount < limits.MIN_AMOUNT) {
        return {
            valid: false,
            error: "Montant minimum ".concat(limits.MIN_AMOUNT).concat(currency === 'eur' ? '€' : '$')
        };
    }
    if (amount > limits.MAX_AMOUNT) {
        return {
            valid: false,
            error: "Montant maximum ".concat(limits.MAX_AMOUNT).concat(currency === 'eur' ? '€' : '$')
        };
    }
    // Cohérence avec le prix total attendu
    var expectedAmount = config.totalAmount;
    var difference = Math.abs(amount - expectedAmount);
    if (difference > limits.TOLERANCE) {
        return {
            valid: true,
            warning: "Montant inhabituel: ".concat(formatAmount(amount, currency), " (attendu: ").concat(formatAmount(expectedAmount, currency), ")")
        };
    }
    return { valid: true };
}
/**
 * Calcule la répartition (frais de mise en relation / prestataire) selon la devise
 */
function calculateSplit(totalAmount, type, currency) {
    if (currency === void 0) { currency = 'eur'; }
    var config = exports.DEFAULT_PRICING_CONFIG[type][currency];
    // Montants en unité principale avec arrondi à 2 décimales
    var connectionFeeAmount = Math.round(config.connectionFeeAmount * 100) / 100;
    var providerAmount = Math.round((totalAmount - connectionFeeAmount) * 100) / 100;
    // Conversion en centimes
    var totalCents = toCents(totalAmount, currency);
    var connectionFeeCents = toCents(connectionFeeAmount, currency);
    var providerCents = toCents(providerAmount, currency);
    // Vérification de cohérence
    var sumCents = connectionFeeCents + providerCents;
    var isValid = Math.abs(sumCents - totalCents) <= exports.PAYMENT_LIMITS.SPLIT_TOLERANCE_CENTS;
    if (!isValid) {
        console.error('⚠️ Incohérence dans la répartition:', {
            totalCents: totalCents,
            connectionFeeCents: connectionFeeCents,
            providerCents: providerCents,
            sumCents: sumCents,
            difference: sumCents - totalCents,
            currency: currency
        });
    }
    return {
        totalCents: totalCents,
        connectionFeeCents: connectionFeeCents,
        providerCents: providerCents,
        totalAmount: totalAmount,
        connectionFeeAmount: connectionFeeAmount,
        providerAmount: providerAmount,
        currency: currency,
        isValid: isValid
    };
}
/**
 * Vérifie la cohérence d'une répartition existante selon la devise
 */
function validateSplit(totalAmount, connectionFeeAmount, providerAmount, currency) {
    if (currency === void 0) { currency = 'eur'; }
    var sum = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
    var total = Math.round(totalAmount * 100) / 100;
    var difference = Math.abs(sum - total);
    if (difference > 0.01) { // Tolérance de 1 centime
        return {
            valid: false,
            error: "R\u00E9partition incoh\u00E9rente: ".concat(formatAmount(sum, currency), " != ").concat(formatAmount(total, currency)),
            difference: difference
        };
    }
    return { valid: true };
}
/**
 * Vérifie la limite journalière d'un utilisateur selon la devise
 */
function checkDailyLimit(userId_1, amount_1) {
    return __awaiter(this, arguments, void 0, function (userId, amount, currency, db) {
        var today, todayTimestamp, paymentsSnapshot, currentTotal_1, limits, newTotal, allowed, error_2;
        if (currency === void 0) { currency = 'eur'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    todayTimestamp = admin.firestore.Timestamp.fromDate(today);
                    return [4 /*yield*/, db.collection('payments')
                            .where('clientId', '==', userId)
                            .where('createdAt', '>=', todayTimestamp)
                            .where('currency', '==', currency)
                            .where('status', 'in', ['succeeded', 'captured', 'processing'])
                            .get()];
                case 1:
                    paymentsSnapshot = _a.sent();
                    currentTotal_1 = 0;
                    paymentsSnapshot.docs.forEach(function (doc) {
                        var payment = doc.data();
                        // Utiliser le montant dans l'unité principale
                        var paymentAmount = payment.amount || fromCents(payment.amountCents || 0, currency);
                        currentTotal_1 += paymentAmount;
                    });
                    limits = exports.PAYMENT_LIMITS[currency];
                    newTotal = currentTotal_1 + amount;
                    allowed = newTotal <= limits.MAX_DAILY;
                    return [2 /*return*/, {
                            allowed: allowed,
                            currentTotal: currentTotal_1,
                            limit: limits.MAX_DAILY,
                            error: allowed ? undefined : "Limite journali\u00E8re d\u00E9pass\u00E9e: ".concat(formatAmount(newTotal, currency), " / ").concat(formatAmount(limits.MAX_DAILY, currency))
                        }];
                case 2:
                    error_2 = _a.sent();
                    console.error('Erreur vérification limite journalière:', error_2);
                    // En cas d'erreur, on autorise par défaut (pour ne pas bloquer les paiements)
                    return [2 /*return*/, {
                            allowed: true,
                            currentTotal: 0,
                            limit: exports.PAYMENT_LIMITS[currency].MAX_DAILY
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Vérifie si un montant est suspect selon la devise
 */
function isSuspiciousAmount(amount, type, currency, previousPayments) {
    if (currency === void 0) { currency = 'eur'; }
    if (previousPayments === void 0) { previousPayments = []; }
    var reasons = [];
    // Montant très différent du prix total standard pour cette devise
    var expected = exports.DEFAULT_PRICING_CONFIG[type][currency].totalAmount;
    var deviation = Math.abs(amount - expected) / expected;
    if (deviation > 0.5) { // 50% de déviation
        reasons.push("D\u00E9viation importante du prix standard (".concat(Math.round(deviation * 100), "%)"));
    }
    // Montant avec trop de décimales (tentative de manipulation)
    var decimals = (amount.toString().split('.')[1] || '').length;
    if (decimals > 2) {
        reasons.push("Trop de d\u00E9cimales: ".concat(decimals));
    }
    // Pattern de montants répétitifs suspects
    if (previousPayments.length >= 3) {
        var lastThree = previousPayments.slice(-3);
        if (lastThree.every(function (p) { return p === amount; })) {
            reasons.push('Montants identiques répétés');
        }
    }
    // Montants ronds suspects pour ce type de service
    if (amount % 10 === 0 && amount !== expected) {
        reasons.push('Montant rond inhabituel');
    }
    return {
        suspicious: reasons.length > 0,
        reasons: reasons
    };
}
/**
 * Log de transaction pour audit avec devise
 */
function logPaymentAudit(data, db) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db.collection('payment_audit').add(__assign(__assign({}, data), { amountCents: toCents(data.amount, data.currency), timestamp: admin.firestore.FieldValue.serverTimestamp(), environment: process.env.NODE_ENV || 'development' }))];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error('Erreur log audit:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Génère un identifiant de paiement unique
 */
function generatePaymentId() {
    var timestamp = Date.now();
    var random = Math.random().toString(36).substring(2, 9);
    return "pay_".concat(timestamp, "_").concat(random);
}
