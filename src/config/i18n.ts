// src/config/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  fr: {
    translation: {
      "availability": {
        "reminderMessage": "N'oubliez pas que vous êtes en ligne !",
        "reminder": {
          "title": "Rappel de disponibilité",
          "message": "Vous êtes toujours en ligne. Souhaitez-vous rester disponible ?",
          "actions": {
            "stayOnline": "Je reste en ligne",
            "goOffline": "Passer hors ligne",
            "disableToday": "Ne plus me le rappeler aujourd'hui"
          }
        },
        "status": {
          "online": "En ligne",
          "offline": "Hors ligne"
        },
        "actions": {
          "goOnline": "Se mettre en ligne",
          "goOffline": "Se mettre hors ligne"
        },
        "errors": {
          "notApproved": "Votre profil n'est pas encore validé par l'administration.",
          "updateFailed": "Échec de la mise à jour du statut.",
          "syncFailed": "Échec de synchronisation avec Firestore."
        }
      },
      "common": {
        "refresh": "Rafraîchir"
      }
    }
  },
  en: {
    translation: {
      "availability": {
        "reminderMessage": "Don't forget you're online!",
        "reminder": {
          "title": "Availability Reminder",
          "message": "You’re still online. Would you like to stay available?",
          "actions": {
            "stayOnline": "Stay Online",
            "goOffline": "Go Offline",
            "disableToday": "Don't remind me today"
          }
        },
        "status": {
          "online": "Online",
          "offline": "Offline"
        },
        "actions": {
          "goOnline": "Go Online",
          "goOffline": "Go Offline"
        },
        "errors": {
          "notApproved": "Your profile has not yet been approved by the administration.",
          "updateFailed": "Failed to update status.",
          "syncFailed": "Failed to sync with Firestore."
        }
      },
      "common": {
        "refresh": "Refresh"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fr',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
