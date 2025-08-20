// src/pages/CallCheckoutWrapper.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CallCheckout from './CallCheckout';
import { AlertCircle } from 'lucide-react';
import { Provider, normalizeProvider, createDefaultProvider } from '../types/provider';

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
  currency?: 'eur' | 'usd';
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
// i18n light
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
// Helpers
// —————————————————————————————————————————————————————
const reconstructServiceData = (provider: ProviderLike, currency?: 'eur' | 'usd'): ServiceData => {
  const providerRole: 'lawyer' | 'expat' =
    (provider.role || provider.type || provider.providerType || 'expat') as 'lawyer' | 'expat';

  // Valeurs provisoires (seront écrasées par la config Firestore via calculateServiceAmounts)
  const baseAmount = providerRole === 'lawyer' ? 49 : 19;
  const duration   = providerRole === 'lawyer' ? 20 : 30;
  const commissionAmount = providerRole === 'lawyer'
    ? (currency === 'usd' ? 25 : 19)
    : (currency === 'usd' ? 15 : 9);
  const providerAmount = Math.max(0, Math.round((baseAmount - commissionAmount) * 100) / 100);

  return {
    providerId: provider.id || provider.providerId || Math.random().toString(36).slice(2),
    serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
    providerRole,
    amount: baseAmount,
    duration,
    clientPhone: '',
    commissionAmount,
    providerAmount,
    currency,
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
    price: typeof bookingData.price === 'number' ? bookingData.price : (bookingData.providerType === 'lawyer' ? 49 : 19),
    duration: typeof bookingData.duration === 'number' ? bookingData.duration : (bookingData.providerType === 'lawyer' ? 20 : 30),
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

const reconstructServiceFromBooking = (
  bookingData: BookingData,
  currency?: 'eur' | 'usd'
): ServiceData => {
  const providerRole: 'lawyer' | 'expat' = (bookingData.providerType as 'lawyer' | 'expat') || 'expat';
  const baseAmount = providerRole === 'lawyer' ? 49 : 19;
  const duration   = providerRole === 'lawyer' ? 20 : 30;
  const commissionAmount = providerRole === 'lawyer'
    ? (currency === 'usd' ? 25 : 19)
    : (currency === 'usd' ? 15 : 9);
  const providerAmount = Math.max(0, Math.round((baseAmount - commissionAmount) * 100) / 100);

  return {
    providerId: bookingData.providerId || Math.random().toString(36).slice(2),
    serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
    providerRole,
    amount: baseAmount,
    duration,
    clientPhone: bookingData.clientPhone || '',
    commissionAmount,
    providerAmount,
    currency,
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

  // Devise sélectionnée (source d’autorité côté wrapper)
  const [selectedCurrency, setSelectedCurrency] = useState<'eur' | 'usd'>(() => {
    try {
      const fromSession = sessionStorage.getItem('selectedCurrency') as 'eur' | 'usd' | null;
      if (fromSession && (fromSession === 'eur' || fromSession === 'usd')) return fromSession;
    } catch { /* noop */ }
    try {
      const fromLocal = localStorage.getItem('preferredCurrency') as 'eur' | 'usd' | null;
      if (fromLocal && (fromLocal === 'eur' || fromLocal === 'usd')) return fromLocal;
    } catch { /* noop */ }
    return detectUserCurrency();
  });

  // Persistance immédiate
  useEffect(() => {
    try {
      sessionStorage.setItem('selectedCurrency', selectedCurrency);
      localStorage.setItem('preferredCurrency', selectedCurrency);
    } catch { /* noop */ }
    if (import.meta.env.DEV) {
      console.log('💱 [Wrapper] currency:', selectedCurrency);
    }
  }, [selectedCurrency]);

  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    provider: null,
    serviceData: null,
  });

  const locState = useMemo(() => location.state || null, [location.state]);

  const setCurrency = useCallback((cur?: string | null) => {
    if (!cur) return;
    const lc = cur.toLowerCase();
    if (lc === 'eur' || lc === 'usd') {
      setSelectedCurrency(lc);
    } else if (import.meta.env.DEV) {
      console.warn('[Wrapper] Ignoring unsupported currency:', cur);
    }
  }, []);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        if (import.meta.env.DEV) {
          console.log('🔍 CallCheckoutWrapper - providerId:', providerId);
        }

        // 1) location.state
        const stateProvider = locState?.selectedProvider || locState?.providerData || locState?.provider;
        const stateService = locState?.serviceData || locState?.service || locState?.bookingData;

        if (stateService && (stateService as ServiceData).currency) {
          setCurrency((stateService as ServiceData).currency as string);
        }

        if (stateProvider && (stateProvider as ProviderLike).id) {
          if (import.meta.env.DEV) console.log('✅ Provider via location.state');
          const normalized = normalizeProvider(stateProvider as Provider);
          const svc: ServiceData =
            (stateService as ServiceData | undefined) && (stateService as ServiceData).amount
              ? ({ ...(stateService as ServiceData), currency: (stateService as ServiceData).currency ?? selectedCurrency })
              : reconstructServiceData(normalized, selectedCurrency);
          setState({ isLoading: false, error: null, provider: normalized, serviceData: svc });
          return;
        }

        // 2) sessionStorage
        if (import.meta.env.DEV) console.log('🔎 sessionStorage…');
        let savedProviderData: Provider | null = null;
        let savedServiceData: ServiceData | null = null;

        try {
          const savedProvider = sessionStorage.getItem('selectedProvider');
          if (savedProvider) savedProviderData = JSON.parse(savedProvider) as Provider;
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse selectedProvider error', err);
        }

        try {
          const savedService = sessionStorage.getItem('serviceData');
          if (savedService) {
            const parsed = JSON.parse(savedService) as ServiceData;
            savedServiceData = { ...parsed, currency: parsed.currency ?? selectedCurrency };
            setCurrency(savedServiceData.currency || null);
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse serviceData error', err);
        }

        if (savedProviderData && (!providerId || savedProviderData.id === providerId)) {
          const normalized = normalizeProvider(savedProviderData);
          const svc = savedServiceData ?? reconstructServiceData(normalized, selectedCurrency);
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
              const reconstructedService = reconstructServiceFromBooking(bookingData, selectedCurrency);
              setState({ isLoading: false, error: null, provider: reconstructedProvider, serviceData: reconstructedService });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse bookingRequest error', err);
        }

        // 4) providerProfile
        try {
          const savedProviderProfile = sessionStorage.getItem('providerProfile');
          if (savedProviderProfile) {
            const profileData = JSON.parse(savedProviderProfile) as Provider;
            if (!providerId || profileData.id === providerId) {
              const normalized = normalizeProvider(profileData);
              const reconstructedService = reconstructServiceData(normalized, selectedCurrency);
              setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructedService });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse providerProfile error', err);
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
                const reconstructedService = reconstructServiceData(normalized, selectedCurrency);
                setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructedService });
                return;
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) console.error(`[Wrapper] parse ${key} error`, err);
          }
        }

        // 6) history.state
        try {
          const historyState = window.history.state as RouterState;
          const historyProvider = historyState?.selectedProvider || historyState?.provider || historyState?.providerData;
          if (historyProvider && (historyProvider as ProviderLike).id && (!providerId || (historyProvider as ProviderLike).id === providerId)) {
            const normalized = normalizeProvider(historyProvider as Provider);
            setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructServiceData(normalized, selectedCurrency) });
            return;
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] read history.state error', err);
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
                setState({ isLoading: false, error: null, provider: normalized, serviceData: reconstructServiceData(normalized, selectedCurrency) });
                return;
              }
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse localStorage provider error', err);
        }

        // 8) paramètres URL
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const providerParam = urlParams.get('provider');
          const serviceParam = urlParams.get('service');
          const currencyParam = urlParams.get('currency'); // ex: ?currency=usd
          if (currencyParam) setCurrency(currencyParam);

          if (providerParam) {
            const providerData = JSON.parse(decodeURIComponent(providerParam)) as Provider;
            if (providerData && providerData.id && (!providerId || providerData.id === providerId)) {
              const normalized = normalizeProvider(providerData);
              const svc = serviceParam
                ? ({ ...(JSON.parse(decodeURIComponent(serviceParam)) as ServiceData), currency: selectedCurrency })
                : reconstructServiceData(normalized, selectedCurrency);
              setState({ isLoading: false, error: null, provider: normalized, serviceData: svc });
              return;
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error('[Wrapper] parse URL params error', err);
        }

        // 9) fallback avec providerId
        if (providerId) {
          const defaultProvider = createDefaultProvider(providerId);
          setState({
            isLoading: false,
            error: null,
            provider: defaultProvider,
            serviceData: reconstructServiceData(defaultProvider, selectedCurrency),
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
        if (import.meta.env.DEV) console.error('❌ loadData error', err);
        setState({
          isLoading: false,
          error: t('error.body'),
          provider: null,
          serviceData: null,
        });
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locState, providerId, t]);

  // 🔥 Recalcul ADMIN (totaux + FRAIS) selon la devise sélectionnée
  useEffect(() => {
    if (!state.provider || !state.serviceData || state.isLoading) return;
    const role = (state.provider.role || state.provider.type || 'expat') as 'lawyer' | 'expat';

    (async () => {
      try {
        if (import.meta.env.DEV) {
          console.log(`🔄 [Wrapper] Recalcul admin ${role} en ${selectedCurrency.toUpperCase()}`);
        }
        const p = await calculateServiceAmounts(role, selectedCurrency);
        setState(prev => ({
          ...prev,
          serviceData: prev.serviceData
            ? {
                ...prev.serviceData,
                amount: p.totalAmount,
                duration: p.duration,
                commissionAmount: p.connectionFeeAmount,
                providerAmount: p.providerAmount,
                currency: (p.currency as 'eur' | 'usd'),
              }
            : prev.serviceData,
        }));
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[CallCheckoutWrapper] Pricing admin indisponible, on garde le secours local.', e);
        }
        // On garde la version existante, mais on force la currency si absente
        setState(prev => ({
          ...prev,
          serviceData: prev.serviceData
            ? {
                ...prev.serviceData,
                currency: prev.serviceData.currency ?? selectedCurrency,
              }
            : prev.serviceData,
        }));
      }
    })();
  }, [state.provider, state.serviceData, state.isLoading, selectedCurrency]);

  // Sauvegarde session (utile pour CallCheckout et retours)
  useEffect(() => {
    if (state.provider && state.serviceData && !state.isLoading && !state.error) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(state.provider));
        sessionStorage.setItem('serviceData', JSON.stringify(state.serviceData));
        localStorage.setItem('lastSelectedProvider', JSON.stringify(state.provider));
        localStorage.setItem('lastServiceData', JSON.stringify(state.serviceData));
      } catch (err) {
        if (import.meta.env.DEV) console.error('[Wrapper] persist provider/service error', err);
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
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Données manquantes</h2>
          <p className="text-gray-600 text-sm mb-5">
            {state.error || 'Les informations de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.'}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/experts')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              🔍 Sélectionner un expert
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              🏠 Retour à l’accueil
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={() => {
                try { sessionStorage.clear(); localStorage.clear(); } catch { /* noop */ }
                finally { window.location.reload(); }
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg text-sm transition-colors"
            >
              🗑️ Vider le cache et recharger
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
      serviceData={state.serviceData} // contient currency
      onGoBack={handleGoBack}
    />
  );
};

export default CallCheckoutWrapper;
