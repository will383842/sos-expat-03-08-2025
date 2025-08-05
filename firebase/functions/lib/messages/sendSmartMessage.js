"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSmartMessage = sendSmartMessage;
const twilio_1 = require("../lib/twilio");
async function sendSmartMessage({ toPhone, body, preferWhatsApp = true }) {
    try {
        if (preferWhatsApp) {
            return await twilio_1.twilioClient.messages.create({
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                to: `whatsapp:${toPhone}`,
                body
            });
        }
        else {
            return await twilio_1.twilioClient.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: toPhone,
                body
            });
        }
    }
    catch (err) {
        console.error('WhatsApp failed, fallback to SMS:', err);
        try {
            return await twilio_1.twilioClient.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: toPhone,
                body
            });
        }
        catch (smsErr) {
            console.error('SMS also failed:', smsErr);
            throw smsErr;
        }
    }
}
//# sourceMappingURL=sendSmartMessage.js.map