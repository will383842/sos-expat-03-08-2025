import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Star,
  MapPin,
  Clock,
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
  Languages,
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { logAnalyticsEvent, getProviderReviews, incrementReviewHelpfulCount, reportReview, normalizeUserData } from '../utils/firestore';
import Reviews from '../components/review/Reviews';
import SEOHead from '../components/layout/SEOHead';
import { Review } from '../types';

type DevFlag = boolean;
const __DEV__: DevFlag = typeof import.meta !== 'undefined' ? import.meta.env?.MODE === 'development' : process.env.NODE_ENV !== 'production';

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
  description: string;
  professionalDescription?: string;
  experienceDescription?: string;
  motivation?: string;
  profilePhoto: string;
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
  education?: string;
  certifications?: string[];
  lawSchool?: string;
  graduationYear?: number;
  responseTime?: string;
  successRate?: number;
  totalCalls?: number;
  successfulCalls?: number;
  totalResponses?: number;
  totalResponseTime?: number;
  avgResponseTimeMs?: number;
  createdAt?: any;
  updatedAt?: any;
  lastSeen?: any;
}

const ProviderProfile: React.FC = () => {
  const { id, country: countryParam, language: langParam, type: typeParam } = useParams<{
    id?: string;
    country?: string;
    language?: string;
    type?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useApp();

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [provider, setProvider] = useState<SosProfile | null>(null);
  const [realProviderId, setRealProviderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoadComplete, setDataLoadComplete] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<{ 5: number; 4: number; 3: number; 2: number; 1: number }>({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [showImageModal, setShowImageModal] = useState(false);

  // Debug history (utile en dev uniquement)
  const [debugHistory, setDebugHistory] = useState<
    Array<{ timestamp: string; field: string; oldValue: any; newValue: any; source: string }>
  >([]);

  // Statut online en temps réel
  const [onlineStatus, setOnlineStatus] = useState({
    isOnline: false,
    lastUpdate: null as Date | null,
    listenerActive: false,
    connectionAttempts: 0,
  });

  // ------------------------------------------------------------
  // Avis
  // ------------------------------------------------------------
  const loadReviews = useCallback(async (providerId: string) => {
    try {
      setIsLoadingReviews(true);
      if (__DEV__) console.log('[Reviews] Loading for provider:', providerId);
      const providerReviews = await getProviderReviews(providerId);
      if (!isMounted.current) return;
      setReviews(providerReviews);

      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      providerReviews.forEach((review) => {
        const rating = Math.max(1, Math.min(5, Math.floor(review.rating))) as 1 | 2 | 3 | 4 | 5;
        distribution[rating]++;
      });
      setRatingDistribution(distribution);
    } catch (error) {
      console.error('[Reviews] Error loading:', error);
    } finally {
      if (isMounted.current) setIsLoadingReviews(false);
    }
  }, []);

  // ------------------------------------------------------------
  // Chargement initial des données prestataire
  // ------------------------------------------------------------
  useEffect(() => {
    const loadProviderData = async () => {
      try {
        setIsLoading(true);
        if (__DEV__) console.log('[Load] Starting provider load...', { id, typeParam, countryParam, langParam });

        let providerData: SosProfile | null = null;
        let foundProviderId: string | null = null;

        // 1) Essayer d'extraire un ID Firestore depuis le param "id"
        let providerId: string | null = null;
        if (id) {
          // ID direct ?
          if (id.length >= 15) {
            providerId = id;
          } else {
            // Slug-du-nom-<uid>
            const idMatch = id.match(/-([a-zA-Z0-9]{15,})$/);
            if (idMatch && idMatch[1]) providerId = idMatch[1];
          }
        }

        // 1bis) Charge par ID si possible
        if (__DEV__) console.log('[Load] Strategy: by explicit Firestore ID');
        if (providerId && providerId.length >= 15) {
          try {
            const docRef = doc(db, 'sos_profiles', providerId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              providerData = {
                ...(normalizeUserData as any)(data, docSnap.id),
                id: docSnap.id,
                type: (data as any).type || 'expat',
              } as SosProfile;
              foundProviderId = docSnap.id;

              if (__DEV__) console.log('[Provider] Initial isOnline:', (data as any).isOnline);
              setOnlineStatus({
                isOnline: !!(data as any).isOnline,
                lastUpdate: new Date(),
                listenerActive: false,
                connectionAttempts: 0,
              });
            }
          } catch (error) {
            console.error('[Provider] Error loading by ID:', error);
          }
        }

        // 2) Sinon, tenter via les paramètres SEO (type / country / language / slug)
        if (__DEV__) console.log('[Load] Strategy: by SEO params');
        if (!providerData && typeParam && countryParam && langParam && id) {
          const type = typeParam === 'avocat' ? 'lawyer' : typeParam === 'expatrie' ? 'expat' : null;
          const country =
            countryParam
              ?.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/-/g, ' ')
              .replace(/\s+/g, ' ')
              .trim() || null;
          const slug = id.replace(/-[a-zA-Z0-9]+$/, '');

          if (type && country) {
            const sosProfilesQuery = query(
              collection(db, 'sos_profiles'),
              where('type', '==', type),
              where('country', '==', country.charAt(0).toUpperCase() + country.slice(1)),
              where('isActive', '==', true),
              limit(10)
            );

            const querySnapshot = await getDocs(sosProfilesQuery);

            const matchingDoc = querySnapshot.docs.find((d) => {
              const data = d.data() as any;
              const genSlug = `${(data.firstName || '').toString()}-${(data.lastName || '').toString()}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '-');
              return data.slug === slug || (data.slug && data.slug.startsWith(slug)) || genSlug === slug;
            });

            if (matchingDoc) {
              const data = matchingDoc.data();
              providerData = {
                ...(normalizeUserData as any)(data, matchingDoc.id),
                id: matchingDoc.id,
                type: (data as any).type || 'expat',
              } as SosProfile;
              foundProviderId = matchingDoc.id;

              if (__DEV__) console.log('[Provider SEO] isOnline:', (data as any).isOnline);
              setOnlineStatus({
                isOnline: !!(data as any).isOnline,
                lastUpdate: new Date(),
                listenerActive: false,
                connectionAttempts: 0,
              });
            }
          }
        }

        // 3) Fallback : state de navigation (session / liste / carte)
        if (__DEV__) console.log('[Load] Strategy: by navigation state');
        if (!providerData && location.state) {
          const state = location.state as any;
          const navData = state.selectedProvider || state.providerData;

          if (navData) {
            providerData = {
              uid: navData.id || '',
              id: navData.id || '',
              fullName: navData.name || `${navData.firstName || ''} ${navData.lastName || ''}`.trim(),
              firstName: navData.firstName || '',
              lastName: navData.lastName || '',
              type: navData.type === 'lawyer' ? 'lawyer' : 'expat',
              country: navData.country || '',
              languages: navData.languages || ['Français'],
              specialties: navData.specialties || [],
              helpTypes: navData.helpTypes || [],
              description: navData.description || navData.bio || '',
              professionalDescription: navData.professionalDescription || '',
              experienceDescription: navData.experienceDescription || '',
              motivation: navData.motivation || '',
              profilePhoto: navData.avatar || navData.profilePhoto || '',
              rating: navData.rating || 4.7,
              reviewCount: navData.reviewCount || 0,
              yearsOfExperience: navData.yearsOfExperience || 0,
              yearsAsExpat: navData.yearsAsExpat || 0,
              price: navData.price || (navData.type === 'lawyer' ? 49 : 19),
              duration: navData.duration || (navData.type === 'lawyer' ? 20 : 30),
              isOnline: !!navData.isOnline,
              isActive: true,
              isApproved: true,
              isVerified: !!navData.isVerified,
              education: navData.education || '',
              lawSchool: navData.lawSchool || '',
              graduationYear: navData.graduationYear || new Date().getFullYear() - 5,
              certifications: navData.certifications || [],
              responseTime: navData.responseTime || '< 5 minutes',
              successRate: navData.successRate || 95,
            } as SosProfile;

            foundProviderId = navData.id || '';

            if (__DEV__) console.log('[Provider NAV] isOnline:', !!navData.isOnline);
            setOnlineStatus({
              isOnline: !!navData.isOnline,
              lastUpdate: new Date(),
              listenerActive: false,
              connectionAttempts: 0,
            });
          }
        }

        if (providerData && foundProviderId) {
          if (__DEV__) console.log('[Load] Provider found', { foundProviderId });
          if (!isMounted.current) return;
          setProvider(providerData);
          setRealProviderId(foundProviderId);

          // Avis
          await loadReviews(providerData.uid || foundProviderId);
        } else {
          if (__DEV__) console.log('[Load] No provider found with any strategy.');
          if (isMounted.current) setNotFound(true);
        }
      } catch (error) {
        console.error('[Provider] Error loading data:', error);
        if (isMounted.current) setNotFound(true);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setDataLoadComplete(true);
          if (__DEV__) console.log('[Load] Initial data load complete.');
        }
      }
    };

    loadProviderData();
  }, [id, typeParam, countryParam, langParam, loadReviews, location.state]);

  // ------------------------------------------------------------
  // Listener temps réel (isOnline uniquement)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!realProviderId || realProviderId.length < 15) {
      if (__DEV__) console.log('[RT] No valid provider ID for real-time listener');
      return;
    }

    if (__DEV__) {
      console.log('🔄 ========================================');
      console.log('[RT] SETTING UP REAL-TIME LISTENER for', realProviderId);
      console.log('🔄 ========================================');
    }

    setOnlineStatus((prev) => ({ ...prev, listenerActive: true, connectionAttempts: prev.connectionAttempts + 1 }));

    const unsubscribe = onSnapshot(
      doc(db, 'sos_profiles', realProviderId),
      { includeMetadataChanges: __DEV__ },
      (docSnap) => {
        const data = docSnap.exists() ? (docSnap.data() as any) : null;
        const newIsOnline = !!(data?.isOnline);

        setOnlineStatus((prevStatus) => {
          const changed = prevStatus.isOnline !== newIsOnline;
          if (__DEV__) {
            console.log('[RT] Update:', {
              fromCache: docSnap.metadata.fromCache,
              hasPendingWrites: docSnap.metadata.hasPendingWrites,
              exists: docSnap.exists(),
              old: prevStatus.isOnline,
              new: newIsOnline,
              changed,
            });
          }

          if (changed && __DEV__) {
            setDebugHistory((prev) => [
              ...prev.slice(-9),
              {
                timestamp: new Date().toISOString(),
                field: 'isOnline',
                oldValue: prevStatus.isOnline,
                newValue: newIsOnline,
                source: docSnap.metadata.fromCache ? 'cache' : 'server',
              },
            ]);
          }

          return {
            isOnline: newIsOnline,
            lastUpdate: new Date(),
            listenerActive: true,
            connectionAttempts: prevStatus.connectionAttempts,
          };
        });

        setProvider((prevProvider) => {
          if (!prevProvider) return null;
          if (prevProvider.isOnline === newIsOnline) return prevProvider;
          return { ...prevProvider, isOnline: newIsOnline, updatedAt: new Date() };
        });
      },
      (error) => {
        console.error('[RT] Listener error:', error);
        setOnlineStatus((prev) => ({ ...prev, listenerActive: false, lastUpdate: new Date() }));
        // retry handled by outer effect on id change; no auto-loop here
      }
    );

    return () => {
      if (__DEV__) console.log('[RT] CLEANUP LISTENER');
      setOnlineStatus((prev) => ({ ...prev, listenerActive: false }));
      unsubscribe();
    };
  }, [realProviderId]);

  // ------------------------------------------------------------
  // Not found -> redirection douce (attend la fin du chargement initial)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!dataLoadComplete) {
      if (__DEV__) console.log('[Redirect] Waiting for initial load to finish...');
      return;
    }
    if (provider) {
      if (__DEV__) console.log('[Redirect] Provider found. No redirection.');
      return;
    }
    if (notFound) {
      if (__DEV__) console.log('[Redirect] Not found after initial load. Redirecting soon...');
      const t = setTimeout(() => navigate('/sos-appel'), 3000);
      return () => clearTimeout(t);
    } else {
      if (__DEV__) console.log('[Redirect] Provider is null but notFound is false. No redirection.');
    }
  }, [dataLoadComplete, notFound, provider, navigate]);

  // ------------------------------------------------------------
  // SEO (URL + meta OG)
  // ------------------------------------------------------------
  const updateSEOMetadata = useCallback(() => {
    // Attendre la fin du chargement initial pour éviter les URL/SEO incohérents
    if (!provider || !dataLoadComplete) return;

    try {
      const isLawyer = provider.type === 'lawyer';
      const displayType = isLawyer ? 'avocat' : 'expatrie';

      const countrySlug = (provider.country || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-');

      const langSlug =
        (provider.mainLanguage ||
          provider.languages?.[0] ||
          'francais')
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-');

      const nameSlug =
        provider.slug ||
        `${provider.firstName || ''}-${provider.lastName || ''}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-');

      const seoUrl = `/${displayType}/${countrySlug}/${langSlug}/${nameSlug}-${provider.uid}`;

      if (window.location.pathname !== seoUrl) {
        window.history.replaceState(null, '', seoUrl);
      }

      document.title = `${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country} | SOS Expat & Travelers`;

      const updateOrCreateMeta = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      updateOrCreateMeta('og:title', `${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country}`);
      updateOrCreateMeta('og:description', (provider.description || '').substring(0, 160));
      updateOrCreateMeta('og:image', provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png');
      updateOrCreateMeta('og:url', window.location.href);
      updateOrCreateMeta('og:type', 'profile');
    } catch (error) {
      console.error('[SEO] Error updating metadata:', error);
    }
  }, [provider, dataLoadComplete]);

  useEffect(() => {
    updateSEOMetadata();
  }, [updateSEOMetadata]);

  // ------------------------------------------------------------
  // CTA réserver
  // ------------------------------------------------------------
  const handleBookCall = useCallback(() => {
    if (!provider) return;

    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'book_call_click', {
        provider_id: provider.uid,
        provider_type: provider.type,
        provider_country: provider.country,
        is_online: onlineStatus.isOnline,
      });
    }

    if (user) {
      logAnalyticsEvent({
        eventType: 'book_call_click',
        userId: user.id,
        eventData: {
          providerId: provider.uid,
          providerType: provider.type,
          providerName: provider.fullName,
          providerOnlineStatus: onlineStatus.isOnline,
        },
      });
    }

    try {
      sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
    } catch {
      /* noop */
    }

    const redirectUrl = `/booking-request/${provider.uid}`;
    if (user) {
      navigate(redirectUrl, { state: { selectedProvider: provider, navigationSource: 'provider_profile' } });
    } else {
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`, {
        state: { selectedProvider: provider, navigationSource: 'provider_profile' },
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [provider, user, navigate, onlineStatus.isOnline]);

  // ------------------------------------------------------------
  // Partage
  // ------------------------------------------------------------
  const shareProfile = useCallback(
    async (platform: 'facebook' | 'twitter' | 'linkedin' | 'copy') => {
      if (!provider) return;

      const isLawyer = provider.type === 'lawyer';
      const countrySlug = (provider.country || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-');

      const langSlug =
        (provider.mainLanguage || provider.languages?.[0] || 'francais')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-');

      const nameSlug =
        provider.slug ||
        `${provider.firstName}-${provider.lastName}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-');

      const seoPath = `/${isLawyer ? 'avocat' : 'expatrie'}/${countrySlug}/${langSlug}/${nameSlug}-${provider.uid}`;
      const shareUrl = `${window.location.origin}${seoPath}`;
      const title = `${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country}`;

      // Web Share API si dispo
      if (platform === 'copy' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title, text: title, url: shareUrl });
          return;
        } catch {
          // fallback à la copie
        }
      }

      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
          break;
        case 'twitter':
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
            '_blank'
          );
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
          break;
        case 'copy':
          await navigator.clipboard.writeText(shareUrl);
          alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
          break;
      }
    },
    [provider, language]
  );

  // ------------------------------------------------------------
  // Interactions avis
  // ------------------------------------------------------------
  const handleHelpfulClick = useCallback(
    async (reviewId: string) => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        await incrementReviewHelpfulCount(reviewId);
        setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, helpfulVotes: (r.helpfulVotes || 0) + 1 } : r)));
      } catch (error) {
        console.error('[Reviews] helpful error:', error);
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
      const reason = prompt('Veuillez indiquer la raison du signalement:');
      if (!reason) return;
      try {
        await reportReview(reviewId, reason);
        alert("Merci pour votre signalement. Notre équipe va l'examiner.");
      } catch (error) {
        console.error('[Reviews] report error:', error);
      }
    },
    [user, navigate]
  );

  const renderStars = useCallback((rating: number) => {
    const safe = Number.isFinite(rating) ? rating : 4.8;
    const full = Math.floor(safe);
    const hasHalf = safe - full >= 0.5;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={
          i < full ? 'text-yellow-400 fill-current' : i === full && hasHalf ? 'text-yellow-400 fill-[url(#half-star)]' : 'text-gray-300'
        }
      />
    ));
  }, []);

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="large" color="red" text="Chargement du profil..." />
        </div>
      </Layout>
    );
  }

  if (notFound || !provider) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-8 text-center text-red-600 text-lg">Ce profil prestataire est introuvable. Redirection en cours...</div>
        </div>
      </Layout>
    );
  }

  const isLawyer = provider.type === 'lawyer';
  const isExpat = provider.type === 'expat';
  const avgRating = Number.isFinite(provider.rating) ? provider.rating : 4.8;

  return (
    <Layout>
      {provider && (
        <SEOHead
          title={`${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country} | SOS Expat & Travelers`}
          description={`Consultez ${provider.fullName}, ${isLawyer ? 'avocat' : 'expatrié'} francophone en ${provider.country}. ${
            provider.description?.substring(0, 120) || ''
          }...`}
          canonicalUrl={`/${isLawyer ? 'avocat' : 'expatrie'}/${provider.country
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')}/${(provider.languages?.[0] || 'francais')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')}/${provider.fullName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')}-${provider.uid}`}
          ogImage={provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png'}
          ogType="profile"
          structuredData={{
            '@context': 'https://schema.org',
            '@type': isLawyer ? 'Attorney' : 'Person',
            name: provider.fullName,
            image: provider.profilePhoto || provider.photoURL || provider.avatar || '',
            description: provider.description,
            telephone: '',
            email: '',
            address: { '@type': 'PostalAddress', addressCountry: provider.country },
            jobTitle: isLawyer ? 'Avocat' : 'Expatrié consultant',
            worksFor: { '@type': 'Organization', name: 'SOS Expat & Travelers' },
            knowsLanguage: provider.languages,
            review: { '@type': 'AggregateRating', ratingValue: avgRating, reviewCount: provider.reviewCount },
          }}
        />
      )}

      {/* SVG pattern for half stars */}
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
            <button onClick={() => navigate('/sos-appel')} className="text-red-200 hover:text-white mb-6 transition-colors">
              ← Retour aux experts
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <img
                      src={provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png'}
                      alt={`Photo de ${provider.fullName}`}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white/20 cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/default-avatar.png';
                      }}
                    />
                    {/* Status badge */}
                    <div
                      className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white transition-all duration-500 ${
                        onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {onlineStatus.isOnline && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>}
                    </div>
                    {!onlineStatus.listenerActive && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-3xl font-bold">{provider.fullName}</h1>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isLawyer ? 'bg-blue-500/20 text-blue-100' : 'bg-green-500/20 text-green-100'
                        }`}
                      >
                        {isLawyer ? 'Avocat certifié' : 'Expatrié expert'}
                      </span>
                      {provider.isVerified && <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">✓ Vérifié</span>}

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold transition-all duration-500 border-2 ${
                          onlineStatus.isOnline
                            ? 'bg-green-500 text-white border-green-300 shadow-lg shadow-green-500/50'
                            : 'bg-red-500 text-white border-red-300'
                        }`}
                      >
                        {onlineStatus.isOnline ? '🟢 EN LIGNE' : '🔴 HORS LIGNE'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-red-100 mb-4">
                      <div className="flex items-center space-x-1">
                        <MapPin size={16} />
                        <span>{provider.country}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isLawyer ? <Briefcase size={16} /> : <Users size={16} />}
                        <span>
                          {isLawyer
                            ? `${provider.yearsOfExperience || 0} ans d'expérience`
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ans d'expatriation`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={16} />
                        <span>Répond en {provider.responseTime || '< 5 minutes'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      {renderStars(avgRating)}
                      <span className="text-red-100 font-medium">{avgRating.toFixed(2)}</span>
                      <span className="text-red-200">({provider.reviewCount || reviews.length || 0} avis)</span>
                    </div>

                    <div className="text-red-100 leading-relaxed">
                      <p className="mb-2 whitespace-pre-line">{provider.description || 'Aucune description professionnelle disponible.'}</p>

                      {isLawyer && provider.motivation && provider.motivation.trim() !== '' && (
                        <div className="mt-4 pt-4 border-t border-red-200/30">
                          <h3 className="text-lg font-semibold text-white mb-2">Description professionnelle</h3>
                          <p className="text-red-100 whitespace-pre-line">{provider.motivation}</p>
                        </div>
                      )}

                      {!isLawyer && provider.motivation && provider.motivation.trim() !== '' && (
                        <div className="mt-4 pt-4 border-t border-red-200/30">
                          <h3 className="text-lg font-semibold text-white mb-2">Pourquoi souhaitez-vous aider ?</h3>
                          <p className="text-red-100 whitespace-pre-line">{provider.motivation}</p>
                        </div>
                      )}
                    </div>

                    {/* Partage social */}
                    <div className="flex items-center space-x-3 mt-4">
                      <span className="text-red-200">Partager :</span>
                      <button onClick={() => shareProfile('facebook')} className="text-white hover:text-red-200 transition-colors" aria-label="Facebook">
                        <Facebook size={20} />
                      </button>
                      <button onClick={() => shareProfile('twitter')} className="text-white hover:text-red-200 transition-colors" aria-label="Twitter">
                        <Twitter size={20} />
                      </button>
                      <button onClick={() => shareProfile('linkedin')} className="text-white hover:text-red-200 transition-colors" aria-label="LinkedIn">
                        <Linkedin size={20} />
                      </button>
                      <button onClick={() => shareProfile('copy')} className="text-white hover:text-red-200 transition-colors" aria-label="Copier le lien">
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-xl p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-red-600 mb-2">€{provider.price}</div>
                    <div className="text-gray-600">{provider.duration || (isLawyer ? 20 : 30)} minutes</div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Taux de succès</span>
                      <span className="font-medium text-green-600">{provider.successRate || 98}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Temps de réponse</span>
                      <span className="font-medium">{provider.responseTime || '< 5 minutes'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-600 font-medium">Disponibilité</span>
                      <span
                        className={`font-bold text-sm px-3 py-1 rounded-full transition-all duration-500 ${
                          onlineStatus.isOnline ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {onlineStatus.isOnline ? '🟢 EN LIGNE' : '🔴 HORS LIGNE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Appels réalisés</span>
                      <span className="font-medium">{provider.totalCalls || 0}</span>
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
                    <span>{onlineStatus.isOnline ? 'RÉSERVER MAINTENANT' : 'NON DISPONIBLE'}</span>
                    {onlineStatus.isOnline && (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse delay-150"></div>
                      </div>
                    )}
                  </button>

                  <div className="mt-4 text-center text-sm">
                    {onlineStatus.isOnline ? (
                      <div className="text-green-600 font-medium">✅ Expert disponible maintenant !</div>
                    ) : (
                      <div className="text-red-600">❌ Expert actuellement hors ligne</div>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <Shield size={16} />
                      <span>Paiement sécurisé • Satisfaction garantie</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
          </div>
        </div>

        {/* Content body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8" id="reviews-section">
              {/* Specialties */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Spécialités</h2>
                {isLawyer ? (
                  <div className="flex flex-wrap gap-2">
                    {(provider.specialties || []).map((specialty, index) => (
                      <span key={index} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(provider.helpTypes || provider.specialties || []).map((helpType, index) => (
                      <span key={index} className="px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {helpType}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Langues parlées</h2>
                <div className="flex flex-wrap gap-2">
                  {(provider.languages || []).map((lang, index) => (
                    <span key={index} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center">
                      <Globe size={14} className="mr-1" />
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education & Certifications (lawyers) */}
              {isLawyer && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Formation et certifications</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Formation</h3>
                      <div className="flex items-center space-x-2">
                        <GraduationCap size={18} className="text-blue-600" />
                        <p className="text-gray-600">
                          {provider.lawSchool || provider.education || 'Non renseigné'}
                          {provider.graduationYear ? ` (${provider.graduationYear})` : ''}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Certifications</h3>
                      <ul className="space-y-1">
                        {(provider.certifications || []).map((cert, index) => (
                          <li key={index} className="text-gray-600 flex items-center">
                            <Award size={14} className="mr-2 text-yellow-500" />
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Expérience d'expatriation (expats) */}
              {!isLawyer && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Expérience d'expatriation</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Expérience</h3>
                      <div className="flex items-center space-x-2">
                        <Users size={18} className="text-green-600 flex-shrink-0" />
                        <p className="text-gray-600">
                          {provider.yearsAsExpat || provider.yearsOfExperience || 0} ans d'expatriation en {provider.country}
                        </p>
                      </div>
                    </div>

                    {provider.experienceDescription && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Détail de l'expérience</h3>
                        <p className="text-gray-600 whitespace-pre-line">{provider.experienceDescription}</p>
                      </div>
                    )}

                    {provider.motivation && provider.motivation.trim() !== '' && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Motivation</h3>
                        <p className="text-gray-600 whitespace-pre-line">{provider.motivation}</p>
                      </div>
                    )}

                    {(provider.education || provider.lawSchool) && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Formation</h3>
                        <p className="text-gray-600">
                          {provider.lawSchool || provider.education}
                          {provider.graduationYear ? ` (${provider.graduationYear})` : ''}
                        </p>
                      </div>
                    )}
                    {provider.certifications && provider.certifications.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Certifications</h3>
                        <ul className="space-y-1">
                          {provider.certifications.map((cert, index) => (
                            <li key={index} className="text-gray-600 flex items-center">
                              <Award size={14} className="mr-2 text-green-500" />
                              {cert}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Avis clients ({reviews.length || 0})</h2>

                {isLoadingReviews ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Chargement des avis...</p>
                  </div>
                ) : (
                  <>
                    <Reviews mode="summary" averageRating={avgRating} totalReviews={reviews.length} ratingDistribution={ratingDistribution} />
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
                {/* Quick Stats */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Statistiques</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Note moyenne</span>
                      <span className="font-medium">{avgRating.toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avis clients</span>
                      <span className="font-medium">{reviews.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux de succès</span>
                      <span className="font-medium text-green-600">{provider.successRate || 98}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expérience</span>
                      <span className="font-medium">
                        {isLawyer ? `${provider.yearsOfExperience || 0} ans` : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ans`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info + statut */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Informations</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>Basé en {provider.country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Languages size={16} className="text-gray-400" />
                      <span>Parle {(provider.languages || []).join(', ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-400" />
                      <span>Répond en {provider.responseTime || '< 5 minutes'}</span>
                    </div>

                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg transition-all duration-500 ${
                        onlineStatus.isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                          onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                        } relative`}
                      >
                        {onlineStatus.isOnline && <div className="w-6 h-6 rounded-full bg-green-500 animate-ping opacity-75 absolute"></div>}
                        <div className="w-3 h-3 bg-white rounded-full relative z-10"></div>
                      </div>
                      <span className={`font-bold transition-all duration-500 ${onlineStatus.isOnline ? 'text-green-700' : 'text-red-700'}`}>
                        {onlineStatus.isOnline ? 'EN LIGNE MAINTENANT' : 'HORS LIGNE'}
                      </span>
                    </div>

                    {provider.isVerified && (
                      <div className="flex items-center space-x-2">
                        <Shield size={16} className="text-gray-400" />
                        <span>Expert vérifié</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* /Sidebar */}
          </div>
        </div>
      </div>

      {/* Modal photo */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png'}
              alt={`Photo de ${provider.fullName}`}
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/default-avatar.png';
              }}
            />
            <button
              className="absolute top-4 right-4 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200"
              onClick={() => setShowImageModal(false)}
              aria-label="Fermer"
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
