// 📁 src/serveremails/sendContactReply.ts

import nodemailer from 'nodemailer';
import { contactReply } from './templates/contactReply';
import { saveContactReply } from './firebase/contactMessages';
import type { Request, Response } from 'express';

export const sendContactReplyHandler = async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  const { to, firstName, userMessage, adminReply, messageId } = req.body;

  if (!to || !firstName || !userMessage || !adminReply || !messageId) {
    return res.status(400).json({ success: false, error: 'Champs requis manquants' });
  }

  const htmlContent = contactReply({ firstName, userMessage, adminReply });

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL, // ✅ corrigé ici
        pass: process.env.ZOHO_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Ulixai Team - SOS Expat" <${process.env.ZOHO_EMAIL}>`, // ✅ corrigé ici
      to,
      subject: '📬 Réponse à votre message - SOS Expat',
      html: htmlContent,
    });

    await saveContactReply({
      messageId,
      to,
      firstName,
      userMessage,
      adminReply,
      sentSuccessfully: true,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    await saveContactReply({
      messageId,
      to,
      firstName,
      userMessage,
      adminReply,
      sentSuccessfully: false,
      errorMessage: err.message,
    });

    return res.status(500).json({ success: false, error: err.message });
  }
};
