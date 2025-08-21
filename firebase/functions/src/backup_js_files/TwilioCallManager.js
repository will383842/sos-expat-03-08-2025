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
exports.twilioCallManager = exports.TwilioCallManager = void 0;
var admin = require("firebase-admin");
// 🔧 CHANGEMENT : Import conditionnel de Twilio
var twilio_1 = require("./lib/twilio");
var logError_1 = require("./utils/logs/logError");
var logCallRecord_1 = require("./utils/logs/logCallRecord");
var MessageManager_1 = require("./MessageManager");
var StripeManager_1 = require("./StripeManager");
// Configuration sécurisée pour la production
var CALL_CONFIG = {
    MAX_RETRIES: 3,
    CALL_TIMEOUT: 30,
    CONNECTION_WAIT_TIME: 45000, // 45 secondes
    MIN_CALL_DURATION: 120, // 2 minutes pour considérer comme succès
    MAX_CONCURRENT_CALLS: 50,
    WEBHOOK_VALIDATION: true,
};
var TwilioCallManager = /** @class */ (function () {
    function TwilioCallManager() {
        this.activeCalls = new Map();
        this.callQueue = [];
        this.isProcessingQueue = false;
        this.db = admin.firestore();
        this.startQueueProcessor();
    }
    /**
     * Démarrer le processeur de queue pour gérer les appels en file d'attente
     */
    TwilioCallManager.prototype.startQueueProcessor = function () {
        var _this = this;
        setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var sessionId, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(!this.isProcessingQueue && this.callQueue.length > 0)) return [3 /*break*/, 7];
                        this.isProcessingQueue = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 6, 7]);
                        sessionId = this.callQueue.shift();
                        if (!sessionId) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.processQueuedCall(sessionId)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [3 /*break*/, 7];
                    case 4:
                        error_1 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:queueProcessor', error_1)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        this.isProcessingQueue = false;
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        }); }, 2000); // Vérifier toutes les 2 secondes
    };
    /**
     * Traiter un appel en file d'attente
     */
    TwilioCallManager.prototype.processQueuedCall = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 6]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        session = _a.sent();
                        if (!(session && session.status === 'pending')) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.initiateCallSequence(sessionId, 0)];
                    case 2:
                        _a.sent(); // Démarrer immédiatement
                        _a.label = 3;
                    case 3: return [3 /*break*/, 6];
                    case 4:
                        error_2 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:processQueuedCall', error_2)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Valide et formate un numéro de téléphone avec support international étendu
     */
    TwilioCallManager.prototype.validatePhoneNumber = function (phone) {
        if (!phone || typeof phone !== 'string') {
            throw new Error('Numéro de téléphone requis');
        }
        // Nettoyer le numéro (garder seulement chiffres et +)
        var cleaned = phone.trim().replace(/[^\d+]/g, '');
        // Vérifier le format international
        if (!cleaned.startsWith('+')) {
            throw new Error("Num\u00E9ro de t\u00E9l\u00E9phone invalide: ".concat(phone, ". Format requis: +33XXXXXXXXX"));
        }
        // Vérifier la longueur (support international étendu)
        var digits = cleaned.substring(1);
        if (digits.length < 8 || digits.length > 15) {
            throw new Error("Num\u00E9ro de t\u00E9l\u00E9phone invalide: ".concat(phone, ". Longueur incorrecte (8-15 chiffres apr\u00E8s +)"));
        }
        // Validation renforcée des codes pays
        var validCountryCodes = [
            '1', '33', '44', '49', '34', '39', '32', '41', '31', '351', '352',
            '212', '213', '216', '225', '221', '223', '224', '226', '227', '228',
            '229', '230', '231', '232', '233', '234', '235', '236', '237', '238'
        ];
        var hasValidCountryCode = validCountryCodes.some(function (code) { return digits.startsWith(code); });
        if (!hasValidCountryCode) {
            console.warn("Code pays potentiellement non support\u00E9 pour: ".concat(phone));
        }
        return cleaned;
    };
    /**
     * Crée une nouvelle session d'appel avec validation renforcée
     */
    TwilioCallManager.prototype.createCallSession = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var validProviderPhone, validClientPhone, activeSessions, maxDuration, conferenceName, callSession_1, existingSession, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 7]);
                        // Validation des paramètres obligatoires
                        if (!params.sessionId || !params.providerId || !params.clientId) {
                            throw new Error('Paramètres requis manquants: sessionId, providerId, clientId');
                        }
                        if (!params.paymentIntentId || !params.amount || params.amount <= 0) {
                            throw new Error('Informations de paiement invalides');
                        }
                        validProviderPhone = this.validatePhoneNumber(params.providerPhone);
                        validClientPhone = this.validatePhoneNumber(params.clientPhone);
                        // Vérifier que les numéros sont différents
                        if (validProviderPhone === validClientPhone) {
                            throw new Error('Les numéros du prestataire et du client doivent être différents');
                        }
                        return [4 /*yield*/, this.getActiveSessionsCount()];
                    case 1:
                        activeSessions = _a.sent();
                        if (activeSessions >= CALL_CONFIG.MAX_CONCURRENT_CALLS) {
                            throw new Error('Limite d\'appels simultanés atteinte. Veuillez réessayer dans quelques minutes.');
                        }
                        maxDuration = params.providerType === 'lawyer' ? 1500 : 2100;
                        conferenceName = "conf_".concat(params.sessionId, "_").concat(Date.now());
                        callSession_1 = {
                            id: params.sessionId,
                            status: 'pending',
                            participants: {
                                provider: {
                                    phone: validProviderPhone,
                                    status: 'pending',
                                    attemptCount: 0
                                },
                                client: {
                                    phone: validClientPhone,
                                    status: 'pending',
                                    attemptCount: 0
                                }
                            },
                            conference: {
                                name: conferenceName
                            },
                            payment: {
                                intentId: params.paymentIntentId,
                                status: 'authorized',
                                amount: params.amount
                            },
                            metadata: {
                                providerId: params.providerId,
                                clientId: params.clientId,
                                serviceType: params.serviceType,
                                providerType: params.providerType,
                                maxDuration: maxDuration,
                                createdAt: admin.firestore.Timestamp.now(),
                                updatedAt: admin.firestore.Timestamp.now(),
                                requestId: params.requestId,
                                clientLanguages: params.clientLanguages || ['fr'],
                                providerLanguages: params.providerLanguages || ['fr']
                            }
                        };
                        return [4 /*yield*/, this.getCallSession(params.sessionId)];
                    case 2:
                        existingSession = _a.sent();
                        if (existingSession) {
                            throw new Error("Session d'appel existe d\u00E9j\u00E0: ".concat(params.sessionId));
                        }
                        // Sauvegarder avec retry automatique
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                return _this.db.collection('call_sessions').doc(params.sessionId).set(callSession_1);
                            })];
                    case 3:
                        // Sauvegarder avec retry automatique
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: params.sessionId,
                                status: 'session_created',
                                retryCount: 0,
                                additionalData: {
                                    serviceType: params.serviceType,
                                    amount: params.amount,
                                    requestId: params.requestId
                                }
                            })];
                    case 4:
                        _a.sent();
                        console.log("\u2705 Session d'appel cr\u00E9\u00E9e: ".concat(params.sessionId));
                        return [2 /*return*/, callSession_1];
                    case 5:
                        error_3 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:createCallSession', error_3)];
                    case 6:
                        _a.sent();
                        throw error_3;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Lance la séquence d'appel avec gestion robuste des erreurs et queue
     */
    TwilioCallManager.prototype.initiateCallSequence = function (sessionId_1) {
        return __awaiter(this, arguments, void 0, function (sessionId, delayMinutes) {
            var timeout, error_4;
            var _this = this;
            if (delayMinutes === void 0) { delayMinutes = 5; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 5]);
                        console.log("\uD83D\uDE80 Initialisation s\u00E9quence d'appel pour ".concat(sessionId, " dans ").concat(delayMinutes, " minutes"));
                        // Si délai, programmer l'exécution
                        if (delayMinutes > 0) {
                            timeout = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.activeCalls.delete(sessionId);
                                            return [4 /*yield*/, this.executeCallSequence(sessionId)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, Math.min(delayMinutes, 10) * 60 * 1000);
                            this.activeCalls.set(sessionId, timeout);
                            return [2 /*return*/];
                        }
                        // Exécution immédiate
                        return [4 /*yield*/, this.executeCallSequence(sessionId)];
                    case 1:
                        // Exécution immédiate
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 2:
                        error_4 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:initiateCallSequence', error_4)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.handleCallFailure(sessionId, 'system_error')];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Exécute la séquence d'appel réelle
     */
    TwilioCallManager.prototype.executeCallSequence = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var callSession, paymentValid, providerConnected, clientConnected;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        callSession = _a.sent();
                        if (!callSession) {
                            throw new Error("Session d'appel non trouv\u00E9e: ".concat(sessionId));
                        }
                        // Vérifier que la session est toujours valide
                        if (callSession.status === 'cancelled' || callSession.status === 'failed') {
                            console.log("Session ".concat(sessionId, " d\u00E9j\u00E0 ").concat(callSession.status, ", arr\u00EAt de la s\u00E9quence"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.validatePaymentStatus(callSession.payment.intentId)];
                    case 2:
                        paymentValid = _a.sent();
                        if (!!paymentValid) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.handleCallFailure(sessionId, 'payment_invalid')];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                    case 4: return [4 /*yield*/, this.updateCallSessionStatus(sessionId, 'provider_connecting')];
                    case 5:
                        _a.sent();
                        // Étape 1: Appeler le prestataire (3 tentatives max)
                        console.log("\uD83D\uDCDE \u00C9tape 1: Appel du prestataire pour ".concat(sessionId));
                        return [4 /*yield*/, this.callParticipantWithRetries(sessionId, 'provider', callSession.participants.provider.phone, callSession.conference.name, callSession.metadata.maxDuration)];
                    case 6:
                        providerConnected = _a.sent();
                        if (!!providerConnected) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.handleCallFailure(sessionId, 'provider_no_answer')];
                    case 7:
                        _a.sent();
                        return [2 /*return*/];
                    case 8: return [4 /*yield*/, this.updateCallSessionStatus(sessionId, 'client_connecting')];
                    case 9:
                        _a.sent();
                        // Étape 2: Appeler le client (3 tentatives max)
                        console.log("\uD83D\uDCDE \u00C9tape 2: Appel du client pour ".concat(sessionId));
                        return [4 /*yield*/, this.callParticipantWithRetries(sessionId, 'client', callSession.participants.client.phone, callSession.conference.name, callSession.metadata.maxDuration)];
                    case 10:
                        clientConnected = _a.sent();
                        if (!!clientConnected) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.handleCallFailure(sessionId, 'client_no_answer')];
                    case 11:
                        _a.sent();
                        return [2 /*return*/];
                    case 12: return [4 /*yield*/, this.updateCallSessionStatus(sessionId, 'both_connecting')];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: 'both_participants_called',
                                retryCount: 0
                            })];
                    case 14:
                        _a.sent();
                        console.log("\u2705 S\u00E9quence d'appel compl\u00E9t\u00E9e pour ".concat(sessionId));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Valide le statut du paiement avant de commencer l'appel
     */
    TwilioCallManager.prototype.validatePaymentStatus = function (paymentIntentId) {
        return __awaiter(this, void 0, void 0, function () {
            var payment, validStatuses, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, StripeManager_1.stripeManager.getPayment(paymentIntentId)];
                    case 1:
                        payment = _a.sent();
                        if (!payment || !payment.stripe) {
                            return [2 /*return*/, false];
                        }
                        validStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'succeeded'];
                        return [2 /*return*/, validStatuses.includes(payment.stripe.status)];
                    case 2:
                        error_5 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:validatePaymentStatus', error_5)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Appelle un participant avec gestion robuste des tentatives
     */
    TwilioCallManager.prototype.callParticipantWithRetries = function (sessionId_1, participantType_1, phoneNumber_1, conferenceName_1, timeLimit_1) {
        return __awaiter(this, arguments, void 0, function (sessionId, participantType, phoneNumber, conferenceName, timeLimit, maxRetries) {
            var attempt, call, connected, error_6;
            if (maxRetries === void 0) { maxRetries = CALL_CONFIG.MAX_RETRIES; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        attempt = 1;
                        _a.label = 1;
                    case 1:
                        if (!(attempt <= maxRetries)) return [3 /*break*/, 16];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 12, , 15]);
                        console.log("\uD83D\uDCDE Tentative ".concat(attempt, "/").concat(maxRetries, " pour ").concat(participantType, " - ").concat(sessionId));
                        // Incrémenter le compteur de tentatives
                        return [4 /*yield*/, this.incrementAttemptCount(sessionId, participantType)];
                    case 3:
                        // Incrémenter le compteur de tentatives
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: "".concat(participantType, "_attempt_").concat(attempt),
                                retryCount: attempt
                            })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, twilio_1.twilioClient.calls.create({
                                to: phoneNumber,
                                from: twilio_1.twilioPhoneNumber,
                                twiml: this.generateConferenceTwiML(conferenceName, participantType, timeLimit, sessionId),
                                statusCallback: "".concat(process.env.FUNCTION_URL, "/twilioConferenceWebhook"),
                                statusCallbackMethod: 'POST',
                                statusCallbackEvent: ['ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
                                timeout: CALL_CONFIG.CALL_TIMEOUT,
                                record: true,
                                recordingStatusCallback: "".concat(process.env.FUNCTION_URL, "/twilioRecordingWebhook"),
                                recordingStatusCallbackMethod: 'POST',
                                machineDetection: 'Enable', // Détection répondeur
                                machineDetectionTimeout: 10
                            })];
                    case 5:
                        call = _a.sent();
                        console.log("\uD83D\uDCDE Appel cr\u00E9\u00E9: ".concat(call.sid, " pour ").concat(participantType));
                        // Mettre à jour avec le CallSid
                        return [4 /*yield*/, this.updateParticipantCallSid(sessionId, participantType, call.sid)];
                    case 6:
                        // Mettre à jour avec le CallSid
                        _a.sent();
                        return [4 /*yield*/, this.waitForConnection(sessionId, participantType, attempt)];
                    case 7:
                        connected = _a.sent();
                        if (!connected) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: "".concat(participantType, "_connected_attempt_").concat(attempt),
                                retryCount: attempt
                            })];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 9:
                        if (!(attempt < maxRetries)) return [3 /*break*/, 11];
                        console.log("\u23F3 Attente avant nouvelle tentative pour ".concat(participantType, " - ").concat(sessionId));
                        return [4 /*yield*/, this.delay(15000 + (attempt * 5000))];
                    case 10:
                        _a.sent(); // Délai progressif
                        _a.label = 11;
                    case 11: return [3 /*break*/, 15];
                    case 12:
                        error_6 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)("TwilioCallManager:callParticipant:".concat(participantType, ":attempt_").concat(attempt), error_6)];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: "".concat(participantType, "_error_attempt_").concat(attempt),
                                retryCount: attempt,
                                errorMessage: error_6 instanceof Error ? error_6.message : 'Unknown error'
                            })];
                    case 14:
                        _a.sent();
                        // Si c'est la dernière tentative, ne pas attendre
                        if (attempt === maxRetries) {
                            return [3 /*break*/, 16];
                        }
                        return [3 /*break*/, 15];
                    case 15:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 16: return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: "".concat(participantType, "_failed_all_attempts"),
                            retryCount: maxRetries
                        })];
                    case 17:
                        _a.sent();
                        return [2 /*return*/, false];
                }
            });
        });
    };
    /**
     * Incrémenter le compteur de tentatives pour un participant
     */
    TwilioCallManager.prototype.incrementAttemptCount = function (sessionId, participantType) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.db.collection('call_sessions').doc(sessionId).update((_a = {},
                                _a["participants.".concat(participantType, ".attemptCount")] = admin.firestore.FieldValue.increment(1),
                                _a['metadata.updatedAt'] = admin.firestore.Timestamp.now(),
                                _a))];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_7 = _b.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:incrementAttemptCount', error_7)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Attend la connexion d'un participant avec timeout optimisé
     */
    TwilioCallManager.prototype.waitForConnection = function (sessionId, participantType, attempt) {
        return __awaiter(this, void 0, void 0, function () {
            var maxWaitTime, checkInterval, maxChecks, check, session, participant, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        maxWaitTime = CALL_CONFIG.CONNECTION_WAIT_TIME;
                        checkInterval = 3000;
                        maxChecks = Math.floor(maxWaitTime / checkInterval);
                        check = 0;
                        _a.label = 1;
                    case 1:
                        if (!(check < maxChecks)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.delay(checkInterval)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 4:
                        session = _a.sent();
                        if (!session) {
                            console.log("\u274C Session non trouv\u00E9e pendant l'attente: ".concat(sessionId));
                            return [2 /*return*/, false];
                        }
                        participant = session.participants[participantType];
                        if (participant.status === 'connected') {
                            console.log("\u2705 ".concat(participantType, " connect\u00E9 apr\u00E8s ").concat((check + 1) * checkInterval / 1000, "s"));
                            return [2 /*return*/, true];
                        }
                        if (participant.status === 'disconnected' || participant.status === 'no_answer') {
                            console.log("\u274C ".concat(participantType, " ").concat(participant.status, " apr\u00E8s ").concat((check + 1) * checkInterval / 1000, "s"));
                            return [2 /*return*/, false];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_8 = _a.sent();
                        console.warn("Erreur lors de la v\u00E9rification de connexion: ".concat(error_8));
                        return [3 /*break*/, 6];
                    case 6:
                        check++;
                        return [3 /*break*/, 1];
                    case 7:
                        console.log("\u23F1\uFE0F Timeout atteint pour ".concat(participantType, " tentative ").concat(attempt));
                        return [2 /*return*/, false];
                }
            });
        });
    };
    /**
     * Génère le TwiML optimisé pour la conférence
     */
    TwilioCallManager.prototype.generateConferenceTwiML = function (conferenceName, participantType, timeLimit, sessionId) {
        var welcomeMessage = participantType === 'provider'
            ? "Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter."
            : "Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.";
        var participantLabel = participantType === 'provider' ? 'provider' : 'client';
        return "\n      <Response>\n        <Say voice=\"alice\" language=\"fr-FR\">".concat(welcomeMessage, "</Say>\n        <Dial timeout=\"30\" timeLimit=\"").concat(timeLimit, "\">\n          <Conference \n            statusCallback=\"").concat(process.env.FUNCTION_URL, "/twilioConferenceWebhook\"\n            statusCallbackMethod=\"POST\"\n            statusCallbackEvent=\"start end join leave mute hold\"\n            record=\"record-from-start\"\n            recordingStatusCallback=\"").concat(process.env.FUNCTION_URL, "/twilioRecordingWebhook\"\n            recordingStatusCallbackMethod=\"POST\"\n            participantLabel=\"").concat(participantLabel, "\"\n            sessionId=\"").concat(sessionId, "\"\n            waitUrl=\"http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient\"\n            maxParticipants=\"2\"\n            endConferenceOnExit=\"").concat(participantType === 'provider', "\"\n            beep=\"false\"\n            startConferenceOnEnter=\"").concat(participantType === 'provider', "\"\n            trim=\"trim-silence\"\n            recordingChannels=\"dual\"\n          >\n            ").concat(conferenceName, "\n          </Conference>\n        </Dial>\n      </Response>\n    ").trim();
    };
    /**
     * Gère les déconnexions précoces avec logique différenciée
     */
    TwilioCallManager.prototype.handleEarlyDisconnection = function (sessionId, participantType, duration) {
        return __awaiter(this, void 0, void 0, function () {
            var session, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 9]);
                        console.log("\u26A0\uFE0F D\u00E9connexion pr\u00E9coce d\u00E9tect\u00E9e: ".concat(sessionId, ", participant: ").concat(participantType, ", dur\u00E9e: ").concat(duration, "s"));
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        session = _a.sent();
                        if (!session) {
                            console.warn("Session non trouv\u00E9e pour d\u00E9connexion pr\u00E9coce: ".concat(sessionId));
                            return [2 /*return*/];
                        }
                        if (!(duration < CALL_CONFIG.MIN_CALL_DURATION)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.handleCallFailure(sessionId, "early_disconnect_".concat(participantType))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: "early_disconnect_".concat(participantType),
                                retryCount: 0,
                                additionalData: {
                                    participantType: participantType,
                                    duration: duration,
                                    reason: 'Disconnection before minimum duration'
                                }
                            })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4: 
                    // Durée suffisante, traiter comme completion normale
                    return [4 /*yield*/, this.handleCallCompletion(sessionId, duration)];
                    case 5:
                        // Durée suffisante, traiter comme completion normale
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        console.log("\u2705 D\u00E9connexion pr\u00E9coce trait\u00E9e pour ".concat(sessionId));
                        return [3 /*break*/, 9];
                    case 7:
                        error_9 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:handleEarlyDisconnection', error_9)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gère les échecs d'appel avec notifications intelligentes
     */
    TwilioCallManager.prototype.handleCallFailure = function (sessionId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var callSession, clientLanguage, providerLanguage, notificationPromises, notificationError_1, error_10;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 10, , 12]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        callSession = _c.sent();
                        if (!callSession) {
                            console.warn("Session non trouv\u00E9e pour handleCallFailure: ".concat(sessionId));
                            return [2 /*return*/];
                        }
                        // Mettre à jour le statut
                        return [4 /*yield*/, this.updateCallSessionStatus(sessionId, 'failed')];
                    case 2:
                        // Mettre à jour le statut
                        _c.sent();
                        clientLanguage = ((_a = callSession.metadata.clientLanguages) === null || _a === void 0 ? void 0 : _a[0]) || 'fr';
                        providerLanguage = ((_b = callSession.metadata.providerLanguages) === null || _b === void 0 ? void 0 : _b[0]) || 'fr';
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 7]);
                        notificationPromises = [];
                        if (reason === 'provider_no_answer' || reason === 'system_error') {
                            notificationPromises.push(MessageManager_1.messageManager.sendSmartMessage({
                                to: callSession.participants.client.phone,
                                templateId: "call_failure_".concat(reason, "_client"),
                                variables: {
                                    providerName: 'votre expert',
                                    serviceType: callSession.metadata.serviceType,
                                    language: clientLanguage
                                }
                            }));
                        }
                        if (reason === 'client_no_answer' || reason === 'system_error') {
                            notificationPromises.push(MessageManager_1.messageManager.sendSmartMessage({
                                to: callSession.participants.provider.phone,
                                templateId: "call_failure_".concat(reason, "_provider"),
                                variables: {
                                    clientName: 'le client',
                                    serviceType: callSession.metadata.serviceType,
                                    language: providerLanguage
                                }
                            }));
                        }
                        return [4 /*yield*/, Promise.allSettled(notificationPromises)];
                    case 4:
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        notificationError_1 = _c.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:handleCallFailure:notification', notificationError_1)];
                    case 6:
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 7: 
                    // Rembourser automatiquement le paiement
                    return [4 /*yield*/, this.processRefund(sessionId, reason)];
                    case 8:
                        // Rembourser automatiquement le paiement
                        _c.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: "call_failed_".concat(reason),
                                retryCount: 0,
                                additionalData: {
                                    reason: reason,
                                    paymentIntentId: callSession.payment.intentId
                                }
                            })];
                    case 9:
                        _c.sent();
                        console.log("\u274C Appel \u00E9chou\u00E9: ".concat(sessionId, ", raison: ").concat(reason));
                        return [3 /*break*/, 12];
                    case 10:
                        error_10 = _c.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:handleCallFailure', error_10)];
                    case 11:
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Traite le remboursement avec intégration Stripe
     */
    TwilioCallManager.prototype.processRefund = function (sessionId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var callSession, refundResult, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 8]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        callSession = _a.sent();
                        if (!(callSession === null || callSession === void 0 ? void 0 : callSession.payment.intentId)) {
                            console.warn("Pas de paiement \u00E0 rembourser pour ".concat(sessionId));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, StripeManager_1.stripeManager.refundPayment(callSession.payment.intentId, "Appel \u00E9chou\u00E9: ".concat(reason), sessionId)];
                    case 2:
                        refundResult = _a.sent();
                        if (!refundResult.success) return [3 /*break*/, 4];
                        // Mettre à jour le statut du paiement dans la session
                        return [4 /*yield*/, this.db.collection('call_sessions').doc(sessionId).update({
                                'payment.status': 'refunded',
                                'payment.refundedAt': admin.firestore.Timestamp.now(),
                                'metadata.updatedAt': admin.firestore.Timestamp.now()
                            })];
                    case 3:
                        // Mettre à jour le statut du paiement dans la session
                        _a.sent();
                        console.log("\uD83D\uDCB0 Remboursement trait\u00E9 avec succ\u00E8s: ".concat(sessionId));
                        return [3 /*break*/, 5];
                    case 4:
                        console.error("\u274C \u00C9chec du remboursement pour ".concat(sessionId, ":"), refundResult.error);
                        _a.label = 5;
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        error_11 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:processRefund', error_11)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gère la fin d'un appel avec succès
     */
    TwilioCallManager.prototype.handleCallCompletion = function (sessionId, duration) {
        return __awaiter(this, void 0, void 0, function () {
            var callSession, clientLanguage, providerLanguage, minutes, seconds, notificationError_2, error_12;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 11, , 13]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        callSession = _c.sent();
                        if (!callSession) {
                            console.warn("Session non trouv\u00E9e pour completion: ".concat(sessionId));
                            return [2 /*return*/];
                        }
                        // Mettre à jour le statut
                        return [4 /*yield*/, this.updateCallSessionStatus(sessionId, 'completed')];
                    case 2:
                        // Mettre à jour le statut
                        _c.sent();
                        clientLanguage = ((_a = callSession.metadata.clientLanguages) === null || _a === void 0 ? void 0 : _a[0]) || 'fr';
                        providerLanguage = ((_b = callSession.metadata.providerLanguages) === null || _b === void 0 ? void 0 : _b[0]) || 'fr';
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 7]);
                        minutes = Math.floor(duration / 60);
                        seconds = duration % 60;
                        return [4 /*yield*/, Promise.allSettled([
                                MessageManager_1.messageManager.sendSmartMessage({
                                    to: callSession.participants.client.phone,
                                    templateId: 'call_success_client',
                                    variables: {
                                        duration: minutes.toString(),
                                        seconds: seconds.toString(),
                                        serviceType: callSession.metadata.serviceType,
                                        language: clientLanguage
                                    }
                                }),
                                MessageManager_1.messageManager.sendSmartMessage({
                                    to: callSession.participants.provider.phone,
                                    templateId: 'call_success_provider',
                                    variables: {
                                        duration: minutes.toString(),
                                        seconds: seconds.toString(),
                                        serviceType: callSession.metadata.serviceType,
                                        language: providerLanguage
                                    }
                                })
                            ])];
                    case 4:
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        notificationError_2 = _c.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:handleCallCompletion:notification', notificationError_2)];
                    case 6:
                        _c.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        if (!this.shouldCapturePayment(callSession, duration)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.capturePaymentForSession(sessionId)];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'call_completed_success',
                            retryCount: 0,
                            additionalData: { duration: duration }
                        })];
                    case 10:
                        _c.sent();
                        console.log("\u2705 Appel compl\u00E9t\u00E9 avec succ\u00E8s: ".concat(sessionId, ", dur\u00E9e: ").concat(duration, "s"));
                        return [3 /*break*/, 13];
                    case 11:
                        error_12 = _c.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:handleCallCompletion', error_12)];
                    case 12:
                        _c.sent();
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Vérifie si l'appel doit être facturé avec critères stricts
     */
    TwilioCallManager.prototype.shouldCapturePayment = function (session, duration) {
        var _a = session.participants, provider = _a.provider, client = _a.client;
        var _b = session.conference, startedAt = _b.startedAt, sessionDuration = _b.duration;
        // Utiliser la durée fournie ou celle de la session
        var actualDuration = duration || sessionDuration || 0;
        // Les deux participants doivent être connectés
        if (provider.status !== 'connected' || client.status !== 'connected') {
            console.log("Paiement non captur\u00E9: participants non connect\u00E9s (P:".concat(provider.status, ", C:").concat(client.status, ")"));
            return false;
        }
        // La conférence doit avoir commencé
        if (!startedAt) {
            console.log('Paiement non capturé: conférence non démarrée');
            return false;
        }
        // La durée doit être d'au moins 2 minutes
        if (actualDuration < CALL_CONFIG.MIN_CALL_DURATION) {
            console.log("Paiement non captur\u00E9: dur\u00E9e insuffisante (".concat(actualDuration, "s < ").concat(CALL_CONFIG.MIN_CALL_DURATION, "s)"));
            return false;
        }
        // Le paiement ne doit pas déjà être capturé
        if (session.payment.status !== 'authorized') {
            console.log("Paiement non captur\u00E9: statut incorrect (".concat(session.payment.status, ")"));
            return false;
        }
        return true;
    };
    /**
     * Capture le paiement pour une session avec validation renforcée
     */
    TwilioCallManager.prototype.capturePaymentForSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, captureResult, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 10]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        session = _a.sent();
                        if (!session) {
                            console.warn("Session non trouv\u00E9e pour capture paiement: ".concat(sessionId));
                            return [2 /*return*/, false];
                        }
                        if (!this.shouldCapturePayment(session)) {
                            console.log("Conditions non remplies pour capture paiement: ".concat(sessionId));
                            return [2 /*return*/, false];
                        }
                        // Double vérification de sécurité
                        if (session.payment.status === 'captured') {
                            console.warn("Paiement d\u00E9j\u00E0 captur\u00E9 pour: ".concat(sessionId));
                            return [2 /*return*/, true];
                        }
                        return [4 /*yield*/, StripeManager_1.stripeManager.capturePayment(session.payment.intentId, sessionId)];
                    case 2:
                        captureResult = _a.sent();
                        if (!captureResult.success) return [3 /*break*/, 6];
                        // Mettre à jour le statut dans la session
                        return [4 /*yield*/, this.db.collection('call_sessions').doc(sessionId).update({
                                'payment.status': 'captured',
                                'payment.capturedAt': admin.firestore.Timestamp.now(),
                                'metadata.updatedAt': admin.firestore.Timestamp.now()
                            })];
                    case 3:
                        // Mettre à jour le statut dans la session
                        _a.sent();
                        // Créer une demande d'avis
                        return [4 /*yield*/, this.createReviewRequest(session)];
                    case 4:
                        // Créer une demande d'avis
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: 'payment_captured',
                                retryCount: 0,
                                additionalData: {
                                    amount: session.payment.amount,
                                    duration: session.conference.duration
                                }
                            })];
                    case 5:
                        _a.sent();
                        console.log("\uD83D\uDCB0 Paiement captur\u00E9: ".concat(sessionId, ", dur\u00E9e: ").concat(session.conference.duration, "s, montant: ").concat(session.payment.amount));
                        return [2 /*return*/, true];
                    case 6:
                        console.error("\u274C \u00C9chec capture paiement pour ".concat(sessionId, ":"), captureResult.error);
                        return [2 /*return*/, false];
                    case 7: return [3 /*break*/, 10];
                    case 8:
                        error_13 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:capturePaymentForSession', error_13)];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Crée une demande d'avis après un appel réussi
     */
    TwilioCallManager.prototype.createReviewRequest = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var reviewRequest_1, error_14;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        reviewRequest_1 = {
                            clientId: session.metadata.clientId,
                            providerId: session.metadata.providerId,
                            callSessionId: session.id,
                            callDuration: session.conference.duration || 0,
                            serviceType: session.metadata.serviceType,
                            providerType: session.metadata.providerType,
                            callAmount: session.payment.amount,
                            createdAt: admin.firestore.Timestamp.now(),
                            status: 'pending',
                            // Données additionnelles pour l'analyse
                            callStartedAt: session.conference.startedAt,
                            callEndedAt: session.conference.endedAt,
                            bothConnected: session.participants.provider.status === 'connected' &&
                                session.participants.client.status === 'connected',
                            requestId: session.metadata.requestId
                        };
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                return _this.db.collection('reviews_requests').add(reviewRequest_1);
                            })];
                    case 1:
                        _a.sent();
                        console.log("\uD83D\uDCDD Demande d'avis cr\u00E9\u00E9e pour: ".concat(session.id));
                        return [3 /*break*/, 4];
                    case 2:
                        error_14 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:createReviewRequest', error_14)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Annule une session d'appel
     */
    TwilioCallManager.prototype.cancelCallSession = function (sessionId, reason, cancelledBy) {
        return __awaiter(this, void 0, void 0, function () {
            var session, timeout, error_15;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 8]);
                        return [4 /*yield*/, this.getCallSession(sessionId)];
                    case 1:
                        session = _a.sent();
                        if (!session) {
                            console.warn("Session non trouv\u00E9e pour annulation: ".concat(sessionId));
                            return [2 /*return*/, false];
                        }
                        timeout = this.activeCalls.get(sessionId);
                        if (timeout) {
                            clearTimeout(timeout);
                            this.activeCalls.delete(sessionId);
                        }
                        // Annuler les appels en cours si ils existent
                        return [4 /*yield*/, this.cancelActiveCallsForSession(session)];
                    case 2:
                        // Annuler les appels en cours si ils existent
                        _a.sent();
                        // Mettre à jour le statut
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                return _this.db.collection('call_sessions').doc(sessionId).update({
                                    status: 'cancelled',
                                    'metadata.updatedAt': admin.firestore.Timestamp.now(),
                                    cancelledAt: admin.firestore.Timestamp.now(),
                                    cancelledBy: cancelledBy || 'system',
                                    cancellationReason: reason
                                });
                            })];
                    case 3:
                        // Mettre à jour le statut
                        _a.sent();
                        // Rembourser automatiquement
                        return [4 /*yield*/, this.processRefund(sessionId, "cancelled_".concat(reason))];
                    case 4:
                        // Rembourser automatiquement
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: "cancelled_".concat(reason),
                                retryCount: 0,
                                additionalData: {
                                    cancelledBy: cancelledBy || 'system'
                                }
                            })];
                    case 5:
                        _a.sent();
                        console.log("\uD83D\uDEAB Session annul\u00E9e: ".concat(sessionId, ", raison: ").concat(reason));
                        return [2 /*return*/, true];
                    case 6:
                        error_15 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:cancelCallSession', error_15)];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Annule les appels actifs pour une session
     */
    TwilioCallManager.prototype.cancelActiveCallsForSession = function (session) {
        return __awaiter(this, void 0, void 0, function () {
            var promises, error_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        promises = [];
                        if (session.participants.provider.callSid) {
                            promises.push(this.cancelTwilioCall(session.participants.provider.callSid));
                        }
                        if (session.participants.client.callSid) {
                            promises.push(this.cancelTwilioCall(session.participants.client.callSid));
                        }
                        return [4 /*yield*/, Promise.allSettled(promises)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_16 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:cancelActiveCallsForSession', error_16)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Annule un appel Twilio spécifique
     */
    TwilioCallManager.prototype.cancelTwilioCall = function (callSid) {
        return __awaiter(this, void 0, void 0, function () {
            var error_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, twilio_1.twilioClient.calls(callSid).update({ status: 'completed' })];
                    case 1:
                        _a.sent();
                        console.log("\uD83D\uDCDE Appel Twilio annul\u00E9: ".concat(callSid));
                        return [3 /*break*/, 3];
                    case 2:
                        error_17 = _a.sent();
                        console.warn("Impossible d'annuler l'appel Twilio ".concat(callSid, ":"), error_17);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère le nombre de sessions actives pour la gestion de la concurrence
     */
    TwilioCallManager.prototype.getActiveSessionsCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot, error_18;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.db.collection('call_sessions')
                                .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting', 'both_connecting', 'active'])
                                .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.size];
                    case 2:
                        error_18 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:getActiveSessionsCount', error_18)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, 0];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Méthodes utilitaires
     */
    TwilioCallManager.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    TwilioCallManager.prototype.saveWithRetry = function (operation_1) {
        return __awaiter(this, arguments, void 0, function (operation, maxRetries, baseDelay) {
            var attempt, error_19;
            if (maxRetries === void 0) { maxRetries = 3; }
            if (baseDelay === void 0) { baseDelay = 1000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        attempt = 1;
                        _a.label = 1;
                    case 1:
                        if (!(attempt <= maxRetries)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, operation()];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_19 = _a.sent();
                        if (attempt === maxRetries) {
                            throw error_19;
                        }
                        console.warn("Tentative ".concat(attempt, "/").concat(maxRetries, " \u00E9chou\u00E9e, retry dans ").concat(baseDelay * attempt, "ms"));
                        return [4 /*yield*/, this.delay(baseDelay * attempt)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 7: throw new Error('Impossible d\'atteindre cette ligne');
                }
            });
        });
    };
    // =====================================================
    // Méthodes CRUD pour les sessions
    // =====================================================
    TwilioCallManager.prototype.updateCallSessionStatus = function (sessionId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var error_20;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                return _this.db.collection('call_sessions').doc(sessionId).update({
                                    status: status,
                                    'metadata.updatedAt': admin.firestore.Timestamp.now()
                                });
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_20 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:updateCallSessionStatus', error_20)];
                    case 3:
                        _a.sent();
                        throw error_20;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TwilioCallManager.prototype.updateParticipantCallSid = function (sessionId, participantType, callSid) {
        return __awaiter(this, void 0, void 0, function () {
            var error_21;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                var _a;
                                return _this.db.collection('call_sessions').doc(sessionId).update((_a = {},
                                    _a["participants.".concat(participantType, ".callSid")] = callSid,
                                    _a['metadata.updatedAt'] = admin.firestore.Timestamp.now(),
                                    _a));
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_21 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:updateParticipantCallSid', error_21)];
                    case 3:
                        _a.sent();
                        throw error_21;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TwilioCallManager.prototype.updateParticipantStatus = function (sessionId, participantType, status, timestamp) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData_1, error_22;
            var _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        updateData_1 = (_a = {},
                            _a["participants.".concat(participantType, ".status")] = status,
                            _a['metadata.updatedAt'] = admin.firestore.Timestamp.now(),
                            _a);
                        if (status === 'connected' && timestamp) {
                            updateData_1["participants.".concat(participantType, ".connectedAt")] = timestamp;
                        }
                        else if (status === 'disconnected' && timestamp) {
                            updateData_1["participants.".concat(participantType, ".disconnectedAt")] = timestamp;
                        }
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                return _this.db.collection('call_sessions').doc(sessionId).update(updateData_1);
                            })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_22 = _b.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:updateParticipantStatus', error_22)];
                    case 3:
                        _b.sent();
                        throw error_22;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TwilioCallManager.prototype.updateConferenceInfo = function (sessionId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData_2, error_23;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        updateData_2 = {
                            'metadata.updatedAt': admin.firestore.Timestamp.now()
                        };
                        Object.entries(updates).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            updateData_2["conference.".concat(key)] = value;
                        });
                        return [4 /*yield*/, this.saveWithRetry(function () {
                                return _this.db.collection('call_sessions').doc(sessionId).update(updateData_2);
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_23 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:updateConferenceInfo', error_23)];
                    case 3:
                        _a.sent();
                        throw error_23;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TwilioCallManager.prototype.getCallSession = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var doc, error_24;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.db.collection('call_sessions').doc(sessionId).get()];
                    case 1:
                        doc = _a.sent();
                        return [2 /*return*/, doc.exists ? doc.data() : null];
                    case 2:
                        error_24 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:getCallSession', error_24)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TwilioCallManager.prototype.findSessionByConferenceSid = function (conferenceSid) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot, error_25;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.db.collection('call_sessions')
                                .where('conference.sid', '==', conferenceSid)
                                .limit(1)
                                .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.empty ? null : snapshot.docs[0].data()];
                    case 2:
                        error_25 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:findSessionByConferenceSid', error_25)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TwilioCallManager.prototype.findSessionByCallSid = function (callSid) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot, error_26;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 5]);
                        return [4 /*yield*/, this.db.collection('call_sessions')
                                .where('participants.provider.callSid', '==', callSid)
                                .limit(1)
                                .get()];
                    case 1:
                        snapshot = _a.sent();
                        if (!snapshot.empty) {
                            return [2 /*return*/, {
                                    session: snapshot.docs[0].data(),
                                    participantType: 'provider'
                                }];
                        }
                        return [4 /*yield*/, this.db.collection('call_sessions')
                                .where('participants.client.callSid', '==', callSid)
                                .limit(1)
                                .get()];
                    case 2:
                        // Chercher dans les CallSid des clients
                        snapshot = _a.sent();
                        if (!snapshot.empty) {
                            return [2 /*return*/, {
                                    session: snapshot.docs[0].data(),
                                    participantType: 'client'
                                }];
                        }
                        return [2 /*return*/, null];
                    case 3:
                        error_26 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:findSessionByCallSid', error_26)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Ajouter à la queue d'appels
     */
    TwilioCallManager.prototype.addToQueue = function (sessionId) {
        if (!this.callQueue.includes(sessionId)) {
            this.callQueue.push(sessionId);
            console.log("\uD83D\uDCDE Session ".concat(sessionId, " ajout\u00E9e \u00E0 la queue (").concat(this.callQueue.length, " en attente)"));
        }
    };
    /**
     * Obtenir des statistiques détaillées
     */
    TwilioCallManager.prototype.getCallStatistics = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var query, snapshot, stats_1, totalDuration_1, completedWithDuration_1, totalCapturedAmount_1, capturedPayments_1, error_27;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        query = this.db.collection('call_sessions');
                        // Appliquer les filtres
                        if (options.startDate) {
                            query = query.where('metadata.createdAt', '>=', options.startDate);
                        }
                        if (options.endDate) {
                            query = query.where('metadata.createdAt', '<=', options.endDate);
                        }
                        if (options.providerType) {
                            query = query.where('metadata.providerType', '==', options.providerType);
                        }
                        if (options.serviceType) {
                            query = query.where('metadata.serviceType', '==', options.serviceType);
                        }
                        return [4 /*yield*/, query.get()];
                    case 1:
                        snapshot = _a.sent();
                        stats_1 = {
                            total: snapshot.size,
                            pending: 0,
                            completed: 0,
                            failed: 0,
                            cancelled: 0,
                            averageDuration: 0,
                            successRate: 0,
                            totalRevenue: 0,
                            averageRevenue: 0
                        };
                        totalDuration_1 = 0;
                        completedWithDuration_1 = 0;
                        totalCapturedAmount_1 = 0;
                        capturedPayments_1 = 0;
                        snapshot.docs.forEach(function (doc) {
                            var session = doc.data();
                            // Compter par statut
                            switch (session.status) {
                                case 'pending':
                                case 'provider_connecting':
                                case 'client_connecting':
                                case 'both_connecting':
                                case 'active':
                                    stats_1.pending++;
                                    break;
                                case 'completed':
                                    stats_1.completed++;
                                    if (session.conference.duration) {
                                        totalDuration_1 += session.conference.duration;
                                        completedWithDuration_1++;
                                    }
                                    break;
                                case 'failed':
                                    stats_1.failed++;
                                    break;
                                case 'cancelled':
                                    stats_1.cancelled++;
                                    break;
                            }
                            // Statistiques financières
                            if (session.payment.status === 'captured') {
                                totalCapturedAmount_1 += session.payment.amount;
                                capturedPayments_1++;
                            }
                        });
                        // Calculer les moyennes
                        stats_1.averageDuration = completedWithDuration_1 > 0 ? totalDuration_1 / completedWithDuration_1 : 0;
                        stats_1.successRate = stats_1.total > 0 ? (stats_1.completed / stats_1.total) * 100 : 0;
                        stats_1.totalRevenue = totalCapturedAmount_1;
                        stats_1.averageRevenue = capturedPayments_1 > 0 ? totalCapturedAmount_1 / capturedPayments_1 : 0;
                        return [2 /*return*/, stats_1];
                    case 2:
                        error_27 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:getCallStatistics', error_27)];
                    case 3:
                        _a.sent();
                        throw error_27;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Nettoyage des sessions anciennes
     */
    TwilioCallManager.prototype.cleanupOldSessions = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var _a, olderThanDays, _b, keepCompletedDays, _c, batchSize, now, generalCutoff, completedCutoff, deleted, errors, failedQuery, failedSnapshot, batch_1, error_28, completedQuery, completedSnapshot, batch_2, error_29, error_30;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = options.olderThanDays, olderThanDays = _a === void 0 ? 90 : _a, _b = options.keepCompletedDays, keepCompletedDays = _b === void 0 ? 30 : _b, _c = options.batchSize, batchSize = _c === void 0 ? 50 : _c;
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 14, , 16]);
                        now = admin.firestore.Timestamp.now();
                        generalCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - (olderThanDays * 24 * 60 * 60 * 1000));
                        completedCutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - (keepCompletedDays * 24 * 60 * 60 * 1000));
                        deleted = 0;
                        errors = 0;
                        failedQuery = this.db.collection('call_sessions')
                            .where('metadata.createdAt', '<=', generalCutoff)
                            .where('status', 'in', ['failed', 'cancelled'])
                            .limit(batchSize);
                        return [4 /*yield*/, failedQuery.get()];
                    case 2:
                        failedSnapshot = _d.sent();
                        if (!!failedSnapshot.empty) return [3 /*break*/, 7];
                        batch_1 = this.db.batch();
                        failedSnapshot.docs.forEach(function (doc) {
                            batch_1.delete(doc.ref);
                        });
                        _d.label = 3;
                    case 3:
                        _d.trys.push([3, 5, , 7]);
                        return [4 /*yield*/, batch_1.commit()];
                    case 4:
                        _d.sent();
                        deleted += failedSnapshot.size;
                        console.log("\uD83D\uDDD1\uFE0F Supprim\u00E9 ".concat(failedSnapshot.size, " sessions \u00E9chou\u00E9es/annul\u00E9es"));
                        return [3 /*break*/, 7];
                    case 5:
                        error_28 = _d.sent();
                        errors += failedSnapshot.size;
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:cleanupOldSessions:failed', error_28)];
                    case 6:
                        _d.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        completedQuery = this.db.collection('call_sessions')
                            .where('metadata.createdAt', '<=', completedCutoff)
                            .where('status', '==', 'completed')
                            .limit(batchSize);
                        return [4 /*yield*/, completedQuery.get()];
                    case 8:
                        completedSnapshot = _d.sent();
                        if (!!completedSnapshot.empty) return [3 /*break*/, 13];
                        batch_2 = this.db.batch();
                        completedSnapshot.docs.forEach(function (doc) {
                            batch_2.delete(doc.ref);
                        });
                        _d.label = 9;
                    case 9:
                        _d.trys.push([9, 11, , 13]);
                        return [4 /*yield*/, batch_2.commit()];
                    case 10:
                        _d.sent();
                        deleted += completedSnapshot.size;
                        console.log("\uD83D\uDDD1\uFE0F Supprim\u00E9 ".concat(completedSnapshot.size, " sessions compl\u00E9t\u00E9es anciennes"));
                        return [3 /*break*/, 13];
                    case 11:
                        error_29 = _d.sent();
                        errors += completedSnapshot.size;
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:cleanupOldSessions:completed', error_29)];
                    case 12:
                        _d.sent();
                        return [3 /*break*/, 13];
                    case 13:
                        console.log("\u2705 Nettoyage termin\u00E9: ".concat(deleted, " supprim\u00E9es, ").concat(errors, " erreurs"));
                        return [2 /*return*/, { deleted: deleted, errors: errors }];
                    case 14:
                        error_30 = _d.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('TwilioCallManager:cleanupOldSessions', error_30)];
                    case 15:
                        _d.sent();
                        return [2 /*return*/, { deleted: 0, errors: 1 }];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    return TwilioCallManager;
}());
exports.TwilioCallManager = TwilioCallManager;
// 🔧 CHANGEMENT : Instance singleton avec lazy loading
var twilioCallManagerInstance = null;
exports.twilioCallManager = (function () {
    if (!twilioCallManagerInstance) {
        try {
            twilioCallManagerInstance = new TwilioCallManager();
        }
        catch (error) {
            console.error('Erreur lors de l\'initialisation de TwilioCallManager:', error);
            throw error;
        }
    }
    return twilioCallManagerInstance;
})();
