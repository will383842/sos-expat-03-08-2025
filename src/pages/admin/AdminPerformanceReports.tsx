import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminPerformanceReports: React.FC = () => {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Performance Plateforme</h1>
        <p className="text-gray-600">MÃ©triques de performance et disponibilitÃ©</p>
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">ðŸš§ Page en cours de dÃ©veloppement</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPerformanceReports;
