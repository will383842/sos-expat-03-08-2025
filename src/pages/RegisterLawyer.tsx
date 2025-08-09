import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Scale, Mail, Lock, Eye, EyeOff, AlertCircle, Globe, Phone,
  CheckCircle, XCircle, Users, Camera, X
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MultiValue } from 'react-select';
import type { Provider } from '../types/provider';

// ===== Lazy (perf) =====
const ImageUploader = lazy(() => import('../components/common/ImageUploader'));
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// ===== Theme tokens =====
const THEME = {
  gradFrom: 'from-indigo-600',
  gradTo: 'to-purple-600',
  ring: 'focus:border-indigo-600',
  border: 'border-indigo-200',
  icon: 'text-indigo-600',
  chip: 'border-indigo-200',
  subtle: 'bg-indigo-50',
} as const;

// ===== Country options FR/EN (bilingue) =====
type Duo = { fr: string; en: string };
const COUNTRIES: Duo[] = [
  { fr: 'Afghanistan', en: 'Afghanistan' },
  { fr: 'Afrique du Sud', en: 'South Africa' },
  { fr: 'Albanie', en: 'Albania' },
  { fr: 'Algérie', en: 'Algeria' },
  { fr: 'Allemagne', en: 'Germany' },
  { fr: 'Andorre', en: 'Andorra' },
  { fr: 'Angola', en: 'Angola' },
  { fr: 'Arabie Saoudite', en: 'Saudi Arabia' },
  { fr: 'Argentine', en: 'Argentina' },
  { fr: 'Arménie', en: 'Armenia' },
  { fr: 'Australie', en: 'Australia' },
  { fr: 'Autriche', en: 'Austria' },
  { fr: 'Azerbaïdjan', en: 'Azerbaijan' },
  { fr: 'Bahamas', en: 'Bahamas' },
  { fr: 'Bahreïn', en: 'Bahrain' },
  { fr: 'Bangladesh', en: 'Bangladesh' },
  { fr: 'Barbade', en: 'Barbados' },
  { fr: 'Belgique', en: 'Belgium' },
  { fr: 'Belize', en: 'Belize' },
  { fr: 'Bénin', en: 'Benin' },
  { fr: 'Bhoutan', en: 'Bhutan' },
  { fr: 'Biélorussie', en: 'Belarus' },
  { fr: 'Birmanie', en: 'Myanmar' },
  { fr: 'Bolivie', en: 'Bolivia' },
  { fr: 'Bosnie-Herzégovine', en: 'Bosnia and Herzegovina' },
  { fr: 'Botswana', en: 'Botswana' },
  { fr: 'Brésil', en: 'Brazil' },
  { fr: 'Brunei', en: 'Brunei' },
  { fr: 'Bulgarie', en: 'Bulgaria' },
  { fr: 'Burkina Faso', en: 'Burkina Faso' },
  { fr: 'Burundi', en: 'Burundi' },
  { fr: 'Cambodge', en: 'Cambodia' },
  { fr: 'Cameroun', en: 'Cameroon' },
  { fr: 'Canada', en: 'Canada' },
  { fr: 'Cap-Vert', en: 'Cape Verde' },
  { fr: 'Chili', en: 'Chile' },
  { fr: 'Chine', en: 'China' },
  { fr: 'Chypre', en: 'Cyprus' },
  { fr: 'Colombie', en: 'Colombia' },
  { fr: 'Comores', en: 'Comoros' },
  { fr: 'Congo', en: 'Congo' },
  { fr: 'Corée du Nord', en: 'North Korea' },
  { fr: 'Corée du Sud', en: 'South Korea' },
  { fr: 'Costa Rica', en: 'Costa Rica' },
  { fr: "Côte d'Ivoire", en: 'Ivory Coast' },
  { fr: 'Croatie', en: 'Croatia' },
  { fr: 'Cuba', en: 'Cuba' },
  { fr: 'Danemark', en: 'Denmark' },
  { fr: 'Djibouti', en: 'Djibouti' },
  { fr: 'Dominique', en: 'Dominica' },
  { fr: 'Égypte', en: 'Egypt' },
  { fr: 'Émirats arabes unis', en: 'United Arab Emirates' },
  { fr: 'Équateur', en: 'Ecuador' },
  { fr: 'Érythrée', en: 'Eritrea' },
  { fr: 'Espagne', en: 'Spain' },
  { fr: 'Estonie', en: 'Estonia' },
  { fr: 'États-Unis', en: 'United States' },
  { fr: 'Éthiopie', en: 'Ethiopia' },
  { fr: 'Fidji', en: 'Fiji' },
  { fr: 'Finlande', en: 'Finland' },
  { fr: 'France', en: 'France' },
  { fr: 'Autre', en: 'Other' },
];

// ===== Specialties (FR/EN) =====
const SPECIALTIES: Duo[] = [
  { fr: "Droit de l'immigration", en: 'Immigration Law' },
  { fr: 'Droit du travail', en: 'Labor Law' },
  { fr: 'Droit immobilier', en: 'Real Estate Law' },
  { fr: 'Droit des affaires', en: 'Business Law' },
  { fr: 'Droit de la famille', en: 'Family Law' },
  { fr: 'Droit pénal', en: 'Criminal Law' },
  { fr: 'Droit fiscal', en: 'Tax Law' },
  { fr: 'Droit international', en: 'International Law' },
  { fr: 'Droit des contrats', en: 'Contract Law' },
  { fr: 'Propriété intellectuelle', en: 'Intellectual Property' },
  { fr: 'Droit de la consommation', en: 'Consumer Law' },
  { fr: 'Droit bancaire', en: 'Banking Law' },
  { fr: "Droit de l'environnement", en: 'Environmental Law' },
  { fr: 'Droit médical', en: 'Medical Law' },
  { fr: 'Droit des sociétés', en: 'Corporate Law' },
  { fr: 'Droit des successions', en: 'Estate Law' },
  { fr: 'Droit administratif', en: 'Administrative Law' },
  { fr: 'Droit européen', en: 'European Law' },
  { fr: 'Droit des étrangers', en: 'Immigrant Rights' },
  { fr: 'Autre', en: 'Other' },
];

// ===== Certifications (FR/EN) =====
const CERTIFICATIONS: Duo[] = [
  { fr: 'Barreau du Québec', en: 'Quebec Bar' },
  { fr: 'Barreau de Paris', en: 'Paris Bar' },
  { fr: 'Barreau de Montréal', en: 'Montreal Bar' },
  { fr: 'Certification Immigration Canada', en: 'Canada Immigration Certification' },
  { fr: 'Certification Droit des Affaires', en: 'Business Law Certification' },
  { fr: 'Certification Droit Immobilier', en: 'Real Estate Law Certification' },
  { fr: 'Certification Droit Fiscal', en: 'Tax Law Certification' },
  { fr: 'Certification Droit de la Famille', en: 'Family Law Certification' },
  { fr: 'Autre', en: 'Other' },
];

// ===== Country codes (names FR/EN) =====
const COUNTRY_CODES = [
  { code: '+33', flag: '🇫🇷', fr: 'France', en: 'France' },
  { code: '+1', flag: '🇺🇸', fr: 'USA/Canada', en: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', fr: 'Royaume-Uni', en: 'United Kingdom' },
  { code: '+49', flag: '🇩🇪', fr: 'Allemagne', en: 'Germany' },
  { code: '+34', flag: '🇪🇸', fr: 'Espagne', en: 'Spain' },
  { code: '+39', flag: '🇮🇹', fr: 'Italie', en: 'Italy' },
  { code: '+32', flag: '🇧🇪', fr: 'Belgique', en: 'Belgium' },
  { code: '+41', flag: '🇨🇭', fr: 'Suisse', en: 'Switzerland' },
  { code: '+352', flag: '🇱🇺', fr: 'Luxembourg', en: 'Luxembourg' },
  { code: '+31', flag: '🇳🇱', fr: 'Pays-Bas', en: 'Netherlands' },
  { code: '+351', flag: '🇵🇹', fr: 'Portugal', en: 'Portugal' },
  { code: '+30', flag: '🇬🇷', fr: 'Grèce', en: 'Greece' },
  { code: '+66', flag: '🇹🇭', fr: 'Thaïlande', en: 'Thailand' },
  { code: '+61', flag: '🇦🇺', fr: 'Australie', en: 'Australia' },
  { code: '+64', flag: '🇳🇿', fr: 'Nouvelle-Zélande', en: 'New Zealand' },
  { code: '+81', flag: '🇯🇵', fr: 'Japon', en: 'Japan' },
  { code: '+82', flag: '🇰🇷', fr: 'Corée du Sud', en: 'South Korea' },
  { code: '+65', flag: '🇸🇬', fr: 'Singapour', en: 'Singapore' },
  { code: '+212', flag: '🇲🇦', fr: 'Maroc', en: 'Morocco' },
  { code: '+216', flag: '🇹🇳', fr: 'Tunisie', en: 'Tunisia' },
  { code: '+213', flag: '🇩🇿', fr: 'Algérie', en: 'Algeria' },
  { code: '+971', flag: '🇦🇪', fr: 'Émirats', en: 'UAE' },
  { code: '+55', flag: '🇧🇷', fr: 'Brésil', en: 'Brazil' },
  { code: '+52', flag: '🇲🇽', fr: 'Mexique', en: 'Mexico' },
  { code: '+7', flag: '🇷🇺', fr: 'Russie', en: 'Russia' },
] as const;

// ===== Types =====
interface LawyerFormData {
  firstName: string; lastName: string; email: string;
  password: string; confirmPassword: string;
  phone: string; phoneCountryCode: string;
  whatsappCountryCode: string; whatsappNumber: string;
  currentCountry: string; currentPresenceCountry: string; customCountry: string;
  preferredLanguage: 'fr' | 'en';
  practiceCountries: string[]; customPracticeCountry: string;
  yearsOfExperience: number; specialties: string[]; customSpecialty: string;
  barNumber: string; graduationYear: number;
  profilePhoto: string; bio: string; certifications: string[]; education: string;
  availability: 'available' | 'busy' | 'offline'; acceptTerms: boolean;
  customCertification: string;
  
}
interface LanguageOption { value: string; label: string }
interface EmailCheckStatus { isChecking: boolean; isAvailable: boolean | null; hasBeenChecked: boolean; }

// ===== i18n texts =====
const I18N = {
  fr: {
    metaTitle: 'Inscription Avocat • SOS Expats',
    metaDesc:
      'Rejoignez notre réseau d’avocats internationaux. Offrez vos conseils juridiques à une clientèle internationale et développez vos revenus.',
    heroTitle: 'Inscription Avocat',
    heroSubtitle:
      'Offrez vos conseils juridiques à une clientèle internationale et développez vos revenus.',
    already: 'Déjà inscrit ?', login: 'Se connecter',
    personalInfo: 'Informations personnelles',
    geoInfo: 'Informations géographiques',
    proInfo: 'Informations professionnelles',
    validationNotice: 'Validation manuelle',
    validationText: 'Votre compte sera vérifié et validé sous 24h.',
    acceptTerms: 'J’accepte les', termsLink: 'CGU Avocats',
    create: 'Créer mon compte avocat', loading: 'Création en cours...',
    // fields
    firstName: 'Prénom', lastName: 'Nom', email: 'Adresse email',
    password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    phone: 'Téléphone', whatsapp: 'Numéro WhatsApp',
    countryCode: 'Indicatif pays',
    residenceCountry: 'Pays de résidence',
    presenceCountry: 'Pays de présence actuel',
    barNumber: 'Numéro au barreau',
    yoe: 'Années d’expérience', gradYear: 'Année de diplôme',
    bio: 'Description professionnelle', profilePhoto: 'Photo de profil',
    specialties: 'Spécialités', practiceCountries: 'Pays d’intervention',
    languages: 'Langues parlées', certifications: 'Certifications',
    // selects
    selectCountry: 'Sélectionnez votre pays',
    addPractice: 'Ajouter un pays d’intervention',
    addSpecialty: 'Ajouter une spécialité',
    addCertif: 'Ajouter une certification',
    specifyCountry: 'Précisez votre pays',
    specifyPractice: 'Précisez le pays',
    specifySpecialty: 'Précisez la spécialité',
    specifyCertification: 'Précisez la certification',
    // email status
    emailChecking: 'Vérification de l’email…',
    emailAvailable: 'Email disponible',
    emailTaken: 'Cet email est déjà utilisé',
    // errors
    allRequired: 'Tous les champs obligatoires doivent être remplis',
    pwdShort: 'Le mot de passe doit contenir au moins 6 caractères',
    pwdMismatch: 'Les mots de passe ne correspondent pas',
    needCountry: 'Veuillez sélectionner votre pays de résidence',
    needPresence: 'Le pays de présence actuel est obligatoire',
    needPractice: 'Veuillez sélectionner au moins un pays d’intervention',
    needLang: 'Veuillez sélectionner au moins une langue parlée',
    needSpec: 'Veuillez sélectionner au moins une spécialité',
    needBar: 'Le numéro au barreau est obligatoire',
    needBio: 'La description professionnelle est obligatoire (min. 50 caractères)',
    needPhoto: 'La photo de profil est obligatoire',
    needCertif: 'Veuillez sélectionner au moins une certification',
    acceptTermsRequired: 'Vous devez accepter les conditions générales',
    emailWait: 'Veuillez attendre la vérification de l’email',
    emailInvalid: 'Veuillez utiliser un email valide et disponible',
    // misc
    selectedLanguages: 'Langues sélectionnées',
    secureNote: 'Données protégées • Validation sous 24h • Support juridique',
    footerTitle: '⚖️ Rejoignez le réseau d’avocats SOS Expats',
    footerText:
      'Réseau d’avocats vérifiés spécialisés dans l’accompagnement des expatriés.',
    uploaderTitle: 'Photo de profil',
    uploaderCta: 'Cliquez ici',
    uploaderHint: 'Ou utilisez la webcam avec les boutons de remplacement',
    uploaderEmpty: 'Aucun fichier choisi',
    langPlaceholder: 'Sélectionnez les langues',
  },
  en: {
    metaTitle: 'Lawyer Registration • SOS Expats',
    metaDesc:
      'Join our international network of lawyers. Offer legal advice to a global clientele and grow your revenue.',
    heroTitle: 'Lawyer Registration',
    heroSubtitle:
      'Offer your legal expertise to a global clientele and grow your revenue.',
    already: 'Already registered?', login: 'Log in',
    personalInfo: 'Personal Information',
    geoInfo: 'Geographic Information',
    proInfo: 'Professional Information',
    validationNotice: 'Manual validation',
    validationText: 'Your account will be verified and approved within 24h.',
    acceptTerms: 'I accept the', termsLink: 'Lawyers T&Cs',
    create: 'Create my lawyer account', loading: 'Creating account...',
    firstName: 'First Name', lastName: 'Last Name', email: 'Email',
    password: 'Password', confirmPassword: 'Confirm Password',
    phone: 'Phone', whatsapp: 'WhatsApp Number',
    countryCode: 'Country code',
    residenceCountry: 'Country of residence',
    presenceCountry: 'Current presence country',
    barNumber: 'Bar number',
    yoe: 'Years of experience', gradYear: 'Graduation year',
    bio: 'Professional bio', profilePhoto: 'Profile photo',
    specialties: 'Specialties', practiceCountries: 'Practice countries',
    languages: 'Spoken languages', certifications: 'Certifications',
    selectCountry: 'Select your country',
    addPractice: 'Add a practice country',
    addSpecialty: 'Add a specialty',
    addCertif: 'Add a certification',
    specifyCountry: 'Specify your country',
    specifyPractice: 'Specify the country',
    specifySpecialty: 'Specify the specialty',
    specifyCertification: 'Specify the certification',
    emailChecking: 'Checking email…',
    emailAvailable: 'Email available',
    emailTaken: 'This email is already in use',
    allRequired: 'All required fields must be completed',
    pwdShort: 'Password must be at least 6 characters',
    pwdMismatch: 'Passwords do not match',
    needCountry: 'Please select your country of residence',
    needPresence: 'Current presence country is required',
    needPractice: 'Please select at least one practice country',
    needLang: 'Please select at least one language',
    needSpec: 'Please select at least one specialty',
    needBar: 'Bar number is required',
    needBio: 'Professional bio is required (min. 50 characters)',
    needPhoto: 'Profile photo is required',
    needCertif: 'Please select at least one certification',
    acceptTermsRequired: 'You must accept the terms and conditions',
    emailWait: 'Please wait for email verification',
    emailInvalid: 'Please use a valid and available email',
    selectedLanguages: 'Selected languages',
    secureNote: 'Data protected • 24h validation • Legal support',
    footerTitle: '⚖️ Join the SOS Expats lawyers network',
    footerText: 'A network of verified lawyers for expats worldwide.',
    uploaderTitle: 'Profile photo',
    uploaderCta: 'Click here',
    uploaderHint: 'Or use the webcam with the replacement buttons',
    uploaderEmpty: 'No file chosen',
    langPlaceholder: 'Select languages',
    
  },
} as const;

const mapDuo = (list: Duo[], lang: 'fr' | 'en') => list.map((item) => item[lang]);

const TagSelector = React.memo(
  ({ items, onRemove, color = 'indigo' }: { items: string[]; onRemove: (v: string) => void; color?: 'indigo' | 'green' }) => {
    if (!items.length) return null;
    const tone =
      color === 'green'
        ? 'bg-green-100 text-green-800 border-green-300'
        : `bg-indigo-100 text-indigo-800 ${THEME.chip}`;
    return (
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {items.map((v, i) => (
            <span key={`${v}-${i}`} className={`${tone} px-3 py-1 rounded-xl text-sm border-2 flex items-center`}>
              {v}
              <button type="button" onClick={() => onRemove(v)} className="ml-2 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  }
);
TagSelector.displayName = 'TagSelector';

const SectionHeader = React.memo(
  ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="flex items-center space-x-3 mb-5">
      <div className={`bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradTo} rounded-2xl p-3 shadow-md text-white`}>{icon}</div>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600 text-sm sm:text-base mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
);
SectionHeader.displayName = 'SectionHeader';

const RegisterLawyer: React.FC = () => {
  const navigate = useNavigate();
  // --- Types sûrs (pas de any) ---
type NavState = Readonly<{ selectedProvider?: Provider }>;

function isProviderLike(v: unknown): v is Provider {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.name === 'string'
    && (o.type === 'lawyer' || o.type === 'expat');
}

const location = useLocation();
const [searchParams] = useSearchParams();
const redirect = searchParams.get('redirect') || '/dashboard';

useEffect(() => {
  const rawState: unknown = location.state;
  const state = (rawState ?? null) as NavState | null;
  const sp = state?.selectedProvider;

  if (isProviderLike(sp)) {
    try {
      sessionStorage.setItem('selectedProvider', JSON.stringify(sp));
    } catch {
  /* no-op: stockage indisponible */
}
  }
}, [location.state]);
  const { register, isLoading, error } = useAuth();
  const { language } = useApp(); // 'fr' | 'en'
  const lang = (language as 'fr' | 'en') || 'fr';
  const t = I18N[lang];

  // ---- SEO / OG meta (runtime) ----
  useEffect(() => {
    document.title = t.metaTitle;
    const ensure = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        // important: définir l'attribut name/property à la création
        if (prop) {
          el.setAttribute('property', name);
        } else {
          el.setAttribute('name', name);
        }
        document.head.appendChild(el);
      }
      el.content = content;
    };
    ensure('description', t.metaDesc);
    ensure('og:title', t.metaTitle, true);
    ensure('og:description', t.metaDesc, true);
    ensure('og:type', 'website', true);
    ensure('twitter:card', 'summary_large_image');
    ensure('twitter:title', t.metaTitle);
    ensure('twitter:description', t.metaDesc);
  }, [t]);

  // ---- Initial state ----
  const initial: LawyerFormData = {
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
    preferredLanguage: lang,
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
  };

  const [lawyerForm, setLawyerForm] = useState<LawyerFormData>(initial);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomSpecialty, setShowCustomSpecialty] = useState(false);
  const [showCustomCertification, setShowCustomCertification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email status
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>({
    isChecking: false,
    isAvailable: null,
    hasBeenChecked: false,
  });
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<number | null>(null);

  // ---- Memos for options (bilingue) ----
  const countryOptions = useMemo(() => mapDuo(COUNTRIES, lang), [lang]);
  const specialtyOptions = useMemo(() => mapDuo(SPECIALTIES, lang), [lang]);
  const certifOptions = useMemo(() => mapDuo(CERTIFICATIONS, lang), [lang]);

  const countryCodeOptions = useMemo(
    () =>
      COUNTRY_CODES.map((c) => ({
        value: c.code,
        label: `${c.flag} ${c.code} (${lang === 'en' ? c.en : c.fr})`,
      })),
    [lang]
  );

  // ---- Progress (UX hint) ----
  const progress = useMemo(() => {
    const fields = [
      !!lawyerForm.firstName,
      !!lawyerForm.lastName,
      !!lawyerForm.email,
      lawyerForm.password.length >= 6,
      !!lawyerForm.confirmPassword && lawyerForm.password === lawyerForm.confirmPassword,
      !!lawyerForm.phone,
      !!lawyerForm.whatsappNumber,
      !!lawyerForm.currentCountry,
      !!lawyerForm.currentPresenceCountry,
      !!lawyerForm.barNumber,
      lawyerForm.bio.trim().length >= 50,
      !!lawyerForm.profilePhoto,
      lawyerForm.specialties.length > 0,
      lawyerForm.certifications.length > 0,
      lawyerForm.practiceCountries.length > 0,
      (selectedLanguages as LanguageOption[]).length > 0,
      lawyerForm.acceptTerms,
    ];
    const done = fields.filter(Boolean).length;
    return Math.round((done / fields.length) * 100);
  }, [lawyerForm, selectedLanguages]);

  // ---- Email uniqueness (Firestore) ----
  const checkEmailAvailability = useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(clean)) return false;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', clean));
    const snap = await getDocs(q);
    return snap.empty;
  }, []);

  const handleEmailCheck = useCallback(
    (email: string) => {
      if (emailCheckTimeout) window.clearTimeout(emailCheckTimeout);
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !regex.test(email)) {
        setEmailStatus({ isChecking: false, isAvailable: null, hasBeenChecked: false });
        return;
      }
      setEmailStatus((prev) => ({ ...prev, isChecking: true }));
      const to = window.setTimeout(async () => {
        try {
          const ok = await checkEmailAvailability(email);
          setEmailStatus({ isChecking: false, isAvailable: ok, hasBeenChecked: true });
        } catch {
          setEmailStatus({ isChecking: false, isAvailable: false, hasBeenChecked: true });
        }
      }, 700);
      setEmailCheckTimeout(to);
    },
    [emailCheckTimeout, checkEmailAvailability]
  );

  // ---- Handlers ----
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = e.target as HTMLInputElement;
      setLawyerForm((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
      }));
      if (name === 'email') handleEmailCheck(value);
      if (name === 'currentCountry') {
        const other = lang === 'en' ? 'Other' : 'Autre';
        setShowCustomCountry(value === other);
      }
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const rest = { ...prev };
          delete rest[name];
          return rest;
        });
      }
      if (formError) setFormError('');
    },
    [fieldErrors, formError, handleEmailCheck, lang]
  );

  const onPracticeSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (!v) return;
      const other = lang === 'en' ? 'Other' : 'Autre';
      if (v === other) {
        setShowCustomCountry(true);
        e.target.value = '';
        return;
      }
      if (!lawyerForm.practiceCountries.includes(v)) {
        setLawyerForm((prev) => ({ ...prev, practiceCountries: [...prev.practiceCountries, v] }));
      }
      e.target.value = '';
    },
    [lawyerForm.practiceCountries, lang]
  );

  const removePractice = useCallback((v: string) => {
    setLawyerForm((prev) => ({ ...prev, practiceCountries: prev.practiceCountries.filter((x) => x !== v) }));
  }, []);

  const addCustomPractice = useCallback(() => {
    const v = lawyerForm.customPracticeCountry.trim();
    if (v && !lawyerForm.practiceCountries.includes(v)) {
      setLawyerForm((prev) => ({
        ...prev,
        practiceCountries: [...prev.practiceCountries, v],
        customPracticeCountry: '',
      }));
      setShowCustomCountry(false);
    }
  }, [lawyerForm.customPracticeCountry, lawyerForm.practiceCountries]);

  const onSpecialtySelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (!v) return;
      const other = lang === 'en' ? 'Other' : 'Autre';
      if (v === other) {
        setShowCustomSpecialty(true);
        e.target.value = '';
        return;
      }
      if (!lawyerForm.specialties.includes(v)) {
        setLawyerForm((prev) => ({ ...prev, specialties: [...prev.specialties, v] }));
      }
      e.target.value = '';
    },
    [lawyerForm.specialties, lang]
  );

  const removeSpecialty = useCallback((v: string) => {
    setLawyerForm((prev) => ({ ...prev, specialties: prev.specialties.filter((x) => x !== v) }));
  }, []);

  const addCustomSpecialty = useCallback(() => {
    const v = lawyerForm.customSpecialty.trim();
    if (v && !lawyerForm.specialties.includes(v)) {
      setLawyerForm((prev) => ({ ...prev, specialties: [...prev.specialties, v], customSpecialty: '' }));
      setShowCustomSpecialty(false);
    }
  }, [lawyerForm.customSpecialty, lawyerForm.specialties]);

  const onCertifSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (!v) return;
      const other = lang === 'en' ? 'Other' : 'Autre';
      if (v === other) {
        setShowCustomCertification(true);
        e.target.value = '';
        return;
      }
      if (!lawyerForm.certifications.includes(v)) {
        setLawyerForm((prev) => ({ ...prev, certifications: [...prev.certifications, v] }));
      }
      e.target.value = '';
    },
    [lawyerForm.certifications, lang]
  );

  const removeCertif = useCallback((v: string) => {
    setLawyerForm((prev) => ({ ...prev, certifications: prev.certifications.filter((x) => x !== v) }));
  }, []);

  const addCustomCertification = useCallback(() => {
    const v = lawyerForm.customCertification.trim();
    if (v && !lawyerForm.certifications.includes(v)) {
      setLawyerForm((prev) => ({
        ...prev,
        certifications: [...prev.certifications, v],
        customCertification: '',
      }));
      setShowCustomCertification(false);
    }
  }, [lawyerForm.customCertification, lawyerForm.certifications]);

  // ---- Validation ----
  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!emailStatus.hasBeenChecked || emailStatus.isChecking) e.email = t.emailWait;
    if (emailStatus.isAvailable === false) e.email = t.emailTaken;

    if (!lawyerForm.firstName.trim()) e.firstName = t.allRequired;
    if (!lawyerForm.lastName.trim()) e.lastName = t.allRequired;
    if (!lawyerForm.email.trim()) e.email = t.allRequired;
    if (!lawyerForm.password) e.password = t.allRequired;
    else if (lawyerForm.password.length < 6) e.password = t.pwdShort;
    if (lawyerForm.password !== lawyerForm.confirmPassword) e.confirmPassword = t.pwdMismatch;

    if (!lawyerForm.phone.trim()) e.phone = t.allRequired;
    if (!lawyerForm.whatsappNumber.trim()) e.whatsappNumber = t.allRequired;
    if (!lawyerForm.currentCountry) e.currentCountry = t.needCountry;
    if (!lawyerForm.currentPresenceCountry) e.currentPresenceCountry = t.needPresence;

    if (!lawyerForm.barNumber.trim()) e.barNumber = t.needBar;
    if (lawyerForm.practiceCountries.length === 0) e.practiceCountries = t.needPractice;
    if (lawyerForm.specialties.length === 0) e.specialties = t.needSpec;
    if ((selectedLanguages as LanguageOption[]).length === 0) e.languages = t.needLang;

    if (!lawyerForm.bio.trim() || lawyerForm.bio.trim().length < 50) e.bio = t.needBio;
    if (!lawyerForm.profilePhoto) e.profilePhoto = t.needPhoto;
    if (lawyerForm.certifications.length === 0) e.certifications = t.needCertif;

    if (!lawyerForm.acceptTerms) e.acceptTerms = t.acceptTermsRequired;

    setFieldErrors(e);
    if (Object.keys(e).length) {
      setFormError(t.allRequired);
      return false;
    }
    return true;
  }, [lawyerForm, selectedLanguages, emailStatus, t]);

  // ---- Submit ----
  const handleSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      setFormError('');
      if (!validate()) {
        setIsSubmitting(false);
        return;
      }

      try {
        const languageCodes = (selectedLanguages as LanguageOption[]).map((l) => l.value);
        const other = lang === 'en' ? 'Other' : 'Autre';

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
          currentCountry:
            lawyerForm.currentCountry === other ? lawyerForm.customCountry : lawyerForm.currentCountry,
          currentPresenceCountry: lawyerForm.currentPresenceCountry,
          country: lawyerForm.currentPresenceCountry,
          practiceCountries: lawyerForm.practiceCountries,
          profilePhoto: lawyerForm.profilePhoto,
          photoURL: lawyerForm.profilePhoto,
          avatar: lawyerForm.profilePhoto,
          languages: languageCodes,
          languagesSpoken: languageCodes,
          specialties: lawyerForm.specialties,
          certifications: lawyerForm.certifications,
          education: lawyerForm.education,
          barNumber: lawyerForm.barNumber.trim(),
          yearsOfExperience: lawyerForm.yearsOfExperience,
          graduationYear: lawyerForm.graduationYear,
          bio: lawyerForm.bio.trim(),
          description: lawyerForm.bio.trim(),
          availability: lawyerForm.availability,
          isOnline: lawyerForm.availability === 'available',
          isApproved: false,
          isVisible: true,
          isActive: true,
          rating: 4.5,
          reviewCount: 0,
          preferredLanguage: lawyerForm.preferredLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await register(userData, lawyerForm.password);
        navigate(redirect, {
  replace: true,
  state: {
    message:
      lang === 'en'
        ? 'Registration successful! Your account will be validated within 24h.'
        : 'Inscription réussie ! Votre compte sera validé sous 24h.',
    type: 'success',
  },
});
      } catch (err: unknown) {
        console.error('Register lawyer error:', err);
        const msg = err instanceof Error ? err.message : 'Error';
        setFormError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, validate, register, lawyerForm, selectedLanguages, navigate, redirect, lang]
  );

  // ---- Can submit ----
  const canSubmit = useMemo(
    () =>
      lawyerForm.email &&
      lawyerForm.password &&
      lawyerForm.firstName &&
      lawyerForm.lastName &&
      lawyerForm.barNumber &&
      lawyerForm.acceptTerms &&
      lawyerForm.bio &&
      lawyerForm.profilePhoto &&
      (selectedLanguages as LanguageOption[]).length > 0 &&
      lawyerForm.specialties.length > 0 &&
      lawyerForm.certifications.length > 0 &&
      lawyerForm.practiceCountries.length > 0 &&
      !isLoading &&
      !isSubmitting &&
      !Object.keys(fieldErrors).length,
    [lawyerForm, selectedLanguages, fieldErrors, isLoading, isSubmitting]
  );

  // ===== RENDER =====
  return (
    <Layout>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['WebPage', 'RegisterAction'],
            name: t.metaTitle,
            description: t.metaDesc,
            inLanguage: lang === 'en' ? 'en-US' : 'fr-FR',
            publisher: { '@type': 'Organization', name: 'SOS Expats' },
          }),
        }}
      />
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7ff_0%,#ffffff_35%,#f8f5ff_100%)]">
        {/* Compact hero */}
        <header className="pt-6 sm:pt-8 text-center">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900">
            <span className={`bg-gradient-to-r ${THEME.gradFrom} ${THEME.gradTo} bg-clip-text text-transparent`}>
              {t.heroTitle}
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 px-4">{t.heroSubtitle}</p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-white border shadow-sm">24/7</span>
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-white border shadow-sm">
              {lang === 'en' ? 'Multilingual' : 'Multilingue'}
            </span>
          </div>
          <div className="mt-3 text-xs sm:text-sm text-gray-500">
            {t.already}{' '}
            <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-semibold underline text-indigo-700 hover:text-indigo-800">
              {t.login}
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {(error || formError) && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <div className="text-sm text-red-700">{error || formError}</div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <form onSubmit={handleSubmit} noValidate>
              {/* Personal */}
              <section className="p-5 sm:p-6">
                <SectionHeader icon={<Users className="w-5 h-5" />} title={t.personalInfo} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.firstName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="firstName"
                      autoComplete="given-name"
                      value={lawyerForm.firstName}
                      onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${
                        fieldErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder={lang === 'en' ? 'John' : 'Jean'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.lastName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="lastName"
                      autoComplete="family-name"
                      value={lawyerForm.lastName}
                      onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${
                        fieldErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder={lang === 'en' ? 'Doe' : 'Dupont'}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.email} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${THEME.icon}`} />
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={lawyerForm.email}
                      onChange={onChange}
                      className={`w-full pl-10 px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${
                        emailStatus.hasBeenChecked
                          ? emailStatus.isAvailable
                            ? 'border-green-300'
                            : 'border-red-300'
                          : fieldErrors.email
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                      }`}
                      placeholder={lang === 'en' ? 'lawyer@example.com' : 'avocat@example.com'}
                    />
                  </div>
                  {emailStatus.isChecking && <p className="mt-1 text-sm text-indigo-700">{t.emailChecking}</p>}
                  {emailStatus.hasBeenChecked && emailStatus.isAvailable && (
                    <p className="mt-1 text-sm text-green-600">
                      <CheckCircle className="inline w-4 h-4 mr-1" />
                      {t.emailAvailable}
                    </p>
                  )}
                  {emailStatus.hasBeenChecked && emailStatus.isAvailable === false && (
                    <p className="mt-1 text-sm text-red-600">
                      <XCircle className="inline w-4 h-4 mr-1" />
                      {t.emailTaken}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.password} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${THEME.icon}`} />
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={lawyerForm.password}
                        onChange={onChange}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-12 px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${
                          fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder={lang === 'en' ? 'At least 6 characters' : 'Minimum 6 caractères'}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.confirmPassword} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${THEME.icon}`} />
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={lawyerForm.confirmPassword}
                        onChange={onChange}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-12 px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${
                          fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder={lang === 'en' ? 'Confirm' : 'Confirmer'}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className={`mt-5 rounded-xl border ${THEME.border} ${THEME.subtle} p-4`}>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                    <Phone className={`w-4 h-4 mr-2 ${THEME.icon}`} /> {t.phone} / {t.whatsapp}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t.countryCode}</label>
                      <select
                        name="phoneCountryCode"
                        value={lawyerForm.phoneCountryCode}
                        onChange={onChange}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
                      >
                        {countryCodeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t.phone} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="phone"
                        value={lawyerForm.phone}
                        onChange={onChange}
                        autoComplete="tel"
                        className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white ${THEME.ring} ${
                          fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="612345678"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
                      <select
                        name="whatsappCountryCode"
                        value={lawyerForm.whatsappCountryCode}
                        onChange={onChange}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-green-600"
                      >
                        {countryCodeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t.whatsapp} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="whatsappNumber"
                        value={lawyerForm.whatsappNumber}
                        onChange={onChange}
                        className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white ${THEME.ring} ${
                          fieldErrors.whatsappNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="612345678"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Geographic */}
              <section className="p-5 sm:p-6 border-t border-gray-50">
                <SectionHeader icon={<Globe className="w-5 h-5" />} title={t.geoInfo} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.residenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="currentCountry"
                      value={lawyerForm.currentCountry}
                      onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${
                        fieldErrors.currentCountry ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">{t.selectCountry}</option>
                      {countryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {showCustomCountry && (
                      <div className="mt-3">
                        <input
                          name="customCountry"
                          value={lawyerForm.customCountry}
                          onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} border-gray-200`}
                          placeholder={t.specifyCountry}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.presenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="currentPresenceCountry"
                      value={lawyerForm.currentPresenceCountry}
                      onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${
                        fieldErrors.currentPresenceCountry ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">{t.selectCountry}</option>
                      {countryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* practice countries */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.practiceCountries} <span className="text-red-500">*</span>
                  </label>
                  <TagSelector items={lawyerForm.practiceCountries} onRemove={removePractice} color="green" />
                  <select
                    onChange={onPracticeSelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-green-600"
                  >
                    <option value="">{t.addPractice}</option>
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {showCustomCountry && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={lawyerForm.customPracticeCountry}
                        onChange={(e) => setLawyerForm((p) => ({ ...p, customPracticeCountry: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                        placeholder={t.specifyPractice}
                      />
                      <button
                        type="button"
                        onClick={addCustomPractice}
                        disabled={!lawyerForm.customPracticeCountry.trim()}
                        className="px-4 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-60"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Professional */}
              <section className="p-5 sm:p-6 border-t border-gray-50">
                <SectionHeader icon={<Scale className="w-5 h-5" />} title={t.proInfo} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.barNumber} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="barNumber"
                      value={lawyerForm.barNumber}
                      onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} ${
                        fieldErrors.barNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">{t.yoe}</label>
                    <input
                      name="yearsOfExperience"
                      type="number"
                      value={lawyerForm.yearsOfExperience}
                      onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} border-gray-200`}
                      min={0}
                      max={50}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">{t.gradYear}</label>
                  <input
                    name="graduationYear"
                    type="number"
                    value={lawyerForm.graduationYear}
                    onChange={onChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} border-gray-200`}
                    min={1980}
                    max={new Date().getFullYear()}
                  />
                </div>

                {/* specialties */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.specialties} <span className="text-red-500">*</span>
                  </label>
                  <TagSelector items={lawyerForm.specialties} onRemove={removeSpecialty} />
                  <select
                    onChange={onSpecialtySelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="">{t.addSpecialty}</option>
                    {specialtyOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {showCustomSpecialty && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={lawyerForm.customSpecialty}
                        onChange={(e) => setLawyerForm((p) => ({ ...p, customSpecialty: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                        placeholder={t.specifySpecialty}
                      />
                      <button
                        type="button"
                        onClick={addCustomSpecialty}
                        disabled={!lawyerForm.customSpecialty.trim()}
                        className="px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>

                {/* certifications */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.certifications} <span className="text-red-500">*</span>
                  </label>
                  <TagSelector items={lawyerForm.certifications} onRemove={removeCertif} />
                  <select
                    onChange={onCertifSelect}
                    value=""
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">{t.addCertif}</option>
                    {certifOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {showCustomCertification && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={lawyerForm.customCertification}
                        onChange={(e) => setLawyerForm((p) => ({ ...p, customCertification: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                        placeholder={t.specifyCertification}
                      />
                      <button
                        type="button"
                        onClick={addCustomCertification}
                        disabled={!lawyerForm.customCertification.trim()}
                        className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-60"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.languages} <span className="text-red-500">*</span>
                  </label>

                  {(selectedLanguages as LanguageOption[]).length > 0 && (
                    <div className="mb-2 text-xs text-gray-700">
                      <span className="font-medium">{t.selectedLanguages}:</span>{' '}
                      {(selectedLanguages as LanguageOption[]).map((l) => l.value.toUpperCase()).join(', ')}
                    </div>
                  )}

                  <Suspense fallback={<div className="h-10 rounded-lg bg-gray-100 animate-pulse" />}>
                    <MultiLanguageSelect
                      value={selectedLanguages}
                      onChange={(v: MultiValue<LanguageOption>) => {
                        setSelectedLanguages(v);
                        if (fieldErrors.languages) {
                          setFieldErrors((prev) => {
                            const rest = { ...prev };
                            delete rest.languages;
                            return rest;
                          });
                        }
                      }}
                      /* ⚠️ Si MultiLanguageSelect n'a pas la prop placeholder dans ses types,
                         laisse la ligne suivante commentée. Décommente-la uniquement si tu as
                         ajouté `placeholder?: string` dans MultiLanguageSelectProps.
                      placeholder={t.langPlaceholder}
                      */
                    />
                  </Suspense>

                  {fieldErrors.languages && <p className="text-sm text-red-600 mt-2">{fieldErrors.languages}</p>}
                </div>

                {/* Bio */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.bio} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="bio"
                    rows={5}
                    value={lawyerForm.bio}
                    onChange={onChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} min-h-[120px] ${
                      fieldErrors.bio ? 'border-red-500 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder={
                      lang === 'en'
                        ? 'Describe your practice, expertise and how you help expats…'
                        : 'Décrivez votre pratique, vos expertises et comment vous aidez les expatriés…'
                    }
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={lawyerForm.bio.length < 50 ? 'text-orange-600' : 'text-green-600'}>
                      {lawyerForm.bio.length < 50
                        ? lang === 'en'
                          ? `+${50 - lawyerForm.bio.length} chars to validate`
                          : `Encore ${50 - lawyerForm.bio.length} caractères pour valider`
                        : lang === 'en'
                        ? '✓ Field validated'
                        : '✓ Champ validé'}
                    </span>
                    <span className={lawyerForm.bio.length > 450 ? 'text-orange-500' : 'text-gray-500'}>
                      {lawyerForm.bio.length}/500
                    </span>
                  </div>
                </div>

                {/* Photo */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="flex items-center text-sm font-semibold text-gray-900 mb-2">
                    <Camera className={`w-4 h-4 mr-2 ${THEME.icon}`} /> {t.profilePhoto}{' '}
                    <span className="text-red-500 ml-1">*</span>
                  </label>

                  <Suspense fallback={<div className="h-40 rounded-lg bg-gray-100 animate-pulse" />}>
                    <ImageUploader
                      locale={lang}
                      currentImage={lawyerForm.profilePhoto}
                      onImageUploaded={(url: string) => {
                        setLawyerForm((prev) => ({
                          ...prev,
                          profilePhoto: url,
                        }));
                      }}
                      hideNativeFileLabel
                      cropShape="round"
                      outputSize={512}
                    />
                  </Suspense>

                  {fieldErrors.profilePhoto && <p className="text-sm text-red-600 mt-2">{fieldErrors.profilePhoto}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {lang === 'en' ? 'Professional photo (JPG/PNG) required' : 'Photo professionnelle (JPG/PNG) obligatoire'}
                  </p>
                </div>
              </section>

              {/* Terms + Submit */}
              <section className={`p-5 sm:p-6 border-t border-gray-50 bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradTo}`}>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={lawyerForm.acceptTerms}
                      onChange={(e) => setLawyerForm((p) => ({ ...p, acceptTerms: e.target.checked }))}
                      className="h-5 w-5 text-indigo-600 border-gray-300 rounded mt-0.5"
                      required
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-800">
                      {t.acceptTerms}{' '}
                      <a
                        href="http://localhost:5173/cgu-avocats"
                        className="text-indigo-700 underline font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.termsLink}
                      </a>{' '}
                      <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {fieldErrors.acceptTerms && <p className="text-sm text-red-600 mt-2">{fieldErrors.acceptTerms}</p>}
                </div>

                <div className="mt-4">
                  <Button
                    type="submit"
                    loading={isLoading || isSubmitting}
                    fullWidth
                    size="large"
                    className={`text-white font-black py-4 px-6 rounded-2xl text-base sm:text-lg w-full shadow-lg ${
                      canSubmit ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-700 hover:brightness-110' : 'bg-gray-400 cursor-not-allowed opacity-60'
                    }`}
                    disabled={!canSubmit}
                  >
                    {isLoading || isSubmitting ? (
                      t.loading
                    ) : (
                      <span className="inline-flex items-center justify-center">
                        <Scale className="w-5 h-5 mr-2" /> {t.create}
                      </span>
                    )}
                  </Button>
                  {!canSubmit && (
                    <div className="mt-3 text-center">
                      <span className="text-xs text-white/90 bg-white/10 border border-white/20 rounded-xl px-3 py-1 inline-block">
                        {lang === 'en' ? `Completion: ${progress}%` : `Complétion : ${progress}%`}
                      </span>
                    </div>
                  )}
                  <p className="text-center text-xs text-white/90 mt-4">{t.secureNote}</p>
                </div>
              </section>
            </form>
          </div>

          {/* Footer */}
          <footer className="text-center mt-8">
            <div className="bg-white rounded-xl p-5 shadow border">
              <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-1">{t.footerTitle}</h3>
              <p className="text-sm text-gray-700">{t.footerText}</p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
              <a href="http://localhost:5173/politique-confidentialite" className="hover:text-indigo-700 underline">
                🔒 {lang === 'en' ? 'Privacy' : 'Confidentialité'}
              </a>
              <a href="http://localhost:5173/cgu-avocats" className="hover:text-indigo-700 underline">
                📋 CGU Avocats
              </a>
              <a href="http://localhost:5173/centre-aide" className="hover:text-indigo-700 underline">
                💬 {lang === 'en' ? 'Help' : 'Aide'}
              </a>
              <Link to="/contact" className="hover:text-indigo-700 underline">
                📧 Contact
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </Layout>
  );
};

export default RegisterLawyer;
