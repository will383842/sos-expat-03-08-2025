import React, { useCallback, useEffect, useState, useRef, useMemo, ErrorInfo } from "react";

// ==================== INTERFACES ====================
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PWACapabilities {
  canInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
}

interface Translations {
  [key: string]: {
    [key: string]: string | { [key: string]: string };
  };
}

interface MonitoringData {
  [key: string]: string | number | boolean;
}

// Déclaration globale pour gtag avec types spécifiques
declare global {
  function gtag(
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string,
    config?: Record<string, string | number | boolean>
  ): void;
}

// ==================== TRANSLATIONS ====================
const translations: Translations = {
  fr: {
    install: "Installer",
    appName: "SOS Expat",
    description: "Accès rapide à l'assistance d'urgence",
    later: "Plus tard",
    installing: "Installation en cours...",
    installNow: "Installer maintenant",
    cancel: "Annuler",
    addToDevice: "Ajouter SOS Expat à votre appareil",
    benefits: {
      instant: "Accès instantané depuis votre écran d'accueil",
      offline: "Fonctionne hors ligne pour les urgences",
      faster: "Plus rapide qu'un navigateur classique"
    },
    errors: {
      notAvailable: "Installation PWA non disponible sur ce navigateur/appareil.",
      installationFailed: "Erreur lors de l'installation. Veuillez réessayer."
    },
    aria: {
      banner: "Installation de l'application",
      installButton: "Ouvrir les détails d'installation",
      dismissButton: "Reporter l'installation à plus tard",
      modal: "Détails d'installation de l'application",
      installing: "Installation en cours...",
      installNowButton: "Installer l'application maintenant",
      cancelButton: "Annuler l'installation"
    }
  },
  en: {
    install: "Install",
    appName: "SOS Expat",
    description: "Quick access to emergency assistance",
    later: "Later",
    installing: "Installing...",
    installNow: "Install now",
    cancel: "Cancel",
    addToDevice: "Add SOS Expat to your device",
    benefits: {
      instant: "Instant access from your home screen",
      offline: "Works offline for emergencies",
      faster: "Faster than a regular browser"
    },
    errors: {
      notAvailable: "PWA installation not available on this browser/device.",
      installationFailed: "Installation error. Please try again."
    },
    aria: {
      banner: "Application installation",
      installButton: "Open installation details",
      dismissButton: "Postpone installation",
      modal: "Application installation details",
      installing: "Installing...",
      installNowButton: "Install application now",
      cancelButton: "Cancel installation"
    }
  },
  es: {
    install: "Instalar",
    appName: "SOS Expat",
    description: "Acceso rápido a asistencia de emergencia",
    later: "Más tarde",
    installing: "Instalando...",
    installNow: "Instalar ahora",
    cancel: "Cancelar",
    addToDevice: "Añadir SOS Expat a tu dispositivo",
    benefits: {
      instant: "Acceso instantáneo desde tu pantalla de inicio",
      offline: "Funciona sin conexión para emergencias",
      faster: "Más rápido que un navegador normal"
    },
    errors: {
      notAvailable: "Instalación PWA no disponible en este navegador/dispositivo.",
      installationFailed: "Error de instalación. Por favor, inténtalo de nuevo."
    },
    aria: {
      banner: "Instalación de la aplicación",
      installButton: "Abrir detalles de instalación",
      dismissButton: "Posponer instalación",
      modal: "Detalles de instalación de la aplicación",
      installing: "Instalando...",
      installNowButton: "Instalar aplicación ahora",
      cancelButton: "Cancelar instalación"
    }
  },
  de: {
    install: "Installieren",
    appName: "SOS Expat",
    description: "Schneller Zugang zu Notfallhilfe",
    later: "Später",
    installing: "Installiert...",
    installNow: "Jetzt installieren",
    cancel: "Abbrechen",
    addToDevice: "SOS Expat zu Ihrem Gerät hinzufügen",
    benefits: {
      instant: "Sofortiger Zugang von Ihrem Startbildschirm",
      offline: "Funktioniert offline für Notfälle",
      faster: "Schneller als ein normaler Browser"
    },
    errors: {
      notAvailable: "PWA-Installation auf diesem Browser/Gerät nicht verfügbar.",
      installationFailed: "Installationsfehler. Bitte versuchen Sie es erneut."
    },
    aria: {
      banner: "Anwendungsinstallation",
      installButton: "Installationsdetails öffnen",
      dismissButton: "Installation verschieben",
      modal: "Installationsdetails der Anwendung",
      installing: "Installiert...",
      installNowButton: "Anwendung jetzt installieren",
      cancelButton: "Installation abbrechen"
    }
  }
};

// ==================== SÉCURITÉ & MONITORING ====================

/**
 * Système de logging sécurisé avec monitoring
 */
class SecureLogger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('dev'));
  }

  private sanitizeData(data: unknown): MonitoringData {
    if (!data || typeof data !== 'object') return {};
    
    return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
      // Sanitiser les valeurs pour éviter XSS
      if (typeof value === 'string') {
        acc[key] = value.replace(/[<>"'&]/g, '').substring(0, 1000);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        acc[key] = value;
      }
      return acc;
    }, {} as MonitoringData);
  }

  private sendToMonitoring(level: string, message: string, data?: MonitoringData) {
    // En production, envoyer à votre service de monitoring
    if (!this.isDevelopment) {
      try {
        // Exemple avec fetch vers votre endpoint de monitoring
        fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message,
            data: this.sanitizeData(data),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }).catch(() => {}); // Silently fail monitoring
      } catch {
        // Ne pas faire échouer l'app si le monitoring échoue
      }
    }
  }

  info(message: string, data?: unknown) {
    if (this.isDevelopment) {
      console.log(`ℹ️ ${message}`, data);
    }
    this.sendToMonitoring('info', message, data as MonitoringData);
  }

  warn(message: string, data?: unknown) {
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, data);
    }
    this.sendToMonitoring('warn', message, data as MonitoringData);
  }

  error(message: string, error?: Error | unknown) {
    console.error(`❌ ${message}`, error);
    this.sendToMonitoring('error', message, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack || '' : '',
      component: 'PwaInstallBanner'
    });
  }
}

const logger = new SecureLogger();

/**
 * Analytics sécurisées avec sanitisation
 */
const trackEvent = (event: string, data?: Record<string, unknown>) => {
  try {
    const sanitizedData = Object.entries(data || {}).reduce((acc, [key, value]) => {
      // Sanitiser pour éviter l'injection
      const sanitizedKey = String(key).replace(/[^a-zA-Z0-9_]/g, '');
      const sanitizedValue = String(value).replace(/[<>"'&]/g, '').substring(0, 100);
      acc[sanitizedKey] = sanitizedValue;
      return acc;
    }, {} as Record<string, string>);

    // Google Analytics - avec vérification d'existence
    if (typeof window !== 'undefined' && 'gtag' in window) {
      gtag('event', event, sanitizedData);
    }

    // Votre système d'analytics personnalisé
    logger.info(`Analytics: ${event}`, sanitizedData);
  } catch (error) {
    logger.warn('Analytics error', error);
  }
};

/**
 * Rate limiting pour éviter le spam
 */
class RateLimiter {
  private actions: Map<string, number[]> = new Map();
  private maxAttempts = 5;
  private timeWindow = 60000; // 1 minute

  canPerform(action: string): boolean {
    const now = Date.now();
    const attempts = this.actions.get(action) || [];
    
    // Nettoyer les anciennes tentatives
    const recentAttempts = attempts.filter(time => now - time < this.timeWindow);
    
    if (recentAttempts.length >= this.maxAttempts) {
      logger.warn(`Rate limit exceeded for action: ${action}`);
      return false;
    }
    
    recentAttempts.push(now);
    this.actions.set(action, recentAttempts);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// ==================== CUSTOM HOOKS ====================

/**
 * Hook pour la détection de locale utilisateur
 */
function useUserLocale(): string {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'fr';
    
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['fr', 'en', 'es', 'de'];
    
    return supportedLangs.includes(browserLang) ? browserLang : 'fr';
  }, []);
}

/**
 * Hook de traduction avec fallbacks
 */
function useTranslation(locale: string = 'fr') {
  return useCallback((key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[locale] || translations.fr;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    // Fallback sur français si traduction manquante
    if (!value && locale !== 'fr') {
      let fallbackValue: unknown = translations.fr;
      for (const k of keys) {
        if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
          fallbackValue = (fallbackValue as Record<string, unknown>)[k];
        } else {
          fallbackValue = undefined;
          break;
        }
      }
      value = fallbackValue;
    }
    
    return typeof value === 'string' ? value : key;
  }, [locale]);
}

/**
 * Hook localStorage sécurisé avec gestion d'erreurs
 */
function useLocalStorage(key: string, defaultValue: string | null = null) {
  const [storedValue, setStoredValue] = useState<string | null>(() => {
    if (typeof window === "undefined") return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item !== null ? item : defaultValue;
    } catch (error) {
      logger.warn(`localStorage read error for "${key}"`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: string | null) => {
    try {
      setStoredValue(value);
      
      if (value === null) {
        localStorage.removeItem(key);
        logger.info(`localStorage: Key "${key}" removed`);
      } else {
        localStorage.setItem(key, value);
        logger.info(`localStorage: ${key} updated`);
      }
    } catch (error) {
      logger.error(`localStorage write error for "${key}"`, error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}

/**
 * Hook pour détecter les capacités PWA
 */
function usePWACapabilities(): PWACapabilities {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return { canInstall: false, isStandalone: false, isIOS: false };
    }

    // Détection iOS robuste (inclut nouveaux iPads)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Détection mode standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as NavigatorWithStandalone).standalone === true;

    // Détection capacité d'installation PWA
    const canInstall = 'serviceWorker' in navigator && 
                      ('BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window);

    return { canInstall, isStandalone, isIOS };
  }, []);
}

/**
 * Hook pour gérer les timeouts de manière sécurisée
 */
function useTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setTimeoutSafe = useCallback((callback: () => void, delay: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, []);

  const clearTimeoutSafe = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { setTimeoutSafe, clearTimeoutSafe };
}

/**
 * Hook pour le feedback haptique mobile
 */
function useHapticFeedback() {
  return useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      if ('vibrate' in navigator) {
        const patterns = {
          light: 10,
          medium: 20,
          heavy: 50
        };
        navigator.vibrate(patterns[type]);
      }
    } catch {
      // Fail silently
    }
  }, []);
}

/**
 * Hook pour respecter les préférences d'animation
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ==================== ERROR BOUNDARY ====================
class PWAErrorBoundary extends React.Component<
  { children: React.ReactNode; locale: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; locale: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('PWA Banner Error Boundary triggered', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    trackEvent('pwa_component_error', {
      error: error.message,
      component: 'PwaInstallBanner'
    });
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail silently pour ne pas casser l'app
    }

    return this.props.children;
  }
}

// ==================== CONSTANTES ====================
const CONFIG = {
  STORAGE_KEYS: {
    INSTALLED: "pwa-installed",
    DISMISSED_UNTIL: "pwa-install-dismissed-until",
  },
  TIMEOUTS: {
    BANNER_AUTO_CLOSE: 30000, // 30 secondes
    DISMISS_DELAY_DAYS: 7, // 7 jours
  },
} as const;

// ==================== COMPOSANT PRINCIPAL ====================
const PwaInstallBannerInner: React.FC<{ locale: string }> = ({ locale }) => {
  // ==================== ÉTAT ====================
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // ==================== HOOKS ====================
  const t = useTranslation(locale);
  const [isInstalled, setIsInstalled] = useLocalStorage(CONFIG.STORAGE_KEYS.INSTALLED, "false");
  const [dismissedUntil, setDismissedUntil] = useLocalStorage(CONFIG.STORAGE_KEYS.DISMISSED_UNTIL, null);
  const { canInstall, isStandalone, isIOS } = usePWACapabilities();
  const { setTimeoutSafe, clearTimeoutSafe } = useTimeout();
  const hapticFeedback = useHapticFeedback();
  const prefersReducedMotion = usePrefersReducedMotion();

  // ==================== REFS ====================
  const isInstallingRef = useRef(false);
  const isMountedRef = useRef(true);

  // ==================== FONCTIONS ====================

  const shouldShowBanner = useCallback((): boolean => {
    logger.info("Checking PWA banner display conditions");

    if (!canInstall) {
      logger.info("Browser doesn't support PWA");
      return false;
    }

    if (isIOS && isStandalone) {
      logger.info("iOS standalone mode detected");
      return false;
    }

    if (isInstalled === "true") {
      logger.info("App already marked as installed");
      return false;
    }

    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      const now = new Date();
      
      if (now < dismissedDate) {
        logger.info(`Installation postponed until ${dismissedDate.toLocaleDateString()}`);
        return false;
      } else {
        logger.info("Postponement period expired");
        setDismissedUntil(null);
      }
    }

    logger.info("All conditions met for banner display");
    return true;
  }, [canInstall, isIOS, isStandalone, isInstalled, dismissedUntil, setDismissedUntil]);

  const handleDismiss = useCallback(() => {
    if (!rateLimiter.canPerform('dismiss')) {
      return;
    }

    logger.info("Installation postponed by user");
    hapticFeedback('light');
    
    const nextAllowedDate = new Date();
    nextAllowedDate.setDate(nextAllowedDate.getDate() + CONFIG.TIMEOUTS.DISMISS_DELAY_DAYS);
    
    setDismissedUntil(nextAllowedDate.toISOString());
    setShowBanner(false);
    setShowModal(false);
    clearTimeoutSafe();
    
    trackEvent('pwa_install_dismissed', {
      locale,
      until: nextAllowedDate.toISOString()
    });
  }, [setDismissedUntil, clearTimeoutSafe, hapticFeedback, locale]);

  const handleInstall = useCallback(async () => {
    if (!rateLimiter.canPerform('install')) {
      return;
    }

    logger.info("Starting PWA installation");
    
    if (isInstallingRef.current) {
      logger.info("Installation already in progress");
      return;
    }

    if (!deferredPrompt) {
      logger.error("No installation prompt available");
      alert(t('errors.notAvailable'));
      setShowModal(false);
      return;
    }

    try {
      isInstallingRef.current = true;
      setIsInstalling(true);
      hapticFeedback('medium');
      
      logger.info("Triggering native installation prompt");
      await deferredPrompt.prompt();
      
      const result = await deferredPrompt.userChoice;
      logger.info(`User choice: ${result.outcome}`);
      
      if (!isMountedRef.current) {
        logger.warn("Component unmounted during installation");
        return;
      }
      
      if (result.outcome === "accepted") {
        logger.info("Installation accepted by user");
        hapticFeedback('heavy');
        setIsInstalled("true");
        setShowBanner(false);
        setShowModal(false);
        clearTimeoutSafe();
        
        trackEvent('pwa_install_success', {
          locale,
          userAgent: navigator.userAgent
        });
      } else {
        logger.info("Installation declined by user");
        handleDismiss();
        
        trackEvent('pwa_install_declined', {
          locale
        });
      }
      
    } catch (error) {
      logger.error("PWA installation error", error);
      if (isMountedRef.current) {
        alert(t('errors.installationFailed'));
        handleDismiss();
      }
      
      trackEvent('pwa_install_error', {
        locale,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      if (isMountedRef.current) {
        isInstallingRef.current = false;
        setIsInstalling(false);
      }
      logger.info("Installation process completed");
    }
  }, [deferredPrompt, handleDismiss, setIsInstalled, clearTimeoutSafe, hapticFeedback, t, locale]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      logger.info("Modal closed via Escape key");
      setShowModal(false);
    }
  }, []);

  // ==================== EFFETS ====================

  useEffect(() => {
    logger.info("Initializing PwaInstallBanner");
    
    if (!shouldShowBanner()) {
      return;
    }

    let isEffectActive = true;

    const handleBeforeInstallPrompt = (e: Event) => {
      if (!isEffectActive) return;
      
      logger.info("'beforeinstallprompt' event received");
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowBanner(true);
      
      setTimeoutSafe(() => {
        if (isEffectActive && isMountedRef.current) {
          logger.info("Auto-closing banner after 30s");
          setShowBanner(false);
        }
      }, CONFIG.TIMEOUTS.BANNER_AUTO_CLOSE);
      
      trackEvent('pwa_prompt_ready', {
        locale,
        userAgent: navigator.userAgent
      });
      
      logger.info("PWA banner displayed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Mode développement
    const isDevelopment = typeof window !== 'undefined' && 
                          (window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('dev'));
    
    if (isDevelopment) {
      const devTimeout = setTimeout(() => {
        if (isEffectActive && !deferredPrompt) {
          logger.info("Dev mode: No beforeinstallprompt event after 5s");
        }
      }, 5000);
      
      return () => {
        isEffectActive = false;
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        clearTimeout(devTimeout);
        clearTimeoutSafe();
      };
    }

    return () => {
      isEffectActive = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeoutSafe();
      logger.info("Cleaning up PWA event listeners");
    };
  }, [shouldShowBanner, deferredPrompt, setTimeoutSafe, clearTimeoutSafe, locale]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isInstallingRef.current = false;
    };
  }, []);

  // ==================== RENDU ====================

  if (!showBanner) {
    return null;
  }

  const animationClass = prefersReducedMotion ? '' : 'animate-slide-up';

  return (
    <>
      {/* Bannière principale */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${animationClass}`}
        role="banner"
        aria-label={t('aria.banner')}
        data-testid="pwa-install-banner"
      >
        <div className="p-3 sm:p-4 pb-safe">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg" role="img" aria-label="Application mobile">📱</span>
                <h2 className="text-sm sm:text-lg font-semibold truncate">
                  {t('install')} {t('appName')}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-red-100 leading-tight">
                {t('description')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => {
                  logger.info("Opening installation modal");
                  hapticFeedback('light');
                  setShowModal(true);
                }}
                className="bg-white text-red-600 hover:bg-red-50 active:bg-red-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 focus:ring-opacity-50 min-h-[44px] flex items-center justify-center"
                aria-label={t('aria.installButton')}
                data-testid="install-button"
              >
                <span className="mr-1" role="img" aria-hidden="true">🚀</span>
                <span className="hidden sm:inline">{t('install')}</span>
                <span className="sm:hidden">{t('install')}</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="border border-white border-opacity-50 hover:border-opacity-100 hover:bg-white hover:bg-opacity-10 active:bg-opacity-20 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600 focus:ring-opacity-50 min-h-[44px] flex items-center justify-center"
                aria-label={t('aria.dismissButton')}
                data-testid="dismiss-button"
              >
                {t('later')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'installation */}
      {showModal && (
        <div 
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 ${prefersReducedMotion ? '' : 'animate-fade-in'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          onKeyDown={handleKeyDown}
          data-testid="pwa-install-modal"
          style={{ zIndex: 9999 }}
        >
          <div className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md transform transition-transform duration-300 ease-out ${prefersReducedMotion ? '' : 'animate-slide-up'}`}>
            {/* Header */}
            <div className="p-6 text-center border-b border-gray-100">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true"></div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <span className="text-xl sm:text-2xl" role="img" aria-label="Célébration">🎉</span>
              </div>
              <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                {t('addToDevice')}
              </h2>
            </div>

            {/* Contenu */}
            <div className="p-6">
              <div id="modal-description" className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-1 flex-shrink-0" role="img" aria-label="Avantage">✅</span>
                  <p className="text-sm text-gray-700">
                    <strong>{t('benefits.instant')}</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 mt-1 flex-shrink-0" role="img" aria-label="Avantage">🔄</span>
                  <p className="text-sm text-gray-700">
                    <strong>{t('benefits.offline')}</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-purple-500 mt-1 flex-shrink-0" role="img" aria-label="Avantage">⚡</span>
                  <p className="text-sm text-gray-700">
                    <strong>{t('benefits.faster')}</strong>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center min-h-[48px]"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  aria-label={isInstalling ? t('aria.installing') : t('aria.installNowButton')}
                  data-testid="modal-install-button"
                >
                  {isInstalling ? (
                    <>
                      <span className="inline-block animate-spin mr-2" aria-hidden="true">⏳</span>
                      <span>{t('installing')}</span>
                    </>
                  ) : (
                    <span>{t('installNow')}</span>
                  )}
                </button>
                
                <button
                  className="flex-1 sm:flex-initial border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-6 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 min-h-[48px] flex items-center justify-center"
                  onClick={() => {
                    logger.info("Installation cancelled");
                    setShowModal(false);
                  }}
                  disabled={isInstalling}
                  aria-label={t('aria.cancelButton')}
                  data-testid="modal-cancel-button"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles pour les animations - Intégrés via className au lieu de style JSX */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slide-up {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
          
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }

          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom);
          }
        `
      }} />
    </>
  );
};

// ==================== COMPOSANT AVEC ERROR BOUNDARY ====================
const PwaInstallBanner: React.FC = () => {
  const locale = useUserLocale();
  
  return (
    <PWAErrorBoundary locale={locale}>
      <PwaInstallBannerInner locale={locale} />
    </PWAErrorBoundary>
  );
};

export default PwaInstallBanner;

