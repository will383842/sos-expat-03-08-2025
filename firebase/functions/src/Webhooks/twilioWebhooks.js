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
exports.findCallSessionByCallSid = exports.twilioRecordingWebhook = exports.twilioConferenceWebhook = exports.twilioCallWebhook = void 0;
var https_1 = require("firebase-functions/v2/https");
var TwilioCallManager_1 = require("../TwilioCallManager");
var logCallRecord_1 = require("../utils/logs/logCallRecord");
var logError_1 = require("../utils/logs/logError");
var admin = require("firebase-admin");
/**
 * Webhook unifié pour les événements d'appels Twilio
 * Compatible avec le système TwilioCallManager moderne
 */
exports.twilioCallWebhook = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, sessionResult, session, participantType, sessionId, _a, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 12, , 14]);
                body = req.body;
                console.log('🔔 Call Webhook reçu:', {
                    event: body.CallStatus,
                    callSid: body.CallSid,
                    from: body.From,
                    to: body.To,
                    duration: body.CallDuration
                });
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.findSessionByCallSid(body.CallSid)];
            case 1:
                sessionResult = _b.sent();
                if (!sessionResult) {
                    console.warn("Session non trouv\u00E9e pour CallSid: ".concat(body.CallSid));
                    res.status(200).send('Session not found');
                    return [2 /*return*/];
                }
                session = sessionResult.session, participantType = sessionResult.participantType;
                sessionId = session.id;
                _a = body.CallStatus;
                switch (_a) {
                    case 'ringing': return [3 /*break*/, 2];
                    case 'answered': return [3 /*break*/, 4];
                    case 'in-progress': return [3 /*break*/, 4];
                    case 'completed': return [3 /*break*/, 6];
                    case 'failed': return [3 /*break*/, 8];
                    case 'busy': return [3 /*break*/, 8];
                    case 'no-answer': return [3 /*break*/, 8];
                }
                return [3 /*break*/, 10];
            case 2: return [4 /*yield*/, handleCallRinging(sessionId, participantType, body)];
            case 3:
                _b.sent();
                return [3 /*break*/, 11];
            case 4: return [4 /*yield*/, handleCallAnswered(sessionId, participantType, body)];
            case 5:
                _b.sent();
                return [3 /*break*/, 11];
            case 6: return [4 /*yield*/, handleCallCompleted(sessionId, participantType, body)];
            case 7:
                _b.sent();
                return [3 /*break*/, 11];
            case 8: return [4 /*yield*/, handleCallFailed(sessionId, participantType, body)];
            case 9:
                _b.sent();
                return [3 /*break*/, 11];
            case 10:
                console.log("Statut d'appel non g\u00E9r\u00E9: ".concat(body.CallStatus));
                _b.label = 11;
            case 11:
                res.status(200).send('OK');
                return [3 /*break*/, 14];
            case 12:
                error_1 = _b.sent();
                console.error('❌ Erreur webhook appel:', error_1);
                return [4 /*yield*/, (0, logError_1.logError)('twilioCallWebhook:error', error_1)];
            case 13:
                _b.sent();
                res.status(500).send('Webhook error');
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
/**
 * Gère le statut "ringing"
 */
function handleCallRinging(sessionId, participantType, body) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 5]);
                    console.log("\uD83D\uDCDE ".concat(participantType, " en cours de sonnerie: ").concat(sessionId));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'ringing')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: "".concat(participantType, "_ringing"),
                            retryCount: 0,
                            additionalData: {
                                callSid: body.CallSid,
                                timestamp: body.Timestamp
                            }
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleCallRinging', error_2)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère le statut "answered"
 */
function handleCallAnswered(sessionId, participantType, body) {
    return __awaiter(this, void 0, void 0, function () {
        var session, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 9]);
                    console.log("\u2705 ".concat(participantType, " a r\u00E9pondu: ").concat(sessionId));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'connected', admin.firestore.Timestamp.fromDate(new Date()))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(sessionId)];
                case 2:
                    session = _a.sent();
                    if (!(session &&
                        session.participants.provider.status === 'connected' &&
                        session.participants.client.status === 'connected')) return [3 /*break*/, 5];
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(sessionId, 'active')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'both_participants_connected',
                            retryCount: 0
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                        callId: sessionId,
                        status: "".concat(participantType, "_answered"),
                        retryCount: 0,
                        additionalData: {
                            callSid: body.CallSid,
                            answeredBy: body.AnsweredBy
                        }
                    })];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 7:
                    error_3 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleCallAnswered', error_3)];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère le statut "completed"
 */
function handleCallCompleted(sessionId, participantType, body) {
    return __awaiter(this, void 0, void 0, function () {
        var duration, session, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 10]);
                    duration = parseInt(body.CallDuration || '0');
                    console.log("\uD83C\uDFC1 Appel ".concat(participantType, " termin\u00E9: ").concat(sessionId, ", dur\u00E9e: ").concat(duration, "s"));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'disconnected', admin.firestore.Timestamp.fromDate(new Date()))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(sessionId)];
                case 2:
                    session = _a.sent();
                    if (!session) {
                        console.warn("Session non trouv\u00E9e lors de la completion: ".concat(sessionId));
                        return [2 /*return*/];
                    }
                    if (!(duration >= 120)) return [3 /*break*/, 4];
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.handleCallCompletion(sessionId, duration)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4: 
                // Déconnexion précoce - utiliser la méthode du TwilioCallManager
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.handleEarlyDisconnection(sessionId, participantType, duration)];
                case 5:
                    // Déconnexion précoce - utiliser la méthode du TwilioCallManager
                    _a.sent();
                    _a.label = 6;
                case 6: return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                        callId: sessionId,
                        status: "".concat(participantType, "_call_completed"),
                        retryCount: 0,
                        duration: duration,
                        additionalData: {
                            callSid: body.CallSid,
                            duration: duration
                        }
                    })];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 8:
                    error_4 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleCallCompleted', error_4)];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère les échecs d'appel
 */
function handleCallFailed(sessionId, participantType, body) {
    return __awaiter(this, void 0, void 0, function () {
        var failureReason, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 6]);
                    console.log("\u274C Appel ".concat(participantType, " \u00E9chou\u00E9: ").concat(sessionId, ", raison: ").concat(body.CallStatus));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, body.CallStatus === 'no-answer' ? 'no_answer' : 'disconnected')];
                case 1:
                    _a.sent();
                    failureReason = 'system_error';
                    if (body.CallStatus === 'no-answer') {
                        failureReason = "".concat(participantType, "_no_answer");
                    }
                    else if (body.CallStatus === 'busy') {
                        failureReason = "".concat(participantType, "_busy");
                    }
                    else if (body.CallStatus === 'failed') {
                        failureReason = "".concat(participantType, "_failed");
                    }
                    // Utiliser la logique de gestion d'échec du TwilioCallManager
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.handleCallFailure(sessionId, failureReason)];
                case 2:
                    // Utiliser la logique de gestion d'échec du TwilioCallManager
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: "".concat(participantType, "_call_failed"),
                            retryCount: 0,
                            errorMessage: "Call failed: ".concat(body.CallStatus),
                            additionalData: {
                                callSid: body.CallSid,
                                failureReason: body.CallStatus
                            }
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_5 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleCallFailed', error_5)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Webhook pour les événements de conférence (délégué au système moderne)
 */
exports.twilioConferenceWebhook = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var modernWebhook;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./TwilioConferenceWebhook'); })];
            case 1:
                modernWebhook = (_a.sent()).twilioConferenceWebhook;
                return [2 /*return*/, modernWebhook(req, res)];
        }
    });
}); });
/**
 * Webhook pour les événements d'enregistrement (délégué au système moderne)
 */
exports.twilioRecordingWebhook = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var modernWebhook;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./TwilioRecordingWebhook'); })];
            case 1:
                modernWebhook = (_a.sent()).twilioRecordingWebhook;
                return [2 /*return*/, modernWebhook(req, res)];
        }
    });
}); });
/**
 * Fonction utilitaire pour recherche de session (compatible avec l'ancien système)
 */
var findCallSessionByCallSid = function (callSid) { return __awaiter(void 0, void 0, void 0, function () {
    var result_1, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.findSessionByCallSid(callSid)];
            case 1:
                result_1 = _a.sent();
                if (result_1) {
                    return [2 /*return*/, {
                            doc: {
                                id: result_1.session.id,
                                data: function () { return result_1.session; }
                            },
                            type: result_1.participantType
                        }];
                }
                return [2 /*return*/, null];
            case 2:
                error_6 = _a.sent();
                console.error('Error finding call session:', error_6);
                return [2 /*return*/, null];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.findCallSessionByCallSid = findCallSessionByCallSid;
