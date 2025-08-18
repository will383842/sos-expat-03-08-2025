// src/pages/admin/Users/AdminLawyers.tsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Shield, Search, Filter, Download, Mail, Phone, MapPin, Calendar, Eye, Edit, Star, Award, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import Button from '../../components/common/Button';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminMapVisibilityToggle from '../../components/admin/AdminMapVisibilityToggle';

interface Lawyer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  city?: string;
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
  barNumber?: string;
  experience: number;
  isVisibleOnMap: boolean;
  profileComplete: number;
}

interface FilterOptions {
  status: string;
  validationStatus: string;
  country: string;
  speciality: string;
  dateRange: string;
  searchTerm: string;
  minRating: string;
}

const AdminLawyers: React.FC = () => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLawyers, setSelectedLawyers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    validationStatus: 'all',
    country: 'all',
    speciality: 'all',
    dateRange: 'all',
    searchTerm: '',
    minRating: 'all'
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    pendingValidation: 0,
    avgRating: 0,
    thisMonth: 0
  });

  useEffect(() => {
    loadLawyers();
  }, [filters]);

  const loadLawyers = async () => {
    try {
      setLoading(true);
      
      // Requête pour récupérer les profils SOS (avocats)
      let lawyersQuery = query(
        collection(db, 'sos_profiles'),
        where('serviceType', '==', 'lawyer_call'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      if (filters.status !== 'all') {
        lawyersQuery = query(
          collection(db, 'sos_profiles'),
          where('serviceType', '==', 'lawyer_call'),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(lawyersQuery);
      
      let lawyersData: Lawyer[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          country: data.country || '',
          city: data.city || '',
          status: data.status || 'pending',
          validationStatus: data.validationStatus || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          callsCount: data.callsCount || 0,
          totalEarned: data.totalEarned || 0,
          rating: data.averageRating || 0,
          reviewsCount: data.reviewsCount || 0,
          specialities: data.specialities || [],
          languages: data.languages || [],
          barNumber: data.barNumber || '',
          experience: data.experienceYears || 0,
          isVisibleOnMap: data.isVisibleOnMap ?? true,
          profileComplete: calculateProfileCompleteness(data)
        };
      });

      // Filtres côté client
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        lawyersData = lawyersData.filter(lawyer => 
          lawyer.firstName.toLowerCase().includes(searchLower) ||
          lawyer.lastName.toLowerCase().includes(searchLower) ||
          lawyer.email.toLowerCase().includes(searchLower) ||
          lawyer.barNumber?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.validationStatus !== 'all') {
        lawyersData = lawyersData.filter(lawyer => lawyer.validationStatus === filters.validationStatus);
      }

      if (filters.country !== 'all') {
        lawyersData = lawyersData.filter(lawyer => lawyer.country === filters.country);
      }

      if (filters.speciality !== 'all') {
        lawyersData = lawyersData.filter(lawyer => 
          lawyer.specialities.some(spec => spec.toLowerCase().includes(filters.speciality.toLowerCase()))
        );
      }

      if (filters.minRating !== 'all') {
        const minRating = parseFloat(filters.minRating);
        lawyersData = lawyersData.filter(lawyer => lawyer.rating >= minRating);
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
        
        lawyersData = lawyersData.filter(lawyer => lawyer.createdAt >= filterDate);
      }

      setLawyers(lawyersData);
      calculateStats(lawyersData);
      
    } catch (error) {
      console.error('Erreur chargement avocats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = (data: any): number => {
    const fields = [
      'firstName', 'lastName', 'email', 'phone', 'country', 'city',
      'specialities', 'languages', 'barNumber', 'experienceYears',
      'education', 'description'
    ];
    
    const completedFields = fields.filter(field => {
      const value = data[field];
      if (Array.isArray(value)) return value.length > 0;
      return value && value.toString().trim() !== '';
    }).length;
    
    return Math.round((completedFields / fields.length) * 100);
  };

  const calculateStats = (lawyersData: Lawyer[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalRating = lawyersData.reduce((sum, lawyer) => sum + lawyer.rating, 0);
    const avgRating = lawyersData.length > 0 ? totalRating / lawyersData.length : 0;
    
    setStats({
      total: lawyersData.length,
      active: lawyersData.filter(l => l.status === 'active').length,
      pending: lawyersData.filter(l => l.status === 'pending').length,
      suspended: lawyersData.filter(l => l.status === 'suspended').length,
      pendingValidation: lawyersData.filter(l => l.validationStatus === 'pending').length,
      avgRating: avgRating,
      thisMonth: lawyersData.filter(l => l.createdAt >= startOfMonth).length
    });
  };

  const handleStatusChange = async (lawyerId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'sos_profiles', lawyerId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setLawyers(lawyers.map(lawyer => 
        lawyer.id === lawyerId ? { ...lawyer, status: newStatus as any } : lawyer
      ));
      
      alert(`✅ Statut avocat mis à jour vers "${newStatus}"`);
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('❌ Erreur lors de la mise à jour du statut');
    }
  };

  const handleValidationStatusChange = async (lawyerId: string, newValidationStatus: string) => {
    try {
      const updates: any = {
        validationStatus: newValidationStatus,
        updatedAt: new Date()
      };

      // Si approuvé, mettre automatiquement le statut à actif
      if (newValidationStatus === 'approved') {
        updates.status = 'active';
        updates.approvedAt = new Date();
      }

      await updateDoc(doc(db, 'sos_profiles', lawyerId), updates);
      
      setLawyers(lawyers.map(lawyer => 
        lawyer.id === lawyerId 
          ? { 
              ...lawyer, 
              validationStatus: newValidationStatus as any,
              status: newValidationStatus === 'approved' ? 'active' : lawyer.status
            } 
          : lawyer
      ));
      
      alert(`✅ Statut de validation mis à jour vers "${newValidationStatus}"`);
    } catch (error) {
      console.error('Erreur mise à jour validation:', error);
      alert('❌ Erreur lors de la mise à jour de la validation');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedLawyers.length === 0) {
      alert('Veuillez sélectionner au moins un avocat');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir ${action} ${selectedLawyers.length} avocat(s) ?`;
    if (!confirm(confirmMessage)) return;

    try {
      const promises = selectedLawyers.map(async lawyerId => {
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
            return;
        }
        
        return updateDoc(doc(db, 'sos_profiles', lawyerId), updates);
      });

      await Promise.all(promises);
      
      // Recharger les données
      loadLawyers();
      setSelectedLawyers([]);
      alert(`✅ Action "${action}" appliquée à ${selectedLawyers.length} avocat(s)`);
      
    } catch (error) {
      console.error('Erreur action en lot:', error);
      alert('❌ Erreur lors de l\'action en lot');
    }
  };

  const exportLawyers = () => {
    const csvData = lawyers.map(lawyer => ({
      ID: lawyer.id,
      Email: lawyer.email,
      Prénom: lawyer.firstName,
      Nom: lawyer.lastName,
      Téléphone: lawyer.phone || '',
      Pays: lawyer.country,
      Ville: lawyer.city || '',
      Statut: lawyer.status,
      'Statut validation': lawyer.validationStatus,
      'Numéro barreau': lawyer.barNumber || '',
      'Date inscription': lawyer.createdAt.toLocaleDateString('fr-FR'),
      'Dernière connexion': lawyer.lastLoginAt?.toLocaleDateString('fr-FR') || 'Jamais',
      'Nb appels': lawyer.callsCount,
      'Total gagné': `${lawyer.totalEarned}€`,
      'Note moyenne': lawyer.rating.toFixed(1),
      'Nb avis': lawyer.reviewsCount,
      'Spécialités': lawyer.specialities.join(', '),
      'Langues': lawyer.languages.join(', '),
      'Expérience': `${lawyer.experience} ans`,
      'Profil complet': `${lawyer.profileComplete}%`,
      'Visible sur carte': lawyer.isVisibleOnMap ? 'Oui' : 'Non'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avocats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-blue-600" />
              Gestion des Avocats
            </h1>
            <p className="text-gray-600 mt-1">
              {stats.total} avocats • {stats.active} actifs • {stats.pendingValidation} en attente de validation
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
              onClick={exportLawyers}
              variant="outline"
              className="flex items-center"
            >
              <Download size={16} className="mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Avocats</h3>
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
            <h3 className="text-lg font-semibold mb-4">Filtres de recherche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Nom, email, n° barreau..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="pending">En attente</option>
                  <option value="suspended">Suspendu</option>
                  <option value="banned">Banni</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validation
                </label>
                <select
                  value={filters.validationStatus}
                  onChange={(e) => setFilters({...filters, validationStatus: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes validations</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pays
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters({...filters, country: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les pays</option>
                  <option value="france">France</option>
                  <option value="canada">Canada</option>
                  <option value="belgium">Belgique</option>
                  <option value="switzerland">Suisse</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note minimum
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({...filters, minRating: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les notes</option>
                  <option value="4.5">4.5+ étoiles</option>
                  <option value="4.0">4.0+ étoiles</option>
                  <option value="3.5">3.5+ étoiles</option>
                  <option value="3.0">3.0+ étoiles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période d'inscription
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les périodes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions en lot */}
        {selectedLawyers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-blue-800">
                <strong>{selectedLawyers.length}</strong> avocat(s) sélectionné(s)
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

        {/* Tableau des avocats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement des avocats...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLawyers.length === lawyers.length && lawyers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLawyers(lawyers.map(l => l.id));
                          } else {
                            setSelectedLawyers([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avocat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
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
                  {lawyers.map((lawyer) => (
                    <tr key={lawyer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLawyers.includes(lawyer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLawyers([...selectedLawyers, lawyer.id]);
                            } else {
                              setSelectedLawyers(selectedLawyers.filter(id => id !== lawyer.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                              {lawyer.firstName.charAt(0)}{lawyer.lastName.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lawyer.firstName} {lawyer.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{lawyer.email}</div>
                            {lawyer.barNumber && (
                              <div className="text-xs text-blue-600">N° {lawyer.barNumber}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Mail size={14} className="mr-2 text-gray-400" />
                            <span className="text-green-600">Vérifié</span>
                          </div>
                          {lawyer.phone && (
                            <div className="flex items-center">
                              <Phone size={14} className="mr-2 text-gray-400" />
                              <span>{lawyer.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-2 text-gray-400" />
                          <span>{lawyer.city ? `${lawyer.city}, ` : ''}{lawyer.country}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lawyer.status)}`}>
                            {getStatusIcon(lawyer.status)}
                            <span className="ml-1 capitalize">{lawyer.status}</span>
                          </span>
                          <br />
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getValidationStatusColor(lawyer.validationStatus)}`}>
                            {lawyer.validationStatus === 'approved' && <CheckCircle size={12} />}
                            {lawyer.validationStatus === 'rejected' && <XCircle size={12} />}
                            {lawyer.validationStatus === 'pending' && <Clock size={12} />}
                            <span className="ml-1 capitalize">{lawyer.validationStatus}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Star size={14} className="mr-1 text-yellow-400" />
                            <span>{lawyer.rating.toFixed(1)} ({lawyer.reviewsCount})</span>
                          </div>
                          <div>{lawyer.callsCount} appel(s)</div>
                          <div className="text-green-600 font-medium">{lawyer.totalEarned.toFixed(2)}€</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className={`font-medium ${getProfileCompleteColor(lawyer.profileComplete)}`}>
                            {lawyer.profileComplete}% complet
                          </div>
                          <div className="text-xs text-gray-500">
                            {lawyer.experience} ans d'exp.
                          </div>
                          {lawyer.specialities.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {lawyer.specialities.slice(0, 2).join(', ')}
                              {lawyer.specialities.length > 2 && '...'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <AdminMapVisibilityToggle 
                          userId={lawyer.id}
                          className="text-xs"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye size={16} />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Edit size={16} />
                          </button>
                          <div className="flex flex-col space-y-1">
                            <select
                              value={lawyer.status}
                              onChange={(e) => handleStatusChange(lawyer.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="active">Actif</option>
                              <option value="pending">En attente</option>
                              <option value="suspended">Suspendu</option>
                              <option value="banned">Banni</option>
                            </select>
                            <select
                              value={lawyer.validationStatus}
                              onChange={(e) => handleValidationStatusChange(lawyer.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-1"
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

        {lawyers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun avocat trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun avocat ne correspond aux critères de recherche.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLawyers;