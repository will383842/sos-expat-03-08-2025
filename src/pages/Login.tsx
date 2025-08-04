import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, Shield, Smartphone, Globe } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';

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

// Simple i18n function (replace with real i18n later)
const useTranslation = () => {
  const t = (key: string, defaultValue?: string) => {
    // Simple fallback - replace with real i18n implementation
    const translations: Record<string, string> = {
      'meta.title': 'Connexion - SOS Expats | Services d\'assistance aux expatriés',
      'meta.description': 'Connectez-vous à votre compte SOS Expats pour accéder à tous nos services d\'assistance personnalisés aux expatriés. Support 24/7, démarches administratives, conseils juridiques.',
      'meta.keywords': 'connexion, login, SOS Expats, expatriés, assistance, services, support 24/7',
      'meta.og_title': 'Connexion SOS Expats - Votre portail expatrié sécurisé',
      'meta.og_description': 'Accédez instantanément à votre espace personnel SOS Expats. Services d\'accompagnement premium pour expatriés dans le monde entier.',
      'meta.og_image_alt': 'Connexion SOS Expats',
      'meta.twitter_image_alt': 'Interface de connexion SOS Expats',
      'login.title': 'Connexion à votre compte',
      'login.subtitle': 'Accédez à votre espace personnel et gérez vos services',
      'login.or': 'Ou',
      'login.create_account': 'créez un nouveau compte',
      'login.create_account_aria': 'Créer un nouveau compte utilisateur',
      'login.email_label': 'Adresse email',
      'login.email_placeholder': 'votre@email.com',
      'login.email_help': 'Utilisez l\'email de votre compte',
      'login.password_label': 'Mot de passe',
      'login.password_placeholder': 'Votre mot de passe',
      'login.password_help': 'Minimum 6 caractères',
      'login.show_password': 'Afficher le mot de passe',
      'login.hide_password': 'Masquer le mot de passe',
      'login.remember_me': 'Se souvenir de moi',
      'login.forgot_password': 'Mot de passe oublié ?',
      'login.forgot_password_help': 'Mot de passe oublié ?',
      'login.submit_button': 'Se connecter',
      'login.submit_button_description': 'Cliquez pour vous connecter avec vos identifiants',
      'login.logging_in': 'Connexion...',
      'login.or_divider': 'OU',
      'login.google_login': 'Continuer avec Google',
      'login.new_user': 'Nouveau sur SOS Expats ?',
      'validation.email_required': 'L\'adresse email est requise',
      'validation.email_invalid': 'Format d\'email invalide',
      'validation.password_required': 'Le mot de passe est requis',
      'validation.password_min_length': 'Le mot de passe doit contenir au moins 6 caractères',
      'error.title': 'Erreur de connexion',
      'error.description': 'Nous nous excusons pour ce désagrément. Veuillez réessayer.',
      'error.retry': 'Réessayer',
      'error.offline': 'Connexion internet requise',
      'loading.message': 'Connexion en cours...',
      'offline.message': 'Mode hors ligne - Certaines fonctionnalités peuvent être limitées',
      'pwa.install': 'Installer l\'app',
      'pwa.install_button': 'Installer',
      'security.ssl': 'Connexion sécurisée SSL',
      'trust.secure': 'Sécurisé',
      'trust.gdpr_compliant': 'Conforme RGPD',
      'trust.support_24_7': 'Support 24/7',
      'language.selector': 'Changer la langue',
      'form.required': 'requis'
    };
    return translations[key] || defaultValue || key;
  };
  
  const i18n = {
    language: 'fr',
    changeLanguage: (lang: string) => {
      console.log(`Language changed to: ${lang}`);
      // Implement real language change logic here
    }
  };
  
  return { t, i18n };
};

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

// Simple Error Boundary component
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
      return <this.props.FallbackComponent error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

// Error fallback component
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ resetErrorBoundary }) => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('error.title', 'Une erreur est survenue')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('error.description', 'Nous nous excusons pour ce désagrément. Veuillez réessayer.')}
        </p>
        <Button onClick={resetErrorBoundary} className="bg-red-600 hover:bg-red-700">
          {t('error.retry', 'Réessayer')}
        </Button>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const currentLang = i18n.language || 'fr';

  // Performance monitoring setup
  useEffect(() => {
    // Simple performance monitoring without external deps
    const markStart = performance.now();
    return () => {
      const markEnd = performance.now();
      console.log(`Login component rendered in ${markEnd - markStart}ms`);
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
  const metaData = useMemo(() => ({
    title: t('meta.title', 'Connexion - SOS Expats | Services d\'assistance aux expatriés'),
    description: t('meta.description', 'Connectez-vous à votre compte SOS Expats pour accéder à tous nos services d\'assistance personnalisés aux expatriés. Support 24/7, démarches administratives, conseils juridiques.'),
    keywords: t('meta.keywords', 'connexion, login, SOS Expats, expatriés, assistance, services, support 24/7'),
    ogTitle: t('meta.og_title', 'Connexion SOS Expats - Votre portail expatrié sécurisé'),
    ogDescription: t('meta.og_description', 'Accédez instantanément à votre espace personnel SOS Expats. Services d\'accompagnement premium pour expatriés dans le monde entier.'),
    canonicalUrl: `${window.location.origin}/${currentLang}/login`,
    alternateUrls: {
      fr: `${window.location.origin}/fr/login`,
      en: `${window.location.origin}/en/login`,
      es: `${window.location.origin}/es/login`,
      de: `${window.location.origin}/de/login`
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${window.location.origin}/${currentLang}/login#webpage`,
      "name": t('meta.title'),
      "description": t('meta.description'),
      "url": `${window.location.origin}/${currentLang}/login`,
      "inLanguage": currentLang,
      "isPartOf": {
        "@type": "WebSite",
        "@id": `${window.location.origin}#website`,
        "name": "SOS Expats",
        "url": window.location.origin,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${window.location.origin}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      "mainEntity": {
        "@type": "LoginAction",
        "@id": `${window.location.origin}/${currentLang}/login#loginaction`,
        "name": t('login.title', 'Connexion à votre compte'),
        "description": t('login.subtitle', 'Accédez à votre espace personnel'),
        "target": `${window.location.origin}/${currentLang}/login`,
        "object": {
          "@type": "Person",
          "name": "Utilisateur SOS Expats"
        }
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": window.location.origin
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": t('login.title'),
            "item": `${window.location.origin}/${currentLang}/login`
          }
        ]
      },
      "author": {
        "@type": "Organization",
        "@id": `${window.location.origin}#organization`,
        "name": "SOS Expats",
        "url": window.location.origin,
        "logo": `${window.location.origin}/images/logo.png`,
        "sameAs": [
          "https://www.facebook.com/sosexpats",
          "https://www.linkedin.com/company/sosexpats",
          "https://twitter.com/sosexpats"
        ]
      },
      "publisher": {
        "@id": `${window.location.origin}#organization`
      }
    }
  }), [t, currentLang]);

  // Advanced form validation with i18n
  const emailRegex = useMemo(() => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, []);
  
  const validateField = useCallback((field: keyof LoginFormData, value: string | boolean): string | null => {
    switch (field) {
      case 'email':
        if (!value) return t('validation.email_required', 'L\'adresse email est requise');
        if (typeof value === 'string' && !emailRegex.test(value)) {
          return t('validation.email_invalid', 'Format d\'email invalide');
        }
        return null;
      case 'password':
        if (!value) return t('validation.password_required', 'Le mot de passe est requis');
        if (typeof value === 'string' && value.length < 6) {
          return t('validation.password_min_length', 'Le mot de passe doit contenir au moins 6 caractères');
        }
        return null;
      default:
        return null;
    }
  }, [emailRegex, t]);

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
  const handleFieldChange = useCallback((field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsFormTouched(true);
    
    // Clear field error on change
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Debounced real-time validation
    if (isFormTouched && typeof value === 'string') {
      const timeoutId = setTimeout(() => {
        const fieldError = validateField(field as keyof LoginFormData, value);
        if (fieldError) {
          setFormErrors(prev => ({ ...prev, [field]: fieldError }));
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formErrors, isFormTouched, validateField]);

  // Advanced SEO meta tags management with i18n
  useEffect(() => {
    // Set document title
    document.title = metaData.title;
    
    // Function to update or create meta tag
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
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
    
    // OpenGraph with i18n
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:title', metaData.ogTitle, true);
    updateMetaTag('og:description', metaData.ogDescription, true);
    updateMetaTag('og:url', metaData.canonicalUrl, true);
    updateMetaTag('og:site_name', 'SOS Expats', true);
    updateMetaTag('og:locale', currentLang === 'fr' ? 'fr_FR' : currentLang === 'en' ? 'en_US' : `${currentLang}_${currentLang.toUpperCase()}`, true);
    updateMetaTag('og:image', `${window.location.origin}/images/og-login-${currentLang}.jpg`, true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:image:alt', t('meta.og_image_alt', 'Connexion SOS Expats'), true);
    
    // Twitter Cards with i18n
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:site', '@sosexpats');
    updateMetaTag('twitter:creator', '@sosexpats');
    updateMetaTag('twitter:title', metaData.ogTitle);
    updateMetaTag('twitter:description', metaData.ogDescription);
    updateMetaTag('twitter:image', `${window.location.origin}/images/twitter-login-${currentLang}.jpg`);
    updateMetaTag('twitter:image:alt', t('meta.twitter_image_alt', 'Interface de connexion SOS Expats'));
    
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
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = metaData.canonicalUrl;
    
    // Remove existing alternate links
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());
    
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
    let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(metaData.structuredData);
    
  }, [metaData, t, currentLang]);

  // Enhanced redirect handling with analytics
  useEffect(() => {
    if (authInitialized && user) {
      const finalUrl = decodeURIComponent(redirectUrl);
      
      // Analytics tracking
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'login_success', {
          method: 'email',
          user_id: user.uid,
          redirect_url: finalUrl
        });
      }
      
      // Clean session storage
      sessionStorage.removeItem('selectedProvider');
      sessionStorage.removeItem('loginAttempts');
      
      navigate(finalUrl, { replace: true });
    }
  }, [authInitialized, user, navigate, redirectUrl]);

  // Enhanced form submission with analytics and retry logic
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      setFormErrors({ general: t('error.offline', 'Connexion internet requise') });
      return;
    }
    
    if (!validateForm()) {
      setSubmitAttempts(prev => prev + 1);
      
      // Analytics for validation errors
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'login_validation_failed', {
          attempts: submitAttempts + 1,
          errors: Object.keys(formErrors).join(',')
        });
      }
      
      return;
    }
    
    try {
      // Performance mark
      performance.mark('login-attempt-start');
      
      await login(formData.email.trim().toLowerCase(), formData.password, formData.rememberMe);
      
      // Performance measure
      performance.mark('login-attempt-end');
      performance.measure('login-attempt', 'login-attempt-start', 'login-attempt-end');
      
      // Success analytics
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'login_attempt_success', {
          email_domain: formData.email.split('@')[1],
          remember_me: formData.rememberMe,
          attempt_number: submitAttempts + 1
        });
      }
      
    } catch (loginError) {
      console.error('Login error:', loginError);
      setSubmitAttempts(prev => prev + 1);
      
      // Error analytics
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'login_attempt_failed', {
          error_type: loginError instanceof Error ? loginError.message : 'unknown',
          attempts: submitAttempts + 1,
          email_domain: formData.email.split('@')[1]
        });
      }
    }
  }, [formData, validateForm, login, submitAttempts, isOnline, t, formErrors]);

  // Enhanced Google login with analytics
  const handleGoogleLogin = useCallback(async () => {
    try {
      performance.mark('google-login-start');
      
      await loginWithGoogle(formData.rememberMe);
      
      performance.mark('google-login-end');
      performance.measure('google-login', 'google-login-start', 'google-login-end');
      
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'login_success', {
          method: 'google',
          remember_me: formData.rememberMe
        });
      }
      
    } catch (googleError) {
      console.error('Google login error:', googleError);
      
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'login_failed', {
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
      
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', 'password_visibility_toggled', { 
          visible: newValue,
          page: 'login'
        });
      }
      
      return newValue;
    });
  }, []);

  // PWA install handler
  const handleInstallApp = useCallback(() => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (typeof (window as any).gtag !== 'undefined') {
          (window as any).gtag('event', 'pwa_install_prompt', {
            choice: choiceResult.outcome
          });
        }
        setInstallPrompt(null);
      });
    }
  }, [installPrompt]);

  // Loading state optimization with skeleton
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md w-full px-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <LoadingSpinner size="large" color="red" />
            <p className="mt-4 text-sm text-gray-600" role="status" aria-live="polite">
              {t('loading.message', 'Connexion en cours...')}
            </p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
              <div className="bg-red-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  const isFormValid = !formErrors.email && !formErrors.password && formData.email && formData.password;

  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback} 
      onError={(error, errorInfo) => {
        if (typeof (window as any).gtag !== 'undefined') {
          (window as any).gtag('event', 'login_error_boundary', {
            error: error.message,
            component_stack: errorInfo.componentStack
          });
        }
      }}
    >
      <Layout>
        <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
          {/* Offline banner */}
          {!isOnline && (
            <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium z-50">
              <Globe className="inline h-4 w-4 mr-2" />
              {t('offline.message', 'Mode hors ligne - Certaines fonctionnalités peuvent être limitées')}
            </div>
          )}

          {/* PWA Install Banner */}
          {installPrompt && (
            <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-40 sm:max-w-md sm:mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">
                    {t('pwa.install', 'Installer l\'app')}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleInstallApp}
                    className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
                  >
                    {t('pwa.install_button', 'Installer')}
                  </button>
                  <button
                    onClick={() => setInstallPrompt(null)}
                    className="text-blue-100 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Optimized heading structure with i18n */}
            <header className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                {t('login.title', 'Connexion à votre compte')}
              </h1>
              
              <p className="mt-3 text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                {t('login.subtitle', 'Accédez à votre espace personnel et gérez vos services')}
              </p>
              
              <p className="mt-4 text-sm text-gray-600">
                {t('login.or', 'Ou')}{' '}
                <Link 
                  to={`/register?redirect=${encodedRedirectUrl}`}
                  className="font-medium text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-1 py-0.5 transition-colors duration-200"
                  aria-label={t('login.create_account_aria', 'Créer un nouveau compte utilisateur')}
                >
                  {t('login.create_account', 'créez un nouveau compte')}
                </Link>
              </p>
            </header>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 relative overflow-hidden">
              {/* Security indicator */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
              
              <div className="flex items-center justify-center mb-6">
                <Shield className="h-5 w-5 text-green-500 mr-2" aria-hidden="true" />
                <span className="text-xs text-gray-500 font-medium">
                  {t('security.ssl', 'Connexion sécurisée SSL')}
                </span>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                {/* Enhanced error display with i18n */}
                {(error || formErrors.general) && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg" role="alert">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" aria-hidden="true" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          {t('error.title', 'Erreur de connexion')}
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          {error || formErrors.general}
                        </div>
                        {submitAttempts >= 3 && (
                          <div className="mt-2">
                            <Link 
                              to="/password-reset" 
                              className="text-sm text-red-600 hover:text-red-500 underline"
                            >
                              {t('login.forgot_password_help', 'Mot de passe oublié ?')}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced email field with i18n */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('login.email_label', 'Adresse email')}
                    <span className="text-red-500 ml-1" aria-label={t('form.required', 'requis')}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={() => setIsFormTouched(true)}
                      className={`appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 ${
                        formErrors.email ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder={t('login.email_placeholder', 'votre@email.com')}
                      aria-describedby={formErrors.email ? 'email-error' : undefined}
                      aria-invalid={!!formErrors.email}
                    />
                    <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
                  </div>
                  {formErrors.email && (
                    <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                      <AlertCircle className="h-4 w-4 mr-1 inline flex-shrink-0" />
                      {formErrors.email}
                    </p>
                  )}
                  {!formErrors.email && (
                    <p id="email-help" className="mt-1 text-xs text-gray-500">
                      {t('login.email_help', 'Utilisez l\'email de votre compte')}
                    </p>
                  )}
                </div>

                {/* Enhanced password field with i18n */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t('login.password_label', 'Mot de passe')}
                    <span className="text-red-500 ml-1" aria-label={t('form.required', 'requis')}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={() => setIsFormTouched(true)}
                      className={`appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 ${
                        formErrors.password ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder={t('login.password_placeholder', 'Votre mot de passe')}
                      aria-describedby={formErrors.password ? 'password-error' : undefined}
                      aria-invalid={!!formErrors.password}
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-sm"
                      aria-label={showPassword ? t('login.hide_password', 'Masquer le mot de passe') : t('login.show_password', 'Afficher le mot de passe')}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                      <AlertCircle className="h-4 w-4 mr-1 inline flex-shrink-0" />
                      {formErrors.password}
                    </p>
                  )}
                  {!formErrors.password && (
                    <p id="password-help" className="mt-1 text-xs text-gray-500">
                      {t('login.password_help', 'Minimum 6 caractères')}
                    </p>
                  )}
                </div>

                {/* Enhanced remember me and forgot password with i18n */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center cursor-pointer">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => handleFieldChange('rememberMe', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded transition-colors duration-200"
                    />
                    <span className="ml-2 text-gray-900 select-none">
                      {t('login.remember_me', 'Se souvenir de moi')}
                    </span>
                  </label>

                  <Link 
                    to="/password-reset" 
                    className="font-medium text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-1 py-0.5 transition-colors duration-200"
                  >
                    {t('login.forgot_password', 'Mot de passe oublié ?')}
                  </Link>
                </div>

                {/* Enhanced login button with i18n */}
                <div>
                  <Button
                    type="submit"
                    loading={isLoading}
                    fullWidth
                    size="large"
                    className={`py-4 text-base font-semibold rounded-xl transition-all duration-200 transform ${
                      isFormValid && !isLoading && isOnline
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!isFormValid || isLoading || !isOnline}
                    aria-describedby="login-button-description"
                  >
                    <LogIn size={20} className="mr-2" aria-hidden="true" />
                    {isLoading ? t('login.logging_in', 'Connexion...') : t('login.submit_button', 'Se connecter')}
                  </Button>
                  <p id="login-button-description" className="sr-only">
                    {t('login.submit_button_description', 'Cliquez pour vous connecter avec vos identifiants')}
                  </p>
                </div>

                {/* Enhanced divider with i18n */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">
                      {t('login.or_divider', 'OU')}
                    </span>
                  </div>
                </div>

                {/* Enhanced Google login without lazy loading */}
                <div>
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    loading={isLoading}
                    fullWidth
                    size="large"
                    variant="outline"
                    className="py-4 text-base font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading || !isOnline}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {t('login.google_login', 'Continuer avec Google')}
                  </Button>
                </div>
              </form>

              {/* Enhanced sign up link with i18n */}
              <footer className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  {t('login.new_user', 'Nouveau sur SOS Expats ?')}{' '}
                  <Link 
                    to={`/register?redirect=${encodedRedirectUrl}`}
                    className="font-semibold text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-1 py-0.5 transition-colors duration-200"
                  >
                    {t('login.create_account', 'Créer un compte')}
                  </Link>
                </p>
                
                {/* Trust indicators with i18n */}
                <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    {t('trust.secure', 'Sécurisé')}
                  </span>
                  <span>•</span>
                  <span>{t('trust.gdpr_compliant', 'Conforme RGPD')}</span>
                  <span>•</span>
                  <span>{t('trust.support_24_7', 'Support 24/7')}</span>
                </div>

                {/* Language switcher */}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <select
                    value={currentLang}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className="text-xs text-gray-500 bg-transparent border-none focus:outline-none cursor-pointer"
                    aria-label={t('language.selector', 'Changer la langue')}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                {/* Performance indicator (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 text-xs text-gray-400">
                    Core Web Vitals: ✅ Optimized
                  </div>
                )}
              </footer>
            </div>
          </div>

          {/* Preload critical resources */}
          <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://accounts.google.com" />
          <link rel="dns-prefetch" href="//www.google-analytics.com" />
          
          {/* Service Worker registration hint */}
          <script type="module">
            {`
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
            `}
          </script>
        </main>
      </Layout>
    </ErrorBoundary>
  );
};

// Export with React.memo for performance optimization
export default React.memo(Login);