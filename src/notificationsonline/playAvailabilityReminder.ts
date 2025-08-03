import voiceMessages from './voiceTranslateMessages';

// Clés pour le localStorage
const LAST_VOICE_KEY = 'lastVoiceReminderTimestamp';
const LAST_SOUND_KEY = 'lastSoundReminderTimestamp';

// Délai entre les rappels (en ms)
const VOICE_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
const SOUND_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Joue une notification sonore OU vocale personnalisée, en fonction du délai écoulé.
 *
 * @param langCode - Code ISO de la langue (ex: 'fr', 'en', 'es', etc.)
 */
import { NotificationPreferences } from '../notifications/notificationsDashboardProviders/types';

export const playAvailabilityReminder = (
  langCode: string = 'fr',
  prefs: NotificationPreferences
) => {

  const now = Date.now();
  const lastVoice = parseInt(localStorage.getItem(LAST_VOICE_KEY) || '0', 10);
  const lastSound = parseInt(localStorage.getItem(LAST_SOUND_KEY) || '0', 10);

  const shouldPlayVoice = now - lastVoice > VOICE_INTERVAL_MS;
  const shouldPlaySound = now - lastSound > SOUND_INTERVAL_MS && !shouldPlayVoice;

  // 🔊 Joue le son toutes les 30 minutes (si pas de voix à jouer maintenant)
  if (prefs.enableSound && shouldPlaySound) {
    try {
      const audio = new Audio('/sounds/notification-online.wav');
      audio.volume = 0.3;
      audio.play().catch((err) => {
        console.error('Erreur lecture audio:', err);
      });
      localStorage.setItem(LAST_SOUND_KEY, now.toString());
    } catch (err) {
      console.error('Audio non supporté:', err);
    }
  }

  // 🗣️ Joue la voix toutes les 60 minutes
  if (prefs.enableVoice && shouldPlayVoice) {
    const messageToRead = voiceMessages[langCode] || voiceMessages['en'];
    const language = langCode === 'fr' ? 'fr-FR' : langCode === 'en' ? 'en-US' : langCode;

    if ('speechSynthesis' in window && messageToRead) {
      const utterance = new SpeechSynthesisUtterance(messageToRead);
      utterance.lang = language;
      utterance.volume = 0.4;
      utterance.rate = 1;

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('Erreur synthèse vocale:', err);
        }
      }, 800);
    }

    localStorage.setItem(LAST_VOICE_KEY, now.toString());
  }
};
