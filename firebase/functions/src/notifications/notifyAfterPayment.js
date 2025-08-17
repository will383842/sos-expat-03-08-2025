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
exports.notifyAfterPayment = void 0;
exports.notifyAfterPaymentInternal = notifyAfterPaymentInternal;
var callScheduler_1 = require("../callScheduler");
var firestore_1 = require("firebase-admin/firestore");
var https_1 = require("firebase-functions/v2/https");
var MessageManager_1 = require("../MessageManager");
// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
var CPU_OPTIMIZED_CONFIG = {
    memory: "128MiB",
    timeoutSeconds: 30,
    maxInstances: 5,
    minInstances: 0,
    concurrency: 10
};
var db = (0, firestore_1.getFirestore)();
// ✅ Fonction interne (pour usage depuis d'autres Cloud Functions comme les webhooks)
function notifyAfterPaymentInternal(callId) {
    return __awaiter(this, void 0, void 0, function () {
        var callDoc, callData, providerDoc, clientDoc, provider, client, messagePayload, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.collection('calls').doc(callId).get()];
                case 1:
                    callDoc = _a.sent();
                    callData = callDoc.data();
                    if (!callData)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.collection('users').doc(callData.providerId).get()];
                case 2:
                    providerDoc = _a.sent();
                    return [4 /*yield*/, db.collection('users').doc(callData.clientId).get()];
                case 3:
                    clientDoc = _a.sent();
                    provider = providerDoc.data();
                    client = clientDoc.data();
                    if (!provider || !client)
                        return [2 /*return*/];
                    messagePayload = {
                        title: callData.title,
                        language: Array.isArray(callData.clientLanguages) ? callData.clientLanguages[0] : 'fr',
                    };
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 7, , 8]);
                    // Envoi des notifications au prestataire
                    return [4 /*yield*/, MessageManager_1.messageManager.sendSmartMessage({
                            to: provider.phoneNumber,
                            templateId: 'provider_notification',
                            variables: {
                                requestTitle: callData.title || 'Consultation',
                                language: messagePayload.language
                            }
                        })];
                case 5:
                    // Envoi des notifications au prestataire
                    _a.sent();
                    // Envoi des notifications au client
                    return [4 /*yield*/, MessageManager_1.messageManager.sendSmartMessage({
                            to: client.phoneNumber,
                            templateId: 'client_notification',
                            variables: {
                                requestTitle: callData.title || 'Consultation',
                                language: messagePayload.language
                            }
                        })];
                case 6:
                    // Envoi des notifications au client
                    _a.sent();
                    console.log("\u2705 Notifications envoy\u00E9es via MessageManager pour callId: ".concat(callId));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error("\u274C Erreur lors de l'envoi des notifications pour callId ".concat(callId, ":"), error_1);
                    throw error_1;
                case 8: 
                // 🔁 Déclenche l'appel vocal entre client et prestataire dans 5 minutes
                return [4 /*yield*/, (0, callScheduler_1.scheduleCallSequence)(callData.sessionId || callId)];
                case 9:
                    // 🔁 Déclenche l'appel vocal entre client et prestataire dans 5 minutes
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ✅ Cloud Function (appelable depuis le frontend) - OPTIMISÉE CPU
exports.notifyAfterPayment = (0, https_1.onCall)(CPU_OPTIMIZED_CONFIG, // 🔧 FIX CRITIQUE: Configuration d'optimisation CPU
function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var callId, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Vérifier l'authentification
                if (!request.auth) {
                    throw new Error('L\'utilisateur doit être authentifié');
                }
                callId = request.data.callId;
                if (!callId) {
                    throw new Error('callId est requis');
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, notifyAfterPaymentInternal(callId)];
            case 2:
                _a.sent();
                return [2 /*return*/, {
                        success: true,
                        message: 'Notifications envoyées avec succès',
                        callId: callId
                    }];
            case 3:
                error_2 = _a.sent();
                console.error('❌ Erreur dans notifyAfterPayment Cloud Function:', error_2);
                throw new Error("Erreur lors de l'envoi des notifications: ".concat(error_2 instanceof Error ? error_2.message : 'Erreur inconnue'));
            case 4: return [2 /*return*/];
        }
    });
}); });
