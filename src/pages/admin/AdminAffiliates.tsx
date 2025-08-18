import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Handshake, TrendingUp, DollarSign } from 'lucide-react';

const AdminAffiliates: React.FC = () => {
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Handshake className="w-7 h-7 mr-2 text-indigo-600" />
              Gestion des Affiliés
            </h1>
            <p className="text-gray-600 mt-1">Programme d'affiliation et partenaires</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Programme d'affiliation</h3>
            <p className="text-gray-600 mb-6">
              Gestion des partenaires et suivi des commissions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">👥 Affiliés actifs</h4>
                <p className="text-sm text-indigo-700">12 partenaires</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">💰 Commissions</h4>
                <p className="text-sm text-green-700">2,450€ ce mois</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📈 Conversions</h4>
                <p className="text-sm text-blue-700">3.2% taux moyen</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliates;
