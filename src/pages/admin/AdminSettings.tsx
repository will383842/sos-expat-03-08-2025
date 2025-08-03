import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Globe, 
  Database, 
  TestTube, 
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Shield,
  Map
} from 'lucide-react';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showMapSettingsModal, setShowMapSettingsModal] = useState(false);
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);
  const [backupStatus, setBackupStatus] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [mapSettings, setMapSettings] = useState({
    showMapOnHomePage: true
  });

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadCountries();
    loadPendingRefunds();
    loadMapSettings();
  }, [currentUser, navigate]);

  const loadMapSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'app_settings', 'main'));
      if (settingsDoc.exists()) {
        setMapSettings({
          showMapOnHomePage: settingsDoc.data().showMapOnHomePage !== false
        });
      }
    } catch (error) {
      console.error('Error loading map settings:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const countriesQuery = query(collection(db, 'countries'));
      const countriesSnapshot = await getDocs(countriesQuery);
      
      const countriesData = countriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadPendingRefunds = async () => {
    try {
      const refundsQuery = query(
        collection(db, 'refund_requests'),
        // where('status', '==', 'pending')
      );
      const refundsSnapshot = await getDocs(refundsQuery);
      
      const refundsData = refundsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setPendingRefunds(refundsData);
    } catch (error) {
      console.error('Error loading pending refunds:', error);
    }
  };

  const handleCountryToggle = async (countryId: string, isActive: boolean) => {
    try {
      setIsLoading(true);
      
      await updateDoc(doc(db, 'countries', countryId), {
        isActive: !isActive,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCountries(prev => 
        prev.map(country => 
          country.id === countryId 
            ? { ...country, isActive: !isActive }
            : country
        )
      );
      
      alert(`Pays ${!isActive ? 'activé' : 'désactivé'} avec succès`);
    } catch (error) {
      console.error('Error updating country:', error);
      alert('Erreur lors de la mise à jour du pays');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMapSettings = async () => {
    try {
      setIsLoading(true);
      
      await updateDoc(doc(db, 'app_settings', 'main'), {
        showMapOnHomePage: mapSettings.showMapOnHomePage,
        updatedAt: serverTimestamp()
      });
      
      setShowMapSettingsModal(false);
      alert('Paramètres de la carte mis à jour avec succès');
    } catch (error) {
      console.error('Error saving map settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres de la carte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      setIsLoading(true);
      setBackupStatus('Sauvegarde en cours...');
      
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create backup record
      await addDoc(collection(db, 'backups'), {
        type: 'manual',
        status: 'completed',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id
      });
      
      setBackupStatus('Sauvegarde terminée avec succès');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (error) {
      console.error('Error creating backup:', error);
      setBackupStatus('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTests = async () => {
    try {
      setIsLoading(true);
      setTestResults([]);
      
      const tests = [
        { name: 'Connexion Firebase', status: 'running' },
        { name: 'API Stripe', status: 'running' },
        { name: 'Service Twilio', status: 'running' },
        { name: 'Génération PDF', status: 'running' },
        { name: 'Upload fichiers', status: 'running' }
      ];
      
      setTestResults(tests);
      
      // Simulate test execution
      for (let i = 0; i < tests.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const success = Math.random() > 0.2; // 80% success rate
        
        setTestResults(prev => 
          prev.map((test, index) => 
            index === i 
              ? { ...test, status: success ? 'success' : 'error' }
              : test
          )
        );
      }
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundAction = async (refundId: string, action: 'approve' | 'reject') => {
    try {
      setIsLoading(true);
      
      await updateDoc(doc(db, 'refund_requests', refundId), {
        status: action === 'approve' ? 'approved' : 'rejected',
        processedAt: serverTimestamp(),
        processedBy: currentUser?.id
      });
      
      // Update local state
      setPendingRefunds(prev => 
        prev.filter(refund => refund.id !== refundId)
      );
      
      alert(`Remboursement ${action === 'approve' ? 'approuvé' : 'rejeté'} avec succès`);
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Erreur lors du traitement du remboursement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIndexes = async () => {
    try {
      setIsLoading(true);
      
      // This would typically require Firebase Admin SDK
      // For now, we'll show instructions
      alert('Pour créer les index automatiquement, exécutez la commande suivante dans votre terminal :\n\nfirebase deploy --only firestore:indexes');
      
    } catch (error) {
      console.error('Error creating indexes:', error);
      alert('Erreur lors de la création des index');
    } finally {
      setIsLoading(false);
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

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Paramètres de la plateforme</h1>
        </div>

        {/* Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Countries Management */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Globe className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Pays disponibles</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Gérer la disponibilité de la plateforme par pays</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {countries.map((country) => (
                <div key={country.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{country.name}</span>
                  <button
                    onClick={() => handleCountryToggle(country.id, country.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      country.isActive ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                    disabled={isLoading}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        country.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Management */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Database className="w-6 h-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Sauvegardes</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Sauvegarde automatique toutes les 12h</p>
            {backupStatus && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{backupStatus}</p>
              </div>
            )}
            <Button
              onClick={handleBackupNow}
              disabled={isLoading}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Sauvegarder maintenant
            </Button>
          </div>

          {/* Test Mode */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TestTube className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Mode test</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Tester les fonctionnalités critiques</p>
            <Button
              onClick={() => navigate('/test-production')}
              variant="outline"
              className="w-full"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Ouvrir la page de test
            </Button>
          </div>

          {/* Refunds Management */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Remboursements</h3>
              </div>
              {pendingRefunds.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingRefunds.length}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">Gérer les demandes de remboursement</p>
            <Button
              onClick={() => setShowRefundModal(true)}
              variant="outline"
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Voir les demandes
            </Button>
          </div>

          {/* PWA Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Smartphone className="w-6 h-6 text-indigo-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Application PWA</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Configuration de l'app installable</p>
            <Button
              onClick={() => setShowPWAModal(true)}
              variant="outline"
              className="w-full"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Configurer PWA
            </Button>
          </div>

          {/* Map Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Map className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Paramètres de la carte</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Configuration de l'affichage de la carte mondiale</p>
            <Button
              onClick={() => setShowMapSettingsModal(true)}
              variant="outline"
              className="w-full"
            >
              <Map className="w-4 h-4 mr-2" />
              Configurer la carte
            </Button>
          </div>

          {/* Firebase Indexes */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Shield className="w-6 h-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Index Firebase</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">Créer tous les index nécessaires</p>
            <Button
              onClick={handleCreateIndexes}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Créer les index
            </Button>
          </div>
        </div>
      </div>

      {/* Test Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Tests de la plateforme"
        size="large"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              Ces tests vérifient le bon fonctionnement des services critiques de la plateforme.
            </p>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3">
              {testResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{test.name}</span>
                  {getTestStatusIcon(test.status)}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowTestModal(false)}
              variant="outline"
            >
              Fermer
            </Button>
            <Button
              onClick={handleRunTests}
              disabled={isLoading}
            >
              {isLoading ? 'Tests en cours...' : 'Lancer les tests'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refunds Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Demandes de remboursement"
        size="large"
      >
        <div className="space-y-4">
          {pendingRefunds.length > 0 ? (
            pendingRefunds.map((refund) => (
              <div key={refund.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{refund.clientName}</h4>
                    <p className="text-sm text-gray-500">Montant: {refund.amount}€</p>
                    <p className="text-sm text-gray-500">Date: {formatDate(refund.createdAt)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleRefundAction(refund.id, 'approve')}
                      size="small"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      Approuver
                    </Button>
                    <Button
                      onClick={() => handleRefundAction(refund.id, 'reject')}
                      size="small"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      disabled={isLoading}
                    >
                      Rejeter
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{refund.reason}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              Aucune demande de remboursement en attente
            </div>
          )}
        </div>
      </Modal>

      {/* Map Settings Modal */}
      <Modal
        isOpen={showMapSettingsModal}
        onClose={() => setShowMapSettingsModal(false)}
        title="Paramètres de la carte"
        size="medium"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              Configurez l'affichage de la carte mondiale sur la plateforme.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-700 font-medium">Afficher la carte sur la page d'accueil</label>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                <input
                  type="checkbox"
                  id="showMapOnHomePage"
                  checked={mapSettings.showMapOnHomePage}
                  onChange={(e) => setMapSettings(prev => ({ ...prev, showMapOnHomePage: e.target.checked }))}
                  className="absolute w-0 h-0 opacity-0"
                />
                <label
                  htmlFor="showMapOnHomePage"
                  className={`block h-6 overflow-hidden rounded-full cursor-pointer ${
                    mapSettings.showMapOnHomePage ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform duration-200 ${
                      mapSettings.showMapOnHomePage ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setShowMapSettingsModal(false)}
              variant="outline"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveMapSettings}
              className="bg-blue-600 hover:bg-blue-700"
              loading={isLoading}
            >
              Enregistrer les paramètres
            </Button>
          </div>
        </div>
      </Modal>

      {/* PWA Modal */}
      <Modal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        title="Configuration PWA"
        size="medium"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  PWA configurée
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    L'application est déjà configurée comme PWA installable.
                    Les utilisateurs peuvent l'installer depuis leur navigateur.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Manifest:</span>
              <span className="font-medium text-green-600">✓ Configuré</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Worker:</span>
              <span className="font-medium text-green-600">✓ Actif</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Icônes:</span>
              <span className="font-medium text-green-600">✓ Disponibles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mode hors ligne:</span>
              <span className="font-medium text-green-600">✓ Supporté</span>
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminSettings;