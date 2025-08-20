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

// ===== PAGE 404 ADMIN MINIMALE =====
const AdminNotFound: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-semibold mb-2">Page admin introuvable</h1>
    <p className="text-sm opacity-80">La page demandée n’existe pas.</p>
    <div className="mt-4">
      <a href="/admin/dashboard" className="text-red-600 underline">Retour au dashboard</a>
    </div>
  </div>
);

// ===== LAZY IMPORTS - AUTH =====
const AdminLogin = lazy(() => import("../../pages/admin/AdminLogin"));

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
const AdminCallsSessions = lazy(() => import("../../pages/admin/AdminCallsSessions"));

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
        {/* ===== INDEX : /admin ===== */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* ===== 🔐 AUTHENTIFICATION ===== */}
        <Route
          path="login"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la connexion admin..." />}>
              <AdminLogin />
            </Suspense>
          }
        />

        {/* ===== 📊 DASHBOARD ===== */}
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du tableau de bord..." />}>
              <AdminDashboard />
            </Suspense>
          }
        />

        {/* ===== 👥 UTILISATEURS & PRESTATAIRES ===== */}
        <Route
          path="users/clients"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des clients..." />}>
              <AdminClients />
            </Suspense>
          }
        />
        <Route
          path="users/providers/lawyers"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des avocats..." />}>
              <AdminLawyers />
            </Suspense>
          }
        />
        <Route
          path="users/providers/expats"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des expatriés..." />}>
              <AdminExpats />
            </Suspense>
          }
        />
        <Route
          path="aaaprofiles"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des profils de test..." />}>
              <AdminAaaProfiles />
            </Suspense>
          }
        />
        <Route
          path="approvals/lawyers"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des validations d'avocats..." />}>
              <AdminLawyerApprovals />
            </Suspense>
          }
        />
        <Route
          path="kyc/providers"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du KYC prestataires..." />}>
              <AdminKYCProviders />
            </Suspense>
          }
        />
        <Route
          path="reviews"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des avis..." />}>
              <AdminReviews />
            </Suspense>
          }
        />

        {/* ===== ROUTES DE COMPATIBILITÉ ANCIENNES ===== */}
        <Route path="users/list" element={<Navigate to="../users/clients" replace />} />
        <Route path="users/providers" element={<Navigate to="../users/providers/lawyers" replace />} />
        <Route path="approvals" element={<Navigate to="../approvals/lawyers" replace />} />

        {/* ===== 💰 FINANCES & FACTURATION ===== */}
        <Route
          path="finance/payments"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des paiements..." />}>
              <AdminPayments />
            </Suspense>
          }
        />
        <Route
          path="finance/invoices"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des factures..." />}>
              <AdminInvoices />
            </Suspense>
          }
        />
        <Route
          path="finance/taxes"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la gestion TVA..." />}>
              <AdminFinanceTaxes />
            </Suspense>
          }
        />
        <Route
          path="finance/taxes/by-country"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la TVA par pays..." />}>
              <AdminFinanceTaxesByCountry />
            </Suspense>
          }
        />
        <Route
          path="finance/reconciliation"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des rapprochements..." />}>
              <AdminFinanceReconciliation />
            </Suspense>
          }
        />
        <Route
          path="finance/disputes"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des litiges..." />}>
              <AdminFinanceDisputes />
            </Suspense>
          }
        />
        <Route
          path="finance/refunds"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des remboursements..." />}>
              <AdminFinanceRefunds />
            </Suspense>
          }
        />
        <Route
          path="finance/payouts"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des payouts..." />}>
              <AdminFinancePayouts />
            </Suspense>
          }
        />
        <Route
          path="finance/exports"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des exports..." />}>
              <AdminFinanceExports />
            </Suspense>
          }
        />
        <Route
          path="finance/ledger"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du grand livre..." />}>
              <AdminFinanceLedger />
            </Suspense>
          }
        />

        {/* ===== 📞 APPELS & PLANIFICATION ===== */}
        <Route
          path="calls"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement du monitoring des appels..." />}>
              <AdminCalls />
            </Suspense>
          }
        />
        <Route
          path="calls/sessions"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des sessions..." />}>
              <AdminCallsSessions />
            </Suspense>
          }
        />

        {/* ===== 💌 COMMUNICATIONS ===== */}
        <Route
          path="comms/campaigns"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des campagnes..." />}>
              <AdminCommsCampaigns />
            </Suspense>
          }
        />
        <Route
          path="comms/automations"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des automations..." />}>
              <AdminCommsAutomations />
            </Suspense>
          }
        />
        <Route
          path="comms/segments"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des segments..." />}>
              <AdminCommsSegments />
            </Suspense>
          }
        />
        <Route
          path="comms/templates"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des templates..." />}>
              <AdminCommsTemplates />
            </Suspense>
          }
        />
        <Route
          path="comms/deliverability"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la délivrabilité..." />}>
              <AdminCommsDeliverability />
            </Suspense>
          }
        />
        <Route
          path="comms/suppression"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des listes de suppression..." />}>
              <AdminCommsSuppression />
            </Suspense>
          }
        />
        <Route
          path="comms/ab"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des tests A/B..." />}>
              <AdminCommsABTests />
            </Suspense>
          }
        />
        <Route
          path="comms/messages"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des messages..." />}>
              <AdminClientMessages />
            </Suspense>
          }
        />
        <Route
          path="comms/notifications"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des notifications..." />}>
              <AdminNotifications />
            </Suspense>
          }
        />

        {/* ===== 🤝 AFFILIATION & AMBASSADEURS ===== */}
        <Route
          path="affiliates"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des affiliés..." />}>
              <AdminAffiliates />
            </Suspense>
          }
        />
        <Route
          path="affiliates/commissions"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des règles de commission..." />}>
              <AdminCommissionRules />
            </Suspense>
          }
        />
        <Route
          path="affiliates/payouts"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des payouts affiliés..." />}>
              <AdminAffiliatePayouts />
            </Suspense>
          }
        />
        <Route
          path="ambassadors"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des ambassadeurs..." />}>
              <AdminAmbassadors />
            </Suspense>
          }
        />

        {/* ===== 🏢 ENTREPRISES (B2B) ===== */}
        <Route
          path="b2b/accounts"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des comptes B2B..." />}>
              <AdminB2BAccounts />
            </Suspense>
          }
        />
        <Route
          path="b2b/members"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des membres B2B..." />}>
              <AdminB2BMembers />
            </Suspense>
          }
        />
        <Route
          path="b2b/pricing"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des tarifs B2B..." />}>
              <AdminB2BPricing />
            </Suspense>
          }
        />
        <Route
          path="b2b/billing"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la facturation B2B..." />}>
              <AdminB2BBilling />
            </Suspense>
          }
        />
        <Route
          path="b2b/invoices"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des factures B2B..." />}>
              <AdminB2BInvoices />
            </Suspense>
          }
        />
        <Route
          path="b2b/reports"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des rapports B2B..." />}>
              <AdminB2BReports />
            </Suspense>
          }
        />

        {/* ===== ⚙️ CONFIGURATION & OUTILS ===== */}
        <Route
          path="pricing"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la gestion des tarifs..." />}>
              <AdminPricing />
            </Suspense>
          }
        />
        <Route
          path="countries"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des pays..." />}>
              <AdminCountries />
            </Suspense>
          }
        />
        <Route
          path="documents"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des documents légaux..." />}>
              <AdminLegalDocuments />
            </Suspense>
          }
        />
        <Route
          path="backups"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des sauvegardes..." />}>
              <AdminBackups />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des paramètres..." />}>
              <AdminSettings />
            </Suspense>
          }
        />

        {/* ===== 📊 RAPPORTS & ANALYTICS ===== */}
        <Route
          path="reports/financial"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des rapports financiers..." />}>
              <AdminFinancialReports />
            </Suspense>
          }
        />
        <Route
          path="reports/users"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des analytics utilisateurs..." />}>
              <AdminUserAnalytics />
            </Suspense>
          }
        />
        <Route
          path="reports/performance"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des performances..." />}>
              <AdminPlatformPerformance />
            </Suspense>
          }
        />
        <Route
          path="reports/exports"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des exports..." />}>
              <AdminDataExports />
            </Suspense>
          }
        />

        {/* ===== ROUTES HISTORIQUES / LEGACY (relatives) ===== */}
        <Route path="users" element={<Navigate to="users/clients" replace />} />
        <Route path="providers" element={<Navigate to="users/providers/lawyers" replace />} />
        <Route path="payments" element={<Navigate to="finance/payments" replace />} />
        <Route path="invoices" element={<Navigate to="finance/invoices" replace />} />
        <Route path="notifications" element={<Navigate to="comms/notifications" replace />} />
        <Route path="messages" element={<Navigate to="comms/messages" replace />} />

        {/* ===== ROUTES SUPPLÉMENTAIRES ===== */}
        <Route
          path="promo-codes"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des codes promo..." />}>
              <AdminPromoCodes />
            </Suspense>
          }
        />
        <Route
          path="documents-old"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des documents..." />}>
              <AdminDocuments />
            </Suspense>
          }
        />
        <Route
          path="contact-messages"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement des messages de contact..." />}>
              <AdminContactMessages />
            </Suspense>
          }
        />
        <Route
          path="emails"
          element={
            <Suspense fallback={<LoadingSpinner message="Chargement de la gestion des emails..." />}>
              <AdminEmails />
            </Suspense>
          }
        />

        {/* ===== ROUTES ALIAS (relatives) ===== */}
        <Route path="dashboard/global" element={<Navigate to="../dashboard" replace />} />
        <Route path="dashboard/alerts" element={<Navigate to="../reports/performance" replace />} />
        <Route path="dashboard/reports" element={<Navigate to="../reports/financial" replace />} />
        <Route path="finance" element={<Navigate to="finance/payments" replace />} />
        <Route path="users/all" element={<Navigate to="users/clients" replace />} />
        <Route path="comms" element={<Navigate to="comms/campaigns" replace />} />

        {/* ===== CATCH-ALL : vraie 404 admin (ou remets un redirect si tu préfères) ===== */}
        <Route path="*" element={<AdminNotFound />} />
      </Routes>
    </Suspense>
  );
};

// ===== HOOK UTILITAIRE POUR VALIDATION DES ROUTES =====
// eslint-disable-next-line react-refresh/only-export-components
export const useAdminRouteValidation = () => {
  const validateRoute = (path: string): boolean => {
    const validPaths = [
      "/admin/login",
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
