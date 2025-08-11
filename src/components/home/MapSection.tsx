import React, { useState, useCallback, useMemo } from 'react';
import { Globe, MapPin, Users, Scale } from 'lucide-react';
import WorldMap from '../map/WorldMap';

// Types
interface FeatureCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
  title: string;
  description: string;
}

interface Translations {
  title: string;
  subtitle: string;
  mapTitle: string;       // conservé dans les traductions si besoin futur
  mapSubtitle: string;    // conservé idem
  verifiedLawyers: string;
  verifiedLawyersDesc: string;
  experiencedExpats: string;
  experiencedExpatsDesc: string;
  countriesCovered: string;
  countriesCoveredDesc: string;
}

type Language = 'fr' | 'en';

const MapSection: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fr');

  const translations = useMemo((): Record<Language, Translations> => ({
    fr: {
      title: 'Nos conseils dans votre langue',
      subtitle: 'Découvrez nos avocats et expatriés francophones disponibles dans plus de 120 pays.',
      mapTitle: 'Carte mondiale interactive',
      mapSubtitle: 'Nos conseils sont disponibles dans plus de 120 pays',
      verifiedLawyers: 'Avocats vérifiés',
      verifiedLawyersDesc: 'Tous nos avocats sont vérifiés et certifiés pour exercer dans leur pays.',
      experiencedExpats: 'Expatriés expérimentés',
      experiencedExpatsDesc: 'Des expatriés francophones avec au moins 1 an d\'expérience dans leur pays.',
      countriesCovered: '120+ pays couverts',
      countriesCoveredDesc: 'Une couverture mondiale pour vous aider où que vous soyez.'
    },
    en: {
      title: 'Our advice in your language',
      subtitle: 'Discover our French-speaking lawyers and expats available in more than 120 countries.',
      mapTitle: 'Interactive world map',
      mapSubtitle: 'Our advice is available in more than 120 countries',
      verifiedLawyers: 'Verified lawyers',
      verifiedLawyersDesc: 'All our lawyers are verified and certified to practice in their country.',
      experiencedExpats: 'Experienced expats',
      experiencedExpatsDesc: 'French-speaking expats with at least 1 year of experience in their country.',
      countriesCovered: '120+ countries covered',
      countriesCoveredDesc: 'Worldwide coverage to help you wherever you are.'
    }
  }), []);

  const t = translations[language];

  const handleLanguageToggle = useCallback(() => {
    setLanguage(prev => (prev === 'fr' ? 'en' : 'fr'));
  }, []);

  const featureCards = useMemo((): FeatureCard[] => [
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
        
        {/* Toggle langue */}
        <div className="text-center mb-4">
          <button
            onClick={handleLanguageToggle}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
            aria-label={`Changer la langue vers ${language === 'fr' ? 'anglais' : 'français'}`}
          >
            <Globe className="w-3 h-3 mr-1" aria-hidden="true" />
            {language === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>

        {/* Header principal (au-dessus de la carte, ne masque rien) */}
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

        {/* WorldMap sans bandeau blanc au-dessus */}
        <div className="mb-8 sm:mb-12">
          {/* conteneur neutre : pas de bg blanc, pas d’en-tête interne */}
          <div className="rounded-2xl shadow-lg border border-gray-200 overflow-hidden bg-transparent">
            <div className="relative">
              <WorldMap
                height="560px"
                width="100%"
                className="w-full"
                showOnlineOnly={false}
                filterByRole="all"
                ariaLabel="Carte mondiale des conseils disponibles"
                allowFullscreen
              />
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
          {featureCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <article
                key={card.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 p-4 sm:p-6 text-center transform hover:scale-105 transition-all duration-300 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 cursor-pointer"
                tabIndex={0}
                role="article"
                aria-labelledby={`card-title-${card.id}`}
                aria-describedby={`card-desc-${card.id}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // action possible au clavier
                    console.log(`Card ${card.id} activated`);
                  }
                }}
              >
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className={`${card.bgColor} rounded-full p-3 sm:p-4 transition-transform group-hover:scale-110`}>
                    <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${card.iconColor}`} aria-hidden="true" />
                  </div>
                </div>
                <h3
                  id={`card-title-${card.id}`}
                  className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3"
                >
                  {card.title}
                </h3>
                <p
                  id={`card-desc-${card.id}`}
                  className="text-sm sm:text-base text-gray-600 leading-relaxed"
                >
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

export default React.memo(MapSection);
