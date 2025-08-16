// src/pages/CallCheckoutWrapper.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CallCheckout from './CallCheckout';
import { AlertCircle } from 'lucide-react';
import { Provider, normalizeProvider, createDefaultProvider } from '../types/provider'; // ⚠️ casse unifiée: 'provider'

// ✅ PRICING (FRONT) — lit Firestore admin_config/pricing
import {
  calculateServiceAmounts,
  detectUserCurrency,
} from '../services/pricingService';

// —————————————————————————————————————————————————————
// Types
// —————————————————————————————————————————————————————
interface ServiceData {
  providerId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerRole: 'lawyer' | 'expat';
  amount: number;
  duration: number;
  clientPhone: string;
  commissionAmount: number;
  providerAmount: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  provider: Provider | null;
  serviceData: ServiceData | null;
}

type RouterState = {
  selectedProvider?: Provider;
  providerData?: Provider;
  provider?: Provider;
  serviceData?: ServiceData;
  service?: ServiceData;
  bookingData?: BookingData;
} | null;

type ProviderLike = Partial<Provider> & {
  id?: string;
  providerId?: string;
  role?: 'lawyer' | 'expat';
  type?: 'lawyer' | 'expat';
  providerType?: 'lawyer' | 'expat';
  price?: number;
  duration?: number;
};

interface BookingData {
  providerId?: string;
  providerName?: string;
  providerType?: 'lawyer' | 'expat';
  providerCountry?: string;
  providerAvatar?: string;
  providerPhone?: string;
  providerLanguages?: string[];
  price?: number;
  duration?: number;
  providerRating?: number;
  providerReviewCount?: number;
  providerSpecialties?: string[];
  clientPhone?: string;
}

// —————————————————————————————————————————————————————
// i18n light (aligné avec ce qu’on a fait côté pages)
// —————————————————————————————————————————————————————
import { useApp } from '../contexts/AppContext';

const useTranslation = () => {
  const { language } = useApp();
  const t = (key: string): string => {
    const tr: Record<string, Record<string, string>> = {
      'loading.title': { fr: 'Chargement', en: 'Loading' },
      'loading.subtitle': { fr: 'Préparation de votre consultation...', en: 'Preparing your consultation...' },
      'loading.progress': { fr: 'Recherche des données de consultation', en: 'Fetching consultation data' },
      'error.title': { fr: 'Données manquantes', en: 'Missing data' },
      'error.body': {
        fr: 'Les informations de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.',
        en: 'Consultation details are missing. Please select an expert again.',
      },
      'cta.select_expert': { fr: '🔍 Sélectionner un expert', en: '🔍 Choose an expert' },
      'cta.home': { fr: '🏠 Retour à l’accueil', en: '🏠 Back to home' },
      'cta.back': { fr: '← Retour', en: '← Back' },
      'cta.clear_cache': { fr: '🗑️ Vider le cache et recharger', en: '🗑️ Clear cache & reload' },
    };
    return tr[key]?.[language] ?? tr[key]?.fr ?? key;
  };
  return { t, language };
};

// —————————————————————————————————————————————————————
// Helpers (typés, sans any)
// —————————————————————————————————————————————————————
const reconstructServiceData = (provider: ProviderLike): ServiceData => {
  const providerRole: 'lawyer' | 'expat' =
    (provider.role || provider.type || provider.providerType || 'expat') as 'lawyer' | 'expat';

  // Valeurs provisoires (seront écrasées par la config Firestore juste après)
  const baseAmount =
    typeof provider.price === 'number'
      ? provider.price
      : providerRole === 'lawyer'
      ? 49
      : 19;

  const duration =
    typeof provider.duration === 'number'
      ? provider.duration
      : providerRole === 'lawyer'
      ? 20
      : 30;

  // Commission 20% (provisoire : remplacée par les montants admin s'ils existent)
  const commissionRate = 0.2;
  const commissionAmount = Math.round(baseAmount * commissionRate * 100) / 100;
  const providerAmount = Math.round((baseAmount - commissionAmount) * 100) / 100;

  return {
    providerId: provider.id || provider.providerId || Math.random().toString(36).slice(2),
    serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
    providerRole,
    amount: baseAmount,
    duration,
    clientPhone: '',
    commissionAmount,
    providerAmount,
  };
};

const reconstructProviderFromBooking = (bookingData: BookingData): Provider => {
  return normalizeProvider({
    id: bookingData.providerId || Math.random().toString(36).slice(2),
    name: bookingData.providerName || 'Expert',
    fullName: bookingData.providerName || 'Expert',
    firstName: '',
    lastName: '',
    role: (bookingData.providerType as 'lawyer' | 'expat') || 'expat',
    type: (bookingData.providerType as 'lawyer' | 'expat') || 'expat',
    country: bookingData.providerCountry || '',
    currentCountry: bookingData.providerCountry || '',
    avatar: bookingData.providerAvatar || '/default-avatar.png',
    profilePhoto: bookingData.providerAvatar || '/default-avatar.png',
    email: '',
    phone: bookingData.providerPhone || '',
    phoneNumber: bookingData.providerPhone || '',
    whatsapp: '',
    whatsAppNumber: '',
    languagesSpoken: bookingData.providerLanguages || [],
    languages: bookingData.providerLanguages || [],
    preferredLanguage: 'fr',
    price:
      typeof bookingData.price === 'number'
        ? bookingData.price
        : bookingData.providerType === 'lawyer'
        ? 49
        : 19,
    duration:
      typeof bookingData.duration === 'number'
        ? bookingData.duration
        : bookingData.providerType === 'lawyer'
        ? 20
        : 30,
    rating: bookingData.providerRating || 4.5,
    reviewCount: bookingData.providerReviewCount || 0,
    specialties: bookingData.providerSpecialties || [],
    description: '',
    bio: '',
    yearsOfExperience: 1,
    isActive: true,
    isApproved: true,
    isVisible: true,
    isBanned: false,
    isOnline: true,
  });
};

const reconstructServiceFromBooking = (bookingData: BookingData): ServiceData => {
  const providerRole: 'lawyer' | 'expat' = (bookingData.providerType as 'lawyer' | 'expat') || 'expat';
  const baseAmount =
    typeof bookingData.price === 'number' ? bookingData.price : providerRole === 'lawyer' ? 49 : 19;
  const duration =
    typeof bookingData.duration === 'number' ? bookingData.duration : providerRole === 'lawyer' ? 20 : 30;

  const commissionRate = 0.2;
  const commissionAmount = Math.round(baseAmount * commissionRate * 100) / 100;
  const providerAmount = Math.round((baseAmount - commissionAmount) * 100) / 100;

  return {
    providerId: bookingData.providerId || Math.random().toString(36).slice(2),
    serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
    providerRole,
    amount: baseAmount,
    duration,
    clientPhone: bookingData.clientPhone || '',
    commissionAmount,
    providerAmount,
  };
};

// —————————————————————————————————————————————————————
// Component
// —————————————————————————————————————————————————————
const CallCheckoutWrapper: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation() as { state: RouterState };
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId: string }>();

  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    provider: null,
    serviceData: null,
  });

  const locState = useMemo(() => location.state || null, [location.state]);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 CallCheckoutWrapper - providerId:', providerId);
        }

        // 1) location.state (plusieurs clés possibles)
        const stateProvider = locState?.selectedProvider || locState?.providerData || locState?.provider;
        const stateService = locState?.serviceData || locState?.service || locState?.bookingData;

        if (stateProvider && (stateProvider as ProviderLike).id) {
          if (process.env.NODE_ENV === 'development') console.log('✅ Provider via location.state');
          const normalized = normalizeProvider(stateProvider as Provider);
          const svc =
            (stateService as ServiceData | undefined) && (stateService as ServiceData).amount
              ? (stateService as ServiceData)
              : reconstructServiceData(normalized);
          setState({ isLoading: false, error: null, provider: normalized, serviceData: svc });
          return;
        }

        // 2) sessionStorage
        if (process.env.NODE_ENV === 'development') console.log('🔎 sessionStorage…');
        let savedProviderData: Provider | null = null;
        let savedServiceData: ServiceData | null = null;

        try {
          const savedProvider = sessionStorage.getItem('selectedProvider');
          if (savedProvider) savedProviderData = JSON.parse(savedProvider) as Provider;
        } catch (err) {
          console.error(err);
        }

        try {
          const savedService = sessionStorage.getItem('serviceData');
          if (savedService) savedServiceData = JSON.parse(savedService) as ServiceData;
        } catch (err) {
          console.error(err);
        }

        if (savedProviderData && (!providerId || savedProviderData.id === providerId)) {
          const normalized = normalizeProvider(savedProviderData);
          const svc = savedServiceData ?? reconstructServiceData(normalized);
          setState({ isLoading: false, error: null, provider: normalized, serviceData: svc });
          return;
        }

        // 3) bookingRequest
        try {
          const savedBookingRequest = sessionStorage.getItem('bookingRequest');
          if (savedBookingRequest) {
            const bookingData = JSON.parse(savedBookingRequest) as BookingData;
            if (!providerId || bookingData.providerId === providerId) {
              const reconstructedProvider = reconstructProviderFromBooking(bookingData);
              const reconstructedService = reconstructServiceFromBooking(bookingData);
              setState({ isLoading: false, error: null, provider: reconstructedProvider, serviceData: reconstructedService });
              return;
            }
          }
        } catch (err) {
          console.error(err);
        }

        // 4) providerProfile
        try {
          const savedProviderProfile = sessionStorage.getItem('providerProfile');
          if (savedProviderProfile) {
            const profileData = JSON.parse(savedProviderProfile) as Provider;
            if (!providerId || profileData.id === providerId) {
              const normalized = normalizeProvider(profileData);
              const reconstructedService = reconstructServiceData(normalized);
              setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructedService });
              return;
            }
          }
        } catch (err) {
          console.error(err);
        }

        // 5) autres clés sessionStorage
        const sessionStorageKeys = ['providerData', 'selectedExpert', 'expertData', 'consultationData', 'callData'] as const;
        for (const key of sessionStorageKeys) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data) as ProviderLike;
              if (parsed && (parsed.id || parsed.providerId) && (!providerId || parsed.id === providerId || parsed.providerId === providerId)) {
                const normalized = normalizeProvider(parsed as Provider);
                const reconstructedService = reconstructServiceData(normalized);
                setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructedService });
                return;
              }
            }
          } catch (err) {
            console.error(err);
          }
        }

        // 6) history.state
        try {
          const historyState = window.history.state as RouterState;
          const historyProvider = historyState?.selectedProvider || historyState?.provider || historyState?.providerData;
          if (historyProvider && (historyProvider as ProviderLike).id && (!providerId || (historyProvider as ProviderLike).id === providerId)) {
            const normalized = normalizeProvider(historyProvider as Provider);
            setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructServiceData(normalized) });
            return;
          }
        } catch (err) {
          console.error(err);
        }

        // 7) localStorage (backup)
        try {
          const localStorageKeys = ['lastSelectedProvider', 'recentProvider', 'currentProvider'] as const;
          for (const key of localStorageKeys) {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data) as Provider;
              if (parsed && parsed.id && (!providerId || parsed.id === providerId)) {
                const normalized = normalizeProvider(parsed);
                setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructServiceData(normalized) });
                return;
              }
            }
          }
        } catch (err) {
          console.error(err);
        }

        // 8) paramètres URL
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const providerParam = urlParams.get('provider');
          const serviceParam = urlParams.get('service');
          if (providerParam) {
            const providerData = JSON.parse(decodeURIComponent(providerParam)) as Provider;
            if (providerData && providerData.id && (!providerId || providerData.id === providerId)) {
              const normalized = normalizeProvider(providerData);
              const svc = serviceParam
                ? (JSON.parse(decodeURIComponent(serviceParam)) as ServiceData)
                : reconstructServiceData(normalized);
              setState({ isLoading: false, error: null, provider: normalized, serviceData: svc });
              return;
            }
          }
        } catch (err) {
          console.error(err);
        }

        // 9) fallback avec providerId => default provider
        if (providerId) {
          const defaultProvider = createDefaultProvider(providerId);
          setState({
            isLoading: false,
            error: null,
            provider: defaultProvider,
            serviceData: reconstructServiceData(defaultProvider),
          });
          return;
        }

        // 10) rien trouvé
        setState({
          isLoading: false,
          error: t('error.body'),
          provider: null,
          serviceData: null,
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('❌ loadData error', err);
        setState({
          isLoading: false,
          error: t('error.body'),
          provider: null,
          serviceData: null,
        });
      }
    };

    loadData();
  }, [locState, providerId, t]);

  // 🔥 Synchronisation immédiate avec la console d'admin (Firestore)
  // Dès qu'on connaît le provider, on écrase les montants/durée par ceux d'admin_config/pricing
  useEffect(() => {
    if (!state.provider || !state.serviceData || state.isLoading) return;
    const role = (state.provider.role || state.provider.type || 'expat') as 'lawyer' | 'expat';
    const currency = detectUserCurrency();

    (async () => {
      try {
        const p = await calculateServiceAmounts(role, currency);
        setState(prev =>
          prev && prev.serviceData
            ? {
                ...prev,
                serviceData: {
                  ...prev.serviceData,
                  amount: p.totalAmount,
                  duration: p.duration,
                  commissionAmount: p.connectionFeeAmount,
                  providerAmount: p.providerAmount,
                },
              }
            : prev
        );
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[CallCheckoutWrapper] Impossible de charger le pricing admin, on garde le fallback local.', e);
        }
      }
    })();
  }, [state.provider, state.serviceData, state.isLoading]);

  // Sauvegarde session (utile pour CallCheckout et retours)
  useEffect(() => {
    if (state.provider && state.serviceData && !state.isLoading && !state.error) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(state.provider));
        sessionStorage.setItem('serviceData', JSON.stringify(state.serviceData));
        localStorage.setItem('lastSelectedProvider', JSON.stringify(state.provider));
        localStorage.setItem('lastServiceData', JSON.stringify(state.serviceData));
      } catch (err) {
        console.error(err);
      }
    }
  }, [state.provider, state.serviceData, state.isLoading, state.error]);

  const handleGoBack = (): void => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // —————————————————————————————————————————————————————
  // UI States — mobile-first, i18n
  // —————————————————————————————————————————————————————
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8 text-center w-full max-w-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{t('loading.title')}</h2>
          <p className="text-gray-600 text-sm">{t('loading.subtitle')}</p>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('loading.progress')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.error || !state.provider || !state.serviceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8 text-center w-full max-w-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{t('error.title')}</h2>
          <p className="text-gray-600 text-sm mb-5">
            {state.error || t('error.body')}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/experts')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {t('cta.select_expert')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {t('cta.home')}
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {t('cta.back')}
            </button>
            <button
              onClick={() => {
                try {
                  sessionStorage.clear();
                  localStorage.clear();
                } finally {
                  window.location.reload();
                }
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-sm transition-colors"
            >
              {t('cta.clear_cache')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success — CallCheckout
  return (
    <CallCheckout
      selectedProvider={state.provider}
      serviceData={state.serviceData}
      onGoBack={handleGoBack}
    />
  );
};

export default CallCheckoutWrapper;
