// =============================================================================
// FICHIER: src/pages/RegisterClient.tsx
// Version: sans check d’unicité email + libellés plus fun 😄
// Ajouts: import PhoneField + intégration après l’email (avec react-hook-form)
// =============================================================================

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  lazy,
  Suspense,
} from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  UserCheck,
  Clock3,
  Languages,
  ShieldCheck,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp, FieldValue } from 'firebase/firestore';
import type { MultiValue } from 'react-select';
import type { Provider } from '../types/provider';

// ✅ Ajouts pour PhoneField
import PhoneField from '@/components/PhoneField';
import { useForm } from 'react-hook-form';

// ==========================
// Lazy
// ==========================
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// ==========================
// Constantes / Regex
// ==========================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================
// Types
// ==========================
interface CreateUserData {
  role: 'client';
  firstName: string;
  email: string;
  languagesSpoken: string[];
  isApproved: boolean;
  createdAt: FieldValue;
}

interface FormData {
  firstName: string;
  email: string;
  password: string;
  languagesSpoken: string[];
  customLanguage: string;
}

interface FieldErrors {
  firstName?: string;
  email?: string;
  password?: string;
  languagesSpoken?: string;
  terms?: string;
  general?: string;
}

interface FieldValidation {
  firstName: boolean;
  email: boolean;
  password: boolean;
  languagesSpoken: boolean;
  terms: boolean;
}

type NavState = Readonly<{ selectedProvider?: Provider }>;

function isProviderLike(v: unknown): v is Provider {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    (o.type === 'lawyer' || o.type === 'expat')
  );
}

// ==========================
// i18n typé
// ==========================
type I18nShape = {
  meta: {
    title: string;
    description: string;
    keywords: string;
  };
  ui: {
    heroTitle: string;
    badge247: string;
    badgeMulti: string;
    title: string;
    subtitle: string;
    alreadyRegistered: string;
    login: string;
    personalInfo: string;
    acceptTerms: string;
    termsLink: string;
    createAccount: string;
    required: string;
    loading: string;
    progressHint: string;
    passwordStrength: string;
    progressLabel: string;
    loadingLanguages: string;
    ariaShowPassword: string;
    ariaHidePassword: string;
    footerBanner: string;
  };
  fields: {
    firstName: string;
    email: string;
    password: string;
    languagesSpoken: string;
  };
  actions: {
    addLanguage: string;
    remove: string;
    specifyLanguage: string;
    add: string;
  };
  help: {
    minPassword: string;
    emailPlaceholder: string;
    firstNamePlaceholder: string;
    firstNameHint: string;
    emailHint: string;
    passwordTip: string;
    dataSecure: string;
  };
  errors: {
    title: string;
    firstNameRequired: string;
    firstNameTooShort: string;
    emailRequired: string;
    emailInvalid: string;
    passwordRequired: string;
    passwordTooShort: string;
    languagesRequired: string;
    termsRequired: string;
    registrationError: string;
    emailAlreadyExists: string;
    networkError: string;
    tooManyRequests: string;
  };
  success: {
    fieldValid: string;
    emailValid: string;
    passwordValid: string;
    allFieldsValid: string;
  };
  termsHref: string;
  jsonLdName: string;
};

type LangKey = 'fr' | 'en';

const i18nConfig: Record<LangKey, I18nShape> = {
  fr: {
    meta: {
      title: 'Inscription Client - SOS Expats | Rejoignez la team 💙',
      description:
        "Créez votre compte client en 60 secondes chrono et accédez à notre réseau d'aidants ultra bienveillants. Support 24/7, multilingue.",
      keywords:
        'inscription client, expatriation, aide, expats, 24/7, multilingue, communauté',
    },
    ui: {
      heroTitle: "Inscription éclair ⚡️ (moins d’1 minute)",
      badge247: 'Disponible 24/7',
      badgeMulti: 'Multilingue',
      title: 'Inscription Client',
      subtitle: "Un petit compte et vous voilà connecté(e) à nos experts ✨",
      alreadyRegistered: 'Déjà parmi nous ?',
      login: 'Se connecter',
      personalInfo: 'Vos infos perso',
      acceptTerms: 'J’ai lu et j’accepte les',
      termsLink: 'conditions générales clients',
      createAccount: 'Je crée mon compte ✨',
      required: 'obligatoire',
      loading: 'On prépare votre espace magique… ✨',
      progressHint: 'Plus que quelques cases et c’est bon ! ⭐',
      passwordStrength: 'Solidité du mot de passe',
      progressLabel: 'Progression',
      loadingLanguages: 'On charge les langues…',
      ariaShowPassword: 'Afficher le mot de passe',
      ariaHidePassword: 'Masquer le mot de passe',
      footerBanner:
        "🌟 Bienvenue ! En vous inscrivant, vous rejoignez une communauté d’entraide ultra réactive — prêts à vous filer un coup de main !",
    },
    fields: {
      firstName: 'Votre prénom',
      email: 'Votre email',
      password: 'Votre mot de passe',
      languagesSpoken: 'Langues que vous parlez',
    },
    actions: {
      addLanguage: 'Ajouter une langue',
      remove: 'Supprimer',
      specifyLanguage: 'Quelle langue avez-vous en tête ?',
      add: 'Ajouter',
    },
    help: {
      minPassword: '6 caractères minimum (et c’est tout ✔️)',
      emailPlaceholder: 'votre@email.com',
      firstNamePlaceholder: 'On vous appelle comment ? 😊',
      firstNameHint: 'Un petit prénom sympa et on démarre ! ✨',
      emailHint:
        "On vous écrit seulement pour votre compte et les mises en relation. Promis, pas de spam 🤝",
      passwordTip:
        'Astuce : plus c’est long, mieux c’est — 6+ caractères suffisent ici 💪',
      dataSecure: 'Vos données sont chiffrées et bien au chaud',
    },
    errors: {
      title: 'Oups, quelques retouches :',
      firstNameRequired: 'On aimerait connaître votre prénom ! 😊',
      firstNameTooShort: '2 caractères minimum pour un prénom qui claque ✨',
      emailRequired: 'Votre email nous permet de vous contacter 📧',
      emailInvalid: 'Hmm… cet email semble étrange. Essayez nom@exemple.com 🤔',
      passwordRequired:
        'Un mot de passe est nécessaire pour sécuriser votre compte 🔐',
      passwordTooShort: '6 caractères minimum et c’est gagné 😉',
      languagesRequired:
        'Dites-nous quelles langues vous parlez, ça nous aide 🌍',
      termsRequired: 'Un p’tit clic sur les conditions pour finaliser ✅',
      registrationError:
        'Petit souci technique. On réessaie dans un instant 🔧',
      emailAlreadyExists:
        'Cette adresse est déjà utilisée. Essayez la connexion 🔄',
      networkError:
        'Problème de connexion. Vérifiez votre wifi et réessayons 📶',
      tooManyRequests:
        'Trop de tentatives. Une mini pause et on repart ⏰',
    },
    success: {
      fieldValid: 'Parfait ! ✨',
      emailValid: 'Email au top ! 👌',
      passwordValid: 'Mot de passe validé ! 🔒',
      allFieldsValid: 'Tout est bon ! Prêt(e) à décoller 🚀',
    },
    termsHref: '/cgu-clients',
    jsonLdName: 'Inscription Client',
  },
  en: {
    meta: {
      title: 'Client Sign-up - SOS Expats | Join the crew 💙',
      description:
        'Create your client account in under 60 seconds and tap into a super helpful network. 24/7, multilingual support.',
      keywords:
        'client registration, expat, help, 24/7, multilingual, community',
    },
    ui: {
      heroTitle: 'Speedy sign-up ⚡️ (under 1 minute)',
      badge247: 'Available 24/7',
      badgeMulti: 'Multilingual',
      title: 'Client Registration',
      subtitle: 'One quick account and you’re in with the experts ✨',
      alreadyRegistered: 'Already with us?',
      login: 'Log in',
      personalInfo: 'Your personal info',
      acceptTerms: 'I have read and accept the',
      termsLink: 'client terms & conditions',
      createAccount: 'Create my account ✨',
      required: 'required',
      loading: 'Setting things up for you… ✨',
      progressHint: 'Just a few bits left — you got this! ⭐',
      passwordStrength: 'Password strength',
      progressLabel: 'Progress',
      loadingLanguages: 'Fetching languages…',
      ariaShowPassword: 'Show password',
      ariaHidePassword: 'Hide password',
      footerBanner:
        '🌟 Welcome aboard! By signing up, you join a caring, quick-to-help community — ready when you are!',
    },
    fields: {
      firstName: 'Your first name',
      email: 'Your email',
      password: 'Your password',
      languagesSpoken: 'Languages you speak',
    },
    actions: {
      addLanguage: 'Add a language',
      remove: 'Remove',
      specifyLanguage: 'Which language did you have in mind?',
      add: 'Add',
    },
    help: {
      minPassword: '6 characters minimum (yep, that’s it ✔️)',
      emailPlaceholder: 'you@example.com',
      firstNamePlaceholder: "What should we call you? 😊",
      firstNameHint: 'Drop your friendly first name and we’re off ✨',
      emailHint:
        'We’ll only email you about your account & connections. No spam 🤝',
      passwordTip:
        'Pro tip: longer is stronger — 6+ chars is enough here 💪',
      dataSecure: 'Your data is encrypted and cozy',
    },
    errors: {
      title: 'Whoops, a few tweaks:',
      firstNameRequired: 'We’d love to know your first name! 😊',
      firstNameTooShort: 'At least 2 characters so your name can shine ✨',
      emailRequired: 'We need your email to reach you 📧',
      emailInvalid: 'Hmm… that email looks off. Try name@example.com 🤔',
      passwordRequired: 'A password is needed to secure your account 🔐',
      passwordTooShort: 'Minimum 6 characters and you’re good 😉',
      languagesRequired:
        'Tell us the languages you speak — super helpful 🌍',
      termsRequired: 'One quick click on the terms to finish ✅',
      registrationError:
        'Tiny technical hiccup. Please try again in a moment 🔧',
      emailAlreadyExists: 'This email is already in use. Try logging in 🔄',
      networkError: 'Connection issue. Check your wifi and we’ll retry 📶',
      tooManyRequests: 'Too many attempts. Take a short break and try again ⏰',
    },
    success: {
      fieldValid: 'Perfect! ✨',
      emailValid: 'Great email! 👌',
      passwordValid: 'Password looks good! 🔒',
      allFieldsValid: 'All set! Ready for take-off 🚀',
    },
    termsHref: '/terms-conditions-clients',
    jsonLdName: 'Client Registration',
  },
};

// ==========================
// Helpers locaux
// ==========================
const normalizeEmail = (s: string): string =>
  (s ?? '').trim().toLowerCase().replace(/\u00A0/g, '').replace(/[\u2000-\u200D]/g, '');

const isEmailFormatValid = (email: string): boolean => EMAIL_REGEX.test(email);

const calculatePasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  if (password.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  let label = '';
  let color = '';
  if (password.length >= 6) score += 30;
  if (password.length >= 8) score += 20;
  if (password.length >= 10) score += 15;
  if (password.length >= 12) score += 15;
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/[0-9]/.test(password)) score += 5;
  if (/[^a-zA-Z0-9]/.test(password)) score += 5;
  if (password.length < 6) {
    label = 'Trop court 😅';
    color = 'bg-red-500';
    score = Math.min(score, 25);
  } else if (score < 40) {
    label = 'Faible 🙂';
    color = 'bg-orange-500';
  } else if (score < 55) {
    label = 'Moyen 👍';
    color = 'bg-yellow-500';
  } else if (score < 70) {
    label = 'Bon 🔥';
    color = 'bg-blue-500';
  } else {
    label = 'Excellent 🚀';
    color = 'bg-green-500';
  }
  return { score: Math.min(100, score), label, color };
};

// ==========================
// UI petits composants
// ==========================
const CustomFieldInput = React.memo(
  ({
    placeholder,
    value,
    onChange,
    onAdd,
    disabled,
    addLabel,
  }: {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onAdd: () => void;
    disabled: boolean;
    addLabel: string;
  }) => (
    <div className="mt-3 flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-300"
        onKeyDown={(e) => e.key === 'Enter' && !disabled && onAdd()}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
      >
        {addLabel}
      </button>
    </div>
  )
);
CustomFieldInput.displayName = 'CustomFieldInput';

const FieldError = React.memo(({ error, show }: { error?: string; show: boolean }) => {
  if (!show || !error) return null;
  return (
    <div className="mt-1 flex items-center gap-1 text-sm text-red-600 bg-red-50 rounded-lg px-2 py-1">
      <XCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
});
FieldError.displayName = 'FieldError';

const FieldSuccess = React.memo(({ show, message }: { show: boolean; message: string }) => {
  if (!show) return null;
  return (
    <div className="mt-1 inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
      <CheckCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
});
FieldSuccess.displayName = 'FieldSuccess';

const PasswordStrengthBar = React.memo(
  ({ password, label }: { password: string; label: string }) => {
    const strength = useMemo(() => calculatePasswordStrength(password), [password]);
    if (password.length === 0) return null;
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>{label}</span>
          <span className="font-medium">{strength.label}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>
    );
  }
);
PasswordStrengthBar.displayName = 'PasswordStrengthBar';

// ==========================
// Composant principal
// ==========================
const RegisterClient: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  // ✅ control pour PhoneField (react-hook-form)
  const { control } = useForm<{ clientPhone: string; providerPhone: string }>({
    defaultValues: { clientPhone: '', providerPhone: '' },
  });

  // Conserver le provider si on arrive depuis "Réservez maintenant"
  useEffect(() => {
    const rawState: unknown = location.state;
    const state = (rawState ?? null) as NavState | null;
    const sp = state?.selectedProvider;
    if (isProviderLike(sp)) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(sp));
      } catch (err) {
        if (import.meta.env.DEV) console.debug('sessionStorage error:', err);
      }
    }
  }, [location.state]);

  const { register, isLoading, error } = useAuth();
  const { language } = useApp();

  // normalise langue -> 'fr' | 'en'
  const langKey: LangKey =
    typeof language === 'string' && language.toLowerCase().startsWith('en') ? 'en' : 'fr';
  const t = i18nConfig[langKey];

  // État initial
  const initialFormData: FormData = useMemo(
    () => ({
      firstName: '',
      email: '',
      password: '',
      languagesSpoken: [],
      customLanguage: '',
    }),
    []
  );

  // États
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedLanguages, setSelectedLanguages] =
    useState<MultiValue<{ value: string; label: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fieldValidation, setFieldValidation] = useState<FieldValidation>({
    firstName: false,
    email: false,
    password: false,
    languagesSpoken: false,
    terms: false,
  });
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ==========================
  // SEO / meta
  // ==========================
  useEffect(() => {
    document.title = t.meta.title;
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('name', 'description', t.meta.description);
    setMeta('name', 'keywords', t.meta.keywords);
    setMeta('property', 'og:title', t.meta.title);
    setMeta('property', 'og:description', t.meta.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', langKey === 'en' ? 'en_US' : 'fr_FR');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', t.meta.title);
    setMeta('name', 'twitter:description', t.meta.description);
    const id = 'jsonld-register-client';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t.jsonLdName,
      description: t.meta.description,
      inLanguage: langKey === 'en' ? 'en-US' : 'fr-FR',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      isPartOf: {
        '@type': 'WebSite',
        name: 'SOS Expats',
        url: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      mainEntity: { '@type': 'Person', name: 'Client' },
    } as const;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonld);
  }, [t, langKey]);

  // ==========================
  // UI helpers
  // ==========================
  const inputBase = useMemo(
    () =>
      'w-full px-4 py-3 rounded-xl border transition-all duration-200 text-sm focus:outline-none',
    []
  );

  const getInputClassName = useCallback(
    (fieldName: string, hasIcon: boolean = false) => {
      const isValid = fieldValidation[fieldName as keyof FieldValidation];
      const hasError = fieldErrors[fieldName as keyof FieldErrors] && touched[fieldName];
      let className = inputBase;
      if (hasIcon) className += ' pl-11';
      if (hasError) {
        className +=
          ' bg-red-50/50 border-red-300 focus:ring-4 focus:ring-red-500/20 focus:border-red-500';
      } else if (isValid && touched[fieldName]) {
        className +=
          ' bg-green-50/50 border-green-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500';
      } else {
        className +=
          ' bg-white/90 border-gray-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400';
      }
      return className;
    },
    [inputBase, fieldValidation, fieldErrors, touched]
  );

  const isValidEmail = useCallback((email: string): boolean => isEmailFormatValid(email), []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ==========================
  // Validation champs
  // ==========================
  const validateField = useCallback(
    (fieldName: string, value: string | string[] | boolean) => {
      const errors: FieldErrors = {};
      const validation: Partial<FieldValidation> = {};

      switch (fieldName) {
        case 'firstName':
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors.firstName = t.errors.firstNameRequired;
            validation.firstName = false;
          } else if (typeof value === 'string' && value.trim().length < 2) {
            errors.firstName = t.errors.firstNameTooShort;
            validation.firstName = false;
          } else {
            validation.firstName = true;
          }
          break;

        case 'email':
          if (!value || (typeof value === 'string' && !value.trim())) {
            errors.email = t.errors.emailRequired;
            validation.email = false;
          } else if (typeof value === 'string' && !isValidEmail(value)) {
            errors.email = t.errors.emailInvalid;
            validation.email = false;
          } else {
            validation.email = true; // ✅ pas d’unicité ici
          }
          break;

        case 'password':
          if (!value) {
            errors.password = t.errors.passwordRequired;
            validation.password = false;
          } else if (typeof value === 'string' && value.length < 6) {
            errors.password = t.errors.passwordTooShort;
            validation.password = false;
          } else {
            validation.password = true;
          }
          break;

        case 'languagesSpoken':
          if (!value || (Array.isArray(value) && value.length === 0)) {
            errors.languagesSpoken = t.errors.languagesRequired;
            validation.languagesSpoken = false;
          } else {
            validation.languagesSpoken = true;
          }
          break;

        case 'terms':
          if (!value) {
            errors.terms = t.errors.termsRequired;
            validation.terms = false;
          } else {
            validation.terms = true;
          }
          break;
      }

      return { errors, validation };
    },
    [t.errors, isValidEmail]
  );

  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      const { errors, validation } = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: errors[name as keyof FieldErrors] }));
      setFieldValidation((prev) => ({ ...prev, ...validation }));
    },
    [validateField]
  );

  // Langues
  const handleAddCustomLanguage = useCallback(() => {
    const customLang = formData.customLanguage.trim();
    if (customLang && !selectedLanguages.some((lang) => lang.value === customLang)) {
      const newLanguage = { value: customLang, label: customLang };
      setSelectedLanguages((prev) => [...prev, newLanguage]);
      setFormData((prev) => ({
        ...prev,
        customLanguage: '',
        languagesSpoken: [...prev.languagesSpoken, customLang],
      }));
      setShowCustomLanguage(false);

      const newLanguages = [...formData.languagesSpoken, customLang];
      const { errors, validation } = validateField('languagesSpoken', newLanguages);
      setFieldErrors((prev) => ({ ...prev, languagesSpoken: errors.languagesSpoken }));
      setFieldValidation((prev) => ({ ...prev, ...validation }));
    }
  }, [formData.customLanguage, formData.languagesSpoken, selectedLanguages, validateField]);

  const handleLanguagesChange = useCallback(
    (newValue: MultiValue<{ value: string; label: string }>) => {
      setSelectedLanguages(newValue);
      const languagesArray = newValue.map((lang) => lang.value);
      setFormData((prev) => ({
        ...prev,
        languagesSpoken: languagesArray,
      }));
      const { errors, validation } = validateField('languagesSpoken', languagesArray);
      setFieldErrors((prev) => ({ ...prev, languagesSpoken: errors.languagesSpoken }));
      setFieldValidation((prev) => ({ ...prev, ...validation }));
      setShowCustomLanguage(newValue.some((lang) => lang.value === 'other'));
    },
    [validateField]
  );

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      setTermsAccepted(isChecked);
      const { errors, validation } = validateField('terms', isChecked);
      setFieldErrors((prev) => ({ ...prev, terms: errors.terms }));
      setFieldValidation((prev) => ({ ...prev, ...validation }));
    },
    [validateField]
  );

  // Validation globale
  const validateAllFields = useCallback((): boolean => {
    const allErrors: FieldErrors = {};
    const allValidation: FieldValidation = {
      firstName: false,
      email: false,
      password: false,
      languagesSpoken: false,
      terms: false,
    };

    const fields = [
      { name: 'firstName', value: formData.firstName },
      { name: 'email', value: formData.email },
      { name: 'password', value: formData.password },
      { name: 'languagesSpoken', value: formData.languagesSpoken },
      { name: 'terms', value: termsAccepted },
    ];

    fields.forEach(({ name, value }) => {
      const { errors, validation } = validateField(name, value);
      Object.assign(allErrors, errors);
      Object.assign(allValidation, validation);
    });

    setFieldErrors(allErrors);
    setFieldValidation(allValidation);
    setTouched({
      firstName: true,
      email: true,
      password: true,
      languagesSpoken: true,
      terms: true,
    });

    return Object.keys(allErrors).length === 0;
  }, [formData, termsAccepted, validateField]);

  // Mapping erreurs Auth
  const getErrorMessage = useCallback(
    (errorCode: string, originalMessage?: string): string => {
      switch (errorCode) {
        case 'auth/email-already-in-use':
          return t.errors.emailAlreadyExists;
        case 'sos/email-linked-to-google':
          return 'Cet email est lié à un compte Google. Utilisez “Se connecter avec Google”.';
        case 'auth/network-request-failed':
          return t.errors.networkError;
        case 'auth/too-many-requests':
          return t.errors.tooManyRequests;
        case 'auth/weak-password':
        case 'auth/invalid-password':
          return t.errors.passwordTooShort;
        default:
          if (
            originalMessage &&
            (originalMessage.includes('majuscule') ||
              originalMessage.includes('minuscule') ||
              originalMessage.includes('chiffre'))
          ) {
            return t.errors.passwordTooShort;
          }
          return t.errors.registrationError;
      }
    },
    [t.errors]
  );

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateAllFields()) {
        scrollToTop();
        return;
      }

      try {
        const userData: CreateUserData = {
          role: 'client',
          firstName: formData.firstName.trim(),
          email: normalizeEmail(formData.email),
          languagesSpoken: formData.languagesSpoken,
          isApproved: true,
          createdAt: serverTimestamp(),
        };

        await register(userData as unknown as Parameters<typeof register>[0], formData.password);
        navigate(redirect, { replace: true });
      } catch (err) {
        if (import.meta.env.DEV) console.error('register client error:', err);
        const errorObj = err as { code?: string; message?: string };
        const errorMessage = getErrorMessage(errorObj?.code || 'unknown', errorObj?.message);
        setFieldErrors((prev) => ({ ...prev, general: errorMessage }));
        scrollToTop();
      }
    },
    [formData, validateAllFields, register, navigate, redirect, getErrorMessage, scrollToTop]
  );

  // Peut-on soumettre ?
  const canSubmit = useMemo(() => {
    const formReady =
      fieldValidation.firstName &&
      fieldValidation.email &&
      fieldValidation.password &&
      fieldValidation.languagesSpoken &&
      fieldValidation.terms &&
      !isLoading;
    return formReady;
  }, [fieldValidation, isLoading]);

  const errorCount = useMemo(
    () => Object.values(fieldErrors).filter(Boolean).length,
    [fieldErrors]
  );

  // ==========================
  // Render
  // ==========================
  return (
    <Layout>
      <div className="relative min-h-screen bg-gray-950 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900/80 to-gray-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-sky-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <header className="relative z-10 pt-6 sm:pt-8">
          <div className="mx-auto w-full max-w-2xl px-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg mb-3 border border-white/20">
                <UserCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {t.ui.heroTitle}
              </h1>

              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur">
                  <Clock3 className="h-4 w-4 text-white" />
                  {t.ui.badge247}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur">
                  <Languages className="h-4 w-4 text-white" />
                  {t.ui.badgeMulti}
                </span>
              </div>

              <div className="mx-auto mt-5 h-1 w-40 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-90" />
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:pt-8">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-2xl backdrop-blur-sm">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t.ui.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{t.ui.subtitle}</p>
              <p className="mt-2 text-xs text-gray-500">
                {t.ui.alreadyRegistered}{' '}
                <Link
                  to={`/login?redirect=${encodeURIComponent(redirect)}`}
                  className="font-semibold text-blue-600 underline decoration-2 underline-offset-2 hover:text-blue-700"
                >
                  {t.ui.login}
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 px-5 py-6 sm:px-8 sm:py-8" noValidate>
              {(error || fieldErrors.general || errorCount > 0) && (
                <div
                  className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-semibold text-red-800">{t.errors.title}</h3>
                      {(error || fieldErrors.general) && (
                        <p className="mt-1 text-sm text-red-700">{error || fieldErrors.general}</p>
                      )}
                      {errorCount > 0 && !error && !fieldErrors.general && (
                        <div className="mt-2 text-sm text-red-700">
                          <ul className="list-none space-y-1">
                            {fieldErrors.firstName && <li>• {fieldErrors.firstName}</li>}
                            {fieldErrors.email && <li>• {fieldErrors.email}</li>}
                            {fieldErrors.password && <li>• {fieldErrors.password}</li>}
                            {fieldErrors.languagesSpoken && <li>• {fieldErrors.languagesSpoken}</li>}
                            {fieldErrors.terms && <li>• {fieldErrors.terms}</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!error && !fieldErrors.general && (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 flex items-center gap-1">
                      🎯 {t.ui.progressLabel}
                    </span>
                    <span className="text-sm text-blue-700 font-bold">
                      {Object.values(fieldValidation).filter(Boolean).length}/5
                    </span>
                  </div>
                  <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                      style={{
                        width: `${
                          (Object.values(fieldValidation).filter(Boolean).length / 5) * 100
                        }%`,
                      }}
                    />
                  </div>
                  {canSubmit && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>{t.success.allFieldsValid}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Infos perso */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  {t.ui.personalInfo}
                </h3>

                <div className="space-y-6">
                  {/* Prénom */}
                  <div>
                    <label htmlFor="firstName" className="mb-1 block text-sm font-semibold text-gray-800">
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
                      onBlur={() => handleFieldBlur('firstName')}
                      placeholder={t.help.firstNamePlaceholder}
                      className={getInputClassName('firstName')}
                      aria-describedby="firstName-hint firstName-error firstName-success"
                    />
                    <p id="firstName-hint" className="mt-1 text-xs text-gray-500">
                      {t.help.firstNameHint}
                    </p>
                    <FieldError error={fieldErrors.firstName} show={!!(fieldErrors.firstName && touched.firstName)} />
                    <FieldSuccess
                      show={fieldValidation.firstName && touched.firstName && !fieldErrors.firstName}
                      message={t.success.fieldValid}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-800">
                      {t.fields.email} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-blue-500" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur('email')}
                        placeholder={t.help.emailPlaceholder}
                        className={getInputClassName('email', true)}
                        aria-describedby="email-hint email-error email-success"
                      />
                    </div>
                    <p id="email-hint" className="mt-1 text-xs text-gray-500">
                      {t.help.emailHint}
                    </p>
                    <FieldError error={fieldErrors.email} show={!!(fieldErrors.email && touched.email)} />
                    <FieldSuccess
                      show={fieldValidation.email && touched.email && !fieldErrors.email}
                      message={t.success.emailValid}
                    />
                  </div>

                  {/* ✅ Téléphones */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PhoneField
                      name="clientPhone"
                      control={control}
                      label="Téléphone"
                      required
                      defaultCountry="FR"
                    />
                    <PhoneField
                      name="providerPhone"
                      control={control}
                      label="Téléphone prestataire"
                      required
                      defaultCountry="FR"
                    />
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-semibold text-gray-800">
                      {t.fields.password} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-blue-500" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur('password')}
                        placeholder={t.help.minPassword}
                        className={`${getInputClassName('password', true)} pr-11`}
                        aria-describedby="password-hint password-error password-success password-strength"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95 transition-all"
                        aria-label={showPassword ? t.ui.ariaHidePassword : t.ui.ariaShowPassword}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={formData.password} label={t.ui.passwordStrength} />
                    <p id="password-hint" className="mt-1 text-xs text-gray-500">
                      {t.help.passwordTip}
                    </p>
                    <FieldError error={fieldErrors.password} show={!!(fieldErrors.password && touched.password)} />
                    <FieldSuccess
                      show={fieldValidation.password && touched.password && !fieldErrors.password}
                      message={t.success.passwordValid}
                    />
                  </div>

                  {/* Langues parlées */}
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-800">
                      {t.fields.languagesSpoken} <span className="text-red-500">*</span>
                    </label>

                    <Suspense
                      fallback={
                        <div className="h-11 animate-pulse rounded-xl border border-gray-200 bg-gray-100 flex items-center px-3">
                          <div className="text-gray-500 text-sm">{t.ui.loadingLanguages}</div>
                        </div>
                      }
                    >
                      <div className={`${getInputClassName('languagesSpoken')} p-0`}>
                        <MultiLanguageSelect
                          value={selectedLanguages}
                          onChange={handleLanguagesChange}
                          locale={langKey}
                          placeholder={
                            langKey === 'fr'
                              ? 'Rechercher et sélectionner les langues…'
                              : 'Search and select languages…'
                          }
                        />
                      </div>
                    </Suspense>

                    {selectedLanguages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(selectedLanguages as { value: string; label: string }[]).map((l) => (
                          <span
                            key={l.value}
                            className="px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-800 border border-blue-200"
                          >
                            {l.label.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}

                    {showCustomLanguage && (
                      <CustomFieldInput
                        placeholder={t.actions.specifyLanguage}
                        value={formData.customLanguage}
                        onChange={(value) => setFormData((prev) => ({ ...prev, customLanguage: value }))}
                        onAdd={handleAddCustomLanguage}
                        disabled={!formData.customLanguage.trim()}
                        addLabel={t.actions.add}
                      />
                    )}

                    <FieldError
                      error={fieldErrors.languagesSpoken}
                      show={!!(fieldErrors.languagesSpoken && touched.languagesSpoken)}
                    />
                    <FieldSuccess
                      show={fieldValidation.languagesSpoken && touched.languagesSpoken && !fieldErrors.languagesSpoken}
                      message={t.success.fieldValid}
                    />

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-700 bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span>🔒 SSL • {t.help.dataSecure}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* CGU */}
              <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <input
                    id="acceptClientTerms"
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={handleTermsChange}
                    onBlur={() => handleFieldBlur('terms')}
                    className={`h-5 w-5 border-gray-300 rounded mt-0.5 transition-colors ${
                      fieldErrors.terms && touched.terms ? 'border-red-500 text-red-600' : 'text-blue-600'
                    }`}
                  />
                  <div className="flex-1">
                    <label htmlFor="acceptClientTerms" className="text-sm text-gray-800">
                      {t.ui.acceptTerms}{' '}
                      <Link
                        to={t.termsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-700 underline decoration-2 underline-offset-2 hover:text-blue-800 transition-colors"
                      >
                        {t.ui.termsLink}
                      </Link>{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <FieldError error={fieldErrors.terms} show={!!(fieldErrors.terms && touched.terms)} />
                    <FieldSuccess
                      show={fieldValidation.terms && touched.terms && !fieldErrors.terms}
                      message={t.success.fieldValid}
                    />
                  </div>
                </div>
              </div>

              {/* Bouton */}
              <div>
                <Button
                  type="submit"
                  loading={isLoading}
                  fullWidth
                  size="large"
                  disabled={!canSubmit}
                  className={`min-h-[52px] rounded-xl font-bold text-white shadow-lg transition-all duration-300 active:scale-[0.98] transform ${
                    canSubmit
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 shadow-blue-500/30 hover:brightness-110 hover:shadow-blue-600/40 hover:scale-[1.02]'
                      : 'bg-gray-400 cursor-not-allowed shadow-gray-400/20'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      {t.ui.loading}
                    </span>
                  ) : (
                    t.ui.createAccount
                  )}
                </Button>

                {!canSubmit && !isLoading && (
                  <div className="mt-4 space-y-3">
                    <p className="text-center text-xs text-gray-500 font-medium">{t.ui.progressHint}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.firstName ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.firstName ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 border border-gray-300 rounded-full" />}
                        <span>{t.fields.firstName}</span>
                      </div>
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.email ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.email ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 border border-gray-300 rounded-full" />}
                        <span>{t.fields.email}</span>
                      </div>
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.password ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.password ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 border border-gray-300 rounded-full" />}
                        <span>{t.fields.password}</span>
                      </div>
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.languagesSpoken ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.languagesSpoken ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 border border-gray-300 rounded-full" />}
                        <span>{t.fields.languagesSpoken}</span>
                      </div>
                      <div className={`flex items-center gap-1 col-span-2 transition-colors ${fieldValidation.terms ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.terms ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 border border-gray-300 rounded-full" />}
                        <span>{t.ui.termsLink}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="mt-8">
            <div className="relative mx-auto max-w-xl">
              <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 opacity-60 blur-sm" />
              <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md border border-white/15 shadow-lg hover:shadow-blue-500/20 transition-shadow">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white text-sm shadow">
                  ✨
                </div>
                <p className="text-[13px] sm:text-sm text-white/95">{t.ui.footerBanner}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default React.memo(RegisterClient);
