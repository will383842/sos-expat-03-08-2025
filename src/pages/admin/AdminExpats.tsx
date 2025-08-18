// src/pages/admin/Users/AdminExpats.tsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Globe, Search, Filter, Download, Mail, Phone, MapPin, Calendar, Eye, Edit, Star, Award, CheckCircle, XCircle, Clock, AlertTriangle, Users } from 'lucide-react';
import Button from '../../components/common/Button';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminMapVisibilityToggle from '../../components/admin/AdminMapVisibilityToggle';

interface Expat {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  city?: string;
  originCountry?: string;
  status: 'active' | 'suspended' | 'pending' | 'banned';
  validationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  lastLoginAt?: Date;
  callsCount: number;
  totalEarned: number;
  rating: number;
  reviewsCount: number;
  specialities: string[];
  languages: string[];
  expatSince?: Date;
  yearsInCountry: number;
  isVisibleOnMap: boolean;
  profileComplete: number;
  helpDomains: string[];
  description?: string;
  hourlyRate?: number;
}

interface FilterOptions {
  status: string;
  validationStatus: string;
  country: string;
  originCountry: string;
  helpDomain: string;
  dateRange: string;
  searchTerm: string;
  minRating: string;
  minYearsInCountry: string;
}

const AdminExpats: React.FC = () => {
  const [expats, setExpats] = useState<Expat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpats, setSelectedExpats] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    validationStatus: 'all',
    country: 'all',
    originCountry: 'all',
    helpDomain: 'all',
    dateRange: 'all',
    searchTerm: '',
    minRating: 'all',
    minYearsInCountry: 'all'
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    pendingValidation: 0,
    avgRating: 0,
    thisMonth: 0,
    avgYearsInCountry: 0
  });

  useEffect(() => {
    loadExpats();
  }, [filters]);

  const loadExpats = async () => {
    try {
      setLoading(true);
      
      // Requête pour récupérer les profils SOS (expatriés)
      let expatsQuery = query(
        collection(db, 'sos_profiles'),
        where('serviceType', '==', 'expat_call'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      if (filters.status !== 'all') {
        expatsQuery = query(
          collection(db, 'sos_profiles'),
          where('serviceType', '==', 'expat_call'),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(expatsQuery);
      
      let expatsData: Expat[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const expatSince = data.expatSince?.toDate() || data.movedToCountryAt?.toDate();
        const yearsInCountry = expatSince ? calculateYearsInCountry(expatSince) : (data.yearsInCountry || 0);
        
        return {
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          country: data.country || data.currentCountry || '',
          city: data.city || '',
          originCountry: data.originCountry || data.countryOfOrigin || data.nationalite || '',
          status: data.status || 'pending',
          validationStatus: data.validationStatus || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          callsCount: data.callsCount || data.completedCalls || 0,
          totalEarned: data.totalEarned || data.earnings || 0,
          rating: data.averageRating || data.rating || 0,
          reviewsCount: data.reviewsCount || data.totalReviews || 0,
          specialities: data.specialities || data.expertise || [],
          languages: data.languages || data.spokenLanguages || [],
          expatSince: expatSince,
          yearsInCountry: yearsInCountry,
          isVisibleOnMap: data.isVisibleOnMap ?? true,
          profileComplete: calculateProfileCompleteness(data),
          helpDomains: data.helpDomains || data.expertiseDomains || data.servicesOffered || [],
          description: data.description || data.bio || '',
          hourlyRate: data.hourlyRate || data.pricePerHour
        };
      });

      // Filtres côté client
      expatsData = applyClientSideFilters(expatsData);

      setExpats(expatsData);
      calculateStats(expatsData);
      
    } catch (error) {
      console.error('Erreur chargement expatriés:', error);
      alert('❌ Erreur lors du chargement des expatriés');
    } finally {
      setLoading(false);
    }
  };

  const calculateYearsInCountry = (expatSince: Date): number => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - expatSince.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(diffYears);
  };

  const calculateProfileCompleteness = (data: any): number => {
    const fields = [
      'firstName', 'lastName', 'email', 'phone', 'country', 'city', 
      'originCountry', 'helpDomains', 'languages', 'description'
    ];
    
    const completedFields = fields.filter(field => {
      const value = data[field];
      if (Array.isArray(value)) return value.length > 0;
      return value && value.toString().trim() !== '';
    }).length;
    
    return Math.round((completedFields / fields.length) * 100);
  };

  const applyClientSideFilters = (expatsData: Expat[]): Expat[] => {
    let filtered = [...expatsData];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(expat => 
        expat.firstName.toLowerCase().includes(searchLower) ||
        expat.lastName.toLowerCase().includes(searchLower) ||
        expat.email.toLowerCase().includes(searchLower) ||
        expat.country.toLowerCase().includes(searchLower) ||
        expat.originCountry?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.validationStatus !== 'all') {
      filtered = filtered.filter(expat => expat.validationStatus === filters.validationStatus);
    }

    if (filters.country !== 'all') {
      filtered = filtered.filter(expat => expat.country.toLowerCase() === filters.country.toLowerCase());
    }

    if (filters.originCountry !== 'all') {
      filtered = filtered.filter(expat => expat.originCountry?.toLowerCase() === filters.originCountry.toLowerCase());
    }

    if (filters.helpDomain !== 'all') {
      filtered = filtered.filter(expat => 
        expat.helpDomains.some(domain => 
          domain.toLowerCase().includes(filters.helpDomain.toLowerCase())
        )
      );
    }

    if (filters.minRating !== 'all') {
      const minRating = parseFloat(filters.minRating);
      filtered = filtered.filter(expat => expat.rating >= minRating);
    }

    if (filters.minYearsInCountry !== 'all') {
      const minYears = parseInt(filters.minYearsInCountry);
      filtered = filtered.filter(expat => expat.yearsInCountry >= minYears);
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
      
      filtered = filtered.filter(expat => expat.createdAt >= filterDate);
    }

    return filtered;
  };

  const calculateStats = (expatsData: Expat[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalRating = expatsData.reduce((sum, expat) => sum + expat.rating, 0);
    const avgRating = expatsData.length > 0 ? totalRating / expatsData.length : 0;
    
    const totalYears = expatsData.reduce((sum, expat) => sum + expat.yearsInCountry, 0);
    const avgYearsInCountry = expatsData.length > 0 ? totalYears / expatsData.length : 0;
    
    setStats({
      total: expatsData.length,
      active: expatsData.filter(e => e.status === 'active').length,
      pending: expatsData.filter(e => e.status === 'pending').length,
      suspended: expatsData.filter(e => e.status === 'suspended').length,
      pendingValidation: expatsData.filter(e => e.validationStatus === 'pending').length,
      avgRating: avgRating,
      thisMonth: expatsData.filter(e => e.createdAt >= startOfMonth).length,
      avgYearsInCountry: avgYearsInCountry
    });
  };

  const handleStatusChange = async (expatId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'sos_profiles', expatId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setExpats(expats.map(expat => 
        expat.id === expatId ? { ...expat, status: newStatus as any } : expat
      ));
      
      alert(`✅ Statut expatrié mis à jour vers "${newStatus}"`);
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('❌ Erreur lors de la mise à jour du statut');
    }
  };

  const handleValidationStatusChange = async (expatId: string, newValidationStatus: string) => {
    try {
      const updates: any = {
        validationStatus: newValidationStatus,
        updatedAt: new Date()
      };

      if (newValidationStatus === 'approved') {
        updates.status = 'active';
        updates.approvedAt = new Date();
      }

      await updateDoc(doc(db, 'sos_profiles', expatId), updates);
      
      setExpats(expats.map(expat => 
        expat.id === expatId 
          ? { 
              ...expat, 
              validationStatus: newValidationStatus as any,
              status: newValidationStatus === 'approved' ? 'active' : expat.status
            } 
          : expat
      ));
      
      alert(`✅ Statut de validation mis à jour vers "${newValidationStatus}"`);
    } catch (error) {
      console.error('Erreur mise à jour validation:', error);
      alert('❌ Erreur lors de la mise à jour de la validation');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedExpats.length === 0) {
      alert('Veuillez sélectionner au moins un expatrié');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir ${action} ${selectedExpats.length} expatrié(s) ?`;
    if (!confirm(confirmMessage)) return;

    try {
      const promises = selectedExpats.map(async expatId => {
        const updates: any = { updatedAt: new Date() };
        
        switch (action) {
          case 'approuver':
            updates.validationStatus = 'approved';
            updates.status = 'active';
            updates.approvedAt = new Date();
            break;
          case 'rejeter':
            updates.validationStatus = 'rejected';
            updates.status = 'suspended';
            break;
          case 'suspendre':
            updates.status = 'suspended';
            break;
          case 'activer':
            updates.status = 'active';
            break;
          default:
            return Promise.resolve();
        }
        
        return updateDoc(doc(db, 'sos_profiles', expatId), updates);
      });

      await Promise.all(promises);
      
      // Recharger les données
      await loadExpats();
      setSelectedExpats([]);
      alert(`✅ Action "${action}" appliquée à ${selectedExpats.length} expatrié(s)`);
      
    } catch (error) {
      console.error('Erreur action en lot:', error);
      alert('❌ Erreur lors de l\'action en lot');
    }
  };

  const exportExpats = () => {
    if (expats.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const csvData = expats.map(expat => ({
      ID: expat.id,
      Email: expat.email,
      Prénom: expat.firstName,
      Nom: expat.lastName,
      Téléphone: expat.phone || '',
      'Pays de résidence': expat.country,
      'Ville': expat.city || '',
      'Pays d\'origine': expat.originCountry || '',
      Statut: expat.status,
      'Statut validation': expat.validationStatus,
      'Date inscription': expat.createdAt.toLocaleDateString('fr-FR'),
      'Dernière connexion': expat.lastLoginAt?.toLocaleDateString('fr-FR') || 'Jamais',
      'Expatrié depuis': expat.expatSince?.toLocaleDateString('fr-FR') || 'Non renseigné',
      'Années dans le pays': expat.yearsInCountry,
      'Nb appels': expat.callsCount,
      'Total gagné': `${expat.totalEarned.toFixed(2)}€`,
      'Note moyenne': expat.rating.toFixed(1),
      'Nb avis': expat.reviewsCount,
      'Domaines d\'aide': expat.helpDomains.join(', '),
      'Langues': expat.languages.join(', '),
      'Profil complet': `${expat.profileComplete}%`,
      'Visible sur carte': expat.isVisibleOnMap ? 'Oui' : 'Non',
      'Tarif horaire': expat.hourlyRate ? `${expat.hourlyRate}€` : 'Non renseigné'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expatries-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'banned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />;
      case 'suspended': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'banned': return <AlertTriangle size={16} />;
      default: return null;
    }
  };

  const getProfileCompleteColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      validationStatus: 'all',
      country: 'all',
      originCountry: 'all',
      helpDomain: 'all',
      dateRange: 'all',
      searchTerm: '',
      minRating: 'all',
      minYearsInCountry: 'all'
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Globe className="w-8 h-8 mr-3 text-green-600" />
              Gestion des Expatriés
            </h1>
            <p className="text-gray-600 mt-1">
              {stats.total} expatriés • {stats.active} actifs • {stats.pendingValidation} en attente de validation
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center"
            >
              <Filter size={16} className="mr-2" />
              Filtres {Object.values(filters).some(f => f !== 'all' && f !== '') && '●'}
            </Button>
            
            <Button
              onClick={exportExpats}
              variant="outline"
              className="flex items-center"
              disabled={expats.length === 0}
            >
              <Download size={16} className="mr-2" />
              Exporter CSV ({expats.length})
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Expatriés</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Actifs</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">En validation</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingValidation}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Note moyenne</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Filtres de recherche</h3>
              <Button
                onClick={clearFilters}
                variant="outline"
                className="text-sm"
              >
                Effacer les filtres
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Nom, email, pays..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions en lot */}
        {selectedExpats.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-green-800">
                <strong>{selectedExpats.length}</strong> expatrié(s) sélectionné(s)
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={() => handleBulkAction('approuver')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Approuver
                </Button>
                <Button
                  onClick={() => handleBulkAction('rejeter')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Rejeter
                </Button>
                <Button
                  onClick={() => handleBulkAction('activer')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Activer
                </Button>
                <Button
                  onClick={() => handleBulkAction('suspendre')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Suspendre
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des expatriés */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-2 text-gray-600">Chargement des expatriés...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedExpats.length === expats.length && expats.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExpats(expats.map(e => e.id));
                          } else {
                            setSelectedExpats([]);
                          }
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expatrié
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localisation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statuts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expérience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Carte
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expats.map((expat) => (
                    <tr key={expat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedExpats.includes(expat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExpats([...selectedExpats, expat.id]);
                            } else {
                              setSelectedExpats(selectedExpats.filter(id => id !== expat.id));
                            }
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">
                              {expat.firstName.charAt(0)}{expat.lastName.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {expat.firstName} {expat.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{expat.email}</div>
                            {expat.phone && (
                              <div className="text-xs text-green-600">{expat.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-2 text-gray-400" />
                            <span className="font-medium">{expat.city ? `${expat.city}, ` : ''}{expat.country}</span>
                          </div>
                          {expat.originCountry && (
                            <div className="flex items-center text-gray-500">
                              <Globe size={14} className="mr-2 text-gray-400" />
                              <span>Origine: {expat.originCountry}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expat.status)}`}>
                            {getStatusIcon(expat.status)}
                            <span className="ml-1 capitalize">{expat.status}</span>
                          </span>
                          <br />
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getValidationStatusColor(expat.validationStatus)}`}>
                            {expat.validationStatus === 'approved' && <CheckCircle size={12} />}
                            {expat.validationStatus === 'rejected' && <XCircle size={12} />}
                            {expat.validationStatus === 'pending' && <Clock size={12} />}
                            <span className="ml-1 capitalize">{expat.validationStatus}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Star size={14} className="mr-1 text-yellow-400" />
                            <span>{expat.rating > 0 ? expat.rating.toFixed(1) : 'N/A'} ({expat.reviewsCount})</span>
                          </div>
                          <div>{expat.callsCount} appel(s)</div>
                          <div className="text-green-600 font-medium">{expat.totalEarned.toFixed(2)}€</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="font-medium text-blue-600">
                            {expat.yearsInCountry > 0 ? `${expat.yearsInCountry} an${expat.yearsInCountry > 1 ? 's' : ''}` : 'Nouveau'}
                          </div>
                          {expat.expatSince && (
                            <div className="text-xs text-gray-500">
                              Depuis {expat.expatSince.toLocaleDateString('fr-FR')}
                            </div>
                          )}
                          {expat.hourlyRate && (
                            <div className="text-xs text-green-600 font-medium">
                              {expat.hourlyRate}€/h
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className={`text-xs font-medium ${getProfileCompleteColor(expat.profileComplete)}`}>
                            {expat.profileComplete}% complet
                          </div>
                          {expat.helpDomains.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {expat.helpDomains.slice(0, 2).join(', ')}
                              {expat.helpDomains.length > 2 && '...'}
                            </div>
                          )}
                          {expat.languages.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {expat.languages.slice(0, 2).join(', ')}
                              {expat.languages.length > 2 && ` +${expat.languages.length - 2}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <AdminMapVisibilityToggle 
                          userId={expat.id}
                          className="text-xs"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            className="text-green-600 hover:text-green-900"
                            title="Voir le profil"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="text-gray-600 hover:text-gray-900"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <div className="flex flex-col space-y-1">
                            <select
                              value={expat.status}
                              onChange={(e) => handleStatusChange(expat.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-1 min-w-20"
                            >
                              <option value="active">Actif</option>
                              <option value="pending">En attente</option>
                              <option value="suspended">Suspendu</option>
                              <option value="banned">Banni</option>
                            </select>
                            <select
                              value={expat.validationStatus}
                              onChange={(e) => handleValidationStatusChange(expat.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-1 min-w-20"
                            >
                              <option value="pending">En validation</option>
                              <option value="approved">Approuvé</option>
                              <option value="rejected">Rejeté</option>
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* État vide */}
        {expats.length === 0 && !loading && (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun expatrié trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(f => f !== 'all' && f !== '') 
                ? 'Aucun expatrié ne correspond aux critères de recherche. Essayez de modifier les filtres.'
                : 'Aucun expatrié inscrit pour le moment.'
              }
            </p>
            {Object.values(filters).some(f => f !== 'all' && f !== '') && (
              <Button
                onClick={clearFilters}
                className="mt-4"
                variant="outline"
              >
                Effacer les filtres
              </Button>
            )}
          </div>
        )}

        {/* Pagination info */}
        {expats.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Affichage de <span className="font-medium">{expats.length}</span> expatrié(s)
                {Object.values(filters).some(f => f !== 'all' && f !== '') && ' (filtrés)'}
              </div>
              <div className="text-sm text-gray-500">
                Mis à jour il y a quelques secondes
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminExpats;