// src/pages/admin/AdminPricing.tsx
import React from 'react';
import { DollarSign, Settings, TrendingUp } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { PricingManagement } from '../../components/admin/PricingManagement';
import { FinancialAnalytics } from '../../components/admin/FinancialAnalytics';
import PricingMigrationPanel from '../../components/admin/PricingMigrationPanel';

const AdminPricing: React.FC = () => {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <DollarSign className="w-8 h-8 mr-3 text-green-600" />
                  Gestion des Tarifs
                </h1>
                <p className="text-gray-600 mt-1">
                  Configuration centralisée des prix, commissions et analytics financiers
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Section 1: Configuration des Prix */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 mr-2 text-blue-600" />
                💰 Configuration des Prix et Commissions
              </h2>
              <p className="text-gray-600 mt-1">
                Modifiez les tarifs en temps réel - Les changements sont appliqués immédiatement
              </p>
            </div>
            <div className="p-6">
              <PricingManagement />
            </div>
          </div>

          {/* Section 2: Analytics Financiers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-purple-600" />
                📊 Analytics Financiers
              </h2>
              <p className="text-gray-600 mt-1">
                Analyse détaillée des revenus et performances financières
              </p>
            </div>
            <div className="p-6">
              <FinancialAnalytics />
            </div>
          </div>

          {/* Section 3: Migration & Diagnostic */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 mr-2 text-orange-600" />
                🔧 Migration & Diagnostic du Système
              </h2>
              <p className="text-gray-600 mt-1">
                Outils de maintenance et diagnostic du système de pricing
              </p>
            </div>
            <div className="p-6">
              <PricingMigrationPanel />
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPricing;