// src/components/admin/AdminRoutesV2.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Tes pages existantes
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminCalls from "@/pages/admin/AdminCalls";
import AdminClientMessages from "@/pages/admin/AdminClientMessages";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminReports from "@/pages/admin/AdminReports";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminBackups from "@/pages/admin/AdminBackups";
import AdminApprovals from "@/pages/admin/AdminApprovals";
import AdminCountries from "@/pages/admin/AdminCountries";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";
import AdminLegalDocuments from "@/pages/admin/AdminLegalDocuments";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminPricing from "@/pages/admin/AdminPricing";
import Invoices from "@/pages/admin/Finance/Invoices";
import Taxes from "@/pages/admin/Finance/Taxes";
import TaxesByCountry from "@/pages/admin/Finance/TaxesByCountry";
import FinanceExports from "@/pages/admin/Finance/Exports";

export default function AdminRoutesV2() {
  return (
    <Routes>
      {/* 🚫 PAS de /admin ni /admin/dashboard ici pour éviter tout doublon avec tes routes actuelles */}

      {/* Dashboards (alias) */}
      <Route path="/admin/dashboard/global" element={<AdminDashboard />} />
      <Route path="/admin/dashboard/alerts" element={<AdminReports />} />
      <Route path="/admin/dashboard/reports" element={<AdminReports />} />

      {/* Users (alias) */}
      <Route path="/admin/users/list" element={<AdminUsers />} />
      <Route path="/admin/users/providers" element={<AdminUsers />} />
      <Route path="/admin/aaaprofiles" element={<Navigate to="/admin/aaa-profiles" replace />} />

      {/* Calls (alias) */}
      <Route path="/admin/calls/monitor" element={<AdminCalls />} />
      <Route path="/admin/calls/sessions" element={<AdminCalls />} />
      <Route path="/admin/calls/recordings" element={<AdminCalls />} />

      {/* Finance (alias) */}
      <Route path="/admin/finance/payments" element={<AdminPayments />} />

        {/* ===== Finance détaillée (nouveaux écrans UI-only) ===== */}
        <Route path="/admin/finance/invoices" element={<Invoices />} />
        <Route path="/admin/finance/taxes" element={<Taxes />} />
        <Route path="/admin/finance/taxes/by-country" element={<TaxesByCountry />} />
        <Route path="/admin/finance/exports" element={<FinanceExports />} />

      {/* Communications (alias) */}
      <Route path="/admin/comms/messages" element={<AdminClientMessages />} />
      <Route path="/admin/comms/notifications" element={<AdminNotifications />} />

      {/* CMS / Outils / Settings (alias) */}
      <Route path="/admin/cms/media" element={<AdminDocuments />} />
      <Route path="/admin/cms/legal" element={<AdminLegalDocuments />} />
      <Route path="/admin/tools/backups" element={<AdminBackups />} />
      <Route path="/admin/settings/countries" element={<AdminCountries />} />
      <Route path="/admin/settings/pricing" element={<AdminPricing />} />
      <Route path="/admin/settings" element={<AdminSettings />} />

      {/* Divers (alias) */}
      <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
      <Route path="/admin/approvals" element={<AdminApprovals />} />
      <Route path="/admin/reviews" element={<AdminReviews />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/notifications" element={<AdminNotifications />} />
    </Routes>
  );
}
