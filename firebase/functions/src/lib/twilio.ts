import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN as string;
const SMS_NUMBER  = process.env.TWILIO_PHONE_NUMBER as string;
const WA_NUMBER   = process.env.TWILIO_WHATSAPP_NUMBER as string;

export function getTwilioClient() {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
  }
  return twilio(ACCOUNT_SID, AUTH_TOKEN);
}

export function getTwilioPhoneNumber() {
  if (!SMS_NUMBER) throw new Error("TWILIO_PHONE_NUMBER missing.");
  return SMS_NUMBER;
}

export function getTwilioWhatsAppNumber() {
  if (!WA_NUMBER) throw new Error("TWILIO_WHATSAPP_NUMBER missing.");
  return WA_NUMBER;
}

/** Compat: certains fichiers importent encore ces constantes */
export const TWILIO_ACCOUNT_SID = ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN  = AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = SMS_NUMBER;
