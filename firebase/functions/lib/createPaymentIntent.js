"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("../../config/firebase");
const AppContext_1 = require("../../contexts/AppContext");
const countryCoordinates_1 = require("../../utils/countryCoordinates");
// 2025 Constants with performance optimization
const DEFAULT_AVATAR = '/images/default-avatar.webp';
const FIREBASE_COLLECTION = 'sos_profiles';
const DEFAULT_ITEMS_PER_PAGE = 9;
const DEFAULT_MAX_ITEMS = 100;
const CAROUSEL_VISIBLE_ITEMS = 3;
const DEBOUNCE_DELAY = 300;
const IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
// Performance optimization hook for debouncing
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};
const ProfileCards = ({ mode = 'carousel', filter = 'all', itemsPerPage = DEFAULT_ITEMS_PER_PAGE, maxItems = DEFAULT_MAX_ITEMS, onProviderClick, showFilters = true, className = '', ariaLabel, testId, priority = 'high', }) => {
    const { language = 'fr' } = (0, AppContext_1.useApp)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    // Core states with performance optimization
    const [providers, setProviders] = (0, react_1.useState)([]);
    const [filteredProviders, setFilteredProviders] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Filter states with AI-friendly structure
    const [activeFilter, setActiveFilter] = (0, react_1.useState)(filter === 'providers-only' ? 'all' : filter);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedCountry, setSelectedCountry] = (0, react_1.useState)('all');
    const [selectedLanguage, setSelectedLanguage] = (0, react_1.useState)('all');
    const [onlineOnly, setOnlineOnly] = (0, react_1.useState)(false);
    const [sortBy, setSortBy] = (0, react_1.useState)('rating');
    const [sortOrder, setSortOrder] = (0, react_1.useState)('desc');
    // Navigation states
    const [currentIndex, setCurrentIndex] = (0, react_1.useState)(0);
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    // Debounced search for performance
    const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);
    // Memoized filter options for AI indexing
    const availableCountries = (0, react_1.useMemo)(() => Array.from(new Set(providers.map(p => p.country)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, language, { sensitivity: 'base' })), [providers, language]);
    const availableLanguages = (0, react_1.useMemo)(() => Array.from(new Set(providers.flatMap(p => p.languages)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, language, { sensitivity: 'base' })), [providers, language]);
    // Enhanced Firebase document transformation for AI compatibility
    const transformFirestoreDoc = (0, react_1.useCallback)((doc) => {
        var _a, _b;
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
            if (!country || !(0, countryCoordinates_1.getCountryCoordinates)(country)) {
                console.warn(`[ProfileCards] Invalid country for document ${doc.id}: ${country}`);
                return null;
            }
            // Safe array extraction
            const languages = Array.isArray(data.languages) && data.languages.length > 0
                ? data.languages.filter((lang) => typeof lang === 'string' && lang.trim().length > 0)
                : [language === 'fr' ? 'Français' : 'English'];
            const specialties = Array.isArray(data.specialties)
                ? data.specialties.filter((spec) => typeof spec === 'string' && spec.trim().length > 0)
                : [];
            const certifications = Array.isArray(data.certifications)
                ? data.certifications.filter((cert) => typeof cert === 'string' && cert.trim().length > 0)
                : [];
            // Safe timestamp conversion
            const createdAt = ((_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) ? data.createdAt.toMillis() : (data.createdAt || Date.now());
            const updatedAt = ((_b = data.updatedAt) === null || _b === void 0 ? void 0 : _b.toMillis) ? data.updatedAt.toMillis() : (data.updatedAt || Date.now());
            // AI-optimized provider object with rich metadata
            const provider = {
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
                        : `Expert expatriation en ${country} avec ${Number(data.yearsAsExpat) || 0} ans d'expérience`)),
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
        }
        catch (error) {
            console.error(`[ProfileCards] Error transforming document ${doc.id}:`, error);
            return null;
        }
    }, [language]);
    // Enhanced Firebase query with 2025 optimization
    const loadProviders = (0, react_1.useCallback)(() => {
        setIsLoading(true);
        setError(null);
        try {
            // AI-optimized Firebase query with proper indexing
            let firestoreQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, FIREBASE_COLLECTION), (0, firestore_1.orderBy)('isOnline', 'desc'), (0, firestore_1.orderBy)('rating', 'desc'), (0, firestore_1.orderBy)('updatedAt', 'desc'), (0, firestore_1.limit)(maxItems));
            // Enhanced filters for providers
            if (filter === 'providers-only') {
                firestoreQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, FIREBASE_COLLECTION), (0, firestore_1.where)('isApproved', '==', true), (0, firestore_1.where)('isVisible', '==', true), (0, firestore_1.where)('isActive', '==', true), (0, firestore_1.orderBy)('isOnline', 'desc'), (0, firestore_1.orderBy)('rating', 'desc'), (0, firestore_1.limit)(maxItems));
            }
            const unsubscribe = (0, firestore_1.onSnapshot)(firestoreQuery, (snapshot) => {
                const validProviders = [];
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
            }, (firebaseError) => {
                console.error('[ProfileCards] Firebase error:', firebaseError);
                setError('Erreur de chargement des prestataires');
                setProviders([]);
                setIsLoading(false);
            });
            return unsubscribe;
        }
        catch (error) {
            console.error('[ProfileCards] Query construction error:', error);
            setError('Erreur de configuration');
            setIsLoading(false);
            return () => { };
        }
    }, [maxItems, filter, transformFirestoreDoc, error]);
    // Effect with cleanup for memory optimization
    (0, react_1.useEffect)(() => {
        const unsubscribe = loadProviders();
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [loadProviders]);
    // AI-optimized filtering with semantic search capabilities
    const { filteredAndSortedProviders, totalPages } = (0, react_1.useMemo)(() => {
        if (!providers.length) {
            return { filteredAndSortedProviders: [], totalPages: 1 };
        }
        let filtered = [...providers];
        // Base filters with AI-friendly logic
        if (filter === 'providers-only') {
            filtered = filtered.filter(provider => provider.type === 'expat' || (provider.type === 'lawyer' && provider.isApproved));
        }
        else if (activeFilter !== 'all') {
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
                return searchTerms.every(term => searchableContent.includes(term) ||
                    // Fuzzy matching for typos
                    searchableContent.includes(term.slice(0, -1)) ||
                    searchableContent.includes(term + 's'));
            });
        }
        // Geographic and language filters
        if (selectedCountry !== 'all') {
            filtered = filtered.filter(provider => provider.country === selectedCountry);
        }
        if (selectedLanguage !== 'all') {
            filtered = filtered.filter(provider => provider.languages.includes(selectedLanguage));
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
    (0, react_1.useEffect)(() => {
        setFilteredProviders(filteredAndSortedProviders);
        // Smart page adjustment
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [filteredAndSortedProviders, totalPages, currentPage]);
    // Mobile-optimized navigation handlers
    const handlePrev = (0, react_1.useCallback)(() => {
        setCurrentIndex(prevIndex => {
            const maxIndex = Math.max(0, filteredProviders.length - CAROUSEL_VISIBLE_ITEMS);
            return prevIndex === 0 ? maxIndex : Math.max(0, prevIndex - 1);
        });
    }, [filteredProviders.length]);
    const handleNext = (0, react_1.useCallback)(() => {
        setCurrentIndex(prevIndex => {
            const maxIndex = Math.max(0, filteredProviders.length - CAROUSEL_VISIBLE_ITEMS);
            return prevIndex >= maxIndex ? 0 : prevIndex + 1;
        });
    }, [filteredProviders.length]);
    const handlePageChange = (0, react_1.useCallback)((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Smooth scroll for better mobile UX
            const element = document.querySelector('[data-testid="providers-grid"]');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [totalPages]);
    const toggleSortOrder = (0, react_1.useCallback)(() => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    }, []);
    // 🔧 CORRECTION PRINCIPALE - Enhanced profile view handler avec navigation state corrigée
    const handleViewProfile = (0, react_1.useCallback)((provider) => {
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
                type: provider.type === 'lawyer' ? 'lawyer_call' : 'expat_call',
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
                    selectedProvider: provider, // ✅ Nom correct attendu par ProviderProfile
                    serviceData: serviceData // ✅ Nom correct pour compatibilité
                },
                replace: false
            });
            // 🔧 AMÉLIORATION : Garder sessionStorage comme fallback mais pas comme méthode principale
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
                    sessionStorage.setItem('serviceData', JSON.stringify(serviceData));
                }
                catch (storageError) {
                    console.warn('[ProfileCards] SessionStorage fallback failed:', storageError);
                }
            }
        }
        catch (error) {
            console.error('[ProfileCards] Navigation error:', error);
            // 🔧 FALLBACK SÉCURISÉ : Si navigation échoue, au moins essayer le sessionStorage
            try {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
                    navigate(`/provider/${provider.slug || provider.id}`, { replace: false });
                }
            }
            catch (fallbackError) {
                console.error('[ProfileCards] Fallback navigation failed:', fallbackError);
            }
        }
    }, [onProviderClick, navigate]);
    // AI-optimized star rating component
    const StarRating = react_1.default.memo(({ rating, reviewCount }) => {
        const stars = (0, react_1.useMemo)(() => {
            const result = [];
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            for (let i = 0; i < fullStars; i++) {
                result.push(key, { i }, size = { 16:  }, aria - hidden, "true", fill = "currentColor", className = "text-yellow-400"
                    /  >
                );
            }
            if (hasHalfStar) {
                result.push(key, "half", size = { 16:  }, aria - hidden, "true", fill = "currentColor", className = "text-yellow-400 opacity-50"
                    /  >
                );
            }
            const emptyStars = 5 - Math.ceil(rating);
            for (let i = 0; i < emptyStars; i++) {
                result.push(key, {} `empty-${i}`);
            }
            size = { 16:  };
            aria - hidden;
            "true";
            className = "text-gray-300"
                /  >
            ;
        });
    });
    return result;
}, [rating];
return role = "img";
aria - label;
{
    `Note ${rating.toFixed(1)} sur 5 basée sur ${reviewCount} avis`;
}
className = "flex items-center gap-1"
    >
        { stars }
    < span;
className = "sr-only" >
    { rating, : .toFixed(1) };
étoiles;
sur;
5, { reviewCount };
avis
    < /span>
    < /div>;
;
;
const resetFilters = (0, react_1.useCallback)(() => {
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
const displayProviders = (0, react_1.useMemo)(() => {
    if (mode === 'grid') {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProviders.slice(startIndex, startIndex + itemsPerPage);
    }
    return filteredProviders;
}, [mode, filteredProviders, currentPage, itemsPerPage]);
// AI and SEO optimized provider card
const ProviderCard = react_1.default.memo(({ provider, isCarousel = false }) => {
    const cardSchema = (0, react_1.useMemo)(() => ({
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
    return onClick = {}();
});
handleViewProfile(provider);
onKeyDown = {}(e);
{
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleViewProfile(provider);
    }
}
role = "button";
tabIndex = { 0:  };
aria - label;
{
    `Contacter ${provider.name}, ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'} en ${provider.country}`;
}
className = "provider-card";
data - provider - id;
{
    provider.id;
}
data - provider - type;
{
    provider.type;
}
data - provider - country;
{
    provider.country;
}
itemScope;
itemType = { provider, : .type === 'lawyer' ? "http://schema.org/LegalService" : "http://schema.org/Service" }
    >
        type;
"application/ld+json";
dangerouslySetInnerHTML = {};
{
    __html: JSON.stringify(cardSchema);
}
/>
    < div;
className = "provider-image-container" >
    src;
{
    provider.avatar;
}
alt = {} `Photo de profil de ${provider.name}, ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'} en ${provider.country}`;
loading = { priority } === 'high' ? 'eager' : 'lazy';
decoding = "async";
width = { isCarousel, 110: 192 };
height = { isCarousel, 110: 192 };
sizes = { IMAGE_SIZES };
itemProp = "image";
onError = {}(e);
{
    const target = e.target;
    if (target.src !== DEFAULT_AVATAR) {
        target.src = DEFAULT_AVATAR;
    }
}
/>
    < div;
className = "status-badge";
aria - label;
{
    `Statut: ${provider.isOnline ? 'en ligne' : 'hors ligne'}`;
}
 >
    itemProp;
"availability" >
    { provider, : .isOnline ? 'En ligne' : 'Hors ligne' }
    < /span>
    < /div>
    < div;
className = "type-badge";
aria - label;
{
    `Type: ${provider.type === 'lawyer' ? 'avocat' : 'expert expatriation'}`;
}
 >
    itemProp;
"serviceType" >
    { provider, : .type === 'lawyer' ? 'Avocat' : 'Expert' }
    < /span>
    < /div>
    < /div>
    < div;
className = "provider-content" >
    itemProp;
"name" > { provider, : .name } < /h3>
    < div;
className = "location";
itemProp = "areaServed" >
    size;
{
    16;
}
aria - hidden;
"true" /  >
    { provider, : .country } < /span>
    < /div>
    < div;
className = "rating-container";
itemProp = "aggregateRating";
itemScope;
itemType = "http://schema.org/AggregateRating" >
    rating;
{
    provider.rating;
}
reviewCount = { provider, : .reviewCount } /  >
    itemProp;
"ratingValue";
className = "sr-only" > { provider, : .rating } < /span>
    < span;
itemProp = "reviewCount";
className = "sr-only" > { provider, : .reviewCount } < /span>
    < span;
className = "rating-text" >
    { provider, : .rating.toFixed(1) }({ provider, : .reviewCount })
    < /span>
    < /div>
    < div;
className = "languages";
itemProp = "availableLanguage" >
    { provider, : .languages.slice(0, isCarousel ? 2 : 3).map((lang) => key = { lang }, className = "language-tag" >
            size, { 10:  }, aria - hidden, "true" /  >
            { lang }
            < /span>) }
    < /div>
    < p;
className = "description";
itemProp = "description" >
    { provider, : .description }
    < /p>
    < div;
className = "pricing";
itemProp = "offers";
itemScope;
itemType = "http://schema.org/Offer" >
    className;
"price-info" >
    className;
"price";
itemProp = "price" >
    { provider, : .price };
itemProp;
"priceCurrency";
className = "sr-only" > EUR < /span>
    < /div>
    < div;
className = "duration" > { provider, : .duration };
min < /div>
    < /div>
    < /div>
    < button;
className = "cta-button";
onClick = {}(e);
{
    e.stopPropagation();
    handleViewProfile(provider);
}
aria - label;
{
    provider.isOnline
        ? `Voir le profil de ${provider.name}`
        : `Voir le profil de ${provider.name}`;
}
    >
        size;
{
    18;
}
aria - hidden;
"true" /  >
    Voir;
le;
profil
    < /button>
    < /div>
    < /article>;
;
;
// Performance-optimized loading skeleton
const LoadingSkeleton = react_1.default.memo(({ count = 6 }) => ({ Array, : .from({ length: count }, (_, index) => key = { index }, className = "skeleton-card", aria - hidden, "true" >
        className, "skeleton-image" > /div>
        < div, className = "skeleton-content" >
        className, "skeleton-title" > /div>
        < div, className = "skeleton-location" > /div>
        < div, className = "skeleton-rating" > /div>
        < div, className = "skeleton-description" > /div>
        < div, className = "skeleton-button" > /div>
        < /div>
        < /div>) }));
/>;
;
// Main render - Grid mode with full 2025 optimization
if (mode === 'grid') {
    return fallback = {} < LoadingSkeleton /  > ;
}
 >
    className;
{
    className;
}
aria - label;
{
    ariaLabel || 'Liste des prestataires disponibles';
}
data - testid;
{
    testId || 'providers-grid';
}
role = "main"
    >
        { showFilters } && className;
"filters-container";
role = "search";
aria - label;
"Filtrer les prestataires"
    >
        { /* Primary filters with enhanced accessibility */}
    < div;
className = "primary-filters" >
    role;
"tablist";
aria - label;
"Types de prestataires";
className = "filter-tabs"
    >
        role;
"tab";
aria - selected;
{
    activeFilter === 'all';
}
aria - controls;
"providers-list";
onClick = {}();
setActiveFilter('all');
className = {} `filter-tab ${activeFilter === 'all' ? 'active' : ''}`;
    >
        Tous
    < /button>
    < button;
role = "tab";
aria - selected;
{
    activeFilter === 'lawyer';
}
aria - controls;
"providers-list";
onClick = {}();
setActiveFilter('lawyer');
className = {} `filter-tab ${activeFilter === 'lawyer' ? 'active' : ''}`;
    >
        Avocats
    < /button>
    < button;
role = "tab";
aria - selected;
{
    activeFilter === 'expat';
}
aria - controls;
"providers-list";
onClick = {}();
setActiveFilter('expat');
className = {} `filter-tab ${activeFilter === 'expat' ? 'active' : ''}`;
    >
        Experts
    < /button>
    < /div>
    < /div>;
{ /* Advanced filters with mobile-first design */ }
className;
"advanced-filters";
role = "toolbar";
aria - label;
"Filtres avancés" >
    className;
"search-container" >
    size;
{
    20;
}
aria - hidden;
"true";
className = "search-icon" /  >
    type;
"search";
placeholder = "Rechercher un prestataire, pays, spécialité...";
value = { searchTerm };
onChange = {}(e);
setSearchTerm(e.target.value);
aria - label;
"Rechercher des prestataires";
className = "search-input";
autoComplete = "off";
spellCheck = "false"
    /  >
    /div>
    < select;
value = { selectedCountry };
onChange = {}(e);
setSelectedCountry(e.target.value);
aria - label;
"Filtrer par pays";
className = "country-select"
    >
        value;
"all" > Tous;
les;
pays < /option>;
{
    availableCountries.map(country => key = { country }, value = { country } > { country } < /option>);
}
/select>
    < select;
value = { selectedLanguage };
onChange = {}(e);
setSelectedLanguage(e.target.value);
aria - label;
"Filtrer par langue";
className = "language-select"
    >
        value;
"all" > Toutes;
les;
langues < /option>;
{
    availableLanguages.map(lang => key = { lang }, value = { lang } > { lang } < /option>);
}
/select>
    < label;
className = "checkbox-container" >
    type;
"checkbox";
checked = { onlineOnly };
onChange = {}(e);
setOnlineOnly(e.target.checked);
className = "online-checkbox"
    /  >
    className;
"checkbox-label" > En;
ligne;
uniquement < /span>
    < /label>
    < div;
className = "sort-container" >
    value;
{
    sortBy;
}
onChange = {}(e);
setSortBy(e.target.value);
aria - label;
"Trier par";
className = "sort-select"
    >
        value;
"rating" > Note < /option>
    < option;
value = "price" > Prix < /option>
    < option;
value = "experience" > Expérience < /option>
    < /select>
    < button;
onClick = { toggleSortOrder };
aria - label;
{
    `Ordre de tri: ${sortOrder === 'asc' ? 'croissant' : 'décroissant'}`;
}
className = "sort-order-btn"
    >
        { sortOrder } === 'asc' ? size : ;
{
    16;
}
/> : <ArrowDown size={16} / > ;
/button>
    < /div>
    < button;
onClick = { resetFilters };
className = "reset-filters-btn";
aria - label;
"Réinitialiser tous les filtres"
    >
        Réinitialiser
    < /button>
    < /div>
    < /div>;
{
    error && role;
    "alert";
    aria - live;
    "polite";
    className = "error-container"
        >
            className;
    "error-message" > { error } < /p>
        < button;
    onClick = { loadProviders };
    className = "retry-button";
    aria - label;
    "Réessayer le chargement"
        >
            Réessayer
        < /button>
        < /div>;
}
{ /* Results summary for AI and screen readers */ }
className;
"results-summary";
aria - live;
"polite" >
    {};
isLoading && className;
"sr-only" >
    { filteredProviders, : .length };
prestataire;
{
    filteredProviders.length > 1 ? 's' : '';
}
trouvé;
{
    filteredProviders.length > 1 ? 's' : '';
}
{
    activeFilter !== 'all' && ` de type ${activeFilter === 'lawyer' ? 'avocat' : 'expert'}`;
}
{
    selectedCountry !== 'all' && ` en ${selectedCountry}`;
}
{
    onlineOnly && ' en ligne';
}
/p>;
/div>
    < div;
id = "providers-list";
className = "providers-grid";
role = "tabpanel";
aria - labelledby;
"filter-tabs"
    >
        {} > 0 ? (displayProviders.map((provider) => key = { provider, : .id }, provider = { provider }
    /  >
))
    :
;
className = "no-results";
role = "status" >
    className;
"no-results-content" >
    Aucun;
prestataire;
trouvé < (/h3>);
Aucun;
prestataire;
ne;
correspond;
à;
vos;
critères;
de;
recherche.
    < /p>
    < button;
onClick = { resetFilters };
className = "reset-button"
    >
        Réinitialiser;
les;
filtres
    < /button>
    < /div>
    < /div>;
/div>;
{ /* Enhanced pagination with mobile optimization */ }
{
    totalPages > 1 && (aria - label);
    "Navigation des pages de prestataires";
    role = "navigation";
    className = "pagination-container"
        >
            className;
    "pagination-info" >
        className;
    "sr-only" >
        Page;
    {
        currentPage;
    }
    sur;
    {
        totalPages;
    }
    /span>
        < span;
    aria - live;
    "polite";
    className = "pagination-summary" >
        Affichage;
    {
        ((currentPage - 1) * itemsPerPage) + 1;
    }
    à;
    {
        Math.min(currentPage * itemsPerPage, filteredProviders.length);
    }
    sur;
    {
        filteredProviders.length;
    }
    prestataires
        < /span>
        < /div>
        < div;
    className = "pagination-buttons" >
        onClick;
    {
        () => handlePageChange(Math.max(1, currentPage - 1));
    }
    disabled = { currentPage } === 1;
}
aria - label;
"Page précédente";
className = "pagination-btn prev-btn"
    >
        size;
{
    16;
}
aria - hidden;
"true" /  >
    className;
"btn-text" > Précédent < /span>
    < /button>;
{ /* Smart pagination for mobile */ }
className;
"page-numbers" >
    { Array, : .from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
                page = i + 1;
            }
            else if (currentPage <= 3) {
                page = i + 1;
            }
            else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
            }
            else {
                page = currentPage - 2 + i;
            }
            return key = { page };
            onClick = {}();
            handlePageChange(page);
        }, aria - current, { currentPage } === page ? 'page' : undefined) };
aria - label;
{
    `Page ${page}`;
}
className = {} `page-btn ${currentPage === page ? 'active' : ''}`;
    >
        { page }
    < /button>;
;
/div>
    < button;
onClick = {}();
handlePageChange(Math.min(totalPages, currentPage + 1));
disabled = { currentPage } === totalPages;
aria - label;
"Page suivante";
className = "pagination-btn next-btn"
    >
        className;
"btn-text" > Suivant < /span>
    < lucide_react_1.ChevronRight;
size = { 16:  };
aria - hidden;
"true" /  >
    /button>
    < /div>
    < /nav>;
/section>
    < /Suspense>;
;
// Carousel mode with enhanced mobile support
return fallback = {} < LoadingSkeleton;
count = { 3:  } /  > ;
 >
    className;
{
    className;
}
aria - label;
{
    ariaLabel || 'Carrousel des prestataires disponibles';
}
data - testid;
{
    testId || 'providers-carousel';
}
role = "region"
    >
        { showFilters } && className;
"carousel-filters" >
    role;
"tablist";
aria - label;
"Types de prestataires";
className = "carousel-filter-tabs"
    >
        role;
"tab";
aria - selected;
{
    activeFilter === 'all';
}
onClick = {}();
setActiveFilter('all');
className = {} `carousel-tab ${activeFilter === 'all' ? 'active' : ''}`;
    >
        Tous
    < /button>
    < button;
role = "tab";
aria - selected;
{
    activeFilter === 'lawyer';
}
onClick = {}();
setActiveFilter('lawyer');
className = {} `carousel-tab ${activeFilter === 'lawyer' ? 'active' : ''}`;
    >
        Avocats
    < /button>
    < button;
role = "tab";
aria - selected;
{
    activeFilter === 'expat';
}
onClick = {}();
setActiveFilter('expat');
className = {} `carousel-tab ${activeFilter === 'expat' ? 'active' : ''}`;
    >
        Experts
    < /button>
    < /div>
    < /div>;
{
    error && role;
    "alert";
    aria - live;
    "polite";
    className = "carousel-error"
        >
            { error } < /p>
        < button;
    onClick = { loadProviders } > Réessayer < /button>
        < /div>;
}
{ /* Enhanced carousel with touch support */ }
className;
"carousel-container";
role = "region";
aria - label;
"Carrousel des prestataires";
aria - live;
"polite"
    >
        className;
"carousel-track";
style = {};
{
    transform: `translateX(-${currentIndex * (100 / CAROUSEL_VISIBLE_ITEMS)}%)`,
        transition;
    'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}
onTouchStart = {}(e);
{
    const touch = e.touches[0];
    const startX = touch.clientX;
    const handleTouchMove = (moveEvent) => {
        const currentX = moveEvent.touches[0].clientX;
        const diffX = startX - currentX;
        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                handleNext();
            }
            else {
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
}
    >
        {
            : .from({ length: CAROUSEL_VISIBLE_ITEMS }, (_, index) => key = { index }, className = "carousel-item" >
                count, { 1:  } /  >
                /div>),
            displayProviders, : .length > 0 ? (displayProviders.map((provider, index) => key = { provider, : .id }, className = "carousel-item", aria - label, {} `Prestataire ${index + 1} sur ${displayProviders.length}`)) :  }
    >
        provider;
{
    provider;
}
isCarousel = { true:  }
    /  >
    /div>;
className = "carousel-empty";
role = "status" >
    className;
"empty-content" >
    Aucun;
prestataire;
trouvé < /p>
    < button;
onClick = { resetFilters } >
    Réinitialiser;
les;
filtres
    < /button>
    < /div>
    < /div>;
/div>;
{ /* Enhanced navigation controls */ }
{
    displayProviders.length > CAROUSEL_VISIBLE_ITEMS && onClick;
    {
        handlePrev;
    }
    aria - label;
    "Voir les prestataires précédents";
    className = "carousel-nav prev-nav";
    onKeyDown = {}(e);
    {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePrev();
        }
    }
}
    >
        size;
{
    24;
}
aria - hidden;
"true" /  >
    /button>
    < button;
onClick = { handleNext };
aria - label;
"Voir les prestataires suivants";
className = "carousel-nav next-nav";
onKeyDown = {}(e);
{
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
    }
}
    >
        size;
{
    24;
}
aria - hidden;
"true" /  >
    /button>;
{ /* Carousel indicators */ }
className;
"carousel-indicators";
role = "tablist";
aria - label;
"Indicateurs du carrousel" >
    { Array, : .from({
            length: Math.max(1, Math.ceil(displayProviders.length - CAROUSEL_VISIBLE_ITEMS + 1))
        }, (_, i) => key = { i }, role = "tab", aria - selected, { currentIndex } === i) };
aria - label;
{
    `Aller à la page ${i + 1} du carrousel`;
}
onClick = {}();
setCurrentIndex(i);
className = {} `indicator ${currentIndex === i ? 'active' : ''}`;
/>;
/div>
    < />;
/div>;
{ /* Carousel summary for screen readers */ }
className;
"sr-only";
aria - live;
"polite" >
    Affichage;
de;
{
    Math.min(CAROUSEL_VISIBLE_ITEMS, displayProviders.length);
}
prestataires;
sur;
{
    displayProviders.length;
}
/div>
    < /section>
    < /Suspense>;
;
;
// Enhanced export with display name for debugging
ProfileCards.displayName = 'ProfileCards';
exports.default = react_1.default.memo(ProfileCards);
//# sourceMappingURL=createPaymentIntent.js.map