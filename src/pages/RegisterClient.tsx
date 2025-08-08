import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Flag, MapPin, UserCheck, Clock3, Languages, ShieldCheck } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { serverTimestamp } from 'firebase/firestore';
import type { MultiValue } from 'react-select';

// Lazy (inchangé)
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// ===== i18n =====
const i18n = {
  fr: {
    meta: {
      title: "Inscription Client - SOS Expats | Accédez à l'aide de la communauté",
      description:
        "Créez votre compte client en moins d'une minute et accédez à notre réseau d'aidants. Support 24/7, multilingue.",
      keywords: 'inscription client, expatriation, aide, expats, 24/7, multilingue'
    },
    ui: {
      heroTitle: 'Votre inscription, en moins de 1 minute',
      badge247: 'Disponible 24/7',
      badgeMulti: 'Multilingue',
      title: 'Inscription Client',
      subtitle: 'Créez votre compte pour accéder à notre réseau d’experts',
      alreadyRegistered: 'Déjà inscrit ?',
      login: 'Se connecter',
      personalInfo: 'Informations personnelles',
      geographicInfo: 'Informations géographiques',
      acceptTerms: "J'accepte les",
      termsLink: 'conditions générales pour clients',
      createAccount: 'Créer mon compte client',
      required: 'obligatoire',
      loading: 'Création en cours...',
      progressHint: 'Veuillez remplir tous les champs obligatoires (*)'
    },
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
    actions: {
      selectCountry: 'Sélectionnez un pays',
      specifyCountry: 'Précisez votre pays',
      specifyLanguage: 'Précisez la langue'
    },
    help: {
      minPassword: 'Minimum 6 caractères',
      emailPlaceholder: 'votre@email.com',
      firstNamePlaceholder: 'Votre prénom',
      lastNamePlaceholder: 'Votre nom',
      nationalityPlaceholder: 'Votre nationalité'
    },
    errors: {
      title: "Erreur d'inscription",
      allFieldsRequired: 'Tous les champs obligatoires doivent être remplis',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      invalidEmail: 'Veuillez saisir une adresse email valide',
      selectCountryError: 'Veuillez sélectionner votre pays de résidence',
      specifyCountryError: 'Veuillez préciser votre pays de résidence',
      selectLanguage: 'Veuillez sélectionner au moins une langue parlée',
      registrationError: "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
    },
    statuses: [
      { value: '', label: 'Sélectionnez votre statut' },
      { value: 'expat', label: 'Expatrié' },
      { value: 'traveler', label: 'Voyageur ponctuel' },
      { value: 'investor', label: 'Investisseur' },
      { value: 'digital_nomad', label: 'Digital Nomade' },
      { value: 'retired_expat', label: 'Retraité expatrié' },
      { value: 'student', label: "Étudiant à l'étranger" },
      { value: 'other', label: 'Autre' }
    ],
    termsHref: '/cgu-clients',
    jsonLdName: 'Inscription Client'
  },
  en: {
    meta: {
      title: 'Client Registration - SOS Expats | Get help from the community',
      description:
        'Create your client account in under 1 minute and access our helper network. 24/7, multilingual support.',
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
      geographicInfo: 'Geographic information',
      acceptTerms: 'I accept the',
      termsLink: 'general terms for clients',
      createAccount: 'Create my client account',
      required: 'required',
      loading: 'Creating account...',
      progressHint: 'Please complete all required fields (*)'
    },
    fields: {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email address',
      password: 'Password',
      nationality: 'Nationality',
      residenceCountry: 'Country of residence',
      status: 'Status',
      languagesSpoken: 'Spoken languages'
    },
    actions: {
      selectCountry: 'Select a country',
      specifyCountry: 'Specify your country',
      specifyLanguage: 'Specify the language'
    },
    help: {
      minPassword: 'Minimum 6 characters',
      emailPlaceholder: 'your@email.com',
      firstNamePlaceholder: 'Your first name',
      lastNamePlaceholder: 'Your last name',
      nationalityPlaceholder: 'Your nationality'
    },
    errors: {
      title: 'Registration error',
      allFieldsRequired: 'All required fields must be filled',
      passwordTooShort: 'Password must contain at least 6 characters',
      invalidEmail: 'Please enter a valid email address',
      selectCountryError: 'Please select your country of residence',
      specifyCountryError: 'Please specify your country of residence',
      selectLanguage: 'Please select at least one spoken language',
      registrationError: 'An error occurred during registration. Please try again.'
    },
    statuses: [
      { value: '', label: 'Select your status' },
      { value: 'expat', label: 'Expat' },
      { value: 'traveler', label: 'Occasional traveler' },
      { value: 'investor', label: 'Investor' },
      { value: 'digital_nomad', label: 'Digital Nomad' },
      { value: 'retired_expat', label: 'Retired expat' },
      { value: 'student', label: 'Study abroad' },
      { value: 'other', label: 'Other' }
    ],
    termsHref: '/terms-conditions-clients',
    jsonLdName: 'Client Registration'
  }
} as const;

// ===== Countries FR / EN (brefs + “Other/Autre”) =====
const COUNTRIES = {
  fr: [
    'France', 'Belgique', 'Suisse', 'Luxembourg', 'Canada', 'États-Unis', 'Royaume-Uni',
    'Allemagne', 'Espagne', 'Italie', 'Portugal', 'Maroc', 'Algérie', 'Tunisie',
    'Chine', 'Inde', 'Japon', 'Corée du Sud', 'Émirats arabes unis', 'Australie',
    'Brésil', 'Mexique', 'Afrique du Sud', 'Autre'
  ],
  en: [
    'France', 'Belgium', 'Switzerland', 'Luxembourg', 'Canada', 'United States', 'United Kingdom',
    'Germany', 'Spain', 'Italy', 'Portugal', 'Morocco', 'Algeria', 'Tunisia',
    'China', 'India', 'Japan', 'South Korea', 'United Arab Emirates', 'Australia',
    'Brazil', 'Mexico', 'South Africa', 'Other'
  ]
} as const;

// ===== Regex =====
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ===== Types =====
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

const RegisterClient: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const { language } = useApp();
  const lang = (language === 'en' ? 'en' : 'fr') as 'fr' | 'en';
  const t = i18n[lang];

  // ---- SEO / Social ----
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
    setMeta('property', 'og:locale', lang === 'fr' ? 'fr_FR' : 'en_US');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', t.meta.title);
    setMeta('name', 'twitter:description', t.meta.description);

    // JSON-LD (IA/ChatGPT friendly)
    const id = 'jsonld-register-client';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t.jsonLdName,
      description: t.meta.description,
      inLanguage: lang === 'fr' ? 'fr-FR' : 'en-US',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      isPartOf: { '@type': 'WebSite', name: 'SOS Expats', url: typeof window !== 'undefined' ? window.location.origin : undefined },
      mainEntity: { '@type': 'Person', name: 'Client' }
    };
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonld);
  }, [t, lang]);

  // ---- State ----
  const initialForm: FormData = useMemo(
    () => ({
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
    }),
    []
  );

  const [formData, setFormData] = useState<FormData>(initialForm);
  const [selectedLanguages, setSelectedLanguages] =
    useState<MultiValue<{ value: string; label: string }>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // ---- Helpers ----
  const inputBase =
    'w-full px-4 py-3 rounded-xl border transition-all duration-200 text-sm focus:outline-none';
  const inputNeutral =
    `${inputBase} bg-white/90 border-gray-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-400`;
  const inputWithIcon = `${inputNeutral} pl-11`;

  const isValidEmail = useCallback((email: string) => EMAIL_REGEX.test(email), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      if (name === 'currentCountry') {
        // Clear customCountry if user changes back
        if (value !== 'Autre' && value !== 'Other') {
          setFormData(prev => ({ ...prev, customCountry: '' }));
        }
      }
      if (formError) setFormError('');
    },
    [formError]
  );

  const handleLanguagesChange = useCallback(
    (newValue: MultiValue<{ value: string; label: string }>) => {
      setSelectedLanguages(newValue);
      setFormData(prev => ({ ...prev, languagesSpoken: newValue.map(v => v.value) }));
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const { firstName, lastName, email, password, currentCountry, customCountry, languagesSpoken } =
      formData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setFormError(t.errors.allFieldsRequired);
      return false;
    }
    if (!isValidEmail(email)) {
      setFormError(t.errors.invalidEmail);
      return false;
    }
    if (password.length < 6) {
      setFormError(t.errors.passwordTooShort);
      return false;
    }
    if (!currentCountry) {
      setFormError(t.errors.selectCountryError);
      return false;
    }
    const isOther = currentCountry === 'Autre' || currentCountry === 'Other';
    if (isOther && !customCountry.trim()) {
      setFormError(t.errors.specifyCountryError);
      return false;
    }
    if (languagesSpoken.length === 0) {
      setFormError(t.errors.selectLanguage);
      return false;
    }
    return true;
  }, [formData, isValidEmail, t.errors]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
          currentCountry:
            formData.currentCountry === 'Autre' || formData.currentCountry === 'Other'
              ? formData.customCountry.trim()
              : formData.currentCountry,
          status: formData.status,
          languagesSpoken: formData.languagesSpoken,
          isApproved: true,
          createdAt: serverTimestamp()
        };

        await register(userData, formData.password);
        navigate('/dashboard');
      } catch (e) {
        console.error('Register client error:', e);
        setFormError(t.errors.registrationError);
      }
    },
    [formData, register, navigate, t.errors.registrationError, validateForm]
  );

  const canSubmit =
    !!formData.email &&
    !!formData.password &&
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.currentCountry &&
    formData.languagesSpoken.length > 0 &&
    !isLoading;

  const countryOptions = useMemo(
    () =>
      (COUNTRIES[lang] as readonly string[]).map(c => (
        <option key={c} value={c}>
          {c}
        </option>
      )),
    [lang]
  );

  // ===== UI =====
  return (
    <Layout>
      {/* Fond pastel bleu (client) + correction d’espace sous header */}
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
        {/* En-tête compact (évite le gros blanc sous le header global) */}
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

              {/* petit séparateur bleu, fin pour “sous-titre” */}
              <div className="mx-auto mt-5 h-1 w-40 rounded-full bg-blue-500/60" />
            </div>
          </div>
        </header>

        {/* Contenu principal : marge top réduite pour éviter l’immense vide */}
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

              {/* Section infos perso */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  {t.ui.personalInfo}
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.firstName} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
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
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
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
                      placeholder={t.help.lastNamePlaceholder}
                      className={inputNeutral}
                    />
                  </div>
                </div>

                <div className="mt-4">
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
                    />
                  </div>
                </div>

                <div className="mt-4">
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-2.5 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95"
                      aria-label={showPassword ? (lang === 'fr' ? 'Masquer le mot de passe' : 'Hide password') : (lang === 'fr' ? 'Afficher le mot de passe' : 'Show password')}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </section>

              {/* Section géo */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {t.ui.geographicInfo}
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="nationality" className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.nationality}
                    </label>
                    <div className="relative">
                      <Flag className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        id="nationality"
                        name="nationality"
                        type="text"
                        autoComplete="country"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        placeholder={t.help.nationalityPlaceholder}
                        className={inputWithIcon}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="currentCountry" className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.residenceCountry} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <select
                        id="currentCountry"
                        name="currentCountry"
                        required
                        value={formData.currentCountry}
                        onChange={handleInputChange}
                        className={inputWithIcon}
                      >
                        <option value="">{t.actions.selectCountry}</option>
                        {countryOptions}
                      </select>
                    </div>

                    {(formData.currentCountry === 'Autre' || formData.currentCountry === 'Other') && (
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          {t.actions.specifyCountry}
                        </label>
                        <input
                          type="text"
                          value={formData.customCountry}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, customCountry: e.target.value }))
                          }
                          className={inputNeutral}
                          placeholder={t.actions.specifyCountry}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.status}
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className={inputNeutral}
                    >
                      {i18n[lang].statuses.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t.fields.languagesSpoken} <span className="text-red-500">*</span>
                    </label>

                    <Suspense
                      fallback={
                        <div className="h-11 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
                      }
                    >
                      <MultiLanguageSelect value={selectedLanguages} onChange={handleLanguagesChange} />
                    </Suspense>

                    {/* Astuce accessibilité: petite note de sécu & confiance */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span>SSL • {lang === 'fr' ? 'Données chiffrées' : 'Encrypted data'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Conditions + CTA */}
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

                {!canSubmit && (
                  <p className="mt-3 text-center text-xs text-gray-500">{t.ui.progressHint}</p>
                )}
              </div>
            </form>
          </div>

          {/* Footer petit texte */}
          <div className="mt-6 text-center text-xs text-gray-500">
            {lang === 'fr'
              ? "En vous inscrivant, vous rejoignez notre réseau et accédez rapidement à de l’aide qualifiée."
              : 'By registering, you join our network and quickly access qualified help.'}
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default React.memo(RegisterClient);
