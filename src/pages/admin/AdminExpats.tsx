import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Fragment,
} from "react";
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
  Eye,
  EyeOff,
  BarChart,
  PieChart,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import AdminMapVisibilityToggle from "../../components/admin/AdminMapVisibilityToggle";
import { CSVLink } from "react-csv";
import { motion } from "framer-motion";

/* ---------------------- i18n ---------------------- */
type Lang = "fr" | "en";
const detectLang = (): Lang => {
  const ls = (localStorage.getItem("admin_lang") || "").toLowerCase();
  if (ls === "fr" || ls === "en") return ls as Lang;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
};
const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    title: "Expatriés",
    subtitle:
      "Gestion des expatriés (validation, statut, notation, carte, statistiques)",
    search: "Nom, email, pays…",
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
    status: "Statut",
    all: "Tous",
    blocked: "Bloqué",
    validationStatus: "Validation",
    period: "Période",
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    country: "Pays de résidence",
    originCountry: "Pays d'origine",
    helpDomains: "Domaines d'aide (contient)",
    languages: "Langues (contient)",
    minRating: "Note ≥",
    minYears: "Ancienneté sur place ≥",
    tableName: "Nom",
    tableEmail: "Email",
    tablePhone: "Téléphone",
    tableCountry: "Pays",
    tableCity: "Ville",
    tableOrigin: "Origine",
    tableLanguages: "Langues",
    tableHelpDomains: "Domaines d'aide",
    tableRating: "Note",
    tableReviews: "Avis",
    tableSignup: "Inscription",
    tableLastLogin: "Dernière connexion",
    tableYears: "Ancienneté",
    tableProfile: "Profil",
    tableMap: "Carte",
    tableAccount: "Compte",
    tableValidation: "Validation",
    tableActions: "Actions",
    approve: "Valider",
    reject: "Refuser",
    activate: "Activer",
    suspend: "Suspendre",
    delete: "Supprimer",
    openValidation: "Ouvrir validation",
    bulkApprove: "Valider",
    bulkReject: "Refuser",
    bulkSuspend: "Suspendre",
    bulkDelete: "Supprimer",
    selected: "sélectionné(s)",
    stats: "Statistiques",
    byCountry: "Par pays",
    byOrigin: "Par pays d'origine",
    byStatus: "Par statut",
    byValidation: "Par validation",
    map: "Carte des expatriés",
    noData: "Aucune donnée",
  },
  en: {
    title: "Expats",
    subtitle:
      "Manage expats (validation, status, rating, map, statistics)",
    search: "Name, email, country…",
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
    status: "Status",
    all: "All",
    blocked: "Blocked",
    validationStatus: "Validation",
    period: "Period",
    today: "Today",
    week: "This week",
    month: "This month",
    country: "Residence country",
    originCountry: "Origin country",
    helpDomains: "Help domains (contains)",
    languages: "Languages (contains)",
    minRating: "Rating ≥",
    minYears: "Years in country ≥",
    tableName: "Name",
    tableEmail: "Email",
    tablePhone: "Phone",
    tableCountry: "Country",
    tableCity: "City",
    tableOrigin: "Origin",
    tableLanguages: "Languages",
    tableHelpDomains: "Help domains",
    tableRating: "Rating",
    tableReviews: "Reviews",
    tableSignup: "Signup",
    tableLastLogin: "Last login",
    tableYears: "Seniority",
    tableProfile: "Profile",
    tableMap: "Map",
    tableAccount: "Account",
    tableValidation: "Validation",
    tableActions: "Actions",
    approve: "Approve",
    reject: "Reject",
    activate: "Activate",
    suspend: "Suspend",
    delete: "Delete",
    openValidation: "Open validation",
    bulkApprove: "Approve",
    bulkReject: "Reject",
    bulkSuspend: "Suspend",
    bulkDelete: "Delete",
    selected: "selected",
    stats: "Statistics",
    byCountry: "By country",
    byOrigin: "By origin country",
    byStatus: "By status",
    byValidation: "By validation",
    map: "Expats map",
    noData: "No data",
  },
};

/* ---------------------- Types ---------------------- */
export interface Expat {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  originCountry: string;
  languages: string[];
  helpDomains: string[];
  rating?: number;
  reviewsCount?: number;
  signupAt: Timestamp;
  lastLogin?: Timestamp;
  yearsInCountry?: number;
  profileUrl?: string;
  mapVisible?: boolean;
  accountStatus: "active" | "suspended" | "blocked" | "pending";
  validationStatus: "validated" | "not_validated" | "pending";
  serviceType: "expat_call";
}

/* ---------------------- Table Column Config ---------------------- */
type ColumnKey =
  | "name"
  | "email"
  | "phone"
  | "country"
  | "city"
  | "originCountry"
  | "languages"
  | "helpDomains"
  | "rating"
  | "reviews"
  | "signup"
  | "lastLogin"
  | "years"
  | "profile"
  | "map"
  | "account"
  | "validation"
  | "actions";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  width?: number;
}

const DEFAULT_COLUMNS = (t: Record<string, string>): ColumnConfig[] => [
  { key: "name", label: t.tableName, visible: true, width: 180 },
  { key: "email", label: t.tableEmail, visible: true, width: 220 },
  { key: "phone", label: t.tablePhone, visible: true, width: 140 },
  { key: "country", label: t.tableCountry, visible: true, width: 140 },
  { key: "city", label: t.tableCity, visible: true, width: 140 },
  { key: "originCountry", label: t.tableOrigin, visible: true, width: 140 },
  { key: "languages", label: t.tableLanguages, visible: true, width: 180 },
  { key: "helpDomains", label: t.tableHelpDomains, visible: true, width: 200 },
  { key: "rating", label: t.tableRating, visible: true, width: 100 },
  { key: "reviews", label: t.tableReviews, visible: true, width: 100 },
  { key: "signup", label: t.tableSignup, visible: true, width: 160 },
  { key: "lastLogin", label: t.tableLastLogin, visible: true, width: 160 },
  { key: "years", label: t.tableYears, visible: true, width: 100 },
  { key: "profile", label: t.tableProfile, visible: true, width: 100 },
  { key: "map", label: t.tableMap, visible: true, width: 100 },
  { key: "account", label: t.tableAccount, visible: true, width: 120 },
  { key: "validation", label: t.tableValidation, visible: true, width: 120 },
  { key: "actions", label: t.tableActions, visible: true, width: 140 },
];

/* ---------------------- Utils ---------------------- */
const formatDate = (ts?: Timestamp, lang: Lang = "fr") => {
  if (!ts) return "-";
  const date = ts.toDate();
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const truncate = (text: string, len = 30): string => {
  if (!text) return "";
  return text.length > len ? text.slice(0, len) + "…" : text;
};

/* ---------------------- Component ---------------------- */
const AdminExpats: React.FC = () => {
  const [lang, setLang] = useState<Lang>(detectLang());
  const t = STRINGS[lang];

  const [expats, setExpats] = useState<Expat[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<
    QueryDocumentSnapshot<DocumentData> | null
  >(null);
  const [hasMore, setHasMore] = useState(true);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS(t));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>("");

  const PAGE_SIZE = 50;

  /* ---------------------- Fetch Data ---------------------- */
  const fetchExpats = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        let q: FSQuery<DocumentData> = fsQuery(
          collection(db, "sos_profiles") as CollectionReference<DocumentData>,
          where("serviceType", "==", "expat_call"),
          orderBy("signupAt", "desc"),
          limit(PAGE_SIZE)
        );
        if (!reset && lastDoc) {
          q = fsQuery(q, startAfter(lastDoc));
        }
        const snap = await getDocs(q);
        const newExpats: Expat[] = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Expat, "id">) }) as Expat
        );
        setExpats((prev) => (reset ? newExpats : [...prev, ...newExpats]));
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching expats:", err);
      } finally {
        setLoading(false);
      }
    },
    [lastDoc]
  );

  useEffect(() => {
    fetchExpats(true);
  }, []);

  /* ---------------------- Selection ---------------------- */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const newSel = new Set(prev);
      if (newSel.has(id)) newSel.delete(id);
      else newSel.add(id);
      return newSel;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === expats.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(expats.map((e) => e.id)));
    }
  };

  /* ---------------------- Bulk Actions ---------------------- */
  const bulkAction = async (action: "approve" | "reject" | "suspend" | "delete") => {
    const ids = Array.from(selected);
    for (const id of ids) {
      const ref = doc(db, "sos_profiles", id);
      if (action === "delete") {
        await deleteDoc(ref);
      } else if (action === "approve") {
        await updateDoc(ref, { validationStatus: "validated" });
      } else if (action === "reject") {
        await updateDoc(ref, { validationStatus: "not_validated" });
      } else if (action === "suspend") {
        await updateDoc(ref, { accountStatus: "suspended" });
      }
    }
    fetchExpats(true);
    setSelected(new Set());
  };

  /* ---------------------- Column Management ---------------------- */
  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const showAllColumns = () =>
    setColumns((prev) => prev.map((c) => ({ ...c, visible: true })));

  const hideAllColumns = () =>
    setColumns((prev) => prev.map((c) => ({ ...c, visible: false })));
  /* ---------------------- Search Filter ---------------------- */
  const filteredExpats = expats.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      e.country.toLowerCase().includes(s) ||
      (e.city && e.city.toLowerCase().includes(s)) ||
      (e.originCountry && e.originCountry.toLowerCase().includes(s)) ||
      e.languages.some((l) => l.toLowerCase().includes(s)) ||
      e.helpDomains.some((h) => h.toLowerCase().includes(s))
    );
  });

  /* ---------------------- CSV Export ---------------------- */
  const csvData = filteredExpats.map((e) => ({
    Name: e.name,
    Email: e.email,
    Phone: e.phone || "",
    Country: e.country,
    City: e.city || "",
    Origin: e.originCountry,
    Languages: e.languages.join(", "),
    HelpDomains: e.helpDomains.join(", "),
    Rating: e.rating || "",
    Reviews: e.reviewsCount || "",
    Signup: formatDate(e.signupAt, lang),
    LastLogin: formatDate(e.lastLogin, lang),
    YearsInCountry: e.yearsInCountry || "",
    AccountStatus: e.accountStatus,
    ValidationStatus: e.validationStatus,
  }));

  /* ---------------------- Stats ---------------------- */
  const [stats, setStats] = useState<{
    total: number;
    byCountry: Record<string, number>;
    byOrigin: Record<string, number>;
    byStatus: Record<string, number>;
    byValidation: Record<string, number>;
  }>({
    total: 0,
    byCountry: {},
    byOrigin: {},
    byStatus: {},
    byValidation: {},
  });

  const fetchStats = useCallback(async () => {
    try {
      const baseRef = collection(db, "sos_profiles");
      const q = fsQuery(
        baseRef,
        where("serviceType", "==", "expat_call")
      );
      const snap = await getDocs(q);

      const byCountry: Record<string, number> = {};
      const byOrigin: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byValidation: Record<string, number> = {};

      snap.docs.forEach((d) => {
        const e = d.data() as Expat;
        byCountry[e.country] = (byCountry[e.country] || 0) + 1;
        byOrigin[e.originCountry] = (byOrigin[e.originCountry] || 0) + 1;
        byStatus[e.accountStatus] = (byStatus[e.accountStatus] || 0) + 1;
        byValidation[e.validationStatus] =
          (byValidation[e.validationStatus] || 0) + 1;
      });

      setStats({
        total: snap.size,
        byCountry,
        byOrigin,
        byStatus,
        byValidation,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ---------------------- Render Helpers ---------------------- */
  const renderStatus = (status: Expat["accountStatus"]) => {
    if (status === "active")
      return (
        <span className="text-green-600 flex items-center gap-1">
          <CheckCircle2 size={14} /> {t.active}
        </span>
      );
    if (status === "suspended")
      return (
        <span className="text-orange-600 flex items-center gap-1">
          <AlertCircle size={14} /> {t.suspended}
        </span>
      );
    if (status === "blocked")
      return (
        <span className="text-red-600 flex items-center gap-1">
          <XCircle size={14} /> {t.blocked}
        </span>
      );
    return (
      <span className="text-gray-500 flex items-center gap-1">
        <Clock size={14} /> {t.pending}
      </span>
    );
  };

  const renderValidation = (status: Expat["validationStatus"]) => {
    if (status === "validated")
      return (
        <span className="text-green-600 flex items-center gap-1">
          <BadgeCheck size={14} /> {t.validated}
        </span>
      );
    if (status === "not_validated")
      return (
        <span className="text-red-600 flex items-center gap-1">
          <XCircle size={14} /> {t.notValidated}
        </span>
      );
    return (
      <span className="text-gray-500 flex items-center gap-1">
        <Clock size={14} /> {t.pending}
      </span>
    );
  };

  /* ---------------------- UI ---------------------- */
  return (
    <AdminLayout title={t.title} subtitle={t.subtitle}>
      <div className="flex flex-col gap-4">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder={t.search}
              className="border rounded px-2 py-1 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={showAllColumns}
              className="text-xs"
            >
              {t.showAll}
            </Button>
            <Button
              variant="secondary"
              onClick={hideAllColumns}
              className="text-xs"
            >
              {t.hideAll}
            </Button>
            <CSVLink
              data={csvData}
              filename="expats.csv"
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs flex items-center gap-1"
            >
              <Download size={14} />
              {t.export}
            </CSVLink>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded bg-white shadow">
            <div className="text-gray-500 text-xs">{t.totalExact}</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </div>
          <div className="p-3 border rounded bg-white shadow">
            <div className="text-gray-500 text-xs">{t.byStatus}</div>
            <div className="flex flex-col text-sm">
              {Object.entries(stats.byStatus).map(([k, v]) => (
                <span key={k}>
                  {t[k as keyof typeof t] || k}: {v}
                </span>
              ))}
            </div>
          </div>
          <div className="p-3 border rounded bg-white shadow">
            <div className="text-gray-500 text-xs">{t.byValidation}</div>
            <div className="flex flex-col text-sm">
              {Object.entries(stats.byValidation).map(([k, v]) => (
                <span key={k}>
                  {t[k as keyof typeof t] || k}: {v}
                </span>
              ))}
            </div>
          </div>
          <div className="p-3 border rounded bg-white shadow">
            <div className="text-gray-500 text-xs">{t.byCountry}</div>
            <div className="flex flex-col text-sm max-h-24 overflow-auto">
              {Object.entries(stats.byCountry).map(([k, v]) => (
                <span key={k}>
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex gap-2 items-center bg-gray-100 p-2 rounded">
            <span className="text-sm">
              {selected.size} {t.selected}
            </span>
            <Button
              variant="success"
              size="sm"
              onClick={() => bulkAction("approve")}
            >
              {t.bulkApprove}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => bulkAction("reject")}
            >
              {t.bulkReject}
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={() => bulkAction("suspend")}
            >
              {t.bulkSuspend}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => bulkAction("delete")}
            >
              {t.bulkDelete}
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto border rounded bg-white shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selected.size === expats.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {columns
                  .filter((c) => c.visible)
                  .map((col) => (
                    <th
                      key={col.key}
                      className="px-2 py-1 text-left font-medium"
                      style={{ minWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpats.map((e) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggleSelect(e.id)}
                    />
                  </td>
                  {columns.filter((c) => c.visible).map((col) => {
                    if (col.key === "name")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {truncate(e.name, 30)}
                        </td>
                      );
                    if (col.key === "email")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {truncate(e.email, 40)}
                        </td>
                      );
                    if (col.key === "phone")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.phone || "-"}
                        </td>
                      );
                    if (col.key === "country")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.country}
                        </td>
                      );
                    if (col.key === "city")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.city || "-"}
                        </td>
                      );
                    if (col.key === "originCountry")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.originCountry}
                        </td>
                      );
                    if (col.key === "languages")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.languages.join(", ")}
                        </td>
                      );
                    if (col.key === "helpDomains")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.helpDomains.join(", ")}
                        </td>
                      );
                    if (col.key === "rating")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.rating?.toFixed(1) || "-"}
                        </td>
                      );
                    if (col.key === "reviews")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.reviewsCount || 0}
                        </td>
                      );
                    if (col.key === "signup")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {formatDate(e.signupAt, lang)}
                        </td>
                      );
                    if (col.key === "lastLogin")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {formatDate(e.lastLogin, lang)}
                        </td>
                      );
                    if (col.key === "years")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.yearsInCountry || "-"}
                        </td>
                      );
                    if (col.key === "profile")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {e.profileUrl ? (
                            <a
                              href={e.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 flex items-center gap-1"
                            >
                              <ExternalLink size={14} /> {t.tableProfile}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    if (col.key === "map")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          <AdminMapVisibilityToggle
                            id={e.id}
                            visible={e.mapVisible || false}
                          />
                        </td>
                      );
                    if (col.key === "account")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {renderStatus(e.accountStatus)}
                        </td>
                      );
                    if (col.key === "validation")
                      return (
                        <td key={col.key} className="px-2 py-1">
                          {renderValidation(e.validationStatus)}
                        </td>
                      );
                    if (col.key === "actions")
                      return (
                        <td
                          key={col.key}
                          className="px-2 py-1 flex gap-1 items-center"
                        >
                          <Button
                            variant="success"
                            size="xs"
                            onClick={() =>
                              updateDoc(doc(db, "sos_profiles", e.id), {
                                validationStatus: "validated",
                              })
                            }
                          >
                            {t.approve}
                          </Button>
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() =>
                              updateDoc(doc(db, "sos_profiles", e.id), {
                                validationStatus: "not_validated",
                              })
                            }
                          >
                            {t.reject}
                          </Button>
                        </td>
                      );
                    return <td key={col.key}>-</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <Button onClick={() => fetchExpats()} disabled={loading}>
              {loading ? "…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
