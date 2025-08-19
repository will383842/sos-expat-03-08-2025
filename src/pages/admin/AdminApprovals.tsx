import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, CheckCircle, XCircle, AlertCircle, Loader2, Edit, Shield, Users, 
  Search, Filter, Bell, Mail, Phone, MapPin, Calendar, Award, FileText,
  Download, Trash2, Clock, UserCheck, UserX, AlertTriangle
} from 'lucide-react';
import {
  collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, Timestamp
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
  createdAt?: any;
  isApproved?: boolean;
  isFakeProfile?: boolean;
  approvedAt?: any;
  rejectedAt?: any;
  markedFakeAt?: any;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  lastLoginAt?: any;
  completionScore?: number;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  documents?: Array<{
    type: string;
    url: string;
    uploadedAt: any;
    verified: boolean;
  }>;
};

type ActionType = 'approve' | 'reject' | null;
type TabType = 'pending' | 'approved' | 'fake-profiles' | 'rejected';
type FilterType = 'all' | 'fake' | 'real' | 'incomplete' | 'complete';
type SortType = 'newest' | 'oldest' | 'name' | 'completion';

interface NotificationData {
  type: 'approval' | 'rejection' | 'fake_profile';
  title: string;
  message: string;
  userId: string;
  adminId: string;
  createdAt: any;
  read: boolean;
}

const AdminApprovals: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // States
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ userId: string; action: ActionType; reason?: string }>({ 
    userId: '', 
    action: null 
  });
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [profileFilter, setProfileFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    fakeProfiles: 0
  });

  // Fonction pour afficher des notifications toast améliorées
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const colors = {
      success: 'bg-green-100 border-green-500 text-green-800',
      error: 'bg-red-100 border-red-500 text-red-800',
      warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      info: 'bg-blue-100 border-blue-500 text-blue-800'
    };

    // Créer et afficher une notification toast
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg border-l-4 shadow-lg z-50 ${colors[type]} max-w-md`;
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2 text-lg">${icons[type]}</span>
        <span class="font-medium">${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'transform 0.3s ease-in-out';
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Suppression automatique après 5 secondes
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };

  // Fonction pour envoyer une notification à l'utilisateur
  const sendUserNotification = async (notificationData: NotificationData) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  };

  // Calcul du score de complétude du profil
  const calculateCompletionScore = (user: User): number => {
    const fields = [
      'fullName', 'email', 'phone', 'country', 'language', 
      'specialization', 'experience', 'description', 'profileImage'
    ];
    
    const completedFields = fields.filter(field => {
      const value = user[field as keyof User];
      return value && value.toString().trim() !== '';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  };

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
        const completionScore = calculateCompletionScore(userData);
        allUsers.push({ 
          ...userData, 
          id: docSnap.id,
          completionScore 
        });
      });

      // Filtrage selon l'onglet
      let filteredUsers: User[] = [];
      switch (tab) {
        case 'pending':
          filteredUsers = allUsers.filter(user =>
            (user.isApproved === false || user.isApproved === undefined) && 
            !user.isFakeProfile && 
            !user.rejectedAt
          );
          break;
        case 'approved':
          filteredUsers = allUsers.filter(user => 
            user.isApproved === true && !user.isFakeProfile
          );
          break;
        case 'rejected':
          filteredUsers = allUsers.filter(user => 
            user.rejectedAt && !user.isFakeProfile
          );
          break;
        case 'fake-profiles':
          filteredUsers = allUsers.filter(user => user.isFakeProfile === true);
          break;
        default:
          filteredUsers = allUsers;
      }

      // Tri
      filteredUsers.sort((a, b) => {
        const getValidDate = (value: any): number => {
          if (!value) return 0;
          if (value instanceof Date) return value.getTime();
          if (value.toDate) return value.toDate().getTime();
          return new Date(value).getTime();
        };

        switch (sortBy) {
          case 'oldest':
            return getValidDate(a.createdAt) - getValidDate(b.createdAt);
          case 'name':
            return (a.fullName || '').localeCompare(b.fullName || '');
          case 'completion':
            return (b.completionScore || 0) - (a.completionScore || 0);
          case 'newest':
          default:
            const dateA = tab === 'approved' ? getValidDate(a.approvedAt) : getValidDate(a.createdAt);
            const dateB = tab === 'approved' ? getValidDate(b.approvedAt) : getValidDate(b.createdAt);
            return dateB - dateA;
        }
      });

      setUsers(filteredUsers);
      
      // Calculer les statistiques
      const newStats = {
        pending: allUsers.filter(u => !u.isApproved && !u.isFakeProfile && !u.rejectedAt).length,
        approved: allUsers.filter(u => u.isApproved && !u.isFakeProfile).length,
        rejected: allUsers.filter(u => u.rejectedAt && !u.isFakeProfile).length,
        fakeProfiles: allUsers.filter(u => u.isFakeProfile).length
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error loading users:', error);
      setError('Erreur lors du chargement des utilisateurs. Veuillez réessayer.');
      showNotification('Erreur lors du chargement', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy]);

  // Filtrage et recherche en temps réel
  useEffect(() => {
    let filtered = [...users];

    // Filtre par type de profil
    if (profileFilter !== 'all') {
      switch (profileFilter) {
        case 'fake':
          filtered = filtered.filter(user => user.isFakeProfile);
          break;
        case 'real':
          filtered = filtered.filter(user => !user.isFakeProfile);
          break;
        case 'incomplete':
          filtered = filtered.filter(user => (user.completionScore || 0) < 70);
          break;
        case 'complete':
          filtered = filtered.filter(user => (user.completionScore || 0) >= 70);
          break;
      }
    }

    // Recherche textuelle
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.specialization?.toLowerCase().includes(term) ||
        user.country?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [users, profileFilter, searchTerm]);

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
    setSearchTerm('');
    setSelectedUsers(new Set());
  };

  const confirmAction = (userId: string, action: ActionType, reason?: string) => {
    setPendingAction({ userId, action, reason });
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    const { userId, action, reason } = pendingAction;
    if (!action || !userId) return;

    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      if (action === 'approve') {
        await handleApprove(userId);
      } else {
        await handleReject(userId, reason);
      }
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setShowConfirmModal(false);
      setPendingAction({ userId: '', action: null });
      setRejectionReason('');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const approvalData = {
        isApproved: true,
        approvedAt: Timestamp.now(),
        approvedBy: currentUser?.uid,
        verificationStatus: 'verified'
      };
      
      await updateDoc(userRef, approvalData);

      // Mettre à jour le profil SOS
      try {
        const sosProfileRef = doc(db, 'sos_profiles', userId);
        const sosProfileDoc = await getDoc(sosProfileRef);
        if (sosProfileDoc.exists()) {
          await updateDoc(sosProfileRef, approvalData);
        }
      } catch (err) {
        console.warn('SOS profile not found for this user:', err);
      }

      // Envoyer une notification à l'utilisateur
      const user = users.find(u => u.id === userId);
      if (user) {
        await sendUserNotification({
          type: 'approval',
          title: '🎉 Profil approuvé !',
          message: `Félicitations ${user.fullName} ! Votre profil SOS Expat a été approuvé. Vous pouvez maintenant recevoir des demandes de clients.`,
          userId: userId,
          adminId: currentUser?.uid || '',
          createdAt: Timestamp.now(),
          read: false
        });
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Utilisateur approuvé avec succès. Une notification a été envoyée.', 'success');
      
      // Rafraîchir les stats
      await fetchUsers(activeTab);
    } catch (error) {
      console.error('Approval error:', error);
      showNotification('Erreur lors de l\'approbation', 'error');
    }
  };

  const handleReject = async (userId: string, reason?: string) => {
    try {
      const rejectionData = {
        isApproved: false,
        isRejected: true,
        rejectedAt: Timestamp.now(),
        rejectedBy: currentUser?.uid,
        rejectionReason: reason || 'Non spécifiée',
        verificationStatus: 'rejected'
      };
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, rejectionData);

      // Envoyer une notification à l'utilisateur
      const user = users.find(u => u.id === userId);
      if (user) {
        await sendUserNotification({
          type: 'rejection',
          title: '❌ Profil rejeté',
          message: `Bonjour ${user.fullName}, votre profil SOS Expat a été rejeté. Raison: ${reason || 'Non spécifiée'}. Vous pouvez modifier votre profil et soumettre une nouvelle demande.`,
          userId: userId,
          adminId: currentUser?.uid || '',
          createdAt: Timestamp.now(),
          read: false
        });
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Utilisateur rejeté. Une notification a été envoyée.', 'success');
      
      // Rafraîchir les stats
      await fetchUsers(activeTab);
    } catch (error) {
      console.error('Rejection error:', error);
      showNotification('Erreur lors du rejet', 'error');
    }
  };

  const handleMarkAsFake = async (userId: string) => {
    try {
      setProcessingUsers(prev => new Set(prev).add(userId));
      
      const fakeData = {
        isFakeProfile: true,
        markedFakeAt: Timestamp.now(),
        markedFakeBy: currentUser?.uid,
        isApproved: false
      };
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, fakeData);

      // Envoyer une notification à l'utilisateur
      const user = users.find(u => u.id === userId);
      if (user) {
        await sendUserNotification({
          type: 'fake_profile',
          title: '🚫 Profil suspendu',
          message: `Votre profil a été marqué comme suspicieux et temporairement suspendu. Contactez notre support pour plus d'informations.`,
          userId: userId,
          adminId: currentUser?.uid || '',
          createdAt: Timestamp.now(),
          read: false
        });
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      showNotification('Profil marqué comme faux et notification envoyée', 'warning');
      
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

  const handleBulkAction = async (action: 'approve' | 'reject' | 'fake') => {
    if (selectedUsers.size === 0) return;
    
    setShowBulkActionsModal(false);
    
    const userIds = Array.from(selectedUsers);
    let successCount = 0;
    
    for (const userId of userIds) {
      try {
        setProcessingUsers(prev => new Set(prev).add(userId));
        
        switch (action) {
          case 'approve':
            await handleApprove(userId);
            break;
          case 'reject':
            await handleReject(userId, 'Action groupée');
            break;
          case 'fake':
            await handleMarkAsFake(userId);
            break;
        }
        successCount++;
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
      } finally {
        setProcessingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    }
    
    setSelectedUsers(new Set());
    showNotification(`${successCount}/${userIds.length} utilisateurs traités avec succès`, 'success');
  };

  const openUserModal = useCallback(async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      let completeUserData = { ...user };
      
      if (userDoc.exists()) {
        completeUserData = { ...completeUserData, ...userDoc.data() };
      }
      
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
      await updateDoc(userRef, {
        ...editForm,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.uid
      });
      
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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.isFakeProfile) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">🚫 Faux profil</span>;
    }
    if (user.isApproved) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">✅ Approuvé</span>;
    }
    if (user.rejectedAt) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">❌ Rejeté</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">⏳ En attente</span>;
  };

  const closeUserModal = useCallback(() => {
    setShowUserModal(false);
    setSelectedUser(null);
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin mr-2 text-blue-600" size={24} />
          <span className="text-gray-700">Chargement des utilisateurs...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {/* En-tête avec statistiques */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                <p className="text-gray-600 mt-2">Gérez les demandes d'approbation et les profils utilisateurs</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => fetchUsers(activeTab)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="mr-2" size={16} />
                  Actualiser
                </Button>
                {selectedUsers.size > 0 && (
                  <Button 
                    onClick={() => setShowBulkActionsModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Actions groupées ({selectedUsers.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="text-yellow-600 mr-3" size={24} />
                  <div>
                    <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                    <p className="text-sm text-yellow-600">En attente</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <UserCheck className="text-green-600 mr-3" size={24} />
                  <div>
                    <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
                    <p className="text-sm text-green-600">Approuvés</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <UserX className="text-red-600 mr-3" size={24} />
                  <div>
                    <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
                    <p className="text-sm text-red-600">Rejetés</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="text-orange-600 mr-3" size={24} />
                  <div>
                    <p className="text-2xl font-bold text-orange-800">{stats.fakeProfiles}</p>
                    <p className="text-sm text-orange-600">Faux profils</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs de navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { key: 'pending', label: 'En attente', icon: Clock, count: stats.pending },
                { key: 'approved', label: 'Approuvés', icon: CheckCircle, count: stats.approved },
                { key: 'rejected', label: 'Rejetés', icon: XCircle, count: stats.rejected },
                { key: 'fake-profiles', label: 'Faux profils', icon: Shield, count: stats.fakeProfiles }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key as TabType)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-1 text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Filtres et recherche */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Barre de recherche */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email, spécialisation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filtres */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={profileFilter}
                  onChange={(e) => setProfileFilter(e.target.value as FilterType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les profils</option>
                  <option value="real">Vrais profils</option>
                  <option value="fake">Faux profils</option>
                  <option value="complete">Profils complets (≥70%)</option>
                  <option value="incomplete">Profils incomplets (&lt;70%)</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Plus récents</option>
                  <option value="oldest">Plus anciens</option>
                  <option value="name">Par nom</option>
                  <option value="completion">Par complétude</option>
                </select>
              </div>
            </div>

            {/* Sélection multiple */}
            {activeTab === 'pending' && filteredUsers.length > 0 && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Sélectionner tout ({selectedUsers.size}/{filteredUsers.length})
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Gestion des erreurs */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
                <div>
                  <h3 className="text-red-800 font-medium">Erreur</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des utilisateurs */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Aucun résultat pour votre recherche.' : 'Aucun utilisateur dans cette catégorie.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => {
                const isProcessing = processingUsers.has(user.id);
                const isSelected = selectedUsers.has(user.id);
                const completionScore = user.completionScore || 0;
                
                return (
                  <div 
                    key={user.id} 
                    className={`bg-white border rounded-lg shadow-sm transition-all duration-200 ${
                      isProcessing ? 'opacity-50' : ''
                    } ${user.isFakeProfile ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''} hover:shadow-md`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        {/* Informations utilisateur */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {/* Checkbox de sélection */}
                          {activeTab === 'pending' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleUserSelection(user.id)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          )}
                          
                          {/* Photo de profil */}
                          <div className="flex-shrink-0">
                            {user.profileImage ? (
                              <img 
                                src={user.profileImage} 
                                alt={user.fullName}
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Détails */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {user.fullName}
                              </h3>
                              {getStatusBadge(user)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <Mail size={14} />
                                <span className="truncate">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone size={14} />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                <span>{user.country}</span>
                              </div>
                              {user.specialization && (
                                <div className="flex items-center gap-1">
                                  <Award size={14} />
                                  <span className="truncate">{user.specialization}</span>
                                </div>
                              )}
                            </div>

                            {/* Barre de progression de complétude */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>Complétude du profil</span>
                                <span>{completionScore}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    completionScore >= 80 ? 'bg-green-500' :
                                    completionScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${completionScore}%` }}
                                />
                              </div>
                            </div>

                            {/* Métadonnées */}
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar size={12} />
                                <span>
                                  Créé le {user.createdAt ? 
                                    new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString() 
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                              {user.approvedAt && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  <span>
                                    Approuvé le {new Date(user.approvedAt.toDate ? user.approvedAt.toDate() : user.approvedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {user.rejectedAt && (
                                <div className="flex items-center gap-1">
                                  <XCircle size={12} />
                                  <span>
                                    Rejeté le {new Date(user.rejectedAt.toDate ? user.rejectedAt.toDate() : user.rejectedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                          <Button 
                            onClick={() => openUserModal(user)}
                            disabled={isProcessing}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm px-3 py-2"
                          >
                            <Eye size={14} className="mr-1" />
                            Détails
                          </Button>

                          {activeTab === 'pending' && (
                            <>
                              <Button 
                                onClick={() => confirmAction(user.id, 'approve')}
                                disabled={isProcessing}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2"
                              >
                                {isProcessing ? (
                                  <Loader2 size={14} className="animate-spin mr-1" />
                                ) : (
                                  <CheckCircle size={14} className="mr-1" />
                                )}
                                Approuver
                              </Button>
                              
                              <Button 
                                onClick={() => {
                                  setRejectionReason('');
                                  confirmAction(user.id, 'reject');
                                }}
                                disabled={isProcessing}
                                className="bg-white border border-red-300 text-red-600 hover:bg-red-50 text-sm px-3 py-2"
                              >
                                <XCircle size={14} className="mr-1" />
                                Rejeter
                              </Button>
                              
                              {!user.isFakeProfile && (
                                <Button 
                                  onClick={() => handleMarkAsFake(user.id)}
                                  disabled={isProcessing}
                                  className="bg-white border border-orange-300 text-orange-600 hover:bg-orange-50 text-sm px-3 py-2"
                                >
                                  <Shield size={14} className="mr-1" />
                                  Marquer faux
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal des détails utilisateur */}
        <Modal 
          isOpen={showUserModal} 
          onClose={closeUserModal} 
          title="Détails de l'utilisateur"
        >
          {selectedUser && (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto">
              {/* En-tête avec photo */}
              <div className="text-center border-b border-gray-200 pb-6">
                {selectedUser.profileImage ? (
                  <img 
                    src={selectedUser.profileImage} 
                    alt={selectedUser.fullName}
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.fullName}</h2>
                <p className="text-gray-600">{selectedUser.email}</p>
                <div className="mt-2">{getStatusBadge(selectedUser)}</div>
              </div>

              {/* Informations personnelles */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="mr-2" size={20} />
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                      <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedUser.fullName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900 bg-gray-50 p-2 rounded break-all">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pays</label>
                      <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedUser.country}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Langue</label>
                      <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedUser.language}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rôle</label>
                      <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedUser.role}</p>
                    </div>
                    {selectedUser.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                        <p className="text-gray-900 bg-gray-50 p-2 rounded">{selectedUser.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations professionnelles */}
              {(selectedUser.specialization || selectedUser.experience) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Award className="mr-2" size={20} />
                    Informations professionnelles
                  </h3>
                  <div className="space-y-3">
                    {selectedUser.specialization && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Spécialisation</label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedUser.specialization}</p>
                      </div>
                    )}
                    {selectedUser.experience && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Expérience</label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedUser.experience}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedUser.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="mr-2" size={20} />
                    Description
                  </h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">{selectedUser.description}</p>
                </div>
              )}

              {/* Adresse */}
              {selectedUser.address && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="mr-2" size={20} />
                    Adresse
                  </h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedUser.address}</p>
                </div>
              )}

              {/* Métadonnées système */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="mr-2" size={20} />
                  Informations système
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">Date de création:</span>
                      <p className="text-gray-600">
                        {selectedUser.createdAt ? 
                          new Date(selectedUser.createdAt.toDate ? selectedUser.createdAt.toDate() : selectedUser.createdAt).toLocaleString() 
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Complétude du profil:</span>
                      <p className="text-gray-600">{selectedUser.completionScore || 0}%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedUser.approvedAt && (
                      <div>
                        <span className="font-medium text-gray-700">Date d'approbation:</span>
                        <p className="text-gray-600">
                          {new Date(selectedUser.approvedAt.toDate ? selectedUser.approvedAt.toDate() : selectedUser.approvedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedUser.rejectedAt && (
                      <div>
                        <span className="font-medium text-gray-700">Date de rejet:</span>
                        <p className="text-gray-600">
                          {new Date(selectedUser.rejectedAt.toDate ? selectedUser.rejectedAt.toDate() : selectedUser.rejectedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedUser.rejectionReason && (
                      <div>
                        <span className="font-medium text-gray-700">Raison du rejet:</span>
                        <p className="text-gray-600">{selectedUser.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button
                  onClick={closeUserModal}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </Button>
                <Button 
                  onClick={openEditModal} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit size={16} className="mr-2" />
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal d'édition */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Modifier le profil utilisateur"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={editForm.fullName || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <input
                  type="text"
                  value={editForm.country || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spécialisation</label>
              <input
                type="text"
                value={editForm.specialization || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, specialization: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Décrivez votre expérience et vos compétences..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                onClick={() => setShowEditModal(false)}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sauvegarder les modifications
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de confirmation */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirmer l'action"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
              <div>
                <p className="font-medium text-yellow-800">
                  {pendingAction.action === 'approve' ? 'Approuver cet utilisateur' : 'Rejeter cet utilisateur'}
                </p>
                <p className="text-sm text-yellow-700">
                  {pendingAction.action === 'approve' 
                    ? 'L\'utilisateur recevra une notification et pourra commencer à recevoir des demandes.'
                    : 'L\'utilisateur recevra une notification expliquant le rejet.'
                  }
                </p>
              </div>
            </div>

            {pendingAction.action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du rejet (optionnel)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Expliquez pourquoi ce profil est rejeté..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  setRejectionReason('');
                }}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  setPendingAction(prev => ({ ...prev, reason: rejectionReason }));
                  executeAction();
                }}
                className={
                  pendingAction.action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }
              >
                {pendingAction.action === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal d'actions groupées */}
        <Modal
          isOpen={showBulkActionsModal}
          onClose={() => setShowBulkActionsModal(false)}
          title={`Actions groupées (${selectedUsers.size} utilisateur${selectedUsers.size > 1 ? 's' : ''} sélectionné${selectedUsers.size > 1 ? 's' : ''})`}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Choisissez une action à appliquer aux utilisateurs sélectionnés:
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => handleBulkAction('approve')}
                className="w-full bg-green-600 hover:bg-green-700 text-white justify-start"
              >
                <CheckCircle className="mr-2" size={16} />
                Approuver tous les utilisateurs sélectionnés
              </Button>
              
              <Button
                onClick={() => handleBulkAction('reject')}
                className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
              >
                <XCircle className="mr-2" size={16} />
                Rejeter tous les utilisateurs sélectionnés
              </Button>
              
              <Button
                onClick={() => handleBulkAction('fake')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start"
              >
                <Shield className="mr-2" size={16} />
                Marquer comme faux profils
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => setShowBulkActionsModal(false)}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Button>
            </div>
          </div>
        </Modal>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default AdminApprovals;