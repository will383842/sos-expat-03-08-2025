import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, XCircle, AlertCircle, Loader2, Edit, Shield, Users } from 'lucide-react';
import {
  collection, query, where, getDocs, updateDoc, doc, getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  country: string;
  language: string;
  description?: string;
  profileImage?: string;
  specialization?: string;
  experience?: string;
  phone?: string;
  address?: string;
  createdAt?: Date;
  isApproved?: boolean;
  isFakeProfile?: boolean;
  approvedAt?: Date;
};

type ActionType = 'approve' | 'reject' | null;
type TabType = 'pending' | 'approved' | 'fake-profiles';
type FilterType = 'all' | 'fake' | 'real';

const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  if (type === 'error') {
    alert(`❌ ${message}`);
  } else {
    alert(`✅ ${message}`);
  }
};

const AdminApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // States
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ userId: string; action: ActionType }>({ userId: '', action: null });
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [profileFilter, setProfileFilter] = useState<FilterType>('all');
  const [editForm, setEditForm] = useState<Partial<User>>({});

  const fetchUsers = useCallback(async (tab: TabType) => {
  try {
    setIsLoading(true);
    setError(null);

    const q = query(collection(db, 'sos_profiles'), where('type', '==', 'lawyer'));
   let querySnapshot;
try {
  querySnapshot = await getDocs(q);
} catch (firestoreError) {
  console.error('🔥 Erreur Firestore :', firestoreError);
  setError("Erreur Firestore : accès interdit ou collection inexistante.");
  return;
}

    const allUsers: User[] = [];

    querySnapshot.forEach(docSnap => {
      const userData = docSnap.data() as User;
      allUsers.push({ ...userData, id: docSnap.id });
    });

    let filteredUsers: User[] = [];

    if (tab === 'pending') {
      filteredUsers = allUsers.filter(user =>
        (user.isApproved === false || user.isApproved === undefined) && !user.isFakeProfile
      );
    } else if (tab === 'approved') {
      filteredUsers = allUsers.filter(user => user.isApproved === true && !user.isFakeProfile);
    } else {
      filteredUsers = allUsers.filter(user => user.isFakeProfile === true);
    }

    filteredUsers.sort((a, b) => {
      const getValidDate = (value: any): number => {
        if (!value) return 0;
        if (value instanceof Date) return value.getTime();
        if (value.toDate) return value.toDate().getTime();
        return new Date(value).getTime();
      };

      const dateA = tab === 'approved' ? getValidDate(a.approvedAt) : getValidDate(a.createdAt);
      const dateB = tab === 'approved' ? getValidDate(b.approvedAt) : getValidDate(b.createdAt);
      return dateB - dateA;
    });

    setUsers(filteredUsers);
  } catch (error) {
    console.error('Error loading users:', error);
    setError('Erreur lors du chargement des utilisateurs. Veuillez réessayer.');
    showNotification('Erreur lors du chargement', 'error');
  } finally {
    setIsLoading(false);
  }
}, []);


  useEffect(() => {
    if (!currentUser) {
      navigate('/admin/login');
      return;
    }

    if (currentUser.role !== 'admin') {
      showNotification('Accès non autorisé', 'error');
      navigate('/');
      return;
    }

    fetchUsers(activeTab);
  }, [currentUser, navigate, fetchUsers, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setProfileFilter('all');
  };

  const confirmAction = (userId: string, action: ActionType) => {
    setPendingAction({ userId, action });
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    const { userId, action } = pendingAction;
    if (!action || !userId) return;

    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      if (action === 'approve') {
        await handleApprove(userId);
      } else {
        await handleReject(userId);
      }
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setShowConfirmModal(false);
      setPendingAction({ userId: '', action: null });
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isApproved: true,
        approvedAt: new Date()
      });

      // Essayer de mettre à jour le profil SOS s'il existe
      try {
        const sosProfileRef = doc(db, 'sos_profiles', userId);
        const sosProfileDoc = await getDoc(sosProfileRef);
        if (sosProfileDoc.exists()) {
          await updateDoc(sosProfileRef, {
            isApproved: true,
            approvedAt: new Date()
          });
        }
      } catch (err) {
        console.warn('SOS profile not found for this user:', err);
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Utilisateur approuvé avec succès', 'success');
    } catch (error) {
      console.error('Approval error:', error);
      showNotification('Erreur lors de l\'approbation', 'error');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isApproved: false,
        isRejected: true,
        rejectedAt: new Date()
      });

      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Utilisateur rejeté', 'success');
    } catch (error) {
      console.error('Rejection error:', error);
      showNotification('Erreur lors du rejet', 'error');
    }
  };

  const handleMarkAsFake = async (userId: string) => {
    try {
      setProcessingUsers(prev => new Set(prev).add(userId));
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isFakeProfile: true,
        markedFakeAt: new Date()
      });

      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Profil marqué comme faux', 'success');
      
      // Recharger la liste après marquage
      await fetchUsers(activeTab);
    } catch (error) {
      console.error('Mark as fake error:', error);
      showNotification('Erreur lors du marquage', 'error');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const openUserModal = useCallback(async (user: User) => {
    try {
      // Récupérer les données complètes de l'utilisateur
      const userDoc = await getDoc(doc(db, 'users', user.id));
      
      let completeUserData = { ...user };
      
      if (userDoc.exists()) {
        completeUserData = { ...completeUserData, ...userDoc.data() };
      }
      
      // Essayer de récupérer le profil SOS
      try {
        const sosProfileDoc = await getDoc(doc(db, 'sos_profiles', user.id));
        if (sosProfileDoc.exists()) {
          completeUserData = { ...completeUserData, ...sosProfileDoc.data() };
        }
      } catch (err) {
        console.log('No SOS profile found');
      }
      
      setSelectedUser(completeUserData);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching complete user data:', error);
      setSelectedUser(user);
      setShowUserModal(true);
    }
  }, []);

  const openEditModal = useCallback(() => {
    if (selectedUser) {
      setEditForm(selectedUser);
      setShowEditModal(true);
    }
  }, [selectedUser]);

  const handleSaveEdit = async () => {
    if (!selectedUser || !editForm) return;

    try {
      setProcessingUsers(prev => new Set(prev).add(selectedUser.id));
      
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, editForm);
      
      // Mettre à jour le profil SOS s'il existe
      try {
        const sosProfileRef = doc(db, 'sos_profiles', selectedUser.id);
        const sosProfileDoc = await getDoc(sosProfileRef);
        if (sosProfileDoc.exists()) {
          await updateDoc(sosProfileRef, editForm);
        }
      } catch (err) {
        console.warn('SOS profile not found for update:', err);
      }

      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? { ...user, ...editForm } : user
      ));
      setSelectedUser({ ...selectedUser, ...editForm });
      setShowEditModal(false);
      showNotification('Profil mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Edit error:', error);
      showNotification('Erreur lors de la modification', 'error');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedUser.id);
        return newSet;
      });
    }
  };

  const filteredUsers = users.filter(user => {
    if (profileFilter === 'all') return true;
    if (profileFilter === 'fake') return user.isFakeProfile;
    if (profileFilter === 'real') return !user.isFakeProfile;
    return true;
  });

  const closeUserModal = useCallback(() => {
    setShowUserModal(false);
    setSelectedUser(null);
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin mr-2" />
          <span>Chargement...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-xl sm:text-2xl font-bold">Gestion des utilisateurs</h1>
            <Button onClick={() => fetchUsers(activeTab)} className="w-full sm:w-auto">
              Actualiser
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
              <button
                onClick={() => handleTabChange('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline mr-2" size={16} />
                Profils à valider
              </button>
              <button
                onClick={() => handleTabChange('approved')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'approved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CheckCircle className="inline mr-2" size={16} />
                Profils validés
              </button>
              <button
                onClick={() => handleTabChange('fake-profiles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'fake-profiles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="inline mr-2" size={16} />
                Faux profils
              </button>
            </nav>
          </div>

          {/* Filters for pending tab */}
          {activeTab === 'pending' && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setProfileFilter('all')}
                  className={`${profileFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} text-sm`}
                >
                  Tous
                </Button>
                <Button
                  onClick={() => setProfileFilter('real')}
                  className={`${profileFilter === 'real' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} text-sm`}
                >
                  Vrais profils
                </Button>
                <Button
                  onClick={() => setProfileFilter('fake')}
                  className={`${profileFilter === 'fake' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} text-sm`}
                >
                  Faux profils
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-2 flex-shrink-0" size={20} />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => {
                const isProcessing = processingUsers.has(user.id);
                return (
                  <div 
                    key={user.id} 
                    className={`border p-4 rounded-lg shadow-sm transition-opacity ${
                      isProcessing ? 'opacity-50' : ''
                    } ${user.isFakeProfile ? 'border-red-300 bg-red-50' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-4">
                        {user.profileImage && (
                          <img 
                            src={user.profileImage} 
                            alt={user.fullName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-lg truncate">{user.fullName}</p>
                          <p className="text-gray-600 text-sm truncate">{user.email}</p>
                          <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500">
                            <span>Rôle: {user.role}</span>
                            <span>Pays: {user.country}</span>
                            {user.isFakeProfile && (
                              <span className="text-red-600 font-medium">❌ Faux profil</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button 
                          onClick={() => openUserModal(user)}
                          disabled={isProcessing}
                          className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm"
                        >
                          <Eye size={16} className="mr-1" />
                          Voir
                        </Button>
                        {activeTab === 'pending' && (
                          <>
                            <Button 
                              onClick={() => confirmAction(user.id, 'approve')}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm"
                            >
                              {isProcessing ? (
                                <Loader2 size={16} className="animate-spin mr-1" />
                              ) : (
                                <CheckCircle size={16} className="mr-1" />
                              )}
                              <span className="hidden sm:inline">Approuver</span>
                              <span className="sm:hidden">OK</span>
                            </Button>
                            <Button 
                              onClick={() => confirmAction(user.id, 'reject')}
                              disabled={isProcessing}
                              className="border border-red-300 bg-white text-red-600 hover:bg-red-50 text-sm"
                            >
                              <XCircle size={16} className="mr-1" />
                              <span className="hidden sm:inline">Rejeter</span>
                              <span className="sm:hidden">Non</span>
                            </Button>
                            {!user.isFakeProfile && (
                              <Button 
                                onClick={() => handleMarkAsFake(user.id)}
                                disabled={isProcessing}
                                className="border border-orange-300 bg-white text-orange-600 hover:bg-orange-50 text-sm"
                              >
                                <Shield size={16} className="mr-1" />
                                <span className="hidden sm:inline">Faux profil</span>
                                <span className="sm:hidden">Faux</span>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Details Modal */}
        <Modal 
          isOpen={showUserModal} 
          onClose={closeUserModal} 
          title="Détails de l'utilisateur"
        >
          {selectedUser && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedUser.profileImage && (
                <div className="text-center">
                  <img 
                    src={selectedUser.profileImage} 
                    alt={selectedUser.fullName}
                    className="w-24 h-24 rounded-full object-cover mx-auto"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Nom complet:</label>
                  <p className="text-gray-900">{selectedUser.fullName}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Email:</label>
                  <p className="text-gray-900 break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Pays:</label>
                  <p className="text-gray-900">{selectedUser.country}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Langue:</label>
                  <p className="text-gray-900">{selectedUser.language}</p>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Rôle:</label>
                  <p className="text-gray-900">{selectedUser.role}</p>
                </div>
                {selectedUser.phone && (
                  <div>
                    <label className="font-semibold text-gray-700 text-sm">Téléphone:</label>
                    <p className="text-gray-900">{selectedUser.phone}</p>
                  </div>
                )}
              </div>

              {selectedUser.specialization && (
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Spécialisation:</label>
                  <p className="text-gray-900">{selectedUser.specialization}</p>
                </div>
              )}

              {selectedUser.experience && (
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Expérience:</label>
                  <p className="text-gray-900">{selectedUser.experience}</p>
                </div>
              )}

              {selectedUser.description && (
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Description:</label>
                  <p className="text-gray-900">{selectedUser.description}</p>
                </div>
              )}

              {selectedUser.address && (
                <div>
                  <label className="font-semibold text-gray-700 text-sm">Adresse:</label>
                  <p className="text-gray-900">{selectedUser.address}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={openEditModal} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Edit size={16} className="mr-1" />
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Modifier le profil"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block font-semibold text-gray-700 mb-1 text-sm">Nom complet:</label>
              <input
                type="text"
                value={editForm.fullName || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1 text-sm">Email:</label>
              <input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1 text-sm">Téléphone:</label>
              <input
                type="text"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1 text-sm">Spécialisation:</label>
              <input
                type="text"
                value={editForm.specialization || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, specialization: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1 text-sm">Description:</label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={() => setShowEditModal(false)}
                className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirmer l'action"
        >
          <div className="space-y-4">
            <p>
              Êtes-vous sûr de vouloir{' '}
              <strong>
                {pendingAction.action === 'approve' ? 'approuver' : 'rejeter'}
              </strong>{' '}
              cet utilisateur ?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowConfirmModal(false)}
                className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                onClick={executeAction}
                className={
                  pendingAction.action === 'approve' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'border border-red-300 bg-white text-red-600 hover:bg-red-50'
                }
              >
                Confirmer
              </Button>
            </div>
          </div>
        </Modal>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default AdminApprovals;