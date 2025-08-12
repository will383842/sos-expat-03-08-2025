import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Settings, Users, DollarSign, BarChart3, Save, Star, Shield, Trash, Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { logError } from '../../utils/logging';
import Modal from '../../components/common/Modal';
import { validateDataIntegrity, cleanupObsoleteData } from '../../utils/firestore';
import testNotificationSystem from '../../services/notifications/notificationService';

// Interface pour les paramètres admin
interface AdminSettings {
  sosCommission: {
    lawyer: { type: 'fixed' | 'percentage'; amount: number };
    expat: { type: 'fixed' | 'percentage'; amount: number };
  };
  twilioSettings: {
    maxAttempts: number;
    timeoutSeconds: number;
    
  };
  createdAt: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
}

// Interface pour le rapport d'intégrité
interface IntegrityReport {
  isValid: boolean;
  issues: string[];
  fixes: IntegrityFix[];
}

// Interface pour les corrections d'intégrité
interface IntegrityFix {
  type: string;
  description: string;
  data: Record<string, unknown>;
}

// Interface pour les statistiques
interface Stats {
  totalCalls: number;
  successfulCalls: number;
  totalRevenue: number;
  platformRevenue: number;
  providerRevenue: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // États avec valeurs par défaut
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showIntegrityModal, setShowIntegrityModal] = useState<boolean>(false);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState<boolean>(false);
  const [isCleaningData, setIsCleaningData] = useState<boolean>(false);
  const [isTestingNotifications, setIsTestingNotifications] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    successfulCalls: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    providerRevenue: 0
  });

  // Load platform statistics
  const loadStats = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      // Load calls statistics
      const callsSnapshot = await getDocs(collection(db, "calls"));
      const paymentsSnapshot = await getDocs(collection(db, "payments"));

      let totalCalls = 0;
      let successfulCalls = 0;
      let totalRevenue = 0;
      let platformRevenue = 0;
      let providerRevenue = 0;

      callsSnapshot.forEach((docSnapshot) => {
        totalCalls++;
        const data = docSnapshot.data();
        if (data.status === "success") successfulCalls++;
      });

      paymentsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (typeof data.amount === 'number') totalRevenue += data.amount;
        if (typeof data.platformFee === 'number') platformRevenue += data.platformFee;
        if (typeof data.providerAmount === 'number') providerRevenue += data.providerAmount;
      });

      setStats({
        totalCalls,
        successfulCalls,
        totalRevenue,
        platformRevenue,
        providerRevenue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user]);

  // Load admin settings and statistics
  const loadAdminData = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      // Load admin settings
      const settingsDoc = await getDoc(doc(db, 'admin_settings', 'main'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as AdminSettings);
      } else {
        // Create default settings
        const defaultSettings: AdminSettings = {
          sosCommission: {
            lawyer: { type: "fixed", amount: 9 },
            expat: { type: "fixed", amount: 5 }
          },
          twilioSettings: {
            maxAttempts: 3,
            timeoutSeconds: 30
          },
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, "admin_settings", "main"), defaultSettings);
        setSettings(defaultSettings);
      }

      // Load statistics
      await loadStats();
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadStats]);

  // Chargement des données au montage du composant
  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  // Handle settings change
  const handleSettingsChange = (path: string, value: string | number): void => {
    if (!settings) return;
    
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: Record<string, unknown> = newSettings as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;

    setSettings(newSettings);
  };

  // Save settings
  const saveSettings = async (): Promise<void> => {
    if (!settings || !user) return;

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'admin_settings', 'main'), {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: user.id
      });
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Check data integrity
  const handleCheckIntegrity = async (): Promise<void> => {
    setIsCheckingIntegrity(true);
    try {
      const report = await validateDataIntegrity();
      setIntegrityReport(report);
      setShowIntegrityModal(true);
    } catch (error) {
      console.error('Error checking integrity:', error);
      alert('Erreur lors de la vérification d\'intégrité');
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  // Clean obsolete data
  const handleCleanupData = async (): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les données obsolètes ? Cette action est irréversible.')) {
      return;
    }
    
    setIsCleaningData(true);
    try {
      const success = await cleanupObsoleteData();
      if (success) {
        alert('Nettoyage des données terminé avec succès');
      } else {
        alert('Erreur lors du nettoyage des données');
      }
    } catch (error) {
      console.error('Error cleaning data:', error);
      alert('Erreur lors du nettoyage des données');
    } finally {
      setIsCleaningData(false);
    }
  };

  // Test notification system
  const handleTestNotifications = async (): Promise<void> => {
    if (!confirm('Voulez-vous tester le système de notifications ? Cela enverra un email/SMS/WhatsApp de test à un prestataire.')) {
      return;
    }
    
    setIsTestingNotifications(true);
    try {
      const testProviderId = prompt('Entrez l\'ID du prestataire pour le test:') || 'test-provider-id';
      await testNotificationSystem(testProviderId);
      alert('Test de notification envoyé avec succès ! Vérifiez les logs de la console pour les détails.');
    } catch (error: unknown) {
      console.error('Erreur lors du test de notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors du test de notification: ${errorMessage}`);
    } finally {
      setIsTestingNotifications(false);
    }
  };

  // Check authentication
  if (!user) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // Check admin role
  if (user?.role !== 'admin') {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Accès non autorisé
            </h1>
            <p className="text-gray-600">
              Vous devez être administrateur pour accéder à cette page.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary
        onError={(error: Error, errorInfo: React.ErrorInfo) => {
          logError({
            origin: 'frontend',
            userId: user?.id,
            error: error.message,
            context: {
              component: 'AdminDashboard',
              componentStack: errorInfo.componentStack
            }
          });
        }}
      >
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Console d'administration
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Gestion des paramètres et statistiques de la plateforme
                  </p>
                </div>
                <div className="flex space-x-4">
                  <Button
                    onClick={saveSettings}
                    loading={isSaving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Save size={20} className="mr-2" />
                    Sauvegarder
                  </Button>
                  <Button
                    onClick={handleCheckIntegrity}
                    loading={isCheckingIntegrity}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Shield size={20} className="mr-2" />
                    Vérifier l'intégrité
                  </Button>
                  <Button
                    onClick={handleCleanupData}
                    loading={isCleaningData}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Trash size={20} className="mr-2" />
                    Nettoyer les données
                  </Button>
                  <Button
                    onClick={handleTestNotifications}
                    loading={isTestingNotifications}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Mail size={20} className="mr-2" />
                    Tester les notifications
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Appels totaux</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalCalls.toLocaleString()}</p>
                  </div>
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Appels réussis</p>
                    <p className="text-3xl font-bold text-green-600">{stats.successfulCalls.toLocaleString()}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenus totaux</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalRevenue.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}€</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commission SOS</p>
                    <p className="text-3xl font-bold text-red-600">{stats.platformRevenue.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}€</p>
                  </div>
                  <Settings className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenus prestataires</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.providerRevenue.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}€</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Commission Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Frais SOS (Commission plateforme)
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Lawyer Commission */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Appels Avocat</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type de commission
                        </label>
                        <select
                          value={settings?.sosCommission.lawyer.type || 'fixed'}
                          onChange={(e) => handleSettingsChange('sosCommission.lawyer.type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="fixed">Montant fixe</option>
                          <option value="percentage">Pourcentage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Montant {settings?.sosCommission.lawyer.type === 'percentage' ? '(%)' : '(€)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings?.sosCommission.lawyer.amount || 0}
                          onChange={(e) => handleSettingsChange('sosCommission.lawyer.amount', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expat Commission */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Appels Expatrié</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type de commission
                        </label>
                        <select
                          value={settings?.sosCommission.expat.type || 'fixed'}
                          onChange={(e) => handleSettingsChange('sosCommission.expat.type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="fixed">Montant fixe</option>
                          <option value="percentage">Pourcentage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Montant {settings?.sosCommission.expat.type === 'percentage' ? '(%)' : '(€)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings?.sosCommission.expat.amount || 0}
                          onChange={(e) => handleSettingsChange('sosCommission.expat.amount', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Twilio Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Paramètres d'appel (Twilio)
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre maximum de tentatives
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={settings?.twilioSettings.maxAttempts || 3}
                      onChange={(e) => handleSettingsChange('twilioSettings.maxAttempts', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout par tentative (secondes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="60"
                      value={settings?.twilioSettings.timeoutSeconds || 30}
                      onChange={(e) => handleSettingsChange('twilioSettings.timeoutSeconds', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Calculation Preview */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Aperçu des calculs de commission
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-3">Appel Avocat (49€)</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Prix total:</span>
                        <span className="font-medium">49.00€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission SOS:</span>
                        <span className="font-medium text-red-600">
                          {settings?.sosCommission.lawyer.type === 'percentage' 
                            ? `${((49 * (settings?.sosCommission.lawyer.amount || 0)) / 100).toFixed(2)}€`
                            : `${(settings?.sosCommission.lawyer.amount || 0).toFixed(2)}€`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>Part avocat:</span>
                        <span className="font-medium text-green-600">
                          {settings?.sosCommission.lawyer.type === 'percentage' 
                            ? `${(49 - (49 * (settings?.sosCommission.lawyer.amount || 0)) / 100).toFixed(2)}€`
                            : `${(49 - (settings?.sosCommission.lawyer.amount || 0)).toFixed(2)}€`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-3">Appel Expatrié (19€)</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Prix total:</span>
                        <span className="font-medium">19.00€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission SOS:</span>
                        <span className="font-medium text-red-600">
                          {settings?.sosCommission.expat.type === 'percentage' 
                            ? `${((19 * (settings?.sosCommission.expat.amount || 0)) / 100).toFixed(2)}€`
                            : `${(settings?.sosCommission.expat.amount || 0).toFixed(2)}€`
                          }
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>Part expatrié:</span>
                        <span className="font-medium text-green-600">
                          {settings?.sosCommission.expat.type === 'percentage' 
                            ? `${(19 - (19 * (settings?.sosCommission.expat.amount || 0)) / 100).toFixed(2)}€`
                            : `${(19 - (settings?.sosCommission.expat.amount || 0)).toFixed(2)}€`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reviews Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Gestion des avis
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Gérez les avis clients de la plateforme. Vous pouvez modérer, publier ou masquer les avis.
                </p>
                <Button onClick={() => navigate('/admin/reviews')}>
                  Accéder à la gestion des avis
                </Button>
              </div>
            </div>
          </div>
          
          {/* Integrity Check Modal */}
          <Modal
            isOpen={showIntegrityModal}
            onClose={() => setShowIntegrityModal(false)}
            title="Rapport d'intégrité des données"
            size="large"
          >
            {integrityReport && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${integrityReport.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center">
                    {integrityReport.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    )}
                    <h3 className={`font-medium ${integrityReport.isValid ? 'text-green-800' : 'text-red-800'}`}>
                      {integrityReport.isValid ? 'Données intègres' : `${integrityReport.issues.length} problème(s) détecté(s)`}
                    </h3>
                  </div>
                </div>

                {integrityReport.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Problèmes détectés :</h4>
                    <ul className="space-y-1">
                      {integrityReport.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-red-600 flex items-start">
                          <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    onClick={() => setShowIntegrityModal(false)}
                    variant="outline"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminDashboard;

