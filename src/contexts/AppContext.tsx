import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import {
  Service,
  AppSettings,
  Notification,
  EnhancedSettings
} from './types';
import { ensureCollectionsExist } from '../utils/firestore'; // ✅ Actif maintenant

interface AppContextType {
  services: Service[];
  settings: AppSettings;
  enhancedSettings: EnhancedSettings;
  notifications: Notification[];
  language: 'fr' | 'en';
  setLanguage: (lang: 'fr' | 'en') => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  getUnreadNotificationsCount: () => number;
  updateEnhancedSettings: (settings: Partial<EnhancedSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const [settings] = useState<AppSettings>({
    servicesEnabled: {
      lawyerCalls: true,
      expatCalls: true
    },
    pricing: {
      lawyerCall: 49,
      expatCall: 19
    },
    platformCommission: 0.15,
    maxCallDuration: 30,
    callTimeout: 30,
    supportedCountries: ['CA', 'UK', 'DE', 'ES', 'IT', 'BE', 'CH', 'LU', 'NL', 'AT'],
    supportedLanguages: ['fr', 'en']
  });

  const [enhancedSettings, setEnhancedSettings] = useState<EnhancedSettings>({
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    privacy: {
      profileVisibility: 'public',
      allowContact: true,
      showOnMap: true
    },
    language: {
      primary: 'fr',
      secondary: 'en',
      preferredCommunication: 'fr'
    },
    rateLimit: {
      apiCallsPerMinute: 60,
      lastApiCall: new Date(),
      callCount: 0
    },
    audit: {
      lastLogin: new Date(),
      lastProfileUpdate: new Date(),
      loginHistory: []
    }
  });

  useEffect(() => {
    const defaultServices: Service[] = [
      {
        id: 'lawyer_call',
        type: 'lawyer_call',
        name: 'Appel Avocat',
        price: 49,
        duration: 20,
        description: 'Consultation juridique urgente par téléphone avec avocat certifié',
        isActive: true
      },
      {
        id: 'expat_call',
        type: 'expat_call',
        name: 'Appel Expatrié',
        price: 19,
        duration: 30,
        description: 'Conseil pratique d\'un expatrié francophone qui connaît le pays',
        isActive: true
      }
    ];

    setServices(defaultServices);

    const savedLanguage = localStorage.getItem('sos_language') as 'fr' | 'en';
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []); // ✅ AJOUTÉ : Array de dépendances manquant

  const handleSetLanguage = (lang: 'fr' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('sos_language', lang);
  };

  const addNotification = (
    notification: Omit<Notification, 'id' | 'createdAt'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      isRead: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const getUnreadNotificationsCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  const updateEnhancedSettings = (partial: Partial<EnhancedSettings>) => {
    setEnhancedSettings(prev => ({
      ...prev,
      ...partial,
      notifications: partial.notifications
        ? { ...prev.notifications, ...partial.notifications }
        : prev.notifications,
      privacy: partial.privacy
        ? { ...prev.privacy, ...partial.privacy }
        : prev.privacy,
      language: partial.language
        ? { ...prev.language, ...partial.language }
        : prev.language,
      rateLimit: partial.rateLimit
        ? { ...prev.rateLimit, ...partial.rateLimit }
        : prev.rateLimit,
      audit: partial.audit ? { ...prev.audit, ...partial.audit } : prev.audit
    }));

    console.log('Settings updated:', {
      action: 'settings_updated',
      timestamp: new Date(),
      details: { settings: JSON.stringify(partial) }
    });
  };

  return (
    <AppContext.Provider
      value={{
        services,
        settings,
        enhancedSettings,
        notifications,
        language,
        setLanguage: handleSetLanguage,
        addNotification,
        markNotificationAsRead,
        getUnreadNotificationsCount,
        updateEnhancedSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;

