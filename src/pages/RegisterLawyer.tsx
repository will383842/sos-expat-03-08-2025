// src/pages/RegisterLawyer.tsx
import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Scale, Mail, Lock, Eye, EyeOff, AlertCircle, Globe, Phone,
  CheckCircle, XCircle, Users, Camera, X, ShieldCheck, MapPin, MessageCircle
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { MultiValue } from 'react-select';
import type { Provider } from '../types/provider';

// ===== Lazy (perf) =====
const ImageUploader = lazy(() => import('../components/common/ImageUploader'));
const MultiLanguageSelect = lazy(() => import('../components/forms-data/MultiLanguageSelect'));

// ===== Regex =====
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ===== Theme (indigo/purple) =====
const THEME = {
  gradFrom: 'from-indigo-600',
  gradTo: 'to-purple-600',
  ring: 'focus:border-indigo-600',
  border: 'border-indigo-200',
  icon: 'text-indigo-600',
  chip: 'border-indigo-200',
  subtle: 'bg-indigo-50',
  button: 'from-indigo-600 via-purple-600 to-fuchsia-700',
} as const;

// ===== Country options FR/EN (bilingue) =====
type Duo = { fr: string; en: string };
const COUNTRIES: Duo[] = [
  { fr: 'Afghanistan', en: 'Afghanistan' }, { fr: 'Afrique du Sud', en: 'South Africa' },
  { fr: 'Albanie', en: 'Albania' }, { fr: 'Algérie', en: 'Algeria' }, { fr: 'Allemagne', en: 'Germany' },
  { fr: 'Andorre', en: 'Andorra' }, { fr: 'Angola', en: 'Angola' }, { fr: 'Arabie Saoudite', en: 'Saudi Arabia' },
  { fr: 'Argentine', en: 'Argentina' }, { fr: 'Arménie', en: 'Armenia' }, { fr: 'Australie', en: 'Australia' },
  { fr: 'Autriche', en: 'Austria' }, { fr: 'Azerbaïdjan', en: 'Azerbaijan' }, { fr: 'Bahamas', en: 'Bahamas' },
  { fr: 'Bahreïn', en: 'Bahrain' }, { fr: 'Bangladesh', en: 'Bangladesh' }, { fr: 'Barbade', en: 'Barbados' },
  { fr: 'Belgique', en: 'Belgium' }, { fr: 'Belize', en: 'Belize' }, { fr: 'Bénin', en: 'Benin' },
  { fr: 'Bhoutan', en: 'Bhutan' }, { fr: 'Biélorussie', en: 'Belarus' }, { fr: 'Birmanie', en: 'Myanmar' },
  { fr: 'Bolivie', en: 'Bolivia' }, { fr: 'Bosnie-Herzégovine', en: 'Bosnia and Herzegovina' },
  { fr: 'Botswana', en: 'Botswana' }, { fr: 'Brésil', en: 'Brazil' }, { fr: 'Brunei', en: 'Brunei' },
  { fr: 'Bulgarie', en: 'Bulgaria' }, { fr: 'Burkina Faso', en: 'Burkina Faso' }, { fr: 'Burundi', en: 'Burundi' },
  { fr: 'Cambodge', en: 'Cambodia' }, { fr: 'Cameroun', en: 'Cameroon' }, { fr: 'Canada', en: 'Canada' },
  { fr: 'Cap-Vert', en: 'Cape Verde' }, { fr: 'Chili', en: 'Chile' }, { fr: 'Chine', en: 'China' },
  { fr: 'Chypre', en: 'Cyprus' }, { fr: 'Colombie', en: 'Colombia' }, { fr: 'Comores', en: 'Comoros' },
  { fr: 'Congo', en: 'Congo' }, { fr: 'Corée du Nord', en: 'North Korea' }, { fr: 'Corée du Sud', en: 'South Korea' },
  { fr: 'Costa Rica', en: 'Costa Rica' }, { fr: "Côte d'Ivoire", en: 'Ivory Coast' }, { fr: 'Croatie', en: 'Croatia' },
  { fr: 'Cuba', en: 'Cuba' }, { fr: 'Danemark', en: 'Denmark' }, { fr: 'Djibouti', en: 'Djibouti' },
  { fr: 'Dominique', en: 'Dominica' }, { fr: 'Égypte', en: 'Egypt' }, { fr: 'Émirats arabes unis', en: 'United Arab Emirates' },
  { fr: 'Équateur', en: 'Ecuador' }, { fr: 'Érythrée', en: 'Eritrea' }, { fr: 'Espagne', en: 'Spain' },
  { fr: 'Estonie', en: 'Estonia' }, { fr: 'États-Unis', en: 'United States' }, { fr: 'Éthiopie', en: 'Ethiopia' },
  { fr: 'Fidji', en: 'Fiji' }, { fr: 'Finlande', en: 'Finland' }, { fr: 'France', en: 'France' },
  { fr: 'Autre', en: 'Other' },
];

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
  firstName: string; lastName: string; email: string; password: string;
  phone: string; phoneCountryCode: string;
  whatsappCountryCode: string; whatsappNumber: string;
  currentCountry: string; currentPresenceCountry: string; customCountry: string;
  preferredLanguage: 'fr' | 'en';
  practiceCountries: string[]; customPracticeCountry: string;
  yearsOfExperience: number; specialties: string[]; customSpecialty: string;
  graduationYear: number;
  profilePhoto: string; bio: string;
  educations: string[];
  availability: 'available' | 'busy' | 'offline'; acceptTerms: boolean;
}
interface LanguageOption { value: string; label: string }
interface EmailCheckStatus { isChecking: boolean; isAvailable: boolean | null; hasBeenChecked: boolean; }

// ===== i18n (fun) =====
const I18N = {
  fr: {
    metaTitle: 'Inscription Avocat • SOS Expats',
    metaDesc: 'Rejoignez le réseau SOS Expats : des clients partout, des dossiers malins, et vous aux commandes 🚀.',
    heroTitle: 'Inscription Avocat',
    heroSubtitle: 'Partagez votre expertise avec des expats du monde entier. On s’occupe du reste 😉',
    already: 'Déjà inscrit ?', login: 'Se connecter',
    personalInfo: 'Informations personnelles',
    geoInfo: 'Où vous opérez',
    proInfo: 'Votre pratique',
    acceptTerms: 'J’accepte les', termsLink: 'CGU Avocats',
    create: 'Créer mon compte avocat', loading: 'On prépare tout pour vous… ⏳',
    firstName: 'Prénom', lastName: 'Nom', email: 'Adresse email', password: 'Mot de passe',
    phone: 'Téléphone', whatsapp: 'Numéro WhatsApp',
    countryCode: 'Indicatif pays',
    residenceCountry: 'Pays de résidence', presenceCountry: 'Pays où vous êtes en ce moment',
    yoe: 'Années d’expérience', gradYear: 'Année de diplôme',
    bio: 'Description professionnelle', profilePhoto: 'Photo de profil',
    specialties: 'Spécialités', practiceCountries: 'Pays d’intervention',
    languages: 'Langues parlées',
    formations: 'Formations', addFormation: 'Ajouter une formation',
    addPractice: 'Ajouter un pays d’intervention', addSpecialty: 'Ajouter une spécialité',
    specifyCountry: 'Précisez votre pays', specifyPractice: 'Précisez le pays', specifySpecialty: 'Précisez la spécialité',
    help: {
      minPassword: '6 caractères et c’est parti (aucune contrainte) 💃',
      emailPlaceholder: 'votre@email.com',
      firstNamePlaceholder: 'Comment on vous appelle ? 😊',
      bioHint: 'Racontez en 2–3 phrases comment vous aidez les expats (50 caractères mini).',
    },
    errors: {
      title: 'Petites retouches avant le grand saut ✨',
      firstNameRequired: 'On veut bien vous appeler… mais comment ? 😄',
      lastNameRequired: 'Un petit nom de famille pour faire pro ? 👔',
      emailRequired: 'On a besoin de votre email pour vous tenir au courant 📬',
      emailInvalid: 'Cette adresse a l’air louche… Essayez plutôt nom@exemple.com 🧐',
      emailTaken: 'Oups, cet email est déjà utilisé. Vous avez peut-être déjà un compte ? 🔑',
      passwordTooShort: 'Juste 6 caractères minimum — easy ! 💪',
      phoneRequired: 'On vous sonne où ? 📞',
      whatsappRequired: 'On papote aussi sur WhatsApp ? 💬',
      needCountry: 'Votre pays de résidence, s’il vous plaît 🌍',
      needPresence: 'Où êtes-vous actuellement ? ✈️',
      needPractice: 'Ajoutez au moins un pays d’intervention 🗺️',
      needLang: 'Choisissez au moins une langue 🗣️',
      needSpec: 'Une spécialité, et vous brillez ✨',
      needBio: 'Encore un petit effort : 50 caractères minimum 📝',
      needPhoto: 'Une photo pro, et c’est 100% plus rassurant 📸',
      needEducation: 'Ajoutez au moins une formation 🎓',
      acceptTermsRequired: 'Un petit clic sur les conditions et on y va ✅',
    },
    success: {
      fieldValid: 'Parfait ! ✨',
      emailValid: 'Super email ! 👌',
      pwdOk: 'Mot de passe validé 🔒',
      allGood: 'Tout est bon, prêt·e à rayonner 🌟',
    },
    secureNote: 'Données protégées • Validation sous 24h • Support juridique',
    footerTitle: '⚖️ Rejoignez la communauté SOS Expats',
    footerText: 'Des avocats vérifiés, des clients engagés — let’s go !',
    langPlaceholder: 'Sélectionnez les langues',
    previewTitle: 'Aperçu live du profil',
    previewToggleOpen: 'Masquer l’aperçu',
    previewToggleClose: 'Voir l’aperçu',
  },
  en: {
    metaTitle: 'Lawyer Registration • SOS Expats',
    metaDesc: 'Join SOS Expats: smart clients, smooth cases, and you in the driver’s seat 🚀.',
    heroTitle: 'Lawyer Registration',
    heroSubtitle: 'Share your expertise with expats worldwide. We handle the boring bits 😉',
    already: 'Already registered?', login: 'Log in',
    personalInfo: 'Personal info', geoInfo: 'Where you operate', proInfo: 'Your practice',
    acceptTerms: 'I accept the', termsLink: 'Lawyers T&Cs',
    create: 'Create my lawyer account', loading: 'Getting things ready for you… ⏳',
    firstName: 'First Name', lastName: 'Last Name', email: 'Email', password: 'Password',
    phone: 'Phone', whatsapp: 'WhatsApp Number',
    countryCode: 'Country code',
    residenceCountry: 'Country of residence', presenceCountry: 'Where you are right now',
    yoe: 'Years of experience', gradYear: 'Graduation year',
    bio: 'Professional bio', profilePhoto: 'Profile photo',
    specialties: 'Specialties', practiceCountries: 'Practice countries',
    languages: 'Spoken languages',
    formations: 'Education', addFormation: 'Add a formation',
    addPractice: 'Add a practice country', addSpecialty: 'Add a specialty',
    specifyCountry: 'Specify your country', specifyPractice: 'Specify the country', specifySpecialty: 'Specify the specialty',
    help: {
      minPassword: '6+ characters and you’re good 💃',
      emailPlaceholder: 'you@example.com',
      firstNamePlaceholder: 'How should we call you? 😊',
      bioHint: 'In 2–3 lines, tell expats how you help (min 50 chars).',
    },
    errors: {
      title: 'Tiny tweaks before we launch ✨',
      firstNameRequired: 'We’d love to address you… what’s your name? 😄',
      lastNameRequired: 'A last name keeps it professional 👔',
      emailRequired: 'We need your email to keep you posted 📬',
      emailInvalid: 'That email looks off. Try name@example.com 🧐',
      emailTaken: 'This email is already in use. Maybe you already have an account? 🔑',
      passwordTooShort: 'At least 6 characters — easy peasy! 💪',
      phoneRequired: 'Where can we call you? 📞',
      whatsappRequired: 'WhatsApp number please? 💬',
      needCountry: 'Your residence country, please 🌍',
      needPresence: 'Where are you at the moment? ✈️',
      needPractice: 'Add at least one practice country 🗺️',
      needLang: 'Pick at least one language 🗣️',
      needSpec: 'Choose at least one specialty ✨',
      needBio: 'Push it to 50 characters, you got this 📝',
      needPhoto: 'A professional photo builds trust 📸',
      needEducation: 'Add at least one formation 🎓',
      acceptTermsRequired: 'Tick the box and we’re rolling ✅',
    },
    success: {
      fieldValid: 'Looks great! ✨',
      emailValid: 'Nice email! 👌',
      pwdOk: 'Password good to go 🔒',
      allGood: 'All set — time to shine 🌟',
    },
    secureNote: 'Data protected • 24h validation • Legal support',
    footerTitle: '⚖️ Join the SOS Expats community',
    footerText: 'Verified lawyers, great clients — let’s go!',
    langPlaceholder: 'Select languages',
    previewTitle: 'Live profile preview',
    previewToggleOpen: 'Hide preview',
    previewToggleClose: 'Show preview',
  },
} as const;

const mapDuo = (list: Duo[], lang: 'fr' | 'en') => list.map((item) => item[lang]);

/* ========= Mini composants feedback ========= */
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
    <div className="mt-1 flex items-center gap-1 text-sm text-green-600 bg-green-50 rounded-lg px-2 py-1">
      <CheckCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
});
FieldSuccess.displayName = 'FieldSuccess';

/* ========= Avatar + Preview ========= */
const Avatar = ({ src, name }: { src?: string; name: string }) => {
  if (src) return <img src={src} alt={name} className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-200" />;
  const initials = name.split(' ').map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join('') || '🙂';
  return (
    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-bold ring-2 ring-indigo-200">
      {initials}
    </div>
  );
};

const LawyerPreviewCard = ({
  lang, t, progress, fullName, photo,
  currentCountry, presenceCountry,
  practiceCountries, specialties, languages, whatsapp, yearsOfExperience,
}: {
  lang: 'fr' | 'en'; t: typeof I18N['fr']; progress: number; fullName: string; photo?: string;
  currentCountry?: string; presenceCountry?: string;
  practiceCountries: string[]; specialties: string[]; languages: string[]; whatsapp?: string; yearsOfExperience?: number;
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Avatar src={photo} name={fullName} />
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{fullName || (lang === 'en' ? 'Your Name' : 'Votre nom')}</h3>
          <p className="text-xs text-gray-500">
            {lang === 'en' ? 'Lawyer' : 'Avocat'} • {progress}% {lang === 'en' ? 'complete' : 'complet'}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-indigo-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
        {(currentCountry || presenceCountry) && (
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span className="font-medium">{currentCountry || (lang === 'en' ? 'Residence' : 'Résidence')}</span>
            {presenceCountry && (
              <span className="ml-auto rounded-full px-2 py-0.5 text-xs bg-indigo-50 border border-indigo-200">
                {presenceCountry}
              </span>
            )}
          </div>
        )}
        {typeof yearsOfExperience === 'number' && yearsOfExperience >= 0 && (
          <div className="text-gray-700">
            {lang === 'en' ? 'Experience:' : 'Expérience :'} <strong>{yearsOfExperience}</strong> {lang === 'en' ? 'years' : 'ans'}
          </div>
        )}
      </div>

      {!!languages.length && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">{lang === 'en' ? 'Languages' : 'Langues'}</p>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <span key={l} className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs border border-indigo-200">{l.toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}

      {!!specialties.length && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">{t.specialties}</p>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <span key={`${s}-${i}`} className="px-2 py-1 rounded-lg bg-white text-gray-800 text-xs border border-indigo-200">{s}</span>
            ))}
          </div>
        </div>
      )}

      {!!practiceCountries.length && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">{t.practiceCountries}</p>
          <div className="flex flex-wrap gap-2">
            {practiceCountries.map((c, i) => (
              <span key={`${c}-${i}`} className="px-2 py-1 rounded-lg bg-white text-gray-800 text-xs border border-indigo-200">{c}</span>
            ))}
          </div>
        </div>
      )}

      {whatsapp && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <MessageCircle className="w-4 h-4 text-indigo-600" />
          <span className="truncate">{whatsapp}</span>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">{lang === 'en' ? 'This is what clients will see. Make it shine ✨' : 'Ce que les clients verront. Faites briller votre profil ✨'}</p>
    </div>
  );
};

/* ========= Helpers ========= */
const computePasswordStrength = (pw: string) => {
  if (!pw) return { percent: 0, labelFr: '', labelEn: '', color: 'bg-gray-300' };
  let score = 0;
  if (pw.length >= 6) score += 30;
  if (pw.length >= 8) score += 20;
  if (pw.length >= 10) score += 15;
  if (pw.length >= 12) score += 15;
  if (/[a-z]/.test(pw)) score += 5;
  if (/[A-Z]/.test(pw)) score += 5;
  if (/\d/.test(pw)) score += 5;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 5;
  const clamp = Math.min(100, score);
  let labelFr = 'Excellent 🚀', labelEn = 'Excellent 🚀', color = 'bg-green-500';
  if (pw.length < 6) { labelFr = 'Trop court 😅'; labelEn = 'Too short 😅'; color = 'bg-red-500'; }
  else if (clamp < 40) { labelFr = 'Faible 🙂'; labelEn = 'Weak 🙂'; color = 'bg-orange-500'; }
  else if (clamp < 55) { labelFr = 'Moyen 👍'; labelEn = 'Medium 👍'; color = 'bg-yellow-500'; }
  else if (clamp < 70) { labelFr = 'Bon 🔥'; labelEn = 'Good 🔥'; color = 'bg-blue-500'; }
  return { percent: clamp, labelFr, labelEn, color };
};

const TagSelector = React.memo(
  ({ items, onRemove, color = 'indigo' }: { items: string[]; onRemove: (v: string) => void; color?: 'indigo' | 'green' }) => {
    if (!items.length) return null;
    const tone = color === 'green' ? 'bg-green-100 text-green-800 border-green-300' : `bg-indigo-100 text-indigo-800 ${THEME.chip}`;
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
    return typeof o.id === 'string' && typeof o.name === 'string' && (o.type === 'lawyer' || o.type === 'expat');
  }

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    const rawState: unknown = location.state;
    const state = (rawState ?? null) as NavState | null;
    const sp = state?.selectedProvider;
    if (isProviderLike(sp)) {
      try { sessionStorage.setItem('selectedProvider', JSON.stringify(sp)); } catch {}
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
  const initial: LawyerFormData = {
    firstName: '', lastName: '', email: '', password: '',
    phone: '', phoneCountryCode: '+33',
    whatsappCountryCode: '+33', whatsappNumber: '',
    currentCountry: '', currentPresenceCountry: '', customCountry: '',
    preferredLanguage: lang,
    practiceCountries: [], customPracticeCountry: '',
    yearsOfExperience: 0, specialties: [], customSpecialty: '',
    graduationYear: new Date().getFullYear() - 5,
    profilePhoto: '', bio: '',
    educations: [''],
    availability: 'available', acceptTerms: false,
  };

  const [form, setForm] = useState<LawyerFormData>(initial);
  const [selectedLanguages, setSelectedLanguages] = useState<MultiValue<LanguageOption>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [capsPassword, setCapsPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [showCustomSpecialty, setShowCustomSpecialty] = useState(false);

  // Preview (mobile toggle)
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // Refs
  const fieldRefs = {
    firstName: useRef<HTMLInputElement | null>(null),
    lastName: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    password: useRef<HTMLInputElement | null>(null),
    phone: useRef<HTMLInputElement | null>(null),
    whatsappNumber: useRef<HTMLInputElement | null>(null),
    currentCountry: useRef<HTMLSelectElement | null>(null),
    currentPresenceCountry: useRef<HTMLSelectElement | null>(null),
    bio: useRef<HTMLTextAreaElement | null>(null),
  };

  // Email status
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>({ isChecking: false, isAvailable: null, hasBeenChecked: false });
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<number | null>(null);
  useEffect(() => () => { if (emailCheckTimeout) window.clearTimeout(emailCheckTimeout); }, [emailCheckTimeout]);

  // ---- Options (bilingue) ----
  const countryOptions = useMemo(() => mapDuo(COUNTRIES, lang), [lang]);
  const specialtyOptions = useMemo(() => mapDuo(SPECIALTIES, lang), [lang]);
  const countryCodeOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ value: c.code, label: `${c.flag} ${c.code} (${lang === 'en' ? c.en : c.fr})` })),
    [lang]
  );

  // ---- Password strength ----
  const pwdStrength = useMemo(() => computePasswordStrength(form.password), [form.password]);

  // ---- Progress ----
  const progress = useMemo(() => {
    const fields = [
      !!form.firstName, !!form.lastName,
      EMAIL_REGEX.test(form.email) && emailStatus.isAvailable !== false,
      form.password.length >= 6,
      !!form.phone, !!form.whatsappNumber,
      !!form.currentCountry, !!form.currentPresenceCountry,
      form.bio.trim().length >= 50,
      !!form.profilePhoto,
      form.specialties.length > 0,
      form.practiceCountries.length > 0,
      (selectedLanguages as LanguageOption[]).length > 0,
      form.educations.some((e) => e.trim().length > 0),
      form.acceptTerms,
    ];
    const done = fields.filter(Boolean).length;
    return Math.round((done / fields.length) * 100);
  }, [form, selectedLanguages, emailStatus]);

  // ---- Email uniqueness (Firestore) ----
  const checkEmailAvailability = useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(clean)) return false;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', clean));
    const snap = await getDocs(q);
    return snap.empty;
  }, []);

  const handleEmailCheck = useCallback(
    (email: string) => {
      if (emailCheckTimeout) window.clearTimeout(emailCheckTimeout);
      if (!email || !EMAIL_REGEX.test(email)) {
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
      }, 650);
      setEmailCheckTimeout(to);
    },
    [emailCheckTimeout, checkEmailAvailability]
  );

  // ---- Classes ----
  const baseInput = 'block w-full min-h-[44px] px-4 py-3 rounded-xl border transition-all duration-200 text-sm focus:outline-none';
  const getInputClassName = useCallback((name: string, hasIcon = false) => {
    const hasErr = !!fieldErrors[name] && !!touched[name];
    const ok = !fieldErrors[name] && !!touched[name];
    let cl = baseInput + (hasIcon ? ' pl-11' : '');
    if (hasErr) cl += ' bg-red-50/50 border-red-300 focus:ring-4 focus:ring-red-500/20 focus:border-red-500';
    else if (ok) cl += ' bg-green-50/50 border-green-300 focus:ring-4 focus:ring-green-500/20 focus:border-green-500';
    else cl += ` bg-white/90 border-gray-300 ${THEME.ring} hover:border-indigo-400`;
    return cl;
  }, [fieldErrors, touched]);

  // ---- Touch / Change ----
  const markTouched = (name: string) => setTouched((p) => ({ ...p, [name]: true }));

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = e.target as HTMLInputElement;
      setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value }));

      if (name === 'email') handleEmailCheck(value);
      if (name === 'currentCountry') {
        const other = lang === 'en' ? 'Other' : 'Autre';
        setShowCustomCountry(value === other);
      }
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const rest = { ...prev }; delete rest[name]; return rest;
        });
      }
    },
    [fieldErrors, handleEmailCheck, lang]
  );

  // ---- Sélections multi (pays de pratique / spécialités) ----
  const onPracticeSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (!v) return;
    const other = lang === 'en' ? 'Other' : 'Autre';
    if (v === other) { setShowCustomCountry(true); e.target.value = ''; return; }
    if (!form.practiceCountries.includes(v)) {
      setForm((prev) => ({ ...prev, practiceCountries: [...prev.practiceCountries, v] }));
      setFieldErrors((prev) => ({ ...prev, practiceCountries: '' }));
    }
    e.target.value = '';
  }, [form.practiceCountries, lang]);

  const removePractice = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, practiceCountries: prev.practiceCountries.filter((x) => x !== v) }));
  }, []);

  const addCustomPractice = useCallback(() => {
    const v = form.customPracticeCountry.trim();
    if (v && !form.practiceCountries.includes(v)) {
      setForm((prev) => ({ ...prev, practiceCountries: [...prev.practiceCountries, v], customPracticeCountry: '' }));
      setShowCustomCountry(false);
      setFieldErrors((prev) => ({ ...prev, practiceCountries: '' }));
    }
  }, [form.customPracticeCountry, form.practiceCountries]);

  const onSpecialtySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (!v) return;
    const other = lang === 'en' ? 'Other' : 'Autre';
    if (v === other) { setShowCustomSpecialty(true); e.target.value = ''; return; }
    if (!form.specialties.includes(v)) {
      setForm((prev) => ({ ...prev, specialties: [...prev.specialties, v] }));
      setFieldErrors((prev) => ({ ...prev, specialties: '' }));
    }
    e.target.value = '';
  }, [form.specialties, lang]);

  const removeSpecialty = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, specialties: prev.specialties.filter((x) => x !== v) }));
  }, []);

  const addCustomSpecialty = useCallback(() => {
    const v = form.customSpecialty.trim();
    if (v && !form.specialties.includes(v)) {
      setForm((prev) => ({ ...prev, specialties: [...prev.specialties, v], customSpecialty: '' }));
      setShowCustomSpecialty(false);
      setFieldErrors((prev) => ({ ...prev, specialties: '' }));
    }
  }, [form.customSpecialty, form.specialties]);

  // Formations dynamiques
  const updateEducation = useCallback((idx: number, val: string) => {
    setForm((p) => { const arr = [...p.educations]; arr[idx] = val; return { ...p, educations: arr }; });
    setFieldErrors((prev) => ({ ...prev, educations: '' }));
  }, []);
  const addEducationField = useCallback(() => setForm((p) => ({ ...p, educations: [...p.educations, ''] })), []);
  const removeEducationField = useCallback((idx: number) => {
    setForm((p) => {
      const arr = p.educations.filter((_, i) => i !== idx);
      return { ...p, educations: arr.length ? arr : [''] };
    });
  }, []);

  // ---- Validation complète ----
  const validateAll = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = t.errors.firstNameRequired;
    if (!form.lastName.trim()) e.lastName = t.errors.lastNameRequired;

    if (!form.email.trim()) e.email = t.errors.emailRequired;
    else if (!EMAIL_REGEX.test(form.email)) e.email = t.errors.emailInvalid;
    else if (emailStatus.isAvailable === false) e.email = t.errors.emailTaken;

    if (!form.password || form.password.length < 6) e.password = t.errors.passwordTooShort;

    if (!form.phone.trim()) e.phone = t.errors.phoneRequired;
    if (!form.whatsappNumber.trim()) e.whatsappNumber = t.errors.whatsappRequired;
    if (!form.currentCountry) e.currentCountry = t.errors.needCountry;
    if (!form.currentPresenceCountry) e.currentPresenceCountry = t.errors.needPresence;

    if (form.practiceCountries.length === 0) e.practiceCountries = t.errors.needPractice;
    if (form.specialties.length === 0) e.specialties = t.errors.needSpec;
    if ((selectedLanguages as LanguageOption[]).length === 0) e.languages = t.errors.needLang;

    if (!form.bio.trim() || form.bio.trim().length < 50) e.bio = t.errors.needBio;
    if (!form.profilePhoto) e.profilePhoto = t.errors.needPhoto;
    if (!form.educations.some((v) => v.trim().length > 0)) e.educations = t.errors.needEducation;
    if (!form.acceptTerms) e.acceptTerms = t.errors.acceptTermsRequired;

    setFieldErrors(e);

    const order = ['firstName','lastName','email','password','phone','whatsappNumber','currentCountry','currentPresenceCountry','bio'];
    const firstKey = order.find((k) => e[k]);
    if (firstKey && fieldRefs[firstKey as keyof typeof fieldRefs]?.current) {
      fieldRefs[firstKey as keyof typeof fieldRefs]!.current!.focus();
      window.scrollTo({ top: (fieldRefs[firstKey as keyof typeof fieldRefs]!.current!.getBoundingClientRect().top + window.scrollY - 120), behavior: 'smooth' });
    }

    return Object.keys(e).length === 0;
  }, [form, selectedLanguages, emailStatus, t]);

  // ---- Missing checklist (UX clair) ----
  const missing = useMemo(() => {
    const langs = (selectedLanguages as LanguageOption[]).length > 0;
    return [
      { key: 'firstName', ok: !!form.firstName, labelFr: 'Prénom', labelEn: 'First name' },
      { key: 'lastName', ok: !!form.lastName, labelFr: 'Nom', labelEn: 'Last name' },
      { key: 'email', ok: EMAIL_REGEX.test(form.email) && emailStatus.isAvailable !== false, labelFr: 'Email valide', labelEn: 'Valid email' },
      { key: 'password', ok: form.password.length >= 6, labelFr: 'Mot de passe (≥ 6 caractères)', labelEn: 'Password (≥ 6 chars)' },
      { key: 'phone', ok: !!form.phone, labelFr: 'Téléphone', labelEn: 'Phone' },
      { key: 'whatsappNumber', ok: !!form.whatsappNumber, labelFr: 'WhatsApp', labelEn: 'WhatsApp' },
      { key: 'currentCountry', ok: !!form.currentCountry, labelFr: 'Pays de résidence', labelEn: 'Residence country' },
      { key: 'currentPresenceCountry', ok: !!form.currentPresenceCountry, labelFr: 'Pays de présence', labelEn: 'Presence country' },
      { key: 'practiceCountries', ok: form.practiceCountries.length > 0, labelFr: "Au moins un pays d'intervention", labelEn: 'At least one practice country' },
      { key: 'languages', ok: langs, labelFr: 'Au moins une langue', labelEn: 'At least one language' },
      { key: 'specialties', ok: form.specialties.length > 0, labelFr: 'Au moins une spécialité', labelEn: 'At least one specialty' },
      { key: 'bio', ok: form.bio.trim().length >= 50, labelFr: 'Bio (≥ 50 caractères)', labelEn: 'Bio (≥ 50 chars)' },
      { key: 'profilePhoto', ok: !!form.profilePhoto, labelFr: 'Photo de profil', labelEn: 'Profile photo' },
      { key: 'educations', ok: form.educations.some((v) => v.trim().length > 0), labelFr: 'Au moins une formation', labelEn: 'At least one education' },
      { key: 'acceptTerms', ok: !!form.acceptTerms, labelFr: 'Accepter les CGU', labelEn: 'Accept T&Cs' },
    ];
  }, [form, selectedLanguages, emailStatus]);

  const focusFirstMissingField = useCallback(() => {
    const first = missing.find((m) => !m.ok);
    if (!first) return;
    const ref = fieldRefs[first.key as keyof typeof fieldRefs]?.current as HTMLElement | undefined;
    if (ref) {
      ref.focus();
      window.scrollTo({
        top: ref.getBoundingClientRect().top + window.scrollY - 120,
        behavior: 'smooth',
      });
    }
  }, [missing]);

  // ---- Submit ----
  const handleSubmit = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched((prev) => ({
      ...prev,
      firstName: true, lastName: true, email: true, password: true, phone: true, whatsappNumber: true,
      currentCountry: true, currentPresenceCountry: true, bio: true, acceptTerms: true
    }));
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!validateAll()) { setIsSubmitting(false); return; }

    try {
      const languageCodes = (selectedLanguages as LanguageOption[]).map((l) => l.value);
      const other = lang === 'en' ? 'Other' : 'Autre';
      const userData = {
        role: 'lawyer' as const,
        type: 'lawyer' as const,
        email: form.email.trim().toLowerCase(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phoneCountryCode + form.phone.trim(),
        whatsapp: form.whatsappCountryCode + form.whatsappNumber.trim(),
        phoneCountryCode: form.phoneCountryCode,
        whatsappCountryCode: form.whatsappCountryCode,
        whatsappNumber: form.whatsappNumber.trim(),
        currentCountry: form.currentCountry === other ? form.customCountry : form.currentCountry,
        currentPresenceCountry: form.currentPresenceCountry,
        country: form.currentPresenceCountry,
        practiceCountries: form.practiceCountries,
        profilePhoto: form.profilePhoto,
        photoURL: form.profilePhoto,
        avatar: form.profilePhoto,
        languages: languageCodes,
        languagesSpoken: languageCodes,
        specialties: form.specialties, // <= specialties bien envoyées ✅
        education: form.educations.map((e) => e.trim()).filter(Boolean),
        yearsOfExperience: form.yearsOfExperience,
        graduationYear: form.graduationYear,
        bio: form.bio.trim(),
        description: form.bio.trim(),
        availability: form.availability,
        isOnline: form.availability === 'available',
        isApproved: false,
        isVisible: true,
        isActive: true,
        rating: 4.5,
        reviewCount: 0,
        preferredLanguage: form.preferredLanguage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await register(userData, form.password);
      navigate(redirect, {
        replace: true,
        state: { message: lang === 'en' ? 'Registration successful! Your profile will be validated within 24h.' : 'Inscription réussie ! Votre profil sera validé sous 24h.', type: 'success' },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setFieldErrors((prev) => ({ ...prev, general: msg }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateAll, register, form, selectedLanguages, navigate, redirect, lang]);

  // ---- Can submit ----
  const canSubmit = useMemo(() => {
    return !!form.firstName &&
      !!form.lastName &&
      EMAIL_REGEX.test(form.email) &&
      form.password.length >= 6 &&
      !!form.phone &&
      !!form.whatsappNumber &&
      !!form.currentCountry &&
      !!form.currentPresenceCountry &&
      form.bio.trim().length >= 50 &&
      !!form.profilePhoto &&
      form.specialties.length > 0 &&
      form.practiceCountries.length > 0 &&
      (selectedLanguages as LanguageOption[]).length > 0 &&
      form.educations.some((e) => e.trim().length > 0) &&
      form.acceptTerms &&
      emailStatus.isAvailable !== false &&
      !isLoading && !isSubmitting;
  }, [form, selectedLanguages, emailStatus, isLoading, isSubmitting]);

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

        <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {(error || fieldErrors.general) && (
            <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4 mb-5" role="alert" aria-live="polite">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-red-800">{t.errors.title}</h3>
                  <p className="mt-1 text-sm text-red-700">{error || fieldErrors.general}</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mb-6 max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Progression</span>
              <span className="text-sm font-bold text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Layout: Preview + Form */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-6">
            {/* Mobile preview toggle */}
            <div className="mb-4 lg:hidden">
              <button
                type="button"
                onClick={() => setIsPreviewOpen((s) => !s)}
                className="w-full text-sm font-semibold px-4 py-2 rounded-xl border border-indigo-200 bg-white shadow-sm"
              >
                {isPreviewOpen ? t.previewToggleOpen : t.previewToggleClose}
              </button>
            </div>

            {/* PREVIEW (sticky on desktop) */}
            <aside className={`${isPreviewOpen ? 'block' : 'hidden'} lg:block lg:col-span-1 lg:order-last lg:sticky lg:top-6 mb-6`}>
              <h3 className="sr-only">{t.previewTitle}</h3>
              <LawyerPreviewCard
                lang={lang}
                t={t}
                progress={progress}
                fullName={`${form.firstName || (lang === 'en' ? 'First' : 'Prénom')} ${form.lastName || (lang === 'en' ? 'Last' : 'Nom')}`.trim()}
                photo={form.profilePhoto}
                currentCountry={form.currentCountry}
                presenceCountry={form.currentPresenceCountry}
                practiceCountries={form.practiceCountries}
                specialties={form.specialties}
                languages={(selectedLanguages as LanguageOption[]).map((l) => l.value)}
                whatsapp={`${form.whatsappCountryCode} ${form.whatsappNumber}`.trim()}
                yearsOfExperience={form.yearsOfExperience}
              />
            </aside>

            {/* FORM */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <form onSubmit={handleSubmit} noValidate>
                  {/* Personal */}
                  <section className="p-5 sm:p-6">
                    <SectionHeader icon={<Users className="w-5 h-5" />} title={t.personalInfo} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.firstName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="firstName" name="firstName" ref={fieldRefs.firstName}
                          value={form.firstName} onChange={onChange} onBlur={() => markTouched('firstName')}
                          autoComplete="given-name"
                          className={getInputClassName('firstName')}
                          placeholder={t.help.firstNamePlaceholder}
                          aria-describedby="firstName-error firstName-success"
                        />
                        <FieldError error={fieldErrors.firstName} show={!!(fieldErrors.firstName && touched.firstName)} />
                        <FieldSuccess show={!fieldErrors.firstName && !!touched.firstName && !!form.firstName} message={t.success.fieldValid} />
                      </div>

                      <div>
                        <label htmlFor="lastName" className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.lastName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="lastName" name="lastName" ref={fieldRefs.lastName}
                          value={form.lastName} onChange={onChange} onBlur={() => markTouched('lastName')}
                          autoComplete="family-name"
                          className={getInputClassName('lastName')}
                          placeholder={lang === 'en' ? 'Doe' : 'Dupont'}
                        />
                        <FieldError error={fieldErrors.lastName} show={!!(fieldErrors.lastName && touched.lastName)} />
                        <FieldSuccess show={!fieldErrors.lastName && !!touched.lastName && !!form.lastName} message={t.success.fieldValid} />
                      </div>
                    </div>

                    {/* EMAIL — clics & saisie fiables */}
                    <div className="mt-4">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.email} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className={`pointer-events-none w-5 h-5 absolute left-3 top-3.5 ${THEME.icon}`} />
                        <input
                          id="email" name="email" ref={fieldRefs.email}
                          type="email" autoComplete="email"
                          value={form.email}
                          onChange={onChange}
                          onBlur={(e) => { markTouched('email'); handleEmailCheck(e.target.value); }}
                          placeholder={t.help.emailPlaceholder}
                          aria-describedby="email-help email-status"
                          className={`${getInputClassName('email', true)} relative z-10`}
                        />
                      </div>
                      <p id="email-help" className="mt-1 text-xs text-gray-500">
                        {lang === 'en' ? 'We only email you for account & bookings. 🤝' : 'On vous écrit seulement pour le compte & les réservations. 🤝'}
                      </p>
                      {emailStatus.isChecking && (
                        <p id="email-status" className="mt-1 text-sm text-indigo-700" aria-live="polite">
                          {lang === 'en' ? 'Checking email…' : 'Vérification de l’email…'}
                        </p>
                      )}
                      {emailStatus.hasBeenChecked && emailStatus.isAvailable && EMAIL_REGEX.test(form.email) && (
                        <p id="email-status" className="mt-1 text-sm text-green-600" aria-live="polite">
                          <CheckCircle className="inline w-4 h-4 mr-1" /> {lang === 'en' ? 'Email available' : 'Email disponible'}
                        </p>
                      )}
                      {emailStatus.hasBeenChecked && emailStatus.isAvailable === false && (
                        <p id="email-status" className="mt-1 text-sm text-red-600" aria-live="polite">
                          <XCircle className="inline w-4 h-4 mr-1" /> {lang === 'en' ? 'This email is already in use' : 'Cet email est déjà utilisé'}
                        </p>
                      )}
                      <FieldError
                        error={fieldErrors.email || (!EMAIL_REGEX.test(form.email) && touched.email ? t.errors.emailInvalid : undefined)}
                        show={!!(touched.email && (!!fieldErrors.email || !EMAIL_REGEX.test(form.email)))}
                      />
                      <FieldSuccess
                        show={!!touched.email && EMAIL_REGEX.test(form.email) && emailStatus.isAvailable !== false}
                        message={t.success.emailValid}
                      />
                    </div>

                    {/* PASSWORD */}
                    <div className="mt-4">
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.password} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className={`pointer-events-none w-5 h-5 absolute left-3 top-3.5 ${THEME.icon}`} />
                        <input
                          id="password" name="password" ref={fieldRefs.password}
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={onChange}
                          onBlur={() => markTouched('password')}
                          onKeyUp={(e) => setCapsPassword((e as any).getModifierState?.('CapsLock'))}
                          autoComplete="new-password"
                          placeholder={t.help.minPassword}
                          aria-describedby="pwd-hint pwd-meter"
                          className={`${getInputClassName('password', true)} pr-11`}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95 transition-all"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? (lang === 'en' ? 'Hide password' : 'Masquer le mot de passe') : (lang === 'en' ? 'Show password' : 'Afficher le mot de passe')}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {form.password.length > 0 && (
                        <div id="pwd-meter" className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{lang === 'en' ? 'Your password strength' : 'Force de votre mot de passe'}</span>
                            <span className="font-medium">{lang === 'en' ? pwdStrength.labelEn : pwdStrength.labelFr}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${pwdStrength.color}`} style={{ width: `${pwdStrength.percent}%` }} />
                          </div>
                          {capsPassword && <p className="text-xs text-orange-600 mt-1">↥ {lang === 'en' ? 'Caps Lock is ON' : 'Verr. Maj activée'}</p>}
                        </div>
                      )}
                      <FieldError error={fieldErrors.password} show={!!(fieldErrors.password && touched.password)} />
                      <FieldSuccess show={!fieldErrors.password && !!touched.password && form.password.length >= 6} message={t.success.pwdOk} />
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
                            name="phoneCountryCode" value={form.phoneCountryCode} onChange={onChange}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
                          >
                            {countryCodeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
                            {t.phone} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="phone" name="phone" ref={fieldRefs.phone}
                            value={form.phone} onChange={onChange} onBlur={() => markTouched('phone')}
                            autoComplete="tel"
                            className={getInputClassName('phone')}
                            placeholder="612345678"
                          />
                          <FieldError error={fieldErrors.phone} show={!!(fieldErrors.phone && touched.phone)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
                          <select
                            name="whatsappCountryCode" value={form.whatsappCountryCode} onChange={onChange}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
                          >
                            {countryCodeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="whatsappNumber" className="block text-xs font-medium text-gray-700 mb-1">
                            {t.whatsapp} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="whatsappNumber" name="whatsappNumber" ref={fieldRefs.whatsappNumber}
                            value={form.whatsappNumber} onChange={onChange} onBlur={() => markTouched('whatsappNumber')}
                            className={getInputClassName('whatsappNumber')}
                            placeholder="612345678"
                          />
                          <FieldError error={fieldErrors.whatsappNumber} show={!!(fieldErrors.whatsappNumber && touched.whatsappNumber)} />
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-600 flex items-center">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-600" />
                        {lang === 'en'
                          ? 'We use your contact only to connect you with clients. No spam.'
                          : 'Vos coordonnées servent uniquement aux mises en relation. Jamais de spam.'}
                      </p>
                    </div>
                  </section>

                  {/* Geographic */}
                  <section className="p-5 sm:p-6 border-t border-gray-50">
                    <SectionHeader icon={<Globe className="w-5 h-5" />} title={t.geoInfo} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="currentCountry" className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.residenceCountry} <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="currentCountry" name="currentCountry" ref={fieldRefs.currentCountry}
                          value={form.currentCountry} onChange={onChange} onBlur={() => markTouched('currentCountry')}
                          className={getInputClassName('currentCountry')}
                        >
                          <option value="">{lang === 'en' ? 'Select your country' : 'Sélectionnez votre pays'}</option>
                          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {showCustomCountry && (
                          <div className="mt-3">
                            <input
                              name="customCountry" value={form.customCountry} onChange={onChange}
                              className={`${baseInput} border-gray-300`}
                              placeholder={t.specifyCountry}
                            />
                          </div>
                        )}
                        <FieldError error={fieldErrors.currentCountry} show={!!(fieldErrors.currentCountry && touched.currentCountry)} />
                      </div>
                      <div>
                        <label htmlFor="currentPresenceCountry" className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.presenceCountry} <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="currentPresenceCountry" name="currentPresenceCountry" ref={fieldRefs.currentPresenceCountry}
                          value={form.currentPresenceCountry} onChange={onChange} onBlur={() => markTouched('currentPresenceCountry')}
                          className={getInputClassName('currentPresenceCountry')}
                        >
                          <option value="">{lang === 'en' ? 'Select your presence country' : 'Sélectionnez votre pays de présence'}</option>
                          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <FieldError error={fieldErrors.currentPresenceCountry} show={!!(fieldErrors.currentPresenceCountry && touched.currentPresenceCountry)} />
                      </div>
                    </div>

                    {/* practice countries */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {t.practiceCountries} <span className="text-red-500">*</span>
                      </label>
                      <TagSelector items={form.practiceCountries} onRemove={removePractice} color="green" />
                      <select
                        onChange={onPracticeSelect} value=""
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-green-600"
                      >
                        <option value="">{t.addPractice}</option>
                        {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        <option value={lang === 'en' ? 'Other' : 'Autre'}>{lang === 'en' ? 'Other' : 'Autre'}</option>
                      </select>
                      {showCustomCountry && (
                        <div className="flex gap-2 mt-3">
                          <input
                            value={form.customPracticeCountry}
                            onChange={(e) => setForm((p) => ({ ...p, customPracticeCountry: e.target.value }))}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                            placeholder={t.specifyPractice}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomPractice(); } }}
                          />
                          <button type="button" onClick={addCustomPractice} disabled={!form.customPracticeCountry.trim()} className="px-4 py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-60">
                            OK
                          </button>
                        </div>
                      )}
                      <FieldError error={fieldErrors.practiceCountries} show={!!fieldErrors.practiceCountries} />
                    </div>
                  </section>

                  {/* Professional */}
                  <section className="p-5 sm:p-6 border-t border-gray-50">
                    <SectionHeader icon={<Scale className="w-5 h-5" />} title={t.proInfo} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="yearsOfExperience" className="block text-sm font-semibold text-gray-800 mb-1">{t.yoe}</label>
                        <input
                          id="yearsOfExperience" name="yearsOfExperience" type="number"
                          value={form.yearsOfExperience} onChange={onChange}
                          className={`${baseInput} bg-gray-50 hover:bg-white border-gray-200`}
                          min={0} max={60}
                        />
                      </div>
                      <div>
                        <label htmlFor="graduationYear" className="block text-sm font-semibold text-gray-800 mb-1">{t.gradYear}</label>
                        <input
                          id="graduationYear" name="graduationYear" type="number"
                          value={form.graduationYear} onChange={onChange}
                          className={`${baseInput} bg-gray-50 hover:bg-white border-gray-200`}
                          min={1980} max={new Date().getFullYear()}
                        />
                      </div>
                    </div>

                    {/* specialties */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {t.specialties} <span className="text-red-500">*</span>
                      </label>
                      <TagSelector items={form.specialties} onRemove={removeSpecialty} />
                      <select
                        onChange={onSpecialtySelect} value=""
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-purple-600"
                      >
                        <option value="">{t.addSpecialty}</option>
                        {specialtyOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        <option value={lang === 'en' ? 'Other' : 'Autre'}>{lang === 'en' ? 'Other' : 'Autre'}</option>
                      </select>

                      {showCustomSpecialty && (
                        <div className="flex gap-2 mt-3">
                          <input
                            value={form.customSpecialty}
                            onChange={(e) => setForm((p) => ({ ...p, customSpecialty: e.target.value }))}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                            placeholder={t.specifySpecialty}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSpecialty(); } }}
                          />
                          <button type="button" onClick={addCustomSpecialty} disabled={!form.customSpecialty.trim()} className="px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60">
                            OK
                          </button>
                        </div>
                      )}
                      <FieldError error={fieldErrors.specialties} show={!!fieldErrors.specialties} />
                    </div>

                    {/* formations */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {t.formations} <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {form.educations.map((ed, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              value={ed}
                              onChange={(e) => updateEducation(idx, e.target.value)}
                              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-600"
                              placeholder={lang === 'en' ? 'e.g., LLM – NYU, 2018' : 'ex : Master 2 Droit – Paris 1, 2018'}
                            />
                            <button type="button" onClick={() => removeEducationField(idx)} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50" aria-label="Remove formation">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <button type="button" onClick={addEducationField} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">
                          {t.addFormation}
                        </button>
                      </div>
                      <FieldError error={fieldErrors.educations} show={!!fieldErrors.educations} />
                    </div>

                    {/* Languages */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {t.languages} <span className="text-red-500">*</span>
                      </label>

                      {(selectedLanguages as LanguageOption[]).length > 0 && (
                        <div className="mb-2 text-xs text-gray-700">
                          <span className="font-medium">{lang === 'en' ? 'Selected languages' : 'Langues sélectionnées'}:</span>{' '}
                          {(selectedLanguages as LanguageOption[]).map((l) => l.value.toUpperCase()).join(', ')}
                        </div>
                      )}

                      <Suspense fallback={<div className="h-11 animate-pulse rounded-xl border border-gray-200 bg-gray-100 flex items-center px-3 text-gray-500 text-sm">{lang === 'en' ? 'Loading languages…' : 'Chargement des langues…'}</div>}>
                        <div className={`${getInputClassName('languages')} p-0`}>
                          <MultiLanguageSelect
                            value={selectedLanguages}
                            onChange={(v: MultiValue<LanguageOption>) => {
                              setSelectedLanguages(v);
                              setTouched((p) => ({ ...p, languages: true }));
                              if (v.length > 0) setFieldErrors((prev) => ({ ...prev, languages: '' }));
                            }}
                          />
                        </div>
                      </Suspense>

                      <FieldError error={fieldErrors.languages} show={!!fieldErrors.languages} />
                    </div>

                    {/* Bio */}
                    <div className="mt-4">
                      <label htmlFor="bio" className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.bio} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="bio" name="bio" ref={fieldRefs.bio}
                        rows={5} maxLength={500}
                        value={form.bio} onChange={onChange} onBlur={() => markTouched('bio')}
                        className={`${getInputClassName('bio')} min-h-[120px]`}
                        placeholder={lang === 'en' ? 'In a few lines, tell expats how you help. Make it friendly and specific!' : 'En quelques lignes, racontez comment vous aidez les expats. Concret et sympa !'}
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
                      <FieldError error={fieldErrors.bio} show={!!(fieldErrors.bio && touched.bio)} />
                    </div>

                    {/* Photo */}
                    <div className={`mt-4 rounded-xl border ${THEME.border} p-4 ${THEME.subtle}`}>
                      <label className="flex items-center text-sm font-semibold text-gray-900 mb-2">
                        <Camera className={`w-4 h-4 mr-2 ${THEME.icon}`} /> {t.profilePhoto} <span className="text-red-500 ml-1">*</span>
                      </label>
                      <Suspense fallback={<div className="py-6"><div className="h-24 bg-gray-100 animate-pulse rounded-xl" /></div>}>
                        <ImageUploader
                          locale={lang}
                          currentImage={form.profilePhoto}
                          onImageUploaded={(url: string) => {
                            setForm((prev) => ({ ...prev, profilePhoto: url }));
                            setFieldErrors((prev) => ({ ...prev, profilePhoto: '' }));
                            setTouched((p) => ({ ...p, profilePhoto: true }));
                            // Après upload, on continue au premier champ manquant (évite de se retrouver en bas)
                            setTimeout(focusFirstMissingField, 80);
                          }}
                          hideNativeFileLabel
                          cropShape="round"
                          outputSize={512}
                        />
                      </Suspense>
                      <FieldError error={fieldErrors.profilePhoto} show={!!fieldErrors.profilePhoto} />
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
                          type="checkbox" id="acceptTerms" checked={form.acceptTerms}
                          onChange={(e) => { setForm((p) => ({ ...p, acceptTerms: e.target.checked })); setTouched((p) => ({ ...p, acceptTerms: true })); if (e.target.checked) setFieldErrors((prev) => ({ ...prev, acceptTerms: '' })); }}
                          className="h-5 w-5 text-indigo-600 border-gray-300 rounded mt-0.5" required
                        />
                        <label htmlFor="acceptTerms" className="text-sm text-gray-800">
                          {t.acceptTerms}{' '}
                          <Link to="/cgu-avocats" className="text-indigo-700 underline font-semibold" target="_blank" rel="noopener noreferrer">
                            {t.termsLink}
                          </Link>{' '}
                          <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <FieldError error={fieldErrors.acceptTerms} show={!!fieldErrors.acceptTerms} />
                    </div>

                    <div className="mt-4">
                      <Button
                        type="submit"
                        loading={isLoading || isSubmitting}
                        fullWidth
                        size="large"
                        className={`text-white font-black py-4 px-6 rounded-2xl text-base sm:text-lg w-full shadow-lg ${
                          canSubmit ? `bg-gradient-to-r ${THEME.button} hover:brightness-110` : 'bg-gray-400 cursor-not-allowed opacity-60'
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

                      {/* Checklist claire, dynamique */}
                      {!isLoading && (
                        <div className="mt-5 rounded-2xl border border-white/40 bg-white/70 backdrop-blur p-4">
                          <h4 className="text-sm font-bold text-gray-800 mb-2">{lang === 'en' ? 'To complete:' : 'À compléter :'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {missing.map((m, idx) => (
                              <div key={idx} className={`flex items-center text-sm ${m.ok ? 'text-green-700' : 'text-gray-700'}`}>
                                {m.ok ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <XCircle className="w-4 h-4 mr-2 text-gray-400" />}
                                <span>{lang === 'en' ? m.labelEn : m.labelFr}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-center">
                            <span className="text-xs text-gray-700 bg-gray-100 rounded-xl px-3 py-1 inline-block">
                              {lang === 'en' ? `Completion: ${progress}%` : `Complétion : ${progress}%`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </form>
              </div>

              {/* Footer */}
              <footer className="text-center mt-8">
                <div className="bg-white rounded-XL p-5 shadow border rounded-xl">
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-1">{t.footerTitle}</h3>
                  <p className="text-sm text-gray-700">{t.footerText}</p>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                  <Link to="/politique-confidentialite" className="hover:text-indigo-700 underline">
                    🔒 {lang === 'en' ? 'Privacy' : 'Confidentialité'}
                  </Link>
                  <Link to="/cgu-avocats" className="hover:text-indigo-700 underline">
                    📋 {t.termsLink}
                  </Link>
                  <Link to="/centre-aide" className="hover:text-indigo-700 underline">
                    💬 {lang === 'en' ? 'Help' : 'Aide'}
                  </Link>
                  <Link to="/contact" className="hover:text-indigo-700 underline">
                    📧 Contact
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

export default RegisterLawyer;
