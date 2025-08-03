import React, { useState, useCallback, useMemo } from 'react';
import { Globe, MapPin, Users, Scale, Search } from 'lucide-react';
import WorldMap from '../map/WorldMap';

const MapSection: React.FC = () => {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Memoized translations
  const translations = useMemo(() => ({
    fr: {
      title: 'Nos experts partout dans le monde',
      subtitle: 'Découvrez nos avocats et expatriés francophones disponibles dans plus de 120 pays.',
      searchPlaceholder: 'Rechercher un pays, une langue...',
      searchButton: 'Rechercher',
      mapTitle: 'Carte mondiale interactive',
      mapSubtitle: 'Nos experts sont disponibles dans plus de 120 pays',
      verifiedLawyers: 'Avocats vérifiés',
      verifiedLawyersDesc: 'Tous nos avocats sont vérifiés et certifiés pour exercer dans leur pays.',
      experiencedExpats: 'Expatriés expérimentés',
      experiencedExpatsDesc: 'Des expatriés francophones avec au moins 1 an d\'expérience dans leur pays.',
      countriesCovered: '120+ pays couverts',
      countriesCoveredDesc: 'Une couverture mondiale pour vous aider où que vous soyez.'
    },
    en: {
      title: 'Our experts worldwide',
      subtitle: 'Discover our French-speaking lawyers and expats available in more than 120 countries.',
      searchPlaceholder: 'Search for a country, language...',
      searchButton: 'Search',
      mapTitle: 'Interactive world map',
      mapSubtitle: 'Our experts are available in more than 120 countries',
      verifiedLawyers: 'Verified lawyers',
      verifiedLawyersDesc: 'All our lawyers are verified and certified to practice in their country.',
      experiencedExpats: 'Experienced expats',
      experiencedExpatsDesc: 'French-speaking expats with at least 1 year of experience in their country.',
      countriesCovered: '120+ countries covered',
      countriesCoveredDesc: 'Worldwide coverage to help you wherever you are.'
    }
  }), []);

  const t = translations[language];

  // Search handler
  const handleSearch = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Searching for:', searchQuery);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Feature cards data
  const featureCards = useMemo(() => [
    {
      id: 'lawyers',
      icon: Scale,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      title: t.verifiedLawyers,
      description: t.verifiedLawyersDesc
    },
    {
      id: 'expats',
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: t.experiencedExpats,
      description: t.experiencedExpatsDesc
    },
    {
      id: 'coverage',
      icon: MapPin,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      title: t.countriesCovered,
      description: t.countriesCoveredDesc
    }
  ], [t]);

  return (
    <section 
      className="py-12 sm:py-16 lg:py-20" 
      aria-labelledby="map-section-title"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Language Toggle */}
        <div className="text-center mb-4">
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            🌐 {language === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>

        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center bg-red-100 p-2 sm:p-3 rounded-full mb-4">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" aria-hidden="true" />
          </div>
          <h2 
            id="map-section-title"
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight"
          >
            {t.title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
            {t.subtitle}
          </p>
        </header>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12 px-4 sm:px-0">
          <div role="search" aria-label="Search experts">
            <div className="bg-white rounded-full shadow-lg border border-gray-100 p-1 sm:p-2 flex items-stretch">
              <div className="bg-red-600 text-white p-2 sm:p-2.5 rounded-full flex-shrink-0">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </div>
              <label htmlFor="expert-search" className="sr-only">
                {t.searchPlaceholder}
              </label>
              <input 
                id="expert-search"
                type="text" 
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                placeholder={t.searchPlaceholder}
                className="flex-1 px-3 sm:px-4 py-2 outline-none text-sm sm:text-base border-none focus:ring-0"
                autoComplete="off"
                maxLength={100}
                disabled={isSearching}
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-red-600 hover:bg-red-700 focus:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-full font-medium text-sm sm:text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={isSearching ? 'Recherche en cours...' : t.searchButton}
              >
                {isSearching ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    <span className="hidden sm:inline">...</span>
                  </span>
                ) : (
                  t.searchButton
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Interactive World Map - CORRECTION PRINCIPALE */}
        <div className="mb-8 sm:mb-12">
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-white">
            {/* ✅ CORRECTION : Dimensions explicites et props nécessaires */}
            <WorldMap 
              height="500px" 
              width="100%"
              className="w-full"
              showOnlineOnly={false}
              filterByRole="all"
              ariaLabel="Carte mondiale des experts disponibles"
            />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
          {featureCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <article 
                key={card.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-4 sm:p-6 text-center transform hover:scale-105 transition-all duration-300 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2"
                tabIndex={0}
                role="article"
              >
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className={`${card.bgColor} rounded-full p-3 sm:p-4`}>
                    <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${card.iconColor}`} aria-hidden="true" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                  {card.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {card.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MapSection;