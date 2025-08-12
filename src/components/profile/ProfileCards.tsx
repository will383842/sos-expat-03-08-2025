import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Star, MapPin, Phone, ChevronLeft, ChevronRight, Globe, Search, ArrowDown, ArrowUp, ChevronDown, Filter } from 'lucide-react';
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
  readonly toLowerCase?: never;
  readonly split?: never;
  readonly toMillis?: never;
}

interface ProfileCardsProps {
  readonly mode?: 'carousel' | 'grid' | 'sos-style';
  readonly filter?: 'all' | 'lawyer' | 'expat' | 'providers-only';
  readonly maxItems?: number;
  readonly onProviderClick?: (provider: Provider) => void;
  readonly itemsPerPage?: number;
  readonly showFilters?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly testId?: string;
  readonly priority?: 'high' | 'low';
  readonly cardStyle?: 'default' | 'sos' | 'premium';
  readonly showCustomFilters?: boolean;
}

// Enhanced constants
const DEFAULT_AVATAR = '/images/default-avatar.webp';
const FIREBASE_COLLECTION = 'sos_profiles';
const DEFAULT_ITEMS_PER_PAGE = 9;
const DEFAULT_MAX_ITEMS = 100;
const CAROUSEL_VISIBLE_ITEMS = 3;
const DEBOUNCE_DELAY = 300;
const IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';

// Extended country and language options
const COUNTRY_OPTIONS = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan',
  'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin',
  'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana',
  'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun',
  'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie', 'Cuba',
  'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée',
  'Espagne', 'Estonie', 'États-Unis', 'Éthiopie', 'Fidji', 'Finlande', 'France',
  'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée',
  'Guinée-Bissau', 'Guinée équatoriale', 'Guyana', 'Haïti', 'Honduras', 'Hongrie',
  'Îles Cook', 'Îles Marshall', 'Îles Salomon', 'Inde', 'Indonésie', 'Irak', 'Iran',
  'Irlande', 'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie',
  'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos', 'Lesotho',
  'Lettonie', 'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg',
  'Macédoine du Nord', 'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte',
  'Maroc', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco',
  'Mongolie', 'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua',
  'Niger', 'Nigeria', 'Niue', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda',
  'Ouzbékistan', 'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée',
  'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar',
  'République centrafricaine', 'République démocratique du Congo', 'République dominicaine',
  'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Saint-Kitts-et-Nevis',
  'Saint-Marin', 'Saint-Vincent-et-les-Grenadines', 'Sainte-Lucie', 'Salvador', 'Samoa',
  'São Tomé-et-Principe', 'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour',
  'Slovaquie', 'Slovénie', 'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède',
  'Suisse', 'Suriname', 'Syrie', 'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande',
  'Timor oriental', 'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan',
  'Turquie', 'Tuvalu', 'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela',
  'Vietnam', 'Yémen', 'Zambie', 'Zimbabwe'
];

const LANGUAGE_OPTIONS = [
  'Afrikaans', 'Albanais', 'Allemand', 'Amharique', 'Anglais', 'Arabe', 'Arménien',
  'Azéri', 'Basque', 'Bengali', 'Biélorusse', 'Birman', 'Bosniaque', 'Bulgare',
  'Catalan', 'Chinois', 'Coréen', 'Croate', 'Danois', 'Espagnol', 'Estonien',
  'Finnois', 'Français', 'Géorgien', 'Grec', 'Gujarati', 'Hébreu', 'Hindi',
  'Hongrois', 'Indonésien', 'Irlandais', 'Islandais', 'Italien', 'Japonais',
  'Kannada', 'Kazakh', 'Khmer', 'Kirghize', 'Letton', 'Lituanien', 'Luxembourgeois',
  'Macédonien', 'Malais', 'Malayalam', 'Maltais', 'Marathi', 'Mongol', 'Néerlandais',
  'Népalais', 'Norvégien', 'Ourdou', 'Ouzbek', 'Pachto', 'Persan', 'Polonais',
  'Portugais', 'Punjabi', 'Roumain', 'Russe', 'Serbe', 'Singhalais', 'Slovaque',
  'Slovène', 'Suédois', 'Swahili', 'Tadjik', 'Tamoul', 'Tchèque', 'Telugu',
  'Thaï', 'Tibétain', 'Turc', 'Turkmen', 'Ukrainien', 'Vietnamien', 'Gallois'
];

// Language mapping function
const getLanguageLabel = (lang: string): string => {
  const languageMap: { [key: string]: string } = {
    'Français': 'Français', 'French': 'Français',
    'Anglais': 'Anglais', 'English': 'Anglais',
    'Espagnol': 'Espagnol', 'Spanish': 'Espagnol', 'Español': 'Espagnol',
    'Allemand': 'Allemand', 'German': 'Allemand', 'Deutsch': 'Allemand',
    'Italien': 'Italien', 'Italian': 'Italien', 'Italiano': 'Italien',
    'Portugais': 'Portugais', 'Portuguese': 'Portugais', 'Português': 'Portugais',
    'Russe': 'Russe', 'Russian': 'Russe', 'Русский': 'Russe',
    'Chinois': 'Chinois', 'Chinese': 'Chinois', '中文': 'Chinois',
    'Japonais': 'Japonais', 'Japanese': 'Japonais', '日本語': 'Japonais',
    'Coréen': 'Coréen', 'Korean': 'Coréen', '한국어': 'Coréen',
    'Arabe': 'Arabe', 'Arabic': 'Arabe', 'العربية': 'Arabe',
    'Hindi': 'Hindi', 'हिन्दी': 'Hindi',
    'Thaï': 'Thaï', 'Thai': 'Thaï', 'ไทย': 'Thaï'
  };
  return languageMap[lang] || lang;
};

// Text truncation utility
const truncateText = (text: string, maxLength: number): { text: string; isTruncated: boolean } => {
  if (text.length <= maxLength) {
    return { text, isTruncated: false };
  }
  return { text: text.substring(0, maxLength) + '...', isTruncated: true };
};

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
  cardStyle = 'default',
  showCustomFilters = false,
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
  const [customCountry, setCustomCountry] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
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
        description: String(data.bio || data.description || 
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
      filtered = filtered.filter(provider => {
        if (selectedCountry === 'Autre' && customCountry) {
          return provider.country.toLowerCase().includes(customCountry.toLowerCase());
        }
        return provider.country === selectedCountry;
      });
    }
    
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(provider => {
        if (selectedLanguage === 'Autre' && customLanguage) {
          return provider.languages.some(lang =>
            lang.toLowerCase().includes(customLanguage.toLowerCase())
          );
        }
        return provider.languages.includes(selectedLanguage);
      });
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
      
      // Country match priority
      if (selectedCountry !== 'all') {
        const aCountryMatch = a.country === selectedCountry;
        const bCountryMatch = b.country === selectedCountry;
        if (aCountryMatch !== bCountryMatch) {
          return aCountryMatch ? -1 : 1;
        }
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
    selectedLanguage, customCountry, customLanguage, onlineOnly, sortBy, sortOrder, itemsPerPage
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

  // Custom filter handlers for SOS style
  const handleCountryChange = useCallback((value: string) => {
    setSelectedCountry(value);
    setShowCustomCountry(value === 'Autre');
    if (value !== 'Autre') {
      setCustomCountry('');
    }
  }, []);

  const handleLanguageChange = useCallback((value: string) => {
    setSelectedLanguage(value);
    setShowCustomLanguage(value === 'Autre');
    if (value !== 'Autre') {
      setCustomLanguage('');
    }
  }, []);

  // Enhanced profile view handler
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

      // Create serviceData compatible with CallCheckoutWrapper
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

      // Generate SEO URL
      const typeSlug = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
      const countrySlug = provider.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
      const nameSlug = provider.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
      const seoUrl = `/${typeSlug}/${countrySlug}/francais/${nameSlug}-${provider.id}`;

      // Navigation based on provider status
      navigate(seoUrl, { 
        state: { 
          selectedProvider: provider,
          serviceData: serviceData,
          navigationSource: mode === 'sos-style' ? 'sos_call' : 'profile_cards'
        },
        replace: false 
      });
      
      // Fallback storage
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
      
      // Fallback navigation
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
          navigate(`/provider/${provider.slug || provider.id}`, { replace: false });
        }
      } catch (fallbackError) {
        console.error('[ProfileCards] Fallback navigation failed:', fallbackError);
      }
    }
  }, [onProviderClick, navigate, mode]);

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
    setCustomCountry('');
    setCustomLanguage('');
    setShowCustomCountry(false);
    setShowCustomLanguage(false);
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

  // Enhanced provider card with multiple styles
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

    // SOS Style card for maximum impact
    if (cardStyle === 'sos' || mode === 'sos-style') {
      const { text: truncatedDescription, isTruncated } = truncateText(provider.description, isCarousel ? 80 : 100);
      
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
          className={`${isCarousel ? 'flex-shrink-0 w-80' : ''} group bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 backdrop-blur-sm cursor-pointer border-[3px] ${
            provider.isOnline 
              ? 'border-green-500 shadow-green-500/20 hover:border-green-600 hover:shadow-green-600/30' 
              : 'border-red-500 shadow-red-500/20 hover:border-red-600 hover:shadow-red-600/30'
          }`}
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
          
          <div className="relative aspect-[3/4] overflow-hidden">
            <img
              src={provider.avatar}
              alt={`${provider.name} - ${provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'}`}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
              itemProp="image"
              loading={priority === 'high' ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== DEFAULT_AVATAR) {
                  target.src = DEFAULT_AVATAR;
                }
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 group-hover:from-black/20 transition-all duration-500"></div>
            
            <div className="absolute top-4 left-4">
              <div className={`px-4 py-2 rounded-2xl text-sm font-bold backdrop-blur-xl ${
                provider.type === 'lawyer' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
              }`}>
                {provider.type === 'lawyer' ? '⚖️ Avocat' : '🌍 Expatrié'}
              </div>
            </div>
            
            <div className="absolute top-4 right-4">
              <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
              </div>
            </div>

            <div className="absolute bottom-4 right-4">
              <div className={`w-5 h-5 rounded-full shadow-xl border-2 border-white ${
                provider.isOnline 
                  ? 'bg-green-500 shadow-green-500/60 animate-pulse' 
                  : 'bg-red-500 shadow-red-500/60'
              }`}></div>
            </div>
          </div>
          
          <div className="p-6 flex flex-col h-80">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors" itemProp="name">
                {provider.name}
              </h3>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{provider.yearsOfExperience} ans d'expérience</span>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-medium">({provider.reviewCount})</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">🗣️</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Langues parlées</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {provider.languages.slice(0, isCarousel ? 2 : 3).map((lang, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-sm font-medium rounded-full border border-blue-200/50"
                    >
                      {getLanguageLabel(lang)}
                    </span>
                  ))}
                  {provider.languages.length > (isCarousel ? 2 : 3) && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                      +{provider.languages.length - (isCarousel ? 2 : 3)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Pays d'intervention</span>
                </div>
                <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200/50">
                  🌍 {provider.country}
                </div>
              </div>

              {provider.description && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm">📋</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Présentation</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed" itemProp="description">
                    {truncatedDescription}
                  </p>
                  {isTruncated && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProfile(provider);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium mt-1 hover:underline transition-colors inline-flex items-center gap-1"
                    >
                      Lire la suite
                      <span className="text-xs">→</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-auto pt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(provider);
                }}
                className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 transform active:scale-[0.98] shadow-xl ${
                  provider.isOnline
                    ? provider.type === 'lawyer' 
                      ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-blue-500/30 hover:shadow-blue-500/50' 
                      : 'bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:to-purple-900 shadow-purple-500/30 hover:shadow-purple-500/50'
                    : 'bg-gray-600 hover:bg-gray-700 shadow-gray-500/30 cursor-not-allowed'
                } hover:shadow-2xl`}
              >
                <span className="text-xl">👤</span>
                <span>Voir le profil</span>
              </button>
            </div>
          </div>
        </article>
      );
    }

    // Default/Premium style card
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
        className={`bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
          cardStyle === 'premium' ? 'hover:border-blue-300' : 'hover:border-gray-200'
        }`}
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
        
        <div className="relative h-64 overflow-hidden">
          <img
            src={provider.avatar}
            alt={`Photo de profil de ${provider.name}, ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'} en ${provider.country}`}
            loading={priority === 'high' ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            itemProp="image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== DEFAULT_AVATAR) {
                target.src = DEFAULT_AVATAR;
              }
            }}
          />
          
          <div className="absolute top-4 left-4">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              provider.isOnline 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {provider.isOnline ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>
          
          <div className="absolute top-4 right-4">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              provider.type === 'lawyer' 
                ? 'bg-blue-500 text-white' 
                : 'bg-purple-500 text-white'
            }`}>
              {provider.type === 'lawyer' ? 'Avocat' : 'Expert'}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2" itemProp="name">
            {provider.name}
          </h3>
          
          <div className="flex items-center gap-2 mb-3" itemProp="areaServed">
            <MapPin size={16} className="text-gray-500" aria-hidden="true" />
            <span className="text-gray-600">{provider.country}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-4" itemProp="aggregateRating" itemScope itemType="http://schema.org/AggregateRating">
            <StarRating rating={provider.rating} reviewCount={provider.reviewCount} />
            <span itemProp="ratingValue" className="sr-only">{provider.rating}</span>
            <span itemProp="reviewCount" className="sr-only">{provider.reviewCount}</span>
            <span className="text-sm text-gray-600">
              {provider.rating.toFixed(1)} ({provider.reviewCount})
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4" itemProp="availableLanguage">
            {provider.languages.slice(0, 3).map((lang, index) => (
              <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <Globe size={12} aria-hidden="true" />
                {getLanguageLabel(lang)}
              </span>
            ))}
            {provider.languages.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                +{provider.languages.length - 3}
              </span>
            )}
          </div>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-2" itemProp="description">
            {provider.description}
          </p>
          
          <div className="flex items-center justify-between mb-4" itemProp="offers" itemScope itemType="http://schema.org/Offer">
            <div className="text-2xl font-bold text-blue-600" itemProp="price">
              {provider.price}€
              <span itemProp="priceCurrency" className="sr-only">EUR</span>
            </div>
            <div className="text-sm text-gray-500">{provider.duration} min</div>
          </div>
          
          <button
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
              provider.isOnline
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleViewProfile(provider);
            }}
            aria-label={provider.isOnline 
              ? `Contacter ${provider.name} maintenant` 
              : `Voir le profil de ${provider.name}`
            }
          >
            <Phone size={18} aria-hidden="true" />
            {provider.isOnline ? 'Contacter maintenant' : 'Voir le profil'}
          </button>
        </div>
      </article>
    );
  });

  // Performance-optimized loading skeleton
  const LoadingSkeleton = React.memo(({ count = 6 }: { count?: number }) => (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden animate-pulse" aria-hidden="true">
          <div className="h-64 bg-gray-200"></div>
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </>
  ));

  // Enhanced filters component
  const FiltersComponent = React.memo(() => {
    if (mode === 'sos-style' && showCustomFilters) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/60 p-4 sm:p-6 max-w-6xl mx-auto mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label htmlFor="expert-type" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                Type
              </label>
              <div className="relative">
                <select
                  id="expert-type"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as 'all' | 'lawyer' | 'expat')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="lawyer">Avocats</option>
                  <option value="expat">Expatriés</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="country-filter" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                Pays
              </label>
              <div className="relative">
                <select
                  id="country-filter"
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none text-sm"
                >
                  <option value="all">Tous les pays</option>
                  {COUNTRY_OPTIONS.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
              </div>
              {showCustomCountry && (
                <input
                  type="text"
                  placeholder="Nom du pays"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm mt-2"
                />
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="language-filter" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                Langue
              </label>
              <div className="relative">
                <select
                  id="language-filter"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none text-sm"
                >
                  <option value="all">Toutes</option>
                  {LANGUAGE_OPTIONS.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
              </div>
              {showCustomLanguage && (
                <input
                  type="text"
                  placeholder="Langue"
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm mt-2"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                Statut
              </label>
              <div className="flex items-center h-10">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlineOnly}
                    onChange={(e) => setOnlineOnly(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500 focus:ring-2 mr-2"
                  />
                  <span className="text-sm text-gray-700">En ligne seulement</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-transparent">
                Action
              </label>
              <button
                onClick={resetFilters}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-medium h-10"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-500">
            {filteredProviders.filter(p => p.isOnline).length} en ligne • {filteredProviders.length} au total
          </div>
        </div>
      );
    }

    // Standard filters
    return (
      <div className="filters-container bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8" role="search" aria-label="Filtrer les prestataires">
        <div className="primary-filters mb-6">
          <div role="tablist" aria-label="Types de prestataires" className="flex gap-2 justify-center flex-wrap">
            <button
              role="tab"
              aria-selected={activeFilter === 'all'}
              aria-controls="providers-list"
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'all' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              role="tab"
              aria-selected={activeFilter === 'lawyer'}
              aria-controls="providers-list"
              onClick={() => setActiveFilter('lawyer')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'lawyer' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Avocats
            </button>
            <button
              role="tab"
              aria-selected={activeFilter === 'expat'}
              aria-controls="providers-list"
              onClick={() => setActiveFilter('expat')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === 'expat' 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Experts
            </button>
          </div>
        </div>

        <div className="advanced-filters grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="toolbar" aria-label="Filtres avancés">
          <div className="search-container relative">
            <Search size={20} aria-hidden="true" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Rechercher un prestataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher des prestataires"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            aria-label="Filtrer par pays"
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none bg-white"
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
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all appearance-none bg-white"
          >
            <option value="all">Toutes les langues</option>
            {availableLanguages.map(lang => (
              <option key={lang} value={lang}>{getLanguageLabel(lang)}</option>
            ))}
          </select>

          <div className="flex items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500 focus:ring-2 mr-2"
              />
              <span className="text-sm text-gray-700">En ligne uniquement</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'experience')}
              aria-label="Trier par"
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="rating">Trier par note</option>
              <option value="price">Trier par prix</option>
              <option value="experience">Trier par expérience</option>
            </select>
            <button
              onClick={toggleSortOrder}
              aria-label={`Ordre de tri: ${sortOrder === 'asc' ? 'croissant' : 'décroissant'}`}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </button>
          </div>

          <button
            onClick={resetFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            aria-label="Réinitialiser tous les filtres"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    );
  });

  // Main render logic
  if (mode === 'sos-style') {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <section 
          className={className}
          aria-label={ariaLabel || 'Liste des prestataires SOS disponibles'}
          data-testid={testId || 'sos-providers'}
          role="main"
        >
          {showFilters && <FiltersComponent />}

          {error && (
            <div role="alert" aria-live="polite" className="text-center py-8">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-md mx-auto">
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={loadProviders}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <>
              {/* Mobile loading */}
              <div className="overflow-x-auto pb-4 lg:hidden">
                <div className="flex gap-4 sm:gap-6" style={{ width: 'max-content' }}>
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={`loading-mobile-${index}`} className="flex-shrink-0 w-80 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                      <div className="aspect-[3/4] bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Desktop loading */}
              <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={`loading-desktop-${index}`} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : filteredProviders.length > 0 ? (
            <>
              {/* Mobile SOS Cards */}
              <div className="overflow-x-auto pb-4 lg:hidden">
                <div className="flex gap-4 sm:gap-6" style={{ width: 'max-content' }}>
                  {filteredProviders.map((provider) => (
                    <ProviderCard 
                      key={provider.id} 
                      provider={provider}
                      isCarousel={true}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop SOS Cards */}
              <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProviders.map((provider) => (
                  <ProviderCard 
                    key={provider.id} 
                    provider={provider}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12 max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Aucun expert trouvé
                </h3>
                <p className="text-gray-600 mb-6">
                  Aucun expert ne correspond à vos critères de recherche actuels.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          )}
        </section>
      </Suspense>
    );
  }

  // Grid mode with full 2025 optimization
  if (mode === 'grid') {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <section 
          className={className}
          aria-label={ariaLabel || 'Liste des prestataires disponibles'}
          data-testid={testId || 'providers-grid'}
          role="main"
        >
          {showFilters && <FiltersComponent />}

          {error && (
            <div role="alert" aria-live="polite" className="error-container bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 mb-2">{error}</p>
              <button 
                onClick={loadProviders}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="results-summary mb-4" aria-live="polite">
            {!isLoading && (
              <p className="text-sm text-gray-600">
                {filteredProviders.length} prestataire{filteredProviders.length > 1 ? 's' : ''} trouvé{filteredProviders.length > 1 ? 's' : ''}
                {activeFilter !== 'all' && ` de type ${activeFilter === 'lawyer' ? 'avocat' : 'expert'}`}
                {selectedCountry !== 'all' && ` en ${selectedCountry}`}
                {onlineOnly && ' en ligne'}
              </p>
            )}
          </div>

          <div 
            id="providers-list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            role="tabpanel"
            aria-labelledby="filter-tabs"
          >
            {isLoading ? (
              <LoadingSkeleton count={8} />
            ) : displayProviders.length > 0 ? (
              displayProviders.map((provider) => (
                <ProviderCard 
                  key={provider.id} 
                  provider={provider}
                />
              ))
            ) : (
              <div className="col-span-full">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucun prestataire trouvé
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Aucun prestataire ne correspond à vos critères de recherche.
                  </p>
                  <button 
                    onClick={resetFilters}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced pagination */}
          {totalPages > 1 && (
            <nav 
              aria-label="Navigation des pages de prestataires" 
              role="navigation"
              className="flex items-center justify-between mt-8 px-4 py-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center text-sm text-gray-500">
                <span>
                  Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredProviders.length)} sur {filteredProviders.length} prestataires
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label="Page précédente"
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-1">
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
                        className={`px-3 py-1 text-sm rounded-md ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
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
                  aria-label="Page suivante"
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
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
          <div className="carousel-filters mb-8">
            <div role="tablist" aria-label="Types de prestataires" className="flex gap-2 justify-center">
              <button
                role="tab"
                aria-selected={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'lawyer'}
                onClick={() => setActiveFilter('lawyer')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeFilter === 'lawyer' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Avocats
              </button>
              <button
                role="tab"
                aria-selected={activeFilter === 'expat'}
                onClick={() => setActiveFilter('expat')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeFilter === 'expat' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Experts
              </button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" aria-live="polite" className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={loadProviders} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
              Réessayer
            </button>
          </div>
        )}

        <div className="carousel-container relative overflow-hidden" role="region" aria-label="Carrousel des prestataires">
          <div
            className="carousel-track flex transition-transform duration-300 ease-out"
            style={{ 
              transform: `translateX(-${currentIndex * (100 / CAROUSEL_VISIBLE_ITEMS)}%)`,
            }}
          >
            {isLoading ? (
              Array.from({ length: CAROUSEL_VISIBLE_ITEMS }, (_, index) => (
                <div key={index} className="carousel-item flex-shrink-0" style={{ width: `${100 / CAROUSEL_VISIBLE_ITEMS}%` }}>
                  <div className="mx-2">
                    <LoadingSkeleton count={1} />
                  </div>
                </div>
              ))
            ) : displayProviders.length > 0 ? (
              displayProviders.map((provider, index) => (
                <div 
                  key={provider.id} 
                  className="carousel-item flex-shrink-0" 
                  style={{ width: `${100 / CAROUSEL_VISIBLE_ITEMS}%` }}
                  aria-label={`Prestataire ${index + 1} sur ${displayProviders.length}`}
                >
                  <div className="mx-2">
                    <ProviderCard 
                      provider={provider} 
                      isCarousel={true}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center w-full py-12">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Aucun prestataire trouvé</p>
                  <button onClick={resetFilters} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {displayProviders.length > CAROUSEL_VISIBLE_ITEMS && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Voir les prestataires précédents"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors z-10"
              >
                <ChevronLeft size={24} />
              </button>
                
              <button
                onClick={handleNext}
                aria-label="Voir les prestataires suivants"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors z-10"
              >
                <ChevronRight size={24} />
              </button>

              <div className="flex justify-center mt-6 gap-2" role="tablist" aria-label="Indicateurs du carrousel">
                {Array.from({ 
                  length: Math.max(1, Math.ceil(displayProviders.length - CAROUSEL_VISIBLE_ITEMS + 1)) 
                }, (_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={currentIndex === i}
                    aria-label={`Aller à la page ${i + 1} du carrousel`}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentIndex === i ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

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

