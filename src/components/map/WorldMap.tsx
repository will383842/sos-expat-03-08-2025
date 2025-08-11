// src/components/map/WorldMap.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Wifi,
  WifiOff,
  Star,
  Phone,
  Eye,
  Shield,
  Maximize2,
  Minimize2,
  Users,
  Scale,
  Globe,
  Filter,
  Search,
  X,
  Zap,
  Award,
  TrendingUp
} from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  limit,
  where,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getCountryCoordinates, generateCountryPosition, validateCoordinates } from '../../utils/countryCoordinates';
import MarkerClusterGroup from 'react-leaflet-cluster';

import 'leaflet/dist/leaflet.css';

// ===== LOGS DEBUG =====
const LOG_PREFIX = '🗺️ [WorldMap]';
const logError = (message: string, ...data: unknown[]) => console.error(`${LOG_PREFIX} ❌ ${message}`, ...data);
const logInfo = (message: string, ...data: unknown[]) => console.log(`${LOG_PREFIX} ℹ️ ${message}`, ...data);
const logSuccess = (message: string, ...data: unknown[]) => console.log(`${LOG_PREFIX} ✅ ${message}`, ...data);

// ===== TYPES =====
interface Provider {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: 'lawyer' | 'expat';
  country: string;
  city?: string;
  profilePhoto?: string;
  mapLocation?: { lat: number; lng: number };
  isOnline: boolean;
  isVisibleOnMap: boolean;
  isApproved: boolean;
  isActive?: boolean;
  isVerified: boolean;
  rating: number;
  price: number;
  specialties?: string[];
  languages?: string[];
  responseTime?: number;
  totalReviews?: number;
}

interface WorldMapProps {
  height?: string;
  width?: string;
  className?: string;
  onProviderSelect?: (providerId: string) => void;
  showOnlineOnly?: boolean;
  filterByRole?: 'lawyer' | 'expat' | 'all';
  ariaLabel?: string;
  allowFullscreen?: boolean;
}

// ===== CONFIGURATION DES ICÔNES =====
const initializeLeafletIcons = () => {
  if (typeof window !== 'undefined') {
    try {
      // @ts-expect-error - champ privé des types Leaflet
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
      });
      logSuccess('Icônes Leaflet initialisées');
    } catch (error) {
      logError('Erreur initialisation icônes', error);
    }
  }
};
initializeLeafletIcons();

// ===== CRÉATION D'ICÔNES SVG MODERNES =====
const createAdvancedMarkerSVG = (isOnline: boolean, role: 'lawyer' | 'expat') => {
  const gradientId = `gradient-${role}-${isOnline ? 'online' : 'offline'}-${Math.random().toString(36).substr(2, 9)}`;

  const themes = {
    lawyer: {
      online: {
        primary: '#EF4444',
        secondary: '#DC2626',
        accent: '#FEE2E2',
        glow: 'rgba(239, 68, 68, 0.6)',
        shadow: 'rgba(239, 68, 68, 0.3)'
      },
      offline: {
        primary: '#9CA3AF',
        secondary: '#6B7280',
        accent: '#F3F4F6',
        glow: 'rgba(156, 163, 175, 0.4)',
        shadow: 'rgba(156, 163, 175, 0.2)'
      }
    },
    expat: {
      online: {
        primary: '#10B981',
        secondary: '#059669',
        accent: '#D1FAE5',
        glow: 'rgba(16, 185, 129, 0.6)',
        shadow: 'rgba(16, 185, 129, 0.3)'
      },
      offline: {
        primary: '#9CA3AF',
        secondary: '#6B7280',
        accent: '#F3F4F6',
        glow: 'rgba(156, 163, 175, 0.4)',
        shadow: 'rgba(156, 163, 175, 0.2)'
      }
    }
  } as const;

  const color = themes[role][isOnline ? 'online' : 'offline'];

  const svgString = `
    <svg width="48" height="64" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color.primary};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${color.secondary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color.accent};stop-opacity:0.8" />
        </linearGradient>
        <filter id="glow-${gradientId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="shadow-${gradientId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="${color.shadow}" flood-opacity="0.6"/>
        </filter>
      </defs>

      <ellipse cx="24" cy="58" rx="16" ry="5" fill="rgba(0,0,0,0.15)" />
      <path d="M24 4C14.059 4 6 12.059 6 22c0 15 18 36 18 36s18-21 18-36c0-9.941-8.059-18-18-18z" 
            fill="url(#${gradientId})" 
            stroke="white" 
            stroke-width="3"
            filter="${isOnline ? `url(#glow-${gradientId})` : `url(#shadow-${gradientId})`}" />
      <circle cx="24" cy="22" r="10" fill="white" fill-opacity="0.95" />
      ${role === 'lawyer' 
        ? `<g transform="translate(24, 22)">
             <path d="M-4 -6 L4 -6 L3 -2 L-3 -2 Z M-5 -2 L5 -2 L4 4 L-4 4 Z" 
                   fill="${color.primary}" stroke="${color.primary}" stroke-width="0.5" />
           </g>`
        : `<g transform="translate(24, 22)">
             <circle cx="0" cy="-3" r="3" fill="${color.primary}" />
             <path d="M-5 3 C-5 0 -3 -1 0 -1 C3 -1 5 0 5 3 Z" fill="${color.primary}" />
           </g>`
      }
      ${isOnline 
        ? `<circle cx="36" cy="12" r="6" fill="#10B981" stroke="white" stroke-width="3">
             <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
           </circle>
           <circle cx="36" cy="12" r="4" fill="white" opacity="0.8">
             <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
           </circle>`
        : `<circle cx="36" cy="12" r="6" fill="#EF4444" stroke="white" stroke-width="3" opacity="0.7" />`
      }
      ${isOnline 
        ? `<g transform="translate(12, 8)">
             <circle r="4" fill="#3B82F6" stroke="white" stroke-width="2"/>
             <path d="M-1.5 0 L-0.5 1 L1.5 -1" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
           </g>`
        : ''
      }
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};

// ===== ICÔNES MÉMORISÉES =====
const ADVANCED_ICONS = {
  lawyer: {
    online: new L.Icon({
      iconUrl: createAdvancedMarkerSVG(true, 'lawyer'),
      iconSize: [48, 64],
      iconAnchor: [24, 64],
      popupAnchor: [0, -64],
      className: 'advanced-marker lawyer online'
    }),
    offline: new L.Icon({
      iconUrl: createAdvancedMarkerSVG(false, 'lawyer'),
      iconSize: [48, 64],
      iconAnchor: [24, 64],
      popupAnchor: [0, -64],
      className: 'advanced-marker lawyer offline'
    })
  },
  expat: {
    online: new L.Icon({
      iconUrl: createAdvancedMarkerSVG(true, 'expat'),
      iconSize: [48, 64],
      iconAnchor: [24, 64],
      popupAnchor: [0, -64],
      className: 'advanced-marker expat online'
    }),
    offline: new L.Icon({
      iconUrl: createAdvancedMarkerSVG(false, 'expat'),
      iconSize: [48, 64],
      iconAnchor: [24, 64],
      popupAnchor: [0, -64],
      className: 'advanced-marker expat offline'
    })
  }
};

// ===== AVATAR MODERNE =====
const ModernAvatar: React.FC<{
  src?: string;
  alt: string;
  firstName?: string;
  fullName?: string;
  role: 'lawyer' | 'expat';
  size?: 'sm' | 'md' | 'lg';
}> = ({ src, alt, firstName, fullName, role, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-20 h-20 text-xl'
  } as const;

  const handleImageError = useCallback(() => {
    setImgError(true);
    setIsLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const fallbackLetter =
    firstName?.[0]?.toUpperCase() ||
    fullName?.[0]?.toUpperCase() ||
    '?';

  const roleColors = {
    lawyer: 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-200',
    expat: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-200'
  } as const;

  if (!src || imgError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${roleColors[role]} shadow-lg border-4 border-white`}>
        {fallbackLetter}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative shadow-lg border-4 border-white`}>
      {isLoading && (
        <div className={`absolute inset-0 ${roleColors[role]} flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-1/2 w-1/2 border-2 border-white border-t-transparent"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

// ===== COMPOSANTS UTILITAIRES =====
const MapInvalidator = React.memo(() => {
  const map = useMap();
  useEffect(() => {
    const safeInvalidate = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (map && (map as any)._panes) {
        try {
          map.invalidateSize();
          logSuccess('Carte invalidée avec succès');
        } catch (error) {
          logError('Erreur lors du resize', error);
        }
      }
    };
    const timeoutId = setTimeout(safeInvalidate, 100);
    return () => clearTimeout(timeoutId);
  }, [map]);
  return null;
});

const MapUpdater = React.memo(({ providers, isLoading }: { providers: Provider[]; isLoading: boolean }) => {
  const map = useMap();
  const prevProvidersRef = useRef<Provider[]>([]);

  useEffect(() => {
    if (isLoading || providers.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!map || !map.getContainer() || !(map as any)._loaded) return;

    setTimeout(() => {
      if (map && typeof map.invalidateSize === 'function' && map.getContainer()) {
        try {
          map.invalidateSize();
        } catch (error) {
          logError('Erreur invalidation', error);
        }
      }
    }, 100);

    const providersChanged = JSON.stringify(providers) !== JSON.stringify(prevProvidersRef.current);
    if (!providersChanged) return;

    prevProvidersRef.current = providers;
    const bounds: [number, number][] = [];

    providers.forEach((provider) => {
      if (provider.mapLocation && validateCoordinates(provider.mapLocation)) {
        bounds.push([provider.mapLocation.lat, provider.mapLocation.lng]);
      }
    });

    if (bounds.length > 0) {
      try {
        if (map && map.getContainer() && typeof map.fitBounds === 'function') {
          map.fitBounds(bounds as L.LatLngBoundsExpression, {
            padding: [30, 30],
            maxZoom: 6,
            animate: true
          });
        }
      } catch (error) {
        logError('Erreur fitBounds', error);
      }
    }
  }, [providers, map, isLoading]);

  return null;
});

// ===== COMPOSANT PRINCIPAL =====
const WorldMap: React.FC<WorldMapProps> = ({
  height = '600px',
  width = '100%',
  className = '',
  onProviderSelect,
  showOnlineOnly = false,
  filterByRole = 'all',
  ariaLabel = 'Carte mondiale des experts disponibles',
  allowFullscreen = true
}) => {
  logInfo('=== WORLDMAP: INITIALISATION ===');

  const { language } = useApp();
  const navigate = useNavigate();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'lawyer' | 'expat'>(filterByRole);
  const [showOnlineFilter, setShowOnlineFilter] = useState(showOnlineOnly);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapId = useMemo(() => `advanced-world-map-${Date.now()}`, []);

  // ✅ hook de protection de rechargement
  const loadingRef = useRef(false);

  // ===== FILTRAGE DES PROVIDERS =====
  const filteredProviders = useMemo(() => {
    if (!Array.isArray(providers)) return [];

    return providers.filter((provider) => {
      if (!provider || typeof provider !== 'object') return false;
      if (!provider.id || typeof provider.id !== 'string') return false;

      const matchesSearchQuery =
        !searchQuery ||
        provider.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.country.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        provider.isVisibleOnMap !== false &&
        !!provider.mapLocation &&
        validateCoordinates(provider.mapLocation) &&
        !!provider.country &&
        matchesSearchQuery &&
        (!showOnlineFilter || provider.isOnline) &&
        (selectedFilter === 'all' || provider.role === selectedFilter) &&
        (provider.role !== 'lawyer' || provider.isApproved !== false)
      );
    });
  }, [providers, searchQuery, showOnlineFilter, selectedFilter]);

  // ===== STATISTIQUES =====
  const statistics = useMemo(() => {
    const onlineLawyers = filteredProviders.filter((p) => p.isOnline && p.role === 'lawyer').length;
    const onlineExpats = filteredProviders.filter((p) => p.role === 'expat' && p.isOnline).length;
    return {
      onlineLawyers,
      onlineExpats,
      totalOnline: onlineLawyers + onlineExpats,
      totalLawyers: filteredProviders.filter((p) => p.role === 'lawyer').length,
      totalExpats: filteredProviders.filter((p) => p.role === 'expat').length,
      totalProviders: filteredProviders.length
    };
  }, [filteredProviders]);

  // ===== CHARGEMENT DES PROVIDERS =====
  const loadProviders = useCallback(async () => {
    if (loadingRef.current) {
      logInfo('Chargement déjà en cours, abandon');
      return;
    }

    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      logInfo('=== CHARGEMENT DES PROVIDERS ===');

      const baseQuery = query(
        collection(db, 'sos_profiles'),
        where('isVisible', '==', true),
        limit(500)
      );

      const snap = await getDocs(baseQuery);
      let docs: QueryDocumentSnapshot<DocumentData>[] = snap.docs;

      if (snap.empty) {
        logInfo('⚠️ Aucun profil visible trouvé, tentative avec isVisibleOnMap');
        const altSnap = await getDocs(
          query(collection(db, 'sos_profiles'), where('isVisibleOnMap', '==', true), limit(500))
        );
        if (!altSnap.empty) {
          docs = altSnap.docs; // ✅ on ne modifie pas l’objet snapshot
        } else {
          setProviders([]);
          return;
        }
      }

      const allProfiles: Provider[] = [];
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;

      const transformProviderData = async (doc: QueryDocumentSnapshot<DocumentData>): Promise<Provider | null> => {
        try {
          const data = doc.data();
          logInfo('🔄 Transformation du doc:', doc.id, data);

          const fullName =
            (data.fullName as string) ||
            `${(data.firstName as string) || ''} ${(data.lastName as string) || ''}`.trim() ||
            'Expert';
          const role = (data.type as 'lawyer' | 'expat') || 'expat';
          const country =
            (data.currentPresenceCountry as string) ||
            (data.country as string) ||
            (data.countryName as string) ||
            '';

          if (!country) {
            logInfo('⚠️ Pas de pays pour:', doc.id);
            return null;
          }

          let avatar =
            (data.profilePhoto as string) || (data.photoURL as string) || (data.avatar as string) || '';
          if (!avatar || !avatar.startsWith('http')) {
            avatar = '/default-avatar.png';
          }

          let mapLocation: { lat: number; lng: number } | null = null;
          const countryCoords = getCountryCoordinates(country);
          logInfo('Coordonnées pays trouvées:', country, countryCoords);
          if (countryCoords && validateCoordinates(countryCoords)) {
            // ✅ signature 1–2 args
            mapLocation = generateCountryPosition(countryCoords, doc.id);
            logSuccess(`Localisation générée pour ${doc.id}:`, mapLocation);
          }
          if (!mapLocation) {
            logError(`📍 Pas de localisation valide pour ${doc.id} - PROFIL IGNORÉ`);
            return null;
          }

          const provider: Provider = {
            id: doc.id,
            fullName: fullName.substring(0, 100),
            firstName: ((data.firstName as string) || '').toString().substring(0, 50),
            lastName: ((data.lastName as string) || '').toString().substring(0, 50),
            role,
            country: country.substring(0, 100),
            city: ((data.city as string) || '').toString().substring(0, 100),
            profilePhoto: avatar,
            mapLocation,
            isOnline: Boolean(data.isOnline),
            isVisibleOnMap: data.isVisibleOnMap !== false,
            isApproved: data.isApproved !== false,
            isActive: data.isActive !== false,
            isVerified: Boolean(data.isVerified),
            rating:
              typeof data.rating === 'number' && data.rating >= 0 && data.rating <= 5
                ? Math.round(data.rating * 10) / 10
                : 4.5,
            price:
              typeof data.price === 'number' && data.price > 0
                ? Math.min(data.price, 999)
                : role === 'lawyer'
                ? 49
                : 19,
            specialties: Array.isArray(data.specialties)
              ? data.specialties.slice(0, 8).map((s: unknown) => String(s).substring(0, 50))
              : [],
            languages: Array.isArray(data.languages)
              ? data.languages.slice(0, 8).map((l: unknown) => String(l).substring(0, 30))
              : [],
            responseTime:
              typeof data.responseTime === 'number'
                ? Math.min(Math.max(data.responseTime, 0), 1440)
                : undefined,
            totalReviews: typeof data.totalReviews === 'number' ? Math.max(data.totalReviews, 0) : 0
          };

          logInfo('Provider construit:', {
            id: provider.id,
            fullName: provider.fullName,
            role: provider.role,
            country: provider.country,
            isOnline: provider.isOnline,
            rating: provider.rating,
            price: provider.price,
            coordinates: `[${provider.mapLocation.lat}, ${provider.mapLocation.lng}]`
          });

          return provider;
        } catch (error) {
          logError('❌ Erreur transformation:', doc.id, error);
          return null;
        }
      };

      const isValidProvider = (provider: Provider): boolean => {
        const isLawyer = provider.role === 'lawyer';
        const isExpat = provider.role === 'expat';
        const approved = !isLawyer || provider.isApproved === true;

        const ok =
          (isLawyer || isExpat) &&
          approved &&
          provider.fullName.trim() !== '' &&
          provider.country.trim() !== '';

        if (!ok) {
          logInfo('❌ Provider invalide ou non approuvé:', provider.id, {
            role: provider.role,
            name: provider.fullName,
            country: provider.country,
            isApproved: provider.isApproved
          });
        }
        return ok;
      };

      for (const d of docs) {
        processedCount++;
        logInfo(`--- Traitement document ${processedCount}/${docs.length}: ${d.id} ---`);
        const p = await transformProviderData(d);
        if (p && isValidProvider(p)) {
          allProfiles.push(p);
          validCount++;
        } else {
          invalidCount++;
        }
      }

      logInfo('Valides / invalides:', validCount, invalidCount);
      setProviders(allProfiles);
      logSuccess(`🎯 ${allProfiles.length} profils finaux chargés pour la carte mondiale`);
    } catch (error: unknown) {
      logError('❌ Erreur lors du chargement des prestataires pour la carte:', error);

      const code = (error as { code?: string })?.code;
      if (code === 'permission-denied') {
        setError(
          language === 'fr'
            ? 'Accès aux données de la carte temporairement indisponible.'
            : 'Map data access temporarily unavailable.'
        );
      } else if (code === 'unavailable') {
        setError(
          language === 'fr'
            ? 'Service temporairement indisponible. Veuillez réessayer.'
            : 'Service temporarily unavailable. Please try again.'
        );
      } else {
        setError(language === 'fr' ? 'Erreur lors du chargement des données de la carte.' : 'Error loading map data.');
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      logInfo('=== FIN DU CHARGEMENT DES PROVIDERS ===');
    }
  }, [language]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  // ===== ACTIONS =====
  const handleProviderClick = useCallback(
    (providerId: string) => {
      if (!providerId) return;
      const sanitizedId = providerId.replace(/[^\w-]/g, '');
      if (!sanitizedId) return;

      try {
        if (onProviderSelect) {
          onProviderSelect(sanitizedId);
        } else {
          navigate(`/provider/${sanitizedId}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (error) {
        logError('Erreur navigation', error);
      }
    },
    [navigate, onProviderSelect]
  );

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedFilter('all');
    setShowOnlineFilter(false);
    setShowFilters(false);
  }, []);

  // ===== I18N =====
  const messages = {
    fr: {
      loading: 'Chargement de la carte...',
      error: 'Erreur de chargement',
      retry: 'Réessayer',
      noExperts: 'Aucun expert disponible sur la carte pour le moment.',
      searchPlaceholder: 'Rechercher un expert ou un pays...',
      online: 'En ligne',
      offline: 'Hors ligne',
      lawyer: 'Avocat',
      expat: 'Expatrié',
      callNow: 'Consulter maintenant',
      viewProfile: 'Voir le profil',
      reviews: 'avis',
      filters: 'Filtres',
      clearFilters: 'Effacer les filtres',
      onlineOnly: 'En ligne seulement',
      allExperts: 'Tous les experts',
      lawyers: 'Avocats',
      expats: 'Expatriés',
      expertsAvailable: 'experts disponibles',
      fullscreen: 'Plein écran',
      exitFullscreen: 'Quitter le plein écran'
    },
    en: {
      loading: 'Loading map...',
      error: 'Loading error',
      retry: 'Retry',
      noExperts: 'No experts available on the map at the moment.',
      searchPlaceholder: 'Search for an expert or country...',
      online: 'Online',
      offline: 'Offline',
      lawyer: 'Lawyer',
      expat: 'Expat',
      callNow: 'Consult now',
      viewProfile: 'View profile',
      reviews: 'reviews',
      filters: 'Filters',
      clearFilters: 'Clear filters',
      onlineOnly: 'Online only',
      allExperts: 'All experts',
      lawyers: 'Lawyers',
      expats: 'Expats',
      expertsAvailable: 'experts available',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit fullscreen'
    }
  } as const;
  const t = messages[language as keyof typeof messages] || messages.fr;

  // ===== RENDUS D'ÉTAT =====
  if (error) {
    return (
      <div
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl border border-red-100`}
        style={{ height, width }}
        id={mapId}
        role="alert"
        aria-label={error}
      >
        <div className="bg-white border border-red-200 p-8 rounded-2xl shadow-xl max-w-sm mx-4 text-center">
          <div className="text-red-600 font-semibold mb-4 text-lg">{t.error}</div>
          <p className="text-red-600 text-sm mb-6">{error}</p>
          <button
            onClick={loadProviders}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            aria-label={`${t.retry} - ${t.loading}`}
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl border border-blue-100`}
        style={{ height, width }}
        id={mapId}
        role="status"
        aria-label={t.loading}
      >
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md mx-4 text-center">
          <div className="relative mx-auto mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent absolute top-0 left-0"></div>
            <Globe className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-red-600" />
          </div>
          <p className="text-gray-700 text-xl font-medium mb-2">{t.loading}</p>
          <p className="text-gray-500 text-sm">Connexion aux experts mondiaux...</p>
        </div>
      </div>
    );
  }

  if (filteredProviders.length === 0) {
    return (
      <div
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-3xl border border-gray-200`}
        style={{ height, width }}
        id={mapId}
        role="status"
        aria-label={t.noExperts}
      >
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md mx-4 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-gray-600 text-lg mb-4">{t.noExperts}</p>
          <button
            onClick={clearFilters}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium"
          >
            {t.clearFilters}
          </button>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = [20, 0];

  return (
    <div
      id={mapId}
      ref={mapContainerRef}
      className={`relative ${className} rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-white ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''
      }`}
      style={isFullscreen ? { height: '100vh', width: '100vw' } : { height, width }}
      role="application"
      aria-label={ariaLabel}
    >
      {/* ===== HEADER ===== */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-2 rounded-xl shadow-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Experts disponibles</h2>
                <p className="text-sm text-gray-600">{statistics.totalOnline} {t.expertsAvailable}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-3 rounded-xl transition-all duration-200 ${
                  showFilters ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Filter className="w-5 h-5" />
                {(selectedFilter !== 'all' || showOnlineFilter || searchQuery) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </button>

              {allowFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-gray-700"
                  aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Filtres rapides */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedFilter === 'all' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              {t.allExperts}
            </button>
            <button
              onClick={() => setSelectedFilter('lawyer')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedFilter === 'lawyer' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Scale className="w-4 h-4 inline mr-2" />
              {t.lawyers} ({statistics.totalLawyers})
            </button>
            <button
              onClick={() => setSelectedFilter('expat')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedFilter === 'expat' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              {t.expats} ({statistics.totalExpats})
            </button>
            <button
              onClick={() => setShowOnlineFilter(!showOnlineFilter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                showOnlineFilter ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Wifi className="w-4 h-4 inline mr-2" />
              {t.onlineOnly}
            </button>
          </div>

          {/* Panneau de filtres avancés */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{t.filters}</h3>
                <button onClick={clearFilters} className="text-sm text-red-600 hover:text-red-700 font-medium">
                  {t.clearFilters}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Disponibilité</label>
                  <select
                    value={showOnlineFilter ? 'online' : 'all'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setShowOnlineFilter(e.target.value === 'online')}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="all">Tous</option>
                    <option value="online">En ligne seulement</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Type d'expert</label>
                  <select
                    value={selectedFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setSelectedFilter(e.target.value as 'all' | 'lawyer' | 'expat')
                    }
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="all">Tous les experts</option>
                    <option value="lawyer">Avocats</option>
                    <option value="expat">Expatriés</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== STATISTIQUES FLOTTANTES ===== */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl border border-gray-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-gray-800">{statistics.onlineLawyers}</span>
            <span className="text-gray-600">avocats</span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-gray-800">{statistics.onlineExpats}</span>
            <span className="text-gray-600">expatriés</span>
          </div>
        </div>
      </div>

{/* ===== CONTAINER CARTE ===== */}
<div className="absolute inset-0 pt-32" style={{ zIndex: 1 }}>
  <MapContainer
    key={`map-${filteredProviders.length}`}
    center={[20, 0]}
    zoom={2}
    minZoom={2}
    maxZoom={12}
    style={{ height: '100%', width: '100%', zIndex: 1 }}
    scrollWheelZoom
    touchZoom
    doubleClickZoom
    dragging
    attributionControl
    zoomControl
    preferCanvas={false}   // <- pour éliminer un souci de rendu vectoriel
    whenReady={() => { setMapReady(true); }}
  >
    {/* TEMP: tu peux basculer sur OSM pur pour éviter tout blocage côté tuiles */}
    <TileLayer
      attribution='&copy; OpenStreetMap contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />

    <MapInvalidator />
    <MapUpdater providers={filteredProviders} isLoading={isLoading} />

    {/* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        DEBUG: on REND DIRECTEMENT les marqueurs (SANS cluster)
        et on force l’icône par défaut Leaflet pour écarter un souci SVG
        <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< */}
    {mapReady && filteredProviders.length > 0 && (
      <>
        {filteredProviders.map((provider, index) => {
          const loc = provider.mapLocation;
          if (!loc || !validateCoordinates(loc)) return null;

          return (
            <Marker
              key={`${provider.id}-${index}`}
              position={[loc.lat, loc.lng]}
              // TEST 1 : icône par défaut (si ça s’affiche, tes SVG n’étaient pas en cause)
              icon={new L.Icon.Default()}
              // TEST 2 : mets zIndexOffset pour passer par-dessus tout
              zIndexOffset={1000}
              eventHandlers={{
                mouseover: (e) => (e.target as L.Marker).openPopup(),
                mouseout: (e) => (e.target as L.Marker).closePopup(),
                click: () => handleProviderClick(provider.id),
              }}
            >
              <Popup maxWidth={400} minWidth={350} className="modern-popup">
                {/* -> garde ton contenu de popup ici, inchangé <- */}
                <div className="p-4">
                  <div className="font-semibold">{provider.fullName}</div>
                  <div className="text-sm text-gray-600">{provider.country}</div>
                  <button
                    onClick={() => handleProviderClick(provider.id)}
                    className="mt-3 inline-flex items-center px-3 py-2 rounded-lg bg-red-600 text-white"
                  >
                    Voir le profil
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </>
    )}
  </MapContainer>
</div>


      {/* ===== LÉGENDE ===== */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl border border-gray-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">{t.lawyers}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">{t.expats}</span>
          </div>
        </div>
      </div>

      {/* ===== INDICATEUR PERF ===== */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl border border-gray-200">
        <div className="flex items-center space-x-3 text-sm">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-gray-700 font-medium">{filteredProviders.length} experts chargés</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* ===== STYLES ===== */}
      <style>{`
        @keyframes cluster-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes markerAppear {
          0% { opacity: 0; transform: translateY(-30px) scale(0.5); }
          60% { transform: translateY(-10px) scale(1.1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .advanced-marker { animation: markerAppear 0.8s ease-out; }
        .advanced-marker.online { filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.4)); }
        .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; border-radius: 1.5rem; }
        .leaflet-control-zoom {
          border: none !important; border-radius: 16px !important; box-shadow: 0 10px 25px rgba(0,0,0,.15) !important;
          overflow: hidden; backdrop-filter: blur(10px); background: rgba(255,255,255,.95) !important; margin-top: 10px !important; margin-right: 10px !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,.95) !important; color: #374151 !important; font-weight: bold !important; border: none !important;
          font-size: 20px !important; width: 44px !important; height: 44px !important; line-height: 44px !important; transition: all .2s ease !important;
        }
        .leaflet-control-zoom a:hover { background: #EF4444 !important; color: white !important; transform: scale(1.05); }
        .modern-popup .leaflet-popup-content-wrapper {
          border-radius: 1.5rem !important; box-shadow: 0 25px 50px rgba(0,0,0,.25) !important; border: 1px solid rgba(0,0,0,.1) !important; padding: 0 !important; backdrop-filter: blur(20px); overflow: hidden;
        }
        .modern-popup .leaflet-popup-content { margin: 0 !important; padding: 0 !important; max-height: 600px; overflow-y: auto; border-radius: 1.5rem; }
        .modern-popup .leaflet-popup-tip { background: white !important; border: 1px solid rgba(0,0,0,.1) !important; box-shadow: 0 5px 15px rgba(0,0,0,.15) !important; }
        .modern-popup .leaflet-popup-close-button {
          color: white !important; font-size: 24px !important; font-weight: bold !important; top: 15px !important; right: 15px !important;
          width: 32px !important; height: 32px !important; background: rgba(255,255,255,.2) !important; border-radius: 50% !important;
          display: flex !important; align-items: center !important; justify-content: center !important; backdrop-filter: blur(10px) !important;
          transition: all .2s ease !important; border: 2px solid rgba(255,255,255,.3) !important;
        }
        .modern-popup .leaflet-popup-close-button:hover { background: rgba(255,255,255,.3) !important; transform: scale(1.1) !important; border-color: rgba(255,255,255,.5) !important; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,.9) !important; backdrop-filter: blur(10px) !important; border-radius: 12px !important; padding: 6px 12px !important;
          border: 1px solid rgba(0,0,0,.1) !important; font-size: 11px !important; color: #6B7280 !important; margin: 8px !important;
        }
        .custom-cluster-icon { cursor: pointer; transition: all .3s ease; }
        .custom-cluster-icon:hover { transform: scale(1.1) !important; }
        .modern-popup .leaflet-popup-content::-webkit-scrollbar { width: 6px; }
        .modern-popup .leaflet-popup-content::-webkit-scrollbar-track { background: #F3F4F6; border-radius: 3px; }
        .modern-popup .leaflet-popup-content::-webkit-scrollbar-thumb { background: linear-gradient(to bottom,#6B7280,#9CA3AF); border-radius: 3px; }
        .modern-popup .leaflet-popup-content::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom,#4B5563,#6B7280); }
        @media (max-width: 768px) {
          .modern-popup .leaflet-popup-content-wrapper { max-width: 320px !important; }
          .leaflet-control-zoom a { width: 40px !important; height: 40px !important; line-height: 40px !important; font-size: 18px !important; }
          .advanced-marker { transform: scale(.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          .advanced-marker, .custom-cluster-icon, .leaflet-control-zoom a { animation: none !important; transition: none !important; }
          .modern-popup .leaflet-popup-close-button { transition: none !important; }
        }
        @media (prefers-contrast: high) {
          .leaflet-control-zoom a { border: 2px solid #000 !important; }
          .modern-popup .leaflet-popup-content-wrapper { border: 2px solid #000 !important; }
        }
        @media (prefers-color-scheme: dark) {
          .leaflet-control-zoom { background: rgba(31,41,55,.95) !important; }
          .leaflet-control-zoom a { background: rgba(31,41,55,.95) !important; color: #F9FAFB !important; }
          .leaflet-control-zoom a:hover { background: #EF4444 !important; color: white !important; }
          .leaflet-control-attribution { background: rgba(31,41,55,.9) !important; color: #D1D5DB !important; }
        }
        .leaflet-marker-icon { transition: all .3s cubic-bezier(.4,0,.2,1) !important; }
        .leaflet-marker-icon:hover { transform: translateY(-5px) scale(1.05) !important; filter: brightness(1.1) !important; }
        .leaflet-marker-icon:focus { outline: 3px solid #3B82F6 !important; outline-offset: 3px !important; }
        .leaflet-interactive { cursor: pointer !important; }
        .leaflet-interactive:hover { filter: brightness(1.1) saturate(1.1) !important; }
        @media (hover: none) and (pointer: coarse) {
          .leaflet-marker-icon { transform: scale(1.2) !important; }
          .leaflet-control-zoom a { min-height: 48px !important; min-width: 48px !important; }
          .modern-popup .leaflet-popup-close-button { min-height: 44px !important; min-width: 44px !important; }
        }
        .modern-popup { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important; line-height: 1.5 !important; }
        .leaflet-marker-icon, .custom-cluster-icon, .leaflet-control-zoom, .modern-popup .leaflet-popup-content-wrapper { will-change: transform !important; transform: translateZ(0) !important; }
        .leaflet-container:focus { outline: 3px solid #3B82F6 !important; outline-offset: 2px !important; }
        .leaflet-fade-anim .leaflet-tile { transition: opacity .2s ease-in-out !important; }
        .leaflet-zoom-anim .leaflet-zoom-animated { transition: transform .25s cubic-bezier(.4,0,.2,1) !important; }
      `}</style>
    </div>
  );
};

export default React.memo(WorldMap);
