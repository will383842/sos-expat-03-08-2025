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
exports.twilioConferenceWebhook = void 0;
var https_1 = require("firebase-functions/v2/https");
var TwilioCallManager_1 = require("../TwilioCallManager");
var logCallRecord_1 = require("../utils/logs/logCallRecord");
var logError_1 = require("../utils/logs/logError");
var admin = require("firebase-admin");
/**
 * Webhook pour les événements de conférence Twilio
 * Gère: start, end, join, leave, mute, hold
 */
exports.twilioConferenceWebhook = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, session, sessionId, _a, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 16, , 18]);
                body = req.body;
                console.log('🔔 Conference Webhook reçu:', {
                    event: body.StatusCallbackEvent,
                    conferenceSid: body.ConferenceSid,
                    conferenceStatus: body.ConferenceStatus,
                    participantLabel: body.ParticipantLabel,
                    callSid: body.CallSid
                });
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.findSessionByConferenceSid(body.ConferenceSid)];
            case 1:
                session = _b.sent();
                if (!session) {
                    console.warn("Session non trouv\u00E9e pour conf\u00E9rence: ".concat(body.ConferenceSid));
                    res.status(200).send('Session not found');
                    return [2 /*return*/];
                }
                sessionId = session.id;
                _a = body.StatusCallbackEvent;
                switch (_a) {
                    case 'conference-start': return [3 /*break*/, 2];
                    case 'conference-end': return [3 /*break*/, 4];
                    case 'participant-join': return [3 /*break*/, 6];
                    case 'participant-leave': return [3 /*break*/, 8];
                    case 'participant-mute': return [3 /*break*/, 10];
                    case 'participant-unmute': return [3 /*break*/, 10];
                    case 'participant-hold': return [3 /*break*/, 12];
                    case 'participant-unhold': return [3 /*break*/, 12];
                }
                return [3 /*break*/, 14];
            case 2: return [4 /*yield*/, handleConferenceStart(sessionId, body)];
            case 3:
                _b.sent();
                return [3 /*break*/, 15];
            case 4: return [4 /*yield*/, handleConferenceEnd(sessionId, body)];
            case 5:
                _b.sent();
                return [3 /*break*/, 15];
            case 6: return [4 /*yield*/, handleParticipantJoin(sessionId, body)];
            case 7:
                _b.sent();
                return [3 /*break*/, 15];
            case 8: return [4 /*yield*/, handleParticipantLeave(sessionId, body)];
            case 9:
                _b.sent();
                return [3 /*break*/, 15];
            case 10: return [4 /*yield*/, handleParticipantMute(sessionId, body)];
            case 11:
                _b.sent();
                return [3 /*break*/, 15];
            case 12: return [4 /*yield*/, handleParticipantHold(sessionId, body)];
            case 13:
                _b.sent();
                return [3 /*break*/, 15];
            case 14:
                console.log("\u00C9v\u00E9nement conf\u00E9rence non g\u00E9r\u00E9: ".concat(body.StatusCallbackEvent));
                _b.label = 15;
            case 15:
                res.status(200).send('OK');
                return [3 /*break*/, 18];
            case 16:
                error_1 = _b.sent();
                console.error('❌ Erreur webhook conférence:', error_1);
                return [4 /*yield*/, (0, logError_1.logError)('twilioConferenceWebhook:error', error_1)];
            case 17:
                _b.sent();
                res.status(500).send('Webhook error');
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); });
/**
 * Gère le début de la conférence
 */
function handleConferenceStart(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 6]);
                    console.log("\uD83C\uDFA4 Conf\u00E9rence d\u00E9marr\u00E9e: ".concat(sessionId));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateConferenceInfo(sessionId, {
                            sid: body.ConferenceSid,
                            startedAt: admin.firestore.Timestamp.fromDate(new Date()),
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(sessionId, 'active')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'conference_started',
                            retryCount: 0,
                            additionalData: {
                                conferenceSid: body.ConferenceSid,
                                timestamp: body.Timestamp
                            }
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleConferenceStart', error_2)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère la fin de la conférence
 */
function handleConferenceEnd(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var duration, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 10]);
                    duration = parseInt(body.Duration || '0');
                    console.log("\uD83C\uDFC1 Conf\u00E9rence termin\u00E9e: ".concat(sessionId, ", dur\u00E9e: ").concat(duration, "s"));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateConferenceInfo(sessionId, {
                            endedAt: admin.firestore.Timestamp.fromDate(new Date()),
                            duration: duration
                        })];
                case 1:
                    _a.sent();
                    if (!(duration >= 120)) return [3 /*break*/, 3];
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.handleCallCompletion(sessionId, duration)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 3: 
                // Appel trop court, considéré comme échoué
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(sessionId, 'failed')];
                case 4:
                    // Appel trop court, considéré comme échoué
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'call_too_short',
                            retryCount: 0,
                            additionalData: {
                                duration: duration,
                                reason: 'Duration less than 2 minutes'
                            }
                        })];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                        callId: sessionId,
                        status: 'conference_ended',
                        retryCount: 0,
                        additionalData: {
                            duration: duration,
                            conferenceSid: body.ConferenceSid
                        }
                    })];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 8:
                    error_3 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleConferenceEnd', error_3)];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère l'arrivée d'un participant
 */
function handleParticipantJoin(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var participantType, callSid, session, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 9]);
                    participantType = body.ParticipantLabel;
                    callSid = body.CallSid;
                    console.log("\uD83D\uDC4B Participant rejoint: ".concat(participantType, " (").concat(callSid, ")"));
                    // Mettre à jour le statut du participant
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'connected', admin.firestore.Timestamp.fromDate(new Date()))];
                case 1:
                    // Mettre à jour le statut du participant
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
                        status: "".concat(participantType, "_joined_conference"),
                        retryCount: 0,
                        additionalData: {
                            callSid: callSid,
                            conferenceSid: body.ConferenceSid
                        }
                    })];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 7:
                    error_4 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleParticipantJoin', error_4)];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère le départ d'un participant
 */
function handleParticipantLeave(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var participantType, callSid, session, duration, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 7]);
                    participantType = body.ParticipantLabel;
                    callSid = body.CallSid;
                    console.log("\uD83D\uDC4B Participant parti: ".concat(participantType, " (").concat(callSid, ")"));
                    // Mettre à jour le statut du participant
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateParticipantStatus(sessionId, participantType, 'disconnected', admin.firestore.Timestamp.fromDate(new Date()))];
                case 1:
                    // Mettre à jour le statut du participant
                    _a.sent();
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(sessionId)];
                case 2:
                    session = _a.sent();
                    duration = (session === null || session === void 0 ? void 0 : session.conference.duration) || 0;
                    // Gérer la déconnexion selon le participant et la durée
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.handleEarlyDisconnection(sessionId, participantType, duration)];
                case 3:
                    // Gérer la déconnexion selon le participant et la durée
                    _a.sent();
                    // (Maintenant que la méthode existe dans TwilioCallManager)
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: "".concat(participantType, "_left_conference"),
                            retryCount: 0,
                            additionalData: {
                                callSid: callSid,
                                conferenceSid: body.ConferenceSid,
                                duration: duration
                            }
                        })];
                case 4:
                    // (Maintenant que la méthode existe dans TwilioCallManager)
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    error_5 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleParticipantLeave', error_5)];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère les événements mute/unmute
 */
function handleParticipantMute(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var participantType, isMuted, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    participantType = body.ParticipantLabel;
                    isMuted = body.StatusCallbackEvent === 'participant-mute';
                    console.log("\uD83D\uDD07 Participant ".concat(isMuted ? 'muted' : 'unmuted', ": ").concat(participantType));
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: "".concat(participantType, "_").concat(isMuted ? 'muted' : 'unmuted'),
                            retryCount: 0,
                            additionalData: {
                                callSid: body.CallSid,
                                conferenceSid: body.ConferenceSid
                            }
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    error_6 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleParticipantMute', error_6)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère les événements hold/unhold
 */
function handleParticipantHold(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var participantType, isOnHold, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    participantType = body.ParticipantLabel;
                    isOnHold = body.StatusCallbackEvent === 'participant-hold';
                    console.log("\u23F8\uFE0F Participant ".concat(isOnHold ? 'on hold' : 'off hold', ": ").concat(participantType));
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: "".concat(participantType, "_").concat(isOnHold ? 'hold' : 'unhold'),
                            retryCount: 0,
                            additionalData: {
                                callSid: body.CallSid,
                                conferenceSid: body.ConferenceSid
                            }
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    error_7 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleParticipantHold', error_7)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
