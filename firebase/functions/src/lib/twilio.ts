import { Twilio } from 'twilio';
import * as functions from 'firebase-functions';

// Récupérer la config Firebase Functions
const config = functions.config();

// Validation des variables d'environnement (avec tes noms)
if (!config.twilio?.sid || !config.twilio?.token) {
  throw new Error('Variables d\'environnement Twilio manquantes: twilio.sid et twilio.token requis');
}

if (!config.twilio?.from) {
  throw new Error('Variable d\'environnement twilio.from manquante');
}

// Validation du format
if (!config.twilio.from.startsWith('+')) {
  throw new Error('twilio.from doit être au format international (+33...)');
}

// Créer le client Twilio avec tes variables
export const twilioClient = new Twilio(
  config.twilio.sid,      // ← TON nom de variable
  config.twilio.token     // ← TON nom de variable
);

// Exporter aussi le numéro de téléphone pour les autres modules
export const twilioPhoneNumber = config.twilio.from;

console.log('✅ Client Twilio initialisé avec succès');

export default twilioClient;