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
exports.twilioRecordingWebhook = void 0;
exports.getSessionRecordings = getSessionRecordings;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var TwilioCallManager_1 = require("../TwilioCallManager");
var logCallRecord_1 = require("../utils/logs/logCallRecord");
var logError_1 = require("../utils/logs/logError");
/**
 * Webhook pour les événements d'enregistrement Twilio
 * Gère: completed, failed, absent
 */
exports.twilioRecordingWebhook = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, session, sessionId, result, _a, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 13, , 15]);
                body = req.body;
                console.log('🎬 Recording Webhook reçu:', {
                    status: body.RecordingStatus,
                    recordingSid: body.RecordingSid,
                    duration: body.RecordingDuration,
                    conferenceSid: body.ConferenceSid,
                    callSid: body.CallSid
                });
                session = null;
                sessionId = '';
                if (!body.ConferenceSid) return [3 /*break*/, 2];
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.findSessionByConferenceSid(body.ConferenceSid)];
            case 1:
                session = _b.sent();
                return [3 /*break*/, 4];
            case 2:
                if (!body.CallSid) return [3 /*break*/, 4];
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.findSessionByCallSid(body.CallSid)];
            case 3:
                result = _b.sent();
                session = (result === null || result === void 0 ? void 0 : result.session) || null;
                _b.label = 4;
            case 4:
                if (!session) {
                    console.warn("Session non trouv\u00E9e pour enregistrement: ".concat(body.RecordingSid));
                    res.status(200).send('Session not found');
                    return [2 /*return*/];
                }
                sessionId = session.id;
                _a = body.RecordingStatus;
                switch (_a) {
                    case 'completed': return [3 /*break*/, 5];
                    case 'failed': return [3 /*break*/, 7];
                    case 'absent': return [3 /*break*/, 9];
                }
                return [3 /*break*/, 11];
            case 5: return [4 /*yield*/, handleRecordingCompleted(sessionId, body)];
            case 6:
                _b.sent();
                return [3 /*break*/, 12];
            case 7: return [4 /*yield*/, handleRecordingFailed(sessionId, body)];
            case 8:
                _b.sent();
                return [3 /*break*/, 12];
            case 9: return [4 /*yield*/, handleRecordingAbsent(sessionId, body)];
            case 10:
                _b.sent();
                return [3 /*break*/, 12];
            case 11:
                console.log("Statut d'enregistrement non g\u00E9r\u00E9: ".concat(body.RecordingStatus));
                _b.label = 12;
            case 12:
                res.status(200).send('OK');
                return [3 /*break*/, 15];
            case 13:
                error_1 = _b.sent();
                console.error('❌ Erreur webhook enregistrement:', error_1);
                return [4 /*yield*/, (0, logError_1.logError)('twilioRecordingWebhook:error', error_1)];
            case 14:
                _b.sent();
                res.status(500).send('Webhook error');
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
/**
 * Gère la completion d'un enregistrement
 */
function handleRecordingCompleted(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var duration, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 7]);
                    duration = parseInt(body.RecordingDuration || '0');
                    console.log("\u2705 Enregistrement compl\u00E9t\u00E9: ".concat(sessionId, ", dur\u00E9e: ").concat(duration, "s"));
                    // Mettre à jour la session avec l'URL d'enregistrement
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateConferenceInfo(sessionId, {
                            recordingUrl: body.RecordingUrl,
                            duration: duration
                        })];
                case 1:
                    // Mettre à jour la session avec l'URL d'enregistrement
                    _a.sent();
                    // Sauvegarder les métadonnées de l'enregistrement
                    return [4 /*yield*/, saveRecordingMetadata(sessionId, body, 'completed')];
                case 2:
                    // Sauvegarder les métadonnées de l'enregistrement
                    _a.sent();
                    // Déclencher la logique de post-traitement si nécessaire
                    return [4 /*yield*/, handlePostRecordingProcessing(sessionId, body)];
                case 3:
                    // Déclencher la logique de post-traitement si nécessaire
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'recording_completed',
                            retryCount: 0,
                            duration: duration,
                            additionalData: {
                                recordingSid: body.RecordingSid,
                                recordingUrl: body.RecordingUrl,
                                recordingDuration: duration
                            }
                        })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    error_2 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleRecordingCompleted', error_2)];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère l'échec d'un enregistrement
 */
function handleRecordingFailed(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 6]);
                    console.log("\u274C \u00C9chec enregistrement: ".concat(sessionId));
                    // Sauvegarder les métadonnées de l'échec
                    return [4 /*yield*/, saveRecordingMetadata(sessionId, body, 'failed')];
                case 1:
                    // Sauvegarder les métadonnées de l'échec
                    _a.sent();
                    // Notifier l'équipe technique de l'échec
                    return [4 /*yield*/, notifyRecordingFailure(sessionId, body)];
                case 2:
                    // Notifier l'équipe technique de l'échec
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'recording_failed',
                            retryCount: 0,
                            errorMessage: 'Recording failed',
                            additionalData: {
                                recordingSid: body.RecordingSid,
                                conferenceSid: body.ConferenceSid
                            }
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleRecordingFailed', error_3)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère l'absence d'enregistrement
 */
function handleRecordingAbsent(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 5]);
                    console.log("\u26A0\uFE0F Enregistrement absent: ".concat(sessionId));
                    // Sauvegarder les métadonnées de l'absence
                    return [4 /*yield*/, saveRecordingMetadata(sessionId, body, 'absent')];
                case 1:
                    // Sauvegarder les métadonnées de l'absence
                    _a.sent();
                    return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                            callId: sessionId,
                            status: 'recording_absent',
                            retryCount: 0,
                            additionalData: {
                                recordingSid: body.RecordingSid,
                                conferenceSid: body.ConferenceSid,
                                reason: 'No recording available'
                            }
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    error_4 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handleRecordingAbsent', error_4)];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Sauvegarde les métadonnées de l'enregistrement
 */
function saveRecordingMetadata(sessionId, body, status) {
    return __awaiter(this, void 0, void 0, function () {
        var db, recordingData, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    db = admin.firestore();
                    recordingData = {
                        sessionId: sessionId,
                        recordingSid: body.RecordingSid,
                        recordingUrl: body.RecordingUrl || null,
                        recordingStatus: status,
                        recordingDuration: parseInt(body.RecordingDuration || '0'),
                        recordingChannels: parseInt(body.RecordingChannels || '1'),
                        recordingSource: body.RecordingSource || 'conference',
                        conferenceSid: body.ConferenceSid || null,
                        callSid: body.CallSid || null,
                        accountSid: body.AccountSid,
                        webhookTimestamp: body.Timestamp,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        environment: process.env.NODE_ENV || 'development'
                    };
                    return [4 /*yield*/, db.collection('call_recordings').doc(body.RecordingSid).set(recordingData)];
                case 1:
                    _a.sent();
                    console.log("\uD83D\uDCF9 M\u00E9tadonn\u00E9es enregistrement sauvegard\u00E9es: ".concat(body.RecordingSid));
                    return [3 /*break*/, 4];
                case 2:
                    error_5 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('saveRecordingMetadata', error_5)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Gère le post-traitement après enregistrement
 */
function handlePostRecordingProcessing(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var session, recordingDuration, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 7]);
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(sessionId)];
                case 1:
                    session = _a.sent();
                    if (!session)
                        return [2 /*return*/];
                    recordingDuration = parseInt(body.RecordingDuration || '0');
                    if (!(recordingDuration >= 120 && TwilioCallManager_1.twilioCallManager.shouldCapturePayment(session))) return [3 /*break*/, 3];
                    console.log("\uD83D\uDCB0 D\u00E9clenchement capture paiement suite \u00E0 enregistrement valide: ".concat(sessionId));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.capturePaymentForSession(sessionId)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: 
                // Créer une notification pour informer de la disponibilité de l'enregistrement
                return [4 /*yield*/, notifyRecordingAvailable(sessionId, session, body)];
                case 4:
                    // Créer une notification pour informer de la disponibilité de l'enregistrement
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    error_6 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('handlePostRecordingProcessing', error_6)];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Notifie la disponibilité de l'enregistrement
 */
function notifyRecordingAvailable(sessionId, session, body) {
    return __awaiter(this, void 0, void 0, function () {
        var db, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    db = admin.firestore();
                    // Créer une notification pour l'équipe administrative
                    return [4 /*yield*/, db.collection('admin_notifications').add({
                            type: 'recording_available',
                            sessionId: sessionId,
                            recordingSid: body.RecordingSid,
                            recordingUrl: body.RecordingUrl,
                            recordingDuration: parseInt(body.RecordingDuration || '0'),
                            clientId: session.metadata.clientId,
                            providerId: session.metadata.providerId,
                            serviceType: session.metadata.serviceType,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            processed: false,
                            priority: 'low'
                        })];
                case 1:
                    // Créer une notification pour l'équipe administrative
                    _a.sent();
                    // Log pour les métriques
                    console.log("\uD83D\uDCE2 Notification enregistrement cr\u00E9\u00E9e: ".concat(sessionId));
                    return [3 /*break*/, 4];
                case 2:
                    error_7 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('notifyRecordingAvailable', error_7)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Notifie l'équipe technique d'un échec d'enregistrement
 */
function notifyRecordingFailure(sessionId, body) {
    return __awaiter(this, void 0, void 0, function () {
        var db, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    db = admin.firestore();
                    // Créer une alerte technique
                    return [4 /*yield*/, db.collection('technical_alerts').add({
                            type: 'recording_failure',
                            severity: 'medium',
                            sessionId: sessionId,
                            recordingSid: body.RecordingSid,
                            conferenceSid: body.ConferenceSid,
                            callSid: body.CallSid,
                            timestamp: body.Timestamp,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            resolved: false,
                            assignedTo: null,
                            details: {
                                recordingStatus: body.RecordingStatus,
                                accountSid: body.AccountSid
                            }
                        })];
                case 1:
                    // Créer une alerte technique
                    _a.sent();
                    console.log("\uD83D\uDEA8 Alerte technique cr\u00E9\u00E9e pour \u00E9chec enregistrement: ".concat(sessionId));
                    return [3 /*break*/, 4];
                case 2:
                    error_8 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('notifyRecordingFailure', error_8)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fonction utilitaire pour récupérer les enregistrements d'une session
 */
function getSessionRecordings(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, snapshot, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    db = admin.firestore();
                    return [4 /*yield*/, db.collection('call_recordings')
                            .where('sessionId', '==', sessionId)
                            .orderBy('createdAt', 'desc')
                            .get()];
                case 1:
                    snapshot = _a.sent();
                    return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
                case 2:
                    error_9 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('getSessionRecordings', error_9)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
