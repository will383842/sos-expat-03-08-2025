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
exports.sendNotificationToProvider = void 0;
const admin = __importStar(require("firebase-admin"));
const logError_1 = require("../utils/logError");
const twilio_1 = require("../lib/twilio");
const db = admin.firestore();
const sendNotificationToProvider = async (data) => {
    const { type, recipientId, recipientEmail, recipientPhone, recipientName, recipientCountry, title, message, requestDetails, metadata, } = data;
    let status = 'success';
    let channel = 'whatsapp';
    try {
        // 1. Tentative d'envoi WhatsApp via Twilio
        try {
            await twilio_1.twilioClient.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${recipientPhone}`,
            });
            channel = 'whatsapp';
        }
        catch (whatsappError) {
            // 2. Fallback vers SMS si WhatsApp échoue
            console.warn('WhatsApp échoué, tentative SMS...', whatsappError);
            try {
                await twilio_1.twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: recipientPhone,
                });
                channel = 'sms';
            }
            catch (smsError) {
                console.error('SMS échoué aussi :', smsError);
                status = 'failed';
                await (0, logError_1.logError)('sendNotificationToProvider:smsFailed', {
                    recipientPhone,
                    smsError,
                });
            }
        }
        // 3. Journalisation Firestore
        await db.collection('notification_logs').add({
            type,
            recipientId,
            recipientEmail,
            recipientPhone,
            recipientName,
            recipientCountry,
            title,
            message,
            requestDetails,
            metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            channel,
            success: status === 'success',
        });
        return status === 'success';
    }
    catch (error) {
        console.error('Erreur globale sendNotificationToProvider :', error);
        await (0, logError_1.logError)('sendNotificationToProvider:error', { error, data });
        return false;
    }
};
exports.sendNotificationToProvider = sendNotificationToProvider;
//# sourceMappingURL=sendNotificationToProvider.js.map