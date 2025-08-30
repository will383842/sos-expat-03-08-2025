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
// âœ… Service centralisÃ©
import { createBookingRequest } from '../services/booking';
/** ===== Types complÃ©mentaires ===== */
type LangKey = keyof typeof I18N;
type Language = { code: string; name: string };

/** Props attendues par le composant MultiLanguageSelect (fortement typÃ©es) */
type MultiLanguageOption = { value: string; label: string };
type MultiLanguageSelectProps = {
  value: MultiLanguageOption[];
  onChange: (selected: MultiLanguageOption[]) => void;
  providerLanguages: string[];
  highlightShared?: boolean;
  locale: LangKey;
};

/** Lazy + typage explicite du composant (pas de `any`) */
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

/** ===== i18n (FR par dÃ©faut) ===== */
const I18N = {
  fr: {
    metaTitle: 'Demande de consultation â€¢ SOS Expats',
    metaDesc: 'Un formulaire fun, fluide et ultra clair pour booker votre appel ðŸš€',
    heroTitle: 'DÃ©crivez votre demande',
    heroSubtitle:
      'Quelques infos et on sâ€™occupe du reste â€” simple, friendly, cool âœ¨',
    progress: 'Progression',
    personal: 'On fait connaissance',
    request: 'Votre demande',
    languages: 'Langues',
    contact: 'Contact',
    cgu: 'CGU Clients',
    checklistTitle: 'Ã€ complÃ©ter :',
    callTiming: 'Appel dans les 5 minutes aprÃ¨s paiement',
    securePay: 'Paiement 100% sÃ©curisÃ©',
    satisfied:
      'ðŸ’¯ Satisfait ou remboursÃ© : expert indisponible = remboursement automatique.',
    continuePay: 'Continuer vers le paiement',
    errorsTitle: 'Oups, quelques retouches et câ€™est parfait âœ¨',
    hints: {
      title: 'Plus votre titre est prÃ©cis, mieux câ€™est !',
      desc: 'Contexte, objectif, dÃ©laisâ€¦ donnez-nous de la matiÃ¨re ðŸ”Ž',
      phone:
        'Aucun spam â€” jamais. Seulement pour vous connecter Ã  lâ€™expert. ðŸ“µ',
      whatsapp:
        'Optionnel mais pratique pour les mises Ã  jour en temps rÃ©el. ðŸ’¬',
    },
    fields: {
      firstName: 'PrÃ©nom',
      lastName: 'Nom',
      nationality: 'NationalitÃ©',
      currentCountry: "Pays d'intervention",
      otherCountry: 'PrÃ©cisez votre pays',
      title: 'Titre de votre demande',
      description: 'Description dÃ©taillÃ©e',
      phone: 'TÃ©lÃ©phone',
      whatsapp: 'NumÃ©ro WhatsApp (optionnel)',
      accept: 'Jâ€™accepte les ',
      andConfirm:
        ' et confirme que les informations fournies sont exactes.',
    },
    placeholders: {
      firstName: 'Votre prÃ©nom',
      lastName: 'Votre nom',
      nationality: 'Ex : FranÃ§aise, AmÃ©ricaineâ€¦',
      title: 'Ex : Visa de travail au Canada â€” quels documents ?',
      description:
        'Expliquez votre situation : contexte, questions prÃ©cises, objectifs, dÃ©laisâ€¦ (50 caractÃ¨res min.)',
      phone: '612 345 678',
      otherCountry: 'Ex : Paraguay',
    },
    validators: {
      firstName: 'PrÃ©nom requis',
      lastName: 'Nom requis',
      title: 'Le titre doit contenir au moins 10 caractÃ¨res',
      description: 'La description doit contenir au moins 50 caractÃ¨res',
      nationality: 'NationalitÃ© requise',
      currentCountry: "Pays d'intervention requis",
      otherCountry: 'Veuillez prÃ©ciser votre pays',
      languages: 'SÃ©lectionnez au moins une langue',
      phone: 'NumÃ©ro de tÃ©lÃ©phone invalide',
      accept: 'Vous devez accepter les conditions',
      langMismatch: 'Aucune langue en commun avec le prestataire',
    },
    preview: {
      title: 'AperÃ§u rapide',
      hint: 'Câ€™est ce que verra votre expert pour vous aider au mieux.',
    },
    labels: {
      compatible: 'Langues compatibles',
      incompatible: 'Langues non compatibles',
      communicationImpossible: 'Communication impossible',
      needShared:
        'SÃ©lectionnez au moins une langue commune pour continuer.',
    },
  },
  en: {
    metaTitle: 'Consultation Request â€¢ SOS Expats',
    metaDesc: 'A fun, fluid, ultra-clear booking form ðŸš€',
    heroTitle: 'Describe your request',
    heroSubtitle:
      'A few details and weâ€™ll handle the rest â€” simple, friendly, cool âœ¨',
    progress: 'Progress',
    personal: 'Letâ€™s get to know you',
    request: 'Your request',
    languages: 'Languages',
    contact: 'Contact',
    cgu: 'Clients T&Cs',
    checklistTitle: 'To complete:',
    callTiming: 'Call within 5 minutes after payment',
    securePay: '100% secure payment',
    satisfied:
      'ðŸ’¯ Satisfaction guarantee: if the expert is unavailable, you are automatically refunded.',
    continuePay: 'Continue to payment',
    errorsTitle: 'Tiny tweaks and weâ€™re there âœ¨',
    hints: {
      title: 'The clearer your title, the better!',
      desc: 'Context, goal, timelinesâ€¦ give us material ðŸ”Ž',
      phone: 'No spam â€” ever. Only to connect you to the expert. ðŸ“µ',
      whatsapp: 'Optional but handy for real-time updates. ðŸ’¬',
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
      nationality: 'e.g., French, Americanâ€¦',
      title: 'e.g., Canada work visa â€” which documents?',
      description:
        'Explain your situation: context, specific questions, goals, timelineâ€¦ (min. 50 chars)',
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
  'Afghanistan','Afrique du Sud','Albanie','AlgÃ©rie','Allemagne','Andorre','Angola',
  'Antigua-et-Barbuda','Arabie saoudite','Argentine','ArmÃ©nie','Australie','Autriche',
  'AzerbaÃ¯djan','Bahamas','BahreÃ¯n','Bangladesh','Barbade','Belgique','Belize','BÃ©nin',
  'Bhoutan','BiÃ©lorussie','Birmanie','Bolivie','Bosnie-HerzÃ©govine','Botswana','BrÃ©sil',
  'Brunei','Bulgarie','Burkina Faso','Burundi','Cambodge','Cameroun','Canada','Cap-Vert',
  'Chili','Chine','Chypre','Colombie','Comores','Congo','Congo (RDC)',
  'CorÃ©e du Nord','CorÃ©e du Sud','Costa Rica',"CÃ´te d'Ivoire",'Croatie','Cuba','Danemark',
  'Djibouti','Dominique','Ã‰gypte','Ã‰mirats arabes unis','Ã‰quateur','Ã‰rythrÃ©e','Espagne',
  'Estonie','Ã‰tats-Unis','Ã‰thiopie','Fidji','Finlande','France','Gabon','Gambie',
  'GÃ©orgie','Ghana','GrÃ¨ce','Grenade','Guatemala','GuinÃ©e','GuinÃ©e-Bissau',
  'GuinÃ©e Ã©quatoriale','Guyana','HaÃ¯ti','Honduras','Hongrie','ÃŽles Cook','ÃŽles Marshall',
  'ÃŽles Salomon','Inde','IndonÃ©sie','Irak','Iran','Irlande','Islande','IsraÃ«l','Italie',
  'JamaÃ¯que','Japon','Jordanie','Kazakhstan','Kenya','Kirghizistan','Kiribati','KoweÃ¯t',
  'Laos','Lesotho','Lettonie','Liban','Liberia','Libye','Liechtenstein','Lituanie',
  'Luxembourg','MacÃ©doine du Nord','Madagascar','Malaisie','Malawi','Maldives','Mali',
  'Malte','Maroc','Maurice','Mauritanie','Mexique','MicronÃ©sie','Moldavie','Monaco',
  'Mongolie','MontÃ©nÃ©gro','Mozambique','Namibie','Nauru','NÃ©pal','Nicaragua','Niger',
  'Nigeria','NorvÃ¨ge','Nouvelle-ZÃ©lande','Oman','Ouganda','OuzbÃ©kistan','Pakistan',
  'Palaos','Palestine','Panama','Papouasie-Nouvelle-GuinÃ©e','Paraguay','Pays-Bas','PÃ©rou',
  'Philippines','Pologne','Portugal','Qatar','RÃ©publique centrafricaine',
  'RÃ©publique dominicaine','RÃ©publique tchÃ¨que','Roumanie','Royaume-Uni','Russie','Rwanda',
  'Saint-Christophe-et-NiÃ©vÃ¨s','Saint-Marin','Saint-Vincent-et-les-Grenadines','Sainte-Lucie',
  'Salvador','Samoa','SÃ£o TomÃ©-et-Principe','SÃ©nÃ©gal','Serbie','Seychelles','Sierra Leone',
  'Singapour','Slovaquie','SlovÃ©nie','Somalie','Soudan','Soudan du Sud','Sri Lanka',
  'SuÃ¨de','Suisse','Suriname','Syrie','Tadjikistan','Tanzanie','Tchad','ThaÃ¯lande',
  'Timor oriental','Togo','Tonga','TrinitÃ©-et-Tobago','Tunisie','TurkmÃ©nistan','Turquie',
  'Tuvalu','Ukraine','Uruguay','Vanuatu','Vatican','Venezuela','Vietnam','YÃ©men',
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

/** --- Types pour formulaire --- */
type BookingFormData = {
  title: string;
  description: string;
  phoneCountryCode: string;
  phoneNumber: string;
  acceptTerms: boolean;
  firstName: string;
  lastName: string;
  nationality: string;
  currentCountry: string;
  whatsappNumber: string;
  whatsappCountryCode: string;
  autrePays: string;
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

/** RetirÃ© `providerName` (inutilisÃ©) pour Ã©viter no-unused-vars */
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
        <span className="font-medium truncate">{title || 'â€”'}</span>
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
        â±ï¸ <span className="font-semibold">{duration ?? 'â€”'} min</span>
      </div>
      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-right">
        ðŸ’° <span className="font-semibold">{priceLabel || 'â€”'}</span>
      </div>
    </div>

    <div className="mt-3 text-xs text-gray-600">{langPack.satisfied}</div>
  </div>
);

/** ðŸ“ž Codes & pays (utilisÃ© pour dÃ©duire le pays par dÃ©faut) */
const countryCodeOptions = [
  { code: '+33', flag: 'ðŸ‡«ðŸ‡·', country: 'FR' },
  { code: '+1', flag: 'ðŸ‡ºðŸ‡¸', country: 'US' },
  { code: '+44', flag: 'ðŸ‡¬ðŸ‡§', country: 'GB' },
  { code: '+49', flag: 'ðŸ‡©ðŸ‡ª', country: 'DE' },
  { code: '+34', flag: 'ðŸ‡ªðŸ‡¸', country: 'ES' },
  { code: '+39', flag: 'ðŸ‡®ðŸ‡¹', country: 'IT' },
  { code: '+66', flag: 'ðŸ‡¹ðŸ‡­', country: 'TH' },
  { code: '+61', flag: 'ðŸ‡¦ðŸ‡º', country: 'AU' },
  { code: '+81', flag: 'ðŸ‡¯ðŸ‡µ', country: 'JP' },
  { code: '+86', flag: 'ðŸ‡¨ðŸ‡³', country: 'CN' },
];

/** ðŸ”§ util E.164 */
const toE164 = (raw: string, defaultCountry?: string) => {
  try {
    const p = parsePhoneNumberFromString(raw, defaultCountry as any);
    return p?.isValid() ? p.number : '';
  } catch {
    return '';
  }
};

/** ===== Page ===== */
const BookingRequest: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useApp();
  const lang = (language as LangKey) || 'fr';
  const t = I18N[lang];

  // Provider state
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoading, setProviderLoading] = useState<boolean>(true);

  // PRICING depuis l'admin
  const { pricing } = usePricingConfig();

  const [formData, setFormData] = useState<BookingFormData>({
    title: '',
    description: '',
    phoneCountryCode: '+33',
    phoneNumber: '',
    acceptTerms: false,
    firstName: '',
    lastName: '',
    nationality: '',
    currentCountry: '',
    whatsappNumber: '',
    whatsappCountryCode: '+33',
    autrePays: '',
  });

  const [languagesSpoken, setLanguagesSpoken] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [hasLanguageMatchRealTime, setHasLanguageMatchRealTime] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Refs pour scroll ciblÃ© vers erreurs
  const refFirstName = useRef<HTMLDivElement | null>(null);
  const refLastName = useRef<HTMLDivElement | null>(null);
  const refNationality = useRef<HTMLDivElement | null>(null);
  const refCountry = useRef<HTMLDivElement | null>(null);
  const refTitle = useRef<HTMLDivElement | null>(null);
  const refDesc = useRef<HTMLDivElement | null>(null);
  const refLangs = useRef<HTMLDivElement | null>(null);
  const refPhone = useRef<HTMLDivElement | null>(null);
  const refCGU = useRef<HTMLDivElement | null>(null);

  const inputClass = (fieldName: string) =>
    `w-full px-3 py-3 border-2 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none transition-all duration-200 text-base ${
      fieldErrors[fieldName]
        ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : 'border-gray-200 hover:border-gray-300 focus:border-red-600'
    }`;

  // Rediriger vers login si non connectÃ©
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
    if (languagesSpoken.length === 0) {
      setHasLanguageMatchRealTime(false);
      return;
    }
    const providerLanguages = provider.languages || provider.languagesSpoken || [];
    const clientCodes = languagesSpoken.map((l) => l.code);
    const hasMatch = providerLanguages.some((pl) => clientCodes.includes(pl));
    setHasLanguageMatchRealTime(hasMatch);
  }, [languagesSpoken, provider]);

  /** ðŸ“ž E.164 live (pour la validation et lâ€™aperÃ§u) */
  const selectedDial = useMemo(
    () => countryCodeOptions.find(c => c.code === formData.phoneCountryCode) || countryCodeOptions[0],
    [formData.phoneCountryCode]
  );
  const phoneRaw = useMemo(
    () => `${formData.phoneCountryCode}${formData.phoneNumber.replace(/\s+/g, '')}`,
    [formData.phoneCountryCode, formData.phoneNumber]
  );
  const phoneE164 = useMemo(() => toE164(phoneRaw, selectedDial.country), [phoneRaw, selectedDial.country]);

  const whatsappRaw = useMemo(
    () =>
      formData.whatsappNumber
        ? `${formData.whatsappCountryCode}${formData.whatsappNumber.replace(/\s+/g, '')}`
        : '',
    [formData.whatsappCountryCode, formData.whatsappNumber]
  );
  const whatsappE164 = useMemo(
    () => (formData.whatsappNumber ? toE164(whatsappRaw) : ''),
    [whatsappRaw, formData.whatsappNumber]
  );

  // Validation / progression
  const valid = useMemo(
    () => ({
      firstName: !!formData.firstName.trim(),
      lastName: !!formData.lastName.trim(),
      title: formData.title.trim().length >= 10,
      description: formData.description.trim().length >= 50,
      nationality: !!formData.nationality.trim(),
      currentCountry: !!formData.currentCountry.trim(),
      autrePays: formData.currentCountry !== 'Autre' ? true : !!formData.autrePays.trim(),
      langs: languagesSpoken.length > 0,
      phone: !!phoneE164,                       // âœ… E.164 sinon invalide
      accept: formData.acceptTerms,
      sharedLang: hasLanguageMatchRealTime,
    }),
    [formData, languagesSpoken, hasLanguageMatchRealTime, phoneE164],
  );

  const formProgress = useMemo(() => {
    const flags = Object.values(valid);
    const done = flags.filter(Boolean).length;
    return Math.round((done / flags.length) * 100);
  }, [valid]);

  // Redirection si provider introuvable une fois chargement terminÃ©
  useEffect(() => {
    if (!authLoading && !providerLoading && !provider) navigate('/');
  }, [provider, providerLoading, authLoading, navigate]);

  if (providerLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex items-center space-x-3 text-gray-700">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
            <span>Chargement du prestataireâ€¦</span>
          </div>
        </div>
      </Layout>
    );
  }
  if (!provider) return null;

  const isLawyer = provider.type === 'lawyer' || provider.role === 'lawyer';
  const role: ServiceType = isLawyer ? 'lawyer' : 'expat';

  /** Prix affichÃ©s (ADMIN si dispo, sinon secours) */
  const eurAdmin = pricing?.[role]?.eur;
  const usdAdmin = pricing?.[role]?.usd;

  const displayEUR = eurAdmin?.totalAmount ?? FALLBACK_TOTALS[role].eur;
  const displayUSD = usdAdmin?.totalAmount ?? FALLBACK_TOTALS[role].usd;
  const displayDuration =
    eurAdmin?.duration ?? usdAdmin?.duration ?? provider.duration ?? FALLBACK_TOTALS[role].duration;

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

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, acceptTerms: checked }));
      return;
    }

    let sanitizedValue = value;
    if (name === 'phoneNumber' || name === 'whatsappNumber') {
      sanitizedValue = value.replace(/[^\d\s+()-]/g, '');
    } else {
      sanitizedValue = sanitizeText(value, { trim: false });
    }
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

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
<p><strong>NationalitÃ©:</strong> ${requestData.clientNationality}</p>
<p><strong>Pays:</strong> ${requestData.clientCurrentCountry}</p>
<p><strong>TÃ©lÃ©phone:</strong> ${requestData.clientPhone}</p>
<p><strong>Titre:</strong> ${requestData.title}</p>
<p><strong>Description:</strong> ${requestData.description}</p>
<hr>
<p>Connectez-vous Ã  votre espace prestataire pour rÃ©pondre.</p>`.trim(),
        smsMessage: `SOS Expat: Nouvelle demande de ${requestData.clientFirstName}. Titre: "${requestData.title.substring(0, 30)}...". Consultez votre espace.`,
        whatsappMessage: `ðŸ”” SOS Expat: Nouvelle demande de ${requestData.clientFirstName} ${requestData.clientLastName}.\n\nTitre: "${requestData.title}"\nPays: ${requestData.clientCurrentCountry}\n\nConsultez votre espace prestataire.`,
      };

      if (requestData.providerEmail?.includes('@')) notificationData.recipientEmail = requestData.providerEmail;
      if (requestData.providerPhone && requestData.providerPhone.length > 5) notificationData.recipientPhone = requestData.providerPhone;

      if (!functions) throw new Error('Firebase Functions non initialisÃ©');
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
    clientPhoneE164: string,
    clientWhatsappE164: string,
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
      clientPhone: clientPhoneE164,
      clientId: (currentUser as any)?.uid ?? (currentUser as any)?.id,
      clientName: `${sanitizeInput(state.firstName)} ${sanitizeInput(state.lastName)}`.trim(),
      clientFirstName: sanitizeInput(state.firstName),
      clientLastName: sanitizeInput(state.lastName),
      clientNationality: sanitizeInput(state.nationality),
      clientCurrentCountry: sanitizeInput(state.currentCountry === 'Autre' ? state.autrePays : state.currentCountry),
      clientWhatsapp: clientWhatsappE164,
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
      clientLanguages: languagesSpoken.map((l) => l.code),
      clientLanguagesDetails: languagesSpoken.map((l) => ({ code: l.code, name: l.name })),
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
    const pairs: Array<[boolean, React.MutableRefObject<HTMLDivElement | null>]> = [
      [!valid.firstName, refFirstName],
      [!valid.lastName, refLastName],
      [!valid.nationality, refNationality],
      [!valid.currentCountry || !valid.autrePays, refCountry],
      [!valid.title, refTitle],
      [!valid.description, refDesc],
      [!valid.langs || !valid.sharedLang, refLangs],
      [!valid.phone, refPhone],
      [!valid.accept, refCGU],
    ];
    const target = pairs.find(([need]) => need)?.[1]?.current;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    const global: string[] = [];
    if (!valid.firstName) { e.firstName = t.validators.firstName; global.push(`â€“ ${t.validators.firstName}`); }
    if (!valid.lastName) { e.lastName = t.validators.lastName; global.push(`â€“ ${t.validators.lastName}`); }
    if (!valid.title) { e.title = t.validators.title; global.push(`â€“ ${t.validators.title}`); }
    if (!valid.description) { e.description = t.validators.description; global.push(`â€“ ${t.validators.description}`); }
    if (!valid.nationality) { e.nationality = t.validators.nationality; global.push(`â€“ ${t.validators.nationality}`); }
    if (!valid.currentCountry) { e.currentCountry = t.validators.currentCountry; global.push(`â€“ ${t.validators.currentCountry}`); }
    if (formData.currentCountry === 'Autre' && !valid.autrePays) { e.autrePays = t.validators.otherCountry; global.push(`â€“ ${t.validators.otherCountry}`); }
    if (!valid.langs) { e.languages = t.validators.languages; global.push(`â€“ ${t.validators.languages}`); }
    if (!valid.sharedLang) { global.push(`â€“ ${t.validators.langMismatch}`); }
    if (!valid.phone) { e.phoneNumber = t.validators.phone; global.push(`â€“ ${t.validators.phone}`); }
    if (!valid.accept) { global.push(`â€“ ${t.validators.accept}`); }
    setFieldErrors(e);
    setFormErrors(global);
    return global.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
 
    if (!hasLanguageMatchRealTime) {
      try {
        await logLanguageMismatch({
          clientLanguages: languagesSpoken.map((l) => l.code),
          customLanguage: undefined,
          providerId: provider?.id || '',
          providerLanguages: provider?.languages || provider?.languagesSpoken || [],
          formData: {
            title: formData.title,
            description: formData.description,
            nationality: formData.nationality,
            currentCountry: formData.currentCountry === 'Autre' ? formData.autrePays : formData.currentCountry,
          },
          source: 'booking_request_form',
        });
      } catch (error) {
        console.warn('logLanguageMismatch failed', error);
      }
      setFormError(t.validators.langMismatch);
      return;
    }

    if (!validateForm()) {
      scrollToFirstIncomplete();
      return;
    }

    setIsLoading(true);
    try {
      const eurTotalForDisplay = displayEUR;
      const durationForDisplay = displayDuration;

      const clientPhoneE164 = phoneE164;
      const clientWhatsappE164 = whatsappE164;

const { selectedProvider, bookingRequest } = prepareStandardizedData(
  formData,
  provider,
  user,
  eurTotalForDisplay,
  durationForDisplay,
  clientPhoneE164,
  clientWhatsappE164,
);

// ðŸ” UID de l'utilisateur connectÃ© (NE PAS dÃ©placer)
const uid = user?.uid;
if (!uid) {
  setFormError("Session expirÃ©e. Reconnectez-vous.");
  setIsLoading(false);
  return;
}



// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
// CrÃ©ation du booking request via le service centralisÃ©
// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
await createBookingRequest({
  clientId: uid,
  providerId: selectedProvider.id,

        serviceType: role === 'lawyer' ? 'lawyer_call' : 'expat_call',
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

      // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
      // ServiceData (admin = vÃ©ritÃ© ; fallback = prix secours + frais dÃ©faut)
      // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
      const selectedCurrency: Currency = detectUserCurrency();
      const roleForPricing: ServiceType = (provider.role || provider.type || 'expat') as ServiceType;

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
        sessionStorage.setItem('clientPhone', clientPhoneE164);
        sessionStorage.setItem(
          'serviceData',
          JSON.stringify({
            providerId: selectedProvider.id,
            serviceType: roleForPricing === 'lawyer' ? 'lawyer_call' : 'expat_call',
            providerRole: roleForPricing,
            amount: svcAmount,
            duration: svcDuration,
            clientPhone: clientPhoneE164,
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
      setFormError('Une erreur est survenue. Veuillez rÃ©essayer.');
    } finally {
      setIsLoading(false);
    }
  };

  /** ===== RENDER ===== */
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
                <img src="/default-avatar.png" alt="Avatar par dÃ©faut" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">{provider?.name || 'â€”'}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isLawyer ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
                  }`}
                >
                  {isLawyer ? 'âš–ï¸ Avocat' : 'ðŸŒ ExpatriÃ© aidant'}
                </span>
              </div>
              <div className="mt-1 text-xs sm:text-sm text-gray-700 flex items-center gap-2">
                <span className="font-medium">ðŸ“</span>
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
              <div className="text-2xl sm:text-3xl font-extrabold text-red-600">{`${displayEUR}â‚¬ / $${displayUSD}`}</div>
              <div className="text-sm text-gray-600 mt-1">{displayDuration} min</div>
              <div className="mt-1 text-xs text-gray-500">ðŸ’³ {t.securePay}</div>
            </div>
          </div>
        </div>

        {/* Form + Preview */}
        <div className="max-w-3xl mx-auto px-4">
          <div>
            {/* FORM */}
            <div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <form onSubmit={handleSubmit} noValidate>
                  {/* Section Perso */}
                  <section className="p-5 sm:p-6">
                    <SectionHeader icon={<MapPin className="w-5 h-5" />} title={t.personal} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PrÃ©nom */}
                      <div ref={refFirstName}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.fields.firstName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className={`${inputClass('firstName')} ${fieldErrors.firstName ? 'bg-red-50' : ''}`}
                          placeholder={t.placeholders.firstName}
                        />
                        <FieldSuccess show={valid.firstName}>Parfait ! âœ¨</FieldSuccess>
                        {fieldErrors.firstName && <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>}
                      </div>
                      {/* Nom */}
                      <div ref={refLastName}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {t.fields.lastName} <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className={`${inputClass('lastName')} ${fieldErrors.lastName ? 'bg-red-50' : ''}`}
                          placeholder={t.placeholders.lastName}
                        />
                        <FieldSuccess show={valid.lastName}>Parfait ! âœ¨</FieldSuccess>
                        {fieldErrors.lastName && <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>}
                      </div>
                    </div>

                    {/* NationalitÃ© */}
                    <div className="mt-4" ref={refNationality}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.fields.nationality} <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className={`${inputClass('nationality')} ${fieldErrors.nationality ? 'bg-red-50' : ''}`}
                        placeholder={t.placeholders.nationality}
                      />
                      {fieldErrors.nationality && <p className="mt-1 text-sm text-red-600">{fieldErrors.nationality}</p>}
                    </div>

                    {/* Pays d'intervention */}
                    <div className="mt-4" ref={refCountry}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.fields.currentCountry} <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="currentCountry"
                        value={formData.currentCountry}
                        onChange={handleInputChange}
                        className={`${inputClass('currentCountry')} ${fieldErrors.currentCountry ? 'bg-red-50' : ''}`}
                      >
                        <option value="">-- SÃ©lectionnez un pays --</option>
                        {countries.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      {fieldErrors.currentCountry && <p className="mt-1 text-sm text-red-600">{fieldErrors.currentCountry}</p>}
                      {formData.currentCountry === 'Autre' && (
                        <div className="mt-3">
                          <input
                            name="autrePays"
                            value={formData.autrePays}
                            onChange={handleInputChange}
                            className={`${inputClass('autrePays')} ${fieldErrors.autrePays ? 'bg-red-50' : ''}`}
                            placeholder={t.placeholders.otherCountry}
                          />
                          {fieldErrors.autrePays && <p className="mt-1 text-sm text-red-600">{fieldErrors.autrePays}</p>}
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
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`${inputClass('title')} ${fieldErrors.title ? 'bg-red-50' : ''}`}
                        placeholder={t.placeholders.title}
                      />
                      <div className="mt-1 text-xs text-gray-500">ðŸ’¡ {t.hints.title}</div>
                      <FieldSuccess show={valid.title}>Câ€™est clair ðŸ‘</FieldSuccess>
                      {fieldErrors.title && <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>}
                    </div>

                    {/* Description */}
                    <div className="mt-4" ref={refDesc}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {t.fields.description} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        rows={5}
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`resize-none ${inputClass('description')} ${fieldErrors.description ? 'bg-red-50' : ''}`}
                        placeholder={t.placeholders.description}
                      />
                      <div className="mt-1 text-xs text-gray-500">ðŸ”Ž {t.hints.desc}</div>
                      <FieldSuccess show={valid.description}>On y voit clair ðŸ‘€</FieldSuccess>
                      {fieldErrors.description && <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>}
                    </div>
                  </section>

                  {/* Section Langues */}
                  <section className="p-5 sm:p-6 border-t border-gray-50" ref={refLangs}>
                    <SectionHeader icon={<LanguagesIcon className="w-5 h-5" />} title={t.languages} />

                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      ðŸ—£ï¸ {lang === 'en' ? 'Spoken languages' : 'Langues parlÃ©es'} <span className="text-red-500">*</span>
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
                          if (fieldErrors.languages) setFieldErrors((prev) => { const r = { ...prev }; delete r.languages; return r; });
                        }}
                        providerLanguages={provider?.languages || provider?.languagesSpoken || []}
                        highlightShared
                        locale={lang}
                      />
                    </Suspense>

                    {fieldErrors.languages && <p className="mt-2 text-sm text-red-600">{fieldErrors.languages}</p>}

                    {/* CompatibilitÃ© */}
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
                                      <p className="text-green-900 font-semibold mb-2">âœ… {t.labels.compatible} :</p>
                                      <div className="flex flex-wrap gap-2">
                                        {compatible.map((l) => (
                                          <span key={l.code} className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full border border-green-200">
                                            ðŸŒ {l.name}
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
                                      <p className="text-red-700 font-semibold mb-2">âš ï¸ {t.labels.incompatible} :</p>
                                      <div className="flex flex-wrap gap-2">
                                        {incompatible.map((l) => (
                                          <span key={l.code} className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full border border-red-200">
                                            ðŸŒ {l.name}
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
                            <p className="text-red-700 font-semibold">ðŸš« {t.labels.communicationImpossible}</p>
                            <p className="text-red-600 text-sm mt-1">{t.labels.needShared}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Section Contact */}
                  <section className="p-5 sm:p-6 border-t border-gray-50" ref={refPhone}>
                    <SectionHeader icon={<Phone className="w-5 h-5" />} title={t.contact} />

                    {/* NumÃ©ro */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone size={16} className="inline mr-1" /> {t.fields.phone} <span className="text-red-500">*</span>
                      </label>

                      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                        <select
                          name="phoneCountryCode"
                          value={formData.phoneCountryCode}
                          onChange={handleInputChange}
                          className={`${inputClass('phoneNumber')} w-full sm:w-28 text-sm`}
                        >
                          {countryCodeOptions.map(({ code, flag }) => (
                            <option key={code} value={code}>
                              {flag} {code}
                            </option>
                          ))}
                        </select>
                        <input
                          name="phoneNumber"
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          className={`w-full sm:flex-1 ${inputClass('phoneNumber')} ${fieldErrors.phoneNumber ? 'bg-red-50' : ''}`}
                          placeholder={t.placeholders.phone}
                          maxLength={20}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                        <Info className={`w-4 h-4 ${THEME.icon}`} /> {t.hints.phone}
                      </div>
                      {fieldErrors.phoneNumber && <p className="mt-1 text-sm text-red-600">{fieldErrors.phoneNumber}</p>}
                      {!!phoneE164 && (
                        <div className="mt-1 text-xs text-gray-500">
                          âžœ International: <span className="font-mono">{phoneE164}</span>
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-700">â±ï¸ <strong>{t.callTiming}</strong></div>
                    </div>

                    {/* WhatsApp */}
                    <div className="mt-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MessageCircle size={16} className="inline mr-1" /> {t.fields.whatsapp}
                      </label>
                      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                        <select
                          name="whatsappCountryCode"
                          value={formData.whatsappCountryCode}
                          onChange={handleInputChange}
                          className={`${inputClass('whatsappNumber')} w-full sm:w-28 text-sm`}
                        >
                          {countryCodeOptions.map(({ code, flag }) => (
                            <option key={code} value={code}>
                              {flag} {code}
                            </option>
                          ))}
                        </select>
                        <input
                          name="whatsappNumber"
                          type="tel"
                          value={formData.whatsappNumber}
                          onChange={handleInputChange}
                          className={`w-full sm:flex-1 ${inputClass('whatsappNumber')}`}
                          placeholder={t.placeholders.phone}
                          maxLength={20}
                        />
                      </div>
                      {!!whatsappE164 && (
                        <div className="mt-1 text-xs text-gray-500">
                          âžœ WhatsApp (E.164): <span className="font-mono">{whatsappE164}</span>
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
                        <input
                          id="acceptTerms"
                          name="acceptTerms"
                          type="checkbox"
                          checked={formData.acceptTerms}
                          onChange={handleInputChange}
                          className="h-5 w-5 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 flex-shrink-0"
                          required
                        />
                        <label htmlFor="acceptTerms" className="text-sm text-gray-700 leading-relaxed">
                          {t.fields.accept}
                          <Link to="/cgu-clients" className="text-red-600 hover:text-red-700 underline font-medium">
                            {t.cgu}
                          </Link>
                          {t.fields.andConfirm}
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Erreurs globales */}
                  {(formErrors.length > 0 || formError) && (
                    <div className="px-5 sm:px-6 pb-0">
                      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="ml-3">
                            <p className="font-semibold text-red-800">{t.errorsTitle}</p>
                            {formError && <p className="text-sm text-red-700 mt-1">{formError}</p>}
                            {!!formErrors.length && (
                              <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                                {formErrors.map((err, i) => (<li key={i}>{err}</li>))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AperÃ§u rapide */}
                  <div className="px-5 sm:px-6">
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      {showPreview ? 'Masquer lâ€™aperÃ§u' : 'Afficher lâ€™aperÃ§u rapide'}
                    </button>

                    {showPreview && (
                      <div className="mt-3">
                        <PreviewCard
                          title={formData.title}
                          country={formData.currentCountry === 'Autre' ? formData.autrePays : formData.currentCountry}
                          langs={languagesSpoken.map((l) => l.code)}
                          phone={phoneE164 || `${formData.phoneCountryCode} ${formData.phoneNumber}`.trim()}
                          priceLabel={`${displayEUR}â‚¬ / $${displayUSD}`}
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
                      loading={isLoading}
                      fullWidth
                      size="large"
                      className={`${
                        valid.firstName &&
                        valid.lastName &&
                        valid.title &&
                        valid.description &&
                        valid.nationality &&
                        valid.currentCountry &&
                        valid.langs &&
                        valid.phone &&
                        valid.accept &&
                        valid.sharedLang
                          ? `bg-gradient-to-r ${THEME.button} hover:opacity-95 transform hover:scale-[1.01] shadow-lg`
                          : 'bg-gray-400 cursor-not-allowed'
                      } text-white font-bold py-4 px-6 sm:px-8 rounded-xl transition-all duration-300 ease-out text-base sm:text-lg`}
                      disabled={isLoading || !Object.values(valid).every(Boolean)}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                          Traitement en cours...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Euro size={20} className="mr-2 sm:mr-3" />
                          <span>
                            {t.continuePay} ({`${displayEUR}â‚¬ / $${displayUSD}`}
                            )
                          </span>
                        </div>
                      )}
                    </Button>

                    {!Object.values(valid).every(Boolean) && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm font-medium mb-2">
                          ðŸ”{' '}
                          {lang === 'en'
                            ? 'Missing to enable the button:'
                            : 'Ã‰lÃ©ments manquants pour activer le bouton :'}
                        </p>
                        <div className="grid grid-cols-1 gap-1 text-xs text-yellow-700">
                          {!valid.firstName && (
                            <div>â€¢ {t.validators.firstName}</div>
                          )}
                          {!valid.lastName && (
                            <div>â€¢ {t.validators.lastName}</div>
                          )}
                          {!valid.title && <div>â€¢ {t.validators.title}</div>}
                          {!valid.description && (
                            <div>â€¢ {t.validators.description}</div>
                          )}
                          {!valid.phone && <div>â€¢ {t.validators.phone}</div>}
                          {!valid.nationality && (
                            <div>â€¢ {t.validators.nationality}</div>
                          )}
                          {!valid.currentCountry && (
                            <div>â€¢ {t.validators.currentCountry}</div>
                          )}
                          {formData.currentCountry === 'Autre' &&
                            !valid.autrePays && (
                              <div>â€¢ {t.validators.otherCountry}</div>
                            )}
                          {!valid.langs && (
                            <div>â€¢ {t.validators.languages}</div>
                          )}
                          {!hasLanguageMatchRealTime && (
                            <div>â€¢ {t.validators.langMismatch}</div>
                          )}
                          {!valid.accept && (
                            <div>â€¢ {t.validators.accept}</div>
                          )}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={scrollToFirstIncomplete}
                            className="text-xs font-semibold underline text-gray-800"
                          >
                            {lang === 'en'
                              ? 'Jump to first missing field'
                              : 'Aller au premier champ manquant'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-center pt-4">
                      <p className="text-xs text-gray-500">
                        ðŸ”’ {t.securePay} â€¢ {t.callTiming}
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingRequest;
