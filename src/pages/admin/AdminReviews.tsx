import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ThumbsUp,
  Flag,
  Trash,
  Calendar,
  User,
  Clock,
  Phone
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { Review } from '../../types';

const REVIEWS_PER_PAGE = 20;

const AdminReviews: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [stats, setStats] = useState({
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    hiddenReviews: 0,
    averageRating: 0
  });

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    loadReviews();
    loadStats();
  }, [currentUser, navigate, selectedStatus, selectedRating]);

  const loadStats = async () => {
    try {
      // Get all reviews
      const reviewsQuery = query(
        collection(db, 'reviews')
      );
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => doc.data() as Review);
      
      // Calculate stats
      const totalReviews = reviewsData.length;
      const publishedReviews = reviewsData.filter(review => review.status === 'published').length;
      const pendingReviews = reviewsData.filter(review => review.status === 'pending').length;
      const hiddenReviews = reviewsData.filter(review => review.status === 'hidden').length;
      
      const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
      
      setStats({
        totalReviews,
        publishedReviews,
        pendingReviews,
        hiddenReviews,
        averageRating
      });
      
    } catch (error) {
      console.error('Error loading review stats:', error);
    }
  };

  const loadReviews = async (loadMore = false) => {
    try {
      setIsLoading(true);
      
      // Créer la requête de base
      let reviewsQuery: any = collection(db, 'reviews');
      let queryConstraints = [orderBy('createdAt', 'desc'), limit(REVIEWS_PER_PAGE)];
      
      // Apply status filter
      if (selectedStatus !== 'all') {
        queryConstraints.unshift(where('status', '==', selectedStatus));
      }
      
      // Apply rating filter
      if (selectedRating !== 'all') {
        const rating = parseInt(selectedRating);
        queryConstraints.unshift(where('rating', '==', rating));
      }
      
      // Apply pagination
      if (loadMore && lastVisible) {
        queryConstraints.push(startAfter(lastVisible));
      } else if (loadMore) {
        // If trying to load more but no lastVisible, return
        return;
      }
      
      // Construire la requête finale
      const q = query(reviewsQuery, ...queryConstraints);
      
      const querySnapshot = await getDocs(q);
      
      // Update lastVisible for pagination
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      // Check if there are more results
      setHasMore(querySnapshot.docs.length === REVIEWS_PER_PAGE);
      
      // Process results
      const reviewData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Review[];
      
      // Update state
      if (loadMore) {
        setReviews(prev => [...prev, ...reviewData]);
      } else {
        setReviews(reviewData);
      }
      
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setShowReviewModal(true);
  };

  const handlePublishReview = async (reviewId: string) => {
    try {
      setIsActionLoading(true);
      
      // Update review status
      await updateDoc(doc(db, 'reviews', reviewId), {
        status: 'published',
        moderatedAt: serverTimestamp(),
        moderatorNotes: 'Publié par l\'administrateur'
      });
      
      // Update local state
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, status: 'published' }
            : review
        )
      );
      
      // Update selected review
      if (selectedReview && selectedReview.id === reviewId) {
        setSelectedReview({ ...selectedReview, status: 'published' });
      }
      
      // Show success message
      alert('Avis publié avec succès');
      
    } catch (error) {
      console.error('Error publishing review:', error);
      alert('Erreur lors de la publication de l\'avis');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleHideReview = async (reviewId: string) => {
    try {
      setIsActionLoading(true);
      
      // Update review status
      await updateDoc(doc(db, 'reviews', reviewId), {
        status: 'hidden',
        moderatedAt: serverTimestamp(),
        moderatorNotes: 'Masqué par l\'administrateur'
      });
      
      // Update local state
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, status: 'hidden' }
            : review
        )
      );
      
      // Update selected review
      if (selectedReview && selectedReview.id === reviewId) {
        setSelectedReview({ ...selectedReview, status: 'hidden' });
      }
      
      // Show success message
      alert('Avis masqué avec succès');
      
    } catch (error) {
      console.error('Error hiding review:', error);
      alert('Erreur lors du masquage de l\'avis');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;
    
    try {
      setIsActionLoading(true);
      
      // Delete review
      await deleteDoc(doc(db, 'reviews', selectedReview.id));
      
      // Update local state
      setReviews(prev => prev.filter(review => review.id !== selectedReview.id));
      
      // Close modals
      setShowDeleteModal(false);
      setShowReviewModal(false);
      setSelectedReview(null);
      
      // Show success message
      alert('Avis supprimé avec succès');
      
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Erreur lors de la suppression de l\'avis');
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
      case 'published':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
            <CheckCircle size={12} className="mr-1" />
            Publié
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <Clock size={12} className="mr-1" />
            En attente
          </span>
        );
      case 'hidden':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <XCircle size={12} className="mr-1" />
            Masqué
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center">
            <AlertTriangle size={12} className="mr-1" />
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

  const renderStars = (rating: number) => {
    // Gérer les demi-étoiles
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    return (
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < fullStars 
                ? 'text-yellow-400 fill-current' 
                : i === fullStars && hasHalfStar
                  ? 'text-yellow-400 fill-[url(#half-star)]' 
                  : 'text-gray-300'
            }
          />
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(review => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      review.clientName?.toLowerCase().includes(searchLower) ||
      review.comment?.toLowerCase().includes(searchLower) ||
      review.clientCountry?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      {/* SVG pattern for half stars */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="50%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
      </svg>
      
      <ErrorBoundary fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des avis. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des avis</h1>
            <div className="flex items-center space-x-4">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un avis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </form>
              <button className="p-2 text-gray-500 hover:text-gray-700 bg-white rounded-lg border border-gray-300">
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total des avis</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalReviews}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.averageRating.toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600 fill-current" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avis publiés</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.publishedReviews}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingReviews}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="published">Publiés</option>
                  <option value="pending">En attente</option>
                  <option value="hidden">Masqués</option>
                </select>
              </div>
              <div>
                <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <select
                  id="rating-filter"
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Toutes les notes</option>
                  <option value="5">5 étoiles</option>
                  <option value="4">4 étoiles</option>
                  <option value="3">3 étoiles</option>
                  <option value="2">2 étoiles</option>
                  <option value="1">1 étoile</option>
                </select>
              </div>
              <div className="ml-auto">
                <label className="invisible block text-sm font-medium text-gray-700 mb-1">
                  Actions
                </label>
                <Button
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedRating('all');
                    loadReviews();
                  }}
                  variant="outline"
                  size="small"
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </div>
          </div>

          {/* Reviews Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Note
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commentaire
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
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
                  {isLoading && reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des avis...</p>
                      </td>
                    </tr>
                  ) : filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <tr key={review.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {review.clientName?.[0]}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {review.clientName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {review.clientCountry}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStars(review.rating)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 line-clamp-2">
                            {review.comment}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getServiceTypeBadge(review.serviceType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(review.status || 'pending')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewReview(review)}
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
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Aucun avis trouvé
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
                  onClick={() => loadReviews(true)}
                  disabled={isLoading}
                  fullWidth
                >
                  {isLoading ? 'Chargement...' : 'Charger plus d\'avis'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Review Details Modal */}
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title="Détails de l'avis"
          size="large"
        >
          {selectedReview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xl">
                      {selectedReview.clientName?.[0]}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedReview.clientName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getServiceTypeBadge(selectedReview.serviceType)}
                        {getStatusBadge(selectedReview.status || 'pending')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex justify-end">
                    {renderStars(selectedReview.rating)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatDate(selectedReview.createdAt)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 whitespace-pre-line">{selectedReview.comment}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Informations</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Client:</span>
                      <span className="font-medium">{selectedReview.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pays:</span>
                      <span className="font-medium">{selectedReview.clientCountry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prestataire:</span>
                      <span className="font-medium">{selectedReview.providerName || 'Non spécifié'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID Appel:</span>
                      <span className="font-medium">{selectedReview.callId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Votes utiles:</span>
                      <span className="font-medium">{selectedReview.helpfulVotes || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Signalements:</span>
                      <span className="font-medium">{selectedReview.reportedCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Actions</h4>
                  <div className="space-y-3">
                    {selectedReview.status !== 'published' && (
                      <Button
                        onClick={() => handlePublishReview(selectedReview.id)}
                        fullWidth
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isActionLoading}
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Publier l'avis
                      </Button>
                    )}
                    {selectedReview.status !== 'hidden' && (
                      <Button
                        onClick={() => handleHideReview(selectedReview.id)}
                        fullWidth
                        className="bg-yellow-600 hover:bg-yellow-700"
                        disabled={isActionLoading}
                      >
                        <XCircle size={16} className="mr-2" />
                        Masquer l'avis
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setShowReviewModal(false);
                        setShowDeleteModal(true);
                      }}
                      fullWidth
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      disabled={isActionLoading}
                    >
                      <Trash size={16} className="mr-2" />
                      Supprimer l'avis
                    </Button>
                  </div>

                  <h4 className="text-sm font-medium text-gray-500 mt-4 mb-2">Voir les profils</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.open(`/admin/users?id=${selectedReview.clientId}`, '_blank')}
                      fullWidth
                      variant="outline"
                    >
                      <User size={16} className="mr-2" />
                      Profil client
                    </Button>
                    <Button
                      onClick={() => window.open(`/admin/users?id=${selectedReview.providerId}`, '_blank')}
                      fullWidth
                      variant="outline"
                    >
                      <User size={16} className="mr-2" />
                      Profil prestataire
                    </Button>
                    <Button
                      onClick={() => window.open(`/admin/calls?id=${selectedReview.callId}`, '_blank')}
                      fullWidth
                      variant="outline"
                    >
                      <Phone size={16} className="mr-2" />
                      Détails de l'appel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirmer la suppression"
          size="small"
        >
          {selectedReview && (
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
                        Vous êtes sur le point de supprimer définitivement l'avis de :
                        <br />
                        <strong>{selectedReview.clientName}</strong>
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
                  onClick={handleDeleteReview}
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

export default AdminReviews;