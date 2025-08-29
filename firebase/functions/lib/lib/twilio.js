"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWILIO_WHATSAPP_NUMBER = exports.TWILIO_PHONE_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = void 0;
exports.getTwilioClient = getTwilioClient;
exports.getTwilioPhoneNumber = getTwilioPhoneNumber;
exports.getTwilioWhatsAppNumber = getTwilioWhatsAppNumber;
exports.resetTwilioCache = resetTwilioCache;
// firebase/functions/src/lib/twilio.ts
const twilio_1 = require("twilio");
const params_1 = require("firebase-functions/params");
// 🔐 Définition des secrets Firebase v2
exports.TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)('TWILIO_ACCOUNT_SID');
exports.TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)('TWILIO_AUTH_TOKEN');
exports.TWILIO_PHONE_NUMBER = (0, params_1.defineSecret)('TWILIO_PHONE_NUMBER');
exports.TWILIO_WHATSAPP_NUMBER = (0, params_1.defineSecret)('TWILIO_WHATSAPP_NUMBER');
// 💾 Cache pour les instances (lazy loading)
let _twilioClient = null;
let _phoneNumber = null;
let _whatsappNumber = null;
/**
 * 🔄 Getter lazy pour le client Twilio
 * Initialise le client uniquement lors du premier appel
 */
function getTwilioClient() {
    if (!_twilioClient) {
        const accountSid = exports.TWILIO_ACCOUNT_SID.value();
        const authToken = exports.TWILIO_AUTH_TOKEN.value();
        if (!accountSid || !authToken) {
            throw new Error('Configuration Twilio manquante: ACCOUNT_SID ou AUTH_TOKEN non défini');
        }
        _twilioClient = new twilio_1.Twilio(accountSid, authToken);
        console.log('✅ Client Twilio initialisé avec secrets Firebase');
    }
    return _twilioClient;
}
/**
 * 📱 Getter lazy pour le numéro de téléphone Twilio
 * Valide le format international (+...)
 */
function getTwilioPhoneNumber() {
    if (!_phoneNumber) {
        const number = exports.TWILIO_PHONE_NUMBER.value();
        if (!number) {
            throw new Error('Numéro Twilio non configuré');
        }
        if (!number.startsWith('+')) {
            throw new Error(`Numéro Twilio doit être au format international. Reçu: ${number}`);
        }
        _phoneNumber = number;
        console.log('✅ Numéro Twilio configuré');
    }
    return _phoneNumber;
}
/**
 * 💬 Getter lazy pour le numéro WhatsApp (optionnel)
 * Retourne undefined si non configuré
 */
function getTwilioWhatsAppNumber() {
    if (_whatsappNumber === null) {
        try {
            const number = exports.TWILIO_WHATSAPP_NUMBER.value();
            _whatsappNumber = number ? `whatsapp:${number}` : '';
        }
        catch (error) {
            // WhatsApp est optionnel, pas d'erreur si non configuré
            _whatsappNumber = '';
            console.log('ℹ️ WhatsApp non configuré (optionnel)');
        }
    }
    return _whatsappNumber || undefined;
}
/**
 * 🔄 Fonction utilitaire pour réinitialiser le cache
 * Utile pour les tests ou la reconfiguration
 */
function resetTwilioCache() {
    _twilioClient = null;
    _phoneNumber = null;
    _whatsappNumber = null;
    console.log('🔄 Cache Twilio réinitialisé');
}
// 📤 Exports par défaut pour compatibilité
exports.default = getTwilioClient;
//# sourceMappingURL=twilio.js.map