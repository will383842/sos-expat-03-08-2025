import React, { useEffect, useState } from 'react';
import {
  User,
  Search,
  Eye,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Scale,
  UserCheck,
  UserX,
  MoreHorizontal,
  Calendar,
  Shield,
  Clock,
  Star,
  Phone,
  Mail,
  Ban,
  UserCog,
  MapPin,
  AlertTriangle
} from 'lucide-react';

import { collection, getDocs, doc, updateDoc, serverTimestamp, deleteDoc, query, where, orderBy, limit, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { logError } from '../../utils/logging';
import AdminMapVisibilityToggle from '../../components/admin/AdminMapVisibilityToggle';

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showBanModal, setShowBanModal] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [countries, setCountries] = useState<string[]>([]);
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Construire la requête avec filtres et tri
        let usersQuery = collection(db, 'users');
        
        // Appliquer les filtres
        if (selectedRole !== 'all') {
          usersQuery = query(usersQuery, where('role', '==', selectedRole));
        }
        
        if (selectedCountry !== 'all') {
          usersQuery = query(usersQuery, where('country', '==', selectedCountry));
        }
        
        // Appliquer le tri
        usersQuery = query(usersQuery, orderBy(sortField, sortDirection));
        
        // Appliquer la pagination
        usersQuery = query(usersQuery, limit(page * USERS_PER_PAGE));
        
        const usersSnapshot = await getDocs(usersQuery);
        
        // Extraire les données
        const usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        });
        
        // Extraire les pays uniques pour le filtre
        const uniqueCountries = Array.from(new Set(usersData.map(user => user.country || user.currentCountry || 'Non spécifié')))
          .filter(Boolean)
          .sort();
        
        setUsers(usersData);
        setCountries(uniqueCountries);
        setHasMore(usersSnapshot.docs.length === page * USERS_PER_PAGE);
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs :', error);
        logError({
          origin: 'frontend',
          error: `Error loading users: ${error.message}`,
          context: { component: 'AdminUsers' }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [selectedRole, selectedCountry, sortField, sortDirection, page]);

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleEditUser = (userId: string) => {
    navigate(`/admin/users/${userId}/edit`);
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleBanUser = (user: any) => {
    setSelectedUser(user);
    setBanReason('');
    setShowBanModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsActionLoading(true);
    
    try {
      // Supprimer le profil SOS si c'est un prestataire
      if (selectedUser.role === 'lawyer' || selectedUser.role === 'expat') {
        await deleteDoc(doc(db, 'sos_profiles', selectedUser.id));
      }
      
      // Supprimer l'utilisateur
      await deleteDoc(doc(db, 'users', selectedUser.id));
      
      // Mettre à jour la liste
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      
      // Fermer le modal
      setShowDeleteModal(false);
      setSelectedUser(null);
      
      // Enregistrer l'action
      await addDoc(collection(db, 'logs'), {
        type: 'user_deleted',
        userId: selectedUser.id,
        deletedBy: currentUser?.id,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
      
      logError({
        origin: 'frontend',
        error: `Error deleting user: ${error.message}`,
        context: { userId: selectedUser.id }
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const confirmBanUser = async () => {
    if (!selectedUser) return;
    
    setIsActionLoading(true);
    
    try {
      // Mettre à jour le statut de l'utilisateur
      await updateDoc(doc(db, 'users', selectedUser.id), {
        isBanned: true,
        banReason: banReason,
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour le profil SOS si c'est un prestataire
      if (selectedUser.role === 'lawyer' || selectedUser.role === 'expat') {
        await updateDoc(doc(db, 'sos_profiles', selectedUser.id), {
          isBanned: true,
          isVisible: false,
          isVisibleOnMap: false,
          isOnline: false,
          updatedAt: serverTimestamp()
        });
      }
      
      // Mettre à jour la liste
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, isBanned: true, banReason } 
          : user
      ));
      
      // Fermer le modal
      setShowBanModal(false);
      setSelectedUser(null);
      
      // Enregistrer l'action
      await addDoc(collection(db, 'logs'), {
        type: 'user_banned',
        userId: selectedUser.id,
        bannedBy: currentUser?.id,
        reason: banReason,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Erreur lors du bannissement de l\'utilisateur');
      
      logError({
        origin: 'frontend',
        error: `Error banning user: ${error.message}`,
        context: { userId: selectedUser.id }
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setIsActionLoading(true);
    
    try {
      // Mettre à jour le statut de l'utilisateur
      await updateDoc(doc(db, 'users', userId), {
        isBanned: false,
        banReason: '',
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour le profil SOS si c'est un prestataire
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists() && (userDoc.data().role === 'lawyer' || userDoc.data().role === 'expat')) {
        await updateDoc(doc(db, 'sos_profiles', userId), {
          isBanned: false,
          isVisible: true,
          isVisibleOnMap: true,
          updatedAt: serverTimestamp()
        });
      }
      
      // Mettre à jour la liste
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, isBanned: false, banReason: '' } 
          : user
      ));
      
      // Enregistrer l'action
      await addDoc(collection(db, 'logs'), {
        type: 'user_unbanned',
        userId: userId,
        unbannedBy: currentUser?.id,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Erreur lors de la réactivation de l\'utilisateur');
      
      logError({
        origin: 'frontend',
        error: `Error unbanning user: ${error.message}`,
        context: { userId }
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleOnlineStatus = async (userId: string, isCurrentlyOnline: boolean) => {
    setIsActionLoading(true);
    
    try {
      // Mettre à jour le statut en ligne de l'utilisateur
      await updateDoc(doc(db, 'users', userId), {
        isOnline: !isCurrentlyOnline,
        availability: !isCurrentlyOnline ? 'available' : 'offline',
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour le profil SOS si c'est un prestataire
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists() && (userDoc.data().role === 'lawyer' || userDoc.data().role === 'expat')) {
        await updateDoc(doc(db, 'sos_profiles', userId), {
          isOnline: !isCurrentlyOnline,
          availability: !isCurrentlyOnline ? 'available' : 'offline',
          updatedAt: serverTimestamp()
        });
      }
      
      // Mettre à jour la liste
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, isOnline: !isCurrentlyOnline, availability: !isCurrentlyOnline ? 'available' : 'offline' } 
          : user
      ));
      
      // Enregistrer l'action
      await addDoc(collection(db, 'logs'), {
        type: !isCurrentlyOnline ? 'user_set_online' : 'user_set_offline',
        userId: userId,
        changedBy: currentUser?.id,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling online status:', error);
      alert('Erreur lors de la modification du statut en ligne');
      
      logError({
        origin: 'frontend',
        error: `Error toggling online status: ${error.message}`,
        context: { userId }
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleVisibility = async (userId: string, isCurrentlyVisible: boolean) => {
    setIsActionLoading(true);
    
    try {
      // Mettre à jour la visibilité du profil SOS
      await updateDoc(doc(db, 'sos_profiles', userId), {
        isVisible: !isCurrentlyVisible,
        isVisibleOnMap: !isCurrentlyVisible,
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour la liste
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible } 
          : user
      ));
      
      // Enregistrer l'action
      await addDoc(collection(db, 'logs'), {
        type: !isCurrentlyVisible ? 'user_set_visible' : 'user_set_invisible',
        userId: userId,
        changedBy: currentUser?.id,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Erreur lors de la modification de la visibilité');
      
      logError({
        origin: 'frontend',
        error: `Error toggling visibility: ${error.message}`,
        context: { userId }
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleFeatured = async (userId: string, isCurrentlyFeatured: boolean) => {
    setIsActionLoading(true);
    
    try {
      // Mettre à jour le statut "featured" du profil SOS
      await updateDoc(doc(db, 'sos_profiles', userId), {
        featured: !isCurrentlyFeatured,
        updatedAt: serverTimestamp()
      });
      
      // Mettre à jour la liste
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, featured: !isCurrentlyFeatured } 
          : user
      ));
      
      // Enregistrer l'action
      await addDoc(collection(db, 'logs'), {
        type: !isCurrentlyFeatured ? 'user_set_featured' : 'user_unset_featured',
        userId: userId,
        changedBy: currentUser?.id,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Erreur lors de la modification du statut mis en avant');
      
      logError({
        origin: 'frontend',
        error: `Error toggling featured status: ${error.message}`,
        context: { userId }
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Inverser la direction si on clique sur le même champ
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouveau champ, trier par défaut en descendant
      setSortField(field);
      setSortDirection('desc');
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

  // Filtrer les utilisateurs en fonction du rôle sélectionné et du terme de recherche
  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesSearch = !searchTerm || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRole && matchesSearch;
  });

  // Obtenir le nombre d'utilisateurs par rôle
  const userCounts = {
    all: users.length,
    client: users.filter(user => user.role === 'client').length,
    lawyer: users.filter(user => user.role === 'lawyer').length,
    expat: users.filter(user => user.role === 'expat').length,
    admin: users.filter(user => user.role === 'admin').length
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">Tous les pays</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortField(field);
                setSortDirection(direction as 'asc' | 'desc');
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="createdAt-desc">Date d'inscription (récent)</option>
              <option value="createdAt-asc">Date d'inscription (ancien)</option>
              <option value="lastLoginAt-desc">Dernière connexion (récent)</option>
              <option value="lastLoginAt-asc">Dernière connexion (ancien)</option>
              <option value="fullName-asc">Nom (A-Z)</option>
              <option value="fullName-desc">Nom (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Filtres par rôle */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setSelectedRole('all')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedRole === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User size={16} />
            <span>Tous ({userCounts.all})</span>
          </button>
          <button
            onClick={() => setSelectedRole('client')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedRole === 'client'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User size={16} />
            <span>Clients ({userCounts.client})</span>
          </button>
          <button
            onClick={() => setSelectedRole('lawyer')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedRole === 'lawyer'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Scale size={16} />
            <span>Avocats ({userCounts.lawyer})</span>
          </button>
          <button
            onClick={() => setSelectedRole('expat')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedRole === 'expat'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserCheck size={16} />
            <span>Expatriés ({userCounts.expat})</span>
          </button>
          <button
            onClick={() => setSelectedRole('admin')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedRole === 'admin'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Shield size={16} />
            <span>Admins ({userCounts.admin})</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
  <tr>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Photo
    </th> {/* ✅ colonne ajoutée */}
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Utilisateur
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Rôle
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Statut
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Pays
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Inscription
    </th>
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      Actions
    </th>
  </tr>
</thead>
              <tbody className="bg-white divide-y divide-gray-200">
{loading ? (
  <tr>
    <td colSpan={7} className="px-6 py-4 text-center">
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
      <p className="mt-2 text-gray-500">Chargement des utilisateurs...</p>
    </td>
  </tr>
) : filteredUsers.length > 0 ? (
  filteredUsers.map((user) => (
    <tr key={user.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden border">
            <img
              src={user.photoURL || user.profilePhoto || "/default-avatar.png"}
              alt={`Photo de ${user.firstName || "utilisateur"}`}
              className="h-12 w-12 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/default-avatar.png";
              }}
            />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>

      {/* Ajoute ici les autres colonnes comme avant : rôle, statut, pays, etc. */}
      <td className="px-6 py-4 text-sm text-gray-900">{user.role}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{user.status}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{user.country}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(user.createdAt)}</td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {/* Boutons/actions ici */}
      </td>
    </tr>
  ))
) : (
  <tr>
    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
      Aucun utilisateur trouvé
    </td>
  </tr>
)}
</tbody>
            </table>
          </div>
          
          {/* Pagination ou "Charger plus" si nécessaire */}
          {hasMore && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Chargement...' : 'Charger plus d\'utilisateurs'}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de détails utilisateur */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Détails de l'utilisateur"
        size="large"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium overflow-hidden">
                {selectedUser.profilePhoto ? (
                  <img 
                    src={selectedUser.profilePhoto} 
                    alt={selectedUser.firstName} 
                    className="h-16 w-16 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/default-avatar.png';
                    }}
                  />
                ) : (
                  selectedUser.firstName?.[0] || selectedUser.email?.[0] || 'U'
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {selectedUser.role === 'lawyer' ? 'Avocat' : 
                     selectedUser.role === 'expat' ? 'Expatrié' : 
                     selectedUser.role === 'admin' ? 'Admin' : 'Client'}
                  </span>
                  {selectedUser.isBanned && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      Banni
                    </span>
                  )}
                  {selectedUser.isTestProfile && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Profil de test
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Informations personnelles</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">{selectedUser.email}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      {selectedUser.phoneCountryCode} {selectedUser.phone || 'Non renseigné'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      {selectedUser.country || selectedUser.currentCountry || 'Non renseigné'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      Inscrit le {formatDate(selectedUser.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      Dernière connexion le {formatDate(selectedUser.lastLoginAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Paramètres du compte</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Email vérifié</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUser.emailVerified || selectedUser.isVerifiedEmail
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedUser.emailVerified || selectedUser.isVerifiedEmail ? 'Oui' : 'Non'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Compte approuvé</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUser.isApproved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedUser.isApproved ? 'Oui' : 'En attente'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Statut en ligne</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedUser.isOnline
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUser.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                  
                  {(selectedUser.role === 'lawyer' || selectedUser.role === 'expat') && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Visible sur la carte</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.isVisibleOnMap
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedUser.isVisibleOnMap ? 'Oui' : 'Non'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Mis en avant</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.featured
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedUser.featured ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {selectedUser.isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Raison du bannissement</h4>
                <p className="text-red-700">{selectedUser.banReason || 'Aucune raison spécifiée'}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowUserModal(false)}
                variant="outline"
              >
                Fermer
              </Button>
              
              <Button
                onClick={() => {
                  setShowUserModal(false);
                  handleEditUser(selectedUser.id);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserCog size={16} className="mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmer la suppression"
        size="small"
      >
        {selectedUser && (
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
                      Vous êtes sur le point de supprimer définitivement l'utilisateur :
                      <br />
                      <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                    </p>
                    <p className="mt-1">
                      Toutes les données associées seront également supprimées.
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
                onClick={confirmDeleteUser}
                className="bg-red-600 hover:bg-red-700"
                loading={isActionLoading}
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Modal de bannissement */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title="Bannir l'utilisateur"
        size="small"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex">
                <Ban className="h-5 w-5 text-orange-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    Bannissement d'utilisateur
                  </h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>
                      Vous êtes sur le point de bannir l'utilisateur :
                      <br />
                      <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                    </p>
                    <p className="mt-1">
                      L'utilisateur ne pourra plus se connecter ni utiliser la plateforme.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="banReason" className="block text-sm font-medium text-gray-700 mb-1">
                Raison du bannissement
              </label>
              <textarea
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Expliquez la raison du bannissement..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowBanModal(false)}
                variant="outline"
                disabled={isActionLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={confirmBanUser}
                className="bg-orange-600 hover:bg-orange-700"
                loading={isActionLoading}
              >
                Bannir l'utilisateur
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
      );
};

export default AdminUsers;