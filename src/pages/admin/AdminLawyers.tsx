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
  QueryConstraint,
  Query as FSQuery,
  CollectionReference,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  Scale,
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
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

/* ---------------------- i18n ---------------------- */
type Lang = "fr" | "en";
const detectLang = (): Lang => {
  const ls = (localStorage.getItem("admin_lang") || "").toLowerCase();
  if (ls === "fr" || ls === "en") return ls as Lang;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
};
const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    title: "Avocats",
    subtitle: "Gestion des avocats (validation, KYC, statut, notation)",
    search: "Nom, email, N° barreau…",
    filters: "Filtres",
    columns: "Colonnes",
    showAll: "Tout",
    hideAll: "Aucun",
    export: "Exporter CSV",
    exportAll: "Exporter (tous filtres)",
    totalExact: "Total (exact)",
    active: "Actifs",
    suspended: "Suspendus",
    pending: "En attente",
    validated: "Validés",
    notValidated: "Non validés",
    kyc: "KYC",
    kycPending: "En cours",
    kycVerified: "Vérifié",
    kycRejected: "Refusé",
    kycRequested: "Demandé",
    status: "Statut",
    all: "Tous",
    blocked: "Bloqué",
    emailVerified: "Email vérifié",
    verified: "Vérifié",
    unverified: "Non vérifié",
    validationStatus: "Validation",
    period: "Période",
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    country: "Pays",
    specialties: "Spécialités (contient)",
    languages: "Langues (contient)",
    barId: "N° barreau (contient)",
    tableName: "Nom",
    tableEmail: "Email",
    tableEmailVerif: "Email vérifié",
    tablePhone: "Téléphone",
    tableCountry: "Pays",
    tableCity: "Ville",
    tableBarId: "N° barreau",
    tableBarCountry: "Pays du barreau",
    tableLanguages: "Langues",
    tableSpecialties: "Spécialités",
    tableRating: "Note",
    tableReviews: "Avis",
    tableSignup: "Inscription",
    tableLastLogin: "Dernière connexion",
    tableAccount: "Compte",
    tableValidation: "Validation",
    tableKyc: "KYC",
    tableActions: "Actions",
    approve: "Valider",
    reject: "Refuser",
    requestKyc: "Demander KYC",
    setKycVerified: "KYC Vérifié",
    setKycRejected: "KYC Refusé",
    activate: "Activer",
    suspend: "Suspendre",
    delete: "Supprimer",
    openValidation: "Ouvrir validation",
    bulkApprove: "Valider",
    bulkReject: "Refuser",
    bulkSuspend: "Suspendre",
    bulkDelete: "Supprimer",
    selected: "sélectionné(s)",
    noneTitle: "Aucun avocat trouvé",
    noneBody: "Aucun avocat ne correspond aux critères.",
    loading: "Chargement…",
    rowsPerPage: "Lignes / page",
    page: "Page",
    of: "sur",
    successUpdate: "Mise à jour réussie.",
    errorUpdate: "Erreur lors de la mise à jour.",
    retry: "Réessayer",
    lang: "Langue",
    reasonTitleSuspend: "Raison de suspension",
    reasonTitleDelete: "Confirmer la suppression",
    reasonTitleReject: "Raison de refus de validation",
    reasonTitleKycRequest: "Message de demande KYC (optionnel)",
    reasonLabel: "Raison (obligatoire)",
    reasonPlaceholder: "Ex: pièce non conforme, incohérence identité…",
    optionalMessage: "Message (optionnel)",
    cancel: "Annuler",
    confirm: "Confirmer",
    copied: "Copié ✅",
    exportAllRunning: "Export en cours…",
    exportAllDone: "Export terminé ✅",
    exportAllCap: "Limite atteinte (5000 lignes). Affinez vos filtres.",
    contact: "Contacter",
    copyEmail: "Copier email",
    copyId: "Copier ID",
    sortAsc: "Tri ↑",
    sortDesc: "Tri ↓",
    dateFrom: "Du",
    dateTo: "Au",
    quick: "Raccourcis",
    syncedStripe: "Synchronisé Stripe",
    resetLayout: "Réinitialiser colonnes",
  },
  en: {
    title: "Lawyers",
    subtitle: "Lawyers management (validation, KYC, status, rating)",
    search: "Name, email, Bar ID…",
    filters: "Filters",
    columns: "Columns",
    showAll: "All",
    hideAll: "None",
    export: "Export CSV",
    exportAll: "Export (all filters)",
    totalExact: "Total (exact)",
    active: "Active",
    suspended: "Suspended",
    pending: "Pending",
    validated: "Validated",
    notValidated: "Not validated",
    kyc: "KYC",
    kycPending: "In progress",
    kycVerified: "Verified",
    kycRejected: "Rejected",
    kycRequested: "Requested",
    status: "Status",
    all: "All",
    blocked: "Blocked",
    emailVerified: "Email verified",
    verified: "Verified",
    unverified: "Unverified",
    validationStatus: "Validation",
    period: "Period",
    today: "Today",
    week: "This week",
    month: "This month",
    country: "Country",
    specialties: "Specialties (contains)",
    languages: "Languages (contains)",
    barId: "Bar ID (contains)",
    tableName: "Name",
    tableEmail: "Email",
    tableEmailVerif: "Email verified",
    tablePhone: "Phone",
    tableCountry: "Country",
    tableCity: "City",
    tableBarId: "Bar ID",
    tableBarCountry: "Bar country",
    tableLanguages: "Languages",
    tableSpecialties: "Specialties",
    tableRating: "Rating",
    tableReviews: "Reviews",
    tableSignup: "Sign-up",
    tableLastLogin: "Last login",
    tableAccount: "Account",
    tableValidation: "Validation",
    tableKyc: "KYC",
    tableActions: "Actions",
    approve: "Approve",
    reject: "Reject",
    requestKyc: "Request KYC",
    setKycVerified: "KYC Verified",
    setKycRejected: "KYC Rejected",
    activate: "Activate",
    suspend: "Suspend",
    delete: "Delete",
    openValidation: "Open validation",
    bulkApprove: "Approve",
    bulkReject: "Reject",
    bulkSuspend: "Suspend",
    bulkDelete: "Delete",
    selected: "selected",
    noneTitle: "No lawyers found",
    noneBody: "No lawyers match your filters.",
    loading: "Loading…",
    rowsPerPage: "Rows / page",
    page: "Page",
    of: "of",
    successUpdate: "Update successful.",
    errorUpdate: "Update failed.",
    retry: "Retry",
    lang: "Language",
    reasonTitleSuspend: "Suspension reason",
    reasonTitleDelete: "Confirm deletion",
    reasonTitleReject: "Validation rejection reason",
    reasonTitleKycRequest: "KYC request message (optional)",
    reasonLabel: "Reason (required)",
    reasonPlaceholder: "Eg: non compliant document, identity mismatch…",
    optionalMessage: "Message (optional)",
    cancel: "Cancel",
    confirm: "Confirm",
    copied: "Copied ✅",
    exportAllRunning: "Export running…",
    exportAllDone: "Export finished ✅",
    exportAllCap: "Cap reached (5000 rows). Refine filters.",
    contact: "Contact",
    copyEmail: "Copy email",
    copyId: "Copy ID",
    sortAsc: "Sort ↑",
    sortDesc: "Sort ↓",
    dateFrom: "From",
    dateTo: "To",
    quick: "Shortcuts",
    syncedStripe: "Synced with Stripe",
    resetLayout: "Reset columns",
  },
};
const useI18n = () => {
  const [lang, setLang] = useState<Lang>(detectLang());
  useEffect(() => localStorage.setItem("admin_lang", lang), [lang]);
  const t = useCallback(
    (k: keyof typeof STRINGS["fr"]) => STRINGS[lang][k] ?? (k as string),
    [lang]
  );
  return { t, lang, setLang };
};
/* -------------------------------------------------- */

type UserStatus = "active" | "pending" | "blocked" | "suspended";
type KycStatus = "pending" | "verified" | "rejected" | "requested";
type ValidationStatus = "validated" | "rejected" | "pending";
type SortDir = "asc" | "desc";

type Lawyer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;

  barId?: string;
  barCountry?: string;
  isValidated: boolean;
  validationStatus: ValidationStatus;
  validationReason?: string;

  kycStatus: KycStatus;
  kycProvider?: "stripe" | "manual";
  kycStripeAccountId?: string;
  kycLastSyncAt?: Date;

  specialties?: string[];
  languages?: string[];
  rating?: number;
  reviewsCount?: number;
};

type FilterOptions = {
  status: "all" | UserStatus;
  emailVerified: "all" | "verified" | "unverified";
  country: "all" | string;
  validation: "all" | "validated" | "notValidated";
  kyc: "all" | KycStatus;
  specialties: string;
  langs: string;
  barId: string;
  searchTerm: string;
  quickRange: "all" | "today" | "week" | "month";
  from?: string;
  to?: string;
};

type FirestoreLawyerDoc = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  status?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  emailVerified?: boolean;

  barId?: string;
  barCountry?: string;
  isValidated?: boolean;
  validationStatus?: ValidationStatus;
  validationReason?: string;

  kycStatus?: KycStatus;
  kycProvider?: "stripe" | "manual";
  kycStripeAccountId?: string;
  kycLastSyncAt?: Timestamp;

  specialties?: string[];
  languages?: string[];
  rating?: number;
  reviewsCount?: number;
};

/* ------------ Column layout (order + resizable widths + visibility) ------------- */
type ColId =
  | "name"
  | "email"
  | "emailVerified"
  | "phone"
  | "country"
  | "city"
  | "barId"
  | "barCountry"
  | "languages"
  | "specialties"
  | "rating"
  | "reviews"
  | "signup"
  | "lastLogin"
  | "accountStatus"
  | "validation"
  | "kyc";

const DEFAULT_ORDER: ColId[] = [
  "name",
  "email",
  "emailVerified",
  "phone",
  "country",
  "city",
  "barId",
  "barCountry",
  "languages",
  "specialties",
  "rating",
  "reviews",
  "signup",
  "lastLogin",
  "accountStatus",
  "validation",
  "kyc",
];

const DEFAULT_WIDTHS: Record<ColId | "select" | "actions", number> = {
  select: 56,
  name: 200,
  email: 220,
  emailVerified: 150,
  phone: 140,
  country: 120,
  city: 120,
  barId: 130,
  barCountry: 150,
  languages: 170,
  specialties: 200,
  rating: 100,
  reviews: 100,
  signup: 130,
  lastLogin: 130,
  accountStatus: 140,
  validation: 150,
  kyc: 200,
  actions: 420,
};

const DEFAULT_VISIBLE: Record<ColId, boolean> = DEFAULT_ORDER.reduce(
  (acc, k) => ((acc[k] = true), acc),
  {} as Record<ColId, boolean>
);

const useColumnLayout = () => {
  const [order, setOrder] = useState<ColId[]>(
    (() => {
      try {
        const raw = localStorage.getItem("admin.lawyers.colOrder.v2");
        if (raw) {
          const arr = JSON.parse(raw) as ColId[];
          if (Array.isArray(arr) && arr.length) return arr;
        }
      } catch {}
      return DEFAULT_ORDER;
    })()
  );
  const [widths, setWidths] = useState<Record<ColId | "select" | "actions", number>>(
    (() => {
      try {
        const raw = localStorage.getItem("admin.lawyers.colWidths.v2");
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
        const raw = localStorage.getItem("admin.lawyers.colVisible.v1");
        if (raw) return { ...DEFAULT_VISIBLE, ...(JSON.parse(raw) as Record<ColId, boolean>) };
      } catch {}
      return DEFAULT_VISIBLE;
    })()
  );

  useEffect(() => {
    localStorage.setItem("admin.lawyers.colOrder.v2", JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    localStorage.setItem("admin.lawyers.colWidths.v2", JSON.stringify(widths));
  }, [widths]);

  useEffect(() => {
    localStorage.setItem("admin.lawyers.colVisible.v1", JSON.stringify(visible));
  }, [visible]);

  const reset = () => {
    setOrder(DEFAULT_ORDER);
    setWidths(DEFAULT_WIDTHS);
    setVisible(DEFAULT_VISIBLE);
  };

  return { order, setOrder, widths, setWidths, visible, setVisible, reset };
};
/* ------------------------------------------------------------------- */

const AdminLawyers: React.FC = () => {
  const { t, lang, setLang } = useI18n();

  const [rows, setRows] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showColsPanel, setShowColsPanel] = useState(false);

  const [sortDir, setSortDir] = useState<SortDir>(
    (localStorage.getItem("admin.lawyers.sortDir") as SortDir) || "desc"
  );

  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    emailVerified: "all",
    country: "all",
    validation: "all",
    kyc: "all",
    specialties: "",
    langs: "",
    barId: "",
    searchTerm: "",
    quickRange: "all",
    from: "",
    to: "",
  });

  // column layout
  const { order, setOrder, widths, setWidths, visible, setVisible, reset: resetLayout } =
    useColumnLayout();
  const resizingRef = useRef<{
    id: ColId | "select" | "actions";
    startX: number;
    startW: number;
  } | null>(null);

  // Pagination + count
  const [pageSize, setPageSize] = useState<number>(
    Number(localStorage.getItem("admin.lawyers.pageSize")) || 25
  );
  const [pageIndex, setPageIndex] = useState<number>(1);
  const cursors = useRef<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({
    1: null,
  });
  const [hasNext, setHasNext] = useState(false);
  const [totalExact, setTotalExact] = useState<number | null>(null);

  // listeners temps réel par doc visible
  const docUnsubsRef = useRef<Record<string, Unsubscribe>>({});

  useEffect(() => {
    localStorage.setItem("admin.lawyers.pageSize", String(pageSize));
  }, [pageSize]);
  useEffect(() => {
    localStorage.setItem("admin.lawyers.sortDir", sortDir);
  }, [sortDir]);

  // COUNT exact
  const fetchExactCount = useCallback(async () => {
    try {
      const base = collection(db, "users") as CollectionReference<DocumentData>;
      const constraints: QueryConstraint[] = [where("role", "==", "lawyer")];

      if (filters.status !== "all") constraints.push(where("status", "==", filters.status));
      if (filters.emailVerified !== "all")
        constraints.push(where("emailVerified", "==", filters.emailVerified === "verified"));
      if (filters.country !== "all" && filters.country.trim() !== "")
        constraints.push(where("country", "==", filters.country.trim()));
      if (filters.validation !== "all")
        constraints.push(where("isValidated", "==", filters.validation === "validated"));
      if (filters.kyc !== "all") constraints.push(where("kycStatus", "==", filters.kyc));

      // Dates
      const now = new Date();
      let from: Date | null = null;
      if (filters.quickRange === "today")
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filters.quickRange === "week") {
        const d = now.getDay();
        const diff = now.getDate() - d + (d === 0 ? -6 : 1);
        from = new Date(now.setDate(diff));
        from.setHours(0, 0, 0, 0);
      }
      if (filters.quickRange === "month")
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      if (from) constraints.push(where("createdAt", ">=", Timestamp.fromDate(from)));
      if (filters.from)
        constraints.push(
          where("createdAt", ">=", Timestamp.fromDate(new Date(filters.from + "T00:00:00")))
        );
      if (filters.to)
        constraints.push(
          where("createdAt", "<=", Timestamp.fromDate(new Date(filters.to + "T23:59:59.999")))
        );

      const q: FSQuery<DocumentData> = fsQuery(base, ...constraints);
      const snap = await getCountFromServer(q);
      setTotalExact(snap.data().count);
    } catch (e) {
      console.error("[AdminLawyers] count error", e);
      setTotalExact(null);
    }
  }, [filters]);

  // LOAD page
  const loadPage = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    Object.values(docUnsubsRef.current).forEach((u) => u && u());
    docUnsubsRef.current = {};

    try {
      const base = collection(db, "users") as CollectionReference<DocumentData>;
      const constraints: QueryConstraint[] = [
        where("role", "==", "lawyer"),
        orderBy("createdAt", sortDir),
        limit(pageSize + 1),
      ];

      if (filters.status !== "all") constraints.splice(1, 0, where("status", "==", filters.status));
      if (filters.emailVerified !== "all")
        constraints.splice(
          1,
          0,
          where("emailVerified", "==", filters.emailVerified === "verified")
        );
      if (filters.country !== "all" && filters.country.trim() !== "")
        constraints.splice(1, 0, where("country", "==", filters.country.trim()));
      if (filters.validation !== "all")
        constraints.splice(1, 0, where("isValidated", "==", filters.validation === "validated"));
      if (filters.kyc !== "all") constraints.splice(1, 0, where("kycStatus", "==", filters.kyc));

      const now = new Date();
      let from: Date | null = null;
      if (filters.quickRange === "today")
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filters.quickRange === "week") {
        const d = now.getDay();
        const diff = now.getDate() - d + (d === 0 ? -6 : 1);
        from = new Date(now.setDate(diff));
        from.setHours(0, 0, 0, 0);
      }
      if (filters.quickRange === "month")
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      if (from) constraints.splice(1, 0, where("createdAt", ">=", Timestamp.fromDate(from)));
      if (filters.from)
        constraints.splice(
          1,
          0,
          where("createdAt", ">=", Timestamp.fromDate(new Date(filters.from + "T00:00:00")))
        );
      if (filters.to)
        constraints.splice(
          1,
          0,
          where("createdAt", "<=", Timestamp.fromDate(new Date(filters.to + "T23:59:59.999")))
        );

      const cursor = cursors.current[pageIndex];
      const q: FSQuery<DocumentData> = cursor
        ? fsQuery(base, ...constraints, startAfter(cursor))
        : fsQuery(base, ...constraints);

      const snap = await getDocs(q);
      const docs = snap.docs;
      const pageDocs = docs.slice(0, pageSize);
      setHasNext(docs.length > pageSize);
      cursors.current[pageIndex + 1] =
        docs.length > pageSize ? pageDocs[pageDocs.length - 1] : null;

      let data: Lawyer[] = pageDocs.map((d: QueryDocumentSnapshot<DocumentData>) => {
        const v = d.data() as FirestoreLawyerDoc;
        return {
          id: d.id,
          email: v.email ?? "",
          firstName: v.firstName ?? "",
          lastName: v.lastName ?? "",
          phone: v.phone ?? "",
          country: v.country ?? "",
          city: v.city ?? "",
          status: (v.status ?? "active") as UserStatus,
          createdAt: v.createdAt ? v.createdAt.toDate() : new Date(),
          lastLoginAt: v.lastLoginAt ? v.lastLoginAt.toDate() : undefined,
          emailVerified: !!v.emailVerified,
          barId: v.barId,
          barCountry: v.barCountry,
          isValidated: !!v.isValidated,
          validationStatus: v.validationStatus ?? "pending",
          validationReason: v.validationReason,
          kycStatus: v.kycStatus ?? "pending",
          kycProvider: v.kycProvider,
          kycStripeAccountId: v.kycStripeAccountId,
          kycLastSyncAt: v.kycLastSyncAt ? v.kycLastSyncAt.toDate() : undefined,
          specialties: Array.isArray(v.specialties) ? v.specialties : [],
          languages: Array.isArray(v.languages) ? v.languages : [],
          rating: typeof v.rating === "number" ? v.rating : undefined,
          reviewsCount: typeof v.reviewsCount === "number" ? v.reviewsCount : undefined,
        };
      });

      // filtres "contient" côté page
      const hasTerm = filters.searchTerm.trim();
      const hasSpec = filters.specialties.trim();
      const hasLang = filters.langs.trim();
      const hasBar = filters.barId.trim();
      if (hasTerm || hasSpec || hasLang || hasBar) {
        const term = filters.searchTerm.trim().toLowerCase();
        data = data.filter((l) => {
          const okTerm =
            !hasTerm ||
            `${l.firstName} ${l.lastName}`.toLowerCase().includes(term) ||
            l.email.toLowerCase().includes(term) ||
            (l.barId || "").toLowerCase().includes(term) ||
            (l.phone || "").toLowerCase().includes(term);
          const okSpec =
            !hasSpec ||
            (l.specialties || [])
              .join(" ")
              .toLowerCase()
              .includes(filters.specialties.trim().toLowerCase());
          const okLang =
            !hasLang ||
            (l.languages || [])
              .join(" ")
              .toLowerCase()
              .includes(filters.langs.trim().toLowerCase());
          const okBar =
            !hasBar || (l.barId || "").toLowerCase().includes(filters.barId.trim().toLowerCase());
          return okTerm && okSpec && okLang && okBar;
        });
      }

      setRows(data);

      // temps réel
      data.forEach((row) => {
        const id = row.id;
        const ref = doc(db, "users", id);
        docUnsubsRef.current[id] = onSnapshot(ref, (ds) => {
          if (!ds.exists()) {
            setRows((prev) => prev.filter((x) => x.id !== id));
            return;
          }
          const v = ds.data() as FirestoreLawyerDoc;
          setRows((prev) =>
            prev.map((x) =>
              x.id !== id
                ? x
                : {
                    ...x,
                    status: (v.status ?? x.status) as UserStatus,
                    isValidated: v.isValidated ?? x.isValidated,
                    validationStatus: v.validationStatus ?? x.validationStatus,
                    validationReason: v.validationReason ?? x.validationReason,
                    kycStatus: v.kycStatus ?? x.kycStatus,
                    kycProvider: v.kycProvider ?? x.kycProvider,
                    kycStripeAccountId: v.kycStripeAccountId ?? x.kycStripeAccountId,
                    kycLastSyncAt: v.kycLastSyncAt
                      ? v.kycLastSyncAt.toDate()
                      : x.kycLastSyncAt,
                    lastLoginAt: v.lastLoginAt ? v.lastLoginAt.toDate() : x.lastLoginAt,
                    emailVerified: v.emailVerified ?? x.emailVerified,
                    phone: v.phone ?? x.phone,
                  }
            )
          );
        });
      });
    } catch (e) {
      console.error("[AdminLawyers] load error", e);
      setErrorMsg((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters, pageIndex, pageSize, sortDir]);

  useEffect(() => {
    fetchExactCount();
  }, [fetchExactCount]);
  useEffect(() => {
    cursors.current = { 1: null };
    setPageIndex(1);
  }, [
    filters.status,
    filters.emailVerified,
    filters.country,
    filters.validation,
    filters.kyc,
    filters.quickRange,
    filters.from,
    filters.to,
    filters.specialties,
    filters.langs,
    filters.barId,
    filters.searchTerm,
    sortDir,
  ]);
  useEffect(() => {
    loadPage();
    return () => {
      Object.values(docUnsubsRef.current).forEach((u) => u && u());
      docUnsubsRef.current = {};
    };
  }, [loadPage]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Modales raison
  const [reasonOpen, setReasonOpen] = useState<
    | null
    | {
        type: "suspend" | "delete" | "reject" | "kycRequest";
        ids: string[];
      }
  >(null);
  const [reasonText, setReasonText] = useState("");

  // Actions unitaires
  const setValidation = async (id: string, status: ValidationStatus, reason?: string) => {
    try {
      const payload: Record<string, unknown> = {
        validationStatus: status,
        isValidated: status === "validated",
        updatedAt: new Date(),
      };
      if (status === "rejected") payload.validationReason = reason || null;
      if (status === "validated") payload["validationReason"] = null;
      await updateDoc(doc(db, "users", id), payload);
      alert(t("successUpdate"));
    } catch (e) {
      console.error("setValidation error", e);
      alert(t("errorUpdate"));
    }
  };

  const setKyc = async (id: string, next: KycStatus, message?: string) => {
    try {
      const row = rows.find((r) => r.id === id);
      if (row?.kycProvider === "stripe") return; // read-only si piloté Stripe
      const payload: Record<string, unknown> = { kycStatus: next, updatedAt: new Date() };
      if (message) payload["kycMessage"] = message;
      await updateDoc(doc(db, "users", id), payload);
      alert(t("successUpdate"));
    } catch (e) {
      console.error("setKyc error", e);
      alert(t("errorUpdate"));
    }
  };

  const setStatus = async (id: string, status: UserStatus, reason?: string) => {
    try {
      const payload: Record<string, unknown> = { status, updatedAt: new Date() };
      if (status === "suspended" && reason) {
        payload["suspendedReason"] = reason;
        payload["suspendedAt"] = new Date();
      }
      await updateDoc(doc(db, "users", id), payload);
      alert(t("successUpdate"));
    } catch (e) {
      console.error("setStatus error", e);
      alert(t("errorUpdate"));
    }
  };

  // Bulk
  const onBulk = (action: "approve" | "reject" | "suspend" | "delete") => {
    if (selected.length === 0) {
      alert("Sélection vide.");
      return;
    }
    if (action === "reject" || action === "suspend" || action === "delete") {
      setReasonOpen({
        type: action === "reject" ? "reject" : action === "suspend" ? "suspend" : "delete",
        ids: selected,
      });
      setReasonText("");
      return;
    }
    Promise.all(
      selected.map((id) =>
        updateDoc(doc(db, "users", id), {
          validationStatus: "validated",
          isValidated: true,
          updatedAt: new Date(),
        })
      )
    )
      .then(async () => {
        setSelected([]);
        alert(t("successUpdate"));
      })
      .catch(() => alert(t("errorUpdate")));
  };

  // Export page
  const exportPage = () => {
    if (rows.length === 0) {
      alert(t("noneBody"));
      return;
    }
    const csv = rows.map((l) => ({
      ID: l.id,
      FirstName: l.firstName,
      LastName: l.lastName,
      Email: l.email,
      EmailVerified: l.emailVerified ? "Yes" : "No",
      Phone: l.phone ?? "",
      Country: l.country ?? "",
      City: l.city ?? "",
      BarId: l.barId ?? "",
      BarCountry: l.barCountry ?? "",
      Languages: (l.languages || []).join("|"),
      Specialties: (l.specialties || []).join("|"),
      Rating: l.rating ?? "",
      Reviews: l.reviewsCount ?? "",
      SignedUpAt: l.createdAt.toISOString(),
      LastLoginAt: l.lastLoginAt?.toISOString() ?? "",
      AccountStatus: l.status,
      ValidationStatus: l.validationStatus,
      IsValidated: l.isValidated ? "Yes" : "No",
      KycStatus: l.kycStatus,
      KycProvider: l.kycProvider ?? "",
    }));
    const headers = Object.keys(csv[0]).join(";");
    const rowsStr = csv.map((r) => Object.values(r).join(";")).join("\n");
    const blob = new Blob([`${headers}\n${rowsStr}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lawyers_page_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export all (filters) — cap 5000
  const exportAll = async () => {
    try {
      alert(t("exportAllRunning"));
      const base = collection(db, "users") as CollectionReference<DocumentData>;
      const constraintsBase: QueryConstraint[] = [
        where("role", "==", "lawyer"),
        orderBy("createdAt", sortDir),
      ];

      if (filters.status !== "all")
        constraintsBase.splice(1, 0, where("status", "==", filters.status));
      if (filters.emailVerified !== "all")
        constraintsBase.splice(
          1,
          0,
          where("emailVerified", "==", filters.emailVerified === "verified")
        );
      if (filters.country !== "all" && filters.country.trim() !== "")
        constraintsBase.splice(1, 0, where("country", "==", filters.country.trim()));
      if (filters.validation !== "all")
        constraintsBase.splice(1, 0, where("isValidated", "==", filters.validation === "validated"));
      if (filters.kyc !== "all")
        constraintsBase.splice(1, 0, where("kycStatus", "==", filters.kyc));

      const now = new Date();
      let from: Date | null = null;
      if (filters.quickRange === "today")
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filters.quickRange === "week") {
        const d = now.getDay();
        const diff = now.getDate() - d + (d === 0 ? -6 : 1);
        from = new Date(now.setDate(diff));
        from.setHours(0, 0, 0, 0);
      }
      if (filters.quickRange === "month")
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      if (from) constraintsBase.splice(1, 0, where("createdAt", ">=", Timestamp.fromDate(from)));
      if (filters.from)
        constraintsBase.splice(
          1,
          0,
          where("createdAt", ">=", Timestamp.fromDate(new Date(filters.from + "T00:00:00")))
        );
      if (filters.to)
        constraintsBase.splice(
          1,
          0,
          where("createdAt", "<=", Timestamp.fromDate(new Date(filters.to + "T23:59:59.999")))
        );

      const all: Lawyer[] = [];
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
      const cap = 5000;
      while (all.length < cap) {
        const q: FSQuery<DocumentData> = cursor
          ? fsQuery(base, ...constraintsBase, limit(500), startAfter(cursor))
          : fsQuery(base, ...constraintsBase, limit(500));
        const snap = await getDocs(q);
        if (snap.empty) break;

        let chunk: Lawyer[] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const v = d.data() as FirestoreLawyerDoc;
          return {
            id: d.id,
            email: v.email ?? "",
            firstName: v.firstName ?? "",
            lastName: v.lastName ?? "",
            phone: v.phone ?? "",
            country: v.country ?? "",
            city: v.city ?? "",
            status: (v.status ?? "active") as UserStatus,
            createdAt: v.createdAt ? v.createdAt.toDate() : new Date(),
            lastLoginAt: v.lastLoginAt ? v.lastLoginAt.toDate() : undefined,
            emailVerified: !!v.emailVerified,
            barId: v.barId,
            barCountry: v.barCountry,
            isValidated: !!v.isValidated,
            validationStatus: v.validationStatus ?? "pending",
            validationReason: v.validationReason,
            kycStatus: v.kycStatus ?? "pending",
            kycProvider: v.kycProvider,
            kycStripeAccountId: v.kycStripeAccountId,
            kycLastSyncAt: v.kycLastSyncAt ? v.kycLastSyncAt.toDate() : undefined,
            specialties: Array.isArray(v.specialties) ? v.specialties : [],
            languages: Array.isArray(v.languages) ? v.languages : [],
            rating: typeof v.rating === "number" ? v.rating : undefined,
            reviewsCount: typeof v.reviewsCount === "number" ? v.reviewsCount : undefined,
          };
        });

        const hasTerm2 = filters.searchTerm.trim();
        const hasSpec2 = filters.specialties.trim();
        const hasLang2 = filters.langs.trim();
        const hasBar2 = filters.barId.trim();
        if (hasTerm2 || hasSpec2 || hasLang2 || hasBar2) {
          const term = filters.searchTerm.trim().toLowerCase();
          chunk = chunk.filter((l) => {
            const okTerm =
              !hasTerm2 ||
              `${l.firstName} ${l.lastName}`.toLowerCase().includes(term) ||
              l.email.toLowerCase().includes(term) ||
              (l.barId || "").toLowerCase().includes(term) ||
              (l.phone || "").toLowerCase().includes(term);
            const okSpec =
              !hasSpec2 ||
              (l.specialties || [])
                .join(" ")
                .toLowerCase()
                .includes(filters.specialties.trim().toLowerCase());
            const okLang =
              !hasLang2 ||
              (l.languages || [])
                .join(" ")
                .toLowerCase()
                .includes(filters.langs.trim().toLowerCase());
            const okBar =
              !hasBar2 ||
              (l.barId || "").toLowerCase().includes(filters.barId.trim().toLowerCase());
            return okTerm && okSpec && okLang && okBar;
          });
        }

        all.push(...chunk);
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < 500) break;
      }

      if (all.length >= cap) alert(t("exportAllCap"));
      if (all.length === 0) {
        alert(t("noneBody"));
        return;
      }

      const csv = all.map((l) => ({
        ID: l.id,
        FirstName: l.firstName,
        LastName: l.lastName,
        Email: l.email,
        EmailVerified: l.emailVerified ? "Yes" : "No",
        Phone: l.phone ?? "",
        Country: l.country ?? "",
        City: l.city ?? "",
        BarId: l.barId ?? "",
        BarCountry: l.barCountry ?? "",
        Languages: (l.languages || []).join("|"),
        Specialties: (l.specialties || []).join("|"),
        Rating: l.rating ?? "",
        Reviews: l.reviewsCount ?? "",
        SignedUpAt: l.createdAt.toISOString(),
        LastLoginAt: l.lastLoginAt?.toISOString() ?? "",
        AccountStatus: l.status,
        ValidationStatus: l.validationStatus,
        IsValidated: l.isValidated ? "Yes" : "No",
        KycStatus: l.kycStatus,
        KycProvider: l.kycProvider ?? "",
      }));
      const headers = Object.keys(csv[0]).join(";");
      const rowsStr = csv.map((r) => Object.values(r).join(";")).join("\n");
      const blob = new Blob([`${headers}\n${rowsStr}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lawyers_all_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert(t("exportAllDone"));
    } catch (e) {
      console.error("Export all error", e);
      alert(t("errorUpdate"));
    }
  };

  /* ---------- Column DnD + Resize handlers ---------- */
  const onDragStartHeader = (
    e: React.DragEvent<HTMLTableCellElement>,
    id: ColId
  ) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropHeader = (e: React.DragEvent<HTMLTableCellElement>, targetId: ColId) => {
    e.preventDefault();
    const src = e.dataTransfer.getData("text/plain") as ColId;
    if (!src || src === targetId) return;
    const cur = [...order];
    const fromIdx = cur.indexOf(src);
    const toIdx = cur.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    cur.splice(fromIdx, 1);
    cur.splice(toIdx, 0, src);
    setOrder(cur);
  };
  const onDragOverHeader = (e: React.DragEvent) => e.preventDefault();

  const onResizeStart = (
    id: ColId | "select" | "actions",
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { id, startX: e.clientX, startW: widths[id] || 160 };
    window.addEventListener("mousemove", onResizing);
    window.addEventListener("mouseup", onResizeEnd);
  };
  const onResizing = (e: MouseEvent) => {
    const r = resizingRef.current;
    if (!r) return;
    const delta = e.clientX - r.startX;
    const next = Math.max(80, r.startW + delta); // min 80px
    setWidths((w) => ({ ...w, [r.id]: next }));
  };
  const onResizeEnd = () => {
    resizingRef.current = null;
    window.removeEventListener("mousemove", onResizing);
    window.removeEventListener("mouseup", onResizeEnd);
  };

  /* ---------- Cell renderers ---------- */
  const cellStyleFor = (col: ColId): React.CSSProperties => ({
    width: widths[col],
    maxWidth: widths[col],
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const renderCell = (col: ColId, l: Lawyer) => {
    switch (col) {
      case "name":
        return (
          <div style={cellStyleFor(col)} className="text-sm font-medium text-gray-900 truncate">
            {l.firstName} {l.lastName}
          </div>
        );
      case "email":
        return <div style={cellStyleFor(col)} className="text-sm truncate">{l.email}</div>;
      case "emailVerified":
        return (
          <div style={cellStyleFor(col)}>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                l.emailVerified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {l.emailVerified ? t("verified") : t("unverified")}
            </span>
          </div>
        );
      case "phone":
        return <div style={cellStyleFor(col)} className="text-sm truncate">{l.phone || "—"}</div>;
      case "country":
        return <div style={cellStyleFor(col)} className="text-sm truncate">{l.country || "—"}</div>;
      case "city":
        return <div style={cellStyleFor(col)} className="text-sm truncate">{l.city || "—"}</div>;
      case "barId":
        return <div style={cellStyleFor(col)} className="text-sm truncate">{l.barId || "—"}</div>;
      case "barCountry":
        return (
          <div style={cellStyleFor(col)} className="text-sm truncate">
            {l.barCountry || "—"}
          </div>
        );
      case "languages":
        return (
          <div style={cellStyleFor(col)} className="text-sm truncate flex items-center gap-2">
            <LanguagesIcon className="w-4 h-4 text-gray-400" />
            {(l.languages || []).join(", ") || "—"}
          </div>
        );
      case "specialties":
        return (
          <div style={cellStyleFor(col)} className="text-sm truncate">
            {(l.specialties || []).join(", ") || "—"}
          </div>
        );
      case "rating":
        return (
          <div style={cellStyleFor(col)} className="text-sm">
            {typeof l.rating === "number" ? l.rating.toFixed(1) : "—"}
          </div>
        );
      case "reviews":
        return <div style={cellStyleFor(col)} className="text-sm">{l.reviewsCount ?? 0}</div>;
      case "signup":
        return (
          <div style={cellStyleFor(col)} className="text-sm">
            {l.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </div>
        );
      case "lastLogin":
        return (
          <div style={cellStyleFor(col)} className="text-sm">
            {l.lastLoginAt ? l.lastLoginAt.toLocaleDateString() : "—"}
          </div>
        );
      case "accountStatus":
        return (
          <div style={cellStyleFor(col)}>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                l.status === "active"
                  ? "bg-green-100 text-green-800"
                  : l.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : l.status === "suspended"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {l.status}
            </span>
          </div>
        );
      case "validation":
        return (
          <div style={cellStyleFor(col)} className="flex items-center gap-2">
            <BadgeCheck className={`w-4 h-4 ${l.isValidated ? "text-green-600" : "text-gray-400"}`} />
            <span className="text-sm">{l.isValidated ? t("validated") : t("notValidated")}</span>
          </div>
        );
      case "kyc":
        return (
          <div style={cellStyleFor(col)} className="text-sm">
            {l.kycStatus} {l.kycProvider === "stripe" ? `• ${t("syncedStripe")}` : ""}
          </div>
        );
      default:
        return null;
    }
  };

  const headerLabel = (id: ColId) => {
    switch (id) {
      case "name":
        return t("tableName");
      case "email":
        return t("tableEmail");
      case "emailVerified":
        return t("tableEmailVerif");
      case "phone":
        return t("tablePhone");
      case "country":
        return t("tableCountry");
      case "city":
        return t("tableCity");
      case "barId":
        return t("tableBarId");
      case "barCountry":
        return t("tableBarCountry");
      case "languages":
        return t("tableLanguages");
      case "specialties":
        return t("tableSpecialties");
      case "rating":
        return t("tableRating");
      case "reviews":
        return t("tableReviews");
      case "signup":
        return t("tableSignup");
      case "lastLogin":
        return t("tableLastLogin");
      case "accountStatus":
        return t("tableAccount");
      case "validation":
        return t("tableValidation");
      case "kyc":
        return t("tableKyc");
    }
  };

  const visibleOrder = order.filter((c) => visible[c]);

  // Style commun pour la "barre de redimensionnement" (trait visible)
  const Resizer = ({
    onMouseDown,
  }: {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  }) => (
    <div
      onMouseDown={onMouseDown}
      className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-gray-300 hover:bg-blue-400"
      style={{ userSelect: "none" }}
      aria-hidden
    />
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" /> {t("title")}
            </h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>

          <div className="flex items-center gap-2 relative">
            <a
              href="/admin/validation-avocats"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              <LinkIcon className="w-4 h-4" />
              {t("openValidation")}
            </a>

            <div className="relative">
              <Button variant="secondary" onClick={() => setShowColsPanel((s) => !s)}>
                {t("columns")}
              </Button>
              {showColsPanel && (
                <div
                  className="absolute right-0 mt-2 z-20 w-64 bg-white border rounded-lg shadow-lg p-2"
                  onMouseLeave={() => setShowColsPanel(false)}
                >
                  <div className="flex items-center justify-between px-2 pb-2 border-b">
                    <button
                      className="text-xs underline"
                      onClick={() =>
                        setVisible((v) => {
                          const all: Record<ColId, boolean> = { ...v };
                          (Object.keys(all) as ColId[]).forEach((k) => (all[k] = true));
                          return all;
                        })
                      }
                    >
                      {t("showAll")}
                    </button>
                    <button
                      className="text-xs underline"
                      onClick={() =>
                        setVisible((v) => {
                          const none: Record<ColId, boolean> = { ...v };
                          (Object.keys(none) as ColId[]).forEach((k) => (none[k] = false));
                          return none;
                        })
                      }
                    >
                      {t("hideAll")}
                    </button>
                    <button className="text-xs underline" onClick={resetLayout}>
                      {t("resetLayout")}
                    </button>
                  </div>
                  <div className="max-h-72 overflow-auto pt-2">
                    {DEFAULT_ORDER.map((c) => (
                      <label key={c} className="flex items-center gap-2 px-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={visible[c]}
                          onChange={(e) =>
                            setVisible((v) => ({ ...v, [c]: e.target.checked }))
                          }
                        />
                        <span>{headerLabel(c)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button variant="secondary" onClick={resetLayout}>
              {t("resetLayout")}
            </Button>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>

            <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}>
              <Filter className="w-4 h-4 mr-2" />
              {t("filters")}
            </Button>

            <Button variant="secondary" onClick={exportAll}>
              <Download className="w-4 h-4 mr-2" />
              {t("exportAll")}
            </Button>

            <Button onClick={exportPage}>
              <Download className="w-4 h-4 mr-2" />
              {t("export")}
            </Button>
          </div>
        </div>

        {/* Cards synthèse */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("totalExact")}</h3>
                <p className="text-2xl font-bold text-gray-900">{totalExact ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BadgeCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("validated")}</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {rows.filter((r) => r.isValidated).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileCheck2 className="w-6 h-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("kyc")}</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {rows.filter((r) => r.kycStatus !== "verified").length} / {rows.length}
                </p>
              </div>
            </div>
          </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("pending")}</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {rows.filter((r) => r.status === "pending").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("search")}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    placeholder={t("search")}
                    className="w-full pl-9 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("status")}
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as FilterOptions["status"] })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="active">{t("active")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="blocked">{t("blocked")}</option>
                  <option value="suspended">{t("suspended")}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("validationStatus")}
                </label>
                <select
                  value={filters.validation}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      validation: e.target.value as FilterOptions["validation"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="validated">{t("validated")}</option>
                  <option value="notValidated">{t("notValidated")}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("kyc")}</label>
                <select
                  value={filters.kyc}
                  onChange={(e) =>
                    setFilters({ ...filters, kyc: e.target.value as FilterOptions["kyc"] })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="pending">{t("kycPending")}</option>
                  <option value="verified">{t("kycVerified")}</option>
                  <option value="rejected">{t("kycRejected")}</option>
                  <option value="requested">{t("kycRequested")}</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("emailVerified")}
                </label>
                <select
                  value={filters.emailVerified}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      emailVerified: e.target.value as FilterOptions["emailVerified"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="verified">{t("verified")}</option>
                  <option value="unverified">{t("unverified")}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("country")}
                </label>
                <input
                  type="text"
                  value={filters.country === "all" ? "" : filters.country}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      country: (e.target.value || "all") as FilterOptions["country"],
                    })
                  }
                  placeholder="FR, MA, SN…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("specialties")}
                </label>
                <input
                  type="text"
                  value={filters.specialties}
                  onChange={(e) => setFilters({ ...filters, specialties: e.target.value })}
                  placeholder="Ex: droit fiscal, pénal…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("languages")}
                </label>
                <input
                  type="text"
                  value={filters.langs}
                  onChange={(e) => setFilters({ ...filters, langs: e.target.value })}
                  placeholder="fr, en, ar…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("barId")}
                </label>
                <input
                  type="text"
                  value={filters.barId}
                  onChange={(e) => setFilters({ ...filters, barId: e.target.value })}
                  placeholder="N° barreau"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Dates */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("quick")}
                </label>
                <select
                  value={filters.quickRange}
                  onChange={(e) =>
                    setFilters({ ...filters, quickRange: e.target.value as FilterOptions["quickRange"] })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">{t("all")}</option>
                  <option value="today">{t("today")}</option>
                  <option value="week">{t("week")}</option>
                  <option value="month">{t("month")}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("dateFrom")}</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("dateTo")}</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Tri */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tableSignup")}
                </label>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSortDir("asc")}>
                    {t("sortAsc")}
                  </Button>
                  <Button variant="secondary" onClick={() => setSortDir("desc")}>
                    {t("sortDesc")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions de masse */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={selected.length === 0} onClick={() => onBulk("approve")}>
            {t("bulkApprove")} ({selected.length} {t("selected")})
          </Button>
          <Button variant="secondary" disabled={selected.length === 0} onClick={() => onBulk("reject")}>
            {t("bulkReject")} ({selected.length} {t("selected")})
          </Button>
          <Button variant="secondary" disabled={selected.length === 0} onClick={() => onBulk("suspend")}>
            {t("bulkSuspend")} ({selected.length} {t("selected")})
          </Button>
          <Button variant="outline" disabled={selected.length === 0} onClick={() => onBulk("delete")}>
            <Trash2 className="w-4 h-4 mr-2 text-red-600" />
            {t("bulkDelete")} ({selected.length} {t("selected")})
          </Button>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">{t("loading")}</div>
            ) : errorMsg ? (
              <div className="p-6 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
                <Button size="small" variant="secondary" onClick={loadPage} className="ml-2">
                  {t("retry")}
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t("noneTitle")}</h3>
                <p className="mt-1 text-sm text-gray-500">{t("noneBody")}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 select-none">
                  <tr>
                    {/* Select column (fixed left) */}
                    <th
                      className="px-4 py-3 text-left relative"
                      style={{ width: widths.select }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.length === rows.length && rows.length > 0}
                        onChange={(e) =>
                          setSelected(e.target.checked ? rows.map((r) => r.id) : [])
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Resizer onMouseDown={(e) => onResizeStart("select", e)} />
                    </th>

                    {/* Dynamic columns with DnD + resize */}
                    {visibleOrder.map((id) => (
                      <th
                        key={id}
                        draggable
                        onDragStart={(e) => onDragStartHeader(e, id)}
                        onDragOver={onDragOverHeader}
                        onDrop={(e) => onDropHeader(e, id)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                        style={{ width: widths[id] }}
                        title=""
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          {headerLabel(id)}
                        </div>
                        <Resizer onMouseDown={(e) => onResizeStart(id, e)} />
                      </th>
                    ))}

                    {/* Actions (fixed right) */}
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                      style={{ width: widths.actions }}
                    >
                      {t("tableActions")}
                      <Resizer onMouseDown={(e) => onResizeStart("actions", e)} />
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-100">
                  {rows.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      {/* select */}
                      <td className="px-4 py-4 whitespace-nowrap" style={{ width: widths.select }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(l.id)}
                          onChange={() => toggleSelect(l.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* dynamic cells */}
                      {visibleOrder.map((id) => (
                        <td
                          key={id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          style={{ width: widths[id] }}
                        >
                          {renderCell(id, l)}
                        </td>
                      ))}

                      {/* actions */}
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        style={{ width: widths.actions }}
                      >
                        <div className="relative inline-flex items-center justify-end gap-2">
                          {/* Validation */}
                          {!l.isValidated ? (
                            <>
                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() => setValidation(l.id, "validated")}
                              >
                                {t("approve")}
                              </Button>
                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() => {
                                  setReasonOpen({ type: "reject", ids: [l.id] });
                                  setReasonText("");
                                }}
                              >
                                {t("reject")}
                              </Button>
                            </>
                          ) : null}

                          {/* KYC */}
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              setReasonOpen({ type: "kycRequest", ids: [l.id] });
                              setReasonText("");
                            }}
                          >
                            {t("requestKyc")}
                          </Button>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setKyc(l.id, "verified")}
                            disabled={l.kycProvider === "stripe"}
                          >
                            {t("setKycVerified")}
                          </Button>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setKyc(l.id, "rejected")}
                            disabled={l.kycProvider === "stripe"}
                          >
                            {t("setKycRejected")}
                          </Button>

                          {/* Statut compte */}
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setStatus(l.id, "active")}
                          >
                            {t("activate")}
                          </Button>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              setReasonOpen({ type: "suspend", ids: [l.id] });
                              setReasonText("");
                            }}
                          >
                            {t("suspend")}
                          </Button>

                          {/* Delete */}
                          <Button
                            size="small"
                            variant="outline"
                            onClick={() => {
                              setReasonOpen({ type: "delete", ids: [l.id] });
                              setReasonText("");
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>

                          {/* Menu 3 points */}
                          <button
                            className="p-2 rounded hover:bg-gray-100"
                            onClick={() => setOpenMenuId((cur) => (cur === l.id ? null : l.id))}
                            aria-label="More"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>

                          {openMenuId === l.id && (
                            <div
                              className="absolute right-0 top-9 z-10 w-56 bg-white border rounded-lg shadow-lg py-1"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <a
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                href={`/admin/validation-avocats?lawyerId=${l.id}`}
                                onClick={() => setOpenMenuId(null)}
                              >
                                <LinkIcon className="w-4 h-4" /> {t("openValidation")}
                              </a>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(l.email);
                                  alert(t("copied"));
                                  setOpenMenuId(null);
                                }}
                              >
                                <ClipboardCopy className="w-4 h-4" /> {t("copyEmail")}
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(l.id);
                                  alert(t("copied"));
                                  setOpenMenuId(null);
                                }}
                              >
                                <ClipboardCopy className="w-4 h-4" /> {t("copyId")}
                              </button>
                              <a
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                href={`mailto:${l.email}`}
                                onClick={() => setOpenMenuId(null)}
                              >
                                <ExternalLink className="w-4 h-4" /> {t("contact")}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer pagination */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">{t("rowsPerPage")}</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <label className="ml-4 text-sm text-gray-600">{t("page")}</label>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                  disabled={pageIndex === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  {pageIndex} {t("of")} {hasNext ? "…" : pageIndex}
                </span>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setPageIndex((p) => (hasNext ? p + 1 : p))}
                  disabled={!hasNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              {t("totalExact")}: {totalExact ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Modales raison */}
      <Modal
        isOpen={!!reasonOpen}
        onClose={() => setReasonOpen(null)}
        title={
          reasonOpen?.type === "suspend"
            ? t("reasonTitleSuspend")
            : reasonOpen?.type === "delete"
            ? t("reasonTitleDelete")
            : reasonOpen?.type === "reject"
            ? t("reasonTitleReject")
            : t("reasonTitleKycRequest")
        }
      >
        <div className="space-y-3">
          {reasonOpen?.type !== "kycRequest" ? (
            <>
              <label className="text-sm text-gray-700">{t("reasonLabel")}</label>
              <textarea
                className="w-full border rounded p-2"
                rows={4}
                value={reasonText}
                placeholder={t("reasonPlaceholder")}
                onChange={(e) => setReasonText(e.target.value)}
              />
            </>
          ) : (
            <>
              <label className="text-sm text-gray-700">{t("optionalMessage")}</label>
              <textarea
                className="w-full border rounded p-2"
                rows={4}
                value={reasonText}
                placeholder={t("optionalMessage")}
                onChange={(e) => setReasonText(e.target.value)}
              />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReasonOpen(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant={reasonOpen?.type === "delete" ? "outline" : "secondary"}
              onClick={async () => {
                const ids = reasonOpen?.ids || [];
                const msg = reasonText.trim();
                if (reasonOpen?.type !== "kycRequest" && msg.length < 3) return;

                try {
                  if (reasonOpen?.type === "suspend") {
                    await Promise.all(
                      ids.map((id) =>
                        updateDoc(doc(db, "users", id), {
                          status: "suspended",
                          suspendedReason: msg,
                          suspendedAt: new Date(),
                          updatedAt: new Date(),
                        })
                      )
                    );
                  } else if (reasonOpen?.type === "delete") {
                    await Promise.all(ids.map((id) => deleteDoc(doc(db, "users", id))));
                  } else if (reasonOpen?.type === "reject") {
                    await Promise.all(
                      ids.map((id) =>
                        updateDoc(doc(db, "users", id), {
                          validationStatus: "rejected",
                          isValidated: false,
                          validationReason: msg,
                          updatedAt: new Date(),
                        })
                      )
                    );
                  } else if (reasonOpen?.type === "kycRequest") {
                    await Promise.all(
                      ids.map((id) =>
                        updateDoc(doc(db, "users", id), {
                          kycStatus: "requested",
                          kycMessage: msg || null,
                          updatedAt: new Date(),
                        })
                      )
                    );
                  }

                  setReasonOpen(null);
                  setReasonText("");
                  setSelected([]);
                  alert(t("successUpdate"));
                } catch (e) {
                  console.error("Reason action error", e);
                  alert(t("errorUpdate"));
                }
              }}
            >
              {t("confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminLawyers;
