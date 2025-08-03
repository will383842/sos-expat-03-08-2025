// types.ts - À placer dans le dossier src/

// Type réutilisable pour toutes les langues supportées
type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'it' | 'ru' | 'zh';

export interface Service {
  id: string;
  type: 'lawyer_call' | 'expat_call';
  name: string;
  price: number;
  duration: number;
  description: string;
  isActive: boolean;
}

export interface AppSettings {
  servicesEnabled: {
    lawyerCalls: boolean;
    expatCalls: boolean;
  };
  pricing: {
    lawyerCall: number;
    expatCall: number;
  };
  platformCommission: number;
  maxCallDuration: number;
  callTimeout: number;
  supportedCountries: string[];
  supportedLanguages: SupportedLanguage[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
}

export interface EnhancedSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts';
    allowContact: boolean;
    showOnMap: boolean;
  };
  language: {
    primary: SupportedLanguage;
    secondary: SupportedLanguage;
    preferredCommunication: SupportedLanguage;
  };
  rateLimit: {
    apiCallsPerMinute: number;
    lastApiCall: Date;
    callCount: number;
  };
  audit: {
    lastLogin: Date;
    lastProfileUpdate: Date;
    loginHistory: Array<{
      timestamp: Date;
      ip?: string;
      device?: string;
    }>;
  };
}
// ✅ Type Review – pour les avis clients
export type Review = {
  id: string;
  clientName: string;
  clientCountry?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  serviceType?: 'lawyer_call' | 'expat_call';
  helpfulVotes?: number;
};
