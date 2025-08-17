"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
var nodemailer_1 = require("nodemailer");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
/**
 * Transporteur nodemailer configuré pour Zoho (SMTP sécurisé).
 * Les variables sont chargées depuis le fichier `.env`.
 */
exports.transporter = nodemailer_1.default.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
        user: process.env.ZOHO_EMAIL || '',
        pass: process.env.ZOHO_PASS || '',
    },
});
