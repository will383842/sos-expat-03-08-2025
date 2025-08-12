import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Phone, Shield, ChevronDown, Globe, User, UserPlus, 
  Wifi, WifiOff, Download, Home, Users, MessageCircle, Zap, 
  DollarSign, Settings, LogOut, Bell, Sparkles, Clock, Star, 
  MapPin, ArrowRight, Play, ChevronRight, Heart, Award, 
  AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AvailabilityToggleButton from '../components/dashboard/AvailabilityToggle';
import ProfileCarousel from '../components/home/ProfileCarousel';
import TopAnnouncementBanner from '../components/common/TopAnnouncementBanner';

// Types globaux pour Analytics
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
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
const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: <FrenchFlag /> },
  { code: 'en', name: 'English', nativeName: 'English', flag: <BritishFlag /> }
];

// Navigation items
const LEFT_NAVIGATION_ITEMS = [
  { path: '/', labelKey: 'nav.home', icon: '🏠', color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100' },
  { path: '/sos-appel', labelKey: 'nav.viewProfiles', icon: '👥', color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100' },
  { path: '/testimonials', labelKey: 'nav.testimonials', icon: '💬', color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100' },
];

const RIGHT_NAVIGATION_ITEMS = [
  { path: '/how-it-works', labelKey: 'nav.howItWorks', icon: '⚡', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  { path: '/pricing', labelKey: 'nav.pricing', icon: '💎', color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100' },
];

const ALL_NAVIGATION_ITEMS = [...LEFT_NAVIGATION_ITEMS, ...RIGHT_NAVIGATION_ITEMS];

// Hook scroll optimisé
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

// User Avatar
const UserAvatar = memo(({ user, size = 'md' }: { user: any; size?: 'sm' | 'md' | 'lg' }) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';

  const photoUrl = user?.profilePhoto || user?.photoURL;
  const displayName = user?.firstName || user?.displayName || user?.email || 'User';

  const handleImageError = useCallback(() => {
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

// Language Dropdown
const LanguageDropdown = memo(({ isMobile = false }: { isMobile?: boolean }) => {
  const { language, setLanguage } = useApp();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = useCallback((langCode: string) => {
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
            >
              <div className="mr-3 group-hover:scale-110 transition-transform duration-300">
                {lang.flag}
              </div>
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// User Menu
const UserMenu = memo(({ isMobile = false }: { isMobile?: boolean }) => {
  const { user, logout } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
            >
              <Shield className="w-5 h-5 mr-3" />
              <span className="font-medium">{t.adminConsole}</span>
            </Link>
          )}
          <Link 
            to="/dashboard" 
            className="flex items-center w-full bg-white/20 backdrop-blur-sm text-white px-4 py-4 rounded-xl hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[48px] touch-manipulation"
          >
            <Settings className="w-5 h-5 mr-3" />
            <span className="font-medium">{t.dashboard}</span>
          </Link>
          <button 
            onClick={handleLogout} 
            className="flex items-center w-full bg-red-500/80 text-white px-4 py-4 rounded-xl hover:bg-red-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400/50 min-h-[48px] touch-manipulation"
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
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

// Header Availability Toggle
const HeaderAvailabilityToggle = memo(() => {
  const { user } = useAuth();
  
  const isProvider = user?.role === 'lawyer' || user?.role === 'expat' || user?.type === 'lawyer' || user?.type === 'expat';
  
  if (!isProvider) return null;
  
  return (
    <div className="scale-90">
      <AvailabilityToggleButton />
    </div>
  );
});

// Notification Badge
const NotificationBadge = memo(() => {
  const [notifications] = useState(3);
  
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
const Header = () => {
  const location = useLocation();
  const { isLoading } = useAuth();
  const { language } = useApp();
  const scrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const getNavigationLabel = useCallback((labelKey: string) => {
    const translations = {
      'nav.home': { fr: 'Accueil', en: 'Home' },
      'nav.viewProfiles': { fr: 'Voir les profils aidants', en: 'View helper profiles' },
      'nav.testimonials': { fr: 'Les avis', en: 'Reviews' },
      'nav.howItWorks': { fr: 'Comment ça marche', en: 'How it Works' },
      'nav.pricing': { fr: 'Tarifs', en: 'Pricing' },
    };
    
    return translations[labelKey as keyof typeof translations]?.[language as keyof typeof translations['nav.home']] || labelKey;
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
                <HeaderAvailabilityToggle />
                <NotificationBadge />
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
              >
                <Phone className="w-4 h-4 group-hover:animate-pulse transition-transform duration-300" />
                <span>SOS</span>
              </Link>
              <HeaderAvailabilityToggle />
              <NotificationBadge />
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className={`p-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation ${
                  scrolled ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-gray-100'
                }`}
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
            <div className={`px-6 py-6 shadow-lg border-t ${scrolled ? 'bg-red-700 border-red-500' : 'bg-white border-gray-100'}`} role="navigation">
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
    </>
  );
};

// Hero Section avec urgence et confiance
const HeroSection = memo(() => {
  const [activeFeature, setActiveFeature] = useState(0);
  const { language } = useApp();

  const features = [
    { icon: Globe, text: '120+ pays', subtext: 'Couverture mondiale' },
    { icon: Clock, text: 'moins de 5 min', subtext: 'Connexion rapide' },
    { icon: Shield, text: '24/7', subtext: 'Support continu' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const t = {
    heroTitle: language === 'fr' ? 'Urgence à l\'étranger ?' : 'Emergency abroad?',
    heroSubtitle: language === 'fr' ? 'Aide en 5 minutes !' : 'Help in 5 minutes!',
    heroDescription: language === 'fr' 
      ? 'Connectez-vous instantanément avec des avocats et expatriés francophones vérifiés dans 120+ pays'
      : 'Connect instantly with verified French-speaking lawyers and expats in 120+ countries',
    urgencyBtn: language === 'fr' ? 'URGENCE MAINTENANT' : 'EMERGENCY NOW',
    expatBtn: language === 'fr' ? 'Conseil Expatrié' : 'Expat Advice',
    securityBadges: {
      secure: language === 'fr' ? '100% Sécurisé' : '100% Secure',
      certified: language === 'fr' ? 'Experts Certifiés' : 'Certified Experts', 
      response: language === 'fr' ? 'Réponse en moins de 5min' : 'Response under 5min'
    },
    emergencyPhone: language === 'fr' ? 'Urgence Téléphone' : 'Emergency Phone',
    freeCall: language === 'fr' ? 'Appel d\'urgence gratuit' : 'Free emergency call',
    discoverExperts: language === 'fr' ? 'Découvrir nos experts' : 'Discover our experts'
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-red-700 overflow-hidden">
      {/* Éléments décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg animate-bounce" />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-300/15 rounded-full blur-md animate-ping" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="text-center">
          {/* Badge urgence */}
          <div className="inline-flex items-center px-6 py-3 bg-orange-500/90 backdrop-blur-sm rounded-full text-white text-sm font-bold mb-8 border border-white/30 animate-pulse">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
            🆘 Plateforme d'urgence #1 - Assistance mondiale instantanée
          </div>

          {/* Titre principal */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            <span className="block">{t.heroTitle}</span>
            <span className="block bg-gradient-to-r from-yellow-300 via-orange-200 to-yellow-400 bg-clip-text text-transparent">
              {t.heroSubtitle}
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-red-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            {t.heroDescription}
          </p>

          {/* Badges de confiance */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">✅ {t.securityBadges.secure}</span>
            </div>
            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">✅ {t.securityBadges.certified}</span>
            </div>
            <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
              <Clock className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">✅ {t.securityBadges.response}</span>
            </div>
          </div>

          {/* Statistiques animées */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className={`group p-4 sm:p-6 rounded-2xl transition-all duration-500 cursor-pointer ${
                    activeFeature === index 
                      ? 'bg-white/25 scale-105 shadow-2xl' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-all duration-300 ${
                    activeFeature === index ? 'bg-white text-red-600' : 'bg-white/20 text-white'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`text-2xl font-bold mb-1 transition-colors duration-300 ${
                    activeFeature === index ? 'text-white' : 'text-red-100'
                  }`}>
                    {feature.text}
                  </div>
                  <div className="text-sm text-red-200">
                    {feature.subtext}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boutons CTA urgence */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link 
              to="/sos-appel?type=lawyer"
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-white/30"
            >
              <div className="relative z-10 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                🆘 {t.urgencyBtn}
              </div>
            </Link>
            
            <Link 
              to="/sos-appel?type=expat"
              className="group relative px-8 py-4 rounded-2xl font-bold text-lg text-white border-2 border-white/50 hover:border-white transition-all duration-300 hover:bg-white/10"
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
                {t.expatBtn}
              </div>
            </Link>
          </div>

          {/* Numéro d'urgence visible */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-8">
            <h3 className="text-lg font-bold text-white mb-2">📞 {t.emergencyPhone}</h3>
            <p className="text-2xl font-bold text-yellow-300">+33 X XX XX XX XX</p>
            <p className="text-sm text-red-100">24/7 - {t.freeCall}</p>
          </div>

          <div className="flex flex-col items-center animate-bounce">
            <div className="text-white/70 text-sm mb-2">{t.discoverExperts}</div>
            <ChevronRight className="w-6 h-6 text-white/70 rotate-90" />
          </div>
        </div>
      </div>
    </section>
  );
});

// Section Services avec prix internationaux
const ServicesSection = memo(() => {
  const { language } = useApp();

  const t = {
    urgentServices: language === 'fr' ? 'Services d\'urgence 24/7' : '24/7 Emergency Services',
    instantHelp: language === 'fr' ? 'Aide instantanée,' : 'Instant help,',
    worldwide: language === 'fr' ? ' partout dans le monde' : ' anywhere in the world',
    connectExperts: language === 'fr' 
      ? 'Connectez-vous immédiatement avec des experts vérifiés dans votre langue'
      : 'Connect immediately with verified experts in your language',
    lawyerCall: language === 'fr' ? 'Appel Avocat' : 'Lawyer Call',
    expatAdvice: language === 'fr' ? 'Conseil Expatrié' : 'Expat Advice',
    lawyerDesc: language === 'fr' 
      ? 'Consultation juridique urgente avec avocat certifié international'
      : 'Urgent legal consultation with certified international lawyer',
    expatDesc: language === 'fr'
      ? 'Aide pratique d\'expatriés francophones expérimentés'
      : 'Practical help from experienced French-speaking expats',
    lawyerFeatures: language === 'fr'
      ? ['Droit international', 'Urgences légales', 'Contrats & Visas', 'Conseil fiscal']
      : ['International law', 'Legal emergencies', 'Contracts & Visas', 'Tax advice'],
    expatFeatures: language === 'fr'
      ? ['Vie quotidienne', 'Démarches admin', 'Logement & Emploi', 'Culture locale']
      : ['Daily life', 'Admin procedures', 'Housing & Jobs', 'Local culture'],
    chooseUrgent: language === 'fr' ? 'URGENCE - Choisir' : 'EMERGENCY - Choose',
    chooseService: language === 'fr' ? 'Choisir ce service' : 'Choose this service',
    popular: language === 'fr' ? 'Populaire' : 'Popular',
    guarantees: {
      certified: language === 'fr' ? 'Experts Certifiés' : 'Certified Experts',
      certifiedDesc: language === 'fr' ? 'Vérification manuelle obligatoire' : 'Mandatory manual verification',
      response: language === 'fr' ? 'Réponse moins de 5min' : 'Response under 5min',
      responseDesc: language === 'fr' ? 'Connexion garantie ou remboursé' : 'Guaranteed connection or refund',
      secure: language === 'fr' ? 'Paiement Sécurisé' : 'Secure Payment',
      secureDesc: language === 'fr' ? 'SSL + Cryptage bancaire' : 'SSL + Banking encryption',
      coverage: language === 'fr' ? '120+ Pays' : '120+ Countries',
      coverageDesc: language === 'fr' ? 'Couverture mondiale 24/7' : 'Worldwide coverage 24/7'
    }
  };

  const services = [
    {
      id: 'lawyer',
      icon: Shield,
      title: `⚖️ ${t.lawyerCall}`,
      price: '49€',
      priceUSD: '$52',
      duration: '20 min',
      description: t.lawyerDesc,
      features: t.lawyerFeatures,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      urgent: true
    },
    {
      id: 'expat',
      icon: Heart,
      title: `🌍 ${t.expatAdvice}`,
      price: '19€',
      priceUSD: '$21',
      duration: '30 min',
      description: t.expatDesc,
      features: t.expatFeatures,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      urgent: false
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4 mr-2" />
            {t.urgentServices}
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {t.instantHelp}
            <span className="text-red-600">{t.worldwide}</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t.connectExperts}
          </p>
        </div>

        {/* Nouvelle bannière d'information */}
        <TopAnnouncementBanner className="mb-16" />

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.id} className="group relative">
                <div className={`relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 ${service.urgent ? 'ring-2 ring-orange-400' : ''}`}>
                  {service.urgent && (
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                      🆘 URGENCE
                    </div>
                  )}

                  <div className={`inline-flex p-4 ${service.bgColor} rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 ${service.textColor}`} />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>

                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <div className={`w-2 h-2 rounded-full ${service.textColor.replace('text-', 'bg-')} mr-3`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-3xl font-bold text-gray-900">{service.price}</span>
                        <span className="text-lg text-gray-500">/ {service.priceUSD}</span>
                      </div>
                      <span className="text-gray-500 text-sm">{service.duration}</span>
                    </div>
                  </div>

                  <Link 
                    to={service.id === 'lawyer' ? '/sos-appel?type=lawyer' : '/sos-appel?type=expat'}
                    className={`block w-full bg-gradient-to-r ${service.color} text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all duration-300 hover:scale-105 text-center ${service.urgent ? 'animate-pulse' : ''}`}
                  >
                    {service.urgent ? `🆘 ${t.chooseUrgent}` : t.chooseService}
                  </Link>
                </div>

                {service.id === 'lawyer' && (
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    <Award className="w-4 h-4 inline mr-1" />
                    {t.popular}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Garanties de sécurité */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Shield, text: t.guarantees.certified, desc: t.guarantees.certifiedDesc },
            { icon: Clock, text: t.guarantees.response, desc: t.guarantees.responseDesc },
            { icon: CheckCircle, text: t.guarantees.secure, desc: t.guarantees.secureDesc },
            { icon: Globe, text: t.guarantees.coverage, desc: t.guarantees.coverageDesc }
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="text-center p-6 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="inline-flex p-3 bg-green-100 rounded-xl mb-4">
                  <Icon className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{item.text}</h4>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

// Profile Carousel avec données réelles
const RealProfileCarousel = memo(() => {
  const { language } = useApp();

  const t = {
    internationalExperts: language === 'fr' ? 'Nos experts internationaux' : 'Our international experts',
    certifiedProfessionals: language === 'fr' ? 'Des professionnels certifiés' : 'Certified professionals',
    atYourService: language === 'fr' ? ' à votre écoute' : ' at your service',
    verifiedExperts: language === 'fr' 
      ? 'Découvrez nos experts vérifiés, disponibles dans plus de 120 pays et parlant votre langue'
      : 'Discover our verified experts, available in over 120 countries and speaking your language',
    viewAllExperts: language === 'fr' ? 'Voir tous nos experts' : 'View all our experts',
    available: language === 'fr' ? 'disponibles' : 'available'
  };

  return (
    <section className="py-20 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
            <Users className="w-4 h-4 mr-2" />
            {t.internationalExperts}
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {t.certifiedProfessionals}
            <span className="text-red-600">{t.atYourService}</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t.verifiedExperts}
          </p>
        </div>

        {/* Intégration du vrai ProfileCarousel */}
        <ProfileCarousel 
          className="mb-16"
          showStats={true}
          pageSize={20}
        />

        {/* CTA section */}
        <div className="text-center mt-16">
          <Link 
            to="/sos-appel"
            className="inline-flex items-center bg-white text-red-600 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all duration-300 hover:scale-105 border border-red-200"
          >
            👥 {t.viewAllExperts} (500+ {t.available})
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
});

// Comment ça marche avec processus sécurisé
const HowItWorksSection = memo(() => {
  const { language } = useApp();

  const t = {
    simpleSecure: language === 'fr' ? 'Processus simple et sécurisé' : 'Simple and secure process',
    howWeHelp: language === 'fr' ? 'Comment nous vous aidons' : 'How we help you',
    inEmergency: language === 'fr' ? ' en urgence ?' : ' in emergency?',
    threeSteps: language === 'fr' 
      ? 'Un processus en 3 étapes pour une aide rapide, sécurisée et efficace'
      : 'A 3-step process for fast, secure and efficient help',
    steps: [
      {
        title: language === 'fr' ? 'Choisissez votre expert' : 'Choose your expert',
        description: language === 'fr' 
          ? 'Sélectionnez un avocat ou expatrié selon votre urgence et votre pays'
          : 'Select a lawyer or expat according to your emergency and country'
      },
      {
        title: language === 'fr' ? 'Connexion sécurisée en moins de 5min' : 'Secure connection in under 5min',
        description: language === 'fr'
          ? 'Paiement sécurisé puis mise en relation automatique avec l\'expert disponible'
          : 'Secure payment then automatic connection with available expert'
      },
      {
        title: language === 'fr' ? 'Résolvez votre problème' : 'Solve your problem',
        description: language === 'fr'
          ? 'Échangez directement par téléphone et obtenez l\'aide dont vous avez besoin'
          : 'Exchange directly by phone and get the help you need'
      }
    ],
    startNow: language === 'fr' ? 'Commencer maintenant' : 'Start now'
  };

  const steps = [
    {
      number: 1,
      icon: Phone,
      title: t.steps[0].title,
      description: t.steps[0].description,
      color: 'from-blue-500 to-blue-600'
    },
    {
      number: 2,
      icon: Shield,
      title: t.steps[1].title,
      description: t.steps[1].description,
      color: 'from-green-500 to-green-600'
    },
    {
      number: 3,
      icon: CheckCircle,
      title: t.steps[2].title,
      description: t.steps[2].description,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4 mr-2" />
            {t.simpleSecure}
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {t.howWeHelp}
            <span className="text-red-600">{t.inEmergency}</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t.threeSteps}
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-24 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-blue-200 via-green-200 to-purple-200 rounded-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative text-center">
                  {index < steps.length - 1 && (
                    <div className="md:hidden absolute left-1/2 top-20 w-1 h-20 bg-gradient-to-b from-gray-200 to-transparent transform -translate-x-1/2" />
                  )}
                  
                  <div className="relative z-10 mx-auto mb-6">
                    <div className={`w-16 h-16 mx-auto bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border-4 border-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link 
            to="/sos-appel"
            className="inline-flex items-center bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            🆘 {t.startNow}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
});

// Testimonials avec données réelles
const TestimonialsSection = memo(() => {
  const { language } = useApp();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Les témoignages seraient récupérés depuis Firebase également
  // Pour l'instant on garde une structure vide qui peut être alimentée
  const realTestimonials: any[] = []; // Sera alimenté par Firebase

  const t = {
    verifiedReviews: language === 'fr' ? 'Témoignages vérifiés' : 'Verified testimonials',
    trustUs: language === 'fr' ? 'Ils nous font confiance' : 'They trust us',
    worldwide: language === 'fr' ? ' dans le monde entier' : ' worldwide',
    experiencesDesc: language === 'fr'
      ? 'Découvrez les expériences de nos utilisateurs qui ont été aidés en urgence'
      : 'Discover the experiences of our users who were helped in emergency',
    stats: {
      peopleHelped: language === 'fr' ? 'Personnes aidées' : 'People helped',
      averageRating: language === 'fr' ? 'Note moyenne' : 'Average rating',
      satisfaction: language === 'fr' ? 'Satisfaction client' : 'Customer satisfaction'
    }
  };

  useEffect(() => {
    if (realTestimonials.length > 0) {
      const interval = setInterval(() => {
        setActiveTestimonial((prev) => (prev + 1) % realTestimonials.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [realTestimonials.length]);

  // Si pas de témoignages réels, on affiche une section simplifiée
  if (realTestimonials.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full text-yellow-700 text-sm font-medium mb-6">
              <Star className="w-4 h-4 mr-2 fill-current" />
              {t.verifiedReviews}
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              {t.trustUs}
              <span className="text-red-600">{t.worldwide}</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t.experiencesDesc}
            </p>
          </div>

          {/* Stats de confiance uniquement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { number: '10,000+', label: t.stats.peopleHelped, icon: '👥' },
              { number: '4.9/5', label: t.stats.averageRating, icon: '⭐' },
              { number: '98%', label: t.stats.satisfaction, icon: '❤️' }
            ].map((stat, index) => (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Si des témoignages existent, afficher la version complète
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full text-yellow-700 text-sm font-medium mb-6">
            <Star className="w-4 h-4 mr-2 fill-current" />
            {t.verifiedReviews}
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            {t.trustUs}
            <span className="text-red-600">{t.worldwide}</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t.experiencesDesc}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="text-center">
              <div className="inline-flex p-4 bg-red-100 rounded-2xl mb-8">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/>
                </svg>
              </div>

              <blockquote className="text-2xl md:text-3xl text-gray-900 font-medium mb-8 leading-relaxed">
                "{realTestimonials[activeTestimonial]?.comment}"
              </blockquote>

              <div className="flex items-center justify-center">
                <img 
                  src={realTestimonials[activeTestimonial]?.avatar}
                  alt={realTestimonials[activeTestimonial]?.name}
                  className="w-16 h-16 rounded-2xl object-cover mr-4"
                />
                <div className="text-left">
                  <div className="flex items-center">
                    <div className="font-bold text-gray-900 text-lg mr-2">
                      {realTestimonials[activeTestimonial]?.name}
                    </div>
                    {realTestimonials[activeTestimonial]?.verified && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="text-gray-600">
                    {realTestimonials[activeTestimonial]?.location}
                  </div>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8 space-x-2">
            {realTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeTestimonial ? 'bg-red-500 scale-125' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats de confiance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16">
          {[
            { number: '10,000+', label: t.stats.peopleHelped, icon: '👥' },
            { number: '4.9/5', label: t.stats.averageRating, icon: '⭐' },
            { number: '98%', label: t.stats.satisfaction, icon: '❤️' }
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 bg-gray-50 rounded-2xl">
              <div className="text-4xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// CTA Final avec urgence
const CTASection = memo(() => {
  const { language } = useApp();

  const t = {
    dontStayAlone: language === 'fr' ? 'Ne restez pas seul !' : 'Don\'t stay alone!',
    helpArrives: language === 'fr' ? 'Votre aide arrive en' : 'Your help arrives in',
    lessThan5min: language === 'fr' ? 'moins de 5 minutes' : 'less than 5 minutes',
    joinThousands: language === 'fr'
      ? 'Rejoignez des milliers de voyageurs et expatriés qui font confiance à SOS Urgently pour leurs urgences dans le monde entier'
      : 'Join thousands of travelers and expats who trust SOS Urgently for their emergencies worldwide',
    emergencyNow: language === 'fr' ? 'URGENCE MAINTENANT' : 'EMERGENCY NOW',
    howItWorks: language === 'fr' ? 'Comment ça marche ?' : 'How it works?',
    freeEmergencyNumber: language === 'fr' ? 'Numéro d\'urgence gratuit' : 'Free emergency number',
    immediateAssistance: language === 'fr' ? 'Assistance immédiate' : 'Immediate assistance',
    stats: {
      emergenciesResolved: language === 'fr' ? 'Urgences résolues' : 'Emergencies resolved',
      countriesCovered: language === 'fr' ? 'Pays couverts' : 'Countries covered',
      continuousSupport: language === 'fr' ? 'Support continu' : 'Continuous support'
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-6 py-3 bg-orange-500/90 backdrop-blur-sm rounded-full text-white text-sm font-bold mb-8 animate-pulse">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-300" />
            🆘 URGENCE ? {t.dontStayAlone}
          </div>

          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-6">
            {t.helpArrives}
            <span className="block text-yellow-300">{t.lessThan5min}</span>
          </h2>

          <p className="text-xl text-red-100 mb-12 leading-relaxed">
            {t.joinThousands}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link 
              to="/sos-appel"
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-white/30"
            >
              <div className="relative z-10 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                🆘 {t.emergencyNow}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </Link>
            
            <Link 
              to="/how-it-works"
              className="group flex items-center text-white text-lg font-medium hover:text-yellow-200 transition-colors duration-300"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              {t.howItWorks}
            </Link>
          </div>

          {/* Numéro d'urgence */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-12">
            <h3 className="text-lg font-bold text-white mb-2">📞 {t.freeEmergencyNumber}</h3>
            <p className="text-3xl font-bold text-yellow-300">+33 X XX XX XX XX</p>
            <p className="text-sm text-red-100">24/7 - {t.immediateAssistance}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { number: '10,000+', label: t.stats.emergenciesResolved },
              { number: '120+', label: t.stats.countriesCovered },
              { number: '24/7', label: t.stats.continuousSupport }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-red-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

// Composant principal
const ModernHome = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <ServicesSection />
      <RealProfileCarousel />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
};

// Amélioration des performances avec React.memo et displayName
FrenchFlag.displayName = 'FrenchFlag';
BritishFlag.displayName = 'BritishFlag';
UserAvatar.displayName = 'UserAvatar';
LanguageDropdown.displayName = 'LanguageDropdown';
UserMenu.displayName = 'UserMenu';
HeaderAvailabilityToggle.displayName = 'HeaderAvailabilityToggle';
NotificationBadge.displayName = 'NotificationBadge';
HeroSection.displayName = 'HeroSection';
ServicesSection.displayName = 'ServicesSection';
RealProfileCarousel.displayName = 'RealProfileCarousel';
HowItWorksSection.displayName = 'HowItWorksSection';
TestimonialsSection.displayName = 'TestimonialsSection';
CTASection.displayName = 'CTASection';

export default memo(ModernHome);