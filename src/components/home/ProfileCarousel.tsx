import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, limit as fsLimit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../config/firebase';
import ModernProfileCard, { Provider } from './ModernProfileCard';

// Fonction utilitaire pour les langues (définie localement)
const getLanguageLabel = (language: string): string => {
  const LANGUAGE_MAP: Record<string, string> = {
    'Français': 'Français',
    'French': 'Français',
    'fr': 'Français',
    'FR': 'Français',
    'Anglais': 'Anglais',
    'English': 'Anglais',
    'en': 'Anglais',
    'EN': 'Anglais',
    'Espagnol': 'Espagnol',
    'Spanish': 'Espagnol',
    'Español': 'Espagnol',
    'es': 'Espagnol',
    'ES': 'Espagnol',
    'Português': 'Portugais',
    'Portuguese': 'Portugais',
    'pt': 'Portugais',
    'PT': 'Portugais',
    'Deutsch': 'Allemand',
    'German': 'Allemand',
    'de': 'Allemand',
    'DE': 'Allemand',
    'Italiano': 'Italien',
    'Italian': 'Italien',
    'it': 'Italien',
    'IT': 'Italien',
    'Nederlands': 'Néerlandais',
    'Dutch': 'Néerlandais',
    'nl': 'Néerlandais',
    'NL': 'Néerlandais',
    'Русский': 'Russe',
    'Russian': 'Russe',
    'ru': 'Russe',
    'RU': 'Russe',
    '中文': 'Chinois',
    'Chinese': 'Chinois',
    'zh': 'Chinois',
    'ZH': 'Chinois',
    'العربية': 'Arabe',
    'Arabic': 'Arabe',
    'ar': 'Arabe',
    'AR': 'Arabe'
  } as const;
  
  return LANGUAGE_MAP[language] || language;
};

const DEFAULT_AVATAR = '/default-avatar.png';

// Données de test pour le développement
const TEST_PROVIDERS: Provider[] = [
  {
    id: "test-lawyer-1",
    name: "Marie Dubois",
    type: "lawyer",
    country: "France",
    nationality: "Française",
    languages: ["Français", "Anglais", "Espagnol"],
    specialties: ["Droit international", "Immigration"],
    rating: 4.8,
    reviewCount: 127,
    yearsOfExperience: 8,
    isOnline: true,
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b332c108?w=400",
    description: "Avocate spécialisée en droit international",
    price: 49,
    duration: 30,
    isApproved: true
  },
  {
    id: "test-expat-1",
    name: "Jean Martin",
    type: "expat",
    country: "Canada",
    nationality: "Française",
    languages: ["Français", "Anglais"],
    specialties: ["Immigration", "Logement"],
    rating: 4.6,
    reviewCount: 89,
    yearsOfExperience: 5,
    isOnline: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    description: "Expatrié depuis 5 ans au Canada",
    price: 19,
    duration: 25,
    isApproved: true
  },
  {
    id: "test-lawyer-2",
    name: "Sophie Chen",
    type: "lawyer",
    country: "Allemagne",
    nationality: "Franco-Chinoise",
    languages: ["Français", "Allemand", "Chinois"],
    specialties: ["Droit des affaires", "Immigration"],
    rating: 4.9,
    reviewCount: 203,
    yearsOfExperience: 12,
    isOnline: false,
    avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400",
    description: "Avocate franco-chinoise en Allemagne",
    price: 59,
    duration: 45,
    isApproved: true
  },
  {
    id: "test-expat-2",
    name: "Lucas Silva",
    type: "expat",
    country: "Espagne",
    nationality: "Française",
    languages: ["Français", "Espagnol", "Portugais"],
    specialties: ["Entrepreneuriat", "Fiscalité"],
    rating: 4.7,
    reviewCount: 156,
    yearsOfExperience: 7,
    isOnline: true,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    description: "Entrepreneur français en Espagne",
    price: 29,
    duration: 30,
    isApproved: true
  },
  {
    id: "test-lawyer-3",
    name: "Emma Thompson",
    type: "lawyer",
    country: "Canada",
    nationality: "Franco-Britannique",
    languages: ["Français", "Anglais"],
    specialties: ["Droit familial", "Immigration"],
    rating: 4.5,
    reviewCount: 94,
    yearsOfExperience: 6,
    isOnline: true,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    description: "Avocate spécialisée en droit familial",
    price: 45,
    duration: 35,
    isApproved: true
  },
  {
    id: "test-expat-3",
    name: "Ahmed Benali",
    type: "expat",
    country: "Portugal",
    nationality: "Franco-Marocaine",
    languages: ["Français", "Arabe", "Portugais"],
    specialties: ["Tech", "Startups"],
    rating: 4.8,
    reviewCount: 78,
    yearsOfExperience: 4,
    isOnline: false,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    description: "Expert tech au Portugal",
    price: 25,
    duration: 20,
    isApproved: true
  }
];

// Debug Firebase
const debugFirebaseConnection = async (): Promise<{ success: boolean; totalDocs: number; error?: string }> => {
  console.log('🔍 === DEBUG FIREBASE CONNECTION ===');
  
  try {
    if (!db) {
      throw new Error('Firebase non initialisé');
    }
    
    const collectionRef = collection(db, 'sos_profiles');
    const allDocsSnapshot = await getDocs(query(collectionRef, fsLimit(50)));
    const totalDocs = allDocsSnapshot.size;
    
    console.log('📊 Total documents trouvés:', totalDocs);
    
    return { success: true, totalDocs };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Debug Firebase failed:', errorMessage);
    return { success: false, totalDocs: 0, error: errorMessage };
  }
};

// Props du composant
interface ProfileCarouselProps {
  className?: string;
  showStats?: boolean;
  pageSize?: number;
}

// Composant ProfileCarousel - LOGIQUE SEULEMENT
const ProfileCarousel: React.FC<ProfileCarouselProps> = ({ 
  className = "",
  showStats = false,
  pageSize = 12 
}) => {
  const { language } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [onlineProviders, setOnlineProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isUserConnected = useMemo(() => {
    return !authLoading && !!user;
  }, [authLoading, user]);

  // Navigation avec URL SEO
  const handleProfileClick = useCallback((provider: Provider) => {
    console.log('🔗 Navigation vers le profil de:', provider.name);
    
    const typeSlug = provider.type === 'lawyer' ? 'avocat' : 'expatrie';
    const countrySlug = provider.country
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-');
    const nameSlug = provider.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-');
    
    const seoUrl = `/${typeSlug}/${countrySlug}/francais/${nameSlug}-${provider.id}`;
    
    try {
      sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
    } catch (error) {
      console.warn('⚠️ Erreur sessionStorage:', error);
    }
    
    navigate(seoUrl, {
      state: {
        selectedProvider: provider,
        navigationSource: 'home_carousel'
      }
    });
  }, [navigate]);

  // Chargement des providers avec Firebase
  const loadInitialProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 === DÉBUT CHARGEMENT PROVIDERS ===');

      // Debug Firebase
      const debugResult = await debugFirebaseConnection();
      
      if (!debugResult.success) {
        throw new Error(debugResult.error || 'Échec de connexion Firebase');
      }

      // Si pas de documents, utiliser les données test
      if (debugResult.totalDocs === 0) {
        console.log('📋 Aucun document Firebase, utilisation des données test');
        setOnlineProviders(TEST_PROVIDERS.slice(0, pageSize));
        return;
      }

      // Charger depuis Firebase
      const sosProfilesQuery = query(
        collection(db, 'sos_profiles'),
        where('isVisible', '==', true),
        where('type', 'in', ['lawyer', 'expat']),
        fsLimit(50)
      );
      
      const snapshot = await getDocs(sosProfilesQuery);
      console.log('📊 Documents avec filtres:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('⚠️ Aucun document avec filtres, utilisation données test');
        setOnlineProviders(TEST_PROVIDERS.slice(0, pageSize));
        return;
      }

      // Transformer les données
      const transformedProviders: Provider[] = [];
      
      for (const doc of snapshot.docs) {
        try {
          const data = doc.data();

          const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Expert';
          const type = data.type || 'expat';
          const country = data.currentPresenceCountry || data.country || '';

          if (!country) continue;

          // Gérer l'avatar
          let avatar = data.profilePhoto || data.photoURL || data.avatar || '';
          if (avatar && avatar.startsWith('user_uploads/')) {
            try {
              const storageRef = ref(storage, avatar);
              avatar = await getDownloadURL(storageRef);
            } catch (e) {
              avatar = DEFAULT_AVATAR;
            }
          } else if (!avatar.startsWith('http')) {
            avatar = DEFAULT_AVATAR;
          }

          const provider: Provider = {
            id: doc.id,
            name: fullName,
            type: type as 'lawyer' | 'expat',
            country,
            nationality: data.nationality || data.nationalite || undefined,
            languages: Array.isArray(data.languages) ? data.languages : ['Français'],
            specialties: Array.isArray(data.specialties) ? data.specialties : [],
            rating: typeof data.rating === 'number' && data.rating >= 0 && data.rating <= 5 ? data.rating : 4.5,
            reviewCount: typeof data.reviewCount === 'number' && data.reviewCount >= 0 ? data.reviewCount : 0,
            yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : data.yearsAsExpat || 0,
            isOnline: data.isOnline === true,
            avatar,
            profilePhoto: avatar,
            description: data.description || data.bio || '',
            price: typeof data.price === 'number' ? data.price : (type === 'lawyer' ? 49 : 19),
            duration: typeof data.duration === 'number' ? data.duration : (type === 'lawyer' ? 20 : 30),
            isApproved: data.isApproved === true
          };

          // Validation
          const isLawyer = provider.type === 'lawyer';
          const isExpat = provider.type === 'expat';
          const approved = !isLawyer || (isLawyer && provider.isApproved === true);

          if ((isLawyer || isExpat) && approved && provider.name.trim() !== '' && provider.country.trim() !== '') {
            transformedProviders.push(provider);
          }

        } catch (error) {
          console.error('❌ Erreur transformation document:', doc.id, error);
        }
      }

      if (transformedProviders.length === 0) {
        setOnlineProviders(TEST_PROVIDERS.slice(0, pageSize));
      } else {
        setOnlineProviders(transformedProviders.slice(0, pageSize));
      }

    } catch (err) {
      console.error('❌ Erreur lors du chargement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur de chargement: ${errorMessage}`);
      
      // Fallback avec données test
      setOnlineProviders(TEST_PROVIDERS.slice(0, pageSize));
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // Mise à jour du statut en ligne en temps réel
  const updateProviderOnlineStatus = useCallback((providerId: string, isOnline: boolean) => {
    setOnlineProviders(prevProviders => 
      prevProviders.map(provider => 
        provider.id === providerId 
          ? { ...provider, isOnline }
          : provider
      )
    );
  }, []);

  // Configuration de l'écoute en temps réel
  const setupRealtimeListeners = useCallback(() => {
    if (!isUserConnected || onlineProviders.length === 0) {
      return () => {};
    }

    const unsubscribeFunctions: (() => void)[] = [];

    onlineProviders.forEach(provider => {
      const providerRef = collection(db, 'sos_profiles');
      const providerQuery = query(providerRef, where('__name__', '==', provider.id));
      
      const unsubscribe = onSnapshot(
        providerQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const data = change.doc.data();
              const newOnlineStatus = data.isOnline === true;
              
              if (newOnlineStatus !== provider.isOnline) {
                updateProviderOnlineStatus(change.doc.id, newOnlineStatus);
              }
            }
          });
        },
        (error) => {
          console.error(`❌ Erreur listener pour ${provider.id}:`, error);
        }
      );

      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [onlineProviders, updateProviderOnlineStatus, isUserConnected]);

  // Effects
  useEffect(() => {
    loadInitialProviders();
  }, [loadInitialProviders]);

  useEffect(() => {
    if (onlineProviders.length === 0) return;
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, [setupRealtimeListeners, onlineProviders.length]);

  // Stats calculées (exposées si showStats est true)
  const stats = useMemo(() => ({
    total: onlineProviders.length,
    online: onlineProviders.filter(p => p.isOnline).length,
    lawyers: onlineProviders.filter(p => p.type === 'lawyer').length,
    experts: onlineProviders.filter(p => p.type === 'expat').length
  }), [onlineProviders]);

  // Si loading, on retourne un indicateur simple
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Si erreur, on retourne un message simple
  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadInitialProviders}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Si pas de données
  if (onlineProviders.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600 mb-4">Aucun expert disponible</p>
        <button 
          onClick={() => setOnlineProviders(TEST_PROVIDERS.slice(0, pageSize))}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Charger données test
        </button>
      </div>
    );
  }

  // Pour le scroll infini, on duplique les providers
  const displayProviders = [...onlineProviders, ...onlineProviders, ...onlineProviders];

  return (
    <div className={className}>
      {/* Stats optionnelles */}
      {showStats && (
        <div className="mb-8 flex justify-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.online}</div>
            <div className="text-sm text-gray-600">En ligne</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.lawyers}</div>
            <div className="text-sm text-gray-600">Avocats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.experts}</div>
            <div className="text-sm text-gray-600">Experts</div>
          </div>
        </div>
      )}

      {/* Mobile: Scroll horizontal */}
      <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:hidden">
        {onlineProviders.map((provider, index) => (
          <div key={provider.id} className="flex-shrink-0 snap-start">
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              getLanguageLabel={getLanguageLabel}
              isUserConnected={isUserConnected}
              index={index}
            />
          </div>
        ))}
      </div>

      {/* Desktop: Animation infinie */}
      <div className="hidden md:flex gap-8 animate-infinite-scroll">
        {displayProviders.map((provider, index) => (
          <div key={`${provider.id}-${index}`} className="flex-shrink-0">
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              getLanguageLabel={getLanguageLabel}
              isUserConnected={isUserConnected}
              index={index % onlineProviders.length}
            />
          </div>
        ))}
      </div>

      {/* Styles pour l'animation */}
      <style>{`
        @keyframes infinite-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        
        .animate-infinite-scroll {
          animation: infinite-scroll 60s linear infinite;
        }
        
        .animate-infinite-scroll:hover {
          animation-play-state: paused;
        }
        
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @media (max-width: 768px) {
          .overflow-x-auto {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-infinite-scroll,
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ProfileCarousel);
export type { Provider };