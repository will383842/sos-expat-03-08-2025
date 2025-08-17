"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigCache = exports.convertCurrency = exports.validateAndCalculateAmounts = exports.getServiceAmounts = exports.getPricingConfig = void 0;
// firebase/functions/src/services/pricingService.ts
var firebase_1 = require("../config/firebase");
// Configuration par défaut (fallback backend)
var DEFAULT_PRICING_CONFIG = {
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
var getPricingConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
    var configDoc, data, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, firebase_1.firestore.doc('admin_config/pricing').get()];
            case 1:
                configDoc = _a.sent();
                if (configDoc.exists) {
                    data = configDoc.data();
                    if (isValidPricingConfig(data)) {
                        return [2 /*return*/, data];
                    }
                    else {
                        console.warn('Configuration pricing invalide, utilisation du fallback');
                        return [2 /*return*/, DEFAULT_PRICING_CONFIG];
                    }
                }
                else {
                    console.warn('Configuration pricing non trouvée, utilisation du fallback');
                    return [2 /*return*/, DEFAULT_PRICING_CONFIG];
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Erreur récupération pricing config:', error_1);
                return [2 /*return*/, DEFAULT_PRICING_CONFIG];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getPricingConfig = getPricingConfig;
/**
 * Récupère les montants pour un service et devise spécifiques
 */
var getServiceAmounts = function (serviceType_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([serviceType_1], args_1, true), void 0, function (serviceType, currency) {
        var config;
        if (currency === void 0) { currency = 'eur'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.getPricingConfig)()];
                case 1:
                    config = _a.sent();
                    return [2 /*return*/, config[serviceType][currency]];
            }
        });
    });
};
exports.getServiceAmounts = getServiceAmounts;
/**
 * Valide et calcule les montants pour une transaction
 */
var validateAndCalculateAmounts = function (serviceType_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([serviceType_1], args_1, true), void 0, function (serviceType, currency, clientAmount) {
        var errors, config, calculatedProviderAmount;
        if (currency === void 0) { currency = 'eur'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    errors = [];
                    return [4 /*yield*/, (0, exports.getServiceAmounts)(serviceType, currency)];
                case 1:
                    config = _a.sent();
                    // Validation du montant client si fourni
                    if (clientAmount !== undefined) {
                        if (Math.abs(clientAmount - config.totalAmount) > 0.01) {
                            errors.push("Montant incorrect: attendu ".concat(config.totalAmount, ", re\u00E7u ").concat(clientAmount));
                        }
                    }
                    calculatedProviderAmount = config.totalAmount - config.connectionFeeAmount;
                    if (Math.abs(calculatedProviderAmount - config.providerAmount) > 0.01) {
                        errors.push('Erreur de calcul des montants dans la configuration');
                    }
                    return [2 /*return*/, {
                            isValid: errors.length === 0,
                            config: config,
                            errors: errors
                        }];
            }
        });
    });
};
exports.validateAndCalculateAmounts = validateAndCalculateAmounts;
/**
 * Convertit les montants d'une devise à l'autre
 * Utilise un taux de change fixe ou une API externe
 */
var convertCurrency = function (amount, fromCurrency, toCurrency) { return __awaiter(void 0, void 0, void 0, function () {
    var EUR_TO_USD_RATE, USD_TO_EUR_RATE;
    return __generator(this, function (_a) {
        if (fromCurrency === toCurrency)
            return [2 /*return*/, amount];
        EUR_TO_USD_RATE = 1.1;
        USD_TO_EUR_RATE = 0.91;
        if (fromCurrency === 'eur' && toCurrency === 'usd') {
            return [2 /*return*/, Math.round(amount * EUR_TO_USD_RATE * 100) / 100];
        }
        else if (fromCurrency === 'usd' && toCurrency === 'eur') {
            return [2 /*return*/, Math.round(amount * USD_TO_EUR_RATE * 100) / 100];
        }
        return [2 /*return*/, amount];
    });
}); };
exports.convertCurrency = convertCurrency;
/**
 * Récupère la configuration avec cache
 */
var PricingConfigCache = /** @class */ (function () {
    function PricingConfigCache() {
        this.cache = null;
        this.lastFetch = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }
    PricingConfigCache.prototype.get = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        now = Date.now();
                        if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
                            return [2 /*return*/, this.cache];
                        }
                        _a = this;
                        return [4 /*yield*/, (0, exports.getPricingConfig)()];
                    case 1:
                        _a.cache = _b.sent();
                        this.lastFetch = now;
                        return [2 /*return*/, this.cache];
                }
            });
        });
    };
    PricingConfigCache.prototype.clear = function () {
        this.cache = null;
        this.lastFetch = 0;
    };
    return PricingConfigCache;
}());
exports.pricingConfigCache = new PricingConfigCache();
/**
 * Validation de la structure de configuration
 */
var isValidPricingConfig = function (config) {
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
    catch (_a) {
        return false;
    }
};
var isValidServiceConfig = function (config) {
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
