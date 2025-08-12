import React from 'react';
import { Star, MapPin, Calendar, ThumbsUp, Flag } from 'lucide-react';

type FirestoreTimestampLike = { toDate: () => Date };
type DateLike = Date | string | number | FirestoreTimestampLike;

function hasToDate(x: unknown): x is FirestoreTimestampLike {
  return !!x
    && typeof x === 'object'
    && 'toDate' in x
    && typeof (x as { toDate: unknown }).toDate === 'function';
}

type ReviewItem = {
  id: string;
  rating: number;
  comment?: string;
  createdAt: DateLike;
  clientName?: string;
  clientCountry?: string;
  serviceType?: 'lawyer_call' | 'expat' | string;
  helpfulVotes?: number;
  authorId?: string;
};

interface ReviewsProps {
  reviews?: ReviewItem[];
  mode?: 'list' | 'summary';
  showControls?: boolean;
  onHelpfulClick?: (reviewId: string) => void;
  onReportClick?: (reviewId: string) => void;
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

const Reviews: React.FC<ReviewsProps> = ({
  reviews,
  mode = 'list',
  showControls = false,
  onHelpfulClick,
  onReportClick,
  averageRating = 0,
  totalReviews = 0,
  ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
}) => {
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={mode === 'list' ? 16 : 20}
        className={
          i < fullStars
            ? 'text-yellow-400 fill-current'
            : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-[url(#half-star)]'
              : 'text-gray-300'
        }
      />
    ));
  };

  const formatDate = (date: DateLike) => {
    const d = hasToDate(date)
      ? date.toDate()
      : date instanceof Date
        ? date
        : new Date(date);

    if (!(d instanceof Date) || isNaN(d.getTime())) return 'Date inconnue';

    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  };

  const getPercentage = (count: number) => (!totalReviews ? 0 : Math.round((count / totalReviews) * 100));

  if (mode === 'summary') {
    return (
      <div className="bg-white rounded-lg p-6 animate-fade-in">
        <svg width="0" height="0" className="hidden">
          <defs>
            <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
        </svg>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Avis clients</h3>
            <div className="flex items-center">
              <div className="flex mr-2">{renderStars(averageRating || 0)}</div>
              <span className="text-lg font-medium text-gray-900">{(averageRating || 0).toFixed(1)}</span>
              <span className="text-gray-500 ml-1">({totalReviews || 0} avis)</span>
            </div>
          </div>
        </div>

        {ratingDistribution && totalReviews > 0 && (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
              const percentage = getPercentage(count);
              return (
                <div key={rating} className="flex items-center">
                  <div className="flex items-center w-16">
                    <span className="text-sm text-gray-600">{rating}</span>
                    <Star size={14} className="ml-1 text-yellow-400 fill-current" />
                  </div>
                  <div className="flex-1 h-2 mx-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm text-gray-600">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!Array.isArray(reviews)) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Erreur lors du chargement des avis</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {reviews.map((review: ReviewItem) => (
        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">{review.clientName}</span>
                {review.clientCountry && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={12} className="mr-1" />
                    <span>{review.clientCountry}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex">{renderStars(review.rating)}</div>
                <span className="text-sm text-gray-500">
                  <Calendar size={12} className="inline mr-1" />
                  {formatDate(review.createdAt)}
                </span>
              </div>
            </div>

            {review.serviceType && (
              <span
                className={
                  'px-2 py-1 text-xs rounded-full ' +
                  (review.serviceType === 'lawyer_call' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')
                }
              >
                {review.serviceType === 'lawyer_call' ? 'Avocat' : 'Expatrié'}
              </span>
            )}
          </div>

          <p className="text-gray-700 mb-3">{review.comment}</p>

          {showControls && (
            <div className="flex items-center space-x-4 text-sm">
              <button
                onClick={() => onHelpfulClick && onHelpfulClick(review.id)}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ThumbsUp size={14} className="mr-1" />
                <span>Utile {review.helpfulVotes ? `(${review.helpfulVotes})` : ''}</span>
              </button>

              <button
                onClick={() => onReportClick && onReportClick(review.id)}
                className="flex items-center text-gray-500 hover:text-red-600"
              >
                <Flag size={14} className="mr-1" />
                <span>Signaler</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Reviews;


