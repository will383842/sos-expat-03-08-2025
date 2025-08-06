"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageManager = exports.MessageManager = void 0;
const admin = __importStar(require("firebase-admin"));
// SUPPRIMÉ : import { twilioClient } from './lib/twilio';
const logError_1 = require("./utils/logs/logError");
class MessageManager {
    constructor() {
        this.db = admin.firestore();
        this.templateCache = new Map();
        this.twilioClient = null; // Import dynamique
    }
    /**
     * 🔧 NOUVEAU : Initialisation lazy de Twilio (comme dans TwilioCallManager)
     */
    async getTwilioClient() {
        if (this.twilioClient) {
            return this.twilioClient;
        }
        // Valider l'environnement
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            throw new Error('Variables d\'environnement Twilio manquantes');
        }
        try {
            // Import dynamique de Twilio
            const twilioModule = await Promise.resolve().then(() => __importStar(require('twilio')));
            const twilio = twilioModule.default;
            this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            console.log('✅ Twilio client initialisé dans MessageManager');
            return this.twilioClient;
        }
        catch (error) {
            await (0, logError_1.logError)('MessageManager:getTwilioClient', error);
            throw new Error('Impossible d\'initialiser Twilio dans MessageManager');
        }
    }
    /**
     * Récupère un template depuis Firestore (avec cache)
     */
    async getTemplate(templateId) {
        if (this.templateCache.has(templateId)) {
            return this.templateCache.get(templateId);
        }
        try {
            const doc = await this.db.collection('message_templates').doc(templateId).get();
            if (!doc.exists) {
                console.warn(`Template non trouvé: ${templateId}`);
                return null;
            }
            const template = doc.data();
            // Cache pour 10 minutes
            this.templateCache.set(templateId, template);
            setTimeout(() => this.templateCache.delete(templateId), 10 * 60 * 1000);
            return template;
        }
        catch (error) {
            await (0, logError_1.logError)(`MessageManager:getTemplate:${templateId}`, error);
            return null;
        }
    }
    /**
     * Remplace les variables dans un template
     */
    interpolateTemplate(content, variables) {
        let result = content;
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });
        return result;
    }
    /**
     * Envoie un WhatsApp avec template
     */
    async sendWhatsApp(params) {
        try {
            const template = await this.getTemplate(params.templateId);
            if (!template || !template.isActive) {
                if (params.fallbackMessage) {
                    return await this.sendWhatsAppDirect(params.to, params.fallbackMessage);
                }
                throw new Error(`Template WhatsApp non disponible: ${params.templateId}`);
            }
            const message = this.interpolateTemplate(template.content, params.variables || {});
            return await this.sendWhatsAppDirect(params.to, message);
        }
        catch (error) {
            await (0, logError_1.logError)('MessageManager:sendWhatsApp', error);
            // Fallback vers SMS si WhatsApp échoue
            if (params.fallbackMessage) {
                return await this.sendSMS({
                    to: params.to,
                    templateId: params.templateId.replace('whatsapp_', 'sms_'),
                    variables: params.variables,
                    fallbackMessage: params.fallbackMessage
                });
            }
            return false;
        }
    }
    /**
     * Envoie un SMS avec template
     */
    async sendSMS(params) {
        try {
            const template = await this.getTemplate(params.templateId);
            if (!template || !template.isActive) {
                if (params.fallbackMessage) {
                    return await this.sendSMSDirect(params.to, params.fallbackMessage);
                }
                throw new Error(`Template SMS non disponible: ${params.templateId}`);
            }
            const message = this.interpolateTemplate(template.content, params.variables || {});
            return await this.sendSMSDirect(params.to, message);
        }
        catch (error) {
            await (0, logError_1.logError)('MessageManager:sendSMS', error);
            return false;
        }
    }
    /**
     * Envoie un appel vocal avec template
     */
    async sendVoiceCall(params) {
        try {
            const template = await this.getTemplate(params.templateId);
            if (!template || !template.isActive) {
                throw new Error(`Template vocal non disponible: ${params.templateId}`);
            }
            const message = this.interpolateTemplate(template.content, params.variables || {});
            const twiml = `
        <Response>
          <Say voice="alice" language="${params.language || 'fr-FR'}">${message}</Say>
        </Response>
      `;
            // 🔧 CHANGEMENT : Utiliser l'import dynamique
            const twilioClient = await this.getTwilioClient();
            await twilioClient.calls.create({
                to: params.to,
                from: process.env.TWILIO_PHONE_NUMBER,
                twiml: twiml,
                timeout: 30
            });
            return true;
        }
        catch (error) {
            await (0, logError_1.logError)('MessageManager:sendVoiceCall', error);
            return false;
        }
    }
    /**
     * FONCTION MANQUANTE - Envoie un appel de notification
     */
    async sendNotificationCall(phoneNumber, message) {
        try {
            // 🔧 CHANGEMENT : Utiliser l'import dynamique
            const twilioClient = await this.getTwilioClient();
            if (!process.env.TWILIO_PHONE_NUMBER) {
                throw new Error('Configuration Twilio manquante');
            }
            await twilioClient.calls.create({
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER,
                twiml: `<Response><Say voice="alice" language="fr-FR">${message}</Say></Response>`,
                timeout: 20
            });
            console.log(`✅ Appel de notification envoyé vers ${phoneNumber}`);
            return true;
        }
        catch (error) {
            console.warn(`❌ Échec notification call vers ${phoneNumber}:`, error);
            // Essayer SMS en fallback
            try {
                await this.sendSMSDirect(phoneNumber, message);
                console.log(`✅ SMS fallback envoyé vers ${phoneNumber}`);
                return true;
            }
            catch (smsError) {
                console.warn(`❌ Échec SMS fallback vers ${phoneNumber}:`, smsError);
                await (0, logError_1.logError)('MessageManager:sendNotificationCall:fallback', smsError);
                return false;
            }
        }
    }
    /**
     * Méthodes privées pour envoi direct
     */
    async sendWhatsAppDirect(to, message) {
        try {
            if (!process.env.TWILIO_WHATSAPP_NUMBER) {
                throw new Error('Numéro WhatsApp Twilio non configuré');
            }
            // 🔧 CHANGEMENT : Utiliser l'import dynamique
            const twilioClient = await this.getTwilioClient();
            await twilioClient.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${to}`
            });
            return true;
        }
        catch (error) {
            await (0, logError_1.logError)('MessageManager:sendWhatsAppDirect', error);
            return false;
        }
    }
    async sendSMSDirect(to, message) {
        try {
            if (!process.env.TWILIO_PHONE_NUMBER) {
                throw new Error('Numéro SMS Twilio non configuré');
            }
            // 🔧 CHANGEMENT : Utiliser l'import dynamique
            const twilioClient = await this.getTwilioClient();
            await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to
            });
            return true;
        }
        catch (error) {
            await (0, logError_1.logError)('MessageManager:sendSMSDirect', error);
            return false;
        }
    }
    /**
     * Méthode intelligente avec fallback automatique
     */
    async sendSmartMessage(params) {
        if (params.preferWhatsApp !== false) {
            // Essayer WhatsApp d'abord
            const whatsappSuccess = await this.sendWhatsApp({
                to: params.to,
                templateId: `whatsapp_${params.templateId}`,
                variables: params.variables
            });
            if (whatsappSuccess) {
                return { success: true, channel: 'whatsapp' };
            }
        }
        // Fallback vers SMS
        const smsSuccess = await this.sendSMS({
            to: params.to,
            templateId: `sms_${params.templateId}`,
            variables: params.variables
        });
        return {
            success: smsSuccess,
            channel: smsSuccess ? 'sms' : 'failed'
        };
    }
    /**
     * Récupère un message TwiML pour les conférences
     */
    async getTwiMLMessage(templateId, variables) {
        const template = await this.getTemplate(templateId);
        if (!template || !template.isActive) {
            // Messages de fallback selon le templateId
            const fallbacks = {
                'voice_provider_welcome': 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter.',
                'voice_client_welcome': 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.'
            };
            return fallbacks[templateId] || 'Bonjour, mise en relation en cours.';
        }
        return this.interpolateTemplate(template.content, variables || {});
    }
}
exports.MessageManager = MessageManager;
// Instance singleton
exports.messageManager = new MessageManager();
//# sourceMappingURL=MessageManager.js.map