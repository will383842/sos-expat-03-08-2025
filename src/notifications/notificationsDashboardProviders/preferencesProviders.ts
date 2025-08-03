export interface NotificationPreferences {
  enableSound: boolean;
  enableVoice: boolean;
  enableModal: boolean;
}

const STORAGE_KEY = 'notificationPreferences';

/**
 * Récupère les préférences de notification depuis le localStorage.
 * Si aucune préférence n’est enregistrée, retourne les valeurs par défaut.
 */
export const getNotificationPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') {
    return { enableSound: true, enableVoice: true, enableModal: true };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Erreur chargement préférences notifications:', err);
  }

  return { enableSound: true, enableVoice: true, enableModal: true };
};

/**
 * Sauvegarde les préférences de notification dans le localStorage.
 */
export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Erreur sauvegarde préférences notifications:', err);
  }
};
