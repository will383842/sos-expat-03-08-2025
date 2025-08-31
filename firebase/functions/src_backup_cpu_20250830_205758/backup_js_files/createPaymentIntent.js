"use strict";
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
exports.createPaymentIntent = void 0;
// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU au début du fichier
var https_1 = require("firebase-functions/v2/https");
var StripeManager_1 = require("./StripeManager"); // 👈 plus d'import du type StripePaymentData pour garder un payload 100% connectionFee
var logError_1 = require("./utils/logs/logError");
var admin = require("firebase-admin");
var paymentValidators_1 = require("./utils/paymentValidators");
// =========================================
// 🔧 FIX CRITIQUE: OPTIMISATION CPU - Configuration légère dès le départ
// =========================================
var CPU_OPTIMIZED_CONFIG = {
    memory: '128MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 80,
    cors: [
        'http://localhost:3000',
        'http://localhost:5196',
        'http://localhost:8080',
        'https://sos-urgently-ac307.web.app',
        'https://sos-urgently-ac307.firebaseapp.com',
    ],
};
// =========================================
// 🌍 DÉTECTION D'ENVIRONNEMENT INTELLIGENTE (optimisée)
// =========================================
var isDevelopment = process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    !process.env.NODE_ENV; // Par défaut = dev
var isProduction = process.env.NODE_ENV === 'production';
// Variable de bypass d'urgence (à utiliser avec EXTRÊME précaution)
var BYPASS_MODE = process.env.BYPASS_SECURITY === 'true';
// Log de démarrage pour vérifier l'environnement
console.log("\uD83C\uDF0D Environment: ".concat(process.env.NODE_ENV || 'development', ", Production: ").concat(isProduction, ", Bypass: ").concat(BYPASS_MODE));
// Rate limiting store (en production, utiliser Redis)
var rateLimitStore = new Map();
// =========================================
// ⚙️ CONFIGURATION ADAPTÉE À L'ENVIRONNEMENT (optimisée)
// =========================================
var SECURITY_LIMITS = {
    RATE_LIMIT: {
        MAX_REQUESTS: isDevelopment ? 1000 : isProduction ? 25 : 100,
        WINDOW_MS: isDevelopment ? 2 * 60 * 1000 : isProduction ? 8 * 60 * 1000 : 5 * 60 * 1000,
        GLOBAL_MAX: isDevelopment ? 10000 : isProduction ? 1000 : 2000,
    },
    AMOUNT_LIMITS: {
        // Limites en unité principale (EUR ou USD selon la devise)
        MIN_EUR: 5,
        MAX_EUR: 500,
        MAX_DAILY_EUR: 2000,
        MIN_USD: 6,
        MAX_USD: 600,
        MAX_DAILY_USD: 2400,
    },
    VALIDATION: {
        MAX_METADATA_SIZE: isDevelopment ? 10000 : isProduction ? 3000 : 5000,
        MAX_DESCRIPTION_LENGTH: isDevelopment ? 5000 : isProduction ? 1500 : 2000,
        // Tolérance de cohérence (dans l'unité principale)
        AMOUNT_COHERENCE_TOLERANCE: isDevelopment ? 0.5 : isProduction ? 0.05 : 0.1,
        ALLOWED_CURRENCIES: ['eur', 'usd'],
        ALLOWED_SERVICE_TYPES: ['lawyer_call', 'expat_call'],
    },
    DUPLICATES: {
        WINDOW_MS: isDevelopment ? 30 * 1000 : isProduction ? 5 * 60 * 1000 : 2 * 60 * 1000,
    },
};
// =========================================
// 🛡️ FONCTIONS DE SÉCURITÉ ADAPTÉES (optimisées)
// =========================================
/**
 * Rate limiting avec configuration par environnement (optimisé CPU)
 */
function checkRateLimit(userId) {
    if (BYPASS_MODE) {
        logSecurityEvent('rate_limit_bypassed', { userId: userId });
        return { allowed: true };
    }
    var now = Date.now();
    var key = "payment_".concat(userId);
    var limit = rateLimitStore.get(key);
    // Nettoyage léger uniquement en développement
    if (isDevelopment && rateLimitStore.size > 100) {
        for (var _i = 0, _a = rateLimitStore.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], l = _b[1];
            if (now > l.resetTime) {
                rateLimitStore.delete(k);
            }
        }
    }
    if (limit && now > limit.resetTime) {
        rateLimitStore.delete(key);
    }
    var currentLimit = rateLimitStore.get(key) || {
        count: 0,
        resetTime: now + SECURITY_LIMITS.RATE_LIMIT.WINDOW_MS,
    };
    if (currentLimit.count >= SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS) {
        logSecurityEvent('rate_limit_exceeded', {
            userId: userId,
            count: currentLimit.count,
            limit: SECURITY_LIMITS.RATE_LIMIT.MAX_REQUESTS,
        });
        return { allowed: false, resetTime: currentLimit.resetTime };
    }
    currentLimit.count++;
    rateLimitStore.set(key, currentLimit);
    return { allowed: true };
}
/**
 * Validation business logic (par devise) — montants dans l'unité principale
 */
function validateBusinessLogic(data, currency, db) {
    return __awaiter(this, void 0, void 0, function () {
        var providerDoc, providerData, expectedTotal, tolerance, difference, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (BYPASS_MODE) {
                        logSecurityEvent('business_validation_bypassed', { providerId: data.providerId });
                        return [2 /*return*/, { valid: true }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, db.collection('users').doc(data.providerId).get()];
                case 2:
                    providerDoc = _a.sent();
                    providerData = providerDoc.data();
                    if (!providerData)
                        return [2 /*return*/, { valid: false, error: 'Prestataire non trouvé' }];
                    if (providerData.status === 'suspended' || providerData.status === 'banned') {
                        return [2 /*return*/, { valid: false, error: 'Prestataire non disponible' }];
                    }
                    if (isDevelopment) {
                        logSecurityEvent('business_validation_dev_mode', {
                            providerId: data.providerId,
                            amount: data.amount,
                            currency: currency,
                        });
                        return [2 /*return*/, { valid: true }];
                    }
                    expectedTotal = data.serviceType === 'lawyer_call'
                        ? currency === 'eur'
                            ? 49
                            : 55
                        : currency === 'eur'
                            ? 19
                            : 25;
                    tolerance = 15;
                    difference = Math.abs(Number(data.amount) - expectedTotal);
                    if (difference > tolerance) {
                        logSecurityEvent('business_amount_anomaly', {
                            expected: expectedTotal,
                            received: data.amount,
                            difference: difference,
                            tolerance: tolerance,
                            serviceType: data.serviceType,
                            currency: currency,
                        });
                        if (isProduction && difference > 100) {
                            return [2 /*return*/, { valid: false, error: 'Montant très éloigné du tarif standard' }];
                        }
                    }
                    return [2 /*return*/, { valid: true }];
                case 3:
                    error_1 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('validateBusinessLogic', error_1)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, { valid: false, error: 'Erreur lors de la validation business' }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Validation sécuritaire des montants — prend en compte la devise
 */
function validateAmountSecurity(amount, // unité principale (EUR ou USD)
currency, userId, db) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, MIN_EUR, MAX_EUR, MAX_DAILY_EUR, MIN_USD, MAX_USD, MAX_DAILY_USD, limits, daily, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logSecurityEvent('amount_validation_start', { amount: amount, currency: currency, userId: userId });
                    _a = SECURITY_LIMITS.AMOUNT_LIMITS, MIN_EUR = _a.MIN_EUR, MAX_EUR = _a.MAX_EUR, MAX_DAILY_EUR = _a.MAX_DAILY_EUR, MIN_USD = _a.MIN_USD, MAX_USD = _a.MAX_USD, MAX_DAILY_USD = _a.MAX_DAILY_USD;
                    limits = currency === 'eur'
                        ? { min: MIN_EUR, max: MAX_EUR, daily: MAX_DAILY_EUR }
                        : { min: MIN_USD, max: MAX_USD, daily: MAX_DAILY_USD };
                    if (amount < limits.min) {
                        return [2 /*return*/, {
                                valid: false,
                                error: "Montant minimum de ".concat(limits.min).concat(currency === 'eur' ? '€' : '$', " requis"),
                            }];
                    }
                    if (amount > limits.max) {
                        return [2 /*return*/, {
                                valid: false,
                                error: "Montant maximum de ".concat(limits.max).concat(currency === 'eur' ? '€' : '$', " d\u00E9pass\u00E9"),
                            }];
                    }
                    if (!!isDevelopment) return [3 /*break*/, 5];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, (0, paymentValidators_1.checkDailyLimit)(userId, amount, currency, db)];
                case 2:
                    daily = _b.sent();
                    if (!daily.allowed) {
                        return [2 /*return*/, { valid: false, error: daily.error }];
                    }
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _b.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('validateAmountSecurity:dailyLimit', error_2)];
                case 4:
                    _b.sent();
                    logSecurityEvent('daily_limit_check_error', { error: error_2 });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, { valid: true }];
            }
        });
    });
}
/**
 * Vérification des doublons (par devise) — montants dans l'unité principale
 */
function checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db) {
    return __awaiter(this, void 0, void 0, function () {
        var windowMs, existingPayments, hasDuplicate, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (BYPASS_MODE) {
                        logSecurityEvent('duplicate_check_bypassed', { clientId: clientId, providerId: providerId, amountInMainUnit: amountInMainUnit, currency: currency });
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 5]);
                    windowMs = SECURITY_LIMITS.DUPLICATES.WINDOW_MS;
                    return [4 /*yield*/, db
                            .collection('payments')
                            .where('clientId', '==', clientId)
                            .where('providerId', '==', providerId)
                            .where('currency', '==', currency)
                            .where('amountInMainUnit', '==', amountInMainUnit) // champ harmonisé (voir sanitize)
                            .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
                            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - windowMs)))
                            .limit(1)
                            .get()];
                case 2:
                    existingPayments = _a.sent();
                    hasDuplicate = !existingPayments.empty;
                    logSecurityEvent('duplicate_check', {
                        clientId: clientId,
                        providerId: providerId,
                        amountInMainUnit: amountInMainUnit,
                        currency: currency,
                        windowMs: windowMs,
                        hasDuplicate: hasDuplicate,
                    });
                    return [2 /*return*/, hasDuplicate];
                case 3:
                    error_3 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('checkDuplicatePayments', error_3)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Validation de cohérence: total = frais + prestataire (dans l'unité principale)
 */
function validateAmountCoherence(totalAmount, connectionFeeAmount, providerAmount) {
    var totalCalculated = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
    var amountRounded = Math.round(totalAmount * 100) / 100;
    var difference = Math.abs(totalCalculated - amountRounded);
    var tolerance = SECURITY_LIMITS.VALIDATION.AMOUNT_COHERENCE_TOLERANCE;
    if (difference > tolerance) {
        return {
            valid: false,
            error: "Incoh\u00E9rence montants: ".concat(difference.toFixed(2), " d'\u00E9cart (tol\u00E9rance: ").concat(tolerance.toFixed(2), ")"),
            difference: difference,
        };
    }
    return { valid: true, difference: difference };
}
/**
 * Sanitization ET conversion des données en fonction de la devise
 */
function sanitizeAndConvertInput(data) {
    var _a, _b, _c, _d;
    var maxNameLength = isDevelopment ? 500 : 200;
    var maxDescLength = SECURITY_LIMITS.VALIDATION.MAX_DESCRIPTION_LENGTH;
    var maxMetaKeyLength = isDevelopment ? 100 : 50;
    var maxMetaValueLength = isDevelopment ? 500 : 200;
    var currency = (data.currency || 'eur').toLowerCase().trim();
    var amountInMainUnit = Number(data.amount);
    var connectionFeeAmountInMainUnit = Number(data.connectionFeeAmount);
    var providerAmountInMainUnit = Number(data.providerAmount);
    var amountInCents = (0, paymentValidators_1.toCents)(amountInMainUnit, currency);
    var connectionFeeAmountInCents = (0, paymentValidators_1.toCents)(connectionFeeAmountInMainUnit, currency);
    var providerAmountInCents = (0, paymentValidators_1.toCents)(providerAmountInMainUnit, currency);
    return {
        amountInMainUnit: amountInMainUnit,
        amountInCents: amountInCents,
        connectionFeeAmountInMainUnit: connectionFeeAmountInMainUnit,
        connectionFeeAmountInCents: connectionFeeAmountInCents,
        providerAmountInMainUnit: providerAmountInMainUnit,
        providerAmountInCents: providerAmountInCents,
        currency: currency,
        serviceType: data.serviceType,
        providerId: data.providerId.trim(),
        clientId: data.clientId.trim(),
        clientEmail: (_a = data.clientEmail) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase(),
        providerName: (_b = data.providerName) === null || _b === void 0 ? void 0 : _b.trim().substring(0, maxNameLength),
        description: (_c = data.description) === null || _c === void 0 ? void 0 : _c.trim().substring(0, maxDescLength),
        callSessionId: (_d = data.callSessionId) === null || _d === void 0 ? void 0 : _d.trim(),
        metadata: data.metadata
            ? Object.fromEntries(Object.entries(data.metadata)
                .filter(function (_a) {
                var key = _a[0], value = _a[1];
                return key.length <= maxMetaKeyLength && value.length <= maxMetaValueLength;
            })
                .slice(0, isDevelopment ? 20 : 10))
            : {},
    };
}
/**
 * Logging adapté à l'environnement (optimisé)
 */
function logSecurityEvent(event, data) {
    var timestamp = new Date().toISOString();
    if (isDevelopment) {
        console.log("\uD83D\uDD27 [DEV-".concat(timestamp, "] ").concat(event, ":"), data);
    }
    else if (isProduction) {
        var sanitizedData = __assign(__assign({}, data), { userId: data.userId ? data.userId.substring(0, 8) + '...' : undefined, clientId: data.clientId ? data.clientId.substring(0, 8) + '...' : undefined, providerId: data.providerId ? data.providerId.substring(0, 8) + '...' : undefined });
        console.log("\uD83C\uDFED [PROD-".concat(timestamp, "] ").concat(event, ":"), sanitizedData);
    }
    else {
        console.log("\uD83E\uDDEA [TEST-".concat(timestamp, "] ").concat(event, ":"), data);
    }
}
// =========================================
// 🚀 CLOUD FUNCTION PRINCIPALE (OPTIMISÉE CPU) — sans “commission”
// =========================================
exports.createPaymentIntent = (0, https_1.onCall)(CPU_OPTIMIZED_CONFIG, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var requestId, startTime, userId, rateLimitResult, waitTime, sanitizedData, amountInMainUnit, amountInCents, connectionFeeAmountInMainUnit, connectionFeeAmountInCents, providerAmountInMainUnit, providerAmountInCents, currency, serviceType, providerId, clientId, clientEmail, providerName, description, callSessionId, metadata, coherence, db, sec, biz, hasDuplicate, stripePayload, result, response, error_4, processingTime, errorResponse;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                requestId = "req_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 7));
                startTime = Date.now();
                logSecurityEvent('payment_intent_start', {
                    requestId: requestId,
                    environment: process.env.NODE_ENV,
                    isDevelopment: isDevelopment,
                    isProduction: isProduction,
                    bypassMode: BYPASS_MODE,
                });
                _e.label = 1;
            case 1:
                _e.trys.push([1, 10, , 12]);
                // 1) AUTH
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un paiement.');
                }
                userId = request.auth.uid;
                // Debug entrée
                console.log('💳 === BACKEND - DONNÉES REÇUES (optimisé CPU) ===');
                console.log('📥 Données brutes reçues:', {
                    amount: request.data.amount,
                    connectionFeeAmount: request.data.connectionFeeAmount,
                    providerAmount: request.data.providerAmount,
                    serviceType: request.data.serviceType,
                    currency: request.data.currency || 'eur',
                });
                // 2) VALIDATION PRÉLIMINAIRE STRICTE
                if (typeof request.data.amount !== 'number' || isNaN(request.data.amount) || request.data.amount <= 0) {
                    throw new https_1.HttpsError('invalid-argument', "Montant invalide re\u00E7u: ".concat(request.data.amount, " (type: ").concat(typeof request.data.amount, ")"));
                }
                if (typeof request.data.connectionFeeAmount !== 'number' ||
                    isNaN(request.data.connectionFeeAmount) ||
                    request.data.connectionFeeAmount < 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Frais de mise en relation invalides');
                }
                if (typeof request.data.providerAmount !== 'number' ||
                    isNaN(request.data.providerAmount) ||
                    request.data.providerAmount < 0) {
                    throw new https_1.HttpsError('invalid-argument', 'Montant prestataire invalide');
                }
                rateLimitResult = checkRateLimit(userId);
                if (!rateLimitResult.allowed) {
                    waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
                    throw new https_1.HttpsError('resource-exhausted', "Trop de tentatives. R\u00E9essayez dans ".concat(waitTime, " minutes."));
                }
                sanitizedData = sanitizeAndConvertInput(request.data);
                console.log('💳 === APRÈS SANITIZATION (optimisé) ===');
                console.log('✅ Données sanitisées & converties:', {
                    totalInMainUnit: sanitizedData.amountInMainUnit,
                    totalInCents: sanitizedData.amountInCents,
                    connectionFeeInMainUnit: sanitizedData.connectionFeeAmountInMainUnit,
                    connectionFeeInCents: sanitizedData.connectionFeeAmountInCents,
                    providerInMainUnit: sanitizedData.providerAmountInMainUnit,
                    providerInCents: sanitizedData.providerAmountInCents,
                    currency: sanitizedData.currency,
                });
                amountInMainUnit = sanitizedData.amountInMainUnit, amountInCents = sanitizedData.amountInCents, connectionFeeAmountInMainUnit = sanitizedData.connectionFeeAmountInMainUnit, connectionFeeAmountInCents = sanitizedData.connectionFeeAmountInCents, providerAmountInMainUnit = sanitizedData.providerAmountInMainUnit, providerAmountInCents = sanitizedData.providerAmountInCents, currency = sanitizedData.currency, serviceType = sanitizedData.serviceType, providerId = sanitizedData.providerId, clientId = sanitizedData.clientId, clientEmail = sanitizedData.clientEmail, providerName = sanitizedData.providerName, description = sanitizedData.description, callSessionId = sanitizedData.callSessionId, metadata = sanitizedData.metadata;
                if (!serviceType || !SECURITY_LIMITS.VALIDATION.ALLOWED_SERVICE_TYPES.includes(serviceType)) {
                    throw new https_1.HttpsError('invalid-argument', 'Type de service invalide');
                }
                if (!providerId || typeof providerId !== 'string' || providerId.length < 5) {
                    throw new https_1.HttpsError('invalid-argument', 'ID prestataire invalide');
                }
                if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
                    throw new https_1.HttpsError('invalid-argument', 'ID client invalide');
                }
                // 6) VALIDATION DES ENUMS / TYPES
                if (!SECURITY_LIMITS.VALIDATION.ALLOWED_CURRENCIES.includes(currency)) {
                    throw new https_1.HttpsError('invalid-argument', "Devise non support\u00E9e: ".concat(currency));
                }
                coherence = validateAmountCoherence(amountInMainUnit, connectionFeeAmountInMainUnit, providerAmountInMainUnit);
                if (!coherence.valid) {
                    if (isProduction || coherence.difference > 1) {
                        throw new https_1.HttpsError('invalid-argument', coherence.error);
                    }
                    else {
                        logSecurityEvent('amount_coherence_warning_accepted', coherence);
                    }
                }
                db = admin.firestore();
                return [4 /*yield*/, validateAmountSecurity(amountInMainUnit, currency, userId, db)];
            case 2:
                sec = _e.sent();
                if (!sec.valid) {
                    throw new https_1.HttpsError('invalid-argument', sec.error);
                }
                return [4 /*yield*/, validateBusinessLogic(request.data, currency, db)];
            case 3:
                biz = _e.sent();
                if (!biz.valid) {
                    throw new https_1.HttpsError('failed-precondition', biz.error);
                }
                return [4 /*yield*/, checkDuplicatePayments(clientId, providerId, amountInMainUnit, currency, db)];
            case 4:
                hasDuplicate = _e.sent();
                if (hasDuplicate) {
                    throw new https_1.HttpsError('already-exists', 'Un paiement similaire est déjà en cours de traitement.');
                }
                // 11) CRÉATION PAIEMENT (Stripe) — payload 100% “frais de mise en relation”
                console.log('💳 === ENVOI VERS STRIPEMANAGER (optimisé) ===');
                stripePayload = {
                    amount: amountInCents, // centimes
                    currency: currency,
                    clientId: clientId,
                    providerId: providerId,
                    serviceType: serviceType,
                    providerType: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
                    connectionFeeAmount: connectionFeeAmountInCents, // centimes
                    providerAmount: providerAmountInCents, // centimes
                    callSessionId: callSessionId,
                    metadata: __assign({ clientEmail: clientEmail || '', providerName: providerName || '', description: description || "Service ".concat(serviceType), requestId: requestId, environment: process.env.NODE_ENV || 'development', 
                        // Trace côté audit (unités principales)
                        originalTotal: amountInMainUnit.toString(), originalConnectionFee: connectionFeeAmountInMainUnit.toString(), originalProviderAmount: providerAmountInMainUnit.toString(), originalCurrency: currency }, metadata),
                };
                return [4 /*yield*/, StripeManager_1.stripeManager.createPaymentIntent(stripePayload)];
            case 5:
                result = _e.sent();
                if (!!(result === null || result === void 0 ? void 0 : result.success)) return [3 /*break*/, 7];
                return [4 /*yield*/, (0, logError_1.logError)('createPaymentIntent:stripe_error', {
                        requestId: requestId,
                        userId: userId,
                        serviceType: serviceType,
                        amountInMainUnit: amountInMainUnit,
                        amountInCents: amountInCents,
                        error: result === null || result === void 0 ? void 0 : result.error,
                    })];
            case 6:
                _e.sent();
                throw new https_1.HttpsError('internal', 'Erreur lors de la création du paiement. Veuillez réessayer.');
            case 7:
                if (!isProduction) return [3 /*break*/, 9];
                return [4 /*yield*/, (0, paymentValidators_1.logPaymentAudit)({
                        paymentId: result.paymentIntentId,
                        userId: clientId,
                        amount: amountInMainUnit,
                        currency: currency,
                        type: serviceType === 'lawyer_call' ? 'lawyer' : 'expat',
                        action: 'create',
                        metadata: {
                            connectionFeeAmountInMainUnit: connectionFeeAmountInMainUnit,
                            providerAmountInMainUnit: providerAmountInMainUnit,
                            amountInCents: amountInCents,
                            connectionFeeAmountInCents: connectionFeeAmountInCents,
                            providerAmountInCents: providerAmountInCents,
                            requestId: requestId,
                        },
                    }, db)];
            case 8:
                _e.sent();
                _e.label = 9;
            case 9:
                console.log('✅ Paiement créé:', {
                    id: result.paymentIntentId,
                    total: (0, paymentValidators_1.formatAmount)(amountInMainUnit, currency),
                    connectionFee: (0, paymentValidators_1.formatAmount)(connectionFeeAmountInMainUnit, currency),
                    provider: (0, paymentValidators_1.formatAmount)(providerAmountInMainUnit, currency),
                });
                response = {
                    success: true,
                    clientSecret: result.clientSecret,
                    paymentIntentId: result.paymentIntentId,
                    amount: amountInCents,
                    currency: currency,
                    serviceType: serviceType,
                    status: 'requires_payment_method',
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                };
                return [2 /*return*/, response];
            case 10:
                error_4 = _e.sent();
                processingTime = Date.now() - startTime;
                return [4 /*yield*/, (0, logError_1.logError)('createPaymentIntent:error', {
                        requestId: requestId,
                        error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                        stack: error_4 instanceof Error ? error_4.stack : undefined,
                        processingTime: processingTime,
                        requestData: {
                            amount: (_a = request.data) === null || _a === void 0 ? void 0 : _a.amount,
                            serviceType: (_b = request.data) === null || _b === void 0 ? void 0 : _b.serviceType,
                            currency: ((_c = request.data) === null || _c === void 0 ? void 0 : _c.currency) || 'eur',
                            hasAuth: !!request.auth,
                        },
                        userAuth: ((_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid) || 'not-authenticated',
                        environment: process.env.NODE_ENV,
                    })];
            case 11:
                _e.sent();
                if (error_4 instanceof https_1.HttpsError)
                    throw error_4;
                errorResponse = {
                    success: false,
                    error: "Une erreur inattendue s'est produite. Veuillez réessayer.",
                    code: 'INTERNAL_ERROR',
                    timestamp: new Date().toISOString(),
                    requestId: requestId,
                };
                throw new https_1.HttpsError('internal', errorResponse.error, errorResponse);
            case 12: return [2 /*return*/];
        }
    });
}); });
