// ===== src/pages/admin/AdminProviders.tsx =====
import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Users, UserCheck, Search, Filter } from 'lucide-react';

const AdminProviders: React.FC = () => {
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <UserCheck className="w-7 h-7 mr-2 text-blue-600" />
              Gestion des Prestataires
            </h1>
            <p className="text-gray-600 mt-1">Liste et gestion des prestataires (avocats, expatriés)</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Page en cours de développement</h3>
            <p className="text-gray-600 mb-6">
              Cette section permettra de gérer tous les prestataires de la plateforme
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">🟢 Uptime</h4>
                <p className="text-sm text-green-700">99.98% ce mois</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">⚡ Temps de réponse</h4>
                <p className="text-sm text-blue-700">120ms moyen</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">🔥 Charge CPU</h4>
                <p className="text-sm text-orange-700">23% moyenne</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPerformanceReports;

// ===== src/pages/admin/AdminDataExports.tsx =====
import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Download, FileText, Calendar } from 'lucide-react';

const AdminDataExports: React.FC = () => {
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Download className="w-7 h-7 mr-2 text-indigo-600" />
              Exports de Données
            </h1>
            <p className="text-gray-600 mt-1">Export CSV/Excel pour analyses externes</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <FileText className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Exports personnalisés</h3>
            <p className="text-gray-600 mb-6">
              Générez des exports sur mesure pour vos analyses
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">📊 Formats</h4>
                <p className="text-sm text-indigo-700">CSV, Excel, JSON</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">🔄 Automatisés</h4>
                <p className="text-sm text-green-700">Rapports programmés</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🎯 Filtres</h4>
                <p className="text-sm text-blue-700">Période, type, statut</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDataExports;