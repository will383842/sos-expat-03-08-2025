// TODO: lazy import ce composant (React.lazy) pour réduire le bundle initial
// src/components/home/ModernProfileCard.tsx - VERSION PRODUCTION OPTIMISÉE
import * as React from 'react';
import { useState, useCallback, useRef, useMemo } from 'react';
import { Star, Globe, Users, Zap, Eye, ArrowRight, Wifi, WifiOff } from 'lucide-react';

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

// Constants - Centralisées pour éviter les recreations
const CARD_DIMENSIONS = {
  width: 320, // Mobile-first, responsive
  height: 520,
  imageHeight: 288,
  contentHeight: 232
} as const;

const TOUCH_TARGETS = {
  minimum: 44, // WCAG AA minimum
  button: 48,
  badge: 36
} as const;

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

// TODO: remplacer par srcset WebP/AVIF pour de meilleures performances
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23f1f5f9"/%3E%3Ccircle cx="200" cy="160" r="60" fill="%23cbd5e1"/%3E%3Cpath d="M100 350c0-55 45-100 100-100s100 45 100 100" fill="%23cbd5e1"/%3E%3C/svg%3E';

// Flag emojis map
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

// Système i18n - Détection navigateur + fallback
// TODO: intégrer avec react-i18next si disponible dans le projet
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
    },
    aria: {
      profileCard: 'Carte de profil de {name}',
      onlineStatus: 'Statut en ligne : {status}',
      rating: 'Note de {rating} sur 5',
      viewProfileAction: 'Voir le profil de {name}'
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
    },
    aria: {
      profileCard: '{name}\'s profile card',
      onlineStatus: 'Online status: {status}',
      rating: 'Rating {rating} out of 5',
      viewProfileAction: 'View {name}\'s profile'
    }
  }
} as const;

// Icônes métiers avec couleurs optimisées pour le contraste
const PROFESSION_ICONS: Record<string, { icon: string; bgColor: string; textColor: string }> = {
  'lawyer': { 
    icon: '⚖️', 
    bgColor: 'bg-slate-100', 
    textColor: 'text-slate-800' // Contraste amélioré
  },
  'expat': { 
    icon: '🌍', 
    bgColor: 'bg-blue-100', 
    textColor: 'text-blue-800' 
  },
  'accountant': { 
    icon: '🧮', 
    bgColor: 'bg-green-100', 
    textColor: 'text-green-800' 
  },
  'notary': { 
    icon: '📜', 
    bgColor: 'bg-amber-100', 
    textColor: 'text-amber-800' 
  },
  'tax_consultant': { 
    icon: '💰', 
    bgColor: 'bg-yellow-100', 
    textColor: 'text-yellow-800' 
  },
  'real_estate': { 
    icon: '🏠', 
    bgColor: 'bg-orange-100', 
    textColor: 'text-orange-800' 
  },
  'translator': { 
    icon: '📝', 
    bgColor: 'bg-purple-100', 
    textColor: 'text-purple-800' 
  },
  'hr_consultant': { 
    icon: '👥', 
    bgColor: 'bg-pink-100', 
    textColor: 'text-pink-800' 
  },
  'financial_advisor': { 
    icon: '📊', 
    bgColor: 'bg-indigo-100', 
    textColor: 'text-indigo-800' 
  },
  'insurance_broker': { 
    icon: '🛡️', 
    bgColor: 'bg-cyan-100', 
    textColor: 'text-cyan-800' 
  }
};

// Détection langue navigateur avec fallback
const getBrowserLanguage = (): 'fr' | 'en' => {
  if (typeof window === 'undefined') return 'fr';
  
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('fr') ? 'fr' : 'en';
};

// TODO: ajouter LanguageSwitcher (FR/EN) qui force i18n.language et persiste en localStorage
const getLanguage = (userLanguage?: string): 'fr' | 'en' => {
  if (userLanguage) return userLanguage as 'fr' | 'en';
  
  // TODO: vérifier si localStorage.getItem('language') existe dans le projet
  return getBrowserLanguage();
};

// Fonction de traduction avec interpolation pour ARIA
const t = (lang: 'fr' | 'en', key: string, subKey?: string, interpolations?: Record<string, string>): string => {
  const translation = TRANSLATIONS[lang] as Record<string, Record<string, string> | string>;
  let text: string;
  
  if (subKey) {
    const section = translation[key];
    if (typeof section === 'object' && section !== null) {
      text = section[subKey] || key;
    } else {
      text = key;
    }
  } else {
    const value = translation[key];
    text = typeof value === 'string' ? value : key;
  }
  
  // Interpolation pour ARIA labels
  if (interpolations) {
    Object.entries(interpolations).forEach(([placeholder, value]) => {
      text = text.replace(`{${placeholder}}`, value);
    });
  }
  
  return text;
};

// Fonctions utilitaires mémoïsées
const getProfessionInfo = (type: string) => {
  return PROFESSION_ICONS[type] || PROFESSION_ICONS['expat'];
};

const getLanguageLabel = (language: string): string => {
  return LANGUAGE_MAP[language] || language;
};

const getCountryFlag = (country: string): string => {
  return FLAG_MAP[country] || '🌍';
};

// Hook pour les couleurs de statut (mémoïsé)
const useStatusColors = (isOnline: boolean) => {
  return useMemo(() => 
    isOnline ? {
      border: 'border-green-300',
      shadow: 'shadow-green-100',
      glow: 'shadow-green-200/50',
      borderShadow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]',
      badge: 'bg-green-100 text-green-800 border-green-300',
      button: 'bg-green-700 hover:bg-green-800 active:bg-green-900 border-green-700',
      accent: 'text-green-700'
    } : {
      border: 'border-red-300', // Couleur adoucie
      shadow: 'shadow-red-100',
      glow: 'shadow-red-200/50',
      borderShadow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]',
      badge: 'bg-red-100 text-red-800 border-red-300',
      button: 'bg-red-700 hover:bg-red-800 active:bg-red-900 border-red-700',
      accent: 'text-red-700'
    }, [isOnline]
  );
};

// Composant ModernProfileCard - Version Production
const ModernProfileCard: React.FC<ModernProfileCardProps> = React.memo(({ 
  provider, 
  onProfileClick, 
  // isUserConnected, // Paramètre gardé pour compatibilité API
  index = 0,
  language 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Langue utilisée avec détection navigateur
  const currentLang = useMemo(() => getLanguage(language), [language]);
  
  // Couleurs de statut mémoïsées
  const statusColors = useStatusColors(provider.isOnline);
  
  // Info profession mémoïsée
  const professionInfo = useMemo(() => getProfessionInfo(provider.type), [provider.type]);
  
  // Gestion erreur image optimisée
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_AVATAR && !imageError) {
      setImageError(true);
      target.src = DEFAULT_AVATAR;
    }
  }, [imageError]);

  // Gestion du clic optimisée
  const handleClick = useCallback(() => {
    onProfileClick(provider);
  }, [provider, onProfileClick]);

  // Gestion hover optimisée pour mobile
  const handleMouseEnter = useCallback(() => {
    // Éviter les effets hover sur tactile
    if (window.matchMedia('(hover: hover)').matches) {
      setIsHovered(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Formatage des langues optimisé
  const formattedLanguages = useMemo(() => {
    const mappedLanguages = provider.languages.map(lang => getLanguageLabel(lang));
    if (mappedLanguages.length <= 3) {
      return mappedLanguages.join(' • ');
    }
    return `${mappedLanguages.slice(0, 2).join(' • ')} +${mappedLanguages.length - 2} ${t(currentLang, 'labels', 'others')}`;
  }, [provider.languages, currentLang]);

  // Formatage des spécialités optimisé
  const formattedSpecialties = useMemo(() => {
    if (!provider.specialties?.length) return null;
    
    if (provider.specialties.length <= 2) {
      return provider.specialties.join(' • ');
    }
    return `${provider.specialties.slice(0, 2).join(' • ')} +${provider.specialties.length - 2}`;
  }, [provider.specialties]);

  // ARIA labels
  const ariaLabels = useMemo(() => ({
    card: t(currentLang, 'aria', 'profileCard', { name: provider.name }),
    status: t(currentLang, 'aria', 'onlineStatus', { 
      status: provider.isOnline ? t(currentLang, 'labels', 'online') : t(currentLang, 'labels', 'offline')
    }),
    rating: t(currentLang, 'aria', 'rating', { rating: provider.rating.toFixed(1) }),
    viewProfile: t(currentLang, 'aria', 'viewProfileAction', { name: provider.name })
  }), [currentLang, provider.name, provider.isOnline, provider.rating]);

  return (
    <div className="flex-shrink-0 p-2 sm:p-4">
      <article
        ref={cardRef}
        className={`
          relative bg-white rounded-2xl overflow-hidden cursor-pointer
          transition-all duration-300 ease-out border-2 shadow-lg
          w-80 h-[520px] sm:w-80 md:w-80
          ${statusColors.border} ${statusColors.shadow} ${statusColors.borderShadow}
          ${isHovered ? `scale-[1.02] ${statusColors.glow} shadow-xl` : ''}
          focus:outline-none focus:ring-4 focus:ring-blue-500/50
          hover:shadow-xl
        `}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={ariaLabels.card}
        style={{
          animationDelay: `${index * 100}ms`,
          // TODO: content-visibility: auto sur ce conteneur pour de meilleures performances
        }}
      >
        
        {/* Header avec photo et statut - Dimensions explicites pour éviter layout shift */}
        <div 
          className="relative overflow-hidden bg-slate-100"
          style={{ height: `${CARD_DIMENSIONS.imageHeight}px` }}
        >
          <img
            src={provider.avatar || provider.profilePhoto || DEFAULT_AVATAR}
            alt={`Photo de profil de ${provider.name}`}
            className={`
              w-full h-full object-cover transition-all duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              ${isHovered ? 'scale-105' : ''}
            `}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
            width={CARD_DIMENSIONS.width}
            height={CARD_DIMENSIONS.imageHeight}
          />
          
          {/* Overlay gradient amélioré */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Statut en ligne - Taille tactile optimisée */}
          <div className="absolute top-3 left-3">
            <div 
              className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium
                backdrop-blur-sm border shadow-sm transition-colors
                ${statusColors.badge}
                min-h-[${TOUCH_TARGETS.badge}px]
              `}
              aria-label={ariaLabels.status}
            >
              {provider.isOnline ? (
                <Wifi className="w-4 h-4" aria-hidden="true" />
              ) : (
                <WifiOff className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{provider.isOnline ? t(currentLang, 'labels', 'online') : t(currentLang, 'labels', 'offline')}</span>
            </div>
          </div>
          
          {/* Badge métier avec contraste amélioré */}
          <div className="absolute top-3 right-3">
            <div className={`
              inline-flex items-center gap-2 px-3 py-2 rounded-full 
              backdrop-blur-sm border shadow-sm border-white/30
              ${professionInfo.bgColor} ${professionInfo.textColor}
              min-h-[${TOUCH_TARGETS.badge}px]
            `}>
              <span className="text-sm font-medium">
                <span aria-hidden="true">{professionInfo.icon}</span> {t(currentLang, 'professions', provider.type)}
              </span>
            </div>
          </div>
          
          {/* Note avec accessibilité améliorée */}
          <div className="absolute bottom-3 right-3">
            <div 
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm"
              aria-label={ariaLabels.rating}
            >
              <Star className="w-4 h-4 text-amber-500 fill-current" aria-hidden="true" />
              <span className="text-slate-800 text-sm font-medium">{provider.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        {/* Contenu principal - Hauteur fixe pour éviter layout shift */}
        <div 
          className="p-3 flex flex-col"
          style={{ height: `${CARD_DIMENSIONS.contentHeight}px` }}
        >
          
          {/* Nom et expérience */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-800 truncate flex-1">
                {provider.name}
              </h3>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 border border-teal-200 flex-shrink-0">
                <Zap className="w-3 h-3 text-teal-600" aria-hidden="true" />
                <span className="text-teal-600 text-xs font-medium">
                  {provider.yearsOfExperience} {t(currentLang, 'labels', 'years')}
                </span>
              </div>
            </div>
            
            {/* Nationalité avec drapeau */}
            {provider.nationality && (
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  {getCountryFlag(provider.country) || getCountryFlag(provider.nationality)}
                </span>
                <span className="text-slate-600 text-xs font-medium">{provider.nationality}</span>
              </div>
            )}
          </div>

          {/* Informations organisées - Hauteur fixe avec overflow */}
          <div className="space-y-2 h-28 overflow-hidden">
            
            {/* Pays */}
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{getCountryFlag(provider.country)}</span>
              <span className="text-blue-600 text-xs font-medium truncate">{provider.country}</span>
            </div>
            
            {/* Langues */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-indigo-600" aria-hidden="true" />
                <span className="text-slate-800 font-semibold text-xs">{t(currentLang, 'labels', 'languages')}</span>
              </div>
              <div className="pl-5">
                <span className="text-indigo-600 text-xs">{formattedLanguages}</span>
              </div>
            </div>
            
            {/* Spécialités */}
            {formattedSpecialties && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-purple-600" aria-hidden="true" />
                  <span className="text-slate-800 font-semibold text-xs">{t(currentLang, 'labels', 'specialties')}</span>
                </div>
                <div className="pl-5">
                  <span className="text-purple-600 text-xs">{formattedSpecialties}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-auto">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-600" aria-hidden="true" />
              <span className="text-amber-600 text-xs font-medium">
                {provider.reviewCount} {t(currentLang, 'labels', 'reviews')}
              </span>
            </div>
            <div className="text-slate-500 text-xs">
              {t(currentLang, 'professions', provider.type)}
            </div>
          </div>
          
          {/* Bouton CTA - Taille tactile optimisée */}
          <div className="mt-3">
            <button 
              className={`
                w-full rounded-lg font-bold text-sm text-white
                transition-all duration-300 flex items-center justify-center gap-2
                border-2 shadow-lg relative overflow-hidden
                ${statusColors.button}
                hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]
                focus:outline-none focus:ring-4 focus:ring-blue-500/50
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              style={{ 
                minHeight: `${TOUCH_TARGETS.button}px`,
                padding: '12px 16px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              type="button"
              aria-label={ariaLabels.viewProfile}
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span className="font-bold">{t(currentLang, 'labels', 'viewProfile')}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>

      {/* Styles optimisés avec prefers-reduced-motion */}
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
          
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Optimisation focus pour navigation clavier */
        article:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
});

ModernProfileCard.displayName = 'ModernProfileCard';

export default ModernProfileCard;
export type { Provider, ModernProfileCardProps };