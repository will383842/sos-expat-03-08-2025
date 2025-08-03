import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Search, Filter, Eye, CheckCircle, XCircle, AlertTriangle, Download, Trash } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getAllReviews, updateReviewStatus } from '../../utils/firestore';
import { Review } from '../../types';

const ReviewsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'hidden'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadReviews();
  }, [user, navigate, filter]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      
      // Filtrer par statut si nécessaire
      const status = filter === 'all' 
        ? undefined 
        : filter as 'published' | 'pending' | 'hidden';
      
      const allReviews = await getAllReviews({ status });
      setReviews(allReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reviewId: string, status: 'published' | 'pending' | 'hidden') => {
    try {
      await updateReviewStatus(reviewId, status);
      
      // Mettre à jour l'état local
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId 
            ? { ...review, status }
            : review
        )
      );
      
      // Si on modifie l'avis actuellement sélectionné
      if (selectedReview?.id === reviewId) {
        setSelectedReview(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Error updating review status:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      // Simuler la suppression (à implémenter avec Firestore)
      // await deleteReview(reviewId);
      
      // Mettre à jour l'état local
      setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewId));
      
      // Si on supprime l'avis actuellement sélectionné
      if (selectedReview?.id === reviewId) {
        setSelectedReview(null);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (searchTerm) {
      return review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
             review.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             review.clientCountry.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
            <AlertTriangle size={12} className="mr-1" />
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
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Gestion des avis
                </h1>
                <p className="text-gray-600 mt-1">
                  Administrez les avis clients de la plateforme
                </p>
              </div>
              <Button onClick={() => navigate('/admin')}>
                Retour au dashboard
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher un avis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === 'all'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilter('published')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === 'published'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Publiés
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => setFilter('hidden')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === 'hidden'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Masqués
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Liste des avis ({filteredReviews.length})
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                      <p className="mt-4 text-gray-500">Chargement des avis...</p>
                    </div>
                  ) : filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <div
                        key={review.id}
                        className={`p-6 hover:bg-gray-50 cursor-pointer ${
                          selectedReview?.id === review.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedReview(review)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{review.clientName}</h3>
                              <span className="text-sm text-gray-500">{review.clientCountry}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex">{renderStars(review.rating)}</div>
                              <span className="text-sm text-gray-500">
                                {formatDate(review.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(review.status || 'pending')}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              review.serviceType === 'lawyer_call' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {review.serviceType === 'lawyer_call' ? 'Avocat' : 'Expatrié'}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 line-clamp-2">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Aucun avis trouvé</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review Details */}
            <div className="lg:col-span-1">
              {selectedReview ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Détails de l'avis
                    </h3>
                    <div>
                      {getStatusBadge(selectedReview.status || 'pending')}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Client</h4>
                      <p className="text-gray-900">{selectedReview.clientName}</p>
                      <p className="text-sm text-gray-500">{selectedReview.clientCountry}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Note</h4>
                      <div className="flex items-center">
                        <div className="flex mr-2">{renderStars(selectedReview.rating)}</div>
                        <span>{selectedReview.rating}/5</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Date</h4>
                      <p className="text-gray-900">{formatDate(selectedReview.createdAt)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Type de service</h4>
                      <p className="text-gray-900">
                        {selectedReview.serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Commentaire</h4>
                      <p className="text-gray-900 whitespace-pre-line">{selectedReview.comment}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Statistiques</h4>
                      <div className="flex space-x-4 text-sm">
                        <span className="text-gray-900">
                          {selectedReview.helpfulVotes || 0} votes utiles
                        </span>
                        <span className="text-gray-900">
                          {selectedReview.reportedCount || 0} signalements
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Actions</h4>
                    <div className="space-y-3">
                      {selectedReview.status !== 'published' && (
                        <Button
                          onClick={() => handleUpdateStatus(selectedReview.id, 'published')}
                          fullWidth
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Publier
                        </Button>
                      )}
                      
                      {selectedReview.status !== 'pending' && (
                        <Button
                          onClick={() => handleUpdateStatus(selectedReview.id, 'pending')}
                          fullWidth
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          <AlertTriangle size={16} className="mr-2" />
                          Mettre en attente
                        </Button>
                      )}
                      
                      {selectedReview.status !== 'hidden' && (
                        <Button
                          onClick={() => handleUpdateStatus(selectedReview.id, 'hidden')}
                          fullWidth
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle size={16} className="mr-2" />
                          Masquer
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => handleDeleteReview(selectedReview.id)}
                        fullWidth
                        variant="outline"
                      >
                        <Trash size={16} className="mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Sélectionnez un avis pour voir les détails</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReviewsManagement;