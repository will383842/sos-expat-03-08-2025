import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Globe,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { testNotificationSystem, sendProviderNotification } from '../../services/notificationService';

interface NotificationLog {
  id: string;
  type: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientName: string;
  recipientCountry: string;
  results: Array<{
    channel: string;
    success: boolean;
    error?: string;
  }>;
  timestamp: Date;
  success: boolean;
}

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testProviderId, setTestProviderId] = useState('');
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalNotifications: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    emailSuccess: 0,
    smsSuccess: 0,
    whatsappSuccess: 0,
    pushSuccess: 0
  });

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadNotificationLogs();
  }, [currentUser, navigate]);

  const loadNotificationLogs = async () => {
    try {
      setIsLoading(true);
      
      const notificationsQuery = query(
        collection(db, 'notification_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as NotificationLog[];
      
      setNotificationLogs(notificationsData);
      
      // Calculer les statistiques
      const totalNotifications = notificationsData.length;
      const successfulNotifications = notificationsData.filter(n => n.success).length;
      const failedNotifications = totalNotifications - successfulNotifications;
      
      let emailSuccess = 0, smsSuccess = 0, whatsappSuccess = 0, pushSuccess = 0;
      
      notificationsData.forEach(notification => {
        notification.results?.forEach(result => {
          if (result.success) {
            switch (result.channel) {
              case 'email': emailSuccess++; break;
              case 'sms': smsSuccess++; break;
              case 'whatsapp': whatsappSuccess++; break;
              case 'push': pushSuccess++; break;
            }
          }
        });
      });
      
      setStats({
        totalNotifications,
        successfulNotifications,
        failedNotifications,
        emailSuccess,
        smsSuccess,
        whatsappSuccess,
        pushSuccess
      });
      
    } catch (error) {
      console.error('Error loading notification logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotifications = async () => {
    if (!testProviderId.trim()) {
      alert('Veuillez entrer un ID de prestataire valide');
      return;
    }
    
    setIsTestingNotifications(true);
    try {
      await testNotificationSystem(testProviderId);
      alert('Test de notification envoyé avec succès ! Vérifiez les logs pour les détails.');
      setShowTestModal(false);
      setTestProviderId('');
      // Recharger les logs
      loadNotificationLogs();
    } catch (error) {
      console.error('Erreur lors du test de notification:', error);
      alert(`Erreur lors du test de notification: ${error.message}`);
    } finally {
      setIsTestingNotifications(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail size={16} className="text-blue-600" />;
      case 'sms': return <MessageSquare size={16} className="text-green-600" />;
      case 'whatsapp': return <MessageSquare size={16} className="text-green-500" />;
      case 'push': return <Smartphone size={16} className="text-purple-600" />;
      default: return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
        <CheckCircle size={12} className="mr-1" />
        Succès
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
        <XCircle size={12} className="mr-1" />
        Échec
      </span>
    );
  };

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des notifications. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Système de notifications</h1>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowTestModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send size={18} className="mr-2" />
                Tester les notifications
              </Button>
              <Button
                onClick={loadNotificationLogs}
                variant="outline"
              >
                <RefreshCw size={18} className="mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total notifications</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalNotifications}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Succès</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.successfulNotifications}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Échecs</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.failedNotifications}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taux de succès</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {stats.totalNotifications > 0 ? Math.round((stats.successfulNotifications / stats.totalNotifications) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Channel Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques par canal</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-xl font-bold text-blue-600">{stats.emailSuccess}</p>
              </div>
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">SMS</p>
                <p className="text-xl font-bold text-green-600">{stats.smsSuccess}</p>
              </div>
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="text-xl font-bold text-green-500">{stats.whatsappSuccess}</p>
              </div>
              <div className="text-center">
                <Smartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Push</p>
                <p className="text-xl font-bold text-purple-600">{stats.pushSuccess}</p>
              </div>
            </div>
          </div>

          {/* Notification Logs Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Historique des notifications</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destinataire
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Canaux
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des notifications...</p>
                      </td>
                    </tr>
                  ) : notificationLogs.length > 0 ? (
                    notificationLogs.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {notification.recipientName?.[0] || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {notification.recipientName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Globe size={12} className="mr-1" />
                                {notification.recipientCountry}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notification.type === 'call_request' 
                              ? 'bg-red-100 text-red-800'
                              : notification.type === 'call_missed'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {notification.type === 'call_request' ? 'Demande d\'appel' :
                             notification.type === 'call_missed' ? 'Appel manqué' :
                             notification.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {notification.results?.map((result, index) => (
                              <div key={index} className="flex items-center">
                                {getChannelIcon(result.channel)}
                                {result.success ? (
                                  <CheckCircle size={12} className="text-green-500 ml-1" />
                                ) : (
                                  <XCircle size={12} className="text-red-500 ml-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(notification.success)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(notification.timestamp)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Aucune notification trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Test Modal */}
        <Modal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
          title="Tester le système de notifications"
          size="medium"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Test du système de notifications
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Ce test enverra une notification de démonstration au prestataire sélectionné 
                      via tous les canaux disponibles (email, SMS, WhatsApp, push).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="testProviderId" className="block text-sm font-medium text-gray-700 mb-1">
                ID du prestataire à tester
              </label>
              <input
                id="testProviderId"
                type="text"
                value={testProviderId}
                onChange={(e) => setTestProviderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Entrez l'ID du prestataire (ex: user123)"
              />
              <p className="text-xs text-gray-500 mt-1">
                L'ID doit correspondre à un prestataire existant dans la base de données
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowTestModal(false)}
                variant="outline"
                disabled={isTestingNotifications}
              >
                Annuler
              </Button>
              <Button
                onClick={handleTestNotifications}
                className="bg-purple-600 hover:bg-purple-700"
                loading={isTestingNotifications}
                disabled={!testProviderId.trim()}
              >
                <Send size={16} className="mr-2" />
                Envoyer le test
              </Button>
            </div>
          </div>
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminNotifications;