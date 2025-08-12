import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Flag,
  MessageSquare,
  User,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

interface Report {
  id: string;
  type: 'review' | 'user' | 'content' | 'contact';
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'review' | 'user' | 'call' | 'message' | 'contact';
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  adminNotes?: string;
  // Champs spécifiques aux messages de contact
  firstName?: string;
  lastName?: string;
  email?: string;
  subject?: string;
  category?: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

const AdminReports: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadReports();
    loadContactMessages();
  }, [currentUser, navigate, selectedStatus]);

  const loadContactMessages = async () => {
    try {
      const contactQuery = query(
        collection(db, 'contact_messages'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const contactSnapshot = await getDocs(contactQuery);
      
      const contactReports = contactSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'contact' as const,
        reporterId: 'system',
        reporterName: 'Système',
        targetId: doc.id,
        targetType: 'contact' as const,
        reason: 'Message de contact',
        details: doc.data().message || '',
        status: doc.data().status === 'resolved' ? 'resolved' : 'pending' as const,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().createdAt?.toDate() || new Date(),
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        email: doc.data().email,
        subject: doc.data().subject,
        category: doc.data().category,
        message: doc.data().message,
        priority: doc.data().priority || 'normal'
      }));
      
      setReports(prev => [...prev, ...contactReports]);
    } catch (error) {
      console.error('Error loading contact messages:', error);
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      
      const mockReports: Report[] = [
        {
          id: '1',
          type: 'review',
          reporterId: 'user123',
          reporterName: 'Jean Dupont',
          targetId: 'review456',
          targetType: 'review',
          reason: 'Contenu inapproprié',
          details: 'Cet avis contient des propos offensants et des insultes.',
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ];
      
      let filteredReports = mockReports;
      if (selectedStatus !== 'all') {
        filteredReports = mockReports.filter(report => report.status === selectedStatus);
      }
      
      setReports(filteredReports);
      
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || '');
    setShowReportModal(true);
  };

  const handleResolveReport = async () => {
    if (!selectedReport) return;
    
    try {
      setIsActionLoading(true);
      
      if (selectedReport.type === 'contact') {
        await updateDoc(doc(db, 'contact_messages', selectedReport.id), {
          status: 'resolved',
          resolvedAt: serverTimestamp(),
          resolvedBy: currentUser?.id,
          response: adminNotes,
          updatedAt: serverTimestamp()
        });
        
        // Envoyer email de réponse (simulation)
        console.log('Email envoyé à:', selectedReport.email);
      }
      
      setReports(prev => 
        prev.map(report => 
          report.id === selectedReport.id 
            ? { 
                ...report, 
                status: 'resolved', 
                resolvedAt: new Date(), 
                resolvedBy: currentUser?.id, 
                adminNotes: adminNotes,
                updatedAt: new Date() 
              }
            : report
        )
      );
      
      setShowReportModal(false);
      setSelectedReport(null);
      
      alert('Message traité avec succès');
      
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Erreur lors du traitement du message');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Résolu
          </span>
        );
      case 'dismissed':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center">
            <XCircle size={12} className="mr-1" />
            Ignoré
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            En attente
          </span>
        );
    }
  };

  const getTargetTypeBadge = (targetType: string) => {
    switch (targetType) {
      case 'contact':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
            <Mail size={12} className="mr-1" />
            Contact
          </span>
        );
      case 'review':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center">
            <Star size={12} className="mr-1" />
            Avis
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            {targetType}
          </span>
        );
    }
  };

  const filteredReports = reports.filter(report => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      report.reporterName?.toLowerCase().includes(searchLower) ||
      report.reason?.toLowerCase().includes(searchLower) ||
      report.details?.toLowerCase().includes(searchLower) ||
      report.email?.toLowerCase().includes(searchLower) ||
      report.subject?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des signalements. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Messages de contact et signalements</h1>
            <div className="flex items-center space-x-4">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </form>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="resolved">Résolus</option>
                <option value="dismissed">Ignorés</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expéditeur
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sujet
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement...</p>
                      </td>
                    </tr>
                  ) : filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {report.firstName?.[0] || report.reporterName?.[0] || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {report.firstName && report.lastName 
                                  ? `${report.firstName} ${report.lastName}`
                                  : report.reporterName || 'Utilisateur'
                                }
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.email || report.reporterId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTargetTypeBadge(report.targetType)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 line-clamp-2">
                            {report.subject || report.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewReport(report)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Voir détails"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Aucun message trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Détails du message"
          size="large"
        >
          {selectedReport && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedReport.type === 'contact' ? 'Message de contact' : `Signalement #${selectedReport.id.substring(0, 8)}`}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {getTargetTypeBadge(selectedReport.targetType)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Reçu le {formatDate(selectedReport.createdAt)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations de l'expéditeur</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Nom</h5>
                      <div className="text-sm font-medium">
                        {selectedReport.firstName && selectedReport.lastName 
                          ? `${selectedReport.firstName} ${selectedReport.lastName}`
                          : selectedReport.reporterName || 'Non spécifié'
                        }
                      </div>
                    </div>
                    
                    {selectedReport.email && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Email</h5>
                        <div className="text-sm text-gray-700">{selectedReport.email}</div>
                      </div>
                    )}
                    
                    {selectedReport.category && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Catégorie</h5>
                        <div className="text-sm text-gray-700">{selectedReport.category}</div>
                      </div>
                    )}
                    
                    {selectedReport.priority && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Priorité</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedReport.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          selectedReport.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedReport.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedReport.priority}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Contenu du message</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {selectedReport.subject && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Sujet</h5>
                        <p className="text-sm text-gray-700">{selectedReport.subject}</p>
                      </div>
                    )}
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Message</h5>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {selectedReport.message || selectedReport.details}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedReport.status === 'pending' && (
                <div>
                  <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Réponse
                  </label>
                  <textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Rédigez votre réponse..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setShowReportModal(false)}
                  variant="outline"
                >
                  Fermer
                </Button>
                
                {selectedReport.status === 'pending' && (
                  <Button
                    onClick={handleResolveReport}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isActionLoading}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Marquer comme traité
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

export default AdminReports;

