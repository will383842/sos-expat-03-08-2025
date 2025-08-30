import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Phone, Star, MapPin, Search, ChevronDown, Wifi, WifiOff, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, limit, onSnapshot, where, DocumentData, doc, getDoc, getDocs } from 'firebase/firestore';
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
  languages?: string[];
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
  // ISO â†’ FranÃ§ais
  af: 'Afrikaans', sq: 'Albanais', am: 'Amharique', ar: 'Arabe', hy: 'ArmÃ©nien',
  az: 'AzÃ©ri', eu: 'Basque', be: 'BiÃ©lorusse', bn: 'Bengali', bs: 'Bosniaque',
  bg: 'Bulgare', my: 'Birman', ca: 'Catalan', zh: 'Chinois', 'zh-cn': 'Chinois', 'zh-tw': 'Chinois',
  hr: 'Croate', cs: 'TchÃ¨que', da: 'Danois', nl: 'NÃ©erlandais', en: 'Anglais',
  et: 'Estonien', fi: 'Finnois', fr: 'FranÃ§ais', ka: 'GÃ©orgien', de: 'Allemand',
  el: 'Grec', gu: 'Gujarati', he: 'HÃ©breu', hi: 'Hindi', hu: 'Hongrois',
  is: 'Islandais', id: 'IndonÃ©sien', ga: 'Irlandais', it: 'Italien', ja: 'Japonais',
  kn: 'Kannada', kk: 'Kazakh', km: 'Khmer', ko: 'CorÃ©en', ky: 'Kirghize',
  lo: 'Laotien', lv: 'Letton', lt: 'Lituanien', lb: 'Luxembourgeois', mk: 'MacÃ©donien',
  ms: 'Malais', ml: 'Malayalam', mt: 'Maltais', mr: 'Marathi', mn: 'Mongol',
  ne: 'NÃ©palais', no: 'NorvÃ©gien', nb: 'NorvÃ©gien', nn: 'NorvÃ©gien',
  fa: 'Persan', ps: 'Pachto', pl: 'Polonais', pt: 'Portugais', 'pt-br': 'Portugais',
  pa: 'Punjabi', ro: 'Roumain', ru: 'Russe', sr: 'Serbe', si: 'Singhalais',
  sk: 'Slovaque', sl: 'SlovÃ¨ne', es: 'Espagnol', sw: 'Swahili', sv: 'SuÃ©dois',
  ta: 'Tamoul', te: 'Telugu', th: 'ThaÃ¯', tr: 'Turc', tk: 'TurkmÃ¨ne',
  uk: 'Ukrainien', ur: 'Ourdou', vi: 'Vietnamien', cy: 'Gallois'
};

const LANGUAGE_ALIASES: Record<string, string> = {
  // Anglais/variantes â†’ FranÃ§ais
  english: 'Anglais', french: 'FranÃ§ais', spanish: 'Espagnol', espanol: 'Espagnol',
  german: 'Allemand', deutsch: 'Allemand', italian: 'Italien', italiano: 'Italien',
  portuguese: 'Portugais', portugues: 'Portugais', russian: 'Russe', Ñ€ÑƒÑÑÐºÐ¸Ð¹: 'Russe',
  chinese: 'Chinois', ä¸­æ–‡: 'Chinois', japanese: 'Japonais', æ—¥æœ¬èªž: 'Japonais',
  korean: 'CorÃ©en', í•œêµ­ì–´: 'CorÃ©en', arabic: 'Arabe', Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©: 'Arabe',
  hindi: 'Hindi', thai: 'ThaÃ¯', thaii: 'ThaÃ¯'
};

const getLanguageLabel = (language: string): string => {
  const raw = (language || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  // iso direct
  if (LANGUAGE_LABELS_FR[key]) return LANGUAGE_LABELS_FR[key];
  // iso 2 lettres propres (ex: 'EN', 'Fr')
  const k2 = key.slice(0, 2);
  if (LANGUAGE_LABELS_FR[k2]) return LANGUAGE_LABELS_FR[k2];
  // alias anglais/var
  if (LANGUAGE_ALIASES[key]) return LANGUAGE_ALIASES[key];
  // dÃ©jÃ  en franÃ§ais ? (capitalisation)
  const frenchGuess: Record<string, string> = {
    'francais': 'FranÃ§ais', 'anglais': 'Anglais', 'espagnol': 'Espagnol', 'allemand': 'Allemand',
    'italien': 'Italien', 'portugais': 'Portugais', 'russe': 'Russe', 'chinois': 'Chinois',
    'japonais': 'Japonais', 'corÃ©en': 'CorÃ©en', 'arabe': 'Arabe', 'hindi': 'Hindi', 'thaÃ¯': 'ThaÃ¯',
    'neerlandais': 'NÃ©erlandais', 'nÃ©erlandais': 'NÃ©erlandais', 'polonais': 'Polonais'
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
  'Afghanistan','Afrique du Sud','Albanie','AlgÃ©rie','Allemagne','Andorre','Angola',
  'Arabie Saoudite','Argentine','ArmÃ©nie','Australie','Autriche','AzerbaÃ¯djan',
  'Bahamas','BahreÃ¯n','Bangladesh','Barbade','Belgique','Belize','BÃ©nin',
  'Bhoutan','BiÃ©lorussie','Birmanie','Bolivie','Bosnie-HerzÃ©govine','Botswana',
  'BrÃ©sil','Brunei','Bulgarie','Burkina Faso','Burundi','Cambodge','Cameroun',
  'Canada','Cap-Vert','Chili','Chine','Chypre','Colombie','Comores',
  'Congo','CorÃ©e du Nord','CorÃ©e du Sud','Costa Rica','CÃ´te d\'Ivoire','Croatie','Cuba',
  'Danemark','Djibouti','Dominique','Ã‰gypte','Ã‰mirats arabes unis','Ã‰quateur','Ã‰rythrÃ©e',
  'Espagne','Estonie','Ã‰tats-Unis','Ã‰thiopie','Fidji','Finlande','France',
  'Gabon','Gambie','GÃ©orgie','Ghana','GrÃ¨ce','Grenade','Guatemala','GuinÃ©e',
  'GuinÃ©e-Bissau','GuinÃ©e Ã©quatoriale','Guyana','HaÃ¯ti','Honduras','Hongrie',
  'ÃŽles Cook','ÃŽles Marshall','ÃŽles Salomon','Inde','IndonÃ©sie','Irak','Iran',
  'Irlande','Islande','IsraÃ«l','Italie','JamaÃ¯que','Japon','Jordanie',
  'Kazakhstan','Kenya','Kirghizistan','Kiribati','KoweÃ¯t','Laos','Lesotho',
  'Lettonie','Liban','Liberia','Libye','Liechtenstein','Lituanie','Luxembourg',
  'MacÃ©doine du Nord','Madagascar','Malaisie','Malawi','Maldives','Mali','Malte',
  'Maroc','Maurice','Mauritanie','Mexique','MicronÃ©sie','Moldavie','Monaco',
  'Mongolie','MontÃ©nÃ©gro','Mozambique','Namibie','Nauru','NÃ©pal','Nicaragua',
  'Niger','Nigeria','Niue','NorvÃ¨ge','Nouvelle-ZÃ©lande','Oman','Ouganda',
  'OuzbÃ©kistan','Pakistan','Palaos','Palestine','Panama','Papouasie-Nouvelle-GuinÃ©e',
  'Paraguay','Pays-Bas','PÃ©rou','Philippines','Pologne','Portugal','Qatar',
  'RÃ©publique centrafricaine','RÃ©publique dÃ©mocratique du Congo','RÃ©publique dominicaine',
  'RÃ©publique tchÃ¨que','Roumanie','Royaume-Uni','Russie','Rwanda','Saint-Kitts-et-Nevis',
  'Saint-Marin','Saint-Vincent-et-les-Grenadines','Sainte-Lucie','Salvador','Samoa',
  'SÃ£o TomÃ©-et-Principe','SÃ©nÃ©gal','Serbie','Seychelles','Sierra Leone','Singapour',
  'Slovaquie','SlovÃ©nie','Somalie','Soudan','Soudan du Sud','Sri Lanka','SuÃ¨de',
  'Suisse','Suriname','Syrie','Tadjikistan','Tanzanie','Tchad','ThaÃ¯lande',
  'Timor oriental','Togo','Tonga','TrinitÃ©-et-Tobago','Tunisie','TurkmÃ©nistan',
  'Turquie','Tuvalu','Ukraine','Uruguay','Vanuatu','Vatican','Venezuela',
  'Vietnam','YÃ©men','Zambie','Zimbabwe'
];

const languageOptions = [
  'FranÃ§ais','Anglais','Espagnol','Allemand','Italien','Portugais','Russe','Chinois','Japonais','CorÃ©en',
  'Arabe','Hindi','ThaÃ¯','NÃ©erlandais','Polonais','Roumain','Turc','Vietnamien','SuÃ©dois','NorvÃ©gien',
  'Danois','Finnois','TchÃ¨que','Slovaque','Ukrainien','Grec','HÃ©breu','IndonÃ©sien','Malais','Persan',
  'Ourdou','Tamoul','Telugu','Gujarati','Bengali','Punjabi','Serbe','Croate','Bulgarie','Hongrois',
  'Letton','Lituanien','Estonien','SlovÃ¨ne','Albanais','Islandais','Irlandais','Maltais','MacÃ©donien',
  'Swahili','Afrikaans','AzÃ©ri','ArmÃ©nien','GÃ©orgien','Khmer','Laotien','Mongol','NÃ©palais','Singhalais',
];

/* ----------------------------
   Composant principal
-----------------------------*/
const SOSCall: React.FC = () => {
  const { language } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Ã‰tats filtres
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

  // DonnÃ©es
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

  // Charger providers (logique identique avec DEBUG)
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'lawyer' || typeParam === 'expat') {
      setSelectedType(typeParam);
      setSearchParams({ type: typeParam });
    }

    // ðŸ”§ DÃ‰BUT DEBUG SOSCall
    console.log('\nðŸ” DEBUG SOSCALL - DÃ‰BUT');
    
    // Test requÃªte simple AVANT la requÃªte principale
    const debugQueries = async () => {
      try {
        console.log('ðŸ“¡ SOSCall - Test requÃªte basique...');
        const simpleQuery = query(collection(db, 'sos_profiles'));
        const simpleSnap = await getDocs(simpleQuery);
        console.log(`ðŸ“Š SOSCall - Tous les documents: ${simpleSnap.size}`);
        
        simpleSnap.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`SOSCall Doc ${i+1}: ${doc.id}`, {
            type: data.type,
            isVisible: data.isVisible,
            isActive: data.isActive,
            isApproved: data.isApproved,
            fullName: data.fullName
          });
        });

        console.log('ðŸ“¡ SOSCall - Test avec filtres...');
        const filteredQuery = query(
          collection(db, 'sos_profiles'),
          where('type', 'in', ['lawyer', 'expat']),
          where('isVisible', '==', true),
          limit(100)
        );
        const filteredSnap = await getDocs(filteredQuery);
        console.log(`ðŸ“Š SOSCall - Avec filtres: ${filteredSnap.size}`);
        
        filteredSnap.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`SOSCall Filtered ${i+1}: ${doc.id}`, {
            type: data.type,
            isVisible: data.isVisible,
            name: data.fullName
          });
        });

        // ðŸ” VÃ‰RIFICATION SPÃ‰CIFIQUE DE VOS PROFILS dans SOSCall
        console.log('\nðŸ” SOSCall - VÃ‰RIFICATION SPÃ‰CIFIQUE DE VOS PROFILS');
        const targetProfiles = ['expat2', 'expat3', 'avocat1']; // Adaptez les IDs
        
        for (const profileId of targetProfiles) {
          try {
            const docRef = doc(db, 'sos_profiles', profileId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              console.log(`âœ… SOSCall - ${profileId} existe:`, {
                type: data.type,
                isVisible: data.isVisible,
                isActive: data.isActive,
                isApproved: data.isApproved,
                typeCheck: ['lawyer', 'expat'].includes(data.type),
                visibleCheck: data.isVisible === true,
                passesFilters: data.isVisible === true && ['lawyer', 'expat'].includes(data.type)
              });
            } else {
              console.log(`âŒ SOSCall - ${profileId} N'EXISTE PAS`);
            }
          } catch (err) {
            console.error(`ðŸ’¥ SOSCall - Erreur ${profileId}:`, err);
          }
        }
        
      } catch (error) {
        console.error('ðŸ” Erreur debug SOSCall:', error);
      }
    };
    
    debugQueries();
    // ðŸ”§ FIN DEBUG SOSCall

    const sosProfilesQuery = query(
      collection(db, 'sos_profiles'),
      where('type', 'in', ['lawyer', 'expat']),
      where('isVisible', '==', true),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      sosProfilesQuery,
      (snapshot) => {
        console.log(`ðŸ” SOSCall onSnapshot reÃ§u: ${snapshot.size} documents`);
        
        if (snapshot.empty) {
          console.log('âš ï¸ SOSCall: Snapshot vide - Aucun document trouvÃ©');
          setRealProviders([]);
          setFilteredProviders([]);
          setIsLoadingProviders(false);
          return;
        }

        const allProfiles: Provider[] = [];

        snapshot.docs.forEach((doc, index) => {
          const data = doc.data() as RawProfile;
          const docId = doc.id;

          console.log(`\nðŸ”„ SOSCall TRAITEMENT ${docId} (${index + 1}/${snapshot.size}):`);

          const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Expert';
          const type: 'lawyer' | 'expat' = data.type === 'lawyer' ? 'lawyer' : 'expat';

          console.log(`1ï¸âƒ£ SOSCall - Nom: "${fullName}", Type: "${type}"`);

          const isApproved = data.isApproved !== false;
          const isActive = data.isActive !== false;
          const isOnline = data.isOnline === true;
          const isVisible = data.isVisible !== false;

          const presenceCountry = data.currentPresenceCountry || data.country || '';
          const hasValidCountry = !!presenceCountry && getCountryCoordinates(presenceCountry) !== null;

          console.log(`2ï¸âƒ£ SOSCall - Validations:`, {
            isApproved: `${data.isApproved} â†’ ${isApproved}`,
            isActive: `${data.isActive} â†’ ${isActive}`,
            isVisible: `${data.isVisible} â†’ ${isVisible}`,
            hasValidCountry,
            presenceCountry
          });

          const provider: Provider = {
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

          // ðŸ”§ VALIDATION SOSCall avec logs dÃ©taillÃ©s
          const validations = {
            typeValid: provider.type === 'lawyer' || provider.type === 'expat',
            notBanned: provider.isBanned !== true,
            hasBasicInfo: provider.name && provider.name.trim() !== '',
            hasCountry: provider.country && provider.country.trim() !== '',
            isVisible: provider.isVisible !== false,
            lawyerApproved: provider.type !== 'lawyer' || provider.isApproved !== false
          };

          const shouldInclude = Object.values(validations).every(Boolean);

          console.log(`3ï¸âƒ£ SOSCall - DÃ©cision finale ${provider.name}:`, {
            ...validations,
            shouldInclude
          });

          if (shouldInclude) {
            allProfiles.push(provider);
            console.log(`âœ… SOSCall - ${provider.name} (${provider.type}) AJOUTÃ‰ - Total: ${allProfiles.length}`);
          } else {
            console.log(`âŒ SOSCall - ${provider.name} (${provider.type}) REJETÃ‰`);
          }
        });

        console.log(`\nðŸ SOSCall RÃ‰SULTAT FINAL: ${allProfiles.length} profils ajoutÃ©s`);
        console.log('SOSCall Profils finaux:', allProfiles.map(p => ({ id: p.id, name: p.name, type: p.type })));

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
        console.error('[SOSCall] Firebase error:', error);
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

  // Filtrage + tri (conserve la logique d'origine, ajoute statut Ã©tendu)
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
    setPage(1); // UX: reset Ã  la premiÃ¨re page si filtres changent
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
            ? 'ExpatriÃ©s'
            : 'Experts'
        } disponibles | SOS Expat & Travelers`}
        description={`Trouvez un ${
          selectedType === 'lawyer' ? 'avocat' : selectedType === 'expat' ? 'expatriÃ©' : 'expert'
        } vÃ©rifiÃ© disponible immÃ©diatement. Consultation en ligne 24h/24, 7j/7 dans plus de 150 pays.`}
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
              <span className="text-white font-semibold">SOS â€” appel d'urgence en &lt; 5 minutes</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-4">
              Trouvez un <span className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">expert</span> maintenant
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
              Avocats & ExpatriÃ©s vÃ©rifiÃ©s â€¢ Disponibles 24/7 â€¢ <strong>150+ pays</strong>
            </p>
          </div>
        </section>

        {/* CONTENU */}
        <main className="py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-6">
            {/* Titre + Filtres */}
            <div className="text-center mb-8 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4">
                {selectedType === 'lawyer' ? 'Avocats disponibles' : selectedType === 'expat' ? 'ExpatriÃ©s disponibles' : 'Experts disponibles'}
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
                        className="
                          w-full px-3 py-2
                          bg-white text-gray-900
                          border border-gray-300 rounded-xl
                          dark:bg-white/10 dark:text-white dark:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent
                          transition-all appearance-none text-sm
                        "
                      >
                        <option value="all">Tous</option>
                        <option value="lawyer">Avocats</option>
                        <option value="expat">ExpatriÃ©s</option>
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300 pointer-events-none"
                        aria-hidden="true"
                      />
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
                        className="
                          w-full px-3 py-2
                          bg-white text-gray-900
                          border border-gray-300 rounded-xl
                          dark:bg-white/10 dark:text-white dark:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent
                          transition-all appearance-none text-sm
                        "
                      >
                        <option value="all">Tous les pays</option>
                        {countryOptions.map((country) => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300 pointer-events-none"
                        aria-hidden="true"
                      />
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
                        className="
                          w-full px-3 py-2
                          bg-white text-gray-900
                          border border-gray-300 rounded-xl
                          dark:bg-white/10 dark:text-white dark:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent
                          transition-all appearance-none text-sm
                        "
                      >
                        <option value="all">Toutes</option>
                        {languageOptions.map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                        <option value="Autre">Autre</option>
                      </select>
                      <ChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-300 pointer-events-none"
                        aria-hidden="true"
                      />
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
                      RÃ©initialiser
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-gray-300">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/10 border border-white/15">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    {filteredProviders.filter((p) => p.isOnline).length} en ligne
                  </span>
                  <span className="mx-2 text-white/30">â€¢</span>
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
                            alt={`${provider.name} - ${provider.type === 'lawyer' ? 'Avocat' : 'ExpatriÃ©'}`}
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
                              {provider.type === 'lawyer' ? 'âš–ï¸ Avocat' : 'ðŸŒ ExpatriÃ©'}
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
                              <span>{provider.yearsOfExperience} ans d'expÃ©rience</span>
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
                                  <span className="text-sm">ðŸ—£ï¸</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-200">Langues parlÃ©es</span>
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
                                    <span className="text-sm">ðŸ“‹</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-200">PrÃ©sentation</span>
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
                                    <span className="text-xs">â†’</span>
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
                              <span className="text-xl">ðŸ‘¤</span>
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
                    Page <strong>{page}</strong> / {totalPages} â€” {filteredProviders.length} rÃ©sultats
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
                    Aucun expert trouvÃ©
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Aucun expert ne correspond Ã  vos critÃ¨res de recherche actuels.
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
                    RÃ©initialiser les filtres
                  </button>
                </div>
              </div>
            )}

            {/* CTA alignÃ©e Home, 150+ pays */}
            <section className="text-center mt-12 sm:mt-16">
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md p-8 sm:p-12">
                <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                  Besoin d'aide immÃ©diate ?
                </h3>
                <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                  Plus de 200 experts vÃ©rifiÃ©s disponibles dans <strong>150+ pays</strong> pour vous accompagner.
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

    // dÃ©doublonne et ordonne
    const sorted = Array.from(new Set(pages)).sort((a, b) =>
      typeof a === 'number' && typeof b === 'number' ? a - b : 0
    );

    // insÃ¨re ellipses
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
        aria-label="Page prÃ©cÃ©dente"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">PrÃ©cÃ©dent</span>
      </button>

      {items.map((it, idx) =>
        it === 'ellipsis' ? (
          <span key={`el-${idx}`} className="px-2 text-gray-300">â€¦</span>
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
            title={`Aller Ã  la page ${it}`}
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
