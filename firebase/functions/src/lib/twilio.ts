// firebase/functions/src/lib/twilio.ts
import { Twilio } from 'twilio';
import * as functions from 'firebase-functions';

// 🔐 Lecture depuis functions.config() (votre méthode actuelle)
const config = functions.config();

const accountSid = config.twilio?.account_sid;
const authToken = config.twilio?.auth_token;
const phoneNumber = config.twilio?.phone_number;
const whatsappNumber = config.twilio?.whatsapp_number;

console.log('🔍 Configuration Twilio détectée:', {
  hasAccountSid: !!accountSid,
  accountSidPreview: accountSid ? accountSid.substring(0, 8) + '...' : 'MANQUANT',
  hasAuthToken: !!authToken,
  phoneNumber: phoneNumber || 'MANQUANT',
  hasWhatsApp: !!whatsappNumber
});

// ✅ Mode build-safe : ne pas bloquer si les variables manquent au build
const isBuildTime = !accountSid && !authToken;

if (!isBuildTime) {
  // Validation seulement à l'exécution
  if (!accountSid || !authToken) {
    console.error('❌ Variables Twilio manquantes dans functions.config():', { 
      hasSid: !!accountSid, 
      hasToken: !!authToken,
      configKeys: Object.keys(config.twilio || {})
    });
    throw new Error('Configuration Twilio manquante: account_sid et auth_token requis');
  }

  if (!phoneNumber) {
    console.error('❌ twilio.phone_number manquant dans functions.config()');
    throw new Error('Configuration Twilio manquante: phone_number requis');
  }

  if (!phoneNumber.startsWith('+')) {
    throw new Error(`twilio.phone_number doit être au format international. Reçu: ${phoneNumber}`);
  }

  console.log('✅ Configuration Twilio valide depuis functions.config()');
} else {
  console.log('🔧 Mode build détecté - validation Twilio reportée à l\'exécution');
}

// 📞 Créer le client Twilio
export const twilioClient = new Twilio(
  accountSid || 'ACfake_build_placeholder', 
  authToken || 'fake_build_placeholder_token'
);

// 📱 Export des numéros
export const twilioPhoneNumber = phoneNumber || '+447427874305';
export const twilioWhatsAppNumber = whatsappNumber ? `whatsapp:${whatsappNumber}` : undefined;

if (!isBuildTime) {
  console.log('✅ Client Twilio initialisé avec functions.config()');
}

export default twilioClient;