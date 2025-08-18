import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminFinancialReports: React.FC = () => {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Rapports Financiers</h1>
        <p className="text-gray-600">Analytics et rapports financiers détaillés</p>
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">🚧 Page en cours de développement</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancialReports;