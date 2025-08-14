// src/pages/PasswordReset.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Globe, Smartphone, RefreshCw, Sparkles, Lock, Zap, ChevronRight } from 'lucide-react';
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
        fr: 'Oups, mot de passe oublié ? 🤔',
        en: 'Oops, forgot your password? 🤔'
      },
      'reset.subtitle': { 
        fr: 'Pas de panique ! On va t\'envoyer un lien magique ✨',
        en: 'No worries! We\'ll send you a magic link ✨'
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
        fr: 'Utilise l\'email de ton compte (celui que tu connais par cœur ! 💝)',
        en: 'Use your account email (the one you know by heart! 💝)'
      },
      'reset.submit_button': { 
        fr: 'Envoie-moi le lien ! 🎯',
        en: 'Send me the link! 🎯'
      },
      'reset.submitting': { 
        fr: 'C\'est parti... 🏃‍♂️',
        en: 'Here we go... 🏃‍♂️'
      },
      'reset.success_title': { 
        fr: 'C\'est parti ! 🚀',
        en: 'All set! 🚀'
      },
      'reset.success_message': { 
        fr: 'Si on te connaît (spoiler : on vérifie discrètement 🕵️), tu vas recevoir un super email avec un lien magique !',
        en: 'If we know you (spoiler: we\'re checking discretely 🕵️), you\'ll receive an awesome email with a magic link!'
      },
      'reset.success_note': { 
        fr: 'Patience, ça arrive ! Check tes spams aussi, parfois notre email fait une petite sieste là-bas 😴',
        en: 'Be patient, it\'s coming! Check your spam too, sometimes our email takes a nap there 😴'
      },
      'reset.security_info': {
        fr: '🤫 Psst... Pour ta sécurité, on fait semblant de rien même si on ne te connaît pas !',
        en: '🤫 Psst... For your security, we play it cool even if we don\'t know you!'
      },
      'reset.email_sent_label': {
        fr: '📬 On a envoyé la sauce à :',
        en: '📬 We sent the goods to:'
      },
      'reset.resend_button': { 
        fr: 'Renvoyer (au cas où 📮)',
        en: 'Resend (just in case 📮)'
      },
      'reset.different_email': { 
        fr: 'Essayer un autre email 🔄',
        en: 'Try another email 🔄'
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
        fr: 'Tes mots de passe ? On les garde secrets comme la recette du Coca ! 🔐',
        en: 'Your passwords? We keep them as secret as the Coca-Cola recipe! 🔐'
      },
      'info.process_steps': {
        fr: 'Comment ça marche ? 🎬',
        en: 'How does it work? 🎬'
      },
      'steps.step1': {
        fr: 'Tu mets ton email (le bon hein ! 😉)',
        en: 'You enter your email (the right one! 😉)'
      },
      'steps.step2': {
        fr: 'Tu cours checker tes emails 📧',
        en: 'You run to check your emails 📧'
      },
      'steps.step3': {
        fr: 'Tu cliques sur notre lien magique ✨',
        en: 'You click our magic link ✨'
      },
      'steps.step4': {
        fr: 'Tu choisis un nouveau mot de passe (costaud cette fois ! 💪)',
        en: 'You choose a new password (a strong one this time! 💪)'
      },
      'help.contact': {
        fr: 'Coincé ? 🆘',
        en: 'Stuck? 🆘'
      },
      'pwa.banner_title': {
        fr: 'Accès rapide et hors ligne',
        en: 'Quick and offline access'
      },
      'security.badge_text': {
        fr: 'Fort Knox niveau sécurité 🔒',
        en: 'Fort Knox level security 🔒'
      },
      'security.ninja_title': {
        fr: 'Sécurité niveau ninja 🥷',
        en: 'Ninja level security 🥷'
      },
      'help.team_message': {
        fr: 'Bloqué ? Pas de stress, notre équipe de super-héros est là ! 🦸‍♂️',
        en: 'Stuck? No stress, our superhero team is here! 🦸‍♂️'
      },
      'button.close': {
        fr: 'Fermer',
        en: 'Close'
      },
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">
          {t('error.title')}
        </h2>
        <p className="text-gray-300 mb-8 text-base leading-relaxed">
          {t('error.description')}
        </p>
        <Button 
          onClick={resetErrorBoundary} 
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25"
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
  
  // Type pour l'événement BeforeInstallPrompt
  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  };
  
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      const gtag = getGtag();
      if (gtag) {
        gtag('event', 'pwa_installed', {
          page: 'password_reset'
        });
      }
    }
    
    setInstallPrompt(null);
  };

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
      
      // Toujours afficher le succès (même si l'email n'existe pas)
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
      
      const code = (err as { code?: string })?.code;
      
      // Pour la sécurité : toujours afficher le succès même si l'email n'existe pas
      if (code === 'auth/user-not-found') {
        // On affiche quand même le succès pour ne pas révéler que l'email n'existe pas
        setIsSuccess(true);
        setLastSentEmail(formData.email);
        setCooldownTime(60);
        
        // Log en interne seulement
        console.log('Email not found but showing success for security');
        
      } else if (code === 'auth/too-many-requests') {
        setFormErrors({ general: t('error.too_many_requests') });
        setCooldownTime(300); // 5 minutes cooldown
      } else if (code === 'auth/invalid-email') {
        setFormErrors({ email: t('validation.email_invalid') });
      } else {
        // Pour les autres erreurs, on affiche un message générique
        setFormErrors({ general: t('error.description') });
      }
      
      // Error analytics (sans révéler si l'email existe)
      const gtag = getGtag();
      if (gtag && code !== 'auth/user-not-found') {
        gtag('event', 'password_reset_failed', {
          error_type: code || 'unknown',
          attempts: submitAttempts + 1
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
      `appearance-none block w-full px-5 py-4 text-base text-white border-2 rounded-2xl placeholder-gray-400 bg-gray-800/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-500/30 focus:border-red-500 hover:border-gray-500 hover:bg-gray-800/70 ${
        formErrors[fieldName]
          ? 'border-red-400 bg-red-900/30 ring-4 ring-red-500/20'
          : 'border-gray-600'
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
        <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
          </div>

          {/* Offline banner */}
          {!isOnline && (
            <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-3 text-center text-sm font-bold z-50 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2">
                <Globe className="inline h-5 w-5 animate-pulse" />
                <span>{t('offline.message')}</span>
              </div>
            </div>
          )}

          {/* PWA Install Banner */}
          {installPrompt && (
            <div className="fixed bottom-6 left-6 right-6 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white p-5 rounded-3xl shadow-2xl z-40 sm:max-w-md sm:mx-auto border border-white/20 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-black">{t('pwa.install')}</p>
                    <p className="text-sm text-red-100">{t('pwa.banner_title')}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleInstallApp}
                    className="bg-white text-red-600 px-5 py-2.5 rounded-2xl text-sm font-black hover:bg-gray-100 transition-all duration-300 hover:scale-105"
                  >
                    {t('pwa.install_button')}
                  </button>
                  <button
                    onClick={() => setInstallPrompt(null)}
                    className="text-red-100 hover:text-white p-2.5 rounded-2xl hover:bg-white/10 transition-all duration-300"
                    aria-label={t('button.close')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg">
            {/* Header optimisé mobile-first */}
            <header className="text-center mb-10">
              {/* Badge moderne */}
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 border border-white/20 mb-8">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold text-sm">{t('security.badge_text')}</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>

              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/25 transform hover:scale-110 transition-transform duration-300">
                <RefreshCw className="w-12 h-12 text-white" />
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight mb-4">
                {t('reset.title')}
              </h1>
              
              <p className="text-lg text-gray-300 max-w-md mx-auto leading-relaxed mb-6">
                {t('reset.subtitle')}
              </p>
              
              <Link
                to="/login"
                className="group inline-flex items-center text-base font-bold text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 rounded-xl px-4 py-3 transition-all duration-300"
              >
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                {t('reset.back_to_login')}
              </Link>
            </header>
          </div>

          <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg">
            <div className="bg-white/10 backdrop-blur-xl py-10 px-8 shadow-2xl sm:rounded-3xl border border-white/20 relative overflow-hidden">
              {/* Gradient accent top */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
              
              {/* Security indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="inline-flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-500/30">
                  <Shield className="h-5 w-5 text-green-400" aria-hidden="true" />
                  <span className="text-sm text-green-300 font-semibold">
                    {t('security.ssl')}
                  </span>
                </div>
              </div>

              {/* Success State */}
              {isSuccess ? (
                <div className="text-center space-y-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/25">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-black text-white mb-3">
                      {t('reset.success_title')}
                    </h2>
                    <p className="text-gray-300 text-base leading-relaxed mb-6">
                      {t('reset.success_message')}
                    </p>
                    
                    {/* Security notice */}
                    <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-4 mb-6">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0 mr-3" />
                        <p className="text-amber-200 text-sm leading-relaxed">
                          {t('reset.security_info')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-5">
                      <p className="text-blue-300 text-sm font-semibold mb-2">
                        {t('reset.email_sent_label')}
                      </p>
                      <p className="text-blue-200 font-black text-lg break-all">
                        {lastSentEmail}
                      </p>
                    </div>
                    <p className="text-gray-400 text-sm mt-5">
                      {t('reset.success_note')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handleResend}
                      disabled={cooldownTime > 0}
                      fullWidth
                      size="large"
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black py-4 px-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {cooldownTime > 0 ? (
                        <span className="flex items-center justify-center">
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          {t('button.wait')} {cooldownTime}s
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
                      className="border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/40 font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                    >
                      {t('reset.different_email')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                  {/* Enhanced error display */}
                  {formErrors.general && (
                    <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 p-5 rounded-2xl" role="alert">
                      <div className="flex">
                        <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="ml-3">
                          <h3 className="text-base font-black text-red-300 mb-1">
                            {t('error.title')}
                          </h3>
                          <div className="text-sm text-red-200 leading-relaxed">
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
                      className="block text-base font-bold text-white mb-3"
                    >
                      {t('reset.email_label')}
                      <span className="text-red-400 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
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
                        className={`${inputClass('email')} pl-12 pr-4`}
                        placeholder={t('reset.email_placeholder')}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-3 text-sm text-red-400 flex items-center">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                        {formErrors.email}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-gray-400">
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
                      className={`py-5 text-lg font-black rounded-2xl transition-all duration-300 transform min-h-[64px] ${
                        isFormValid && !isLoading && isOnline && cooldownTime === 0
                          ? 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:via-red-600 hover:to-orange-600 text-white shadow-2xl hover:shadow-red-500/50 hover:scale-105 active:scale-[0.98] focus:ring-4 focus:ring-red-500/30'
                          : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/10'
                      }`}
                      disabled={!isFormValid || isLoading || !isOnline || cooldownTime > 0}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white mr-3" />
                          {t('reset.submitting')}
                        </div>
                      ) : cooldownTime > 0 ? (
                        <div className="flex items-center justify-center">
                          <RefreshCw size={22} className="mr-3 animate-spin" aria-hidden="true" />
                          {t('button.wait')} {cooldownTime}s
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Mail size={22} className="mr-3" aria-hidden="true" />
                          {t('reset.submit_button')}
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Info Section avec design moderne */}
              <div className="mt-10 space-y-6">
                {/* Process Steps */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-5 border border-blue-500/20">
                  <h3 className="text-base font-black text-blue-300 mb-4 flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    {t('info.process_steps')}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black mr-3 mt-0.5 flex-shrink-0">1</span>
                      <span className="text-gray-300">{t('steps.step1')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black mr-3 mt-0.5 flex-shrink-0">2</span>
                      <span className="text-gray-300">{t('steps.step2')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black mr-3 mt-0.5 flex-shrink-0">3</span>
                      <span className="text-gray-300">{t('steps.step3')}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black mr-3 mt-0.5 flex-shrink-0">4</span>
                      <span className="text-gray-300">{t('steps.step4')}</span>
                    </div>
                  </div>
                </div>

                {/* Security Note */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-5 border border-green-500/20">
                  <div className="flex items-start">
                    <Shield className="h-6 w-6 text-green-400 mt-0.5 flex-shrink-0 mr-3" />
                    <div>
                      <h4 className="text-base font-black text-green-300 mb-2">
                        {t('security.ninja_title')}
                      </h4>
                      <p className="text-sm text-green-200 leading-relaxed">
                        {t('info.security_note')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Help Section */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-5 border border-purple-500/20">
                  <div className="flex items-start">
                    <Sparkles className="h-6 w-6 text-purple-400 mt-0.5 flex-shrink-0 mr-3" />
                    <div>
                      <h4 className="text-base font-black text-purple-300 mb-2">
                        {t('help.contact')}
                      </h4>
                      <p className="text-sm text-purple-200 mb-3">
                        {t('help.team_message')}
                      </p>
                      <Link 
                        to="/contact" 
                        className="inline-flex items-center text-sm text-purple-300 hover:text-purple-200 font-bold transition-colors group"
                      >
                        {t('help.contact_support')}
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
                  <span className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-green-400" />
                    {t('trust.secure')}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                    {t('trust.support_24_7')}
                  </span>
                </div>

                {/* Performance indicator (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 text-center">
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