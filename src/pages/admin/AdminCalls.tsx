import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Calendar,
  User,
  DollarSign,
  FileText,
  RefreshCw
} from 'lucide-react';
import { collection, query, getDocs, doc, getDoc, orderBy, limit, where, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { CallRecord, Payment } from '../../types';
import { logError } from '../../utils/logging';

const AdminCalls: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [callPayment, setCallPayment] = useState<Payment | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const CALLS_PER_PAGE = 20;

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadCalls();
  }, [currentUser, navigate, selectedStatus, selectedType, page]);

  const loadCalls = async () => {
    try {
      setIsLoading(true);
      
      // Construire la requête avec filtres et pagination
      let callsQuery;
      
      // Base de la requête
      const baseQuery = collection(db, 'calls');
      
      // Appliquer les filtres
      let constraints = [orderBy('createdAt', 'desc')];
      
      if (selectedStatus !== 'all') {
        constraints.push(where('status', '==', selectedStatus));
      }
      
      if (selectedType !== 'all') {
        constraints.push(where('serviceType', '==', selectedType));
      }
      
      // Appliquer la pagination
      if (lastVisible && page > 1) {
        constraints.push(startAfter(lastVisible));
      }
      
      constraints.push(limit(CALLS_PER_PAGE));
      
      // Construire la requête finale
      callsQuery = query(baseQuery, ...constraints);
      
      const callsSnapshot = await getDocs(callsQuery);
      
      // Mettre à jour lastVisible pour la pagination
      const lastDoc = callsSnapshot.docs[callsSnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      // Vérifier s'il y a plus de résultats
      setHasMore(callsSnapshot.docs.length === CALLS_PER_PAGE);
      
      // Traiter les résultats
      const callsData = callsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        startedAt: doc.data().startedAt?.toDate(),
        endedAt: doc.data().endedAt?.toDate()
      })) as CallRecord[];
      
      // Mettre à jour la liste
      if (page === 1) {
        setCalls(callsData);
      } else {
        setCalls(prev => [...prev, ...callsData]);
      }
    } catch (error) {
      console.error('Error loading calls:', error);
      logError({
        origin: 'frontend',
        error: `Error loading calls: ${error.message}`,
        context: { component: 'AdminCalls' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCall = async (call: CallRecord) => {
    setSelectedCall(call);
    setCallPayment(null);
    setShowCallModal(true);
    
    // Charger les informations de paiement associées
    try {
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('callId', '==', call.id),
        limit(1)
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      if (!paymentsSnapshot.empty) {
        const paymentData = {
          ...paymentsSnapshot.docs[0].data(),
          id: paymentsSnapshot.docs[0].id,
          createdAt: paymentsSnapshot.docs[0].data().createdAt?.toDate() || new Date(),
          updatedAt: paymentsSnapshot.docs[0].data().updatedAt?.toDate() || new Date(),
          paidAt: paymentsSnapshot.docs[0].data().paidAt?.toDate(),
          capturedAt: paymentsSnapshot.docs[0].data().capturedAt?.toDate(),
          canceledAt: paymentsSnapshot.docs[0].data().canceledAt?.toDate(),
          refundedAt: paymentsSnapshot.docs[0].data().refundedAt?.toDate()
        } as Payment;
        
        setCallPayment(paymentData);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Terminé
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
            <Phone size={12} className="mr-1" />
            En cours
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <Clock size={12} className="mr-1" />
            En attente
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <XCircle size={12} className="mr-1" />
            Échoué
          </span>
        );
      case 'refunded':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center">
            <RefreshCw size={12} className="mr-1" />
            Remboursé
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getServiceTypeBadge = (serviceType: string) => {
    switch (serviceType) {
      case 'lawyer_call':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Avocat
          </span>
        );
      case 'expat_call':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Expatrié
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {serviceType}
          </span>
        );
    }
  };

  const filteredCalls = calls.filter(call => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      call.clientName?.toLowerCase().includes(searchLower) ||
      call.providerName?.toLowerCase().includes(searchLower) ||
      call.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des appels. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des appels</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un appel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminés</option>
                <option value="failed">Échoués</option>
                <option value="refunded">Remboursés</option>
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="lawyer_call">Appels Avocat</option>
                <option value="expat_call">Appels Expatrié</option>
              </select>
            </div>
          </div>

          {/* Calls Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prestataire
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durée
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && page === 1 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des appels...</p>
                      </td>
                    </tr>
                  ) : filteredCalls.length > 0 ? (
                    filteredCalls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {call.id ? call.id.substring(0, 8) + '...' : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {call.clientName}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {call.clientId ? call.clientId.substring(0, 8) + '...' : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {call.providerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {call.providerId ? call.providerId.substring(0, 8) + '...' : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getServiceTypeBadge(call.serviceType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(call.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {call.callDuration ? formatDuration(call.callDuration) : (call.duration ? `${call.duration} min` : 'N/A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(call.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {call.price}€
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewCall(call)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir détails"
                            >
                              <Eye size={18} />
                            </button>
                            {call.status === 'completed' && (
                              <a
                                href={`/admin/invoices/${call.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800"
                                title="Voir factures"
                              >
                                <FileText size={18} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        Aucun appel trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  fullWidth
                >
                  {isLoading ? 'Chargement...' : 'Charger plus d\'appels'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Call Details Modal */}
        <Modal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          title="Détails de l'appel"
          size="large"
        >
          {selectedCall && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Appel #{selectedCall.id.substring(0, 8)}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {getServiceTypeBadge(selectedCall.serviceType)}
                    {getStatusBadge(selectedCall.status)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{selectedCall.price}€</div>
                  <div className="text-sm text-gray-500">
                    {selectedCall.duration} minutes
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations de l'appel</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de création:</span>
                      <span className="font-medium">{formatDate(selectedCall.createdAt)}</span>
                    </div>
                    {selectedCall.startedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Début de l'appel:</span>
                        <span className="font-medium">{formatDate(selectedCall.startedAt)}</span>
                      </div>
                    )}
                    {selectedCall.endedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fin de l'appel:</span>
                        <span className="font-medium">{formatDate(selectedCall.endedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée réelle:</span>
                      <span className="font-medium">
                        {selectedCall.callDuration ? formatDuration(selectedCall.callDuration) : 'N/A'}
                      </span>
                    </div>
                    {selectedCall.callQualityScore && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Qualité de l'appel:</span>
                        <span className="font-medium">{selectedCall.callQualityScore}/10</span>
                      </div>
                    )}
                    {selectedCall.callSessionId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID de session:</span>
                        <span className="font-medium">{selectedCall.callSessionId.substring(0, 8)}...</span>
                      </div>
                    )}
                    {selectedCall.refundReason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-md">
                        <span className="text-sm font-medium text-red-700">Raison du remboursement:</span>
                        <p className="text-sm text-red-600 mt-1">{selectedCall.refundReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Participants</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Client</span>
                        <a
                          href={`/admin/users?id=${selectedCall.clientId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Voir profil
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                          {selectedCall.clientName?.[0] || 'C'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{selectedCall.clientName}</div>
                          <div className="text-xs text-gray-500">ID: {selectedCall.clientId}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Prestataire</span>
                        <a
                          href={`/admin/users?id=${selectedCall.providerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Voir profil
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                          {selectedCall.providerName?.[0] || 'P'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{selectedCall.providerName}</div>
                          <div className="text-xs text-gray-500">ID: {selectedCall.providerId}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {callPayment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations de paiement</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID de paiement:</span>
                      <span className="font-medium">{callPayment.id.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span className={`font-medium ${
                        callPayment.status === 'captured' ? 'text-green-600' :
                        callPayment.status === 'refunded' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {callPayment.status === 'captured' ? 'Capturé' :
                         callPayment.status === 'authorized' ? 'Autorisé' :
                         callPayment.status === 'refunded' ? 'Remboursé' :
                         callPayment.status === 'canceled' ? 'Annulé' :
                         callPayment.status === 'failed' ? 'Échoué' :
                         callPayment.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant total:</span>
                      <span className="font-medium">{callPayment.amount}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission plateforme:</span>
                      <span className="font-medium">{callPayment.platformFee}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant prestataire:</span>
                      <span className="font-medium">{callPayment.providerAmount}€</span>
                    </div>
                    {callPayment.stripePaymentIntentId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stripe Payment Intent:</span>
                        <span className="font-medium">{callPayment.stripePaymentIntentId.substring(0, 12)}...</span>
                      </div>
                    )}
                    {callPayment.platformInvoiceUrl && (
                      <div className="mt-3">
                        <a
                          href={callPayment.platformInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <FileText size={16} className="mr-2" />
                          Facture plateforme
                        </a>
                      </div>
                    )}
                    {callPayment.providerInvoiceUrl && (
                      <div className="mt-1">
                        <a
                          href={callPayment.providerInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <FileText size={16} className="mr-2" />
                          Facture prestataire
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setShowCallModal(false)}
                  variant="outline"
                >
                  Fermer
                </Button>
                {selectedCall.status === 'completed' && (
                  <Button
                    onClick={() => window.open(`/admin/invoices/${selectedCall.id}`, '_blank')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <FileText size={16} className="mr-2" />
                    Voir les factures
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminCalls;