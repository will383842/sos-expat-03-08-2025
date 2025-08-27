// firebase/functions/src/lib/twilio.ts
import { Twilio } from 'twilio';
import { defineSecret } from 'firebase-functions/params';

// 🔐 Définir les secrets Firebase (nouvelle méthode)
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = defineSecret('TWILIO_PHONE_NUMBER');
const TWILIO_WHATSAPP_NUMBER = defineSecret('TWILIO_WHATSAPP_NUMBER');

// Mode développement : permettre l'utilisation de process.env comme fallback
const isDevelopment = process.env.NODE_ENV !== 'production';

let twilioClientInstance: Twilio | null = null;
let phoneNumberCache: string | null = null;
let whatsappNumberCache: string | null = null;

// Fonction d'initialisation lazy pour éviter les erreurs au build
export function getTwilioClient(): Twilio {
  if (!twilioClientInstance) {
    let accountSid: string;
    let authToken: string;

    try {
      accountSid = TWILIO_ACCOUNT_SID.value();
      authToken = TWILIO_AUTH_TOKEN.value();
    } catch (error) {
      if (isDevelopment) {
        // Fallback vers process.env en développement
        accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACfake_build_placeholder';
        authToken = process.env.TWILIO_AUTH_TOKEN || 'fake_build_placeholder_token';
        console.log('🔧 Développement: utilisation de process.env pour Twilio');
      } else {
        console.error('❌ Secrets Twilio non configurés');
        throw new Error('Configuration Twilio manquante: secrets non définis');
      }
    }

    if (!accountSid || accountSid.startsWith('ACfake') || !authToken || authToken.startsWith('fake')) {
      throw new Error('Configuration Twilio invalide');
    }

    twilioClientInstance = new Twilio(accountSid, authToken);
    console.log('✅ Client Twilio initialisé avec secrets');
  }
  
  return twilioClientInstance;
}

export function getTwilioPhoneNumber(): string {
  if (!phoneNumberCache) {
    try {
      phoneNumberCache = TWILIO_PHONE_NUMBER.value();
    } catch (error) {
      if (isDevelopment) {
        phoneNumberCache = process.env.TWILIO_PHONE_NUMBER || '+447427874305';
        console.log('🔧 Développement: utilisation de process.env pour numéro');
      } else {
        throw new Error('Numéro Twilio non configuré');
      }
    }

    if (!phoneNumberCache?.startsWith('+')) {
      throw new Error(`Numéro Twilio doit être au format international. Reçu: ${phoneNumberCache}`);
    }
  }
  
  return phoneNumberCache;
}

export function getTwilioWhatsAppNumber(): string | undefined {
  if (!whatsappNumberCache) {
    try {
      const number = TWILIO_WHATSAPP_NUMBER.value();
      whatsappNumberCache = number ? `whatsapp:${number}` : undefined;
    } catch (error) {
      // WhatsApp optionnel
      if (isDevelopment) {
        const envNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        whatsappNumberCache = envNumber ? `whatsapp:${envNumber}` : undefined;
      }
    }
  }
  
  return whatsappNumberCache;
}

// Exports compatibles avec votre code existant
export const twilioClient = getTwilioClient();
export const twilioPhoneNumber = getTwilioPhoneNumber();
export const twilioWhatsAppNumber = getTwilioWhatsAppNumber();

// Export des secrets pour d'autres fonctions qui en auraient besoin
export { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER };

export default twilioClient;