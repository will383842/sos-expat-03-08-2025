import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Wifi, WifiOff, Star, Phone, Eye, Shield, Maximize2, Minimize2 } from 'lucide-react';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { getCountryCoordinates, generateCountryPosition, validateCoordinates } from '../../utils/countryCoordinates';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';

// ===== Logs
const LOG_PREFIX = '🗺️[WorldMap]';
const log = {
  e: (m: string, d?: any) => console.error(`${LOG_PREFIX} ❌ ${m}`, d),
  w: (m: string, d?: any) => console.warn(`${LOG_PREFIX} ⚠️ ${m}`, d),
  i: (m: string, d?: any) => console.info(`${LOG_PREFIX} ℹ️ ${m}`, d),
  s: (m: string, d?: any) => console.log(`${LOG_PREFIX} ✅ ${m}`, d),
  d: (m: string, d?: any) => console.debug(`${LOG_PREFIX} 🔍 ${m}`, d),
};

// ===== Types
interface ClusterMarker extends L.Marker {
  options: { alt?: string };
}
interface ClusterGroup {
  getChildCount(): number;
  getAllChildMarkers(): ClusterMarker[];
}
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

// ===== Leaflet default icons (fix CDN)
const initializeLeafletIcons = () => {
  if (typeof window === 'undefined') return;
  try {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
    log.s('Leaflet default icons set');
  } catch (err) {
    log.e('init leaflet icons', err);
  }
};
initializeLeafletIcons();

// ===== Country names
const getTranslatedCountryName = (countryName: string, language: string): string => {
  const t: Record<string, Record<string, string>> = {
    France: { fr: 'France', en: 'France' },
    'États-Unis': { fr: 'États-Unis', en: 'United States' },
    'United States': { fr: 'États-Unis', en: 'United States' },
    Allemagne: { fr: 'Allemagne', en: 'Germany' },
    Germany: { fr: 'Allemagne', en: 'Germany' },
    Espagne: { fr: 'Espagne', en: 'Spain' },
    Spain: { fr: 'Espagne', en: 'Spain' },
    Italie: { fr: 'Italie', en: 'Italy' },
    Italy: { fr: 'Italie', en: 'Italy' },
    'Royaume-Uni': { fr: 'Royaume-Uni', en: 'United Kingdom' },
    'United Kingdom': { fr: 'Royaume-Uni', en: 'United Kingdom' },
    Canada: { fr: 'Canada', en: 'Canada' },
    Japon: { fr: 'Japon', en: 'Japan' },
    Japan: { fr: 'Japon', en: 'Japan' },
    Chine: { fr: 'Chine', en: 'China' },
    China: { fr: 'Chine', en: 'China' },
    Australie: { fr: 'Australie', en: 'Australia' },
    Australia: { fr: 'Australie', en: 'Australia' },
    Brésil: { fr: 'Brésil', en: 'Brazil' },
    Brazil: { fr: 'Brésil', en: 'Brazil' },
    Suisse: { fr: 'Suisse', en: 'Switzerland' },
    Switzerland: { fr: 'Suisse', en: 'Switzerland' },
    Belgique: { fr: 'Belgique', en: 'Belgium' },
    Belgium: { fr: 'Belgique', en: 'Belgium' },
    'Pays-Bas': { fr: 'Pays-Bas', en: 'Netherlands' },
    Netherlands: { fr: 'Pays-Bas', en: 'Netherlands' },
    Suède: { fr: 'Suède', en: 'Sweden' },
    Sweden: { fr: 'Suède', en: 'Sweden' },
    Norvège: { fr: 'Norvège', en: 'Norway' },
    Norway: { fr: 'Norvège', en: 'Norway' },
    Danemark: { fr: 'Danemark', en: 'Denmark' },
    Denmark: { fr: 'Danemark', en: 'Denmark' },
  };
  return t[countryName]?.[language] || countryName;
};

// ===== SVG marker -> dataURL (NO stray code!)
const createModernMarkerSVG = (isOnline: boolean, role: 'lawyer' | 'expat'): string => {
  const roleColors =
    role === 'lawyer'
      ? { primary: '#2563EB', secondary: '#1D4ED8', accent: '#93C5FD' }
      : { primary: '#059669', secondary: '#047857', accent: '#86EFAC' };

  const palette = isOnline
    ? roleColors
    : { primary: '#9CA3AF', secondary: '#6B7280', accent: '#D1D5DB' };

  const gradientId = `grad-${role}-${isOnline ? 'on' : 'off'}`;
  const svg = `
  <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${palette.primary};stop-opacity:1"/>
        <stop offset="55%" style="stop-color:${palette.secondary};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${palette.accent};stop-opacity:1"/>
      </linearGradient>
    </defs>
    <path d="M20 2C10 2 2 10 2 20c0 12 14 22 18 30 4-8 18-18 18-30 0-10-8-18-18-18z" fill="url(#${gradientId})"/>
    <circle cx="20" cy="20" r="7" fill="white" opacity="0.95"/>
  </svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const createModernIcon = (isOnline: boolean, role: 'lawyer' | 'expat') =>
  new L.Icon({
    iconUrl: createModernMarkerSVG(isOnline, role),
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
    className: `modern-marker ${role} ${isOnline ? 'online' : 'offline'}`,
  });

// ===== Cluster icon
const createClusterIcon = (cluster: ClusterGroup) => {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();
  const lawyerCount = markers.filter((m) => m.options.alt?.includes('lawyer')).length;
  const expatCount = markers.filter((m) => m.options.alt?.includes('expat')).length;
  const majorityType = lawyerCount >= expatCount ? 'lawyer' : 'expat';
  const size = count < 10 ? 40 : count < 100 ? 50 : 60;
  const bgColor = majorityType === 'lawyer' ? '#2563EB' : '#059669';

  return new L.DivIcon({
    html: `<div style="
      width:${size}px;height:${size}px;background:${bgColor};
      border:3px solid white;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:${size > 50 ? '16px' : '14px'};
      box-shadow:0 4px 15px rgba(0,0,0,.3);
      animation: cluster-pulse 2s ease-in-out infinite;
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
  });
};

// ===== Map helpers
const MapInvalidator = React.memo(() => {
  const map = useMap();
  useEffect(() => {
    const run = () => {
      try {
        // @ts-ignore
        if (map && map.getContainer && map.invalidateSize && map._panes) map.invalidateSize();
      } catch (e) {
        log.e('invalidate', e);
      }
    };
    const t1 = setTimeout(run, 120);
    const t2 = setTimeout(run, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
});
MapInvalidator.displayName = 'MapInvalidator';

const MapUpdater = React.memo(({ providers, isLoading }: { providers: Provider[]; isLoading: boolean }) => {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (isLoading || providers.length === 0) return;
    const sig = JSON.stringify(providers.map((p) => p.id));
    if (sig === prev.current) return;
    prev.current = sig;

    const bounds: [number, number][] = [];
    providers.forEach((p) => {
      if (p.mapLocation && validateCoordinates(p.mapLocation))
        bounds.push([p.mapLocation.lat, p.mapLocation.lng]);
    });
    if (bounds.length && map && map.fitBounds) {
      try {
        map.fitBounds(bounds as any, { padding: [30, 30], maxZoom: 6, animate: true });
      } catch (e) {
        log.e('fitBounds', e);
      }
    }
  }, [providers, isLoading, map]);
  return null;
});
MapUpdater.displayName = 'MapUpdater';

const MapResizer = React.memo(() => {
  const map = useMap();
  useEffect(() => {
    const onResize = () => {
      try {
        // @ts-ignore
        if (map && map.getContainer && map.invalidateSize && map._loaded) {
          setTimeout(() => map.invalidateSize(), 60);
        }
      } catch (e) {
        log.e('resize', e);
      }
    };
    window.addEventListener('resize', onResize);
    const t = setTimeout(onResize, 250);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
    };
  }, [map]);
  return null;
});
MapResizer.displayName = 'MapResizer';

// ===== Avatar
const ModernAvatar: React.FC<{
  src?: string;
  alt: string;
  firstName?: string;
  fullName?: string;
  role: 'lawyer' | 'expat';
  size?: 'sm' | 'md' | 'lg';
}> = ({ src, alt, firstName, fullName, role, size = 'md' }) => {
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const sizeCls = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-base' }[size];
  const roleColors =
    role === 'lawyer'
      ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 border border-blue-200'
      : 'bg-gradient-to-br from-green-100 to-green-50 text-green-700 border border-green-200';

  if (!src || err)
    return (
      <div className={`${sizeCls} rounded-full flex items-center justify-center font-semibold ${roleColors} shadow-sm`}>
        {(firstName?.[0] || fullName?.[0] || '?').toUpperCase()}
      </div>
    );

  return (
    <div className={`${sizeCls} rounded-full overflow-hidden relative ring-2 ring-blue-100 shadow-sm`}>
      {loading && (
        <div className={`absolute inset-0 ${roleColors} flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-1/2 w-1/2 border-2 border-blue-400 border-t-transparent" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => {
          setErr(true);
          setLoading(false);
        }}
        onLoad={() => setLoading(false)}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

// ===== Component
const WorldMap: React.FC<WorldMapProps> = ({
  height = '500px',
  width = '100%',
  className = '',
  onProviderSelect,
  showOnlineOnly = false,
  filterByRole = 'all',
  ariaLabel = 'Carte mondiale des experts disponibles',
  allowFullscreen = true,
}) => {
  const auth = useAuth();
  const app = useApp();
  const navigate = useNavigate();

  const { language } = app || { language: 'fr' };

  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Esc to exit fullscreen + lock body scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Resize observer
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerDimensions({ width, height });
    });
    obs.observe(mapContainerRef.current);
    return () => obs.disconnect();
  }, []);

  const mapCenter: [number, number] = [20, 0];
  const mapKey = useMemo(
    () => `modern-map-${Date.now()}-${containerDimensions.width}-${containerDimensions.height}`,
    [containerDimensions],
  );

  const filteredProviders = useMemo(() => {
    if (!Array.isArray(providers)) return [];
    return providers.filter((p) => {
      if (!p || !p.id) return false;
      const ok =
        (p.isVisibleOnMap !== false) &&
        (!!p.mapLocation && validateCoordinates(p.mapLocation)) &&
        (p.country?.trim() !== '') &&
        (!showOnlineOnly || p.isOnline) &&
        (filterByRole === 'all' || p.role === filterByRole) &&
        (p.role !== 'lawyer' || p.isApproved !== false);
      return ok;
    });
  }, [providers, showOnlineOnly, filterByRole]);

  const statistics = useMemo(() => {
    const onlineLawyers = filteredProviders.filter((p) => p.isOnline && p.role === 'lawyer').length;
    const onlineExpats = filteredProviders.filter((p) => p.isOnline && p.role === 'expat').length;
    return {
      onlineLawyers,
      onlineExpats,
      totalOnline: onlineLawyers + onlineExpats,
    };
  }, [filteredProviders]);

  const messages = {
    fr: {
      loading: 'Chargement de la carte...',
      error: 'Erreur de chargement',
      retry: 'Réessayer',
      noExperts: 'Aucun expert disponible sur la carte pour le moment.',
      online: 'En ligne',
      offline: 'Hors ligne',
      lawyer: 'Avocat',
      expat: 'Expatrié',
      callNow: 'Consulter maintenant',
      viewProfile: 'Voir le profil',
      reviews: 'avis',
      responseIn: 'Répond en',
      minutes: 'min',
      available: 'Disponible maintenant',
      verified: 'Vérifié',
      fullscreen: 'Plein écran',
      exitFullscreen: 'Quitter le plein écran',
    },
    en: {
      loading: 'Loading map...',
      error: 'Loading error',
      retry: 'Retry',
      noExperts: 'No experts available on the map at the moment.',
      online: 'Online',
      offline: 'Offline',
      lawyer: 'Lawyer',
      expat: 'Expat',
      callNow: 'Consult now',
      viewProfile: 'View profile',
      reviews: 'reviews',
      responseIn: 'Responds in',
      minutes: 'min',
      available: 'Available now',
      verified: 'Verified',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit fullscreen',
    },
  } as const;
  const t = messages[(language as 'fr' | 'en') || 'fr'];

  // Load providers (public)
  const loadProviders = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const sosProfilesQuery = query(
        collection(db, 'sos_profiles'),
        where('isVisibleOnMap', '==', true),
        limit(500),
      );
      const snap = await getDocs(sosProfilesQuery);
      const rows: Provider[] = [];
      snap.forEach((doc) => {
        const d: any = doc.data() || {};
        const type: 'lawyer' | 'expat' = d.type === 'lawyer' ? 'lawyer' : 'expat';

        // public visibility rules
        if (!(d.isVisibleOnMap === true && (type === 'expat' || (type === 'lawyer' && d.isApproved === true)))) {
          return;
        }

        const country = (d.currentPresenceCountry || d.country || '').toString().trim();
        let mapLocation = null as null | { lat: number; lng: number };
        if (country) {
          const c = getCountryCoordinates(country);
          if (c && validateCoordinates(c)) mapLocation = generateCountryPosition(c, doc.id, 100);
        }
        if (!mapLocation) return;

        rows.push({
          id: doc.id,
          fullName: (d.fullName || `${d.firstName || ''} ${d.lastName || ''}` || 'Expert').trim().slice(0, 100),
          firstName: (d.firstName || '').toString().slice(0, 50),
          lastName: (d.lastName || '').toString().slice(0, 50),
          role: type,
          country: country.slice(0, 100),
          city: (d.city || '').toString().slice(0, 100),
          profilePhoto: typeof d.profilePhoto === 'string' ? d.profilePhoto : undefined,
          mapLocation,
          isOnline: !!d.isOnline,
          isVisibleOnMap: true,
          isApproved: d.isApproved !== false,
          isActive: d.isActive !== false,
          isVerified: !!d.isVerified,
          rating:
            typeof d.rating === 'number' && d.rating >= 0 && d.rating <= 5
              ? Math.round(d.rating * 10) / 10
              : 4.5,
          price: typeof d.price === 'number' && d.price > 0 ? Math.min(d.price, 999) : type === 'lawyer' ? 49 : 19,
          specialties: Array.isArray(d.specialties) ? d.specialties.slice(0, 8).map((s: any) => String(s).slice(0, 50)) : [],
          languages: Array.isArray(d.languages) ? d.languages.slice(0, 8).map((l: any) => String(l).slice(0, 30)) : [],
          responseTime:
            typeof d.responseTime === 'number' ? Math.min(Math.max(d.responseTime, 0), 1440) : undefined,
          totalReviews: typeof d.totalReviews === 'number' ? Math.max(d.totalReviews, 0) : 0,
        });
      });
      setProviders(rows);
    } catch (err: any) {
      log.e('loadProviders', err);
      if (err?.code === 'permission-denied')
        setError(language === 'fr' ? 'Accès aux données de la carte temporairement indisponible.' : 'Map data access temporarily unavailable.');
      else if (err?.code === 'unavailable')
        setError(language === 'fr' ? 'Service temporairement indisponible. Veuillez réessayer.' : 'Service temporarily unavailable. Please try again.');
      else setError(language === 'fr' ? 'Erreur lors du chargement des données de la carte.' : 'Error loading map data.');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [language]);

  useEffect(() => {
    loadProviders();
    return () => {
      loadingRef.current = false;
    };
  }, [loadProviders]);

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);

  const handleViewProfile = useCallback(
    (providerId: string) => {
      if (onProviderSelect) onProviderSelect(providerId);
      else if (navigate) {
        navigate(`/provider/${providerId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [navigate, onProviderSelect],
  );

  // Conditional renders
  if (error) {
    return (
      <div
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-100`}
        style={{ height, width }}
        role="alert"
        aria-label={error}
      >
        <div className="bg-white border border-red-200 p-6 rounded-xl shadow-lg max-w-sm mx-4 text-center">
          <div className="text-red-600 font-semibold mb-2">{t.error}</div>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadProviders}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
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
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200`}
        style={{ height, width }}
        role="status"
        aria-label={t.loading}
      >
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm mx-4 text-center">
          <div className="relative mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200" />
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0" />
          </div>
          <p className="text-gray-700 text-lg font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (filteredProviders.length === 0) {
    return (
      <div
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200`}
        style={{ height, width }}
        role="status"
        aria-label={t.noExperts}
      >
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm mx-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
            <MapPin className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 text-lg">{t.noExperts}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`relative ${className} rounded-2xl overflow-hidden shadow-xl border border-gray-200 ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''
      }`}
      style={isFullscreen ? { height: '100vh', width: '100vw' } : { height, width }}
      role="application"
      aria-label={ariaLabel}
    >
      {/* Bouton plein écran */}
      {allowFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="pointer-events-auto absolute top-4 right-4 z-[1001] bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-gray-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-700" /> : <Maximize2 className="w-5 h-5 text-gray-700" />}
        </button>
      )}

      {/* Stats (non bloquant) */}
      <div className="pointer-events-none absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-gray-200 max-w-[calc(100%-8rem)]">
        <div className="flex items-center space-x-4 text-sm font-medium">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-2 shadow-sm" />
            <span className="text-gray-800 whitespace-nowrap">
              {statistics.onlineLawyers} {t.lawyer.toLowerCase()}
              {statistics.onlineLawyers > 1 ? 's' : ''} {t.online.toLowerCase()}
            </span>
          </div>
          <div className="text-gray-300 hidden sm:block">|</div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full mr-2 shadow-sm" />
            <span className="text-gray-800 whitespace-nowrap">
              {statistics.onlineExpats} {t.expat.toLowerCase()}
              {statistics.onlineExpats > 1 ? 's' : ''} {t.online.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="leaflet-map-container" style={{ height: '100%', width: '100%', position: 'relative' }}>
        <MapContainer
          key={mapKey}
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
          whenReady={() => setMapReady(true)}
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
          <MapResizer />

          {mapReady && (
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterIcon as any}
              maxClusterRadius={60}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
              zoomToBoundsOnClick
              spiderfyDistanceMultiplier={1.5}
              removeOutsideVisibleBounds
              animate
              disableClusteringAtZoom={10}
            >
              {filteredProviders.map((p, index) => {
                if (!p.mapLocation || !validateCoordinates(p.mapLocation)) return null;
                const icon = createModernIcon(!!p.isOnline, p.role);
                return (
                  <Marker
                    key={`${p.id}-${index}-${p.isOnline ? 'on' : 'off'}`}
                    position={[p.mapLocation.lat, p.mapLocation.lng]}
                    icon={icon}
                    riseOnHover
                    alt={`${p.role}-${p.id}`}
                    eventHandlers={{
                      mouseover: (e) => (e.target as any).openPopup(),
                      click: () => handleViewProfile(p.id),
                    }}
                  >
                    <Popup
                      maxWidth={380}
                      minWidth={320}
                      className="modern-popup"
                      autoPan={false} // évite le "saut" de la carte à l'ouverture
                      closeOnClick
                    >
                      <div className="p-0 max-w-sm bg-white rounded-2xl overflow-hidden">
                        <div
                          className={`p-6 text-white relative overflow-hidden ${
                            p.role === 'lawyer' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                          }`}
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
                          <div className="flex items-start space-x-4 relative z-10">
                            <ModernAvatar
                              src={p.profilePhoto}
                              alt={`Photo de profil de ${p.fullName}`}
                              firstName={p.firstName}
                              fullName={p.fullName}
                              role={p.role}
                              size="lg"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-bold text-white text-lg truncate">{p.fullName}</h3>
                                {p.isVerified && (
                                  <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 mb-3">
                                <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                                  {p.role === 'lawyer' ? t.lawyer : t.expat}
                                </span>
                                {p.isOnline ? (
                                  <div className="flex items-center text-white/90 text-xs">
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                                    {t.available}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center">
                                {p.isOnline ? <Wifi className="w-4 h-4 text-green-300 mr-2" /> : <WifiOff className="w-4 h-4 text-white/60 mr-2" />}
                                <span className={`text-sm font-medium ${p.isOnline ? 'text-green-200' : 'text-white/60'}`}>
                                  {p.isOnline ? t.online : t.offline}
                                </span>
                                {p.responseTime && p.isOnline && (
                                  <span className="text-white/80 text-xs ml-3">
                                    {t.responseIn} {p.responseTime}
                                    {t.minutes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 space-y-5">
                          {p.rating > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1.5 rounded-full">
                                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                                  <span className="ml-1.5 text-sm font-bold text-amber-700">{p.rating}</span>
                                </div>
                                {p.totalReviews && p.totalReviews > 0 && (
                                  <span className="text-sm text-gray-500 font-medium">({p.totalReviews} {t.reviews})</span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">{p.price}€</div>
                                <div className="text-xs text-gray-500 font-medium">/{p.role === 'lawyer' ? '20min' : '30min'}</div>
                              </div>
                            </div>
                          )}

                          {p.specialties && p.specialties.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                {language === 'fr' ? 'Spécialités' : 'Specialties'}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {p.specialties.slice(0, 4).map((s, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                                      p.role === 'lawyer'
                                        ? 'bg-gradient-to-r from-blue-50 to-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-gradient-to-r from-green-50 to-green-50 text-green-700 border-green-200'
                                    }`}
                                  >
                                    {s}
                                  </span>
                                ))}
                                {p.specialties.length > 4 && (
                                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                                    +{p.specialties.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {p.languages && p.languages.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                {language === 'fr' ? 'Langues' : 'Languages'}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {p.languages.slice(0, 5).map((lang, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full border border-gray-200">
                                    {lang}
                                  </span>
                                ))}
                                {p.languages.length > 5 && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                    +{p.languages.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center text-gray-600">
                              <MapPin className={`w-4 h-4 mr-3 ${p.role === 'lawyer' ? 'text-blue-500' : 'text-green-500'}`} />
                              <span className="text-sm font-medium">
                                {p.city ? `${p.city}, ` : ''}
                                {getTranslatedCountryName(p.country, language) || 'Localisation non définie'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <button
                              onClick={() => handleViewProfile(p.id)}
                              className={`w-full py-4 px-6 rounded-2xl text-white text-sm font-bold flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                                p.isOnline
                                  ? p.role === 'lawyer'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
                                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500'
                                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:ring-gray-400'
                              }`}
                              aria-label={`${p.isOnline ? t.callNow : t.viewProfile} - ${p.fullName}`}
                            >
                              {p.isOnline ? (
                                <>
                                  <Phone className="w-5 h-5 mr-3" />
                                  {t.callNow}
                                </>
                              ) : (
                                <>
                                  <Eye className="w-5 h-5 mr-3" />
                                  {t.viewProfile}
                                </>
                              )}
                            </button>
                            {p.isOnline && (
                              <button
                                onClick={() => handleViewProfile(p.id)}
                                className={`w-full py-3 px-6 rounded-xl border-2 text-sm font-semibold flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                                  p.role === 'lawyer'
                                    ? 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 focus:ring-blue-100'
                                    : 'border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 focus:ring-green-100'
                                }`}
                                aria-label={`${t.viewProfile} - ${p.fullName}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t.viewProfile}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          )}
        </MapContainer>
      </div>

      {/* Légende (non bloquante) */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-gray-200">
        <div className="flex items-center space-x-4 text-sm font-medium">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mr-2 shadow-sm" />
            <span className="text-gray-700"> {t.lawyer}s</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-br from-green-600 to-green-700 rounded-full mr-2 shadow-sm" />
            <span className="text-gray-700"> {t.expat}s</span>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');

        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif !important;
          border-radius: 1rem;
          z-index: 1 !important;
          position: relative !important;
        }

        .leaflet-control-zoom {
          border: none !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,.15) !important;
          overflow: hidden;
          backdrop-filter: blur(10px);
          background: rgba(255,255,255,.95) !important;
          margin-top: 80px !important;
          margin-right: 10px !important;
        }

        .leaflet-control-zoom a {
          background: rgba(255,255,255,.95) !important;
          color: #374151 !important;
          font-weight: 700 !important;
          border: none !important;
          font-size: 20px !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          transition: .2s ease !important;
        }
        .leaflet-control-zoom a:hover { background:#374151 !important; color:#fff !important; transform:scale(1.05) }

        .modern-popup .leaflet-popup-content-wrapper {
          border-radius: 1rem !important;
          box-shadow: 0 25px 50px rgba(0,0,0,.25) !important;
          border: 1px solid rgba(0,0,0,.1) !important;
          padding: 0 !important;
          backdrop-filter: blur(20px);
          overflow: hidden;
        }
        .modern-popup .leaflet-popup-content { margin:0 !important; padding:0 !important; max-height:600px; overflow-y:auto; border-radius:1rem; }
        .modern-popup .leaflet-popup-tip { background:white !important; border:1px solid rgba(0,0,0,.1) !important; box-shadow:0 5px 15px rgba(0,0,0,.15) !important; }
        .modern-popup .leaflet-popup-close-button {
          color: white !important; font-size: 18px !important; font-weight: 700 !important;
          top: 15px !important; right: 15px !important; width: 30px !important; height: 30px !important;
          background: rgba(255,255,255,.2) !important; border-radius:50% !important;
          display:flex !important; align-items:center !important; justify-content:center !important; backdrop-filter: blur(10px) !important;
          transition: .2s ease !important;
        }
        .modern-popup .leaflet-popup-close-button:hover { background: rgba(255,255,255,.3) !important; transform: scale(1.1) !important; }

        /* Pas d'animation sur les markers -> évite l'effet "saut" */
        /* (on supprime l'ancienne animation markerAppear) */

        @keyframes cluster-pulse { 0%,100%{ transform:scale(1)} 50%{ transform:scale(1.05)} }
        .custom-cluster-icon { cursor:pointer; transition: all .3s ease; }
        .custom-cluster-icon:hover { transform: scale(1.1) !important; }
      `}</style>
    </div>
  );
};

export default React.memo(WorldMap);
