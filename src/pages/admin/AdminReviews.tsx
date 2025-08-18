// src/pages/admin/AdminReviews.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Search,
  Filter,
  Eye,
  EyeOff,
  XCircle,
  AlertTriangle,
  Trash,
  User,
  Clock,
  Phone,
  BarChart2,
  Activity,
  X,
  Download,
  Languages,
  LayoutGrid
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { Review } from '../../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

/* ============================================================
   CONFIG / TYPES
   ============================================================ */

const REVIEWS_PER_PAGE = 20;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

type SortRating = 'none' | 'asc' | 'desc';
type ViewMode = 'day' | 'week' | 'month' | 'year' | 'custom';
type ChartType = 'line' | 'bar';
type Lang = 'fr' | 'en';
type CardKey = 'chart' | 'histogram' | 'stacked' | 'kpi' | 'topCountries' | 'topProviders';

/** Palette sûre (lisible / ok daltonisme) */
const PALETTE = [
  '#4C78A8', // blue
  '#F58518', // orange
  '#54A24B', // green
  '#E45756', // red
  '#72B7B2', // teal
  '#EECA3B', // yellow
  '#B279A2', // purple
  '#FF9DA6', // pink
  '#9D755D', // brown
  '#BAB0AC'  // gray
];
const colorForIndex = (i: number) => PALETTE[i % PALETTE.length];
/** Palette fixe pour les barres 1★→5★ */
const RATING_COLORS: Record<'1' | '2' | '3' | '4' | '5', string> = {
  '1': '#E45756',
  '2': '#F58518',
  '3': '#EECA3B',
  '4': '#54A24B',
  '5': '#4C78A8'
};

type Stats = {
  totalReviews: number;
  publishedReviews: number;
  pendingReviews: number;
  hiddenReviews: number;
  averageRating: number;
};

type AdvancedFilters = {
  serviceType: 'all' | 'lawyer_call' | 'expat_call';
  countryEq: string;
  minRating?: number;
  maxRating?: number;
  reportedOnly: boolean;
  minHelpfulVotes?: number;
  providerId?: string;
  clientId?: string;
};

/* ============================================================
   i18n minimal (FR/EN)
   ============================================================ */

const detectLang = (): Lang =>
  (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) ? 'fr' : 'en';

const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    reviewsMgmt: 'Gestion des avis',
    searchPlaceholder: 'Rechercher un avis...',
    advancedFilters: 'Filtres avancés',
    exportCSV: 'Export CSV',
    layout: 'Disposition',
    layoutTip: 'Activez/désactivez l’affichage de chaque tableau indépendamment.',
    chartCard: 'Évolution mensuelle (multi-années)',
    day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année', custom: 'Personnalisé',
    from: 'Du', to: 'Au', apply: 'Appliquer',
    totalReviews: 'Total des avis',
    avgRating: 'Note moyenne',
    published: 'Avis publiés',
    pending: 'En attente',
    chartType: 'Graphique', line: 'Courbe', bars: 'Barres',
    status: 'Statut', allStatuses: 'Tous les statuts',
    filterByRating: 'Filtrer par note', all: 'Toutes',
    sortByRating: 'Trier par étoiles', noSort: 'Aucun tri',
    highToLow: 'Plus haut → plus bas', lowToHigh: 'Plus bas → plus haut',
    reset: 'Réinitialiser', bulkDelete: 'Supprimer sélection',
    loading: 'Chargement...', loadMore: "Charger plus d'avis", noneFound: 'Aucun avis trouvé',
    client: 'Client', rating: 'Note', comment: 'Commentaire',
    type: 'Type', date: 'Date', statusCol: 'Statut', actions: 'Actions',
    hide: 'Masquer', show: 'Afficher', delete: 'Supprimer',
    reviewDetails: "Détails de l'avis", info: 'Informations',
    country: 'Pays', provider: 'Prestataire', callId: "ID d'appel",
    helpfulVotes: 'Votes utiles', reports: 'Signalements',
    quickLinks: 'Liens rapides', providerProfile: 'Profil prestataire',
    clientProfile: 'Profil client', callDetails: "Détails de l'appel",
    moderation: 'Modération', saveRating: 'Enregistrer la note',
    confirmDelete: 'Confirmer la suppression',
    irreversible: 'Attention : Cette action est irréversible',
    youWillDelete: "Vous êtes sur le point de supprimer définitivement l'avis de :",
    cancel: 'Annuler', confirm: 'Confirmer la suppression',
    quality: 'Qualité', autoPublished: 'Auto-publiés (J+2)', hiddenPct: 'Masqués',
    reportedPct: 'Avis signalés', avgHelpful: 'Votes utiles (moy.)',
    ratingSplit: 'Répartition des notes (1★→5★)',
    ratingShare: 'Part des notes par mois', topCountries: 'Top pays (volume)',
    topProviders: 'Top prestataires', reviewsCount: "Nombre d'avis",
    monthlyReviews: 'Avis créés',
    anomalyWarning: 'Surveillance qualité : hausse significative des avis 1★ sur 7 jours.',
    lowStarAlerts: 'Alerte notes faibles',
    lowStarExplainer: 'Bannières affichées si des notes faibles existent sur la période (plus c’est faible, plus c’est visible).',
    drawerTitle: 'Filtres avancés',
    serviceType: 'Type de prestataire', allTypes: 'Tous',
    lawyer: 'Avocat', expat: 'Expatrié',
    clientCountry: 'Pays (client)', minRating: 'Note min', maxRating: 'Note max',
    reportedOnly: 'Signalés uniquement', minHelpfulVotes: 'Votes utiles min',
    providerId: 'Provider ID', clientIdLabel: 'Client ID',
    hideCard: 'Masquer ce tableau', showCard: 'Afficher ce tableau',
    language: 'Langue',
    manageCards: 'Gérer les tableaux',
    chart: 'Graphique multi-années',
    histogram: 'Histogramme des notes',
    stacked: 'Répartition mensuelle des notes',
    kpi: 'KPI Qualité',
    topCountriesCard: 'Top pays',
    topProvidersCard: 'Top prestataires'
  },
  en: {
    reviewsMgmt: 'Reviews management',
    searchPlaceholder: 'Search a review…',
    advancedFilters: 'Advanced filters',
    exportCSV: 'Export CSV',
    layout: 'Layout',
    layoutTip: 'Enable/disable each card independently.',
    chartCard: 'Monthly trend (multi-year)',
    day: 'Day', week: 'Week', month: 'Month', year: 'Year', custom: 'Custom',
    from: 'From', to: 'To', apply: 'Apply',
    totalReviews: 'Total reviews',
    avgRating: 'Average rating',
    published: 'Published',
    pending: 'Pending',
    chartType: 'Chart type', line: 'Line', bars: 'Bars',
    status: 'Status', allStatuses: 'All statuses',
    filterByRating: 'Filter by rating', all: 'All',
    sortByRating: 'Sort by stars', noSort: 'No sort',
    highToLow: 'High → Low', lowToHigh: 'Low → High',
    reset: 'Reset', bulkDelete: 'Delete selection',
    loading: 'Loading...', loadMore: 'Load more reviews', noneFound: 'No reviews found',
    client: 'Client', rating: 'Rating', comment: 'Comment',
    type: 'Type', date: 'Date', statusCol: 'Status', actions: 'Actions',
    hide: 'Hide', show: 'Show', delete: 'Delete',
    reviewDetails: 'Review details', info: 'Information',
    country: 'Country', provider: 'Provider', callId: 'Call ID',
    helpfulVotes: 'Helpful votes', reports: 'Reports',
    quickLinks: 'Quick links', providerProfile: 'Provider profile',
    clientProfile: 'Client profile', callDetails: 'Call details',
    moderation: 'Moderation', saveRating: 'Save rating',
    confirmDelete: 'Confirm deletion',
    irreversible: 'Warning: This action is irreversible',
    youWillDelete: 'You are about to permanently delete the review from:',
    cancel: 'Cancel', confirm: 'Confirm deletion',
    quality: 'Quality', autoPublished: 'Auto-published (D+2)', hiddenPct: 'Hidden',
    reportedPct: 'Reported', avgHelpful: 'Avg. helpful votes',
    ratingSplit: 'Rating distribution (1★→5★)',
    ratingShare: 'Share of ratings per month', topCountries: 'Top countries (volume)',
    topProviders: 'Top providers', reviewsCount: 'Reviews count',
    monthlyReviews: 'Reviews created',
    anomalyWarning: 'Quality watch: significant spike of 1★ reviews in last 7 days.',
    lowStarAlerts: 'Low-star alerts',
    lowStarExplainer: 'Banners show low ratings in the selected period (the fewer stars, the more prominent).',
    drawerTitle: 'Advanced filters',
    serviceType: 'Provider type', allTypes: 'All',
    lawyer: 'Lawyer', expat: 'Expat',
    clientCountry: 'Country (client)', minRating: 'Min rating', maxRating: 'Max rating',
    reportedOnly: 'Reported only', minHelpfulVotes: 'Min helpful votes',
    providerId: 'Provider ID', clientIdLabel: 'Client ID',
    hideCard: 'Hide this card', showCard: 'Show this card',
    language: 'Language',
    manageCards: 'Manage cards',
    chart: 'Multi-year chart',
    histogram: 'Rating histogram',
    stacked: 'Monthly rating share',
    kpi: 'Quality KPIs',
    topCountriesCard: 'Top countries',
    topProvidersCard: 'Top providers'
  }
};

const tFor = (lang: Lang) => (key: string) => STRINGS[lang][key] ?? key;

/* ============================================================
   DATE HELPERS
   ============================================================ */

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const startOfWeek = (d: Date): Date => {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday=0
  x.setDate(x.getDate() - diff);
  return startOfDay(x);
};
const endOfWeek = (d: Date): Date => {
  const s = startOfWeek(d);
  const x = new Date(s);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
};
const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear = (year: number): Date => new Date(year, 0, 1, 0, 0, 0, 0);
const endOfYear = (year: number): Date => new Date(year, 11, 31, 23, 59, 59, 999);
const monthLabel = (m: number, lang: Lang): string =>
  new Date(2000, m, 1).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' });

/* ============================================================
   COMPONENT
   ============================================================ */

const AdminReviews: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // language
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('admin_lang') as Lang) || detectLang());
  const t = useMemo(() => tFor(lang), [lang]);
  useEffect(() => localStorage.setItem('admin_lang', lang), [lang]);

  // Default range: current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(now));
  const [toDate, setToDate] = useState<Date>(endOfMonth(now));
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // List & pagination
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Filters & sort
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [sortRating, setSortRating] = useState<SortRating>('none');

  // Charts
  const [chartType, setChartType] = useState<ChartType>('line');
  const [yearToggles, setYearToggles] = useState<Record<number, boolean>>({
    [currentYear - 3]: false,
    [currentYear - 2]: false,
    [currentYear - 1]: true,
    [currentYear]: true
  });

  // Advanced filters drawer
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [adv, setAdv] = useState<AdvancedFilters>({
    serviceType: 'all',
    countryEq: '',
    minRating: undefined,
    maxRating: undefined,
    reportedOnly: false,
    minHelpfulVotes: undefined,
    providerId: '',
    clientId: ''
  });

  // Selection / modals / actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [editedRating, setEditedRating] = useState<number | null>(null);

  // Stats bar
  const [stats, setStats] = useState<Stats>({
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    hiddenReviews: 0,
    averageRating: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);

  // KPI + alerts
  const [kpi, setKpi] = useState<{
    ratingBuckets: Record<1 | 2 | 3 | 4 | 5, number>;
    autoPublishedPct: number;
    hiddenPct: number;
    reportedPct: number;
    avgHelpfulVotes: number;
    alert1: number;
    alert2: number;
    alert3: number;
    anomalyOneStarSpike: boolean;
  }>({
    ratingBuckets: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    autoPublishedPct: 0,
    hiddenPct: 0,
    reportedPct: 0,
    avgHelpfulVotes: 0,
    alert1: 0,
    alert2: 0,
    alert3: 0,
    anomalyOneStarSpike: false
  });

  // Charts data
  type ChartRow = { month: string; [year: number]: number };
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  type StackedRow = { month: string; '1': number; '2': number; '3': number; '4': number; '5': number };
  const [stackedData, setStackedData] = useState<StackedRow[]>([]);

  // Visibility per card (persisted) + manager drawer
  const VIS_STORAGE_KEY = 'admin_reviews_visible_v2';
  const defaultVisibility: Record<CardKey, boolean> = {
    chart: true,
    histogram: true,
    stacked: true,
    kpi: true,
    topCountries: true,
    topProviders: true
  };
  const [visible, setVisible] = useState<Record<CardKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(VIS_STORAGE_KEY);
      if (!raw) return defaultVisibility;
      const parsed = JSON.parse(raw) as Record<CardKey, boolean>;
      return { ...defaultVisibility, ...parsed };
    } catch {
      return defaultVisibility;
    }
  });
  const [showLayoutDrawer, setShowLayoutDrawer] = useState<boolean>(false);
  useEffect(() => {
    localStorage.setItem(VIS_STORAGE_KEY, JSON.stringify(visible));
  }, [visible]);

  // Guards
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    reloadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  useEffect(() => {
    reloadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedStatus,
    selectedRating,
    fromDate,
    toDate,
    adv.serviceType,
    adv.countryEq,
    adv.providerId,
    adv.clientId,
    adv.reportedOnly,
    adv.minHelpfulVotes,
    adv.minRating,
    adv.maxRating
  ]);

  /* ============================ Helpers ============================ */

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);

  const computeRangeFromMode = (mode: ViewMode, ref: Date): { from: Date; to: Date } => {
    switch (mode) {
      case 'day': return { from: startOfDay(ref), to: endOfDay(ref) };
      case 'week': return { from: startOfWeek(ref), to: endOfWeek(ref) };
      case 'month': return { from: startOfMonth(ref), to: endOfMonth(ref) };
      case 'year': return { from: startOfYear(ref.getFullYear()), to: endOfYear(ref.getFullYear()) };
      case 'custom':
      default: return { from: fromDate, to: toDate };
    }
  };

  const onChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode !== 'custom') {
      const { from, to } = computeRangeFromMode(mode, new Date());
      setFromDate(from);
      setToDate(to);
    }
  };

  const allCurrentPageSelected = useMemo(() => {
    if (reviews.length === 0) return false;
    return reviews.every((r) => selectedIds.has(r.id));
  }, [reviews, selectedIds]);

  /* ======================== Firestore Queries ======================= */

  const autoPublishEligible = async (fetched: Review[]) => {
    const nowMs = Date.now();
    const eligible = fetched.filter((r) => {
      const raw = (r.createdAt as any)?.toDate?.() ?? r.createdAt;
      const createdMs = raw instanceof Date ? raw.getTime() : Date.now();
      return (r.status === 'pending' || !r.status) && nowMs - createdMs >= TWO_DAYS_MS;
    });
    if (eligible.length === 0) return;
    try {
      await Promise.all(
        eligible.map((rev) =>
          updateDoc(doc(db, 'reviews', rev.id), {
            status: 'published',
            publishedAt: serverTimestamp(),
            moderatedAt: serverTimestamp(),
            moderatorNotes: lang === 'fr' ? 'Publication automatique après 2 jours' : 'Auto-published after 2 days'
          })
        )
      );
      setReviews((prev) =>
        prev.map((r) => (eligible.find((e) => e.id === r.id) ? { ...r, status: 'published' } : r))
      );
      await loadStats();
    } catch (err) {
      console.error('Auto-publish failed:', err);
    }
  };

  const buildQueryConstraints = (loadMore: boolean): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [
      where('createdAt', '>=', fromDate),
      where('createdAt', '<=', toDate),
      orderBy('createdAt', 'desc'),
      limit(REVIEWS_PER_PAGE)
    ];
    if (selectedStatus !== 'all') constraints.unshift(where('status', '==', selectedStatus));
    if (selectedRating !== 'all') constraints.unshift(where('rating', '==', parseInt(selectedRating, 10)));
    if (adv.serviceType !== 'all') constraints.unshift(where('serviceType', '==', adv.serviceType));
    if (adv.countryEq.trim()) constraints.unshift(where('clientCountry', '==', adv.countryEq.trim()));
    if (adv.providerId?.trim()) constraints.unshift(where('providerId', '==', adv.providerId.trim()));
    if (adv.clientId?.trim()) constraints.unshift(where('clientId', '==', adv.clientId.trim()));
    if (loadMore && lastVisible) constraints.push(startAfter(lastVisible));
    return constraints;
  };

  const applyClientFilters = (arr: Review[]): Review[] =>
    arr.filter((r) => {
      if (adv.reportedOnly && !(Number(r.reportedCount) > 0)) return false;
      if (typeof adv.minHelpfulVotes === 'number' && (Number(r.helpfulVotes) || 0) < adv.minHelpfulVotes) return false;
      if (typeof adv.minRating === 'number' && (r.rating || 0) < adv.minRating) return false;
      if (typeof adv.maxRating === 'number' && (r.rating || 0) > adv.maxRating) return false;
      return true;
    });

  const reloadAll = async (loadMore: boolean) => {
    await Promise.all([loadStats(), loadReviews(loadMore), loadChartData(), loadStackedData()]);
  };

  const loadStats = async () => {
    try {
      setIsStatsLoading(true);
      const qRef = query(
        collection(db, 'reviews'),
        ...buildQueryConstraints(false).filter(
          (c) => (c as any).type !== 'orderBy' && (c as any).type !== 'limit' && (c as any).type !== 'startAfter'
        )
      );
      const snap = await getDocs(qRef);
      let data = snap.docs.map((d) => d.data() as Review);
      data = applyClientFilters(data);

      const totalReviews = data.length;
      const publishedReviews = data.filter((r) => r.status === 'published').length;
      const pendingReviews = data.filter((r) => r.status === 'pending' || !r.status).length;
      const hiddenReviews = data.filter((r) => r.status === 'hidden').length;
      const totalRating = data.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

      // KPI / quality
      const buckets: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      data.forEach((r) => {
        const rt = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0))) as 1 | 2 | 3 | 4 | 5;
        buckets[rt] += 1;
      });
      const autoPublished = data.filter(
        (r) => r.status === 'published' && r.moderatorNotes?.toLowerCase?.().includes('auto')
      ).length;
      const autoPublishedPct = totalReviews ? (autoPublished / totalReviews) * 100 : 0;
      const hiddenPct = totalReviews ? (hiddenReviews / totalReviews) * 100 : 0;
      const reported = data.filter((r) => Number(r.reportedCount) > 0).length;
      const reportedPct = totalReviews ? (reported / totalReviews) * 100 : 0;
      const avgHelpfulVotes =
        totalReviews ? data.reduce((s, r) => s + (Number(r.helpfulVotes) || 0), 0) / totalReviews : 0;

      const alert1 = buckets[1], alert2 = buckets[2], alert3 = buckets[3];

      // anomaly 1★ spike week over week
      const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
      const fourteenAgo = new Date(); fourteenAgo.setDate(fourteenAgo.getDate() - 14);
      const weekNow = data.filter((r) => {
        const d = ((r.createdAt as any)?.toDate?.() ?? r.createdAt) as Date;
        return d >= sevenAgo && Math.round(r.rating) === 1;
      }).length;
      const weekBefore = data.filter((r) => {
        const d = ((r.createdAt as any)?.toDate?.() ?? r.createdAt) as Date;
        return d >= fourteenAgo && d < sevenAgo && Math.round(r.rating) === 1;
      }).length;
      const anomalyOneStarSpike = weekBefore >= 1 ? weekNow / weekBefore >= 1.5 && weekNow >= 3 : weekNow >= 5;

      setStats({ totalReviews, publishedReviews, pendingReviews, hiddenReviews, averageRating });
      setKpi({
        ratingBuckets: buckets,
        autoPublishedPct,
        hiddenPct,
        reportedPct,
        avgHelpfulVotes,
        alert1,
        alert2,
        alert3,
        anomalyOneStarSpike
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const loadReviews = async (loadMore = false) => {
    try {
      setIsLoading(true);
      const qRef = query(collection(db, 'reviews'), ...buildQueryConstraints(loadMore));
      const snap = await getDocs(qRef);

      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      setLastVisible(lastDoc);
      setHasMore(snap.docs.length === REVIEWS_PER_PAGE);

      let fetched = snap.docs.map((d) => {
        const raw = d.data() as DocumentData;
        const created = typeof raw.createdAt?.toDate === 'function' ? raw.createdAt.toDate() : new Date();
        return { ...(raw as Omit<Review, 'id' | 'createdAt'>), id: d.id, createdAt: created } as Review;
      });
      fetched = applyClientFilters(fetched);

      if (loadMore) setReviews((prev) => [...prev, ...fetched]);
      else {
        setReviews(fetched);
        setSelectedIds(new Set());
      }

      await autoPublishEligible(fetched);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChartData = async () => {
    const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
    const from = startOfYear(years[0]);
    const to = endOfYear(currentYear);
    try {
      const qRef = query(collection(db, 'reviews'), where('createdAt', '>=', from), where('createdAt', '<=', to));
      const snap = await getDocs(qRef);
      const all = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        const created: Date = typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : new Date();
        return { createdAt: created } as Pick<Review, 'createdAt'>;
      });
      const rows: ChartRow[] = Array.from({ length: 12 }).map((_, m) => {
        const row: ChartRow = { month: monthLabel(m, lang) };
        years.forEach((y) => (row[y] = 0));
        return row;
      });
      all.forEach(({ createdAt }) => {
        const y = createdAt.getFullYear();
        if (y < years[0] || y > currentYear) return;
        const m = createdAt.getMonth();
        rows[m][y] = (rows[m][y] || 0) + 1;
      });
      setChartData(rows);
      setYearToggles((prev) => {
        const next: Record<number, boolean> = {};
        years.forEach((y) => (next[y] = prev[y] ?? (y >= currentYear - 1)));
        return next;
      });
    } catch (err) {
      console.error('Error loading chart data:', err);
    }
  };

  const loadStackedData = async () => {
    const from = startOfYear(currentYear);
    const to = endOfYear(currentYear);
    try {
      const qRef = query(collection(db, 'reviews'), where('createdAt', '>=', from), where('createdAt', '<=', to));
      const snap = await getDocs(qRef);
      const all = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        const created: Date = typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : new Date();
        return { createdAt: created, rating: Number(data.rating) || 0 } as Pick<Review, 'createdAt' | 'rating'>;
      });
      const rows: StackedRow[] = Array.from({ length: 12 }).map((_, m) => ({
        month: monthLabel(m, lang), '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
      }));
      all.forEach(({ createdAt, rating }) => {
        if (createdAt.getFullYear() !== currentYear) return;
        const m = createdAt.getMonth();
        const bucket = Math.max(1, Math.min(5, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
        rows[m][String(bucket) as keyof StackedRow] += 1;
      });
      setStackedData(rows);
    } catch (err) {
      console.error('Error loading stacked data:', err);
    }
  };

  /* ============================ Actions ============================ */

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setEditedRating(review.rating);
    setShowReviewModal(true);
  };

  const handleHideReview = async (reviewId: string) => {
    try {
      setIsActionLoading(true);
      await updateDoc(doc(db, 'reviews', reviewId), {
        status: 'hidden',
        moderatedAt: serverTimestamp(),
        moderatorNotes: lang === 'fr' ? "Masqué par l'administrateur" : 'Hidden by admin'
      });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status: 'hidden' } : r)));
      if (selectedReview?.id === reviewId) setSelectedReview({ ...selectedReview, status: 'hidden' });
      alert(lang === 'fr' ? 'Avis masqué avec succès' : 'Review hidden');
      await loadStats();
    } catch (err) {
      console.error('Error hiding review:', err);
      alert(lang === 'fr' ? "Erreur lors du masquage de l'avis" : 'Failed to hide review');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    try {
      setIsActionLoading(true);
      await deleteDoc(doc(db, 'reviews', selectedReview.id));
      setReviews((prev) => prev.filter((r) => r.id !== selectedReview.id));
      setShowDeleteModal(false);
      setShowReviewModal(false);
      setSelectedReview(null);
      alert(lang === 'fr' ? 'Avis supprimé avec succès' : 'Review deleted');
      await loadStats();
    } catch (err) {
      console.error('Error deleting review:', err);
      alert(lang === 'fr' ? "Erreur lors de la suppression de l'avis" : 'Failed to delete review');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = confirm(
      lang === 'fr'
        ? `Supprimer définitivement ${selectedIds.size} avis ?`
        : `Permanently delete ${selectedIds.size} review(s)?`
    );
    if (!ok) return;
    try {
      setIsActionLoading(true);
      await Promise.all(Array.from(selectedIds).map((id) => deleteDoc(doc(db, 'reviews', id))));
      setReviews((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      alert(lang === 'fr' ? 'Avis supprimés avec succès' : 'Reviews deleted');
      await loadStats();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(lang === 'fr' ? 'Erreur lors de la suppression en masse' : 'Bulk delete failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const saveEditedRating = async () => {
    if (!selectedReview || editedRating == null) return;
    try {
      setIsActionLoading(true);
      await updateDoc(doc(db, 'reviews', selectedReview.id), {
        rating: editedRating,
        moderatedAt: serverTimestamp(),
        moderatorNotes: lang === 'fr' ? "Note modifiée par l'administrateur" : 'Rating updated by admin'
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === selectedReview.id ? { ...r, rating: editedRating } : r))
      );
      setSelectedReview({ ...selectedReview, rating: editedRating });
      alert(lang === 'fr' ? 'Note mise à jour' : 'Rating saved');
      await loadStats();
    } catch (err) {
      console.error('Error updating rating:', err);
      alert(lang === 'fr' ? 'Erreur lors de la mise à jour de la note' : 'Failed to save rating');
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = filteredAndSorted.map((r) => ({
      id: r.id,
      createdAt:
        ((r.createdAt as any)?.toDate?.() ?? r.createdAt) instanceof Date
          ? formatDate(((r.createdAt as any)?.toDate?.() ?? r.createdAt) as Date)
          : String(r.createdAt),
      status: r.status ?? 'pending',
      rating: r.rating,
      clientName: r.clientName ?? '',
      clientCountry: r.clientCountry ?? '',
      providerName: r.providerName ?? '',
      serviceType: r.serviceType ?? '',
      helpfulVotes: r.helpfulVotes ?? 0,
      reportedCount: r.reportedCount ?? 0,
      callId: r.callId ?? '',
      clientId: r.clientId ?? '',
      providerId: r.providerId ?? '',
      comment: (r.comment ?? '').replace(/\n/g, ' ').replace(/"/g, '""')
    }));

    const headers = [
      'id','createdAt','status','rating','clientName','clientCountry','providerName','serviceType',
      'helpfulVotes','reportedCount','callId','clientId','providerId','comment'
    ];

    const csv =
      headers.join(',') +
      '\n' +
      rows
        .map((row) =>
          headers
            .map((h) => `"${String((row as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* =========================== UI HELPERS =========================== */

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{t('published')}</span>;
      case 'pending':
      case undefined:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <Clock size={12} className="mr-1" /> {t('pending')}
          </span>
        );
      case 'hidden':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">{t('hide')}</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getServiceTypeBadge = (serviceType?: string) => {
    switch (serviceType) {
      case 'lawyer_call':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{t('lawyer')}</span>;
      case 'expat_call':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{t('expat')}</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{serviceType || '—'}</span>;
    }
  };

  const renderStarsStatic = (rating: number) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;
    return (
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < full
                ? 'text-yellow-400 fill-current'
                : i === full && hasHalf
                ? 'text-yellow-400 fill-[url(#half-star)]'
                : 'text-gray-300'
            }
          />
        ))}
      </div>
    );
  };

  const renderStarsEditable = (value: number, onChange: (n: number) => void) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < value;
        return (
          <button key={i} type="button" className="p-1" title={`${i + 1}★`} onClick={() => onChange(i + 1)}>
            <Star size={20} className={filled ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
          </button>
        );
      })}
      <span className="ml-2 text-sm text-gray-600">{value}/5</span>
    </div>
  );

  const filteredAndSorted = useMemo(() => {
    const base = reviews.filter((review) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        review.clientName?.toLowerCase()?.includes(s) ||
        review.comment?.toLowerCase()?.includes(s) ||
        review.clientCountry?.toLowerCase()?.includes(s)
      );
    });
    if (sortRating === 'asc') return [...base].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    if (sortRating === 'desc') return [...base].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return base;
  }, [reviews, searchTerm, sortRating]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        reviews.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        reviews.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  // Multi-year chart
  const renderChart = () => {
    const years = Object.keys(yearToggles)
      .map(Number)
      .filter((y) => yearToggles[y])
      .sort((a, b) => a - b);

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {years.map((y, idx) => (
              <Bar key={y} dataKey={String(y)} name={String(y)} fill={colorForIndex(idx)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {years.map((y, idx) => (
            <Line
              key={y}
              type="monotone"
              dataKey={String(y)}
              name={String(y)}
              dot={false}
              stroke={colorForIndex(idx)}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  /* ============================= RENDER ============================= */

  return (
    <AdminLayout>
      {/* Gradient for half-stars */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="50%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
      </svg>

      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            {lang === 'fr'
              ? 'Une erreur est survenue lors du chargement des avis. Veuillez réessayer.'
              : 'An error occurred while loading reviews. Please try again.'}
          </div>
        }
      >
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t('reviewsMgmt')}</h1>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>

              <button
                className="p-2 text-gray-600 hover:text-gray-800 bg-white rounded-lg border border-gray-300"
                title={t('advancedFilters')}
                onClick={() => setIsAdvancedOpen(true)}
              >
                <Filter size={18} />
              </button>

              <button
                className="p-2 text-gray-600 hover:text-gray-800 bg-white rounded-lg border border-gray-300"
                title={t('layout')}
                onClick={() => setShowLayoutDrawer(true)}
              >
                <LayoutGrid size={18} />
              </button>

              <Button onClick={exportCSV} variant="outline" size="small">
                <Download size={16} className="mr-2" />
                {t('exportCSV')}
              </Button>

              <div className="flex items-center gap-2 pl-3 ml-1 border-l border-gray-200">
                <Languages size={16} className="text-gray-500" />
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="border border-gray-300 rounded-md px-2 py-1"
                  aria-label={t('language')}
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="space-y-2 mb-6">
            {kpi.alert1 > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <strong>{t('lowStarAlerts')} — 1★:</strong> {kpi.alert1}{' '}
                  {lang === 'fr' ? 'avis sur la période sélectionnée.' : 'review(s) in the selected period.'}
                </div>
              </div>
            )}
            {kpi.alert2 > 0 && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 flex items-start">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-2" />
                <div>
                  <strong>{t('lowStarAlerts')} — 2★:</strong> {kpi.alert2}{' '}
                  {lang === 'fr' ? 'avis sur la période sélectionnée.' : 'review(s) in the selected period.'}
                </div>
              </div>
            )}
            {kpi.alert3 > 0 && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                <div>
                  <strong>{t('lowStarAlerts')} — 3★:</strong> {kpi.alert3}{' '}
                  {lang === 'fr' ? 'avis sur la période sélectionnée.' : 'review(s) in the selected period.'}
                </div>
              </div>
            )}
            {kpi.anomalyOneStarSpike && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>{t('anomalyWarning')}</div>
              </div>
            )}
            <p className="text-xs text-gray-500">{t('lowStarExplainer')}</p>
          </div>

          {/* View controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex gap-2">
                {(['day', 'week', 'month', 'year', 'custom'] as ViewMode[]).map((m) => (
                  <Button
                    key={m}
                    onClick={() => onChangeViewMode(m)}
                    variant={viewMode === m ? 'primary' : 'outline'}
                    size="small"
                  >
                    {t(m)}
                  </Button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('from')}</label>
                  <input
                    type="date"
                    value={fromDate.toISOString().slice(0, 10)}
                    onChange={(e) => setFromDate(startOfDay(new Date(e.target.value)))}
                    className="border border-gray-300 rounded-md px-2 py-2"
                    disabled={viewMode !== 'custom'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('to')}</label>
                  <input
                    type="date"
                    value={toDate.toISOString().slice(0, 10)}
                    onChange={(e) => setToDate(endOfDay(new Date(e.target.value)))}
                    className="border border-gray-300 rounded-md px-2 py-2"
                    disabled={viewMode !== 'custom'}
                  />
                </div>
                <Button onClick={() => reloadAll(false)} size="small" variant="outline">
                  {t('apply')}
                </Button>
              </div>

              <div className="flex items-end gap-3 ml-auto">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">{t('chartType')}</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                    aria-label={t('chartType')}
                  >
                    <option value="line">{t('line')}</option>
                    <option value="bar">{t('bars')}</option>
                  </select>
                  {chartType === 'line' ? <Activity size={18} /> : <BarChart2 size={18} />}
                </div>

                {/* Year toggles (colored) */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                  {[currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map((y, idx) => (
                    <label key={y} className="flex items-center gap-1 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={yearToggles[y]}
                        onChange={() => setYearToggles((p) => ({ ...p, [y]: !p[y] }))}
                      />
                      <span style={{ color: colorForIndex(idx) }}>{y}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar — period aware */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { title: t('totalReviews'), value: isStatsLoading ? '—' : stats.totalReviews, color: '#4C78A8' },
              { title: t('avgRating'), value: isStatsLoading ? '—' : stats.averageRating.toFixed(1), color: '#EECA3B' },
              { title: t('published'), value: isStatsLoading ? '—' : stats.publishedReviews, color: '#54A24B' },
              { title: t('pending'), value: isStatsLoading ? '—' : stats.pendingReviews, color: '#F58518' }
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}22` }}
                  >
                    <span style={{ color: card.color }} className="font-bold text-lg">●</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart card */}
          {visible.chart && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">{t('chartCard')}</h3>
                <button
                  className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                  onClick={() => setVisible((v) => ({ ...v, chart: false }))}
                >
                  <EyeOff size={14} /> {t('hideCard')}
                </button>
              </div>
              <div className="mt-3">{renderChart()}</div>
            </div>
          )}

          {/* KPI / Visualisations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {visible.histogram && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">{t('ratingSplit')}</h3>
                  <button
                    className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                    onClick={() => setVisible((v) => ({ ...v, histogram: false }))}
                  >
                    <EyeOff size={14} /> {t('hideCard')}
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { rating: '1★', count: kpi.ratingBuckets[1] },
                      { rating: '2★', count: kpi.ratingBuckets[2] },
                      { rating: '3★', count: kpi.ratingBuckets[3] },
                      { rating: '4★', count: kpi.ratingBuckets[4] },
                      { rating: '5★', count: kpi.ratingBuckets[5] }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name={t('reviewsCount')}>
                      {/* couleurs fixes par catégorie */}
                    </Bar>
                    {/* 5 barres "fausses" avec couleurs par catégorie (legend accessible) */}
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
                {/* Légende personnalisée avec couleurs */}
                <div className="flex gap-4 mt-2 text-xs text-gray-700">
                  {(['1','2','3','4','5'] as const).map((k) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: RATING_COLORS[k] }} />
                      {k}★
                    </span>
                  ))}
                </div>
              </div>
            )}

            {visible.stacked && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">{t('ratingShare')} — {currentYear}</h3>
                  <button
                    className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                    onClick={() => setVisible((v) => ({ ...v, stacked: false }))}
                  >
                    <EyeOff size={14} /> {t('hideCard')}
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stackedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="1" stackId="a" name="1★" fill={RATING_COLORS['1']} />
                    <Bar dataKey="2" stackId="a" name="2★" fill={RATING_COLORS['2']} />
                    <Bar dataKey="3" stackId="a" name="3★" fill={RATING_COLORS['3']} />
                    <Bar dataKey="4" stackId="a" name="4★" fill={RATING_COLORS['4']} />
                    <Bar dataKey="5" stackId="a" name="5★" fill={RATING_COLORS['5']} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quality + Top segments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {visible.kpi && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">{t('quality')}</h3>
                  <button
                    className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                    onClick={() => setVisible((v) => ({ ...v, kpi: false }))}
                  >
                    <EyeOff size={14} /> {t('hideCard')}
                  </button>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>{t('autoPublished')}: <strong>{kpi.autoPublishedPct.toFixed(1)}%</strong></li>
                  <li>{t('hiddenPct')}: <strong>{kpi.hiddenPct.toFixed(1)}%</strong></li>
                  <li>{t('reportedPct')}: <strong>{kpi.reportedPct.toFixed(1)}%</strong></li>
                  <li>{t('avgHelpful')}: <strong>{kpi.avgHelpfulVotes.toFixed(2)}</strong></li>
                </ul>
              </div>
            )}

            {visible.topCountries && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">{t('topCountries')}</h3>
                  <button
                    className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                    onClick={() => setVisible((v) => ({ ...v, topCountries: false }))}
                  >
                    <EyeOff size={14} /> {t('hideCard')}
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">{t('country')}</th>
                      <th className="text-right py-1">{t('reviewsCount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      filteredAndSorted.reduce<Record<string, number>>((acc, r) => {
                        const k = (r.clientCountry || '—').trim() || '—';
                        acc[k] = (acc[k] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([country, count]) => (
                        <tr key={country} className="border-t">
                          <td className="py-1">{country}</td>
                          <td className="py-1 text-right">{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {visible.topProviders && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">{t('topProviders')}</h3>
                  <button
                    className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                    onClick={() => setVisible((v) => ({ ...v, topProviders: false }))}
                  >
                    <EyeOff size={14} /> {t('hideCard')}
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">{t('provider')}</th>
                      <th className="text-center py-1">{t('reviewsCount')}</th>
                      <th className="text-right py-1">{t('avgRating')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(
                      filteredAndSorted.reduce<
                        Record<string, { name: string; count: number; sum: number }>
                      >((acc, r) => {
                        const key = r.providerId || r.providerName || '—';
                        const name = r.providerName || r.providerId || '—';
                        if (!acc[key]) acc[key] = { name, count: 0, sum: 0 };
                        acc[key].count += 1;
                        acc[key].sum += Number(r.rating) || 0;
                        return acc;
                      }, {})
                    )
                      .map((o) => ({ ...o, avg: o.count ? o.sum / o.count : 0 }))
                      .sort((a, b) => (b.avg === a.avg ? b.count - a.count : b.avg - a.avg))
                      .slice(0, 5)
                      .map((row) => (
                        <tr key={row.name} className="border-t">
                          <td className="py-1">{row.name}</td>
                          <td className="py-1 text-center">{row.count}</td>
                          <td className="py-1 text-right">{row.avg.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Filters / sort / bulk actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('status')}
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">{t('allStatuses')}</option>
                  <option value="published">{t('published')}</option>
                  <option value="pending">{t('pending')}</option>
                  <option value="hidden">{t('hide')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('filterByRating')}
                </label>
                <select
                  id="rating-filter"
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">{t('all')}</option>
                  <option value="5">5 ★</option>
                  <option value="4">4 ★</option>
                  <option value="3">3 ★</option>
                  <option value="2">2 ★</option>
                  <option value="1">1 ★</option>
                </select>
              </div>
              <div>
                <label htmlFor="rating-sort" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('sortByRating')}
                </label>
                <select
                  id="rating-sort"
                  value={sortRating}
                  onChange={(e) => setSortRating(e.target.value as SortRating)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="none">{t('noSort')}</option>
                  <option value="desc">{t('highToLow')}</option>
                  <option value="asc">{t('lowToHigh')}</option>
                </select>
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedRating('all');
                    setSortRating('none');
                    setViewMode('month');
                    setFromDate(startOfMonth(new Date()));
                    setToDate(endOfMonth(new Date()));
                    setAdv({
                      serviceType: 'all',
                      countryEq: '',
                      minRating: undefined,
                      maxRating: undefined,
                      reportedOnly: false,
                      minHelpfulVotes: undefined,
                      providerId: '',
                      clientId: ''
                    });
                    reloadAll(false);
                  }}
                  variant="outline"
                  size="small"
                >
                  {t('reset')}
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  variant="outline"
                  size="small"
                  className={`border-red-600 text-red-600 hover:bg-red-50 ${
                    selectedIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={selectedIds.size === 0 || isActionLoading}
                >
                  <Trash size={16} className="mr-2" />
                  {t('bulkDelete')} ({selectedIds.size})
                </Button>
              </div>
            </div>
          </div>

          {/* Reviews Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('client')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('rating')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('comment')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statusCol')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && reviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">{t('loading')}</p>
                      </td>
                    </tr>
                  ) : filteredAndSorted.length > 0 ? (
                    filteredAndSorted.map((review) => (
                      <tr key={review.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(review.id)}
                            onChange={() => toggleSelect(review.id)}
                            aria-label={`Select review ${review.id}`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {review.clientName?.[0]}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{review.clientName}</div>
                              <div className="text-sm text-gray-500">{review.clientCountry}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{renderStarsStatic(review.rating)}</td>
                        <td className="px-6 py-4"><div className="text-sm text-gray-900 line-clamp-2">{review.comment}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap">{getServiceTypeBadge(review.serviceType)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(((review.createdAt as any)?.toDate?.() ?? review.createdAt) as Date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(review.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-3">
                            <button onClick={() => handleViewReview(review)} className="text-blue-600 hover:text-blue-800" title={t('reviewDetails')}>
                              <Eye size={18} />
                            </button>
                            <button onClick={() => handleHideReview(review.id)} className="text-yellow-600 hover:text-yellow-700" title={t('hide')}>
                              <XCircle size={18} />
                            </button>
                            <button
                              onClick={() => { setSelectedReview(review); setShowDeleteModal(true); }}
                              className="text-red-600 hover:text-red-800"
                              title={t('delete')}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">{t('noneFound')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="px-6 py-4 border-top border-gray-200">
                <Button onClick={() => loadReviews(true)} disabled={isLoading} fullWidth>
                  {isLoading ? t('loading') : t('loadMore')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Review Details Modal */}
        <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title={t('reviewDetails')} size="large">
          {selectedReview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xl">
                    {selectedReview.clientName?.[0]}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedReview.clientName}</h3>
                    <div className="flex items-center space-x-2 mt-1">{getStatusBadge(selectedReview.status)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {formatDate(((selectedReview.createdAt as any)?.toDate?.() ?? selectedReview.createdAt) as Date)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('comment')}</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-line">{selectedReview.comment}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('rating')} (editable)</h4>
                {renderStarsEditable(editedRating ?? selectedReview.rating, (n) => setEditedRating(n))}
                <div className="mt-3">
                  <Button
                    onClick={saveEditedRating}
                    disabled={isActionLoading || editedRating === selectedReview.rating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('saveRating')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{t('info')}</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">{t('client')}:</span><span className="font-medium">{selectedReview.clientName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('country')}:</span><span className="font-medium">{selectedReview.clientCountry}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('provider')}:</span><span className="font-medium">{selectedReview.providerName || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('callId')}:</span><span className="font-medium">{selectedReview.callId}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('helpfulVotes')}:</span><span className="font-medium">{selectedReview.helpfulVotes || 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">{t('reports')}:</span><span className="font-medium">{selectedReview.reportedCount || 0}</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mt-0 mb-2">{t('quickLinks')}</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.open(`/admin/users?uid=${selectedReview.clientId}&role=client`, '_blank', 'noopener')}
                      fullWidth variant="outline"
                    >
                      <User size={16} className="mr-2" /> {t('clientProfile')}
                    </Button>
                    <Button
                      onClick={() => window.open(`/admin/users?uid=${selectedReview.providerId}&role=provider`, '_blank', 'noopener')}
                      fullWidth variant="outline"
                    >
                      <User size={16} className="mr-2" /> {t('providerProfile')}
                    </Button>
                    <Button
                      onClick={() => window.open(`/admin/calls?callId=${selectedReview.callId}`, '_blank', 'noopener')}
                      fullWidth variant="outline"
                    >
                      <Phone size={16} className="mr-2" /> {t('callDetails')}
                    </Button>
                  </div>

                  <h4 className="text-sm font-medium text-gray-500 mt-4 mb-2">{t('moderation')}</h4>
                  <div className="space-y-2">
                    {selectedReview.status !== 'hidden' && (
                      <Button
                        onClick={() => handleHideReview(selectedReview.id)}
                        fullWidth className="bg-yellow-600 hover:bg-yellow-700" disabled={isActionLoading}
                      >
                        <XCircle size={16} className="mr-2" /> {t('hide')}
                      </Button>
                    )}
                    <Button
                      onClick={() => { setShowReviewModal(false); setShowDeleteModal(true); }}
                      fullWidth variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" disabled={isActionLoading}
                    >
                      <Trash size={16} className="mr-2" /> {t('delete')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t('confirmDelete')} size="small">
          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{t('irreversible')}</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        {t('youWillDelete')}
                        <br />
                        <strong>{selectedReview.clientName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button onClick={() => setShowDeleteModal(false)} variant="outline" disabled={isActionLoading}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleDeleteReview} className="bg-red-600 hover:bg-red-700" loading={isActionLoading}>
                  {t('confirm')}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ========= Advanced Filters Drawer ========= */}
        {isAdvancedOpen && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsAdvancedOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('drawerTitle')}</h3>
                <button onClick={() => setIsAdvancedOpen(false)} className="p-2 text-gray-500 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                {lang === 'fr'
                  ? 'Les filtres s’appliquent aux statistiques, graphiques et à la liste.'
                  : 'Filters apply to stats, charts and the list.'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceType')}</label>
                  <select
                    value={adv.serviceType}
                    onChange={(e) => setAdv((p) => ({ ...p, serviceType: e.target.value as AdvancedFilters['serviceType'] }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">{t('allTypes')}</option>
                    <option value="lawyer_call">{t('lawyer')}</option>
                    <option value="expat_call">{t('expat')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('clientCountry')}</label>
                  <input
                    value={adv.countryEq}
                    onChange={(e) => setAdv((p) => ({ ...p, countryEq: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder={lang === 'fr' ? 'Ex: France' : 'e.g. France'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('minRating')}</label>
                    <input
                      type="number" min={1} max={5} value={adv.minRating ?? ''}
                      onChange={(e) => setAdv((p) => ({ ...p, minRating: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('maxRating')}</label>
                    <input
                      type="number" min={1} max={5} value={adv.maxRating ?? ''}
                      onChange={(e) => setAdv((p) => ({ ...p, maxRating: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="reportedOnly"
                    type="checkbox"
                    checked={adv.reportedOnly}
                    onChange={(e) => setAdv((p) => ({ ...p, reportedOnly: e.target.checked }))}
                  />
                  <label htmlFor="reportedOnly" className="text-sm text-gray-700">{t('reportedOnly')}</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('minHelpfulVotes')}</label>
                  <input
                    type="number" min={0} value={adv.minHelpfulVotes ?? ''}
                    onChange={(e) => setAdv((p) => ({ ...p, minHelpfulVotes: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('providerId')}</label>
                    <input
                      value={adv.providerId ?? ''} onChange={(e) => setAdv((p) => ({ ...p, providerId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="UID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('clientIdLabel')}</label>
                    <input
                      value={adv.clientId ?? ''} onChange={(e) => setAdv((p) => ({ ...p, clientId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="UID"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button onClick={() => { setIsAdvancedOpen(false); reloadAll(false); }} fullWidth className="bg-red-600 hover:bg-red-700">
                  {t('apply')}
                </Button>
                <Button
                  onClick={() => setAdv({
                    serviceType: 'all', countryEq: '', minRating: undefined, maxRating: undefined,
                    reportedOnly: false, minHelpfulVotes: undefined, providerId: '', clientId: ''
                  })}
                  variant="outline" fullWidth
                >
                  {t('reset')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========= Layout Manager Drawer (show/hide cards) ========= */}
        {showLayoutDrawer && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowLayoutDrawer(false)} />
            <div className="absolute right-0 top-0 h-full w-full sm:w-[380px] bg-white shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{t('layout')}</h3>
                <button onClick={() => setShowLayoutDrawer(false)} className="p-2 text-gray-500 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">{t('layoutTip')}</p>

              {(
                [
                  { key: 'chart', label: t('chart') },
                  { key: 'histogram', label: t('histogram') },
                  { key: 'stacked', label: t('stacked') },
                  { key: 'kpi', label: t('kpi') },
                  { key: 'topCountries', label: t('topCountriesCard') },
                  { key: 'topProviders', label: t('topProvidersCard') }
                ] as Array<{ key: CardKey; label: string }>
              ).map((item, idx) => (
                <label key={item.key} className="flex items-center justify-between border rounded-lg px-3 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colorForIndex(idx) }} />
                    <span className="text-sm text-gray-800">{item.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visible[item.key]}
                    onChange={() => setVisible((v) => ({ ...v, [item.key]: !v[item.key] }))}
                    aria-label={item.label}
                  />
                </label>
              ))}

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    setVisible({ chart: true, histogram: true, stacked: true, kpi: true, topCountries: true, topProviders: true });
                  }}
                  variant="outline" fullWidth
                >
                  {lang === 'fr' ? 'Tout afficher' : 'Show all'}
                </Button>
                <Button
                  onClick={() => {
                    setVisible({ chart: false, histogram: false, stacked: false, kpi: false, topCountries: false, topProviders: false });
                  }}
                  variant="outline" fullWidth
                >
                  {lang === 'fr' ? 'Tout masquer' : 'Hide all'}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* ========= /Layout Manager Drawer ========= */}
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminReviews;
