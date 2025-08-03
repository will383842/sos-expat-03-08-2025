import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Transporteur nodemailer configuré pour Zoho (SMTP sécurisé).
 * Les variables sont chargées depuis le fichier `.env`.
 */
export const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.eu',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_EMAIL || '',
    pass: process.env.ZOHO_PASS || '',
  },
});
