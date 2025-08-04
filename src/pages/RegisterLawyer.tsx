import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, Eye, EyeOff, AlertCircle, Globe, MapPin, Award, Phone, CheckCircle, XCircle, Users, Camera, Heart, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MultiValue } from 'react-select';

// Lazy loading des composants
const ImageUploader = lazy(() => import('../components/common/ImageUploader'));
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// Constants pour éviter la duplication
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
] as const;

const SPECIALTY_OPTIONS = [
  'Droit de l\'immigration', 'Droit du travail', 'Droit immobilier', 
  'Droit des affaires', 'Droit de la famille', 'Droit pénal', 
  'Droit fiscal', 'Droit international', 'Droit des contrats', 
  'Propriété intellectuelle', 'Droit de la consommation', 'Droit bancaire',
  'Droit des assurances', 'Droit de l\'environnement', 'Droit médical',
  'Droit des nouvelles technologies', 'Droit des sociétés', 'Droit des successions',
  'Droit administratif', 'Droit constitutionnel', 'Droit européen',
  'Droit des étrangers', 'Droit des transports', 'Droit maritime',
  'Droit aérien', 'Droit du sport', 'Droit de la presse', 'Autre'
] as const;

const CERTIFICATION_OPTIONS = [
  'Barreau du Québec', 'Barreau de Paris', 'Barreau de Montréal',
  'Certification Immigration Canada', 'Certification Droit des Affaires',
  'Certification Droit Immobilier', 'Certification Droit Fiscal',
  'Certification Droit de la Famille', 'Autre'
] as const;

const COUNTRY_CODES = [
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne' },
  { code: '+39', flag: '🇮🇹', name: 'Italie' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: '+31', flag: '🇳🇱', name: 'Pays-Bas' },
  { code: '+43', flag: '🇦🇹', name: 'Autriche' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+30', flag: '🇬🇷', name: 'Grèce' },
  { code: '+66', flag: '🇹🇭', name: 'Thaïlande' },
  { code: '+61', flag: '🇦🇺', name: 'Australie' },
  { code: '+64', flag: '🇳🇿', name: 'Nouvelle-Zélande' },
  { code: '+81', flag: '🇯🇵', name: 'Japon' },
  { code: '+82', flag: '🇰🇷', name: 'Corée du Sud' },
  { code: '+65', flag: '🇸🇬', name: 'Singapour' },
  { code: '+852', flag: '🇭🇰', name: 'Hong Kong' },
  { code: '+86', flag: '🇨🇳', name: 'Chine' },
  { code: '+91', flag: '🇮🇳', name: 'Inde' },
  { code: '+971', flag: '🇦🇪', name: 'Émirats' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+965', flag: '🇰🇼', name: 'Koweït' },
  { code: '+966', flag: '🇸🇦', name: 'Arabie Saoudite' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: '+27', flag: '🇿🇦', name: 'Afrique du Sud' },
  { code: '+55', flag: '🇧🇷', name: 'Brésil' },
  { code: '+52', flag: '🇲🇽', name: 'Mexique' },
  { code: '+54', flag: '🇦🇷', name: 'Argentine' },
  { code: '+56', flag: '🇨🇱', name: 'Chili' },
  { code: '+57', flag: '🇨🇴', name: 'Colombie' },
  { code: '+51', flag: '🇵🇪', name: 'Pérou' },
  { code: '+7', flag: '🇷🇺', name: 'Russie' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+48', flag: '🇵🇱', name: 'Pologne' },
  { code: '+420', flag: '🇨🇿', name: 'République tchèque' },
  { code: '+36', flag: '🇭🇺', name: 'Hongrie' },
  { code: '+40', flag: '🇷🇴', name: 'Roumanie' },
  { code: '+359', flag: '🇧🇬', name: 'Bulgarie' },
  { code: '+385', flag: '🇭🇷', name: 'Croatie' },
  { code: '+381', flag: '🇷🇸', name: 'Serbie' },
  { code: '+386', flag: '🇸🇮', name: 'Slovénie' },
  { code: '+421', flag: '🇸🇰', name: 'Slovaquie' },
  { code: '+372', flag: '🇪🇪', name: 'Estonie' },
  { code: '+371', flag: '🇱🇻', name: 'Lettonie' },
  { code: '+370', flag: '🇱🇹', name: 'Lituanie' }
] as const;

// Interface pour le formulaire
interface LawyerFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  phoneCountryCode: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  currentCountry: string;
  currentPresenceCountry: string;
  customCountry: string;
  preferredLanguage: 'fr' | 'en';
  practiceCountries: string[];
  customPracticeCountry: string;
  yearsOfExperience: number;
  specialties: string[];
  customSpecialty: string;
  barNumber: string;
  graduationYear: number;
  profilePhoto: string;
  bio: string;
  certifications: string[];
  education: string;
  availability: 'available' | 'busy' | 'offline';
  acceptTerms: boolean;
  customCertification: string;
  price: number;
  duration: number;
}

// Interface pour les options de langue (avec codes ISO)
interface LanguageOption {
  value: string; // Code ISO (ex: "fr", "en", "ar")
  label: string; // Nom complet (ex: "Français", "English", "العربية")
}

// Interface pour le statut de vérification email
interface EmailCheckStatus {
  isChecking: boolean;
  isAvailable: boolean | null;
  hasBeenChecked: boolean;
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

// Textes pour i18n
const texts = {
  title: 'Inscription Avocat',
  subtitle: 'Rejoignez notre réseau d\'avocats vérifiés et aidez des expatriés francophones dans leurs démarches juridiques',
  alreadyRegistered: 'Déjà inscrit ?',
  login: 'Se connecter',
  personalInfo: 'Informations personnelles',
  geographicInfo: 'Informations géographiques',
  professionalInfo: 'Informations professionnelles',
  pricingInfo: 'Tarification',
  validationNotice: 'Validation manuelle',
  validationText: 'Votre compte sera validé manuellement par notre équipe après vérification sous 24h.',
  acceptTerms: 'J\'accepte les',
  termsLink: 'conditions générales pour avocats',
  createAccount: 'Créer mon compte avocat',
  required: 'obligatoire',
  loading: 'Création en cours...',
  // Champs
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'Adresse email',
  password: 'Mot de passe',
  confirmPassword: 'Confirmer le mot de passe',
  phone: 'Numéro de téléphone',
  whatsappNumber: 'Numéro WhatsApp',
  countryCode: 'Indicatif pays',
  residenceCountry: 'Pays de résidence',
  currentPresenceCountry: 'Pays de présence actuel',
  barNumber: 'Numéro au barreau',
  yearsOfExperience: 'Années d\'expérience',
  graduationYear: 'Année de diplôme',
  bio: 'Description professionnelle',
  profilePhoto: 'Photo de profil',
  specialties: 'Spécialités',
  practiceCountries: 'Pays d\'intervention',
  languagesSpoken: 'Langues parlées',
  certifications: 'Certifications',
  price: 'Prix par consultation (€)',
  duration: 'Durée de consultation (min)',
  // Email status
  emailChecking: 'Vérification de l\'email en cours...',
  emailAvailable: 'Email disponible',
  emailTaken: 'Cet email est déjà utilisé',
  emailCheckError: 'Erreur lors de la vérification de l\'email',
  // Erreurs
  allFieldsRequired: 'Tous les champs obligatoires doivent être remplis',
  passwordMismatch: 'Les mots de passe ne correspondent pas',
  passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
  selectCountry: 'Veuillez sélectionner votre pays de résidence',
  specifyCountry: 'Veuillez préciser votre pays de résidence',
  selectPracticeCountry: 'Veuillez sélectionner au moins un pays d\'intervention',
  selectLanguage: 'Veuillez sélectionner au moins une langue parlée',
  selectSpecialty: 'Veuillez sélectionner au moins une spécialité',
  barNumberRequired: 'Le numéro au barreau est obligatoire',
  bioRequired: 'La description professionnelle est obligatoire',
  phoneRequired: 'Le numéro de téléphone est obligatoire',
  whatsappRequired: 'Le numéro WhatsApp est obligatoire',
  whatsappInvalid: 'Le numéro WhatsApp doit être au format international valide',
  presenceCountryRequired: 'Le pays de présence actuel est obligatoire',
  profilePhotoRequired: 'La photo de profil est obligatoire',
  selectCertification: 'Veuillez sélectionner au moins une certification',
  acceptTermsRequired: 'Vous devez accepter les conditions générales pour les avocats',
  priceRequired: 'Le prix par consultation est obligatoire',
  priceInvalid: 'Le prix doit être supérieur à 0',
  durationRequired: 'La durée de consultation est obligatoire',
  durationInvalid: 'La durée doit être supérieure à 0',
  emailAlreadyUsed: 'Cet email est déjà utilisé par un autre compte',
  emailValidRequired: 'Veuillez utiliser un email valide et disponible'
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
  color = 'blue'
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
        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
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

const RegisterLawyer: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const { language } = useApp();
  
  // État initial du formulaire
  const initialFormData: LawyerFormData = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneCountryCode: '+33',
    whatsappCountryCode: '+33',
    whatsappNumber: '',
    currentCountry: '',
    currentPresenceCountry: '',
    customCountry: '',
    preferredLanguage: 'fr',
    practiceCountries: [],
    customPracticeCountry: '',
    yearsOfExperience: 0,
    specialties: [],
    customSpecialty: '',
    barNumber: '',
    graduationYear: new Date().getFullYear() - 5,
    profilePhoto: '',
    bio: '',
    certifications: [],
    education: '',
    availability: 'available',
    acceptTerms: false,
    customCertification: '',
    price: 49,
    duration: 20
  };

  const [lawyerForm, setLawyerForm] = useState<LawyerFormData>(initialFormData);
  
  // État typé pour les langues avec codes ISO
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomSpecialty, setShowCustomSpecialty] = useState(false);
  const [showCustomCertification, setShowCustomCertification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // État pour la vérification de l'email
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>({
    isChecking: false,
    isAvailable: null,
    hasBeenChecked: false
  });

  // État pour le timeout de vérification email
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calcul du progrès
  const formProgress = useMemo(() => {
    const fields = [
      lawyerForm.firstName.trim().length > 0,
      lawyerForm.lastName.trim().length > 0,
      lawyerForm.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lawyerForm.email),
      lawyerForm.password.length >= 6,
      lawyerForm.phone.trim().length >= 6,
      lawyerForm.whatsappNumber.trim().length >= 6,
      lawyerForm.currentCountry.trim().length > 0,
      lawyerForm.currentPresenceCountry.trim().length > 0,
      lawyerForm.barNumber.trim().length > 0,
      lawyerForm.yearsOfExperience >= 0,
      lawyerForm.bio.trim().length >= 50,
      lawyerForm.profilePhoto.length > 0,
      lawyerForm.specialties.length > 0,
      lawyerForm.certifications.length > 0,
      lawyerForm.practiceCountries.length > 0,
      selectedLanguages.length > 0,
      lawyerForm.price > 0,
      lawyerForm.duration > 0,
      lawyerForm.acceptTerms
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [lawyerForm, selectedLanguages]);

  // Fonction pour vérifier l'unicité de l'email
  const checkEmailAvailability = useCallback(async (email: string): Promise<boolean> => {
    try {
      // Nettoyer l'email
      const cleanEmail = email.trim().toLowerCase();
      
      // Vérifier le format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return false;
      }

      // Requête Firestore pour vérifier l'existence
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnapshot = await getDocs(q);
      
      // L'email est disponible si aucun document n'est trouvé
      return querySnapshot.empty;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de l\'email:', error);
      return false;
    }
  }, []);

  // Debounced email check
  const handleEmailCheck = useCallback(async (email: string) => {
    // Nettoyer le timeout précédent
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout);
    }

    // Ne vérifier que si l'email a un format valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailStatus({
        isChecking: false,
        isAvailable: null,
        hasBeenChecked: false
      });
      return;
    }

    // Démarrer la vérification avec un délai
    setEmailStatus(prev => ({ ...prev, isChecking: true }));

    const timeout = setTimeout(async () => {
      try {
        const isAvailable = await checkEmailAvailability(email);
        setEmailStatus({
          isChecking: false,
          isAvailable,
          hasBeenChecked: true
        });
      } catch (error) {
        console.error('❌ Erreur vérification email:', error);
        setEmailStatus({
          isChecking: false,
          isAvailable: false,
          hasBeenChecked: true
        });
      }
    }, 800); // Délai de 800ms pour éviter trop de requêtes

    setEmailCheckTimeout(timeout);
  }, [emailCheckTimeout, checkEmailAvailability]);

  // Fonction pour convertir codes ISO en noms complets pour l'affichage
  const getLanguageDisplayName = useCallback((isoCode: string): string => {
    const languageMap: Record<string, string> = {
      'fr': 'Français',
      'en': 'English',
      'es': 'Español',
      'ar': 'العربية',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'nl': 'Nederlands',
      'pl': 'Polski',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk',
      'fi': 'Suomi',
      'tr': 'Türkçe',
      'he': 'עברית',
      'hi': 'हिन्दी',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'id': 'Bahasa Indonesia',
      'ms': 'Bahasa Melayu',
      'tl': 'Filipino',
      'sw': 'Kiswahili',
      'am': 'አማርኛ',
      'bn': 'বাংলা',
      'ur': 'اردو',
      'fa': 'فارسی',
      'ta': 'தமிழ்',
      'te': 'తెలుగు',
      'ml': 'മലയാളം',
      'kn': 'ಕನ್ನಡ',
      'gu': 'ગુજરાતી',
      'pa': 'ਪੰਜਾਬੀ',
      'mr': 'मराठी',
      'ne': 'नेपाली',
      'si': 'සිංහල',
      'my': 'မြန်မာ',
      'km': 'ខ្មែរ',
      'lo': 'ລາວ',
      'ka': 'ქართული',
      'hy': 'հայերեն',
      'az': 'Azərbaycan',
      'kk': 'Қазақ',
      'ky': 'Кыргыз',
      'uz': 'O\'zbek',
      'mn': 'Монгол',
      'bo': 'བོད་སྐད།',
      'dz': 'རྫོང་ཁ',
      'mk': 'Македонски',
      'bg': 'Български',
      'hr': 'Hrvatski',
      'sr': 'Српски',
      'bs': 'Bosanski',
      'sq': 'Shqip',
      'sl': 'Slovenščina',
      'sk': 'Slovenčina',
      'cs': 'Čeština',
      'hu': 'Magyar',
      'ro': 'Română',
      'el': 'Ελληνικά',
      'lv': 'Latviešu',
      'lt': 'Lietuvių',
      'et': 'Eesti',
      'mt': 'Malti',
      'is': 'Íslenska',
      'ga': 'Gaeilge',
      'cy': 'Cymraeg',
      'eu': 'Euskera',
      'ca': 'Català',
      'gl': 'Galego',
      'ast': 'Asturianu'
    };
    
    return languageMap[isoCode] || isoCode.toUpperCase();
  }, []);

  // Gestionnaire générique pour les changements d'input avec vérification email
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setLawyerForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
    
    // Vérification email en temps réel
    if (name === 'email') {
      handleEmailCheck(value);
    }
    
    // Gérer l'affichage des champs personnalisés
    if (name === 'currentCountry') {
      setShowCustomCountry(value === 'Autre');
    }

    // Clear field errors
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }

    if (formError) {
      setFormError('');
    }
  }, [handleEmailCheck, fieldErrors, formError]);

  // Gestion des pays d'intervention
  const handlePracticeCountrySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    
    if (selectedCountry === 'Autre') {
      setShowCustomCountry(true);
      return;
    }
    
    if (selectedCountry && !lawyerForm.practiceCountries.includes(selectedCountry)) {
      setLawyerForm(prev => ({
        ...prev,
        practiceCountries: [...prev.practiceCountries, selectedCountry]
      }));
    }
    
    e.target.value = '';
  }, [lawyerForm.practiceCountries]);
  
  const handleRemovePracticeCountry = useCallback((country: string) => {
    setLawyerForm(prev => ({
      ...prev,
      practiceCountries: prev.practiceCountries.filter(c => c !== country)
    }));
  }, []);
  
  const handleAddCustomPracticeCountry = useCallback(() => {
    if (lawyerForm.customPracticeCountry && !lawyerForm.practiceCountries.includes(lawyerForm.customPracticeCountry)) {
      setLawyerForm(prev => ({
        ...prev,
        practiceCountries: [...prev.practiceCountries, prev.customPracticeCountry],
        customPracticeCountry: ''
      }));
      setShowCustomCountry(false);
    }
  }, [lawyerForm.customPracticeCountry, lawyerForm.practiceCountries]);
  
  // Gestion des spécialités
  const handleSpecialtySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSpecialty = e.target.value;
    
    if (selectedSpecialty === 'Autre') {
      setShowCustomSpecialty(true);
      return;
    }
    
    if (selectedSpecialty && !lawyerForm.specialties.includes(selectedSpecialty)) {
      setLawyerForm(prev => ({
        ...prev,
        specialties: [...prev.specialties, selectedSpecialty]
      }));
    }
    
    e.target.value = '';
  }, [lawyerForm.specialties]);
  
  const handleRemoveSpecialty = useCallback((specialty: string) => {
    setLawyerForm(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  }, []);
  
  const handleAddCustomSpecialty = useCallback(() => {
    if (lawyerForm.customSpecialty && !lawyerForm.specialties.includes(lawyerForm.customSpecialty)) {
      setLawyerForm(prev => ({
        ...prev,
        specialties: [...prev.specialties, prev.customSpecialty],
        customSpecialty: ''
      }));
      setShowCustomSpecialty(false);
    }
  }, [lawyerForm.customSpecialty, lawyerForm.specialties]);
  
  // Gestion des certifications
  const handleCertificationSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCertification = e.target.value;
    
    if (selectedCertification === 'Autre') {
      setShowCustomCertification(true);
      return;
    }
    
    if (selectedCertification && !lawyerForm.certifications.includes(selectedCertification)) {
      setLawyerForm(prev => ({
        ...prev,
        certifications: [...prev.certifications, selectedCertification]
      }));
    }
    
    e.target.value = '';
  }, [lawyerForm.certifications]);
  
  const handleRemoveCertification = useCallback((certification: string) => {
    setLawyerForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== certification)
    }));
  }, []);
  
  const handleAddCustomCertification = useCallback(() => {
    if (lawyerForm.customCertification && !lawyerForm.certifications.includes(lawyerForm.customCertification)) {
      setLawyerForm(prev => ({
        ...prev,
        certifications: [...prev.certifications, prev.customCertification],
        customCertification: ''
      }));
      setShowCustomCertification(false);
    }
  }, [lawyerForm.customCertification, lawyerForm.certifications]);

  // Validation du formulaire avec vérification email
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Vérification de l'email en premier
    if (!emailStatus.hasBeenChecked || emailStatus.isChecking) {
      errors.email = 'Veuillez attendre la vérification de l\'email';
    }

    if (emailStatus.isAvailable === false) {
      errors.email = texts.emailAlreadyUsed;
    }

    // Validation des champs obligatoires
    if (!lawyerForm.firstName.trim()) errors.firstName = texts.allFieldsRequired;
    if (!lawyerForm.lastName.trim()) errors.lastName = texts.allFieldsRequired;
    if (!lawyerForm.email.trim()) errors.email = texts.allFieldsRequired;
    if (!lawyerForm.password) errors.password = texts.allFieldsRequired;
    else if (lawyerForm.password.length < 6) errors.password = texts.passwordTooShort;
    if (lawyerForm.password !== lawyerForm.confirmPassword) errors.confirmPassword = texts.passwordMismatch;
    if (!lawyerForm.phone.trim()) errors.phone = texts.phoneRequired;
    if (!lawyerForm.whatsappNumber.trim()) errors.whatsappNumber = texts.whatsappRequired;
    if (!lawyerForm.currentCountry) errors.currentCountry = texts.selectCountry;
    if (lawyerForm.currentCountry === 'Autre' && !lawyerForm.customCountry) errors.customCountry = texts.specifyCountry;
    if (!lawyerForm.currentPresenceCountry) errors.currentPresenceCountry = texts.presenceCountryRequired;
    if (lawyerForm.practiceCountries.length === 0) errors.practiceCountries = texts.selectPracticeCountry;
    if (selectedLanguages.length === 0) errors.languages = texts.selectLanguage;
    if (lawyerForm.specialties.length === 0) errors.specialties = texts.selectSpecialty;
    if (!lawyerForm.barNumber.trim()) errors.barNumber = texts.barNumberRequired;
    if (!lawyerForm.bio.trim()) errors.bio = texts.bioRequired;
    else if (lawyerForm.bio.length < 50) errors.bio = 'La description doit contenir au moins 50 caractères';
    if (!lawyerForm.profilePhoto) errors.profilePhoto = texts.profilePhotoRequired;
    if (lawyerForm.certifications.length === 0) errors.certifications = texts.selectCertification;
    if (!lawyerForm.price || lawyerForm.price <= 0) errors.price = texts.priceInvalid;
    if (!lawyerForm.duration || lawyerForm.duration <= 0) errors.duration = texts.durationInvalid;
    if (!lawyerForm.acceptTerms) errors.acceptTerms = texts.acceptTermsRequired;

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setFormError(texts.allFieldsRequired);
      return false;
    }

    return true;
  }, [lawyerForm, selectedLanguages, emailStatus]);

  // Soumission du formulaire avec codes ISO pour les langues
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
      // Extraction des codes ISO pour l'enregistrement en base
      const languageCodesISO = selectedLanguages.map((lang) => lang.value);
      
      // Création des noms complets pour l'affichage côté client
      const languageDisplayNames = selectedLanguages.map((lang) => 
        getLanguageDisplayName(lang.value)
      );

      console.log('🌐 Langues sélectionnées:', {
        codesISO: languageCodesISO,
        displayNames: languageDisplayNames,
        selectedLanguages: selectedLanguages
      });

      // Données utilisateur compatibles avec ProfileCards
      const userData = {
        role: 'lawyer' as const,
        type: 'lawyer' as const,
        email: lawyerForm.email.trim().toLowerCase(),
        fullName: `${lawyerForm.firstName.trim()} ${lawyerForm.lastName.trim()}`,
        name: `${lawyerForm.firstName.trim()} ${lawyerForm.lastName.trim()}`,
        firstName: lawyerForm.firstName.trim(),
        lastName: lawyerForm.lastName.trim(),
        phone: lawyerForm.phoneCountryCode + lawyerForm.phone.trim(),
        whatsapp: lawyerForm.whatsappCountryCode + lawyerForm.whatsappNumber.trim(),
        phoneCountryCode: lawyerForm.phoneCountryCode,
        whatsappCountryCode: lawyerForm.whatsappCountryCode,
        whatsappNumber: lawyerForm.whatsappNumber.trim(),
        currentCountry: lawyerForm.currentCountry === 'Autre' ? lawyerForm.customCountry : lawyerForm.currentCountry,
        country: lawyerForm.currentPresenceCountry,
        currentPresenceCountry: lawyerForm.currentPresenceCountry,
        practiceCountries: lawyerForm.practiceCountries,
        profilePhoto: lawyerForm.profilePhoto,
        photoURL: lawyerForm.profilePhoto,
        avatar: lawyerForm.profilePhoto,
        
        // Enregistrement avec codes ISO
        languages: languageCodesISO,
        languagesSpoken: languageCodesISO,
        
        // Noms complets pour l'affichage
        languageDisplayNames: languageDisplayNames,
        
        specialties: lawyerForm.specialties,
        certifications: lawyerForm.certifications,
        education: lawyerForm.education,
        barNumber: lawyerForm.barNumber.trim(),
        yearsOfExperience: lawyerForm.yearsOfExperience,
        graduationYear: lawyerForm.graduationYear,
        bio: lawyerForm.bio.trim(),
        description: lawyerForm.bio.trim(),
        price: lawyerForm.price,
        duration: lawyerForm.duration,
        availability: lawyerForm.availability,
        isOnline: lawyerForm.availability === 'available',
        isApproved: false,
        isVisible: true,
        isActive: true,
        rating: 4.5,
        reviewCount: 0,
        preferredLanguage: lawyerForm.preferredLanguage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('📝 Données envoyées pour l\'inscription avocat:', userData);

      await register(userData, lawyerForm.password);
      
      navigate('/dashboard', { 
        state: { 
          message: 'Inscription réussie ! Votre compte sera validé sous 24h.',
          type: 'success'
        } 
      });
      
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'inscription avocat:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setFieldErrors(prev => ({ ...prev, email: texts.emailAlreadyUsed }));
        setFormError(texts.emailAlreadyUsed);
      } else if (error.code === 'auth/network-request-failed') {
        setFormError('Erreur de connexion réseau');
      } else {
        setFormError(error.message || 'Erreur lors de l\'inscription');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [lawyerForm, selectedLanguages, validateForm, register, navigate, getLanguageDisplayName, isSubmitting]);

  // Options mémorisées pour éviter les re-renders
  const countrySelectOptions = useMemo(() => 
    COUNTRY_OPTIONS.map(country => (
      <option key={country} value={country}>{country}</option>
    )), []
  );

  const specialtySelectOptions = useMemo(() => 
    SPECIALTY_OPTIONS.map(specialty => (
      <option key={specialty} value={specialty}>{specialty}</option>
    )), []
  );

  const certificationSelectOptions = useMemo(() => 
    CERTIFICATION_OPTIONS.map(certification => (
      <option key={certification} value={certification}>{certification}</option>
    )), []
  );

  const countryCodeOptions = useMemo(() => 
    COUNTRY_CODES.map(({ code, flag, name }) => (
      <option key={code} value={code}>{flag} {code} ({name})</option>
    )), []
  );

  // Rendu du statut de l'email
  const renderEmailStatus = useCallback(() => {
    if (!lawyerForm.email) return null;

    if (emailStatus.isChecking) {
      return (
        <div className="mt-1 flex items-center text-sm text-blue-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
          {texts.emailChecking}
        </div>
      );
    }

    if (emailStatus.hasBeenChecked) {
      if (emailStatus.isAvailable) {
        return (
          <div className="mt-1 flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            {texts.emailAvailable}
          </div>
        );
      } else {
        return (
          <div className="mt-1 flex items-center text-sm text-red-600">
            <XCircle className="h-4 w-4 mr-1" />
            {texts.emailTaken}
          </div>
        );
      }
    }

    return null;
  }, [lawyerForm.email, emailStatus]);

  // Vérification de soumission
  const canSubmit = useMemo(() => {
    return lawyerForm.email && 
           lawyerForm.password && 
           lawyerForm.firstName && 
           lawyerForm.lastName && 
           lawyerForm.barNumber && 
           lawyerForm.acceptTerms &&
           lawyerForm.bio &&
           lawyerForm.profilePhoto &&
           selectedLanguages.length > 0 &&
           lawyerForm.specialties.length > 0 &&
           lawyerForm.certifications.length > 0 &&
           lawyerForm.practiceCountries.length > 0 &&
           Object.keys(fieldErrors).length === 0 &&
           !isLoading && 
           !isSubmitting;
  }, [lawyerForm, selectedLanguages, fieldErrors, isLoading, isSubmitting]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 py-8">
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
                  totalSteps={4}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="firstName"
                    name="firstName"
                    label={texts.firstName}
                    type="text"
                    required
                    value={lawyerForm.firstName}
                    onChange={handleInputChange}
                    autoComplete="given-name"
                    error={fieldErrors.firstName}
                    placeholder="Jean"
                  />

                  <FormField
                    id="lastName"
                    name="lastName"
                    label={texts.lastName}
                    type="text"
                    required
                    value={lawyerForm.lastName}
                    onChange={handleInputChange}
                    autoComplete="family-name"
                    error={fieldErrors.lastName}
                    placeholder="Dupont"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="email" className="block text-sm font-bold text-gray-800">
                    {texts.email} <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={lawyerForm.email}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl font-medium transition-all duration-300 bg-white focus:outline-none ${
                        emailStatus.hasBeenChecked 
                          ? emailStatus.isAvailable 
                            ? 'border-green-300 focus:border-green-500' 
                            : 'border-red-300 focus:border-red-500'
                          : fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="avocat@example.com"
                      autoComplete="email"
                    />
                  </div>
                  {renderEmailStatus()}
                  {fieldErrors.email && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label htmlFor="password" className="block text-sm font-bold text-gray-800">
                      {texts.password} <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={lawyerForm.password}
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
                    {lawyerForm.password && (
                      <div className="text-sm">
                        Force du mot de passe: <span className={`font-bold ${
                          lawyerForm.password.length < 6 ? 'text-red-500' : 
                          lawyerForm.password.length < 10 ? 'text-orange-500' : 'text-green-500'
                        }`}>
                          {lawyerForm.password.length < 6 ? 'Faible' : 
                           lawyerForm.password.length < 10 ? 'Moyen' : 'Solide'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-800">
                      {texts.confirmPassword} <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={lawyerForm.confirmPassword}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        className={`w-full pl-12 pr-16 py-3 border-2 rounded-xl font-medium transition-all duration-300 bg-white focus:outline-none ${
                          fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Confirmer"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>
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
                        value={lawyerForm.phoneCountryCode}
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
                        value={lawyerForm.phone}
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
                        value={lawyerForm.whatsappCountryCode}
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
                        value={lawyerForm.whatsappNumber}
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
                  title={texts.geographicInfo}
                  subtitle="Où exercez-vous ?"
                  step={2}
                  totalSteps={4}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="currentCountry" className="block text-sm font-bold text-gray-800 mb-3">
                      {texts.residenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                      <select
                        id="currentCountry"
                        name="currentCountry"
                        required
                        value={lawyerForm.currentCountry}
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
                    
                    {showCustomCountry && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-xl border">
                        <input
                          type="text"
                          placeholder="Précisez votre pays"
                          value={lawyerForm.customCountry}
                          onChange={(e) => setLawyerForm(prev => ({ ...prev, customCountry: e.target.value }))}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                          required={lawyerForm.currentCountry === 'Autre'}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="currentPresenceCountry" className="block text-sm font-bold text-gray-800 mb-3">
                      {texts.currentPresenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                      <select
                        id="currentPresenceCountry"
                        name="currentPresenceCountry"
                        required
                        value={lawyerForm.currentPresenceCountry}
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
                    <p className="text-xs text-gray-500 mt-2">
                      Pays où vous exercez actuellement (apparaîtra sur la carte)
                    </p>
                  </div>
                </div>

                {/* Pays d'intervention */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 text-green-600 mr-3" />
                    {texts.practiceCountries} <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <TagSelector
                    items={lawyerForm.practiceCountries}
                    onRemove={handleRemovePracticeCountry}
                    color="green"
                  />
                  
                  <select
                    onChange={handlePracticeCountrySelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-medium bg-white focus:outline-none focus:border-green-500"
                  >
                    <option value="">Ajouter un pays d'intervention</option>
                    {countrySelectOptions}
                  </select>
                  
                  {fieldErrors.practiceCountries && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.practiceCountries}
                    </p>
                  )}
                  
                  {showCustomCountry && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          placeholder="Précisez le pays"
                          value={lawyerForm.customPracticeCountry}
                          onChange={(e) => setLawyerForm(prev => ({ ...prev, customPracticeCountry: e.target.value }))}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomPracticeCountry}
                          disabled={!lawyerForm.customPracticeCountry.trim()}
                          className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 font-bold"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 3: Informations professionnelles */}
              <section className="p-6 space-y-6">
                <SectionHeader
                  icon={<Scale className="w-6 h-6" />}
                  title={texts.professionalInfo}
                  subtitle="Votre expertise juridique"
                  step={3}
                  totalSteps={4}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    id="barNumber"
                    name="barNumber"
                    label={texts.barNumber}
                    type="text"
                    required
                    value={lawyerForm.barNumber}
                    onChange={handleInputChange}
                    error={fieldErrors.barNumber}
                    placeholder="Ex: 12345"
                  />

                  <FormField
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    label={texts.yearsOfExperience}
                    type="number"
                    required
                    value={lawyerForm.yearsOfExperience}
                    onChange={handleInputChange}
                    error={fieldErrors.yearsOfExperience}
                    min={0}
                    max={50}
                    placeholder="5"
                  />
                </div>

                <FormField
                  id="graduationYear"
                  name="graduationYear"
                  label={texts.graduationYear}
                  type="number"
                  required
                  value={lawyerForm.graduationYear}
                  onChange={handleInputChange}
                  error={fieldErrors.graduationYear}
                  min={1980}
                  max={new Date().getFullYear()}
                  placeholder="2015"
                />

                {/* Spécialités */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Award className="w-5 h-5 text-purple-600 mr-3" />
                    {texts.specialties} <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <TagSelector
                    items={lawyerForm.specialties}
                    onRemove={handleRemoveSpecialty}
                    color="blue"
                  />
                  
                  <select
                    onChange={handleSpecialtySelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-medium bg-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Ajouter une spécialité</option>
                    {specialtySelectOptions}
                  </select>
                  
                  {fieldErrors.specialties && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.specialties}
                    </p>
                  )}
                  
                  {showCustomSpecialty && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-xl border">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          placeholder="Précisez la spécialité"
                          value={lawyerForm.customSpecialty}
                          onChange={(e) => setLawyerForm(prev => ({ ...prev, customSpecialty: e.target.value }))}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomSpecialty}
                          disabled={!lawyerForm.customSpecialty.trim()}
                          className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 font-bold"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Certifications */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-indigo-600 mr-3" />
                    {texts.certifications} <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <TagSelector
                    items={lawyerForm.certifications}
                    onRemove={handleRemoveCertification}
                    color="blue"
                  />
                  
                  <select
                    onChange={handleCertificationSelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-medium bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Ajouter une certification</option>
                    {certificationSelectOptions}
                  </select>
                  
                  {fieldErrors.certifications && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.certifications}
                    </p>
                  )}
                  
                  {showCustomCertification && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-xl border">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          placeholder="Précisez la certification"
                          value={lawyerForm.customCertification}
                          onChange={(e) => setLawyerForm(prev => ({ ...prev, customCertification: e.target.value }))}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCertification}
                          disabled={!lawyerForm.customCertification.trim()}
                          className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 font-bold"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Langues parlées */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="text-xl mr-3">🗣️</span>
                    {texts.languagesSpoken} <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  {selectedLanguages.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700 mb-2">Langues sélectionnées :</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedLanguages.map((lang) => (
                          <div key={lang.value} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                            <span className="font-medium">{lang.value.toUpperCase()}</span>
                            <span className="mx-1">•</span>
                            <span>{getLanguageDisplayName(lang.value)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        📌 Les codes ISO ({selectedLanguages.map(l => l.value).join(', ')}) seront enregistrés en base. 
                        Les noms complets s'afficheront côté client.
                      </p>
                    </div>
                  )}
                  
                  <Suspense fallback={<LoadingSpinner />}>
                    <MultiLanguageSelect
                      value={selectedLanguages}
                      onChange={(value) => {
                        setSelectedLanguages(value);
                        
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
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Sélectionnez toutes les langues que vous parlez couramment pour vos consultations
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <span className="text-xl mr-3">📝</span>
                    {texts.bio} <span className="text-red-500 ml-2">*</span>
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    required
                    value={lawyerForm.bio}
                    onChange={handleInputChange}
                    rows={5}
                    maxLength={500}
                    className={`w-full px-4 py-3 border-2 rounded-xl font-medium bg-white focus:outline-none min-h-[120px] resize-y ${
                      fieldErrors.bio ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Décrivez votre parcours professionnel, vos spécialisations et comment vous pouvez aider les expatriés francophones..."
                  />
                  {fieldErrors.bio && (
                    <p className="text-sm text-red-600 flex items-center mt-2">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.bio}
                    </p>
                  )}
                  <div className="flex justify-between text-sm mt-3">
                    <div className="text-gray-600">
                      {lawyerForm.bio.length < 50 ? (
                        <span className="text-orange-600 font-medium">
                          Plus que {50 - lawyerForm.bio.length} caractères pour valider ce champ
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">✓ Champ validé</span>
                      )}
                    </div>
                    <span className={`font-bold ${lawyerForm.bio.length > 450 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {lawyerForm.bio.length}/500
                    </span>
                  </div>
                </div>

                {/* Photo de profil */}
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <label className="block text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Camera className="w-5 h-5 text-pink-600 mr-3" />
                    {texts.profilePhoto} <span className="text-red-500 ml-2">*</span>
                  </label>
                  
                  <Suspense fallback={<LoadingSpinner />}>
                    <ImageUploader
                      onImageUploaded={(url) => {
                        setLawyerForm(prev => ({ ...prev, profilePhoto: url }));
                        
                        if (fieldErrors.profilePhoto) {
                          setFieldErrors(prev => {
                            const { profilePhoto: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      currentImage={lawyerForm.profilePhoto}
                    />
                  </Suspense>
                  
                  {fieldErrors.profilePhoto && (
                    <p className="text-sm text-red-600 flex items-center mt-3">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {fieldErrors.profilePhoto}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Photo professionnelle obligatoire - Format JPG/PNG recommandé
                  </p>
                </div>
              </section>

              {/* Section 4: Tarification */}
              <section className="p-6 space-y-6">
                <SectionHeader
                  icon={<Heart className="w-6 h-6" />}
                  title={texts.pricingInfo}
                  subtitle="Définissez vos tarifs"
                  step={4}
                  totalSteps={4}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    id="price"
                    name="price"
                    label={texts.price}
                    type="number"
                    required
                    value={lawyerForm.price}
                    onChange={handleInputChange}
                    error={fieldErrors.price}
                    min={1}
                    max={500}
                    placeholder="49"
                  />

                  <FormField
                    id="duration"
                    name="duration"
                    label={texts.duration}
                    type="number"
                    required
                    value={lawyerForm.duration}
                    onChange={handleInputChange}
                    error={fieldErrors.duration}
                    min={15}
                    max={120}
                    placeholder="30"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">
                        {texts.validationNotice}
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        {texts.validationText}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Conditions générales et soumission */}
              <section className="p-6 space-y-6 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={lawyerForm.acceptTerms}
                      onChange={(e) => setLawyerForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 flex-shrink-0"
                      required
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-700 font-medium">
                      {texts.acceptTerms}{' '}
                      <Link 
                        to="/cgu-avocats" 
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
                        ? 'bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-700 hover:from-blue-600 hover:via-purple-700 hover:to-indigo-800 shadow-xl' 
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
                        <Scale className="w-6 h-6 mr-3" />
                        <span>
                          {canSubmit 
                            ? `${texts.createAccount} ⚖️` 
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
                    🔒 Données protégées • Validation sous 24h • Support juridique
                  </p>
                </div>
              </section>
            </form>
          </main>

          {/* Footer */}
          <footer className="text-center mt-8 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h3 className="text-xl font-black text-gray-900 mb-3">
                ⚖️ Rejoignez le réseau d'avocats SOS Expat
              </h3>
              <p className="text-sm text-gray-700 font-medium">
                En vous inscrivant, vous rejoignez un réseau de <strong className="text-blue-600">plus de 500 avocats vérifiés</strong> 
                spécialisés dans l'accompagnement des expatriés francophones.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 font-medium">
              <Link to="/confidentialite" className="hover:text-blue-600 underline">
                🔒 Confidentialité
              </Link>
              <Link to="/cgu-avocats" className="hover:text-purple-600 underline">
                📋 CGU Avocats
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

export default RegisterLawyer;