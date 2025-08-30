"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWILIO_PHONE_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = void 0;
exports.getTwilioClient = getTwilioClient;
exports.getTwilioPhoneNumber = getTwilioPhoneNumber;
exports.getTwilioWhatsAppNumber = getTwilioWhatsAppNumber;
const twilio_1 = __importDefault(require("twilio"));
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SMS_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const WA_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
function getTwilioClient() {
    if (!ACCOUNT_SID || !AUTH_TOKEN) {
        throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
    }
    return (0, twilio_1.default)(ACCOUNT_SID, AUTH_TOKEN);
}
function getTwilioPhoneNumber() {
    if (!SMS_NUMBER)
        throw new Error("TWILIO_PHONE_NUMBER missing.");
    return SMS_NUMBER;
}
function getTwilioWhatsAppNumber() {
    if (!WA_NUMBER)
        throw new Error("TWILIO_WHATSAPP_NUMBER missing.");
    return WA_NUMBER;
}
/** Compat: certains fichiers importent encore ces constantes */
exports.TWILIO_ACCOUNT_SID = ACCOUNT_SID;
exports.TWILIO_AUTH_TOKEN = AUTH_TOKEN;
exports.TWILIO_PHONE_NUMBER = SMS_NUMBER;
//# sourceMappingURL=twilio.js.map