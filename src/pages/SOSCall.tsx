import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Phone, Star, MapPin, Search, ChevronDown, Wifi, WifiOff, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, limit, onSnapshot, where, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import SEOHead from '../components/layout/SEOHead';
import { useApp } from '../contexts/AppContext';
import { getCountryCoordinates } from '../utils/countryCoordinates';

interface Provider {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  reviewCount: number;
  yearsOfExperience: number;
  rating: number;
  price: number;
  isOnline: boolean;
  avatar: string;
  specialties: string[];
  description: string;
  duration?: number;
  isActive?: boolean;
  isVisible?: boolean;
  isApproved?: boolean;
  hasValidCountry?: boolean;
  isBanned?: boolean;
}

interface RawProfile extends DocumentData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  type?: 'lawyer' | 'expat' | string;
  currentPresenceCountry?: string;
  country?: string;
  languages?: string[]; // peut contenir codes ISO
  specialties?: string[];
  rating?: number;
  reviewCount?: number;
  yearsOfExperience?: number;
  yearsAsExpat?: number;
  isOnline?: boolean;
  isActive?: boolean;
  isVisible?: boolean;
  isApproved?: boolean;
  isBanned?: boolean;
  bio?: string;
  price?: number;
  duration?: number;
  profilePhoto?: string;
}

/* ----------------------------
   Utils
-----------------------------*/
const slugify = (s: string) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalize = (s: string) =>
  slugify(s).replace(/-/g, '');

const LANGUAGE_LABELS_FR: Record<string, string> = {
  // ISO → Français
  af: 'Afrikaans', sq: 'Albanais', am: 'Amharique', ar: 'Arabe', hy: 'Arménien',
  az: 'Azéri', eu: 'Basque', be: 'Biélorusse', bn: 'Bengali', bs: 'Bosniaque',
  bg: 'Bulgare', my: 'Birman', ca: 'Catalan', zh: 'Chinois', 'zh-cn': 'Chinois', 'zh-tw': 'Chinois',
  hr: 'Croate', cs: 'Tchèque', da: 'Danois', nl: 'Néerlandais', en: 'Anglais',
  et: 'Estonien', fi: 'Finnois', fr: 'Français', ka: 'Géorgien', de: 'Allemand',
  el: 'Grec', gu: 'Gujarati', he: 'Hébreu', hi: 'Hindi', hu: 'Hongrois',
  is: 'Islandais', id: 'Indonésien', ga: 'Irlandais', it: 'Italien', ja: 'Japonais',
  kn: 'Kannada', kk: 'Kazakh', km: 'Khmer', ko: 'Coréen', ky: 'Kirghize',
  lo: 'Laotien', lv: 'Letton', lt: 'Lituanien', lb: 'Luxembourgeois', mk: 'Macédonien',
  ms: 'Malais', ml: 'Malayalam', mt: 'Maltais', mr: 'Marathi', mn: 'Mongol',
  ne: 'Népalais', no: 'Norvégien', nb: 'Norvégien', nn: 'Norvégien',
  fa: 'Persan', ps: 'Pachto', pl: 'Polonais', pt: 'Portugais', 'pt-br': 'Portugais',
  pa: 'Punjabi', ro: 'Roumain', ru: 'Russe', sr: 'Serbe', si: 'Singhalais',
  sk: 'Slovaque', sl: 'Slovène', es: 'Espagnol', sw: 'Swahili', sv: 'Suédois',
  ta: 'Tamoul', te: 'Telugu', th: 'Thaï', tr: 'Turc', tk: 'Turkmène',
  uk: 'Ukrainien', ur: 'Ourdou', vi: 'Vietnamien', cy: 'Gallois'
};

const LANGUAGE_ALIASES: Record<string, string> = {
  // Anglais/variantes → Français
  english: 'Anglais', french: 'Français', spanish: 'Espagnol', espanol: 'Espagnol',
  german: 'Allemand', deutsch: 'Allemand', italian: 'Italien', italiano: 'Italien',
  portuguese: 'Portugais', portugues: 'Portugais', russian: 'Russe', русский: 'Russe',
  chinese: 'Chinois', 中文: 'Chinois', japanese: 'Japonais', 日本語: 'Japonais',
  korean: 'Coréen', 한국어: 'Coréen', arabic: 'Arabe', العربية: 'Arabe',
  hindi: 'Hindi', thai: 'Thaï', thaii: 'Thaï'
};

const getLanguageLabel = (lang: string): string => {
  const raw = (lang || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  // iso direct
  if (LANGUAGE_LABELS_FR[key]) return LANGUAGE_LABELS_FR[key];
  // iso 2 lettres propres (ex: 'EN', 'Fr')
  const k2 = key.slice(0, 2);
  if (LANGUAGE_LABELS_FR[k2]) return LANGUAGE_LABELS_FR[k2];
  // alias anglais/var
  if (LANGUAGE_ALIASES[key]) return LANGUAGE_ALIASES[key];
  // déjà en français ? (capitalisation)
  const frenchGuess: Record<string, string> = {
    'francais': 'Français', 'anglais': 'Anglais', 'espagnol': 'Espagnol', 'allemand': 'Allemand',
    'italien': 'Italien', 'portugais': 'Portugais', 'russe': 'Russe', 'chinois': 'Chinois',
    'japonais': 'Japonais', 'coréen': 'Coréen', 'arabe': 'Arabe', 'hindi': 'Hindi', 'thaï': 'Thaï',
    'neerlandais': 'Néerlandais', 'néerlandais': 'Néerlandais', 'polonais': 'Polonais'
  };
  const norm = normalize(raw);
  for (const [k, v] of Object.entries(frenchGuess)) {
    if (normalize(k) === norm) return v;
  }
  // fallback: capitaliser
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/* ----------------------------
   Filtres (options)
-----------------------------*/
const countryOptions = [
  'Afghanistan','Afrique du Sud','Albanie','Algérie','Allemagne','Andorre','Angola',
  'Arabie Saoudite','Argentine','Arménie','Australie','Autriche','Azerbaïdjan',
  'Bahamas','Bahreïn','Bangladesh','Barbade','Belgique','Belize','Bénin',
  'Bhoutan','Biélorussie','Birmanie','Bolivie','Bosnie-Herzégovine','Botswana',
  'Brésil','Brunei','Bulgarie','Burkina Faso','Burundi','Cambodge','Cameroun',
  'Canada','Cap-Vert','Chili','Chine','Chypre','Colombie','Comores',
  'Congo','Corée du Nord','Corée du Sud','Costa Rica','Côte d\'Ivoire','Croatie','Cuba',
  'Danemark','Djibouti','Dominique','Égypte','Émirats arabes unis','Équateur','Érythrée',
  'Espagne','Estonie','États-Unis','Éthiopie','Fidji','Finlande','France',
  'Gabon','Gambie','Géorgie','Ghana','Grèce','Grenade','Guatemala','Guinée',
  'Guinée-Bissau','Guinée équatoriale','Guyana','Haïti','Honduras','Hongrie',
  'Îles Cook','Îles Marshall','Îles Salomon','Inde','Indonésie','Irak','Iran',
  'Irlande','Islande','Israël','Italie','Jamaïque','Japon','Jordanie',
  'Kazakhstan','Kenya','Kirghizistan','Kiribati','Koweït','Laos','Lesotho',
  'Lettonie','Liban','Liberia','Libye','Liechtenstein','Lituanie','Luxembourg',
  'Macédoine du Nord','Madagascar','Malaisie','Malawi','Maldives','Mali','Malte',
  'Maroc','Maurice','Mauritanie','Mexique','Micronésie','Moldavie','Monaco',
  'Mongolie','Monténégro','Mozambique','Namibie','Nauru','Népal','Nicaragua',
  'Niger','Nigeria','Niue','Norvège','Nouvelle-Zélande','Oman','Ouganda',
  'Ouzbékistan','Pakistan','Palaos','Palestine','Panama','Papouasie-Nouvelle-Guinée',
  'Paraguay','Pays-Bas','Pérou','Philippines','Pologne','Portugal','Qatar',
  'République centrafricaine','République démocratique du Congo','République dominicaine',
  'République tchèque','Roumanie','Royaume-Uni','Russie','Rwanda','Saint-Kitts-et-Nevis',
  'Saint-Marin','Saint-Vincent-et-les-Grenadines','Sainte-Lucie','Salvador','Samoa',
  'São Tomé-et-Principe','Sénégal','Serbie','Seychelles','Sierra Leone','Singapour',
  'Slovaquie','Slovénie','Somalie','Soudan','Soudan du Sud','Sri Lanka','Suède',
  'Suisse','Suriname','Syrie','Tadjikistan','Tanzanie','Tchad','Thaïlande',
  'Timor oriental','Togo','Tonga','Trinité-et-Tobago','Tunisie','Turkménistan',
  'Turquie','Tuvalu','Ukraine','Uruguay','Vanuatu','Vatican','Venezuela',
  'Vietnam','Yémen','Zambie','Zimbabwe'
];

const languageOptions = [
  'Français','Anglais','Espagnol','Allemand','Italien','Portugais','Russe','Chinois','Japonais','Coréen',
  'Arabe','Hindi','Thaï','Néerlandais','Polonais','Roumain','Turc','Vietnamien','Suédois','Norvégien',
  'Danois','Finnois','Tchèque','Slovaque','Ukrainien','Grec','Hébreu','Indonésien','Malais','Persan',
  'Ourdou','Tamoul','Telugu','Gujarati','Bengali','Punjabi','Serbe','Croate','Bulgarie','Hongrois',
  'Letton','Lituanien','Estonien','Slovène','Albanais','Islandais','Irlandais','Maltais','Macédonien',
  'Swahili','Afrikaans','Azéri','Arménien','Géorgien','Khmer','Laotien','Mongol','Népalais','Singhalais',
];

/* ----------------------------
   Composant principal
-----------------------------*/
const SOSCall: React.FC = () => {
  const { language } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // États filtres
  const [selectedType, setSelectedType] = useState<'all' | 'lawyer' | 'expat'>(
    searchParams.get('type') === 'lawyer' ? 'lawyer' :
    searchParams.get('type') === 'expat' ? 'expat' : 'all'
  );
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [customCountry, setCustomCountry] = useState<string>('');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [showCustomCountry, setShowCustomCountry] = useState<boolean>(false);
  const [showCustomLanguage, setShowCustomLanguage] = useState<boolean>(false);

  // Statut (tous / en ligne / hors-ligne). On conserve onlineOnly pour compat logique.
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);

  // Données
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const [realProviders, setRealProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);

  // Pagination & favoris
  const PAGE_SIZE = 9;
  const [page, setPage] = useState<number>(1);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('sos_favorites');
      if (!raw) return new Set<string>();
      const parsed: unknown = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
    } catch {
      return new Set<string>();
    }
  });

  // Charger providers (logique identique)
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'lawyer' || typeParam === 'expat') {
      setSelectedType(typeParam);
      setSearchParams({ type: typeParam });
    }

    const sosProfilesQuery = query(
      collection(db, 'sos_profiles'),
      where('type', 'in', ['lawyer', 'expat']),
      where('isVisible', '==', true),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      sosProfilesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setRealProviders([]);
          setFilteredProviders([]);
          setIsLoadingProviders(false);
          return;
        }

        const allProfiles: Provider[] = snapshot.docs.map((doc) => {
          const data = doc.data() as RawProfile;

          const fullName =
            data.fullName ||
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            'Expert';
          const type: 'lawyer' | 'expat' = data.type === 'lawyer' ? 'lawyer' : 'expat';

          const isApproved = data.isApproved !== false;
          const isActive = data.isActive !== false;
          const isOnline = data.isOnline === true;
          const isVisible = data.isVisible !== false;

          const presenceCountry = data.currentPresenceCountry || data.country || '';
          const hasValidCountry =
            !!presenceCountry && getCountryCoordinates(presenceCountry) !== null;

          return {
            id: doc.id,
            name: fullName,
            firstName: data.firstName,
            lastName: data.lastName,
            type,
            country: presenceCountry,
            languages: Array.isArray(data.languages) && data.languages.length > 0 ? data.languages : ['fr'],
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
            rating: typeof data.rating === 'number' ? data.rating : 4.5,
            reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
            yearsOfExperience:
              (typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : undefined) ??
              (typeof data.yearsAsExpat === 'number' ? data.yearsAsExpat : 0),
            isOnline,
            isActive,
            isVisible,
            isApproved,
            hasValidCountry,
            isBanned: !!data.isBanned,
            description: typeof data.bio === 'string' ? data.bio : '',
            price: typeof data.price === 'number' ? data.price : (type === 'lawyer' ? 49 : 19),
            duration: data.duration,
            avatar:
              typeof data.profilePhoto === 'string' && data.profilePhoto.trim() !== ''
                ? data.profilePhoto
                : 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2',
          };
        });

        const onlyProviders = allProfiles.filter(
          (p: Provider) => p.type === 'lawyer' || p.type === 'expat'
        );

        const activeProfiles = onlyProviders.filter((p: Provider) => {
          const notBanned = p.isBanned !== true;
          const hasBasicInfo = p.name && p.name.trim() !== '';
          const hasCountry = p.country && p.country.trim() !== '';
          const visible = p.isVisible !== false;
          const lawyerApproved = p.type !== 'lawyer' || p.isApproved !== false;
          return notBanned && hasBasicInfo && hasCountry && visible && lawyerApproved;
        });

        setRealProviders(activeProfiles);
        setFilteredProviders(activeProfiles);
        setIsLoadingProviders(false);
      },
      (error) => {
        console.error('Erreur lors de l’écoute des profils:', error);
        setRealProviders([]);
        setFilteredProviders([]);
        setIsLoadingProviders(false);
      }
    );

    return () => unsubscribe();
  }, [searchParams, setSearchParams]);

  // Normalisation pays : on compare slug + includes (FR/EN)
  const countryMatches = (providerCountry: string, selected: string, custom: string): boolean => {
    if (selected === 'all') return true;
    const prov = providerCountry || '';
    if (selected === 'Autre') {
      if (!custom) return true;
      return normalize(prov).includes(normalize(custom));
    }
    // stricte + slug + includes
    if (prov === selected) return true;
    if (normalize(prov) === normalize(selected)) return true;
    return prov.toLowerCase().includes(selected.toLowerCase());
  };

  // Normalisation langues : via label FR
  const langMatches = (langs: string[], selected: string, custom: string): boolean => {
    if (selected === 'all') return true;
    const normalizedProv = (langs || []).map((l) => normalize(getLanguageLabel(l)));
    if (selected === 'Autre') {
      if (!custom) return true;
      const needle = normalize(getLanguageLabel(custom));
      return normalizedProv.some((v) => v.includes(needle));
    }
    const target = normalize(getLanguageLabel(selected));
    return normalizedProv.some((v) => v === target);
  };

  // Filtrage + tri (conserve la logique d’origine, ajoute statut étendu)
  useEffect(() => {
    if (realProviders.length === 0) {
      setFilteredProviders([]);
      return;
    }

    const next = realProviders.filter((provider) => {
      const matchesType = selectedType === 'all' || provider.type === selectedType;
      const matchesCountry = countryMatches(provider.country, selectedCountry, customCountry);
      const matchesLanguage = langMatches(provider.languages, selectedLanguage, customLanguage);

      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'online' ? provider.isOnline :
        !provider.isOnline; // offline

      return matchesType && matchesCountry && matchesLanguage && matchesStatus;
    });

    next.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      }
      if (selectedCountry !== 'all') {
        const aCountryMatch = countryMatches(a.country, selectedCountry, customCountry);
        const bCountryMatch = countryMatches(b.country, selectedCountry, customCountry);
        if (aCountryMatch !== bCountryMatch) return aCountryMatch ? -1 : 1;
      }
      return b.rating - a.rating;
    });

    setFilteredProviders(next);
    setPage(1); // UX: reset à la première page si filtres changent
    setOnlineOnly(statusFilter === 'online'); // compat
  }, [
    realProviders,
    selectedType,
    selectedCountry,
    selectedLanguage,
    customCountry,
    customLanguage,
    statusFilter
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE));
  const paginatedProviders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProviders.slice(start, start + PAGE_SIZE);
  }, [filteredProviders, page]);

  // Handlers filtres
  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setShowCustomCountry(value === 'Autre');
    if (value !== 'Autre') setCustomCountry('');
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setShowCustomLanguage(value === 'Autre');
    if (value !== 'Autre') setCustomLanguage('');
  };

  // Navigation
  const handleProviderClick = (provider: Provider) => {
    const typeSlug = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
    const countrySlug = slugify(provider.country);
    const nameSlug = slugify(provider.name);
    const seoUrl = `/${typeSlug}/${countrySlug}/francais/${nameSlug}-${provider.id}`;

    if (location.pathname !== seoUrl) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
      } catch {
        // noop
      }
      navigate(seoUrl, {
        state: { selectedProvider: provider, navigationSource: 'sos_call' },
      });
    }
  };

  // Favoris
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('sos_favorites', JSON.stringify(Array.from(next)));
      } catch {
        // noop
      }
      return next;
    });
  };

  // Utilitaire
  const truncateText = (text: string, maxLength: number): { text: string; isTruncated: boolean } => {
    const safe = text || '';
    if (safe.length <= maxLength) return { text: safe, isTruncated: false };
    return { text: safe.substring(0, maxLength) + '...', isTruncated: true };
  };

  // Rendu
  return (
    <Layout>
      <SEOHead
        title={`${
          selectedType === 'lawyer'
            ? 'Avocats'
            : selectedType === 'expat'
            ? 'Expatriés'
            : 'Experts'
        } disponibles | SOS Expat & Travelers`}
        description={`Trouvez un ${
          selectedType === 'lawyer' ? 'avocat' : selectedType === 'expat' ? 'expatrié' : 'expert'
        } vérifié disponible immédiatement. Consultation en ligne 24h/24, 7j/7 dans plus de 150 pays.`}
        canonicalUrl="/sos-appel"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `SOS Experts ${selectedType === 'lawyer' ? 'Juridiques' : 'Expatriation'}`,
          provider: {
            '@type': 'Organization',
            name: 'SOS Expat & Travelers',
            url: 'https://sosexpat.com',
          },
          serviceType: selectedType === 'lawyer' ? 'Legal Consultation' : 'Expat Assistance',
          areaServed: {
            '@type': 'Country',
            name: selectedCountry !== 'all' ? selectedCountry : 'Worldwide',
          },
          description: `Service de consultation ${
            selectedType === 'lawyer' ? 'juridique' : 'expatriation'
          } en ligne disponible 24h/24`,
          availableChannel: {
            '@type': 'ServiceChannel',
            serviceType: 'Online Video Call',
            availableLanguage:
              selectedLanguage !== 'all'
                ? selectedLanguage
                : [language || 'French', 'English', 'Spanish'],
          },
        }}
      />

      <div className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-24 overflow-hidden" role="banner">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full pl-6 pr-3 py-2.5 border border-white/20 mb-7">
              <Phone className="w-5 h-5 text-red-300" />
              <span className="text-white font-semibold">SOS — appel d’urgence en &lt; 5 minutes</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-4">
              Trouvez un <span className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">expert</span> maintenant
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
              Avocats & Expatriés vérifiés • Disponibles 24/7 • <strong>150+ pays</strong>
            </p>
          </div>
        </section>

        {/* CONTENU */}
        <main className="py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-6">
            {/* Titre + Filtres */}
            <div className="text-center mb-8 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4">
                {selectedType === 'lawyer' ? 'Avocats disponibles' : selectedType === 'expat' ? 'Expatriés disponibles' : 'Experts disponibles'}
              </h2>

              {/* FILTRES */}
              <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Type */}
                  <div className="space-y-1">
                    <label htmlFor="expert-type" className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Type
                    </label>
                    <div className="relative">
                      <select
                        id="expert-type"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as 'all' | 'lawyer' | 'expat')}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all appearance-none text-sm text-white"
                      >
                        <option value="all">Tous</option>
                        <option value="lawyer">Avocats</option>
                        <option value="expat">Expatriés</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Pays */}
                  <div className="space-y-1">
                    <label htmlFor="country-filter" className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Pays
                    </label>
                    <div className="relative">
                      <select
                        id="country-filter"
                        value={selectedCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all appearance-none text-sm text-white"
                      >
                        <option value="all">Tous les pays</option>
                        {countryOptions.map((country) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 pointer-events-none" aria-hidden="true" />
                    </div>
                    {showCustomCountry && (
                      <input
                        type="text"
                        placeholder="Nom du pays"
                        value={customCountry}
                        onChange={(e) => setCustomCountry(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all text-sm text-white placeholder:text-gray-400 mt-2"
                      />
                    )}
                  </div>

                  {/* Langue */}
                  <div className="space-y-1">
                    <label htmlFor="language-filter" className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Langue
                    </label>
                    <div className="relative">
                      <select
                        id="language-filter"
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all appearance-none text-sm text-white"
                      >
                        <option value="all">Toutes</option>
                        {languageOptions.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 pointer-events-none" aria-hidden="true" />
                    </div>
                    {showCustomLanguage && (
                      <input
                        type="text"
                        placeholder="Langue"
                        value={customLanguage}
                        onChange={(e) => setCustomLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-transparent transition-all text-sm text-white placeholder:text-gray-400 mt-2"
                      />
                    )}
                  </div>

                  {/* Statut avec Wi-Fi */}
                  <div className="space-y-1 lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Statut
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${
                          statusFilter === 'all'
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/15'
                        }`}
                        aria-pressed={statusFilter === 'all'}
                      >
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        Tous
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('online')}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${
                          statusFilter === 'online'
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/15'
                        }`}
                        aria-pressed={statusFilter === 'online'}
                        title="En ligne"
                      >
                        <Wifi className="w-4 h-4" />
                        En ligne
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('offline')}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${
                          statusFilter === 'offline'
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/15'
                        }`}
                        aria-pressed={statusFilter === 'offline'}
                        title="Hors ligne"
                      >
                        <WifiOff className="w-4 h-4" />
                        Hors ligne
                      </button>
                    </div>
                  </div>

                  {/* Reset */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-transparent">
                      Action
                    </label>
                    <button
                      onClick={() => {
                        setSelectedType('all');
                        setSelectedCountry('all');
                        setSelectedLanguage('all');
                        setCustomCountry('');
                        setCustomLanguage('');
                        setShowCustomCountry(false);
                        setShowCustomLanguage(false);
                        setStatusFilter('all');
                        setOnlineOnly(false);
                      }}
                      className="w-full px-3 py-2 border border-white/15 rounded-xl text-gray-100 hover:bg-white/10 active:bg-white/15 transition-colors text-sm font-semibold h-10"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-gray-300">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/10 border border-white/15">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    {filteredProviders.filter((p) => p.isOnline).length} en ligne
                  </span>
                  <span className="mx-2 text-white/30">•</span>
                  {filteredProviders.length} au total
                </div>
              </div>
            </div>

            {/* PAGINATION (haut) */}
            {!isLoadingProviders && filteredProviders.length > 0 && (
              <div className="flex items-center justify-end mb-4">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}

            {/* Skeletons */}
            {isLoadingProviders ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <div key={`sk-${index}`} className="bg-white/5 rounded-[28px] border border-white/10 overflow-hidden animate-pulse">
                    <div className="aspect-[3/4] bg-white/10" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/10 rounded w-1/2" />
                      <div className="h-8 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              <>
                {/* Grille 9 cartes/page */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedProviders.map((provider) => {
                    const { text: truncatedDescription, isTruncated } = truncateText(provider.description, 110);
                    const langs = provider.languages
                      .slice(0, 3)
                      .map(getLanguageLabel);

                    return (
                      <article
                        key={provider.id}
                        className={`group rounded-[28px] overflow-hidden transition-all duration-500 hover:-translate-y-2 cursor-pointer border-[3px] bg-white/5 backdrop-blur-md hover:shadow-2xl hover:shadow-black/40 ${
                          provider.isOnline
                            ? 'border-green-500/80 shadow-[0_0_60px_-25px_rgba(34,197,94,0.7)]'
                            : 'border-red-500/80 shadow-[0_0_60px_-25px_rgba(239,68,68,0.7)]'
                        }`}
                        onClick={() => handleProviderClick(provider)}
                        itemScope
                        itemType="https://schema.org/Person"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={provider.avatar}
                            alt={`${provider.name} - ${provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'}`}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                            itemProp="image"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.onerror = null;
                              target.src = '/default-avatar.png';
                            }}
                          />

                          {/* gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 group-hover:from-black/30 transition-all duration-500" />

                          {/* type badge */}
                          <div className="absolute top-4 left-4">
                            <div className="px-4 py-2 rounded-2xl text-sm font-bold backdrop-blur-xl border bg-white/10 text-white border-white/20">
                              {provider.type === 'lawyer' ? '⚖️ Avocat' : '🌍 Expatrié'}
                            </div>
                          </div>

                          {/* rating */}
                          <div className="absolute top-4 right-4 flex items-center gap-2">
                            <button
                              aria-label="Ajouter aux favoris"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(provider.id);
                              }}
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl backdrop-blur-xl border transition ${
                                favorites.has(provider.id)
                                  ? 'bg-red-500/20 border-red-400/40'
                                  : 'bg-white/95 border-white shadow-xl'
                              }`}
                              title={favorites.has(provider.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                              <Heart className={`w-5 h-5 ${favorites.has(provider.id) ? 'text-red-500' : 'text-gray-900'}`} />
                            </button>

                            <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* wifi status */}
                          <div className="absolute bottom-4 right-4">
                            <div className="flex items-center gap-2 bg-white/95 text-gray-900 rounded-2xl px-3 py-1.5 shadow-xl border border-white">
                              {provider.isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
                              <span className="text-xs font-semibold">{provider.isOnline ? 'En ligne' : 'Hors ligne'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 flex flex-col h-80 text-white">
                          <div className="mb-4">
                            <h3 className="text-xl font-extrabold mb-2 line-clamp-2 group-hover:text-red-300 transition-colors" itemProp="name">
                              {provider.name}
                            </h3>
                            <div className="flex items-center justify-between text-sm text-gray-300">
                              <span>{provider.yearsOfExperience} ans d'expérience</span>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-400" />
                                <span className="font-medium">{provider.country}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 flex-1">
                            {/* langues */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                  <span className="text-sm">🗣️</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-200">Langues parlées</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {langs.map((lang, idx) => (
                                  <span
                                    key={`${provider.id}-lang-${idx}`}
                                    className="px-3 py-1 bg-white/10 border border-white/15 text-gray-100 text-sm font-medium rounded-full"
                                  >
                                    {lang}
                                  </span>
                                ))}
                                {provider.languages.length > 3 && (
                                  <span className="px-3 py-1 bg-white/10 border border-white/15 text-gray-200 text-sm rounded-full">
                                    +{provider.languages.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* description */}
                            {provider.description && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                    <span className="text-sm">📋</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-200">Présentation</span>
                                </div>
                                <p className="text-sm text-gray-200/90 leading-relaxed" itemProp="description">
                                  {truncatedDescription}
                                </p>
                                {isTruncated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProviderClick(provider);
                                    }}
                                    className="text-sm text-red-300 hover:text-red-200 font-semibold mt-1 hover:underline transition-colors inline-flex items-center gap-1"
                                  >
                                    Lire la suite
                                    <span className="text-xs">→</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-auto pt-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProviderClick(provider);
                              }}
                              className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 transform active:scale-[0.98] shadow-xl hover:shadow-2xl ${
                                provider.type === 'lawyer'
                                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                              }`}
                            >
                              <span className="text-xl">👤</span>
                              <span>Voir le profil</span>
                            </button>
                          </div>

                          <div className="sr-only">
                            <span itemProp="jobTitle">{provider.type === 'lawyer' ? 'Avocat' : 'Consultant expatriation'}</span>
                            <span itemProp="workLocation">{provider.country}</span>
                            <span itemProp="knowsLanguage">{provider.languages.map(getLanguageLabel).join(', ')}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination (bas) */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-300">
                    Page <strong>{page}</strong> / {totalPages} — {filteredProviders.length} résultats
                  </div>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-md p-8 sm:p-12 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-200" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Aucun expert trouvé
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Aucun expert ne correspond à vos critères de recherche actuels.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedType('all');
                      setSelectedCountry('all');
                      setSelectedLanguage('all');
                      setCustomCountry('');
                      setCustomLanguage('');
                      setShowCustomCountry(false);
                      setShowCustomLanguage(false);
                      setStatusFilter('all');
                      setOnlineOnly(false);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}

            {/* CTA alignée Home, 150+ pays */}
            <section className="text-center mt-12 sm:mt-16">
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md p-8 sm:p-12">
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                  Besoin d'aide immédiate ?
                </h3>
                <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                  Plus de 200 experts vérifiés disponibles dans <strong>150+ pays</strong> pour vous accompagner.
                </p>
                <button
                  onClick={() => navigate('/sos-appel')}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  <Phone className="w-5 h-5" />
                  Trouver un expert
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </Layout>
  );
};

/* ----------------------------
   Pagination component
-----------------------------*/
const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const np = Math.min(totalPages, Math.max(1, p));
    if (np !== page) onChange(np);
  };

  const makePages = (): Array<number | 'ellipsis'> => {
    const pages: Array<number | 'ellipsis'> = [];
    const add = (n: number) => pages.push(n);
    const addEllipsis = () => {
      if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
    };

    const windowSize = 1; // autour de la page courante
    add(1);
    for (let i = page - windowSize; i <= page + windowSize; i++) {
      if (i > 1 && i < totalPages) add(i);
    }
    if (totalPages > 1) add(totalPages);

    // dédoublonne et ordonne
    const sorted = Array.from(new Set(pages)).sort((a, b) =>
      typeof a === 'number' && typeof b === 'number' ? a - b : 0
    );

    // insère ellipses
    const withEllipses: Array<number | 'ellipsis'> = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i] as number;
      const prev = sorted[i - 1] as number | undefined;
      if (i > 0 && prev !== undefined && typeof prev === 'number' && cur - prev > 1) {
        addEllipsis.call({}); // placeholder
        withEllipses.push('ellipsis');
      }
      withEllipses.push(cur);
    }
    return withEllipses;
  };

  const items = makePages();

  return (
    <nav className="inline-flex items-center gap-1" aria-label="Pagination">
      <button
        onClick={() => go(page - 1)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={page <= 1}
        aria-label="Page précédente"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Précédent</span>
      </button>

      {items.map((it, idx) =>
        it === 'ellipsis' ? (
          <span key={`el-${idx}`} className="px-2 text-gray-300">…</span>
        ) : (
          <button
            key={`p-${it}`}
            onClick={() => go(it)}
            aria-current={it === page ? 'page' : undefined}
            className={`w-9 h-9 rounded-xl border text-sm font-semibold transition ${
              it === page
                ? 'bg-white/20 text-white border-white/30'
                : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/15'
            }`}
            title={`Aller à la page ${it}`}
          >
            {it}
          </button>
        )
      )}

      <button
        onClick={() => go(page + 1)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={page >= totalPages}
        aria-label="Page suivante"
      >
        <span className="hidden sm:inline">Suivant</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

export default SOSCall;
