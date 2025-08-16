import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Send, CheckCircle, Mail, Globe, MapPin, MessageCircle, User, Calendar, Flag, Languages as LanguagesIcon, AlertCircle, ChevronDown, Heart, Zap, Sparkles, Phone, Star, ArrowRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useApp } from '../contexts/AppContext';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Interface pour Navigator avec connection
interface NavigatorConnection {
  connection?: {
    effectiveType?: string;
  };
}

// Interface pour les données du formulaire
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  customCountryCode: string;
  phoneNumber: string;
  originCountry: string;
  interventionCountry: string;
  nationalities: string;
  subject: string;
  category: string;
  message: string;
}

// Interface pour les erreurs de validation
interface FormErrors {
  [key: string]: string;
}

const Contact: React.FC = () => {
  const { language } = useApp();
  const lang = (language as 'fr' | 'en') || 'fr';
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneCountryCode: '+33',
    customCountryCode: '',
    phoneNumber: '',
    originCountry: '',
    interventionCountry: '',
    nationalities: '',
    subject: '',
    category: '',
    message: ''
  });
  
  // State séparé pour les langues parlées (format array simple)
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [languagesDropdownOpen, setLanguagesDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formStartTime] = useState(Date.now());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Optimisations performance et accessibility
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }
  }, []);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.group')) {
        setLanguagesDropdownOpen(false);
      }
    };

    if (languagesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [languagesDropdownOpen]);

  // Scroll vers le haut lors de la soumission réussie
  useEffect(() => {
    if (isSubmitted) {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  }, [isSubmitted]);

  // Textes i18n avec ton fun et jovial
  const t = useMemo(() => ({
    // Meta & SEO
    metaTitle: lang === 'fr' ? 'On vous écoute ! • SOS Expats' : 'We\'re all ears! • SOS Expats',
    metaDesc: lang === 'fr' 
      ? 'Une question ? Un souci ? Notre équipe sympa est là pour vous aider avec le sourire ✨'
      : 'Got a question? Need help? Our friendly team is here to help with a smile ✨',
    
    // Header fun
    pageTitle: lang === 'fr' ? 'On vous écoute !' : 'We\'re all ears!',
    pageSubtitle: lang === 'fr' 
      ? 'Notre équipe super sympa est là pour vous 🤗'
      : 'Our super friendly team is here for you 🤗',
    pageDescription: lang === 'fr' 
      ? 'Une question ? Un pépin ? Envoyez-nous un petit message et on revient vers vous en mode turbo ! 🚀'
      : 'Got a question? A little hiccup? Drop us a message and we\'ll get back to you super fast! 🚀',
    
    // Form labels avec émojis
    firstName: lang === 'fr' ? 'Votre prénom' : 'Your first name',
    lastName: lang === 'fr' ? 'Votre nom' : 'Your last name',
    email: lang === 'fr' ? 'Votre email' : 'Your email',
    phoneNumber: lang === 'fr' ? 'Votre téléphone' : 'Your phone',
    customCode: lang === 'fr' ? 'Indicatif personnalisé' : 'Custom country code',
    originCountry: lang === 'fr' ? 'D\'où venez-vous ?' : 'Where are you from?',
    interventionCountry: lang === 'fr' ? 'Où vous faut-il de l\'aide ?' : 'Where do you need help?',
    spokenLanguages: lang === 'fr' ? 'Vos langues magiques' : 'Your magical languages',
    nationalities: lang === 'fr' ? 'Vos nationalités' : 'Your nationalities',
    category: lang === 'fr' ? 'Type de demande' : 'Request type',
    subject: lang === 'fr' ? 'Le sujet en bref' : 'Subject in brief',
    message: lang === 'fr' ? 'Votre message' : 'Your message',
    
    // Placeholders fun
    firstNamePlaceholder: lang === 'fr' ? 'Comment on vous appelle ? 😊' : 'What should we call you? 😊',
    lastNamePlaceholder: lang === 'fr' ? 'Votre nom de famille...' : 'Your family name...',
    emailPlaceholder: lang === 'fr' ? 'votre@email.com' : 'your@email.com',
    phonePlaceholder: '06 12 34 56 78',
    customCodePlaceholder: lang === 'fr' ? 'Ex: +225' : 'Ex: +225',
    originCountryPlaceholder: lang === 'fr' ? 'France' : 'France',
    interventionCountryPlaceholder: lang === 'fr' ? 'Où avez-vous besoin d\'un coup de main ?' : 'Where do you need a helping hand?',
    nationalitiesPlaceholder: lang === 'fr' ? 'Française, Belge...' : 'French, Belgian...',
    subjectPlaceholder: lang === 'fr' ? 'En quelques mots... ✨' : 'In a few words... ✨',
    messagePlaceholder: lang === 'fr' 
      ? 'Racontez-nous tout ! Plus c\'est détaillé, mieux on peut vous aider 🎯'
      : 'Tell us everything! The more detailed, the better we can help you 🎯',
    
    // Buttons
    sendMessage: lang === 'fr' ? 'Envoyer avec amour' : 'Send with love',
    sending: lang === 'fr' ? 'Envoi en cours... ⏳' : 'Sending... ⏳',
    sendAnother: lang === 'fr' ? 'Envoyer un autre message' : 'Send another message',
    backHome: lang === 'fr' ? 'Retour à l\'accueil' : 'Back to home',
    
    // Success messages
    messageSent: lang === 'fr' ? 'Message envoyé ! 🎉' : 'Message sent! 🎉',
    messageReceived: lang === 'fr'
      ? 'Super ! On a bien reçu votre message. Notre équipe va vous répondre très vite !'
      : 'Great! We received your message. Our team will respond very quickly!',
    
    // Contact info fun
    contactInfo: lang === 'fr' ? 'Comment on peut vous aider' : 'How we can help you',
    sosService: lang === 'fr' ? 'Service S.O.S Express' : 'S.O.S Express Service',
    available247: lang === 'fr' ? 'Toujours là pour vous !' : 'Always here for you!',
    quickResponse: lang === 'fr' ? 'Réponse ultra-rapide' : 'Lightning-fast response',
    usually24h: lang === 'fr' ? 'Généralement sous 24h !' : 'Usually within 24h!',
    multilingualSupport: lang === 'fr' ? 'Support multilingue' : 'Multilingual support',
    multipleLanguages: lang === 'fr' ? 'Français maintenant, autres langues très bientôt !' : 'French now, other languages very soon!',
    
    // Form
    formTitle: lang === 'fr' ? 'Envoyez-nous un petit message !' : 'Drop us a little message!',
    formDescription: lang === 'fr' ? 'Quelques infos et c\'est parti 🚀' : 'Just a few details and we\'re off! 🚀',
    selectCategory: lang === 'fr' ? 'Choisissez votre catégorie...' : 'Pick your category...',
    responseTime: lang === 'fr' ? 'Temps de réponse' : 'Response time',
    maxTime: lang === 'fr' ? 'Super rapide ⚡' : 'Super fast ⚡',
    secureData: lang === 'fr' 
      ? 'Vos données sont en sécurité absolue avec nous 🔒' 
      : 'Your data is absolutely safe with us 🔒',
    
    // Progress
    progressTitle: lang === 'fr' ? 'Votre progression' : 'Your progress',
    almostThere: lang === 'fr' ? 'Vous y êtes presque !' : 'You\'re almost there!',
    
    // Errors fun
    errorSending: lang === 'fr' 
      ? 'Oups ! Petit souci technique. Pouvez-vous réessayer ? 🙏'
      : 'Oops! Small technical hiccup. Can you try again? 🙏',
    
    // Validation errors with emojis
    required: lang === 'fr' ? 'Ce petit champ nous manque 🥺' : 'We need this little field 🥺',
    invalidEmail: lang === 'fr' ? 'Cette adresse email a l\'air bizarre 🤔' : 'This email looks a bit off 🤔',
    invalidPhone: lang === 'fr' ? 'Ce numéro ne nous semble pas correct 📱' : 'This number doesn\'t look right 📱',
    invalidCustomCode: lang === 'fr' ? 'L\'indicatif doit commencer par + 📞' : 'Country code must start with + 📞',
    selectLanguages: lang === 'fr' ? 'Choisissez au moins une langue 🗣️' : 'Pick at least one language 🗣️',
    acceptTermsRequired: lang === 'fr' ? 'Un petit clic sur les conditions, s\'il vous plaît 📋' : 'A little click on the terms, please 📋',
    formHasErrors: lang === 'fr' ? 'Quelques petites retouches et c\'est parfait ! ✨' : 'A few little tweaks and it\'s perfect! ✨',
    
    // Terms and conditions
    acceptTerms: lang === 'fr' ? 'J\'accepte les' : 'I accept the',
    termsAndConditions: lang === 'fr' ? 'conditions générales' : 'terms and conditions',
    termsLink: '/conditions-generales-clients',
    
    // Other
    other: lang === 'fr' ? 'Autre' : 'Other',
    
    // Fun helpers
    helpTitle: lang === 'fr' ? 'Petite aide' : 'Little help',
    completeFields: lang === 'fr' ? 'Champs à compléter' : 'Fields to complete',
  }), [lang]);

  // Validation du formulaire
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    // Validation des champs obligatoires
    if (!formData.firstName.trim()) errors.firstName = t.required;
    if (!formData.lastName.trim()) errors.lastName = t.required;
    if (!formData.email.trim()) errors.email = t.required;
    if (!formData.phoneNumber.trim()) errors.phoneNumber = t.required;
    if (!formData.originCountry.trim()) errors.originCountry = t.required;
    if (!formData.interventionCountry.trim()) errors.interventionCountry = t.required;
    if (!formData.nationalities.trim()) errors.nationalities = t.required;
    if (!formData.subject.trim()) errors.subject = t.required;
    if (!formData.category) errors.category = t.required;
    if (!formData.message.trim()) errors.message = t.required;

    // Validation de l'email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t.invalidEmail;
    }

    // Validation du téléphone
    if (formData.phoneNumber && !/^[\d\s\-+()]{6,}$/.test(formData.phoneNumber)) {
      errors.phoneNumber = t.invalidPhone;
    }

    // Validation de l'indicatif personnalisé
    if (formData.phoneCountryCode === '+other') {
      if (!formData.customCountryCode.trim()) {
        errors.customCountryCode = t.required;
      } else if (!formData.customCountryCode.startsWith('+')) {
        errors.customCountryCode = t.invalidCustomCode;
      }
    }

    // Validation des langues parlées
    if (spokenLanguages.length === 0) {
      errors.spokenLanguages = t.selectLanguages;
    }

    // Validation des conditions générales
    if (!acceptTerms) {
      errors.acceptTerms = t.acceptTermsRequired;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, spokenLanguages, t]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [formErrors]);

  // Liste des langues disponibles
  const availableLanguages = useMemo(() => [
    'Français', 'English', 'العربية', 'Español', 'Italiano', 'Deutsch', 
    'Português', '中文', '日本語', '한국어', 'Русский', 'Nederlands', 
    'Polski', 'Türkçe', 'Svenska', 'Norsk', 'Dansk', 'Suomi',
    'Ελληνικά', 'हिन्दी', 'Čeština', 'Slovenčina', 'Magyar',
    'Română', 'Hrvatski', 'Srpski', 'Български', 'Lietuvių',
    'Latviešu', 'Eesti', 'Slovenščina', 'עברית', 'فارسی',
    'ไทย', 'Tiếng Việt', 'Bahasa Indonesia', 'Bahasa Malaysia',
    'Filipino'
  ], []);

  // Fonction pour gérer les changements de langues
  const handleLanguageToggle = useCallback((language: string) => {
    setSpokenLanguages(prev => {
      if (prev.includes(language)) {
        return prev.filter(lang => lang !== language);
      } else {
        return [...prev, language];
      }
    });
    
    // Effacer l'erreur des langues
    if (formErrors.spokenLanguages) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.spokenLanguages;
        return newErrors;
      });
    }
  }, [formErrors.spokenLanguages]);

  const getPhoneCode = useCallback(() => {
    return formData.phoneCountryCode === '+other' ? formData.customCountryCode : formData.phoneCountryCode;
  }, [formData.phoneCountryCode, formData.customCountryCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation du formulaire
    if (!validateForm()) {
      setShowErrors(true);
      // Scroll vers la première erreur
      const firstErrorElement = document.querySelector('.error-field');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
      return;
    }

    setIsLoading(true);
    setShowErrors(false);

    try {
      // Analytics de completion time
      const completionTime = Date.now() - formStartTime;

      // Vérifier si l'utilisateur existe déjà
      const usersQuery = query(
        collection(db, 'users'), 
        where('email', '==', formData.email)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      let userInfo = null;
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        userInfo = {
          isExistingUser: true,
          userId: usersSnapshot.docs[0].id,
          userSince: userData.createdAt || userData.registrationDate || null,
          userType: userData.userType || 'unknown'
        };
      } else {
        userInfo = {
          isExistingUser: false,
          userId: null,
          userSince: null,
          userType: null
        };
      }

      // Convertir les langues sélectionnées
      const spokenLanguagesString = spokenLanguages.join(', ');
      const finalPhoneCode = getPhoneCode();

      // Préparer les données complètes pour Firebase
      const contactData = {
        // Données du formulaire - TOUS LES CHAMPS
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneCountryCode: finalPhoneCode,
        phoneNumber: formData.phoneNumber.trim(),
        originCountry: formData.originCountry.trim(),
        interventionCountry: formData.interventionCountry.trim(),
        nationalities: formData.nationalities.trim(),
        subject: formData.subject.trim(),
        category: formData.category,
        message: formData.message.trim(),
        spokenLanguages: spokenLanguagesString,
        acceptedTerms: acceptTerms,
        acceptedTermsAt: new Date().toISOString(),
        
        // Métadonnées système
        createdAt: serverTimestamp(),
        submittedAt: new Date().toISOString(),
        status: 'new',
        responded: false,
        priority: formData.category === 'urgent' ? 'high' : 'normal',
        
        // Informations utilisateur
        user: userInfo,
        
        // Analytics et métadonnées techniques
        userAgent: navigator.userAgent,
        language: language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        browserLanguage: navigator.language,
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        
        // Console d'administration
        type: 'contact_message',
        adminNotified: false,
        adminTags: [],
        adminNotes: '',
        estimatedResponseTime: '24h',
        formVersion: '3.2',
        source: 'contact_form_web_fun',
        
        // Métadonnées enrichies
        metadata: {
          version: '3.2',
          source: 'contact_form_fun',
          ipAddress: null,
          referrer: document.referrer || null,
          spokenLanguagesStructured: spokenLanguages.map(lang => ({
            code: lang.toLowerCase().replace(/\s+/g, '_'),
            name: lang
          })),
          completionTime: Math.round(completionTime / 1000), // en secondes
          deviceInfo: {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth,
            pixelRatio: window.devicePixelRatio
          },
          performanceMetrics: {
            loadTime: performance.now(),
            connectionType: (navigator as NavigatorConnection & Navigator).connection?.effectiveType || 'unknown'
          }
        }
      };

      // Sauvegarder dans Firebase
      const docRef = await addDoc(collection(db, 'contact_messages'), contactData);

      // Notification admin
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'new_contact_message',
        title: `${t.pageTitle} - ${formData.firstName} ${formData.lastName}`,
        message: `${formData.firstName} ${formData.lastName} - ${formData.subject}`,
        category: formData.category,
        priority: formData.category === 'urgent' ? 'high' : 'normal',
        isExistingUser: userInfo.isExistingUser,
        contactMessageId: docRef.id,
        userEmail: formData.email,
        userPhone: `${finalPhoneCode}${formData.phoneNumber}`,
        createdAt: serverTimestamp(),
        read: false,
        actionRequired: true,
        preview: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          subject: formData.subject,
          category: formData.category,
          languages: spokenLanguagesString,
          originCountry: formData.originCountry,
          interventionCountry: formData.interventionCountry,
          message: formData.message.substring(0, 150) + '...'
        }
      });

      setIsSubmitted(true);
      
      // Reset du formulaire
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneCountryCode: '+33',
        customCountryCode: '',
        phoneNumber: '',
        originCountry: '',
        interventionCountry: '',
        nationalities: '',
        subject: '',
        category: '',
        message: ''
      });
      setSpokenLanguages([]);
      setAcceptTerms(false);
      setFormErrors({});
      setShowErrors(false);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(t.errorSending);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = useMemo(() => [
    { value: 'technical', label: lang === 'fr' ? '🔧 Problème technique' : '🔧 Technical issue' },
    { value: 'billing', label: lang === 'fr' ? '💳 Facturation' : '💳 Billing' },
    { value: 'account', label: lang === 'fr' ? '👤 Compte utilisateur' : '👤 User account' },
    { value: 'expert', label: lang === 'fr' ? '🎓 Question sur les experts' : '🎓 Expert question' },
    { value: 'service', label: lang === 'fr' ? '⭐ Qualité de service' : '⭐ Service quality' },
    { value: 'partnership', label: lang === 'fr' ? '🤝 Partenariat' : '🤝 Partnership' },
    { value: 'urgent', label: lang === 'fr' ? '🚨 Urgent' : '🚨 Urgent' },
    { value: 'other', label: `💬 ${t.other}` }
  ], [lang, t.other]);

  const countryCodes = useMemo(() => [
    { value: '+33', label: '🇫🇷 +33 (France)' },
    { value: '+1', label: '🇺🇸 +1 (USA/Canada)' },
    { value: '+44', label: '🇬🇧 +44 (UK)' },
    { value: '+49', label: '🇩🇪 +49 (Germany)' },
    { value: '+39', label: '🇮🇹 +39 (Italy)' },
    { value: '+34', label: '🇪🇸 +34 (Spain)' },
    { value: '+32', label: '🇧🇪 +32 (Belgium)' },
    { value: '+41', label: '🇨🇭 +41 (Switzerland)' },
    { value: '+31', label: '🇳🇱 +31 (Netherlands)' },
    { value: '+352', label: '🇱🇺 +352 (Luxembourg)' },
    { value: '+213', label: '🇩🇿 +213 (Algeria)' },
    { value: '+212', label: '🇲🇦 +212 (Morocco)' },
    { value: '+216', label: '🇹🇳 +216 (Tunisia)' },
    { value: '+86', label: '🇨🇳 +86 (China)' },
    { value: '+91', label: '🇮🇳 +91 (India)' },
    { value: '+55', label: '🇧🇷 +55 (Brazil)' },
    { value: '+other', label: `🌍 ${t.other}` }
  ], [t.other]);

  // Progress calculation
  const progress = useMemo(() => {
    const fields = [
      formData.firstName,
      formData.lastName, 
      formData.email,
      formData.phoneNumber,
      formData.originCountry,
      formData.interventionCountry,
      formData.nationalities,
      formData.subject,
      formData.category,
      formData.message,
      spokenLanguages.length > 0 ? 'ok' : '',
      acceptTerms ? 'ok' : ''
    ];
    const completed = fields.filter(field => !!field).length;
    return Math.round((completed / fields.length) * 100);
  }, [formData, spokenLanguages, acceptTerms]);

  // Validation states
  const validStates = useMemo(() => ({
    firstName: !!formData.firstName.trim(),
    lastName: !!formData.lastName.trim(),
    email: formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
    phone: !!formData.phoneNumber.trim(),
    originCountry: !!formData.originCountry,
    interventionCountry: !!formData.interventionCountry,
    nationalities: !!formData.nationalities,
    subject: !!formData.subject,
    category: !!formData.category,
    message: formData.message.trim().length >= 10,
    languages: spokenLanguages.length > 0,
    terms: acceptTerms
  }), [formData, spokenLanguages, acceptTerms]);

  // Meta tags pour SEO
  useEffect(() => {
    document.title = t.metaTitle;
    const updateOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updateOrCreateMetaName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Meta tags essentiels
    updateOrCreateMeta('og:title', t.metaTitle);
    updateOrCreateMeta('og:description', t.metaDesc);
    updateOrCreateMetaName('description', t.metaDesc);
    updateOrCreateMetaName('twitter:title', t.metaTitle);
    updateOrCreateMetaName('twitter:description', t.metaDesc);
  }, [t.metaTitle, t.metaDesc]);

  // Composant pour afficher les erreurs avec style fun
  const ErrorMessage: React.FC<{ error?: string; fieldName?: string }> = ({ error, fieldName }) => {
    if (!error || !showErrors) return null;
    
    return (
      <div 
        className={`mt-2 text-red-500 text-sm ${fieldName ? 'error-field' : ''}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      </div>
    );
  };

  // Success field indicator
  const FieldSuccess: React.FC<{ show: boolean; children: React.ReactNode }> = ({ show, children }) =>
    show ? (
      <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 inline-flex items-center">
        <CheckCircle className="w-4 h-4 mr-2" /> {children}
      </div>
    ) : null;

  if (isSubmitted) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center py-8 px-4">
          {/* Fond animé avec particules */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-300/10 to-green-300/10 rounded-full blur-3xl animate-pulse delay-500" />
          </div>

          <div className="relative z-10 max-w-md w-full">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-emerald-100 p-8 text-center">
              {/* Animation de succès */}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              
              {/* Confetti effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 left-8 text-2xl animate-ping">🎉</div>
                <div className="absolute top-12 right-12 text-xl animate-pulse delay-300">✨</div>
                <div className="absolute bottom-16 left-12 text-lg animate-bounce delay-500">🌟</div>
                <div className="absolute bottom-20 right-8 text-xl animate-pulse delay-700">💫</div>
              </div>
              
              <h2 className="text-3xl font-black text-gray-900 mb-4">
                {t.messageSent}
              </h2>
              
              <p className="text-gray-700 mb-8 leading-relaxed text-lg">
                {t.messageReceived}
              </p>

              {/* Fun stats */}
              <div className="bg-emerald-50 rounded-2xl p-4 mb-8 border border-emerald-200">
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-emerald-700">⚡</div>
                    <div className="text-emerald-600">Ultra rapide</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-700">🤗</div>
                    <div className="text-emerald-600">Avec le sourire</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-700">🎯</div>
                    <div className="text-emerald-600">Sur-mesure</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 touch-manipulation"
                  aria-label={t.sendAnother}
                >
                  <ArrowRight className="w-5 h-5 mr-2 inline" />
                  {t.sendAnother}
                </button>
                
                <a
                  href="/"
                  className="block w-full bg-white hover:bg-gray-50 text-emerald-700 border-2 border-emerald-200 hover:border-emerald-300 py-4 px-6 rounded-2xl font-bold transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:-translate-y-1 active:scale-95 touch-manipulation"
                  aria-label={t.backHome}
                >
                  {t.backHome}
                </a>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
        {/* Header avec design fun et énergique */}
        <header className="relative pt-12 pb-16 overflow-hidden">
          {/* Fond animé */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-green-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-emerald-300/10 to-green-300/10 rounded-full blur-3xl animate-pulse delay-500" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Badge fun */}
            <div className="inline-flex items-center justify-center mb-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-emerald-200">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <span className="text-sm font-bold text-emerald-700">
                    {lang === 'fr' ? 'Équipe super sympa' : 'Super friendly team'}
                  </span>
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse delay-300" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 bg-clip-text text-transparent">
                {t.pageTitle}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-4">
              {t.pageSubtitle}
            </p>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t.pageDescription}
            </p>

            {/* Stats fun */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md border border-emerald-100">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-800">
                    {lang === 'fr' ? 'Réponse < 24h' : 'Response < 24h'}
                  </span>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md border border-emerald-100">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-800">
                    {lang === 'fr' ? '24/7 Partout' : '24/7 Anywhere'}
                  </span>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md border border-emerald-100">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-800">
                    {lang === 'fr' ? '100% Humain' : '100% Human'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info - Style fun */}
            <aside className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-6 sticky top-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mb-4 shadow-lg">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">
                    {t.contactInfo}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">
                          {t.sosService}
                        </h4> 
                        <p className="text-gray-600 text-sm">
                          {t.available247}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">
                          {t.quickResponse}
                        </h4> 
                        <p className="text-gray-600 text-sm">
                          {t.usually24h}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">
                          {t.multilingualSupport}
                        </h4> 
                        <p className="text-gray-600 text-sm">
                          {t.multipleLanguages}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress indicator fun */}
                <div className="mt-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{t.progressTitle}</span>
                      <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-white h-3 rounded-full transition-all duration-700 shadow-sm" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {progress > 80 && (
                      <p className="text-xs mt-2 text-center font-medium">
                        {t.almostThere} 🎉
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Form Section - Style fun et jovial */}
            <section className="lg:col-span-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-6 text-white text-center">
                  <h2 className="text-3xl font-black mb-2">
                    {t.formTitle}
                  </h2>
                  <p className="text-emerald-100">
                    {t.formDescription}
                  </p>
                </div>

                {/* Message d'erreur global avec style fun */}
                {showErrors && Object.keys(formErrors).length > 0 && (
                  <div className="m-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl" role="alert">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-bold text-red-800">{t.formHasErrors}</h3>
                    </div>
                    <div className="text-sm text-red-700 space-y-1 ml-11">
                      {Object.entries(formErrors).map(([field, error]) => (
                        <div key={field} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
                  {/* Section 1: Qui êtes-vous ? */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <User className="w-6 h-6 mr-2 text-emerald-600" />
                      {lang === 'fr' ? 'Qui êtes-vous ? 😊' : 'Who are you? 😊'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="group">
                        <label htmlFor="firstName" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                          <Sparkles className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                          {t.firstName} *
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField(null)}
                          required
                          autoComplete="given-name"
                          className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                            formErrors.firstName
                              ? 'border-red-400 bg-red-50'
                              : validStates.firstName
                              ? 'border-emerald-400 bg-emerald-50 shadow-md'
                              : focusedField === 'firstName' 
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                              : 'border-gray-300 hover:border-emerald-300'
                          }`}
                          placeholder={t.firstNamePlaceholder}
                          aria-describedby="firstName-error"
                          aria-invalid={!!formErrors.firstName}
                        />
                        <FieldSuccess show={validStates.firstName}>
                          {lang === 'fr' ? 'Parfait ! ✨' : 'Perfect! ✨'}
                        </FieldSuccess>
                        <ErrorMessage error={formErrors.firstName} fieldName="firstName" />
                      </div>

                      <div className="group">
                        <label htmlFor="lastName" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                          <User className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                          {t.lastName} *
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField(null)}
                          required
                          autoComplete="family-name"
                          className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                            formErrors.lastName
                              ? 'border-red-400 bg-red-50'
                              : validStates.lastName
                              ? 'border-emerald-400 bg-emerald-50 shadow-md'
                              : focusedField === 'lastName' 
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                              : 'border-gray-300 hover:border-emerald-300'
                          }`}
                          placeholder={t.lastNamePlaceholder}
                          aria-describedby="lastName-error"
                          aria-invalid={!!formErrors.lastName}
                        />
                        <FieldSuccess show={validStates.lastName}>
                          {lang === 'fr' ? 'Parfait ! ✨' : 'Perfect! ✨'}
                        </FieldSuccess>
                        <ErrorMessage error={formErrors.lastName} fieldName="lastName" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mt-4 group">
                      <label htmlFor="email" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                        <Mail className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                        {t.email} *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        required
                        autoComplete="email"
                        className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                          formErrors.email
                            ? 'border-red-400 bg-red-50'
                            : validStates.email
                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                            : focusedField === 'email' 
                            ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                        placeholder={t.emailPlaceholder}
                        aria-describedby="email-error"
                        aria-invalid={!!formErrors.email}
                      />
                      <FieldSuccess show={!!validStates.email}>
                        {lang === 'fr' ? 'Email nickel ! 📧' : 'Perfect email! 📧'}
                      </FieldSuccess>
                      <ErrorMessage error={formErrors.email} fieldName="email" />
                    </div>
                  </div>

                  {/* Section 2: Contact */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <Phone className="w-6 h-6 mr-2 text-green-600" />
                      {lang === 'fr' ? 'Comment vous joindre ? 📞' : 'How to reach you? 📞'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-sm font-bold text-gray-800 mb-2 block">
                          {lang === 'fr' ? 'Indicatif' : 'Country code'}
                        </label>
                        <select
                          name="phoneCountryCode"
                          value={formData.phoneCountryCode}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('phoneCountryCode')}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 ${
                            formErrors.phoneCountryCode
                              ? 'border-red-400 bg-red-50'
                              : focusedField === 'phoneCountryCode' 
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg' 
                              : 'border-gray-300 hover:border-emerald-300'
                          }`}
                          aria-label={lang === 'fr' ? 'Sélectionner l\'indicatif pays' : 'Select country code'}
                        >
                          {countryCodes.map(code => (
                            <option key={code.value} value={code.value} className="bg-white text-gray-900">
                              {code.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {formData.phoneCountryCode === '+other' && (
                        <div className="sm:col-span-2">
                          <label className="text-sm font-bold text-gray-800 mb-2 block">
                            {t.customCode}
                          </label>
                          <input
                            type="text"
                            name="customCountryCode"
                            value={formData.customCountryCode}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField('customCountryCode')}
                            onBlur={() => setFocusedField(null)}
                            required
                            placeholder={t.customCodePlaceholder}
                            className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                              formErrors.customCountryCode
                                ? 'border-red-400 bg-red-50'
                                : focusedField === 'customCountryCode' 
                                ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                                : 'border-gray-300 hover:border-emerald-300'
                            }`}
                            aria-label={t.customCode}
                            aria-invalid={!!formErrors.customCountryCode}
                          />
                        </div>
                      )}

                      <div className={formData.phoneCountryCode === '+other' ? 'sm:col-span-1' : 'sm:col-span-3'}>
                        <label className="text-sm font-bold text-gray-800 mb-2 block">
                          {t.phoneNumber} *
                        </label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('phoneNumber')}
                          onBlur={() => setFocusedField(null)}
                          required
                          autoComplete="tel"
                          placeholder={t.phonePlaceholder}
                          className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                            formErrors.phoneNumber
                              ? 'border-red-400 bg-red-50'
                              : validStates.phone
                              ? 'border-emerald-400 bg-emerald-50 shadow-md'
                              : focusedField === 'phoneNumber' 
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                              : 'border-gray-300 hover:border-emerald-300'
                          }`}
                          aria-label={t.phoneNumber}
                          aria-invalid={!!formErrors.phoneNumber}
                        />
                      </div>
                    </div>
                    <FieldSuccess show={validStates.phone}>
                      {lang === 'fr' ? 'Super ! On pourra vous appeler 📱' : 'Great! We can call you 📱'}
                    </FieldSuccess>
                    <ErrorMessage error={formErrors.phoneNumber || formErrors.customCountryCode} />
                  </div>

                  {/* Section 3: Géographie */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <MapPin className="w-6 h-6 mr-2 text-emerald-600" />
                      {lang === 'fr' ? 'Votre géographie 🌍' : 'Your geography 🌍'}
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="group">
                        <label htmlFor="originCountry" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                          {t.originCountry} *
                        </label>
                        <input
                          type="text"
                          id="originCountry"
                          name="originCountry"
                          value={formData.originCountry}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('originCountry')}
                          onBlur={() => setFocusedField(null)}
                          required
                          autoComplete="country"
                          placeholder={t.originCountryPlaceholder}
                          className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                            formErrors.originCountry
                              ? 'border-red-400 bg-red-50'
                              : validStates.originCountry
                              ? 'border-emerald-400 bg-emerald-50 shadow-md'
                              : focusedField === 'originCountry' 
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                              : 'border-gray-300 hover:border-emerald-300'
                          }`}
                          aria-describedby="originCountry-error"
                          aria-invalid={!!formErrors.originCountry}
                        />
                        <FieldSuccess show={validStates.originCountry}>
                          {lang === 'fr' ? 'Noté ! 🌍' : 'Got it! 🌍'}
                        </FieldSuccess>
                        <ErrorMessage error={formErrors.originCountry} fieldName="originCountry" />
                      </div>

                      <div className="group">
                        <label htmlFor="interventionCountry" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                          <Globe className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                          {t.interventionCountry} *
                        </label>
                        <input
                          type="text"
                          id="interventionCountry"
                          name="interventionCountry"
                          value={formData.interventionCountry}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('interventionCountry')}
                          onBlur={() => setFocusedField(null)}
                          required
                          placeholder={t.interventionCountryPlaceholder}
                          className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                            formErrors.interventionCountry
                              ? 'border-red-400 bg-red-50'
                              : validStates.interventionCountry
                              ? 'border-emerald-400 bg-emerald-50 shadow-md'
                              : focusedField === 'interventionCountry' 
                              ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                              : 'border-gray-300 hover:border-emerald-300'
                          }`}
                          aria-describedby="interventionCountry-error"
                          aria-invalid={!!formErrors.interventionCountry}
                        />
                        <FieldSuccess show={validStates.interventionCountry}>
                          {lang === 'fr' ? 'On va vous aider là-bas ! 🎯' : 'We\'ll help you there! 🎯'}
                        </FieldSuccess>
                        <ErrorMessage error={formErrors.interventionCountry} fieldName="interventionCountry" />
                      </div>
                    </div>

                    <div className="mt-4 group">
                      <label htmlFor="nationalities" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                        <Flag className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                        {t.nationalities} *
                      </label>
                      <input
                        type="text"
                        id="nationalities"
                        name="nationalities"
                        value={formData.nationalities}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('nationalities')}
                        onBlur={() => setFocusedField(null)}
                        required
                        placeholder={t.nationalitiesPlaceholder}
                        className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                          formErrors.nationalities
                            ? 'border-red-400 bg-red-50'
                            : validStates.nationalities
                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                            : focusedField === 'nationalities' 
                            ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                        aria-describedby="nationalities-error"
                        aria-invalid={!!formErrors.nationalities}
                      />
                      <FieldSuccess show={validStates.nationalities}>
                        {lang === 'fr' ? 'Parfait ! 🏳️' : 'Perfect! 🏳️'}
                      </FieldSuccess>
                      <ErrorMessage error={formErrors.nationalities} fieldName="nationalities" />
                    </div>
                  </div>

                  {/* Section 4: Langues */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <LanguagesIcon className="w-6 h-6 mr-2 text-green-600" />
                      {t.spokenLanguages} * {lang === 'fr' ? '🗣️' : '🗣️'}
                    </h3>

                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => setLanguagesDropdownOpen(!languagesDropdownOpen)}
                        className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-left flex items-center justify-between ${
                          formErrors.spokenLanguages
                            ? 'border-red-400 bg-red-50'
                            : validStates.languages
                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                            : languagesDropdownOpen
                            ? 'border-emerald-400 bg-emerald-50 shadow-lg'
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                        aria-expanded={languagesDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        <span className={spokenLanguages.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                          {spokenLanguages.length > 0 
                            ? `${spokenLanguages.length} ${lang === 'fr' ? 'langue(s) sélectionnée(s)' : 'language(s) selected'} ✨`
                            : lang === 'fr' ? 'Choisissez vos langues magiques...' : 'Choose your magical languages...'
                          }
                        </span>
                        <ChevronDown 
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            languagesDropdownOpen ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {languagesDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-emerald-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                          <div className="p-2">
                            {availableLanguages.map((lang) => (
                              <label
                                key={lang}
                                className="flex items-center p-3 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors duration-150"
                              >
                                <input
                                  type="checkbox"
                                  checked={spokenLanguages.includes(lang)}
                                  onChange={() => handleLanguageToggle(lang)}
                                  className="w-5 h-5 text-emerald-500 border-2 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 mr-3"
                                />
                                <span className="text-sm text-gray-800 font-medium">{lang}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Languages Display */}
                      {spokenLanguages.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {spokenLanguages.map((lang) => (
                            <span
                              key={lang}
                              className="inline-flex items-center px-3 py-2 bg-emerald-100 text-emerald-800 text-sm rounded-full border-2 border-emerald-200 font-medium"
                            >
                              {lang}
                              <button
                                type="button"
                                onClick={() => handleLanguageToggle(lang)}
                                className="ml-2 text-emerald-600 hover:text-emerald-800 focus:outline-none text-lg"
                                aria-label={`Remove ${lang}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <FieldSuccess show={validStates.languages}>
                      {lang === 'fr' ? 'Super ! On peut discuter dans votre langue ! 🌐' : 'Great! We can chat in your language! 🌐'}
                    </FieldSuccess>
                    <ErrorMessage error={formErrors.spokenLanguages} fieldName="spokenLanguages" />
                  </div>

                  {/* Section 5: Votre demande */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <MessageCircle className="w-6 h-6 mr-2 text-emerald-600" />
                      {lang === 'fr' ? 'Votre demande 💬' : 'Your request 💬'}
                    </h3>

                    {/* Category */}
                    <div className="mb-4 group">
                      <label htmlFor="category" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                        <Star className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                        {t.category} *
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('category')}
                        onBlur={() => setFocusedField(null)}
                        required
                        className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 ${
                          formErrors.category
                            ? 'border-red-400 bg-red-50'
                            : validStates.category
                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                            : focusedField === 'category' 
                            ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                        aria-describedby="category-error"
                        aria-invalid={!!formErrors.category}
                      >
                        <option value="" className="text-gray-500">
                          {t.selectCategory}
                        </option>
                        {categories.map(category => (
                          <option key={category.value} value={category.value} className="text-gray-900">
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <FieldSuccess show={validStates.category}>
                        {lang === 'fr' ? 'Catégorie choisie ! 🎯' : 'Category selected! 🎯'}
                      </FieldSuccess>
                      <ErrorMessage error={formErrors.category} fieldName="category" />
                    </div>

                    {/* Subject */}
                    <div className="mb-4 group">
                      <label htmlFor="subject" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                        {t.subject} *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('subject')}
                        onBlur={() => setFocusedField(null)}
                        required
                        placeholder={t.subjectPlaceholder}
                        className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-gray-900 placeholder-gray-500 ${
                          formErrors.subject
                            ? 'border-red-400 bg-red-50'
                            : validStates.subject
                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                            : focusedField === 'subject' 
                            ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                        aria-describedby="subject-error"
                        aria-invalid={!!formErrors.subject}
                      />
                      <FieldSuccess show={validStates.subject}>
                        {lang === 'fr' ? 'Sujet clair ! 📝' : 'Clear subject! 📝'}
                      </FieldSuccess>
                      <ErrorMessage error={formErrors.subject} fieldName="subject" />
                    </div>

                    {/* Message */}
                    <div className="group">
                      <label htmlFor="message" className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1 text-emerald-600" aria-hidden="true" />
                        {t.message} *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('message')}
                        onBlur={() => setFocusedField(null)}
                        required
                        rows={6}
                        placeholder={t.messagePlaceholder}
                        className={`w-full px-4 py-4 bg-white border-2 rounded-2xl focus:outline-none transition-all duration-300 resize-none touch-manipulation text-gray-900 placeholder-gray-500 ${
                          formErrors.message
                            ? 'border-red-400 bg-red-50'
                            : validStates.message
                            ? 'border-emerald-400 bg-emerald-50 shadow-md'
                            : focusedField === 'message' 
                            ? 'border-emerald-400 bg-emerald-50 shadow-lg transform scale-[1.02]' 
                            : 'border-gray-300 hover:border-emerald-300'
                        }`}
                        aria-describedby="message-error"
                        aria-invalid={!!formErrors.message}
                      />
                      
                      {/* Message length indicator */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-medium ${
                            formData.message.length >= 10 ? 'text-emerald-600' : 'text-gray-500'
                          }`}>
                            {formData.message.length >= 10 
                              ? lang === 'fr' ? '✓ Message assez détaillé' : '✓ Message detailed enough'
                              : lang === 'fr' ? `Encore ${10 - formData.message.length} caractères...` : `${10 - formData.message.length} more characters...`
                            }
                          </span>
                          <span className="text-gray-400">
                            {formData.message.length}/1000
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              formData.message.length >= 10 ? 'bg-emerald-500' : 'bg-orange-400'
                            }`}
                            style={{ width: `${Math.min((formData.message.length / 1000) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <FieldSuccess show={validStates.message}>
                        {lang === 'fr' ? 'Message parfait ! On va pouvoir bien vous aider ! 🎯' : 'Perfect message! We\'ll be able to help you well! 🎯'}
                      </FieldSuccess>
                      <ErrorMessage error={formErrors.message} fieldName="message" />
                    </div>
                  </div>

                  {/* Section 6: Temps de réponse */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="w-6 h-6 mr-3" />
                        <div>
                          <h4 className="font-bold text-lg">{t.responseTime}</h4>
                          <p className="text-green-100 text-sm">
                            {lang === 'fr' ? 'On revient vers vous rapidement !' : 'We\'ll get back to you quickly!'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black">{t.maxTime}</div>
                        <div className="text-green-100 text-xs">
                          {lang === 'fr' ? 'Souvent bien plus vite !' : 'Often much faster!'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 w-full bg-white/20 rounded-full h-3">
                      <div className="bg-white h-3 rounded-full w-4/5 shadow-sm animate-pulse"></div>
                    </div>
                  </div>

                  {/* Section 7: Terms and Submit */}
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-6">
                    <div className="bg-white rounded-2xl p-6">
                      {/* Terms */}
                      <div className="mb-6">
                        <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${
                          formErrors.acceptTerms
                            ? 'border-red-400 bg-red-50'
                            : acceptTerms
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-gray-300 bg-gray-50 hover:border-emerald-300'
                        }`}>
                          <input
                            type="checkbox"
                            id="acceptTerms"
                            checked={acceptTerms}
                            onChange={(e) => {
                              setAcceptTerms(e.target.checked);
                              if (e.target.checked && formErrors.acceptTerms) {
                                setFormErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.acceptTerms;
                                  return newErrors;
                                });
                              }
                            }}
                            className="w-5 h-5 text-emerald-500 border-2 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 mt-0.5 touch-manipulation"
                            aria-describedby="acceptTerms-error"
                            aria-invalid={!!formErrors.acceptTerms}
                          />
                          <label htmlFor="acceptTerms" className="text-sm text-gray-800 flex-1 cursor-pointer font-medium">
                            {t.acceptTerms}{' '}
                            <a
                              href={t.termsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 underline font-bold transition-colors duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t.termsAndConditions}
                            </a>
                            {' *'}
                          </label>
                        </div>
                        <FieldSuccess show={acceptTerms}>
                          {lang === 'fr' ? 'Merci ! Tout est en ordre ! ✅' : 'Thanks! Everything is in order! ✅'}
                        </FieldSuccess>
                        <ErrorMessage error={formErrors.acceptTerms} fieldName="acceptTerms" />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        loading={isLoading}
                        fullWidth
                        size="large"
                        className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-800 text-white font-black py-5 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 transition-all duration-300 text-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                        aria-label={t.sendMessage}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center" aria-hidden="true">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                            {t.sending}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Send size={24} className="mr-3" aria-hidden="true" />
                            {t.sendMessage}
                            <Heart className="w-5 h-5 ml-2 animate-pulse" />
                          </div>
                        )}
                      </Button>

                      {/* Security note fun */}
                      <div className="text-center text-sm text-gray-600 mt-4">
                        <div className="flex items-center justify-center bg-gray-50 rounded-xl py-3 px-4">
                          <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2 animate-pulse" aria-hidden="true"></div>
                          {t.secureData}
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </main>

        {/* Footer fun */}
        <footer className="bg-white/90 backdrop-blur-sm border-t border-emerald-100 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-4">
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full p-3 mr-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {lang === 'fr' ? 'Une communauté qui vous veut du bien' : 'A community that wants the best for you'}
                  </h3>
                  <p className="text-gray-600">
                    {lang === 'fr' ? 'Des experts passionnés, partout dans le monde' : 'Passionate experts, all around the world'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
                <a href="/politique-confidentialite" className="hover:text-emerald-600 underline transition-colors">
                  🔒 {lang === 'fr' ? 'Confidentialité' : 'Privacy'}
                </a>
                <a href="/centre-aide" className="hover:text-emerald-600 underline transition-colors">
                  💬 {lang === 'fr' ? 'Centre d\'aide' : 'Help Center'}
                </a>
                <a href="/conditions-generales-clients" className="hover:text-emerald-600 underline transition-colors">
                  📋 {lang === 'fr' ? 'Conditions générales' : 'Terms & Conditions'}
                </a>
              </div>
              
              <div className="mt-6 flex justify-center space-x-4 text-2xl">
                <span className="animate-bounce">🌍</span>
                <span className="animate-bounce delay-100">❤️</span>
                <span className="animate-bounce delay-200">✨</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default Contact;