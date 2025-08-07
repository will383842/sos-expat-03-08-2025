import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, Phone, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { collection, query, getDocs, limit, where, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Provider, normalizeProvider, validateProvider } from '../types/Provider';

type ProviderType = 'all' | 'lawyer' | 'expat';
type SortOption = 'rating' | 'price' | 'experience';

// Configuration constants
const CONFIG = {
  FIRESTORE_LIMIT: 100,
  DEFAULT_AVATAR: '/default-avatar.png',
  PRICES: {
    lawyer: 49,
    expat: 19
  },
  CONSULTATION_DURATION: {
    lawyer: '20 min',
    expat: '30 min'
  }
} as const;

// Utility functions
const normalizeString = (str: string): string => 
  str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-');

const createSlug = (name: string): string => normalizeString(name);

const getCountryCoordinates = (country: string): { lat: number; lng: number } | null => {
  const coordinates: Record<string, { lat: number; lng: number }> = {
    'canada': { lat: 56.1304, lng: -106.3468 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'espagne': { lat: 40.4637, lng: -3.7492 },
    'allemagne': { lat: 51.1657, lng: 10.4515 },
    'italie': { lat: 41.8719, lng: 12.5674 },
    'suisse': { lat: 46.8182, lng: 8.2275 },
    'belgique': { lat: 50.5039, lng: 4.4699 },
    'royaume-uni': { lat: 55.3781, lng: -3.4360 },
    'portugal': { lat: 39.3999, lng: -8.2245 },
    'pays-bas': { lat: 52.1326, lng: 5.2913 },
    'australie': { lat: -25.2744, lng: 133.7751 },
    'nouvelle-zelande': { lat: -40.9006, lng: 174.8860 },
    'japon': { lat: 36.2048, lng: 138.2529 },
    'singapour': { lat: 1.3521, lng: 103.8198 },
    'hong-kong': { lat: 22.3193, lng: 114.1694 },
    'emirats-arabes-unis': { lat: 23.4241, lng: 53.8478 },
    'etats-unis': { lat: 37.0902, lng: -95.7129 },
    'thaïlande': { lat: 15.8700, lng: 100.9925 },
    'vietnam': { lat: 14.0583, lng: 108.2772 },
    'coree-du-sud': { lat: 35.9078, lng: 127.7669 },
    'chine': { lat: 35.8617, lng: 104.1954 },
    'inde': { lat: 20.5937, lng: 78.9629 },
    'bresil': { lat: -14.2350, lng: -51.9253 },
    'argentine': { lat: -38.4161, lng: -63.6167 },
    'chili': { lat: -35.6751, lng: -71.5430 },
    'mexique': { lat: 23.6345, lng: -102.5528 },
    'maroc': { lat: 31.7917, lng: -7.0926 },
    'tunisie': { lat: 33.8869, lng: 9.5375 },
    'algerie': { lat: 28.0339, lng: 1.6596 },
    'senegal': { lat: 14.4974, lng: -14.4524 },
    'cote-d-ivoire': { lat: 7.5400, lng: -5.5471 },
    'cameroun': { lat: 7.3697, lng: 12.3547 },
    'madagascar': { lat: -18.7669, lng: 46.8691 },
    'maurice': { lat: -20.3484, lng: 57.5522 },
    'reunion': { lat: -21.1151, lng: 55.5364 },
    'nouvelle-caledonie': { lat: -20.9043, lng: 165.6180 },
    'polynesie-francaise': { lat: -17.6797, lng: -149.4068 },
    'martinique': { lat: 14.6415, lng: -61.0242 },
    'guadeloupe': { lat: 16.9950, lng: -62.0670 },
    'guyane': { lat: 3.9339, lng: -53.1258 },
    'mayotte': { lat: -12.8275, lng: 45.1662 },
    'saint-pierre-et-miquelon': { lat: 46.8852, lng: -56.3159 }
  };
  return coordinates[normalizeString(country)] || null;
};

const Providers: React.FC = () => {
  const { language } = useApp();
  const navigate = useNavigate();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ProviderType>('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Memoized translations
  const translations = useMemo(() => ({
    fr: {
      title: 'Nos Experts Vérifiés',
      subtitle: 'Trouvez l\'expert qui vous aidera à résoudre votre problème rapidement',
      experts: 'Experts',
      averageRating: 'Note moyenne',
      countries: 'Pays',
      searchPlaceholder: 'Rechercher un expert...',
      allTypes: 'Tous les types',
      lawyers: 'Avocats',
      expats: 'Expatriés',
      allCountries: 'Tous les pays',
      bestRated: 'Mieux notés',
      priceAscending: 'Prix croissant',
      mostExperienced: 'Plus expérimentés',
      onlineOnly: 'En ligne uniquement',
      expertsFound: 'expert(s) trouvé(s)',
      lawyer: 'Avocat',
      expat: 'Expatrié',
      online: 'En ligne',
      offline: 'Hors ligne',
      years: 'ans',
      reviews: 'avis',
      callNow: 'Appeler maintenant',
      viewProfile: 'Hors ligne - Voir profil',
      noExperts: 'Aucun expert trouvé pour ces critères',
      resetFilters: 'Réinitialiser les filtres',
      loadingExperts: 'Chargement des experts...',
      errorLoading: 'Erreur lors du chargement des experts'
    },
    en: {
      title: 'Our Verified Experts',
      subtitle: 'Find the expert who will help you solve your problem quickly',
      experts: 'Experts',
      averageRating: 'Average rating',
      countries: 'Countries',
      searchPlaceholder: 'Search an expert...',
      allTypes: 'All types',
      lawyers: 'Lawyers',
      expats: 'Expats',
      allCountries: 'All countries',
      bestRated: 'Best rated',
      priceAscending: 'Price ascending',
      mostExperienced: 'Most experienced',
      onlineOnly: 'Online only',
      expertsFound: 'expert(s) found',
      lawyer: 'Lawyer',
      expat: 'Expat',
      online: 'Online',
      offline: 'Offline',
      years: 'years',
      reviews: 'reviews',
      callNow: 'Call now',
      viewProfile: 'Offline - View profile',
      noExperts: 'No experts found for these criteria',
      resetFilters: 'Reset filters',
      loadingExperts: 'Loading experts...',
      errorLoading: 'Error loading experts'
    }
  }), []);

  const t = translations[language as keyof typeof translations] || translations.fr;

  // Data transformation helper - MODIFIÉ selon les instructions
  const transformFirestoreData = useCallback((doc: QueryDocumentSnapshot<DocumentData>): Provider | null => {
    try {
      const data = doc.data();
      if (!data) return null;
      
      const provider = normalizeProvider({
        id: doc.id,
        ...data
      });
      
      return provider;
    } catch (error) {
      console.error("Erreur transformation:", error);
      return null;
    }
  }, []);

  // Load providers from Firestore
  const loadProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const sosProfilesQuery = query(
        collection(db, "sos_profiles"),
        where("isVisible", "==", true),
        where("isApproved", "==", true),
        where("isBanned", "==", false),
        limit(CONFIG.FIRESTORE_LIMIT)
      );
      
      const snapshot = await getDocs(sosProfilesQuery);
      const providersData = snapshot.docs
        .map(transformFirestoreData)
        .filter(validateProvider);
      
      setProviders(providersData);
      if (providersData.length === 0) {
        setError('Aucun expert disponible actuellement.');
      }
    } catch (error) {
      console.error("Erreur lors du chargement des prestataires:", error);
      setError('Erreur lors du chargement des experts. Veuillez réessayer.');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, [transformFirestoreData]);

  // Initialize component
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    
    if (typeParam === 'lawyer' || typeParam === 'expat') {
      setSelectedType(typeParam);
    }
    
    loadProviders();
  }, [loadProviders]);

  // Memoized unique countries
  const countries = useMemo(() => 
    Array.from(new Set(providers.map(p => p.country))).sort(),
    [providers]
  );

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    const filtered = providers.filter(provider => {
      const matchesSearch = !searchTerm || 
        provider.name.toLowerCase().includes(searchLower) ||
        provider.specialties.some(s => s.toLowerCase().includes(searchLower)) ||
        provider.country.toLowerCase().includes(searchLower) ||
        provider.languages.some(lang => lang.toLowerCase().includes(searchLower));
      
      const matchesType = selectedType === 'all' || provider.type === selectedType;
      const matchesCountry = selectedCountry === 'all' || provider.country === selectedCountry;
      const matchesStatus = !onlineOnly || provider.isOnline;
      
      return matchesSearch && matchesType && matchesCountry && matchesStatus;
    });

    return filtered.sort((a, b) => {
      // Priority to online providers
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1;
      }
      
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'price': return a.price - b.price;
        case 'experience': return b.yearsOfExperience - a.yearsOfExperience;
        default: return 0;
      }
    });
  }, [providers, searchTerm, selectedType, selectedCountry, onlineOnly, sortBy]);

  // 🔧 CORRECTION PRINCIPALE - Handle provider selection avec les bons noms de propriétés
  const handleCallProvider = useCallback((provider: Provider) => {
    const slug = createSlug(provider.name);
    const mainLanguage = provider.languages.length > 0 ? createSlug(provider.languages[0]) : 'francais';
    const countrySlug = createSlug(provider.country);
    const role = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
    
    const seoUrl = `/${role}/${countrySlug}/${mainLanguage}/${slug}-${provider.id}`;
    
    // ✅ CORRECTION : Utilisation des noms de propriétés attendus par CallCheckoutWrapper
    const selectedProvider = normalizeProvider(provider); // ← AJOUT de normalizeProvider

    const serviceData = {
      providerId: selectedProvider.id,
      serviceType: selectedProvider.type === 'lawyer' ? 'lawyer_call' : 'expat_call',
      providerRole: selectedProvider.type,
      amount: selectedProvider.price,
      duration: selectedProvider.duration,
      clientPhone: '',
      commissionAmount: Math.round(selectedProvider.price * 0.20 * 100) / 100,
      providerAmount: Math.round(selectedProvider.price * 0.80 * 100) / 100
    };

    sessionStorage.setItem('selectedProvider', JSON.stringify(selectedProvider)); // ← AJOUT
    sessionStorage.setItem('serviceData', JSON.stringify(serviceData)); // ← AJOUT
    
    navigate(seoUrl, { 
      state: { 
        selectedProvider: selectedProvider, // ✅ Utilise "selectedProvider" au lieu de "providerData"
        serviceData: serviceData            // ✅ Utilise "serviceData" au lieu de "booking" ou autre
      } 
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCountry('all');
    setOnlineOnly(false);
  }, []);

  // Render star rating
  const renderStars = useCallback((rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  }, []);

  // Calculate stats
  const stats = useMemo(() => ({
    totalProviders: providers.length,
    averageRating: providers.length > 0 
      ? (providers.reduce((sum, p) => sum + p.rating, 0) / providers.length).toFixed(1)
      : '0',
    countries: countries.length
  }), [providers, countries]);

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t.loadingExperts}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error && providers.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">{t.errorLoading}</div>
            <button
              onClick={loadProviders}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto mb-8">{t.subtitle}</p>
            <div className="flex justify-center space-x-8 text-lg">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalProviders}</div>
                <div className="text-red-200">{t.experts}</div>
              </div>
              {stats.totalProviders > 0 && (
                <>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.averageRating}</div>
                    <div className="text-red-200">{t.averageRating}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.countries}</div>
                    <div className="text-red-200">{t.countries}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ProviderType)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t.allTypes}</option>
                  <option value="lawyer">{t.lawyers}</option>
                  <option value="expat">{t.expats}</option>
                </select>

                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t.allCountries}</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="rating">{t.bestRated}</option>
                  <option value="price">{t.priceAscending}</option>
                  <option value="experience">{t.mostExperienced}</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  id="online-filter"
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="online-filter" className="ml-2 text-sm text-gray-700">
                  {t.onlineOnly}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredProviders.length} {t.expertsFound}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={provider.avatar}
                        alt={provider.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = CONFIG.DEFAULT_AVATAR;
                        }}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            provider.type === 'lawyer' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {provider.type === 'lawyer' ? t.lawyer : t.expat}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            provider.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {provider.isOnline ? t.online : t.offline}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">€{provider.price}</div>
                      <div className="text-xs text-gray-500">
                        {CONFIG.CONSULTATION_DURATION[provider.type]}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <MapPin size={14} />
                      <span>{provider.country}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{provider.yearsOfExperience} {t.years}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    {renderStars(provider.rating)}
                    <span className="text-sm font-medium text-gray-900">{provider.rating}</span>
                    <span className="text-sm text-gray-500">({provider.reviewCount} {t.reviews})</span>
                  </div>

                  {provider.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {provider.description}
                    </p>
                  )}

                  {provider.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {provider.specialties.slice(0, 3).map((specialty, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-6">
                    {provider.languages.map((lang, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCallProvider(provider)}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                      provider.isOnline
                        ? 'bg-red-600 text-white hover:bg-red-700 transform hover:scale-105 shadow-md hover:shadow-lg'
                        : 'bg-gray-300 text-gray-600 cursor-pointer hover:bg-gray-400'
                    }`}
                  >
                    <Phone size={20} />
                    <span>
                      {provider.isOnline ? t.callNow : t.viewProfile}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProviders.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">{t.noExperts}</div>
              <button
                onClick={resetFilters}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                {t.resetFilters}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Providers;