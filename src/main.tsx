import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupGlobalErrorLogging } from './utils/logging';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      availability: {
        status: {
          online: "Online",
          offline: "Offline"
        },
        actions: {
          goOnline: "Go online",
          goOffline: "Go offline"
        },
        errors: {
          notApproved: "Your profile is not approved yet.",
          updateFailed: "Failed to update your status.",
          syncFailed: "Error syncing your status."
        }
      },
      common: {
        refresh: "Refresh"
      }
    }
  },
  fr: {
    translation: {
      availability: {
        status: {
          online: "En ligne",
          offline: "Hors ligne"
        },
        actions: {
          goOnline: "Se rendre disponible",
          goOffline: "Se rendre indisponible"
        },
        errors: {
          notApproved: "Votre profil n'est pas encore approuvï¿½.",
          updateFailed: "ï¿½chec de la mise ï¿½ jour de votre statut.",
          syncFailed: "Erreur de synchronisation du statut."
        }
      },
      common: {
        refresh: "Rafraï¿½chir"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;


// Initialiser la capture d'erreurs globale
setupGlobalErrorLogging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>
);



