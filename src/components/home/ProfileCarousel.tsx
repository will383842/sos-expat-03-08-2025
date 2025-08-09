import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getCountryCoordinates } from '../../utils/countryCoordinates';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { Star, MapPin, Phone } from 'lucide-react';

// Types
interface Provider {
  id: string;
  name: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  isOnline: boolean;
  avatar: string;
  profilePhoto?: string;
  description: string;
  price: number;
  duration: number;
  isApproved?: boolean;
}

// Constants
const LANGUAGE_MAP: Record<string, string> = {
  'Français': 'Français',
  'French': 'Français',
  'Anglais': 'Anglais',
  'English': 'Anglais',
  'Espagnol': 'Espagnol',
  'Spanish': 'Espagnol',
  'Español': 'Espagnol',
  'Allemand': 'Allemand',
  'German': 'Allemand',
  'Deutsch': 'Allemand',
  'Italien': 'Italien',
  'Italian': 'Italien',
  'Italiano': 'Italien',
  'Portugais': 'Portugais',
  'Portuguese': 'Portugais',
  'Português': 'Portugais',
  'Russe': 'Russe',
  'Russian': 'Russe',
  'Русский': 'Russe',
  'Chinois': 'Chinois',
  'Chinese': 'Chinois',
  '中文': 'Chinois',
  'Japonais': 'Japonais',
  'Japanese': 'Japonais',
  '日本語': 'Japonais',
  'Coréen': 'Coréen',
  'Korean': 'Coréen',
  '한국어': 'Coréen',
  'Arabe': 'Arabe',
  'Arabic': 'Arabe',
  'العربية': 'Arabe',
  'Hindi': 'Hindi',
  'हिन्दी': 'Hindi',
  'Thaï': 'Thaï',
  'Thai': 'Thaï',
  'ไทย': 'Thaï'
} as const;

const DEFAULT_AVATAR = '/default-avatar.png';

// Composant pour une carte de profil
const ProfileCard: React.FC<{ 
  provider: Provider; 
  onProfileClick: (provider: Provider) => void;
  getLanguageLabel: (lang: string) => string;
  isUserConnected: boolean;
}> = React.memo(({ provider, onProfileClick, getLanguageLabel, isUserConnected }) => {
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_AVATAR) {
      target.src = DEFAULT_AVATAR;
    }
  }, []);

  const handleClick = useCallback(() => {
    // ✅ CORRECTION : Navigation vers le profil avec données
    onProfileClick(provider);
  }, [provider, onProfileClick]);

  const truncateText = (text: string, maxLength: number): { text: string; isTruncated: boolean } => {
    if (text.length <= maxLength) {
      return { text, isTruncated: false };
    }
    return { text: text.substring(0, maxLength) + '...', isTruncated: true };
  };

  const { text: truncatedDescription, isTruncated } = truncateText(provider.description, 80);

  return (
    <article
      className={`profile-card ${
        provider.isOnline 
          ? 'border-green-500 shadow-green-500/20 hover:border-green-600 hover:shadow-green-600/30' 
          : 'border-red-500 shadow-red-500/20 hover:border-red-600 hover:shadow-red-600/30'
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Contacter ${provider.name}, ${provider.type === 'lawyer' ? 'avocat' : 'expatrié'} en ${provider.country} ${provider.isOnline ? '(en ligne)' : '(hors ligne)'}`}
      itemScope
      itemType="https://schema.org/Person"
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={provider.avatar || provider.profilePhoto || DEFAULT_AVATAR}
          alt={`Photo de profil de ${provider.name}`}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
          itemProp="image"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 group-hover:from-black/20 transition-all duration-500"></div>
        
        {/* Type badge */}
        <div className="absolute top-4 left-4">
          <div className={`px-4 py-2 rounded-2xl text-sm font-bold backdrop-blur-xl ${
            provider.type === 'lawyer' 
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
          }`}>
            {provider.type === 'lawyer' ? '⚖️ Avocat' : '🌍 Expatrié'}
          </div>
        </div>
        
        {/* Rating badge */}
        <div className="absolute top-4 right-4">
          <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Online status - ALWAYS visible */}
        <div className="absolute bottom-4 right-4">
          <div className={`w-5 h-5 rounded-full shadow-xl border-2 border-white ${
            provider.isOnline 
              ? 'bg-green-500 shadow-green-500/60 animate-pulse' 
              : 'bg-red-500 shadow-red-500/60'
          }`}></div>
        </div>

        {/* Status badge - Show online/offline status */}
        <div className="absolute bottom-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm transition-all duration-300 ${
            provider.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1 transition-all duration-300 ${
              provider.isOnline ? 'bg-white animate-pulse' : 'bg-gray-300'
            }`} aria-hidden="true" />
            {provider.isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
          {provider.name}
        </h3>
        
        <div className="flex items-center space-x-1 mb-3" role="img" aria-label={`Note: ${provider.rating} sur 5 étoiles`}>
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(provider.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-900 ml-1">
            {provider.rating.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500">
            ({provider.reviewCount})
          </span>
        </div>

        <div className="space-y-3 mb-4">
          {/* Languages */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">🗣️</span>
              <span className="text-xs font-semibold text-gray-700">Langues parlées</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {provider.languages.slice(0, 2).map((lang, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                >
                  {getLanguageLabel(lang)}
                </span>
              ))}
              {provider.languages.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{provider.languages.length - 2}
                </span>
              )}
            </div>
          </div>

          {/* Country */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-semibold text-gray-700">Pays d'intervention</span>
            </div>
            <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
              {provider.country}
            </div>
          </div>

          {/* Description */}
          {provider.description && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📋</span>
                <span className="text-xs font-semibold text-gray-700">Présentation</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {truncatedDescription}
              </p>
              {isTruncated && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium mt-1 hover:underline transition-colors"
                >
                  Lire la suite →
                </button>
              )}
            </div>
          )}
        </div>
        
        <button 
          className={`w-full py-2 px-4 text-white rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            provider.isOnline
              ? (provider.type === 'lawyer' 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500')
              : 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          type="button"
        >
          {provider.isOnline ? (
            <>
              <Phone className="w-4 h-4 inline mr-2" />
              Voir le profil
            </>
          ) : (
            <>
              <span className="text-sm mr-2">👤</span>
              Voir le profil
            </>
          )}
        </button>
      </div>
    </article>
  );
});

ProfileCard.displayName = 'ProfileCard';

// Composant principal
const ProfileCarousel: React.FC = () => {
  const { language } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [onlineProviders, setOnlineProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Détermine si l'utilisateur est connecté
  const isUserConnected = useMemo(() => {
    return !authLoading && !!user;
  }, [authLoading, user]);

  // Fonction pour obtenir le label de langue
  const getLanguageLabel = useCallback((language: string): string => {
    const fullLanguageName = LANGUAGE_MAP[language] || language;
    
    if (fullLanguageName.length === 2) {
      const isoToLanguage: Record<string, string> = {
        'EN': 'Anglais',
        'FR': 'Français', 
        'ES': 'Espagnol',
        'DE': 'Allemand',
        'IT': 'Italien',
        'PT': 'Portugais',
        'ZH': 'Chinois',
        'TH': 'Thaï',
        'JP': 'Japonais',
        'KO': 'Coréen',
        'AR': 'Arabe',
        'RU': 'Russe'
      };
      return isoToLanguage[fullLanguageName.toUpperCase()] || fullLanguageName;
    }
    
    return fullLanguageName;
  }, []);

  // ✅ CORRECTION PRINCIPALE : Navigation vers le profil avec URL SEO
  const handleProfileClick = useCallback((provider: Provider) => {
    console.log('🔗 Navigation vers le profil de:', provider.name);
    
    // Générer URL SEO standardisée compatible avec ProviderProfile.tsx
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
    
    // URL compatible avec ProviderProfile.tsx
    const seoUrl = `/${typeSlug}/${countrySlug}/francais/${provider.id}`;

    // 🔍 AJOUTER CES LOGS ICI (ligne 394)
console.log('🔗 NAVIGATION DEBUG - ProfileCarousel.tsx');
console.log('🔗 URL générée:', seoUrl);
console.log('🔗 Provider ID:', provider.id);
console.log('🔗 Provider name:', provider.name);
console.log('🔗 Provider type:', provider.type);
console.log('🔗 Provider country:', provider.country);
console.log('🔗 ========================================');


    console.log('🔗 URL générée:', seoUrl);
    
    // Sauvegarder pour compatibilité
    try {
      sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
    } catch (error) {
      console.warn('⚠️ Erreur sessionStorage:', error);
    }
    
    // Navigation avec données dans le state
    navigate(seoUrl, {
      state: {
        selectedProvider: provider,
        navigationSource: 'home_carousel'
      }
    });
  }, [navigate]);

  // Transformation des données Firestore
  const transformProviderData = useCallback(async (doc: any): Promise<Provider | null> => {
    try {
      const data = doc.data();
      console.log('🔄 Transformation du doc:', doc.id, data);

      const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Expert';
      const type = data.type || 'expat';
      const country = data.currentPresenceCountry || data.country || '';

      if (!country) {
        console.log('⚠️ Pas de pays pour:', doc.id);
        return null;
      }

      // Sécurité coordonnées
      let hasValidCountry = true;
      try {
        hasValidCountry = getCountryCoordinates(country) !== null;
      } catch (error) {
        console.log('⚠️ Erreur coordonnées pour:', country, error);
      }

      // Gérer l'avatar Firebase
      let avatar = data.profilePhoto || data.photoURL || data.avatar || '';
      if (avatar && avatar.startsWith('user_uploads/')) {
        try {
          const storageRef = ref(storage, avatar);
          avatar = await getDownloadURL(storageRef);
        } catch (e) {
          console.warn('⚠️ Impossible de récupérer le lien public de la photo', avatar);
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

      console.log('✅ Provider créé:', provider);
      return provider;
    } catch (error) {
      console.error('❌ Erreur transformation:', doc.id, error);
      return null;
    }
  }, []);

  // Filtrage des prestataires valides
  const isValidProvider = useCallback((provider: Provider): boolean => {
    const isLawyer = provider.type === 'lawyer';
    const isExpat = provider.type === 'expat';

    // Avocats doivent être validés, expatriés sont visibles d'office
    const approved = !isLawyer || (isLawyer && (provider as any).isApproved === true);

    const isValid = (
      (isLawyer || isExpat) &&
      approved &&
      provider.name.trim() !== '' &&
      provider.country.trim() !== ''
    );

    if (!isValid) {
      console.log('❌ Provider invalide ou non approuvé:', provider.id, {
        type: provider.type,
        name: provider.name,
        country: provider.country,
        isApproved: (provider as any).isApproved
      });
    }

    return isValid;
  }, []);

  // Mise à jour du statut en ligne en temps réel
  const updateProviderOnlineStatus = useCallback((providerId: string, isOnline: boolean) => {
    setOnlineProviders(prevProviders => 
      prevProviders.map(provider => 
        provider.id === providerId 
          ? { ...provider, isOnline }
          : provider
      )
    );
    console.log(`🟢 Statut mis à jour pour ${providerId}: ${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
  }, []);

  // Chargement initial des prestataires
  const loadInitialProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Début du chargement initial des profils...');

      const sosProfilesQuery = query(
        collection(db, 'sos_profiles'),
        where('isVisible', '==', true),
        where('type', 'in', ['lawyer', 'expat']),
        limit(50)
      );
      
      const snapshot = await getDocs(sosProfilesQuery);
      console.log('📊 Nombre de documents trouvés:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('⚠️ Aucun document trouvé dans la collection');
        setOnlineProviders([]);
        return;
      }

      const transformedProviders = (
        await Promise.all(snapshot.docs.map(transformProviderData))
      ).filter((provider): provider is Provider => provider !== null);
      
      console.log('🔄 Après transformation:', transformedProviders.length);

      const validProviders = transformedProviders
        .filter(provider => {
          const isVisibleExpat = provider.type === 'expat';
          const isVisibleLawyer = provider.type === 'lawyer' && (provider as any).isApproved === true;
          return isValidProvider(provider) && (isVisibleExpat || isVisibleLawyer);
        })
        .slice(0, 12);

      console.log('✅ Profils valides finaux:', validProviders.length);
      setOnlineProviders(validProviders);

    } catch (err) {
      console.error('❌ Erreur lors du chargement initial:', err);
      setError(`Erreur de chargement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setOnlineProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, [transformProviderData, isValidProvider]);

  // Configuration de l'écoute en temps réel
  const setupRealtimeListeners = useCallback(() => {
    if (!isUserConnected) {
      console.log('ℹ️ Utilisateur non connecté, pas de listeners temps réel');
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
      console.log('🧹 Listeners temps réel nettoyés');
    };
  }, [onlineProviders, updateProviderOnlineStatus, isUserConnected]);

  // Effect pour le chargement initial
  useEffect(() => {
    loadInitialProviders();
  }, [loadInitialProviders]);

  // Effect pour configurer les listeners temps réel
  useEffect(() => {
    if (onlineProviders.length === 0) return;

    console.log('🔄 Configuration des listeners temps réel pour', onlineProviders.length, 'prestataires');
    const cleanup = setupRealtimeListeners();

    return cleanup;
  }, [setupRealtimeListeners, onlineProviders.length]);

  // Textes internationalisés
  const texts = useMemo(() => ({
    title: language === 'fr' ? 'Experts disponibles' : 'Available experts',
    subtitle: language === 'fr' 
      ? `${onlineProviders.length} experts prêts à vous aider`
      : `${onlineProviders.length} experts ready to help you`,
    subtitleGuest: language === 'fr'
      ? `${onlineProviders.length} experts disponibles - Connectez-vous pour les contacter`
      : `${onlineProviders.length} experts available - Log in to contact them`,
    viewAll: language === 'fr' ? 'Voir tous les experts' : 'View all experts',
    viewAllGuest: language === 'fr' ? 'Se connecter pour voir tous les experts' : 'Log in to see all experts',
    loading: language === 'fr' ? 'Chargement des experts...' : 'Loading experts...'
  }), [language, onlineProviders.length]);

  // États de chargement et d'erreur
  if (isLoading) {
    return (
      <section className="profile-carousel" aria-label={texts.loading}>
        <div className="profile-carousel-container">
          <div className="flex justify-center items-center" style={{ minHeight: '200px' }}>
            <div className="spinner" role="status" aria-label={texts.loading}></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="profile-carousel">
        <div className="profile-carousel-container">
          <div className="text-center">
            <p className="text-error mb-md" role="alert">{error}</p>
            <button 
              onClick={loadInitialProviders}
              className="btn btn--primary"
            >
              Réessayer
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (onlineProviders.length === 0) {
    return null;
  }

  // Duplication pour le défilement infini
  const displayProviders = [...onlineProviders, ...onlineProviders];

  return (
    <section className="profile-carousel" aria-labelledby="experts-title">
      <div className="profile-carousel-container">
        <header className="profile-carousel-header">
          <h2 id="experts-title" className="profile-carousel-title">
            {texts.title}
          </h2>
          <p className="profile-carousel-subtitle">
            {isUserConnected ? texts.subtitle : texts.subtitleGuest}
          </p>
          
          {!isUserConnected && (
            <div className="profile-info-notice">
              <p className="profile-info-notice-text">
                <span className="font-semibold">💡 Astuce :</span> 
                {language === 'fr' 
                  ? ' Connectez-vous pour voir le statut en temps réel et contacter directement les experts.'
                  : ' Log in to see real-time status and contact experts directly.'
                }
              </p>
            </div>
          )}
        </header>
        
        <div className="profile-cards-wrapper" role="region" aria-label="Carousel des experts">
          {/* Mobile: Scroll horizontal */}
          <div className="profile-cards-mobile">
            {onlineProviders.map((provider) => (
              <ProfileCard
                key={provider.id}
                provider={provider}
                onProfileClick={handleProfileClick}
                getLanguageLabel={getLanguageLabel}
                isUserConnected={isUserConnected}
              />
            ))}
          </div>

          {/* Desktop: Animation automatique */}
          <div className="profile-cards-desktop">
            {displayProviders.map((provider, index) => (
              <ProfileCard
                key={`${provider.id}-${index}`}
                provider={provider}
                onProfileClick={handleProfileClick}
                getLanguageLabel={getLanguageLabel}
                isUserConnected={isUserConnected}
              />
            ))}
          </div>
        </div>
        
        <div className="profile-carousel-cta">
          {isUserConnected ? (
            <a href="/sos-appel" className="profile-carousel-cta-button">
              {texts.viewAll}
            </a>
          ) : (
            <a href="/login?redirect=/sos-appel" className="profile-carousel-cta-button profile-carousel-cta-button--auth">
              <span className="mr-2" aria-hidden="true">🔑</span>
              {texts.viewAllGuest}
            </a>
          )}
        </div>
      </div>
      
      {/* Styles pour l'animation */}
      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .profile-cards-desktop {
          display: none;
          animation: scroll-left 60s linear infinite;
        }
        
        .profile-cards-mobile {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 1rem;
          padding-left: 1rem;
          padding-right: 1rem;
          margin-left: -1rem;
          margin-right: -1rem;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        
        .profile-cards-mobile::-webkit-scrollbar {
          display: none;
        }
        
        @media (min-width: 768px) {
          .profile-cards-mobile {
            display: none;
          }
          
          .profile-cards-desktop {
            display: flex;
            gap: 1.5rem;
          }
        }
        
        .profile-cards-desktop:hover {
          animation-play-state: paused;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .profile-cards-desktop {
            animation: none;
          }
        }
        
        .profile-card {
          flex-shrink: 0;
          width: 280px;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}</style>
    </section>
  );
};

export default React.memo(ProfileCarousel);