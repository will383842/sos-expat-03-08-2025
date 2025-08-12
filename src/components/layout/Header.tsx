import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Shield, ChevronDown, Globe, User, UserPlus, Wifi, WifiOff, Download, Home, Users, MessageCircle, Zap, DollarSign, Settings, LogOut, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AvailabilityToggleButton from '../dashboard/AvailabilityToggle';

// Types globaux pour Analytics
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Interfaces TypeScript
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
  color: string;
  bgColor: string;
}

interface UserAvatarProps {
  user: User | null;
  size?: 'sm' | 'md' | 'lg';
}

interface LanguageDropdownProps {
  isMobile?: boolean;
}

interface UserMenuProps {
  isMobile?: boolean;
}

// Composants de drapeaux optimisés 2025
const FrenchFlag = memo(() => (
  <div className="relative p-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg ring-1 ring-white/20 hover:scale-110 transition-transform duration-300">
    <div className="w-7 h-5 rounded-lg overflow-hidden shadow-sm flex">
      <div className="w-1/3 h-full bg-gradient-to-b from-blue-600 to-blue-700" />
      <div className="w-1/3 h-full bg-gradient-to-b from-white to-gray-50" />
      <div className="w-1/3 h-full bg-gradient-to-b from-red-600 to-red-700" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/10 rounded-xl pointer-events-none" />
  </div>
));

const BritishFlag = memo(() => (
  <div className="relative p-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg ring-1 ring-white/20 hover:scale-110 transition-transform duration-300">
    <div className="w-7 h-5 rounded-lg overflow-hidden shadow-sm relative bg-gradient-to-b from-blue-800 to-blue-900">
      <div className="absolute inset-0">
        <div className="absolute w-full h-0.5 bg-white transform rotate-45 origin-center top-1/2 left-0" />
        <div className="absolute w-full h-0.5 bg-white transform -rotate-45 origin-center top-1/2 left-0" />
      </div>
      <div className="absolute inset-0">
        <div className="absolute w-full h-px bg-red-600 transform rotate-45 origin-center" style={{ top: 'calc(50% - 1px)' }} />
        <div className="absolute w-full h-px bg-red-600 transform -rotate-45 origin-center" style={{ top: 'calc(50% + 1px)' }} />
      </div>
      <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white transform -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white transform -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-red-600 transform -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-px bg-red-600 transform -translate-y-1/2" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/10 rounded-xl pointer-events-none" />
  </div>
));

// Configuration des langues
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: <FrenchFlag /> },
  { code: 'en', name: 'English', nativeName: 'English', flag: <BritishFlag /> }
];

// Navigation items selon votre structure existante
const LEFT_NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/', labelKey: 'nav.home', icon: '🏠', color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100' },
  { path: '/sos-appel', labelKey: 'nav.viewProfiles', icon: '👥', color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100' },
  { path: '/testimonials', labelKey: 'nav.testimonials', icon: '💬', color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100' },
];

const RIGHT_NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/how-it-works', labelKey: 'nav.howItWorks', icon: '⚡', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  { path: '/pricing', labelKey: 'nav.pricing', icon: '💎', color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100' },
];

const ALL_NAVIGATION_ITEMS: NavigationItem[] = [...LEFT_NAVIGATION_ITEMS, ...RIGHT_NAVIGATION_ITEMS];

// Hook scroll optimisé
const useScrolled = (): boolean => {
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = (): void => {
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

// PWA Install Button moderne
// Header Availability Toggle utilisant votre composant existant
const HeaderAvailabilityToggle = memo(() => {
  const { user } = useAuth();
  
  const isProvider = user?.role === 'lawyer' || user?.role === 'expat' || user?.type === 'lawyer' || user?.type === 'expat';
  
  if (!isProvider) return null;
  
  // Utilise votre composant existant mais avec un style compact pour le header
  return (
    <div className="scale-90">
      <AvailabilityToggleButton />
    </div>
  );
});

// User Avatar selon votre style
const UserAvatar = memo<UserAvatarProps>(({ user, size = 'md' }) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';

  const photoUrl = user?.profilePhoto || user?.photoURL;
  const displayName = user?.firstName || user?.displayName || user?.email || 'User';

  const handleImageError = useCallback((): void => {
    setImageError(true);
  }, []);

  if (!photoUrl || imageError) {
    return (
      <div 
        className={`${sizeClasses} rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/30 hover:ring-white/60 transition-all duration-300 hover:scale-110`}
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
        className={`${sizeClasses} rounded-2xl object-cover ring-2 ring-white/30 hover:ring-white/60 transition-all duration-300 hover:scale-110`}
        onError={handleImageError}
        loading="lazy"
      />
      {user?.isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </div>
  );
});

// Language Dropdown selon votre structure
const LanguageDropdown = memo<LanguageDropdownProps>(({ isMobile = false }) => {
  const { language, setLanguage } = useApp();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = useCallback((langCode: 'fr' | 'en'): void => {
    setLanguage(langCode);
    setIsLanguageMenuOpen(false);
    
    if (window.gtag) {
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

// User Menu selon votre structure
const UserMenu = memo<UserMenuProps>(({ isMobile = false }) => {
  const { user, logout } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      navigate('/');
      
      if (window.gtag) {
        window.gtag('event', 'logout', {
          event_category: 'engagement',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

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
            ? "group flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-2xl hover:scale-105 transition-all duration-300 font-bold shadow-xl active:scale-95 touch-manipulation"
            : "group relative p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
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
            ? "group flex items-center justify-center w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-4 rounded-2xl hover:scale-105 transition-all duration-300 font-bold shadow-xl active:scale-95 touch-manipulation"
            : "group relative p-3 rounded-2xl bg-white hover:bg-gray-50 hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
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

// Notification Badge
const NotificationBadge = memo(() => {
  const [notifications] = useState<number>(3);
  
  return (
    <button className="relative p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 group hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 touch-manipulation">
      <Bell className="w-5 h-5 text-white group-hover:text-yellow-200 transition-colors duration-300 group-hover:animate-pulse" />
      {notifications > 0 && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
          {notifications > 9 ? '9+' : notifications}
        </div>
      )}
    </button>
  );
});

// Composant principal Header
const Header: React.FC = () => {
  const location = useLocation();
  const { isLoading } = useAuth();
  const { language } = useApp();
  const scrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const isActive = useCallback((path: string): boolean => location.pathname === path, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

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
            : 'bg-white border-b border-gray-100'
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
                    <h1 className={`font-bold text-xl ${scrolled ? 'text-white' : 'text-gray-900'} m-0`}>SOS Expats</h1>
                    <p className={`text-xs ${scrolled ? 'text-white/80' : 'text-gray-600'} font-medium m-0`}>
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
                          ? (scrolled ? 'text-white' : item.color)
                          : (scrolled ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-gray-900')
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
                        <div className="mt-1 w-1.5 h-1.5 bg-current rounded-full animate-pulse" aria-hidden="true" />
                      )}
                    </Link>
                  ))}
                </div>

                {/* Bouton SOS - Principal CTA centré */}
                <div className="mx-12">
                  <Link 
                    to="/sos-appel" 
                    className="group relative overflow-hidden bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-white/50 whitespace-nowrap shadow-xl"
                    aria-label={t.sosCall}
                  >
                    <div className="relative z-10 flex items-center space-x-3">
                      <Phone className="w-6 h-6 group-hover:animate-pulse transition-transform duration-300" />
                      <span className="font-black">{t.sosCall}</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                    <div className="absolute -inset-2 bg-gradient-to-r from-red-500 to-red-700 opacity-30 blur-xl group-hover:opacity-60 transition-opacity duration-300 rounded-2xl" />
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
                          ? (scrolled ? 'text-white' : item.color)
                          : (scrolled ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-gray-900')
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
                        <div className="mt-1 w-1.5 h-1.5 bg-current rounded-full animate-pulse" aria-hidden="true" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Actions Desktop */}
              <div className="flex-shrink-0 flex items-center space-x-4">
                <HeaderAvailabilityToggle /> <NotificationBadge />
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
                <h1 className={`font-bold text-lg ${scrolled ? 'text-white' : 'text-gray-900'} m-0`}>SOS Expats</h1>
                <p className={`text-xs ${scrolled ? 'text-white/80' : 'text-gray-600'} m-0`}>{t.mobileTagline}</p>
              </div>
            </Link>

            <div className="flex items-center space-x-3">
              <Link 
                to="/sos-appel" 
                className="group bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 text-sm flex items-center space-x-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={t.sosCall}
              >
                <Phone className="w-4 h-4 group-hover:animate-pulse transition-transform duration-300" />
                <span>SOS</span>
              </Link>
              <HeaderAvailabilityToggle /> <NotificationBadge />
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className={`p-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation ${
                  scrolled ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-gray-100'
                }`}
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
            <div className={`px-6 py-6 shadow-lg border-t ${scrolled ? 'bg-red-700 border-red-500' : 'bg-white border-gray-100'}`} role="navigation" aria-label="Navigation mobile">
              <nav className="flex flex-col space-y-4">
                {ALL_NAVIGATION_ITEMS.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={`text-lg font-semibold transition-colors px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[48px] flex items-center touch-manipulation ${
                      isActive(item.path) 
                        ? (scrolled ? 'text-white bg-white/20 font-bold' : `${item.color} ${item.bgColor} font-bold`)
                        : (scrolled ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50')
                    }`} 
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="mr-3 text-xl" role="img" aria-hidden="true">{item.icon}</span>
                    {getNavigationLabel(item.labelKey)}
                  </Link>
                ))}
                
                <div className={`pt-6 border-t ${scrolled ? 'border-red-500' : 'border-gray-200'} space-y-6`}>
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

      {/* PWA Install Banner - Sticky bottom */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-sm z-40">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">📱 {language === 'fr' ? 'Installer SOS Expats' : 'Install SOS Expats'}</h4>
              <p className="text-xs opacity-90">
                {language === 'fr' ? 'Accès rapide & notifications push' : 'Quick access & push notifications'}
              </p>
            </div>
            <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95">
              {language === 'fr' ? 'Installer' : 'Install'}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-24 right-4 z-30 space-y-3">
        <Link 
          to="/sos-appel?urgent=true"
          className="group w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-red-500/50"
        >
          <Phone className="w-7 h-7 group-hover:animate-pulse" />
        </Link>
        
        <button className="group w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-500/50">
          <MessageCircle className="w-6 h-6" />
        </button>
        
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-gray-500/50"
        >
          <ChevronDown className="w-5 h-5 rotate-180" />
        </button>
      </div>

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

      {/* Progressive Web App Enhancement Script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Service Worker Registration
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    console.log('SW registered: ', registration);
                  })
                  .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
            
            // PWA Install Prompt Enhancement
            let deferredPrompt;
            deferredPrompt = e;
            });
            
            // Performance monitoring
            window.addEventListener('load', () => {
              if ('PerformanceObserver' in window) {
                new PerformanceObserver((entryList) => {
                  for (const entry of entryList.getEntries()) {
                    console.log('LCP:', entry.startTime);
                  }
                }).observe({entryTypes: ['largest-contentful-paint']});
              }
            });
            
            // Network status monitoring
            window.addEventListener('online', () => {
              console.log('App is online');
            });
            
            window.addEventListener('offline', () => {
              console.log('App is offline');
            });
          `
        }}
      />
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

NotificationBadge.displayName = 'NotificationBadge';

export default memo(Header);