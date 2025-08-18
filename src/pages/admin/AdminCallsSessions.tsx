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
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🔍 Recherche avancée</h4>
                <p className="text-sm text-blue-700">Filtres par pays, spécialité, statut</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">📊 Analytics</h4>
                <p className="text-sm text-green-700">Performances et statistiques</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">⚙️ Gestion</h4>
                <p className="text-sm text-purple-700">Activation, validation, modération</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProviders;

// ===== src/pages/admin/AdminCallsSessions.tsx =====
import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Phone, Clock, Activity } from 'lucide-react';

const AdminCallsSessions: React.FC = () => {
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Clock className="w-7 h-7 mr-2 text-green-600" />
              Sessions d'appels actives
            </h1>
            <p className="text-gray-600 mt-1">Monitoring en temps réel des sessions d'appels</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Activity className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Monitoring en temps réel</h3>
            <p className="text-gray-600 mb-6">
              Suivi des sessions d'appels en cours et historique
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">📞 Sessions actives</h4>
                <p className="text-sm text-green-700">0 appels en cours</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">⏱️ Durée moyenne</h4>
                <p className="text-sm text-blue-700">23 minutes</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">📊 Qualité</h4>
                <p className="text-sm text-purple-700">4.8/5 étoiles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCallsSessions;