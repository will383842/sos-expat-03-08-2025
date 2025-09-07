// src/pages/admin/AdminClients.tsx
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
} from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MoreVertical,
  Download,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

/* ---------------------- i18n léger (aligné AdminReviews) ---------------------- */
type Lang = "fr" | "en";
const detectLang = (): Lang => {
  const ls = (localStorage.getItem("admin_lang") || "").toLowerCase();
  if (ls === "fr" || ls === "en") return ls as Lang;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
};
const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    title: "Clients",
    subtitle: "Gestion des clients",
    search: "Nom, email…",
    filters: "Filtres",
    export: "Exporter CSV",
    exportAll: "Exporter (tous filtres)",
    totalExact: "Total (exact)",
    active: "Actifs",
    suspended: "Suspendus",
    pending: "En attente",
    newThisMonth: "Nouveaux (mois)",
    status: "Statut",
    all: "Tous",
    blocked: "Bloqué",
    emailVerified: "Email vérifié",
    verified: "Vérifié",
    unverified: "Non vérifié",
    period: "Période d'inscription",
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    country: "Pays",
    tableClient: "Client",
    tableContact: "Contact",
    tableLocation: "Localisation",
    tableStatus: "Statut",
    tableActivity: "Activité",
    tableActions: "Actions",
    lastLogin: "Dernière connexion",
    callsSpend: "appels • €",
    activate: "Activer",
    suspend: "Suspendre",
    delete: "Supprimer",
    bulkActivate: "Activer",
    bulkSuspend: "Suspendre",
    bulkDelete: "Supprimer",
    selected: "sélectionné(s)",
    noneTitle: "Aucun client trouvé",
    noneBody: "Aucun client ne correspond aux critères de recherche.",
    loading: "Chargement…",
    rowsPerPage: "Lignes / page",
    page: "Page",
    of: "sur",
    confirmBulk: "Confirmer l'action",
    confirmDeleteOne: "Supprimer définitivement ce client ?",
    successUpdate: "Mise à jour réussie.",
    errorUpdate: "Erreur lors de la mise à jour.",
    retry: "Réessayer",
    signedUpOn: "Inscrit le",
    lang: "Langue",
    reasonTitleSuspend: "Raison de suspension",
    reasonTitleDelete: "Confirmer la suppression",
    reasonLabel: "Raison (obligatoire)",
    reasonPlaceholder: "Ex: Abus, fraude, demande RGPD…",
    cancel: "Annuler",
    confirm: "Confirmer",
    copied: "Copié ✅",
    exportAllRunning: "Export en cours…",
    exportAllDone: "Export terminé ✅",
    exportAllCap: "Limite atteinte (5000 lignes). Affinez vos filtres.",
    contact: "Contacter",
    copyEmail: "Copier email",
    copyId: "Copier ID",
  },
  en: {
    title: "Clients",
    subtitle: "Customer management",
    search: "Name, email…",
    filters: "Filters",
    export: "Export CSV",
    exportAll: "Export (all filters)",
    totalExact: "Total (exact)",
    active: "Active",
    suspended: "Suspended",
    pending: "Pending",
    newThisMonth: "New (month)",
    status: "Status",
    all: "All",
    blocked: "Blocked",
    emailVerified: "Email verified",
    verified: "Verified",
    unverified: "Unverified",
    period: "Sign-up period",
    today: "Today",
    week: "This week",
    month: "This month",
    country: "Country",
    tableClient: "Client",
    tableContact: "Contact",
    tableLocation: "Location",
    tableStatus: "Status",
    tableActivity: "Activity",
    tableActions: "Actions",
    lastLogin: "Last login",
    callsSpend: "calls • €",
    activate: "Activate",
    suspend: "Suspend",
    delete: "Delete",
    bulkActivate: "Activate",
    bulkSuspend: "Suspend",
    bulkDelete: "Delete",
    selected: "selected",
    noneTitle: "No clients found",
    noneBody: "No clients match your filters.",
    loading: "Loading…",
    rowsPerPage: "Rows / page",
    page: "Page",
    of: "of",
    confirmBulk: "Confirm action",
    confirmDeleteOne: "Permanently delete this client?",
    successUpdate: "Update successful.",
    errorUpdate: "Update failed.",
    retry: "Retry",
    signedUpOn: "Signed up on",
    lang: "Language",
    reasonTitleSuspend: "Suspension reason",
    reasonTitleDelete: "Confirm deletion",
    reasonLabel: "Reason (required)",
    reasonPlaceholder: "Eg: Abuse, fraud, GDPR request…",
    cancel: "Cancel",
    confirm: "Confirm",
    copied: "Copied ✅",
    exportAllRunning: "Export running…",
    exportAllDone: "Export finished ✅",
    exportAllCap: "Cap reached (5000 rows). Refine filters.",
    contact: "Contact",
    copyEmail: "Copy email",
    copyId: "Copy ID",
  },
};
const useI18n = () => {
  const [lang, setLang] = useState<Lang>(detectLang());
  useEffect(() => {
    localStorage.setItem("admin_lang", lang);
  }, [lang]);
  const t = useCallback(
    (k: keyof typeof STRINGS["fr"]) => STRINGS[lang][k] ?? (k as string),
    [lang]
  );
  return { t, lang, setLang };
};
/* ----------------------------------------------------------------------------- */

type ClientStatus = "active" | "pending" | "blocked" | "suspended";

type Client = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  status: ClientStatus;
  createdAt: Date;
  lastLoginAt?: Date;
  callsCount: number;
  totalSpent: number;
  emailVerified: boolean;
  phoneVerified?: boolean;
};

type FilterOptions = {
  status: "all" | ClientStatus;
  country: "all" | string;
  emailVerified: "all" | "verified" | "unverified";
  dateRange: "all" | "today" | "week" | "month";
  searchTerm: string;
};

type FirestoreClientDoc = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  status?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  callsCount?: number;
  totalSpent?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  suspendedReason?: string;
  suspendedAt?: Timestamp;
};

const AdminClients: React.FC = () => {
  const { t, lang, setLang } = useI18n();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    country: "all",
    emailVerified: "all",
    dateRange: "all",
    searchTerm: "",
  });

  // ✅ Pagination à curseur & compteur exact
  const [pageSize, setPageSize] = useState<number>(
    Number(localStorage.getItem("admin.clients.pageSize")) || 25
  );
  const [pageIndex, setPageIndex] = useState<number>(1);
  const pageCursors = useRef<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({
    1: null,
  });
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [totalExact, setTotalExact] = useState<number | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    localStorage.setItem("admin.clients.pageSize", String(pageSize));
  }, [pageSize]);

  const calculateStats = useCallback((rows: Client[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setStats({
      total: rows.length,
      active: rows.filter((c: Client) => c.status === "active").length,
      suspended: rows.filter((c: Client) => c.status === "suspended").length,
      pending: rows.filter((c: Client) => c.status === "pending").length,
      thisMonth: rows.filter((c: Client) => c.createdAt >= startOfMonth).length,
    });
  }, []);

  // 🔎 Compteur exact côté serveur (indépendant de la pagination)
  const fetchExactCount = useCallback(async () => {
    try {
      const base = collection(db, "users") as CollectionReference<DocumentData>;
      const constraints: QueryConstraint[] = [where("role", "==", "client")];

      if (filters.status !== "all") constraints.push(where("status", "==", filters.status));
      if (filters.emailVerified !== "all")
        constraints.push(where("emailVerified", "==", filters.emailVerified === "verified"));
      if (filters.country !== "all" && filters.country.trim() !== "")
        constraints.push(where("country", "==", filters.country.trim()));
      if (filters.dateRange !== "all") {
        const now = new Date();
        let cutoff = new Date(now);
        if (filters.dateRange === "today") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (filters.dateRange === "week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          cutoff = new Date(now.setDate(diff));
          cutoff.setHours(0, 0, 0, 0);
        }
        if (filters.dateRange === "month") cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        constraints.push(where("createdAt", ">=", Timestamp.fromDate(cutoff)));
      }

      const q: FSQuery<DocumentData> = fsQuery(base, ...constraints);
      const snap = await getCountFromServer(q);
      setTotalExact(snap.data().count);
    } catch (e: unknown) {
      console.error("[AdminClients] count error", e);
      setTotalExact(null);
    }
  }, [filters]);

  // ⏬ Chargement d’une page par curseur
  const loadPage = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const base = collection(db, "users") as CollectionReference<DocumentData>;
      const constraints: QueryConstraint[] = [
        where("role", "==", "client"),
        orderBy("createdAt", "desc"),
        limit(pageSize + 1),
      ];

      if (filters.status !== "all") constraints.splice(1, 0, where("status", "==", filters.status));
      if (filters.emailVerified !== "all")
        constraints.splice(1, 0, where("emailVerified", "==", filters.emailVerified === "verified"));
      if (filters.country !== "all" && filters.country.trim() !== "")
        constraints.splice(1, 0, where("country", "==", filters.country.trim()));
      if (filters.dateRange !== "all") {
        const now = new Date();
        let cutoff = new Date(now);
        if (filters.dateRange === "today") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (filters.dateRange === "week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          cutoff = new Date(now.setDate(diff));
          cutoff.setHours(0, 0, 0, 0);
        }
        if (filters.dateRange === "month") cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        constraints.splice(1, 0, where("createdAt", ">=", Timestamp.fromDate(cutoff)));
      }

      const cursor: QueryDocumentSnapshot<DocumentData> | null = pageCursors.current[pageIndex];
      const q: FSQuery<DocumentData> = cursor
        ? fsQuery(base, ...constraints, startAfter(cursor))
        : fsQuery(base, ...constraints);

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      const pageDocs = docs.slice(0, pageSize);
      setHasNext(docs.length > pageSize);
      pageCursors.current[pageIndex + 1] = docs.length > pageSize ? pageDocs[pageDocs.length - 1] : null;

      let rows: Client[] = pageDocs.map((d: QueryDocumentSnapshot<DocumentData>) => {
        const data = d.data() as FirestoreClientDoc;
        return {
          id: d.id,
          email: data.email ?? "",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
          country: data.country ?? "",
          city: data.city ?? "",
          status: (data.status ?? "active") as ClientStatus,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          lastLoginAt: data.lastLoginAt ? data.lastLoginAt.toDate() : undefined,
          callsCount: data.callsCount ?? 0,
          totalSpent: data.totalSpent ?? 0,
          emailVerified: !!data.emailVerified,
          phoneVerified: !!data.phoneVerified,
        };
      });

      // 🔍 Recherche locale (page courante)
      if (filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim().toLowerCase();
        rows = rows.filter(
          (c: Client) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            (c.phone || "").toLowerCase().includes(term)
        );
      }

      setClients(rows);
      calculateStats(rows);
    } catch (e: unknown) {
      console.error("[AdminClients] load error", e);
      setErrorMsg((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters, pageIndex, pageSize, calculateStats]);

  // Compteur exact quand les filtres changent
  useEffect(() => {
    fetchExactCount();
  }, [fetchExactCount]);

  // Reset curseurs quand filtres changent
  useEffect(() => {
    pageCursors.current = { 1: null };
    setPageIndex(1);
  }, [filters.status, filters.emailVerified, filters.country, filters.dateRange]);

  // (Re)chargement de la page
  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const toggleSelectClient = (id: string) => {
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --------- Modales raison ----------
  const [reasonOpen, setReasonOpen] = useState<null | { type: "suspend" | "delete"; ids: string[] }>(null);
  const [reasonText, setReasonText] = useState("");

  // --------- Actions ----------
  const updateClientStatus = async (clientId: string, newStatus: ClientStatus, reason?: string) => {
    try {
      const payload: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
      if (newStatus === "suspended") {
        payload.suspendedReason = reason || null;
        payload.suspendedAt = new Date();
      }
      await updateDoc(doc(db, "users", clientId), payload);
      setClients((prev) =>
        prev.map((c: Client) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
      alert(t("successUpdate"));
    } catch (error: unknown) {
      console.error("Erreur de mise à jour du statut:", error);
      alert(t("errorUpdate"));
    }
  };

  const handleBulkAction = async (action: "activer" | "suspendre" | "supprimer") => {
    if (selectedClients.length === 0) {
      alert("Veuillez sélectionner au moins un client.");
      return;
    }
    if (action === "suspendre" || action === "supprimer") {
      setReasonOpen({ type: action === "suspendre" ? "suspend" : "delete", ids: selectedClients });
      setReasonText("");
      return;
    }
    if (!confirm(`${t("confirmBulk")} "${action}" (${selectedClients.length}) ?`)) return;

    try {
      const jobs = selectedClients.map(async (clientId: string) =>
        updateDoc(doc(db, "users", clientId), {
          status: action === "activer" ? "active" : "suspended",
          updatedAt: new Date(),
        })
      );
      await Promise.all(jobs);
      setSelectedClients([]);
      await loadPage();
      alert(t("successUpdate"));
    } catch (error: unknown) {
      console.error("Erreur action en lot:", error);
      alert(t("errorUpdate"));
    }
  };

  const exportPageCsv = () => {
    if (clients.length === 0) {
      alert("Aucun client à exporter.");
      return;
    }
    const csvData = clients.map((c: Client) => ({
      ID: c.id,
      Email: c.email,
      FirstName: c.firstName,
      LastName: c.lastName,
      Phone: c.phone ?? "",
      Country: c.country ?? "",
      City: c.city ?? "",
      Status: c.status,
      SignedUpAt: c.createdAt.toISOString(),
      LastLoginAt: c.lastLoginAt?.toISOString() ?? "",
      CallsCount: c.callsCount,
      TotalSpent: c.totalSpent,
      EmailVerified: c.emailVerified ? "Yes" : "No",
    }));
    const headers = Object.keys(csvData[0]).join(";");
    const rows = csvData.map((r) => Object.values(r).join(";")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_page_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export ALL (selon filtres) — parcours toutes les pages (max 5000)
  const exportAllCsv = async () => {
    try {
      alert(t("exportAllRunning"));
      const base = collection(db, "users") as CollectionReference<DocumentData>;
      const constraintsBase: QueryConstraint[] = [where("role", "==", "client"), orderBy("createdAt", "desc")];

      if (filters.status !== "all") constraintsBase.splice(1, 0, where("status", "==", filters.status));
      if (filters.emailVerified !== "all")
        constraintsBase.splice(1, 0, where("emailVerified", "==", filters.emailVerified === "verified"));
      if (filters.country !== "all" && filters.country.trim() !== "")
        constraintsBase.splice(1, 0, where("country", "==", filters.country.trim()));
      if (filters.dateRange !== "all") {
        const now = new Date();
        let cutoff = new Date(now);
        if (filters.dateRange === "today") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (filters.dateRange === "week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          cutoff = new Date(now.setDate(diff));
          cutoff.setHours(0, 0, 0, 0);
        }
        if (filters.dateRange === "month") cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
        constraintsBase.splice(1, 0, where("createdAt", ">=", Timestamp.fromDate(cutoff)));
      }

      const all: Client[] = [];
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
      const cap = 5000;
      // boucle
      while (all.length < cap) {
        const q: FSQuery<DocumentData> = cursor
          ? fsQuery(base, ...constraintsBase, limit(500), startAfter(cursor))
          : fsQuery(base, ...constraintsBase, limit(500));
        const snap = await getDocs(q);
        if (snap.empty) break;
        const chunk: Client[] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const data = d.data() as FirestoreClientDoc;
          return {
            id: d.id,
            email: data.email ?? "",
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
            phone: data.phone ?? "",
            country: data.country ?? "",
            city: data.city ?? "",
            status: (data.status ?? "active") as ClientStatus,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            lastLoginAt: data.lastLoginAt ? data.lastLoginAt.toDate() : undefined,
            callsCount: data.callsCount ?? 0,
            totalSpent: data.totalSpent ?? 0,
            emailVerified: !!data.emailVerified,
            phoneVerified: !!data.phoneVerified,
          };
        });

        // Recherche locale optionnelle
        const filtered = filters.searchTerm.trim()
          ? chunk.filter((c: Client) => {
              const term = filters.searchTerm.trim().toLowerCase();
              return (
                `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
                c.email.toLowerCase().includes(term) ||
                (c.phone || "").toLowerCase().includes(term)
              );
            })
          : chunk;

        all.push(...filtered);
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < 500) break;
      }

      if (all.length >= cap) alert(t("exportAllCap"));
      if (all.length === 0) {
        alert(t("noneBody"));
        return;
      }

      const csvData = all.map((c: Client) => ({
        ID: c.id,
        Email: c.email,
        FirstName: c.firstName,
        LastName: c.lastName,
        Phone: c.phone ?? "",
        Country: c.country ?? "",
        City: c.city ?? "",
        Status: c.status,
        SignedUpAt: c.createdAt.toISOString(),
        LastLoginAt: c.lastLoginAt?.toISOString() ?? "",
        CallsCount: c.callsCount,
        TotalSpent: c.totalSpent,
        EmailVerified: c.emailVerified ? "Yes" : "No",
      }));
      const headers = Object.keys(csvData[0]).join(";");
      const rows = csvData.map((r) => Object.values(r).join(";")).join("\n");
      const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clients_all_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert(t("exportAllDone"));
    } catch (e: unknown) {
      console.error("Export all error", e);
      alert(t("errorUpdate"));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header (rendu dans la page pour éviter les props inconnues d'AdminLayout) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm"
              title={t("lang")}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>

            <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}>
              <Filter className="w-4 h-4 mr-2" />
              {t("filters")}
            </Button>

            <Button variant="secondary" onClick={exportAllCsv}>
              <Download className="w-4 h-4 mr-2" />
              {t("exportAll")}
            </Button>

            <Button onClick={exportPageCsv}>
              <Download className="w-4 h-4 mr-2" />
              {t("export")}
            </Button>
          </div>
        </div>

        {/* Stat cards */}
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
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("active")}</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("suspended")}</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t("newThisMonth")}</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("search")}</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("status")}</label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      status: e.target.value as FilterOptions["status"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t("all")}</option>
                  <option value="active">{t("active")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="blocked">{t("blocked")}</option>
                  <option value="suspended">{t("suspended")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("emailVerified")}</label>
                <select
                  value={filters.emailVerified}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      emailVerified: e.target.value as FilterOptions["emailVerified"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t("all")}</option>
                  <option value="verified">{t("verified")}</option>
                  <option value="unverified">{t("unverified")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t("period")}</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: e.target.value as FilterOptions["dateRange"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
                  type="text"
                  value={filters.country === "all" ? "" : filters.country}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      country: (e.target.value || "all") as FilterOptions["country"],
                    })
                  }
                  placeholder="FR, MA, SN…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bulk actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={selectedClients.length === 0}
            onClick={() => handleBulkAction("activer")}
          >
            {t("bulkActivate")} ({selectedClients.length} {t("selected")})
          </Button>
          <Button
            variant="secondary"
            disabled={selectedClients.length === 0}
            onClick={() => handleBulkAction("suspendre")}
          >
            {t("bulkSuspend")} ({selectedClients.length} {t("selected")})
          </Button>
          <Button
            variant="outline"
            disabled={selectedClients.length === 0}
            onClick={() => handleBulkAction("supprimer")}
          >
            <Trash2 className="w-4 h-4 mr-2 text-red-600" />
            {t("bulkDelete")} ({selectedClients.length} {t("selected")})
          </Button>
        </div>

        {/* Table */}
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
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t("noneTitle")}</h3>
                <p className="mt-1 text-sm text-gray-500">{t("noneBody")}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === clients.length && clients.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedClients(clients.map((c: Client) => c.id));
                          else setSelectedClients([]);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("tableClient")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("tableContact")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("tableLocation")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("tableStatus")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("tableActivity")}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("tableActions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {clients.map((client: Client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleSelectClient(client.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("signedUpOn")}{" "}
                          {client.createdAt.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Mail size={14} className="mr-2 text-gray-400" />
                            <span className={client.emailVerified ? "text-green-600" : "text-red-600"}>
                              {client.email} • {client.emailVerified ? t("verified") : t("unverified")}
                            </span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center">
                              <Phone size={14} className="mr-2 text-gray-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-2 text-gray-400" />
                          <span>{client.city ? `${client.city}, ` : ""}{client.country || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.status === "active"
                              ? "bg-green-100 text-green-800"
                              : client.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : client.status === "suspended"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-2 text-gray-400" />
                            <span>
                              {t("lastLogin")}:{" "}
                              {client.lastLoginAt
                                ? client.lastLoginAt.toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {client.callsCount} {t("callsSpend").split(" ")[0]} • {client.totalSpent.toFixed(2)} €
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="relative inline-flex items-center justify-end gap-2">
                          <Button size="small" variant="secondary" onClick={() => updateClientStatus(client.id, "active")}>
                            {t("activate")}
                          </Button>

                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              setReasonOpen({ type: "suspend", ids: [client.id] });
                              setReasonText("");
                            }}
                          >
                            {t("suspend")}
                          </Button>

                          <Button
                            size="small"
                            variant="outline"
                            onClick={() => {
                              setReasonOpen({ type: "delete", ids: [client.id] });
                              setReasonText("");
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>

                          {/* Menu 3 points */}
                          <button
                            className="p-2 rounded hover:bg-gray-100"
                            onClick={() => setOpenMenuId((cur) => (cur === client.id ? null : client.id))}
                            aria-label="More"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>

                          {openMenuId === client.id && (
                            <div
                              className="absolute right-0 top-9 z-10 w-48 bg-white border rounded-lg shadow-lg py-1"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(client.email);
                                  alert(t("copied"));
                                  setOpenMenuId(null);
                                }}
                              >
                                <ClipboardCopy className="w-4 h-4" /> {t("copyEmail")}
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(client.id);
                                  alert(t("copied"));
                                  setOpenMenuId(null);
                                }}
                              >
                                <ClipboardCopy className="w-4 h-4" /> {t("copyId")}
                              </button>
                              <a
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                href={`mailto:${client.email}`}
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

          {/* ✅ Footer de pagination à curseur + total exact */}
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

        {clients.length === 0 && !loading && !errorMsg && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t("noneTitle")}</h3>
            <p className="mt-1 text-sm text-gray-500">{t("noneBody")}</p>
          </div>
        )}
      </div>

      {/* Modale Raison (Suspend/Delete) */}
      <Modal
        isOpen={!!reasonOpen}
        onClose={() => setReasonOpen(null)}
        title={reasonOpen?.type === "suspend" ? t("reasonTitleSuspend") : t("reasonTitleDelete")}
      >
        <div className="space-y-3">
          <label className="text-sm text-gray-700">{t("reasonLabel")}</label>
          <textarea
            className="w-full border rounded p-2"
            rows={4}
            value={reasonText}
            placeholder={t("reasonPlaceholder")}
            onChange={(e) => setReasonText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReasonOpen(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant={reasonOpen?.type === "delete" ? "outline" : "secondary"}
              onClick={async () => {
                const ids = reasonOpen?.ids || [];
                const reason = reasonText.trim();
                if (reason.length < 3) return;

                try {
                  if (reasonOpen?.type === "suspend") {
                    // suspendre en lot
                    await Promise.all(
                      ids.map((id: string) =>
                        updateDoc(doc(db, "users", id), {
                          status: "suspended",
                          suspendedReason: reason,
                          suspendedAt: new Date(),
                          updatedAt: new Date(),
                        })
                      )
                    );
                  } else {
                    // supprimer en lot (hard delete)
                    await Promise.all(ids.map((id: string) => deleteDoc(doc(db, "users", id))));
                  }
                  setReasonOpen(null);
                  setReasonText("");
                  setSelectedClients([]);
                  await loadPage();
                  alert(t("successUpdate"));
                } catch (e: unknown) {
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

export default AdminClients;
