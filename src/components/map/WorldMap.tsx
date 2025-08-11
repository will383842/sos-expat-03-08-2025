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

// ===== LOGS DEBUG (accept any number of extra args) =====
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
      // @ts-expect-error - private field in Leaflet types
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

// ===== CRÉATION D'ICÔNES SVG =====
const createAdvancedMarkerSVG = (isOnline: boolean, role: 'lawyer' | 'expat') => {
  const gradientId = `gradient-${role}-${isOnline ? 'online' : 'offline'}-${Math.random().toString(36).slice(2, 11)}`;
  // ... (unchanged SVG builder)
  // NOTE: keep your original SVG string here
  const svgString = `...`; // <-- keep your existing SVG content
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};

// ===== ICÔNES MÉMORISÉES =====
const ADVANCED_ICONS = {
  lawyer: {
    online: new L.Icon({ iconUrl: createAdvancedMarkerSVG(true, 'lawyer'), iconSize: [48, 64], iconAnchor: [24, 64], popupAnchor: [0, -64], className: 'advanced-marker lawyer online' }),
    offline: new L.Icon({ iconUrl: createAdvancedMarkerSVG(false, 'lawyer'), iconSize: [48, 64], iconAnchor: [24, 64], popupAnchor: [0, -64], className: 'advanced-marker lawyer offline' })
  },
  expat: {
    online: new L.Icon({ iconUrl: createAdvancedMarkerSVG(true, 'expat'), iconSize: [48, 64], iconAnchor: [24, 64], popupAnchor: [0, -64], className: 'advanced-marker expat online' }),
    offline: new L.Icon({ iconUrl: createAdvancedMarkerSVG(false, 'expat'), iconSize: [48, 64], iconAnchor: [24, 64], popupAnchor: [0, -64], className: 'advanced-marker expat offline' })
  }
};

// ===== AVATAR MODERNE (unchanged) =====
// ... keep your ModernAvatar component exactly as-is ...

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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'lawyer' | 'expat'>(filterByRole); // ← use prop
  const [showOnlineFilter, setShowOnlineFilter] = useState(showOnlineOnly); // ← use prop

  // ✅ FIX: move this hook OUTSIDE the callback
  const loadingRef = useRef(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapId = useMemo(() => `advanced-world-map-${Date.now()}`, []);

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

      let docs = snap.docs;

      if (snap.empty) {
        logInfo('⚠️ Aucun profil visible trouvé, tentative avec isVisibleOnMap');
        const altSnap = await getDocs(
          query(collection(db, 'sos_profiles'), where('isVisibleOnMap', '==', true), limit(500))
        );
        if (altSnap.empty) {
          setProviders([]);
          return;
        }
        docs = altSnap.docs; // ✅ don’t mutate snapshot
      }

      const allProfiles: Provider[] = [];
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
          const country = (data.currentPresenceCountry as string) || (data.country as string) || '';

          if (!country) return null;

          let avatar = (data.profilePhoto as string) || (data.photoURL as string) || (data.avatar as string) || '';
          if (!avatar || !avatar.startsWith('http')) avatar = '/default-avatar.png';

          // coords
          let mapLocation: { lat: number; lng: number } | null = null;
          const countryCoords = getCountryCoordinates(country);
          if (countryCoords && validateCoordinates(countryCoords)) {
            // ✅ call with 1–2 args only
            mapLocation = generateCountryPosition(countryCoords, doc.id);
            logSuccess('Localisation générée', mapLocation);
          }

          if (!mapLocation) return null;

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
              typeof data.responseTime === 'number' ? Math.min(Math.max(data.responseTime, 0), 1440) : undefined,
            totalReviews: typeof data.totalReviews === 'number' ? Math.max(data.totalReviews, 0) : 0
          };

          logInfo('Provider construit:', {
            id: provider.id,
            fullName: provider.fullName,
            role: provider.role,
            country: provider.country,
            isOnline: provider.isOnline,
            rating: provider.rating,
            price: provider.price
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
        setError(language === 'fr' ? 'Accès aux données de la carte temporairement indisponible.' : 'Map data access temporarily unavailable.');
      } else if (code === 'unavailable') {
        setError(language === 'fr' ? 'Service temporairement indisponible. Veuillez réessayer.' : 'Service temporarily unavailable. Please try again.');
      } else {
        setError(language === 'fr' ? 'Erreur lors du chargement des données de la carte.' : 'Error loading map data.');
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false; // ✅ release lock
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

  // ===== I18N (unchanged contents) =====
  const messages = { /* ... keep your existing FR/EN object ... */ } as const;
  const t = (messages as any)[language] || (messages as any).fr;

  // ===== RENDU (unchanged markup except small TS fixes & style tag) =====
  if (error) {
    // ... unchanged error card ...
  }

  if (isLoading) {
    // ... unchanged loading card ...
  }

  if (filteredProviders.length === 0) {
    // ... unchanged empty state (just uses clearFilters) ...
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
      {/* header, search, filters — unchanged except typed onChange handlers */}
      {/* Search input */}
      {/* Example of typed handler: */}
      {/* onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} */}

      {/* Map */}
      <div className="absolute inset-0 pt-32" style={{ zIndex: 1 }}>
        <MapContainer
          key={`map-${filteredProviders.length}`}
          center={mapCenter}
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
          preferCanvas
          whenReady={() => {
            logSuccess('MapContainer prêt');
            setMapReady(true);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            tileSize={256}
            detectRetina
            crossOrigin
          />
          <MapInvalidator />
          <MapUpdater providers={filteredProviders} isLoading={isLoading} />

          {mapReady && filteredProviders.length > 0 && (
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={(cluster) => {
                const count = cluster.getChildCount();
                const size = count < 10 ? 40 : count < 100 ? 50 : 60;
                return new L.DivIcon({
                  html: `<div style="
                    width:${size}px;height:${size}px;
                    background:linear-gradient(135deg,#EF4444,#DC2626);
                    border:4px solid white;border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    color:white;font-weight:bold;font-size:${size > 50 ? '18px' : '14px'};
                    box-shadow:0 8px 25px rgba(239,68,68,.4);animation:cluster-pulse 2s ease-in-out infinite;
                  ">${count}</div>`,
                  className: 'custom-cluster-icon',
                  iconSize: [size, size]
                });
              }}
              maxClusterRadius={60}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
              zoomToBoundsOnClick
              spiderfyDistanceMultiplier={1.5}
              removeOutsideVisibleBounds
              animate
              animateAddingMarkers
              disableClusteringAtZoom={10}
            >
              {filteredProviders.map((provider, index) => {
                if (!provider.mapLocation || !validateCoordinates(provider.mapLocation)) return null;
                const icon = ADVANCED_ICONS[provider.role][provider.isOnline ? 'online' : 'offline'];
                const { lat, lng } = provider.mapLocation; // non-null after guard
                return (
                  <Marker
                    key={`${provider.id}-${index}-${provider.isOnline ? 'on' : 'off'}`}
                    position={[lat, lng]}
                    icon={icon}
                    alt={`${provider.role}-${provider.id}`}
                  >
                    <Popup maxWidth={400} minWidth={350} className="modern-popup">
                      {/* ... your popup content unchanged ... */}
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          )}
        </MapContainer>
      </div>

      {/* legend, stats, etc — unchanged */}

      {/* ✅ FIX: use plain <style>, not Next.js <style jsx> */}
      <style>{`
        /* keep your CSS exactly as before */
      `}</style>
    </div>
  );
};

export default React.memo(WorldMap);
