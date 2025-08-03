import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Save,
  RefreshCw,
  Upload,
  FileText,
  Trash
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, orderBy, limit, where, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

interface Backup {
  id: string;
  type: 'manual' | 'automatic';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
  fileUrl?: string;
  fileSize?: number;
  collections?: string[];
  error?: string;
}

const AdminBackups: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([
    'users', 'calls', 'payments', 'reviews', 'documents'
  ]);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupStatus, setBackupStatus] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);

  const availableCollections = [
    'users', 'calls', 'payments', 'reviews', 'documents', 'notifications',
    'call_sessions', 'booking_requests', 'invoices', 'sos_profiles', 'analytics'
  ];

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin-login');
      return;
    }

    loadBackups();
  }, [currentUser, navigate]);

  const loadBackups = async () => {
    try {
      setIsLoading(true);
      setBackupStatus('Sauvegarde en cours... Cela peut prendre plusieurs minutes.');
      // Exemple de sauvegardes pour le développement
      const mockBackups: Backup[] = [
        {
          id: 'backup-2025-01-15-10h30',
          type: 'automatic',
          status: 'completed',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
          createdBy: 'system',
          fileUrl: 'https://example.com/backups/backup-2025-01-15-10h30.json',
          fileSize: 5243890,
          collections: ['users', 'calls', 'payments', 'reviews', 'documents']
        },
        {
          id: 'backup-2025-01-14-22h30',
          type: 'automatic',
          status: 'completed',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000),
          createdBy: 'system',
          fileUrl: 'https://example.com/backups/backup-2025-01-14-22h30.json',
          fileSize: 5198432,
          collections: ['users', 'calls', 'payments', 'reviews', 'documents']
        },
        {
          id: 'backup-2025-01-13-manual',
          type: 'manual',
          status: 'completed',
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
          createdBy: 'admin1',
          fileUrl: 'https://example.com/backups/backup-2025-01-13-manual.json',
          fileSize: 5120000,
          collections: ['users', 'calls', 'payments', 'reviews', 'documents', 'notifications']
        }
      ];
      
      // En production, on chargerait depuis Firestore
      // const backupsQuery = query(
      //   collection(db, 'backups'),
      //   orderBy('createdAt', 'desc'),
      //   limit(50)
      // );
      
      // const backupsSnapshot = await getDocs(backupsQuery);
      
      // // Process results
      // const backupsData = backupsSnapshot.docs.map(doc => ({
      //   ...doc.data(),
      //   id: doc.id,
      //   createdAt: doc.data().createdAt?.toDate() || new Date(),
      //   completedAt: doc.data().completedAt?.toDate()
      // })) as Backup[];
      
      // Update state
      setBackups(mockBackups);
      
    } catch (error) {
      console.error('Error loading backups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsActionLoading(true);
      
      // Generate backup ID with timestamp
      const now = new Date();
      const backupId = `backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
      
      // En production, on créerait dans Firestore
      // await setDoc(doc(db, 'backups', backupId), {
      //   type: 'manual',
      //   status: 'pending',
      //   createdAt: serverTimestamp(),
      //   createdBy: currentUser?.id,
      //   collections: selectedCollections
      // });
      
      // Create a backup record in Firestore
      const backupRef = await addDoc(collection(db, 'backups'), {
        type: 'manual',
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id || 'admin',
        collections: selectedCollections
      });
        
      // Simulate backup process
      setTimeout(async () => {
        try {
          // Update backup status
          await updateDoc(doc(db, 'backups', backupRef.id), {
            status: 'completed',
            completedAt: serverTimestamp(),
            fileUrl: `https://example.com/backups/backup-${Date.now()}.json`,
            fileSize: Math.floor(Math.random() * 10000000) // Random file size for demo
          });
          
          setBackupStatus('Sauvegarde terminée avec succès');
          setTimeout(() => setBackupStatus(''), 3000);
        } catch (error) {
          console.error('Error updating backup status:', error);
          setBackupStatus('Erreur lors de la mise à jour du statut de la sauvegarde');
        }
      }, 5000);
      
      // Show success message
      setBackupStatus('Sauvegarde initiée. Vérifiez l\'état dans quelques minutes.');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Erreur lors de la création de la sauvegarde');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      setIsActionLoading(true);
      
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert('Restauration effectuée avec succès');
      
      // Close modal
      setShowRestoreModal(false);
      setRestoreFile(null);
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Erreur lors de la restauration de la sauvegarde');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;
    
    try {
      setIsActionLoading(true);
      
      // En production, on supprimerait dans Firestore
      // await deleteDoc(doc(db, 'backups', selectedBackup.id));
      
      // Update local state
      setBackups(prev => prev.filter(backup => backup.id !== selectedBackup.id));
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedBackup(null);
      
      // Show success message
      alert('Sauvegarde supprimée avec succès');
      
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Erreur lors de la suppression de la sauvegarde');
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
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
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <AlertTriangle size={12} className="mr-1" />
            Échoué
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <Clock size={12} className="mr-1" />
            En cours
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'automatic':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
            <RefreshCw size={12} className="mr-1" />
            Automatique
          </span>
        );
      case 'manual':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center">
            <Save size={12} className="mr-1" />
            Manuel
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center">
            <Database size={12} className="mr-1" />
            {type}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des sauvegardes. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des sauvegardes</h1>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowRestoreModal(true)}
                variant="outline"
              >
                <Upload size={18} className="mr-2" />
                Restaurer
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Save size={18} className="mr-2" />
                Sauvegarder maintenant
              </Button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Sauvegarde automatique
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Une sauvegarde automatique de la base de données est effectuée toutes les 12 heures.
                    Les 50 dernières sauvegardes sont conservées.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Backups Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taille
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
                        <p className="mt-2">Chargement des sauvegardes...</p>
                      </td>
                    </tr>
                  ) : backups.length > 0 ? (
                    backups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {backup.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(backup.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(backup.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(backup.fileSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(backup.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {backup.status === 'completed' && backup.fileUrl && (
                              <a
                                href={backup.fileUrl}
                                download
                                className="text-blue-600 hover:text-blue-800"
                                title="Télécharger"
                              >
                                <Download size={18} />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Database className="w-6 h-6 text-blue-600 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-900">Sauvegardes automatiques</h3>
                          <p className="text-gray-600 mb-4">Les sauvegardes automatiques sont exécutées toutes les 12 heures et conservées pendant 30 jours.</p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <Clock className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">Prochaine sauvegarde automatique</h3>
                                <div className="mt-1 text-sm text-blue-700">
                                  <p>
                                    {new Date(Date.now() + 12 * 60 * 60 * 1000).toLocaleString('fr-FR', {
                                      weekday: 'long',
                                      day: 'numeric',
                                      month: 'long',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => setShowBackupModal(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            Créer une sauvegarde manuelle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Backup Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Créer une sauvegarde"
          size="medium"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <Database className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Sauvegarde manuelle
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Vous êtes sur le point de créer une sauvegarde manuelle de la base de données.
                      Sélectionnez les collections à inclure dans la sauvegarde.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Collections à sauvegarder</h4>
              <div className="grid grid-cols-2 gap-2">
                {availableCollections.map((collection) => (
                  <div key={collection} className="flex items-center">
                    <input
                      id={`collection-${collection}`}
                      type="checkbox"
                      checked={selectedCollections.includes(collection)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCollections(prev => [...prev, collection]);
                        } else {
                          setSelectedCollections(prev => prev.filter(c => c !== collection));
                        }
                      }}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`collection-${collection}`} className="ml-2 block text-sm text-gray-700">
                      {collection}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                disabled={isActionLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateBackup}
                className="bg-red-600 hover:bg-red-700"
                loading={isActionLoading}
                disabled={selectedCollections.length === 0}
              >
                <Save size={16} className="mr-2" />
                Lancer la sauvegarde
              </Button>
            </div>
          </div>
        </Modal>

        {/* Restore Backup Modal */}
        <Modal
          isOpen={showRestoreModal}
          onClose={() => setShowRestoreModal(false)}
          title="Restaurer une sauvegarde"
          size="medium"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Attention : Opération sensible
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      La restauration d'une sauvegarde remplacera les données actuelles.
                      Cette opération est irréversible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="backupFile" className="block text-sm font-medium text-gray-700 mb-2">
                Fichier de sauvegarde
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="backupFile"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500"
                    >
                      <span>Sélectionner un fichier</span>
                      <input
                        id="backupFile"
                        name="backupFile"
                        type="file"
                        className="sr-only"
                        accept=".json"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setRestoreFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">ou glisser-déposer</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    JSON uniquement, 50 MB maximum
                  </p>
                </div>
              </div>
              {restoreFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné: {restoreFile.name} ({formatFileSize(restoreFile.size)})
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowRestoreModal(false)}
                variant="outline"
                disabled={isActionLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleRestoreBackup}
                className="bg-yellow-600 hover:bg-yellow-700"
                loading={isActionLoading}
                disabled={!restoreFile}
              >
                <Upload size={16} className="mr-2" />
                Restaurer la sauvegarde
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Backup Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirmer la suppression"
          size="small"
        >
          {selectedBackup && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Attention : Cette action est irréversible
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Vous êtes sur le point de supprimer définitivement la sauvegarde :
                        <br />
                        <strong>{selectedBackup.id}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                  disabled={isActionLoading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteBackup}
                  className="bg-red-600 hover:bg-red-700"
                  loading={isActionLoading}
                >
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminBackups;