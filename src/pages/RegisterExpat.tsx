// src/pages/RegisterExpat.tsx
import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Globe, MapPin, Users, Phone,
  X, Camera, CheckCircle, ArrowRight
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp } from 'firebase/firestore';

// ===== Lazy (perf) =====
const ImageUploader = lazy(() => import('../components/common/ImageUploader'));
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// ===== Types =====
interface LanguageOption { value: string; label: string }
interface ExpatFormData {
  firstName: string; lastName: string; email: string; password: string;
  phone: string; phoneCountryCode: string; whatsappCountryCode: string; whatsappNumber: string;
  currentCountry: string; currentPresenceCountry: string; customCountry: string; customPresenceCountry: string;
  preferredLanguage: 'fr' | 'en';
  practiceCountries: string[]; customPracticeCountry: string;
  interventionCountry: string; customInterventionCountry: string;
  helpTypes: string[]; customHelpType: string; customLanguage: string;
  yearsAsExpat: number; profilePhoto: string; bio: string;
  availability: 'available' | 'busy' | 'offline'; acceptTerms: boolean;
}

// ===== THEME (expat = emerald/green, cohérent Register.tsx) =====
const THEME = {
  gradFrom: 'from-emerald-600',
  gradTo: 'to-green-600',
  ring: 'focus:border-emerald-600',
  border: 'border-emerald-200',
  icon: 'text-emerald-600',
  chip: 'border-emerald-200',
  subtle: 'bg-emerald-50',
  button: 'from-emerald-600 via-green-600 to-teal-700',
} as const;

// ===== i18n =====
const I18N = {
  fr: {
    metaTitle: 'Inscription Expatrié Aidant • SOS Expats',
    metaDesc: "Partagez votre expérience d'expatriation et aidez d'autres francophones. Rejoignez la communauté SOS Expats.",
    heroTitle: 'Inscription Expatrié Aidant',
    heroSubtitle: "Partagez votre expérience d'expatriation et aidez d'autres francophones à réussir leur nouvelle vie à l'étranger.",
    already: 'Déjà inscrit ?', login: 'Se connecter',
    step1: 'Informations personnelles',
    step2: 'Informations géographiques et expérience',
    step3: "Comment voulez-vous aider ?",
    // fields
    firstName: 'Prénom', lastName: 'Nom de famille', email: 'Adresse email', password: 'Mot de passe',
    phone: 'Téléphone', whatsapp: 'Numéro WhatsApp',
    countryCode: 'Indicatif pays',
    residenceCountry: 'Pays de résidence', presenceCountry: 'Pays de présence actuel',
    interventionCountry: "Pays d'intervention principal",
    yearsAsExpat: "Années d'expérience d'expatriation",
    bio: "Description de votre expérience",
    profilePhoto: 'Photo de profil',
    languages: 'Langues parlées',
    helpDomains: "Domaines d'aide",
    addHelp: "Ajouter un domaine d'aide",
    specifyHelp: "Précisez le domaine d'aide",
    // placeholders / hints
    passwordHint: 'Minimum 6 caractères',
    emailPlaceholder: 'jean.dupont@example.com',
    firstPlaceholder: 'Jean', lastPlaceholder: 'Dupont',
    phonePlaceholder: '612345678',
    bioPlaceholder: "Décrivez votre parcours, vos compétences et comment vous aidez d'autres expatriés…",
    // buttons
    create: "Créer mon compte expatrié aidant",
    loading: 'Création en cours…',
    clickHere: 'Cliquez ici',
    // validation / status
    required: 'obligatoire',
    allRequired: 'Tous les champs obligatoires doivent être remplis',
    invalidEmail: 'Veuillez saisir une adresse email valide',
    passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
    phoneRequired: 'Le numéro de téléphone est obligatoire',
    whatsappRequired: 'Le numéro WhatsApp est obligatoire',
    selectCountry: 'Sélectionnez votre pays',
    selectPresence: 'Sélectionnez votre pays de présence',
    selectIntervention: "Sélectionnez votre pays d'intervention",
    selectLanguage: 'Veuillez sélectionner au moins une langue',
    selectHelpType: "Veuillez indiquer au moins un domaine d'aide",
    bioRequired: 'La description est obligatoire',
    bioTooShort: 'La description doit contenir au moins 50 caractères',
    profilePhotoRequired: 'La photo de profil est obligatoire',
    yearsMin: "Vous devez avoir au moins 1 an d'expérience",
    // progress
    progress: 'Progression',
    fieldValidated: '✓ Champ validé',
    charsToValidate: (n: number) => `Encore ${n} caractères pour valider`,
    // footer / legal
    secureNote: '🔒 Données protégées • Support 24/7',
    footerTitle: "🌍 Rejoignez la communauté d'entraide expatriée",
    footerText: "Plus de 10 000 expatriés francophones dans le monde.",
    cguLabel: '📋 CGU Expatriés',
    privacyLabel: '🔒 Confidentialité',
    helpLabel: '💬 Aide',
    contactLabel: '📧 Contact',
    // success
    success: 'Inscription réussie ! Bienvenue dans la communauté.',
  },
  en: {
    metaTitle: 'Expat Helper Registration • SOS Expats',
    metaDesc: 'Share your expat experience and help others. Join the SOS Expats community.',
    heroTitle: 'Expat Helper Registration',
    heroSubtitle: 'Share your expatriation experience and help other people succeed abroad.',
    already: 'Already registered?', login: 'Log in',
    step1: 'Personal Information',
    step2: 'Geographic Information & Experience',
    step3: 'How do you want to help?',
    // fields
    firstName: 'First name', lastName: 'Last name', email: 'Email', password: 'Password',
    phone: 'Phone', whatsapp: 'WhatsApp number',
    countryCode: 'Country code',
    residenceCountry: 'Country of residence', presenceCountry: 'Current presence country',
    interventionCountry: 'Main intervention country',
    yearsAsExpat: 'Years as an expat',
    bio: 'Your experience (bio)',
    profilePhoto: 'Profile photo',
    languages: 'Spoken languages',
    helpDomains: 'Help domains',
    addHelp: 'Add a help domain',
    specifyHelp: 'Specify the help domain',
    // placeholders / hints
    passwordHint: 'At least 6 characters',
    emailPlaceholder: 'john.doe@example.com',
    firstPlaceholder: 'John', lastPlaceholder: 'Doe',
    phonePlaceholder: '612345678',
    bioPlaceholder: 'Describe your background, skills, and how you help other expats…',
    // buttons
    create: 'Create my expat helper account',
    loading: 'Creating account…',
    clickHere: 'Click here',
    // validation / status
    required: 'required',
    allRequired: 'All required fields must be completed',
    invalidEmail: 'Please enter a valid email address',
    passwordTooShort: 'Password must be at least 6 characters',
    phoneRequired: 'Phone number is required',
    whatsappRequired: 'WhatsApp number is required',
    selectCountry: 'Select your country',
    selectPresence: 'Select your presence country',
    selectIntervention: 'Select your intervention country',
    selectLanguage: 'Please select at least one language',
    selectHelpType: 'Please add at least one help domain',
    bioRequired: 'Bio is required',
    bioTooShort: 'Bio must be at least 50 characters',
    profilePhotoRequired: 'Profile photo is required',
    yearsMin: 'You must have at least 1 year of experience',
    // progress
    progress: 'Progress',
    fieldValidated: '✓ Field validated',
    charsToValidate: (n: number) => `+${n} chars to validate`,
    // footer / legal
    secureNote: '🔒 Data protected • 24/7 support',
    footerTitle: '🌍 Join the expat helper community',
    footerText: 'Over 10,000 French-speaking expats worldwide.',
    cguLabel: '📋 CGU Expats',
    privacyLabel: '🔒 Privacy',
    helpLabel: '💬 Help',
    contactLabel: '📧 Contact',
    // success
    success: 'Registration successful! Welcome to the community.',
  }
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

const HELP_TYPES: Duo[] = [
  { fr: 'Démarches administratives', en: 'Administrative procedures' },
  { fr: 'Recherche de logement', en: 'Housing search' },
  { fr: 'Ouverture de compte bancaire', en: 'Bank account opening' },
  { fr: 'Système de santé', en: 'Healthcare system' },
  { fr: 'Éducation et écoles', en: 'Education & schools' },
  { fr: 'Transport', en: 'Transport' },
  { fr: "Recherche d'emploi", en: 'Job search' },
  { fr: "Création d'entreprise", en: 'Company creation' },
  { fr: 'Fiscalité locale', en: 'Local taxation' },
  { fr: 'Culture et intégration', en: 'Culture & integration' },
  { fr: 'Visa et immigration', en: 'Visa & immigration' },
  { fr: 'Assurances', en: 'Insurances' },
  { fr: 'Téléphonie et internet', en: 'Phone & internet' },
  { fr: 'Alimentation et courses', en: 'Groceries & food' },
  { fr: 'Loisirs et sorties', en: 'Leisure & going out' },
  { fr: 'Sports et activités', en: 'Sports & activities' },
  { fr: 'Sécurité', en: 'Safety' },
  { fr: 'Urgences', en: 'Emergencies' },
  { fr: 'Autre', en: 'Other' },
];

// Country codes (names FR/EN)
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
  { code: '+43', flag: '🇦🇹', fr: 'Autriche', en: 'Austria' },
  { code: '+351', flag: '🇵🇹', fr: 'Portugal', en: 'Portugal' },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{6,20}$/;

const mapDuo = (list: Duo[], lang: 'fr' | 'en') => list.map(item => item[lang]);

const TagSelector = React.memo(({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) => {
  if (!items.length) return null;
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {items.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className={`bg-emerald-100 text-emerald-800 ${THEME.chip} px-3 py-1 rounded-xl text-sm border-2 flex items-center`}
          >
            {v}
            <button type="button" onClick={() => onRemove(v)} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
});
TagSelector.displayName = 'TagSelector';

const SectionHeader = React.memo(({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex items-center space-x-3 mb-5">
    <div className={`bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradTo} rounded-2xl p-3 shadow-md text-white`}>{icon}</div>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-600 text-sm sm:text-base mt-0.5">{subtitle}</p>}
    </div>
  </div>
));
SectionHeader.displayName = 'SectionHeader';

// ===== Component =====
const RegisterExpat: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const { language } = useApp(); // 'fr' | 'en'
  const lang = (language as 'fr' | 'en') || 'fr';
  const t = I18N[lang];

  // ---- SEO / OG / JSON-LD ----
  useEffect(() => {
    document.title = t.metaTitle;
    const ensure = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        prop ? el.setAttribute('property', name) : el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    ensure('description', t.metaDesc);
    ensure('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    ensure('og:type', 'website', true);
    ensure('og:title', t.metaTitle, true);
    ensure('og:description', t.metaDesc, true);
    ensure('og:locale', lang === 'en' ? 'en_US' : 'fr_FR', true);
    ensure('twitter:card', 'summary_large_image');
    ensure('twitter:title', t.metaTitle);
    ensure('twitter:description', t.metaDesc);

    // JSON-LD
    const ld = {
      '@context': 'https://schema.org',
      '@type': ['WebPage', 'RegisterAction'],
      name: t.metaTitle,
      description: t.metaDesc,
      inLanguage: lang === 'en' ? 'en-US' : 'fr-FR',
      publisher: { '@type': 'Organization', name: 'SOS Expats' },
    };
    const id = 'ld-register-expat';
    let s = document.getElementById(id) as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement('script');
      s.id = id;
      s.type = 'application/ld+json';
      document.head.appendChild(s);
    }
    s.textContent = JSON.stringify(ld);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [t, lang]);

  // ---- Initial state ----
  const initial: ExpatFormData = {
    firstName: '', lastName: '', email: '', password: '',
    phone: '', phoneCountryCode: '+33', whatsappCountryCode: '+33', whatsappNumber: '',
    currentCountry: '', currentPresenceCountry: '', customCountry: '', customPresenceCountry: '',
    preferredLanguage: lang,
    practiceCountries: [], customPracticeCountry: '',
    interventionCountry: '', customInterventionCountry: '',
    helpTypes: [], customHelpType: '', customLanguage: '',
    yearsAsExpat: 0, profilePhoto: '', bio: '',
    availability: 'available', acceptTerms: false
  };

  const [formData, setFormData] = useState<ExpatFormData>(initial);
  const [selectedLanguages, setSelectedLanguages] = useState<LanguageOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCustomHelpType, setShowCustomHelpType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Options (i18n) ----
  const countries = useMemo(() => mapDuo(COUNTRIES, lang), [lang]);
  const helpTypes = useMemo(() => mapDuo(HELP_TYPES, lang), [lang]);
  const countryCodeOptions = useMemo(
    () =>
      COUNTRY_CODES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.code} ({lang === 'en' ? c.en : c.fr})
        </option>
      )),
    [lang]
  );

  // ---- Progress ----
  const progress = useMemo(() => {
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
    const done = fields.filter(Boolean).length;
    return Math.round((done / fields.length) * 100);
  }, [formData, selectedLanguages]);

  // ---- Validation helpers ----
  const validateField = useCallback(
    (name: string, value: string | number | boolean): string => {
      switch (name) {
        case 'email':
          if (!value) return t.allRequired;
          if (!EMAIL_REGEX.test(value as string)) return t.invalidEmail;
          return '';
        case 'password':
          if (!value) return t.allRequired;
          if ((value as string).length < 6) return t.passwordTooShort;
          return '';
        case 'phone':
          if (!value) return t.phoneRequired;
          if (!PHONE_REGEX.test(value as string)) return t.phoneRequired;
          return '';
        case 'whatsappNumber':
          if (!value) return t.whatsappRequired;
          return '';
        case 'bio':
          if (!(value as string)?.trim()) return t.bioRequired;
          if ((value as string).length < 50) return t.bioTooShort;
          return '';
        case 'yearsAsExpat':
          if (!value || (value as number) < 1) return t.yearsMin;
          return '';
        default:
          return '';
      }
    },
    [t]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const finalValue =
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? Number(value)
          : value;
      setFormData((p) => ({ ...p, [name]: finalValue }));
      const err = validateField(name, finalValue);
      if (err || fieldErrors[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: err }));
      }
      if (formError) setFormError('');
    },
    [validateField, fieldErrors, formError]
  );

  // ---- Help types ----
  const onHelpSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (!v) return;
      const other = lang === 'en' ? 'Other' : 'Autre';
      if (v === other) {
        setShowCustomHelpType(true);
        e.target.value = '';
        return;
      }
      if (!formData.helpTypes.includes(v)) {
        setFormData((prev) => ({ ...prev, helpTypes: [...prev.helpTypes, v] }));
      }
      e.target.value = '';
      if (fieldErrors.helpTypes) setFieldErrors(({ helpTypes, ...rest }) => rest);
    },
    [formData.helpTypes, fieldErrors.helpTypes, lang]
  );

  const removeHelp = useCallback((v: string) => {
    setFormData((prev) => ({ ...prev, helpTypes: prev.helpTypes.filter((x) => x !== v) }));
  }, []);

  const addCustomHelp = useCallback(() => {
    const v = formData.customHelpType.trim();
    if (v && !formData.helpTypes.includes(v)) {
      setFormData((prev) => ({ ...prev, helpTypes: [...prev.helpTypes, v], customHelpType: '' }));
      setShowCustomHelpType(false);
    }
  }, [formData.customHelpType, formData.helpTypes]);

  // ---- Full validation ----
  const validateForm = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!formData.firstName.trim()) e.firstName = t.allRequired;
    if (!formData.lastName.trim()) e.lastName = t.allRequired;
    if (!formData.email.trim()) e.email = t.allRequired;
    else if (!EMAIL_REGEX.test(formData.email)) e.email = t.invalidEmail;
    if (!formData.password) e.password = t.allRequired;
    else if (formData.password.length < 6) e.password = t.passwordTooShort;
    if (!formData.phone.trim()) e.phone = t.phoneRequired;
    if (!formData.whatsappNumber.trim()) e.whatsappNumber = t.whatsappRequired;
    if (!formData.currentCountry) e.currentCountry = t.selectCountry;
    if (!formData.currentPresenceCountry) e.currentPresenceCountry = t.selectPresence;
    if (!formData.interventionCountry) e.interventionCountry = t.selectIntervention;
    if (formData.helpTypes.length === 0) e.helpTypes = t.selectHelpType;
    if (selectedLanguages.length === 0) e.languages = t.selectLanguage;
    if (!formData.bio.trim()) e.bio = t.bioRequired;
    else if (formData.bio.length < 50) e.bio = t.bioTooShort;
    if (!formData.profilePhoto) e.profilePhoto = t.profilePhotoRequired;
    if (!formData.acceptTerms) e.acceptTerms = t.allRequired;
    if (formData.yearsAsExpat < 1) e.yearsAsExpat = t.yearsMin;

    setFieldErrors(e);
    if (Object.keys(e).length) {
      setFormError(t.allRequired);
      return false;
    }
    return true;
  }, [formData, selectedLanguages, t]);

  // ---- Submit ----
  const onSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
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
          languages: selectedLanguages.map((l) => l.value), // ISO codes from select
          helpTypes: formData.helpTypes,
          yearsAsExpat: formData.yearsAsExpat,
          availability: formData.availability,
          isApproved: true,
          isVisible: true,
          isActive: true,
          preferredLanguage: lang,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await register(userData, formData.password);
        navigate('/dashboard', { state: { message: t.success, type: 'success' } });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setFormError(msg || 'Error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, validateForm, register, formData, selectedLanguages, navigate, t, lang]
  );

  // ---- Can submit ----
  const canSubmit = useMemo(
    () =>
      formData.email &&
      formData.password &&
      formData.firstName &&
      formData.lastName &&
      formData.interventionCountry &&
      formData.acceptTerms &&
      formData.bio &&
      formData.profilePhoto &&
      selectedLanguages.length > 0 &&
      formData.helpTypes.length > 0 &&
      !isLoading &&
      !isSubmitting &&
      !Object.keys(fieldErrors).length,
    [formData, selectedLanguages, fieldErrors, isLoading, isSubmitting]
  );

  // ---- Options JSX ----
  const countrySelectOptions = useMemo(
    () => countries.map((c) => <option key={c} value={c}>{c}</option>),
    [countries]
  );
  const helpTypeOptions = useMemo(
    () => helpTypes.map((c) => <option key={c} value={c}>{c}</option>),
    [helpTypes]
  );

  return (
    <Layout>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7fff9_0%,#ffffff_35%,#f0fff7_100%)]">
        {/* Compact hero (réduit l’espace vide sous le header) */}
        <header className="pt-6 sm:pt-8 text-center">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900">
            <span className={`bg-gradient-to-r ${THEME.gradFrom} ${THEME.gradTo} bg-clip-text text-transparent`}>
              {t.heroTitle}
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 px-4">
            {t.heroSubtitle}
          </p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-white border shadow-sm">24/7</span>
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-white border shadow-sm">{lang === 'en' ? 'Multilingual' : 'Multilingue'}</span>
          </div>
          <div className="mt-5 h-1 w-40 mx-auto rounded-full" style={{ backgroundColor: 'rgba(5, 150, 105, 0.85)' }} />
          <p className="mt-3 text-xs sm:text-sm text-gray-500">
            {t.already}{' '}
            <Link to="/login" className="font-semibold underline text-emerald-700 hover:text-emerald-800">
              {t.login}
            </Link>
          </p>
        </header>

        <main className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">{t.progress}</span>
              <span className="text-sm font-bold text-emerald-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Error banner */}
          {(error || formError) && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <div className="text-sm text-red-700">{error || formError}</div>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <form onSubmit={onSubmit} noValidate>
              {/* Step 1: Personal */}
              <section className="p-5 sm:p-6">
                <SectionHeader icon={<Users className="w-5 h-5" />} title={t.step1} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.firstName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="firstName" autoComplete="given-name" value={formData.firstName} onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${fieldErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      placeholder={t.firstPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.lastName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="lastName" autoComplete="family-name" value={formData.lastName} onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${fieldErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      placeholder={t.lastPlaceholder}
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
                      name="email" type="email" autoComplete="email" value={formData.email} onChange={onChange}
                      className={`w-full pl-10 px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      placeholder={t.emailPlaceholder}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.password} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${THEME.icon}`} />
                    <input
                      name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={onChange} autoComplete="new-password"
                      className={`w-full pl-10 pr-12 px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      placeholder={t.passwordHint}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowPassword((s) => !s)}>
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.password && (
                    <p className="text-xs mt-1 text-gray-600">
                      {formData.password.length < 6
                        ? (lang === 'en' ? 'Strength: Weak' : 'Force : Faible')
                        : formData.password.length < 10
                        ? (lang === 'en' ? 'Strength: Medium' : 'Force : Moyen')
                        : (lang === 'en' ? 'Strength: Strong' : 'Force : Solide')}
                    </p>
                  )}
                  {fieldErrors.password && <p className="text-sm text-red-600 mt-1">{fieldErrors.password}</p>}
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
                        name="phoneCountryCode" value={formData.phoneCountryCode} onChange={onChange}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                      >
                        {countryCodeOptions}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t.phone} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="phone" value={formData.phone} onChange={onChange} autoComplete="tel"
                        className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        placeholder={t.phonePlaceholder}
                      />
                      {fieldErrors.phone && <p className="text-sm text-red-600 mt-1">{fieldErrors.phone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
                      <select
                        name="whatsappCountryCode" value={formData.whatsappCountryCode} onChange={onChange}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-green-600"
                      >
                        {countryCodeOptions}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {t.whatsapp} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="whatsappNumber" value={formData.whatsappNumber} onChange={onChange}
                        className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.whatsappNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        placeholder={t.phonePlaceholder}
                      />
                      {fieldErrors.whatsappNumber && <p className="text-sm text-red-600 mt-1">{fieldErrors.whatsappNumber}</p>}
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 2: Geographic & Experience */}
              <section className="p-5 sm:p-6 border-t border-gray-50">
                <SectionHeader icon={<Globe className="w-5 h-5" />} title={t.step2} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.residenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="currentCountry" value={formData.currentCountry} onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.currentCountry ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="">{t.selectCountry}</option>
                      {countrySelectOptions}
                    </select>
                    {fieldErrors.currentCountry && <p className="text-sm text-red-600 mt-1">{fieldErrors.currentCountry}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.presenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="currentPresenceCountry" value={formData.currentPresenceCountry} onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.currentPresenceCountry ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="">{t.selectPresence}</option>
                      {countrySelectOptions}
                    </select>
                    {fieldErrors.currentPresenceCountry && <p className="text-sm text-red-600 mt-1">{fieldErrors.currentPresenceCountry}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.interventionCountry} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="interventionCountry" value={formData.interventionCountry} onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.interventionCountry ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="">{t.selectIntervention}</option>
                      {countrySelectOptions}
                    </select>
                    {fieldErrors.interventionCountry && <p className="text-sm text-red-600 mt-1">{fieldErrors.interventionCountry}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.yearsAsExpat} <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="yearsAsExpat" type="number" min={1} max={50} value={formData.yearsAsExpat || ''} onChange={onChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} ${fieldErrors.yearsAsExpat ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      placeholder="5"
                    />
                    {fieldErrors.yearsAsExpat && <p className="text-sm text-red-600 mt-1">{fieldErrors.yearsAsExpat}</p>}
                  </div>
                </div>

                {/* Languages */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.languages} <span className="text-red-500">*</span>
                  </label>
                  <Suspense fallback={<div className="h-10 rounded-lg bg-gray-100 animate-pulse" />}>
                    <MultiLanguageSelect
                      value={selectedLanguages}
                      onChange={(value) => {
                        setSelectedLanguages(value as LanguageOption[]);
                        if (fieldErrors.languages) setFieldErrors(({ languages, ...rest }) => rest);
                      }}
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
                    name="bio" rows={5} maxLength={500} value={formData.bio} onChange={onChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} min-h-[120px] ${fieldErrors.bio ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    placeholder={t.bioPlaceholder}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={formData.bio.length < 50 ? 'text-orange-600' : 'text-green-600'}>
                      {formData.bio.length < 50 ? t.charsToValidate(50 - formData.bio.length) : t.fieldValidated}
                    </span>
                    <span className={formData.bio.length > 450 ? 'text-orange-500' : 'text-gray-500'}>
                      {formData.bio.length}/500
                    </span>
                  </div>
                  {fieldErrors.bio && <p className="text-sm text-red-600 mt-1">{fieldErrors.bio}</p>}
                </div>

                {/* Photo */}
                <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <Camera className={`w-4 h-4 mr-2 ${THEME.icon}`} /> {t.profilePhoto} <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Suspense fallback={<div className="py-6"><div className="h-24 bg-gray-100 animate-pulse rounded-xl" /></div>}>
                    {/* NOTE: on passe des labels i18n: le composant peut les ignorer si non supportés, mais ça ne casse rien */}
                    <ImageUploader
                      onImageUploaded={(url: string) => {
                        setFormData((p) => ({ ...p, profilePhoto: url }));
                        if (fieldErrors.profilePhoto) setFieldErrors(({ profilePhoto, ...rest }) => rest);
                      }}
                      currentImage={formData.profilePhoto}
                      ctaLabel={t.clickHere}
                      noFileText={lang === 'en' ? 'No file selected' : 'Aucun fichier sélectionné'}
                    />
                  </Suspense>
                  {fieldErrors.profilePhoto && <p className="text-sm text-red-600 mt-2">{fieldErrors.profilePhoto}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {lang === 'en' ? 'Professional photo (JPG/PNG) required' : 'Photo professionnelle (JPG/PNG) obligatoire'}
                  </p>
                </div>
              </section>

              {/* Step 3: Help domains */}
              <section className="p-5 sm:p-6 border-t border-gray-50">
                <SectionHeader icon={<CheckCircle className="w-5 h-5" />} title={t.step3} />
                <div className={`rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.helpDomains} <span className="text-red-500">*</span>
                  </label>
                  <TagSelector items={formData.helpTypes} onRemove={removeHelp} />
                  <select
                    onChange={onHelpSelect} value=""
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-green-600"
                  >
                    <option value="">{t.addHelp}</option>
                    {helpTypeOptions}
                  </select>
                  {fieldErrors.helpTypes && <p className="text-sm text-red-600 mt-2">{fieldErrors.helpTypes}</p>}

                  {showCustomHelpType && (
                    <div className="flex gap-2 mt-3">
                      <input
                        value={formData.customHelpType}
                        onChange={(e) => setFormData((p) => ({ ...p, customHelpType: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                        placeholder={t.specifyHelp}
                      />
                      <button
                        type="button"
                        onClick={addCustomHelp}
                        disabled={!formData.customHelpType.trim()}
                        className="px-4 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-60"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Terms + Submit */}
              <section className={`p-5 sm:p-6 border-t border-gray-50 bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradTo}`}>
                <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData((p) => ({ ...p, acceptTerms: e.target.checked }))}
                      className="h-5 w-5 text-emerald-600 border-gray-300 rounded mt-0.5"
                      required
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-800">
                      {lang === 'en' ? 'I accept the' : "J’accepte les"}{' '}
                      <Link
                        to="/cgu-expatries"
                        className="text-emerald-700 underline font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t.cguLabel}
                      </Link>{' '}
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
                    className={`text-white font-black py-4 px-6 rounded-2xl text-base sm:text-lg w-full shadow-lg
                      ${canSubmit ? `bg-gradient-to-r ${THEME.button} hover:brightness-110` : 'bg-gray-400 cursor-not-allowed opacity-60'}`}
                    disabled={!canSubmit}
                  >
                    {isLoading || isSubmitting ? (
                      t.loading
                    ) : (
                      <span className="inline-flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 mr-2" /> {t.create}
                      </span>
                    )}
                  </Button>
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
              <Link to="/politique-confidentialite" className="hover:text-emerald-700 underline">
                {t.privacyLabel}
              </Link>
              <Link to="/cgu-expatries" className="hover:text-emerald-700 underline">
                {t.cguLabel}
              </Link>
              <Link to="/centre-aide" className="hover:text-emerald-700 underline">
                {t.helpLabel}
              </Link>
              <Link to="/contact" className="hover:text-emerald-700 underline">
                {t.contactLabel}
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </Layout>
  );
};

export default RegisterExpat;
