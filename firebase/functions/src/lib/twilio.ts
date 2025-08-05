// functions/src/lib/twilio.ts

import * as functions from 'firebase-functions';
import twilio from 'twilio';

// On récupère les identifiants depuis Firebase Functions Config
const accountSid = functions.config().twilio.sid;
const authToken = functions.config().twilio.token;

if (!accountSid || !authToken) {
  throw new Error('Twilio SID ou Token manquant dans les config Firebase.');
}

// Création du client Twilio
export const twilioClient = twilio(accountSid, authToken);
