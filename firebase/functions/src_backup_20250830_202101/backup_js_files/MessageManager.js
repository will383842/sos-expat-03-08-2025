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
exports.messageManager = exports.MessageManager = void 0;
var admin = require("firebase-admin");
var twilio_1 = require("./lib/twilio");
var logError_1 = require("./utils/logs/logError");
var MessageManager = /** @class */ (function () {
    function MessageManager() {
        this.db = admin.firestore();
        this.templateCache = new Map();
    }
    /**
     * Récupère un template depuis Firestore (avec cache)
     */
    MessageManager.prototype.getTemplate = function (templateId) {
        return __awaiter(this, void 0, void 0, function () {
            var doc, template, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.templateCache.has(templateId)) {
                            return [2 /*return*/, this.templateCache.get(templateId)];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 5]);
                        return [4 /*yield*/, this.db.collection('message_templates').doc(templateId).get()];
                    case 2:
                        doc = _a.sent();
                        if (!doc.exists) {
                            console.warn("Template non trouv\u00E9: ".concat(templateId));
                            return [2 /*return*/, null];
                        }
                        template = doc.data();
                        // Cache pour 10 minutes
                        this.templateCache.set(templateId, template);
                        setTimeout(function () { return _this.templateCache.delete(templateId); }, 10 * 60 * 1000);
                        return [2 /*return*/, template];
                    case 3:
                        error_1 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)("MessageManager:getTemplate:".concat(templateId), error_1)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remplace les variables dans un template
     */
    MessageManager.prototype.interpolateTemplate = function (content, variables) {
        var result = content;
        Object.entries(variables).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            var placeholder = "{".concat(key, "}");
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });
        return result;
    };
    /**
     * Envoie un WhatsApp avec template
     */
    MessageManager.prototype.sendWhatsApp = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var template, message, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 10]);
                        return [4 /*yield*/, this.getTemplate(params.templateId)];
                    case 1:
                        template = _a.sent();
                        if (!(!template || !template.isActive)) return [3 /*break*/, 4];
                        if (!params.fallbackMessage) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.sendWhatsAppDirect(params.to, params.fallbackMessage)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: throw new Error("Template WhatsApp non disponible: ".concat(params.templateId));
                    case 4:
                        message = this.interpolateTemplate(template.content, params.variables || {});
                        return [4 /*yield*/, this.sendWhatsAppDirect(params.to, message)];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        error_2 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('MessageManager:sendWhatsApp', error_2)];
                    case 7:
                        _a.sent();
                        if (!params.fallbackMessage) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.sendSMS({
                                to: params.to,
                                templateId: params.templateId.replace('whatsapp_', 'sms_'),
                                variables: params.variables,
                                fallbackMessage: params.fallbackMessage
                            })];
                    case 8: return [2 /*return*/, _a.sent()];
                    case 9: return [2 /*return*/, false];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Envoie un SMS avec template
     */
    MessageManager.prototype.sendSMS = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var template, message, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 8]);
                        return [4 /*yield*/, this.getTemplate(params.templateId)];
                    case 1:
                        template = _a.sent();
                        if (!(!template || !template.isActive)) return [3 /*break*/, 4];
                        if (!params.fallbackMessage) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.sendSMSDirect(params.to, params.fallbackMessage)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: throw new Error("Template SMS non disponible: ".concat(params.templateId));
                    case 4:
                        message = this.interpolateTemplate(template.content, params.variables || {});
                        return [4 /*yield*/, this.sendSMSDirect(params.to, message)];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        error_3 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('MessageManager:sendSMS', error_3)];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Envoie un appel vocal avec template
     */
    MessageManager.prototype.sendVoiceCall = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var template, message, twiml, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 5]);
                        return [4 /*yield*/, this.getTemplate(params.templateId)];
                    case 1:
                        template = _a.sent();
                        if (!template || !template.isActive) {
                            throw new Error("Template vocal non disponible: ".concat(params.templateId));
                        }
                        message = this.interpolateTemplate(template.content, params.variables || {});
                        twiml = "\n        <Response>\n          <Say voice=\"alice\" language=\"".concat(params.language || 'fr-FR', "\">").concat(message, "</Say>\n        </Response>\n      ");
                        return [4 /*yield*/, twilio_1.twilioClient.calls.create({
                                to: params.to,
                                from: twilio_1.twilioPhoneNumber,
                                twiml: twiml,
                                timeout: 30
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_4 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('MessageManager:sendVoiceCall', error_4)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Envoie un appel de notification
     */
    MessageManager.prototype.sendNotificationCall = function (phoneNumber, message) {
        return __awaiter(this, void 0, void 0, function () {
            var error_5, smsError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 8]);
                        if (!process.env.TWILIO_PHONE_NUMBER) {
                            throw new Error('Configuration Twilio manquante');
                        }
                        return [4 /*yield*/, twilio_1.twilioClient.calls.create({
                                to: phoneNumber,
                                from: process.env.TWILIO_PHONE_NUMBER,
                                twiml: "<Response><Say voice=\"alice\" language=\"fr-FR\">".concat(message, "</Say></Response>"),
                                timeout: 20
                            })];
                    case 1:
                        _a.sent();
                        console.log("\u2705 Appel de notification envoy\u00E9 vers ".concat(phoneNumber));
                        return [2 /*return*/, true];
                    case 2:
                        error_5 = _a.sent();
                        console.warn("\u274C \u00C9chec notification call vers ".concat(phoneNumber, ":"), error_5);
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 7]);
                        return [4 /*yield*/, this.sendSMSDirect(phoneNumber, message)];
                    case 4:
                        _a.sent();
                        console.log("\u2705 SMS fallback envoy\u00E9 vers ".concat(phoneNumber));
                        return [2 /*return*/, true];
                    case 5:
                        smsError_1 = _a.sent();
                        console.warn("\u274C \u00C9chec SMS fallback vers ".concat(phoneNumber, ":"), smsError_1);
                        return [4 /*yield*/, (0, logError_1.logError)('MessageManager:sendNotificationCall:fallback', smsError_1)];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Méthodes privées pour envoi direct
     */
    MessageManager.prototype.sendWhatsAppDirect = function (to, message) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        if (!process.env.TWILIO_WHATSAPP_NUMBER) {
                            throw new Error('Numéro WhatsApp Twilio non configuré');
                        }
                        return [4 /*yield*/, twilio_1.twilioClient.messages.create({
                                body: message,
                                from: "whatsapp:".concat(process.env.TWILIO_WHATSAPP_NUMBER),
                                to: "whatsapp:".concat(to)
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_6 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('MessageManager:sendWhatsAppDirect', error_6)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MessageManager.prototype.sendSMSDirect = function (to, message) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        if (!process.env.TWILIO_PHONE_NUMBER) {
                            throw new Error('Numéro SMS Twilio non configuré');
                        }
                        return [4 /*yield*/, twilio_1.twilioClient.messages.create({
                                body: message,
                                from: process.env.TWILIO_PHONE_NUMBER,
                                to: to
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2:
                        error_7 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('MessageManager:sendSMSDirect', error_7)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Méthode intelligente avec fallback automatique
     */
    MessageManager.prototype.sendSmartMessage = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var whatsappSuccess, smsSuccess;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(params.preferWhatsApp !== false)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.sendWhatsApp({
                                to: params.to,
                                templateId: "whatsapp_".concat(params.templateId),
                                variables: params.variables
                            })];
                    case 1:
                        whatsappSuccess = _a.sent();
                        if (whatsappSuccess) {
                            return [2 /*return*/, { success: true, channel: 'whatsapp' }];
                        }
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.sendSMS({
                            to: params.to,
                            templateId: "sms_".concat(params.templateId),
                            variables: params.variables
                        })];
                    case 3:
                        smsSuccess = _a.sent();
                        return [2 /*return*/, {
                                success: smsSuccess,
                                channel: smsSuccess ? 'sms' : 'failed'
                            }];
                }
            });
        });
    };
    /**
     * Récupère un message TwiML pour les conférences
     */
    MessageManager.prototype.getTwiMLMessage = function (templateId, variables) {
        return __awaiter(this, void 0, void 0, function () {
            var template, fallbacks;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTemplate(templateId)];
                    case 1:
                        template = _a.sent();
                        if (!template || !template.isActive) {
                            fallbacks = {
                                'voice_provider_welcome': 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter.',
                                'voice_client_welcome': 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.'
                            };
                            return [2 /*return*/, fallbacks[templateId] || 'Bonjour, mise en relation en cours.'];
                        }
                        return [2 /*return*/, this.interpolateTemplate(template.content, variables || {})];
                }
            });
        });
    };
    return MessageManager;
}());
exports.MessageManager = MessageManager;
// Instance singleton
exports.messageManager = new MessageManager();
