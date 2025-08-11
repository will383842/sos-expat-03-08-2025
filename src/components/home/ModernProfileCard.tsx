import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Star, MapPin, Globe, Users, Zap, Eye, ArrowRight, Sparkles } from 'lucide-react';

// Types
interface Provider {
  id: string;
  name: string;
  type: 'lawyer' | 'expat';
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
  getLanguageLabel: (lang: string) => string;
  isUserConnected: boolean;
  index?: number;
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

const DEFAULT_AVATAR = '/default-avatar.png';

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
  'Switzerland': '🇨🇭'
};

// Fonction utilitaire pour obtenir le label de langue
const getLanguageLabel = (language: string): string => {
  return LANGUAGE_MAP[language] || language;
};

// Composant ModernProfileCard - Production Ready & Clean
const ModernProfileCard: React.FC<ModernProfileCardProps> = React.memo(({ 
  provider, 
  onProfileClick, 
  getLanguageLabel, 
  isUserConnected, 
  index = 0 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLElement>(null);

  // Effet de suivie de souris
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_AVATAR) {
      target.src = DEFAULT_AVATAR;
    }
  }, []);

  const handleClick = useCallback(() => {
    onProfileClick(provider);
  }, [provider, onProfileClick]);

  // Couleurs épurées pour 2026
  const getThemeColors = () => {
    if (provider.type === 'lawyer') {
      return {
        primary: 'from-red-500 to-red-600',
        accent: 'text-red-300',
        badge: 'bg-red-500',
        glow: 'shadow-red-500/20'
      };
    } else {
      return {
        primary: 'from-emerald-500 to-emerald-600',
        accent: 'text-emerald-300',
        badge: 'bg-emerald-500',
        glow: 'shadow-emerald-500/20'
      };
    }
  };

  const colors = getThemeColors();

  return (
    <>
      <article
        ref={cardRef}
        className={`group relative w-80 h-[600px] overflow-hidden cursor-pointer transform transition-all duration-700 ease-out ${
          isHovered ? 'scale-105 rotate-1 z-30' : 'z-10'
        }`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        style={{
          animationDelay: `${index * 100}ms`,
          animation: `morphIn 1s cubic-bezier(0.165, 0.84, 0.44, 1) forwards`
        }}
      >
        {/* Halo subtil */}
        <div 
          className={`absolute -inset-2 bg-gradient-to-r ${colors.primary} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-700 rounded-3xl`}
        />

        {/* Carte principale - Design épuré */}
        <div className={`relative h-full rounded-3xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${colors.glow} shadow-xl transition-all duration-700`}>
          
          {/* Background simple */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.primary} opacity-90`} />
          
          {/* Image de profil avec masque */}
          <div className="relative h-[340px] overflow-hidden">
            <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full z-10">
              <defs>
                <clipPath id={`liquidMask-${provider.id}`}>
                  <path d="M0,0 L400,0 L400,150 Q200,180 0,150 Z" />
                </clipPath>
              </defs>
            </svg>

            <img
              src={provider.avatar || provider.profilePhoto || DEFAULT_AVATAR}
              alt={`Photo de ${provider.name}`}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ clipPath: `url(#liquidMask-${provider.id})` }}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              loading="lazy"
            />
            
            {/* Overlay simple */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* STATUT ULTRA VISIBLE - Top priorité */}
            <div className="absolute top-4 left-4 z-20">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full font-bold text-sm shadow-lg border-2 backdrop-blur-xl ${
                provider.isOnline 
                  ? 'bg-green-500/30 text-green-100 border-green-400/50 shadow-green-400/30' 
                  : 'bg-slate-600/30 text-slate-100 border-slate-500/50 shadow-slate-400/30'
              }`}>
                <span className={`w-3 h-3 rounded-full ${
                  provider.isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-400'
                } border border-white`} />
                <span className="uppercase tracking-wide text-xs font-black">
                  {provider.isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
                </span>
              </div>
            </div>
            
            {/* Type badge épuré */}
            <div className="absolute top-4 right-4 z-20">
              <div className={`px-3 py-2 rounded-full ${colors.badge} text-white text-sm font-bold shadow-lg backdrop-blur-xl border border-white/20`}>
                {provider.type === 'lawyer' ? '⚖️ Avocat' : '🌍 Expert'}
              </div>
            </div>
            
            {/* Rating simple */}
            <div className="absolute bottom-6 right-6 z-20">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-yellow-500/20 backdrop-blur-xl border border-yellow-400/30 shadow-lg">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-yellow-100 text-sm font-bold">{provider.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          {/* Contenu épuré */}
          <div className="relative z-10 p-6 space-y-4">
            
            {/* Nom */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white truncate group-hover:text-yellow-300 transition-colors duration-500">
                {provider.name}
              </h3>
              
              {/* Nationalité */}
              {provider.nationality && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{FLAG_MAP[provider.country] || '🌍'}</span>
                  <span className="text-white/90 text-sm">{provider.nationality}</span>
                </div>
              )}
            </div>
            
            {/* Pays */}
            <div className="flex items-center gap-2">
              <MapPin className={`w-4 h-4 ${colors.accent}`} />
              <span className="text-white text-sm">{provider.country}</span>
            </div>
            
            {/* Langues */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className={`w-4 h-4 ${colors.accent}`} />
                <span className="text-white font-semibold text-sm">Langues</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {provider.languages.slice(0, 3).map((lang, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-lg bg-white/15 text-white text-xs font-medium"
                  >
                    {getLanguageLabel(lang)}
                  </span>
                ))}
                {provider.languages.length > 3 && (
                  <span className="px-2 py-1 rounded-lg bg-white/10 text-white/70 text-xs">
                    +{provider.languages.length - 3}
                  </span>
                )}
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className={`w-4 h-4 ${colors.accent}`} />
                  <span className="text-white/90 text-sm">{provider.reviewCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className={`w-4 h-4 ${colors.accent}`} />
                  <span className="text-white/90 text-sm">{provider.yearsOfExperience}ans</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bouton d'action */}
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <button 
              className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-500 backdrop-blur-xl border flex items-center justify-center gap-2 bg-white/15 border-white/20 text-white hover:bg-white/25 hover:scale-105 hover:shadow-xl relative overflow-hidden group/btn"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              type="button"
            >
              <Eye className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" />
              <span>Voir le profil</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              
              {/* Effet subtil */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
            </button>
          </div>
          
          {/* Particules légères au hover */}
          {isHovered && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <Sparkles 
                  key={i}
                  className="absolute w-2 h-2 text-white/30 animate-pulse"
                  style={{
                    left: `${30 + (i * 20)}%`,
                    top: `${40 + (i * 10)}%`,
                    animationDelay: `${i * 300}ms`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </article>

      {/* Styles épurés */}
      <style>{`
        @keyframes morphIn {
          0% {
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .backdrop-blur-xl {
          backdrop-filter: blur(16px) saturate(150%);
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          article {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
});

ModernProfileCard.displayName = 'ModernProfileCard';

export default ModernProfileCard;
export type { Provider, ModernProfileCardProps };