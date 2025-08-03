import * as twilio from 'twilio';

const supportedLanguages = ['fr-FR', 'en-US', 'es-ES', 'de-DE', 'it-IT', 'pt-BR'] as const;
type SupportedLanguage = typeof supportedLanguages[number];

export function buildVoiceMessage(text: string, lang: string = 'fr'): string {
  const langCode = `${lang}-FR`.toLowerCase().replace('fr-fr', 'fr-FR') as SupportedLanguage;

  const finalLang = supportedLanguages.includes(langCode as SupportedLanguage)
    ? (langCode as SupportedLanguage)
    : 'fr-FR';

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ language: finalLang, voice: 'alice' }, text);
  return twiml.toString();
}
