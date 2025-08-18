import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Mic, Shield, Archive } from 'lucide-react';

const AdminCallsRecordings: React.FC = () => {
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Mic className="w-7 h-7 mr-2 text-purple-600" />
              Enregistrements d'appels
            </h1>
            <p className="text-gray-600 mt-1">Gestion des enregistrements et conformité RGPD</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Archive className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion des enregistrements</h3>
            <p className="text-gray-600 mb-6">
              Stockage sécurisé et conformité réglementaire
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">🔒 Sécurité</h4>
                <p className="text-sm text-purple-700">Chiffrement bout en bout</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">⏰ Rétention</h4>
                <p className="text-sm text-orange-700">Suppression automatique après 30 jours</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📋 Conformité</h4>
                <p className="text-sm text-blue-700">RGPD et réglementations locales</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCallsRecordings;