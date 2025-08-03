import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Globe, MapPin, Users, Phone, X, Camera, CheckCircle, ArrowRight, Heart } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp } from 'firebase/firestore';

// Types pour les langues
interface LanguageOption {
  value: string;
  label: string;
}

// Lazy loading des composants
const ImageUploader = lazy(() => import('../components/common/ImageUploader'));
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// Constants
const COUNTRY_OPTIONS = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola', 
  'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan', 
  'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize', 'Bénin', 
  'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 
  'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun', 
  'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores', 
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie', 'Cuba', 
  'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée', 
  'Espagne', 'Estonie', 'États-Unis', 'Éthiopie', 'Fidji', 'Finlande', 'France', 'Autre'
];

const HELP_TYPE_OPTIONS = [
  'Démarches administratives', 'Recherche de logement', 'Ouverture de compte bancaire',
  'Système de santé', 'Éducation et écoles', 'Transport', 'Recherche d\'emploi',
  'Création d\'entreprise', 'Fiscalité locale', 'Culture et intégration',
  'Visa et immigration', 'Assurances', 'Téléphonie et internet',
  'Alimentation et courses', 'Loisirs et sorties', 'Sports et activités',
  'Sécurité', 'Urgences', 'Autre'
];

const COUNTRY_CODES = [
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne' },
  { code: '+39', flag: '🇮🇹', name: 'Italie' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: '+31', flag: '🇳🇱', name: 'Pays-Bas' },
  { code: '+43', flag: '🇦🇹', name: 'Autriche' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' }
];

// Regex pour validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;

// Interface pour les données du formulaire
interface ExpatFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  phoneCountryCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  currentCountry: string;
  currentPresenceCountry: string;
  customCountry: string;
  customPresenceCountry: string;
  preferredLanguage: 'fr' | 'en';
  practiceCountries: string[];
  customPracticeCountry: string;
  interventionCountry: string;
  customInterventionCountry: string;
  helpTypes: string[];
  customHelpType: string;
  customLanguage: string;
  yearsAsExpat: number;
  profilePhoto: string;
  bio: string;
  availability: 'available' | 'busy' | 'offline';
  acceptTerms: boolean;
}

// Props pour FormField
interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  icon?: React.ReactNode;
  error?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}

// Configuration i18n simplifiée
const texts = {
  title: 'Inscription Expatrié Aidant',
  subtitle: 'Partagez votre expérience d\'expatriation et aidez d\'autres francophones à réussir leur nouvelle vie à l\'étranger',
  alreadyRegistered: 'Déjà inscrit ?',
  login: 'Se connecter',
  personalInfo: 'Informations personnelles',
  required: 'obligatoire',
  loading: 'Création en cours...',
  createAccount: 'Créer mon compte expatrié aidant',
  acceptTerms: 'J\'accepte les',
  termsLink: 'conditions générales pour expatriés aidants',
  fields: {
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    email: 'Adresse email',
    password: 'Mot de passe',
    phone: 'Téléphone',
    whatsappNumber: 'Numéro WhatsApp',
    interventionCountry: 'Pays d\'intervention principal',
    yearsAsExpat: 'Années d\'expérience d\'expatriation',
    bio: 'Description de votre expérience',
    profilePhoto: 'Photo de profil'
  },
  errors: {
    allFieldsRequired: 'Tous les champs obligatoires doivent être remplis',
    invalidEmail: 'Veuillez saisir une adresse email valide',
    emailAlreadyExists: 'Cette adresse email est déjà utilisée',
    passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
    phoneRequired: 'Le numéro de téléphone est obligatoire',
    phoneInvalid: 'Le numéro de téléphone n\'est pas valide',
    whatsappRequired: 'Le numéro WhatsApp est obligatoire',
    selectCountryError: 'Veuillez sélectionner votre pays',
    selectInterventionCountry: 'Veuillez sélectionner votre pays d\'intervention',
    selectLanguage: 'Veuillez sélectionner au moins une langue',
    selectHelpType: 'Veuillez indiquer au moins un domaine d\'aide',
    bioRequired: 'La description est obligatoire',
    bioTooShort: 'La description doit contenir au moins 50 caractères',
    profilePhotoRequired: 'La photo de profil est obligatoire',
    acceptTermsRequired: 'Vous devez accepter les conditions générales',
    yearsAsExpatRequired: 'Vous devez avoir au moins 1 an d\'expérience',
    registrationError: 'Erreur lors de l\'inscription',
    networkError: 'Erreur de connexion',
    serverError: 'Erreur du serveur'
  },
  success: {
    registrationSuccess: 'Inscription réussie ! Bienvenue dans la communauté.'
  }
};

// Composant FormField
const FormField = React.memo<FormFieldProps>(({ 
  id, 
  name, 
  label, 
  type = 'text', 
  required = false, 
  value, 
  onChange, 
  placeholder, 
  autoComplete, 
  className = '', 
  icon, 
  error,
  maxLength,
  min,
  max
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseClasses = `
    w-full px-4 py-3 border-2 rounded-xl font-medium
    transition-all duration-300 bg-white focus:outline-none
    ${icon ? 'pl-12' : ''}
    ${isFocused ? 'border-blue-500 shadow-lg' : ''}
    ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
  `;
  
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-bold text-gray-800">
        {label} 
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${baseClasses} ${className}`}
          maxLength={maxLength}
          min={min}
          max={max}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

// Composant TagSelector
const TagSelector = React.memo(({ 
  items, 
  onRemove, 
  color = 'green'
}: { 
  items: string[];
  onRemove: (item: string) => void;
  color?: 'green' | 'blue';
}) => {
  if (items.length === 0) return null;

  const colorClasses = color === 'green' 
    ? 'bg-green-100 text-green-800 border-green-300' 
    : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3">
        {items.map((item, index) => (
          <div 
            key={`${item}-${index}`}
            className={`${colorClasses} px-4 py-2 rounded-xl text-sm flex items-center gap-2 border-2 font-medium`}
          >
            <span>{item}</span>
            <button 
              type="button" 
              onClick={() => onRemove(item)}
              className="text-current hover:bg-black hover:bg-opacity-20 rounded-full p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

TagSelector.displayName = 'TagSelector';

// Composant LoadingSpinner
const LoadingSpinner = React.memo(() => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// Composant ProgressBar
const ProgressBar = React.memo(({ progress }: { progress: number }) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-bold text-gray-700">Progression</span>
      <span className="text-sm font-bold text-blue-600">{progress}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div 
        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-700"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
));

ProgressBar.displayName = 'ProgressBar';

// Composant SectionHeader
const SectionHeader = React.memo(({ 
  icon, 
  title, 
  subtitle, 
  step, 
  totalSteps 
}: { 
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
}) => (
  <div className="flex items-center space-x-4 mb-8">
    <div className="relative">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-4 shadow-lg">
        <div className="text-white">{icon}</div>
      </div>
      {step && totalSteps && (
        <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-1 shadow-md border-2 border-blue-200">
          <span className="text-xs font-bold text-blue-600">{step}/{totalSteps}</span>
        </div>
      )}
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900">
        {title}
      </h2>
      {subtitle && (
        <p className="text-gray-600 mt-1 font-medium">{subtitle}</p>
      )}
    </div>
  </div>
));

SectionHeader.displayName = 'SectionHeader';

// Composant principal
const RegisterExpat: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const { language } = useApp();

  // État du formulaire
  const [formData, setFormData] = useState<ExpatFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    phoneCountryCode: '+33',
    whatsappCountryCode: '+33',
    whatsappNumber: '',
    currentCountry: '',
    currentPresenceCountry: '',
    customCountry: '',
    customPresenceCountry: '',
    preferredLanguage: language as 'fr' | 'en',
    practiceCountries: [],
    customPracticeCountry: '',
    interventionCountry: '',
    customInterventionCountry: '',
    helpTypes: [],
    customHelpType: '',
    customLanguage: '',
    yearsAsExpat: 0,
    profilePhoto: '',
    bio: '',
    availability: 'available',
    acceptTerms: false
  });

  const [selectedLanguages, setSelectedLanguages] = useState<LanguageOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCustomHelpType, setShowCustomHelpType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcul du progrès
  const formProgress = useMemo(() => {
    const fields = [
      formData.firstName.trim().length > 0,
      formData.lastName.trim().length > 0,
      formData.email.trim().length > 0 && EMAIL_REGEX.test(formData.email),
      formData.password.length >= 6,
      formData.phone.trim().length >= 6,
      formData.whatsappNumber.trim().length >= 6,
      formData.currentCountry.trim().length > 0,
      formData.currentPresenceCountry.trim().length > 0,
      formData.interventionCountry.trim().length > 0,
      formData.yearsAsExpat >= 1,
      formData.bio.trim().length >= 50,
      formData.profilePhoto.length > 0,
      formData.helpTypes.length > 0,
      selectedLanguages.length > 0,
      formData.acceptTerms
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [formData, selectedLanguages]);

  // Validation des champs
  const validateField = useCallback((name: string, value: string | number | boolean): string => {
    switch (name) {
      case 'email':
        if (!value) return texts.errors.allFieldsRequired;
        if (!EMAIL_REGEX.test(value as string)) return texts.errors.invalidEmail;
        return '';
      
      case 'password':
        if (!value) return texts.errors.allFieldsRequired;
        if ((value as string).length < 6) return texts.errors.passwordTooShort;
        return '';
      
      case 'phone':
        if (!value) return texts.errors.phoneRequired;
        if (!PHONE_REGEX.test(value as string)) return texts.errors.phoneInvalid;
        return '';
      
      case 'whatsappNumber':
        if (!value) return texts.errors.whatsappRequired;
        return '';
      
      case 'bio':
        if (!value) return texts.errors.bioRequired;
        if ((value as string).length < 50) return texts.errors.bioTooShort;
        return '';
      
      case 'yearsAsExpat':
        if (!value || (value as number) < 1) return texts.errors.yearsAsExpatRequired;
        return '';
      
      default:
        return '';
    }
  }, []);

  // Gestionnaire de changement
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                      type === 'number' ? Number(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    
    const error = validateField(name, finalValue);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));

    if (formError) {
      setFormError('');
    }
  }, [validateField, formError]);

  // Gestionnaire pour les types d'aide
  const handleHelpTypeSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedHelpType = e.target.value;
    
    if (!selectedHelpType) return;
    
    if (selectedHelpType === 'Autre') {
      setShowCustomHelpType(true);
      return;
    }
    
    if (!formData.helpTypes.includes(selectedHelpType)) {
      setFormData(prev => ({
        ...prev,
        helpTypes: [...prev.helpTypes, selectedHelpType]
      }));
    }
    
    e.target.value = '';
  }, [formData.helpTypes]);
  
  const handleRemoveHelpType = useCallback((helpType: string) => {
    setFormData(prev => ({
      ...prev,
      helpTypes: prev.helpTypes.filter(type => type !== helpType)
    }));
  }, []);
  
  const handleAddCustomHelpType = useCallback(() => {
    const customType = formData.customHelpType.trim();
    if (customType && !formData.helpTypes.includes(customType)) {
      setFormData(prev => ({
        ...prev,
        helpTypes: [...prev.helpTypes, customType],
        customHelpType: ''
      }));
      setShowCustomHelpType(false);
    }
  }, [formData.customHelpType, formData.helpTypes]);

  // Validation complète
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) errors.firstName = texts.errors.allFieldsRequired;
    if (!formData.lastName.trim()) errors.lastName = texts.errors.allFieldsRequired;
    if (!formData.email.trim()) errors.email = texts.errors.allFieldsRequired;
    else if (!EMAIL_REGEX.test(formData.email)) errors.email = texts.errors.invalidEmail;
    if (!formData.password) errors.password = texts.errors.allFieldsRequired;
    else if (formData.password.length < 6) errors.password = texts.errors.passwordTooShort;
    if (!formData.phone.trim()) errors.phone = texts.errors.phoneRequired;
    if (!formData.whatsappNumber.trim()) errors.whatsappNumber = texts.errors.whatsappRequired;
    if (!formData.currentCountry) errors.currentCountry = texts.errors.selectCountryError;
    if (!formData.currentPresenceCountry) errors.currentPresenceCountry = texts.errors.selectCountryError;
    if (!formData.interventionCountry) errors.interventionCountry = texts.errors.selectInterventionCountry;
    if (formData.helpTypes.length === 0) errors.helpTypes = texts.errors.selectHelpType;
    if (selectedLanguages.length === 0) errors.languages = texts.errors.selectLanguage;
    if (!formData.bio.trim()) errors.bio = texts.errors.bioRequired;
    else if (formData.bio.length < 50) errors.bio = texts.errors.bioTooShort;
    if (!formData.profilePhoto) errors.profilePhoto = texts.errors.profilePhotoRequired;
    if (!formData.acceptTerms) errors.acceptTerms = texts.errors.acceptTermsRequired;
    if (formData.yearsAsExpat < 1) errors.yearsAsExpat = texts.errors.yearsAsExpatRequired;
    
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setFormError(texts.errors.allFieldsRequired);
      return false;
    }
    
    return true;
  }, [formData, selectedLanguages]);

  // Soumission du formulaire
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setFormError('');

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const userData = {
        role: 'expat' as const,
        type: 'expat' as const,
        email: formData.email.trim().toLowerCase(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phoneCountryCode + formData.phone.trim(),
        whatsapp: formData.whatsappCountryCode + formData.whatsappNumber.trim(),
        currentCountry: formData.currentCountry,
        country: formData.currentPresenceCountry,
        interventionCountry: formData.interventionCountry,
        profilePhoto: formData.profilePhoto,
        bio: formData.bio.trim(),
        languages: selectedLanguages.map((lang) => lang.value),
        helpTypes: formData.helpTypes,
        yearsAsExpat: formData.yearsAsExpat,
        availability: formData.availability,
        isApproved: true,
        isVisible: true,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await register(userData, formData.password);
      
      navigate('/dashboard', { 
        state: { 
          message: texts.success.registrationSuccess,
          type: 'success'
        } 
      });
      
    } catch (error: any) {
      console.error('Erreur inscription:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setFieldErrors(prev => ({ ...prev, email: texts.errors.emailAlreadyExists }));
        setFormError(texts.errors.emailAlreadyExists);
      } else if (error.code === 'auth/network-request-failed') {
        setFormError(texts.errors.networkError);
      } else {
        setFormError(error.message || texts.errors.registrationError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedLanguages, validateForm, register, navigate, isSubmitting]);

  // Options mémorisées
  const countrySelectOptions = useMemo(() => 
    COUNTRY_OPTIONS.map(country => (
      <option key={country} value={country}>{country}</option>
    )), []
  );

  const helpTypeSelectOptions = useMemo(() => 
    HELP_TYPE_OPTIONS.map(helpType => (
      <option key={helpType} value={helpType}>{helpType}</option>
    )), []
  );

  const countryCodeOptions = useMemo(() => 
    COUNTRY_CODES.map(({ code, flag, name }) => (
      <option key={code} value={code}>{flag} {code} ({name})</option>
    )), []
  );

  // Vérification de soumission
  const canSubmit = useMemo(() => {
    return formData.email && 
           formData.password && 
           formData.firstName && 
           formData.lastName && 
           formData.interventionCountry && 
           formData.acceptTerms &&
           formData.bio &&
           formData.profilePhoto &&
           selectedLanguages.length > 0 &&
           formData.helpTypes.length > 0 &&
           Object.keys(fieldErrors).length === 0 &&
           !isLoading && 
           !isSubmitting;
  }, [formData, selectedLanguages, fieldErrors, isLoading, isSubmitting]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          
          <ProgressBar progress={formProgress} />

          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-black mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {texts.title}
              </span>
            </h1>
            
            <p className="text-base text-gray-700 mb-6 font-medium">
              {texts.subtitle}
            </p>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-blue-200 inline-block">
              <p className="text-gray-700 font-medium">
                {texts.alreadyRegistered}{' '}
                <Link 
                  to="/login" 
                  className="text-blue-600 hover:text-blue-700 font-bold underline"
                >
                  {texts.login} →
                </Link>
              </p>
            </div>
          </header>

          {/* Formulaire */}
          <main className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <form onSubmit={handleSubmit} className="divide-y divide-gray-50" noValidate>
              
              {/* Messages d'erreur */}
              {(error || formError) && (
                <div className="p-6 bg-red-50 border-l-4 border-red-500">
                  <div className="flex items-start">
                    <AlertCircle className="h-6 w-6 text-red-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-bold text-red-800 mb-2">
                        Erreur lors de l'inscription
                      </h3>
                      <div className="text-red-700">
                        {error || formError}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Informations personnelles */}
              <section className="p-6 space-y-6">
                <SectionHeader
                  icon={<Users className="w-6 h-6" />}
                  title={texts.personalInfo}
                  subtitle="Commençons par vous connaître"
                  step={1}
                  totalSteps={3}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="firstName"
                    name="firstName"
                    label={texts.fields.firstName}
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    autoComplete="given-name"
                    error={fieldErrors.firstName}
                    placeholder="Jean"
                  />

                  <FormField
                    id="lastName"
                    name="lastName"
                    label={texts.fields.lastName}
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    autoComplete="family-name"
                    error={fieldErrors.lastName}
                    placeholder="Dupont"
                  />
                </div>

                <FormField
                  id="email"
                  name="email"
                  label={texts.fields.email}
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  placeholder="jean.dupont@example.com"
                  icon={<Mail className="h-5 w-5" />}
                  error={fieldErrors.email}
                />

                <div className="space-y-3">
                  <label htmlFor="password" className="block text-sm font-bold text-gray-800">
                    {texts.fields.password} <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="new-password"
                      className={`w-full pl-12 pr-16 py-3 border-2 rounded-xl font-medium transition-all duration-300 bg-white focus:outline-none ${
                        fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.password}
                    </p>
                  )}
                  {formData.password && (
                    <div className="text-sm">
                      Force du mot de passe: <span className={`font-bold ${
                        formData.password.length < 6 ? 'text-red-500' : 
                        formData.password.length < 10 ? 'text-orange-500' : 'text-green-500'
                      }`}>
                        {formData.password.length < 6 ? 'Faible' : 
                         formData.password.length < 10 ? 'Moyen' : 'Solide'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Section téléphone */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                    <Phone className="w-5 h-5 text-blue-600 mr-3" />
                    Informations de contact
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label htmlFor="phoneCountryCode" className="block text-sm font-bold text-gray-800 mb-2">
                        Code pays <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="phoneCountryCode"
                        name="phoneCountryCode"
                        value={formData.phoneCountryCode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border-2 border-gray-300 rounded-xl font-medium bg-white focus:outline-none focus:border-blue-500"
                      >
                        {countryCodeOptions}
                      </select>
                    </div>
                    
                    <div className="col-span-2">
                      <FormField
                        id="phone"
                        name="phone"
                        label="Téléphone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleInputChange}
                        error={fieldErrors.phone}
                        placeholder="123456789"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="whatsappCountryCode" className="block text-sm font-bold text-gray-800 mb-2">
                        WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="whatsappCountryCode"
                        name="whatsappCountryCode"
                        value={formData.whatsappCountryCode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-3 border-2 border-gray-300 rounded-xl font-medium bg-white focus:outline-none focus:border-green-500"
                      >
                        {countryCodeOptions}
                      </select>
                    </div>
                    
                    <div className="col-span-2">
                      <FormField
                        id="whatsappNumber"
                        name="whatsappNumber"
                        label="Numéro WhatsApp"
                        type="tel"
                        required
                        value={formData.whatsappNumber}
                        onChange={handleInputChange}
                        error={fieldErrors.whatsappNumber}
                        placeholder="612345678"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Informations géographiques */}
              <section className="p-6 space-y-6">
                <SectionHeader
                  icon={<Globe className="w-6 h-6" />}
                  title="Informations géographiques et expérience"
                  subtitle="Où évoluez-vous ?"
                  step={2}
                  totalSteps={3}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="currentCountry" className="block text-sm font-bold text-gray-800 mb-3">
                      Pays de résidence <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                      <select
                        id="currentCountry"
                        name="currentCountry"
                        required
                        value={formData.currentCountry}
                        onChange={handleInputChange}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium bg-white focus:outline-none ${
                          fieldErrors.currentCountry ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="">Sélectionnez votre pays</option>
                        {countrySelectOptions}
                      </select>
                    </div>
                    {fieldErrors.currentCountry && (
                      <p className="text-sm text-red-600 flex items-center mt-2">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {fieldErrors.currentCountry}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="currentPresenceCountry" className="block text-sm font-bold text-gray-800 mb-3">
                      Pays de présence actuel <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                      <select
                        id="currentPresenceCountry"
                        name="currentPresenceCountry"
                        required
                        value={formData.currentPresenceCountry}
                        onChange={handleInputChange}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium bg-white focus:outline-none ${
                          fieldErrors.currentPresenceCountry ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="">Sélectionnez votre pays de présence</option>
                        {countrySelectOptions}
                      </select>
                    </div>
                    {fieldErrors.currentPresenceCountry && (
                      <p className="text-sm text-red-600 flex items-center mt-2">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {fieldErrors.currentPresenceCountry}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="interventionCountry" className="block text-sm font-bold text-gray-800 mb-3">
                      {texts.fields.interventionCountry} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                      <select
                        id="interventionCountry"
                        name="interventionCountry"
                        required
                        value={formData.interventionCountry}
                        onChange={handleInputChange}
                        className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium bg-white focus:outline-none ${
                          fieldErrors.interventionCountry ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="">Sélectionnez votre pays</option>
                        {countrySelectOptions}
                      </select>
                    </div>
                    {fieldErrors.interventionCountry && (
                      <p className="text-sm text-red-600 flex items-center mt-2">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {fieldErrors.interventionCountry}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="yearsAsExpat" className="block text-sm font-bold text-gray-800 mb-3">
                      {texts.fields.yearsAsExpat} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="yearsAsExpat"
                      name="yearsAsExpat"
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={formData.yearsAsExpat || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl font-medium bg-white focus:outline-none ${
                        fieldErrors.yearsAsExpat ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="5"
                    />
                    {fieldErrors.yearsAsExpat && (
                      <p className="text-sm text-red-600 flex items-center mt-2">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {fieldErrors.yearsAsExpat}
                      </p>
                    )}
                  </div>
                </div>

                {/* Langues parlées */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="text-xl mr-3">🗣️</span>
                    Langues parlées <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <Suspense fallback={<LoadingSpinner />}>
                    <MultiLanguageSelect
                      value={selectedLanguages}
                      onChange={(value) => {
                        setSelectedLanguages(value as LanguageOption[]);
                        
                        if ((value as LanguageOption[]).length > 0 && fieldErrors.languages) {
                          setFieldErrors(prev => {
                            const { languages: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                  </Suspense>
                  
                  {fieldErrors.languages && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.languages}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="text-xl mr-3">📝</span>
                    {texts.fields.bio} <span className="text-red-500 ml-2">*</span>
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    required
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={5}
                    maxLength={500}
                    className={`w-full px-4 py-3 border-2 rounded-xl font-medium bg-white focus:outline-none min-h-[120px] resize-y ${
                      fieldErrors.bio ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Décrivez votre parcours d'expatriation, vos compétences et comment vous pouvez aider d'autres expatriés..."
                  />
                  {fieldErrors.bio && (
                    <p className="text-sm text-red-600 flex items-center mt-2">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.bio}
                    </p>
                  )}
                  <div className="flex justify-between text-sm mt-3">
                    <div className="text-gray-600">
                      {formData.bio.length < 50 ? (
                        <span className="text-orange-600 font-medium">
                          Plus que {50 - formData.bio.length} caractères pour valider ce champ
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">✓ Champ validé</span>
                      )}
                    </div>
                    <span className={`font-bold ${formData.bio.length > 450 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {formData.bio.length}/500
                    </span>
                  </div>
                </div>

                {/* Photo de profil */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Camera className="w-5 h-5 text-pink-600 mr-3" />
                    {texts.fields.profilePhoto} <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <Suspense fallback={<LoadingSpinner />}>
                    <ImageUploader
                      onImageUploaded={(url) => {
                        setFormData(prev => ({ ...prev, profilePhoto: url }));
                        
                        if (fieldErrors.profilePhoto) {
                          setFieldErrors(prev => {
                            const { profilePhoto: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      currentImage={formData.profilePhoto}
                    />
                  </Suspense>
                  
                  {fieldErrors.profilePhoto && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.profilePhoto}
                    </p>
                  )}
                </div>
              </section>

              {/* Section 3: Types d'aide */}
              <section className="p-6 space-y-6">
                <SectionHeader
                  icon={<Heart className="w-6 h-6" />}
                  title="Comment voulez-vous aider ?"
                  subtitle="Définissez vos domaines d'expertise"
                  step={3}
                  totalSteps={3}
                />

                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    Domaines d'aide <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <TagSelector
                    items={formData.helpTypes}
                    onRemove={handleRemoveHelpType}
                    color="green"
                  />
                  
                  <select
                    onChange={handleHelpTypeSelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-medium bg-white focus:outline-none focus:border-green-500"
                  >
                    <option value="">Ajouter un domaine d'aide</option>
                    {helpTypeSelectOptions}
                  </select>
                  
                  {fieldErrors.helpTypes && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.helpTypes}
                    </p>
                  )}
                  
                  {showCustomHelpType && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          placeholder="Précisez le type d'aide"
                          value={formData.customHelpType}
                          onChange={(e) => setFormData(prev => ({ ...prev, customHelpType: e.target.value }))}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomHelpType}
                          disabled={!formData.customHelpType.trim()}
                          className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 font-bold"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Conditions générales et soumission */}
              <section className="p-6 space-y-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 flex-shrink-0"
                      required
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-700 font-medium">
                      {texts.acceptTerms}{' '}
                      <Link 
                        to="/cgu-expatries" 
                        className="text-blue-600 hover:text-blue-700 underline font-bold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {texts.termsLink}
                      </Link>{' '}
                      <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {fieldErrors.acceptTerms && (
                    <p className="text-sm text-red-600 flex items-center mt-3 ml-9">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.acceptTerms}
                    </p>
                  )}
                </div>

                {/* Bouton de soumission */}
                <div className="text-center">
                  <Button
                    type="submit"
                    loading={isLoading || isSubmitting}
                    fullWidth={true}
                    size="large"
                    className={`
                      ${canSubmit 
                        ? 'bg-gradient-to-r from-green-500 via-blue-600 to-purple-700 hover:from-green-600 hover:via-blue-700 hover:to-purple-800 shadow-xl' 
                        : 'bg-gray-400 cursor-not-allowed opacity-60'
                      } 
                      text-white font-black py-4 px-6 rounded-2xl text-lg w-full
                    `}
                    disabled={!canSubmit}
                  >
                    {isLoading || isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent mr-3"></div>
                        <span>{texts.loading}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 mr-3" />
                        <span>
                          {canSubmit 
                            ? `${texts.createAccount} 🎉` 
                            : `Compléter (${formProgress}%)`
                          }
                        </span>
                      </div>
                    )}
                  </Button>
                  
                  {/* Indicateur de progression */}
                  {!canSubmit && (
                    <div className="mt-4">
                      <div className="bg-white bg-opacity-20 rounded-xl px-6 py-3 inline-block">
                        <p className="text-white font-bold text-sm">
                          ⚠️ Complétion: {formProgress}% - Plus que quelques champs !
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {canSubmit && (
                    <div className="mt-4">
                      <div className="bg-green-500 bg-opacity-20 rounded-xl px-6 py-3 inline-block border border-green-400 border-opacity-50">
                        <p className="text-white font-bold text-sm">
                          ✅ Formulaire complet - Prêt pour l'inscription !
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center pt-4">
                  <p className="text-xs text-white text-opacity-80 font-medium">
                    🔒 Données protégées • Support 24/7
                  </p>
                </div>
              </section>
            </form>
          </main>

          {/* Footer */}
          <footer className="text-center mt-8 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h3 className="text-xl font-black text-gray-900 mb-3">
                🌍 Rejoignez la communauté d'entraide expatriée
              </h3>
              <p className="text-sm text-gray-700 font-medium">
                En vous inscrivant, vous rejoignez une communauté de <strong className="text-blue-600">plus de 10 000 expatriés francophones</strong> 
                dans le monde.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 font-medium">
              <Link to="/confidentialite" className="hover:text-blue-600 underline">
                🔒 Confidentialité
              </Link>
              <Link to="/cgu-expatries" className="hover:text-purple-600 underline">
                📋 CGU
              </Link>
              <Link to="/aide" className="hover:text-green-600 underline">
                💬 Aide
              </Link>
              <Link to="/contact" className="hover:text-orange-600 underline">
                📧 Contact
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterExpat;