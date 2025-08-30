// src/pages/admin/AdminExpats.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  startAfter,
  getCountFromServer,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  Globe,
  Users,
  Search,
  Filter,
  MoreVertical,
  Download,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  BadgeCheck,
  Languages as LanguagesIcon,
  FileCheck2,
  Link as LinkIcon,
  GripVertical,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Eye,
  Edit,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import AdminMapVisibilityToggle from "../../components/admin/AdminMapVisibilityToggle";

/* ---------------------- i18n ---------------------- */
type Lang = "fr" | "en";
const detectLang = (): Lang => {
  const ls = (localStorage.getItem("admin_lang") || "").toLowerCase();
  if (ls === "fr" || ls === "en") return ls as Lang;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
};
const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    title: "ExpatriÃ©s",
    subtitle: "Gestion des expatriÃ©s (validation, statut, notation, carte)",
    searchPlaceholder: "Recherche: nom, email, pays, villeâ€¦",
    filters: "Filtres",
    columns: "Colonnes",
    showAll: "Tout",
    hideAll: "Aucun",
    export: "Exporter CSV (page)",
    totalExact: "Total",
    active: "Actifs",
    suspended: "Suspendus",
    pending: "En attente",
    validated: "ValidÃ©s",
    notValidated: "Non validÃ©s",
    status: "Statut",
    validation: "Validation",
    kyc: "KYC",
    all: "Tous",
    blocked: "BloquÃ©",
    period: "PÃ©riode",
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    country: "Pays de rÃ©sidence",
    originCountry: "Pays d'origine",
    helpDomains: "Domaines d'aide (contient)",
    languages: "Langues (contient)",
    minRating: "Note â‰¥",
    minYears: "AnnÃ©es sur place â‰¥",
    name: "Nom",
    email: "Email",
    emailVerified: "Email vÃ©rifiÃ©",
    phone: "TÃ©lÃ©phone",
    city: "Ville",
    rating: "Note",
    reviews: "Avis",
    signup: "Inscription",
    lastLogin: "DerniÃ¨re connexion",
    yearsInCountry: "AnciennetÃ©",
    expatSince: "Expat depuis",
    profile: "Profil",
    map: "Carte",
    accountStatus: "Compte",
    actions: "Actions",
    hourlyRate: "Tarif (â‚¬/h)",
    visibleOnMap: "Carte",
    help: "Domaines dâ€™aide",
    langs: "Langues",
    origin: "Origine",
    expatsCount: "expatriÃ©s",
    perPage: "par page",
    emptyTitle: "Aucun expatriÃ©",
    emptyText: "Aucun rÃ©sultat avec ces filtres.",
    clearFilters: "Effacer les filtres",
    selection: "sÃ©lectionnÃ©(s)",
    approve: "Approuver",
    reject: "Rejeter",
    activate: "Activer",
    suspend: "Suspendre",
    delete: "Supprimer",
    confirmBulk: "Confirmer l'action pour {n} expatriÃ©(s) ?",
    updated: "Mis Ã  jour",
    loading: "Chargementâ€¦",
    view: "Voir",
    edit: "Ã‰diter",
  },
  en: {
    title: "Expats",
    subtitle: "Manage expats (validation, status, rating, map)",
    searchPlaceholder: "Search: name, email, country, cityâ€¦",
    filters: "Filters",
    columns: "Columns",
    showAll: "All",
    hideAll: "None",
    export: "Export CSV (page)",
    totalExact: "Total",
    active: "Active",
    suspended: "Suspended",
    pending: "Pending",
    validated: "Validated",
    notValidated: "Not validated",
    status: "Status",
    validation: "Validation",
    kyc: "KYC",
    all: "All",
    blocked: "Blocked",
    period: "Period",
    today: "Today",
    week: "This week",
    month: "This month",
    country: "Country",
    originCountry: "Origin country",
    helpDomains: "Help domains (contains)",
    languages: "Languages (contains)",
    minRating: "Rating â‰¥",
    minYears: "Years in country â‰¥",
    name: "Name",
    email: "Email",
    emailVerified: "Email verified",
    phone: "Phone",
    city: "City",
    rating: "Rating",
    reviews: "Reviews",
    signup: "Signup",
    lastLogin: "Last login",
    yearsInCountry: "Tenure",
    expatSince: "Expat since",
    profile: "Profile",
    map: "Map",
    accountStatus: "Account",
    actions: "Actions",
    hourlyRate: "Hourly rate (â‚¬/h)",
    visibleOnMap: "Map",
    help: "Help domains",
    langs: "Languages",
    origin: "Origin",
    expatsCount: "expats",
    perPage: "per page",
    emptyTitle: "No expats",
    emptyText: "No results match your filters.",
    clearFilters: "Clear filters",
    selection: "selected",
    approve: "Approve",
    reject: "Reject",
    activate: "Activate",
    suspend: "Suspend",
    delete: "Delete",
    confirmBulk: "Confirm action for {n} expat(s)?",
    updated: "Updated",
    loading: "Loadingâ€¦",
    view: "View",
    edit: "Edit",
  },
};
const useI18n = () => {
  const [lang, setLang] = useState<Lang>(detectLang());
  const t = useCallback(
    (k: string, vars?: Record<string, string | number>) => {
      const str = STRINGS[lang][k] ?? k;
      if (!vars) return str;
      return Object.keys(vars).reduce(
        (acc, key) => acc.replace(new RegExp(`{${key}}`, "g"), String(vars[key])),
        str
      );
    },
    [lang]
  );
  return { t, lang, setLang };
};

/* ---------------------- Types ---------------------- */
type ExpatStatus = "active" | "suspended" | "pending" | "banned";
type ValidationStatus = "pending" | "approved" | "rejected";

interface Expat {
  id: string;
  email: string;
  emailVerified?: boolean;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  city?: string;
  originCountry?: string;
  status: ExpatStatus;
  validationStatus: ValidationStatus;
  createdAt: Date;
  lastLoginAt?: Date;
  callsCount: number;
  totalEarned: number;
  rating: number;
  reviewsCount: number;
  specialities: string[];
  languages: string[];
  expatSince?: Date;
  yearsInCountry: number;
  isVisibleOnMap: boolean;
  profileComplete: number;
  helpDomains: string[];
  description?: string;
  hourlyRate?: number;
}

interface FilterOptions {
  status: "all" | ExpatStatus;
  validationStatus: "all" | ValidationStatus;
  dateRange: "all" | "today" | "week" | "month";
  searchTerm: string;
  country: string;
  originCountry: string;
  helpDomain: string;
  language: string;
  minRating: "all" | string;
  minYearsInCountry: "all" | string;
}

type FirestoreExpatDoc = {
  serviceType?: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  currentCountry?: string;
  city?: string;
  originCountry?: string;
  countryOfOrigin?: string;
  nationalite?: string;
  status?: ExpatStatus;
  validationStatus?: ValidationStatus;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  callsCount?: number;
  completedCalls?: number;
  totalEarned?: number;
  earnings?: number;
  averageRating?: number;
  rating?: number;
  reviewsCount?: number;
  totalReviews?: number;
  specialities?: string[];
  expertise?: string[];
  languages?: string[];
  spokenLanguages?: string[];
  expatSince?: Timestamp;
  movedToCountryAt?: Timestamp;
  yearsInCountry?: number;
  isVisibleOnMap?: boolean;
  helpDomains?: string[];
  expertiseDomains?: string[];
  servicesOffered?: string[];
  description?: string;
  bio?: string;
  hourlyRate?: number;
  pricePerHour?: number;
};

/* ---------------------- Colonnes ---------------------- */
type ColId =
  | "select"
  | "name"
  | "email"
  | "emailVerified"
  | "phone"
  | "country"
  | "city"
  | "origin"
  | "languages"
  | "help"
  | "rating"
  | "reviews"
  | "signup"
  | "lastLogin"
  | "yearsInCountry"
  | "expatSince"
  | "hourlyRate"
  | "profile"
  | "map"
  | "accountStatus"
  | "validation"
  | "actions";

const DEFAULT_ORDER: ColId[] = [
  "select",
  "name",
  "email",
  "phone",
  "country",
  "city",
  "origin",
  "languages",
  "help",
  "rating",
  "reviews",
  "signup",
  "lastLogin",
  "yearsInCountry",
  "expatSince",
  "hourlyRate",
  "profile",
  "map",
  "accountStatus",
  "validation",
  "actions",
];

const DEFAULT_WIDTHS: Record<ColId, number> = {
  select: 48,
  name: 240,
  email: 220,
  emailVerified: 140,
  phone: 140,
  country: 140,
  city: 140,
  origin: 150,
  languages: 180,
  help: 220,
  rating: 100,
  reviews: 100,
  signup: 140,
  lastLogin: 140,
  yearsInCountry: 140,
  expatSince: 150,
  hourlyRate: 120,
  profile: 140,
  map: 120,
  accountStatus: 160,
  validation: 150,
  actions: 240,
};

const DEFAULT_VISIBLE: Record<ColId, boolean> = DEFAULT_ORDER.reduce(
  (acc, k) => ((acc[k] = true), acc),
  {} as Record<ColId, boolean>
);

const useColumnLayout = () => {
  const [order, setOrder] = useState<ColId[]>(
    (() => {
      try {
        const raw = localStorage.getItem("admin.expats.colOrder.v1");
        if (raw) return JSON.parse(raw);
      } catch {}
      return DEFAULT_ORDER;
    })()
  );
  const [widths, setWidths] = useState<Record<ColId, number>>(
    (() => {
      try {
        const raw = localStorage.getItem("admin.expats.colWidths.v1");
        if (raw) {
          const obj = JSON.parse(raw) as Record<string, number>;
          return { ...DEFAULT_WIDTHS, ...obj };
        }
      } catch {}
      return DEFAULT_WIDTHS;
    })()
  );
  const [visible, setVisible] = useState<Record<ColId, boolean>>(
    (() => {
      try {
        const raw = localStorage.getItem("admin.expats.colVisible.v1");
        if (raw) {
          const obj = JSON.parse(raw) as Record<string, boolean>;
          return { ...DEFAULT_VISIBLE, ...obj };
        }
      } catch {}
      return DEFAULT_VISIBLE;
    })()
  );

  useEffect(() => {
    localStorage.setItem("admin.expats.colOrder.v1", JSON.stringify(order));
  }, [order]);
  useEffect(() => {
    localStorage.setItem("admin.expats.colWidths.v1", JSON.stringify(widths));
  }, [widths]);
  useEffect(() => {
    localStorage.setItem("admin.expats.colVisible.v1", JSON.stringify(visible));
  }, [visible]);

  const reset = () => {
    setOrder(DEFAULT_ORDER);
    setWidths(DEFAULT_WIDTHS);
    setVisible(DEFAULT_VISIBLE);
  };

  return { order, setOrder, widths, setWidths, visible, setVisible, reset };
};

/* ---------------------- Utils ---------------------- */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const fmtDate = (d?: Date) => (d ? d.toLocaleDateString("fr-FR") : "â€”");
const fmtMoney = (n: number) => `${n.toFixed(2)}â‚¬`;

/* ---------------------- Composant principal ---------------------- */
const AdminExpats: React.FC = () => {
  const { t, lang } = useI18n();

  // state
  const [loading, setLoading] = useState(true);
  const [expats, setExpats] = useState<Expat[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [pageSize, setPageSize] = useState<number>(() => Number(localStorage.getItem("admin.expats.pageSize") || 25));
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState<number>(0);
  const [drawerExpat, setDrawerExpat] = useState<Expat | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; ids: string[] } | null>(null);

  const { order, setOrder, widths, setWidths, visible, setVisible, reset: resetCols } = useColumnLayout();

  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    validationStatus: "all",
    dateRange: "all",
    searchTerm: "",
    country: "all",
    originCountry: "all",
    helpDomain: "",
    language: "",
    minRating: "all",
    minYearsInCountry: "all",
  });

  // stats (calculÃ©es sur la page)
  const stats = React.useMemo(() => {
    const avgRating = expats.length ? expats.reduce((s, e) => s + e.rating, 0) / expats.length : 0;
    const active = expats.filter((e) => e.status === "active").length;
    const pending = expats.filter((e) => e.status === "pending").length;
    const suspended = expats.filter((e) => e.status === "suspended").length;
    const validated = expats.filter((e) => e.validationStatus === "approved").length;
    return { avgRating, active, pending, suspended, validated };
  }, [expats]);

  useEffect(() => {
    localStorage.setItem("admin.expats.pageSize", String(pageSize));
  }, [pageSize]);

  const calculateYearsInCountry = (expatSince: Date): number => {
    const now = new Date();
    const diffYears = (now.getTime() - expatSince.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.floor(diffYears));
  };

  const calculateProfileCompleteness = (data: FirestoreExpatDoc): number => {
    const fields: (keyof FirestoreExpatDoc)[] = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "country",
      "city",
      "originCountry",
      "helpDomains",
      "languages",
      "description",
    ];
    const completed = fields.filter((f) => {
      const v = (data as any)[f];
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && String(v || "").trim() !== "";
    }).length;
    return Math.round((completed / fields.length) * 100);
  };

  /* ---------------------- Chargement Firestore (pagination serveur) ---------------------- */
  const buildBaseQuery = useCallback(
    (opts?: { after?: QueryDocumentSnapshot<DocumentData> | null }) => {
      const base = [where("role", "==", "expat")] as any[];

      if (filters.status !== "all") base.push(where("status", "==", filters.status));
      if (filters.validationStatus !== "all") base.push(where("validationStatus", "==", filters.validationStatus));
      // Recherche large cÃ´tÃ© client aprÃ¨s fetch (pour rester proche de Lawyers). Ici on garde un orderBy fixe.
      const q = fsQuery(
        collection(db, "users"),
        ...base,
        orderBy("createdAt", "desc"),
        limit(pageSize + 1),
        ...(opts?.after ? [startAfter(opts.after)] : [])
      );
      return q;
    },
    [filters.status, filters.validationStatus, pageSize]
  );

  const loadCount = useCallback(async () => {
    try {
      const cQuery = fsQuery(collection(db, "users"), where("role", "==", "expat"));
      const snapshot = await getCountFromServer(cQuery);
      setTotal(snapshot.data().count);
    } catch {
      // silencieux
    }
  }, []);

  const applyClientSideFilters = useCallback(
    (arr: Expat[]) => {
      let out = [...arr];
      const f = filters;

      if (f.searchTerm) {
        const s = f.searchTerm.toLowerCase();
        out = out.filter(
          (e) =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(s) ||
            e.email.toLowerCase().includes(s) ||
            (e.city || "").toLowerCase().includes(s) ||
            (e.country || "").toLowerCase().includes(s) ||
            (e.originCountry || "").toLowerCase().includes(s)
        );
      }
      if (f.country !== "all") out = out.filter((e) => e.country?.toLowerCase() === f.country.toLowerCase());
      if (f.originCountry !== "all")
        out = out.filter((e) => (e.originCountry || "").toLowerCase() === f.originCountry.toLowerCase());
      if (f.helpDomain) out = out.filter((e) => e.helpDomains.some((d) => d.toLowerCase().includes(f.helpDomain.toLowerCase())));
      if (f.language) out = out.filter((e) => e.languages.some((d) => d.toLowerCase().includes(f.language.toLowerCase())));
      if (f.minRating !== "all") out = out.filter((e) => e.rating >= parseFloat(f.minRating));
      if (f.minYearsInCountry !== "all") out = out.filter((e) => e.yearsInCountry >= parseInt(f.minYearsInCountry, 10));
      if (f.dateRange !== "all") {
        const now = new Date();
        const from = new Date();
        if (f.dateRange === "today") from.setHours(0, 0, 0, 0);
        if (f.dateRange === "week") from.setDate(now.getDate() - 7);
        if (f.dateRange === "month") from.setMonth(now.getMonth() - 1);
        out = out.filter((e) => e.createdAt >= from);
      }
      return out;
    },
    [filters]
  );

  const mapDoc = (d: QueryDocumentSnapshot<DocumentData>): Expat => {
    const data = d.data() as FirestoreExpatDoc;
    const expatSince = data.expatSince?.toDate() || data.movedToCountryAt?.toDate();
    const yearsInCountry = expatSince ? calculateYearsInCountry(expatSince) : data.yearsInCountry || 0;
    return {
      id: d.id,
      email: data.email || "",
      emailVerified: !!data.emailVerified,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      country: data.country || data.currentCountry || "",
      city: data.city || "",
      originCountry: data.originCountry || data.countryOfOrigin || data.nationalite || "",
      status: (data.status || "pending") as ExpatStatus,
      validationStatus: (data.validationStatus || "pending") as ValidationStatus,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      lastLoginAt: data.lastLoginAt ? data.lastLoginAt.toDate() : undefined,
      callsCount: data.callsCount || data.completedCalls || 0,
      totalEarned: data.totalEarned || data.earnings || 0,
      rating: data.averageRating || data.rating || 0,
      reviewsCount: data.reviewsCount || data.totalReviews || 0,
      specialities: data.specialities || data.expertise || [],
      languages: data.languages || data.spokenLanguages || [],
      expatSince,
      yearsInCountry,
      isVisibleOnMap: data.isVisibleOnMap ?? true,
      profileComplete: calculateProfileCompleteness(data),
      helpDomains: data.helpDomains || data.expertiseDomains || data.servicesOffered || [],
      description: data.description || data.bio || "",
      hourlyRate: data.hourlyRate || data.pricePerHour,
    };
  };

  const loadPage = useCallback(
    async (direction: "init" | "next" | "prev" = "init") => {
      setLoading(true);
      try {
        if (direction === "init") setCursor(null);
        const q = buildBaseQuery({ after: direction === "next" ? cursor : null });
        const snap = await getDocs(q);

        const docs = snap.docs.slice(0, pageSize);
        const hasMore = snap.docs.length > pageSize;
        const formatted = docs.map(mapDoc);

        const filtered = applyClientSideFilters(formatted);
        setExpats(filtered);
        setHasNext(hasMore);
        setCursor(docs.length ? docs[docs.length - 1] : null);

        // refresh total (not strictly equal to filtered count)
        void loadCount();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [applyClientSideFilters, buildBaseQuery, cursor, loadCount, pageSize]
  );

  useEffect(() => {
    void loadPage("init");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, filters.status, filters.validationStatus]);

  // si filtres texte changent -> re-filtrer client-side
  useEffect(() => {
    setExpats((prev) => applyClientSideFilters(prev));
  }, [applyClientSideFilters, filters.searchTerm, filters.country, filters.originCountry, filters.helpDomain, filters.language, filters.minRating, filters.minYearsInCountry, filters.dateRange]);

  /* ---------------------- Actions ---------------------- */
  const toggleSelect = (id: string, checked: boolean) =>
    setSelected((s) => (checked ? [...s, id] : s.filter((x) => x !== id)));
  const isAllSelected = expats.length > 0 && selected.length === expats.length;

  const onBulk = async (action: "approve" | "reject" | "activate" | "suspend") => {
    const ids = selected;
    if (!ids.length) return;
    const ops = ids.map(async (id) => {
      const updates: any = { updatedAt: new Date() };
      if (action === "approve") {
        updates.validationStatus = "approved";
        updates.status = "active";
        updates.approvedAt = new Date();
      } else if (action === "reject") {
        updates.validationStatus = "rejected";
        updates.status = "suspended";
      } else if (action === "activate") {
        updates.status = "active";
      } else if (action === "suspend") {
        updates.status = "suspended";
      }
      await updateDoc(doc(db, "users", id), updates);
    });
    await Promise.all(ops);
    setSelected([]);
    await loadPage("init");
  };

  const handleStatusChange = async (id: string, status: ExpatStatus) => {
    await updateDoc(doc(db, "users", id), { status, updatedAt: new Date() });
    setExpats((list) => list.map((e) => (e.id === id ? { ...e, status } : e)));
  };
  const handleValidationChange = async (id: string, validationStatus: ValidationStatus) => {
    const updates: any = { validationStatus, updatedAt: new Date() };
    if (validationStatus === "approved") {
      updates.status = "active";
      updates.approvedAt = new Date();
    }
    await updateDoc(doc(db, "users", id), updates);
    setExpats((list) =>
      list.map((e) => (e.id === id ? { ...e, validationStatus, status: validationStatus === "approved" ? "active" : e.status } : e))
    );
  };

  const exportPage = () => {
    if (!expats.length) return;
    const rows = expats.map((e) => ({
      ID: e.id,
      Email: e.email,
      "Email vÃ©rifiÃ©": e.emailVerified ? "Oui" : "Non",
      PrÃ©nom: e.firstName,
      Nom: e.lastName,
      TÃ©lÃ©phone: e.phone || "",
      Pays: e.country,
      Ville: e.city || "",
      "Pays d'origine": e.originCountry || "",
      Note: e.rating.toFixed(1),
      Avis: e.reviewsCount,
      "Inscription": fmtDate(e.createdAt),
      "DerniÃ¨re connexion": fmtDate(e.lastLoginAt),
      "AnnÃ©es sur place": e.yearsInCountry,
      "Expat depuis": fmtDate(e.expatSince),
      "Domaines d'aide": e.helpDomains.join(", "),
      Langues: e.languages.join(", "),
      "Tarif â‚¬/h": e.hourlyRate ?? "",
      Statut: e.status,
      Validation: e.validationStatus,
      "Visible carte": e.isVisibleOnMap ? "Oui" : "Non",
      "Total gagnÃ©": fmtMoney(e.totalEarned),
      "Appels": e.callsCount,
    }));
    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expats-page-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------------------- Rendu cellules ---------------------- */
  const badge = (text: string, color: "green" | "red" | "yellow" | "gray" | "blue" = "gray") => {
    const colors: Record<string, string> = {
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      yellow: "bg-yellow-100 text-yellow-800",
      gray: "bg-gray-100 text-gray-800",
      blue: "bg-blue-100 text-blue-800",
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{text}</span>;
  };

  const cellStyleFor = (col: ColId) => ({ width: widths[col], minWidth: widths[col] });

  const renderCell = (col: ColId, e: Expat) => {
    switch (col) {
      case "name":
        return (
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">
              {e.firstName?.[0] || "?"}
              {e.lastName?.[0] || ""}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {e.firstName} {e.lastName}
              </div>
              <div className="text-xs text-gray-500">{e.description?.slice(0, 60)}</div>
            </div>
          </div>
        );
      case "email":
        return (
          <div>
            <div className="text-sm text-gray-900">{e.email}</div>
            {e.emailVerified ? <div className="text-xs text-green-600 flex items-center"><BadgeCheck className="w-3 h-3 mr-1" /> {t("emailVerified")}</div> : null}
            {e.phone ? <div className="text-xs text-gray-500">{e.phone}</div> : null}
          </div>
        );
      case "phone":
        return <div className="text-sm text-gray-900">{e.phone || "â€”"}</div>;
      case "country":
        return (
          <div className="text-sm text-gray-900 flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-gray-400" />
            {e.city ? `${e.city}, ` : ""}{e.country}
          </div>
        );
      case "city":
        return <div className="text-sm text-gray-900">{e.city || "â€”"}</div>;
      case "origin":
        return (
          <div className="text-sm">
            <div className="text-gray-900">{e.originCountry || "â€”"}</div>
            <div className="text-xs text-gray-500">{t("origin")}</div>
          </div>
        );
      case "languages":
        return (
          <div className="text-sm text-gray-900 flex items-center">
            <LanguagesIcon className="w-4 h-4 mr-1 text-gray-400" />
            <span title={e.languages.join(", ")}>{e.languages.slice(0, 2).join(", ")}{e.languages.length > 2 ? ` +${e.languages.length - 2}` : ""}</span>
          </div>
        );
      case "help":
        return <div className="text-xs text-gray-800" title={e.helpDomains.join(", ")}>{e.helpDomains.slice(0, 2).join(", ")}{e.helpDomains.length > 2 ? "â€¦" : ""}</div>;
      case "rating":
        return (
          <div className="flex items-center text-sm">
            <Star className="w-4 h-4 mr-1 text-yellow-400" />
            {e.rating > 0 ? e.rating.toFixed(1) : "N/A"}
          </div>
        );
      case "reviews":
        return <div className="text-sm text-gray-900">{e.reviewsCount}</div>;
      case "signup":
        return <div className="text-sm text-gray-900">{fmtDate(e.createdAt)}</div>;
      case "lastLogin":
        return <div className="text-sm text-gray-900">{fmtDate(e.lastLoginAt)}</div>;
      case "yearsInCountry":
        return <div className="text-sm text-blue-700">{e.yearsInCountry > 0 ? `${e.yearsInCountry} an${e.yearsInCountry > 1 ? "s" : ""}` : "â€”"}</div>;
      case "expatSince":
        return <div className="text-sm text-gray-900">{fmtDate(e.expatSince)}</div>;
      case "hourlyRate":
        return <div className="text-sm text-green-700">{e.hourlyRate ? `${e.hourlyRate}â‚¬` : "â€”"}</div>;
      case "profile":
        return (
          <div className="text-sm">
            <div className={`text-xs font-medium ${e.profileComplete >= 80 ? "text-green-600" : e.profileComplete >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {e.profileComplete}% {t("profile").toLowerCase()}
            </div>
            <div className="text-xs text-gray-500">
              {e.callsCount} calls â€¢ {fmtMoney(e.totalEarned)}
            </div>
          </div>
        );
      case "map":
        return <AdminMapVisibilityToggle userId={e.id} className="text-xs" />;
      case "accountStatus":
        return (
          <div className="space-y-1">
            <div>
              {e.status === "active" && badge("active", "green")}
              {e.status === "suspended" && badge("suspended", "red")}
              {e.status === "pending" && badge("pending", "yellow")}
              {e.status === "banned" && badge("banned", "gray")}
            </div>
          </div>
        );
      case "validation":
        return (
          <div className="space-y-1">
            <select
              value={e.status}
              onChange={(ev) => void handleStatusChange(e.id, ev.target.value as ExpatStatus)}
              className="text-xs border border-gray-300 rounded px-1 py-1 w-full"
            >
              <option value="active">{t("activate")}</option>
              <option value="pending">{t("pending")}</option>
              <option value="suspended">{t("suspend")}</option>
              <option value="banned">banned</option>
            </select>
            <select
              value={e.validationStatus}
              onChange={(ev) => void handleValidationChange(e.id, ev.target.value as ValidationStatus)}
              className="text-xs border border-gray-300 rounded px-1 py-1 w-full"
            >
              <option value="pending">{t("pending")}</option>
              <option value="approved">{t("approve")}</option>
              <option value="rejected">{t("reject")}</option>
            </select>
          </div>
        );
      case "actions":
        return (
          <div className="flex items-center justify-end space-x-2">
            <button className="text-green-600 hover:text-green-900" title={t("view")} onClick={() => setDrawerExpat(e)}>
              <Eye size={16} />
            </button>
            <button className="text-gray-600 hover:text-gray-900" title={t("edit")}>
              <Edit size={16} />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  /* ---------------------- Header (drag, resize, visibilitÃ©) ---------------------- */
  // (simplifiÃ© mais fidÃ¨le Ã  lâ€™esprit de Lawyers : ordre, largeur, visibilitÃ©, reset)
  const HeaderCell: React.FC<{ col: ColId; label: string }> = ({ col, label }) => {
    const startX = useRef(0);
    const startW = useRef(0);
    const ref = useRef<HTMLDivElement>(null);

    const onResizeStart = (e: React.MouseEvent) => {
      startX.current = e.clientX;
      startW.current = widths[col];
      window.addEventListener("mousemove", onResizing);
      window.addEventListener("mouseup", onResizeEnd);
      e.preventDefault();
    };
    const onResizing = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      setWidths((w) => ({ ...w, [col]: clamp(startW.current + delta, 60, 600) }));
    };
    const onResizeEnd = () => {
      window.removeEventListener("mousemove", onResizing);
      window.removeEventListener("mouseup", onResizeEnd);
    };

    return (
      <div className="relative flex items-center" style={cellStyleFor(col)} ref={ref}>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <span
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none"
          onMouseDown={onResizeStart}
          aria-hidden
        />
      </div>
    );
  };

  const headerLabel = (col: ColId) => {
    const map: Partial<Record<ColId, string>> = {
      select: "",
      name: t("name"),
      email: t("email"),
      emailVerified: t("emailVerified"),
      phone: t("phone"),
      country: t("country"),
      city: t("city"),
      origin: t("origin"),
      languages: t("langs"),
      help: t("help"),
      rating: t("rating"),
      reviews: t("reviews"),
      signup: t("signup"),
      lastLogin: t("lastLogin"),
      yearsInCountry: t("yearsInCountry"),
      expatSince: t("expatSince"),
      hourlyRate: t("hourlyRate"),
      profile: t("profile"),
      map: t("map"),
      accountStatus: t("accountStatus"),
      validation: t("validation"),
      actions: t("actions"),
    };
    return map[col] || col;
  };

  /* ---------------------- UI ---------------------- */
  const clearFilters = () =>
    setFilters({
      status: "all",
      validationStatus: "all",
      dateRange: "all",
      searchTerm: "",
      country: "all",
      originCountry: "all",
      helpDomain: "",
      language: "",
      minRating: "all",
      minYearsInCountry: "all",
    });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Globe className="w-8 h-8 mr-3 text-green-600" />
              {t("title")}
            </h1>
            <p className="text-gray-600 mt-1">{t("subtitle")}</p>
            <p className="text-gray-500 mt-1">
              {t("totalExact")}: <span className="font-semibold">{total}</span> â€¢ {stats.active} {t("active")} â€¢ {stats.pending} {t("pending")} â€¢ {stats.validated} {t("validated")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                className="w-72 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.searchTerm}
                onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
              />
              <Button onClick={() => setShowFilters((v) => !v)} variant="outline" className="flex items-center">
                <Filter size={16} className="mr-2" /> {t("filters")}
              </Button>
              <Button onClick={() => setShowCols((v) => !v)} variant="outline" className="flex items-center">
                <GripVertical size={16} className="mr-2" /> {t("columns")}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <select
                className="border border-gray-300 rounded-md px-2 py-2"
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("perPage")}
                  </option>
                ))}
              </select>
              <Button onClick={exportPage} variant="outline" className="flex items-center" disabled={!expats.length}>
                <Download size={16} className="mr-2" /> {t("export")}
              </Button>
            </div>
          </div>
        </div>

        {/* Filtres avancÃ©s */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t("filters")}</h3>
              <Button onClick={clearFilters} variant="outline" className="text-sm">
                {t("clearFilters")}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("status")}</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ExpatStatus | "all" }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="active">{t("activate")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="suspended">{t("suspend")}</option>
                  <option value="banned">banned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("validation")}</label>
                <select
                  value={filters.validationStatus}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, validationStatus: e.target.value as ValidationStatus | "all" }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="approved">{t("approve")}</option>
                  <option value="rejected">{t("reject")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("period")}</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value as FilterOptions["dateRange"] }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="today">{t("today")}</option>
                  <option value="week">{t("week")}</option>
                  <option value="month">{t("month")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("country")}</label>
                <input
                  value={filters.country === "all" ? "" : filters.country}
                  onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value || "all" }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="FR, ESâ€¦"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("originCountry")}</label>
                <input
                  value={filters.originCountry === "all" ? "" : filters.originCountry}
                  onChange={(e) => setFilters((f) => ({ ...f, originCountry: e.target.value || "all" }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="MA, SNâ€¦"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("helpDomains")}</label>
                <input
                  value={filters.helpDomain}
                  onChange={(e) => setFilters((f) => ({ ...f, helpDomain: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="logement, papiersâ€¦"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("languages")}</label>
                <input
                  value={filters.language}
                  onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="fr, enâ€¦"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("minRating")}</label>
                <input
                  value={filters.minRating === "all" ? "" : filters.minRating}
                  onChange={(e) => setFilters((f) => ({ ...f, minRating: e.target.value || "all" }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="4.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("minYears")}</label>
                <input
                  value={filters.minYearsInCountry === "all" ? "" : filters.minYearsInCountry}
                  onChange={(e) => setFilters((f) => ({ ...f, minYearsInCountry: e.target.value || "all" }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Colonnes visibles */}
        {showCols && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t("columns")}</div>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setVisible(DEFAULT_VISIBLE)}>{t("showAll")}</Button>
                <Button variant="outline" onClick={() => setVisible(Object.fromEntries(Object.keys(DEFAULT_VISIBLE).map(k => [k as ColId, false])) as any)}>{t("hideAll")}</Button>
                <Button variant="outline" onClick={resetCols}>Reset</Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {order.filter((c) => c !== "select").map((col) => (
                <label key={col} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visible[col]}
                    onChange={(e) => setVisible((v) => ({ ...v, [col]: e.target.checked }))}
                  />
                  <span>{headerLabel(col)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions en lot */}
        {selected.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-green-800">
                <strong>{selected.length}</strong> {t("selection")}
              </p>
              <div className="flex space-x-3">
                <Button onClick={() => void onBulk("approve")} className="bg-green-600 hover:bg-green-700 text-white">
                  {t("approve")}
                </Button>
                <Button onClick={() => void onBulk("reject")} className="bg-red-600 hover:bg-red-700 text-white">
                  {t("reject")}
                </Button>
                <Button onClick={() => void onBulk("activate")} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {t("activate")}
                </Button>
                <Button onClick={() => void onBulk("suspend")} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  {t("suspend")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-2 text-gray-600">{t("loading")}</span>
              </div>
            ) : expats.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t("emptyTitle")}</h3>
                <p className="mt-1 text-sm text-gray-500">{t("emptyText")}</p>
                <Button onClick={clearFilters} className="mt-4" variant="outline">
                  {t("clearFilters")}
                </Button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {order.map((col) =>
                      col === "select" ? (
                        <th key={col} className="px-4 py-3 text-left" style={cellStyleFor(col)}>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            checked={isAllSelected}
                            onChange={(e) => setSelected(e.target.checked ? expats.map((x) => x.id) : [])}
                          />
                        </th>
                      ) : visible[col] ? (
                        <th key={col} className="px-6 py-3 text-left" style={cellStyleFor(col)}>
                          <HeaderCell col={col} label={headerLabel(col)} />
                        </th>
                      ) : null
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expats.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      {order.map((col) =>
                        col === "select" ? (
                          <td key={col} className="px-4 py-4" style={cellStyleFor(col)}>
                            <input
                              type="checkbox"
                              checked={selected.includes(e.id)}
                              onChange={(ev) => toggleSelect(e.id, ev.target.checked)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                        ) : visible[col] ? (
                          <td key={col} className="px-6 py-4 whitespace-nowrap align-top" style={cellStyleFor(col)}>
                            {renderCell(col, e)}
                          </td>
                        ) : null
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {expats.length} / {t("expatsCount")} â€¢ {t("totalExact")}: {total} â€¢ {t("rating")}: {stats.avgRating.toFixed(1)}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => void loadPage("init")}><span className="mr-1">â†»</span> Refresh</Button>
              <Button variant="outline" disabled={!cursor} onClick={() => void loadPage("init")}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button variant="outline" disabled={!hasNext} onClick={() => void loadPage("next")}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Drawer Profil (simple) */}
        {drawerExpat && (
          <Modal isOpen={true} onClose={() => setDrawerExpat(null)} title={`${drawerExpat.firstName} ${drawerExpat.lastName}`}>
            <div className="space-y-3">
              <div className="text-sm text-gray-700">
                <div><strong>{t("email")}:</strong> {drawerExpat.email}</div>
                {drawerExpat.phone ? <div><strong>{t("phone")}:</strong> {drawerExpat.phone}</div> : null}
                <div><strong>{t("country")}:</strong> {drawerExpat.city ? `${drawerExpat.city}, ` : ""}{drawerExpat.country}</div>
                {drawerExpat.originCountry ? <div><strong>{t("origin")}:</strong> {drawerExpat.originCountry}</div> : null}
                <div><strong>{t("langs")}:</strong> {drawerExpat.languages.join(", ") || "â€”"}</div>
                <div><strong>{t("help")}:</strong> {drawerExpat.helpDomains.join(", ") || "â€”"}</div>
                <div><strong>{t("yearsInCountry")}:</strong> {drawerExpat.yearsInCountry || "â€”"}</div>
                <div><strong>{t("expatSince")}:</strong> {fmtDate(drawerExpat.expatSince)}</div>
                <div><strong>{t("hourlyRate")}:</strong> {drawerExpat.hourlyRate ?? "â€”"}</div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setDrawerExpat(null)}>Close</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminExpats;
