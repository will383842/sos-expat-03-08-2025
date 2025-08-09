// src/pages/Login.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, LogIn, Shield, Smartphone, Globe, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { Provider } from '../types/provider';
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Typage léger et sûr pour gtag, sans `any` */
type GtagFunction = (...args: unknown[]) => void;
interface GtagWindow {
  gtag?: GtagFunction;
}
const getGtag = (): GtagFunction | undefined =>
  (typeof window !== 'undefined' ? (window as unknown as GtagWindow).gtag : undefined);

// Hook de traduction optimisé avec contexte App
const useTranslation = () => {
  const { language } = useApp();

  const t = (key: string, defaultValue?: string) => {
    const translations: Record<string, Record<string, string>> = {
      'meta.title': {
        fr: "Connexion - SOS Expats | Services d'assistance aux expatriés",
        en: 'Login - SOS Expats | Expat assistance services'
      },
      'meta.description': {
        fr: "Connectez-vous à votre compte SOS Expats pour accéder à tous nos services d'assistance personnalisés aux expatriés. Support 24/7, démarches administratives, conseils juridiques.",
        en: 'Sign in to your SOS Expats account to access all our personalized expat assistance services. 24/7 support, administrative procedures, legal advice.'
      },
      'meta.keywords': {
        fr: 'connexion, login, SOS Expats, expatriés, assistance, services, support 24/7',
        en: 'login, SOS Expats, expats, assistance, services, 24/7 support'
      },
      'meta.og_title': {
        fr: 'Connexion SOS Expats - Votre portail expatrié sécurisé',
        en: 'SOS Expats Login - Your secure expat portal'
      },
      'meta.og_description': {
        fr: "Accédez instantanément à votre espace personnel SOS Expats. Services d'accompagnement premium pour expatriés dans le monde entier.",
        en: 'Instantly access your personal SOS Expats space. Premium support services for expats worldwide.'
      },
      'meta.og_image_alt': { fr: 'Connexion SOS Expats', en: 'SOS Expats Login' },
      'meta.twitter_image_alt': { fr: 'Interface de connexion SOS Expats', en: 'SOS Expats login interface' },
      'login.title': { fr: 'Connexion à votre compte', en: 'Sign in to your account' },
      'login.subtitle': { fr: 'Accédez à votre espace personnel et gérez vos services', en: 'Access your personal space and manage your services' },
      'login.or': { fr: 'Ou', en: 'Or' },
      'login.create_account': { fr: 'créez un nouveau compte', en: 'create a new account' },
      'login.create_account_aria': { fr: 'Créer un nouveau compte utilisateur', en: 'Create a new user account' },
      'login.email_label': { fr: 'Adresse email', en: 'Email address' },
      'login.email_placeholder': { fr: 'votre@email.com', en: 'your@email.com' },
      'login.email_help': { fr: "Utilisez l'email de votre compte", en: 'Use your account email' },
      'login.password_label': { fr: 'Mot de passe', en: 'Password' },
      'login.password_placeholder': { fr: 'Votre mot de passe', en: 'Your password' },
      'login.password_help': { fr: 'Minimum 6 caractères', en: 'Minimum 6 characters' },
      'login.show_password': { fr: 'Afficher le mot de passe', en: 'Show password' },
      'login.hide_password': { fr: 'Hide password', en: 'Hide password' },
      'login.remember_me': { fr: 'Se souvenir de moi', en: 'Remember me' },
      'login.forgot_password': { fr: 'Mot de passe oublié ?', en: 'Forgot password?' },
      'login.forgot_password_help': { fr: 'Mot de passe oublié ?', en: 'Forgot password?' },
      'login.submit_button': { fr: 'Se connecter', en: 'Sign in' },
      'login.submit_button_description': { fr: 'Cliquez pour vous connecter avec vos identifiants', en: 'Click to sign in with your credentials' },
      'login.logging_in': { fr: 'Connexion...', en: 'Signing in...' },
      'login.or_divider': { fr: 'OU', en: 'OR' },
      'login.google_login': { fr: 'Continuer avec Google', en: 'Continue with Google' },
      'login.new_user': { fr: 'Nouveau sur SOS Expats ?', en: 'New to SOS Expats?' },
      'validation.email_required': { fr: "L'adresse email est requise", en: 'Email address is required' },
      'validation.email_invalid': { fr: "Format d'email invalide", en: 'Invalid email format' },
      'validation.password_required': { fr: 'Le mot de passe est requis', en: 'Password is required' },
      'validation.password_min_length': { fr: 'Le mot de passe doit contenir au moins 6 caractères', en: 'Password must be at least 6 characters' },
      'error.title': { fr: 'Erreur de connexion', en: 'Login error' },
      'error.description': { fr: 'Nous nous excusons pour ce désagrément. Veuillez réessayer.', en: 'We apologize for this inconvenience. Please try again.' },
      'error.retry': { fr: 'Réessayer', en: 'Retry' },
      'error.offline': { fr: 'Connexion internet requise', en: 'Internet connection required' },
      'loading.message': { fr: 'Connexion en cours...', en: 'Signing in...' },
      'offline.message': { fr: 'Mode hors ligne - Certaines fonctionnalités peuvent être limitées', en: 'Offline mode - Some features may be limited' },
      'pwa.install': { fr: "Installer l'app", en: 'Install app' },
      'pwa.install_button': { fr: 'Installer', en: 'Install' },
      'security.ssl': { fr: 'Connexion sécurisée SSL', en: 'Secure SSL connection' },
      'trust.secure': { fr: 'Sécurisé', en: 'Secure' },
      'trust.support_24_7': { fr: 'Support 24/7', en: '24/7 Support' },
      'language.selector': { fr: 'Changer la langue', en: 'Change language' },
      'form.required': { fr: 'requis', en: 'required' },
      'redirect.message': {
        fr: 'Après connexion, vous serez redirigé pour finaliser votre réservation',
        en: 'After login, you will be redirected to complete your booking'
      },
      'create_account.button': { fr: 'Créer un nouveau compte', en: 'Create a new account' }
    };

    return translations[key]?.[language] || defaultValue || key;
  };

  return { t, language };
};

// Error Boundary optimisé
interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <this.props.FallbackComponent
          error={this.state.error}
          resetErrorBoundary={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('error.title')}</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{t('error.description')}</p>
        <Button
          onClick={resetErrorBoundary}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
        >
          {t('error.retry')}
        </Button>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading, error, user, authInitialized } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isFormTouched, setIsFormTouched] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  const currentLang = language || 'fr';

  // Navigation vers Register avec préservation du state
  const navigateToRegister = useCallback(() => {
    const registerUrl = `/register?redirect=${encodedRedirectUrl}`;
    navigate(registerUrl, {
      state: location.state
    });
  }, [encodedRedirectUrl, navigate, location.state]);

  // --- Types sûrs (pas de any) ---
type NavState = Readonly<{ selectedProvider?: Provider }>;

function isProviderLike(v: unknown): v is Provider {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.name === 'string'
    && (o.type === 'lawyer' || o.type === 'expat');
}

// Persiste le provider passé via state (depuis "Réservez maintenant")
useEffect(() => {
  const rawState: unknown = location.state;
  const state = (rawState ?? null) as NavState | null;
  const sp = state?.selectedProvider;

  if (isProviderLike(sp)) {
    try {
      sessionStorage.setItem('selectedProvider', JSON.stringify(sp));
     } catch {
      // sessionStorage non disponible (mode privé, quotas…)
    }
  }
}, [location.state]);

  // Performance monitoring
  useEffect(() => {
    const markStart = performance.now();
    return () => {
      const markEnd = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`Login rendered in ${(markEnd - markStart).toFixed(2)}ms`);
      }
    };
  }, []);

  // PWA install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // SEO & Social Media Meta Data with i18n
  const metaData = useMemo(
    () => ({
      title: t('meta.title'),
      description: t('meta.description'),
      keywords: t('meta.keywords'),
      ogTitle: t('meta.og_title'),
      ogDescription: t('meta.og_description'),
      canonicalUrl: `${window.location.origin}/${currentLang}/login`,
      alternateUrls: {
        fr: `${window.location.origin}/fr/login`,
        en: `${window.location.origin}/en/login`
      },
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${window.location.origin}/${currentLang}/login#webpage`,
        name: t('meta.title'),
        description: t('meta.description'),
        url: `${window.location.origin}/${currentLang}/login`,
        inLanguage: currentLang,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${window.location.origin}#website`,
          name: 'SOS Expats',
          url: window.location.origin,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${window.location.origin}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        },
        mainEntity: {
          '@type': 'LoginAction',
          '@id': `${window.location.origin}/${currentLang}/login#loginaction`,
          name: t('login.title'),
          description: t('login.subtitle'),
          target: `${window.location.origin}/${currentLang}/login`,
          object: {
            '@type': 'Person',
            name: 'Utilisateur SOS Expats'
          }
        },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: window.location.origin },
            { '@type': 'ListItem', position: 2, name: t('login.title'), item: `${window.location.origin}/${currentLang}/login` }
          ]
        },
        author: {
          '@type': 'Organization',
          '@id': `${window.location.origin}#organization`,
          name: 'SOS Expats',
          url: window.location.origin,
          logo: `${window.location.origin}/images/logo.png`,
          sameAs: ['https://www.facebook.com/sosexpats', 'https://www.linkedin.com/company/sosexpats', 'https://twitter.com/sosexpats']
        },
        publisher: { '@id': `${window.location.origin}#organization` }
      }
    }),
    [t, currentLang]
  );

  // Advanced form validation with i18n
  const emailRegex = useMemo(
    () =>
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    []
  );

  const validateField = useCallback(
    (field: keyof LoginFormData, value: string | boolean): string | null => {
      switch (field) {
        case 'email':
          if (!value) return t('validation.email_required');
          if (typeof value === 'string' && !emailRegex.test(value)) {
            return t('validation.email_invalid');
          }
          return null;
        case 'password':
          if (!value) return t('validation.password_required');
          if (typeof value === 'string' && value.length < 6) {
            return t('validation.password_min_length');
          }
          return null;
        default:
          return null;
      }
    },
    [emailRegex, t]
  );

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateField]);

  // Real-time field validation with debouncing
  const handleFieldChange = useCallback(
    (field: keyof LoginFormData, value: string | boolean) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setIsFormTouched(true);

      if (formErrors[field as keyof FormErrors]) {
        setFormErrors(prev => ({ ...prev, [field]: undefined }));
      }

      if (isFormTouched && typeof value === 'string') {
        const timeoutId = setTimeout(() => {
          const fieldError = validateField(field as keyof LoginFormData, value);
          if (fieldError) {
            setFormErrors(prev => ({ ...prev, [field]: fieldError }));
          }
        }, 300);

        return () => clearTimeout(timeoutId);
      }

      return undefined;
    },
    [formErrors, isFormTouched, validateField]
  );

  // Advanced SEO meta tags management with i18n
  useEffect(() => {
    document.title = metaData.title;

    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic SEO with i18n
    updateMetaTag('description', metaData.description);
    updateMetaTag('keywords', metaData.keywords);
    updateMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateMetaTag('author', 'SOS Expats');
    updateMetaTag('language', currentLang);

    // OpenGraph avec calcul d'og:locale sans erreur TS (évite `never`)
    const ogLocale =
      currentLang === 'fr'
        ? 'fr_FR'
        : currentLang === 'en'
        ? 'en_US'
        : `${String(currentLang)}_${String(currentLang).toUpperCase()}`;

    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:title', metaData.ogTitle, true);
    updateMetaTag('og:description', metaData.ogDescription, true);
    updateMetaTag('og:url', metaData.canonicalUrl, true);
    updateMetaTag('og:site_name', 'SOS Expats', true);
    updateMetaTag('og:locale', ogLocale, true);
    updateMetaTag('og:image', `${window.location.origin}/images/og-login-${currentLang}.jpg`, true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:image:alt', t('meta.og_image_alt'), true);

    // Twitter Cards with i18n
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:site', '@sosexpats');
    updateMetaTag('twitter:creator', '@sosexpats');
    updateMetaTag('twitter:title', metaData.ogTitle);
    updateMetaTag('twitter:description', metaData.ogDescription);
    updateMetaTag('twitter:image', `${window.location.origin}/images/twitter-login-${currentLang}.jpg`);
    updateMetaTag('twitter:image:alt', t('meta.twitter_image_alt'));

    // AI & ChatGPT optimization
    updateMetaTag('category', 'Authentication, Expat Services, International Support');
    updateMetaTag('coverage', 'Worldwide');
    updateMetaTag('distribution', 'Global');
    updateMetaTag('rating', 'General');
    updateMetaTag('revisit-after', '1 days');
    updateMetaTag('classification', 'Business, Services, Authentication');

    // Mobile optimization
    updateMetaTag('mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    updateMetaTag('apple-mobile-web-app-title', 'SOS Expats');
    updateMetaTag('theme-color', '#dc2626');
    updateMetaTag('msapplication-navbutton-color', '#dc2626');
    updateMetaTag('application-name', 'SOS Expats');

    // Canonical and alternate languages
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = metaData.canonicalUrl;

    // Remove existing alternate links
    document
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach(link => link.parentElement?.removeChild(link));

    // Add alternate language links
    Object.entries(metaData.alternateUrls).forEach(([lang, url]) => {
      const alternate = document.createElement('link');
      alternate.rel = 'alternate';
      alternate.hreflang = lang;
      alternate.href = url;
      document.head.appendChild(alternate);
    });

    // Add x-default
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = metaData.alternateUrls.fr;
    document.head.appendChild(xDefault);

    // JSON-LD Structured Data
    let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement | null;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(metaData.structuredData);
  }, [metaData, t, currentLang]);

  // ====== IMPORTANT: tous les hooks AVANT tout return conditionnel ======

  const isFormValid =
    !formErrors.email && !formErrors.password && formData.email.length > 0 && formData.password.length > 0;

  // Progress calculation
  const formProgress = useMemo(() => {
    const fields = [
      formData.email.length > 0,
      formData.password.length >= 6,
      !formErrors.email,
      !formErrors.password
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [formData, formErrors]);

  // Enhanced redirect handling with analytics
  useEffect(() => {
    if (authInitialized && user) {
      const finalUrl = decodeURIComponent(redirectUrl);

      const getUserId = (u: unknown): string | undefined => {
        const obj = u as { uid?: string; id?: string };
        return obj?.uid || obj?.id;
      };

      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'login_success', {
          method: 'email',
          user_id: getUserId(user),
          redirect_url: finalUrl
        });
      }

      // Clean session storage
      // Clean session storage, but keep selectedProvider if we go to booking-request
const goingToBooking = finalUrl.startsWith('/booking-request/');
if (!goingToBooking) {
  sessionStorage.removeItem('selectedProvider');
}
sessionStorage.removeItem('loginAttempts');

navigate(finalUrl, { replace: true });
    }
  }, [authInitialized, user, navigate, redirectUrl]);

  // Enhanced form submission with analytics and retry logic
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isOnline) {
        setFormErrors({ general: t('error.offline') });
        return;
      }

      if (!validateForm()) {
        setSubmitAttempts(prev => prev + 1);

        const gtag = getGtag();
        if (gtag) {
          gtag('event', 'login_validation_failed', {
            attempts: submitAttempts + 1,
            errors: Object.keys(formErrors).join(',')
          });
        }

        return;
      }

      try {
        performance.mark('login-attempt-start');

        // si tu veux garder le rememberMe, stocke-le localement
        if (formData.rememberMe) localStorage.setItem('rememberMe', '1');
        else localStorage.removeItem('rememberMe');

        await login(formData.email.trim().toLowerCase(), formData.password);

        performance.mark('login-attempt-end');
        performance.measure('login-attempt', { start: 'login-attempt-start', end: 'login-attempt-end' });

        const gtag = getGtag();
        if (gtag) {
          gtag('event', 'login_attempt_success', {
            email_domain: formData.email.split('@')[1],
            remember_me: formData.rememberMe,
            attempt_number: submitAttempts + 1
          });
        }
      } catch (loginError) {
        console.error('Login error:', loginError);
        setSubmitAttempts(prev => prev + 1);

        const gtag = getGtag();
        if (gtag) {
          gtag('event', 'login_attempt_failed', {
            error_type: loginError instanceof Error ? loginError.message : 'unknown',
            attempts: submitAttempts + 1,
            email_domain: formData.email.split('@')[1]
          });
        }
      }
    },
    [formData, validateForm, login, submitAttempts, isOnline, t, formErrors]
  );

  // Enhanced Google login with analytics
  const handleGoogleLogin = useCallback(async () => {
    try {
      performance.mark('google-login-start');

      await loginWithGoogle();

      performance.mark('google-login-end');
      performance.measure('google-login', { start: 'google-login-start', end: 'google-login-end' });

      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'login_success', { method: 'google', remember_me: formData.rememberMe });
      }
    } catch (googleError) {
      console.error('Google login error:', googleError);

      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'login_failed', {
          method: 'google',
          error_type: googleError instanceof Error ? googleError.message : 'unknown'
        });
      }
    }
  }, [loginWithGoogle, formData.rememberMe]);

  // Password visibility toggle with analytics
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => {
      const newValue = !prev;

      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'password_visibility_toggled', { visible: newValue, page: 'login' });
      }

      return newValue;
    });
  }, []);

  // PWA install handler
  const handleInstallApp = useCallback(() => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(choiceResult => {
        const gtag = getGtag();
        if (gtag) {
          gtag('event', 'pwa_install_prompt', { choice: choiceResult.outcome });
        }
        setInstallPrompt(null);
      });
    }
  }, [installPrompt]);

  // ===== Rendu =====
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-red-100 px-4">
        <div className="text-center max-w-sm w-full">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <LoadingSpinner size="large" color="red" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('loading.message')}</h2>
            <p className="text-sm text-gray-600 mb-4">Vérification de vos identifiants...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full animate-pulse transition-all duration-1000"
                style={{ width: '70%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        const gtag = getGtag();
        if (gtag) {
          gtag('event', 'login_error_boundary', { error: error.message, component_stack: errorInfo.componentStack });
        }
      }}
    >
      <Layout>
        <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
          {/* Offline banner */}
          {!isOnline && (
            <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-3 text-center text-sm font-medium z-50 shadow-lg">
              <div className="flex items-center justify-center space-x-2">
                <Globe className="inline h-4 w-4" />
                <span>{t('offline.message')}</span>
              </div>
            </div>
          )}

          {/* PWA Install Banner */}
          {installPrompt && (
            <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white p-4 rounded-2xl shadow-2xl z-40 sm:max-w-md sm:mx-auto border border-red-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{t('pwa.install')}</p>
                    <p className="text-xs text-red-100">Accès rapide et hors ligne</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleInstallApp}
                    className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors duration-200"
                  >
                    {t('pwa.install_button')}
                  </button>
                  <button
                    onClick={() => setInstallPrompt(null)}
                    className="text-red-100 hover:text-white p-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                    aria-label="Fermer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress bar mobile */}
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progression</span>
              <span className="text-sm font-medium text-red-600">{formProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${formProgress}%` }}
              />
            </div>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Header */}
            <header className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <LogIn className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-3">
                {t('login.title')}
              </h1>

              <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed mb-4">{t('login.subtitle')}</p>

              <p className="text-sm text-gray-600">
                {t('login.or')}{' '}
                <button
                  onClick={navigateToRegister}
                  className="font-semibold text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-all duration-200 underline decoration-2 underline-offset-2 hover:decoration-red-700"
                  aria-label={t('login.create_account_aria')}
                >
                  {t('login.create_account')}
                </button>
              </p>

              {/* Message de redirection si venant d'un provider */}
              {redirectUrl && redirectUrl.includes('/booking-request/') && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-800 font-medium">🎯 {t('redirect.message')}</p>
                    </div>
                  </div>
                </div>
              )}
            </header>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100 relative overflow-hidden">
              {/* Security indicator */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-red-500" />

              <div className="flex items-center justify-center mb-6">
                <Shield className="h-5 w-5 text-green-500 mr-2" aria-hidden="true" />
                <span className="text-xs text-gray-500 font-medium">{t('security.ssl')}</span>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                {/* Enhanced error display */}
                {(error || formErrors.general) && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl" role="alert">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-red-800 mb-1">{t('error.title')}</h3>
                        <div className="text-sm text-red-700 leading-relaxed">{error || formErrors.general}</div>
                        {submitAttempts >= 3 && (
                          <div className="mt-3">
                            <Link to="/password-reset" className="text-sm text-red-600 hover:text-red-500 underline font-medium">
                              {t('login.forgot_password_help')}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('login.email_label')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={e => handleFieldChange('email', e.target.value)}
                    onBlur={() => setIsFormTouched(true)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
                    placeholder={t('login.email_placeholder')}
                  />
                  {formErrors.email && <p className="mt-2 text-sm text-red-600">{formErrors.email}</p>}
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('login.password_label')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={e => handleFieldChange('password', e.target.value)}
                      onBlur={() => setIsFormTouched(true)}
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
                      placeholder={t('login.password_placeholder')}
                    />
                    <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="mt-2 text-sm text-red-600">{formErrors.password}</p>}
                </div>

                {/* Enhanced remember me and forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={e => handleFieldChange('rememberMe', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded transition-colors duration-200"
                    />
                    <label htmlFor="remember-me" className="ml-3 text-gray-900 select-none cursor-pointer font-medium">
                      {t('login.remember_me')}
                    </label>
                  </div>

                  <Link
                    to="/password-reset"
                    className="font-semibold text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors duration-200 underline decoration-2 underline-offset-2"
                  >
                    {t('login.forgot_password')}
                  </Link>
                </div>

                {/* Enhanced login button */}
                <div className="space-y-4">
                  <Button
                    type="submit"
                    loading={isLoading}
                    fullWidth
                    size="large"
                    className={`py-4 text-base font-bold rounded-xl transition-all duration-300 transform min-h-[56px] ${
                      isFormValid && !isLoading && isOnline
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-red-500/50'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-md'
                    }`}
                    disabled={!isFormValid || isLoading || !isOnline}
                    aria-describedby="login-button-description"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                        {t('login.logging_in')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <LogIn size={20} className="mr-3" aria-hidden="true" />
                        {t('login.submit_button')}
                      </div>
                    )}
                  </Button>
                  <p id="login-button-description" className="sr-only">
                    {t('login.submit_button_description')}
                  </p>
                </div>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-semibold">{t('login.or_divider')}</span>
                  </div>
                </div>

                {/* Google login */}
                <div>
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    loading={isLoading}
                    fullWidth
                    size="large"
                    variant="outline"
                    className="py-4 text-base font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:border-gray-400 min-h-[56px]"
                    disabled={isLoading || !isOnline}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('login.google_login')}
                  </Button>
                </div>
              </form>

              {/* Footer */}
              <footer className="mt-8 text-center space-y-6">
                <p className="text-sm text-gray-600">
                  {t('login.new_user')}{' '}
                  <button
                    onClick={navigateToRegister}
                    className="font-bold text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors duration-200 underline decoration-2 underline-offset-2"
                  >
                    {t('login.create_account')}
                  </button>
                </p>

                {/* Bouton de création de compte plus visible */}
                <div>
                  <button
                    onClick={navigateToRegister}
                    className="w-full py-3.5 px-6 border-2 border-red-600 text-red-600 font-bold rounded-xl hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
                  >
                    📝 {t('create_account.button')}
                  </button>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    {t('trust.secure')}
                  </span>
                  <span>•</span>
                  <span>{t('trust.support_24_7')}</span>
                </div>

                {/* Performance indicator (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400">⚡ Optimized for Core Web Vitals</div>
                )}
              </footer>
            </div>
          </div>

          {/* Preload critical resources */}
          <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://accounts.google.com" />
          <link rel="dns-prefetch" href="//www.google-analytics.com" />

          {/* Service Worker registration */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                      .then(registration => console.log('SW registered:', registration))
                      .catch(error => console.log('SW registration failed:', error));
                  });
                }
              `
            }}
          />
        </main>
      </Layout>
    </ErrorBoundary>
  );
};

// Export with React.memo for performance optimization
export default React.memo(Login);
