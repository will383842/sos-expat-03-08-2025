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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndScheduleCallHTTPS = void 0;
var https_1 = require("firebase-functions/v2/https");
var callScheduler_1 = require("./callScheduler");
var logError_1 = require("./utils/logs/logError");
/**
 * 🔧 Cloud Function CORRIGÉE - Convertie de onRequest vers onCall pour résoudre CORS
 * Crée et programme un appel entre client et prestataire
 */
exports.createAndScheduleCallHTTPS = (0, https_1.onCall)({
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true // Simplifie pour accepter tous les origins
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var requestId, userId, _a, providerId, clientId, providerPhone, clientPhone, serviceType, providerType, paymentIntentId, amount, _b, delayMinutes, clientLanguages, providerLanguages, allowedServiceTypes, allowedProviderTypes, expectedAmountEuros, tolerance, phoneRegex, validDelayMinutes, callSession, scheduledTime, response, error_1, errorDetails;
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return __generator(this, function (_r) {
        switch (_r.label) {
            case 0:
                requestId = "call_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(2, 7));
                _r.label = 1;
            case 1:
                _r.trys.push([1, 3, , 5]);
                // ========================================
                // 1. VALIDATION DE L'AUTHENTIFICATION
                // ========================================
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un appel.');
                }
                userId = request.auth.uid;
                _a = request.data, providerId = _a.providerId, clientId = _a.clientId, providerPhone = _a.providerPhone, clientPhone = _a.clientPhone, serviceType = _a.serviceType, providerType = _a.providerType, paymentIntentId = _a.paymentIntentId, amount = _a.amount, _b = _a.delayMinutes, delayMinutes = _b === void 0 ? 5 : _b, clientLanguages = _a.clientLanguages, providerLanguages = _a.providerLanguages;
                // 🔧 Debug des données reçues
                console.log('📞 === CREATE AND SCHEDULE CALL - DONNÉES REÇUES ===');
                console.log('💰 Montant reçu:', {
                    amount: amount,
                    type: typeof amount,
                    amountInEuros: amount,
                    serviceType: serviceType,
                    providerType: providerType,
                    requestId: requestId
                });
                // Vérification des champs obligatoires
                if (!providerId || !clientId || !providerPhone || !clientPhone ||
                    !serviceType || !providerType || !paymentIntentId || !amount) {
                    throw new https_1.HttpsError('invalid-argument', 'Données requises manquantes pour créer l\'appel.');
                }
                // ========================================
                // 3. VALIDATION DES PERMISSIONS
                // ========================================
                if (userId !== clientId) {
                    throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un appel que pour votre propre compte.');
                }
                allowedServiceTypes = ['lawyer_call', 'expat_call'];
                allowedProviderTypes = ['lawyer', 'expat'];
                if (!allowedServiceTypes.includes(serviceType)) {
                    throw new https_1.HttpsError('invalid-argument', "Type de service invalide. Types autoris\u00E9s: ".concat(allowedServiceTypes.join(', ')));
                }
                if (!allowedProviderTypes.includes(providerType)) {
                    throw new https_1.HttpsError('invalid-argument', "Type de prestataire invalide. Types autoris\u00E9s: ".concat(allowedProviderTypes.join(', ')));
                }
                // ========================================
                // 5. VALIDATION DES MONTANTS EN EUROS
                // ========================================
                if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
                    throw new https_1.HttpsError('invalid-argument', "Montant invalide: ".concat(amount, " (type: ").concat(typeof amount, ")"));
                }
                if (amount > 500) { // Max 500€
                    throw new https_1.HttpsError('invalid-argument', 'Montant maximum de 500€ dépassé.');
                }
                if (amount < 5) { // 5€ minimum
                    throw new https_1.HttpsError('invalid-argument', 'Montant minimum de 5€ requis.');
                }
                expectedAmountEuros = serviceType === 'lawyer_call' ? 49 : 19;
                tolerance = 5;
                if (Math.abs(amount - expectedAmountEuros) > tolerance) {
                    console.warn("\u26A0\uFE0F [".concat(requestId, "] Montant inhabituel: re\u00E7u ").concat(amount, "\u20AC, attendu ").concat(expectedAmountEuros, "\u20AC pour ").concat(serviceType));
                    // Ne pas bloquer mais logger pour audit
                }
                phoneRegex = /^\+[1-9]\d{8,14}$/;
                if (!phoneRegex.test(providerPhone)) {
                    throw new https_1.HttpsError('invalid-argument', 'Numéro de téléphone prestataire invalide. Format requis: +33XXXXXXXXX');
                }
                if (!phoneRegex.test(clientPhone)) {
                    throw new https_1.HttpsError('invalid-argument', 'Numéro de téléphone client invalide. Format requis: +33XXXXXXXXX');
                }
                if (providerPhone === clientPhone) {
                    throw new https_1.HttpsError('invalid-argument', 'Les numéros du prestataire et du client doivent être différents.');
                }
                validDelayMinutes = Math.min(Math.max(delayMinutes, 0), 10);
                // ========================================
                // 8. VALIDATION DU PAYMENT INTENT
                // ========================================
                if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
                    throw new https_1.HttpsError('invalid-argument', 'PaymentIntent ID invalide ou manquant.');
                }
                // ========================================
                // 9. CRÉATION ET PLANIFICATION DE L'APPEL
                // ========================================
                console.log("\uD83D\uDCDE [".concat(requestId, "] Cr\u00E9ation appel initi\u00E9e"));
                console.log("\uD83D\uDC65 [".concat(requestId, "] Client: ").concat(clientId.substring(0, 8), "... \u2192 Provider: ").concat(providerId.substring(0, 8), "..."));
                console.log("\uD83D\uDCB0 [".concat(requestId, "] Montant: ").concat(amount, "\u20AC pour service ").concat(serviceType));
                console.log("\u23F0 [".concat(requestId, "] D\u00E9lai programm\u00E9: ").concat(validDelayMinutes, " minutes"));
                console.log("\uD83D\uDCB3 [".concat(requestId, "] PaymentIntent: ").concat(paymentIntentId));
                return [4 /*yield*/, (0, callScheduler_1.createAndScheduleCall)({
                        providerId: providerId,
                        clientId: clientId,
                        providerPhone: providerPhone,
                        clientPhone: clientPhone,
                        serviceType: serviceType,
                        providerType: providerType,
                        paymentIntentId: paymentIntentId,
                        amount: amount, // EN EUROS (le callScheduler gère la conversion si nécessaire)
                        delayMinutes: validDelayMinutes,
                        requestId: requestId,
                        clientLanguages: clientLanguages || ['fr'],
                        providerLanguages: providerLanguages || ['fr']
                    })];
            case 2:
                callSession = _r.sent();
                console.log("\u2705 [".concat(requestId, "] Appel cr\u00E9\u00E9 avec succ\u00E8s - Session: ").concat(callSession.id));
                console.log("\uD83D\uDCC5 [".concat(requestId, "] Status: ").concat(callSession.status));
                scheduledTime = new Date(Date.now() + (validDelayMinutes * 60 * 1000));
                response = {
                    success: true,
                    sessionId: callSession.id,
                    status: callSession.status,
                    scheduledFor: scheduledTime.toISOString(),
                    scheduledForReadable: scheduledTime.toLocaleString('fr-FR', {
                        timeZone: 'Europe/Paris',
                        dateStyle: 'short',
                        timeStyle: 'short'
                    }),
                    message: "Appel programm\u00E9 dans ".concat(validDelayMinutes, " minutes"),
                    amount: amount, // Retourner en euros pour l'affichage frontend
                    serviceType: serviceType,
                    providerType: providerType,
                    requestId: requestId,
                    paymentIntentId: paymentIntentId,
                    delayMinutes: validDelayMinutes,
                    timestamp: new Date().toISOString()
                };
                console.log("\uD83C\uDF89 [".concat(requestId, "] R\u00E9ponse envoy\u00E9e:"), {
                    sessionId: response.sessionId,
                    status: response.status,
                    scheduledFor: response.scheduledFor,
                    amount: response.amount
                });
                return [2 /*return*/, response];
            case 3:
                error_1 = _r.sent();
                errorDetails = {
                    requestId: requestId,
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    errorType: error_1 instanceof Error ? error_1.constructor.name : 'UnknownError',
                    stack: error_1 instanceof Error ? error_1.stack : undefined,
                    requestData: {
                        providerId: ((_d = (_c = request.data) === null || _c === void 0 ? void 0 : _c.providerId) === null || _d === void 0 ? void 0 : _d.substring(0, 8)) + '...' || 'undefined',
                        clientId: ((_f = (_e = request.data) === null || _e === void 0 ? void 0 : _e.clientId) === null || _f === void 0 ? void 0 : _f.substring(0, 8)) + '...' || 'undefined',
                        serviceType: (_g = request.data) === null || _g === void 0 ? void 0 : _g.serviceType,
                        amount: (_h = request.data) === null || _h === void 0 ? void 0 : _h.amount,
                        amountType: typeof ((_j = request.data) === null || _j === void 0 ? void 0 : _j.amount),
                        paymentIntentId: (_k = request.data) === null || _k === void 0 ? void 0 : _k.paymentIntentId,
                        hasAuth: !!request.auth,
                        delayMinutes: (_l = request.data) === null || _l === void 0 ? void 0 : _l.delayMinutes
                    },
                    userAuth: ((_o = (_m = request.auth) === null || _m === void 0 ? void 0 : _m.uid) === null || _o === void 0 ? void 0 : _o.substring(0, 8)) + '...' || 'not-authenticated',
                    timestamp: new Date().toISOString()
                };
                // Log détaillé de l'erreur
                return [4 /*yield*/, (0, logError_1.logError)('createAndScheduleCall:error', errorDetails)];
            case 4:
                // Log détaillé de l'erreur
                _r.sent();
                console.error("\u274C [".concat(requestId, "] Erreur lors de la cr\u00E9ation d'appel:"), {
                    error: errorDetails.error,
                    errorType: errorDetails.errorType,
                    serviceType: (_p = request.data) === null || _p === void 0 ? void 0 : _p.serviceType,
                    amount: (_q = request.data) === null || _q === void 0 ? void 0 : _q.amount
                });
                // Si c'est déjà une HttpsError Firebase, la relancer telle quelle
                if (error_1 instanceof https_1.HttpsError) {
                    throw error_1;
                }
                // Pour les autres types d'erreurs, les wrapper dans HttpsError
                if (error_1 instanceof Error) {
                    // Erreurs spécifiques selon le message
                    if (error_1.message.includes('payment') || error_1.message.includes('PaymentIntent')) {
                        throw new https_1.HttpsError('failed-precondition', 'Erreur liée au paiement. Vérifiez que le paiement a été validé.');
                    }
                    if (error_1.message.includes('provider') || error_1.message.includes('client')) {
                        throw new https_1.HttpsError('not-found', 'Prestataire ou client introuvable. Vérifiez les identifiants.');
                    }
                    if (error_1.message.includes('schedule') || error_1.message.includes('call')) {
                        throw new https_1.HttpsError('internal', 'Erreur lors de la programmation de l\'appel. Service temporairement indisponible.');
                    }
                }
                // Erreur générique pour tout le reste
                throw new https_1.HttpsError('internal', 'Erreur interne lors de la création de l\'appel. Veuillez réessayer dans quelques instants.');
            case 5: return [2 /*return*/];
        }
    });
}); });
