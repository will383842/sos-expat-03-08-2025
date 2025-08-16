// src/pages/ProviderProfile.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Star,
  MapPin,
  Phone,
  Shield,
  Award,
  Globe,
  Users,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  GraduationCap,
  Briefcase,
  Languages as LanguagesIcon,
} from 'lucide-react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
  Timestamp as FsTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import {
  logAnalyticsEvent,
  getProviderReviews,
  incrementReviewHelpfulCount,
  reportReview,
  normalizeUserData,
} from '../utils/firestore';
import Reviews from '../components/review/Reviews';
import SEOHead from '../components/layout/SEOHead';
import { Review } from '../types';
import { formatLanguages } from '@/i18n';

// 👉 Ajout: service pricing (front) pour prix dynamiques
import { usePricingConfig, detectUserCurrency } from '../services/pricingService';

// Performance & constants
const IMAGE_SIZES = {
  AVATAR_MOBILE: 112, // w-28 h-28
  AVATAR_DESKTOP: 128, // w-32 h-32
  MODAL_MAX_WIDTH: 1200,
  MODAL_MAX_HEIGHT: 800,
} as const;

const ANIMATION_DURATIONS = {
  STATUS_TRANSITION: 500,
  LOADING_DELAY: 2500,
} as const;

const STORAGE_KEYS = {
  SELECTED_PROVIDER: 'selectedProvider',
} as const;

// i18n constants
const TEXTS = {
  fr: {
    loading: 'Chargement du profil...',
    notFound: 'Ce profil prestataire est introuvable. Redirection en cours...',
    backToExperts: 'Retour aux experts',
    certifiedLawyer: 'Avocat certifié',
    expertExpat: 'Expatrié expert',
    verified: 'Vérifié',
    online: 'EN LIGNE',
    offline: 'HORS LIGNE',
    yearsExperience: "ans d'expérience",
    yearsAsExpat: "ans d'expatriation",
    reviews: 'avis',
    share: 'Partager :',
    copyLink: 'Copier le lien',
    successRate: 'Taux de succès',
    availability: 'Disponibilité',
    completedCalls: 'Appels réalisés',
    bookNow: 'RÉSERVER MAINTENANT',
    unavailable: 'NON DISPONIBLE',
    availableNow: 'Expert disponible maintenant !',
    currentlyOffline: 'Expert actuellement hors ligne',
    securePayment: 'Paiement sécurisé • Satisfaction garantie',
    specialties: 'Spécialités',
    languages: 'Langues parlées',
    educationCertifications: 'Formation et certifications',
    expatExperience: "Expérience d'expatriation",
    customerReviews: 'Avis clients',
    loadingReviews: 'Chargement des avis...',
    stats: 'Statistiques',
    averageRating: 'Note moyenne',
    information: 'Informations',
    basedIn: 'Basé en',
    speaks: 'Parle',
    onlineNow: 'EN LIGNE MAINTENANT',
    verifiedExpert: 'Expert vérifié',
    linkCopied: 'Lien copié !',
    reportReason: 'Veuillez indiquer la raison du signalement :',
    reportThanks: "Merci pour votre signalement. Notre équipe va l'examiner.",
    close: 'Fermer',
    photoOf: 'Photo de',
    noSpecialties: 'Aucune spécialité renseignée.',
    yearsAbroad: "ans d'expatriation",
    in: 'en',
    experience: 'Expérience',
    years: 'ans',
    minutes: 'minutes',
    // 👉 Ajout
    memberSince: 'Inscrit depuis le',
  },
  en: {
    loading: 'Loading profile...',
    notFound: 'This provider profile was not found. Redirecting...',
    backToExperts: 'Back to experts',
    certifiedLawyer: 'Certified lawyer',
    expertExpat: 'Expert expat',
    verified: 'Verified',
    online: 'ONLINE',
    offline: 'OFFLINE',
    yearsExperience: 'years experience',
    yearsAsExpat: 'years as expat',
    reviews: 'reviews',
    share: 'Share:',
    copyLink: 'Copy link',
    successRate: 'Success rate',
    availability: 'Availability',
    completedCalls: 'Completed calls',
    bookNow: 'BOOK NOW',
    unavailable: 'UNAVAILABLE',
    availableNow: 'Expert available now!',
    currentlyOffline: 'Expert currently offline',
    securePayment: 'Secure payment • Satisfaction guaranteed',
    specialties: 'Specialties',
    languages: 'Languages',
    educationCertifications: 'Education & Certifications',
    expatExperience: 'Expat experience',
    customerReviews: 'Customer reviews',
    loadingReviews: 'Loading reviews...',
    stats: 'Stats',
    averageRating: 'Average rating',
    information: 'Information',
    basedIn: 'Based in',
    speaks: 'Speaks',
    onlineNow: 'ONLINE NOW',
    verifiedExpert: 'Verified expert',
    linkCopied: 'Link copied!',
    reportReason: 'Please enter a reason:',
    reportThanks: 'Thanks. Our team will review it.',
    close: 'Close',
    photoOf: 'Photo of',
    noSpecialties: 'No specialties provided.',
    yearsAbroad: 'years abroad',
    in: 'in',
    experience: 'Experience',
    years: 'yrs',
    minutes: 'minutes',
    // 👉 Ajout
    memberSince: 'Member since',
  },
} as const;

type TSLike = FsTimestamp | Date | null | undefined;

// Type definitions
interface LocalizedText {
  fr?: string;
  en?: string;
  [key: string]: string | undefined;
}

interface Education {
  institution?: string | LocalizedText;
  degree?: string | LocalizedText;
  year?: number;
  [key: string]: unknown;
}

interface Certification {
  name?: string | LocalizedText;
  issuer?: string | LocalizedText;
  year?: number;
  [key: string]: unknown;
}

interface User {
  id: string;
  [key: string]: unknown;
}

interface AuthUser extends User {
  uid?: string;
}

interface LocationState {
  selectedProvider?: Partial<SosProfile>;
  providerData?: Partial<SosProfile>;
  navigationSource?: string;
}

interface SosProfile {
  uid: string;
  id?: string;
  type: 'lawyer' | 'expat';
  fullName: string;
  firstName: string;
  lastName: string;
  slug?: string;
  country: string;
  city?: string;
  languages: string[];
  mainLanguage?: string;
  specialties: string[];
  helpTypes?: string[];
  description?: string | LocalizedText;
  professionalDescription?: string | LocalizedText;
  experienceDescription?: string | LocalizedText;
  motivation?: string | LocalizedText;
  bio?: string | LocalizedText;
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  yearsAsExpat?: number;
  isOnline?: boolean;
  isActive: boolean;
  isApproved: boolean;
  isVerified: boolean;
  isVisibleOnMap?: boolean;
  price?: number;
  duration?: number;
  education?: Education | Education[] | LocalizedText;
  certifications?: Certification | Certification[] | LocalizedText;
  lawSchool?: string | LocalizedText;
  graduationYear?: number;
  responseTime?: string;
  successRate?: number;
  totalCalls?: number;
  successfulCalls?: number;
  totalResponses?: number;
  totalResponseTime?: number;
  avgResponseTimeMs?: number;
  createdAt?: TSLike;
  updatedAt?: TSLike;
  lastSeen?: TSLike;
}

interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface OnlineStatus {
  isOnline: boolean;
  lastUpdate: Date | null;
  listenerActive: boolean;
  connectionAttempts: number;
}

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
  country?: string;
  language?: string;
  type?: string;
  slug?: string;
  profileId?: string;
  name?: string;
}

// Utility functions
const detectLanguage = (): 'fr' | 'en' => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }
  return 'en'; // fallback
};

const safeNormalize = (v?: string): string =>
  (v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getFirstString = (val: unknown, preferred?: string): string | undefined => {
  if (!val) return undefined;

  if (typeof val === 'string') {
    const s = val.trim();
    return s || undefined;
  }

  if (Array.isArray(val)) {
    const arr = val
      .map((x) => getFirstString(x, preferred))
      .filter((x): x is string => Boolean(x));
    return arr.length ? arr.join(', ') : undefined;
  }

  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;

    if (preferred && typeof obj[preferred] === 'string') {
      const s = (obj[preferred] as string).trim();
      if (s) return s;
    }

    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) {
        return v.trim();
      }
    }
  }

  return undefined;
};

const toArrayFromAny = (val: unknown, preferred?: string): string[] => {
  if (!val) return [];

  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'string' ? x : getFirstString(x, preferred) || ''))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof val === 'string') {
    return val
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    return Object.values(obj)
      .map((v) => (typeof v === 'string' ? v : getFirstString(v, preferred) || ''))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
};

const pickDescription = (p: Partial<SosProfile>, preferredLang?: string): string => {
  const chain = [
    getFirstString(p.description, preferredLang),
    getFirstString(p.bio, preferredLang),
    getFirstString(p.professionalDescription, preferredLang),
    getFirstString(p.experienceDescription, preferredLang),
  ];
  return chain.find(Boolean) || TEXTS[preferredLang as 'fr' | 'en']?.noSpecialties || 'No description available.';
};

const toStringFromAny = (val: unknown, preferred?: string): string | undefined =>
  getFirstString(val, preferred);

// 👉 Ajout: format date (FR/EN) pour "Inscrit depuis le …"
const formatJoinDate = (val: TSLike, lang: 'fr' | 'en'): string | undefined => {
  if (!val) return undefined;
  let d: Date | undefined;
  const anyVal = val as any;
  if (anyVal?.toDate && typeof anyVal.toDate === 'function') d = anyVal.toDate();
  else if (val instanceof Date) d = val;
  if (!d) return undefined;
  const fmt = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return fmt.format(d);
};

// Type guards
const isUser = (user: unknown): user is AuthUser => {
  return typeof user === 'object' && user !== null && 'id' in user;
};

const isLocationState = (state: unknown): state is LocationState => {
  return typeof state === 'object' && state !== null;
};

// Main component
const ProviderProfile: React.FC = () => {
  const params = useParams<RouteParams>();
  const { id, country: countryParam, language: langParam, type: typeParam } = params;
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useApp();

  // i18n detection: use app context first, then browser, fallback en
  const detectedLang = useMemo(() => {
    if (language === 'fr' || language === 'en') return language as 'fr' | 'en';
    return detectLanguage();
  }, [language]);

  const t = useCallback((key: keyof typeof TEXTS.fr): string => {
    return TEXTS[detectedLang]?.[key] || TEXTS.en[key] || key;
  }, [detectedLang]);

  const preferredLangKey = detectedLang === 'fr' ? 'fr' : 'en';

  const [provider, setProvider] = useState<SosProfile | null>(null);
  const [realProviderId, setRealProviderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 👉 Ajout: pricing dynamique (lu une fois puis mémoïsé)
  const { pricing, loading: pricingLoading } = usePricingConfig();
  const currency = detectUserCurrency();
  const currencySymbol = currency === 'eur' ? '€' : '$';

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution>({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  });
  const [showImageModal, setShowImageModal] = useState(false);

  // Online status
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({
    isOnline: false,
    lastUpdate: null,
    listenerActive: false,
    connectionAttempts: 0
  });

  // 👉 Ajout: résolution des montants (provider override > admin pricing)
  const priceInfo = useMemo(() => {
    if (!provider) return { price: undefined as number | undefined, duration: undefined as number | undefined, source: 'unknown' as 'provider' | 'admin' | 'unknown' };
    if (typeof provider.price === 'number' && typeof provider.duration === 'number') {
      return { price: provider.price, duration: provider.duration, source: 'provider' as const };
    }
    if (!pricingLoading && pricing) {
      const cfg = provider.type === 'lawyer' ? pricing.lawyer[currency] : pricing.expat[currency];
      return { price: cfg.totalAmount, duration: cfg.duration, source: 'admin' as const };
    }
    return { price: undefined, duration: undefined, source: 'unknown' as const };
  }, [provider, pricing, pricingLoading, currency]);

  // Reviews loader (memoized)
  const realLoadReviews = useCallback(async (providerId: string): Promise<Review[]> => {
    try {
      const arr = await getProviderReviews(providerId);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, []);

  const loadReviews = useCallback(
    async (docId: string, uid?: string): Promise<void> => {
      try {
        setIsLoadingReviews(true);
        const candidates = [docId, uid].filter((x): x is string => Boolean(x));
        let providerReviews: Review[] = [];

        for (const pid of candidates) {
          providerReviews = await realLoadReviews(pid);
          if (providerReviews.length) break;
        }

        setReviews(providerReviews);

        const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        providerReviews.forEach((r) => {
          const rr = Math.max(1, Math.min(5, Math.round(r.rating))) as keyof RatingDistribution;
          distribution[rr] += 1;
        });
        setRatingDistribution(distribution);
      } catch (e) {
        console.error('Error loading reviews:', e);
      } finally {
        setIsLoadingReviews(false);
      }
    },
    [realLoadReviews]
  );

  // Main data loader
  useEffect(() => {
    const loadProviderData = async (): Promise<void> => {
      setIsLoading(true);
      setNotFound(false);

      try {
        let providerData: SosProfile | null = null;
        let foundProviderId: string | null = null;

        const rawIdParam =
          id ||
          params.slug ||
          params.profileId ||
          params.name ||
          location.pathname.split('/').pop() || '';

        const lastToken = rawIdParam.split('-').pop() || rawIdParam;
        const slugNoUid = rawIdParam.replace(/-[a-zA-Z0-9]{8,}$/, '');

        // Try direct doc by id
        try {
          const ref = doc(db, 'sos_profiles', lastToken);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const normalized = normalizeUserData(data, snap.id);
            const built: SosProfile = {
              ...normalized,
              id: snap.id,
              uid: normalized.uid || snap.id,
              type: (data?.type as 'lawyer' | 'expat') || 'expat',
            } as SosProfile;

            built.description = pickDescription(built, preferredLangKey);
            built.specialties = toArrayFromAny(data?.specialties, preferredLangKey);
            built.helpTypes = toArrayFromAny(data?.helpTypes, preferredLangKey);

            providerData = built;
            foundProviderId = snap.id;
            setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
          }
        } catch (e) {
          console.warn('Provider lookup by ID failed:', e);
        }

        // Try by uid
        if (!providerData) {
          try {
            const qByUid = query(collection(db, 'sos_profiles'), where('uid', '==', lastToken), limit(1));
            const qsUid = await getDocs(qByUid);
            const found = qsUid.docs[0];
            if (found) {
              const data = found.data();
              const normalized = normalizeUserData(data, found.id);
              const built: SosProfile = {
                ...normalized,
                id: found.id,
                uid: normalized.uid || found.id,
                type: (data?.type as 'lawyer' | 'expat') || 'expat',
              } as SosProfile;

              built.description = pickDescription(built, preferredLangKey);
              built.specialties = toArrayFromAny(data?.specialties, preferredLangKey);
              built.helpTypes = toArrayFromAny(data?.helpTypes, preferredLangKey);

              providerData = built;
              foundProviderId = found.id;
              setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
            }
          } catch (e) {
            console.warn('Provider lookup by UID failed:', e);
          }
        }

        // Try SEO fallback
        if (!providerData && typeParam && countryParam && langParam && rawIdParam) {
          const type = typeParam === 'avocat' ? 'lawyer' : typeParam === 'expatrie' ? 'expat' : undefined;
          if (type) {
            try {
              const qRef = query(
                collection(db, 'sos_profiles'),
                where('type', '==', type),
                where('isActive', '==', true),
                limit(50)
              );
              const qs = await getDocs(qRef);
              const match = qs.docs.find((d) => {
                const data = d.data() || {};
                const dataSlug = (data.slug as string | undefined) || '';
                const computedNameSlug = safeNormalize(`${data.firstName || ''}-${data.lastName || ''}`);
                return (
                  dataSlug === slugNoUid ||
                  (dataSlug && dataSlug.startsWith(slugNoUid)) ||
                  computedNameSlug === slugNoUid
                );
              });

              if (match) {
                const data = match.data();
                const normalized = normalizeUserData(data, match.id);
                const built: SosProfile = {
                  ...normalized,
                  id: match.id,
                  uid: normalized.uid || match.id,
                  type: (data?.type as 'lawyer' | 'expat') || 'expat',
                } as SosProfile;

                built.description = pickDescription(built, preferredLangKey);
                built.specialties = toArrayFromAny(data?.specialties, preferredLangKey);
                built.helpTypes = toArrayFromAny(data?.helpTypes, preferredLangKey);

                providerData = built;
                foundProviderId = match.id;
                setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
              }
            } catch (e) {
              console.warn('SEO fallback lookup failed:', e);
            }
          }
        }

        // Try by slug only
        if (!providerData && rawIdParam) {
          try {
            const qSlug = query(collection(db, 'sos_profiles'), where('slug', '==', slugNoUid), limit(1));
            const qsSlug = await getDocs(qSlug);
            const m = qsSlug.docs[0];
            if (m) {
              const data = m.data();
              const normalized = normalizeUserData(data, m.id);
              const built: SosProfile = {
                ...normalized,
                id: m.id,
                uid: normalized.uid || m.id,
                type: (data?.type as 'lawyer' | 'expat') || 'expat',
              } as SosProfile;

              built.description = pickDescription(built, preferredLangKey);
              built.specialties = toArrayFromAny(data?.specialties, preferredLangKey);
              built.helpTypes = toArrayFromAny(data?.helpTypes, preferredLangKey);

              providerData = built;
              foundProviderId = m.id;
              setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
            }
          } catch (e) {
            console.warn('Slug lookup failed:', e);
          }
        }

        // State fallback
        if (!providerData && isLocationState(location.state)) {
          const state = location.state;
          const navData = state.selectedProvider || state.providerData;
          if (navData) {
            const built: SosProfile = {
              uid: navData.id || '',
              id: navData.id || '',
              fullName: navData.fullName || `${navData.firstName || ''} ${navData.lastName || ''}`.trim(),
              firstName: navData.firstName || '',
              lastName: navData.lastName || '',
              type: navData.type === 'lawyer' ? 'lawyer' : 'expat',
              country: navData.country || '',
              languages: navData.languages || ['Français'],
              specialties: toArrayFromAny(navData.specialties, preferredLangKey),
              helpTypes: toArrayFromAny(navData.helpTypes, preferredLangKey),
              description: navData.description || navData.bio || '',
              professionalDescription: navData.professionalDescription || '',
              experienceDescription: navData.experienceDescription || '',
              motivation: navData.motivation || '',
              bio: navData.bio,
              profilePhoto: navData.profilePhoto || navData.avatar,
              photoURL: navData.photoURL,
              avatar: navData.avatar,
              rating: Number(navData.rating) || 0,
              reviewCount: Number(navData.reviewCount) || 0,
              yearsOfExperience: Number(navData.yearsOfExperience) || 0,
              yearsAsExpat: Number(navData.yearsAsExpat) || 0,
              price: typeof navData.price === 'number' ? navData.price : undefined,
              duration: typeof navData.duration === 'number' ? navData.duration : undefined,
              isOnline: !!navData.isOnline,
              isActive: true,
              isApproved: !!navData.isApproved,
              isVerified: !!navData.isVerified,
              education: navData.education,
              lawSchool: navData.lawSchool,
              graduationYear: navData.graduationYear,
              certifications: navData.certifications,
              responseTime: navData.responseTime,
              successRate: typeof navData.successRate === 'number' ? navData.successRate : undefined,
              totalCalls: typeof navData.totalCalls === 'number' ? navData.totalCalls : undefined,
            };

            built.description = pickDescription(built, preferredLangKey);
            providerData = built;
            foundProviderId = navData.id || '';
            setOnlineStatus((s) => ({ ...s, isOnline: !!navData.isOnline, lastUpdate: new Date() }));
          }
        }

        if (providerData && foundProviderId) {
          if (!providerData.fullName?.trim()) {
            providerData.fullName =
              `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Profil SOS';
          }

          setProvider(providerData);
          setRealProviderId(foundProviderId);

          // Load reviews with requestIdleCallback if available
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => {
              loadReviews(foundProviderId, providerData.uid);
            });
          } else {
            await loadReviews(foundProviderId, providerData.uid);
          }
        } else {
          setNotFound(true);
        }
      } catch (e) {
        console.error('Error loading provider data:', e);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviderData();
  }, [id, typeParam, countryParam, langParam, location.state, location.pathname, preferredLangKey, loadReviews, params]);

  // Realtime online status listener
  useEffect(() => {
    if (!realProviderId) return;

    setOnlineStatus((s) => ({ ...s, listenerActive: true, connectionAttempts: s.connectionAttempts + 1 }));

    const unsub = onSnapshot(
      doc(db, 'sos_profiles', realProviderId),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          const newIsOnline = !!data.isOnline;
          setOnlineStatus((prev) => ({
            ...prev,
            isOnline: newIsOnline,
            lastUpdate: new Date(),
            listenerActive: true
          }));
          setProvider((prev) => prev ? { ...prev, isOnline: newIsOnline, updatedAt: new Date() } : prev);
        }
      },
      (err) => {
        console.error('Realtime listener error:', err);
        setOnlineStatus((s) => ({ ...s, listenerActive: false, lastUpdate: new Date() }));
      }
    );

    return () => {
      setOnlineStatus((s) => ({ ...s, listenerActive: false }));
      unsub();
    };
  }, [realProviderId]);

  // Auto-redirect on not found
  useEffect(() => {
    if (!isLoading && !provider && notFound) {
      const tmo = setTimeout(() => navigate('/sos-appel'), ANIMATION_DURATIONS.LOADING_DELAY);
      return () => clearTimeout(tmo);
    }
  }, [isLoading, provider, notFound, navigate]);

  // SEO metadata updater (memoized)
  const updateSEOMetadata = useCallback(() => {
    if (!provider || isLoading) return;

    try {
      const isLawyer = provider.type === 'lawyer';
      const displayType = isLawyer ? 'avocat' : 'expatrie';
      const countrySlug = safeNormalize(provider.country || '');
      const langSlug =
        provider.mainLanguage ||
        (provider.languages?.[0] ? safeNormalize(provider.languages[0]) : 'francais');
      const nameSlug =
        provider.slug ||
        safeNormalize(`${provider.firstName || ''}-${provider.lastName || ''}`) ||
        safeNormalize(provider.fullName || '');

      const seoUrl = `/${displayType}/${countrySlug}/${langSlug}/${nameSlug}-${provider.id}`;
      if (window.location.pathname !== seoUrl) {
        window.history.replaceState(null, '', seoUrl);
      }

      const pageTitle = `${provider.fullName} - ${isLawyer ? (detectedLang === 'fr' ? 'Avocat' : 'Lawyer') : (detectedLang === 'fr' ? 'Expatrié' : 'Expat')} ${detectedLang === 'fr' ? 'en' : 'in'} ${provider.country} | SOS Expat & Travelers`;
      document.title = pageTitle;

      const updateOrCreateMeta = (property: string, content: string): void => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      const ogDesc = pickDescription(provider, preferredLangKey).slice(0, 160);
      const ogImage = provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png';

      updateOrCreateMeta('og:title', pageTitle);
      updateOrCreateMeta('og:description', ogDesc);
      updateOrCreateMeta('og:image', ogImage);
      updateOrCreateMeta('og:url', window.location.href);
      updateOrCreateMeta('og:type', 'profile');
      updateOrCreateMeta('og:locale', detectedLang === 'fr' ? 'fr_FR' : 'en_US');
    } catch (e) {
      console.error('Error updating SEO metadata:', e);
    }
  }, [provider, isLoading, preferredLangKey, detectedLang]);

  useEffect(() => {
    updateSEOMetadata();
  }, [updateSEOMetadata]);

  // Event handlers (memoized for performance)
  const handleBookCall = useCallback(() => {
    if (!provider) return;

    // Analytics tracking with proper typing
    interface WindowWithGtag extends Window {
      gtag?: (command: string, eventName: string, parameters: Record<string, unknown>) => void;
    }

    const windowWithGtag = window as WindowWithGtag;
    if (typeof window !== 'undefined' && windowWithGtag.gtag && typeof windowWithGtag.gtag === 'function') {
      windowWithGtag.gtag('event', 'book_call_click', {
        provider_id: provider.id,
        provider_uid: provider.uid,
        provider_type: provider.type,
        provider_country: provider.country,
        is_online: onlineStatus.isOnline,
      });
    }

    if (isUser(user)) {
      logAnalyticsEvent({
        eventType: 'book_call_click',
        userId: user.id,
        eventData: {
          providerId: provider.id,
          providerUid: provider.uid,
          providerType: provider.type,
          providerName: provider.fullName,
          providerOnlineStatus: onlineStatus.isOnline,
        },
      });
    }

    try {
      sessionStorage.setItem(STORAGE_KEYS.SELECTED_PROVIDER, JSON.stringify(provider));
    } catch (e) {
      console.warn('sessionStorage error:', e);
    }

    const target = `/booking-request/${provider.id}`;
    if (user) {
      navigate(target, { state: { selectedProvider: provider, navigationSource: 'provider_profile' } });
    } else {
      navigate(`/login?redirect=${encodeURIComponent(target)}`, {
        state: { selectedProvider: provider, navigationSource: 'provider_profile' },
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [provider, user, navigate, onlineStatus.isOnline]);

  const shareProfile = useCallback(
    (platform: 'facebook' | 'twitter' | 'linkedin' | 'copy') => {
      if (!provider) return;

      const isLawyer = provider.type === 'lawyer';
      const countrySlug = safeNormalize(provider.country);
      const langSlug =
        provider.mainLanguage ||
        (provider.languages?.[0] ? safeNormalize(provider.languages[0]) : 'francais');
      const nameSlug = provider.slug || safeNormalize(`${provider.firstName}-${provider.lastName}`);
      const seoPath = `/${isLawyer ? 'avocat' : 'expatrie'}/${countrySlug}/${langSlug}/${nameSlug}-${provider.id}`;
      const currentUrl = `${window.location.origin}${seoPath}`;
      const title = `${provider.fullName} - ${isLawyer ? (detectedLang === 'fr' ? 'Avocat' : 'Lawyer') : (detectedLang === 'fr' ? 'Expatrié' : 'Expat')} ${detectedLang === 'fr' ? 'en' : 'in'} ${provider.country}`;

      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank', 'noopener,noreferrer');
          break;
        case 'twitter':
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(title)}`,
            '_blank',
            'noopener,noreferrer'
          );
          break;
        case 'linkedin':
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
            '_blank',
            'noopener,noreferrer'
          );
          break;
        case 'copy':
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(currentUrl);
            alert(t('linkCopied'));
          } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = currentUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(t('linkCopied'));
          }
          break;
      }
    },
    [provider, detectedLang, t]
  );

  const handleHelpfulClick = useCallback(
    async (reviewId: string) => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        await incrementReviewHelpfulCount(reviewId);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, helpfulVotes: (r.helpfulVotes || 0) + 1 }
              : r
          )
        );
      } catch (e) {
        console.error('Error marking review helpful:', e);
      }
    },
    [user, navigate]
  );

  const handleReportClick = useCallback(
    async (reviewId: string) => {
      if (!user) {
        navigate('/login');
        return;
      }
      const reason = window.prompt(t('reportReason'));
      if (reason) {
        try {
          await reportReview(reviewId, reason);
          alert(t('reportThanks'));
        } catch (e) {
          console.error('Error reporting review:', e);
        }
      }
    },
    [user, navigate, t]
  );

  const renderStars = useCallback((rating?: number) => {
    const safe = typeof rating === 'number' && !Number.isNaN(rating) ? rating : 0;
    const full = Math.floor(safe);
    const hasHalf = safe - full >= 0.5;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={
          i < full
            ? 'text-yellow-400 fill-yellow-400'
            : i === full && hasHalf
            ? 'text-yellow-400'
            : 'text-gray-300'
        }
      />
    ));
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.onerror = null;
    img.src = '/default-avatar.png';
  }, []);

  // Computed values (memoized)
  const isLawyer = provider?.type === 'lawyer';
  const isExpat = provider?.type === 'expat';
  const mainPhoto = (provider?.profilePhoto || provider?.photoURL || provider?.avatar || '/default-avatar.png') as string;
  const languagesList = provider?.languages?.length ? provider.languages : ['Français'];

  const descriptionText = useMemo(
    () => (provider ? pickDescription(provider, preferredLangKey) : ''),
    [provider, preferredLangKey]
  );

  const educationText = useMemo(() => {
    if (!provider || !isLawyer) return undefined;
    return toStringFromAny(provider.lawSchool, preferredLangKey) || toStringFromAny(provider.education, preferredLangKey);
  }, [provider, isLawyer, preferredLangKey]);

  const certificationsArray = useMemo(() => {
    if (!provider || !isLawyer) return [];
    const s = toStringFromAny(provider.certifications, preferredLangKey);
    if (!s) return [];
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }, [provider, isLawyer, preferredLangKey]);

  const derivedSpecialties = useMemo(() => {
    if (!provider) return [];
    const arr = isLawyer
      ? toArrayFromAny(provider.specialties, preferredLangKey)
      : toArrayFromAny(provider.helpTypes || provider.specialties, preferredLangKey);
    return arr.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }, [provider, isLawyer, preferredLangKey]);

  // 👉 Ajout: date d'inscription formatée
  const joinDateText = useMemo(() => {
    if (!provider) return undefined;
    const formatted = formatJoinDate(provider.createdAt || provider.updatedAt || null, detectedLang);
    if (!formatted) return undefined;
    return detectedLang === 'fr' ? `${t('memberSince')} ${formatted}` : `${t('memberSince')} ${formatted}`;
  }, [provider, detectedLang, t]);

  // Structured data for SEO (memoized)
  const structuredData = useMemo(() => {
    if (!provider) return null;

    return {
      '@context': 'https://schema.org',
      '@type': isLawyer ? 'Attorney' : 'Person',
      '@id': `${window.location.origin}${window.location.pathname}`,
      name: provider.fullName,
      image: {
        '@type': 'ImageObject',
        url: mainPhoto,
        width: IMAGE_SIZES.MODAL_MAX_WIDTH,
        height: IMAGE_SIZES.MODAL_MAX_HEIGHT
      },
      description: descriptionText,
      address: {
        '@type': 'PostalAddress',
        addressCountry: provider.country
      },
      jobTitle: isLawyer ? (detectedLang === 'fr' ? 'Avocat' : 'Attorney') : (detectedLang === 'fr' ? 'Consultant expatrié' : 'Expat consultant'),
      worksFor: {
        '@type': 'Organization',
        name: 'SOS Expat & Travelers',
        url: window.location.origin
      },
      knowsLanguage: languagesList.map(lang => ({
        '@type': 'Language',
        name: lang
      })),
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: provider.rating || 0,
        reviewCount: provider.reviewCount || reviews.length || 0,
        bestRating: 5,
        worstRating: 1
      }
    };
  }, [provider, isLawyer, mainPhoto, descriptionText, detectedLang, languagesList, reviews.length]);

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        {/* TODO: add map visibility toggle for profile owner */}
        {user && provider && isUser(user) && user.id === provider.uid && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold mb-2">Visibilité sur la carte</h3>
              <p className="text-gray-600 text-sm mb-3">Activez/désactivez votre présence sur la carte. (Visible uniquement par vous)</p>
            </div>
          </div>
        )}

        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <LoadingSpinner size="large" color="red" text={t('loading')} />
        </div>
      </Layout>
    );
  }

  // Not found state
  if (notFound || !provider) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="p-8 text-center text-red-600 text-lg">
            {t('notFound')}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={`${provider.fullName} - ${isLawyer ? (detectedLang === 'fr' ? 'Avocat' : 'Lawyer') : (detectedLang === 'fr' ? 'Expatrié' : 'Expat')} ${detectedLang === 'fr' ? 'en' : 'in'} ${provider.country} | SOS Expat & Travelers`}
        description={`${detectedLang === 'fr' ? 'Consultez' : 'Consult'} ${provider.fullName}, ${isLawyer ? (detectedLang === 'fr' ? 'avocat' : 'lawyer') : (detectedLang === 'fr' ? 'expatrié' : 'expat')} ${detectedLang === 'fr' ? 'francophone' : 'French-speaking'} ${detectedLang === 'fr' ? 'en' : 'in'} ${provider.country}. ${descriptionText.slice(0, 120)}...`}
        canonicalUrl={`/${isLawyer ? 'avocat' : 'expatrie'}/${safeNormalize(provider.country)}/${safeNormalize(
          provider.mainLanguage || languagesList[0] || 'francais'
        )}/${safeNormalize(provider.fullName)}-${provider.id}`}
        ogImage={mainPhoto}
        ogType="profile"
        structuredData={structuredData}
      />

      {/* SVG definitions for half-star rendering */}
      <svg width="0" height="0" className="hidden" aria-hidden="true">
        <defs>
          <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="50%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
      </svg>

      <div className="min-h-screen bg-gray-950">
        {/* ======= HERO (sombre, dégradés, glass) ======= */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute top-1/4 left-1/3 w-[26rem] h-[26rem] bg-gradient-to-r from-red-500/15 to-orange-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-[26rem] h-[26rem] bg-gradient-to-r from-blue-500/15 to-purple-500/15 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <nav className="mb-6">
              <button
                onClick={() => navigate('/sos-appel')}
                className="inline-flex items-center rounded-full bg-white/10 border border-white/20 text-white/90 hover:text-white hover:bg-white/15 backdrop-blur px-4 py-2 transition-colors min-h-[44px]"
                aria-label={t('backToExperts')}
              >
                <span aria-hidden="true">←</span>
                <span className="ml-2">{t('backToExperts')}</span>
              </button>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-start space-x-4 sm:space-x-6">
                  {/* Profile photo with gradient ring */}
                  <div className="relative flex-shrink-0">
                    <div className="p-[3px] rounded-full bg-gradient-to-br from-red-400 via-orange-400 to-yellow-300">
                      <img
                        src={mainPhoto}
                        alt={`${t('photoOf')} ${provider.fullName}`}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-black/20 cursor-pointer"
                        width={IMAGE_SIZES.AVATAR_MOBILE}
                        height={IMAGE_SIZES.AVATAR_MOBILE}
                        style={{ aspectRatio: '1' }}
                        onClick={() => setShowImageModal(true)}
                        onError={handleImageError}
                        loading="eager"
                        fetchPriority="high"
                      />
                    </div>
                    {/* Online status indicator */}
                    <div
                      className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-black/50 transition-all duration-500 ${
                        onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      aria-hidden="true"
                      title={onlineStatus.isOnline ? t('online') : t('offline')}
                    >
                      {onlineStatus.isOnline && (
                        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                        {provider.fullName}
                      </h1>

                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur ${
                          isLawyer
                            ? 'bg-white/10 border-white/20 text-blue-100'
                            : 'bg-white/10 border-white/20 text-green-100'
                        }`}
                      >
                        {isLawyer ? t('certifiedLawyer') : t('expertExpat')}
                      </span>

                      {provider.isVerified && (
                        <span className="inline-flex items-center gap-1 bg-white text-gray-900 text-[10px] sm:text-xs px-2 py-1 rounded-full border border-gray-200">
                          <Shield size={12} className="text-green-600" />
                          <span> {t('verified')} </span>
                        </span>
                      )}

                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold transition-all duration-500 border ${
                          onlineStatus.isOnline
                            ? 'bg-green-500 text-white border-green-300 shadow-lg shadow-green-500/30'
                            : 'bg-red-500 text-white border-red-300'
                        }`}
                      >
                        {onlineStatus.isOnline ? '🟢 ' + t('online') : '🔴 ' + t('offline')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-300 mb-4 text-sm sm:text-base">
                      <div className="inline-flex items-center gap-1">
                        <MapPin size={16} className="flex-shrink-0" />
                        <span>{provider.country}</span>
                      </div>
                      <div className="inline-flex items-center gap-1">
                        {isLawyer ? <Briefcase size={16} className="flex-shrink-0" /> : <Users size={16} className="flex-shrink-0" />}
                        <span>
                          {isLawyer
                            ? `${provider.yearsOfExperience || 0} ${t('yearsExperience')}`
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ${t('yearsAsExpat')}`}
                        </span>
                      </div>
                    </div>

                    {/* Rating display */}
                    <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-white/10 border border-white/20 backdrop-blur px-3 py-1.5">
                      <div className="flex" aria-label={`Rating: ${provider.rating || 0} out of 5 stars`}>
                        {renderStars(provider.rating)}
                      </div>
                      <span className="text-white font-semibold">
                        {typeof provider.rating === 'number' ? provider.rating.toFixed(1) : '--'}
                      </span>
                      <span className="text-gray-300">
                        ({(provider.reviewCount || reviews.length || 0)} {t('reviews')})
                      </span>
                    </div>

                    {/* Description */}
                    <div className="text-gray-200 leading-relaxed">
                      <p className="mb-2 whitespace-pre-line">{descriptionText}</p>

                      {(isLawyer || isExpat) && getFirstString(provider.motivation, preferredLangKey) && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-gray-200 whitespace-pre-line">
                            {getFirstString(provider.motivation, preferredLangKey)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Social sharing */}
                    <div className="flex items-center space-x-3 mt-6">
                      <span className="text-gray-300">{t('share')}</span>
                      <button
                        onClick={() => shareProfile('facebook')}
                        className="text-white/90 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20"
                        aria-label="Share on Facebook"
                        title="Facebook"
                      >
                        <Facebook size={20} />
                      </button>
                      <button
                        onClick={() => shareProfile('twitter')}
                        className="text-white/90 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20"
                        aria-label="Share on X"
                        title="X / Twitter"
                      >
                        <Twitter size={20} />
                      </button>
                      <button
                        onClick={() => shareProfile('linkedin')}
                        className="text-white/90 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20"
                        aria-label="Share on LinkedIn"
                        title="LinkedIn"
                      >
                        <Linkedin size={20} />
                      </button>
                      <button
                        onClick={() => shareProfile('copy')}
                        className="text-white/90 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20"
                        aria-label={t('copyLink')}
                        title={t('copyLink')}
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking card — style "pricing" harmonisé */}
              <aside className="lg:col-span-1">
                <div className="group relative bg-white rounded-3xl shadow-2xl p-6 border border-gray-200 transition-all hover:scale-[1.01]">
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/5 to-orange-500/5 group-hover:from-red-500/10 group-hover:to-orange-500/10 transition-opacity" />
                  <div className="relative z-10">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-3 py-1 text-xs font-semibold">
                        <Phone size={14} />
                        <span>Appel en ~5 min</span>
                      </div>
                      <div
                        className="mt-4 text-3xl sm:text-4xl font-black text-gray-900"
                        // 👉 Traçabilité de la source du prix (ne change pas l'UI)
                        data-price-source={priceInfo.source}
                        title={`price source: ${priceInfo.source}`}
                      >
                        {priceInfo.price != null ? `${currencySymbol}${Math.round(priceInfo.price)}` : `${currencySymbol}--`}
                      </div>
                      <div className="text-gray-600">
                        {priceInfo.duration ? `${priceInfo.duration} ${t('minutes')}` : '--'}
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('successRate')}</span>
                        <span className="font-semibold text-gray-900">
                          {typeof provider.successRate === 'number' ? `${provider.successRate}%` : '--'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="text-gray-700 font-medium">{t('availability')}</span>
                        <span
                          className={`font-bold text-sm px-3 py-1 rounded-full transition-all duration-500 ${
                            onlineStatus.isOnline
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {onlineStatus.isOnline ? '🟢 ' + t('online') : '🔴 ' + t('offline')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('completedCalls')}</span>
                        <span className="font-semibold">
                          {typeof provider.totalCalls === 'number' ? provider.totalCalls : '--'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleBookCall}
                      className={`w-full py-4 px-4 rounded-2xl font-bold text-lg transition-all duration-500 flex items-center justify-center gap-3 min-h-[56px] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        onlineStatus.isOnline
                          // 👉 Seul changement de design demandé : bouton VERT quand en ligne
                          ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:scale-105 shadow-lg ring-green-600/30'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!onlineStatus.isOnline}
                      aria-label={onlineStatus.isOnline ? t('bookNow') : t('unavailable')}
                    >
                      <Phone size={24} aria-hidden="true" />
                      <span>{onlineStatus.isOnline ? t('bookNow') : t('unavailable')}</span>
                      {onlineStatus.isOnline && (
                        <div className="flex gap-1" aria-hidden="true">
                          <div className="w-2 h-2 rounded-full animate-pulse bg-white/80"></div>
                          <div className="w-2 h-2 rounded-full animate-pulse delay-75 bg-white/80"></div>
                          <div className="w-2 h-2 rounded-full animate-pulse delay-150 bg-white/80"></div>
                        </div>
                      )}
                    </button>

                    <div className="mt-4 text-center text-sm">
                      {onlineStatus.isOnline ? (
                        <div className="text-green-600 font-medium">✅ {t('availableNow')}</div>
                      ) : (
                        <div className="text-red-600">❌ {t('currentlyOffline')}</div>
                      )}
                    </div>

                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2 text-sm text-gray-600 rounded-2xl border border-gray-200 px-4 py-2">
                        <Shield size={16} aria-hidden="true" />
                        <span>{t('securePayment')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </header>

        {/* ======= MAIN (fond clair comme Home) ======= */}
        <main className="relative bg-gradient-to-b from-white via-rose-50/50 to-white rounded-t-[28px] -mt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Main content area */}
              <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                {/* Specialties section */}
                <section className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200">
                  <h2 className="text-xl font-extrabold text-gray-900 mb-4">{t('specialties')}</h2>
                  {derivedSpecialties.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {derivedSpecialties.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className={`px-3 py-2 rounded-full text-sm font-semibold border ${
                            isLawyer
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-green-50 text-green-800 border-green-200'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">{t('noSpecialties')}</div>
                  )}
                </section>

                {/* Languages section */}
                <section className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200">
                  <h2 className="text-xl font-extrabold text-gray-900 mb-4">{t('languages')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {languagesList.map((l, i) => (
                      <span
                        key={`${l}-${i}`}
                        className="px-3 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-sm font-semibold inline-flex items-center"
                      >
                        <Globe size={14} className="mr-1" aria-hidden="true" />
                        {formatLanguages([l], detectedLang)}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Education & Certifications (lawyers only) */}
                {isLawyer && (educationText || certificationsArray.length > 0) && (
                  <section className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200">
                    <h2 className="text-xl font-extrabold text-gray-900 mb-4">
                      {t('educationCertifications')}
                    </h2>
                    <div className="space-y-3">
                      {educationText && (
                        <div className="flex items-start gap-2">
                          <GraduationCap size={18} className="text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <p className="text-gray-700">
                            {educationText}
                            {provider.graduationYear ? ` (${provider.graduationYear})` : ''}
                          </p>
                        </div>
                      )}
                      {certificationsArray.length > 0 &&
                        certificationsArray.map((cert, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Award size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <p className="text-gray-700">{cert}</p>
                          </div>
                        ))}
                    </div>
                  </section>
                )}

                {/* Expat experience (expats only) */}
                {isExpat && (
                  <section className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200">
                    <h2 className="text-xl font-extrabold text-gray-900 mb-4">
                      {t('expatExperience')}
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Users size={18} className="text-green-600 flex-shrink-0" aria-hidden="true" />
                        <p className="text-gray-700">
                          {(provider.yearsAsExpat || provider.yearsOfExperience || 0)}{' '}
                          {t('yearsAbroad')} {t('in')} {provider.country}
                        </p>
                      </div>

                      {getFirstString(provider.experienceDescription, preferredLangKey) && (
                        <p className="text-gray-700 whitespace-pre-line">
                          {getFirstString(provider.experienceDescription, preferredLangKey)}
                        </p>
                      )}

                      {getFirstString(provider.motivation, preferredLangKey) && (
                        <p className="text-gray-700 whitespace-pre-line">
                          {getFirstString(provider.motivation, preferredLangKey)}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Reviews section — aligné avec Home */}
                <section className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200" id="reviews-section">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold text-gray-900">
                      {t('customerReviews')} ({reviews.length || 0})
                    </h2>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 p-[1px]">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 border border-yellow-200/70 text-yellow-700 text-sm font-semibold">
                        <Star className="w-4 h-4" />
                        <span>
                          {typeof provider.rating === 'number' ? provider.rating.toFixed(1) : '—'}/5
                        </span>
                        <Award className="w-4 h-4" />
                      </span>
                    </span>
                  </div>

                  {isLoadingReviews ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" aria-hidden="true"></div>
                      <p className="mt-2 text-gray-500">{t('loadingReviews')}</p>
                    </div>
                  ) : (
                    <>
                      <Reviews
                        mode="summary"
                        averageRating={provider.rating || 0}
                        totalReviews={reviews.length}
                        ratingDistribution={ratingDistribution}
                      />
                      <div className="mt-8">
                        <Reviews
                          mode="list"
                          reviews={reviews}
                          showControls={!!user}
                          onHelpfulClick={handleHelpfulClick}
                          onReportClick={handleReportClick}
                        />
                      </div>
                    </>
                  )}
                </section>
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="sticky top-6 space-y-6">
                  {/* Stats card */}
                  <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-extrabold text-gray-900 mb-4">{t('stats')}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('averageRating')}</span>
                        <span className="font-semibold">
                          {typeof provider.rating === 'number' ? provider.rating.toFixed(1) : '--'}/5
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('reviews')}</span>
                        <span className="font-semibold">{reviews.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('successRate')}</span>
                        <span className="font-semibold">{typeof provider.successRate === 'number' ? `${provider.successRate}%` : '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('experience')}</span>
                        <span className="font-semibold">
                          {isLawyer
                            ? `${provider.yearsOfExperience || 0} ${t('years')}`
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ${t('years')}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info card */}
                  <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-extrabold text-gray-900 mb-4">{t('information')}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                        <span>{t('basedIn')} {provider.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <LanguagesIcon size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                        <span>{t('speaks')} {formatLanguages(languagesList, detectedLang)}</span>
                      </div>

                      {/* 👉 Ajout: "Inscrit depuis le / Member since" (contenu seulement, pas de design) */}
                      {joinDateText && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{joinDateText}</span>
                        </div>
                      )}

                      {/* Online status with enhanced visual feedback */}
                      <div
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-500 ${
                          onlineStatus.isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div
                          className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                            onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          aria-hidden="true"
                          title={onlineStatus.isOnline ? t('online') : t('offline')}
                        >
                          {onlineStatus.isOnline && (
                            <div className="w-6 h-6 rounded-full bg-green-500 animate-ping opacity-75 absolute"></div>
                          )}
                          <div className="w-3 h-3 bg-white rounded-full relative z-10"></div>
                        </div>
                        <span
                          className={`font-bold transition-all duration-500 ${
                            onlineStatus.isOnline ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {onlineStatus.isOnline ? t('onlineNow') : t('offline')}
                        </span>
                      </div>

                      {provider.isVerified && (
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                          <span>{t('verifiedExpert')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {/* Image modal with improved accessibility */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-modal-title"
        >
          <div className="relative max-w-3xl max-h-[90vh] m-4">
            <h2 id="image-modal-title" className="sr-only">
              {t('photoOf')} {provider.fullName}
            </h2>
            <img
              src={mainPhoto}
              alt={`${t('photoOf')} ${provider.fullName}`}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              style={{ maxWidth: IMAGE_SIZES.MODAL_MAX_WIDTH, maxHeight: IMAGE_SIZES.MODAL_MAX_HEIGHT }}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
            />
            <button
              className="absolute top-4 right-4 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-white/50"
              onClick={() => setShowImageModal(false)}
              aria-label={t('close')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* TODO: Add language switcher component (FR/EN) that forces i18n.language and persists in localStorage */}
      {/* TODO: Optimize bundle size - consider lazy loading non-critical components */}
      {/* TODO: Add content-visibility: auto for below-the-fold sections if performance metrics require it */}
      {/* TODO: Implement srcset with WebP/AVIF formats for images when supported */}
      {/* TODO: Add proper error boundaries for better error handling */}
    </Layout>
  );
};

export default ProviderProfile;
