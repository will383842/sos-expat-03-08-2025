import { twilioClient } from '../lib/twilio';

export async function sendSmartMessage({
  toPhone,
  body,
  preferWhatsApp = true
}: {
  toPhone: string;
  body: string;
  preferWhatsApp?: boolean;
}) {
  try {
    if (preferWhatsApp) {
      return await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${toPhone}`,
        body
      });
    } else {
      return await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toPhone,
        body
      });
    }
  } catch (err) {
    console.error('WhatsApp failed, fallback to SMS:', err);
    try {
      return await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toPhone,
        body
      });
    } catch (smsErr) {
      console.error('SMS also failed:', smsErr);
      throw smsErr;
    }
  }
}
