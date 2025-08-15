// src/pages/RegisterExpat.tsx
import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Globe, Phone,
  CheckCircle, Users, Camera, X, ArrowRight, Info, MapPin, MessageCircle
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import type { MultiValue } from 'react-select';
import type { Provider } from '../types/provider';

// ===== Lazy (perf) =====
const ImageUploader = lazy(() => import('../components/common/ImageUploader'));
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// ===== Theme (vert/emerald) =====
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
interface LanguageOption { value: string; label: string }
interface ExpatFormData {
  firstName: string; lastName: string; email: string; password: string;
  phone: string; phoneCountryCode: string; whatsappCountryCode: string; whatsappNumber: string;
  currentCountry: string; currentPresenceCountry: string; interventionCountry: string;
  preferredLanguage: 'fr' | 'en';
  helpTypes: string[]; customHelpType: string;
  yearsAsExpat: number; profilePhoto: string; bio: string;
  availability: 'available' | 'busy' | 'offline'; acceptTerms: boolean;
}

// ===== i18n =====
const I18N = {
  fr: {
    metaTitle: 'Inscription Expat Aidant • SOS Expats',
    metaDesc: 'Partagez vos bons plans, filez des coups de main et rendez la vie à l’étranger plus simple ✨',
    heroTitle: 'Inscription Expat Aidant',
    heroSubtitle: 'On crée votre profil en 3 petites étapes — facile, fluide, friendly 🌍',
    already: 'Déjà inscrit ?', login: 'Se connecter',
    personalInfo: 'On fait connaissance',
    geoInfo: 'Où vous êtes & expérience',
    helpInfo: "Comment vous aimez aider ?",
    firstName: 'Prénom', lastName: 'Nom', email: 'Adresse email', password: 'Mot de passe',
    phone: 'Téléphone', whatsapp: 'Numéro WhatsApp',
    countryCode: 'Indicatif pays',
    residenceCountry: 'Pays de résidence',
    presenceCountry: 'Pays où vous êtes en ce moment',
    interventionCountry: "Pays d'intervention principal",
    yearsAsExpat: "Années d'expatriation",
    bio: 'Votre expérience (bio)', profilePhoto: 'Photo de profil',
    languages: 'Langues parlées', selectedLanguages: 'Langues sélectionnées',
    helpDomains: "Domaines d'aide", addHelp: "Ajouter un domaine d'aide", specifyHelp: "Précisez le domaine d'aide",
    help: {
      minPassword: '6 caractères et c’est parti (pas de prise de tête) 💃',
      emailPlaceholder: 'vous@example.com',
      firstNamePlaceholder: 'Comment on vous appelle ? 🥰',
      bioHint: 'En 2–3 lignes, dites comment vous aidez (50 caractères mini).',
    },
    errors: {
      title: 'Petites retouches avant le grand saut ✨',
      firstNameRequired: 'On veut bien vous appeler… mais comment ? 😄',
      lastNameRequired: 'Un nom de famille pour faire pro ? 👔',
      emailRequired: 'Votre email pour rester en contact 📬',
      emailInvalid: 'Cette adresse a l’air louche… Essayez nom@exemple.com 🧐',
      emailTaken: 'Oups, cet email est déjà pris. Vous avez peut-être déjà un compte ? 🔑',
      passwordTooShort: '6 caractères minimum — easy ! 💪',
      phoneRequired: 'Quel numéro on compose ? 📞',
      whatsappRequired: 'Votre WhatsApp pour papoter vite fait ? 💬',
      needCountry: 'Votre pays de résidence, s’il vous plaît 🌍',
      needPresence: 'Où êtes-vous en ce moment ? ✈️',
      needIntervention: "Choisissez un pays d'intervention 🗺️",
      needLang: 'Ajoutez au moins une langue (polyglotte ? 🗣️)',
      needHelp: "Ajoutez au moins un domaine d'aide 🤝",
      needBio: 'Encore un petit effort : 50 caractères minimum 📝',
      needPhoto: 'Une photo pro, et c’est 100% plus rassurant 📸',
      needYears: 'Au moins 1 an d’expatriation pour guider les autres 🌍',
      acceptTermsRequired: 'Un petit clic sur les conditions et on y va ✅',
    },
    success: 'Inscription réussie ! Bienvenue à bord 🎉',
    secureNote: '🔒 Données protégées • Support 24/7',
    progress: 'Progression',
    footerTitle: "🌍 Une communauté d'entraide à portée de main",
    footerText: 'Des expats qui s’entraident, partout.',
    cguLabel: '📋 CGU Expatriés',
    privacy: '🔒 Confidentialité',
    helpLink: '💬 Aide',
    contact: '📧 Contact',
    create: 'Créer mon compte expat aidant',
    loading: 'On prépare tout… ⏳',
    previewTitle: 'Aperçu live de votre profil',
    previewHint: 'C’est ce que les autres verront. Peaufinez à votre goût ✨',
    previewToggleOpen: 'Masquer l’aperçu',
    previewToggleClose: 'Voir l’aperçu',
  },
  en: {
    metaTitle: 'Expat Helper Registration • SOS Expats',
    metaDesc: 'Share your tips, lend a hand, and make life abroad feel easy ✨',
    heroTitle: 'Expat Helper Registration',
    heroSubtitle: 'Create your profile in 3 smooth steps — easy, friendly, fun 🌍',
    already: 'Already registered?', login: 'Log in',
    personalInfo: 'Let’s get to know you',
    geoInfo: 'Where you are & experience',
    helpInfo: 'How do you like to help?',
    firstName: 'First name', lastName: 'Last name', email: 'Email', password: 'Password',
    phone: 'Phone', whatsapp: 'WhatsApp number',
    countryCode: 'Country code',
    residenceCountry: 'Country of residence',
    presenceCountry: 'Where you are right now',
    interventionCountry: 'Main intervention country',
    yearsAsExpat: 'Years as an expat',
    bio: 'Your experience (bio)', profilePhoto: 'Profile photo',
    languages: 'Spoken languages', selectedLanguages: 'Selected languages',
    helpDomains: 'Help domains', addHelp: 'Add a help domain', specifyHelp: 'Specify the help domain',
    help: {
      minPassword: '6+ characters and you’re good 💃',
      emailPlaceholder: 'you@example.com',
      firstNamePlaceholder: 'How should we call you? 🥰',
      bioHint: 'In 2–3 lines, say how you help (min 50 chars).',
    },
    errors: {
      title: 'Tiny tweaks and we’re there ✨',
      firstNameRequired: 'We’d love to address you… what’s your name? 😄',
      lastNameRequired: 'A last name keeps it professional 👔',
      emailRequired: 'We need your email to stay in touch 📬',
      emailInvalid: 'That email looks off. Try name@example.com 🧐',
      emailTaken: 'This email is already in use. Maybe you already have an account? 🔑',
      passwordTooShort: 'At least 6 characters — easy! 💪',
      phoneRequired: 'What number should we call? 📞',
      whatsappRequired: 'WhatsApp number, pretty please? 💬',
      needCountry: 'Your residence country, please 🌍',
      needPresence: 'Where are you at the moment? ✈️',
      needIntervention: 'Pick a main intervention country 🗺️',
      needLang: 'Add at least one language 🗣️',
      needHelp: 'Add at least one help domain 🤝',
      needBio: 'Push it to 50 characters — you got this 📝',
      needPhoto: 'A professional photo builds trust 📸',
      needYears: 'At least 1 year abroad to guide others 🌍',
      acceptTermsRequired: 'Tick the box and we’re rolling ✅',
    },
    success: 'Registration successful! Welcome aboard 🎉',
    secureNote: '🔒 Data protected • 24/7 support',
    progress: 'Progress',
    footerTitle: '🌍 A community of helpful expats',
    footerText: 'Expats helping expats, everywhere.',
    cguLabel: '📋 CGU Expats',
    privacy: '🔒 Privacy',
    helpLink: '💬 Help',
    contact: '📧 Contact',
    create: 'Create my expat helper account',
    loading: 'Getting things ready… ⏳',
    previewTitle: 'Live profile preview',
    previewHint: 'This is what others will see. Make it shine ✨',
    previewToggleOpen: 'Hide preview',
    previewToggleClose: 'Show preview',
  },
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mapDuo = (list: Duo[], lang: 'fr' | 'en') => list.map((item) => item[lang]);

// Petit composant succès
const FieldSuccess = ({ show, children }: { show: boolean; children: React.ReactNode }) =>
  show ? (
    <div className="mt-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 inline-flex items-center">
      <CheckCircle className="w-4 h-4 mr-1" /> {children}
    </div>
  ) : null;

const TagSelector = React.memo(
  ({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) => {
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

// ===== Helpers =====
const computePasswordStrength = (pw: string) => {
  if (!pw) return { percent: 0, labelFr: 'Vide', labelEn: 'Empty', color: 'bg-gray-300' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z]/.test(pw)) score++;
  const clamp = Math.min(score, 4);
  const percentMap = [10, 35, 60, 80, 100] as const;
  const colorMap = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500', 'bg-green-600'] as const;
  const frMap = ['Très faible', 'Faible', 'Correct', 'Bien', 'Très solide'] as const;
  const enMap = ['Very weak', 'Weak', 'Okay', 'Good', 'Very strong'] as const;
  return { percent: percentMap[clamp], labelFr: frMap[clamp], labelEn: enMap[clamp], color: colorMap[clamp] };
};

const Avatar = ({ src, name }: { src?: string; name: string }) => {
  if (src) {
    return <img src={src} alt={name} className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-200" />;
  }
  const initials = name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  return (
    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-bold ring-2 ring-emerald-200">
      {initials || '🙂'}
    </div>
  );
};

// ===== Live Preview =====
const PreviewCard = ({
  lang, t, progress, fullName, photo, currentCountry, presenceCountry, interventionCountry, yearsAsExpat, languages, helpTypes, whatsapp,
}: {
  lang: 'fr' | 'en';
  t: typeof I18N['fr'];
  progress: number;
  fullName: string;
  photo?: string;
  currentCountry?: string;
  presenceCountry?: string;
  interventionCountry?: string;
  yearsAsExpat?: number;
  languages: string[];
  helpTypes: string[];
  whatsapp?: string;
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Avatar src={photo} name={fullName} />
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
            {fullName || (lang === 'en' ? 'Your Name' : 'Votre nom')}
          </h3>
          <p className="text-xs text-gray-500">
            {lang === 'en' ? 'Expat Helper' : 'Expat Aidant'} • {progress}% {lang === 'en' ? 'complete' : 'complet'}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
        {(currentCountry || presenceCountry) && (
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">
              {currentCountry || (lang === 'en' ? 'Residence' : 'Résidence')}
            </span>
            {presenceCountry && (
              <span className="ml-auto rounded-full px-2 py-0.5 text-xs bg-emerald-50 border border-emerald-200">
                {presenceCountry}
              </span>
            )}
          </div>
        )}
        {interventionCountry && (
          <div className="flex items-center gap-2 text-gray-700">
            <Globe className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">
              {lang === 'en' ? 'Main help in' : 'Intervention'}:
            </span>
            <span className="ml-auto rounded-full px-2 py-0.5 text-xs bg-emerald-50 border border-emerald-200">
              {interventionCountry}
            </span>
          </div>
        )}
        {typeof yearsAsExpat === 'number' && yearsAsExpat > 0 && (
          <div className="text-gray-700">
            {lang === 'en' ? 'Years abroad:' : 'Années à l’étranger :'}{' '}
            <strong>{yearsAsExpat}</strong>
          </div>
        )}
      </div>

      {!!languages.length && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">{t.selectedLanguages}</p>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <span key={l} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs border border-emerald-200">
                {l.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!helpTypes.length && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">{t.helpDomains}</p>
          <div className="flex flex-wrap gap-2">
            {helpTypes.map((h, i) => (
              <span key={`${h}-${i}`} className="px-2 py-1 rounded-lg bg-white text-gray-800 text-xs border-emerald-200 border">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {whatsapp && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span className="truncate">{whatsapp}</span>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">{t.previewHint}</p>
    </div>
  );
};

// --- Panneau checklist vert en bas ---
const BottomChecklist = ({
  items, progress, lang, onJump,
}: {
  items: { key: string; label: string; ok: boolean; ref?: React.MutableRefObject<HTMLElement | null> }[];
  progress: number;
  lang: 'fr' | 'en';
  onJump: (r?: React.MutableRefObject<HTMLElement | null>) => void;
}) => (
  <div className="mt-6">
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-[10px] shadow-lg">
      <div className="rounded-xl bg-white/90 backdrop-blur-sm p-4 sm:p-5">
        <p className="font-bold text-gray-900 mb-3">
          {lang === 'en' ? 'To complete:' : 'À compléter :'}
        </p>

        <div className="grid sm:grid-cols-2 gap-y-2">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => onJump(it.ref)}
              className="text-left rounded-lg px-2 py-1 hover:bg-emerald-50/70 focus:outline-none"
            >
              <span className={`inline-flex items-center text-sm ${it.ok ? 'text-emerald-700' : 'text-gray-600'}`}>
                {it.ok ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                ) : (
                  <span className="w-4 h-4 mr-2 inline-block rounded-full border border-gray-300" />
                )}
                {it.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <span className="text-xs text-gray-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1 inline-block">
            {lang === 'en' ? `Completion: ${progress}%` : `Complétion : ${progress}%`}
          </span>
        </div>
      </div>
    </div>
  </div>
);

// ===== Component =====
const RegisterExpat: React.FC = () => {
  const navigate = useNavigate();

  // --- Types sûrs ---
  type LocalNavState = Readonly<{ selectedProvider?: Provider }>;
  function isProviderLike(v: unknown): v is Provider {
    if (typeof v !== 'object' || v === null) return false;
    const o = v as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.name === 'string' && (o.type === 'lawyer' || o.type === 'expat');
  }

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    const rawState: unknown = location.state;
    const state = (rawState ?? null) as LocalNavState | null;
    const sp = state?.selectedProvider;
    if (isProviderLike(sp)) {
      try { sessionStorage.setItem('selectedProvider', JSON.stringify(sp)); } catch { /* no-op */ }
    }
  }, [location.state]);

  const { register, isLoading, error } = useAuth();
  const { language } = useApp(); // 'fr' | 'en'
  const lang = (language as 'fr' | 'en') || 'fr';
  const t = I18N[lang];

  // ---- SEO / OG meta ----
  useEffect(() => {
    document.title = t.metaTitle;
    const ensure = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (prop) el.setAttribute('property', name); else el.setAttribute('name', name);
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
  const initial: ExpatFormData = {
    firstName: '', lastName: '', email: '', password: '',
    phone: '', phoneCountryCode: '+33', whatsappCountryCode: '+33', whatsappNumber: '',
    currentCountry: '', currentPresenceCountry: '', interventionCountry: '',
    preferredLanguage: lang,
    helpTypes: [], customHelpType: '',
    yearsAsExpat: 0, profilePhoto: '', bio: '',
    availability: 'available', acceptTerms: false
  };

  const [form, setForm] = useState<ExpatFormData>(initial);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [capsPassword, setCapsPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCustomHelp, setShowCustomHelp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // Refs pour scroll/jump
  const refFirstName = useRef<HTMLDivElement | null>(null);
  const refLastName = useRef<HTMLDivElement | null>(null);
  const refEmail = useRef<HTMLDivElement | null>(null);
  const refPwd = useRef<HTMLDivElement | null>(null);
  const refPhone = useRef<HTMLDivElement | null>(null);
  const refWhats = useRef<HTMLDivElement | null>(null);
  const refCountry = useRef<HTMLDivElement | null>(null);
  const refPresence = useRef<HTMLDivElement | null>(null);
  const refInterv = useRef<HTMLDivElement | null>(null);
  const refYears = useRef<HTMLDivElement | null>(null);
  const refLangs = useRef<HTMLDivElement | null>(null);
  const refBio = useRef<HTMLDivElement | null>(null);
  const refPhoto = useRef<HTMLDivElement | null>(null);
  const refHelp = useRef<HTMLDivElement | null>(null);
  const refCGU = useRef<HTMLDivElement | null>(null);

  // ---- Options ----
  const countryOptions = useMemo(() => mapDuo(COUNTRIES, lang), [lang]);
  const helpTypeOptions = useMemo(() => mapDuo(HELP_TYPES, lang), [lang]);
  const countryCodeOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ value: c.code, label: `${c.flag} ${c.code} (${lang === 'en' ? c.en : c.fr})` })),
    [lang]
  );

  // ---- Password strength ----
  const pwdStrength = useMemo(() => computePasswordStrength(form.password), [form.password]);

  // ---- Validations (pour messages & checklist) ----
  const valid = useMemo(() => ({
    firstName: !!form.firstName.trim(),
    lastName: !!form.lastName.trim(),
    email: EMAIL_REGEX.test(form.email), // ✅ format uniquement
    password: form.password.length >= 6,
    phone: !!form.phone.trim(),
    whatsappNumber: !!form.whatsappNumber.trim(),
    currentCountry: !!form.currentCountry,
    currentPresenceCountry: !!form.currentPresenceCountry,
    interventionCountry: !!form.interventionCountry,
    yearsAsExpat: form.yearsAsExpat >= 1,
    bio: form.bio.trim().length >= 50,
    profilePhoto: !!form.profilePhoto,
    languages: (selectedLanguages as LanguageOption[]).length > 0,
    helpTypes: form.helpTypes.length > 0,
    acceptTerms: form.acceptTerms,
  }), [form, selectedLanguages]);

  // ---- Progress (sans emailStatus) ----
  const progress = useMemo(() => {
    const fields = [
      !!form.firstName.trim(),
      !!form.lastName.trim(),
      EMAIL_REGEX.test(form.email),
      form.password.length >= 6,
      !!form.phone.trim(),
      !!form.whatsappNumber.trim(),
      !!form.currentCountry,
      !!form.currentPresenceCountry,
      !!form.interventionCountry,
      form.yearsAsExpat >= 1,
      form.bio.trim().length >= 50,
      !!form.profilePhoto,
      (selectedLanguages as LanguageOption[]).length > 0,
      form.helpTypes.length > 0,
      form.acceptTerms,
    ];
    const done = fields.filter(Boolean).length;
    return Math.round((done / fields.length) * 100);
  }, [form, selectedLanguages]);

  // ---- Handlers ----
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = e.target as HTMLInputElement;
      setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value }));
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const rest = { ...prev };
          delete rest[name];
          return rest;
        });
      }
      if (formError) setFormError('');
    },
    [fieldErrors, formError]
  );

  const onHelpSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      if (!v) return;
      const other = lang === 'en' ? 'Other' : 'Autre';
      if (v === other) {
        setShowCustomHelp(true);
        e.target.value = '';
        return;
      }
      if (!form.helpTypes.includes(v)) {
        setForm((prev) => ({ ...prev, helpTypes: [...prev.helpTypes, v] }));
      }
      e.target.value = '';
      if (fieldErrors.helpTypes) {
        const rest = { ...fieldErrors };
        delete rest.helpTypes;
        setFieldErrors(rest);
      }
    },
    [form.helpTypes, fieldErrors, lang]
  );

  const removeHelp = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, helpTypes: prev.helpTypes.filter((x) => x !== v) }));
  }, []);
  const addCustomHelp = useCallback(() => {
    const v = form.customHelpType.trim();
    if (v && !form.helpTypes.includes(v)) {
      setForm((prev) => ({ ...prev, helpTypes: [...prev.helpTypes, v], customHelpType: '' }));
      setShowCustomHelp(false);
    }
  }, [form.customHelpType, form.helpTypes]);

  // ---- Validation blocage submit ----
  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!valid.firstName) e.firstName = t.errors.firstNameRequired;
    if (!valid.lastName) e.lastName = t.errors.lastNameRequired;
    if (!form.email.trim()) e.email = t.errors.emailRequired;
    else if (!EMAIL_REGEX.test(form.email)) e.email = t.errors.emailInvalid;
    // ⚠️ On ne bloque pas sur l’unicité (Firebase fera foi au submit)
    if (!valid.password) e.password = t.errors.passwordTooShort;
    if (!valid.phone) e.phone = t.errors.phoneRequired;
    if (!valid.whatsappNumber) e.whatsappNumber = t.errors.whatsappRequired;
    if (!valid.currentCountry) e.currentCountry = t.errors.needCountry;
    if (!valid.currentPresenceCountry) e.currentPresenceCountry = t.errors.needPresence;
    if (!valid.interventionCountry) e.interventionCountry = t.errors.needIntervention;
    if (!valid.languages) e.languages = t.errors.needLang;
    if (!valid.helpTypes) e.helpTypes = t.errors.needHelp;
    if (!valid.bio) e.bio = t.errors.needBio;
    if (!valid.profilePhoto) e.profilePhoto = t.errors.needPhoto;
    if (!valid.yearsAsExpat) e.yearsAsExpat = t.errors.needYears;
    if (!valid.acceptTerms) e.acceptTerms = t.errors.acceptTermsRequired;

    setFieldErrors(e);
    if (Object.keys(e).length) {
      setFormError(t.errors.title);
      return false;
    }
    return true;
  }, [form, valid, t]);

  // Scroll vers le premier champ incomplet
  const scrollToFirstIncomplete = useCallback(() => {
    const pairs: Array<[boolean, React.MutableRefObject<HTMLElement | null> | null]> = [
      [!valid.firstName, refFirstName],
      [!valid.lastName, refLastName],
      [!valid.email, refEmail],
      [!valid.password, refPwd],
      [!valid.phone, refPhone],
      [!valid.whatsappNumber, refWhats],
      [!valid.currentCountry, refCountry],
      [!valid.currentPresenceCountry, refPresence],
      [!valid.interventionCountry, refInterv],
      [!valid.languages, refLangs],
      [!valid.helpTypes, refHelp],
      [!valid.bio, refBio],
      [!valid.profilePhoto, refPhoto],
      [!valid.yearsAsExpat, refYears],
      [!valid.acceptTerms, refCGU],
    ];
    const target = pairs.find(([need]) => need)?.[1];
    const el = target?.current || null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [valid]);

  // ---- Submit ----
  const handleSubmit = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      setFormError('');
      if (!validate()) {
        setIsSubmitting(false);
        scrollToFirstIncomplete();
        return;
      }
      try {
        const languageCodes = (selectedLanguages as LanguageOption[]).map((l) => l.value);
        const userData = {
          role: 'expat' as const,
          type: 'expat' as const,
          email: form.email.trim().toLowerCase(),
          fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phoneCountryCode + form.phone.trim(),
          whatsapp: form.whatsappCountryCode + form.whatsappNumber.trim(),
          phoneCountryCode: form.phoneCountryCode,
          whatsappCountryCode: form.whatsappCountryCode,
          whatsappNumber: form.whatsappNumber.trim(),
          currentCountry: form.currentCountry,
          currentPresenceCountry: form.currentPresenceCountry,
          country: form.currentPresenceCountry,
          interventionCountry: form.interventionCountry,
          profilePhoto: form.profilePhoto,
          photoURL: form.profilePhoto,
          avatar: form.profilePhoto,
          languages: languageCodes,
          languagesSpoken: languageCodes,
          helpTypes: form.helpTypes,
          yearsAsExpat: form.yearsAsExpat,
          bio: form.bio.trim(),
          description: form.bio.trim(),
          availability: form.availability,
          isOnline: form.availability === 'available',
          isApproved: true,
          isVisible: true,
          isActive: true,
          preferredLanguage: form.preferredLanguage,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await register(userData, form.password);
        navigate(redirect, { replace: true, state: { message: t.success, type: 'success' } });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error';
        setFormError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, validate, register, form, selectedLanguages, navigate, redirect, t, scrollToFirstIncomplete]
  );

  // ---- Can submit ----
  const canSubmit = useMemo(
    () =>
      valid.email &&
      valid.password &&
      valid.firstName &&
      valid.lastName &&
      valid.acceptTerms &&
      valid.bio &&
      valid.profilePhoto &&
      valid.languages &&
      valid.helpTypes &&
      valid.currentCountry &&
      valid.currentPresenceCountry &&
      valid.interventionCountry &&
      valid.yearsAsExpat &&
      !isLoading &&
      !isSubmitting &&
      !Object.keys(fieldErrors).length,
    [valid, fieldErrors, isLoading, isSubmitting]
  );

  // ---- Checklist items ----
  const checklist = useMemo(
    () => [
      { key: 'firstName', label: lang === 'en' ? 'First name' : 'Prénom', ok: valid.firstName, ref: refFirstName },
      { key: 'lastName', label: lang === 'en' ? 'Last name' : 'Nom', ok: valid.lastName, ref: refLastName },
      { key: 'email', label: lang === 'en' ? 'Valid email' : 'Email valide', ok: valid.email, ref: refEmail },
      { key: 'password', label: lang === 'en' ? 'Password (≥ 6 chars)' : 'Mot de passe (≥ 6 caractères)', ok: valid.password, ref: refPwd },
      { key: 'phone', label: lang === 'en' ? 'Phone' : 'Téléphone', ok: valid.phone, ref: refPhone },
      { key: 'whatsappNumber', label: 'WhatsApp', ok: valid.whatsappNumber, ref: refWhats },
      { key: 'currentCountry', label: lang === 'en' ? 'Country of residence' : 'Pays de résidence', ok: valid.currentCountry, ref: refCountry },
      { key: 'currentPresenceCountry', label: lang === 'en' ? 'Presence country' : 'Pays de présence', ok: valid.currentPresenceCountry, ref: refPresence },
      { key: 'interventionCountry', label: lang === 'en' ? 'Main intervention country' : "Pays d'intervention", ok: valid.interventionCountry, ref: refInterv },
      { key: 'languages', label: lang === 'en' ? 'At least one language' : 'Au moins une langue', ok: valid.languages, ref: refLangs },
      { key: 'helpTypes', label: lang === 'en' ? 'At least one specialty' : 'Au moins une spécialité', ok: valid.helpTypes, ref: refHelp },
      { key: 'profilePhoto', label: lang === 'en' ? 'Profile photo' : 'Photo de profil', ok: valid.profilePhoto, ref: refPhoto },
      { key: 'bio', label: lang === 'en' ? 'Bio (≥ 50 chars)' : 'Bio (≥ 50 caractères)', ok: valid.bio, ref: refBio },
      { key: 'yearsAsExpat', label: lang === 'en' ? 'Years abroad (≥ 1)' : "Années d'expatriation (≥ 1)", ok: valid.yearsAsExpat, ref: refYears },
      { key: 'acceptTerms', label: lang === 'en' ? 'Accept T&Cs' : 'Accepter les CGU', ok: valid.acceptTerms, ref: refCGU },
    ],
    [valid, lang]
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

      <div className="min-h-screen bg-[linear-gradient(180deg,#f7fff9_0%,#ffffff_35%,#f0fff7_100%)]">
        {/* Hero */}
        <header className="pt-6 sm:pt-8 text-center">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900">
            <span className={`bg-gradient-to-r ${THEME.gradFrom} ${THEME.gradTo} bg-clip-text text-transparent`}>
              {t.heroTitle}
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 px-4">{t.heroSubtitle}</p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-white border shadow-sm">24/7</span>
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-white border shadow-sm">{lang === 'en' ? 'Multilingual' : 'Multilingue'}</span>
          </div>
          <div className="mt-3 text-xs sm:text-sm text-gray-600">
            {t.already}{' '}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="font-semibold text-emerald-700 underline decoration-2 underline-offset-2 hover:text-emerald-800"
            >
              {t.login}
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {(error || formError) && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <div className="text-sm text-red-700">
                  <div className="font-semibold mb-0.5">{t.errors.title}</div>
                  <div>{error || formError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mb-6 max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">{t.progress}</span>
              <span className="text-sm font-bold text-emerald-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Layout */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-6">
            {/* Mobile preview toggle */}
            <div className="mb-4 lg:hidden">
              <button
                type="button"
                onClick={() => setIsPreviewOpen((s) => !s)}
                className="w-full text-sm font-semibold px-4 py-2 rounded-xl border border-emerald-200 bg-white shadow-sm"
              >
                {isPreviewOpen ? t.previewToggleOpen : t.previewToggleClose}
              </button>
            </div>

            {/* PREVIEW */}
            <aside className={`${isPreviewOpen ? 'block' : 'hidden'} lg:block lg:col-span-1 lg:order-last lg:sticky lg:top-6 mb-6`}>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{t.previewTitle}</h3>
              <PreviewCard
                lang={lang}
                t={t}
                progress={progress}
                fullName={`${form.firstName || (lang === 'en' ? 'First' : 'Prénom')} ${form.lastName || (lang === 'en' ? 'Last' : 'Nom')}`.trim()}
                photo={form.profilePhoto}
                currentCountry={form.currentCountry}
                presenceCountry={form.currentPresenceCountry}
                interventionCountry={form.interventionCountry}
                yearsAsExpat={form.yearsAsExpat}
                languages={(selectedLanguages as LanguageOption[]).map((l) => l.value)}
                helpTypes={form.helpTypes}
                whatsapp={`${form.whatsappCountryCode} ${form.whatsappNumber}`.trim()}
              />
            </aside>

            {/* FORM */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <form onSubmit={handleSubmit} noValidate>
                  {/* Step 1: Personal */}
                  <section className="p-5 sm:p-6">
                    <SectionHeader icon={<Users className="w-5 h-5" />} title={t.personalInfo} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* First name */}
                      <div ref={refFirstName}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.firstName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="firstName" autoComplete="given-name" value={form.firstName} onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${fieldErrors.firstName ? 'border-red-500 bg-red-50' : valid.firstName ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                          placeholder={t.help.firstNamePlaceholder}
                        />
                        <FieldSuccess show={valid.firstName}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                      </div>

                      {/* Last name */}
                      <div ref={refLastName}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.lastName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="lastName" autoComplete="family-name" value={form.lastName} onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${fieldErrors.lastName ? 'border-red-500 bg-red-50' : valid.lastName ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                          placeholder={lang === 'en' ? 'Doe' : 'Dupont'}
                        />
                        <FieldSuccess show={valid.lastName}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mt-4" ref={refEmail}>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.email} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className={`pointer-events-none w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${THEME.icon}`} />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={form.email}
                          onChange={onChange}
                          aria-describedby="email-help"
                          className={`w-full block z-[1] pl-11 pr-4 py-3 rounded-xl border-2 ${THEME.ring} focus:bg-white transition
                                      ${fieldErrors.email ? '!border-red-500 bg-red-50' : valid.email ? '!border-green-300 bg-green-50' : '!border-gray-300'}`}
                          placeholder={t.help.emailPlaceholder}
                        />
                      </div>
                      <p id="email-help" className="mt-1 text-xs text-gray-500">
                        {lang === 'en' ? 'We only email for your account & connections. 🤝' : 'On vous écrit seulement pour le compte & les mises en relation. 🤝'}
                      </p>
                      {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
                      <FieldSuccess show={valid.email}>{lang === 'en' ? 'Looks good! 👌' : 'Email au top ! 👌'}</FieldSuccess>
                    </div>

                    {/* Password */}
                    <div className="mt-4" ref={refPwd}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.password} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${THEME.icon}`} />
                        <input
                          name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={onChange}
                          onKeyUp={(e) => setCapsPassword(e.getModifierState('CapsLock'))}
                          autoComplete="new-password"
                          aria-describedby="pwd-hint pwd-meter"
                          className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} focus:bg-white transition ${fieldErrors.password ? 'border-red-500 bg-red-50' : valid.password ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                          placeholder={t.help.minPassword}
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div id="pwd-meter" className="mt-2">
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-2 ${pwdStrength.color} transition-all`} style={{ width: `${pwdStrength.percent}%` }} aria-hidden />
                        </div>
                        <div className="mt-1 text-xs flex items-center justify-between">
                          <span className="text-gray-600">
                            {lang === 'en' ? 'Strength:' : 'Qualité :'} <strong>{lang === 'en' ? pwdStrength.labelEn : pwdStrength.labelFr}</strong>
                          </span>
                          <span className="text-gray-500">
                            {lang === 'en' ? 'Tip: mix A-z, 0-9 & symbols' : 'Astuce : mixez A-z, 0-9 & symboles'}
                          </span>
                        </div>
                        {capsPassword && <p className="text-xs text-orange-600 mt-1">↥ {lang === 'en' ? 'Caps Lock is ON' : 'Verr. Maj activée'}</p>}
                      </div>
                      <FieldSuccess show={valid.password}>{lang === 'en' ? 'Nice password! 🔒' : 'Mot de passe OK ! 🔒'}</FieldSuccess>
                    </div>

                    {/* Contact */}
                    <div className={`mt-5 rounded-xl border ${THEME.border} ${THEME.subtle} p-4`} ref={refPhone}>
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                        <Phone className={`w-4 h-4 mr-2 ${THEME.icon}`} /> {t.phone} / {t.whatsapp}
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">{t.countryCode}</label>
                          <select
                            name="phoneCountryCode" value={form.phoneCountryCode} onChange={onChange}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                          >
                            {countryCodeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t.phone} <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="phone" value={form.phone} onChange={onChange} autoComplete="tel"
                            className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.phone ? 'border-red-500 bg-red-50' : valid.phone ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                            placeholder="612345678"
                          />
                          <FieldSuccess show={valid.phone}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                          <p className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'No spam, ever. 📵' : 'Aucun spam, promis. 📵'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3" ref={refWhats}>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
                          <select
                            name="whatsappCountryCode" value={form.whatsappCountryCode} onChange={onChange}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                          >
                            {countryCodeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t.whatsapp} <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="whatsappNumber" value={form.whatsappNumber} onChange={onChange}
                            className={`w-full px-4 py-2.5 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.whatsappNumber ? 'border-red-500 bg-red-50' : valid.whatsappNumber ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                            placeholder="612345678"
                          />
                          <FieldSuccess show={valid.whatsappNumber}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-600 flex items-center">
                        <Info className="w-3.5 h-3.5 mr-1" />
                        {lang === 'en'
                          ? 'We use your contact only to connect you with people who need help. No spam.'
                          : 'Vos coordonnées servent uniquement à vous mettre en relation avec des personnes à aider. Pas de spam.'}
                      </p>
                    </div>
                  </section>

                  {/* Step 2: Geographic & Experience */}
                  <section className="p-5 sm:p-6 border-t border-gray-50">
                    <SectionHeader icon={<Globe className="w-5 h-5" />} title={t.geoInfo} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div ref={refCountry}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.residenceCountry} <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="currentCountry" value={form.currentCountry} onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.currentCountry ? 'border-red-500' : valid.currentCountry ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                        >
                          <option value="">{lang === 'en' ? 'Select your country' : 'Sélectionnez votre pays'}</option>
                          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FieldSuccess show={valid.currentCountry}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                      </div>

                      <div ref={refPresence}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.presenceCountry} <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="currentPresenceCountry" value={form.currentPresenceCountry} onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.currentPresenceCountry ? 'border-red-500' : valid.currentPresenceCountry ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                        >
                          <option value="">{lang === 'en' ? 'Select your presence country' : 'Sélectionnez votre pays de présence'}</option>
                          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FieldSuccess show={valid.currentPresenceCountry}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div ref={refInterv}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.interventionCountry} <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="interventionCountry" value={form.interventionCountry} onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-white ${THEME.ring} ${fieldErrors.interventionCountry ? 'border-red-500' : valid.interventionCountry ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                        >
                          <option value="">{lang === 'en' ? 'Select your intervention country' : "Sélectionnez votre pays d'intervention"}</option>
                          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FieldSuccess show={valid.interventionCountry}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                      </div>

                      <div ref={refYears}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.yearsAsExpat} <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="yearsAsExpat" type="number" min={1} max={60} value={form.yearsAsExpat || ''} onChange={onChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} ${fieldErrors.yearsAsExpat ? 'border-red-500 bg-red-50' : valid.yearsAsExpat ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                          placeholder="5"
                        />
                        <FieldSuccess show={valid.yearsAsExpat}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                      </div>
                    </div>

                    {/* Languages */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`} ref={refLangs}>
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
                          locale={lang}
                          placeholder={lang === 'fr' ? "Rechercher et sélectionner les langues..." : "Search and select languages..."}
                        />
                      </Suspense>

                      {fieldErrors.languages && <p className="text-sm text-red-600 mt-2">{fieldErrors.languages}</p>}
                      <FieldSuccess show={valid.languages}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                    </div>

                    {/* Bio */}
                    <div className="mt-4" ref={refBio}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.bio} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="bio" rows={5} maxLength={500} value={form.bio} onChange={onChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 hover:bg-white ${THEME.ring} min-h-[120px] ${fieldErrors.bio ? 'border-red-500 bg-red-50' : valid.bio ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                        placeholder={lang === 'en' ? 'In a few lines, share your journey + how you help (friendly + specific).' : 'En quelques lignes, racontez votre parcours + comment vous aidez (sympa & concret).'}
                      />
                      <div className="mt-2">
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-2 ${form.bio.length < 50 ? 'bg-orange-400' : 'bg-green-500'} transition-all`} style={{ width: `${Math.min((form.bio.length / 500) * 100, 100)}%` }} aria-hidden />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className={form.bio.length < 50 ? 'text-orange-600' : 'text-green-600'}>
                            {form.bio.length < 50
                              ? lang === 'en'
                                ? `Just ${50 - form.bio.length} chars to go — you’ve got this! 💪`
                                : `Encore ${50 - form.bio.length} caractères — vous y êtes presque ! 💪`
                              : lang === 'en'
                              ? '✓ Nice! Field validated.'
                              : '✓ Top ! Champ validé.'}
                          </span>
                          <span className={form.bio.length > 450 ? 'text-orange-500' : 'text-gray-500'}>
                            {form.bio.length}/500
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{t.help.bioHint}</p>
                      </div>
                    </div>

                    {/* Photo */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`} ref={refPhoto}>
                      <label className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                        <Camera className={`w-4 h-4 mr-2 ${THEME.icon}`} /> {t.profilePhoto} <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Suspense fallback={<div className="py-6"><div className="h-24 bg-gray-100 animate-pulse rounded-xl" /></div>}>
                        <ImageUploader
                          locale={lang}
                          currentImage={form.profilePhoto}
                          onImageUploaded={(url: string) => {
                            setForm((prev) => ({ ...prev, profilePhoto: url }));
                            // Remonter vers le premier champ manquant après l’upload
                            setTimeout(() => { scrollToFirstIncomplete(); }, 150);
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
                      <FieldSuccess show={valid.profilePhoto}>{lang === 'en' ? 'Nice photo! 📸' : 'Belle photo ! 📸'}</FieldSuccess>
                    </div>
                  </section>

                  {/* Step 3: Help domains */}
                  <section className="p-5 sm:p-6 border-t border-gray-50" ref={refHelp}>
                    <SectionHeader icon={<CheckCircle className="w-5 h-5" />} title={t.helpInfo} />
                    <div className={`rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {t.helpDomains} <span className="text-red-500">*</span>
                      </label>
                      <TagSelector items={form.helpTypes} onRemove={removeHelp} />
                      <select
                        onChange={onHelpSelect} value=""
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-green-600"
                      >
                        <option value="">{t.addHelp}</option>
                        {helpTypeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {fieldErrors.helpTypes && <p className="text-sm text-red-600 mt-2">{fieldErrors.helpTypes}</p>}

                      {showCustomHelp && (
                        <div className="flex gap-2 mt-3">
                          <input
                            value={form.customHelpType}
                            onChange={(e) => setForm((p) => ({ ...p, customHelpType: e.target.value }))}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                            placeholder={t.specifyHelp}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomHelp();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={addCustomHelp}
                            disabled={!form.customHelpType.trim()}
                            className="px-4 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-60"
                          >
                            OK
                          </button>
                        </div>
                      )}

                      <FieldSuccess show={valid.helpTypes}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
                    </div>
                  </section>

                  {/* Terms + Submit */}
                  <section className={`p-5 sm:p-6 border-t border-gray-50 bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradTo}`}>
                    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-md" ref={refCGU}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox" id="acceptTerms" checked={form.acceptTerms}
                          onChange={(e) => setForm((p) => ({ ...p, acceptTerms: e.target.checked }))}
                          className="h-5 w-5 text-emerald-600 border-gray-300 rounded mt-0.5" required
                        />
                        <label htmlFor="acceptTerms" className="text-sm text-gray-800">
                          {lang === 'en' ? 'I accept the' : "J'accepte les"}{' '}
                          <Link to="/cgu-expatries" className="text-emerald-700 underline font-semibold" target="_blank" rel="noopener noreferrer">
                            {lang === 'en' ? 'Expat T&Cs' : 'CGU Expatriés'}
                          </Link>{' '}
                          <span className="text-red-500">*</span>
                        </label>
                      </div>
                      {fieldErrors.acceptTerms && <p className="text-sm text-red-600 mt-2">{fieldErrors.acceptTerms}</p>}
                      <FieldSuccess show={valid.acceptTerms}>{lang === 'en' ? 'Perfect! ✨' : 'Parfait ! ✨'}</FieldSuccess>
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

              {/* Checklist verte en bas */}
              <BottomChecklist
                items={checklist}
                progress={progress}
                lang={lang}
                onJump={(r) => {
                  const el = (r?.current as HTMLElement | null) || null;
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />

              {/* Footer */}
              <footer className="text-center mt-8">
                <div className="bg-white rounded-xl p-5 shadow border">
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-1">{t.footerTitle}</h3>
                  <p className="text-sm text-gray-700">{t.footerText}</p>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                  <Link to="/politique-confidentialite" className="hover:text-emerald-700 underline">
                    {t.privacy}
                  </Link>
                  <Link to="/cgu-expatries" className="hover:text-emerald-700 underline">
                    {t.cguLabel}
                  </Link>
                  <Link to="/centre-aide" className="hover:text-emerald-700 underline">
                    {t.helpLink}
                  </Link>
                  <Link to="/contact" className="hover:text-emerald-700 underline">
                    {t.contact}
                  </Link>
                </div>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default RegisterExpat;
