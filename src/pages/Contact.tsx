import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Send, CheckCircle, Phone, Globe, Mail, MapPin, MessageCircle, User, Calendar, Flag, Languages as LanguagesIcon, AlertCircle, ChevronDown } from 'lucide-react';
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

// Interface pour les options de langues
interface LanguageOption {
  value: string;
  label: string;
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

  // Préchargement et optimisations performance
  useEffect(() => {
    // Optimisation viewport mobile
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

  // Textes i18n centralisés
  const t = useMemo(() => ({
    // Header
    pageTitle: language === 'fr' ? 'Nous contacter' : 'Contact us',
    pageDescription: language === 'fr' 
      ? 'Notre équipe est là pour vous aider. Envoyez-nous un message et nous vous répondrons rapidement.'
      : 'Our team is here to help you. Send us a message and we will respond quickly.',
    
    // Form labels
    firstName: language === 'fr' ? 'Prénom' : 'First name',
    lastName: language === 'fr' ? 'Nom' : 'Last name',
    email: 'Email',
    phoneNumber: language === 'fr' ? 'Numéro de téléphone' : 'Phone number',
    customCode: language === 'fr' ? 'Indicatif personnalisé' : 'Custom country code',
    originCountry: language === 'fr' ? 'Pays d\'origine' : 'Country of origin',
    interventionCountry: language === 'fr' ? 'Pays d\'intervention' : 'Intervention country',
    spokenLanguages: language === 'fr' ? 'Langues parlées' : 'Spoken languages',
    nationalities: language === 'fr' ? 'Nationalités' : 'Nationalities',
    category: language === 'fr' ? 'Catégorie' : 'Category',
    subject: language === 'fr' ? 'Sujet' : 'Subject',
    message: language === 'fr' ? 'Message' : 'Message',
    
    // Placeholders
    firstNamePlaceholder: language === 'fr' ? 'Votre prénom...' : 'Your first name...',
    lastNamePlaceholder: language === 'fr' ? 'Votre nom...' : 'Your last name...',
    emailPlaceholder: language === 'fr' ? 'votre@email.com' : 'your@email.com',
    phonePlaceholder: '06 12 34 56 78',
    customCodePlaceholder: language === 'fr' ? 'Ex: +225' : 'Ex: +225',
    originCountryPlaceholder: language === 'fr' ? 'France' : 'France',
    interventionCountryPlaceholder: language === 'fr' ? 'Pays où vous avez besoin d\'aide' : 'Country where you need help',
    nationalitiesPlaceholder: language === 'fr' ? 'Française' : 'French',
    subjectPlaceholder: language === 'fr' ? 'Résumez votre demande...' : 'Summarize your request...',
    messagePlaceholder: language === 'fr' 
      ? 'Décrivez votre demande en détail... Plus vous serez précis, mieux nous pourrons vous aider !'
      : 'Describe your request in detail... The more specific you are, the better we can help you!',
    
    // Buttons
    sendMessage: language === 'fr' ? 'Envoyer le message' : 'Send message',
    sending: language === 'fr' ? 'Envoi en cours...' : 'Sending...',
    sendAnother: language === 'fr' ? 'Envoyer un autre message' : 'Send another message',
    backHome: language === 'fr' ? 'Retour à l\'accueil' : 'Back to home',
    
    // Success messages
    messageSent: language === 'fr' ? 'Message envoyé !' : 'Message sent!',
    messageReceived: language === 'fr'
      ? 'Nous avons bien reçu votre message. Notre équipe vous répondra dans les plus brefs délais.'
      : 'We have received your message. Our team will respond to you as soon as possible.',
    
    // Contact info
    contactInfo: language === 'fr' ? 'Informations de contact' : 'Contact information',
    sosService: language === 'fr' ? 'Service S.O.S Appel' : 'S.O.S Call Service',
    available247: language === 'fr' ? 'Disponible 24h/24, 7j/7' : 'Available 24/7',
    quickResponse: language === 'fr' ? 'Réponse rapide' : 'Quick response',
    usually24h: language === 'fr' ? 'Généralement sous 24h' : 'Usually within 24h',
    multilingualSupport: language === 'fr' ? 'Support multilingue' : 'Multilingual support',
    multipleLanguages: language === 'fr' ? 'Plusieurs langues disponibles' : 'Multiple languages available',
    
    // Form
    formTitle: language === 'fr' ? 'Envoyez-nous un message' : 'Send us a message',
    formDescription: language === 'fr' ? 'Remplissez le formulaire ci-dessous' : 'Fill out the form below',
    selectCategory: language === 'fr' ? 'Sélectionner une catégorie...' : 'Select a category...',
    responseTime: language === 'fr' ? 'Temps de réponse estimé' : 'Estimated response time',
    maxTime: language === 'fr' ? '24h max' : '24h max',
    secureData: language === 'fr' 
      ? 'Vos données sont sécurisées et ne seront jamais partagées' 
      : 'Your data is secure and will never be shared',
    
    // SEO Footer
    seoDescription: language === 'fr' 
      ? 'Service de contact disponible 24h/24 et 7j/7 pour tous vos besoins d\'assistance.'
      : '24/7 contact service available for all your assistance needs.',
    seoFeatures: language === 'fr'
      ? 'Support multilingue • Réponse rapide • Service professionnel'
      : 'Multilingual support • Quick response • Professional service',
    
    // Errors
    errorSending: language === 'fr' 
      ? 'Erreur lors de l\'envoi du message. Veuillez réessayer.'
      : 'Error sending message. Please try again.',
    
    // Validation errors
    required: language === 'fr' ? 'Ce champ est obligatoire' : 'This field is required',
    invalidEmail: language === 'fr' ? 'Veuillez saisir un email valide' : 'Please enter a valid email',
    invalidPhone: language === 'fr' ? 'Veuillez saisir un numéro de téléphone valide' : 'Please enter a valid phone number',
    invalidCustomCode: language === 'fr' ? 'L\'indicatif doit commencer par +' : 'Country code must start with +',
    selectLanguages: language === 'fr' ? 'Veuillez sélectionner au moins une langue' : 'Please select at least one language',
    acceptTermsRequired: language === 'fr' ? 'Vous devez accepter les conditions générales' : 'You must accept the terms and conditions',
    formHasErrors: language === 'fr' ? 'Veuillez corriger les erreurs ci-dessous :' : 'Please correct the errors below:',
    
    // Terms and conditions
    acceptTerms: language === 'fr' ? 'J\'accepte les' : 'I accept the',
    termsAndConditions: language === 'fr' ? 'conditions générales' : 'terms and conditions',
    termsLink: language === 'fr' ? '/conditions-generales-clients' : '/terms-conditions-clients',
    
    // Other option
    other: language === 'fr' ? 'Autre' : 'Other'
  }), [language]);

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
    'Ελληνικά', 'Български', 'Čeština', 'Slovenčina', 'Magyar',
    'Română', 'Hrvatski', 'Srpski', 'Українська', 'Lietuvių',
    'Latviešu', 'Eesti', 'Slovenščina', 'עברית', 'हिन्दी',
    'ไทย', 'Tiếng Việt', 'Bahasa Indonesia', 'Bahasa Malaysia',
    'Filipino', 'فارسی', 'اردو', 'বাংলা', 'తేలుగు', 'தமிழ்',
    'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം', 'मराठी', 'پنجابی', 'नेपाली'
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
        formVersion: '3.1',
        source: 'contact_form_web',
        
        // Métadonnées enrichies
        metadata: {
          version: '3.1',
          source: 'contact_form',
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
          message: formData.message.substring(0, 150) + '...' // Preview du message
        }
      });

      // Analytics
      await addDoc(collection(db, 'admin_analytics'), {
        type: 'contact_form_submission',
        category: formData.category,
        userType: userInfo.isExistingUser ? 'existing' : 'new',
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0],
        language: language,
        source: 'web_form',
        completionTime: Math.round(completionTime / 1000),
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
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
    { value: 'technical', label: language === 'fr' ? 'Problème technique' : 'Technical issue', emoji: '🔧' },
    { value: 'billing', label: language === 'fr' ? 'Facturation' : 'Billing', emoji: '💳' },
    { value: 'account', label: language === 'fr' ? 'Compte utilisateur' : 'User account', emoji: '👤' },
    { value: 'expert', label: language === 'fr' ? 'Question sur les experts' : 'Expert question', emoji: '🎓' },
    { value: 'service', label: language === 'fr' ? 'Qualité de service' : 'Service quality', emoji: '⭐' },
    { value: 'partnership', label: language === 'fr' ? 'Partenariat' : 'Partnership', emoji: '🤝' },
    { value: 'urgent', label: language === 'fr' ? 'Urgent' : 'Urgent', emoji: '🚨' },
    { value: 'other', label: t.other, emoji: '💬' }
  ], [language, t.other]);

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

  // Données structurées pour SEO et IA - version 2025
  const structuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": ["ContactPage", "WebPage"],
    "name": t.pageTitle,
    "description": t.pageDescription,
    "url": typeof window !== 'undefined' ? window.location.href : '',
    "inLanguage": language === 'fr' ? 'fr-FR' : 'en-US',
    "isPartOf": {
      "@type": "WebSite",
      "name": "SOS Expert Platform",
      "url": typeof window !== 'undefined' ? window.location.origin : ''
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+33",
      "contactType": "customer service",
      "areaServed": ["FR", "International"],
      "availableLanguage": ["French", "English", "Arabic", "Spanish"],
      "hoursAvailable": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "00:00",
        "closes": "23:59"
      }
    },
    "provider": {
      "@type": "Organization",
      "name": "SOS Expert",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": ["fr", "en", "ar", "es"]
      }
    }
  }), [t.pageTitle, t.pageDescription, language]);

  // Meta tags pour réseaux sociaux et IA
  useEffect(() => {
    const updateMetaTags = () => {
      // Open Graph
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

      // Open Graph pour réseaux sociaux
      updateOrCreateMeta('og:title', t.pageTitle);
      updateOrCreateMeta('og:description', t.pageDescription);
      updateOrCreateMeta('og:type', 'website');
      updateOrCreateMeta('og:locale', language === 'fr' ? 'fr_FR' : 'en_US');
      
      // Twitter Card
      updateOrCreateMetaName('twitter:card', 'summary_large_image');
      updateOrCreateMetaName('twitter:title', t.pageTitle);
      updateOrCreateMetaName('twitter:description', t.pageDescription);
      
      // Pour les IA et ChatGPT
      updateOrCreateMetaName('description', t.pageDescription);
      updateOrCreateMetaName('keywords', language === 'fr' 
        ? 'contact, aide, support, assistance, urgence, multilingue, 24h/24'
        : 'contact, help, support, assistance, emergency, multilingual, 24/7'
      );
      updateOrCreateMetaName('robots', 'index, follow, max-image-preview:large');
      
      // Title
      document.title = `${t.pageTitle} | SOS Expert Platform`;
    };

    updateMetaTags();
  }, [t.pageTitle, t.pageDescription, language]);

  // Composant pour afficher les erreurs
  const ErrorMessage: React.FC<{ error?: string; fieldName?: string }> = ({ error, fieldName }) => {
    if (!error || !showErrors) return null;
    
    return (
      <div 
        className={`mt-2 text-red-500 text-sm ${fieldName ? 'error-field' : ''}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      </div>
    );
  };

  if (isSubmitted) {
    return (
      <Layout>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center py-8 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
                {t.messageSent}
              </h2>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                {t.messageReceived}
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 touch-manipulation"
                  aria-label={t.sendAnother}
                >
                  {t.sendAnother}
                </button>
                
                <a
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 py-4 px-6 rounded-2xl font-semibold hover:bg-gray-200 transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:-translate-y-1 active:scale-95 touch-manipulation"
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
        {/* Header avec design moderne */}
        <header className="relative bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white py-16 overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-1"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              {t.pageTitle}
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto leading-relaxed">
              {t.pageDescription}
            </p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contact Info - Mobile First */}
            <aside className="lg:col-span-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 sticky top-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-400 to-red-500 rounded-full mb-4">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                    {t.contactInfo}
                  </h3>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 p-4 bg-red-50 rounded-2xl">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
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

                  <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-2xl">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
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

                  <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-2xl">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Globe className="w-6 h-6 text-white" />
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
            </aside>

            {/* Contact Form - Design optimisé 2025 */}
            <section className="lg:col-span-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                    {t.formTitle}
                  </h2>
                  <p className="text-gray-600">
                    {t.formDescription}
                  </p>
                </div>

                {/* Message d'erreur global */}
                {showErrors && Object.keys(formErrors).length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl" role="alert">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <h3 className="font-semibold text-red-800">{t.formHasErrors}</h3>
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(formErrors).map(([field, error]) => (
                        <li key={field} className="flex items-start">
                          <span className="w-1 h-1 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {/* Name Fields - Mobile First Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                      <label htmlFor="firstName" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                        className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                          formErrors.firstName
                            ? 'border-red-400 bg-red-50'
                            : focusedField === 'firstName' 
                            ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder={t.firstNamePlaceholder}
                        aria-describedby="firstName-error"
                        aria-invalid={!!formErrors.firstName}
                      />
                      <ErrorMessage error={formErrors.firstName} fieldName="firstName" />
                    </div>
                    <div className="group">
                      <label htmlFor="lastName" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                        className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                          formErrors.lastName
                            ? 'border-red-400 bg-red-50'
                            : focusedField === 'lastName' 
                            ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder={t.lastNamePlaceholder}
                        aria-describedby="lastName-error"
                        aria-invalid={!!formErrors.lastName}
                      />
                      <ErrorMessage error={formErrors.lastName} fieldName="lastName" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="group">
                    <label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                      className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                        formErrors.email
                          ? 'border-red-400 bg-red-50'
                          : focusedField === 'email' 
                          ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder={t.emailPlaceholder}
                      aria-describedby="email-error"
                      aria-invalid={!!formErrors.email}
                    />
                    <ErrorMessage error={formErrors.email} fieldName="email" />
                  </div>

                  {/* Phone Number avec indicatif personnalisé */}
                  <div className="group">
                    <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
                      {t.phoneNumber} *
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {/* Sélecteur d'indicatif */}
                      <div className="sm:col-span-2">
                        <select
                          name="phoneCountryCode"
                          value={formData.phoneCountryCode}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('phoneCountryCode')}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                            formErrors.phoneCountryCode
                              ? 'border-red-400 bg-red-50'
                              : focusedField === 'phoneCountryCode' 
                              ? 'border-red-400 bg-white shadow-lg' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          aria-label={language === 'fr' ? 'Sélectionner l\'indicatif pays' : 'Select country code'}
                        >
                          {countryCodes.map(code => (
                            <option key={code.value} value={code.value}>
                              {code.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Champ indicatif personnalisé si "Autre" sélectionné */}
                      {formData.phoneCountryCode === '+other' && (
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            name="customCountryCode"
                            value={formData.customCountryCode}
                            onChange={handleInputChange}
                            onFocus={() => setFocusedField('customCountryCode')}
                            onBlur={() => setFocusedField(null)}
                            required
                            placeholder={t.customCodePlaceholder}
                            className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                              formErrors.customCountryCode
                                ? 'border-red-400 bg-red-50'
                                : focusedField === 'customCountryCode' 
                                ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            aria-label={t.customCode}
                            aria-invalid={!!formErrors.customCountryCode}
                          />
                        </div>
                      )}

                      {/* Numéro de téléphone */}
                      <div className={formData.phoneCountryCode === '+other' ? 'sm:col-span-1' : 'sm:col-span-3'}>
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
                          className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                            formErrors.phoneNumber
                              ? 'border-red-400 bg-red-50'
                              : focusedField === 'phoneNumber' 
                              ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          aria-label={t.phoneNumber}
                          aria-invalid={!!formErrors.phoneNumber}
                        />
                      </div>
                    </div>
                    <ErrorMessage error={formErrors.phoneNumber || formErrors.customCountryCode} />
                  </div>

                  {/* Countries - Origin and Intervention */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="group">
                      <label htmlFor="originCountry" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                        className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                          formErrors.originCountry
                            ? 'border-red-400 bg-red-50'
                            : focusedField === 'originCountry' 
                            ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-describedby="originCountry-error"
                        aria-invalid={!!formErrors.originCountry}
                      />
                      <ErrorMessage error={formErrors.originCountry} fieldName="originCountry" />
                    </div>

                    <div className="group">
                      <label htmlFor="interventionCountry" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                        className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                          formErrors.interventionCountry
                            ? 'border-red-400 bg-red-50'
                            : focusedField === 'interventionCountry' 
                            ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-describedby="interventionCountry-error"
                        aria-invalid={!!formErrors.interventionCountry}
                      />
                      <ErrorMessage error={formErrors.interventionCountry} fieldName="interventionCountry" />
                    </div>
                  </div>

                  {/* Languages and Nationalities */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <LanguagesIcon className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
                        {t.spokenLanguages} *
                      </label>
                      
                      {/* Custom Language Selector */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setLanguagesDropdownOpen(!languagesDropdownOpen)}
                          className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation text-left flex items-center justify-between ${
                            formErrors.spokenLanguages
                              ? 'border-red-400 bg-red-50'
                              : languagesDropdownOpen
                              ? 'border-red-400 bg-white shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          aria-expanded={languagesDropdownOpen}
                          aria-haspopup="listbox"
                        >
                          <span className={spokenLanguages.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                            {spokenLanguages.length > 0 
                              ? `${spokenLanguages.length} ${language === 'fr' ? 'langue(s) sélectionnée(s)' : 'language(s) selected'}`
                              : language === 'fr' ? 'Sélectionnez vos langues...' : 'Select your languages...'
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
                          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                            <div className="p-2">
                              {availableLanguages.map((lang) => (
                                <label
                                  key={lang}
                                  className="flex items-center p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors duration-150"
                                >
                                  <input
                                    type="checkbox"
                                    checked={spokenLanguages.includes(lang)}
                                    onChange={() => handleLanguageToggle(lang)}
                                    className="w-4 h-4 text-red-500 border-2 border-gray-300 rounded focus:ring-red-500 focus:ring-2 mr-3"
                                  />
                                  <span className="text-sm text-gray-700">{lang}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selected Languages Display */}
                        {spokenLanguages.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {spokenLanguages.map((lang) => (
                              <span
                                key={lang}
                                className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                              >
                                {lang}
                                <button
                                  type="button"
                                  onClick={() => handleLanguageToggle(lang)}
                                  className="ml-2 text-red-600 hover:text-red-800 focus:outline-none"
                                  aria-label={`Remove ${lang}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ErrorMessage error={formErrors.spokenLanguages} fieldName="spokenLanguages" />
                    </div>
                    <div className="group">
                      <label htmlFor="nationalities" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <Flag className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                        className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                          formErrors.nationalities
                            ? 'border-red-400 bg-red-50'
                            : focusedField === 'nationalities' 
                            ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        aria-describedby="nationalities-error"
                        aria-invalid={!!formErrors.nationalities}
                      />
                      <ErrorMessage error={formErrors.nationalities} fieldName="nationalities" />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="group">
                    <label htmlFor="category" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Globe className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                      className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                        formErrors.category
                          ? 'border-red-400 bg-red-50'
                          : focusedField === 'category' 
                          ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      aria-describedby="category-error"
                      aria-invalid={!!formErrors.category}
                    >
                      <option value="">
                        {t.selectCategory}
                      </option>
                      {categories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.emoji} {category.label}
                        </option>
                      ))}
                    </select>
                    <ErrorMessage error={formErrors.category} fieldName="category" />
                  </div>

                  {/* Subject */}
                  <div className="group">
                    <label htmlFor="subject" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                      className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 touch-manipulation ${
                        formErrors.subject
                          ? 'border-red-400 bg-red-50'
                          : focusedField === 'subject' 
                          ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      aria-describedby="subject-error"
                      aria-invalid={!!formErrors.subject}
                    />
                    <ErrorMessage error={formErrors.subject} fieldName="subject" />
                  </div>

                  {/* Message */}
                  <div className="group">
                    <label htmlFor="message" className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
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
                      className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 resize-none touch-manipulation ${
                        formErrors.message
                          ? 'border-red-400 bg-red-50'
                          : focusedField === 'message' 
                          ? 'border-red-400 bg-white shadow-lg scale-[1.02]' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      aria-describedby="message-error"
                      aria-invalid={!!formErrors.message}
                    />
                    <ErrorMessage error={formErrors.message} fieldName="message" />
                  </div>

                  {/* Progress indicator */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200" role="status" aria-live="polite">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span className="text-sm text-gray-600 mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                        {t.responseTime}
                      </span>
                      <span className="font-semibold text-green-600">
                        {t.maxTime}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden="true">
                      <div className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full w-4/5"></div>
                    </div>
                  </div>

                  {/* Terms and Conditions Checkbox */}
                  <div className="group">
                    <div className={`flex items-start space-x-3 p-4 rounded-2xl border-2 transition-all duration-300 ${
                      formErrors.acceptTerms
                        ? 'border-red-400 bg-red-50'
                        : acceptTerms
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptTerms}
                        onChange={(e) => {
                          setAcceptTerms(e.target.checked);
                          // Effacer l'erreur si cochée
                          if (e.target.checked && formErrors.acceptTerms) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.acceptTerms;
                              return newErrors;
                            });
                          }
                        }}
                        className="w-5 h-5 text-red-500 border-2 border-gray-300 rounded focus:ring-red-500 focus:ring-2 mt-0.5 touch-manipulation"
                        aria-describedby="acceptTerms-error"
                        aria-invalid={!!formErrors.acceptTerms}
                      />
                      <label htmlFor="acceptTerms" className="text-sm text-gray-700 flex-1 cursor-pointer">
                        {t.acceptTerms}{' '}
                        <a
                          href={t.termsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-800 underline font-semibold transition-colors duration-200"
                          onClick={(e) => e.stopPropagation()} // Empêche de cocher la case lors du clic sur le lien
                        >
                          {t.termsAndConditions}
                        </a>
                        {' *'}
                      </label>
                    </div>
                    <ErrorMessage error={formErrors.acceptTerms} fieldName="acceptTerms" />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      loading={isLoading}
                      fullWidth
                      size="large"
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-5 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 transition-all duration-300 text-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                      aria-label={t.sendMessage}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center" aria-hidden="true">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                          {t.sending}
                        </div>
                      ) : (
                        <>
                          <Send size={24} className="mr-3" aria-hidden="true" />
                          {t.sendMessage}
                        </>
                      )}
                    </Button>

                    {/* Security note */}
                    <div className="text-center text-xs text-gray-500 mt-4">
                      <div className="flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse" aria-hidden="true"></div>
                        {t.secureData}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </main>

        {/* SEO Footer Information */}
        <footer className="bg-white/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-2">
                {t.seoDescription}
              </p>
              <p>
                {t.seoFeatures}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default Contact;