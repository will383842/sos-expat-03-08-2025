// firebase/functions/src/lib/twilio.ts
import { Twilio } from 'twilio';
import { defineSecret } from 'firebase-functions/params';

// 🔐 Définition des secrets Firebase v2
export const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
export const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
export const TWILIO_PHONE_NUMBER = defineSecret('TWILIO_PHONE_NUMBER');
export const TWILIO_WHATSAPP_NUMBER = defineSecret('TWILIO_WHATSAPP_NUMBER');

// 💾 Cache pour les instances (lazy loading)
let _twilioClient: Twilio | null = null;
let _phoneNumber: string | null = null;
let _whatsappNumber: string | null = null;

/**
 * 🔄 Getter lazy pour le client Twilio
 * Initialise le client uniquement lors du premier appel
 */
export function getTwilioClient(): Twilio {
  if (!_twilioClient) {
    const accountSid = TWILIO_ACCOUNT_SID.value();
    const authToken = TWILIO_AUTH_TOKEN.value();
    
    if (!accountSid || !authToken) {
      throw new Error('Configuration Twilio manquante: ACCOUNT_SID ou AUTH_TOKEN non défini');
    }
    
    _twilioClient = new Twilio(accountSid, authToken);
    console.log('✅ Client Twilio initialisé avec secrets Firebase');
  }
  
  return _twilioClient;
}

/**
 * 📱 Getter lazy pour le numéro de téléphone Twilio
 * Valide le format international (+...)
 */
export function getTwilioPhoneNumber(): string {
  if (!_phoneNumber) {
    const number = TWILIO_PHONE_NUMBER.value();
    
    if (!number) {
      throw new Error('Numéro Twilio non configuré');
    }
    
    if (!number.startsWith('+')) {
      throw new Error(`Numéro Twilio doit être au format international. Reçu: ${number}`);
    }
    
    _phoneNumber = number;
    console.log('✅ Numéro Twilio configuré');
  }
  
  return _phoneNumber;
}

/**
 * 💬 Getter lazy pour le numéro WhatsApp (optionnel)
 * Retourne undefined si non configuré
 */
export function getTwilioWhatsAppNumber(): string | undefined {
  if (_whatsappNumber === null) {
    try {
      const number = TWILIO_WHATSAPP_NUMBER.value();
      _whatsappNumber = number ? `whatsapp:${number}` : '';
    } catch (error) {
      // WhatsApp est optionnel, pas d'erreur si non configuré
      _whatsappNumber = '';
      console.log('ℹ️ WhatsApp non configuré (optionnel)');
    }
  }
  
  return _whatsappNumber || undefined;
}

/**
 * 🔄 Fonction utilitaire pour réinitialiser le cache
 * Utile pour les tests ou la reconfiguration
 */
export function resetTwilioCache(): void {
  _twilioClient = null;
  _phoneNumber = null;
  _whatsappNumber = null;
  console.log('🔄 Cache Twilio réinitialisé');
}

// 📤 Exports par défaut pour compatibilité
export default getTwilioClient;