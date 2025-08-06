import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Star, MapPin, Phone, ChevronLeft, ChevronRight, Globe, Search, ArrowDown, ArrowUp } from 'lucide-react';
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

      // ✅ CORRECTION : Navigation avec les noms de propriétés corrects
      const navigationTarget = provider.isOnline ? '/paiement' : `/provider/${provider.slug || provider.id}`;
      
      // Pour les providers en ligne, naviguer directement vers le checkout avec les bonnes props
      if (provider.isOnline) {
        navigate(navigationTarget, { 
          state: { 
            selectedProvider: provider,  // ✅ Nom correct attendu par CallCheckoutWrapper
            serviceData: serviceData      // ✅ Nom correct attendu par CallCheckoutWrapper
          },
          replace: false 
        });
      } else {
        // Pour les providers hors ligne, naviguer vers le profil avec les mêmes props
        navigate(navigationTarget, { 
          state: { 
            selectedProvider: provider,  // ✅ Cohérence des noms
            serviceData: serviceData      // ✅ Cohérence des noms
          },
          replace: false 
        });
      }
      
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
            size={16} 
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
            size={16} 
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
            size={16} 
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
        <span className="sr-only">
          {rating.toFixed(1)} étoiles sur 5, {reviewCount} avis
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
  }, []);

  // Display providers with pagination
  const displayProviders = useMemo(() => {
    if (mode === 'grid') {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredProviders.slice(startIndex, startIndex + itemsPerPage);
    }
    return filteredProviders;
  }, [mode, filteredProviders, currentPage, itemsPerPage]);

  // AI and SEO optimized provider card
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
        className="provider-card"
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
        
        <div className="provider-image-container">
          <img
            src={provider.avatar}
            alt={`Photo de profil de ${provider.name}, ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'} en ${provider.country}`}
            loading={priority === 'high' ? 'eager' : 'lazy'}
            decoding="async"
            width={isCarousel ? 110 : 192}
            height={isCarousel ? 110 : 192}
            sizes={IMAGE_SIZES}
            itemProp="image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== DEFAULT_AVATAR) {
                target.src = DEFAULT_AVATAR;
              }
            }}
          />
          
          <div className="status-badge" aria-label={`Statut: ${provider.isOnline ? 'en ligne' : 'hors ligne'}`}>
            <span itemProp="availability">
              {provider.isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          
          <div className="type-badge" aria-label={`Type: ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'}`}>
            <span itemProp="serviceType">
              {provider.type === 'lawyer' ? 'Avocat' : 'Expert'}
            </span>
          </div>
        </div>
        
        <div className="provider-content">
          <h3 itemProp="name">{provider.name}</h3>
          
          <div className="location" itemProp="areaServed">
            <MapPin size={16} aria-hidden="true" />
            <span>{provider.country}</span>
          </div>
          
          <div className="rating-container" itemProp="aggregateRating" itemScope itemType="http://schema.org/AggregateRating">
            <StarRating rating={provider.rating} reviewCount={provider.reviewCount} />
            <span itemProp="ratingValue" className="sr-only">{provider.rating}</span>
            <span itemProp="reviewCount" className="sr-only">{provider.reviewCount}</span>
            <span className="rating-text">
              {provider.rating.toFixed(1)} ({provider.reviewCount})
            </span>
          </div>
          
          <div className="languages" itemProp="availableLanguage">
            {provider.languages.slice(0, isCarousel ? 2 : 3).map((lang) => (
              <span key={lang} className="language-tag">
                <Globe size={10} aria-hidden="true" />
                {lang}
              </span>
            ))}
          </div>
          
          <p className="description" itemProp="description">
            {provider.description}
          </p>
          
          <div className="pricing" itemProp="offers" itemScope itemType="http://schema.org/Offer">
            <div className="price-info">
              <div className="price" itemProp="price">
                {provider.price}€
                <span itemProp="priceCurrency" className="sr-only">EUR</span>
              </div>
              <div className="duration">{provider.duration} min</div>
            </div>
          </div>
          
          <button
            className="cta-button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewProfile(provider);
            }}
            aria-label={provider.isOnline 
              ? `Appeler ${provider.name} maintenant` 
              : `Voir le profil de ${provider.name}`
            }
          >
            <Phone size={18} aria-hidden="true" />
            {provider.isOnline ? 'Appeler maintenant' : 'Voir le profil'}
          </button>
        </div>
      </article>
    );
  });

  // Performance-optimized loading skeleton
  const LoadingSkeleton = React.memo(({ count = 6 }: { count?: number }) => (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-card" aria-hidden="true">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-location"></div>
            <div className="skeleton-rating"></div>
            <div className="skeleton-description"></div>
            <div className="skeleton-button"></div>
          </div>
        </div>
      ))}
    </>
  ));

  // Main render - Grid mode with full 2025 optimization
  if (mode === 'grid') {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <section 
          className={className}
          aria-label={ariaLabel || 'Liste des prestataires disponibles'}
          data-testid={testId || 'providers-grid'}
          role="main"
        >
          {showFilters && (
            <div 
              className="filters-container" 
              role="search" 
              aria-label="Filtrer les prestataires"
            >
              {/* Primary filters with enhanced accessibility */}
              <div className="primary-filters">
                <div 
                  role="tablist" 
                  aria-label="Types de prestataires"
                  className="filter-tabs"
                >
                  <button
                    role="tab"
                    aria-selected={activeFilter === 'all'}
                    aria-controls="providers-list"
                    onClick={() => setActiveFilter('all')}
                    className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                  >
                    Tous
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeFilter === 'lawyer'}
                    aria-controls="providers-list"
                    onClick={() => setActiveFilter('lawyer')}
                    className={`filter-tab ${activeFilter === 'lawyer' ? 'active' : ''}`}
                  >
                    Avocats
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeFilter === 'expat'}
                    aria-controls="providers-list"
                    onClick={() => setActiveFilter('expat')}
                    className={`filter-tab ${activeFilter === 'expat' ? 'active' : ''}`}
                  >
                    Experts
                  </button>
                </div>
              </div>

              {/* Advanced filters with mobile-first design */}
              <div className="advanced-filters" role="toolbar" aria-label="Filtres avancés">
                <div className="search-container">
                  <Search size={20} aria-hidden="true" className="search-icon" />
                  <input
                    type="search"
                    placeholder="Rechercher un prestataire, pays, spécialité..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Rechercher des prestataires"
                    className="search-input"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>

                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  aria-label="Filtrer par pays"
                  className="country-select"
                >
                  <option value="all">Tous les pays</option>
                  {availableCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>

                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  aria-label="Filtrer par langue"
                  className="language-select"
                >
                  <option value="all">Toutes les langues</option>
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>

                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={onlineOnly}
                    onChange={(e) => setOnlineOnly(e.target.checked)}
                    className="online-checkbox"
                  />
                  <span className="checkbox-label">En ligne uniquement</span>
                </label>

                <div className="sort-container">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'experience')}
                    aria-label="Trier par"
                    className="sort-select"
                  >
                    <option value="rating">Note</option>
                    <option value="price">Prix</option>
                    <option value="experience">Expérience</option>
                  </select>
                  <button
                    onClick={toggleSortOrder}
                    aria-label={`Ordre de tri: ${sortOrder === 'asc' ? 'croissant' : 'décroissant'}`}
                    className="sort-order-btn"
                  >
                    {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  </button>
                </div>

                <button
                  onClick={resetFilters}
                  className="reset-filters-btn"
                  aria-label="Réinitialiser tous les filtres"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}

          {error && (
            <div 
              role="alert" 
              aria-live="polite"
              className="error-container"
            >
              <p className="error-message">{error}</p>
              <button 
                onClick={loadProviders}
                className="retry-button"
                aria-label="Réessayer le chargement"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Results summary for AI and screen readers */}
          <div className="results-summary" aria-live="polite">
            {!isLoading && (
              <p className="sr-only">
                {filteredProviders.length} prestataire{filteredProviders.length > 1 ? 's' : ''} trouvé{filteredProviders.length > 1 ? 's' : ''}
                {activeFilter !== 'all' && ` de type ${activeFilter === 'lawyer' ? 'avocat' : 'expert'}`}
                {selectedCountry !== 'all' && ` en ${selectedCountry}`}
                {onlineOnly && ' en ligne'}
              </p>
            )}
          </div>

          <div 
            id="providers-list"
            className="providers-grid"
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
              <div className="no-results" role="status">
                <div className="no-results-content">
                  <h3>Aucun prestataire trouvé</h3>
                  <p>
                    Aucun prestataire ne correspond à vos critères de recherche.
                  </p>
                  <button 
                    onClick={resetFilters}
                    className="reset-button"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced pagination with mobile optimization */}
          {totalPages > 1 && (
            <nav 
              aria-label="Navigation des pages de prestataires" 
              role="navigation"
              className="pagination-container"
            >
              <div className="pagination-info">
                <span className="sr-only">
                  Page {currentPage} sur {totalPages}
                </span>
                <span aria-live="polite" className="pagination-summary">
                  Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredProviders.length)} sur {filteredProviders.length} prestataires
                </span>
              </div>
              
              <div className="pagination-buttons">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label="Page précédente"
                  className="pagination-btn prev-btn"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  <span className="btn-text">Précédent</span>
                </button>
                
                {/* Smart pagination for mobile */}
                <div className="page-numbers">
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
                        aria-current={currentPage === page ? 'page' : undefined}
                        aria-label={`Page ${page}`}
                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Page suivante"
                  className="pagination-btn next-btn"
                >
                  <span className="btn-text">Suivant</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </section>
      </Suspense>
    );
  }

  // Carousel mode with enhanced mobile support
  return (
    <Suspense fallback={<LoadingSkeleton count={3} />}>
      <section 
        className={className}
        aria-label={ariaLabel || 'Carrousel des prestataires disponibles'}
        data-testid={testId || 'providers-carousel'}
        role="region"
      >
        {showFilters && (
          <div className="carousel-filters">
            <div 
              role="tablist" 
              aria-label="Types de prestataires"
              className="carousel-filter-tabs"
            >
              <button
                role="tab"
                aria-selected={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
                className={`carousel-tab ${activeFilter === 'all' ? 'active' : ''}`}
              >
                Tous
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'lawyer'}
                onClick={() => setActiveFilter('lawyer')}
                className={`carousel-tab ${activeFilter === 'lawyer' ? 'active' : ''}`}
              >
                Avocats
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'expat'}
                onClick={() => setActiveFilter('expat')}
                className={`carousel-tab ${activeFilter === 'expat' ? 'active' : ''}`}
              >
                Experts
              </button>
            </div>
          </div>
        )}

        {error && (
          <div 
            role="alert" 
            aria-live="polite"
            className="carousel-error"
          >
            <p>{error}</p>
            <button onClick={loadProviders}>Réessayer</button>
          </div>
        )}

        {/* Enhanced carousel with touch support */}
        <div 
          className="carousel-container"
          role="region"
          aria-label="Carrousel des prestataires"
          aria-live="polite"
        >
          <div
            className="carousel-track"
            style={{ 
              transform: `translateX(-${currentIndex * (100 / CAROUSEL_VISIBLE_ITEMS)}%)`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const startX = touch.clientX;
              
              const handleTouchMove = (moveEvent: TouchEvent) => {
                const currentX = moveEvent.touches[0].clientX;
                const diffX = startX - currentX;
                
                if (Math.abs(diffX) > 50) {
                  if (diffX > 0) {
                    handleNext();
                  } else {
                    handlePrev();
                  }
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                }
              };
              
              const handleTouchEnd = () => {
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
              };
              
              document.addEventListener('touchmove', handleTouchMove, { passive: true });
              document.addEventListener('touchend', handleTouchEnd);
            }}
          >
            {isLoading ? (
              Array.from({ length: CAROUSEL_VISIBLE_ITEMS }, (_, index) => (
                <div key={index} className="carousel-item">
                  <LoadingSkeleton count={1} />
                </div>
              ))
            ) : displayProviders.length > 0 ? (
              displayProviders.map((provider, index) => (
                <div 
                  key={provider.id} 
                  className="carousel-item"
                  aria-label={`Prestataire ${index + 1} sur ${displayProviders.length}`}
                >
                  <ProviderCard 
                    provider={provider} 
                    isCarousel={true}
                  />
                </div>
              ))
            ) : (
              <div className="carousel-empty" role="status">
                <div className="empty-content">
                  <p>Aucun prestataire trouvé</p>
                  <button onClick={resetFilters}>
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced navigation controls */}
          {displayProviders.length > CAROUSEL_VISIBLE_ITEMS && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Voir les prestataires précédents"
                className="carousel-nav prev-nav"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePrev();
                  }
                }}
              >
                <ChevronLeft size={24} aria-hidden="true" />
              </button>
                
              <button
                onClick={handleNext}
                aria-label="Voir les prestataires suivants"
                className="carousel-nav next-nav"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNext();
                  }
                }}
              >
                <ChevronRight size={24} aria-hidden="true" />
              </button>

              {/* Carousel indicators */}
              <div className="carousel-indicators" role="tablist" aria-label="Indicateurs du carrousel">
                {Array.from({ 
                  length: Math.max(1, Math.ceil(displayProviders.length - CAROUSEL_VISIBLE_ITEMS + 1)) 
                }, (_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={currentIndex === i}
                    aria-label={`Aller à la page ${i + 1} du carrousel`}
                    onClick={() => setCurrentIndex(i)}
                    className={`indicator ${currentIndex === i ? 'active' : ''}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Carousel summary for screen readers */}
        <div className="sr-only" aria-live="polite">
          Affichage de {Math.min(CAROUSEL_VISIBLE_ITEMS, displayProviders.length)} prestataires sur {displayProviders.length}
        </div>
      </section>
    </Suspense>
  );
};

// Enhanced export with display name for debugging
ProfileCards.displayName = 'ProfileCards';

export default React.memo(ProfileCards);