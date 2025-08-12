import React, { useState, useCallback, useRef } from 'react';
import { Star, MapPin, Globe, Users, Zap, Eye, ArrowRight, Wifi, WifiOff } from 'lucide-react';

// Types
interface Provider {
  id: string;
  name: string;
  type: 'lawyer' | 'expat' | 'accountant' | 'notary' | 'tax_consultant' | 'real_estate' | 'translator' | 'hr_consultant' | 'financial_advisor' | 'insurance_broker';
  country: string;
  nationality?: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  isOnline: boolean;
  avatar: string;
  profilePhoto?: string;
  description: string;
  price: number;
  duration: number;
  isApproved?: boolean;
}

interface ModernProfileCardProps {
  provider: Provider;
  onProfileClick: (provider: Provider) => void;
  isUserConnected: boolean;
  index?: number;
  language?: 'fr' | 'en';
}

const LANGUAGE_MAP: Record<string, string> = {
  'Français': 'Français',
  'French': 'Français',
  'fr': 'Français',
  'FR': 'Français',
  'Anglais': 'Anglais',
  'English': 'Anglais',
  'en': 'Anglais',
  'EN': 'Anglais',
  'Espagnol': 'Espagnol',
  'Spanish': 'Espagnol',
  'Español': 'Espagnol',
  'es': 'Espagnol',
  'ES': 'Espagnol',
  'Português': 'Portugais',
  'Portuguese': 'Portugais',
  'pt': 'Portugais',
  'PT': 'Portugais',
  'Deutsch': 'Allemand',
  'German': 'Allemand',
  'de': 'Allemand',
  'DE': 'Allemand',
  'Italiano': 'Italien',
  'Italian': 'Italien',
  'it': 'Italien',
  'IT': 'Italien',
  'Nederlands': 'Néerlandais',
  'Dutch': 'Néerlandais',
  'nl': 'Néerlandais',
  'NL': 'Néerlandais',
  'Русский': 'Russe',
  'Russian': 'Russe',
  'ru': 'Russe',
  'RU': 'Russe',
  '中文': 'Chinois',
  'Chinese': 'Chinois',
  'zh': 'Chinois',
  'ZH': 'Chinois',
  'العربية': 'Arabe',
  'Arabic': 'Arabe',
  'ar': 'Arabe',
  'AR': 'Arabe'
} as const;

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23f1f5f9"/%3E%3Ccircle cx="200" cy="160" r="60" fill="%23cbd5e1"/%3E%3Cpath d="M100 350c0-55 45-100 100-100s100 45 100 100" fill="%23cbd5e1"/%3E%3C/svg%3E';

// Flag emojis map - Version HD avec plus de pays
const FLAG_MAP: Record<string, string> = {
  'France': '🇫🇷',
  'Espagne': '🇪🇸',
  'Spain': '🇪🇸',
  'Canada': '🇨🇦',
  'Portugal': '🇵🇹',
  'Allemagne': '🇩🇪',
  'Germany': '🇩🇪',
  'Italie': '🇮🇹',
  'Italy': '🇮🇹',
  'Belgique': '🇧🇪',
  'Belgium': '🇧🇪',
  'Suisse': '🇨🇭',
  'Switzerland': '🇨🇭',
  'Royaume-Uni': '🇬🇧',
  'United Kingdom': '🇬🇧',
  'États-Unis': '🇺🇸',
  'United States': '🇺🇸',
  'Pays-Bas': '🇳🇱',
  'Netherlands': '🇳🇱',
  'Autriche': '🇦🇹',
  'Austria': '🇦🇹',
  'Luxembourg': '🇱🇺',
  'Maroc': '🇲🇦',
  'Morocco': '🇲🇦',
  'Tunisie': '🇹🇳',
  'Tunisia': '🇹🇳',
  'Algérie': '🇩🇿',
  'Algeria': '🇩🇿',
  'Sénégal': '🇸🇳',
  'Senegal': '🇸🇳',
  'Côte d\'Ivoire': '🇨🇮',
  'Ivory Coast': '🇨🇮'
};

// Système i18n - Traductions FR/EN
const TRANSLATIONS = {
  fr: {
    professions: {
      lawyer: 'Avocat',
      expat: 'Expat',
      accountant: 'Comptable',
      notary: 'Notaire',
      tax_consultant: 'Fiscaliste',
      real_estate: 'Immobilier',
      translator: 'Traducteur',
      hr_consultant: 'RH',
      financial_advisor: 'Finance',
      insurance_broker: 'Assurance'
    },
    labels: {
      online: 'En ligne',
      offline: 'Hors ligne',
      languages: 'Langues',
      specialties: 'Spécialités',
      years: 'ans',
      reviews: 'avis',
      viewProfile: 'Voir le profil',
      others: 'autres'
    }
  },
  en: {
    professions: {
      lawyer: 'Lawyer',
      expat: 'Expat',
      accountant: 'Accountant',
      notary: 'Notary',
      tax_consultant: 'Tax Advisor',
      real_estate: 'Real Estate',
      translator: 'Translator',
      hr_consultant: 'HR',
      financial_advisor: 'Finance',
      insurance_broker: 'Insurance'
    },
    labels: {
      online: 'Online',
      offline: 'Offline',
      languages: 'Languages',
      specialties: 'Specialties',
      years: 'years',
      reviews: 'reviews',
      viewProfile: 'View profile',
      others: 'others'
    }
  }
};

// Icônes métiers avec plus de professions
const PROFESSION_ICONS: Record<string, { icon: string; bgColor: string; textColor: string }> = {
  'lawyer': { 
    icon: '⚖️', 
    bgColor: 'bg-slate-100', 
    textColor: 'text-slate-700' 
  },
  'expat': { 
    icon: '🌍', 
    bgColor: 'bg-blue-100', 
    textColor: 'text-blue-700' 
  },
  'accountant': { 
    icon: '🧮', 
    bgColor: 'bg-green-100', 
    textColor: 'text-green-700' 
  },
  'notary': { 
    icon: '📜', 
    bgColor: 'bg-amber-100', 
    textColor: 'text-amber-700' 
  },
  'tax_consultant': { 
    icon: '💰', 
    bgColor: 'bg-yellow-100', 
    textColor: 'text-yellow-700' 
  },
  'real_estate': { 
    icon: '🏠', 
    bgColor: 'bg-orange-100', 
    textColor: 'text-orange-700' 
  },
  'translator': { 
    icon: '📝', 
    bgColor: 'bg-purple-100', 
    textColor: 'text-purple-700' 
  },
  'hr_consultant': { 
    icon: '👥', 
    bgColor: 'bg-pink-100', 
    textColor: 'text-pink-700' 
  },
  'financial_advisor': { 
    icon: '📊', 
    bgColor: 'bg-indigo-100', 
    textColor: 'text-indigo-700' 
  },
  'insurance_broker': { 
    icon: '🛡️', 
    bgColor: 'bg-cyan-100', 
    textColor: 'text-cyan-700' 
  }
};

// Fonction pour détecter la langue (navigateur ou prop)
const getLanguage = (userLanguage?: string): 'fr' | 'en' => {
  if (userLanguage) return userLanguage as 'fr' | 'en';
  if (typeof window !== 'undefined') {
    const browserLang = window.navigator.language;
    return browserLang.startsWith('fr') ? 'fr' : 'en';
  }
  return 'fr';
};

// Fonction de traduction
const t = (lang: 'fr' | 'en', key: string, subKey?: string): string => {
  const translation = TRANSLATIONS[lang];
  if (subKey) {
    return (translation as any)[key]?.[subKey] || key;
  }
  return (translation as any)[key] || key;
};

// Fonction pour obtenir l'icône métier
const getProfessionInfo = (type: string) => {
  return PROFESSION_ICONS[type] || PROFESSION_ICONS['expat'];
};

// Fonction utilitaire pour obtenir le label de langue
const getLanguageLabel = (language: string): string => {
  return LANGUAGE_MAP[language] || language;
};

// Composant ModernProfileCard - Version corrigée
const ModernProfileCard: React.FC<ModernProfileCardProps> = React.memo(({ 
  provider, 
  onProfileClick, 
  isUserConnected,
  index = 0,
  language 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Langue utilisée (prop ou détection auto)
  const currentLang = getLanguage(language);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_AVATAR) {
      target.src = DEFAULT_AVATAR;
    }
  }, []);

  const handleClick = useCallback(() => {
    onProfileClick(provider);
  }, [provider, onProfileClick]);

  // Couleurs basées sur le statut en ligne - Avec ombre autour du trait
  const statusColors = provider.isOnline ? {
    border: 'border-green-300',
    shadow: 'shadow-green-100',
    glow: 'shadow-green-200/50',
    borderShadow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]',
    badge: 'bg-green-100 text-green-800 border-green-300',
    button: 'bg-green-700 hover:bg-green-800 border-green-700',
    accent: 'text-green-700'
  } : {
    border: 'border-red-500',
    shadow: 'shadow-red-100',
    glow: 'shadow-red-200/50',
    borderShadow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]',
    badge: 'bg-red-100 text-red-800 border-red-300',
    button: 'bg-red-700 hover:bg-red-800 border-red-700',
    accent: 'text-red-700'
  };

  return (
    <div className="flex-shrink-0 p-4">
      <article
        ref={cardRef}
        className={`
          relative w-80 h-[520px] bg-white rounded-2xl overflow-hidden cursor-pointer
          transition-all duration-300 ease-out border-2 shadow-lg
          ${statusColors.border} ${statusColors.shadow} ${statusColors.borderShadow}
          ${isHovered ? `scale-[1.02] ${statusColors.glow} shadow-xl` : ''}
        `}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          animationDelay: `${index * 100}ms`
        }}
      >
        
        {/* Header avec photo et statut - Format portrait plus grand */}
        <div className="relative h-72 overflow-hidden bg-slate-100">
          <img
            src={provider.avatar || provider.profilePhoto || DEFAULT_AVATAR}
            alt={`Photo de ${provider.name}`}
            className={`
              w-full h-full object-cover transition-all duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              ${isHovered ? 'scale-105' : ''}
            `}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* Statut en ligne avec icône WiFi - Angles très arrondis */}
          <div className="absolute top-4 left-4">
            <div className={`
              inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
              backdrop-blur-sm border shadow-sm
              ${statusColors.badge}
            `}>
              {provider.isOnline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span>{provider.isOnline ? t(currentLang, 'labels', 'online') : t(currentLang, 'labels', 'offline')}</span>
            </div>
          </div>
          
          {/* Type badge avec icône métier - Même hauteur que le statut */}
          <div className="absolute top-4 right-4">
            {(() => {
              const professionInfo = getProfessionInfo(provider.type);
              return (
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border shadow-sm ${professionInfo.bgColor} ${professionInfo.textColor} border-white/20`}>
                  <span className="text-sm font-medium">
                    {professionInfo.icon} {t(currentLang, 'professions', provider.type)}
                  </span>
                </div>
              );
            })()}
          </div>
          
          {/* Note avec étoile */}
          <div className="absolute bottom-4 right-4">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              <span className="text-slate-700 text-sm font-medium">{provider.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        {/* Contenu principal - Plus d'espace pour le bouton */}
        <div className="p-3 flex flex-col h-[232px]">
          
          {/* Nom avec ancienneté encadrée à droite */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 truncate flex-1 pr-2">
                {provider.name}
              </h3>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 border border-teal-200 flex-shrink-0">
                <Zap className="w-3 h-3 text-teal-600" />
                <span className="text-teal-600 text-xs font-medium">{provider.yearsOfExperience}{t(currentLang, 'labels', 'years')}</span>
              </div>
            </div>
            
            {provider.nationality && (
              <div className="flex items-center gap-2">
                <span className="text-xl">{FLAG_MAP[provider.country] || FLAG_MAP[provider.nationality] || '🌍'}</span>
                <span className="text-slate-600 text-xs font-medium">{provider.nationality}</span>
              </div>
            )}
          </div>

          {/* Contenu organisé et aéré */}
          <div className="space-y-2 h-28 overflow-hidden">
            
            {/* Pays avec drapeau plus visible */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{FLAG_MAP[provider.country] || '🌍'}</span>
              <span className="text-blue-600 text-xs font-medium truncate">{provider.country}</span>
            </div>
            
            {/* Langues - Format compact avec i18n */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-indigo-600" />
                <span className="text-slate-700 font-semibold text-xs">{t(currentLang, 'labels', 'languages')}</span>
              </div>
              <div className="pl-5">
                {provider.languages.length <= 3 ? (
                  <span className="text-indigo-600 text-xs">
                    {provider.languages.map(lang => getLanguageLabel(lang)).join(' • ')}
                  </span>
                ) : (
                  <span className="text-indigo-600 text-xs">
                    {provider.languages.slice(0, 2).map(lang => getLanguageLabel(lang)).join(' • ')}
                    <span className="text-indigo-500 ml-1">+{provider.languages.length - 2} {t(currentLang, 'labels', 'others')}</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Spécialités - Format compact avec i18n */}
            {provider.specialties && provider.specialties.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-purple-600" />
                  <span className="text-slate-700 font-semibold text-xs">{t(currentLang, 'labels', 'specialties')}</span>
                </div>
                <div className="pl-5">
                  {provider.specialties.length <= 2 ? (
                    <span className="text-purple-600 text-xs">
                      {provider.specialties.join(' • ')}
                    </span>
                  ) : (
                    <span className="text-purple-600 text-xs">
                      {provider.specialties.slice(0, 2).join(' • ')}
                      <span className="text-purple-500 ml-1">+{provider.specialties.length - 2}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Stats en bas - TOUJOURS VISIBLE */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-600" />
              <span className="text-amber-600 text-xs font-medium">{provider.reviewCount} {t(currentLang, 'labels', 'reviews')}</span>
            </div>
            <div className="text-slate-400 text-xs">
              {t(currentLang, 'professions', provider.type)}
            </div>
          </div>
          
          {/* BOUTON CTA - POSITION ABSOLUE POUR GARANTIR LA VISIBILITÉ */}
          <div className="mt-3">
            <button 
              className={`
                w-full py-3 px-4 rounded-lg font-bold text-sm text-white
                transition-all duration-300 flex items-center justify-center gap-2
                border-2 shadow-lg relative overflow-hidden group
                ${statusColors.button}
                hover:scale-105 hover:shadow-xl
              `}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              type="button"
            >
              <Eye className="w-4 h-4" />
              <span className="font-bold">{t(currentLang, 'labels', 'viewProfile')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>

      {/* Styles intégrés pour éviter les conflits */}
      <style>{`
        article {
          animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          article {
            animation: none;
            opacity: 1;
            transform: none;
          }
          
          * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
});

ModernProfileCard.displayName = 'ModernProfileCard';

export default ModernProfileCard;
export type { Provider, ModernProfileCardProps };