import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowRight, Search } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { logAnalyticsEvent } from '../utils/firestore'; 

// Define Review interface
export interface Review {
  id: string;
  callId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment: string;
  isPublic: boolean;
  createdAt: Date;
  clientName: string;
  clientCountry: string;
  serviceType: 'lawyer_call' | 'expat_call';
  status: 'published' | 'pending' | 'rejected';
  helpfulVotes: number;
  clientAvatar?: string;
  verified: boolean;
}

// Use the Review interface directly instead of extending it
type ReviewType = Review;

// Define constants at the top level to avoid ESLint warnings
const STATS_AVERAGE_RATING = 4.9;
const STATS_COUNTRIES = 120;

// Types
type FilterType = 'all' | 'avocat' | 'expatrie';

interface TestimonialsStats {
  count: number;
  averageRating: number;
  countries: number;
}

// Mock data - moved outside component to prevent recreation on each render
const MOCK_REVIEWS: ReviewType[] = [
  {
    id: '1',
    callId: 'call1',
    clientId: 'client1',
    providerId: 'provider1',
    rating: 5,
    comment: "Service exceptionnel ! J'ai pu parler à un avocat français depuis Bangkok en moins de 2 minutes. Très professionnel et rassurant dans ma situation d'urgence. L'avocat m'a donné des conseils précis sur mon problème de visa et m'a orienté vers les bonnes démarches.",
    isPublic: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    clientName: 'Marie D.',
    clientCountry: 'Thaïlande',
    serviceType: 'lawyer_call',
    status: 'published',
    helpfulVotes: 12,
    clientAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true
  },
  {
    id: '2',
    callId: 'call2',
    clientId: 'client2',
    providerId: 'provider2',
    rating: 5,
    comment: "Grâce à SOS Expats, j'ai pu résoudre mon problème administratif en Espagne. L'expatrié m'a donné des conseils précieux basés sur son expérience personnelle. Je recommande vivement ce service à tous les français à l'étranger !",
    isPublic: true,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    clientName: 'Jean L.',
    clientCountry: 'Espagne',
    serviceType: 'expat_call',
    status: 'published',
    helpfulVotes: 8,
    clientAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true
  },
  {
    id: '3',
    callId: 'call3',
    clientId: 'client3',
    providerId: 'provider3',
    rating: 4,
    comment: "Interface très intuitive et service client réactif. L'avocat était compétent et m'a aidé à comprendre mes droits concernant mon contrat de travail au Canada. Je recommande vivement pour tous les expatriés.",
    isPublic: true,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    clientName: 'Sophie M.',
    clientCountry: 'Canada',
    serviceType: 'lawyer_call',
    status: 'published',
    helpfulVotes: 5,
    clientAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true
  },
  {
    id: '4',
    callId: 'call4',
    clientId: 'client4',
    providerId: 'provider4',
    rating: 5,
    comment: "J'étais complètement perdu avec les démarches pour mon visa australien. L'expatrié qui m'a aidé connaissait parfaitement le système et m'a guidé pas à pas. Ça m'a fait économiser beaucoup de temps et d'argent !",
    isPublic: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    clientName: 'Thomas B.',
    clientCountry: 'Australie',
    serviceType: 'expat_call',
    status: 'published',
    helpfulVotes: 15,
    clientAvatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true
  },
  {
    id: '5',
    callId: 'call5',
    clientId: 'client5',
    providerId: 'provider5',
    rating: 5,
    comment: "Service rapide et professionnel. J'ai eu un problème avec mon propriétaire à Londres et l'avocat m'a expliqué mes droits et les démarches à suivre. Très satisfait de la consultation !",
    isPublic: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    clientName: 'Pierre D.',
    clientCountry: 'Royaume-Uni',
    serviceType: 'lawyer_call',
    status: 'published',
    helpfulVotes: 7,
    clientAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true
  },
  {
    id: '6',
    callId: 'call6',
    clientId: 'client6',
    providerId: 'provider6',
    rating: 4,
    comment: "Excellente aide pour mon installation à Singapour. L'expatrié connaissait tous les bons plans et m'a aidé à trouver un logement rapidement. Le rapport qualité-prix est imbattable !",
    isPublic: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    clientName: 'Camille F.',
    clientCountry: 'Singapour',
    serviceType: 'expat_call',
    status: 'published',
    helpfulVotes: 9,
    clientAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    verified: true
  }
];

// Utility functions
const formatDate = (date: Date, language: string): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return language === 'fr' ? "Date inconnue" : "Unknown date";
  }
  
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getServiceTypeLabel = (serviceType: string, language: string): string => {
  return serviceType === 'lawyer_call' 
    ? (language === 'fr' ? 'Avocat' : 'Lawyer')
    : (language === 'fr' ? 'Expatrié' : 'Expat');
};

const getServiceTypeClass = (serviceType: string): string => {
  return serviceType === 'lawyer_call' 
    ? 'bg-blue-100 text-blue-800'
    : 'bg-green-100 text-green-800';
};

const generateNavigationPath = (testimonial: ReviewType, language: string): string => {
  const serviceType = testimonial.serviceType === 'lawyer_call' ? 'avocat' : 'expatrie';
  const country = testimonial.clientCountry.toLowerCase();
  return `/testimonial/${serviceType}/${country}/${language}/${testimonial.id}`;
};

// Sub-components
const FilterButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full font-medium transition-colors ${
      isActive
        ? 'bg-red-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

const StatsDisplay: React.FC<{ stats: TestimonialsStats; language: string }> = ({ stats, language }) => (
  <div className="flex justify-center space-x-8 text-lg">
    <div className="text-center">
      <div className="text-3xl font-bold">{stats.count}</div>
      <div className="text-red-200">
        {language === 'fr' ? 'Témoignages' : 'Testimonials'}
      </div>
    </div>
    <div className="text-center">
      <div className="text-3xl font-bold">{stats.averageRating}</div>
      <div className="text-red-200">
        {language === 'fr' ? 'Note moyenne' : 'Average rating'}
      </div>
    </div>
    <div className="text-center">
      <div className="text-3xl font-bold">{stats.countries}+</div>
      <div className="text-red-200">
        {language === 'fr' ? 'Pays' : 'Countries'}
      </div>
    </div>
  </div>
);

const TestimonialCard: React.FC<{
  testimonial: ReviewType;
  language: string;
  onClick: () => void;
}> = ({ testimonial, language, onClick }) => (
  <div
    className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    onClick={onClick}
  >
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img
            src={testimonial.clientAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.clientName)}&background=random`}
            alt={testimonial.clientName}
            className="w-10 h-10 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{testimonial.clientName}</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceTypeClass(testimonial.serviceType)}`}>
                {getServiceTypeLabel(testimonial.serviceType, language)}
              </span>
              {testimonial.verified && (
                <span className="text-red-600 text-xs">
                  ✓ {language === 'fr' ? 'Vérifié' : 'Verified'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={14}
              className={i < Math.floor(testimonial.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-1">
          <MapPin size={14} />
          <span className="capitalize">{testimonial.clientCountry}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar size={14} />
          <span>{formatDate(testimonial.createdAt, language)}</span>
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">
        "{testimonial.comment}"
      </p>
      
      <div className="flex justify-end">
        <button className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center">
          {language === 'fr' ? 'Lire la suite' : 'Read more'} 
          <ArrowRight size={14} className="ml-1" />
        </button>
      </div>
    </div>
  </div>
);

const Testimonials: React.FC = () => {
  const { language } = useApp();
  const navigate = useNavigate();
  
  // State
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [testimonials, setTestimonials] = useState<ReviewType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Memoized values
  const stats = useMemo<TestimonialsStats>(() => ({
    count: testimonials.length,
    averageRating: STATS_AVERAGE_RATING,
    countries: STATS_COUNTRIES
  }), [testimonials.length]);

  const filteredTestimonials = useMemo(() => {
    return testimonials.filter(review => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        review.comment?.toLowerCase().includes(searchLower) ||
        review.clientName?.toLowerCase().includes(searchLower) ||
        review.clientCountry?.toLowerCase().includes(searchLower)
      );
    });
  }, [testimonials, searchTerm]);

  // Analytics helper
  const logEvent = useCallback((eventType: string, eventData?: Record<string, unknown>) => {
    logAnalyticsEvent({ eventType, eventData: eventData || {} });
  }, []);

  // Load testimonials
  const loadTestimonials = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Mock data filtering
      let filteredReviews = [...MOCK_REVIEWS];
      if (filter === 'avocat') {
        filteredReviews = MOCK_REVIEWS.filter(review => review.serviceType === 'lawyer_call');
      } else if (filter === 'expatrie') {
        filteredReviews = MOCK_REVIEWS.filter(review => review.serviceType === 'expat_call');
      }
      
      setTestimonials(filteredReviews);
      setHasMore(false);
      
      // Log analytics
      if (filter !== 'all') {
        logEvent('testimonials_filtered', { filter });
      }
    } catch (error) {
      console.error('Error loading testimonials:', error);
      // In production, you might want to show an error message to the user
    } finally {
      setIsLoading(false);
    }
  }, [filter, logEvent]);

  // Effects
  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  // Event handlers
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1); // Reset page when filter changes
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleTestimonialClick = useCallback((testimonial: ReviewType) => {
    const path = generateNavigationPath(testimonial, language);
    navigate(path);
  }, [navigate, language]);

  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
    logEvent('testimonials_load_more', { page: page + 1 });
  }, [page, logEvent]);

  const handleRegisterClick = useCallback(() => {
  window.location.href = '/sos-appel';
  logEvent('find_expert_click');
}, [logEvent]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {language === 'fr' ? 'Témoignages clients' : 'Client testimonials'}
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto mb-8">
              {language === 'fr'
                ? 'Découvrez les expériences de nos utilisateurs partout dans le monde'
                : 'Discover the experiences of our users worldwide'
              }
            </p>
            <StatsDisplay stats={stats} language={language} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <FilterButton 
                  isActive={filter === 'all'} 
                  onClick={() => handleFilterChange('all')}
                >
                  {language === 'fr' ? 'Tous' : 'All'}
                </FilterButton>
                <FilterButton 
                  isActive={filter === 'avocat'} 
                  onClick={() => handleFilterChange('avocat')}
                >
                  {language === 'fr' ? 'Avocats' : 'Lawyers'}
                </FilterButton>
                <FilterButton 
                  isActive={filter === 'expatrie'} 
                  onClick={() => handleFilterChange('expatrie')}
                >
                  {language === 'fr' ? 'Expatriés' : 'Expats'}
                </FilterButton>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {isLoading && filteredTestimonials.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">
                  {language === 'fr' ? 'Chargement des témoignages...' : 'Loading testimonials...'}
                </p>
              </div>
            ) : filteredTestimonials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {language === 'fr' ? 'Aucun témoignage trouvé.' : 'No testimonials found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTestimonials.map((testimonial) => (
                  <TestimonialCard
                    key={testimonial.id}
                    testimonial={testimonial}
                    language={language}
                    onClick={() => handleTestimonialClick(testimonial)}
                  />
                ))}
              </div>
            )}
          
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center"
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  )}
                  <span>
                    {language === 'fr' ? 'Voir plus de témoignages' : 'See more testimonials'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {language === 'fr' 
                ? 'Vous êtes avocat ou expatrié ?'
                : 'Are you a lawyer or an expat?'
              }
            </h2>
            <p className="text-xl text-red-100 mb-8">
              {language === 'fr'
                ? 'Inscrivez-vous et aidez d\'autres expats ou voyageurs'
                : 'Register and help other expats or travelers'
              }
            </p>
            <button
              onClick={handleRegisterClick}
              className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
            >
              <span>
                {language === 'fr' ? 'Trouver un expert' : 'Find an expert'}
              </span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Testimonials;