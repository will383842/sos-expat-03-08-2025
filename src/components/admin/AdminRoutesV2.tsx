// src/components/admin/AdminRoutesV2.tsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// ===== COMPOSANT DE CHARGEMENT =====
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Chargement..." }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

// ===== LAZY IMPORTS - DASHBOARD =====
const AdminDashboard = lazy(() => import("../../pages/admin/AdminDashboard"));

// ===== LAZY IMPORTS - FINANCE =====
const AdminPayments = lazy(() => import("../../pages/admin/AdminPayments"));
const AdminInvoices = lazy(() => import("../../pages/admin/AdminInvoices"));
const AdminFinanceTaxes = lazy(() => import("../../pages/admin/Finance/Taxes"));
const AdminFinanceTaxesByCountry = lazy(() => import("../../pages/admin/Finance/TaxesByCountry"));
const AdminFinanceReconciliation = lazy(() => import("../../pages/admin/AdminFinanceReconciliation"));
const AdminFinanceDisputes = lazy(() => import("../../pages/admin/AdminFinanceDisputes"));
const AdminFinanceRefunds = lazy(() => import("../../pages/admin/AdminFinanceRefunds"));
const AdminFinancePayouts = lazy(() => import("../../pages/admin/AdminFinancePayouts"));
const AdminFinanceExports = lazy(() => import("../../pages/admin/Finance/Exports"));
const AdminFinanceLedger = lazy(() => import("../../pages/admin/AdminFinanceLedger"));

// ===== LAZY IMPORTS - USERS & PROVIDERS =====
const AdminClients = lazy(() => import("../../pages/admin/AdminClients"));
const AdminLawyers = lazy(() => import("../../pages/admin/AdminLawyers"));
const AdminExpats = lazy(() => import("../../pages/admin/AdminExpats"));
const AdminAaaProfiles = lazy(() => import("../../pages/admin/AdminAaaProfiles"));
const AdminLawyerApprovals = lazy(() => import("../../pages/admin/AdminApprovals"));
const AdminKYCProviders = lazy(() => import("../../pages/admin/AdminKYCProviders"));
const AdminReviews = lazy(() => import("../../pages/admin/AdminReviews"));

// ===== LAZY IMPORTS - CALLS =====
const AdminCalls = lazy(() => import("../../pages/admin/AdminCalls"));
const AdminCallsSessions = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Sessions d'appels</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);
const AdminCallsRecordings = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Enregistrements</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);

// ===== LAZY IMPORTS - COMMUNICATIONS =====
const AdminCommsCampaigns = lazy(() => import("../../pages/admin/AdminCommsCampaigns"));
const AdminCommsAutomations = lazy(() => import("../../pages/admin/AdminCommsAutomations"));
const AdminCommsSegments = lazy(() => import("../../pages/admin/AdminCommsSegments"));
const AdminCommsTemplates = lazy(() => import("../../pages/admin/AdminCommsTemplates"));
const AdminCommsDeliverability = lazy(() => import("../../pages/admin/AdminCommsDeliverability"));
const AdminCommsSuppression = lazy(() => import("../../pages/admin/AdminCommsSuppression"));
const AdminCommsABTests = lazy(() => import("../../pages/admin/AdminCommsABTests"));
const AdminClientMessages = lazy(() => import("../../pages/admin/AdminClientMessages"));
const AdminNotifications = lazy(() => import("../../pages/admin/AdminNotifications"));

// ===== LAZY IMPORTS - AFFILIATION =====
const AdminAffiliates = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Affiliés</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);
const AdminCommissionRules = lazy(() => import("../../pages/admin/AdminCommissionRules"));
const AdminAffiliatePayouts = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Payouts Affiliés</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);
const AdminAmbassadors = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Ambassadeurs</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);

// ===== LAZY IMPORTS - B2B =====
const AdminB2BAccounts = lazy(() => import("../../pages/admin/AdminB2BAccounts"));
const AdminB2BMembers = lazy(() => import("../../pages/admin/AdminB2BMembers"));
const AdminB2BPricing = lazy(() => import("../../pages/admin/AdminB2BPricing"));
const AdminB2BBilling = lazy(() => import("../../pages/admin/AdminB2BBilling"));
const AdminB2BInvoices = lazy(() => import("../../pages/admin/AdminB2BInvoices"));
const AdminB2BReports = lazy(() => import("../../pages/admin/AdminB2BReports"));

// ===== LAZY IMPORTS - SETTINGS & TOOLS =====
const AdminPricing = lazy(() => import("../../pages/admin/AdminPricing"));
const AdminCountries = lazy(() => import("../../pages/admin/AdminCountries"));
const AdminLegalDocuments = lazy(() => import("../../pages/admin/AdminLegalDocuments"));
const AdminBackups = lazy(() => import("../../pages/admin/AdminBackups"));
const AdminSettings = lazy(() => import("../../pages/admin/AdminSettings"));

// ===== LAZY IMPORTS - ANALYTICS & REPORTS =====
const AdminFinancialReports = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Rapports Financiers</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);
const AdminUserAnalytics = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Analytics Utilisateurs</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);
const AdminPlatformPerformance = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Performance Plateforme</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);
const AdminDataExports = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Exports de Données</h1>
        <p className="text-sm opacity-80">Page en cours de développement</p>
      </div>
    ),
  })
);

// ===== LAZY IMPORTS - AUTRES PAGES =====
const AdminPromoCodes = lazy(() => import("../../pages/admin/AdminPromoCodes"));
const AdminDocuments = lazy(() => import("../../pages/admin/AdminDocuments"));
const AdminContactMessages = lazy(() => import("../../pages/admin/AdminContactMessages"));
const AdminEmails = lazy(() => import("../../pages/admin/AdminEmails"));

// ===== COMPOSANT PRINCIPAL =====
const AdminRoutesV2: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Chargement de la page d'administration..." />}>
      <Routes>
        {/* ===== REDIRECTIONS PRINCIPALES ===== */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/" element={<Navigate to="/admin/dashboard" replace />} />

        {/* ===== 📊 DASHBOARD ===== */}
        <Route
          path="/admin/dashboard"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du tableau de bord..." />}>
              <AdminDashboard />
            </Suspense>
          }
        />

        {/* ===== 👥 UTILISATEURS & PRESTATAIRES ===== */}
        <Route
          path="/admin/users/clients"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des clients..." />}>
              <AdminClients />
            </Suspense>
          }
        />
        <Route
          path="/admin/users/providers/lawyers"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des avocats..." />}>
              <AdminLawyers />
            </Suspense>
          }
        />
        <Route
          path="/admin/users/providers/expats"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des expatriés..." />}>
              <AdminExpats />
            </Suspense>
          }
        />
        <Route
          path="/admin/aaaprofiles"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des profils de test..." />}>
              <AdminAaaProfiles />
            </Suspense>
          }
        />
        <Route
          path="/admin/approvals/lawyers"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des validations d'avocats..." />}>
              <AdminLawyerApprovals />
            </Suspense>
          }
        />
        <Route
          path="/admin/kyc/providers"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du KYC prestataires..." />}>
              <AdminKYCProviders />
            </Suspense>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des avis..." />}>
              <AdminReviews />
            </Suspense>
          }
        />

        {/* ===== ROUTES DE COMPATIBILITÉ ANCIENNES ===== */}
        <Route path="/admin/users/list" element={<Navigate to="/admin/users/clients" replace />} />
        <Route path="/admin/users/providers" element={<Navigate to="/admin/users/providers/lawyers" replace />} />
        <Route path="/admin/approvals" element={<Navigate to="/admin/approvals/lawyers" replace />} />

        {/* ===== 💰 FINANCES & FACTURATION ===== */}
        <Route
          path="/admin/finance/payments"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des paiements..." />}>
              <AdminPayments />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/invoices"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des factures..." />}>
              <AdminInvoices />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/taxes"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la gestion TVA..." />}>
              <AdminFinanceTaxes />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/taxes/by-country"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la TVA par pays..." />}>
              <AdminFinanceTaxesByCountry />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/reconciliation"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des rapprochements..." />}>
              <AdminFinanceReconciliation />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/disputes"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des litiges..." />}>
              <AdminFinanceDisputes />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/refunds"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des remboursements..." />}>
              <AdminFinanceRefunds />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/payouts"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des payouts..." />}>
              <AdminFinancePayouts />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/exports"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des exports..." />}>
              <AdminFinanceExports />
            </Suspense>
          }
        />
        <Route
          path="/admin/finance/ledger"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du grand livre..." />}>
              <AdminFinanceLedger />
            </Suspense>
          }
        />

        {/* ===== 📞 APPELS & PLANIFICATION ===== */}
        <Route
          path="/admin/calls"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du monitoring des appels..." />}>
              <AdminCalls />
            </Suspense>
          }
        />
        <Route
          path="/admin/calls/sessions"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des sessions..." />}>
              <AdminCallsSessions />
            </Suspense>
          }
        />
        <Route
          path="/admin/calls/recordings"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des enregistrements..." />}>
              <AdminCallsRecordings />
            </Suspense>
          }
        />

        {/* ===== 💌 COMMUNICATIONS ===== */}
        <Route
          path="/admin/comms/campaigns"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des campagnes..." />}>
              <AdminCommsCampaigns />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/automations"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des automations..." />}>
              <AdminCommsAutomations />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/segments"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des segments..." />}>
              <AdminCommsSegments />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/templates"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des templates..." />}>
              <AdminCommsTemplates />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/deliverability"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la délivrabilité..." />}>
              <AdminCommsDeliverability />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/suppression"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des listes de suppression..." />}>
              <AdminCommsSuppression />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/ab"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des tests A/B..." />}>
              <AdminCommsABTests />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/messages"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des messages..." />}>
              <AdminClientMessages />
            </Suspense>
          }
        />
        <Route
          path="/admin/comms/notifications"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des notifications..." />}>
              <AdminNotifications />
            </Suspense>
          }
        />

        {/* ===== 🤝 AFFILIATION & AMBASSADEURS ===== */}
        <Route
          path="/admin/affiliates"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des affiliés..." />}>
              <AdminAffiliates />
            </Suspense>
          }
        />
        <Route
          path="/admin/affiliates/commissions"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des règles de commission..." />}>
              <AdminCommissionRules />
            </Suspense>
          }
        />
        <Route
          path="/admin/affiliates/payouts"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des payouts affiliés..." />}>
              <AdminAffiliatePayouts />
            </Suspense>
          }
        />
        <Route
          path="/admin/ambassadors"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des ambassadeurs..." />}>
              <AdminAmbassadors />
            </Suspense>
          }
        />

        {/* ===== 🏢 ENTREPRISES (B2B) ===== */}
        <Route
          path="/admin/b2b/accounts"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des comptes B2B..." />}>
              <AdminB2BAccounts />
            </Suspense>
          }
        />
        <Route
          path="/admin/b2b/members"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des membres B2B..." />}>
              <AdminB2BMembers />
            </Suspense>
          }
        />
        <Route
          path="/admin/b2b/pricing"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des tarifs B2B..." />}>
              <AdminB2BPricing />
            </Suspense>
          }
        />
        <Route
          path="/admin/b2b/billing"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la facturation B2B..." />}>
              <AdminB2BBilling />
            </Suspense>
          }
        />
        <Route
          path="/admin/b2b/invoices"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des factures B2B..." />}>
              <AdminB2BInvoices />
            </Suspense>
          }
        />
        <Route
          path="/admin/b2b/reports"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des rapports B2B..." />}>
              <AdminB2BReports />
            </Suspense>
          }
        />

        {/* ===== ⚙️ CONFIGURATION & OUTILS ===== */}
        <Route
          path="/admin/pricing"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la gestion des tarifs..." />}>
              <AdminPricing />
            </Suspense>
          }
        />
        <Route
          path="/admin/countries"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des pays..." />}>
              <AdminCountries />
            </Suspense>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des documents légaux..." />}>
              <AdminLegalDocuments />
            </Suspense>
          }
        />
        <Route
          path="/admin/backups"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des sauvegardes..." />}>
              <AdminBackups />
            </Suspense>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des paramètres..." />}>
              <AdminSettings />
            </Suspense>
          }
        />

        {/* ===== 📊 RAPPORTS & ANALYTICS ===== */}
        <Route
          path="/admin/reports/financial"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des rapports financiers..." />}>
              <AdminFinancialReports />
            </Suspense>
          }
        />
        <Route
          path="/admin/reports/users"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des analytics utilisateurs..." />}>
              <AdminUserAnalytics />
            </Suspense>
          }
        />
        <Route
          path="/admin/reports/performance"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des performances..." />}>
              <AdminPlatformPerformance />
            </Suspense>
          }
        />
        <Route
          path="/admin/reports/exports"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des exports..." />}>
              <AdminDataExports />
            </Suspense>
          }
        />

        {/* ===== ROUTES HISTORIQUES / LEGACY ===== */}
        <Route path="/admin/users" element={<Navigate to="/admin/users/clients" replace />} />
        <Route path="/admin/providers" element={<Navigate to="/admin/users/providers/lawyers" replace />} />
        <Route path="/admin/payments" element={<Navigate to="/admin/finance/payments" replace />} />
        <Route path="/admin/invoices" element={<Navigate to="/admin/finance/invoices" replace />} />
        <Route path="/admin/notifications" element={<Navigate to="/admin/comms/notifications" replace />} />
        <Route path="/admin/messages" element={<Navigate to="/admin/comms/messages" replace />} />

        {/* ===== ROUTES SUPPLÉMENTAIRES EXISTANTES ===== */}
        <Route
          path="/admin/promo-codes"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des codes promo..." />}>
              <AdminPromoCodes />
            </Suspense>
          }
        />
        <Route
          path="/admin/documents-old"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des documents..." />}>
              <AdminDocuments />
            </Suspense>
          }
        />
        <Route
          path="/admin/contact-messages"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des messages de contact..." />}>
              <AdminContactMessages />
            </Suspense>
          }
        />
        <Route
          path="/admin/emails"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la gestion des emails..." />}>
              <AdminEmails />
            </Suspense>
          }
        />

        {/* ===== ROUTES ALIAS SPÉCIFIQUES ===== */}
        <Route path="/admin/dashboard/global" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard/alerts" element={<Navigate to="/admin/reports/performance" replace />} />
        <Route path="/admin/dashboard/reports" element={<Navigate to="/admin/reports/financial" replace />} />
        <Route path="/admin/finance" element={<Navigate to="/admin/finance/payments" replace />} />
        <Route path="/admin/users/all" element={<Navigate to="/admin/users/clients" replace />} />
        <Route path="/admin/comms" element={<Navigate to="/admin/comms/campaigns" replace />} />

        {/* ===== PAGE 404 POUR L'ADMIN ===== */}
        <Route
          path="/admin/*"
          element={
            <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Page non trouvée</h2>
                <p className="text-gray-600 mb-6">
                  Cette page d'administration n'existe pas ou a été déplacée.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mr-4"
                >
                  Retour
                </button>
                <button
                  onClick={() => (window.location.href = "/admin/dashboard")}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Tableau de bord
                </button>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};

// ===== HOOK UTILITAIRE POUR VALIDATION DES ROUTES =====
// eslint-disable-next-line react-refresh/only-export-components
export const useAdminRouteValidation = () => {
  const validateRoute = (path: string): boolean => {
    const validPaths = [
      "/admin/dashboard",
      "/admin/users/clients",
      "/admin/users/providers/lawyers",
      "/admin/users/providers/expats",
      "/admin/aaaprofiles",
      "/admin/approvals/lawyers",
      "/admin/kyc/providers",
      "/admin/reviews",
      "/admin/finance/payments",
      "/admin/finance/invoices",
      "/admin/finance/taxes",
      "/admin/finance/taxes/by-country",
      "/admin/finance/reconciliation",
      "/admin/finance/disputes",
      "/admin/finance/refunds",
      "/admin/finance/payouts",
      "/admin/finance/exports",
      "/admin/finance/ledger",
      "/admin/calls",
      "/admin/calls/sessions",
      "/admin/calls/recordings",
      "/admin/comms/campaigns",
      "/admin/comms/automations",
      "/admin/comms/segments",
      "/admin/comms/templates",
      "/admin/comms/deliverability",
      "/admin/comms/suppression",
      "/admin/comms/ab",
      "/admin/comms/messages",
      "/admin/comms/notifications",
      "/admin/affiliates",
      "/admin/affiliates/commissions",
      "/admin/affiliates/payouts",
      "/admin/ambassadors",
      "/admin/b2b/accounts",
      "/admin/b2b/members",
      "/admin/b2b/pricing",
      "/admin/b2b/billing",
      "/admin/b2b/invoices",
      "/admin/b2b/reports",
      "/admin/pricing",
      "/admin/countries",
      "/admin/documents",
      "/admin/backups",
      "/admin/settings",
      "/admin/reports/financial",
      "/admin/reports/users",
      "/admin/reports/performance",
      "/admin/reports/exports",
    ];
    return validPaths.includes(path);
  };

  return { validateRoute };
};

export default AdminRoutesV2;
