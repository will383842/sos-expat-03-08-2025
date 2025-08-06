import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Star, MapPin, Phone, ChevronLeft, ChevronRight, Globe, Search, ArrowDown, ArrowUp, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, limit, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useApp } from '../../contexts/AppContext';
import { getCountryCoordinates } from '../../utils/countryCoordinates';

// Enhanced types for 2025 standards with AI-friendly structure
interface FirebaseDocumentSnapshot {
  id: string;
  data: () => Record<string, any> | undefined;
}

interface Provider {
  readonly id: string;
  readonly name: string;
  readonly fullName: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly type: 'lawyer' | 'expat';
  readonly country: string;
  readonly countryCode?: string;
  readonly languages: readonly string[];
  readonly specialties: readonly string[];
  readonly rating: number;
  readonly reviewCount: number;
  readonly yearsOfExperience: number;
  readonly isOnline: boolean;
  readonly avatar: string;
  readonly description: string;
  readonly price: number;
  readonly duration: number;
  readonly isApproved: boolean;
  readonly isVisible: boolean;
  readonly isActive: boolean;
  readonly createdAt?: number;
  readonly updatedAt?: number;
  readonly timezone?: string;
  readonly responseTime?: string;
  readonly successRate?: number;
  readonly certifications?: readonly string[];
  readonly slug?: string;
  readonly toLowerCase?: never; // Prevent string methods on Provider
  readonly split?: never; // Prevent string methods on Provider
  readonly toMillis?: never; // Prevent Firebase methods on Provider
}

interface ProfileCardsProps {
  readonly mode?: 'carousel' | 'grid';
  readonly filter?: 'all' | 'lawyer' | 'expat' | 'providers-only';
  readonly maxItems?: number;
  readonly onProviderClick?: (provider: Provider) => void;
  readonly itemsPerPage?: number;
  readonly showFilters?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly testId?: string;
  readonly priority?: 'high' | 'low';
}

// 2025 Constants with performance optimization
const DEFAULT_AVATAR = '/images/default-avatar.webp';
const FIREBASE_COLLECTION = 'sos_profiles';
const DEFAULT_ITEMS_PER_PAGE = 9;
const DEFAULT_MAX_ITEMS = 100;
const CAROUSEL_VISIBLE_ITEMS = 3;
const DEBOUNCE_DELAY = 300;
const IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

// Performance optimization hook for debouncing
const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

const ProfileCards: React.FC<ProfileCardsProps> = ({
  mode = 'carousel',
  filter = 'all',
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  maxItems = DEFAULT_MAX_ITEMS,
  onProviderClick,
  showFilters = true,
  className = '',
  ariaLabel,
  testId,
  priority = 'high',
}) => {
  const { language = 'fr' } = useApp();
  const navigate = useNavigate();
  
  // Core states with performance optimization
  const [providers, setProviders] = useState<readonly Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<readonly Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states with AI-friendly structure
  const [activeFilter, setActiveFilter] = useState<'all' | 'lawyer' | 'expat'>(
    filter === 'providers-only' ? 'all' : filter as 'all' | 'lawyer' | 'expat'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'experience'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Navigation states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Mobile filter toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Debounced search for performance
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
  
  // Memoized filter options for AI indexing
  const availableCountries = useMemo(() => 
    Array.from(new Set(providers.map(p => p.country)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, language, { sensitivity: 'base' })),
    [providers, language]
  );
  
  const availableLanguages = useMemo(() => 
    Array.from(new Set(providers.flatMap(p => p.languages)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, language, { sensitivity: 'base' })),
    [providers, language]
  );

  // Enhanced Firebase document transformation for AI compatibility
  const transformFirestoreDoc = useCallback((doc: FirebaseDocumentSnapshot): Provider | null => {
    try {
      const data = doc.data();
      
      if (!data || typeof data !== 'object') {
        console.warn(`[ProfileCards] Invalid document data for ${doc.id}`);
        return null;
      }
      
      // Enhanced validation with AI-friendly structure
      const firstName = String(data.firstName || '').trim();
      const lastName = String(data.lastName || '').trim();
      const fullName = String(data.fullName || `${firstName} ${lastName}`).trim();
      
      if (!fullName || fullName.length < 2) {
        console.warn(`[ProfileCards] Invalid name for document ${doc.id}`);
        return null;
      }

      const typeRaw = data.type;
      if (typeRaw !== 'lawyer' && typeRaw !== 'expat') {
        console.warn(`[ProfileCards] Invalid type for document ${doc.id}: ${typeRaw}`);
        return null;
      }

      const country = String(data.currentPresenceCountry || data.country || '').trim();
      if (!country || !getCountryCoordinates(country)) {
        console.warn(`[ProfileCards] Invalid country for document ${doc.id}: ${country}`);
        return null;
      }
      
      // Safe array extraction
      const languages = Array.isArray(data.languages) && data.languages.length > 0 
        ? data.languages.filter((lang: unknown) => typeof lang === 'string' && lang.trim().length > 0)
        : [language === 'fr' ? 'Français' : 'English'];
        
      const specialties = Array.isArray(data.specialties) 
        ? data.specialties.filter((spec: unknown) => typeof spec === 'string' && spec.trim().length > 0)
        : [];
        
      const certifications = Array.isArray(data.certifications) 
        ? data.certifications.filter((cert: unknown) => typeof cert === 'string' && cert.trim().length > 0)
        : [];
      
      // Safe timestamp conversion
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now());
      const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now());
      
      // AI-optimized provider object with rich metadata
      const provider: Provider = {
        id: doc.id,
        name: fullName,
        fullName,
        firstName: firstName || fullName.split(' ')[0] || '',
        lastName: lastName || fullName.split(' ').slice(1).join(' ') || '',
        type: typeRaw,
        country,
        countryCode: String(data.countryCode || '').trim(),
        languages: Object.freeze(languages),
        specialties: Object.freeze(specialties),
        rating: Math.max(0, Math.min(5, Number(data.rating) || 4.5)),
        reviewCount: Math.max(0, Number(data.reviewCount) || 0),
        yearsOfExperience: Math.max(0, Number(data.yearsOfExperience) || Number(data.yearsAsExpat) || 0),
        isOnline: Boolean(data.isOnline),
        isApproved: data.isApproved !== false,
        isVisible: data.isVisible !== false,
        isActive: data.isActive !== false,
        avatar: String(data.profilePhoto || data.photoURL || data.avatar || DEFAULT_AVATAR),
        description: String(data.description || data.bio || 
          (typeRaw === 'lawyer' 
            ? `Expert juridique en ${country} avec ${Number(data.yearsOfExperience) || 0} ans d'expérience`
            : `Expert expatriation en ${country} avec ${Number(data.yearsAsExpat) || 0} ans d'expérience`
          )),
        price: Math.max(1, Number(data.price) || (typeRaw === 'lawyer' ? 49 : 19)),
        duration: Math.max(1, Number(data.duration) || (typeRaw === 'lawyer' ? 20 : 30)),
        createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
        updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
        timezone: String(data.timezone || '').trim(),
        responseTime: String(data.responseTime || '< 5 minutes'),
        successRate: Math.max(0, Math.min(100, Number(data.successRate) || 95)),
        certifications: Object.freeze(certifications),
        slug: String(data.slug || fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
      };
      
      return provider;
      
    } catch (error) {
      console.error(`[ProfileCards] Error transforming document ${doc.id}:`, error);
      return null;
    }
  }, [language]);

  // Enhanced Firebase query with 2025 optimization
  const loadProviders = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      // AI-optimized Firebase query with proper indexing
      let firestoreQuery = query(
        collection(db, FIREBASE_COLLECTION),
        orderBy('isOnline', 'desc'),
        orderBy('rating', 'desc'),
        orderBy('updatedAt', 'desc'),
        limit(maxItems)
      );

      // Enhanced filters for providers
      if (filter === 'providers-only') {
        firestoreQuery = query(
          collection(db, FIREBASE_COLLECTION),
          where('isApproved', '==', true),
          where('isVisible', '==', true),
          where('isActive', '==', true),
          orderBy('isOnline', 'desc'),
          orderBy('rating', 'desc'),
          limit(maxItems)
        );
      }
      
      const unsubscribe = onSnapshot(
        firestoreQuery, 
        (snapshot) => {
          const validProviders: Provider[] = [];

          snapshot.docs.forEach((doc) => {
            const provider = transformFirestoreDoc(doc);
            if (provider) {
              validProviders.push(provider);
            }
          });

          // Performance optimization: freeze array
          setProviders(Object.freeze(validProviders));
          setIsLoading(false);
          
          if (validProviders.length === 0 && !error) {
            setError('Aucun prestataire trouvé');
          }
        }, 
        (firebaseError) => {
          console.error('[ProfileCards] Firebase error:', firebaseError);
          setError('Erreur de chargement des prestataires');
          setProviders([]);
          setIsLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('[ProfileCards] Query construction error:', error);
      setError('Erreur de configuration');
      setIsLoading(false);
      return () => {};
    }
  }, [maxItems, filter, transformFirestoreDoc, error]);

  // Effect with cleanup for memory optimization
  useEffect(() => {
    const unsubscribe = loadProviders();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadProviders]);

  // AI-optimized filtering with semantic search capabilities
  const { filteredAndSortedProviders, totalPages } = useMemo(() => {
    if (!providers.length) {
      return { filteredAndSortedProviders: [], totalPages: 1 };
    }
    
    let filtered = [...providers];
    
    // Base filters with AI-friendly logic
    if (filter === 'providers-only') {
      filtered = filtered.filter(provider => 
        provider.type === 'expat' || (provider.type === 'lawyer' && provider.isApproved)
      );
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter(provider => provider.type === activeFilter);
    }
    
    // Enhanced semantic search for AI compatibility
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      const searchTerms = searchLower.split(' ').filter(Boolean);
      
      filtered = filtered.filter(provider => {
        const searchableContent = [
          provider.name,
          provider.fullName,
          provider.firstName,
          provider.lastName,
          provider.country,
          provider.description,
          ...provider.languages,
          ...provider.specialties,
          ...(provider.certifications || []),
          provider.type === 'lawyer' ? 'avocat juriste juridique droit' : 'expatrié expat immigration visa',
        ].join(' ').toLowerCase();
        
        // Multi-term search with relevance
        return searchTerms.every(term => 
          searchableContent.includes(term) ||
          // Fuzzy matching for typos
          searchableContent.includes(term.slice(0, -1)) ||
          searchableContent.includes(term + 's')
        );
      });
    }
    
    // Geographic and language filters
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(provider => provider.country === selectedCountry);
    }
    
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(provider => 
        provider.languages.includes(selectedLanguage)
      );
    }
    
    if (onlineOnly) {
      filtered = filtered.filter(provider => provider.isOnline);
    }
    
    // AI-friendly sorting with multiple criteria
    filtered.sort((a, b) => {
      // Priority to online providers
      if (a.isOnline !== b.isOnline) {
        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      }
      
      const factor = sortOrder === 'asc' ? 1 : -1;
      
      switch (sortBy) {
        case 'rating': {
          const ratingDiff = (b.rating - a.rating) * factor;
          return ratingDiff !== 0 ? ratingDiff : (b.reviewCount - a.reviewCount);
        }
        case 'price':
          return (a.price - b.price) * factor;
        case 'experience':
          return (b.yearsOfExperience - a.yearsOfExperience) * factor;
        default:
          return 0;
      }
    });

    const pages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    
    return { 
      filteredAndSortedProviders: Object.freeze(filtered), 
      totalPages: pages 
    };
  }, [
    providers, filter, activeFilter, debouncedSearchTerm, selectedCountry, 
    selectedLanguage, onlineOnly, sortBy, sortOrder, itemsPerPage
  ]);

  // Update filtered providers with performance optimization
  useEffect(() => {
    setFilteredProviders(filteredAndSortedProviders);
    
    // Smart page adjustment
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedProviders, totalPages, currentPage]);

  // Mobile-optimized navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentIndex(prevIndex => {
      const maxIndex = Math.max(0, filteredProviders.length - CAROUSEL_VISIBLE_ITEMS);
      return prevIndex === 0 ? maxIndex : Math.max(0, prevIndex - 1);
    });
  }, [filteredProviders.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      const maxIndex = Math.max(0, filteredProviders.length - CAROUSEL_VISIBLE_ITEMS);
      return prevIndex >= maxIndex ? 0 : prevIndex + 1;
    });
  }, [filteredProviders.length]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Smooth scroll for better mobile UX
      const element = document.querySelector('[data-testid="providers-grid"]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [totalPages]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // 🔧 CORRECTION PRINCIPALE - Enhanced profile view handler avec navigation state corrigée
  const handleViewProfile = useCallback((provider: Provider) => {
    try {
      // Analytics tracking for AI optimization
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'view_provider', {
          provider_id: provider.id,
          provider_type: provider.type,
          provider_country: provider.country,
          is_online: provider.isOnline,
        });
      }

      if (onProviderClick) {
        onProviderClick(provider);
        return;
      }

      // ✅ CORRECTION : Créer serviceData compatible avec CallCheckoutWrapper
      const serviceData = {
        type: provider.type === 'lawyer' ? 'lawyer_call' : 'expat_call' as 'lawyer_call' | 'expat_call',
        providerType: provider.type,
        price: provider.price,
        duration: `${provider.duration} min`,
        languages: [...provider.languages],
        country: provider.country,
        specialties: [...provider.specialties],
        isOnline: provider.isOnline,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        description: provider.description,
        responseTime: provider.responseTime,
        successRate: provider.successRate,
        certifications: provider.certifications ? [...provider.certifications] : []
      };

      // ✅ CORRECTION MAJEURE : TOUJOURS rediriger vers la page de profil
      // La page de profil gère elle-même la logique de réservation avec son bouton "RÉSERVER MAINTENANT"
      const navigationTarget = `/provider/${provider.slug || provider.id}`;
      
      // ✅ Navigation vers la page de profil pour TOUS les providers (en ligne ou hors ligne)
      navigate(navigationTarget, { 
        state: { 
          selectedProvider: provider,  // ✅ Nom correct attendu par ProviderProfile
          serviceData: serviceData      // ✅ Nom correct pour compatibilité
        },
        replace: false 
      });
      
      // 🔧 AMÉLIORATION : Garder sessionStorage comme fallback mais pas comme méthode principale
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
          sessionStorage.setItem('serviceData', JSON.stringify(serviceData));
        } catch (storageError) {
          console.warn('[ProfileCards] SessionStorage fallback failed:', storageError);
        }
      }
      
    } catch (error) {
      console.error('[ProfileCards] Navigation error:', error);
      
      // 🔧 FALLBACK SÉCURISÉ : Si navigation échoue, au moins essayer le sessionStorage
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
          navigate(`/provider/${provider.slug || provider.id}`, { replace: false });
        }
      } catch (fallbackError) {
        console.error('[ProfileCards] Fallback navigation failed:', fallbackError);
      }
    }
  }, [onProviderClick, navigate]);

  // AI-optimized star rating component
  const StarRating = React.memo(({ rating, reviewCount }: { rating: number; reviewCount: number }) => {
    const stars = useMemo(() => {
      const result = [];
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;
      
      for (let i = 0; i < fullStars; i++) {
        result.push(
          <Star 
            key={i} 
            size={14} 
            aria-hidden="true"
            fill="currentColor"
            className="text-yellow-400"
          />
        );
      }
      
      if (hasHalfStar) {
        result.push(
          <Star 
            key="half" 
            size={14} 
            aria-hidden="true"
            fill="currentColor"
            className="text-yellow-400 opacity-50"
          />
        );
      }
      
      const emptyStars = 5 - Math.ceil(rating);
      for (let i = 0; i < emptyStars; i++) {
        result.push(
          <Star 
            key={`empty-${i}`} 
            size={14} 
            aria-hidden="true"
            className="text-gray-300"
          />
        );
      }
      
      return result;
    }, [rating]);

    return (
      <div 
        role="img" 
        aria-label={`Note ${rating.toFixed(1)} sur 5 basée sur ${reviewCount} avis`}
        className="flex items-center gap-1"
      >
        {stars}
        <span className="text-xs text-gray-600 ml-1">
          {rating.toFixed(1)} ({reviewCount})
        </span>
      </div>
    );
  });

  const resetFilters = useCallback(() => {
    setActiveFilter('all');
    setSearchTerm('');
    setSelectedCountry('all');
    setSelectedLanguage('all');
    setOnlineOnly(false);
    setSortBy('rating');
    setSortOrder('desc');
    setCurrentPage(1);
    setCurrentIndex(0);
    setShowMobileFilters(false);
  }, []);

  // Display providers with pagination
  const displayProviders = useMemo(() => {
    if (mode === 'grid') {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredProviders.slice(startIndex, startIndex + itemsPerPage);
    }
    return filteredProviders;
  }, [mode, filteredProviders, currentPage, itemsPerPage]);

  // ✨ UX PARFAIT - AI and SEO optimized provider card avec design mobile-first
  const ProviderCard = React.memo(({ 
    provider, 
    isCarousel = false 
  }: { 
    provider: Provider; 
    isCarousel?: boolean; 
  }) => {
    const cardSchema = useMemo(() => ({
      "@context": "https://schema.org",
      "@type": provider.type === 'lawyer' ? "LegalService" : "Service",
      "name": provider.name,
      "description": provider.description,
      "provider": {
        "@type": "Person",
        "name": provider.name,
        "image": provider.avatar,
        "jobTitle": provider.type === 'lawyer' ? 'Avocat' : 'Expert Expatriation',
      },
      "areaServed": provider.country,
      "availableLanguage": provider.languages,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": provider.rating,
        "reviewCount": provider.reviewCount,
        "bestRating": 5,
        "worstRating": 1
      },
      "offers": {
        "@type": "Offer",
        "price": provider.price,
        "priceCurrency": "EUR",
        "availability": provider.isOnline ? "InStock" : "OutOfStock"
      }
    }), [provider]);

    return (
      <article
        onClick={() => handleViewProfile(provider)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleViewProfile(provider);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Contacter ${provider.name}, ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'} en ${provider.country}`}
        className={`
          group relative bg-white rounded-2xl shadow-sm hover:shadow-xl 
          border border-gray-100 hover:border-gray-200 
          transition-all duration-300 ease-out hover:scale-[1.02] cursor-pointer
          overflow-hidden flex flex-col
          ${isCarousel ? 'min-h-[440px] max-h-[440px]' : 'min-h-[520px] max-h-[520px]'}
          w-full
        `}
        data-provider-id={provider.id}
        data-provider-type={provider.type}
        data-provider-country={provider.country}
        itemScope
        itemType={provider.type === 'lawyer' ? "http://schema.org/LegalService" : "http://schema.org/Service"}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cardSchema) }}
        />
        
        {/* ✨ Header Section avec indicateur de statut ultra-visible */}
        <div className="relative p-4 pb-2">
          {/* Avatar avec statut en ligne */}
          <div className="relative mx-auto w-20 h-20 mb-3">
            <img
              src={provider.avatar}
              alt={`Photo de profil de ${provider.name}`}
              loading={priority === 'high' ? 'eager' : 'lazy'}
              decoding="async"
              width={80}
              height={80}
              sizes={IMAGE_SIZES}
              itemProp="image"
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== DEFAULT_AVATAR) {
                  target.src = DEFAULT_AVATAR;
                }
              }}
            />
            
            {/* ✨ Indicateur de statut ultra-visible avec animation */}
            <div className={`
              absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-3 border-white
              flex items-center justify-center text-white text-xs font-bold
              transition-all duration-500 shadow-lg
              ${provider.isOnline 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-red-500'
              }
            `}>
              {provider.isOnline ? '●' : '●'}
            </div>
          </div>
          
          {/* Badges de type et statut */}
          <div className="flex justify-center gap-2 mb-3">
            <span className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${provider.type === 'lawyer' 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-purple-100 text-purple-700 border border-purple-200'
              }
            `}>
              {provider.type === 'lawyer' ? 'Avocat' : 'Expert'}
            </span>
            
            <span className={`
              px-3 py-1 rounded-full text-xs font-bold border-2
              ${provider.isOnline 
                ? 'bg-green-50 text-green-700 border-green-300' 
                : 'bg-red-50 text-red-600 border-red-300'
              }
            `}>
              {provider.isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
            </span>
          </div>
          
          {/* Nom et localisation */}
          <div className="text-center mb-3">
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2" itemProp="name">
              {provider.name}
            </h3>
            
            <div className="flex items-center justify-center text-gray-600 text-sm" itemProp="areaServed">
              <MapPin size={14} className="mr-1 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{provider.country}</span>
            </div>
          </div>
        </div>
        
        {/* ✨ Content Section - flex-grow pour même hauteur */}
        <div className="px-4 flex-grow flex flex-col">
          {/* Rating */}
          <div className="flex justify-center mb-3" itemProp="aggregateRating" itemScope itemType="http://schema.org/AggregateRating">
            <StarRating rating={provider.rating} reviewCount={provider.reviewCount} />
            <span itemProp="ratingValue" className="sr-only">{provider.rating}</span>
            <span itemProp="reviewCount" className="sr-only">{provider.reviewCount}</span>
          </div>
          
          {/* Languages */}
          <div className="flex flex-wrap justify-center gap-1 mb-3" itemProp="availableLanguage">
            {provider.languages.slice(0, 2).map((lang) => (
              <span key={lang} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                <Globe size={10} className="mr-1" aria-hidden="true" />
                {lang}
              </span>
            ))}
            {provider.languages.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs">
                +{provider.languages.length - 2}
              </span>
            )}
          </div>
          
          {/* Description - flexible height */}
          <div className="flex-grow flex items-start mb-4">
            <p className="text-sm text-gray-600 text-center line-clamp-3 leading-relaxed" itemProp="description">
              {provider.description}
            </p>
          </div>
          
          {/* Prix et expérience */}
          <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">Expérience</div>
              <div className="font-semibold">{provider.yearsOfExperience} ans</div>
            </div>
            <div className="text-center" itemProp="offers" itemScope itemType="http://schema.org/Offer">
              <div className="text-xs text-gray-500">Prix</div>
              <div className="font-bold text-lg text-red-600" itemProp="price">
                {provider.price}€
                <span itemProp="priceCurrency" className="sr-only">EUR</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Durée</div>
              <div className="font-semibold">{provider.duration} min</div>
            </div>
          </div>
        </div>
        
        {/* ✨ Footer Section - CTA Button */}
        <div className="p-4 pt-0">
          <button
            className={`
              w-full py-3 px-4 rounded-xl font-bold text-sm
              transition-all duration-300 ease-out transform hover:scale-105
              focus:outline-none focus:ring-4 focus:ring-opacity-50
              flex items-center justify-center space-x-2
              ${provider.isOnline 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500 border-2 border-green-500' 
                : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg focus:ring-gray-500 border-2 border-gray-500'
              }
            `}
            onClick={(e) => {
              e.stopPropagation();
              handleViewProfile(provider);
            }}
            aria-label={`Voir le profil de ${provider.name}`}
          >
            <Phone size={16} aria-hidden="true" />
            <span>Voir le profil</span>
            {provider.isOnline && (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse delay-150"></div>
              </div>
            )}
          </button>
        </div>
      </article>
    );
  });

  // ✨ Performance-optimized loading skeleton avec dimensions fixes
  const LoadingSkeleton = React.memo(({ count = 6 }: { count?: number }) => (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`
          bg-white rounded-2xl shadow-sm border border-gray-100
          overflow-hidden animate-pulse
          ${mode === 'carousel' ? 'min-h-[440px] max-h-[440px]' : 'min-h-[520px] max-h-[520px]'}
          w-full
        `} aria-hidden="true">
          <div className="p-4">
            {/* Avatar skeleton */}
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3"></div>
            
            {/* Badges skeleton */}
            <div className="flex justify-center gap-2 mb-3">
              <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
              <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
            </div>
            
            {/* Name and location skeleton */}
            <div className="text-center mb-3">
              <div className="w-32 h-5 bg-gray-200 rounded mx-auto mb-2"></div>
              <div className="w-24 h-4 bg-gray-200 rounded mx-auto"></div>
            </div>
            
            {/* Rating skeleton */}
            <div className="w-20 h-4 bg-gray-200 rounded mx-auto mb-3"></div>
            
            {/* Languages skeleton */}
            <div className="flex justify-center gap-1 mb-3">
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
              <div className="w-14 h-6 bg-gray-200 rounded"></div>
            </div>
            
            {/* Description skeleton */}
            <div className="space-y-2 mb-4">
              <div className="w-full h-3 bg-gray-200 rounded"></div>
              <div className="w-4/5 h-3 bg-gray-200 rounded mx-auto"></div>
              <div className="w-3/4 h-3 bg-gray-200 rounded mx-auto"></div>
            </div>
            
            {/* Stats skeleton */}
            <div className="flex justify-between mb-4">
              <div className="text-center">
                <div className="w-12 h-3 bg-gray-200 rounded mb-1"></div>
                <div className="w-8 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="text-center">
                <div className="w-8 h-3 bg-gray-200 rounded mb-1"></div>
                <div className="w-12 h-5 bg-gray-200 rounded"></div>
              </div>
              <div className="text-center">
                <div className="w-10 h-3 bg-gray-200 rounded mb-1"></div>
                <div className="w-12 h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            {/* Button skeleton */}
            <div className="w-full h-12 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      ))}
    </>
  ));

  // ✨ Mobile Filter Component
  const MobileFilters = React.memo(() => (
    <div className={`
      fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity duration-300
      ${showMobileFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `} onClick={() => setShowMobileFilters(false)}>
      <div className={`
        fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto
        transform transition-transform duration-300 ease-out
        ${showMobileFilters ? 'translate-y-0' : 'translate-y-full'}
      `} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Filtres</h3>
          <button
            onClick={() => setShowMobileFilters(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Filter Content */}
        <div className="space-y-6">
          {/* Type Filter */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Type d'expert</h4>
            <div className="grid grid-cols-3 gap-2">
              {['all', 'lawyer', 'expat'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setActiveFilter(filterType as 'all' | 'lawyer' | 'expat')}
                  className={`
                    py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${activeFilter === filterType
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {filterType === 'all' ? 'Tous' : filterType === 'lawyer' ? 'Avocats' : 'Experts'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Search */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Recherche</h4>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          
          {/* Country Filter */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Pays</h4>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">Tous les pays</option>
              {availableCountries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          
          {/* Language Filter */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Langues</h4>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">Toutes les langues</option>
              {availableLanguages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          
          {/* Online Only */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="font-medium text-gray-900">En ligne uniquement</span>
            </label>
          </div>
          
          {/* Sort */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Trier par</h4>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'experience')}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="rating">Note</option>
                <option value="price">Prix</option>
                <option value="experience">Expérience</option>
              </select>
              <button
                onClick={toggleSortOrder}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={resetFilters}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Réinitialiser
          </button>
          <button
            onClick={() => setShowMobileFilters(false)}
            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  ));

  // Main render - Grid mode with perfect mobile-first UX
  if (mode === 'grid') {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <section 
          className={`${className} w-full`}
          aria-label={ariaLabel || 'Liste des prestataires disponibles'}
          data-testid={testId || 'providers-grid'}
          role="main"
        >
          {showFilters && (
            <>
              {/* ✨ Desktop Filters */}
              <div className="hidden lg:block mb-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  {/* Primary filters */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                      {['all', 'lawyer', 'expat'].map((filterType) => (
                        <button
                          key={filterType}
                          onClick={() => setActiveFilter(filterType as 'all' | 'lawyer' | 'expat')}
                          className={`
                            py-2 px-4 rounded-lg text-sm font-medium transition-all
                            ${activeFilter === filterType
                              ? 'bg-red-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                          `}
                        >
                          {filterType === 'all' ? 'Tous' : filterType === 'lawyer' ? 'Avocats' : 'Experts'}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={resetFilters}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Réinitialiser
                    </button>
                  </div>
                  
                  {/* Advanced filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                      <div className="relative">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="search"
                          placeholder="Rechercher un prestataire..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Country */}
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    >
                      <option value="all">Tous les pays</option>
                      {availableCountries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    
                    {/* Language */}
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                    >
                      <option value="all">Toutes les langues</option>
                      {availableLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    
                    {/* Sort and Online */}
                    <div className="flex space-x-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'experience')}
                        className="flex-1 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                      >
                        <option value="rating">Note</option>
                        <option value="price">Prix</option>
                        <option value="experience">Expérience</option>
                      </select>
                      <button
                        onClick={toggleSortOrder}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Online filter */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={onlineOnly}
                        onChange={(e) => setOnlineOnly(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">Afficher uniquement les experts en ligne</span>
                    </label>
                    
                    {/* Results count */}
                    <div className="text-sm text-gray-600">
                      {filteredProviders.length} expert{filteredProviders.length > 1 ? 's' : ''} trouvé{filteredProviders.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ✨ Mobile Filter Button */}
              <div className="lg:hidden mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {filteredProviders.length} expert{filteredProviders.length > 1 ? 's' : ''}
                  </div>
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Filter size={16} />
                    <span>Filtres</span>
                  </button>
                </div>
              </div>
              
              {/* Mobile Filters Modal */}
              <MobileFilters />
            </>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-3">
                <div className="text-red-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-800 font-medium">{error}</p>
                  <button 
                    onClick={loadProviders}
                    className="text-red-600 hover:text-red-800 text-sm font-medium underline mt-1"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✨ Providers Grid - Mobile First avec dimensions fixes */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            role="tabpanel"
            aria-labelledby="filter-tabs"
          >
            {isLoading ? (
              <LoadingSkeleton count={6} />
            ) : displayProviders.length > 0 ? (
              displayProviders.map((provider) => (
                <ProviderCard 
                  key={provider.id} 
                  provider={provider}
                />
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun expert trouvé</h3>
                  <p className="text-gray-600 mb-6">
                    Aucun expert ne correspond à vos critères de recherche.
                  </p>
                  <button 
                    onClick={resetFilters}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ✨ Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredProviders.length)} sur {filteredProviders.length} experts
              </div>
              
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Précédent</span>
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-red-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Suivant</span>
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          )}
        </section>
      </Suspense>
    );
  }

  // ✨ Carousel mode with enhanced mobile support
  return (
    <Suspense fallback={<LoadingSkeleton count={3} />}>
      <section 
        className={`${className} w-full`}
        aria-label={ariaLabel || 'Carrousel des prestataires disponibles'}
        data-testid={testId || 'providers-carousel'}
        role="region"
      >
        {showFilters && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
              {['all', 'lawyer', 'expat'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setActiveFilter(filterType as 'all' | 'lawyer' | 'expat')}
                  className={`
                    py-2 px-6 rounded-xl text-sm font-medium transition-all
                    ${activeFilter === filterType
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {filterType === 'all' ? 'Tous' : filterType === 'lawyer' ? 'Avocats' : 'Experts'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 text-center">
            <p className="text-red-800 mb-2">{error}</p>
            <button 
              onClick={loadProviders}
              className="text-red-600 hover:text-red-800 text-sm font-medium underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ✨ Enhanced Carousel */}
        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ 
                transform: `translateX(-${currentIndex * (100 / CAROUSEL_VISIBLE_ITEMS)}%)`,
              }}
            >
              {isLoading ? (
                Array.from({ length: CAROUSEL_VISIBLE_ITEMS }, (_, index) => (
                  <div key={index} className="w-full sm:w-1/2 lg:w-1/3 px-3 flex-shrink-0">
                    <LoadingSkeleton count={1} />
                  </div>
                ))
              ) : displayProviders.length > 0 ? (
                displayProviders.map((provider, index) => (
                  <div 
                    key={provider.id} 
                    className="w-full sm:w-1/2 lg:w-1/3 px-3 flex-shrink-0"
                  >
                    <ProviderCard 
                      provider={provider} 
                      isCarousel={true}
                    />
                  </div>