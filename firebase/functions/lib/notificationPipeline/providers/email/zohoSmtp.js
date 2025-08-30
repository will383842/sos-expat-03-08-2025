"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendZoho = sendZoho;
const nodemailer_1 = __importDefault(require("nodemailer"));
const secrets_1 = require("../../../utils/secrets");
async function sendZoho(to, subject, html, text) {
    const transporter = nodemailer_1.default.createTransport({
        host: 'smtp.zoho.eu',
        port: 465,
        secure: true,
        auth: { user: secrets_1.EMAIL_USER.value(), pass: secrets_1.EMAIL_PASS.value() }
    });
    const info = await transporter.sendMail({
        from: `"SOS Expat" <${secrets_1.EMAIL_USER.value()}>`,
        to, subject, html, text
    });
    return info.messageId;
}
//# sourceMappingURL=zohoSmtp.js.map