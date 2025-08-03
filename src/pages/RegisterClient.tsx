import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Flag, MapPin, UserCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp } from 'firebase/firestore';
import { MultiValue } from 'react-select';

// Lazy loading des composants lourds pour améliorer le temps de chargement initial
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// Constants optimisées et externalisées
const COUNTRY_OPTIONS = Object.freeze([
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola', 
  'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan', 
  'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin', 
  'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 
  'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun', 
  'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores', 
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie', 'Cuba', 
  'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée', 
  'Espagne', 'Estonie', 'États-Unis', 'Éthiopie', 'Fidji', 'Finlande', 'France', 'Autre'
]);

const EXPAT_STATUSES = Object.freeze([
  { value: '', label: 'Sélectionnez votre statut' },
  { value: 'expat', label: 'Expatrié' },
  { value: 'traveler', label: 'Voyageur ponctuel' },
  { value: 'investor', label: 'Investisseur' },
  { value: 'digital_nomad', label: 'Digital Nomade' },
  { value: 'retired_expat', label: 'Retraité expatrié' },
  { value: 'student', label: 'Étudiant à l\'étranger' },
  { value: 'other', label: 'Autre' }
]);

// Regex pré-compilées pour améliorer les performances
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Interface pour le formulaire optimisée
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nationality: string;
  currentCountry: string;
  customCountry: string;
  status: string;
  languagesSpoken: string[];
  customLanguage: string;
}

// Configuration i18n - Préparée pour l'internationalisation
const i18nConfig = {
  fr: {
    // Métadonnées SEO
    meta: {
      title: 'Inscription Client - Accédez à notre réseau d\'experts',
      description: 'Créez votre compte client et accédez à notre réseau d\'expatriés aidants. Trouvez l\'aide dont vous avez besoin pour votre expatriation.',
      keywords: 'inscription client, expatriation, aide, experts, réseau'
    },
    // Interface utilisateur
    ui: {
      title: 'Inscription Client',
      subtitle: 'Créez votre compte pour accéder à notre réseau d\'experts',
      alreadyRegistered: 'Déjà inscrit ?',
      login: 'Se connecter',
      personalInfo: 'Informations personnelles',
      geographicInfo: 'Informations géographiques',
      acceptTerms: 'J\'accepte les',
      termsLink: 'conditions générales pour clients',
      createAccount: 'Créer mon compte client',
      required: 'obligatoire',
      loading: 'Création en cours...'
    },
    // Champs du formulaire
    fields: {
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Adresse email',
      password: 'Mot de passe',
      nationality: 'Nationalité',
      residenceCountry: 'Pays de résidence',
      status: 'Statut',
      languagesSpoken: 'Langues parlées'
    },
    // Actions
    actions: {
      addLanguage: 'Ajouter une langue',
      remove: 'Supprimer',
      selectCountry: 'Sélectionnez un pays',
      specifyCountry: 'Précisez votre pays',
      specifyLanguage: 'Précisez la langue',
      add: 'Ajouter'
    },
    // Textes d'aide
    help: {
      minPassword: 'Minimum 6 caractères',
      emailPlaceholder: 'votre@email.com',
      firstNamePlaceholder: 'Votre prénom',
      lastNamePlaceholder: 'Votre nom',
      nationalityPlaceholder: 'Votre nationalité'
    },
    // Messages d'erreur
    errors: {
      allFieldsRequired: 'Tous les champs obligatoires doivent être remplis',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      invalidEmail: 'Veuillez saisir une adresse email valide',
      selectCountryError: 'Veuillez sélectionner votre pays de résidence',
      specifyCountryError: 'Veuillez préciser votre pays de résidence',
      selectLanguage: 'Veuillez sélectionner au moins une langue parlée',
      registrationError: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
    }
  },
  en: {
    meta: {
      title: 'Client Registration - Access our network of experts',
      description: 'Create your client account and access our network of expat helpers. Find the help you need for your expatriation.',
      keywords: 'client registration, expatriation, help, experts, network'
    },
    ui: {
      title: 'Client Registration',
      subtitle: 'Create your account to access our network of experts',
      alreadyRegistered: 'Already registered?',
      login: 'Log in',
      personalInfo: 'Personal Information',
      geographicInfo: 'Geographic Information',
      acceptTerms: 'I accept the',
      termsLink: 'general terms for clients',
      createAccount: 'Create my client account',
      required: 'required',
      loading: 'Creating account...'
    },
    fields: {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email Address',
      password: 'Password',
      nationality: 'Nationality',
      residenceCountry: 'Country of Residence',
      status: 'Status',
      languagesSpoken: 'Languages Spoken'
    },
    actions: {
      addLanguage: 'Add a language',
      remove: 'Remove',
      selectCountry: 'Select a country',
      specifyCountry: 'Specify your country',
      specifyLanguage: 'Specify the language',
      add: 'Add'
    },
    help: {
      minPassword: 'Minimum 6 characters',
      emailPlaceholder: 'your@email.com',
      firstNamePlaceholder: 'Your first name',
      lastNamePlaceholder: 'Your last name',
      nationalityPlaceholder: 'Your nationality'
    },
    errors: {
      allFieldsRequired: 'All required fields must be filled',
      passwordTooShort: 'Password must contain at least 6 characters',
      invalidEmail: 'Please enter a valid email address',
      selectCountryError: 'Please select your country of residence',
      specifyCountryError: 'Please specify your country of residence',
      selectLanguage: 'Please select at least one spoken language',
      registrationError: 'An error occurred during registration. Please try again.'
    }
  }
} as const;

// Composant CustomFieldInput optimisé
const CustomFieldInput = React.memo(({ 
  placeholder, 
  value, 
  onChange, 
  onAdd, 
  disabled 
}: { 
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  disabled: boolean;
}) => (
  <div className="mt-3 flex flex-col sm:flex-row gap-2">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
      onKeyPress={(e) => e.key === 'Enter' && !disabled && onAdd()}
    />
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
    >
      Ajouter
    </button>
  </div>
));

CustomFieldInput.displayName = 'CustomFieldInput';

// Composant principal
const RegisterClient: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const { language } = useApp();
  
  // Configuration i18n basée sur la langue actuelle
  const t = i18nConfig[language as keyof typeof i18nConfig] || i18nConfig.fr;

  // État initial du formulaire
  const initialFormData: FormData = useMemo(() => ({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    nationality: '',
    currentCountry: '',
    customCountry: '',
    status: '',
    languagesSpoken: [],
    customLanguage: ''
  }), []);

  // États du composant
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<{ value: string; label: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);

  // SEO - Mise à jour des métadonnées
  useEffect(() => {
    document.title = t.meta.title;
    
    // Mise à jour des métadonnées
    const updateMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('description', t.meta.description);
    updateMetaTag('keywords', t.meta.keywords);
    
    // Open Graph
    updateMetaTag('og:title', t.meta.title);
    updateMetaTag('og:description', t.meta.description);
    updateMetaTag('og:type', 'website');

    return () => {
      // Nettoyage si nécessaire
    };
  }, [t.meta]);

  // Classes CSS optimisées
  const inputClasses = useMemo(() => 
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300 text-sm",
    []
  );
  
  const requiredInputClasses = useMemo(() => 
    `${inputClasses} bg-gray-50 focus:bg-white hover:bg-white`,
    [inputClasses]
  );

  const inputWithIconClasses = useMemo(() => 
    `${requiredInputClasses} pl-10`,
    [requiredInputClasses]
  );

  // Validation email optimisée avec regex pré-compilée
  const isValidEmail = useCallback((email: string): boolean => {
    return EMAIL_REGEX.test(email);
  }, []);

  // Fonction pour faire défiler vers le haut
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Gestionnaire générique pour les changements d'input - optimisé
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Gérer l'affichage des champs personnalisés
    if (name === 'currentCountry') {
      setShowCustomCountry(value === 'Autre');
    }

    // Clear errors when user starts typing
    if (formError) {
      setFormError('');
    }
  }, [formError]);

  // Gestion des langues avec MultiLanguageSelect - optimisée
  const handleAddCustomLanguage = useCallback(() => {
    const customLang = formData.customLanguage.trim();
    if (customLang && !selectedLanguages.some(lang => lang.value === customLang)) {
      const newLanguage = { value: customLang, label: customLang };
      setSelectedLanguages(prev => [...prev, newLanguage]);
      setFormData(prev => ({ 
        ...prev, 
        customLanguage: '',
        languagesSpoken: [...prev.languagesSpoken, customLang]
      }));
      setShowCustomLanguage(false);
    }
  }, [formData.customLanguage, selectedLanguages]);

  // Gestion du changement des langues sélectionnées
  const handleLanguagesChange = useCallback((newValue: MultiValue<{ value: string; label: string }>) => {
    setSelectedLanguages(newValue);
    setFormData(prev => ({
      ...prev,
      languagesSpoken: newValue.map(lang => lang.value)
    }));
    
    // Vérifier si "Autre" est sélectionné
    setShowCustomLanguage(newValue.some(lang => lang.value === 'other'));
  }, []);

  // Validation du formulaire - optimisée
  const validateForm = useCallback((): boolean => {
    const { firstName, lastName, email, password, currentCountry, customCountry, languagesSpoken } = formData;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      setFormError(t.errors.allFieldsRequired);
      scrollToTop();
      return false;
    }

    if (password.length < 6) {
      setFormError(t.errors.passwordTooShort);
      scrollToTop();
      return false;
    }

    if (!isValidEmail(email)) {
      setFormError(t.errors.invalidEmail);
      scrollToTop();
      return false;
    }

    if (!currentCountry) {
      setFormError(t.errors.selectCountryError);
      scrollToTop();
      return false;
    }

    if (currentCountry === 'Autre' && !customCountry?.trim()) {
      setFormError(t.errors.specifyCountryError);
      scrollToTop();
      return false;
    }
    
    if (languagesSpoken.length === 0) {
      setFormError(t.errors.selectLanguage);
      scrollToTop();
      return false;
    }

    return true;
  }, [formData, t.errors, scrollToTop, isValidEmail]);

  // Soumission du formulaire - optimisée
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    try {
      const userData = {
        role: 'client' as const,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        nationality: formData.nationality.trim(),
        currentCountry: formData.currentCountry === 'Autre' ? formData.customCountry.trim() : formData.currentCountry,
        status: formData.status,
        languagesSpoken: formData.languagesSpoken,
        isApproved: true,
        createdAt: serverTimestamp()
      };

      console.log('📝 Données envoyées pour l\'inscription client:', userData);

      await register(userData, formData.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription client:', error);
      setFormError(t.errors.registrationError);
      scrollToTop();
    }
  }, [formData, validateForm, register, navigate, t.errors.registrationError, scrollToTop]);

  // Options mémorisées pour éviter les re-renders
  const countrySelectOptions = useMemo(() => 
    COUNTRY_OPTIONS.map(country => (
      <option key={country} value={country}>{country}</option>
    )), []
  );

  const expatStatusOptions = useMemo(() => 
    EXPAT_STATUSES.map(status => (
      <option key={status.value} value={status.value}>{status.label}</option>
    )), []
  );

  // Vérification si le formulaire peut être soumis
  const canSubmit = useMemo(() => {
    return formData.email && 
           formData.password && 
           formData.firstName && 
           formData.lastName && 
           formData.currentCountry &&
           formData.languagesSpoken.length > 0 &&
           !isLoading;
  }, [formData.email, formData.password, formData.firstName, formData.lastName, formData.currentCountry, formData.languagesSpoken.length, isLoading]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8 lg:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* En-tête optimisé pour mobile */}
          <header className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 rounded-full p-3 sm:p-4 shadow-sm">
                <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 px-2">
              {t.ui.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 px-4 max-w-2xl mx-auto leading-relaxed">
              {t.ui.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-3">
              {t.ui.alreadyRegistered}{' '}
              <Link 
                to="/login" 
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 underline"
              >
                {t.ui.login}
              </Link>
            </p>
          </header>

          {/* Formulaire principal */}
          <main className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-8" noValidate>
              {/* Messages d'erreur améliorés */}
              {(error || formError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Erreur d'inscription
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error || formError}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Informations personnelles */}
              <section className="space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-gray-600" />
                  {t.ui.personalInfo}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      {t.fields.firstName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={requiredInputClasses}
                      placeholder={t.help.firstNamePlaceholder}
                      aria-describedby="firstName-required"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      {t.fields.lastName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={requiredInputClasses}
                      placeholder={t.help.lastNamePlaceholder}
                      aria-describedby="lastName-required"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fields.email} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={inputWithIconClasses}
                      placeholder={t.help.emailPlaceholder}
                      aria-describedby="email-required"
                    />
                    <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fields.password} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300 bg-gray-50 focus:bg-white hover:bg-white text-sm"
                      placeholder={t.help.minPassword}
                      aria-describedby="password-requirements"
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </section>

              {/* Section 2: Informations géographiques */}
              <section className="space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-600" />
                  {t.ui.geographicInfo}
                </h2>

                <div>
                  <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fields.nationality}
                  </label>
                  <div className="relative">
                    <input
                      id="nationality"
                      name="nationality"
                      type="text"
                      autoComplete="country"
                      value={formData.nationality}
                      onChange={handleInputChange}
                      className={inputWithIconClasses}
                      placeholder={t.help.nationalityPlaceholder}
                    />
                    <Flag className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label htmlFor="currentCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fields.residenceCountry} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      id="currentCountry"
                      name="currentCountry"
                      required
                      value={formData.currentCountry}
                      onChange={handleInputChange}
                      className={inputWithIconClasses}
                      aria-describedby="currentCountry-required"
                    >
                      <option value="">{t.actions.selectCountry}</option>
                      {countrySelectOptions}
                    </select>
                  </div>
                  
                  {showCustomCountry && (
                    <CustomFieldInput
                      placeholder={t.actions.specifyCountry}
                      value={formData.customCountry}
                      onChange={(value) => setFormData(prev => ({ ...prev, customCountry: value }))}
                      onAdd={() => {
                        setFormData(prev => ({ ...prev, currentCountry: prev.customCountry, customCountry: '' }));
                        setShowCustomCountry(false);
                      }}
                      disabled={!formData.customCountry}
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fields.status}
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={inputClasses}
                  >
                    {expatStatusOptions}
                  </select>
                </div>

                {/* Langues parlées avec MultiLanguageSelect */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fields.languagesSpoken} <span className="text-red-500">*</span>
                  </label>
                  
                  <Suspense fallback={
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                      <div className="text-gray-500 text-sm">Chargement des langues...</div>
                    </div>
                  }>
                    <MultiLanguageSelect
                      value={selectedLanguages}
                      onChange={handleLanguagesChange}
                    />
                  </Suspense>
                  
                  {showCustomLanguage && (
                    <CustomFieldInput
                      placeholder={t.actions.specifyLanguage}
                      value={formData.customLanguage}
                      onChange={(value) => setFormData(prev => ({ ...prev, customLanguage: value }))}
                      onAdd={handleAddCustomLanguage}
                      disabled={!formData.customLanguage.trim()}
                    />
                  )}
                </div>
              </section>

              {/* Conditions générales */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                    {t.ui.acceptTerms}{' '}
                    <Link 
                      to="/cgu-clients" 
                      className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors duration-200"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.ui.termsLink}
                    </Link>{' '}
                    <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              {/* Bouton de soumission optimisé */}
              <div className="pt-4">
                <Button
                  type="submit"
                  loading={isLoading}
                  fullWidth={true}
                  size="large"
                  className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-base sm:text-lg py-3 sm:py-4 font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!canSubmit}
                >
                  {isLoading ? t.ui.loading : t.ui.createAccount}
                </Button>
                
                {/* Indicateur de progression visuel */}
                {!canSubmit && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500">
                      Veuillez remplir tous les champs obligatoires (*)
                    </p>
                  </div>
                )}
              </div>
            </form>
          </main>

          {/* Footer informatif */}
          <footer className="text-center mt-8 text-xs text-gray-500 px-4">
            <p>
              En vous inscrivant, vous rejoignez notre réseau de clients et bénéficiez de l'aide d'expatriés expérimentés.
              Votre compte sera immédiatement actif après validation !
            </p>
          </footer>
        </div>
      </div>

      {/* Schema.org structured data pour le SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": t.meta.title,
          "description": t.meta.description,
          "url": window.location.href,
          "mainEntity": {
            "@type": "Organization",
            "name": "Réseau Expatriés",
            "description": "Réseau d'aide pour clients en expatriation"
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Inscription Client",
                "item": "/register-client"
              }
            ]
          }
        })}
      </script>
    </Layout>
  );
};

// Export avec React.memo pour optimiser les re-renders
export default React.memo(RegisterClient);