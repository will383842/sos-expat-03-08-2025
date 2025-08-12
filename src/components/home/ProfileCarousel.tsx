import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, limit as fsLimit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../config/firebase';
import ModernProfileCard, { Provider } from './ModernProfileCard';

// Fonction utilitaire pour les langues (VOTRE CODE EXACT)
const getLanguageLabel = (language: string): string => {
  const LANGUAGE_MAP: Record<string, string> = {
    'Fran�ais': 'Fran�ais',
    'French': 'Fran�ais',
    'fr': 'Fran�ais',
    'FR': 'Fran�ais',
    'Anglais': 'Anglais',
    'English': 'Anglais',
    'en': 'Anglais',
    'EN': 'Anglais',
    'Espagnol': 'Espagnol',
    'Spanish': 'Espagnol',
    'Espa�ol': 'Espagnol',
    'es': 'Espagnol',
    'ES': 'Espagnol',
    'Portugu�s': 'Portugais',
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
    'Nederlands': 'N�erlandais',
    'Dutch': 'N�erlandais',
    'nl': 'N�erlandais',
    'NL': 'N�erlandais',
    '???????': 'Russe',
    'Russian': 'Russe',
    'ru': 'Russe',
    'RU': 'Russe',
    '??': 'Chinois',
    'Chinese': 'Chinois',
    'zh': 'Chinois',
    'ZH': 'Chinois',
    '???????': 'Arabe',
    'Arabic': 'Arabe',
    'ar': 'Arabe',
    'AR': 'Arabe'
  } as const;
  
  return LANGUAGE_MAP[language] || language;
};

const DEFAULT_AVATAR = '/default-avatar.png';

// Debug Firebase (VOTRE FONCTION EXACTE)
const debugFirebaseConnection = async (): Promise<{ success: boolean; totalDocs: number; error?: string }> => {
  console.log('?? === DEBUG FIREBASE CONNECTION ===');
  
  try {
    if (!db) {
      throw new Error('Firebase non initialis�');
    }
    
    const collectionRef = collection(db, 'sos_profiles');
    const allDocsSnapshot = await getDocs(query(collectionRef, fsLimit(50)));
    const totalDocs = allDocsSnapshot.size;
    
    console.log('?? Total documents trouv�s:', totalDocs);
    
    return { success: true, totalDocs };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('? Debug Firebase failed:', errorMessage);
    return { success: false, totalDocs: 0, error: errorMessage };
  }
};

// Props du composant
interface ProfileCarouselProps {
  className?: string;
  showStats?: boolean;
  pageSize?: number;
}

// === CONFIGURATION OPTIMIS�E ===
const MAX_VISIBLE = 20;
const ROTATE_INTERVAL_MS = 30000;
const ROTATE_COUNT = 8;

// Composant ProfileCarousel - VOTRE LOGIQUE M�TIER EXACTE SANS TEST_PROVIDERS
const ProfileCarousel: React.FC<ProfileCarouselProps> = ({ 
  className = "",
  showStats = false,
  pageSize = 12 
}) => {
  const { language } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [onlineProviders, setOnlineProviders] = useState<Provider[]>([]);
  const [visibleProviders, setVisibleProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationIndex, setRotationIndex] = useState(0);

  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const recentlyShown = useRef<Set<string>>(new Set());

  const isUserConnected = useMemo(() => {
    return !authLoading && !!user;
  }, [authLoading, user]);

  // Navigation avec URL SEO (VOTRE LOGIQUE EXACTE)
  const handleProfileClick = useCallback((provider: Provider) => {
    console.log('?? Navigation vers le profil de:', provider.name);
    
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
      console.warn('?? Erreur sessionStorage:', error);
    }
    
    navigate(seoUrl, {
      state: {
        selectedProvider: provider,
        navigationSource: 'home_carousel'
      }
    });
  }, [navigate]);

  // Algorithme de s�lection intelligente pour la rotation
  const selectVisibleProviders = useCallback((allProviders: Provider[]): Provider[] => {
    if (allProviders.length === 0) return [];

    // S�parer en ligne et hors ligne
    const online = allProviders.filter(p => p.isOnline);
    const offline = allProviders.filter(p => !p.isOnline);

    // M�langer chaque groupe
    const shuffledOnline = online.sort(() => Math.random() - 0.5);
    const shuffledOffline = offline.sort(() => Math.random() - 0.5);

    // Prioriser les profils en ligne, puis compl�ter avec offline
    const prioritized = [...shuffledOnline, ...shuffledOffline];

    // �viter les profils r�cemment affich�s si possible
    const notRecent = prioritized.filter(p => !recentlyShown.current.has(p.id));
    
    let selected = notRecent.slice(0, MAX_VISIBLE);
    
    // Si pas assez, compl�ter avec tous les profils
    if (selected.length < MAX_VISIBLE) {
      const remaining = prioritized.filter(p => !selected.includes(p));
      selected = [...selected, ...remaining].slice(0, MAX_VISIBLE);
    }

    // M�moriser les profils affich�s
    selected.forEach(p => recentlyShown.current.add(p.id));
    
    // Nettoyer le cache de r�cence s'il devient trop grand
    if (recentlyShown.current.size > 40) {
      const oldEntries = Array.from(recentlyShown.current).slice(0, 20);
      oldEntries.forEach(id => recentlyShown.current.delete(id));
    }

    return selected;
  }, []);

  // Chargement des providers avec Firebase (VOTRE LOGIQUE M�TIER EXACTE)
  const loadInitialProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('?? === D�BUT CHARGEMENT PROVIDERS ===');

      // Debug Firebase (VOTRE FONCTION EXACTE)
      const debugResult = await debugFirebaseConnection();
      
      if (!debugResult.success) {
        throw new Error(debugResult.error || '�chec de connexion Firebase');
      }

      // Si pas de documents, ne rien afficher (PAS DE TEST_PROVIDERS)
      if (debugResult.totalDocs === 0) {
        console.log('?? Aucun document Firebase trouv�');
        setOnlineProviders([]);
        setVisibleProviders([]);
        return;
      }

      // Charger depuis Firebase (VOTRE LOGIQUE EXACTE)
      const sosProfilesQuery = query(
        collection(db, 'sos_profiles'),
        where('isVisible', '==', true),
        where('type', 'in', ['lawyer', 'expat']),
        fsLimit(50)
      );
      
      const snapshot = await getDocs(sosProfilesQuery);
      console.log('?? Documents avec filtres:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('?? Aucun document avec filtres');
        setOnlineProviders([]);
        setVisibleProviders([]);
        return;
      }

      // Transformer les donn�es (VOTRE LOGIQUE EXACTE)
      const transformedProviders: Provider[] = [];
      
      for (const doc of snapshot.docs) {
        try {
          const data = doc.data();

          const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Expert';
          const type = data.type || 'expat';
          const country = data.currentPresenceCountry || data.country || '';

          if (!country) continue;

          // G�rer l'avatar (VOTRE LOGIQUE EXACTE)
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
            languages: Array.isArray(data.languages) ? data.languages : ['Fran�ais'],
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

          // Validation (VOTRE LOGIQUE EXACTE)
          const isLawyer = provider.type === 'lawyer';
          const isExpat = provider.type === 'expat';
          const approved = !isLawyer || (isLawyer && provider.isApproved === true);

          if ((isLawyer || isExpat) && approved && provider.name.trim() !== '' && provider.country.trim() !== '') {
            transformedProviders.push(provider);
          }

        } catch (error) {
          console.error('? Erreur transformation document:', doc.id, error);
        }
      }

      console.log('? Profils transform�s:', transformedProviders.length);
      setOnlineProviders(transformedProviders.slice(0, pageSize));
      
      // S�lection initiale intelligente pour la rotation
      const initialVisible = selectVisibleProviders(transformedProviders);
      setVisibleProviders(initialVisible);

    } catch (err) {
      console.error('? Erreur lors du chargement:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur de chargement: ${errorMessage}`);
      
      // Pas de fallback - afficher l'erreur uniquement
      setOnlineProviders([]);
      setVisibleProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, selectVisibleProviders]);

  // Rotation intelligente des profils visibles
  const rotateVisibleProviders = useCallback(() => {
    if (onlineProviders.length === 0) return;

    console.log('?? Rotation des profils...');
    
    // Garder une partie des profils actuels, remplacer le reste
    const keepCount = Math.max(0, MAX_VISIBLE - ROTATE_COUNT);
    const toKeep = visibleProviders.slice(0, keepCount);
    
    // S�lectionner de nouveaux profils du pool
    const availableForRotation = onlineProviders.filter(p => 
      !toKeep.find(kept => kept.id === p.id) && 
      !recentlyShown.current.has(p.id)
    );
    
    // Si pas assez de nouveaux profils, rel�cher la contrainte de r�cence
    let newProviders = availableForRotation.slice(0, ROTATE_COUNT);
    if (newProviders.length < ROTATE_COUNT) {
      const fallback = onlineProviders.filter(p => !toKeep.find(kept => kept.id === p.id));
      newProviders = [...newProviders, ...fallback].slice(0, ROTATE_COUNT);
    }
    
    // M�langer les nouveaux profils
    const shuffledNew = newProviders.sort(() => Math.random() - 0.5);
    
    // Combiner et m�langer le r�sultat final
    const rotated = [...toKeep, ...shuffledNew].sort(() => Math.random() - 0.5);
    
    setVisibleProviders(rotated.slice(0, MAX_VISIBLE));
    setRotationIndex(prev => prev + 1);
    
    // M�moriser les nouveaux profils affich�s
    shuffledNew.forEach(p => recentlyShown.current.add(p.id));
  }, [onlineProviders, visibleProviders]);

  // Mise � jour du statut en ligne en temps r�el (VOTRE LOGIQUE EXACTE)
  const updateProviderOnlineStatus = useCallback((providerId: string, isOnline: boolean) => {
    setOnlineProviders(prevProviders => 
      prevProviders.map(provider => 
        provider.id === providerId 
          ? { ...provider, isOnline }
          : provider
      )
    );

    setVisibleProviders(prevVisible => 
      prevVisible.map(provider => 
        provider.id === providerId 
          ? { ...provider, isOnline }
          : provider
      )
    );
  }, []);

  // Configuration de l'�coute en temps r�el (VOTRE LOGIQUE EXACTE)
  const setupRealtimeListeners = useCallback(() => {
    if (!isUserConnected || visibleProviders.length === 0) {
      return () => {};
    }

    const unsubscribeFunctions: (() => void)[] = [];

    visibleProviders.forEach(provider => {
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
          console.error(`? Erreur listener pour ${provider.id}:`, error);
        }
      );

      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [visibleProviders, updateProviderOnlineStatus, isUserConnected]);

  // Timer de rotation
  useEffect(() => {
    if (rotationTimer.current) {
      clearInterval(rotationTimer.current);
    }

    if (visibleProviders.length > 0 && onlineProviders.length > MAX_VISIBLE) {
      rotationTimer.current = setInterval(() => {
        rotateVisibleProviders();
      }, ROTATE_INTERVAL_MS);
    }

    return () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current);
      }
    };
  }, [rotateVisibleProviders, visibleProviders.length, onlineProviders.length]);

  // Effects
  useEffect(() => {
    loadInitialProviders();
  }, [loadInitialProviders]);

  useEffect(() => {
    if (visibleProviders.length === 0) return;
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, [setupRealtimeListeners, visibleProviders.length]);

  // Stats calcul�es (VOTRE LOGIQUE EXACTE)
  const stats = useMemo(() => ({
    total: onlineProviders.length,
    online: onlineProviders.filter(p => p.isOnline).length,
    lawyers: onlineProviders.filter(p => p.type === 'lawyer').length,
    experts: onlineProviders.filter(p => p.type === 'expat').length
  }), [onlineProviders]);

  // Gestion des �tats (VOTRE LOGIQUE EXACTE)
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
        <span className="ml-3 text-gray-600">Chargement des experts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadInitialProviders}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          R�essayer
        </button>
      </div>
    );
  }

  // Utiliser visibleProviders au lieu d'onlineProviders pour l'affichage
  const displayProviders = visibleProviders.length > 0 ? visibleProviders : onlineProviders;

  if (displayProviders.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">??</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Aucun expert disponible
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Aucun profil n'a �t� trouv� dans la base de donn�es Firebase.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-blue-800 mb-2">V�rifications :</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>� Firebase est-il correctement configur� ?</li>
              <li>� Y a-t-il des profils dans 'sos_profiles' ?</li>
              <li>� Les profils ont-ils isVisible: true ?</li>
              <li>� Les types sont-ils 'lawyer' ou 'expat' ?</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Pour le scroll infini, on duplique les providers
  const infiniteProviders = [...displayProviders, ...displayProviders, ...displayProviders];

  return (
    <div className={className}>
      {/* Stats optionnelles (VOTRE DESIGN EXACT) */}
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

      {/* Indicateur de rotation si active */}
      {onlineProviders.length > MAX_VISIBLE && (
        <div className="flex justify-center mb-4">
          <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Rotation automatique � {displayProviders.filter(p => p.isOnline).length}/{displayProviders.length} en ligne
          </div>
        </div>
      )}

      {/* Mobile: Scroll horizontal (VOTRE DESIGN EXACT) */}
      <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:hidden">
        {displayProviders.map((provider, index) => (
          <div key={`${provider.id}-${rotationIndex}`} className="flex-shrink-0 snap-start">
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

      {/* Desktop: Animation infinie (VOTRE DESIGN EXACT) */}
      <div className="hidden md:flex gap-8 animate-infinite-scroll">
        {infiniteProviders.map((provider, index) => (
          <div key={`${provider.id}-${index}-${rotationIndex}`} className="flex-shrink-0">
            <ModernProfileCard
              provider={provider}
              onProfileClick={handleProfileClick}
              getLanguageLabel={getLanguageLabel}
              isUserConnected={isUserConnected}
              index={index % displayProviders.length}
            />
          </div>
        ))}
      </div>

      {/* Styles pour l'animation (VOTRE CSS EXACT) */}
      <style>{`
        @keyframes infinite-scroll {
% { transform: translateX(0); }
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



