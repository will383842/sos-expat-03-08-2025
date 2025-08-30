import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tag,
  Search,
  Plus,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Save,
  Percent,
  Users,
} from "lucide-react";
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../utils/logging";

/* ===================== Types ===================== */

interface Coupon {
  id: string;
  code: string;
  type: "fixed" | "percentage";
  amount: number;
  min_order_amount: number;
  max_uses_total: number;
  max_uses_per_user: number;
  valid_from: Date;
  valid_until: Date;
  services: string[];
  active: boolean;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  description?: string;
}

interface CouponUsage {
  id: string;
  couponCode: string;
  userId: string;
  userName: string;
  orderId: string;
  order_amount: number;
  discount_amount: number;
  used_at: Date;
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalUsages: number;
  totalSavings: number;
}

type PossibleTimestamp = { toDate: () => Date };

const COUPONS_PER_PAGE = 10;

/* ===================== Utils ===================== */

function toDateSafe(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (
    typeof v === "object" &&
    v !== null &&
    "toDate" in (v as Record<string, unknown>) &&
    typeof (v as PossibleTimestamp).toDate === "function"
  ) {
    return (v as PossibleTimestamp).toDate();
  }
  return undefined;
}

/* ===================== Component ===================== */

const AdminPromoCodes: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponUsages, setCouponUsages] = useState<CouponUsage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingUsages, setIsLoadingUsages] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showUsageModal, setShowUsageModal] = useState<boolean>(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: "",
    type: "fixed",
    amount: 0,
    min_order_amount: 0,
    max_uses_total: 100,
    max_uses_per_user: 1,
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    services: ["lawyer_call", "expat_call"],
    active: true,
    description: "",
  });

  const [stats, setStats] = useState<CouponStats>({
    totalCoupons: 0,
    activeCoupons: 0,
    totalUsages: 0,
    totalSavings: 0,
  });

  /* ===================== Effects ===================== */

  // Reset pagination au changement de page dÃ©clenchÃ© manuellement
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/admin/login");
      return;
    }
    void loadCoupons();
  }, [currentUser, navigate, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger stats au mount et aprÃ¨s actions
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;
    void loadStats();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===================== Loaders ===================== */

  const loadStats = useCallback(async (): Promise<void> => {
    try {
      // Coupons
      const couponsSnap = await getDocs(collection(db, "coupons"));
      const allCoupons: Coupon[] = couponsSnap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          code: String(raw.code ?? ""),
          type:
            (raw.type as Coupon["type"]) && (raw.type === "percentage" || raw.type === "fixed")
              ? (raw.type as Coupon["type"])
              : "fixed",
          amount: typeof raw.amount === "number" ? raw.amount : 0,
          min_order_amount:
            typeof raw.min_order_amount === "number" ? raw.min_order_amount : 0,
          max_uses_total:
            typeof raw.max_uses_total === "number" ? raw.max_uses_total : 0,
          max_uses_per_user:
            typeof raw.max_uses_per_user === "number"
              ? raw.max_uses_per_user
              : 0,
          valid_from: toDateSafe(raw.valid_from) ?? new Date(),
          valid_until: toDateSafe(raw.valid_until) ?? new Date(),
          services: Array.isArray(raw.services)
            ? (raw.services as unknown[]).map(String)
            : [],
          active: Boolean(raw.active),
          created_at: toDateSafe(raw.created_at) ?? new Date(),
          created_by: String(raw.created_by ?? "admin"),
          updated_at: toDateSafe(raw.updated_at) ?? new Date(),
          description:
            typeof raw.description === "string" ? raw.description : undefined,
        };
      });

      // Usages
      const usagesSnap = await getDocs(collection(db, "coupon_usages"));
      const allUsages: CouponUsage[] = usagesSnap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          couponCode: String(raw.couponCode ?? ""),
          userId: String(raw.userId ?? ""),
          userName: String(raw.userName ?? ""),
          orderId: String(raw.orderId ?? ""),
          order_amount:
            typeof raw.order_amount === "number" ? raw.order_amount : 0,
          discount_amount:
            typeof raw.discount_amount === "number" ? raw.discount_amount : 0,
          used_at: toDateSafe(raw.used_at) ?? new Date(),
        };
      });

      const totalCoupons = allCoupons.length;
      const activeCoupons = allCoupons.filter((c) => c.active).length;
      const totalUsages = allUsages.length;
      const totalSavings = allUsages.reduce(
        (sum, u) => sum + u.discount_amount,
        0
      );

      setStats({ totalCoupons, activeCoupons, totalUsages, totalSavings });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error loading coupon stats:", error);
      logError({
        origin: "frontend",
        error: `Error loading coupon stats: ${msg}`,
        context: { component: "AdminPromoCodes" },
      });
    }
  }, []);

  const loadCoupons = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      const baseRef = collection(db, "coupons");
      const constraints: QueryConstraint[] = [orderBy("created_at", "desc")];

      if (lastVisible && page > 1) {
        constraints.push(startAfter(lastVisible));
      }

      constraints.push(limit(COUPONS_PER_PAGE));

      const q = query(baseRef, ...constraints);
      const snap = await getDocs(q);

      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      setLastVisible(lastDoc);
      setHasMore(snap.docs.length === COUPONS_PER_PAGE);

      const mapped: Coupon[] = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          code: String(raw.code ?? ""),
          type:
            (raw.type as Coupon["type"]) && (raw.type === "percentage" || raw.type === "fixed")
              ? (raw.type as Coupon["type"])
              : "fixed",
          amount: typeof raw.amount === "number" ? raw.amount : 0,
          min_order_amount:
            typeof raw.min_order_amount === "number" ? raw.min_order_amount : 0,
          max_uses_total:
            typeof raw.max_uses_total === "number" ? raw.max_uses_total : 0,
          max_uses_per_user:
            typeof raw.max_uses_per_user === "number"
              ? raw.max_uses_per_user
              : 0,
          valid_from: toDateSafe(raw.valid_from) ?? new Date(),
          valid_until: toDateSafe(raw.valid_until) ?? new Date(),
          services: Array.isArray(raw.services)
            ? (raw.services as unknown[]).map(String)
            : [],
          active: Boolean(raw.active),
          created_at: toDateSafe(raw.created_at) ?? new Date(),
          created_by: String(raw.created_by ?? "admin"),
          updated_at: toDateSafe(raw.updated_at) ?? new Date(),
          description:
            typeof raw.description === "string" ? raw.description : undefined,
        };
      });

      if (page === 1) {
        setCoupons(mapped);
      } else {
        setCoupons((prev) => [...prev, ...mapped]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error loading coupons:", error);
      logError({
        origin: "frontend",
        error: `Error loading coupons: ${msg}`,
        context: { component: "AdminPromoCodes" },
      });
    } finally {
      setIsLoading(false);
    }
  }, [lastVisible, page]);

  const loadCouponUsages = useCallback(
    async (couponCode: string): Promise<void> => {
      try {
        setIsLoadingUsages(true);

        const q = query(
          collection(db, "coupon_usages"),
          where("couponCode", "==", couponCode),
          orderBy("used_at", "desc"),
          limit(50)
        );
        const snap = await getDocs(q);

        const mapped: CouponUsage[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            couponCode: String(raw.couponCode ?? ""),
            userId: String(raw.userId ?? ""),
            userName: String(raw.userName ?? ""),
            orderId: String(raw.orderId ?? ""),
            order_amount:
              typeof raw.order_amount === "number" ? raw.order_amount : 0,
            discount_amount:
              typeof raw.discount_amount === "number"
                ? raw.discount_amount
                : 0,
            used_at: toDateSafe(raw.used_at) ?? new Date(),
          };
        });

        setCouponUsages(mapped);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Error loading coupon usages:", error);
        logError({
          origin: "frontend",
          error: `Error loading coupon usages: ${msg}`,
          context: { couponCode },
        });
      } finally {
        setIsLoadingUsages(false);
      }
    },
    []
  );

  /* ===================== Handlers ===================== */

  const handleAddCoupon = (): void => {
    setFormData({
      code: "",
      type: "fixed",
      amount: 0,
      min_order_amount: 0,
      max_uses_total: 100,
      max_uses_per_user: 1,
      valid_from: new Date(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      services: ["lawyer_call", "expat_call"],
      active: true,
      description: "",
    });
    setSelectedCoupon(null);
    setShowAddModal(true);
  };

  const handleEditCoupon = (coupon: Coupon): void => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      amount: coupon.amount,
      min_order_amount: coupon.min_order_amount,
      max_uses_total: coupon.max_uses_total,
      max_uses_per_user: coupon.max_uses_per_user,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      services: coupon.services,
      active: coupon.active,
      description: coupon.description,
    });
    setShowEditModal(true);
  };

  const handleDeleteCoupon = (coupon: Coupon): void => {
    setSelectedCoupon(coupon);
    setShowDeleteModal(true);
  };

  const handleViewUsages = async (coupon: Coupon): Promise<void> => {
    setSelectedCoupon(coupon);
    await loadCouponUsages(coupon.code);
    setShowUsageModal(true);
  };

  const handleSaveCoupon = useCallback(async (): Promise<void> => {
    try {
      setIsActionLoading(true);

      // Validation minimale
      if (
        !formData.code ||
        !formData.type ||
        formData.amount === undefined ||
        !formData.valid_from ||
        !formData.valid_until
      ) {
        alert("Veuillez remplir tous les champs obligatoires");
        return;
      }

      const code = formData.code.toUpperCase();

      // UnicitÃ© si crÃ©ation
      if (!selectedCoupon) {
        const q = query(
          collection(db, "coupons"),
          where("code", "==", code),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("Ce code promo existe dÃ©jÃ ");
          return;
        }
      }

      // DonnÃ©es Ã  persister (timestamps serveur pour Firestore)
      const couponDataForFirestore = {
        code,
        type: formData.type,
        amount: formData.amount,
        min_order_amount: formData.min_order_amount ?? 0,
        max_uses_total: formData.max_uses_total ?? 100,
        max_uses_per_user: formData.max_uses_per_user ?? 1,
        valid_from: Timestamp.fromDate(formData.valid_from),
        valid_until: Timestamp.fromDate(formData.valid_until),
        services: formData.services ?? ["lawyer_call", "expat_call"],
        active: formData.active ?? true,
        description: formData.description ?? "",
        updated_at: serverTimestamp(),
      };

      if (selectedCoupon) {
        await updateDoc(doc(db, "coupons", selectedCoupon.id), couponDataForFirestore);

        // Ã‰tat local avec objets Date
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === selectedCoupon.id
              ? {
                  ...c,
                  code,
                  type: formData.type!,
                  amount: formData.amount!,
                  min_order_amount: formData.min_order_amount ?? 0,
                  max_uses_total: formData.max_uses_total ?? 100,
                  max_uses_per_user: formData.max_uses_per_user ?? 1,
                  valid_from: formData.valid_from!,
                  valid_until: formData.valid_until!,
                  services: formData.services ?? ["lawyer_call", "expat_call"],
                  active: formData.active ?? true,
                  description: formData.description ?? "",
                  updated_at: new Date(),
                }
              : c
          )
        );
      } else {
        const ref = doc(collection(db, "coupons"));
        await setDoc(ref, {
          ...couponDataForFirestore,
          created_at: serverTimestamp(),
          created_by: currentUser?.uid ?? "admin",
        });

        const newCoupon: Coupon = {
          id: ref.id,
          code,
          type: formData.type!,
          amount: formData.amount!,
          min_order_amount: formData.min_order_amount ?? 0,
          max_uses_total: formData.max_uses_total ?? 100,
          max_uses_per_user: formData.max_uses_per_user ?? 1,
          valid_from: formData.valid_from!,
          valid_until: formData.valid_until!,
          services: formData.services ?? ["lawyer_call", "expat_call"],
          active: formData.active ?? true,
          description: formData.description ?? "",
          created_at: new Date(),
          created_by: currentUser?.uid ?? "admin",
          updated_at: new Date(),
        };

        setCoupons((prev) => [newCoupon, ...prev]);
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedCoupon(null);
      void loadStats();

      alert(
        selectedCoupon
          ? "Code promo mis Ã  jour avec succÃ¨s"
          : "Code promo crÃ©Ã© avec succÃ¨s"
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error saving coupon:", error);
      alert("Erreur lors de l'enregistrement du code promo");
      logError({
        origin: "frontend",
        error: `Error saving coupon: ${msg}`,
        context: { formData },
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [formData, selectedCoupon, currentUser, loadStats]);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!selectedCoupon) return;
    try {
      setIsActionLoading(true);
      await deleteDoc(doc(db, "coupons", selectedCoupon.id));
      setCoupons((prev) => prev.filter((c) => c.id !== selectedCoupon.id));
      setShowDeleteModal(false);
      setSelectedCoupon(null);
      void loadStats();
      alert("Code promo supprimÃ© avec succÃ¨s");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting coupon:", error);
      alert("Erreur lors de la suppression du code promo");
      logError({
        origin: "frontend",
        error: `Error deleting coupon: ${msg}`,
        context: { couponId: selectedCoupon.id },
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedCoupon, loadStats]);

  const handleToggleActive = useCallback(
    async (couponId: string, isActive: boolean): Promise<void> => {
      try {
        setIsActionLoading(true);
        await updateDoc(doc(db, "coupons", couponId), {
          active: !isActive,
          updated_at: serverTimestamp(),
        });
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === couponId ? { ...c, active: !isActive, updated_at: new Date() } : c
          )
        );
        void loadStats();
        alert(`Code promo ${!isActive ? "activÃ©" : "dÃ©sactivÃ©"} avec succÃ¨s`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Error toggling coupon status:", error);
        alert("Erreur lors de la modification du statut du code promo");
        logError({
          origin: "frontend",
          error: `Error toggling coupon status: ${msg}`,
          context: { couponId },
        });
      } finally {
        setIsActionLoading(false);
      }
    },
    [loadStats]
  );

  const handleLoadMore = (): void => {
    setPage((prev) => prev + 1);
  };

  /* ===================== Helpers UI ===================== */

  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, []);

  const formatAmount = (amount: number, type: "fixed" | "percentage"): string =>
    type === "fixed" ? `${amount.toFixed(2)}â‚¬` : `${amount}%`;

  const getStatusBadge = (active: boolean) =>
    active ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
        <CheckCircle size={12} className="mr-1" />
        Actif
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
        <XCircle size={12} className="mr-1" />
        Inactif
      </span>
    );

  const isExpired = (validUntil: Date): boolean => validUntil < new Date();

  const filteredCoupons = useMemo(() => {
    if (!searchTerm) return coupons;
    const s = searchTerm.toLowerCase();
    return coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(s) ||
        (c.description ? c.description.toLowerCase().includes(s) : false)
    );
  }, [coupons, searchTerm]);

  /* ===================== Render ===================== */

  return (
    <AdminLayout>
      <ErrorBoundary
        fallback={
          <div className="p-8 text-center">
            Une erreur est survenue lors du chargement des codes promo. Veuillez
            rÃ©essayer.
          </div>
        }
      >
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion des codes promo
            </h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un code promo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
              </div>
              <Button
                onClick={handleAddCoupon}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus size={18} className="mr-2" />
                Ajouter un code promo
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total des codes
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalCoupons}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Codes actifs
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.activeCoupons}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Utilisations
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalUsages}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Ã‰conomies totales
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalSavings.toFixed(2)}â‚¬
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RÃ©duction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ValiditÃ©
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Services
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && page === 1 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des codes promo...</p>
                      </td>
                    </tr>
                  ) : filteredCoupons.length > 0 ? (
                    filteredCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {coupon.code}
                          </div>
                          {coupon.description && (
                            <div className="text-xs text-gray-500">
                              {coupon.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {coupon.type === "percentage" ? (
                              <Percent size={16} className="text-purple-600 mr-1" />
                            ) : (
                              <DollarSign
                                size={16}
                                className="text-green-600 mr-1"
                              />
                            )}
                            <span className="text-sm font-medium">
                              {formatAmount(coupon.amount, coupon.type)}
                            </span>
                          </div>
                          {coupon.min_order_amount > 0 && (
                            <div className="text-xs text-gray-500">
                              Min: {coupon.min_order_amount}â‚¬
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Du: {formatDate(coupon.valid_from)}</div>
                          <div
                            className={`${
                              isExpired(coupon.valid_until)
                                ? "text-red-600 font-medium"
                                : ""
                            }`}
                          >
                            Au: {formatDate(coupon.valid_until)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Max total: {coupon.max_uses_total}</div>
                          <div>Max/utilisateur: {coupon.max_uses_per_user}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {coupon.services.includes("lawyer_call") && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                Avocat
                              </span>
                            )}
                            {coupon.services.includes("expat_call") && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                ExpatriÃ©
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(coupon.active)}
                          {isExpired(coupon.valid_until) && (
                            <span className="mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center w-fit">
                              <Calendar size={12} className="mr-1" />
                              ExpirÃ©
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => void handleViewUsages(coupon)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir les utilisations"
                            >
                              <Users size={18} />
                            </button>
                            <button
                              onClick={() => handleEditCoupon(coupon)}
                              className="text-green-600 hover:text-green-800"
                              title="Modifier"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() =>
                                void handleToggleActive(coupon.id, coupon.active)
                              }
                              className={`${
                                coupon.active
                                  ? "text-red-600 hover:text-red-800"
                                  : "text-green-600 hover:text-green-800"
                              }`}
                              title={coupon.active ? "DÃ©sactiver" : "Activer"}
                              disabled={isActionLoading}
                            >
                              {coupon.active ? (
                                <XCircle size={18} />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer"
                              disabled={isActionLoading}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Aucun code promo trouvÃ©
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Button onClick={handleLoadMore} disabled={isLoading} fullWidth>
                  {isLoading
                    ? "Chargement..."
                    : "Charger plus de codes promo"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Coupon Modal */}
        <Modal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          title={showAddModal ? "Ajouter un code promo" : "Modifier un code promo"}
          size="large"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Code promo *
              </label>
              <input
                id="code"
                type="text"
                value={formData.code ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ex: WELCOME10"
                disabled={showEditModal} // code inchangÃ© en Ã©dition
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Type de rÃ©duction *
                </label>
                <select
                  id="type"
                  value={formData.type ?? "fixed"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as "fixed" | "percentage",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="fixed">Montant fixe (â‚¬)</option>
                  <option value="percentage">Pourcentage (%)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Montant de la rÃ©duction *
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step={formData.type === "fixed" ? "0.01" : "1"}
                  value={formData.amount ?? 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      amount:
                        e.target.value === "" ? 0 : parseFloat(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={formData.type === "fixed" ? "ex: 10.00" : "ex: 15"}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="min_order_amount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Montant minimum de commande (â‚¬)
              </label>
              <input
                id="min_order_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_order_amount ?? 0}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_order_amount:
                      e.target.value === ""
                        ? 0
                        : parseFloat(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ex: 20.00"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="valid_from"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Valide Ã  partir du *
                </label>
                <input
                  id="valid_from"
                  type="datetime-local"
                  value={
                    formData.valid_from
                      ? new Date(
                          formData.valid_from.getTime() -
                            formData.valid_from.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valid_from: new Date(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="valid_until"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Valide jusqu'au *
                </label>
                <input
                  id="valid_until"
                  type="datetime-local"
                  value={
                    formData.valid_until
                      ? new Date(
                          formData.valid_until.getTime() -
                            formData.valid_until.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valid_until: new Date(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="max_uses_total"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre maximum d'utilisations total
                </label>
                <input
                  id="max_uses_total"
                  type="number"
                  min="1"
                  value={formData.max_uses_total ?? 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_uses_total:
                        e.target.value === "" ? 1 : parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ex: 100"
                />
              </div>

              <div>
                <label
                  htmlFor="max_uses_per_user"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre maximum d'utilisations par utilisateur
                </label>
                <input
                  id="max_uses_per_user"
                  type="number"
                  min="1"
                  value={formData.max_uses_per_user ?? 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_uses_per_user:
                        e.target.value === "" ? 1 : parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ex: 1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Services applicables *
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="lawyer_call"
                    type="checkbox"
                    checked={Boolean(formData.services?.includes("lawyer_call"))}
                    onChange={(e) => {
                      const services = [...(formData.services ?? [])];
                      if (e.target.checked) {
                        if (!services.includes("lawyer_call")) {
                          services.push("lawyer_call");
                        }
                      } else {
                        const index = services.indexOf("lawyer_call");
                        if (index !== -1) services.splice(index, 1);
                      }
                      setFormData((prev) => ({ ...prev, services }));
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="lawyer_call" className="ml-2 block text-sm text-gray-700">
                    Appel Avocat
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="expat_call"
                    type="checkbox"
                    checked={Boolean(formData.services?.includes("expat_call"))}
                    onChange={(e) => {
                      const services = [...(formData.services ?? [])];
                      if (e.target.checked) {
                        if (!services.includes("expat_call")) {
                          services.push("expat_call");
                        }
                      } else {
                        const index = services.indexOf("expat_call");
                        if (index !== -1) services.splice(index, 1);
                      }
                      setFormData((prev) => ({ ...prev, services }));
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="expat_call" className="ml-2 block text-sm text-gray-700">
                    Appel ExpatriÃ©
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Description du code promo (optionnel)"
              />
            </div>

            <div className="flex items-center">
              <input
                id="active"
                type="checkbox"
                checked={formData.active ?? true}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, active: e.target.checked }))
                }
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                Code promo actif
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                variant="outline"
                disabled={isActionLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={() => void handleSaveCoupon()}
                className="bg-red-600 hover:bg-red-700"
                loading={isActionLoading}
              >
                <Save size={16} className="mr-2" />
                {showAddModal ? "CrÃ©er le code promo" : "Enregistrer les modifications"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirmer la suppression"
          size="small"
        >
          {selectedCoupon && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Attention : Cette action est irrÃ©versible
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Vous Ãªtes sur le point de supprimer dÃ©finitivement le
                        code promo :
                        <br />
                        <strong>{selectedCoupon.code}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                  disabled={isActionLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => void handleDeleteConfirm()}
                  className="bg-red-600 hover:bg-red-700"
                  loading={isActionLoading}
                >
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Coupon Usages Modal */}
        <Modal
          isOpen={showUsageModal}
          onClose={() => setShowUsageModal(false)}
          title={`Utilisations du code ${selectedCoupon?.code ?? ""}`}
          size="large"
        >
          {selectedCoupon && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">{selectedCoupon.code}</h3>
                    <p className="text-sm text-blue-700">
                      {formatAmount(selectedCoupon.amount, selectedCoupon.type)} â€¢{" "}
                      {selectedCoupon.description ?? ""}
                    </p>
                  </div>
                  <div>{getStatusBadge(selectedCoupon.active)}</div>
                </div>
              </div>

              {isLoadingUsages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">
                    Chargement des utilisations...
                  </p>
                </div>
              ) : couponUsages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilisateur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commande
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RÃ©duction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {couponUsages.map((usage) => (
                        <tr key={usage.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {usage.userName || "Utilisateur inconnu"}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {usage.userId}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {usage.orderId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {usage.order_amount.toFixed(2)}â‚¬
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            -{usage.discount_amount.toFixed(2)}â‚¬
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(usage.used_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Aucune utilisation trouvÃ©e pour ce code promo
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button onClick={() => setShowUsageModal(false)} variant="outline">
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminPromoCodes;
