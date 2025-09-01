// BookingRequestRHF.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
  lazy,
} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Euro,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageCircle,
  Info,
  Globe,
  MapPin,
  Languages as LanguagesIcon,
  Sparkles,
} from 'lucide-react';

import { useForm, Controller, SubmitHandler } from 'react-hook-form';

import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

import { logLanguageMismatch } from '../services/analytics';
import languages from '../data/languages-spoken';

import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

import type { Provider } from '../types/provider';
import { normalizeProvider } from '../types/provider';

import {
  usePricingConfig,
  calculateServiceAmounts,
  detectUserCurrency,
  type ServiceType,
  type Currency,
} from '../services/pricingService';

import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createBookingRequest } from '../services/booking';

// ✅ votre composant RHF pour le téléphone
import PhoneField from '@/components/PhoneField';

/** ===== Types complémentaires ===== */
type LangKey = keyof typeof I18N;
type Language = { code: string; name: string };

/** Props attendues par le composant MultiLanguageSelect */
type MultiLanguageOption = { value: string; label: string };
type MultiLanguageSelectProps = {
  value: MultiLanguageOption[];
  onChange: (selected: MultiLanguageOption[]) => void;
  providerLanguages: string[];
  highlightShared?: boolean;
  locale: LangKey;
};

const MultiLanguageSelect =
  (lazy(() => import('../components/forms-data/MultiLanguageSelect')) as unknown) as React.LazyExoticComponent<
    React.ComponentType<MultiLanguageSelectProps>
  >;

/** ===== Theme ===== */
const THEME = {
  gradFrom: 'from-red-600',
  gradVia: 'via-orange-600',
  gradTo: 'to-rose-600',
  ring: 'focus:border-red-600',
  border: 'border-red-200',
  icon: 'text-red-600',
  chip: 'border-red-200',
  subtle: 'bg-rose-50',
  button: 'from-red-600 via-orange-600 to-rose-600',
} as const;

/** ===== Fallbacks (si admin indisponible) ===== */
const FALLBACK_TOTALS = {
  lawyer: { eur: 49, usd: 55, duration: 20 },
  expat: { eur: 19, usd: 25, duration: 30 },
} as const;

const DEFAULT_SERVICE_FEES = {
  lawyer: { eur: 19, usd: 25 },
  expat: { eur: 9, usd: 15 },
} as const;

/** ===== i18n (FR/EN) ===== */
const I18N = {
  fr: {
    metaTitle: 'Demande de consultation • SOS Expats',
    metaDesc: 'Un formulaire fun, fluide et ultra clair pour booker votre appel 🚀',
    heroTitle: 'Décrivez votre demande',
    heroSubtitle: 'Quelques infos et on s’occupe du reste — simple, friendly, cool ✨',
    progress: 'Progression',
    personal: 'On fait connaissance',
    request: 'Votre demande',
    languages: 'Langues',
    contact: 'Contact',
    cgu: 'CGU Clients',
    checklistTitle: 'À compléter :',
    callTiming: 'Appel dans les 5 minutes après paiement',
    securePay: 'Paiement 100% sécurisé',
    satisfied: '💯 Satisfait ou remboursé : expert indisponible = remboursement automatique.',
    continuePay: 'Continuer vers le paiement',
    errorsTitle: 'Oups, quelques retouches et c’est parfait ✨',
    hints: {
      title: 'Plus votre titre est précis, mieux c’est !',
      desc: 'Contexte, objectif, délais… donnez-nous de la matière 🔎',
      phone: 'Aucun spam — jamais. Seulement pour vous connecter à l’expert. 📵',
      whatsapp: 'Optionnel mais pratique pour les mises à jour en temps réel. 💬',
    },
    fields: {
      firstName: 'Prénom',
      lastName: 'Nom',
      nationality: 'Nationalité',
      currentCountry: "Pays d'intervention",
      otherCountry: 'Précisez votre pays',
      title: 'Titre de votre demande',
      description: 'Description détaillée',
      phone: 'Téléphone',
      whatsapp: 'Numéro WhatsApp (optionnel)',
      accept: 'J’accepte les ',
      andConfirm: ' et confirme que les informations fournies sont exactes.',
    },
    placeholders: {
      firstName: 'Votre prénom',
      lastName: 'Votre nom',
      nationality: 'Ex : Française, Américaine…',
      title: 'Ex : Visa de travail au Canada — quels documents ?',
      description:
        'Expliquez votre situation : contexte, questions précises, objectifs, délais… (50 caractères min.)',
      phone: '612 345 678',
      otherCountry: 'Ex : Paraguay',
    },
    validators: {
      firstName: 'Prénom requis',
      lastName: 'Nom requis',
      title: 'Le titre doit contenir au moins 10 caractères',
      description: 'La description doit contenir au moins 50 caractères',
      nationality: 'Nationalité requise',
      currentCountry: "Pays d'intervention requis",
      otherCountry: 'Veuillez préciser votre pays',
      languages: 'Sélectionnez au moins une langue',
      phone: 'Numéro de téléphone invalide',
      accept: 'Vous devez accepter les conditions',
      langMismatch: 'Aucune langue en commun avec le prestataire',
    },
    preview: {
      title: 'Aperçu rapide',
      hint: 'C’est ce que verra votre expert pour vous aider au mieux.',
    },
    labels: {
      compatible: 'Langues compatibles',
      incompatible: 'Langues non compatibles',
      communicationImpossible: 'Communication impossible',
      needShared: 'Sélectionnez au moins une langue commune pour continuer.',
    },
  },
  en: {
    metaTitle: 'Consultation Request • SOS Expats',
    metaDesc: 'A fun, fluid, ultra-clear booking form 🚀',
    heroTitle: 'Describe your request',
    heroSubtitle: 'A few details and we’ll handle the rest — simple, friendly, cool ✨',
    progress: 'Progress',
    personal: 'Let’s get to know you',
    request: 'Your request',
    languages: 'Languages',
    contact: 'Contact',
    cgu: 'Clients T&Cs',
    checklistTitle: 'To complete:',
    callTiming: 'Call within 5 minutes after payment',
    securePay: '100% secure payment',
    satisfied:
      '💯 Satisfaction guarantee: if the expert is unavailable, you are automatically refunded.',
    continuePay: 'Continue to payment',
    errorsTitle: 'Tiny tweaks and we’re there ✨',
    hints: {
      title: 'The clearer your title, the better!',
      desc: 'Context, goal, timelines… give us material 🔎',
      phone: 'No spam — ever. Only to connect you to the expert. 📵',
      whatsapp: 'Optional but handy for real-time updates. 💬',
    },
    fields: {
      firstName: 'First name',
      lastName: 'Last name',
      nationality: 'Nationality',
      currentCountry: 'Intervention country',
      otherCountry: 'Specify your country',
      title: 'Request title',
      description: 'Detailed description',
      phone: 'Phone',
      whatsapp: 'WhatsApp number (optional)',
      accept: 'I accept the ',
      andConfirm: ' and confirm the information is accurate.',
    },
    placeholders: {
      firstName: 'Your first name',
      lastName: 'Your last name',
      nationality: 'e.g., French, American…',
      title: 'e.g., Canada work visa — which documents?',
      description:
        'Explain your situation: context, specific questions, goals, timeline… (min. 50 chars)',
      phone: '612 345 678',
      otherCountry: 'e.g., Paraguay',
    },
    validators: {
      firstName: 'First name required',
      lastName: 'Last name required',
      title: 'Title must be at least 10 characters',
      description: 'Description must be at least 50 characters',
      nationality: 'Nationality required',
      currentCountry: 'Intervention country required',
      otherCountry: 'Please specify your country',
      languages: 'Select at least one language',
      phone: 'Invalid phone number',
      accept: 'You must accept the terms',
      langMismatch: 'No shared language with the provider',
    },
    preview: {
      title: 'Quick preview',
      hint: 'This is what your expert will see to help you better.',
    },
    labels: {
      compatible: 'Compatible languages',
      incompatible: 'Non-compatible languages',
      communicationImpossible: 'Communication impossible',
      needShared: 'Pick at least one shared language to continue.',
    },
  },
} as const;

const countries = [
  'Afghanistan','Afrique du Sud','Albanie','Algérie','Allemagne','Andorre','Angola',
  'Antigua-et-Barbuda','Arabie saoudite','Argentine','Arménie','Australie','Autriche',
  'Azerbaïdjan','Bahamas','Bahreïn','Bangladesh','Barbade','Belgique','Belize','Bénin',
  'Bhoutan','Biélorussie','Birmanie','Bolivie','Bosnie-Herzégovine','Botswana','Brésil',
  'Brunei','Bulgarie','Burkina Faso','Burundi','Cambodge','Cameroun','Canada','Cap-Vert',
  'Chili','Chine','Chypre','Colombie','Comores','Congo','Congo (RDC)',
  'Corée du Nord','Corée du Sud','Costa Rica',"Côte d'Ivoire",'Croatie','Cuba','Danemark',
  'Djibouti','Dominique','Égypte','Émirats arabes unis','Équateur','Érythrée','Espagne',
  'Estonie','États-Unis','Éthiopie','Fidji','Finlande','France','Gabon','Gambie',
  'Géorgie','Ghana','Grèce','Grenade','Guatemala','Guinée','Guinée-Bissau',
  'Guinée équatoriale','Guyana','Haïti','Honduras','Hongrie','Îles Cook','Îles Marshall',
  'Îles Salomon','Inde','Indonésie','Irak','Iran','Irlande','Islande','Israël','Italie',
  'Jamaïque','Japon','Jordanie','Kazakhstan','Kenya','Kirghizistan','Kiribati','Koweït',
  'Laos','Lesotho','Lettonie','Liban','Liberia','Libye','Liechtenstein','Lituanie',
  'Luxembourg','Macédoine du Nord','Madagascar','Malaisie','Malawi','Maldives','Mali',
  'Malte','Maroc','Maurice','Mauritanie','Mexique','Micronésie','Moldavie','Monaco',
  'Mongolie','Monténégro','Mozambique','Namibie','Nauru','Népal','Nicaragua','Niger',
  'Nigeria','Norvège','Nouvelle-Zélande','Oman','Ouganda','Ouzbékistan','Pakistan',
  'Palaos','Palestine','Panama','Papouasie-Nouvelle-Guinée','Paraguay','Pays-Bas','Pérou',
  'Philippines','Pologne','Portugal','Qatar','République centrafricaine',
  'République dominicaine','République tchèque','Roumanie','Royaume-Uni','Russie','Rwanda',
  'Saint-Christophe-et-Niévès','Saint-Marin','Saint-Vincent-et-les-Grenadines','Sainte-Lucie',
  'Salvador','Samoa','São Tomé-et-Principe','Sénégal','Serbie','Seychelles','Sierra Leone',
  'Singapour','Slovaquie','Slovénie','Somalie','Soudan','Soudan du Sud','Sri Lanka',
  'Suède','Suisse','Suriname','Syrie','Tadjikistan','Tanzanie','Tchad','Thaïlande',
  'Timor oriental','Togo','Tonga','Trinité-et-Tobago','Tunisie','Turkménistan','Turquie',
  'Tuvalu','Ukraine','Uruguay','Vanuatu','Vatican','Venezuela','Vietnam','Yémen',
  'Zambie','Zimbabwe',
];

interface NotificationData {
  type: string;
  providerId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  emailSubject?: string;
  emailHtml?: string;
  smsMessage?: string;
  whatsappMessage?: string;
}

interface BookingRequestData {
  clientPhone: string;
  clientId?: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientNationality: string;
  clientCurrentCountry: string;
  clientWhatsapp: string;
  providerId: string;
  providerName: string;
  providerType: string;
  providerCountry: string;
  providerAvatar: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  title: string;
  description: string;
  clientLanguages: string[];
  clientLanguagesDetails: Array<{ code: string; name: string }>;
  price: number;
  duration: number;
  serviceType: string;
  status: string;
  ip: string;
  userAgent: string;
  providerEmail?: string;
  providerPhone?: string;
}

/** --- Types RHF --- */
type BookingFormData = {
  firstName: string;
  lastName: string;
  nationality: string;
  currentCountry: string;
  autrePays?: string;
  title: string;
  description: string;
  clientPhone: string;      // géré via PhoneField (E.164)
  whatsapp?: string;        // E.164 optionnel
  acceptTerms: boolean;
  clientLanguages: string[]; // codes (["fr","en"])
};

type FirestoreProviderDoc = Partial<Provider> & { id: string };

/** ====== Petits composants UI ====== */
const FieldSuccess = ({ show, children }: { show: boolean; children: React.ReactNode }) =>
  show ? (
    <div className="mt-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 inline-flex items-center">
      <CheckCircle className="w-4 h-4 mr-1" /> {children}
    </div>
  ) : null;

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-center space-x-3 mb-5">
    <div className={`bg-gradient-to-br ${THEME.gradFrom} ${THEME.gradVia} ${THEME.gradTo} rounded-2xl p-3 shadow-md text-white`}>
      {icon}
    </div>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-600 text-sm sm:text-base mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const PreviewCard = ({
  title,
  country,
  langs,
  phone,
  priceLabel,
  duration,
  langPack,
}: {
  title: string;
  country?: string;
  langs: string[];
  phone?: string;
  priceLabel?: string;
  duration?: number;
  langPack: (typeof I18N)[LangKey];
}) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-gray-700">
      <Sparkles className={`w-5 h-5 ${THEME.icon}`} />
      <div className="font-semibold">{langPack.preview.title}</div>
    </div>
    <p className="text-xs text-gray-500 mt-1">{langPack.preview.hint}</p>
    <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        <Globe className={`w-4 h-4 ${THEME.icon}`} />
        <span className="font-medium truncate">{title || '—'}</span>
      </div>
      {!!country && (
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin className={`w-4 h-4 ${THEME.icon}`} />
          <span className="truncate">{country}</span>
        </div>
      )}
      {!!langs.length && (
        <div className="flex items-center gap-2 text-gray-700">
          <LanguagesIcon className={`w-4 h-4 ${THEME.icon}`} />
          <div className="flex flex-wrap gap-1">
            {langs.map((l) => (
              <span key={l} className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs border border-rose-200">
                {l.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
      {!!phone && (
        <div className="flex items-center gap-2 text-gray-700">
          <Phone className={`w-4 h-4 ${THEME.icon}`} />
          <span className="truncate">{phone}</span>
        </div>
      )}
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
        ⏱️ <span className="font-semibold">{duration ?? '—'} min</span>
      </div>
      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-right">
        💰 <span className="font-semibold">{priceLabel || '—'}</span>
      </div>
    </div>

    <div className="mt-3 text-xs text-gray-600">{langPack.satisfied}</div>
  </div>
);

/** 🔧 utils */
const sanitizeText = (input: string, opts: { trim?: boolean } = {}): string => {
  const out = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return opts.trim ? out.trim() : out;
};
const sanitizeInput = (input: string): string => sanitizeText(input, { trim: true });

/** ===== Page (RHF) ===== */
const BookingRequest: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useApp();
  const lang = (language as LangKey) || 'fr';
  const t = I18N[lang];

  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoading, setProviderLoading] = useState<boolean>(true);

  const { pricing } = usePricingConfig();

  // RHF
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<BookingFormData>({
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      nationality: '',
      currentCountry: '',
      autrePays: '',
      title: '',
      description: '',
      clientPhone: '',
      whatsapp: '',
      acceptTerms: false,
      clientLanguages: [],
    },
  });

  const watched = watch();
  const [languagesSpoken, setLanguagesSpoken] = useState<Language[]>([]); // garde affichage + compat
  const [hasLanguageMatchRealTime, setHasLanguageMatchRealTime] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [formError, setFormError] = useState('');

  // Refs pour scroll ciblé (en cas d'erreur globale)
  const refFirstName = useRef<HTMLDivElement | null>(null);
  const refLastName = useRef<HTMLDivElement | null>(null);
  const refNationality = useRef<HTMLDivElement | null>(null);
  const refCountry = useRef<HTMLDivElement | null>(null);
  const refTitle = useRef<HTMLDivElement | null>(null);
  const refDesc = useRef<HTMLDivElement | null>(null);
  const refLangs = useRef<HTMLDivElement | null>(null);
  const refPhone = useRef<HTMLDivElement | null>(null);
  const refCGU = useRef<HTMLDivElement | null>(null);

  const inputClass = (hasErr?: boolean) =>
    `w-full px-3 py-3 border-2 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none transition-all duration-200 text-base ${
      hasErr
        ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : 'border-gray-200 hover:border-gray-300 focus:border-red-600'
    }`;

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (!authLoading && !user) {
      const currentUrl = `/booking-request/${providerId}`;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`, { replace: true });
    }
  }, [user, authLoading, providerId, navigate]);

  // Lecture provider depuis sessionStorage
  const readProviderFromSession = useCallback((): Provider | null => {
    try {
      const saved = sessionStorage.getItem('selectedProvider');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as Partial<Provider> & { id?: string };
      if (parsed && parsed.id && parsed.id === providerId) {
        return normalizeProvider(parsed as Partial<Provider> & { id: string });
      }
    } catch (error) {
      console.warn('Failed to read provider from sessionStorage', error);
    }
    return null;
  }, [providerId]);

  // Chargement live du provider
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const boot = async () => {
      setProviderLoading(true);
      const fromSession = readProviderFromSession();
      if (fromSession) {
        setProvider(fromSession);
        setProviderLoading(false);
      }
      try {
        if (!providerId) {
          setProvider(null);
          setProviderLoading(false);
          return;
        }
        const ref = doc(db, 'sos_profiles', providerId);
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as Record<string, unknown>;
              const normalized = normalizeProvider({
                id: snap.id,
                ...(data as Partial<Provider>),
              } as FirestoreProviderDoc);
              setProvider(normalized);
              try {
                sessionStorage.setItem('selectedProvider', JSON.stringify(normalized));
              } catch {}
            } else {
              setProvider(null);
            }
            setProviderLoading(false);
          },
          (e) => {
            console.error('onSnapshot error', e);
            setProviderLoading(false);
          },
        );

        if (!fromSession) {
          try {
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data() as Record<string, unknown>;
              const normalized = normalizeProvider({
                id: snap.id,
                ...(data as Partial<Provider>),
              } as FirestoreProviderDoc);
              setProvider(normalized);
              try {
                sessionStorage.setItem('selectedProvider', JSON.stringify(normalized));
              } catch {}
            } else {
              setProvider(null);
            }
          } finally {
            setProviderLoading(false);
          }
        }
      } catch (e) {
        console.error('Provider loading error', e);
        setProviderLoading(false);
      }
    };
    void boot();
    return () => { if (unsub) unsub(); };
  }, [providerId, readProviderFromSession]);

  // Matching live des langues
  useEffect(() => {
    if (!provider || (!provider.languages && !provider.languagesSpoken)) {
      setHasLanguageMatchRealTime(true);
      return;
    }
    const providerLanguages = provider.languages || provider.languagesSpoken || [];
    const clientCodes = languagesSpoken.map((l) => l.code);
    const hasMatch = providerLanguages.some((pl) => clientCodes.includes(pl));
    setHasLanguageMatchRealTime(hasMatch);
  }, [languagesSpoken, provider]);

  // PRICING (ADMIN + fallback)
  const isLawyer = provider?.type === 'lawyer' || provider?.role === 'lawyer';
  const role: ServiceType = isLawyer ? 'lawyer' : 'expat';

  const eurAdmin = pricing?.[role]?.eur;
  const usdAdmin = pricing?.[role]?.usd;

  const displayEUR = eurAdmin?.totalAmount ?? FALLBACK_TOTALS[role].eur;
  const displayUSD = usdAdmin?.totalAmount ?? FALLBACK_TOTALS[role].usd;
  const displayDuration =
    eurAdmin?.duration ?? usdAdmin?.duration ?? provider?.duration ?? FALLBACK_TOTALS[role].duration;

  // Progression (RHF)
  const validFlags: Record<string, boolean> = useMemo(() => {
    const values = getValues();
    const hasTitle = values.title.trim().length >= 10;
    const hasDesc = values.description.trim().length >= 50;
    const hasFirst = values.firstName.trim().length > 0;
    const hasLast = values.lastName.trim().length > 0;
    const hasNat = values.nationality.trim().length > 0;
    const hasCountry = values.currentCountry.trim().length > 0;
    const otherOk = values.currentCountry !== 'Autre' ? true : !!values.autrePays?.trim();
    const langsOk = (values.clientLanguages?.length ?? 0) > 0;
    const accept = !!values.acceptTerms;

    const phoneValid = (() => {
      if (!values.clientPhone) return false;
      try {
        const p = parsePhoneNumberFromString(values.clientPhone);
        return !!(p && p.isValid());
      } catch {
        return false;
      }
    })();

    const sharedLang = hasLanguageMatchRealTime;

    return {
      firstName: hasFirst,
      lastName: hasLast,
      title: hasTitle,
      description: hasDesc,
      nationality: hasNat,
      currentCountry: hasCountry,
      autrePays: otherOk,
      langs: langsOk,
      phone: phoneValid,
      accept: accept,
      sharedLang,
    };
  }, [watched, hasLanguageMatchRealTime]);

  const formProgress = useMemo(() => {
    const flags = Object.values(validFlags);
    const done = flags.filter(Boolean).length;
    return Math.round((done / flags.length) * 100);
  }, [validFlags]);

  // Redirection si provider introuvable
  useEffect(() => {
    if (!authLoading && !providerLoading && !provider) navigate('/');
  }, [provider, providerLoading, authLoading, navigate]);

  const notifyProviderOfRequest = async (
    targetProviderId: string,
    requestData: BookingRequestData,
  ): Promise<{ success: boolean; result?: unknown; error?: unknown }> => {
    try {
      if (!requestData.providerEmail && !requestData.providerPhone) {
        return { success: false, error: 'Aucun contact disponible pour le prestataire' };
      }
      if (!requestData.title?.trim()) return { success: false, error: 'Titre de la demande manquant' };
      if (!requestData.description?.trim()) return { success: false, error: 'Description de la demande manquante' };

      const notificationData: NotificationData = {
        type: 'provider_booking_request',
        providerId: targetProviderId,
        recipientName: requestData.providerName || 'Prestataire',
        emailSubject: `SOS Expat - Nouvelle demande: ${requestData.title.substring(0, 50)}`,
        emailHtml: `
<h2>Nouvelle demande de consultation</h2>
<p><strong>Client:</strong> ${requestData.clientFirstName} ${requestData.clientLastName}</p>
<p><strong>Nationalité:</strong> ${requestData.clientNationality}</p>
<p><strong>Pays:</strong> ${requestData.clientCurrentCountry}</p>
<p><strong>Téléphone:</strong> ${requestData.clientPhone}</p>
<p><strong>Titre:</strong> ${requestData.title}</p>
<p><strong>Description:</strong> ${requestData.description}</p>
<hr>
<p>Connectez-vous à votre espace prestataire pour répondre.</p>`.trim(),
        smsMessage: `SOS Expat: Nouvelle demande de ${requestData.clientFirstName}. Titre: "${requestData.title.substring(0, 30)}...". Consultez votre espace.`,
        whatsappMessage: `🔔 SOS Expat: Nouvelle demande de ${requestData.clientFirstName} ${requestData.clientLastName}.\n\nTitre: "${requestData.title}"\nPays: ${requestData.clientCurrentCountry}\n\nConsultez votre espace prestataire.`,
      };

      if (requestData.providerEmail?.includes('@')) notificationData.recipientEmail = requestData.providerEmail;
      if (requestData.providerPhone && requestData.providerPhone.length > 5) notificationData.recipientPhone = requestData.providerPhone;

      if (!functions) throw new Error('Firebase Functions non initialisé');
      const sendNotification = httpsCallable(functions, 'sendEmail');
      const result = await sendNotification(notificationData);
      return { success: true, result: (result as { data?: unknown })?.data };
    } catch (error) {
      console.error('notifyProviderOfRequest error', error);
      return { success: false, error };
    }
  };

  const prepareStandardizedData = (
    state: BookingFormData,
    p: Provider,
    currentUser: { id?: string; firstName?: string; lastName?: string } | null,
    eurTotalForDisplay: number,
    durationForDisplay: number,
  ): {
    selectedProvider: Partial<Provider> & { id: string; type: 'lawyer' | 'expat' };
    bookingRequest: BookingRequestData;
  } => {
    const selectedProvider: Partial<Provider> & { id: string; type: 'lawyer' | 'expat' } = {
      id: p.id,
      name: p.name,
      firstName: p.firstName,
      lastName: p.lastName,
      type: (p.type || p.role) as 'lawyer' | 'expat',
      country: p.country,
      avatar: p.avatar,
      price: p.price,
      duration: p.duration,
      rating: p.rating,
      reviewCount: p.reviewCount,
      languages: p.languages,
      languagesSpoken: p.languagesSpoken,
      specialties: p.specialties,
      currentCountry: p.currentCountry,
      email: p.email,
      phone: p.phone,
    };

    const bookingRequest: BookingRequestData = {
      clientPhone: state.clientPhone,
      clientId: (currentUser as any)?.uid ?? (currentUser as any)?.id,
      clientName: `${sanitizeInput(state.firstName)} ${sanitizeInput(state.lastName)}`.trim(),
      clientFirstName: sanitizeInput(state.firstName),
      clientLastName: sanitizeInput(state.lastName),
      clientNationality: sanitizeInput(state.nationality),
      clientCurrentCountry: sanitizeInput(state.currentCountry === 'Autre' ? state.autrePays || '' : state.currentCountry),
      clientWhatsapp: state.whatsapp || '',
      providerId: selectedProvider.id,
      providerName: selectedProvider.name || '',
      providerType: selectedProvider.type,
      providerCountry: selectedProvider.country || '',
      providerAvatar: selectedProvider.avatar || '',
      providerRating: selectedProvider.rating,
      providerReviewCount: selectedProvider.reviewCount,
      providerLanguages: (selectedProvider.languages || selectedProvider.languagesSpoken) as string[] | undefined,
      providerSpecialties: selectedProvider.specialties as string[] | undefined,
      title: sanitizeText(state.title, { trim: true }),
      description: sanitizeText(state.description, { trim: true }),
      clientLanguages: state.clientLanguages,
      clientLanguagesDetails: state.clientLanguages.map((code) => {
        const found = (languages as Language[]).find((l) => l.code === code);
        return { code, name: found?.name || code.toUpperCase() };
      }),
      price: eurTotalForDisplay,
      duration: durationForDisplay,
      status: 'pending',
      serviceType: isLawyer ? 'lawyer_call' : 'expat_call',
      ip: window.location.hostname,
      userAgent: navigator.userAgent,
      providerEmail: selectedProvider.email,
      providerPhone: selectedProvider.phone,
    };
    return { selectedProvider, bookingRequest };
  };

  const scrollToFirstIncomplete = () => {
    const v = validFlags;
    const pairs: Array<[boolean, React.MutableRefObject<HTMLDivElement | null>]> = [
      [!v.firstName, refFirstName],
      [!v.lastName, refLastName],
      [!v.nationality, refNationality],
      [!v.currentCountry || !v.autrePays, refCountry],
      [!v.title, refTitle],
      [!v.description, refDesc],
      [!v.langs || !v.sharedLang, refLangs],
      [!v.phone, refPhone],
      [!v.accept, refCGU],
    ];
    const target = pairs.find(([need]) => need)?.[1]?.current;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onSubmit: SubmitHandler<BookingFormData> = async (data) => {
    setFormError('');

    // blocage si pas de langue partagée (on log)
    if (!hasLanguageMatchRealTime) {
      try {
        await logLanguageMismatch({
          clientLanguages: data.clientLanguages,
          customLanguage: undefined,
          providerId: provider?.id || '',
          providerLanguages: provider?.languages || provider?.languagesSpoken || [],
          formData: {
            title: data.title,
            description: data.description,
            nationality: data.nationality,
            currentCountry: data.currentCountry === 'Autre' ? data.autrePays : data.currentCountry,
          },
          source: 'booking_request_form_rhf',
        });
      } catch (error) {
        console.warn('logLanguageMismatch failed', error);
      }
      setFormError(t.validators.langMismatch);
      scrollToFirstIncomplete();
      return;
    }

    // validation RHF complète (au cas où)
    const ok = await trigger();
    if (!ok || Object.values(validFlags).some((v) => !v)) {
      scrollToFirstIncomplete();
      return;
    }

    try {
      const eurTotalForDisplay = displayEUR;
      const durationForDisplay = displayDuration;

      const { selectedProvider, bookingRequest } = prepareStandardizedData(
        data,
        provider!,
        user,
        eurTotalForDisplay,
        durationForDisplay,
      );

      // 🔐 UID de l'utilisateur
      const uid = (user as any)?.uid;
      if (!uid) {
        setFormError("Session expirée. Reconnectez-vous.");
        return;
      }

      // Création du booking centralisée
      await createBookingRequest({
        clientId: uid,
        providerId: selectedProvider.id,
        serviceType: isLawyer ? 'lawyer_call' : 'expat_call',
        status: 'pending',

        title: bookingRequest.title,
        description: bookingRequest.description,
        clientPhone: bookingRequest.clientPhone,
        clientWhatsapp: bookingRequest.clientWhatsapp,
        price: bookingRequest.price,
        duration: bookingRequest.duration,
        clientLanguages: bookingRequest.clientLanguages,
        clientLanguagesDetails: bookingRequest.clientLanguagesDetails,
        providerName: bookingRequest.providerName,
        providerType: bookingRequest.providerType,
        providerCountry: bookingRequest.providerCountry,
        providerAvatar: bookingRequest.providerAvatar,
        providerRating: bookingRequest.providerRating,
        providerReviewCount: bookingRequest.providerReviewCount,
        providerLanguages: bookingRequest.providerLanguages,
        providerSpecialties: bookingRequest.providerSpecialties,
        clientName: bookingRequest.clientName,
        clientFirstName: bookingRequest.clientFirstName,
        clientLastName: bookingRequest.clientLastName,
        clientNationality: bookingRequest.clientNationality,
        clientCurrentCountry: bookingRequest.clientCurrentCountry,
        ip: bookingRequest.ip,
        userAgent: bookingRequest.userAgent,
        providerEmail: bookingRequest.providerEmail,
        providerPhone: bookingRequest.providerPhone,
      });

      // (optionnel) notifier le prestataire
      // void notifyProviderOfRequest(selectedProvider.id, bookingRequest);

      // Calcul serviceData pour checkout
      const selectedCurrency: Currency = detectUserCurrency();
      const roleForPricing: ServiceType = (provider!.role || provider!.type || 'expat') as ServiceType;

      let svcAmount = 0;
      let svcDuration = FALLBACK_TOTALS[roleForPricing].duration;
      let svcCommission = 0;
      let svcProviderAmount = 0;

      try {
        const p = await calculateServiceAmounts(roleForPricing, selectedCurrency);
        svcAmount = p.totalAmount;
        svcDuration = p.duration;
        svcCommission = p.connectionFeeAmount;
        svcProviderAmount = p.providerAmount;
      } catch {
        const total =
          selectedCurrency === 'usd' ? FALLBACK_TOTALS[roleForPricing].usd : FALLBACK_TOTALS[roleForPricing].eur;
        const fee =
          selectedCurrency === 'usd' ? DEFAULT_SERVICE_FEES[roleForPricing].usd : DEFAULT_SERVICE_FEES[roleForPricing].eur;
        svcAmount = total;
        svcCommission = fee;
        svcProviderAmount = Math.max(0, Math.round((total - fee) * 100) / 100);
      }

      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(selectedProvider));
        sessionStorage.setItem('clientPhone', bookingRequest.clientPhone);
        sessionStorage.setItem(
          'serviceData',
          JSON.stringify({
            providerId: selectedProvider.id,
            serviceType: roleForPricing === 'lawyer' ? 'lawyer_call' : 'expat_call',
            providerRole: roleForPricing,
            amount: svcAmount,
            duration: svcDuration,
            clientPhone: bookingRequest.clientPhone,
            commissionAmount: svcCommission,
            providerAmount: svcProviderAmount,
            currency: selectedCurrency,
          }),
        );
      } catch (error) {
        console.warn('Failed to save serviceData in session', error);
      }

      navigate(`/call-checkout/${providerId}`);
    } catch (err) {
      console.error('Submit error', err);
      setFormError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  // ===== RENDER =====
  if (providerLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
            <span>Chargement du prestataire…</span>
          </div>
        </div>
      </Layout>
    );
  }
  if (!provider) return null;

  const inputHas = (name: keyof BookingFormData) => !!(errors as any)?.[name];

  return (
    <Layout>
      {/* SEO minimal */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['WebPage', 'Action'],
            name: t.metaTitle,
            description: t.metaDesc,
          }),
        }}
      />

      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_35%,#fff5f8_100%)] py-4 sm:py-8">
        {/* Hero / Title */}
        <header className="px-4 max-w-3xl mx-auto mb-4 sm:mb-6">
          <div className="flex items-center gap-3 text-gray-700 mb-2">
            <button
              onClick={() => navigate(`/provider/${provider!.id}`)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
                <span className={`bg-gradient-to-r ${THEME.gradFrom} ${THEME.gradVia} ${THEME.gradTo} bg-clip-text text-transparent`}>
                  {t.heroTitle}
                </span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">{t.heroSubtitle}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-gray-700">{t.progress}</span>
              <span className="text-sm font-bold text-red-600">{formProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700" style={{ width: `${formProgress}%` }} />
            </div>
          </div>
        </header>

        {/* Provider card */}
        <div className="max-w-3xl mx-auto px-4 mb-4">
          <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-red-200 bg-white shadow-md flex-shrink-0 grid place-items-center">
              {provider?.avatar ? (
                <img
                  src={provider.avatar}
                  alt={`Photo de ${provider.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                />
              ) : (
                <img src="/default-avatar.png" alt="Avatar par défaut" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">{provider?.name || '—'}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isLawyer ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
                  }`}
                >
                  {isLawyer ? '⚖️ Avocat' : '🌍 Expatrié aidant'}
                </span>
              </div>
              <div className="mt-1 text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                <span className="font-medium">📍</span>
                <span className="truncate">{provider.country}</span>
              </div>
              {!!provider?.languages?.length && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(provider.languages || []).slice(0, 3).map((code, idx) => {
                    const l = (languages as Language[]).find((x) => x.code === code);
                    return (
                      <span key={`${code}-${idx}`} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200">
                        {l ? l.name : code}
                      </span>
                    );
                  })}
                  {(provider.languages || []).length > 3 && (
                    <span className="text-xs text-gray-500">+{(provider.languages || []).length - 3}</span>
                  )}
                </div>
              )}
            </div>
            <div className="text-center sm:text-right bg-white rounded-xl p-3 sm:p-4 border border-gray-200 w-auto min-w-[120px]">
              <div className="text-2xl sm:text-3xl font-extrabold text-red-600">{`${displayEUR}€ / $${displayUSD}`}</div>
              <div className="text-sm text-gray-600 mt-1">{displayDuration} min</div>
              <div className="mt-1 text-xs text-gray-500">💳 {t.securePay}</div>
            </div>
          </div>
        </div>

        {/* Form + Preview */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Section Perso */}
              <section className="p-5 sm:p-6">
                <SectionHeader icon={<MapPin className="w-5 h-5" />} title={t.personal} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prénom */}
                  <div ref={refFirstName}>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.fields.firstName} <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name="firstName"
                      rules={{ required: t.validators.firstName }}
                      render={({ field }) => (
                        <input
                          {...field}
                          onChange={(e) => field.onChange(sanitizeText(e.target.value))}
                          className={inputClass(inputHas('firstName'))}
                          placeholder={t.placeholders.firstName}
                        />
                      )}
                    />
                    <FieldSuccess show={!errors.firstName && !!watch('firstName')}>Parfait ! ✨</FieldSuccess>
                    {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
                  </div>

                  {/* Nom */}
                  <div ref={refLastName}>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {t.fields.lastName} <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name="lastName"
                      rules={{ required: t.validators.lastName }}
                      render={({ field }) => (
                        <input
                          {...field}
                          onChange={(e) => field.onChange(sanitizeText(e.target.value))}
                          className={inputClass(inputHas('lastName'))}
                          placeholder={t.placeholders.lastName}
                        />
                      )}
                    />
                    <FieldSuccess show={!errors.lastName && !!watch('lastName')}>Parfait ! ✨</FieldSuccess>
                    {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
                  </div>
                </div>

                {/* Nationalité */}
                <div className="mt-4" ref={refNationality}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.fields.nationality} <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="nationality"
                    rules={{ required: t.validators.nationality }}
                    render={({ field }) => (
                      <input
                        {...field}
                        onChange={(e) => field.onChange(sanitizeText(e.target.value))}
                        className={inputClass(inputHas('nationality'))}
                        placeholder={t.placeholders.nationality}
                      />
                    )}
                  />
                  {errors.nationality && <p className="mt-1 text-sm text-red-600">{errors.nationality.message}</p>}
                </div>

                {/* Pays d'intervention */}
                <div className="mt-4" ref={refCountry}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.fields.currentCountry} <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="currentCountry"
                    rules={{ required: t.validators.currentCountry }}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={inputClass(inputHas('currentCountry'))}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          if (e.target.value !== 'Autre') setValue('autrePays', '');
                        }}
                      >
                        <option value="">-- Sélectionnez un pays --</option>
                        {countries.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                    )}
                  />
                  {errors.currentCountry && <p className="mt-1 text-sm text-red-600">{errors.currentCountry.message}</p>}

                  {watch('currentCountry') === 'Autre' && (
                    <div className="mt-3">
                      <Controller
                        control={control}
                        name="autrePays"
                        rules={{
                          validate: (v) => (!!v?.trim() ? true : t.validators.otherCountry),
                        }}
                        render={({ field }) => (
                          <input
                            {...field}
                            onChange={(e) => field.onChange(sanitizeText(e.target.value))}
                            className={inputClass(!!errors.autrePays)}
                            placeholder={t.placeholders.otherCountry}
                          />
                        )}
                      />
                      {errors.autrePays && <p className="mt-1 text-sm text-red-600">{errors.autrePays.message as string}</p>}
                    </div>
                  )}
                </div>
              </section>

              {/* Section Demande */}
              <section className="p-5 sm:p-6 border-t border-gray-50">
                <SectionHeader icon={<Globe className="w-5 h-5" />} title={t.request} />

                {/* Titre */}
                <div ref={refTitle}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.fields.title} <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="title"
                    rules={{
                      required: t.validators.title,
                      validate: (v) => (v.trim().length >= 10 ? true : t.validators.title),
                    }}
                    render={({ field }) => (
                      <input
                        {...field}
                        onChange={(e) => field.onChange(sanitizeText(e.target.value))}
                        className={inputClass(!!errors.title)}
                        placeholder={t.placeholders.title}
                      />
                    )}
                  />
                  <div className="mt-1 text-xs text-gray-500">💡 {t.hints.title}</div>
                  <FieldSuccess show={!errors.title && watch('title').trim().length >= 10}>C’est clair 👍</FieldSuccess>
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message as string}</p>}
                </div>

                {/* Description */}
                <div className="mt-4" ref={refDesc}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    {t.fields.description} <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="description"
                    rules={{
                      required: t.validators.description,
                      validate: (v) => (v.trim().length >= 50 ? true : t.validators.description),
                    }}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={5}
                        onChange={(e) => field.onChange(sanitizeText(e.target.value))}
                        className={`resize-none ${inputClass(!!errors.description)}`}
                        placeholder={t.placeholders.description}
                      />
                    )}
                  />
                  <div className="mt-1 text-xs text-gray-500">🔎 {t.hints.desc}</div>
                  <FieldSuccess show={!errors.description && watch('description').trim().length >= 50}>On y voit clair 👀</FieldSuccess>
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message as string}</p>}
                </div>
              </section>

              {/* Section Langues */}
              <section className="p-5 sm:p-6 border-t border-gray-50" ref={refLangs}>
                <SectionHeader icon={<LanguagesIcon className="w-5 h-5" />} title={t.languages} />

                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  🗣️ {lang === 'en' ? 'Spoken languages' : 'Langues parlées'} <span className="text-red-500">*</span>
                </label>

                <Suspense fallback={<div className="h-10 rounded-lg bg-gray-100 animate-pulse" />}>
                  <MultiLanguageSelect
                    value={languagesSpoken.map((l) => ({ value: l.code, label: l.name }))}
                    onChange={(selected: MultiLanguageOption[]) => {
                      const options = selected || [];
                      const allLanguages = languages as Language[];
                      const selectedLangs = options
                        .map((opt) => allLanguages.find((langItem) => langItem.code === opt.value))
                        .filter((v): v is Language => Boolean(v));
                      setLanguagesSpoken(selectedLangs);
                      setValue('clientLanguages', selectedLangs.map((s) => s.code), { shouldValidate: true });
                    }}
                    providerLanguages={provider?.languages || provider?.languagesSpoken || []}
                    highlightShared
                    locale={lang}
                  />
                </Suspense>

                {/* Erreur RHF pour le tableau des langues */}
                {(!watch('clientLanguages') || watch('clientLanguages').length === 0) && (
                  <p className="mt-2 text-sm text-red-600">{t.validators.languages}</p>
                )}

                {/* Compatibilité */}
                {languagesSpoken.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const providerLanguages = provider?.languages || provider?.languagesSpoken || [];
                      const compatible = languagesSpoken.filter((l) => providerLanguages.includes(l.code));
                      const incompatible = languagesSpoken.filter((l) => !providerLanguages.includes(l.code));
                      return (
                        <>
                          {!!compatible.length && (
                            <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-xl">
                              <div className="flex">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="ml-3">
                                  <p className="text-green-900 font-semibold mb-2">✅ {t.labels.compatible} :</p>
                                  <div className="flex flex-wrap gap-2">
                                    {compatible.map((l) => (
                                      <span key={l.code} className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full border border-green-200">
                                        🌐 {l.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {!!incompatible.length && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-xl">
                              <div className="flex">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="ml-3">
                                  <p className="text-red-700 font-semibold mb-2">⚠️ {t.labels.incompatible} :</p>
                                  <div className="flex flex-wrap gap-2">
                                    {incompatible.map((l) => (
                                      <span key={l.code} className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full border border-red-200">
                                        🌐 {l.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {languagesSpoken.length > 0 && !hasLanguageMatchRealTime && (
                  <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-400 rounded-xl">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="text-red-700 font-semibold">🚫 {t.labels.communicationImpossible}</p>
                        <p className="text-red-600 text-sm mt-1">{t.labels.needShared}</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Section Contact (RHF + PhoneField) */}
              <section className="p-5 sm:p-6 border-t border-gray-50" ref={refPhone}>
                <SectionHeader icon={<Phone className="w-5 h-5" />} title={t.contact} />

                {/* Téléphone client via PhoneField (RHF) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-1" /> {t.fields.phone} <span className="text-red-500">*</span>
                  </label>

                  <Controller
                    control={control}
                    name="clientPhone"
                    rules={{
                      required: t.validators.phone,
                      validate: (v) => {
                        try {
                          const p = parsePhoneNumberFromString(v || '');
                          return p && p.isValid() ? true : t.validators.phone;
                        } catch {
                          return t.validators.phone;
                        }
                      },
                    }}
                    render={({ field }) => (
                      <PhoneField
                        name={field.name}
                        control={control}
                        label=""
                        required
                        defaultCountry="FR"
                        // Le composant PhoneField pilote sa propre UI via RHF: on s'aligne sur sa valeur
                      />
                    )}
                  />

                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                    <Info className={`w-4 h-4 ${THEME.icon}`} /> {t.hints.phone}
                  </div>
                  {errors.clientPhone && <p className="mt-1 text-sm text-red-600">{errors.clientPhone.message as string}</p>}
                  {!!watch('clientPhone') && (
                    <div className="mt-1 text-xs text-gray-500">
                      ➜ International: <span className="font-mono">{watch('clientPhone')}</span>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-700">⏱️ <strong>{t.callTiming}</strong></div>
                </div>

                {/* WhatsApp optionnel (re-usage PhoneField mais non requis) */}
<div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle size={16} className="inline mr-1" /> {t.fields.whatsapp}
                  </label>

                  <Controller
                    control={control}
                    name="whatsapp"
                    rules={{
                      validate: (v) => {
                        // Si vide ou undefined, c'est valide (champ optionnel)
                        if (!v || v.trim() === '') return true;
                        try {
                          const p = parsePhoneNumberFromString(v);
                          return p && p.isValid() ? true : "Numéro WhatsApp invalide";
                        } catch {
                          return "Numéro WhatsApp invalide";
                        }
                      },
                    }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        className={inputClass(!!errors.whatsapp)}
                        placeholder="+33 6 12 34 56 78"
                      />
                    )}
                  />
                  {errors.whatsapp && <p className="mt-1 text-sm text-red-600">{errors.whatsapp.message as string}</p>}
                  {!!watch('whatsapp') && (
                    <div className="mt-1 text-xs text-gray-500">
                      ➜ WhatsApp: <span className="font-mono">{watch('whatsapp')}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                    <Info className={`w-4 h-4 ${THEME.icon}`} /> {t.hints.whatsapp}
                  </div>
                </div>
              </section>

              {/* CGU */}
              <section className="p-5 sm:p-6 border-t border-gray-50" ref={refCGU}>
                <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <Controller
                      control={control}
                      name="acceptTerms"
                      rules={{ validate: (v) => (v ? true : t.validators.accept) }}
                      render={({ field }) => (
                        <input
                          id="acceptTerms"
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-5 w-5 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 flex-shrink-0"
                          required
                        />
                      )}
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-700 leading-relaxed">
                      {t.fields.accept}
                      <Link to="/cgu-clients" className="text-red-600 hover:text-red-700 underline font-medium">
                        {t.cgu}
                      </Link>
                      {t.fields.andConfirm}
                    </label>
                  </div>
                  {errors.acceptTerms && <p className="mt-2 text-sm text-red-600">{errors.acceptTerms.message as string}</p>}
                </div>
              </section>

              {/* Erreurs globales */}
              {(formError) && (
                <div className="px-5 sm:px-6 pb-0">
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="ml-3">
                        <p className="font-semibold text-red-800">{t.errorsTitle}</p>
                        <p className="text-sm text-red-700 mt-1">{formError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aperçu rapide */}
              <div className="px-5 sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  {showPreview ? 'Masquer l’aperçu' : 'Afficher l’aperçu rapide'}
                </button>

                {showPreview && (
                  <div className="mt-3">
                    <PreviewCard
                      title={watch('title')}
                      country={watch('currentCountry') === 'Autre' ? watch('autrePays') : watch('currentCountry')}
                      langs={watch('clientLanguages') || []}
                      phone={watch('clientPhone')}
                      priceLabel={`${displayEUR}€ / $${displayUSD}`}
                      duration={displayDuration}
                      langPack={t}
                    />
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="p-5 sm:p-6">
                <Button
                  type="submit"
                  loading={isSubmitting}
                  fullWidth
                  size="large"
                  className={`${
                    Object.values(validFlags).every(Boolean)
                      ? `bg-gradient-to-r ${THEME.button} hover:opacity-95 transform hover:scale-[1.01] shadow-lg`
                      : 'bg-gray-400 cursor-not-allowed'
                  } text-white font-bold py-4 px-6 sm:px-8 rounded-xl transition-all duration-300 ease-out text-base sm:text-lg`}
                  disabled={isSubmitting || !Object.values(validFlags).every(Boolean)}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                      Traitement en cours...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Euro size={20} className="mr-2 sm:mr-3" />
                      <span>
                        {t.continuePay} ({`${displayEUR}€ / $${displayUSD}`})
                      </span>
                    </div>
                  )}
                </Button>

                {!Object.values(validFlags).every(Boolean) && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm font-medium mb-2">
                      🔍 {lang === 'en' ? 'Missing to enable the button:' : 'Éléments manquants pour activer le bouton :'}
                    </p>
                    <div className="grid grid-cols-1 gap-1 text-xs text-yellow-700">
                      {!validFlags.firstName && <div>• {t.validators.firstName}</div>}
                      {!validFlags.lastName && <div>• {t.validators.lastName}</div>}
                      {!validFlags.title && <div>• {t.validators.title}</div>}
                      {!validFlags.description && <div>• {t.validators.description}</div>}
                      {!validFlags.phone && <div>• {t.validators.phone}</div>}
                      {!validFlags.nationality && <div>• {t.validators.nationality}</div>}
                      {!validFlags.currentCountry && <div>• {t.validators.currentCountry}</div>}
                      {watch('currentCountry') === 'Autre' && !validFlags.autrePays && <div>• {t.validators.otherCountry}</div>}
                      {!validFlags.langs && <div>• {t.validators.languages}</div>}
                      {!validFlags.sharedLang && <div>• {t.validators.langMismatch}</div>}
                      {!validFlags.accept && <div>• {t.validators.accept}</div>}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={scrollToFirstIncomplete}
                        className="text-xs font-semibold underline text-gray-800"
                      >
                        {lang === 'en' ? 'Jump to first missing field' : 'Aller au premier champ manquant'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center pt-4">
                  <p className="text-xs text-gray-500">
                    🔒 {t.securePay} • {t.callTiming}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingRequest;
