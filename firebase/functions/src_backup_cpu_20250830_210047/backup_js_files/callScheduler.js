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
exports.callSchedulerManager = exports.gracefulShutdown = exports.getCallStatistics = exports.cleanupOldSessions = exports.resumePendingCalls = exports.cancelScheduledCall = exports.createAndScheduleCall = exports.scheduleCallSequence = void 0;
var logCallRecord_1 = require("./utils/logs/logCallRecord");
var logError_1 = require("./utils/logs/logError");
var admin = require("firebase-admin");
var TwilioCallManager_1 = require("./TwilioCallManager");
// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
    admin.initializeApp();
}
var db = admin.firestore();
// Configuration pour la production
var SCHEDULER_CONFIG = {
    DEFAULT_DELAY_MINUTES: 5,
    MAX_DELAY_MINUTES: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 5000,
    HEALTH_CHECK_INTERVAL: 60000, // 1 minute
    MAX_PENDING_SESSIONS: 100,
};
/**
 * Classe pour gérer la planification et la surveillance des appels
 */
var CallSchedulerManager = /** @class */ (function () {
    function CallSchedulerManager() {
        this.scheduledCalls = new Map();
        this.healthCheckInterval = null;
        this.stats = {
            totalScheduled: 0,
            currentlyPending: 0,
            completedToday: 0,
            failedToday: 0,
            averageWaitTime: 0,
            queueLength: 0
        };
        this.startHealthCheck();
        this.loadInitialStats();
    }
    /**
     * Démarre la surveillance de santé du scheduler
     */
    CallSchedulerManager.prototype.startHealthCheck = function () {
        var _this = this;
        this.healthCheckInterval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.performHealthCheck()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_1 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:healthCheck', error_1)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); }, SCHEDULER_CONFIG.HEALTH_CHECK_INTERVAL);
    };
    /**
     * Effectue une vérification de santé du système
     */
    CallSchedulerManager.prototype.performHealthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pendingSessions, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 6]);
                        return [4 /*yield*/, this.getPendingSessions()];
                    case 1:
                        pendingSessions = _a.sent();
                        this.stats.currentlyPending = pendingSessions.length;
                        this.stats.queueLength = this.scheduledCalls.size;
                        // Nettoyer les sessions expirées
                        return [4 /*yield*/, this.cleanupExpiredSessions()];
                    case 2:
                        // Nettoyer les sessions expirées
                        _a.sent();
                        // Redémarrer les sessions bloquées
                        return [4 /*yield*/, this.restartStuckSessions(pendingSessions)];
                    case 3:
                        // Redémarrer les sessions bloquées
                        _a.sent();
                        // Log des métriques pour monitoring
                        console.log("\uD83D\uDCCA Scheduler Health: ".concat(this.stats.currentlyPending, " pending, ").concat(this.stats.queueLength, " queued"));
                        return [3 /*break*/, 6];
                    case 4:
                        error_2 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:performHealthCheck', error_2)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Charge les statistiques initiales
     */
    CallSchedulerManager.prototype.loadInitialStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var today, todayTimestamp, todayQuery, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        today = new Date();
                        today.setHours(0, 0, 0, 0);
                        todayTimestamp = admin.firestore.Timestamp.fromDate(today);
                        return [4 /*yield*/, db.collection('call_sessions')
                                .where('metadata.createdAt', '>=', todayTimestamp)
                                .get()];
                    case 1:
                        todayQuery = _a.sent();
                        this.stats.completedToday = 0;
                        this.stats.failedToday = 0;
                        todayQuery.docs.forEach(function (doc) {
                            var session = doc.data();
                            if (session.status === 'completed') {
                                _this.stats.completedToday++;
                            }
                            else if (session.status === 'failed') {
                                _this.stats.failedToday++;
                            }
                        });
                        return [3 /*break*/, 4];
                    case 2:
                        error_3 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:loadInitialStats', error_3)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Nettoie les sessions expirées
     */
    CallSchedulerManager.prototype.cleanupExpiredSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var expiredThreshold, _i, _a, _b, sessionId, timeout, session, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        expiredThreshold = Date.now() - (30 * 60 * 1000);
                        _i = 0, _a = this.scheduledCalls.entries();
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 9];
                        _b = _a[_i], sessionId = _b[0], timeout = _b[1];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 7, , 8]);
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(sessionId)];
                    case 3:
                        session = _c.sent();
                        if (!(!session ||
                            session.metadata.createdAt.toMillis() < expiredThreshold)) return [3 /*break*/, 6];
                        clearTimeout(timeout);
                        this.scheduledCalls.delete(sessionId);
                        if (!(session && session.status === 'pending')) return [3 /*break*/, 5];
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.cancelCallSession(sessionId, 'expired', 'scheduler')];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        console.log("\uD83E\uDDF9 Session expir\u00E9e nettoy\u00E9e: ".concat(sessionId));
                        _c.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_4 = _c.sent();
                        console.warn("Erreur lors du nettoyage de ".concat(sessionId, ":"), error_4);
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 1];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Redémarre les sessions bloquées
     */
    CallSchedulerManager.prototype.restartStuckSessions = function (pendingSessions) {
        return __awaiter(this, void 0, void 0, function () {
            var stuckThreshold, _i, pendingSessions_1, session, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stuckThreshold = Date.now() - (15 * 60 * 1000);
                        _i = 0, pendingSessions_1 = pendingSessions;
                        _a.label = 1;
                    case 1:
                        if (!(_i < pendingSessions_1.length)) return [3 /*break*/, 7];
                        session = pendingSessions_1[_i];
                        if (!(session.metadata.createdAt.toMillis() < stuckThreshold &&
                            !this.scheduledCalls.has(session.id))) return [3 /*break*/, 6];
                        console.log("\uD83D\uDD04 Red\u00E9marrage session bloqu\u00E9e: ".concat(session.id));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, this.scheduleCallSequence(session.id, 0)];
                    case 3:
                        _a.sent(); // Immédiat
                        return [3 /*break*/, 6];
                    case 4:
                        error_5 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)("CallScheduler:restartStuckSession:".concat(session.id), error_5)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère les sessions en attente
     */
    CallSchedulerManager.prototype.getPendingSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, db.collection('call_sessions')
                                .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
                                .orderBy('metadata.createdAt', 'desc')
                                .limit(SCHEDULER_CONFIG.MAX_PENDING_SESSIONS)
                                .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) { return doc.data(); })];
                    case 2:
                        error_6 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:getPendingSessions', error_6)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Programme une séquence d'appel
     */
    CallSchedulerManager.prototype.scheduleCallSequence = function (callSessionId_1) {
        return __awaiter(this, arguments, void 0, function (callSessionId, delayMinutes) {
            var sanitizedDelay, session, existingTimeout, timeout, error_7, updateError_1;
            var _this = this;
            if (delayMinutes === void 0) { delayMinutes = SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 11]);
                        // Valider les paramètres
                        if (!callSessionId) {
                            throw new Error('callSessionId est requis');
                        }
                        sanitizedDelay = Math.min(Math.max(delayMinutes, 0), SCHEDULER_CONFIG.MAX_DELAY_MINUTES);
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(callSessionId)];
                    case 1:
                        session = _a.sent();
                        if (!session) {
                            throw new Error("Session d'appel non trouv\u00E9e: ".concat(callSessionId));
                        }
                        if (session.status !== 'pending') {
                            console.log("Session ".concat(callSessionId, " d\u00E9j\u00E0 ").concat(session.status, ", pas de planification n\u00E9cessaire"));
                            return [2 /*return*/];
                        }
                        existingTimeout = this.scheduledCalls.get(callSessionId);
                        if (existingTimeout) {
                            clearTimeout(existingTimeout);
                            this.scheduledCalls.delete(callSessionId);
                        }
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: callSessionId,
                                status: 'sequence_scheduled',
                                retryCount: 0,
                                additionalData: {
                                    delayMinutes: sanitizedDelay,
                                    scheduledAt: new Date().toISOString()
                                }
                            })];
                    case 2:
                        _a.sent();
                        console.log("\u23F0 S\u00E9quence d'appel programm\u00E9e pour ".concat(callSessionId, " dans ").concat(sanitizedDelay, " minutes"));
                        timeout = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        this.scheduledCalls.delete(callSessionId);
                                        return [4 /*yield*/, this.executeScheduledCall(callSessionId)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, sanitizedDelay * 60 * 1000);
                        this.scheduledCalls.set(callSessionId, timeout);
                        this.stats.totalScheduled++;
                        return [3 /*break*/, 11];
                    case 3:
                        error_7 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:scheduleCallSequence', error_7)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 8, , 10]);
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(callSessionId, 'failed')];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: callSessionId,
                                status: 'sequence_failed',
                                retryCount: 0,
                                errorMessage: error_7 instanceof Error ? error_7.message : 'Unknown error'
                            })];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 8:
                        updateError_1 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:scheduleCallSequence:updateError', updateError_1)];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Exécute un appel programmé avec gestion de retry
     */
    CallSchedulerManager.prototype.executeScheduledCall = function (callSessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var retryCount, session, error_8, updateError_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        retryCount = 0;
                        _a.label = 1;
                    case 1:
                        if (!(retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS)) return [3 /*break*/, 10];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 9]);
                        console.log("\uD83D\uDE80 Ex\u00E9cution appel programm\u00E9: ".concat(callSessionId, " (tentative ").concat(retryCount + 1, "/").concat(SCHEDULER_CONFIG.RETRY_ATTEMPTS, ")"));
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.getCallSession(callSessionId)];
                    case 3:
                        session = _a.sent();
                        if (!session) {
                            console.warn("Session non trouv\u00E9e lors de l'ex\u00E9cution: ".concat(callSessionId));
                            return [2 /*return*/];
                        }
                        if (session.status !== 'pending') {
                            console.log("Session ".concat(callSessionId, " status changed to ").concat(session.status, ", arr\u00EAt de l'ex\u00E9cution"));
                            return [2 /*return*/];
                        }
                        // Utiliser le TwilioCallManager pour la gestion robuste des appels
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.initiateCallSequence(callSessionId, 0)];
                    case 4:
                        // Utiliser le TwilioCallManager pour la gestion robuste des appels
                        _a.sent();
                        console.log("\u2705 Appel initi\u00E9 avec succ\u00E8s: ".concat(callSessionId));
                        return [2 /*return*/];
                    case 5:
                        error_8 = _a.sent();
                        retryCount++;
                        return [4 /*yield*/, (0, logError_1.logError)("CallScheduler:executeScheduledCall:attempt_".concat(retryCount), error_8)];
                    case 6:
                        _a.sent();
                        if (!(retryCount < SCHEDULER_CONFIG.RETRY_ATTEMPTS)) return [3 /*break*/, 8];
                        console.log("\u23F3 Retry ".concat(retryCount, "/").concat(SCHEDULER_CONFIG.RETRY_ATTEMPTS, " pour ").concat(callSessionId, " dans ").concat(SCHEDULER_CONFIG.RETRY_DELAY_MS, "ms"));
                        return [4 /*yield*/, this.delay(SCHEDULER_CONFIG.RETRY_DELAY_MS * retryCount)];
                    case 7:
                        _a.sent(); // Délai progressif
                        _a.label = 8;
                    case 8: return [3 /*break*/, 9];
                    case 9: return [3 /*break*/, 1];
                    case 10:
                        // Toutes les tentatives ont échoué
                        console.error("\u274C \u00C9chec de toutes les tentatives pour ".concat(callSessionId));
                        _a.label = 11;
                    case 11:
                        _a.trys.push([11, 14, , 16]);
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(callSessionId, 'failed')];
                    case 12:
                        _a.sent();
                        this.stats.failedToday++;
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: callSessionId,
                                status: 'sequence_failed_all_retries',
                                retryCount: SCHEDULER_CONFIG.RETRY_ATTEMPTS
                            })];
                    case 13:
                        _a.sent();
                        return [3 /*break*/, 16];
                    case 14:
                        updateError_2 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:executeScheduledCall:finalUpdate', updateError_2)];
                    case 15:
                        _a.sent();
                        return [3 /*break*/, 16];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Annule un appel programmé
     */
    CallSchedulerManager.prototype.cancelScheduledCall = function (callSessionId, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var timeout, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 5]);
                        timeout = this.scheduledCalls.get(callSessionId);
                        if (timeout) {
                            clearTimeout(timeout);
                            this.scheduledCalls.delete(callSessionId);
                            console.log("\uD83D\uDEAB Planification annul\u00E9e pour: ".concat(callSessionId));
                        }
                        // Utiliser TwilioCallManager pour annuler la session
                        return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.cancelCallSession(callSessionId, reason, 'scheduler')];
                    case 1:
                        // Utiliser TwilioCallManager pour annuler la session
                        _a.sent();
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: callSessionId,
                                status: "call_cancelled_".concat(reason),
                                retryCount: 0,
                            })];
                    case 2:
                        _a.sent();
                        console.log("\u2705 Appel annul\u00E9: ".concat(callSessionId, ", raison: ").concat(reason));
                        return [3 /*break*/, 5];
                    case 3:
                        error_9 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('CallScheduler:cancelScheduledCall', error_9)];
                    case 4:
                        _a.sent();
                        throw error_9;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Obtient les statistiques du scheduler
     */
    CallSchedulerManager.prototype.getStats = function () {
        return __assign({}, this.stats);
    };
    /**
     * Ferme proprement le scheduler
     */
    CallSchedulerManager.prototype.shutdown = function () {
        console.log('🔄 Arrêt du CallScheduler...');
        // Arrêter le health check
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        // Annuler tous les appels programmés
        for (var _i = 0, _a = this.scheduledCalls.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], sessionId = _b[0], timeout = _b[1];
            clearTimeout(timeout);
            console.log("\uD83D\uDEAB Appel programm\u00E9 annul\u00E9 lors de l'arr\u00EAt: ".concat(sessionId));
        }
        this.scheduledCalls.clear();
        console.log('✅ CallScheduler arrêté proprement');
    };
    CallSchedulerManager.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return CallSchedulerManager;
}());
// Instance singleton du scheduler
var callSchedulerManager = new CallSchedulerManager();
exports.callSchedulerManager = callSchedulerManager;
/**
 * Fonction principale pour programmer une séquence d'appel
 */
var scheduleCallSequence = function (callSessionId_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([callSessionId_1], args_1, true), void 0, function (callSessionId, delayMinutes) {
        if (delayMinutes === void 0) { delayMinutes = SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES; }
        return __generator(this, function (_a) {
            return [2 /*return*/, callSchedulerManager.scheduleCallSequence(callSessionId, delayMinutes)];
        });
    });
};
exports.scheduleCallSequence = scheduleCallSequence;
/**
 * 🔧 FIX CRITIQUE: Fonction pour créer et programmer un nouvel appel - MONTANT EN EUROS
 */
var createAndScheduleCall = function (params) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId_1, expectedAmountEuros, tolerance, callSession, delayMinutes_1, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 5]);
                sessionId_1 = params.sessionId || "call_session_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                console.log("\uD83C\uDD95 Cr\u00E9ation et planification d'un nouvel appel: ".concat(sessionId_1));
                console.log("\uD83D\uDCB0 Montant: ".concat(params.amount, "\u20AC pour ").concat(params.serviceType));
                // 🔧 FIX: Valider les paramètres avec montants EN EUROS
                if (!params.providerId || !params.clientId || !params.providerPhone ||
                    !params.clientPhone || !params.paymentIntentId || !params.amount) {
                    throw new Error('Paramètres obligatoires manquants pour créer l\'appel');
                }
                // 🔧 FIX: Validation du montant EN EUROS
                if (params.amount < 5) { // 5€ minimum
                    throw new Error('Montant minimum de 5€ requis');
                }
                if (params.amount > 500) { // 500€ maximum
                    throw new Error('Montant maximum de 500€ dépassé');
                }
                expectedAmountEuros = params.serviceType === 'lawyer_call' ? 49 : 19;
                tolerance = 10;
                if (Math.abs(params.amount - expectedAmountEuros) > tolerance) {
                    console.warn("\u26A0\uFE0F Montant inhabituel: ".concat(params.amount, "\u20AC pour ").concat(params.serviceType, " (attendu: ").concat(expectedAmountEuros, "\u20AC)"));
                }
                // 🔧 FIX CRITIQUE: Conversion EN CENTIMES pour le TwilioCallManager et Stripe
                // 🔧 FIX CRITIQUE: GARDER LES EUROS - ne pas convertir en centimes ici !
                console.log('💰 Validation montant (GARDE EN EUROS):', {
                    amountInEuros: params.amount,
                    serviceType: params.serviceType,
                    expectedAmountEuros: expectedAmountEuros,
                    difference: params.amount - expectedAmountEuros
                });
                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.createCallSession({
                        sessionId: sessionId_1,
                        providerId: params.providerId,
                        clientId: params.clientId,
                        providerPhone: params.providerPhone,
                        clientPhone: params.clientPhone,
                        serviceType: params.serviceType,
                        providerType: params.providerType,
                        paymentIntentId: params.paymentIntentId,
                        amount: params.amount, // 🔧 FIX: GARDER EN EUROS - laisser TwilioCallManager gérer la conversion
                        requestId: params.requestId,
                        clientLanguages: params.clientLanguages,
                        providerLanguages: params.providerLanguages
                    })];
            case 1:
                callSession = _a.sent();
                delayMinutes_1 = params.delayMinutes || SCHEDULER_CONFIG.DEFAULT_DELAY_MINUTES;
                // Utiliser setImmediate pour éviter de bloquer la réponse
                setImmediate(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var error_11;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 4]);
                                return [4 /*yield*/, (0, exports.scheduleCallSequence)(sessionId_1, delayMinutes_1)];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 2:
                                error_11 = _a.sent();
                                return [4 /*yield*/, (0, logError_1.logError)('createAndScheduleCall:scheduleError', error_11)];
                            case 3:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); });
                return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                        callId: sessionId_1,
                        status: 'call_session_created',
                        retryCount: 0,
                        additionalData: {
                            serviceType: params.serviceType,
                            amountInEuros: params.amount, // Pour audit humain
                            // amountInCents supprimé - on garde tout en euros maintenant
                            delayMinutes: delayMinutes_1,
                            expectedAmountEuros: expectedAmountEuros,
                            amountDifferenceFromExpected: params.amount - expectedAmountEuros
                        }
                    })];
            case 2:
                _a.sent();
                console.log("\u2705 Appel cr\u00E9\u00E9 et programm\u00E9: ".concat(sessionId_1, " dans ").concat(delayMinutes_1, " minutes"));
                console.log("\uD83D\uDCB0 Validation finale: ".concat(params.amount, "\u20AC pour ").concat(params.serviceType, " (gard\u00E9 en euros)"));
                return [2 /*return*/, callSession];
            case 3:
                error_10 = _a.sent();
                return [4 /*yield*/, (0, logError_1.logError)('createAndScheduleCall:error', error_10)];
            case 4:
                _a.sent();
                throw error_10;
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.createAndScheduleCall = createAndScheduleCall;
/**
 * Fonction pour annuler un appel programmé
 */
var cancelScheduledCall = function (callSessionId, reason) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, callSchedulerManager.cancelScheduledCall(callSessionId, reason)];
    });
}); };
exports.cancelScheduledCall = cancelScheduledCall;
/**
 * Fonction pour reprendre les appels en attente au redémarrage
 */
var resumePendingCalls = function () { return __awaiter(void 0, void 0, void 0, function () {
    var now, fiveMinutesAgo, pendingSessions, resumePromises, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 5]);
                console.log('🔄 Récupération des appels en attente...');
                now = admin.firestore.Timestamp.now();
                fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
                return [4 /*yield*/, db.collection('call_sessions')
                        .where('status', 'in', ['pending', 'provider_connecting', 'client_connecting'])
                        .where('metadata.createdAt', '<=', fiveMinutesAgo)
                        .limit(50) // Limiter pour éviter la surcharge
                        .get()];
            case 1:
                pendingSessions = _a.sent();
                if (pendingSessions.empty) {
                    console.log('✅ Aucune session en attente à récupérer');
                    return [2 /*return*/];
                }
                console.log("\uD83D\uDD04 R\u00E9cup\u00E9ration de ".concat(pendingSessions.size, " sessions d'appel en attente"));
                resumePromises = pendingSessions.docs.map(function (doc) { return __awaiter(void 0, void 0, void 0, function () {
                    var sessionId, sessionData, paymentValid, error_13, updateError_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                sessionId = doc.id;
                                sessionData = doc.data();
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 7, , 14]);
                                return [4 /*yield*/, validatePaymentForResume(sessionData.payment.intentId)];
                            case 2:
                                paymentValid = _a.sent();
                                if (!!paymentValid) return [3 /*break*/, 4];
                                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.cancelCallSession(sessionId, 'payment_invalid', 'resume_service')];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                            case 4: 
                            // Relancer la séquence d'appel immédiatement
                            return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.initiateCallSequence(sessionId, 0)];
                            case 5:
                                // Relancer la séquence d'appel immédiatement
                                _a.sent();
                                return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                        callId: sessionId,
                                        status: 'call_resumed_after_restart',
                                        retryCount: 0,
                                    })];
                            case 6:
                                _a.sent();
                                console.log("\u2705 Session reprise: ".concat(sessionId));
                                return [3 /*break*/, 14];
                            case 7:
                                error_13 = _a.sent();
                                return [4 /*yield*/, (0, logError_1.logError)("resumePendingCalls:session_".concat(sessionId), error_13)];
                            case 8:
                                _a.sent();
                                _a.label = 9;
                            case 9:
                                _a.trys.push([9, 11, , 13]);
                                return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.updateCallSessionStatus(sessionId, 'failed')];
                            case 10:
                                _a.sent();
                                return [3 /*break*/, 13];
                            case 11:
                                updateError_3 = _a.sent();
                                return [4 /*yield*/, (0, logError_1.logError)("resumePendingCalls:updateStatus_".concat(sessionId), updateError_3)];
                            case 12:
                                _a.sent();
                                return [3 /*break*/, 13];
                            case 13: return [3 /*break*/, 14];
                            case 14: return [2 /*return*/];
                        }
                    });
                }); });
                return [4 /*yield*/, Promise.allSettled(resumePromises)];
            case 2:
                _a.sent();
                console.log("\u2705 R\u00E9cup\u00E9ration des sessions termin\u00E9e");
                return [3 /*break*/, 5];
            case 3:
                error_12 = _a.sent();
                return [4 /*yield*/, (0, logError_1.logError)('resumePendingCalls:error', error_12)];
            case 4:
                _a.sent();
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.resumePendingCalls = resumePendingCalls;
/**
 * Valide qu'un paiement est toujours valide pour reprise
 */
function validatePaymentForResume(paymentIntentId) {
    return __awaiter(this, void 0, void 0, function () {
        var paymentQuery, paymentData, validStatuses, error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    return [4 /*yield*/, db.collection('payments')
                            .where('stripePaymentIntentId', '==', paymentIntentId)
                            .limit(1)
                            .get()];
                case 1:
                    paymentQuery = _a.sent();
                    if (paymentQuery.empty) {
                        return [2 /*return*/, false];
                    }
                    paymentData = paymentQuery.docs[0].data();
                    validStatuses = ['pending', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture'];
                    return [2 /*return*/, validStatuses.includes(paymentData.status)];
                case 2:
                    error_14 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('validatePaymentForResume', error_14)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fonction de nettoyage des anciennes sessions
 */
var cleanupOldSessions = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (olderThanDays) {
        var result, error_15;
        if (olderThanDays === void 0) { olderThanDays = 30; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 4]);
                    console.log("\uD83E\uDDF9 Nettoyage des sessions de plus de ".concat(olderThanDays, " jours..."));
                    return [4 /*yield*/, TwilioCallManager_1.twilioCallManager.cleanupOldSessions({
                            olderThanDays: olderThanDays,
                            keepCompletedDays: 7, // Garder les complétées 7 jours
                            batchSize: 50
                        })];
                case 1:
                    result = _a.sent();
                    console.log("\u2705 Nettoyage termin\u00E9: ".concat(result.deleted, " supprim\u00E9es, ").concat(result.errors, " erreurs"));
                    return [3 /*break*/, 4];
                case 2:
                    error_15 = _a.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('cleanupOldSessions:error', error_15)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.cleanupOldSessions = cleanupOldSessions;
/**
 * 🔧 FIX: Fonction pour obtenir des statistiques sur les appels avec montants cohérents
 */
var getCallStatistics = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (periodDays) {
        var startDate, _a, schedulerStats, callStats, totalRevenueEuros_1, completedCallsWithRevenue_1, completedSessionsQuery, averageAmountEuros, error_16;
        if (periodDays === void 0) { periodDays = 7; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 5]);
                    startDate = admin.firestore.Timestamp.fromMillis(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
                    return [4 /*yield*/, Promise.all([
                            callSchedulerManager.getStats(),
                            TwilioCallManager_1.twilioCallManager.getCallStatistics({ startDate: startDate })
                        ])];
                case 1:
                    _a = _b.sent(), schedulerStats = _a[0], callStats = _a[1];
                    totalRevenueEuros_1 = 0;
                    completedCallsWithRevenue_1 = 0;
                    return [4 /*yield*/, db.collection('call_sessions')
                            .where('metadata.createdAt', '>=', startDate)
                            .where('status', '==', 'completed')
                            .where('payment.status', '==', 'captured')
                            .get()];
                case 2:
                    completedSessionsQuery = _b.sent();
                    completedSessionsQuery.docs.forEach(function (doc) {
                        var session = doc.data();
                        // Convertir depuis centimes vers euros si nécessaire
                        var amountInEuros = session.payment.amount; // Déjà en euros maintenant
                        totalRevenueEuros_1 += amountInEuros;
                        completedCallsWithRevenue_1++;
                    });
                    averageAmountEuros = completedCallsWithRevenue_1 > 0 ? totalRevenueEuros_1 / completedCallsWithRevenue_1 : 0;
                    return [2 /*return*/, {
                            scheduler: schedulerStats,
                            calls: {
                                total: callStats.total,
                                completed: callStats.completed,
                                failed: callStats.failed,
                                cancelled: callStats.cancelled,
                                averageDuration: callStats.averageDuration,
                                successRate: callStats.successRate,
                                totalRevenueEuros: totalRevenueEuros_1,
                                averageAmountEuros: averageAmountEuros
                            }
                        }];
                case 3:
                    error_16 = _b.sent();
                    return [4 /*yield*/, (0, logError_1.logError)('getCallStatistics:error', error_16)];
                case 4:
                    _b.sent();
                    throw error_16;
                case 5: return [2 /*return*/];
            }
        });
    });
};
exports.getCallStatistics = getCallStatistics;
/**
 * Gestionnaire pour l'arrêt propre du service
 */
var gracefulShutdown = function () {
    console.log('🔄 Arrêt gracieux du CallScheduler...');
    callSchedulerManager.shutdown();
};
exports.gracefulShutdown = gracefulShutdown;
// Gestionnaire de signaux pour arrêt propre
process.on('SIGTERM', exports.gracefulShutdown);
process.on('SIGINT', exports.gracefulShutdown);
