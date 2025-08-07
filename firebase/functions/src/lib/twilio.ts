import { Twilio } from 'twilio';

// 🔐 Lecture des variables d'environnement depuis votre .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// ✅ Mode build-safe : ne pas bloquer si les variables manquent au build
const isBuildTime = !accountSid && !authToken;

if (!isBuildTime) {
  // Validation seulement à l'exécution
  if (!accountSid || !authToken) {
    console.error('❌ Variables Twilio manquantes dans .env:', { 
      hasSid: !!accountSid, 
      hasToken: !!authToken
    });
    throw new Error('Variables d\'environnement Twilio manquantes: TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN requis');
  }

  if (!phoneNumber) {
    throw new Error('Variable d\'environnement TWILIO_PHONE_NUMBER manquante');
  }

  if (!phoneNumber.startsWith('+')) {
    throw new Error('TWILIO_PHONE_NUMBER doit être au format international (+33...)');
  }
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
  console.log('✅ Client Twilio initialisé avec succès depuis .env');
}

export default twilioClient;