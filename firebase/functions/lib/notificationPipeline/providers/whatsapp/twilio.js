"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = sendWhatsApp;
const twilio_1 = require("../../../lib/twilio");
async function sendWhatsApp(to, text) {
    const client = (0, twilio_1.getTwilioClient)();
    const from = "whatsapp:" + (0, twilio_1.getTwilioWhatsAppNumber)();
    const res = await client.messages.create({
        to: "whatsapp:" + to,
        from,
        body: text,
    });
    return res.sid;
}
//# sourceMappingURL=twilio.js.map