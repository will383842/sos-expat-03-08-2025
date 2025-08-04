"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyClientVoice = notifyClientVoice;
const buildVoiceMessage_1 = require("./buildVoiceMessage");
const twilio_1 = require("../../lib/twilio");
async function notifyClientVoice(to, text) {
    await twilio_1.twilioClient.calls.create({
        twiml: (0, buildVoiceMessage_1.buildVoiceMessage)(text),
        to,
        from: process.env.TWILIO_PHONE_NUMBER
    });
}
//# sourceMappingURL=notifyClientVoice.js.map