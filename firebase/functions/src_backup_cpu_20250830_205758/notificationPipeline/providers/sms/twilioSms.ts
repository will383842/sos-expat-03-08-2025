import { getTwilioClient, getTwilioPhoneNumber } from "../../../lib/twilio";

export async function sendSms(to: string, text: string) {
  const client = getTwilioClient();
  const from = getTwilioPhoneNumber();
  const res = await client.messages.create({ to, from, body: text });
  return res.sid; // messageId
}
