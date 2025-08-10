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
import MapVisibilityToggle from '../components/dashboard/MapVisibilityToggle';

// --- Production switches (no on-screen debug; logs off by default) ---
const DEBUG_LOGS = false;
const DEBUG_OVERLAY = false;

type TSLike = FsTimestamp | Date | null | undefined;

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
  description?: any;
  professionalDescription?: any;
  experienceDescription?: any;
  motivation?: any;
  bio?: any;
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
  price: number;
  duration: number;
  education?: any;
  certifications?: any;
  lawSchool?: any;
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

// ---------- helpers ----------
const safeNormalize = (v?: string) =>
  (v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getFirstString = (val: any, preferred?: string): string | undefined => {
  if (!val) return;
  if (typeof val === 'string') {
    const s = val.trim();
    return s ? s : undefined;
  }
  if (Array.isArray(val)) {
    const arr = val.map((x) => getFirstString(x, preferred)).filter(Boolean) as string[];
    return arr.length ? arr.join(', ') : undefined;
  }
  if (typeof val === 'object') {
    if (preferred && typeof val[preferred] === 'string') {
      const s = (val[preferred] as string).trim();
      if (s) return s;
    }
    for (const k of Object.keys(val)) {
      const v = val[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return;
};

const toArrayFromAny = (val: any, preferred?: string): string[] => {
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
  if (typeof val === 'object') {
    const all = Object.values(val)
      .map((v) => (typeof v === 'string' ? v : getFirstString(v as any, preferred) || ''))
      .map((s) => s.trim())
      .filter(Boolean);
    return all;
  }
  return [];
};

const pickDescription = (p: Partial<SosProfile>, preferredLang?: string): string => {
  const chain = [
    getFirstString((p as any)?.description, preferredLang),
    getFirstString((p as any)?.bio, preferredLang),
    getFirstString((p as any)?.professionalDescription, preferredLang),
    getFirstString((p as any)?.experienceDescription, preferredLang),
  ];
  return chain.find(Boolean) || 'Aucune description professionnelle disponible.';
};

const toStringFromAny = (val: any, preferred?: string): string | undefined =>
  getFirstString(val, preferred);

const summarizeVal = (v: any) => {
  if (v == null) return 'null/undefined';
  const t = typeof v;
  if (t === 'string') return `"${v.slice(0, 60)}"${v.length > 60 ? '…' : ''}`;
  if (Array.isArray(v)) return `[${v.length} items]`;
  if (t === 'object') return `{${Object.keys(v).slice(0, 5).join(',')}${Object.keys(v).length > 5 ? ',…' : ''}}`;
  return String(v);
};

// Simple i18n helper
const t = (lang: string, fr: string, en: string) => (lang === 'fr' ? fr : en);

// ---------- component ----------
const ProviderProfile: React.FC = () => {
  const { id, country: countryParam, language: langParam, type: typeParam } =
    useParams<{ id?: string; country?: string; language?: string; type?: string }>();
  const paramsAll = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useApp();
  const lang = (language || (navigator?.language?.startsWith('fr') ? 'fr' : 'en')) as 'fr' | 'en';
  const preferredLangKey = lang === 'fr' ? 'fr' : 'en';

  const [provider, setProvider] = useState<SosProfile | null>(null);
  const [realProviderId, setRealProviderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<{ 5: number; 4: number; 3: number; 2: number; 1: number }>(
    { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  );
  const [showImageModal, setShowImageModal] = useState(false);

  // Online status (listener focalisé)
  const [onlineStatus, setOnlineStatus] = useState<{
    isOnline: boolean;
    lastUpdate: Date | null;
    listenerActive: boolean;
    connectionAttempts: number;
  }>({ isOnline: false, lastUpdate: null, listenerActive: false, connectionAttempts: 0 });

  const dbg = (...a: any[]) => {
    if (DEBUG_LOGS) console.log('[ProviderProfile]', ...a);
  };

  useEffect(() => {
    dbg('MOUNT', location.pathname, paramsAll);
  }, [location.pathname, paramsAll]); // eslint-disable-line

  // ---------- reviews loader ----------
  const realLoadReviews = useCallback(async (providerId: string) => {
    try {
      const arr = await getProviderReviews(providerId);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, []);

  const loadReviews = useCallback(
    async (docId: string, uid?: string) => {
      try {
        setIsLoadingReviews(true);
        const candidates = [docId, uid].filter(Boolean) as string[];
        let providerReviews: Review[] = [];
        for (const pid of candidates) {
          providerReviews = await realLoadReviews(pid);
          if (providerReviews.length) break;
        }
        setReviews(providerReviews);

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        providerReviews.forEach((r) => {
          const rr = Math.max(1, Math.min(5, Math.round(r.rating)));
          distribution[rr as 1 | 2 | 3 | 4 | 5] += 1;
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

  // ---------- initial load ----------
  useEffect(() => {
    const loadProviderData = async () => {
      setIsLoading(true);
      setNotFound(false);
      try {
        let providerData: SosProfile | null = null;
        let foundProviderId: string | null = null;

        const rawIdParam =
          id ||
          (paramsAll as any).slug ||
          (paramsAll as any).profileId ||
          (paramsAll as any).name ||
          (location.pathname.split('/').pop() || '');

        const lastToken = (rawIdParam || '').split('-').pop() || rawIdParam;
        const slugNoUid = (rawIdParam || '').replace(/-[a-zA-Z0-9]{8,}$/, '');

        // a) direct doc by id
        try {
          const ref = doc(db, 'sos_profiles', lastToken);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const normalized = normalizeUserData(data, snap.id);
            const built: SosProfile = {
              ...(normalized as SosProfile),
              id: snap.id,
              uid: (normalized as any).uid || snap.id,
              type: (data?.type as 'lawyer' | 'expat') || 'expat',
            };
            built.description = pickDescription(built, preferredLangKey);
            // normalize lists
            built.specialties = toArrayFromAny((data as any)?.specialties, preferredLangKey);
            built.helpTypes = toArrayFromAny((data as any)?.helpTypes, preferredLangKey);

            providerData = built;
            foundProviderId = snap.id;
            setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
          }
        } catch (e) {
          dbg('try A error:', e);
        }

        // b) by uid
        if (!providerData) {
          try {
            const qByUid = query(collection(db, 'sos_profiles'), where('uid', '==', lastToken), limit(1));
            const qsUid = await getDocs(qByUid);
            const found = qsUid.docs[0];
            if (found) {
              const data = found.data();
              const normalized = normalizeUserData(data, found.id);
              const built: SosProfile = {
                ...(normalized as SosProfile),
                id: found.id,
                uid: (normalized as any).uid || found.id,
                type: (data?.type as 'lawyer' | 'expat') || 'expat',
              };
              built.description = pickDescription(built, preferredLangKey);
              built.specialties = toArrayFromAny((data as any)?.specialties, preferredLangKey);
              built.helpTypes = toArrayFromAny((data as any)?.helpTypes, preferredLangKey);

              providerData = built;
              foundProviderId = found.id;
              setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
            }
          } catch (e) {
            dbg('try B error:', e);
          }
        }

        // c) SEO fallback
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
                  ...(normalized as SosProfile),
                  id: match.id,
                  uid: (normalized as any).uid || match.id,
                  type: (data?.type as 'lawyer' | 'expat') || 'expat',
                };
                built.description = pickDescription(built, preferredLangKey);
                built.specialties = toArrayFromAny((data as any)?.specialties, preferredLangKey);
                built.helpTypes = toArrayFromAny((data as any)?.helpTypes, preferredLangKey);

                providerData = built;
                foundProviderId = match.id;
                setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
              }
            } catch (e) {
              dbg('try C error:', e);
            }
          }
        }

        // d) by slug only
        if (!providerData && rawIdParam) {
          try {
            const qSlug = query(collection(db, 'sos_profiles'), where('slug', '==', slugNoUid), limit(1));
            const qsSlug = await getDocs(qSlug);
            const m = qsSlug.docs[0];
            if (m) {
              const data = m.data();
              const normalized = normalizeUserData(data, m.id);
              const built: SosProfile = {
                ...(normalized as SosProfile),
                id: m.id,
                uid: (normalized as any).uid || m.id,
                type: (data?.type as 'lawyer' | 'expat') || 'expat',
              };
              built.description = pickDescription(built, preferredLangKey);
              built.specialties = toArrayFromAny((data as any)?.specialties, preferredLangKey);
              built.helpTypes = toArrayFromAny((data as any)?.helpTypes, preferredLangKey);

              providerData = built;
              foundProviderId = m.id;
              setOnlineStatus((s) => ({ ...s, isOnline: !!data?.isOnline, lastUpdate: new Date() }));
            }
          } catch (e) {
            dbg('try D error:', e);
          }
        }

        // e) state fallback (no demo defaults)
        if (!providerData && location.state) {
          const state = location.state as any;
          const navData = state?.selectedProvider || state?.providerData;
          if (navData) {
            const built: SosProfile = {
              uid: navData.id || '',
              id: navData.id || '',
              fullName: navData.name || `${navData.firstName || ''} ${navData.lastName || ''}`.trim(),
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
              profilePhoto: navData.avatar || navData.profilePhoto || '',
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
            } as SosProfile;
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

          dbg('keys:', Object.keys(providerData || {}));
          dbg('desc=', summarizeVal((providerData as any)?.description));

          setProvider(providerData);
          setRealProviderId(foundProviderId);
          await loadReviews(foundProviderId, providerData.uid);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadProviderData();
  }, [id, typeParam, countryParam, langParam, location.state, preferredLangKey, loadReviews, paramsAll]);

  // Realtime online status
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
          setOnlineStatus((prev) => ({ ...prev, isOnline: newIsOnline, lastUpdate: new Date(), listenerActive: true }));
          setProvider((prev) => (prev ? { ...prev, isOnline: newIsOnline, updatedAt: new Date() } : prev));
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

  // Soft redirect when not found
  useEffect(() => {
    if (!isLoading && !provider && notFound) {
      const tmo = setTimeout(() => navigate('/sos-appel'), 2500);
      return () => clearTimeout(tmo);
    }
  }, [isLoading, provider, notFound, navigate]);

  // SEO URL + meta (use provider.id)
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

      document.title = `${provider.fullName} - ${isLawyer ? t(lang,'Avocat','Lawyer') : t(lang,'Expatrié','Expat')} ${t(lang,'en','in')} ${provider.country} | SOS Expat & Travelers`;

      const updateOrCreateMeta = (property: string, content: string) => {
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

      updateOrCreateMeta('og:title', `${provider.fullName} - ${isLawyer ? t(lang,'Avocat','Lawyer') : t(lang,'Expatrié','Expat')} ${t(lang,'en','in')} ${provider.country}`);
      updateOrCreateMeta('og:description', ogDesc);
      updateOrCreateMeta('og:image', ogImage);
      updateOrCreateMeta('og:url', window.location.href);
      updateOrCreateMeta('og:type', 'profile');
    } catch (e) {
      console.error('Error updating SEO metadata:', e);
    }
  }, [provider, isLoading, preferredLangKey, lang]);

  useEffect(() => {
    updateSEOMetadata();
  }, [updateSEOMetadata]);

  const handleBookCall = useCallback(() => {
    if (!provider) return;

    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'book_call_click', {
        provider_id: provider.id,
        provider_uid: provider.uid,
        provider_type: provider.type,
        provider_country: provider.country,
        is_online: onlineStatus.isOnline,
      });
    }

    if (user) {
      logAnalyticsEvent({
        eventType: 'book_call_click',
        userId: (user as any).id,
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
      sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
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

    window.scrollTo(0, 0);
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
      const title = `${provider.fullName} - ${isLawyer ? t(lang,'Avocat','Lawyer') : t(lang,'Expatrié','Expat')} ${t(lang,'en','in')} ${provider.country}`;

      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
          break;
        case 'twitter':
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(title)}`,
            '_blank'
          );
          break;
        case 'linkedin':
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`,
            '_blank'
          );
          break;
        case 'copy':
          navigator.clipboard.writeText(currentUrl);
          alert(lang === 'fr' ? 'Lien copié !' : 'Link copied!');
          break;
      }
    },
    [provider, lang]
  );

  const handleHelpfulClick = useCallback(
    async (reviewId: string) => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        await incrementReviewHelpfulCount(reviewId);
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, helpfulVotes: (r.helpfulVotes || 0) + 1 } : r)));
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
      const reason = window.prompt(lang === 'fr' ? 'Veuillez indiquer la raison du signalement :' : 'Please enter a reason:');
      if (reason) {
        try {
          await reportReview(reviewId, reason);
          alert(lang === 'fr' ? 'Merci pour votre signalement. Notre équipe va l’examiner.' : 'Thanks. Our team will review it.');
        } catch (e) {
          console.error('Error reporting review:', e);
        }
      }
    },
    [user, navigate, lang]
  );

  const renderStars = useCallback((rating?: number) => {
    const safe = typeof rating === 'number' && !Number.isNaN(rating) ? rating : 0;
    const full = Math.floor(safe);
    const hasHalf = safe - full >= 0.5;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={i < full ? 'text-yellow-400 fill-current' : i === full && hasHalf ? 'text-yellow-400' : 'text-gray-300'}
      />
    ));
  }, []);

  const isLawyer = provider?.type === 'lawyer';
  const isExpat = provider?.type === 'expat';
  const mainPhoto = (provider?.profilePhoto || provider?.photoURL || provider?.avatar || '/default-avatar.png') as string;
  const languagesList = provider?.languages?.length ? provider.languages : ['Français'];

  // Derived data
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
    // petite normalisation visuelle
    return arr.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }, [provider, isLawyer, preferredLangKey]);

  if (isLoading) {
    return (
      <Layout>
{/* Visibilité carte — visible uniquement pour le propriétaire du profil */}
{user && provider && ((user as any).id === provider.uid) && (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <h3 className="text-sm font-semibold mb-2">Visibilité sur la carte</h3>
      <p className="text-gray-600 text-sm mb-3">Activez/désactivez votre présence sur la carte. (Visible uniquement par vous)</p>
      <MapVisibilityToggle />
    </div>
  </div>
)}

        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="large" color="red" text={t(lang, 'Chargement du profil...', 'Loading profile...')} />
        </div>
      </Layout>
    );
  }

  if (notFound || !provider) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-8 text-center text-red-600 text-lg">
            {t(lang, 'Ce profil prestataire est introuvable. Redirection en cours...', 'This provider profile was not found. Redirecting...')}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* (Disabled) debug overlay */}
      {DEBUG_OVERLAY && (
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            color: '#0f0',
            fontSize: 12,
            padding: 10,
            borderRadius: 8,
            maxWidth: 380,
          }}
        >
          <div><b>ProviderProfile DEBUG</b></div>
          <div>path: {location.pathname}</div>
          <div>params: {JSON.stringify(paramsAll)}</div>
          <div>provider.id: {provider?.id || '-'}</div>
        </div>
      )}

      <SEOHead
        title={`${provider.fullName} - ${isLawyer ? t(lang,'Avocat','Lawyer') : t(lang,'Expatrié','Expat')} ${t(lang,'en','in')} ${provider.country} | SOS Expat & Travelers`}
        description={`${t(lang,'Consultez','Consult')} ${provider.fullName}, ${isLawyer ? t(lang,'avocat','lawyer') : t(lang,'expatrié','expat')} ${t(lang,'francophone','French-speaking')} ${t(lang,'en','in')} ${provider.country}. ${descriptionText.slice(0, 120)}...`}
        canonicalUrl={`/${isLawyer ? 'avocat' : 'expatrie'}/${safeNormalize(provider.country)}/${safeNormalize(
          provider.mainLanguage || languagesList[0] || 'francais'
        )}/${safeNormalize(provider.fullName)}-${provider.id}`}
        ogImage={mainPhoto}
        ogType="profile"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': isLawyer ? 'Attorney' : 'Person',
          name: provider.fullName,
          image: mainPhoto,
          description: descriptionText,
          address: { '@type': 'PostalAddress', addressCountry: provider.country },
          jobTitle: isLawyer ? 'Avocat' : 'Expatrié consultant',
          worksFor: { '@type': 'Organization', name: 'SOS Expat & Travelers' },
          knowsLanguage: languagesList,
          review: {
            '@type': 'AggregateRating',
            ratingValue: provider.rating || 0,
            reviewCount: provider.reviewCount || reviews.length || 0,
          },
        }}
      />

      {/* SVG pattern placeholder for potential half-star fill */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="50%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
      </svg>

      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate('/sos-appel')}
              className="text-red-200 hover:text-white mb-6 transition-colors"
            >
              ← {t(lang, 'Retour aux experts', 'Back to experts')}
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <img
                      src={mainPhoto}
                      alt={`${t(lang, 'Photo de', 'Photo of')} ${provider.fullName}`}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white/20 cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                      onError={(e) => {
                        const tImg = e.target as HTMLImageElement;
                        tImg.onerror = null;
                        tImg.src = '/default-avatar.png';
                      }}
                    />
                    <div
                      className={`absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-4 border-white transition-all duration-500 ${
                        onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      aria-hidden="true"
                    >
                      {onlineStatus.isOnline && (
                        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h1 className="text-2xl sm:text-3xl font-bold">{provider.fullName}</h1>
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          isLawyer ? 'bg-blue-500/20 text-blue-100' : 'bg-green-500/20 text-green-100'
                        }`}
                      >
                        {isLawyer ? t(lang, 'Avocat certifié', 'Certified lawyer') : t(lang, 'Expatrié expert', 'Expert expat')}
                      </span>
                      {provider.isVerified && (
                        <span className="bg-green-500 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full">
                          ✓ {t(lang, 'Vérifié', 'Verified')}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold transition-all duration-500 border-2 ${
                          onlineStatus.isOnline
                            ? 'bg-green-500 text-white border-green-300 shadow-lg shadow-green-500/50'
                            : 'bg-red-500 text-white border-red-300'
                        }`}
                      >
                        {onlineStatus.isOnline ? '🟢 ' + t(lang, 'EN LIGNE', 'ONLINE') : '🔴 ' + t(lang, 'HORS LIGNE', 'OFFLINE')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-red-100 mb-4">
                      <div className="flex items-center space-x-1">
                        <MapPin size={16} />
                        <span>{provider.country}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isLawyer ? <Briefcase size={16} /> : <Users size={16} />}
                        <span>
                          {isLawyer
                            ? `${provider.yearsOfExperience || 0} ${t(lang, "ans d'expérience", 'years experience')}`
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ${t(lang, "ans d'expatriation", 'years as expat')}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      {renderStars(provider.rating)}
                      <span className="text-red-100 font-medium">
                        {typeof provider.rating === 'number' ? provider.rating.toFixed(2) : '--'}
                      </span>
                      <span className="text-red-200">
                        ({(provider.reviewCount || reviews.length || 0)} {t(lang, 'avis', 'reviews')})
                      </span>
                    </div>

                    <div className="text-red-100 leading-relaxed">
                      <p className="mb-2 whitespace-pre-line">{descriptionText}</p>

                      {isLawyer && getFirstString(provider.motivation, preferredLangKey) && (
                        <div className="mt-4 pt-4 border-t border-red-200/30">
                          <p className="text-red-100 whitespace-pre-line">
                            {getFirstString(provider.motivation, preferredLangKey)}
                          </p>
                        </div>
                      )}

                      {isExpat && getFirstString(provider.motivation, preferredLangKey) && (
                        <div className="mt-4 pt-4 border-t border-red-200/30">
                          <p className="text-red-100 whitespace-pre-line">
                            {getFirstString(provider.motivation, preferredLangKey)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 mt-4">
                      <span className="text-red-200">{t(lang, 'Partager :', 'Share:')}</span>
                      <button onClick={() => shareProfile('facebook')} className="text-white hover:text-red-200" aria-label="Share on Facebook">
                        <Facebook size={20} />
                      </button>
                      <button onClick={() => shareProfile('twitter')} className="text-white hover:text-red-200" aria-label="Share on X">
                        <Twitter size={20} />
                      </button>
                      <button onClick={() => shareProfile('linkedin')} className="text-white hover:text-red-200" aria-label="Share on LinkedIn">
                        <Linkedin size={20} />
                      </button>
                      <button onClick={() => shareProfile('copy')} className="text-white hover:text-red-200" aria-label={t(lang,'Copier le lien','Copy link')}>
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-xl p-6">
                  <div className="text-center mb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
                      {typeof provider.price === 'number' ? `€${provider.price}` : '—'}
                    </div>
                    <div className="text-gray-600">
                      {provider.duration ? `${provider.duration} ${t(lang, 'minutes', 'minutes')}` : '—'}
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t(lang, 'Taux de succès', 'Success rate')}</span>
                      <span className="font-medium text-gray-900">
                        {typeof provider.successRate === 'number' ? `${provider.successRate}%` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-600 font-medium">{t(lang, 'Disponibilité', 'Availability')}</span>
                      <span
                        className={`font-bold text-sm px-3 py-1 rounded-full transition-all duration-500 ${
                          onlineStatus.isOnline
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {onlineStatus.isOnline ? '🟢 ' + t(lang, 'EN LIGNE', 'ONLINE') : '🔴 ' + t(lang, 'HORS LIGNE', 'OFFLINE')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t(lang, 'Appels réalisés', 'Completed calls')}</span>
                      <span className="font-medium">{typeof provider.totalCalls === 'number' ? provider.totalCalls : '—'}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleBookCall}
                    className={`w-full py-4 px-4 rounded-lg font-bold text-lg transition-all duration-500 flex items-center justify-center space-x-3 ${
                      onlineStatus.isOnline
                        ? 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-green-500'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-300'
                    }`}
                    disabled={!onlineStatus.isOnline}
                  >
                    <Phone size={24} />
                    <span>{onlineStatus.isOnline ? t(lang, 'RÉSERVER MAINTENANT', 'BOOK NOW') : t(lang, 'NON DISPONIBLE', 'UNAVAILABLE')}</span>
                    {onlineStatus.isOnline && (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full animate-pulse bg-green-300" />
                        <div className="w-2 h-2 rounded-full animate-pulse delay-75 bg-green-300" />
                        <div className="w-2 h-2 rounded-full animate-pulse delay-150 bg-green-300" />
                      </div>
                    )}
                  </button>

                  <div className="mt-4 text-center text-sm">
                    {onlineStatus.isOnline ? (
                      <div className="text-green-600 font-medium">✅ {t(lang, 'Expert disponible maintenant !', 'Expert available now!')}</div>
                    ) : (
                      <div className="text-red-600">❌ {t(lang, 'Expert actuellement hors ligne', 'Expert currently offline')}</div>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <Shield size={16} />
                      <span>{t(lang, 'Paiement sécurisé • Satisfaction garantie', 'Secure payment • Satisfaction guaranteed')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8" id="reviews-section">
              {/* Specialties */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t(lang, 'Spécialités', 'Specialties')}</h2>
                {derivedSpecialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {derivedSpecialties.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className={`px-3 py-2 rounded-full text-sm font-medium ${
                          isLawyer ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">{t(lang, 'Aucune spécialité renseignée.', 'No specialties provided.')}</div>
                )}
              </div>

              {/* Languages */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t(lang, 'Langues parlées', 'Languages')}</h2>
                <div className="flex flex-wrap gap-2">
                  {languagesList.map((l, i) => (
                    <span
                      key={`${l}-${i}`}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center"
                    >
                      <Globe size={14} className="mr-1" />
                      {formatLanguages([l], lang)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education & Certifications (lawyers only) — NO SUBTITLES */}
              {isLawyer && (educationText || certificationsArray.length > 0) && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {t(lang, 'Formation et certifications', 'Education & Certifications')}
                  </h2>
                  <div className="space-y-3">
                    {educationText && (
                      <div className="flex items-start space-x-2">
                        <GraduationCap size={18} className="text-blue-600 mt-0.5" />
                        <p className="text-gray-700">
                          {educationText}
                          {provider.graduationYear ? ` (${provider.graduationYear})` : ''}
                        </p>
                      </div>
                    )}
                    {certificationsArray.length > 0 &&
                      certificationsArray.map((cert, i) => (
                        <div key={i} className="flex items-start space-x-2">
                          <Award size={16} className="text-yellow-500 mt-0.5" />
                          <p className="text-gray-700">{cert}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Expérience d'expatriation (expats only) */}
              {isExpat && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {t(lang, "Expérience d'expatriation", 'Expat experience')}
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Users size={18} className="text-green-600 flex-shrink-0" />
                      <p className="text-gray-600">
                        {(provider.yearsAsExpat || provider.yearsOfExperience || 0)}{' '}
                        {t(lang, "ans d'expatriation", 'years abroad')} {t(lang, 'en', 'in')} {provider.country}
                      </p>
                    </div>

                    {getFirstString(provider.experienceDescription, preferredLangKey) && (
                      <p className="text-gray-600 whitespace-pre-line">
                        {getFirstString(provider.experienceDescription, preferredLangKey)}
                      </p>
                    )}

                    {getFirstString(provider.motivation, preferredLangKey) && (
                      <p className="text-gray-600 whitespace-pre-line">
                        {getFirstString(provider.motivation, preferredLangKey)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {t(lang, 'Avis clients', 'Customer reviews')} ({reviews.length || 0})
                </h2>

                {isLoadingReviews ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto" />
                    <p className="mt-2 text-gray-500">{t(lang, 'Chargement des avis...', 'Loading reviews...')}</p>
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
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t(lang, 'Statistiques', 'Stats')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t(lang, 'Note moyenne', 'Average rating')}</span>
                      <span className="font-medium">
                        {typeof provider.rating === 'number' ? provider.rating.toFixed(1) : '--'}/5
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t(lang, 'Avis clients', 'Reviews')}</span>
                      <span className="font-medium">{reviews.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t(lang, 'Taux de succès', 'Success rate')}</span>
                      <span className="font-medium">{typeof provider.successRate === 'number' ? `${provider.successRate}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t(lang, 'Expérience', 'Experience')}</span>
                      <span className="font-medium">
                        {isLawyer
                          ? `${provider.yearsOfExperience || 0} ${t(lang, 'ans', 'yrs')}`
                          : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ${t(lang, 'ans', 'yrs')}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t(lang, 'Informations', 'Information')}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{t(lang, 'Basé en', 'Based in')} {provider.country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <LanguagesIcon size={16} className="text-gray-400" />
                      <span>{t(lang, 'Parle', 'Speaks')} {formatLanguages(languagesList, lang)}</span>
                    </div>

                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg transition-all duration-500 ${
                        onlineStatus.isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div
                        className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                          onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        aria-hidden="true"
                      >
                        {onlineStatus.isOnline && (
                          <div className="w-6 h-6 rounded-full bg-green-500 animate-ping opacity-75 absolute" />
                        )}
                        <div className="w-3 h-3 bg-white rounded-full relative z-10" />
                      </div>
                      <span
                        className={`font-bold transition-all duration-500 ${
                          onlineStatus.isOnline ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {onlineStatus.isOnline ? t(lang, 'EN LIGNE MAINTENANT', 'ONLINE NOW') : t(lang, 'HORS LIGNE', 'OFFLINE')}
                      </span>
                    </div>

                    {provider.isVerified && (
                      <div className="flex items-center space-x-2">
                        <Shield size={16} className="text-gray-400" />
                        <span>{t(lang, 'Expert vérifié', 'Verified expert')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal photo */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={mainPhoto}
              alt={`${t(lang, 'Photo de', 'Photo of')} ${provider.fullName}`}
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                const tImg = e.target as HTMLImageElement;
                tImg.onerror = null;
                tImg.src = '/default-avatar.png';
              }}
            />
            <button
              className="absolute top-4 right-4 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200"
              onClick={() => setShowImageModal(false)}
              aria-label={t(lang, 'Fermer', 'Close')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProviderProfile;