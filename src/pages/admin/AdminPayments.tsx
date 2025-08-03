import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download,
  Calendar,
  User,
  FileText,
  CreditCard
} from 'lucide-react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  orderBy, 
  limit, 
  where, 
  startAfter,
  DocumentSnapshot,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { Payment, CallRecord } from '../../types';
import { logError } from '../../utils/logging';

// Types pour les états du composant
type PaymentStatus = 'all' | 'authorized' | 'captured' | 'refunded' | 'canceled' | 'failed';

// Interface pour les données Firestore des paiements
interface FirestorePaymentData {
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; 
  paidAt?: any;
  capturedAt?: any;
  canceledAt?: any;
  refundedAt?: any;
  status: string;
  amount: number;
  currency: string;
  clientId: string;
  providerId: string;
  clientName?: string;
  providerName?: string;
  clientEmail?: string;
  providerEmail?: string;
  callId?: string;
  platformFee: number;
  providerAmount: number;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  description?: string;
  refundReason?: string;
  platformInvoiceUrl?: string;
  providerInvoiceUrl?: string;
}

// Interface pour les données Firestore des appels
interface FirestoreCallData {
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any;
  startedAt?: any;
  endedAt?: any;
  status: string;
  duration?: number;
  serviceType?: string;
}

const AdminPayments: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentCall, setPaymentCall] = useState<CallRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const PAYMENTS_PER_PAGE = 20;

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadPayments();
  }, [currentUser, navigate, selectedStatus, page]);

  const loadPayments = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Construire la requête avec filtres et pagination
      // Base de la requête
      const baseQuery = collection(db, 'payments');
      
      // Appliquer les filtres
      const constraints: any[] = [orderBy('createdAt', 'desc')];
      
      if (selectedStatus !== 'all') {
        constraints.push(where('status', '==', selectedStatus));
      }
      
      // Appliquer la pagination
      if (lastVisible && page > 1) {
        constraints.push(startAfter(lastVisible));
      }
      
      constraints.push(limit(PAYMENTS_PER_PAGE));
      
      // Construire la requête finale
      const paymentsQuery = query(baseQuery, ...constraints);
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      // Mettre à jour lastVisible pour la pagination
      const lastDoc = paymentsSnapshot.docs[paymentsSnapshot.docs.length - 1];
      setLastVisible(lastDoc || null);
      
      // Vérifier s'il y a plus de résultats
      setHasMore(paymentsSnapshot.docs.length === PAYMENTS_PER_PAGE);
      
      // Traiter les résultats
      const paymentsData: Payment[] = paymentsSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data() as FirestorePaymentData;
        return {
          ...data,
          id: docSnapshot.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          paidAt: data.paidAt?.toDate() || undefined,
          capturedAt: data.capturedAt?.toDate() || undefined,
          canceledAt: data.canceledAt?.toDate() || undefined,
          refundedAt: data.refundedAt?.toDate() || undefined
        } as Payment;
      });
      
      // Mettre à jour la liste
      if (page === 1) {
        setPayments(paymentsData);
      } else {
        setPayments(prev => [...prev, ...paymentsData]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading payments:', error);
      logError({
        origin: 'frontend',
        error: `Error loading payments: ${errorMessage}`,
        context: { component: 'AdminPayments' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPayment = async (payment: Payment): Promise<void> => {
    setSelectedPayment(payment);
    setPaymentCall(null);
    setShowPaymentModal(true);
    
    // Charger les informations d'appel associées
    if (payment.callId) {
      try {
        const callDoc = await getDoc(doc(db, 'calls', payment.callId));
        
        if (callDoc.exists()) {
          const data = callDoc.data() as FirestoreCallData;
          const callData: CallRecord = {
            ...data,
            id: callDoc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            startedAt: data.startedAt?.toDate() || undefined,
            endedAt: data.endedAt?.toDate() || undefined
          } as CallRecord;
          
          setPaymentCall(callData);
        }
      } catch (error) {
        console.error('Error loading call data:', error);
      }
    }
  };

  const handleLoadMore = (): void => {
    setPage(prev => prev + 1);
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A';
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig = {
      captured: {
        className: 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center',
        icon: <CheckCircle size={12} className="mr-1" />,
        text: 'Capturé'
      },
      authorized: {
        className: 'px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center',
        icon: <CreditCard size={12} className="mr-1" />,
        text: 'Autorisé'
      },
      refunded: {
        className: 'px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center',
        icon: <RefreshCw size={12} className="mr-1" />,
        text: 'Remboursé'
      },
      canceled: {
        className: 'px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center',
        icon: <XCircle size={12} className="mr-1" />,
        text: 'Annulé'
      },
      failed: {
        className: 'px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center',
        icon: <XCircle size={12} className="mr-1" />,
        text: 'Échoué'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      className: 'px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium',
      icon: null,
      text: status
    };

    return (
      <span className={config.className}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const filteredPayments = payments.filter((payment: Payment) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.clientName?.toLowerCase().includes(searchLower) ||
      payment.providerName?.toLowerCase().includes(searchLower) ||
      payment.id.toLowerCase().includes(searchLower) ||
      payment.stripePaymentIntentId?.toLowerCase().includes(searchLower)
    );
  });

  const getCallStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      'completed': 'Terminé',
      'in_progress': 'En cours',
      'pending': 'En attente',
      'failed': 'Échoué',
      'refunded': 'Remboursé'
    };
    
    return statusMap[status] || status;
  };

  const getCallStatusClass = (status: string): string => {
    const classMap: Record<string, string> = {
      'completed': 'text-green-600',
      'failed': 'text-red-600'
    };
    
    return classMap[status] || 'text-gray-600';
  };

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des paiements. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des paiements</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un paiement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PaymentStatus)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="authorized">Autorisés</option>
                <option value="captured">Capturés</option>
                <option value="refunded">Remboursés</option>
                <option value="canceled">Annulés</option>
                <option value="failed">Échoués</option>
              </select>
            </div>
          </div>

          {/* Payments Table */}
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
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factures
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && page === 1 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des paiements...</p>
                      </td>
                    </tr>
                  ) : filteredPayments.length > 0 ? (
                    filteredPayments.map((payment: Payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.clientName || 'Client inconnu'}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {payment.clientId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.providerName || 'Prestataire inconnu'}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {payment.providerId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.amount}€
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {payment.platformInvoiceUrl && (
                              <a
                                href={payment.platformInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Facture plateforme"
                              >
                                <FileText size={18} />
                              </a>
                            )}
                            {payment.providerInvoiceUrl && (
                              <a
                                href={payment.providerInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800"
                                title="Facture prestataire"
                              >
                                <FileText size={18} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewPayment(payment)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir détails"
                              type="button"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        Aucun paiement trouvé
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
                  {isLoading ? 'Chargement...' : 'Charger plus de paiements'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details Modal */}
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Détails du paiement"
          size="large"
        >
          {selectedPayment && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Paiement #{selectedPayment.id.substring(0, 8)}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusBadge(selectedPayment.status)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{selectedPayment.amount}€</div>
                  <div className="text-sm text-gray-500">
                    {selectedPayment.currency.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations du paiement</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de création:</span>
                      <span className="font-medium">{formatDate(selectedPayment.createdAt)}</span>
                    </div>
                    {selectedPayment.paidAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date de paiement:</span>
                        <span className="font-medium">{formatDate(selectedPayment.paidAt)}</span>
                      </div>
                    )}
                    {selectedPayment.capturedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date de capture:</span>
                        <span className="font-medium">{formatDate(selectedPayment.capturedAt)}</span>
                      </div>
                    )}
                    {selectedPayment.refundedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date de remboursement:</span>
                        <span className="font-medium">{formatDate(selectedPayment.refundedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant total:</span>
                      <span className="font-medium">{selectedPayment.amount}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commission plateforme:</span>
                      <span className="font-medium">{selectedPayment.platformFee}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant prestataire:</span>
                      <span className="font-medium">{selectedPayment.providerAmount}€</span>
                    </div>
                    {selectedPayment.stripePaymentIntentId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stripe Payment Intent:</span>
                        <span className="font-medium">{selectedPayment.stripePaymentIntentId}</span>
                      </div>
                    )}
                    {selectedPayment.stripeChargeId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stripe Charge ID:</span>
                        <span className="font-medium">{selectedPayment.stripeChargeId}</span>
                      </div>
                    )}
                    {selectedPayment.description && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Description:</span>
                        <span className="font-medium">{selectedPayment.description}</span>
                      </div>
                    )}
                    {selectedPayment.refundReason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-md">
                        <span className="text-sm font-medium text-red-700">Raison du remboursement:</span>
                        <p className="text-sm text-red-600 mt-1">{selectedPayment.refundReason}</p>
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
                          href={`/admin/users?id=${selectedPayment.clientId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Voir profil
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                          {selectedPayment.clientName?.[0] || 'C'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{selectedPayment.clientName || 'Client inconnu'}</div>
                          <div className="text-xs text-gray-500">ID: {selectedPayment.clientId}</div>
                          {selectedPayment.clientEmail && (
                            <div className="text-xs text-gray-500">Email: {selectedPayment.clientEmail}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Prestataire</span>
                        <a
                          href={`/admin/users?id=${selectedPayment.providerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Voir profil
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                          {selectedPayment.providerName?.[0] || 'P'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{selectedPayment.providerName || 'Prestataire inconnu'}</div>
                          <div className="text-xs text-gray-500">ID: {selectedPayment.providerId}</div>
                          {selectedPayment.providerEmail && (
                            <div className="text-xs text-gray-500">Email: {selectedPayment.providerEmail}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {paymentCall && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations de l'appel</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID de l'appel:</span>
                      <span className="font-medium">{paymentCall.id.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span className={`font-medium ${getCallStatusClass(paymentCall.status)}`}>
                        {getCallStatusText(paymentCall.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de création:</span>
                      <span className="font-medium">{formatDate(paymentCall.createdAt)}</span>
                    </div>
                    {paymentCall.startedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Début de l'appel:</span>
                        <span className="font-medium">{formatDate(paymentCall.startedAt)}</span>
                      </div>
                    )}
                    {paymentCall.endedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fin de l'appel:</span>
                        <span className="font-medium">{formatDate(paymentCall.endedAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée:</span>
                      <span className="font-medium">
                        {paymentCall.duration ? `${paymentCall.duration} min` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type de service:</span>
                      <span className="font-medium">
                        {paymentCall.serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <a
                        href={`/admin/calls?id=${paymentCall.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Voir les détails de l'appel
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  variant="outline"
                >
                  Fermer
                </Button>
                {selectedPayment.platformInvoiceUrl && (
                  <a
                    href={selectedPayment.platformInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    <FileText size={16} className="mr-2" />
                    Facture plateforme
                  </a>
                )}
                {selectedPayment.providerInvoiceUrl && (
                  <a
                    href={selectedPayment.providerInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    <FileText size={16} className="mr-2" />
                    Facture prestataire
                  </a>
                )}
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminPayments;