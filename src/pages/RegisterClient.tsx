import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserCheck, Clock3, Languages, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp, FieldValue } from 'firebase/firestore';
import type { MultiValue } from 'react-select';
import type { Provider } from '../types/provider'; // <= IMPORTANT: minuscule

// Lazy loading des composants lourds pour améliorer le temps de chargement initial
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// Regex pré-compilées pour améliorer les performances
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Interface pour la création d'utilisateur
interface CreateUserData {
  role: 'client';
  firstName: string;
  email: string;
  languagesSpoken: string[];
  isApproved: boolean;
  createdAt: FieldValue;
}

// Interface pour le formulaire optimisée
interface FormData {
  firstName: string;
  email: string;
  password: string;
  languagesSpoken: string[];
  customLanguage: string;
}

// Interface pour les erreurs de champs
interface FieldErrors {
  firstName?: string;
  email?: string;
  password?: string;
  languagesSpoken?: string;
  terms?: string;
  general?: string;
}

// Interface pour l'état des champs
interface FieldValidation {
  firstName: boolean;
  email: boolean;
  password: boolean;
  languagesSpoken: boolean;
  terms: boolean;
}

// Fonction pour calculer la force du mot de passe (réaliste mais sans contraintes)
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (password.length === 0) return { score: 0, label: '', color: '' };
  
  let score = 0;
  let label = '';
  let color = '';
  
  // Base sur la longueur (réaliste)
  if (password.length >= 6) score += 30;
  if (password.length >= 8) score += 20;
  if (password.length >= 10) score += 15;
  if (password.length >= 12) score += 15;
  
  // Bonus pour la diversité (optionnel, pas requis)
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/[0-9]/.test(password)) score += 5;
  if (/[^a-zA-Z0-9]/.test(password)) score += 5;
  
  // Labels réalistes
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

// --- Types sûrs (pas de any) — en dehors du composant pour éviter toute erreur de parsing ---
type NavState = Readonly<{ selectedProvider?: Provider }>;

function isProviderLike(v: unknown): v is Provider {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.name === 'string'
    && (o.type === 'lawyer' || o.type === 'expat');
}

// Configuration i18n avec messages fun pour les clients
const i18nConfig = {
  fr: {
    // Métadonnées SEO
    meta: {
      title: "Inscription Client - SOS Expats | Accédez à l'aide de la communauté",
      description: "Créez votre compte client en moins d'une minute et accédez à notre réseau d'aidants. Support 24/7, multilingue.",
      keywords: 'inscription client, expatriation, aide, expats, 24/7, multilingue'
    },
    // Interface utilisateur
    ui: {
      heroTitle: 'Votre inscription, en moins de 1 minute',
      badge247: 'Disponible 24/7',
      badgeMulti: 'Multilingue',
      title: 'Inscription Client',
      subtitle: 'Créez votre compte pour accéder à notre réseau d\'experts',
      alreadyRegistered: 'Déjà inscrit ?',
      login: 'Se connecter',
      personalInfo: 'Vos infos perso',
      acceptTerms: 'J\'accepte les',
      termsLink: 'conditions générales pour clients',
      createAccount: 'C\'est parti ! 🚀',
      required: 'obligatoire',
      loading: 'Création magique en cours...',
      progressHint: 'Encore quelques petites choses à remplir ! ⭐',
      passwordStrength: 'Force de votre mot de passe',
      progressLabel: 'Progression',
      loadingLanguages: 'Chargement des langues...',
      ariaShowPassword: 'Afficher le mot de passe',
      ariaHidePassword: 'Masquer le mot de passe',
      footerBanner: "🌟 En vous inscrivant, vous rejoignez notre super communauté et accédez instantanément à de l'aide qualifiée !"
    },
    // Champs du formulaire
    fields: {
      firstName: 'Votre prénom',
      email: 'Votre email',
      password: 'Votre mot de passe',
      languagesSpoken: 'Langues que vous parlez'
    },
    // Actions
    actions: {
      addLanguage: 'Ajouter une langue',
      remove: 'Supprimer',
      specifyLanguage: 'Dites-nous quelle langue !',
      add: 'Ajouter'
    },
    // Textes d'aide
    help: {
      minPassword: '6 caractères minimum (aucune autre contrainte !)',
      emailPlaceholder: 'votre@email.com',
      firstNamePlaceholder: 'Comment vous appelez-vous ? 😊',
      firstNameHint: 'Comment on vous appelle ? Un petit prénom sympa et on est partis ✨',
      emailHint: 'On vous écrit uniquement pour votre compte et les mises en relation. Pas de spam 🤝',
      passwordTip: 'Astuce : plus c’est long, mieux c’est — 6+ caractères suffisent ici 💪',
      dataSecure: 'Vos données sont chiffrées et sécurisées'
    },
    // Messages d'erreur fun et encourageants
    errors: {
      title: 'Petites corrections à faire :',
      firstNameRequired: 'On aimerait connaître votre prénom ! 😊',
      firstNameTooShort: 'Votre prénom mérite plus de 2 caractères pour briller ! ✨',
      emailRequired: 'Il nous faut votre email pour vous contacter ! 📧',
      emailInvalid: 'Cette adresse email a l\'air bizarre... Essayez quelque chose comme nom@exemple.com 🤔',
      passwordRequired: 'Il faut un petit mot de passe pour sécuriser votre compte ! 🔐',
      passwordTooShort: 'Juste 6 caractères minimum, c\'est tout ce qu\'on demande ! 😉',
      languagesRequired: 'Dites-nous quelles langues vous parlez, ça nous aide ! 🌍',
      termsRequired: 'Un petit clic sur les conditions pour finaliser ! ✅',
      registrationError: 'Oups ! Un petit souci technique. Réessayez dans un instant ! 🔧',
      emailAlreadyExists: 'Cette adresse est déjà prise ! Vous pouvez vous connecter à la place ? 🔄',
      networkError: 'Problème de connexion ! Vérifiez votre wifi et on réessaie ? 📶',
      tooManyRequests: 'Trop de tentatives ! Prenez une pause et réessayez dans quelques minutes ! ⏰'
    },
    // Messages de succès fun
    success: {
      fieldValid: 'Parfait ! ✨',
      emailValid: 'Super email ! 👌',
      passwordValid: 'Mot de passe au top ! 🔒',
      allFieldsValid: 'Tout est parfait ! Vous êtes prêt(e) ! 🎉'
    },
    termsHref: '/cgu-clients',
    jsonLdName: 'Inscription Client'
  },
  en: {
    meta: {
      title: 'Client Registration - SOS Expats | Get help from the community',
      description: 'Create your client account in under 1 minute and access our helper network. 24/7, multilingual support.',
      keywords: 'client registration, expat, help, 24/7, multilingual'
    },
    ui: {
      heroTitle: 'Register in under 1 minute',
      badge247: 'Available 24/7',
      badgeMulti: 'Multilingual',
      title: 'Client Registration',
      subtitle: 'Create your account to access our network of experts',
      alreadyRegistered: 'Already registered?',
      login: 'Log in',
      personalInfo: 'Your personal info',
      acceptTerms: 'I accept the',
      termsLink: 'general terms for clients',
      createAccount: 'Let\'s go! 🚀',
      required: 'required',
      loading: 'Creating magic...',
      progressHint: 'Just a few more things to fill! ⭐',
      passwordStrength: 'Your password strength',
      progressLabel: 'Progress',
      loadingLanguages: 'Loading languages...',
      ariaShowPassword: 'Show password',
      ariaHidePassword: 'Hide password',
      footerBanner: '🌟 By registering, you join our amazing community and get instant access to qualified help!'
    },
    fields: {
      firstName: 'Your first name',
      email: 'Your email',
      password: 'Your password',
      languagesSpoken: 'Languages you speak'
    },
    actions: {
      addLanguage: 'Add a language',
      remove: 'Remove',
      specifyLanguage: 'Tell us which language!',
      add: 'Add'
    },
    help: {
      minPassword: '6 characters minimum (no other requirements!)',
      emailPlaceholder: 'you@example.com',
      firstNamePlaceholder: "What's your name? 😊",
      firstNameHint: 'How should we call you? A friendly first name is perfect ✨',
      emailHint: 'We email you only for your account & connections. No spam 🤝',
      passwordTip: 'Tip: longer is stronger — but 6+ chars is enough here 💪',
      dataSecure: 'Your data is encrypted & secure'
    },
    errors: {
      title: 'Small fixes needed:',
      firstNameRequired: 'We\'d love to know your first name! 😊',
      firstNameTooShort: 'Your name deserves more than 2 characters to shine! ✨',
      emailRequired: 'We need your email to contact you! 📧',
      emailInvalid: 'This email looks weird... Try something like name@example.com 🤔',
      passwordRequired: 'You need a little password to secure your account! 🔐',
      passwordTooShort: 'Just 6 characters minimum, that\'s all we ask! 😉',
      languagesRequired: 'Tell us what languages you speak, it helps us! 🌍',
      termsRequired: 'A quick click on the terms to finalize! ✅',
      registrationError: 'Oops! A little technical hiccup. Try again in a moment! 🔧',
      emailAlreadyExists: 'This address is already taken! Can you log in instead? 🔄',
      networkError: 'Connection problem! Check your wifi and let\'s try again? 📶',
      tooManyRequests: 'Too many attempts! Take a breather and try again in a few minutes! ⏰'
    },
    success: {
      fieldValid: 'Perfect! ✨',
      emailValid: 'Great email! 👌',
      passwordValid: 'Password on point! 🔒',
      allFieldsValid: 'Everything is perfect! You\'re ready! 🎉'
    },
    termsHref: '/terms-conditions-clients',
    jsonLdName: 'Client Registration'
  }
} as const;

// Composant CustomFieldInput optimisé pour les champs personnalisés
const CustomFieldInput = React.memo(({
  placeholder,
  value,
  onChange,
  onAdd,
  disabled,
  addLabel
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
      onKeyPress={(e) => e.key === 'Enter' && !disabled && onAdd()}
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
));

CustomFieldInput.displayName = 'CustomFieldInput';

// Composant pour afficher les erreurs de champ individuel (style fun)
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

// Composant pour afficher la validation positive (style fun)
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

// Composant pour la barre de force du mot de passe (fun et sans contraintes)
const PasswordStrengthBar = React.memo(({ password, label }: { password: string; label: string }) => {
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
});

PasswordStrengthBar.displayName = 'PasswordStrengthBar';

// Composant principal
const RegisterClient: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  // Conserver le provider si on arrive depuis "Réservez maintenant"
  useEffect(() => {
    const rawState: unknown = location.state;
    const state = (rawState ?? null) as NavState | null;
    const sp = state?.selectedProvider;

    if (isProviderLike(sp)) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(sp));
      } catch {
        /* no-op: sessionStorage indisponible (mode privé / quota) */
        void 0;
      }
    }
  }, [location.state]);

  const { register, isLoading, error } = useAuth();
  const { language } = useApp();

  // Sélection i18n robuste (par défaut FR si code inconnu comme 'fr-FR')
  const t = i18nConfig[(language as keyof typeof i18nConfig)] ?? i18nConfig.fr;

  // État initial du formulaire optimisé
  const initialFormData: FormData = useMemo(() => ({
    firstName: '',
    email: '',
    password: '',
    languagesSpoken: [],
    customLanguage: ''
  }), []);

  // États du composant
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<{ value: string; label: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fieldValidation, setFieldValidation] = useState<FieldValidation>({
    firstName: false,
    email: false,
    password: false,
    languagesSpoken: false,
    terms: false
  });
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // SEO - Mise à jour des métadonnées complète
  useEffect(() => {
    document.title = t.meta.title;

    // Fonction utilitaire pour mettre à jour les métadonnées
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    // Métadonnées de base
    setMeta('name', 'description', t.meta.description);
    setMeta('name', 'keywords', t.meta.keywords);

    // Open Graph
    setMeta('property', 'og:title', t.meta.title);
    setMeta('property', 'og:description', t.meta.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', (language === 'en' || language === 'en-US') ? 'en_US' : 'fr_FR');

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', t.meta.title);
    setMeta('name', 'twitter:description', t.meta.description);

    // JSON-LD pour le SEO et l'IA
    const id = 'jsonld-register-client';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t.jsonLdName,
      description: t.meta.description,
      inLanguage: (language === 'en' || language === 'en-US') ? 'en-US' : 'fr-FR',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      isPartOf: {
        '@type': 'WebSite',
        name: 'SOS Expats',
        url: typeof window !== 'undefined' ? window.location.origin : undefined
      },
      mainEntity: { '@type': 'Person', name: 'Client' }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonld);
  }, [t, language]);

  // Classes CSS optimisées et mémorisées
  const inputBase = useMemo(
    () => 'w-full px-4 py-3 rounded-xl border transition-all duration-200 text-sm focus:outline-none',
    []
  );

  const getInputClassName = useCallback((fieldName: string, hasIcon: boolean = false) => {
    const isValid = fieldValidation[fieldName as keyof FieldValidation];
    const hasError = fieldErrors[fieldName as keyof FieldErrors] && touched[fieldName];
    
    let className = inputBase;
    
    if (hasIcon) {
      className += ' pl-11';
    }
    
    if (hasError) {
      className += ' bg-red-50/50 border-red-300 focus:ring-4 focus:ring-red-500/20 focus:border-red-500';
    } else if (isValid && touched[fieldName]) {
      className += ' bg-green-50/50 border-green-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500';
    } else {
      className += ' bg-white/90 border-gray-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400';
    }
    
    return className;
  }, [inputBase, fieldValidation, fieldErrors, touched]);

  // Validation email optimisée avec regex pré-compilée
  const isValidEmail = useCallback((email: string): boolean => {
    return EMAIL_REGEX.test(email);
  }, []);

  // Fonction pour faire défiler vers le haut (amélioration UX)
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Validation en temps réel des champs
  const validateField = useCallback((fieldName: string, value: string | string[] | boolean) => {
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
          validation.email = true;
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
  }, [t.errors, isValidEmail]);

  // Gestionnaire pour marquer un champ comme "touché"
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Gestionnaire générique pour les changements d'input - optimisé
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validation en temps réel
    const { errors, validation } = validateField(name, value);
    
    setFieldErrors(prev => ({ ...prev, [name]: errors[name as keyof FieldErrors] }));
    setFieldValidation(prev => ({ ...prev, ...validation }));
  }, [validateField]);

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
      
      // Validation des langues
      const newLanguages = [...formData.languagesSpoken, customLang];
      const { errors, validation } = validateField('languagesSpoken', newLanguages);
      setFieldErrors(prev => ({ ...prev, languagesSpoken: errors.languagesSpoken }));
      setFieldValidation(prev => ({ ...prev, ...validation }));
    }
  }, [formData.customLanguage, formData.languagesSpoken, selectedLanguages, validateField]);

  // Gestion du changement des langues sélectionnées
  const handleLanguagesChange = useCallback((newValue: MultiValue<{ value: string; label: string }>) => {
    setSelectedLanguages(newValue);
    const languagesArray = newValue.map(lang => lang.value);
    setFormData(prev => ({
      ...prev,
      languagesSpoken: languagesArray
    }));

    // Validation des langues
    const { errors, validation } = validateField('languagesSpoken', languagesArray);
    setFieldErrors(prev => ({ ...prev, languagesSpoken: errors.languagesSpoken }));
    setFieldValidation(prev => ({ ...prev, ...validation }));

    // Vérifier si "Autre" est sélectionné
    setShowCustomLanguage(newValue.some(lang => lang.value === 'other'));
  }, [validateField]);

  // Gestion des conditions générales
  const handleTermsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setTermsAccepted(isChecked);
    
    const { errors, validation } = validateField('terms', isChecked);
    setFieldErrors(prev => ({ ...prev, terms: errors.terms }));
    setFieldValidation(prev => ({ ...prev, ...validation }));
  }, [validateField]);

  // Validation complète du formulaire
  const validateAllFields = useCallback((): boolean => {
    const allErrors: FieldErrors = {};
    const allValidation: FieldValidation = {
      firstName: false,
      email: false,
      password: false,
      languagesSpoken: false,
      terms: false
    };

    // Valider tous les champs
    const fields = [
      { name: 'firstName', value: formData.firstName },
      { name: 'email', value: formData.email },
      { name: 'password', value: formData.password },
      { name: 'languagesSpoken', value: formData.languagesSpoken },
      { name: 'terms', value: termsAccepted }
    ];

    fields.forEach(({ name, value }) => {
      const { errors, validation } = validateField(name, value);
      Object.assign(allErrors, errors);
      Object.assign(allValidation, validation);
    });

    setFieldErrors(allErrors);
    setFieldValidation(allValidation);
    
    // Marquer tous les champs comme touchés
    setTouched({
      firstName: true,
      email: true,
      password: true,
      languagesSpoken: true,
      terms: true
    });

    return Object.keys(allErrors).length === 0;
  }, [formData, termsAccepted, validateField]);

  // Traitement des erreurs spécifiques de Firebase/Auth
  const getErrorMessage = useCallback((errorCode: string, originalMessage?: string): string => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return t.errors.emailAlreadyExists;
      case 'auth/network-request-failed':
        return t.errors.networkError;
      case 'auth/too-many-requests':
        return t.errors.tooManyRequests;
      case 'auth/weak-password':
        // Remplacer le message Firebase par le nôtre (pas de contraintes)
        return t.errors.passwordTooShort;
      case 'auth/invalid-password':
        // Aussi pour ce cas
        return t.errors.passwordTooShort;
      default:
        // Si le message original contient des contraintes, on utilise le nôtre
        if (originalMessage && (originalMessage.includes('majuscule') || originalMessage.includes('minuscule') || originalMessage.includes('chiffre'))) {
          return t.errors.passwordTooShort;
        }
        return t.errors.registrationError;
    }
  }, [t.errors]);

  // Soumission du formulaire - optimisée
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      scrollToTop();
      return;
    }

    try {
      const userData: CreateUserData = {
        role: 'client' as const,
        firstName: formData.firstName.trim(),
        email: formData.email.trim().toLowerCase(),
        languagesSpoken: formData.languagesSpoken,
        isApproved: true,
        createdAt: serverTimestamp()
      };

      console.log('📝 Données envoyées pour l\'inscription client:', userData);

      await register(userData as unknown as Parameters<typeof register>[0], formData.password);
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      console.error('❌ Erreur lors de l\'inscription client:', err);
      
      const error = err as { code?: string; message?: string };
      const errorMessage = getErrorMessage(error?.code || 'unknown', error?.message);
      setFieldErrors(prev => ({ ...prev, general: errorMessage }));
      scrollToTop();
    }
  }, [formData, validateAllFields, register, navigate, redirect, getErrorMessage, scrollToTop]);

  // Vérification si le formulaire peut être soumis
  const canSubmit = useMemo(() => {
    return fieldValidation.firstName &&
      fieldValidation.email &&
      fieldValidation.password &&
      fieldValidation.languagesSpoken &&
      fieldValidation.terms &&
      !isLoading;
  }, [fieldValidation, isLoading]);

  // Compter les erreurs pour affichage
  const errorCount = useMemo(() => {
    return Object.values(fieldErrors).filter(Boolean).length;
  }, [fieldErrors]);

  return (
    <Layout>
      {/* Fond sombre à la Home + halos dégradés */}
      <div className="relative min-h-screen bg-gray-950 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900/80 to-gray-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-sky-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* En-tête */}
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

        {/* Contenu principal */}
        <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:pt-8">
          {/* Panneau formulaire */}
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
              {/* Messages d'erreur globaux */}
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

              {/* Indicateur de progression (bleu) */}
              {!error && !fieldErrors.general && (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 flex items-center gap-1">🎯 {t.ui.progressLabel}</span>
                    <span className="text-sm text-blue-700 font-bold">
                      {Object.values(fieldValidation).filter(Boolean).length}/5
                    </span>
                  </div>
                  <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                      style={{ width: `${(Object.values(fieldValidation).filter(Boolean).length / 5) * 100}%` }}
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

              {/* Section: Informations personnelles */}
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
                    <FieldError 
                      error={fieldErrors.firstName} 
                      show={!!(fieldErrors.firstName && touched.firstName)} 
                    />
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
                    <FieldError 
                      error={fieldErrors.email} 
                      show={!!(fieldErrors.email && touched.email)} 
                    />
                    <FieldSuccess 
                      show={fieldValidation.email && touched.email && !fieldErrors.email}
                      message={t.success.emailValid}
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
                    <PasswordStrengthBar 
                      password={formData.password} 
                      label={t.ui.passwordStrength}
                    />
                    <p id="password-hint" className="mt-1 text-xs text-gray-500">
                      {t.help.passwordTip}
                    </p>
                    <FieldError 
                      error={fieldErrors.password} 
                      show={!!(fieldErrors.password && touched.password)} 
                    />
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

                    <Suspense fallback={
                      <div className="h-11 animate-pulse rounded-xl border border-gray-200 bg-gray-100 flex items-center px-3">
                        <div className="text-gray-500 text-sm">{t.ui.loadingLanguages}</div>
                      </div>
                    }>
                      <div className={`${getInputClassName('languagesSpoken')} p-0`}>
                        <MultiLanguageSelect
                          value={selectedLanguages}
                          onChange={handleLanguagesChange}
                        />
                      </div>
                    </Suspense>

                    {/* Chips des langues sélectionnées */}
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
                        onChange={(value) => setFormData(prev => ({ ...prev, customLanguage: value }))}
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

                    {/* Note de sécurité */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-700 bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span>🔒 SSL • {t.help.dataSecure}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Conditions générales */}
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
                      fieldErrors.terms && touched.terms
                        ? 'border-red-500 text-red-600'
                        : 'text-blue-600'
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
                    <FieldError 
                      error={fieldErrors.terms} 
                      show={!!(fieldErrors.terms && touched.terms)} 
                    />
                    <FieldSuccess 
                      show={fieldValidation.terms && touched.terms && !fieldErrors.terms}
                      message={t.success.fieldValid}
                    />
                  </div>
                </div>
              </div>

              {/* Bouton de soumission (bleu) */}
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

                {/* Indicateur de progression détaillé */}
                {!canSubmit && !isLoading && (
                  <div className="mt-4 space-y-3">
                    <p className="text-center text-xs text-gray-500 font-medium">{t.ui.progressHint}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.firstName ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.firstName ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 border border-gray-300 rounded-full" />
                        )}
                        <span>{t.fields.firstName}</span>
                      </div>
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.email ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.email ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 border border-gray-300 rounded-full" />
                        )}
                        <span>{t.fields.email}</span>
                      </div>
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.password ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.password ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 border border-gray-300 rounded-full" />
                        )}
                        <span>{t.fields.password}</span>
                      </div>
                      <div className={`flex items-center gap-1 transition-colors ${fieldValidation.languagesSpoken ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.languagesSpoken ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 border border-gray-300 rounded-full" />
                        )}
                        <span>{t.fields.languagesSpoken}</span>
                      </div>
                      <div className={`flex items-center gap-1 col-span-2 transition-colors ${fieldValidation.terms ? 'text-green-600' : 'text-gray-400'}`}>
                        {fieldValidation.terms ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 border border-gray-300 rounded-full" />
                        )}
                        <span>{t.ui.termsLink}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer informatif — capsule premium */}
          <div className="mt-8">
            <div className="relative mx-auto max-w-xl">
              <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 opacity-60 blur-sm" />
              <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md border border-white/15 shadow-lg hover:shadow-blue-500/20 transition-shadow">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white text-sm shadow">
                  ✨
                </div>
                <p className="text-[13px] sm:text-sm text-white/95">
                  {t.ui.footerBanner}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

// Export avec React.memo pour optimiser les re-renders
export default React.memo(RegisterClient);
