// Soumission du formulaire avec codes ISO pour les langues
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

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
        email: lawyerForm.email,
        fullName: `${lawyerForm.firstName} ${lawyerForm.lastName}`,
        name: `${lawyerForm.firstName} ${lawyerForm.lastName}`,
        firstName: lawyerForm.firstName,
        lastName: lawyerForm.lastName,
        phone: lawyerForm.phoneCountryCode + lawyerForm.phone,
        whatsapp: lawyerForm.whatsappCountryCode + lawyerForm.whatsappNumber,
        phoneCountryCode: lawyerForm.phoneCountryCode,
        whatsappCountryCode: lawyerForm.whatsappCountryCode,
        whatsappNumber: lawyerForm.whatsappNumber,
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
        barNumber: lawyerForm.barNumber,
        yearsOfExperience: lawyerForm.yearsOfExperience,
        graduationYear: lawyerForm.graduationYear,
        bio: lawyerForm.bio,
        description: lawyerForm.bio,
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
        createdAt: serverTimestamp()
      };

      console.log('📝 Données envoyées pour l\'inscription avocat:', userData);

      await register(userData, lawyerForm.password);
      navigate('/dashboard?pending=true');
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription avocat:', error);
    }
  }, [lawyerForm, selectedLanguages, validateForm, register, navigate, getLanguageDisplayName]);import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Mail, Lock, Eye, EyeOff, AlertCircle, Globe, MapPin, Award, Phone, CheckCircle, XCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import ImageUploader from '../components/common/ImageUploader';
import { serverTimestamp } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import MultiLanguageSelect from '../components/forms-data/MultiLanguageSelect';
import { MultiValue } from 'react-select';

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

// Textes pour i18n
const texts = {
  fr: {
    title: 'Inscription Avocat',
    subtitle: 'Rejoignez notre réseau d\'avocats vérifiés et aidez des expatriés francophones',
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
  },
  en: {
    title: 'Lawyer Registration',
    subtitle: 'Join our network of verified lawyers and help French-speaking expatriates',
    alreadyRegistered: 'Already registered?',
    login: 'Log in',
    personalInfo: 'Personal Information',
    geographicInfo: 'Geographic Information',
    professionalInfo: 'Professional Information',
    pricingInfo: 'Pricing',
    validationNotice: 'Manual Validation',
    validationText: 'Your account will be manually validated by our team after verification within 24h.',
    acceptTerms: 'I accept the',
    termsLink: 'general terms for lawyers',
    createAccount: 'Create my lawyer account',
    required: 'required',
    // Fields
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    phone: 'Phone Number',
    whatsappNumber: 'WhatsApp Number',
    countryCode: 'Country Code',
    residenceCountry: 'Country of Residence',
    currentPresenceCountry: 'Current Presence Country',
    barNumber: 'Bar Number',
    yearsOfExperience: 'Years of Experience',
    graduationYear: 'Graduation Year',
    bio: 'Professional Description',
    profilePhoto: 'Profile Photo',
    specialties: 'Specialties',
    practiceCountries: 'Practice Countries',
    languagesSpoken: 'Languages Spoken',
    certifications: 'Certifications',
    price: 'Price per consultation (€)',
    duration: 'Consultation duration (min)',
    // Email status
    emailChecking: 'Checking email availability...',
    emailAvailable: 'Email available',
    emailTaken: 'This email is already in use',
    emailCheckError: 'Error checking email availability',
    // Errors
    allFieldsRequired: 'All required fields must be filled',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must contain at least 6 characters',
    selectCountry: 'Please select your country of residence',
    specifyCountry: 'Please specify your country of residence',
    selectPracticeCountry: 'Please select at least one practice country',
    selectLanguage: 'Please select at least one spoken language',
    selectSpecialty: 'Please select at least one specialty',
    barNumberRequired: 'Bar number is required',
    bioRequired: 'Professional description is required',
    phoneRequired: 'Phone number is required',
    whatsappRequired: 'WhatsApp number is required',
    whatsappInvalid: 'WhatsApp number must be in valid international format',
    presenceCountryRequired: 'Current presence country is required',
    profilePhotoRequired: 'Profile photo is required',
    selectCertification: 'Please select at least one certification',
    acceptTermsRequired: 'You must accept the general terms for lawyers',
    priceRequired: 'Price per consultation is required',
    priceInvalid: 'Price must be greater than 0',
    durationRequired: 'Consultation duration is required',
    durationInvalid: 'Duration must be greater than 0',
    emailAlreadyUsed: 'This email is already used by another account',
    emailValidRequired: 'Please use a valid and available email'
  }
};

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
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomSpecialty, setShowCustomSpecialty] = useState(false);
  const [showCustomCertification, setShowCustomCertification] = useState(false);
  
  // État pour la vérification de l'email
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>({
    isChecking: false,
    isAvailable: null,
    hasBeenChecked: false
  });

  // Textes actuels basés sur la langue
  const t = texts[language as keyof typeof texts] || texts.fr;

  // Classes CSS pour les champs obligatoires avec effet grisé
  const requiredFieldClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white";

  // ✅ NOUVEAU: Fonction pour vérifier l'unicité de l'email
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

  // ✅ NOUVEAU: Debounced email check
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleAddCustomSpecialty = useCallback(() => {
    if (formData.customSpecialty && !formData.specialties.includes(formData.customSpecialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, prev.customSpecialty],
        customSpecialty: ''
      }));
      setShowCustomSpecialty(false);
    }
  }, [formData.customSpecialty, formData.specialties]);
  
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
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // Vérification de l'email en premier
    if (!emailStatus.hasBeenChecked || emailStatus.isChecking) {
      setFormError('Veuillez attendre la vérification de l\'email');
      scrollToTop();
      return false;
    }

    if (emailStatus.isAvailable === false) {
      setFormError(t.emailAlreadyUsed);
      scrollToTop();
      return false;
    }

    // Validation des champs obligatoires
    if (!lawyerForm.firstName || !lawyerForm.lastName || !lawyerForm.email || !lawyerForm.password) {
      setFormError(t.allFieldsRequired);
      scrollToTop();
      return false;
    }

    if (lawyerForm.password !== lawyerForm.confirmPassword) {
      setFormError(t.passwordMismatch);
      scrollToTop();
      return false;
    }

    if (lawyerForm.password.length < 6) {
      setFormError(t.passwordTooShort);
      scrollToTop();
      return false;
    }

    if (!lawyerForm.currentCountry) {
      setFormError(t.selectCountry);
      scrollToTop();
      return false;
    }

    if (lawyerForm.currentCountry === 'Autre' && !lawyerForm.customCountry) {
      setFormError(t.specifyCountry);
      scrollToTop();
      return false;
    }

    if (!lawyerForm.currentPresenceCountry) {
      setFormError(t.presenceCountryRequired);
      scrollToTop();
      return false;
    }
    
    if (lawyerForm.practiceCountries.length === 0) {
      setFormError(t.selectPracticeCountry);
      scrollToTop();
      return false;
    }
    
    if (selectedLanguages.length === 0) {
      setFormError(t.selectLanguage);
      scrollToTop();
      return false;
    }
    
    if (lawyerForm.specialties.length === 0) {
      setFormError(t.selectSpecialty);
      scrollToTop();
      return false;
    }
    
    if (!lawyerForm.barNumber) {
      setFormError(t.barNumberRequired);
      scrollToTop();
      return false;
    }
    
    if (!lawyerForm.bio) {
      setFormError(t.bioRequired);
      scrollToTop();
      return false;
    }
    
    if (!lawyerForm.phone) {
      setFormError(t.phoneRequired);
      scrollToTop();
      return false;
    }

    if (!lawyerForm.whatsappNumber) {
      setFormError(t.whatsappRequired);
      scrollToTop();
      return false;
    }

    // Validation du format WhatsApp
    const whatsappRegex = /^\+[1-9]\d{6,14}$/;
    const fullWhatsappNumber = lawyerForm.whatsappCountryCode + lawyerForm.whatsappNumber;
    if (!whatsappRegex.test(fullWhatsappNumber)) {
      setFormError(t.whatsappInvalid);
      scrollToTop();
      return false;
    }

    if (!lawyerForm.profilePhoto) {
      setFormError(t.profilePhotoRequired);
      scrollToTop();
      return false;
    }
    
    if (lawyerForm.certifications.length === 0) {
      setFormError(t.selectCertification);
      scrollToTop();
      return false;
    }

    if (!lawyerForm.price || lawyerForm.price <= 0) {
      setFormError(t.priceInvalid);
      scrollToTop();
      return false;
    }

    if (!lawyerForm.duration || lawyerForm.duration <= 0) {
      setFormError(t.durationInvalid);
      scrollToTop();
      return false;
    }
    
    if (!lawyerForm.acceptTerms) {
      setFormError(t.acceptTermsRequired);
      scrollToTop();
      return false;
    }

    return true;
  }, [lawyerForm, selectedLanguages, emailStatus, t]);

  // Soumission du formulaire avec codes ISO pour les langues
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

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
        email: formData.email,
        fullName: `${formData.firstName} ${formData.lastName}`,
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phoneCountryCode + formData.phone,
        whatsapp: formData.whatsappCountryCode + formData.whatsappNumber,
        phoneCountryCode: formData.phoneCountryCode,
        whatsappCountryCode: formData.whatsappCountryCode,
        whatsappNumber: formData.whatsappNumber,
        currentCountry: formData.currentCountry === 'Autre' ? formData.customCountry : formData.currentCountry,
        country: formData.currentPresenceCountry,
        currentPresenceCountry: formData.currentPresenceCountry,
        practiceCountries: formData.practiceCountries,
        profilePhoto: formData.profilePhoto,
        photoURL: formData.profilePhoto,
        avatar: formData.profilePhoto,
        
        // Enregistrement avec codes ISO
        languages: languageCodesISO,
        languagesSpoken: languageCodesISO,
        
        // Noms complets pour l'affichage
        languageDisplayNames: languageDisplayNames,
        
        specialties: formData.specialties,
        certifications: formData.certifications,
        education: formData.education,
        barNumber: formData.barNumber,
        yearsOfExperience: formData.yearsOfExperience,
        graduationYear: formData.graduationYear,
        bio: formData.bio,
        description: formData.bio,
        price: formData.price,
        duration: formData.duration,
        availability: formData.availability,
        isOnline: formData.availability === 'available',
        isApproved: false,
        isVisible: true,
        isActive: true,
        rating: 4.5,
        reviewCount: 0,
        preferredLanguage: formData.preferredLanguage,
        createdAt: serverTimestamp()
      };

      console.log('📝 Données envoyées pour l\'inscription avocat:', userData);

      await register(userData, formData.password);
      navigate('/dashboard?pending=true');
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription avocat:', error);
    }
  }, [formData, selectedLanguages, validateForm, register, navigate, getLanguageDisplayName]);
        preferredLanguage: formData.preferredLanguage,
        createdAt: serverTimestamp()
      };

      console.log('📝 Données envoyées pour l\'inscription avocat:', userData);

      await register(userData, formData.password);
      navigate('/dashboard?pending=true');
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription avocat:', error);
    }
  }, [formData, selectedLanguages, validateForm, register, navigate, getLanguageDisplayName]);

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
          {t.emailChecking}
        </div>
      );
    }

    if (emailStatus.hasBeenChecked) {
      if (emailStatus.isAvailable) {
        return (
          <div className="mt-1 flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            {t.emailAvailable}
          </div>
        );
      } else {
        return (
          <div className="mt-1 flex items-center text-sm text-red-600">
            <XCircle className="h-4 w-4 mr-1" />
            {t.emailTaken}
          </div>
        );
      }
    }

    return null;
  }, [lawyerForm.email, emailStatus, t]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* En-tête */}
          <header className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 rounded-full p-3 sm:p-4">
                <Scale className="w-8 h-8 sm:w-12 sm:h-12 text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              {t.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              {t.alreadyRegistered} <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">{t.login}</Link>
            </p>
          </header>

          {/* Formulaire */}
          <main className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Messages d'erreur */}
              {(error || formError) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" aria-hidden="true" />
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

              {/* Section : Informations personnelles */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {t.personalInfo}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.firstName} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={lawyerForm.firstName}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                      autoComplete="given-name"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.lastName} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={lawyerForm.lastName}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* ✅ Champ email avec vérification en temps réel */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.email} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={lawyerForm.email}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white ${
                        emailStatus.hasBeenChecked 
                          ? emailStatus.isAvailable 
                            ? 'border-green-300' 
                            : 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      placeholder="votre@email.com"
                      autoComplete="email"
                    />
                    <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
                  </div>
                  {/* ✅ Affichage du statut de vérification */}
                  {renderEmailStatus()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.password} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={lawyerForm.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white"
                        placeholder="Minimum 6 caractères"
                        autoComplete="new-password"
                      />
                      <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.confirmPassword} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={lawyerForm.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white"
                        autoComplete="new-password"
                      />
                      <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Téléphone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="phoneCountryCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.countryCode} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <select
                      id="phoneCountryCode"
                      name="phoneCountryCode"
                      value={lawyerForm.phoneCountryCode}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                    >
                      {countryCodeOptions}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.phone} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={lawyerForm.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white"
                        placeholder="123456789"
                        autoComplete="tel"
                      />
                      <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Numéro sans l'indicatif pays (sera ajouté automatiquement)
                    </p>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="whatsappCountryCode" className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp - Indicatif <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <select
                      id="whatsappCountryCode"
                      name="whatsappCountryCode"
                      value={lawyerForm.whatsappCountryCode}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                    >
                      {countryCodeOptions}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.whatsappNumber} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      type="tel"
                      required
                      value={lawyerForm.whatsappNumber}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                      placeholder="612345678"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Numéro WhatsApp sans l'indicatif pays ni le 0 initial
                    </p>
                  </div>
                </div>
              </section>

              {/* Section : Informations géographiques */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {t.geographicInfo}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="currentCountry" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.residenceCountry} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-2.5 z-10" aria-hidden="true" />
                      <select
                        id="currentCountry"
                        name="currentCountry"
                        required
                        value={formData.currentCountry}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white"
                      >
                        <option value="">Sélectionnez un pays</option>
                        {countrySelectOptions}
                      </select>
                    </div>
                    
                    {showCustomCountry && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Précisez votre pays"
                          value={formData.customCountry}
                          onChange={(e) => setFormData(prev => ({ ...prev, customCountry: e.target.value }))}
                          className={requiredFieldClasses}
                          required={formData.currentCountry === 'Autre'}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="currentPresenceCountry" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.currentPresenceCountry} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="h-5 w-5 text-gray-400 absolute left-3 top-2.5 z-10" aria-hidden="true" />
                      <select
                        id="currentPresenceCountry"
                        name="currentPresenceCountry"
                        required
                        value={formData.currentPresenceCountry}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white"
                      >
                        <option value="">Sélectionnez votre pays de présence</option>
                        {countrySelectOptions}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pays où vous exercez actuellement (apparaîtra sur la carte et dans les recherches)
                    </p>
                  </div>
                </div>
              </section>

              {/* Section : Informations professionnelles */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {t.professionalInfo}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="barNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.barNumber} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="barNumber"
                      name="barNumber"
                      type="text"
                      required
                      value={lawyerForm.barNumber}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                      placeholder="Ex: 12345"
                    />
                  </div>

                  <div>
                    <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.yearsOfExperience} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      type="number"
                      min="0"
                      max="50"
                      required
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.graduationYear} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  <input
                    id="graduationYear"
                    name="graduationYear"
                    type="number"
                    min="1980"
                    max={new Date().getFullYear()}
                    required
                    value={lawyerForm.graduationYear}
                    onChange={handleInputChange}
                    className={requiredFieldClasses}
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    {t.bio} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    required
                    value={lawyerForm.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical transition-all duration-200 bg-gray-50 focus:bg-white hover:bg-white"
                    placeholder="Décrivez votre expertise, votre expérience et comment vous aidez vos clients..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {lawyerForm.bio.length}/500 - Cette description apparaîtra sur votre profil public
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.profilePhoto} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  <ImageUploader
                    onImageUploaded={(url) => {
                      setLawyerForm(prev => ({ ...prev, profilePhoto: url }));
                    }}
                    currentImage={lawyerForm.profilePhoto}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Photo professionnelle obligatoire - Format JPG/PNG recommandé
                  </p>
                </div>

                {/* Spécialités */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.specialties} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  
                  {lawyerForm.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {lawyerForm.specialties.map(specialty => (
                        <div key={specialty} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                          <span>{specialty}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSpecialty(specialty)}
                            className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                            aria-label={`Supprimer la spécialité ${specialty}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <select
                    onChange={handleSpecialtySelect}
                    value=""
                    className={requiredFieldClasses}
                    aria-label="Ajouter une spécialité"
                  >
                    <option value="">Ajouter une spécialité</option>
                    {specialtySelectOptions}
                  </select>
                  
                  {showCustomSpecialty && (
                    <div className="mt-2 flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Précisez la spécialité"
                        value={lawyerForm.customSpecialty}
                        onChange={(e) => setLawyerForm(prev => ({ ...prev, customSpecialty: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSpecialty}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={!lawyerForm.customSpecialty}
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                </div>

                {/* Pays d'intervention */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.practiceCountries} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  
                  {lawyerForm.practiceCountries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {lawyerForm.practiceCountries.map(country => (
                        <div key={country} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                          <span>{country}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemovePracticeCountry(country)}
                            className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                            aria-label={`Supprimer le pays ${country}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <select
                    onChange={handlePracticeCountrySelect}
                    value=""
                    className={requiredFieldClasses}
                    aria-label="Ajouter un pays d'intervention"
                  >
                    <option value="">Ajouter un pays d'intervention</option>
                    {countrySelectOptions}
                  </select>
                  
                  {showCustomCountry && (
                    <div className="mt-2 flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Précisez le pays"
                        value={lawyerForm.customPracticeCountry}
                        onChange={(e) => setLawyerForm(prev => ({ ...prev, customPracticeCountry: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPracticeCountry}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={!lawyerForm.customPracticeCountry}
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                </div>

                {/* Langues parlées avec affichage des codes ISO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.languagesSpoken} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>

                  {/* Affichage des langues sélectionnées avec codes ISO et noms complets */}
                  {selectedLanguages.length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-md">
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

                  <MultiLanguageSelect
                    value={selectedLanguages}
                    onChange={setSelectedLanguages}
                  />
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Sélectionnez toutes les langues que vous parlez couramment pour vos consultations
                  </p>
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.certifications} <span className="text-red-600" aria-label="obligatoire">*</span>
                  </label>
                  
                  {lawyerForm.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {lawyerForm.certifications.map(certification => (
                        <div key={certification} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                          <Award size={12} className="mr-1" aria-hidden="true" />
                          <span>{certification}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCertification(certification)}
                            className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                            aria-label={`Supprimer la certification ${certification}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <select
                    onChange={handleCertificationSelect}
                    value=""
                    className={requiredFieldClasses}
                    aria-label="Ajouter une certification"
                  >
                    <option value="">Ajouter une certification</option>
                    {certificationSelectOptions}
                  </select>
                  
                  {showCustomCertification && (
                    <div className="mt-2 flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Précisez la certification"
                        value={lawyerForm.customCertification}
                        onChange={(e) => setLawyerForm(prev => ({ ...prev, customCertification: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCertification}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={!lawyerForm.customCertification}
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                </div>

                {/* Section Tarification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.price} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="1"
                      max="500"
                      required
                      value={lawyerForm.price}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                      placeholder="49"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Prix en euros par consultation
                    </p>
                  </div>

                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                      {t.duration} <span className="text-red-600" aria-label="obligatoire">*</span>
                    </label>
                    <input
                      id="duration"
                      name="duration"
                      type="number"
                      min="15"
                      max="120"
                      step="5"
                      required
                      value={lawyerForm.duration}
                      onChange={handleInputChange}
                      className={requiredFieldClasses}
                      placeholder="20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Durée en minutes (15-120 min)
                    </p>
                  </div>
                </div>
              </section>

              {/* Notice de validation */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4" role="region" aria-labelledby="validation-notice">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" aria-hidden="true" />
                  <div className="ml-3">
                    <h3 id="validation-notice" className="text-sm font-medium text-blue-800">
                      {t.validationNotice}
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>{t.validationText}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceptation des conditions */}
              <div className="flex items-start space-x-3">
                <div className="flex items-center h-5">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={lawyerForm.acceptTerms}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    required
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                    {t.acceptTerms}{' '}
                    <Link 
                      to="/cgu-avocats" 
                      className="text-blue-600 hover:text-blue-700 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.termsLink}
                    </Link>
                    <span className="text-red-600" aria-label="obligatoire"> *</span>
                  </label>
                </div>
              </div>

              {/* ✅ Bouton de soumission avec vérification email */}
              <div className="mt-6">
                <Button
                  type="submit"
                  loading={isLoading}
                  fullWidth={true}
                  size="large"
                  className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 transition-colors"
                  disabled={
                    !lawyerForm.email || 
                    !lawyerForm.password || 
                    !lawyerForm.firstName || 
                    !lawyerForm.lastName || 
                    !lawyerForm.barNumber || 
                    !lawyerForm.acceptTerms ||
                    emailStatus.isChecking ||
                    !emailStatus.hasBeenChecked ||
                    emailStatus.isAvailable === false
                  }
                >
                  {emailStatus.isChecking ? 'Vérification de l\'email...' : t.createAccount}
                </Button>
                
                {/* Message d'aide pour le bouton */}
                {emailStatus.isChecking && (
                  <p className="text-xs text-blue-600 text-center mt-2">
                    Veuillez patienter pendant la vérification de l'email...
                  </p>
                )}
                
                {emailStatus.hasBeenChecked && emailStatus.isAvailable === false && (
                  <p className="text-xs text-red-600 text-center mt-2">
                    Veuillez utiliser un email différent pour continuer
                  </p>
                )}
              </div>
            </form>
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterLawyer;EmailCheck = useCallback(async (email: string) => {
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
  }, [handleEmailCheck]);

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
    
    if (selectedSpecialty && !formData.specialties.includes(selectedSpecialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, selectedSpecialty]
      }));
    }
  }, [formData.specialties]);
  
  const handleRemoveSpecialty = useCallback((specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  }, []);
  
  const handle