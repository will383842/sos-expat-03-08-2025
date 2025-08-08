import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, UserCheck, Clock3, Languages, ShieldCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp } from 'firebase/firestore';
import type { MultiValue } from 'react-select';

// Lazy loading des composants lourds pour améliorer le temps de chargement initial
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// Regex pré-compilées pour améliorer les performances
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Interface pour le formulaire optimisée
interface FormData {
  firstName: string;
  email: string;
  password: string;
  languagesSpoken: string[];
  customLanguage: string;
}

// Configuration i18n complète - Préparée pour l'internationalisation
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
      personalInfo: 'Informations personnelles',
      acceptTerms: 'J\'accepte les',
      termsLink: 'conditions générales pour clients',
      createAccount: 'Créer mon compte client',
      required: 'obligatoire',
      loading: 'Création en cours...',
      progressHint: 'Veuillez remplir tous les champs obligatoires (*)'
    },
    // Champs du formulaire
    fields: {
      firstName: 'Prénom',
      email: 'Adresse email',
      password: 'Mot de passe',
      languagesSpoken: 'Langues parlées'
    },
    // Actions
    actions: {
      addLanguage: 'Ajouter une langue',
      remove: 'Supprimer',
      specifyLanguage: 'Précisez la langue',
      add: 'Ajouter'
    },
    // Textes d'aide
    help: {
      minPassword: 'Minimum 6 caractères',
      emailPlaceholder: 'votre@email.com',
      firstNamePlaceholder: 'Votre prénom'
    },
    // Messages d'erreur
    errors: {
      title: 'Erreur d\'inscription',
      allFieldsRequired: 'Tous les champs obligatoires doivent être remplis',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      invalidEmail: 'Veuillez saisir une adresse email valide',
      selectLanguage: 'Veuillez sélectionner au moins une langue parlée',
      registrationError: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.'
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
      personalInfo: 'Personal information',
      acceptTerms: 'I accept the',
      termsLink: 'general terms for clients',
      createAccount: 'Create my client account',
      required: 'required',
      loading: 'Creating account...',
      progressHint: 'Please complete all required fields (*)'
    },
    fields: {
      firstName: 'First name',
      email: 'Email address',
      password: 'Password',
      languagesSpoken: 'Spoken languages'
    },
    actions: {
      addLanguage: 'Add a language',
      remove: 'Remove',
      specifyLanguage: 'Specify the language',
      add: 'Add'
    },
    help: {
      minPassword: 'Minimum 6 characters',
      emailPlaceholder: 'your@email.com',
      firstNamePlaceholder: 'Your first name'
    },
    errors: {
      title: 'Registration error',
      allFieldsRequired: 'All required fields must be filled',
      passwordTooShort: 'Password must contain at least 6 characters',
      invalidEmail: 'Please enter a valid email address',
      selectLanguage: 'Please select at least one spoken language',
      registrationError: 'An error occurred during registration. Please try again.'
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
  const [formError, setFormError] = useState('');
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);

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
    setMeta('property', 'og:locale', language === 'en' ? 'en_US' : 'fr_FR');
    
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
      inLanguage: language === 'en' ? 'en-US' : 'fr-FR',
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
  const inputBase = useMemo(() =>
    'w-full px-4 py-3 rounded-xl border transition-all duration-200 text-sm focus:outline-none',
    []
  );
  
  const inputNeutral = useMemo(() =>
    `${inputBase} bg-white/90 border-gray-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400`,
    [inputBase]
  );
  
  const inputWithIcon = useMemo(() => 
    `${inputNeutral} pl-11`,
    [inputNeutral]
  );

  // Validation email optimisée avec regex pré-compilée
  const isValidEmail = useCallback((email: string): boolean => {
    return EMAIL_REGEX.test(email);
  }, []);

  // Fonction pour faire défiler vers le haut (amélioration UX)
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Gestionnaire générique pour les changements d'input - optimisé
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
    const { firstName, email, password, languagesSpoken } = formData;

    if (!firstName?.trim() || !email?.trim() || !password) {
      setFormError(t.errors.allFieldsRequired);
      scrollToTop();
      return false;
    }

    if (!isValidEmail(email)) {
      setFormError(t.errors.invalidEmail);
      scrollToTop();
      return false;
    }

    if (password.length < 6) {
      setFormError(t.errors.passwordTooShort);
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
        email: formData.email.trim().toLowerCase(),
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

  // Vérification si le formulaire peut être soumis
  const canSubmit = useMemo(() => {
    return formData.email && 
           formData.password && 
           formData.firstName && 
           formData.languagesSpoken.length > 0 &&
           !isLoading;
  }, [formData.email, formData.password, formData.firstName, formData.languagesSpoken.length, isLoading]);

  return (
    <Layout>
      {/* Fond pastel bleu (client) + correction d'espace sous header */}
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
        {/* En-tête compact optimisé pour mobile */}
        <header className="pt-6 sm:pt-8">
          <div className="mx-auto w-full max-w-2xl px-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg mb-3">
                <UserCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {t.ui.heroTitle}
              </h1>

              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                  <Clock3 className="h-4 w-4 text-blue-600" />
                  {t.ui.badge247}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
                  <Languages className="h-4 w-4 text-blue-600" />
                  {t.ui.badgeMulti}
                </span>
              </div>

              {/* petit séparateur bleu, fin pour "sous-titre" */}
              <div className="mx-auto mt-5 h-1 w-40 rounded-full bg-blue-500/60" />
            </div>
          </div>
        </header>

        {/* Contenu principal : marge top réduite pour éviter l'immense vide */}
        <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:pt-8">
          {/* Panneau formulaire */}
          <div className="rounded-2xl border border-blue-100 bg-white/90 shadow-xl backdrop-blur-sm">
            <div className="border-b border-blue-100 px-5 py-4 sm:px-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t.ui.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{t.ui.subtitle}</p>
              <p className="mt-2 text-xs text-gray-500">
                {t.ui.alreadyRegistered}{' '}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 underline decoration-2 underline-offset-2 hover:text-blue-700"
                >
                  {t.ui.login}
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 px-5 py-6 sm:px-8 sm:py-8" noValidate>
              {/* Messages d'erreur améliorés */}
              {(error || formError) && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50/80 p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-red-800">{t.errors.title}</h3>
                      <p className="mt-1 text-sm text-red-700">{error || formError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Informations personnelles */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  {t.ui.personalInfo}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
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
                      placeholder={t.help.firstNamePlaceholder}
                      className={inputNeutral}
                      aria-describedby="firstName-required"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.email} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder={t.help.emailPlaceholder}
                        className={inputWithIcon}
                        aria-describedby="email-required"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.password} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t.help.minPassword}
                        className={`${inputWithIcon} pr-11`}
                        aria-describedby="password-requirements"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95"
                        aria-label={showPassword ? (language === 'en' ? 'Hide password' : 'Masquer le mot de passe') : (language === 'en' ? 'Show password' : 'Afficher le mot de passe')}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Langues parlées avec MultiLanguageSelect */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.languagesSpoken} <span className="text-red-500">*</span>
                    </label>
                    
                    <Suspense fallback={
                      <div className="h-11 animate-pulse rounded-xl border border-gray-200 bg-gray-100 flex items-center px-3">
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

                    {/* Note de sécurité */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span>SSL • {language === 'en' ? 'Encrypted data' : 'Données chiffrées'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Conditions générales */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {t.ui.acceptTerms}{' '}
                    <Link
                      to={t.termsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 underline decoration-2 underline-offset-2 hover:text-blue-700"
                    >
                      {t.ui.termsLink}
                    </Link>{' '}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>

              {/* Bouton de soumission optimisé */}
              <div>
                <Button
                  type="submit"
                  loading={isLoading}
                  fullWidth
                  size="large"
                  disabled={!canSubmit}
                  className="min-h-[52px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? t.ui.loading : t.ui.createAccount}
                </Button>

                {/* Indicateur de progression visuel */}
                {!canSubmit && (
                  <p className="mt-3 text-center text-xs text-gray-500">{t.ui.progressHint}</p>
                )}
              </div>
            </form>
          </div>

          {/* Footer informatif */}
          <div className="mt-6 text-center text-xs text-gray-500">
            {language === 'en'
              ? 'By registering, you join our network and quickly access qualified help.'
              : "En vous inscrivant, vous rejoignez notre réseau et accédez rapidement à de l'aide qualifiée."}
          </div>
        </main>
      </div>
    </Layout>
  );
};

// Export avec React.memo pour optimiser les re-renders
export default React.memo(RegisterClient);