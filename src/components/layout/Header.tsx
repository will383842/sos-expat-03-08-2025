import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Settings, Phone, Shield, ChevronDown, Globe, User, UserPlus, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AvailabilityToggleButton from '../dashboard/AvailabilityToggle';

// Types pour les analytics Google
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Composants de drapeaux optimisés (déclarés en premier)
const FrenchFlag = memo(() => (
  <div 
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-label="Drapeau français"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex">
      <div className="w-1/3 h-full bg-blue-600" />
      <div className="w-1/3 h-full bg-white" />
      <div className="w-1/3 h-full bg-red-600" />
    </div>
    {/* Effet de brillance */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg pointer-events-none" />
  </div>
));

const BritishFlag = memo(() => (
  <div 
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-label="Drapeau britannique"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm relative bg-blue-800">
      {/* Croix de Saint-André (Écosse) - diagonales blanches */}
      <div className="absolute inset-0">
        <div className="absolute w-full h-0.5 bg-white transform rotate-45 origin-center top-1/2 left-0" style={{ transformOrigin: 'center' }} />
        <div className="absolute w-full h-0.5 bg-white transform -rotate-45 origin-center top-1/2 left-0" style={{ transformOrigin: 'center' }} />
      </div>
      
      {/* Croix de Saint-Patrick (Irlande) - diagonales rouges décalées */}
      <div className="absolute inset-0">
        <div className="absolute w-full h-px bg-red-600 transform rotate-45 origin-center" style={{ top: 'calc(50% - 1px)', transformOrigin: 'center' }} />
        <div className="absolute w-full h-px bg-red-600 transform -rotate-45 origin-center" style={{ top: 'calc(50% + 1px)', transformOrigin: 'center' }} />
      </div>
      
      {/* Croix de Saint-Georges (Angleterre) - croix centrale rouge */}
      <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white transform -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white transform -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-red-600 transform -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-px bg-red-600 transform -translate-y-1/2" />
    </div>
    {/* Effet de brillance */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg pointer-events-none" />
  </div>
));

// Types pour TypeScript et i18n
interface Language {
  code: 'fr' | 'en';
  name: string;
  nativeName: string;
  flag: React.ReactNode;
}

interface NavigationItem {
  path: string;
  labelKey: string;
  icon: string;
}

interface User {
  uid?: string;
  id?: string;
  email?: string;
  firstName?: string;
  displayName?: string;
  profilePhoto?: string;
  photoURL?: string;
  role?: string;
  type?: string;
  isOnline?: boolean;
}

// Configuration des langues pour i18n
const SUPPORTED_LANGUAGES: Language[] = [
  { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français',
    flag: <FrenchFlag />
  },
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: <BritishFlag />
  },
];

// Configuration de navigation pour i18n avec emojis modernes
const LEFT_NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/', labelKey: 'nav.home', icon: '🏡' },
  { path: '/sos-appel', labelKey: 'nav.viewProfiles', icon: '🤝' },
  { path: '/testimonials', labelKey: 'nav.testimonials', icon: '💎' },
];

const RIGHT_NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/how-it-works', labelKey: 'nav.howItWorks', icon: '🚀' },
  { path: '/pricing', labelKey: 'nav.pricing', icon: '⚡' },
];

const ALL_NAVIGATION_ITEMS = [...LEFT_NAVIGATION_ITEMS, ...RIGHT_NAVIGATION_ITEMS];

// Hook pour la gestion du scroll
const useScrolled = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrolled;
};

// Composant pour le statut en ligne/hors ligne intégré au header
const HeaderAvailabilityToggle = memo(() => {
  const { user } = useAuth();
  const { language } = useApp();
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Vérifier si l'utilisateur est un prestataire
  const isProvider = user?.role === 'lawyer' || user?.role === 'expat' || user?.type === 'lawyer' || user?.type === 'expat';

  // Synchroniser avec les changements de l'utilisateur
  useEffect(() => {
    setIsOnline(user?.isOnline ?? false);
  }, [user?.isOnline]);

  const toggleOnlineStatus = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.uid && !user?.id || isUpdating) return;
    
    setIsUpdating(true);
    const newStatus = !isOnline;

    try {
      const userId = user.uid || user.id;
      
      // Met à jour le profil dans 'users'
      await updateDoc(doc(db, 'users', userId), {
        isOnline: newStatus,
        lastSeen: new Date(),
      });

      // Met aussi à jour 'sos_profiles' (pour l'affichage public)
      await updateDoc(doc(db, 'sos_profiles', userId), {
        isOnline: newStatus,
        lastSeen: new Date(),
      });

      // Met à jour l'état seulement après succès
      setIsOnline(newStatus);

      // Analytics pour le changement de statut
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'online_status_change', {
          event_category: 'engagement',
          event_label: newStatus ? 'online' : 'offline',
        });
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut :', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isProvider) return null;

  const t = {
    online: language === 'fr' ? 'En ligne' : 'Online',
    offline: language === 'fr' ? 'Hors ligne' : 'Offline',
  };

  return (
    <button
      onClick={toggleOnlineStatus}
      disabled={isUpdating}
      type="button"
      className={`group flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] touch-manipulation ${
        isOnline 
          ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg' 
          : 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg'
      } ${isUpdating ? 'opacity-75 cursor-not-allowed' : ''}`}
      style={{ 
        border: '2px solid white',
        boxSizing: 'border-box'
      }}
      aria-label={`Changer le statut vers ${isOnline ? t.offline : t.online}`}
    >
      {isUpdating ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : (
        <>
          {isOnline ? (
            <Wifi className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <WifiOff className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
          )}
        </>
      )}
      <span>{isOnline ? `🟢 ${t.online}` : `⚫ ${t.offline}`}</span>
    </button>
  );
});

const UserAvatar = memo<{ user: User | null; size?: 'sm' | 'md' }>(({ user, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';

  const photoUrl = user?.profilePhoto || user?.photoURL;
  const displayName = user?.firstName || user?.displayName || user?.email || 'User';

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (!photoUrl || imageError) {
    return (
      <div 
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/30 hover:ring-white/60 transition-all duration-300`}
        aria-label={`Avatar de ${displayName}`}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={photoUrl}
        alt={`Avatar de ${displayName}`}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-white/30 hover:ring-white/60 transition-all duration-300`}
        onError={handleImageError}
        loading="lazy"
      />
      <div 
        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
        aria-label="En ligne"
      />
    </div>
  );
});

// Composant Dropdown Langue
const LanguageDropdown = memo<{ isMobile?: boolean }>(({ isMobile = false }) => {
  const { language, setLanguage } = useApp();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language) || SUPPORTED_LANGUAGES[0];

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = useCallback((langCode: 'fr' | 'en') => {
    setLanguage(langCode);
    setIsLanguageMenuOpen(false);
    
    // Analytics pour le changement de langue
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'language_change', {
        event_category: 'engagement',
        event_label: langCode,
      });
    }
  }, [setLanguage]);

  if (isMobile) {
    return (
      <div className="mb-6">
        <div className="flex items-center text-sm font-semibold text-white/90 mb-3">
          <Globe className="w-4 h-4 mr-2" />
          {language === 'fr' ? 'Langue' : 'Language'}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`group relative overflow-hidden px-6 py-4 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                language === lang.code 
                  ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white shadow-xl scale-105' 
                  : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/20'
              }`}
              aria-label={`Changer la langue vers ${lang.nativeName}`}
              aria-pressed={language === lang.code}
            >
              <div className="relative z-10 flex items-center justify-center">
                <div className="mr-3 group-hover:scale-110 transition-transform duration-300">
                  {lang.flag}
                </div>
                <span className="font-bold text-sm">{lang.nativeName}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={languageMenuRef}>
      <button
        onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
        className="group flex items-center space-x-2 text-white text-sm font-medium hover:text-yellow-200 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-3 min-h-[44px] min-w-[44px] justify-center touch-manipulation"
        aria-expanded={isLanguageMenuOpen}
        aria-haspopup="true"
        aria-label="Sélectionner la langue"
      >
        <div className="group-hover:scale-110 transition-transform duration-300">
          {currentLanguage.flag}
        </div>
        <ChevronDown className={`w-4 h-4 transition-all duration-300 ${isLanguageMenuOpen ? 'rotate-180 text-yellow-300' : ''}`} />
      </button>
      
      {isLanguageMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-50 border border-gray-100 animate-in slide-in-from-top-2 duration-300">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`group flex items-center w-full px-4 py-3 text-sm text-left hover:bg-gray-50 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-gray-50 ${
                language === lang.code ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700'
              }`}
              aria-pressed={language === lang.code}
            >
              <div className="mr-3 group-hover:scale-110 transition-transform duration-300">
                {lang.flag}
              </div>
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-label="Langue actuelle" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// Composant Menu Utilisateur
const UserMenu = memo<{ isMobile?: boolean }>(({ isMobile = false }) => {
  const { user, logout } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      navigate('/');
      
      // Analytics pour la déconnexion
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'logout', {
          event_category: 'engagement',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

  // Traductions pour i18n
  const t = {
    login: language === 'fr' ? 'Connexion' : 'Login',
    signup: language === 'fr' ? "S'inscrire" : 'Sign up',
    dashboard: language === 'fr' ? 'Tableau de bord' : 'Dashboard',
    adminConsole: language === 'fr' ? 'Console Admin' : 'Admin Console',
    logout: language === 'fr' ? 'Déconnexion' : 'Logout',
  };

  if (!user) {
    const authLinks = (
      <>
        <Link 
          to="/login" 
          className={isMobile 
            ? "group flex items-center justify-center w-full bg-white/15 backdrop-blur-xl text-white px-6 py-4 rounded-2xl hover:bg-white/25 hover:scale-105 transition-all duration-300 font-semibold border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[48px] touch-manipulation"
            : "group relative p-3 rounded-full hover:bg-white/10 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          }
          aria-label={t.login}
        >
          {isMobile ? (
            <>
              <User className="w-5 h-5 mr-3" />
              <span>{t.login}</span>
            </>
          ) : (
            <User className="w-5 h-5 text-white group-hover:text-yellow-200 transition-colors duration-300" />
          )}
        </Link>
        <Link 
          to="/register" 
          className={isMobile
            ? "group flex items-center justify-center w-full bg-gradient-to-r from-white via-gray-50 to-white text-red-600 px-6 py-4 rounded-2xl hover:scale-105 transition-all duration-300 font-bold shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[48px] touch-manipulation"
            : "group relative p-3 rounded-full bg-white hover:bg-gray-50 hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          }
          aria-label={t.signup}
        >
          {isMobile ? (
            <>
              <UserPlus className="w-5 h-5 mr-3" />
              <span>{t.signup}</span>
            </>
          ) : (
            <UserPlus className="w-5 h-5 text-red-600 group-hover:text-red-700 transition-colors duration-300" />
          )}
        </Link>
      </>
    );

    return isMobile ? (
      <div className="space-y-4">{authLinks}</div>  
    ) : (
      <div className="flex items-center space-x-4">{authLinks}</div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl">
          <UserAvatar user={user} />
          <div>
            <div className="font-semibold text-white">
              {user.firstName || user.displayName || user.email}
            </div>
            <div className="text-xs text-white/70 capitalize">
              {user.role || 'Utilisateur'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {user.role === 'admin' && (
            <Link 
              to="/admin/dashboard" 
              className="flex items-center w-full bg-white/20 backdrop-blur-sm text-white px-4 py-3 rounded-xl hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={t.adminConsole}
            >
              <Shield className="w-5 h-5 mr-3" />
              <span className="font-medium">{t.adminConsole}</span>
            </Link>
          )}
          <Link 
            to="/dashboard" 
            className="flex items-center w-full bg-white/20 backdrop-blur-sm text-white px-4 py-4 rounded-xl hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[48px] touch-manipulation"
            aria-label={t.dashboard}
          >
            <Settings className="w-5 h-5 mr-3" />
            <span className="font-medium">{t.dashboard}</span>
          </Link>
          <button 
            onClick={handleLogout} 
            className="flex items-center w-full bg-red-500/80 text-white px-4 py-4 rounded-xl hover:bg-red-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400/50 min-h-[48px] touch-manipulation"
            aria-label={t.logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">{t.logout}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={userMenuRef}>
      <button 
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
        className="group flex items-center space-x-3 text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-2 min-h-[44px] touch-manipulation"
        aria-expanded={isUserMenuOpen}
        aria-haspopup="true"
        aria-label="Menu utilisateur"
      >
        <UserAvatar user={user} />
        <span className="text-sm font-medium hidden md:inline">{user.firstName || user.displayName || 'User'}</span>
        <ChevronDown className={`w-4 h-4 transition-all duration-300 ${isUserMenuOpen ? 'rotate-180 text-yellow-300' : ''}`} />
      </button>
      
      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-50 border border-gray-100 animate-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <UserAvatar user={user} />
              <div>
                <div className="font-semibold text-gray-900">{user.firstName || user.displayName || user.email}</div>
                <div className="text-xs text-gray-500 capitalize">{user.role || 'Utilisateur'}</div>
              </div>
            </div>
          </div>
          
          <div className="py-1">
            {user.role === 'admin' && (
              <Link 
                to="/admin/dashboard" 
                className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-red-50" 
                onClick={() => setIsUserMenuOpen(false)}
              >
                <Shield className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-300" />
                {t.adminConsole}
              </Link>
            )}
            <Link 
              to="/dashboard" 
              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-red-50" 
              onClick={() => setIsUserMenuOpen(false)}
            >
              <Settings className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-300" />
              {t.dashboard}
            </Link>
            <hr className="my-1 border-gray-100" />
            <button 
              onClick={handleLogout} 
              className="group flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-300" />
              {t.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// Composant principal Header
const Header: React.FC = () => {
  const location = useLocation();
  const { isLoading } = useAuth();
  const { language } = useApp();
  const scrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  // Fermeture du menu mobile lors du changement de route
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Traductions pour i18n
  const getNavigationLabel = useCallback((labelKey: string): string => {
    const translations: Record<string, Record<string, string>> = {
      'nav.home': { fr: 'Accueil', en: 'Home' },
      'nav.viewProfiles': { fr: 'Voir les profils aidants', en: 'View helper profiles' },
      'nav.testimonials': { fr: 'Les avis', en: 'Reviews' },
      'nav.howItWorks': { fr: 'Comment ça marche', en: 'How it Works' },
      'nav.pricing': { fr: 'Tarifs', en: 'Pricing' },
    };
    
    return translations[labelKey]?.[language] || labelKey;
  }, [language]);

  const t = {
    sosCall: language === 'fr' ? 'SOS Appel' : 'SOS Call',
    tagline: language === 'fr' ? 'pour expatriés & voyageurs' : 'for expats & travelers',
    mobileTagline: language === 'fr' ? 'expatriés' : 'expats',
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-red-600/95 backdrop-blur-xl shadow-xl' 
            : 'bg-gradient-to-r from-red-600 to-red-500'
        }`}
        role="banner"
      >
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="w-full px-4">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link 
                  to="/" 
                  className="group flex items-center focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-2"
                  aria-label="SOS Expats - Accueil"
                >
                  <div className="transform group-hover:scale-105 transition-all duration-300">
                    <h1 className="font-bold text-xl text-white m-0">SOS Expats</h1>
                    <p className="text-xs text-white/80 font-medium m-0">
                      {t.tagline}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Navigation complète avec bouton SOS au centre */}
              <div className="flex-1 flex items-center justify-center">
                {/* Navigation gauche */}
                <div className="flex items-center space-x-8">
                  {LEFT_NAVIGATION_ITEMS.map((item) => (
                    <Link 
                      key={item.path} 
                      to={item.path} 
                      className={`group flex flex-col items-center text-lg font-semibold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-2 min-w-max ${
                        isActive(item.path) 
                          ? 'text-white' 
                          : 'text-white/90 hover:text-white'
                      }`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      <span 
                        className="text-xl mb-1 group-hover:scale-110 transition-transform duration-300"
                        role="img"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm leading-tight text-center whitespace-nowrap">{getNavigationLabel(item.labelKey)}</span>
                      {isActive(item.path) && (
                        <div className="mt-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse" aria-hidden="true" />
                      )}
                    </Link>
                  ))}
                </div>

                {/* Bouton SOS - Principal CTA centré */}
                <div className="mx-12">
                  <Link 
                    to="/sos-appel" 
                    className="group relative overflow-hidden bg-white hover:bg-gray-50 text-red-600 px-8 py-2.5 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-white/50 border-2 border-white whitespace-nowrap"
                    aria-label={t.sosCall}
                  >
                    <div className="relative z-10 flex items-center space-x-2">
                      <Phone className="w-5 h-5 group-hover:rotate-6 transition-transform duration-300" />
                      <span>{t.sosCall}</span>
                    </div>
                  </Link>
                </div>

                {/* Navigation droite */}
                <div className="flex items-center space-x-8">
                  {RIGHT_NAVIGATION_ITEMS.map((item) => (
                    <Link 
                      key={item.path} 
                      to={item.path} 
                      className={`group flex flex-col items-center text-lg font-semibold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-2 min-w-max ${
                        isActive(item.path) 
                          ? 'text-white' 
                          : 'text-white/90 hover:text-white'
                      }`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      <span 
                        className="text-xl mb-1 group-hover:scale-110 transition-transform duration-300"
                        role="img"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm leading-tight text-center whitespace-nowrap">{getNavigationLabel(item.labelKey)}</span>
                      {isActive(item.path) && (
                        <div className="mt-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse" aria-hidden="true" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Actions Desktop */}
              <div className="flex-shrink-0 flex items-center space-x-4">
                {/* Bouton statut en ligne/hors ligne - Desktop */}
                <HeaderAvailabilityToggle />
                
                <LanguageDropdown />

                {isLoading ? (
                  <div 
                    className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    role="status"
                    aria-label="Chargement"
                  />
                ) : (
                  <UserMenu />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg p-1"
              aria-label="SOS Expats - Accueil"
            >
              <div className="flex flex-col">
                <h1 className="font-bold text-lg text-white m-0">SOS Expats</h1>
                <p className="text-xs text-white/80 m-0">{t.mobileTagline}</p>
              </div>
            </Link>

            <div className="flex items-center space-x-3">
              <Link 
                to="/sos-appel" 
                className="group bg-white hover:bg-gray-50 text-red-600 px-4 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 text-sm flex items-center space-x-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 border border-white"
                aria-label={t.sosCall}
              >
                <Phone className="w-4 h-4 group-hover:rotate-6 transition-transform duration-300" />
                <span>SOS</span>
              </Link>
              <HeaderAvailabilityToggle />
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-3 rounded-lg text-white hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-expanded={isMenuOpen}
                aria-label="Menu de navigation"
              >
                {isMenuOpen ? 
                  <X className="w-6 h-6" aria-hidden="true" /> : 
                  <Menu className="w-6 h-6" aria-hidden="true" />
                }
              </button>
            </div>
          </div>

          {/* Menu Mobile */}
          {isMenuOpen && (
            <div className="bg-red-700 px-6 py-6 shadow-lg border-t border-red-500" role="navigation" aria-label="Navigation mobile">
              <nav className="flex flex-col space-y-4">
                {ALL_NAVIGATION_ITEMS.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={`text-lg font-semibold transition-colors px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[48px] flex items-center touch-manipulation ${
                      isActive(item.path) 
                        ? 'text-white bg-white/20 font-bold' 
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`} 
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="mr-3 text-xl" role="img" aria-hidden="true">{item.icon}</span>
                    {getNavigationLabel(item.labelKey)}
                  </Link>
                ))}
                
                <div className="pt-6 border-t border-red-500 space-y-6">
                  <LanguageDropdown isMobile />
                  <UserMenu isMobile />
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Spacer pour compenser le header fixe */}
      <div className="h-20" aria-hidden="true" />

      {/* Structured Data pour SEO */}
      {typeof window !== 'undefined' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SOS Expats",
              "description": language === 'fr' 
                ? "Service d'assistance pour expatriés et voyageurs"
                : "Assistance service for expats and travelers",
              "url": window.location.origin,
              "logo": `${window.location.origin}/logo.png`,
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+33-XXX-XXX-XXX",
                "contactType": "customer service",
                "availableLanguage": ["French", "English"]
              },
              "sameAs": [
                "https://facebook.com/sosexpats",
                "https://twitter.com/sosexpats",
                "https://linkedin.com/company/sosexpats"
              ]
            })
          }}
        />
      )}

      {/* Préchargement des ressources critiques */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Meta tags dynamiques pour les réseaux sociaux */}
      {typeof window !== 'undefined' && (() => {
        // Open Graph
        const updateMetaTag = (property: string, content: string) => {
          let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
          }
          meta.content = content;
        };

        const currentPage = location.pathname;
        const baseTitle = 'SOS Expats';
        const baseDescription = language === 'fr' 
          ? 'Service d\'assistance immédiate pour expatriés et voyageurs. Connexion en moins de 5 minutes avec des experts vérifiés.'
          : 'Immediate assistance service for expats and travelers. Connect in less than 5 minutes with verified experts.';

        const currentNavItem = ALL_NAVIGATION_ITEMS.find(item => item.path === currentPage);
        const pageTitle = currentNavItem ? getNavigationLabel(currentNavItem.labelKey) : getNavigationLabel('nav.home');

        updateMetaTag('og:title', `${baseTitle} - ${pageTitle}`);
        updateMetaTag('og:description', baseDescription);
        updateMetaTag('og:url', window.location.href);
        updateMetaTag('og:type', 'website');
        updateMetaTag('og:locale', language === 'fr' ? 'fr_FR' : 'en_US');
        
        // Twitter Cards
        const updateTwitterMeta = (name: string, content: string) => {
          let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', name);
            document.head.appendChild(meta);
          }
          meta.content = content;
        };

        updateTwitterMeta('twitter:card', 'summary_large_image');
        updateTwitterMeta('twitter:title', `${baseTitle} - ${pageTitle}`);
        updateTwitterMeta('twitter:description', baseDescription);

        return null;
      })()}
    </>
  );
};

// Amélioration des performances avec React.memo
Header.displayName = 'Header';
FrenchFlag.displayName = 'FrenchFlag';
BritishFlag.displayName = 'BritishFlag';
UserAvatar.displayName = 'UserAvatar';
LanguageDropdown.displayName = 'LanguageDropdown';
UserMenu.displayName = 'UserMenu';
HeaderAvailabilityToggle.displayName = 'HeaderAvailabilityToggle';

export default memo(Header);