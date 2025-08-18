// src/pages/admin/Users/AdminClients.tsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Users, Search, Filter, Download, Mail, Phone, MapPin, Calendar, Eye, Edit, Trash2, Ban, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import AdminLayout from '../../components/admin/AdminLayout';

interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  callsCount: number;
  totalSpent: number;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface FilterOptions {
  status: string;
  country: string;
  emailVerified: string;
  dateRange: string;
  searchTerm: string;
}

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    country: 'all',
    emailVerified: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
    thisMonth: 0
  });

  useEffect(() => {
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Construire la requête avec filtres
      let clientsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      if (filters.status !== 'all') {
        clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(clientsQuery);
      
      let clientsData: Client[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          country: data.country || '',
          city: data.city || '',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          callsCount: data.callsCount || 0,
          totalSpent: data.totalSpent || 0,
          emailVerified: data.emailVerified || false,
          phoneVerified: data.phoneVerified || false
        };
      });

      // Filtres côté client
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        clientsData = clientsData.filter(client => 
          client.firstName.toLowerCase().includes(searchLower) ||
          client.lastName.toLowerCase().includes(searchLower) ||
          client.email.toLowerCase().includes(searchLower)
        );
      }

      if (filters.country !== 'all') {
        clientsData = clientsData.filter(client => client.country === filters.country);
      }

      if (filters.emailVerified !== 'all') {
        const isVerified = filters.emailVerified === 'verified';
        clientsData = clientsData.filter(client => client.emailVerified === isVerified);
      }

      if (filters.dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        clientsData = clientsData.filter(client => client.createdAt >= filterDate);
      }

      setClients(clientsData);
      calculateStats(clientsData);
      
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (clientsData: Client[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    setStats({
      total: clientsData.length,
      active: clientsData.filter(c => c.status === 'active').length,
      suspended: clientsData.filter(c => c.status === 'suspended').length,
      pending: clientsData.filter(c => c.status === 'pending').length,
      thisMonth: clientsData.filter(c => c.createdAt >= startOfMonth).length
    });
  };

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', clientId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setClients(clients.map(client => 
        client.id === clientId ? { ...client, status: newStatus as any } : client
      ));
      
      alert(`✅ Statut client mis à jour vers "${newStatus}"`);
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('❌ Erreur lors de la mise à jour du statut');
    }
  };

  const exportClients = () => {
    const csvData = clients.map(client => ({
      ID: client.id,
      Email: client.email,
      Prénom: client.firstName,
      Nom: client.lastName,
      Téléphone: client.phone || '',
      Pays: client.country || '',
      Ville: client.city || '',
      Statut: client.status,
      'Date inscription': client.createdAt.toLocaleDateString('fr-FR'),
      'Dernière connexion': client.lastLoginAt?.toLocaleDateString('fr-FR') || 'Jamais',
      'Nb appels': client.callsCount,
      'Total dépensé': `${client.totalSpent}€`,
      'Email vérifié': client.emailVerified ? 'Oui' : 'Non',
      'Téléphone vérifié': client.phoneVerified ? 'Oui' : 'Non'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />;
      case 'suspended': return <XCircle size={16} />;
      case 'pending': return <Calendar size={16} />;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Gestion des Clients
            </h1>
            <p className="text-gray-600 mt-1">
              {stats.total} clients • {stats.active} actifs • {stats.thisMonth} ce mois
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center"
            >
              <Filter size={16} className="mr-2" />
              Filtres
            </Button>
            
            <Button
              onClick={exportClients}
              variant="outline"
              className="flex items-center"
            >
              <Download size={16} className="mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Clients</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Actifs</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Suspendus</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Ce mois</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interface simplifiée pour commencer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement des clients...</span>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Gestion des Clients</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Interface en cours de développement. {clients.length} clients trouvés.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminClients;