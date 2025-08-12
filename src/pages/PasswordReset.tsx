// src/pages/PasswordReset.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Globe, Smartphone, RefreshCw } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

interface FormData {
  email: string;
}

interface FormErrors {
  email?: string;
  general?: string;
}


/** gtag typé (évite any et les redéclarations globales) */
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
        fr: 'Réinitialisation du mot de passe - SOS Expats | Récupération de compte',
        en: 'Password Reset - SOS Expats | Account Recovery'
      },
      'meta.description': { 
        fr: 'Réinitialisez votre mot de passe SOS Expats en toute sécurité. Récupérez l\'accès à votre compte d\'assistance aux expatriés en quelques clics.',
        en: 'Reset your SOS Expats password securely. Recover access to your expat assistance account in just a few clicks.'
      },
      'meta.keywords': { 
        fr: 'réinitialisation mot de passe, récupération compte, SOS Expats, expatriés, sécurité',
        en: 'password reset, account recovery, SOS Expats, expats, security'
      },
      'meta.og_title': { 
        fr: 'Réinitialisation sécurisée - SOS Expats',
        en: 'Secure Password Reset - SOS Expats'
      },
      'meta.og_description': { 
        fr: 'Récupérez l\'accès à votre compte SOS Expats de manière sécurisée. Processus simple et rapide.',
        en: 'Securely recover access to your SOS Expats account. Simple and fast process.'
      },
      'meta.og_image_alt': { 
        fr: 'Réinitialisation mot de passe SOS Expats',
        en: 'SOS Expats password reset'
      },
      'meta.twitter_image_alt': { 
        fr: 'Interface de réinitialisation SOS Expats',
        en: 'SOS Expats password reset interface'
      },
      'reset.title': { 
        fr: 'Réinitialiser votre mot de passe',
        en: 'Reset your password'
      },
      'reset.subtitle': { 
        fr: 'Nous vous enverrons un lien de réinitialisation par email',
        en: 'We\'ll send you a reset link via email'
      },
      'reset.back_to_login': { 
        fr: 'Retour à la connexion',
        en: 'Back to login'
      },
      'reset.email_label': { 
        fr: 'Adresse email',
        en: 'Email address'
      },
      'reset.email_placeholder': { 
        fr: 'votre@email.com',
        en: 'your@email.com'
      },
      'reset.email_help': { 
        fr: 'Utilisez l\'email de votre compte',
        en: 'Use your account email address'
      },
      'reset.submit_button': { 
        fr: 'Envoyer le lien de réinitialisation',
        en: 'Send reset link'
      },
      'reset.submitting': { 
        fr: 'Envoi en cours...',
        en: 'Sending...'
      },
      'reset.success_title': { 
        fr: 'Email envoyé avec succès !',
        en: 'Email sent successfully!'
      },
      'reset.success_message': { 
        fr: 'Vérifiez votre boîte email et suivez les instructions pour réinitialiser votre mot de passe.',
        en: 'Check your email inbox and follow the instructions to reset your password.'
      },
      'reset.success_note': { 
        fr: 'Le lien est valide pendant 24 heures. Vérifiez aussi vos spams.',
        en: 'The link is valid for 24 hours. Also check your spam folder.'
      },
      'reset.resend_button': { 
        fr: 'Renvoyer l\'email',
        en: 'Resend email'
      },
      'reset.different_email': { 
        fr: 'Utiliser une autre adresse',
        en: 'Use different email'
      },
      'validation.email_required': { 
        fr: 'L\'adresse email est requise',
        en: 'Email address is required'
      },
      'validation.email_invalid': { 
        fr: 'Format d\'email invalide',
        en: 'Invalid email format'
      },
      'error.title': { 
        fr: 'Erreur de réinitialisation',
        en: 'Reset error'
      },
      'error.description': { 
        fr: 'Une erreur est survenue. Veuillez réessayer.',
        en: 'An error occurred. Please try again.'
      },
      'error.retry': { 
        fr: 'Réessayer',
        en: 'Retry'
      },
      'error.offline': { 
        fr: 'Connexion internet requise',
        en: 'Internet connection required'
      },
      'error.user_not_found': { 
        fr: 'Aucun compte trouvé avec cette adresse email',
        en: 'No account found with this email address'
      },
      'error.too_many_requests': { 
        fr: 'Trop de tentatives. Attendez avant de réessayer.',
        en: 'Too many attempts. Please wait before trying again.'
      },
      'loading.message': { 
        fr: 'Traitement en cours...',
        en: 'Processing...'
      },
      'offline.message': { 
        fr: 'Mode hors ligne - Connexion requise pour la réinitialisation',
        en: 'Offline mode - Connection required for password reset'
      },
      'pwa.install': { 
        fr: 'Installer l\'app',
        en: 'Install app'
      },
      'pwa.install_button': { 
        fr: 'Installer',
        en: 'Install'
      },
      'security.ssl': { 
        fr: 'Connexion sécurisée SSL',
        en: 'Secure SSL connection'
      },
      'trust.secure': { 
        fr: 'Sécurisé',
        en: 'Secure'
      },
      'trust.support_24_7': { 
        fr: 'Support 24/7',
        en: '24/7 Support'
      },
      'language.selector': { 
        fr: 'Changer la langue',
        en: 'Change language'
      },
      'form.required': { 
        fr: 'requis',
        en: 'required'
      },
      'info.why_reset': {
        fr: 'Pourquoi réinitialiser ?',
        en: 'Why reset?'
      },
      'info.security_note': {
        fr: 'Pour votre sécurité, nous ne stockons jamais vos mots de passe en clair.',
        en: 'For your security, we never store your passwords in plain text.'
      },
      'info.process_steps': {
        fr: 'Processus de réinitialisation',
        en: 'Reset process'
      },
      'steps.step1': {
        fr: '1. Saisissez votre email',
        en: '1. Enter your email'
      },
      'steps.step2': {
        fr: '2. Vérifiez votre boîte mail',
        en: '2. Check your inbox'
      },
      'steps.step3': {
        fr: '3. Cliquez sur le lien reçu',
        en: '3. Click the received link'
      },
      'steps.step4': {
        fr: '4. Créez un nouveau mot de passe',
        en: '4. Create a new password'
      },
      'help.contact': {
        fr: 'Besoin d\'aide ?',
        en: 'Need help?'
      },
      'help.contact_support': {
        fr: 'Contactez notre support',
        en: 'Contact our support'
      }
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
      return <this.props.FallbackComponent error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />;
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('error.title')}
        </h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          {t('error.description')}
        </p>
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

const PasswordReset: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, authInitialized } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: searchParams.get('email') || ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSentEmail, setLastSentEmail] = useState<string>('');
  const [cooldownTime, setCooldownTime] = useState(0);

  const currentLang = language || 'fr';

  // Performance monitoring
  useEffect(() => {
    const markStart = performance.now();
    return () => {
      const markEnd = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`PasswordReset rendered in ${(markEnd - markStart).toFixed(2)}ms`);
      }
    };
  }, []);


  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline, { passive: true });
    window.addEventListener('offline', handleOffline, { passive: true });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  // Redirect if already logged in
  useEffect(() => {
    if (authInitialized && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authInitialized, user, navigate]);

  // SEO & Social Media Meta Data with i18n
  const metaData = useMemo(() => ({
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: t('meta.keywords'),
    ogTitle: t('meta.og_title'),
    ogDescription: t('meta.og_description'),
    canonicalUrl: `${window.location.origin}/${currentLang}/password-reset`,
    alternateUrls: {
      fr: `${window.location.origin}/fr/password-reset`,
      en: `${window.location.origin}/en/password-reset`
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${window.location.origin}/${currentLang}/password-reset#webpage`,
      "name": t('meta.title'),
      "description": t('meta.description'),
      "url": `${window.location.origin}/${currentLang}/password-reset`,
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
        "@type": "Action",
        "@id": `${window.location.origin}/${currentLang}/password-reset#resetaction`,
        "name": t('reset.title'),
        "description": t('reset.subtitle'),
        "target": `${window.location.origin}/${currentLang}/password-reset`,
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
            "name": "Connexion",
            "item": `${window.location.origin}/${currentLang}/login`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": t('reset.title'),
            "item": `${window.location.origin}/${currentLang}/password-reset`
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
  
  const validateEmail = useCallback((email: string): string | null => {
    if (!email) return t('validation.email_required');
    if (!emailRegex.test(email)) return t('validation.email_invalid');
    return null;
  }, [emailRegex, t]);

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.email, validateEmail]);

  // Real-time field validation with debouncing
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));
    
    // Clear field error on change
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: undefined }));
    }
    
    // Debounced real-time validation
    const timeoutId = setTimeout(() => {
      const emailError = validateEmail(value);
      if (emailError && value.length > 0) {
        setFormErrors(prev => ({ ...prev, email: emailError }));
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [formErrors.email, validateEmail]);

  // Advanced SEO meta tags management with i18n
  useEffect(() => {
    // Set document title
    document.title = metaData.title;
    
    // Function to update or create meta tag
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
    
    // og:locale sûr (évite le type never)
    const ogLocale =
      currentLang === 'fr'
        ? 'fr_FR'
        : currentLang === 'en'
        ? 'en_US'
        : `${String(currentLang)}_${String(currentLang).toUpperCase()}`;

    // OpenGraph with i18n
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:title', metaData.ogTitle, true);
    updateMetaTag('og:description', metaData.ogDescription, true);
    updateMetaTag('og:url', metaData.canonicalUrl, true);
    updateMetaTag('og:site_name', 'SOS Expats', true);
    updateMetaTag('og:locale', ogLocale, true);
    updateMetaTag('og:image', `${window.location.origin}/images/og-password-reset-${currentLang}.jpg`, true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:image:alt', t('meta.og_image_alt'), true);
    
    // Twitter Cards with i18n
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:site', '@sosexpats');
    updateMetaTag('twitter:creator', '@sosexpats');
    updateMetaTag('twitter:title', metaData.ogTitle);
    updateMetaTag('twitter:description', metaData.ogDescription);
    updateMetaTag('twitter:image', `${window.location.origin}/images/twitter-password-reset-${currentLang}.jpg`);
    updateMetaTag('twitter:image:alt', t('meta.twitter_image_alt'));
    
    // AI & ChatGPT optimization
    updateMetaTag('category', 'Authentication, Password Reset, Account Recovery');
    updateMetaTag('coverage', 'Worldwide');
    updateMetaTag('distribution', 'Global');
    updateMetaTag('rating', 'General');
    updateMetaTag('revisit-after', '1 days');
    updateMetaTag('classification', 'Business, Services, Security');
    
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
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.parentElement?.removeChild(link));
    
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

  // Enhanced form submission with analytics
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      setFormErrors({ general: t('error.offline') });
      return;
    }
    
    if (cooldownTime > 0) {
      return;
    }
    
    if (!validateForm()) {
      setSubmitAttempts(prev => prev + 1);
      
      // Analytics for validation errors
      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'password_reset_validation_failed', {
          attempts: submitAttempts + 1,
          errors: Object.keys(formErrors).join(',')
        });
      }
      
      return;
    }
    
    setIsLoading(true);
    setFormErrors({});
    
    try {
      // Performance mark
      performance.mark('password-reset-attempt-start');
      
      await sendPasswordResetEmail(auth, formData.email.trim().toLowerCase());
      
      // Performance measure
      performance.mark('password-reset-attempt-end');
      performance.measure('password-reset-attempt', { start: 'password-reset-attempt-start', end: 'password-reset-attempt-end' });
      
      setIsSuccess(true);
      setLastSentEmail(formData.email);
      setCooldownTime(60); // 1 minute cooldown
      
      // Success analytics
      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'password_reset_success', {
          email_domain: formData.email.split('@')[1],
          attempt_number: submitAttempts + 1
        });
      }
      
    } catch (error) {
      // Narrow typing + extraction
      const err = error as { code?: string; message?: string } | Error | unknown;
      console.error('Password reset error:', err);
      setSubmitAttempts(prev => prev + 1);
      
      let errorMessage = t('error.description');
      
      // Firebase specific error handling
      const code = (err as { code?: string })?.code;
      if (code) {
        switch (code) {
          case 'auth/user-not-found':
            errorMessage = t('error.user_not_found');
            break;
          case 'auth/too-many-requests':
            errorMessage = t('error.too_many_requests');
            setCooldownTime(300); // 5 minutes cooldown
            break;
          case 'auth/invalid-email':
            setFormErrors({ email: t('validation.email_invalid') });
            setIsLoading(false);
            return;
          default:
            errorMessage = t('error.description');
        }
      }
      
      setFormErrors({ general: errorMessage });
      
      // Error analytics
      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'password_reset_failed', {
          error_type: code || 'unknown',
          attempts: submitAttempts + 1,
          email_domain: formData.email.split('@')[1]
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData.email, validateForm, submitAttempts, isOnline, t, formErrors, cooldownTime]);

  // Resend email
  const handleResend = useCallback(() => {
    setIsSuccess(false);
    setFormData({ email: lastSentEmail });
    setCooldownTime(0);
  }, [lastSentEmail]);

  // Use different email
  const handleDifferentEmail = useCallback(() => {
    setIsSuccess(false);
    setFormData({ email: '' });
    setLastSentEmail('');
    setCooldownTime(0);
  }, []);


  // Classes CSS pour inputs (clé typée)
  const inputClass = useCallback(
    (fieldName: keyof FormErrors) =>
      `appearance-none block w-full px-4 py-3.5 text-base border rounded-xl placeholder-gray-400 bg-white text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-gray-400 ${
        formErrors[fieldName]
          ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
          : 'border-gray-300'
      }`,
    [formErrors]
  );

  const isFormValid = !formErrors.email && formData.email && emailRegex.test(formData.email);

  if (authInitialized && user) {
    return null;
  }

  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback} 
      onError={(error, errorInfo) => {
        const gtag = getGtag();
        if (gtag) {
          gtag('event', 'password_reset_error_boundary', {
            error: error.message,
            component_stack: errorInfo.componentStack
          });
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

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Header optimisé mobile-first */}
            <header className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <RefreshCw className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-3">
                {t('reset.title')}
              </h1>
              
              <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed mb-4">
                {t('reset.subtitle')}
              </p>
              
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-3 py-2 transition-all duration-200 underline decoration-2 underline-offset-2 hover:decoration-red-700"
              >
                <ArrowLeft size={16} className="mr-2" />
                {t('reset.back_to_login')}
              </Link>
            </header>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100 relative overflow-hidden">
              {/* Security indicator */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-red-500" />
              
              <div className="flex items-center justify-center mb-6">
                <Shield className="h-5 w-5 text-green-500 mr-2" aria-hidden="true" />
                <span className="text-xs text-gray-500 font-medium">
                  {t('security.ssl')}
                </span>
              </div>

              {/* Success State */}
              {isSuccess ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {t('reset.success_title')}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {t('reset.success_message')}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm font-medium mb-2">
                        📧 Email envoyé à :
                      </p>
                      <p className="text-blue-900 font-semibold break-all">
                        {lastSentEmail}
                      </p>
                    </div>
                    <p className="text-gray-500 text-xs mt-4">
                      {t('reset.success_note')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleResend}
                      disabled={cooldownTime > 0}
                      fullWidth
                      size="large"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {cooldownTime > 0 ? (
                        <span className="flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Attendre {cooldownTime}s
                        </span>
                      ) : (
                        t('reset.resend_button')
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleDifferentEmail}
                      fullWidth
                      variant="outline"
                      size="large"
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      {t('reset.different_email')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {/* Enhanced error display */}
                  {formErrors.general && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl" role="alert">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="ml-3">
                          <h3 className="text-sm font-semibold text-red-800 mb-1">
                            {t('error.title')}
                          </h3>
                          <div className="text-sm text-red-700 leading-relaxed">
                            {formErrors.general}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email field */}
                  <div>
                    <label 
                      htmlFor="email" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t('reset.email_label')}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleEmailChange}
                        className={`${inputClass('email')} pl-10`}
                        placeholder={t('reset.email_placeholder')}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle size={16} className="mr-1 flex-shrink-0" />
                        {formErrors.email}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      {t('reset.email_help')}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <Button
                      type="submit"
                      loading={isLoading}
                      fullWidth
                      size="large"
                      className={`py-4 text-base font-bold rounded-xl transition-all duration-300 transform min-h-[56px] ${
                        isFormValid && !isLoading && isOnline && cooldownTime === 0
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-red-500/50'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-md'
                      }`}
                      disabled={!isFormValid || isLoading || !isOnline || cooldownTime > 0}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3" />
                          {t('reset.submitting')}
                        </div>
                      ) : cooldownTime > 0 ? (
                        <div className="flex items-center justify-center">
                          <RefreshCw size={20} className="mr-3 animate-spin" aria-hidden="true" />
                          Attendre {cooldownTime}s
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Mail size={20} className="mr-3" aria-hidden="true" />
                          {t('reset.submit_button')}
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Info Section */}
              <div className="mt-8 space-y-6">
                {/* Process Steps */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('info.process_steps')}
                  </h3>
                  <div className="space-y-2 text-xs text-blue-800">
                    <div className="flex items-start">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                      <span>{t('steps.step1')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                      <span>{t('steps.step2')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                      <span>{t('steps.step3')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                      <span>{t('steps.step4')}</span>
                    </div>
                  </div>
                </div>

                {/* Security Note */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0 mr-3" />
                    <div>
                      <h4 className="text-sm font-semibold text-green-900 mb-1">
                        🔒 Sécurité garantie
                      </h4>
                      <p className="text-xs text-green-800 leading-relaxed">
                        {t('info.security_note')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Help Section */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0 mr-3" />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {t('help.contact')}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        Si vous rencontrez des difficultés, notre équipe est là pour vous aider.
                      </p>
                      <Link 
                        to="/contact" 
                        className="text-xs text-red-600 hover:text-red-700 underline font-medium"
                      >
                        {t('help.contact_support')}
                      </Link>
                    </div>
                  </div>
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
                  <div className="text-xs text-gray-400 text-center">
                    ⚡ Optimized for Core Web Vitals
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preload critical resources */}
          <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
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
export default React.memo(PasswordReset);


