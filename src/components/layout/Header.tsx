import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Phone, Shield, ChevronDown, Globe, User, UserPlus,
  Settings, LogOut, Wifi, WifiOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import {
  doc, updateDoc, setDoc, onSnapshot,
  getDoc, getDocs, query, where, writeBatch,
  serverTimestamp, collection
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/** ================================
 *  Types & Global
 *  ================================ */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
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
  mobileIcon?: string;  // emoji (mobile)
  desktopIcon?: string; // emoji (desktop)
}

interface AppUser {
  uid?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  fullName?: string;
  profilePhoto?: string;
  photoURL?: string;
  role?: 'lawyer' | 'expat' | 'admin' | 'user';
  type?: 'lawyer' | 'expat' | 'admin' | 'user';
  isOnline?: boolean;
  isVerified?: boolean;
}

/** ================================
 *  Flags
 *  ================================ */
const FrenchFlag = memo(() => (
  <div className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20" role="img" aria-label="Drapeau franÃ§ais">
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex">
      <div className="w-1/3 h-full bg-blue-600" />
      <div className="w-1/3 h-full bg-white" />
      <div className="w-1/3 h-full bg-red-600" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg pointer-events-none" />
  </div>
));
FrenchFlag.displayName = 'FrenchFlag';

const BritishFlag = memo(() => (
  <div className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20" role="img" aria-label="Drapeau britannique">
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm relative bg-blue-800">
      <div className="absolute inset-0">
        <div className="absolute w-full h-0.5 bg-white rotate-45 top-1/2 left-0 -translate-y-1/2" />
        <div className="absolute w-full h-0.5 bg-white -rotate-45 top-1/2 left-0 -translate-y-1/2" />
      </div>
      <div className="absolute inset-0">
        <div className="absolute w-full h-px bg-red-600 rotate-45" style={{ top: 'calc(50% - 1px)' }} />
        <div className="absolute w-full h-px bg-red-600 -rotate-45" style={{ top: 'calc(50% + 1px)' }} />
      </div>
      <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-red-600 -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-px bg-red-600 -translate-y-1/2" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg pointer-events-none" />
  </div>
));
BritishFlag.displayName = 'BritishFlag';

/** ================================
 *  i18n Config
 *  ================================ */
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'fr', name: 'French', nativeName: 'FranÃ§ais', flag: <FrenchFlag /> },
  { code: 'en', name: 'English', nativeName: 'English', flag: <BritishFlag /> },
];

const LEFT_NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/', labelKey: 'nav.home', mobileIcon: 'ðŸ ', desktopIcon: 'ðŸ ' },
  { path: '/sos-appel', labelKey: 'nav.viewProfiles', mobileIcon: 'ðŸ‘¥', desktopIcon: 'ðŸ‘¥' },
  { path: '/testimonials', labelKey: 'nav.testimonials', mobileIcon: 'ðŸ’¬', desktopIcon: 'ðŸ’¬' },
];

const RIGHT_NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/how-it-works', labelKey: 'nav.howItWorks', mobileIcon: 'âš¡', desktopIcon: 'âš¡' },
  { path: '/pricing', labelKey: 'nav.pricing', mobileIcon: 'ðŸ’Ž', desktopIcon: 'ðŸ’Ž' },
];

const ALL_NAVIGATION_ITEMS = [...LEFT_NAVIGATION_ITEMS, ...RIGHT_NAVIGATION_ITEMS];

/** ================================
 *  Hooks
 *  ================================ */
const useScrolled = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 120);
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

/** ================================
 *  Availability logic (source de vÃ©ritÃ© = sos_profiles)
 *  ================================ */
const useAvailabilityToggle = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(!!user?.isOnline);
  const [isUpdating, setIsUpdating] = useState(false);
  const sosSnapshotSubscribed = useRef(false);

  const isProvider =
    user?.role === 'lawyer' ||
    user?.role === 'expat' ||
    user?.type === 'lawyer' ||
    user?.type === 'expat';

  // --- Helpers d'Ã©criture ---
  const writeSosProfile = useCallback(async (newStatus: boolean) => {
    if (!user || !isProvider) return;

    const typedUser = user as AppUser;
    const userId = typedUser.uid || typedUser.id;
    if (!userId) return;

    const sosRef = doc(db, 'sos_profiles', userId);
    const updateData = {
      isOnline: newStatus,
      availability: newStatus ? 'available' : 'unavailable',
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isVisible: true,
      isVisibleOnMap: true,
    };

    // 1) Update direct (doc id = uid)
    try {
      await updateDoc(sosRef, updateData);
      return;
    } catch {
      // continue
    }

    // 2) S'il n'existe pas, crÃ©e/merge par {uid}
    try {
      const snap = await getDoc(sosRef);
      if (!snap.exists()) {
        const newProfileData = {
          type: typedUser.role || typedUser.type,
          fullName:
            typedUser.fullName ||
            `${typedUser.firstName || ''} ${typedUser.lastName || ''}`.trim() ||
            'Expert',
          ...updateData,
          isActive: true,
          isApproved: (typedUser.role || typedUser.type) !== 'lawyer',
          isVerified: !!typedUser.isVerified,
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
        };
        await setDoc(sosRef, newProfileData, { merge: true });
        return;
      }
    } catch {
      // continue vers fallback query
    }

    // 3) Fallback : anciens docs avec id â‰  uid â†’ update tous les docs oÃ¹ uid == userId
    const q = query(collection(db, 'sos_profiles'), where('uid', '==', userId));
    const found = await getDocs(q);
    if (!found.empty) {
      const batch = writeBatch(db);
      found.docs.forEach((d) => batch.update(d.ref, updateData));
      await batch.commit();
      return;
    }

    // 4) Dernier recours : crÃ©er doc {uid}
    await setDoc(sosRef, {
      type: typedUser.role || typedUser.type,
      fullName:
        typedUser.fullName ||
        `${typedUser.firstName || ''} ${typedUser.lastName || ''}`.trim() ||
        'Expert',
      ...updateData,
      isActive: true,
      isApproved: (typedUser.role || typedUser.type) !== 'lawyer',
      isVerified: !!typedUser.isVerified,
      rating: 5.0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
    }, { merge: true });
  }, [user, isProvider]);

  const writeUsersPresenceBestEffort = useCallback(async (newStatus: boolean) => {
    if (!user) return;
    const typedUser = user as AppUser;
    const userId = typedUser.uid || typedUser.id;
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const payload = {
      isOnline: newStatus,
      availability: newStatus ? 'available' : 'unavailable',
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(userRef, payload);
    } catch (e) {
      // Tentative avec setDoc merge si updateDoc Ã©choue
      try {
        await setDoc(userRef, { uid: userId, ...payload }, { merge: true });
      } catch (e2) {
        console.warn('Users presence update ignorÃ©e (rÃ¨gles/email) :', e2);
      }
    }
  }, [user]);

  // --- Ecoute temps rÃ©el : sos_profiles = source de vÃ©ritÃ© pour l'UI ---
  useEffect(() => {
    if (!user || !isProvider) return;
    if (sosSnapshotSubscribed.current) return;
    sosSnapshotSubscribed.current = true;

    const typedUser = user as AppUser;
    const userId = typedUser.uid || typedUser.id;
    if (!userId) return;

    const sosRef = doc(db, 'sos_profiles', userId);

    const un = onSnapshot(
      sosRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (!data) return;
        const next = data.isOnline === true;
        setIsOnline(prev => (prev !== next ? next : prev));
      },
      (err) => console.error('Erreur snapshot sos_profiles:', err)
    );

    return () => {
      sosSnapshotSubscribed.current = false;
      un();
    };
  }, [user?.uid, isProvider]);

  // Garde en phase avec un Ã©ventuel changement externe du user
  useEffect(() => {
    if (user?.isOnline !== undefined) setIsOnline(!!user.isOnline);
  }, [user?.isOnline]);

  const toggle = useCallback(async () => {
    if (!user || isUpdating) return;
    const typedUser = user as AppUser;
    const userId = typedUser.uid || typedUser.id;
    if (!userId) return;

    const newStatus = !isOnline;
    setIsUpdating(true);

    try {
      // 1) Ã‰crire d'abord dans sos_profiles (vÃ©ritÃ©)
      await writeSosProfile(newStatus);
      // 2) Puis essayer users (best-effort)
      await writeUsersPresenceBestEffort(newStatus);

      setIsOnline(newStatus);

      // Broadcast (on Ã©met les DEUX Ã©vÃ©nements pour compatibilitÃ©)
      window.dispatchEvent(new CustomEvent('availability:changed', { detail: { isOnline: newStatus } }));
      window.dispatchEvent(new CustomEvent('availabilityChanged', { detail: { isOnline: newStatus } }));

      // Analytics
      window.gtag?.('event', 'online_status_change', {
        event_category: 'engagement',
        event_label: newStatus ? 'online' : 'offline',
      });
    } catch (e) {
      console.error('Erreur online/offline :', e);
    } finally {
      setIsUpdating(false);
    }
  }, [isOnline, isUpdating, user, writeSosProfile, writeUsersPresenceBestEffort]);

  return { isOnline, isUpdating, isProvider, toggle };
};

/** ================================
 *  Desktop Availability Toggle
 *  ================================ */
const HeaderAvailabilityToggle = memo(() => {
  const { language } = useApp();
  const { isOnline, isUpdating, isProvider, toggle } = useAvailabilityToggle();

  if (!isProvider) return null;
  const t = { online: language === 'fr' ? 'En ligne' : 'Online', offline: language === 'fr' ? 'Hors ligne' : 'Offline' };

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={isUpdating}
      type="button"
      className={`group flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] touch-manipulation ${
        isOnline ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                 : 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg'
      } ${isUpdating ? 'opacity-75 cursor-not-allowed' : ''}`}
      style={{ border: '2px solid white', boxSizing: 'border-box' }}
      aria-label={`Changer le statut vers ${isOnline ? t.offline : t.online}`}
    >
      {isUpdating ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : isOnline ? (
        <Wifi className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
      ) : (
        <WifiOff className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
      )}
      <span>{isOnline ? `ðŸŸ¢ ${t.online}` : `ðŸ”´ ${t.offline}`}</span>
    </button>
  );
});
HeaderAvailabilityToggle.displayName = 'HeaderAvailabilityToggle';

/** ================================
 *  User Avatar (bigger)
 *  ================================ */
const UserAvatar = memo<{ user: AppUser | null; size?: 'sm' | 'md' }>(({ user, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';

  const photoUrl = user?.profilePhoto || user?.photoURL;
  const displayName = user?.firstName || user?.displayName || user?.email || 'User';
  const onError = useCallback(() => setImageError(true), []);

  if (!photoUrl || imageError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-base ring-2 ring-white/30 hover:ring-white/60 transition-all duration-300`}
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
        onError={onError}
        loading="lazy"
      />
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white" aria-label="En ligne" />
    </div>
  );
});
UserAvatar.displayName = 'UserAvatar';

/** ================================
 *  Language Dropdown (mobile light/dark)
 *  ================================ */
const LanguageDropdown = memo<{ isMobile?: boolean; variant?: 'light' | 'dark' }>(({ isMobile = false, variant = 'dark' }) => {
  const { language, setLanguage } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = useCallback((langCode: 'fr' | 'en') => {
    setLanguage(langCode);
    setOpen(false);
    window.gtag?.('event', 'language_change', { event_category: 'engagement', event_label: langCode });
  }, [setLanguage]);

  if (isMobile) {
    const isLight = variant === 'light';
    return (
      <div className="mb-6">
        <div className={`flex items-center text-sm font-semibold mb-3 ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
          <Globe className={`w-4 h-4 mr-2 ${isLight ? 'text-gray-700' : 'text-white'}`} />
          {language === 'fr' ? 'Langue' : 'Language'}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`group relative overflow-hidden px-6 py-4 rounded-2xl transition-all duration-300 focus:outline-none ${
                language === lang.code
                  ? (isLight ? 'bg-red-600 text-white shadow' : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white shadow-xl scale-105')
                  : (isLight ? 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50' : 'bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/20')
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center space-x-2 text-white hover:text-yellow-200 transition-all duration-300 hover:scale-105 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] justify-center"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="SÃ©lectionner la langue"
      >
        <div className="group-hover:scale-110 transition-transform duration-300">{currentLanguage.flag}</div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180 text-yellow-300' : ''}`} />
      </button>
      {open && (
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
              <div className="mr-3 group-hover:scale-110 transition-transform duration-300">{lang.flag}</div>
              <span>{lang.nativeName}</span>
              {language === lang.code && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-label="Langue actuelle" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
LanguageDropdown.displayName = 'LanguageDropdown';

/** ================================
 *  PWA Area (desktop)
 *  ================================ */
const PWAInstallArea = memo(({ scrolled }: { scrolled: boolean }) => {
  const { language } = useApp();
  const { install, installed } = usePWAInstall();
  const [showSlogan, setShowSlogan] = useState(false);

  useEffect(() => {
    setShowSlogan(true);
    const cycle = setInterval(() => setShowSlogan((p) => !p), 4000);
    return () => clearInterval(cycle);
  }, []);

  const onClick = async () => { await install(); };

  return (
    <div className="flex items-center select-none">
      <button
        type="button"
        onClick={onClick}
        className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden bg-transparent focus:outline-none focus:ring-0 shrink-0 touch-manipulation"
        aria-label={language === 'fr' ? "Installer l'application" : 'Install the app'}
        title={language === 'fr' ? "Installer l'application" : 'Install the app'}
      >
        <img src="/icons/icon-512x512-maskable.png" alt="SOS Expat App Icon" className="w-full h-full object-cover" />
      </button>

      <div className="ml-3">
        <div className="flex flex-col leading-tight text-center">
          <span className={`font-extrabold text-xl ${scrolled ? 'text-white' : 'text-gray-900'}`}>SOS Expat</span>
          <span className="text-sm font-semibold">
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {language === 'fr' ? "d'Ulixai" : 'by Ulixai'}
            </span>
          </span>
        </div>

        <div className="hidden lg:block h-5 overflow-hidden">
          <div className={`text-xs ${scrolled ? 'text-gray-300' : 'text-gray-600'} transition-opacity duration-700 ease-in-out ${showSlogan ? 'opacity-100' : 'opacity-0'}`}>
            {language === 'fr' ? "L'appli qui fait du bien !" : 'The feel-good app!'}{installed ? ' ðŸŽ‰' : ''}
          </div>
        </div>
      </div>
    </div>
  );
});
PWAInstallArea.displayName = 'PWAInstallArea';

/** ================================
 *  PWA icon button (mobile)
 *  ================================ */
const PWAIconButton = memo(() => {
  const { install } = usePWAInstall();
  const { language } = useApp();

  const handleClick = async () => { await install(); };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-16 h-16 rounded-2xl overflow-hidden bg-transparent focus:outline-none focus:ring-0 touch-manipulation"
      aria-label={language === 'fr' ? "Installer l'application" : 'Install the app'}
      title={language === 'fr' ? "Installer l'application" : 'Install the app'}
    >
      <img src="/icons/icon-512x512-maskable.png" alt="SOS Expat App Icon" className="w-full h-full object-cover" />
    </button>
  );
});
PWAIconButton.displayName = 'PWAIconButton';

/** ================================
 *  User Menu (uses navigate on logout)
 *  ================================ */
const UserMenu = memo<{ isMobile?: boolean; scrolled?: boolean }>(({ isMobile = false, scrolled = false }) => {
  const { user, logout } = useAuth();
  const { language } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setOpen(false);
      window.gtag?.('event', 'logout', { event_category: 'engagement' });
      try {
        navigate('/', { replace: true });
      } catch {
        window.location.assign('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      try {
        navigate('/', { replace: true });
      } catch {
        window.location.assign('/');
      }
    }
  }, [logout, navigate]);

  const t = {
    login: language === 'fr' ? 'Connexion' : 'Login',
    signup: language === 'fr' ? "S'inscrire" : 'Sign up',
    dashboard: language === 'fr' ? 'Tableau de bord' : 'Dashboard',
    adminConsole: language === 'fr' ? 'Console Admin' : 'Admin Console',
    logout: language === 'fr' ? 'DÃ©connexion' : 'Logout',
  };

  if (!user) {
    const loginBtnDesktop = scrolled
      ? 'group relative p-3 rounded-full hover:bg-white/10 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center'
      : 'group relative p-3 rounded-full hover:bg-gray-100 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[44px] min-w-[44px] flex items-center justify-center border border-gray-200';
    const loginIconDesktop = scrolled ? 'w-5 h-5 text-white group-hover:text-yellow-200' : 'w-5 h-5 text-red-600';

    const registerBtnDesktop = scrolled
      ? 'group relative p-3 rounded-full bg-white hover:bg-gray-50 hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center'
      : 'group relative p-3 rounded-full bg-red-600 hover:bg-red-700 hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center';
    const registerIconDesktop = scrolled ? 'w-5 h-5 text-red-600' : 'w-5 h-5 text-white';

    const authLinks = (
      <>
        <Link
          to="/login"
          className={isMobile ? 'group flex items-center justify-center w-full bg-white text-red-600 px-6 py-4 rounded-2xl border border-gray-300 hover:bg-gray-50 hover:scale-[1.01] transition-all duration-300 font-semibold min-h-[48px] touch-manipulation' : loginBtnDesktop}
          aria-label={t.login}
        >
          {isMobile ? (<><User className="w-5 h-5 mr-3" /><span>{t.login}</span></>) : (<User className={loginIconDesktop} />)}
        </Link>
        <Link
          to="/register"
          className={isMobile ? 'group flex items-center justify-center w-full bg-red-600 text-white px-6 py-4 rounded-2xl hover:bg-red-700 hover:scale-[1.01] transition-all duration-300 font-bold shadow min-h-[48px] touch-manipulation' : registerBtnDesktop}
          aria-label={t.signup}
        >
          {isMobile ? (<><UserPlus className="w-5 h-5 mr-3" /><span>{t.signup}</span></>) : (<UserPlus className={registerIconDesktop} />)}
        </Link>
      </>
    );
    return isMobile ? <div className="space-y-4">{authLinks}</div> : <div className="flex items-center space-x-4">{authLinks}</div>;
  }

  if (isMobile) {
    const mobileContainer = scrolled
      ? 'flex items-center space-x-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl'
      : 'flex items-center space-x-4 p-4 bg-gray-100 border border-gray-200 rounded-xl';

    const nameClass = scrolled ? 'font-semibold text-white' : 'font-semibold text-gray-900';
    const roleClass = scrolled ? 'text-xs text-white/70 capitalize' : 'text-xs text-gray-500 capitalize';

    const adminLinkClass = scrolled
      ? 'flex items-center w-full bg-white/20 backdrop-blur-sm text-white px-4 py-3 rounded-xl hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50'
      : 'flex items-center w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/20';

    const dashboardLinkClass = scrolled
      ? 'flex items-center w-full bg-white/20 backdrop-blur-sm text-white px-4 py-4 rounded-xl hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[48px] touch-manipulation'
      : 'flex items-center w-full bg-gray-100 text-gray-800 px-4 py-4 rounded-xl hover:bg-gray-200 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 min-h-[48px] touch-manipulation';

    const logoutBtnClass =
      'flex items-center w-full bg-red-600 text-white px-4 py-4 rounded-xl hover:bg-red-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400/50 min-h-[48px] touch-manipulation';

    return (
      <div className="space-y-4">
        <div className={mobileContainer}>
          <UserAvatar user={user} />
          <div>
            <div className={nameClass}>{user.firstName || user.displayName || user.email}</div>
            <div className={roleClass}>{user.role || 'Utilisateur'}</div>
          </div>
        </div>

        <div className="space-y-3">
          {user.role === 'admin' && (
            <Link to="/admin/dashboard" className={adminLinkClass} aria-label={t.adminConsole}>
              <Shield className="w-5 h-5 mr-3" />
              <span className="font-medium">{t.adminConsole}</span>
            </Link>
          )}
          <Link to="/dashboard" className={dashboardLinkClass} aria-label={t.dashboard}>
            <Settings className="w-5 h-5 mr-3" />
            <span className="font-medium">{t.dashboard}</span>
          </Link>
          <button onClick={handleLogout} className={logoutBtnClass} aria-label={t.logout}>
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">{t.logout}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center space-x-3 text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-2 min-h-[44px] touch-manipulation"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menu utilisateur"
      >
        <UserAvatar user={user} />
        <span className="text-sm font-medium hidden md:inline">{user.firstName || user.displayName || 'User'}</span>
        <ChevronDown className={`w-4 h-4 transition-all duration-300 ${open ? 'rotate-180 text-yellow-300' : ''}`} />
      </button>

      {open && (
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
              <Link to="/admin/dashboard" className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-red-50" onClick={() => setOpen(false)}>
                <Shield className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-300" />
                {t.adminConsole}
              </Link>
            )}
            <Link to="/dashboard" className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-red-50" onClick={() => setOpen(false)}>
              <Settings className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-300" />
              {t.dashboard}
            </Link>
            <hr className="my-1 border-gray-100" />
            <button onClick={handleLogout} className="group flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 rounded-xl mx-1 focus:outline-none focus:bg-red-50">
              <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-300" />
              {t.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
UserMenu.displayName = 'UserMenu';

/** ================================
 *  Header
 *  ================================ */
const Header: React.FC = () => {
  const location = useLocation();
  const { isLoading } = useAuth();
  const { language } = useApp();
  const scrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

  const getNavigationLabel = useCallback((labelKey: string): string => {
    const translations: Record<string, Record<'fr' | 'en', string>> = {
      'nav.home': { fr: 'Accueil', en: 'Home' },
      'nav.viewProfiles': { fr: 'Profils aidants', en: 'Helper profiles' },
      'nav.testimonials': { fr: 'Avis', en: 'Reviews' },
      'nav.howItWorks': { fr: 'Comment Ã§a marche', en: 'How it Works' },
      'nav.pricing': { fr: 'Tarifs', en: 'Pricing' },
    };
    return translations[labelKey]?.[language] || labelKey;
  }, [language]);

  const t = { sosCall: language === 'fr' ? 'SOS Appel' : 'SOS Call' };

  const { isOnline, isUpdating, isProvider, toggle } = useAvailabilityToggle();

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-700 ease-in-out ${
          scrolled ? 'bg-gray-900/95 backdrop-blur-xl shadow-xl' : 'bg-white border-b border-gray-200'
        } md:select-none`}
        role="banner"
      >
        {/* Desktop */}
        <div className="hidden lg:block">
          <div className="w-full px-6">
            <div className="flex items-center justify-between h-20">
              {/* Left: PWA area */}
              <PWAInstallArea scrolled={scrolled} />

              {/* Center Navigation with SOS */}
              <div className="flex-1 flex items-center justify-center">
                <nav className="flex items-center space-x-6">
                  {LEFT_NAVIGATION_ITEMS.slice(0, 2).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105 ${
                        scrolled ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      } ${isActive(item.path) ? (scrolled ? 'bg-white/20' : 'bg-gray-100') : ''}`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      {item.desktopIcon && <span className={`text-xl ${scrolled ? 'text-gray-200' : 'text-gray-700'}`} aria-hidden="true">{item.desktopIcon}</span>}
                      <span className={`font-semibold ${scrolled ? 'text-gray-200' : 'text-gray-700'} text-lg tracking-wide`}>
                        {getNavigationLabel(item.labelKey)}
                      </span>
                    </Link>
                  ))}

                  {/* Central SOS CTA */}
                  <div className="mx-6">
                    <Link
                      to="/sos-appel"
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-7 py-3 rounded-2xl font-bold transition-all duration-200 hover:scale-105 flex items-center space-x-2 shadow-lg border-2 border-white/20"
                      aria-label={t.sosCall}
                    >
                      <Phone className="w-5 h-5 text-white" />
                      <span className="tracking-wide">{t.sosCall.toUpperCase()}</span>
                    </Link>
                  </div>

                  {RIGHT_NAVIGATION_ITEMS.concat(LEFT_NAVIGATION_ITEMS.slice(2)).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105 ${
                        scrolled ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      } ${isActive(item.path) ? (scrolled ? 'bg-white/20' : 'bg-gray-100') : ''}`}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      {item.desktopIcon && <span className={`text-xl ${scrolled ? 'text-gray-200' : 'text-gray-700'}`} aria-hidden="true">{item.desktopIcon}</span>}
                      <span className={`font-semibold ${scrolled ? 'text-gray-200' : 'text-gray-700'} text-lg tracking-wide`}>
                        {getNavigationLabel(item.labelKey)}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-4">
                <HeaderAvailabilityToggle />
                <LanguageDropdown />
                {isLoading ? (
                  <div className={`w-8 h-8 border-2 rounded-full animate-spin ${scrolled ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`} role="status" aria-label="Chargement" />
                ) : (
                  <UserMenu scrolled={scrolled} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            {/* LEFT: PWA icon only */}
            <PWAIconButton />

            {/* CENTER: SOS + status indicator */}
            <div className="flex items-center gap-3">
              <Link
                to="/sos-appel"
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-7 py-2.5 rounded-2xl font-bold text-base flex items-center space-x-2 border border-white/20 touch-manipulation"
                aria-label={t.sosCall}
              >
                <Phone className="w-4 h-4 text-white" />
                <span>SOS</span>
              </Link>

              {isProvider && (
                <button
                  onClick={() => !isUpdating && toggle()}
                  className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center touch-manipulation ${
                    scrolled ? 'border-white/40' : 'border-gray-400/50'
                  }`}
                  aria-label={isOnline ? (language === 'fr' ? 'Se mettre hors ligne' : 'Go offline') : (language === 'fr' ? 'Se mettre en ligne' : 'Go online')}
                >
                  {isUpdating ? (
                    <div className={`w-4 h-4 border-2 rounded-full animate-spin ${scrolled ? 'border-white/50 border-t-white' : 'border-gray-500/50 border-t-gray-600'}`} />
                  ) : (
                    <span className={`block w-4 h-4 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  )}
                </button>
              )}
            </div>

            {/* RIGHT: hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-colors duration-200 touch-manipulation ${scrolled ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
              aria-expanded={isMenuOpen}
              aria-label="Menu de navigation"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className={`border-t transition-colors duration-700 ease-in-out ${scrolled ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`} role="navigation" aria-label="Navigation mobile">
              <div className="px-4 py-4 space-y-4">
                <nav className="space-y-2">
                  {ALL_NAVIGATION_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 touch-manipulation ${
                        scrolled ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                      } ${location.pathname === item.path ? (scrolled ? 'bg-white/10' : 'bg-gray-100') : ''}`}
                      onClick={() => setIsMenuOpen(false)}
                      aria-current={location.pathname === item.path ? 'page' : undefined}
                    >
                      {item.mobileIcon && <span className="text-xl">{item.mobileIcon}</span>}
                      <span className="font-semibold text-base">{getNavigationLabel(item.labelKey)}</span>
                    </Link>
                  ))}
                </nav>

                <div className={`pt-4 border-t ${scrolled ? 'border-white/10' : 'border-gray-200'}`}>
                  <LanguageDropdown isMobile variant={scrolled ? 'dark' : 'light'} />
                </div>

                <div className={`pt-4 border-t ${scrolled ? 'border-white/10' : 'border-gray-200'}`}>
                  <UserMenu isMobile scrolled={scrolled} />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Spacer */}
      <div className="h-20" aria-hidden="true" />

      {/* Structured Data */}
      {typeof window !== 'undefined' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'SOS Expat d\'Ulixai',
              description: language === 'fr' ? "Service d'assistance pour expatriÃ©s et voyageurs" : 'Assistance service for expats and travelers',
              url: window.location.origin,
              logo: `${window.location.origin}/icons/icon-512x512-maskable.png`,
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+33-XXX-XXX-XXX',
                contactType: 'customer service',
                availableLanguage: ['French', 'English'],
              },
              sameAs: [
                'https://facebook.com/sosexpats',
                'https://twitter.com/sosexpats',
                'https://linkedin.com/company/sosexpats',
              ],
            }),
          }}
        />
      )}

      {/* OpenGraph/Twitter */}
      {typeof window !== 'undefined' &&
        (() => {
          const updateMetaTag = (property: string, content: string) => {
            let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
            if (!meta) { meta = document.createElement('meta'); meta.setAttribute('property', property); document.head.appendChild(meta); }
            meta.content = content;
          };
          const updateTwitterMeta = (name: string, content: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
            if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', name); document.head.appendChild(meta); }
            meta.content = content;
          };
          const currentPage = location.pathname;
          const baseTitle = 'SOS Expat d\'Ulixai';
          const baseDescription = language === 'fr'
            ? "Service d'assistance immÃ©diate pour expatriÃ©s et voyageurs. Connexion en moins de 5 minutes avec des experts vÃ©rifiÃ©s."
            : 'Immediate assistance service for expats and travelers. Connect in less than 5 minutes with verified experts.';
          const currentNavItem = ALL_NAVIGATION_ITEMS.find((i) => i.path === currentPage);
          const pageTitle = currentNavItem ? getNavigationLabel(currentNavItem.labelKey) : getNavigationLabel('nav.home');

          updateMetaTag('og:title', `${baseTitle} - ${pageTitle}`);
          updateMetaTag('og:description', baseDescription);
          updateMetaTag('og:url', window.location.href);
          updateMetaTag('og:type', 'website');
          updateMetaTag('og:locale', language === 'fr' ? 'fr_FR' : 'en_US');

          updateTwitterMeta('twitter:card', 'summary_large_image');
          updateTwitterMeta('twitter:title', `${baseTitle} - ${pageTitle}`);
          updateTwitterMeta('twitter:description', baseDescription);

          return null;
        })()}
    </>
  );
};

Header.displayName = 'Header';
export default memo(Header);
