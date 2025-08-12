import React, { useState } from 'react';
import { Star } from 'lucide-react';
import Button from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { createReviewRecord } from '../../utils/firestore';

interface ReviewFormProps {
  providerId: string;
  providerName: string;
  callId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  providerId,
  providerName,
  callId,
  serviceType,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLawyer = serviceType === 'lawyer_call';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    
    if (!comment.trim()) {
      setError('Veuillez entrer un commentaire');
      setIsSubmitting(false);
      return;
    }
    
    if (!user) {
      setError('Vous devez être connecté pour laisser un avis');
      setIsSubmitting(false);
      return;
    }
    
    if (rating < 1) {
      setError('Veuillez sélectionner une note');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const reviewData = {
        clientId: user.id,
        providerId,
        callId,
        rating,
        comment,
        isPublic: true,
        createdAt: new Date(),
        clientName: `${user.firstName} ${user.lastName}`,
        clientCountry: user.currentCountry || '',
        serviceType,
        status: 'published', // Auto-publish for now, can be changed to 'pending' for moderation
        helpfulVotes: 0,
        reportedCount: 0
      };
      
      // Log the review data for debugging
      console.log('Submitting review:', reviewData);
      console.log('Provider ID:', providerId);
      
      await createReviewRecord(reviewData);
      
      // Scroll to reviews section after submission
      setTimeout(() => {
        const reviewsSection = document.getElementById('reviews-section');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      setError(`Une erreur est survenue lors de l'envoi de votre avis: ${error.message || 'Erreur inconnue'}. Veuillez réessayer.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Évaluer {isLawyer ? 'Avocat' : 'Expatrié'}
      </h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Votre note
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  size={32}
                  className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Votre commentaire
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Partagez votre expérience avec ce prestataire..."
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              Annuler
            </Button>
          )}
          
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || rating < 1}
          >
            Envoyer mon avis
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;

