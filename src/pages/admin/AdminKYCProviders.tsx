// src/pages/admin/Users/AdminKYCProviders.tsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Shield, Search, Filter, Download, FileText, Eye, CheckCircle, XCircle, Clock, AlertTriangle, User, Phone, Mail, MapPin, Camera, Upload } from 'lucide-react';
import Button from '../../components/common/Button';
import AdminLayout from '../../components/admin/AdminLayout';

interface KYCDocument {
  type: 'identity' | 'proof_address' | 'professional_document' | 'bank_statement';
  url: string;
  uploadedAt: Date;
  verified: boolean;
  rejectionReason?: string;
}

interface KYCProvider {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  city?: string;
  serviceType: 'lawyer_call' | 'expat_call';
  kycStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  documents: KYCDocument[];
  personalInfo: {
    birthDate?: Date;
    nationality?: string;
    address?: string;
    postalCode?: string;
  };
  professionalInfo: {
    barNumber?: string;
    profession?: string;
    company?: string;
    experience?: number;
  };
  bankInfo: {
    iban?: string;
    bic?: string;
    bankName?: string;
  };
  rejectionReason?: string;
  notes?: string;
}

interface FilterOptions {
  kycStatus: string;
  serviceType: string;
  country: string;
  dateRange: string;
  searchTerm: string;
  documentType: string;
}

const AdminKYCProviders: React.FC = () => {
  const [providers, setProviders] = useState<KYCProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<KYCProvider | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  
  const [filters, setFilters] = useState<FilterOptions>({
    kycStatus: 'pending',
    serviceType: 'all',
    country: 'all',
    dateRange: 'all',
    searchTerm: '',
    documentType: 'all'
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    incomplete: 0,
    thisWeek: 0
  });

  useEffect(() => {
    loadKYCProviders();
  }, [filters]);

  const loadKYCProviders = async () => {
    try {
      setLoading(true);
      
      // Requête pour récupérer les profils avec documents KYC
      let providersQuery = query(
        collection(db, 'sos_profiles'),
        where('kycStatus', '!=', null),
        orderBy('kycStatus'),
        orderBy('submittedAt', 'desc'),
        limit(100)
      );

      if (filters.kycStatus !== 'all') {
        providersQuery = query(
          collection(db, 'sos_profiles'),
          where('kycStatus', '==', filters.kycStatus),
          orderBy('submittedAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(providersQuery);
      
      let providersData: KYCProvider[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Récupérer les documents KYC depuis la sous-collection
        const documentsQuery = query(collection(db, 'sos_profiles', docSnapshot.id, 'kyc_documents'));
        const documentsSnapshot = await getDocs(documentsQuery);
        
        const documents: KYCDocument[] = documentsSnapshot.docs.map(docDoc => {
          const docData = docDoc.data();
          return {
            type: docData.type,
            url: docData.url || docData.downloadURL,
            uploadedAt: docData.uploadedAt?.toDate() || new Date(),
            verified: docData.verified || false,
            rejectionReason: docData.rejectionReason
          };
        });

        const provider: KYCProvider = {
          id: docSnapshot.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone,
          country: data.country || '',
          city: data.city,
          serviceType: data.serviceType,
          kycStatus: data.kycStatus || 'pending',
          submittedAt: data.kycSubmittedAt?.toDate() || data.submittedAt?.toDate() || new Date(),
          reviewedAt: data.kycReviewedAt?.toDate(),
          reviewedBy: data.kycReviewedBy,
          documents: documents,
          personalInfo: {
            birthDate: data.birthDate?.toDate(),
            nationality: data.nationality,
            address: data.address,
            postalCode: data.postalCode
          },
          professionalInfo: {
            barNumber: data.barNumber,
            profession: data.profession,
            company: data.company,
            experience: data.experienceYears
          },
          bankInfo: {
            iban: data.iban,
            bic: data.bic,
            bankName: data.bankName
          },
          rejectionReason: data.kycRejectionReason,
          notes: data.kycNotes
        };

        providersData.push(provider);
      }

      // Filtres côté client
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        providersData = providersData.filter(provider => 
          provider.firstName.toLowerCase().includes(searchLower) ||
          provider.lastName.toLowerCase().includes(searchLower) ||
          provider.email.toLowerCase().includes(searchLower) ||
          provider.professionalInfo.barNumber?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.serviceType !== 'all') {
        providersData = providersData.filter(provider => provider.serviceType === filters.serviceType);
      }

      if (filters.country !== 'all') {
        providersData = providersData.filter(provider => provider.country === filters.country);
      }

      if (filters.documentType !== 'all') {
        providersData = providersData.filter(provider => 
          provider.documents.some(doc => doc.type === filters.documentType)
        );
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
        
        providersData = providersData.filter(provider => provider.submittedAt >= filterDate);
      }

      setProviders(providersData);
      calculateStats(providersData);
      
    } catch (error) {
      console.error('Erreur chargement KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (providersData: KYCProvider[]) => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    setStats({
      total: providersData.length,
      pending: providersData.filter(p => p.kycStatus === 'pending').length,
      approved: providersData.filter(p => p.kycStatus === 'approved').length,
      rejected: providersData.filter(p => p.kycStatus === 'rejected').length,
      incomplete: providersData.filter(p => p.kycStatus === 'incomplete').length,
      thisWeek: providersData.filter(p => p.submittedAt >= startOfWeek).length
    });
  };

  const handleKYCStatusChange = async (providerId: string, newStatus: string, rejectionReason?: string) => {
    try {
      const updates: any = {
        kycStatus: newStatus,
        kycReviewedAt: new Date(),
        kycReviewedBy: 'admin', // À remplacer par l'ID de l'admin connecté
        updatedAt: new Date()
      };

      if (newStatus === 'rejected' && rejectionReason) {
        updates.kycRejectionReason = rejectionReason;
      }

      if (newStatus === 'approved') {
        // Si KYC approuvé, on peut aussi activer le profil
        updates.validationStatus = 'approved';
        updates.status = 'active';
      }

      await updateDoc(doc(db, 'sos_profiles', providerId), updates);
      
      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { 
              ...provider, 
              kycStatus: newStatus as any,
              reviewedAt: new Date(),
              rejectionReason: rejectionReason || provider.rejectionReason
            } 
          : provider
      ));
      
      alert(`✅ Statut KYC mis à jour vers "${newStatus}"`);
    } catch (error) {
      console.error('Erreur mise à jour KYC:', error);
      alert('❌ Erreur lors de la mise à jour du statut KYC');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedProviders.length === 0) {
      alert('Veuillez sélectionner au moins un prestataire');
      return;
    }

    let rejectionReason = '';
    if (action === 'rejeter') {
      rejectionReason = prompt('Raison du rejet:') || '';
      if (!rejectionReason) return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir ${action} ${selectedProviders.length} dossier(s) KYC ?`;
    if (!confirm(confirmMessage)) return;

    try {
      const promises = selectedProviders.map(async providerId => {
        return handleKYCStatusChange(providerId, action === 'approuver' ? 'approved' : action === 'rejeter' ? 'rejected' : 'incomplete', rejectionReason);
      });

      await Promise.all(promises);
      setSelectedProviders([]);
      alert(`✅ Action "${action}" appliquée à ${selectedProviders.length} dossier(s)`);
      
    } catch (error) {
      console.error('Erreur action en lot:', error);
      alert('❌ Erreur lors de l\'action en lot');
    }
  };

  const openDocumentModal = (provider: KYCProvider, document: KYCDocument) => {
    setSelectedProvider(provider);
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'incomplete': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKYCStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      case 'incomplete': return <AlertTriangle size={16} />;
      default: return null;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'identity': return 'Pièce d\'identité';
      case 'proof_address': return 'Justificatif domicile';
      case 'professional_document': return 'Document professionnel';
      case 'bank_statement': return 'RIB/Relevé bancaire';
      default: return type;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    return type === 'lawyer_call' ? 'Avocat' : 'Expatrié';
  };

  const getDocumentCompleteness = (documents: KYCDocument[]) => {
    const requiredDocs = ['identity', 'proof_address', 'bank_statement'];
    const availableDocs = documents.map(doc => doc.type);
    const completedCount = requiredDocs.filter(req => availableDocs.includes(req as any)).length;
    return Math.round((completedCount / requiredDocs.length) * 100);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-orange-600" />
              Validation KYC Prestataires
            </h1>
            <p className="text-gray-600 mt-1">
              {stats.total} dossiers • {stats.pending} en attente • {stats.thisWeek} cette semaine
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
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Dossiers</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">En attente</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Approuvés</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Rejetés</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Incomplets</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.incomplete}</p>
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
                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut KYC
                </label>
                <select
                  value={filters.kycStatus}
                  onChange={(e) => setFilters({...filters, kycStatus: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                  <option value="incomplete">Incomplet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de prestataire
                </label>
                <select
                  value={filters.serviceType}
                  onChange={(e) => setFilters({...filters, serviceType: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Tous types</option>
                  <option value="lawyer_call">Avocat</option>
                  <option value="expat_call">Expatrié</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de document
                </label>
                <select
                  value={filters.documentType}
                  onChange={(e) => setFilters({...filters, documentType: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">Tous documents</option>
                  <option value="identity">Pièce d'identité</option>
                  <option value="proof_address">Justificatif domicile</option>
                  <option value="professional_document">Document professionnel</option>
                  <option value="bank_statement">RIB/Relevé bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de soumission
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500"
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
        {selectedProviders.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-orange-800">
                <strong>{selectedProviders.length}</strong> dossier(s) sélectionné(s)
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={() => handleBulkAction('approuver')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Approuver KYC
                </Button>
                <Button
                  onClick={() => handleBulkAction('rejeter')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Rejeter KYC
                </Button>
                <Button
                  onClick={() => handleBulkAction('incomplete')}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Marquer incomplet
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des dossiers KYC */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-2 text-gray-600">Chargement des dossiers KYC...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut KYC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Informations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Soumis le
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProviders.includes(provider.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProviders([...selectedProviders, provider.id]);
                            } else {
                              setSelectedProviders(selectedProviders.filter(id => id !== provider.id));
                            }
                          }}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
                              {provider.firstName.charAt(0)}{provider.lastName.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provider.firstName} {provider.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{provider.email}</div>
                            {provider.phone && (
                              <div className="text-xs text-orange-600">{provider.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <User size={14} className="mr-2 text-gray-400" />
                            <span className="font-medium">{getServiceTypeLabel(provider.serviceType)}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-2 text-gray-400" />
                            <span>{provider.city ? `${provider.city}, ` : ''}{provider.country}</span>
                          </div>
                          {provider.professionalInfo.barNumber && (
                            <div className="text-xs text-blue-600">N° {provider.professionalInfo.barNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKYCStatusColor(provider.kycStatus)}`}>
                            {getKYCStatusIcon(provider.kycStatus)}
                            <span className="ml-1 capitalize">{provider.kycStatus}</span>
                          </span>
                          {provider.rejectionReason && (
                            <div className="text-xs text-red-600 max-w-xs">
                              Motif: {provider.rejectionReason}
                            </div>
                          )}
                          {provider.reviewedAt && (
                            <div className="text-xs text-gray-500">
                              Revu le {provider.reviewedAt.toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {getDocumentCompleteness(provider.documents)}% complet
                            </span>
                            <span className="text-xs text-gray-500">
                              {provider.documents.length} doc(s)
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {provider.documents.map((doc, index) => (
                              <button
                                key={index}
                                onClick={() => openDocumentModal(provider, doc)}
                                className={`text-xs px-2 py-1 rounded text-center ${
                                  doc.verified 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                }`}
                                title={getDocumentTypeLabel(doc.type)}
                              >
                                <FileText size={12} className="inline mr-1" />
                                {doc.type === 'identity' ? 'ID' :
                                 doc.type === 'proof_address' ? 'Addr' :
                                 doc.type === 'professional_document' ? 'Prof' :
                                 doc.type === 'bank_statement' ? 'Bank' : doc.type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1 text-xs">
                          {provider.personalInfo.nationality && (
                            <div>🌍 {provider.personalInfo.nationality}</div>
                          )}
                          {provider.personalInfo.birthDate && (
                            <div>📅 {provider.personalInfo.birthDate.toLocaleDateString('fr-FR')}</div>
                          )}
                          {provider.bankInfo.iban && (
                            <div className="font-mono">💳 {provider.bankInfo.iban.substring(0, 10)}...</div>
                          )}
                          {provider.professionalInfo.experience && (
                            <div>⚖️ {provider.professionalInfo.experience} ans exp.</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {provider.submittedAt.toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedProvider(provider);
                              setShowDocumentModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-900"
                            title="Voir le dossier complet"
                          >
                            <Eye size={16} />
                          </button>
                          <div className="flex flex-col space-y-1">
                            <select
                              value={provider.kycStatus}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                let rejectionReason = '';
                                if (newStatus === 'rejected') {
                                  rejectionReason = prompt('Raison du rejet:') || '';
                                  if (!rejectionReason) return;
                                }
                                handleKYCStatusChange(provider.id, newStatus, rejectionReason);
                              }}
                              className="text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="pending">En attente</option>
                              <option value="approved">Approuvé</option>
                              <option value="rejected">Rejeté</option>
                              <option value="incomplete">Incomplet</option>
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

        {providers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun dossier KYC trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun dossier ne correspond aux critères de recherche.
            </p>
          </div>
        )}

        {/* Modal de visualisation des documents */}
        {showDocumentModal && selectedProvider && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Dossier KYC - {selectedProvider.firstName} {selectedProvider.lastName}
                </h3>
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedProvider(null);
                    setSelectedDocument(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations personnelles */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Informations personnelles</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Email:</strong> {selectedProvider.email}</div>
                      <div><strong>Téléphone:</strong> {selectedProvider.phone || 'Non renseigné'}</div>
                      <div><strong>Nationalité:</strong> {selectedProvider.personalInfo.nationality || 'Non renseignée'}</div>
                      <div><strong>Date de naissance:</strong> {selectedProvider.personalInfo.birthDate?.toLocaleDateString('fr-FR') || 'Non renseignée'}</div>
                      <div><strong>Adresse:</strong> {selectedProvider.personalInfo.address || 'Non renseignée'}</div>
                      <div><strong>Code postal:</strong> {selectedProvider.personalInfo.postalCode || 'Non renseigné'}</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Informations professionnelles</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Type:</strong> {getServiceTypeLabel(selectedProvider.serviceType)}</div>
                      <div><strong>Profession:</strong> {selectedProvider.professionalInfo.profession || 'Non renseignée'}</div>
                      {selectedProvider.professionalInfo.barNumber && (
                        <div><strong>N° Barreau:</strong> {selectedProvider.professionalInfo.barNumber}</div>
                      )}
                      <div><strong>Entreprise:</strong> {selectedProvider.professionalInfo.company || 'Non renseignée'}</div>
                      <div><strong>Expérience:</strong> {selectedProvider.professionalInfo.experience || 0} ans</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Informations bancaires</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>IBAN:</strong> {selectedProvider.bankInfo.iban || 'Non renseigné'}</div>
                      <div><strong>BIC:</strong> {selectedProvider.bankInfo.bic || 'Non renseigné'}</div>
                      <div><strong>Banque:</strong> {selectedProvider.bankInfo.bankName || 'Non renseignée'}</div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Documents fournis</h4>
                    <div className="space-y-3">
                      {selectedProvider.documents.length > 0 ? (
                        selectedProvider.documents.map((doc, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-sm">{getDocumentTypeLabel(doc.type)}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                doc.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {doc.verified ? 'Vérifié' : 'En attente'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              Envoyé le {doc.uploadedAt.toLocaleDateString('fr-FR')}
                            </div>
                            {doc.rejectionReason && (
                              <div className="text-xs text-red-600 mb-2">
                                Rejeté: {doc.rejectionReason}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(doc.url, '_blank')}
                                className="flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                <Eye size={12} className="mr-1" />
                                Voir
                              </button>
                              <button
                                onClick={() => {
                                  // Logique pour marquer le document comme vérifié
                                  console.log('Marquer comme vérifié:', doc);
                                }}
                                className="flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                <CheckCircle size={12} className="mr-1" />
                                Valider
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          Aucun document fourni
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes administratives */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Notes administratives</h4>
                    <textarea
                      placeholder="Ajouter des notes sur ce dossier..."
                      value={selectedProvider.notes || ''}
                      onChange={(e) => {
                        // Logique pour sauvegarder les notes
                        console.log('Notes:', e.target.value);
                      }}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  {/* Actions rapides */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => handleKYCStatusChange(selectedProvider.id, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approuver KYC
                    </Button>
                    <Button
                      onClick={() => {
                        const reason = prompt('Raison du rejet:');
                        if (reason) {
                          handleKYCStatusChange(selectedProvider.id, 'rejected', reason);
                        }
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle size={16} className="mr-2" />
                      Rejeter KYC
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminKYCProviders; py-3 text-left">
     