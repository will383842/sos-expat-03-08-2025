import React, { memo } from 'react';
import { Phone, Clock, AlertTriangle, Globe, Users, LucideIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Link } from 'react-router-dom';

// Types pour une meilleure sÃ©curitÃ© de type
interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

// Composant StatCard mÃ©morisÃ© pour Ã©viter les re-renders inutiles
const StatCard = memo<StatCardProps>(({ icon: Icon, value, label }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 transform hover:scale-105 transition-transform duration-200">
    <div className="flex items-center justify-center mb-2" aria-hidden="true">
      <Icon className="w-8 h-8 text-white" />
    </div>
    <div className="text-2xl sm:text-3xl font-bold mb-2 text-red-100" aria-label={`${value} ${label}`}>
      {value}
    </div>
    <div className="text-sm sm:text-base text-white">
      {label}
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

// Contenus i18n centralisÃ©s pour faciliter la future internationalisation
const content = {
  fr: {
    title: 'Besoin d\'un conseil Ã  l\'Ã©tranger ?',
    subtitle: 'Mise en relation instantanÃ©e - Service disponible 24h/24, 7j/7 dans plus de 120 pays',
    stats: {
      countries: 'Pays couverts',
      time: 'Minutes pour Ãªtre en ligne',
      support: 'Support disponible'
    },
    buttons: {
      urgent: 'SOS Appel Urgent',
      expat: 'Appel ExpatriÃ©'
    },
    disclaimer: 'Disponible uniquement pour les expatriÃ©s francophones et anglophones dans le monde entier.'
  },
  en: {
    title: 'Need help or advice quickly while abroad?',
    subtitle: 'Instant connection - Service available 24/7 in over 120 countries',
    stats: {
      countries: 'Countries covered',
      time: 'Minutes to be online',
      support: 'Support available'
    },
    buttons: {
      urgent: 'SOS Urgent Call',
      expat: 'Expat Call'
    },
    disclaimer: 'Available only for French and English-speaking expats worldwide.'
  }
};

const HeroSection: React.FC = memo(() => {
  const { language } = useApp();
  
  // Fallback sÃ©curisÃ© pour Ã©viter les erreurs de rendu
  const currentLanguage = (language === 'fr' || language === 'en') ? language : 'en';
  const t = content[currentLanguage];

  // Configuration des statistiques pour Ã©viter la duplication
  const stats = [
    { icon: Globe, value: '120+', label: t.stats.countries },
    { icon: Clock, value: '5', label: t.stats.time },
    { icon: Users, value: '24/7', label: t.stats.support }
  ];

  return (
    <section 
      className="bg-gradient-to-b from-red-800 to-red-700 text-white py-12 sm:py-16 lg:py-20"
      aria-labelledby="hero-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Titre principal optimisÃ© pour SEO */}
          <h1 
            id="hero-title"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white leading-tight max-w-4xl mx-auto"
          >
            {t.title}
          </h1>
          
          {/* Sous-titre optimisÃ© */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium mb-6 sm:mb-8 text-red-100 max-w-5xl mx-auto leading-relaxed">
            {t.subtitle}
          </h2>
          
          {/* Statistiques avec grille responsive */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto mb-6 sm:mb-8"
            role="region"
            aria-label={currentLanguage === 'fr' ? 'Statistiques du service' : 'Service statistics'}
          >
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </div>
          
          {/* Boutons CTA optimisÃ©s pour mobile */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4">
            <Link
              to="/sos-appel"
              className="w-full sm:w-auto bg-white text-red-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-red-50 focus:bg-red-50 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg min-h-[3rem]"
              aria-describedby="urgent-call-desc"
            >
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" aria-hidden="true" />
              <span>{t.buttons.urgent}</span>
            </Link>
            
            <Link
              to="/sos-appel?type=expat"
              className="w-full sm:w-auto bg-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-red-500 focus:bg-red-500 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all duration-200 flex items-center justify-center gap-3 border-2 border-white/20 min-h-[3rem]"
              aria-describedby="expat-call-desc"
            >
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" aria-hidden="true" />
              <span>{t.buttons.expat}</span>
            </Link>
          </div>
          
          {/* Disclaimer avec meilleure lisibilitÃ© */}
          <p className="text-xs sm:text-sm text-red-200 mt-6 sm:mt-8 max-w-2xl mx-auto leading-relaxed px-4">
            {t.disclaimer}
          </p>
        </div>
      </div>
      
      {/* Descriptions cachÃ©es pour l'accessibilitÃ© */}
      <div className="sr-only">
        <div id="urgent-call-desc">
          {language === 'fr' 
            ? 'Bouton pour accÃ©der au service d\'appel urgent SOS'
            : 'Button to access urgent SOS call service'
          }
        </div>
        <div id="expat-call-desc">
          {language === 'fr' 
            ? 'Bouton pour accÃ©der au service d\'appel pour expatriÃ©s'
            : 'Button to access expat call service'
          }
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;

