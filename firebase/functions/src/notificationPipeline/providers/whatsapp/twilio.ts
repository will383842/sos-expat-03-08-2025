import { getTwilioClient, getTwilioWhatsAppNumber } from "../../../lib/twilio";

export async function sendWhatsApp(to: string, text: string) {
  const client = getTwilioClient();
  const from = "whatsapp:" + getTwilioWhatsAppNumber();
  const res = await client.messages.create({
    to: "whatsapp:" + to,
    from,
    body: text,
  });
  return res.sid;
}
