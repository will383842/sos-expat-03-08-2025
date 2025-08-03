import express from 'express';
import { sendEmail } from '../services/emailSender';
// (optionnel) si tu veux envoyer via Brevo aussi :
import { sendWithBrevo } from '../services/sendWithBrevo';

const router = express.Router();

// Route standard avec nodemailer + Zoho
router.post('/send-email', async (req, res) => {
  const { to, subject, message } = req.body;

  try {
    await sendEmail(to, subject, message);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erreur Zoho SMTP :', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// (optionnel) Route avec Brevo API
router.post('/send-with-brevo', async (req, res) => {
  const { to, subject, htmlContent } = req.body;

  try {
    await sendWithBrevo(to, subject, htmlContent);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erreur Brevo API :', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
