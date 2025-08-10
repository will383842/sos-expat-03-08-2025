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

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// ===== LOGS DEBUG MAXIMUM =====
const LOG_PREFIX = '🗺️ [WorldMap]';
const logError = (message: string, error?: any) => {
  console.error(`${LOG_PREFIX} ❌ ${message}`, error);
};
const logWarn = (message: string, data?: any) => {
  console.warn(`${LOG_PREFIX} ⚠️ ${message}`, data);
};
const logInfo = (message: string, data?: any) => {
  console.log(`${LOG_PREFIX} ℹ️ ${message}`, data);
};
const logSuccess = (message: string, data?: any) => {
  console.log(`${LOG_PREFIX} ✅ ${message}`, data);
};
const logDebug = (message: string, data?: any) => {
  console.log(`${LOG_PREFIX} 🔍 ${message}`, data);
};

// Types pour TypeScript
interface ClusterMarker extends L.Marker {
  options: {
    alt?: string;
  };
}

interface ClusterGroup {
  getChildCount(): number;
  getAllChildMarkers(): ClusterMarker[];
}

// Configuration moderne des icônes Leaflet
const initializeLeafletIcons = () => {
  logInfo('Initialisation des icônes Leaflet...');
  
  if (typeof window !== 'undefined') {
    try {
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      
      logSuccess('Icônes Leaflet initialisées avec succès');
    } catch (error) {
      logError('Erreur lors de l\'initialisation des icônes Leaflet', error);
    }
  } else {
    logWarn('Window non défini - initialisation des icônes Leaflet ignorée');
  }
};

initializeLeafletIcons();

interface Provider {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: 'lawyer' | 'expat';
  country: string;
  city?: string;
  profilePhoto?: string;
  mapLocation?: {
    lat: number;
    lng: number;
  };
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

// Traduction des noms de pays
const getTranslatedCountryName = (countryName: string, language: string): string => {
  logDebug(`Traduction du pays: ${countryName} vers ${language}`);
  
  const translations: Record<string, Record<string, string>> = {
    'France': { fr: 'France', en: 'France' },
    'États-Unis': { fr: 'États-Unis', en: 'United States' },
    'United States': { fr: 'États-Unis', en: 'United States' },
    'Allemagne': { fr: 'Allemagne', en: 'Germany' },
    'Germany': { fr: 'Allemagne', en: 'Germany' },
    'Espagne': { fr: 'Espagne', en: 'Spain' },
    'Spain': { fr: 'Espagne', en: 'Spain' },
    'Italie': { fr: 'Italie', en: 'Italy' },
    'Italy': { fr: 'Italie', en: 'Italy' },
    'Royaume-Uni': { fr: 'Royaume-Uni', en: 'United Kingdom' },
    'United Kingdom': { fr: 'Royaume-Uni', en: 'United Kingdom' },
    'Canada': { fr: 'Canada', en: 'Canada' },
    'Japon': { fr: 'Japon', en: 'Japan' },
    'Japan': { fr: 'Japon', en: 'Japan' },
    'Chine': { fr: 'Chine', en: 'China' },
    'China': { fr: 'Chine', en: 'China' },
    'Australie': { fr: 'Australie', en: 'Australia' },
    'Australia': { fr: 'Australie', en: 'Australia' },
    'Brésil': { fr: 'Brésil', en: 'Brazil' },
    'Brazil': { fr: 'Brésil', en: 'Brazil' },
    'Suisse': { fr: 'Suisse', en: 'Switzerland' },
    'Switzerland': { fr: 'Suisse', en: 'Switzerland' },
    'Belgique': { fr: 'Belgique', en: 'Belgium' },
    'Belgium': { fr: 'Belgique', en: 'Belgium' },
    'Pays-Bas': { fr: 'Pays-Bas', en: 'Netherlands' },
    'Netherlands': { fr: 'Pays-Bas', en: 'Netherlands' },
    'Suède': { fr: 'Suède', en: 'Sweden' },
    'Sweden': { fr: 'Suède', en: 'Sweden' },
    'Norvège': { fr: 'Norvège', en: 'Norway' },
    'Norway': { fr: 'Norvège', en: 'Norway' },
    'Danemark': { fr: 'Danemark', en: 'Denmark' },
    'Denmark': { fr: 'Danemark', en: 'Denmark' }
  };

  const result = translations[countryName]?.[language] || countryName;
  logDebug(`Traduction: ${countryName} → ${result}`);
  return result;
};

// Création d'icônes SVG modernes avec couleurs traditionnelles
const createModernMarkerSVG = (isOnline: boolean, role: 'lawyer' | 'expat') => {
  logDebug(`Création icône SVG: ${role}, online: ${isOnline}`);
  
  const gradientId = `gradient-${role}-${isOnline ? 'online' : 'offline'}-${Math.random().toString(36).substr(2, 9)}`;
  
  const colors = {
    lawyer: {
      online: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        accent: '#93C5FD',
        glow: 'rgba(37, 99, 235, 0.5)'
      },
      offline: {
        primary: '#9CA3AF',
        secondary: '#D1D5DB',
        accent: '#E5E7EB',
        glow: 'rgba(156, 163, 175, 0.3)'
      }
    },
    expat: {
      online: {
        primary: '#059669',
        secondary: '#10B981',
        accent: '#86EFAC',
        glow: 'rgba(5, 150, 105, 0.5)'
      },
      offline: {
        primary: '#9CA3AF',
        secondary: '#D1D5DB',
        accent: '#E5E7EB',
        glow: 'rgba(156, 163, 175, 0.3)'
      }
    }
  };

  const colorScheme = colors[role][isOnline ? 'online' : 'offline'];
  
  const svgString = `
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.primary};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${colorScheme.secondary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorScheme.accent};stop-opacity:1" />
        </linearGradient>
        <filter id="glow-${gradientId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <ellipse cx="20" cy="47" rx="12" ry="4" fill="rgba(0,0,0,0.2)" />
      
      <path d="M20 3C12.268 3 6 9.268 6 17c0 10 14 30 14 30s14-20 14-30c0-7.732-6.268-14-14-14z" 
            fill="url(#${gradientId})" 
            stroke="white" 
            stroke-width="3"
            filter="${isOnline ? `url(#glow-${gradientId})` : 'none'}" />
      
      <circle cx="20" cy="17" r="8" fill="white" fill-opacity="0.95" />
      
      ${role === 'lawyer' 
        ? `<path d="M20 11.5l3 3-3 3-3-3 3-3zm-2 8h4v2.5h-4v-2.5z" fill="${colorScheme.primary}" stroke="${colorScheme.primary}" stroke-width="0.5" />`
        : `<circle cx="20" cy="15" r="2.5" fill="${colorScheme.primary}" />
           <path d="M20 19c-2.5 0-4.5 1.2-4.5 2.8h9c0-1.6-2-2.8-4.5-2.8z" fill="${colorScheme.primary}" />`
      }
      
      ${isOnline 
        ? `<circle cx="30" cy="9" r="5" fill="#10B981" stroke="white" stroke-width="2.5">
             <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
           </circle>`
        : ''
      }
    </svg>
  `;
  
  logDebug(`Icône SVG créée pour ${role} (${isOnline ? 'online' : 'offline'})`);
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};

// Configuration des icônes modernes
const createModernIcon = (isOnline: boolean, role: 'lawyer' | 'expat') => {
  logDebug(`Création icône moderne: ${role}, online: ${isOnline}`);
  
  try {
    const icon = new L.Icon({
      iconUrl: createModernMarkerSVG(isOnline, role),
      iconSize: [40, 52],
      iconAnchor: [20, 52],
      popupAnchor: [0, -52],
      className: `modern-marker ${role} ${isOnline ? 'online' : 'offline'}`,
    });
    
    logSuccess(`Icône moderne créée: ${role} (${isOnline ? 'online' : 'offline'})`);
    return icon;
  } catch (error) {
    logError(`Erreur création icône moderne`, error);
    throw error;
  }
};

// Icônes pour clustering - Fixé avec types corrects
const createClusterIcon = (cluster: ClusterGroup) => {
  const count = cluster.getChildCount();
  logDebug(`Création icône cluster pour ${count} markers`);
  
  const markers = cluster.getAllChildMarkers();
  
  // Déterminer le type majoritaire avec types corrects
  const lawyerCount = markers.filter((m: ClusterMarker) => m.options.alt?.includes('lawyer')).length;
  const expatCount = markers.filter((m: ClusterMarker) => m.options.alt?.includes('expat')).length;
  
  const majorityType = lawyerCount > expatCount ? 'lawyer' : 'expat';
  const size = count < 10 ? 40 : count < 100 ? 50 : 60;
  const bgColor = majorityType === 'lawyer' ? '#2563EB' : '#059669';
  
  logDebug(`Cluster: ${count} total, ${lawyerCount} lawyers, ${expatCount} expats, majoritaire: ${majorityType}`);
  
  return new L.DivIcon({
    html: `<div style="
      width: ${size}px; 
      height: ${size}px; 
      background: ${bgColor};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${size > 50 ? '16px' : '14px'};
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      animation: cluster-pulse 2s ease-in-out infinite;
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
  });
};

// Icônes mémorisées
logInfo('Création des icônes mémorisées...');
const MODERN_ICONS = {
  lawyer: {
    online: createModernIcon(true, 'lawyer'),
    offline: createModernIcon(false, 'lawyer'),
  },
  expat: {
    online: createModernIcon(true, 'expat'),
    offline: createModernIcon(false, 'expat'),
  }
};
logSuccess('Icônes mémorisées créées');

// Composant pour forcer le redimensionnement de la carte en toute sécurité
const MapInvalidator = React.memo(() => {
  logDebug('MapInvalidator: Composant monté');
  const map = useMap();

  useEffect(() => {
    logDebug('MapInvalidator: useEffect exécuté');
    
    const safeInvalidate = () => {
      logDebug('MapInvalidator: Tentative d\'invalidation...');
      
      if (map && (map as any)._panes) {
        try {
          map.invalidateSize();
          logSuccess('MapInvalidator: Carte invalidée avec succès');
        } catch (error) {
          logError("MapInvalidator: Erreur lors du resize de la carte", error);
        }
      } else {
        logWarn('MapInvalidator: Carte ou _panes non disponible', { map: !!map, panes: !!(map as any)?._panes });
      }
    };

    const timeoutId = setTimeout(() => {
      logDebug('MapInvalidator: Premier timeout (100ms)');
      safeInvalidate();
    }, 100);
    
    const timeoutId2 = setTimeout(() => {
      logDebug('MapInvalidator: Deuxième timeout (500ms)');
      safeInvalidate();
    }, 500);

    return () => {
      logDebug('MapInvalidator: Nettoyage des timeouts');
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [map]);

  return null;
});

MapInvalidator.displayName = 'MapInvalidator';

// Composant pour la mise à jour de la carte
const MapUpdater = React.memo(({ providers, isLoading }: { providers: Provider[]; isLoading: boolean }) => {
  logDebug(`MapUpdater: Rendu avec ${providers.length} providers, loading: ${isLoading}`);
  
  const map = useMap();
  const prevProvidersRef = useRef<Provider[]>([]);
  
  useEffect(() => {
    logDebug(`MapUpdater: useEffect - ${providers.length} providers, loading: ${isLoading}`);
    
    if (isLoading) {
      logInfo('MapUpdater: Chargement en cours, pas de mise à jour');
      return;
    }
    
    if (providers.length === 0) {
      logWarn('MapUpdater: Aucun provider, pas de mise à jour des bounds');
      return;
    }

    // ✅ AJOUT: Vérification de sécurité pour éviter l'erreur
    if (!map || !map.getContainer() || !(map as any)._loaded) {
      logWarn('MapUpdater: Carte non prête, report de la mise à jour');
      return;
    }
    
    setTimeout(() => {
      if (map && typeof map.invalidateSize === 'function' && map.getContainer()) {
        try {
          logDebug('MapUpdater: Invalidation de la taille de la carte');
          map.invalidateSize();
        } catch (error) {
          logError('MapUpdater: Erreur lors de l\'invalidation', error);
        }
      }
    }, 100);
    
    const providersChanged = JSON.stringify(providers) !== JSON.stringify(prevProvidersRef.current);
    if (!providersChanged) {
      logDebug('MapUpdater: Aucun changement de providers détecté');
      return;
    }
    
    logInfo('MapUpdater: Changement de providers détecté, mise à jour des bounds');
    prevProvidersRef.current = providers;
    
    const bounds: [number, number][] = [];
    
    providers.forEach((provider, index) => {
      if (provider.mapLocation && validateCoordinates(provider.mapLocation)) {
        bounds.push([provider.mapLocation.lat, provider.mapLocation.lng]);
        logDebug(`MapUpdater: Provider ${index + 1}/${providers.length} ajouté aux bounds: [${provider.mapLocation.lat}, ${provider.mapLocation.lng}]`);
      } else {
        logWarn(`MapUpdater: Provider ${index + 1}/${providers.length} (${provider.id}) sans coordonnées valides`, provider.mapLocation);
      }
    });
    
    logInfo(`MapUpdater: ${bounds.length} bounds calculés sur ${providers.length} providers`);
    
    if (bounds.length > 0) {
      try {
        logDebug('MapUpdater: Application des bounds à la carte...');
        
        // ✅ AJOUT: Vérification avant fitBounds
        if (map && map.getContainer() && typeof map.fitBounds === 'function') {
          map.fitBounds(bounds as L.LatLngBoundsExpression, {
            padding: [30, 30],
            maxZoom: 6,
            animate: true,
            duration: 0.8
          });
          logSuccess(`MapUpdater: Bounds appliqués avec succès (${bounds.length} points)`);
        } else {
          logWarn('MapUpdater: Impossible d\'appliquer les bounds, carte non prête');
        }
      } catch (error) {
        logError('MapUpdater: Erreur lors de l\'ajustement des limites de la carte', error);
      }
    } else {
      logWarn('MapUpdater: Aucun bound valide, pas de mise à jour de la vue');
    }
  }, [providers, map, isLoading]);
  
  return null;
});

// Composant pour le redimensionnement de la carte
const MapResizer = React.memo(() => {
  logDebug('MapResizer: Composant monté');
  const map = useMap();
  
  useEffect(() => {
    logDebug('MapResizer: useEffect exécuté');
    
    const handleResize = () => {
      logDebug('MapResizer: Événement resize détecté');
      
      // ✅ AJOUT: Vérification complète avant resize
      if (map && 
          map.getContainer() && 
          (map as any)._loaded && 
          (map as any)._panes && 
          typeof map.invalidateSize === 'function') {
        
        setTimeout(() => {
          try {
            // ✅ AJOUT: Vérification finale avant invalidateSize
            if (map && map.getContainer()) {
              map.invalidateSize();
              logSuccess('MapResizer: Carte redimensionnée avec succès');
            }
          } catch (error) {
            logError("MapResizer: Erreur lors du resize de la carte", error);
          }
        }, 50);
      } else {
        logWarn('MapResizer: Carte non disponible pour resize', { 
          map: !!map, 
          container: !!map?.getContainer(), 
          loaded: !!(map as any)?._loaded,
          panes: !!(map as any)?._panes 
        });
      }
    };

    logDebug('MapResizer: Ajout du listener resize');
    window.addEventListener('resize', handleResize);

    const initialTimeout = setTimeout(() => {
      logDebug('MapResizer: Resize initial (150ms)');
      handleResize();
    }, 250); // ✅ AJOUT: Délai plus long pour laisser la carte se monter

    return () => {
      logDebug('MapResizer: Nettoyage du listener et timeout');
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialTimeout);
    };
  }, [map]);
  
  return null;
});
// Avatar moderne
const ModernAvatar: React.FC<{
  src?: string;
  alt: string;
  firstName?: string;
  fullName?: string;
  role: 'lawyer' | 'expat';
  size?: 'sm' | 'md' | 'lg';
}> = ({ src, alt, firstName, fullName, role, size = 'md' }) => {
  logDebug(`ModernAvatar: Rendu pour ${fullName || firstName || 'Unknown'} (${role})`);
  
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  };
  
  const handleImageError = useCallback(() => {
    logWarn(`ModernAvatar: Erreur de chargement d'image pour ${fullName || firstName}`, { src });
    setImgError(true);
    setIsLoading(false);
  }, [fullName, firstName, src]);
  
  const handleImageLoad = useCallback(() => {
    logSuccess(`ModernAvatar: Image chargée avec succès pour ${fullName || firstName}`);
    setIsLoading(false);
  }, [fullName, firstName]);
  
  const fallbackLetter = firstName?.[0]?.toUpperCase() || 
                        fullName?.[0]?.toUpperCase() || 
                        '?';
  
  const roleColors = {
    lawyer: 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 border border-blue-200',
    expat: 'bg-gradient-to-br from-green-100 to-green-50 text-green-700 border border-green-200'
  };
  
  if (!src || imgError) {
    logDebug(`ModernAvatar: Affichage fallback (${fallbackLetter}) pour ${fullName || firstName}`);
    return (
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold ${roleColors[role]} shadow-sm`}>
        {fallbackLetter}
      </div>
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative ring-2 ring-blue-100 shadow-sm`}>
      {isLoading && (
        <div className={`absolute inset-0 ${roleColors[role]} flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-1/2 w-1/2 border-2 border-blue-400 border-t-transparent"></div>
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

// Composant principal
const WorldMap: React.FC<WorldMapProps> = ({ 
  height = '500px', 
  width = '100%',
  className = '',
  onProviderSelect,
  showOnlineOnly = false,
  filterByRole = 'all',
  ariaLabel = 'Carte mondiale des experts disponibles',
  allowFullscreen = true
}) => {
  logInfo('=== WORLDMAP: INITIALISATION ===');
  logDebug('Props reçues:', { height, width, className, showOnlineOnly, filterByRole, allowFullscreen });
  
  // ===== VÉRIFICATION DES CONTEXTES =====
  logInfo('Vérification des contextes...');
  
  let authContext, appContext, navigate;
  
  try {
    authContext = useAuth();
    logSuccess('Context Auth récupéré', { 
      hasUser: !!authContext?.user, 
      isAuthenticated: authContext?.isAuthenticated,
      authType: typeof authContext
    });
  } catch (error) {
    logError('Erreur lors de la récupération du contexte Auth', error);
    authContext = null;
  }
  
  try {
    appContext = useApp();
    logSuccess('Context App récupéré', { 
      language: appContext?.language,
      appType: typeof appContext
    });
  } catch (error) {
    logError('Erreur lors de la récupération du contexte App', error);
    appContext = null;
  }
  
  try {
    navigate = useNavigate();
    logSuccess('Navigate récupéré', { navigateType: typeof navigate });
  } catch (error) {
    logError('Erreur lors de la récupération de navigate', error);
    navigate = null;
  }
  
  // ===== VÉRIFICATION DE LA BASE DE DONNÉES =====
  logInfo('Vérification de la base de données...');
  try {
    logDebug('DB object:', { db: typeof db, hasDb: !!db });
    logSuccess('Base de données accessible');
  } catch (error) {
    logError('Erreur d\'accès à la base de données', error);
  }
  
  // ===== VÉRIFICATION DES UTILITAIRES =====
  logInfo('Vérification des utilitaires...');
  try {
    logDebug('Utilitaires disponibles:', { 
      getCountryCoordinates: typeof getCountryCoordinates,
      generateCountryPosition: typeof generateCountryPosition,
      validateCoordinates: typeof validateCoordinates
    });
    logSuccess('Utilitaires accessibles');
  } catch (error) {
    logError('Erreur d\'accès aux utilitaires', error);
  }
  
  const { language } = appContext || { language: 'fr' };
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);
  
  const mapId = useMemo(() => {
    const id = `modern-world-map-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    logDebug(`ID de carte généré: ${id}`);
    return id;
  }, []);

  // Observer pour les dimensions
  useEffect(() => {
    logDebug('Installation de l\'observer de dimensions...');
    
    if (!mapContainerRef.current) {
      logWarn('Référence du conteneur de carte non disponible');
      return;
    }
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        logDebug(`Nouvelles dimensions détectées: ${width}x${height}`);
        setContainerDimensions({ width, height });
      }
    });
    
    resizeObserver.observe(mapContainerRef.current);
    logSuccess('Observer de dimensions installé');
    
    return () => {
      logDebug('Nettoyage de l\'observer de dimensions');
      resizeObserver.disconnect();
    };
  }, []);

  // Filtrage des providers
  const filteredProviders = useMemo(() => {
    logInfo('=== FILTRAGE DES PROVIDERS ===');
    logDebug(`Providers bruts: ${providers.length}`);
    logDebug('Filtres appliqués:', { showOnlineOnly, filterByRole });
    
    if (!Array.isArray(providers)) {
      logError('Providers n\'est pas un tableau', { providers, type: typeof providers });
      return [];
    }
    
    const filtered = providers.filter((provider, index) => {
      logDebug(`--- Provider ${index + 1}/${providers.length}: ${provider?.id} ---`);
      
      if (!provider || typeof provider !== 'object') {
        logWarn(`Provider ${index + 1} invalide (non-objet)`, provider);
        return false;
      }
      
      if (!provider.id || typeof provider.id !== 'string') {
        logWarn(`Provider ${index + 1} sans ID valide`, { id: provider.id, type: typeof provider.id });
        return false;
      }
      
      // Vérifications détaillées
      const checks = {
        isVisibleOnMap: provider.isVisibleOnMap !== false,
        hasValidLocation: provider.mapLocation && validateCoordinates(provider.mapLocation),
        hasCountry: provider.country && typeof provider.country === 'string' && provider.country.trim() !== '',
        matchesOnlineFilter: !showOnlineOnly || provider.isOnline,
        matchesRoleFilter: filterByRole === 'all' || provider.role === filterByRole,
        isApproved: provider.role !== 'lawyer' || provider.isApproved !== false
      };
      
      logDebug(`Checks pour ${provider.id}:`, checks);
      
      // Vérification spéciale pour les avocats
      if (provider.role === 'lawyer') {
        logDebug(`Provider ${provider.id} est un avocat, vérification approbation: ${checks.isApproved}`);
      }
      
      const isValid = Object.values(checks).every(Boolean);
      
      logDebug(`Provider ${provider.id} → ${isValid ? '✅ VALIDE' : '❌ REJETÉ'}`, {
        fullName: provider.fullName,
        role: provider.role,
        country: provider.country,
        isOnline: provider.isOnline,
        checks
      });
      
      return isValid;
    });
    
    logInfo(`=== RÉSULTAT FILTRAGE: ${filtered.length}/${providers.length} providers valides ===`);
    
    // Log détaillé des providers filtrés
    filtered.forEach((provider, index) => {
      logSuccess(`Provider valide ${index + 1}/${filtered.length}:`, {
        id: provider.id,
        fullName: provider.fullName,
        role: provider.role,
        country: provider.country,
        city: provider.city,
        isOnline: provider.isOnline,
        coordinates: provider.mapLocation ? `[${provider.mapLocation.lat}, ${provider.mapLocation.lng}]` : 'Aucune'
      });
    });
    
    return filtered;
  }, [providers, showOnlineOnly, filterByRole]);

  // Calcul des statistiques - Fixé pour éviter les chiffres qui sautent
  const statistics = useMemo(() => {
    logDebug('Calcul des statistiques...');
    
    const onlineLawyers = filteredProviders.filter(p => p.isOnline && p.role === 'lawyer').length;
    const onlineExpats = filteredProviders.filter(p => p.role === 'expat' && p.isOnline).length;
    
    const stats = {
      onlineLawyers,
      onlineExpats,
      totalOnline: onlineLawyers + onlineExpats,
      totalLawyers: filteredProviders.filter(p => p.role === 'lawyer').length,
      totalExpats: filteredProviders.filter(p => p.role === 'expat').length,
      totalProviders: filteredProviders.length
    };
    
    logDebug('Statistiques calculées:', stats);
    return stats;
  }, [filteredProviders]);

  // ✅ MODIFIÉ: Chargement des providers avec accès public
  const loadProviders = useCallback(async () => {
    logInfo('=== CHARGEMENT DES PROVIDERS ===');
    
    if (loadingRef.current) {
      logWarn('Chargement déjà en cours, abandon');
      return;
    }
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      logInfo('🌍 Chargement des profils pour la carte mondiale (accès public)...');
      
      // Vérification des dépendances Firebase
      logDebug('Vérification des imports Firebase...');
      logDebug('Imports disponibles:', {
        collection: typeof collection,
        query: typeof query, 
        getDocs: typeof getDocs,
        limit: typeof limit,
        where: typeof where,
        db: typeof db
      });
      
      // ✅ NOUVEAU: Requête avec filtres pour l'accès public
      logInfo('Construction de la requête Firestore...');
      const sosProfilesQuery = query(
        collection(db, "sos_profiles"), 
        where("isVisibleOnMap", "==", true), // Seulement les profils visibles sur carte
        limit(500)
      );
      
      logSuccess('Requête Firestore construite avec succès');
      logDebug('Paramètres de la requête:', {
        collection: 'sos_profiles',
        where: 'isVisibleOnMap == true',
        limit: 500
      });
      
      logInfo('Exécution de la requête Firestore...');
      const sosProfilesSnapshot = await getDocs(sosProfilesQuery);
      
      logSuccess(`Requête exécutée - ${sosProfilesSnapshot.size} documents trouvés`);
      
      if (sosProfilesSnapshot.empty) {
        logWarn('⚠️ Aucun profil visible sur la carte trouvé');
        setProviders([]);
        return;
      }
      
      logInfo(`📊 ${sosProfilesSnapshot.size} profils trouvés pour la carte`);
      
      const allProfiles: Provider[] = [];
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;
      
      sosProfilesSnapshot.docs.forEach(doc => {
        processedCount++;
        
        try {
          logDebug(`--- Traitement document ${processedCount}/${sosProfilesSnapshot.size}: ${doc.id} ---`);
          
          const data = doc.data();
          
          if (!data || typeof data !== 'object') {
            logWarn(`Document ${doc.id} - données invalides`, data);
            invalidCount++;
            return;
          }
          
          logDebug(`Document ${doc.id} - données brutes:`, {
            type: data.type,
            isVisibleOnMap: data.isVisibleOnMap,
            isActive: data.isActive,
            isApproved: data.isApproved,
            fullName: data.fullName,
            country: data.currentPresenceCountry || data.country,
            isOnline: data.isOnline
          });
          
          // ✅ NOUVEAU: Filtrage pour accès public
          // Expatriés : toujours visibles si actifs et visibles sur carte
          // Avocats : uniquement si approuvés
          const isPubliclyVisible = data.isVisibleOnMap === true && 
                                    (data.type === 'expat' || 
                                    (data.type === 'lawyer' && data.isApproved === true));
          
          if (!isPubliclyVisible) {
            logWarn(`🔒 Profil ${doc.id} non visible publiquement:`, {
              type: data.type,
              isVisibleOnMap: data.isVisibleOnMap,
              isActive: data.isActive,
              isApproved: data.isApproved
            });
            invalidCount++;
            return;
          }
          
          logSuccess(`✅ Profil ${doc.id} visible publiquement`);
          
          // Construction du nom complet
          const fullName = (data.fullName && typeof data.fullName === 'string') ? 
                          data.fullName.trim() : 
                          `${data.firstName || ''} ${data.lastName || ''}`.trim() || 
                          'Expert anonyme';
          
          logDebug(`Nom construit: "${fullName}"`);
          
          const type = data.type === 'lawyer' ? 'lawyer' : 'expat';
          const presenceCountry = (data.currentPresenceCountry || data.country || '').toString().trim();
          
          logDebug(`Type: ${type}, Pays: "${presenceCountry}"`);
          
          // Génération de la localisation
          let mapLocation = null;
          if (presenceCountry) {
            logDebug(`Recherche coordonnées pour: "${presenceCountry}"`);
            
            const countryCoords = getCountryCoordinates(presenceCountry);
            logDebug(`Coordonnées pays trouvées:`, countryCoords);
            
            if (countryCoords && validateCoordinates(countryCoords)) {
              mapLocation = generateCountryPosition(countryCoords, doc.id, 100);
              logSuccess(`Localisation générée pour ${doc.id}:`, mapLocation);
            } else {
              logWarn(`Coordonnées invalides pour ${presenceCountry}`, countryCoords);
            }
          } else {
            logWarn(`Aucun pays spécifié pour ${doc.id}`);
          }
          
          if (!mapLocation) {
            logError(`📍 Pas de localisation valide pour ${doc.id} - PROFIL IGNORÉ`);
            invalidCount++;
            return;
          }
          
          // Construction de l'objet Provider
          const provider: Provider = {
            id: doc.id,
            fullName: fullName.substring(0, 100),
            firstName: (data.firstName || '').toString().substring(0, 50),
            lastName: (data.lastName || '').toString().substring(0, 50),
            role: type as 'lawyer' | 'expat',
            country: presenceCountry.substring(0, 100),
            city: (data.city || '').toString().substring(0, 100),
            profilePhoto: typeof data.profilePhoto === 'string' ? data.profilePhoto : undefined,
            mapLocation,
            isOnline: Boolean(data.isOnline),
            isVisibleOnMap: data.isVisibleOnMap !== false,
            isApproved: data.isApproved !== false,
            isActive: data.isActive !== false,
            isVerified: Boolean(data.isVerified),
            rating: typeof data.rating === 'number' && data.rating >= 0 && data.rating <= 5 ? 
                   Math.round(data.rating * 10) / 10 : 4.5,
            price: typeof data.price === 'number' && data.price > 0 ? 
                  Math.min(data.price, 999) : (type === 'lawyer' ? 49 : 19),
            specialties: Array.isArray(data.specialties) ? 
                        data.specialties.slice(0, 8).map(s => s.toString().substring(0, 50)) : [],
            languages: Array.isArray(data.languages) ? 
                      data.languages.slice(0, 8).map(l => l.toString().substring(0, 30)) : [],
            responseTime: typeof data.responseTime === 'number' ? 
                         Math.min(Math.max(data.responseTime, 0), 1440) : undefined,
            totalReviews: typeof data.totalReviews === 'number' ? 
                         Math.max(data.totalReviews, 0) : 0
          };
          
          logDebug(`Provider construit:`, {
            id: provider.id,
            fullName: provider.fullName,
            role: provider.role,
            country: provider.country,
            isOnline: provider.isOnline,
            rating: provider.rating,
            price: provider.price,
            coordinates: `[${provider.mapLocation.lat}, ${provider.mapLocation.lng}]`
          });
          
          allProfiles.push(provider);
          validCount++;
          
          logSuccess(`✅ Profil ajouté à la carte: ${provider.fullName} (${provider.role}) - ${provider.country}`);
          
        } catch (profileError) {
          logError(`❌ Erreur lors du traitement du profil ${doc.id}:`, profileError);
          invalidCount++;
        }
      });
      
      logInfo(`=== RÉSULTAT DU CHARGEMENT ===`);
      logInfo(`Documents traités: ${processedCount}`);
      logInfo(`Profils valides: ${validCount}`);
      logInfo(`Profils invalides: ${invalidCount}`);
      logInfo(`Profils finaux pour la carte: ${allProfiles.length}`);
      
      if (allProfiles.length === 0) {
        logWarn('Aucun profil valide trouvé pour la carte');
      } else {
        // Récapitulatif par pays
        const countryStats = allProfiles.reduce((acc, provider) => {
          acc[provider.country] = (acc[provider.country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        logInfo('Répartition par pays:', countryStats);
        
        // Récapitulatif par type
        const roleStats = allProfiles.reduce((acc, provider) => {
          acc[provider.role] = (acc[provider.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        logInfo('Répartition par rôle:', roleStats);
        
        // Récapitulatif en ligne/hors ligne
        const onlineStats = {
          online: allProfiles.filter(p => p.isOnline).length,
          offline: allProfiles.filter(p => !p.isOnline).length
        };
        
        logInfo('Répartition en ligne/hors ligne:', onlineStats);
      }
      
      setProviders(allProfiles);
      logSuccess(`🎯 ${allProfiles.length} profils finaux chargés pour la carte mondiale`);
      
    } catch (error) {
      logError("❌ Erreur lors du chargement des prestataires pour la carte:", error);
      
      // ✅ NOUVEAU: Gestion spécifique des erreurs de permissions
      if ((error as any).code === 'permission-denied') {
        const errorMsg = language === 'fr' ? 
          "Accès aux données de la carte temporairement indisponible." :
          "Map data access temporarily unavailable.";
        logError('Erreur de permission Firebase détectée');
        setError(errorMsg);
      } else if ((error as any).code === 'unavailable') {
        const errorMsg = language === 'fr' ? 
          "Service temporairement indisponible. Veuillez réessayer." :
          "Service temporarily unavailable. Please try again.";
        logError('Service Firebase indisponible');
        setError(errorMsg);
      } else {
        const errorMsg = language === 'fr' ? 
          "Erreur lors du chargement des données de la carte." :
          "Error loading map data.";
        logError('Erreur générique de chargement');
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
      logInfo('=== FIN DU CHARGEMENT DES PROVIDERS ===');
    }
  }, [language]);

  useEffect(() => {
    logInfo('=== EFFET DE CHARGEMENT INITIAL ===');
    loadProviders();
    
    return () => {
      logDebug('Nettoyage de l\'effet de chargement');
      loadingRef.current = false;
    };
  }, [loadProviders]);

  // Gestion du plein écran
  const toggleFullscreen = useCallback(() => {
    logDebug(`Toggle fullscreen: ${isFullscreen} → ${!isFullscreen}`);
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Gestion de la sélection - Fixé variable non utilisée
  const handleViewProfile = useCallback((providerId: string) => {
    logInfo(`Sélection du profil: ${providerId}`);
    
    if (!providerId || typeof providerId !== 'string') {
      logWarn('ID de provider invalide', { providerId, type: typeof providerId });
      return;
    }
    
    const sanitizedId = providerId.replace(/[^\w-]/g, '');
    if (!sanitizedId) {
      logWarn('ID de provider vide après sanitisation', { original: providerId });
      return;
    }
    
    try {
      if (onProviderSelect) {
        logDebug('Utilisation du callback onProviderSelect');
        onProviderSelect(sanitizedId);
      } else if (navigate) {
        logDebug('Navigation vers le profil via navigate');
        navigate(`/provider/${sanitizedId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        logWarn('Aucune méthode de navigation disponible');
        alert(`Profil sélectionné: ${sanitizedId}`);
      }
      
      logSuccess(`Profil sélectionné avec succès: ${sanitizedId}`);
    } catch (error) {
      logError('Erreur lors de la navigation:', error);
    }
  }, [navigate, onProviderSelect]);

  const mapCenter: [number, number] = [20, 0];
  const mapKey = useMemo(() => {
    const key = `modern-map-${Date.now()}-${containerDimensions.width}-${containerDimensions.height}`;
    logDebug(`Clé de carte générée: ${key}`);
    return key;
  }, [containerDimensions]);

  // Messages localisés
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
      exitFullscreen: 'Quitter le plein écran'
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
      exitFullscreen: 'Exit fullscreen'
    }
  };

  const t = messages[language as keyof typeof messages] || messages.en;

  // Rendu conditionnel avec design moderne
  if (error) {
    logWarn('Rendu de l\'état d\'erreur:', error);
    
    return (
      <div 
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-100`} 
        style={{ height, width }} 
        id={mapId}
        role="alert"
        aria-label={error}
      >
        <div className="bg-white border border-red-200 p-6 rounded-xl shadow-lg max-w-sm mx-4 text-center">
          <div className="text-red-600 font-semibold mb-2">{t.error}</div>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => {
              logInfo('Clic sur le bouton retry');
              loadProviders();
            }}
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
    logDebug('Rendu de l\'état de chargement');
    
    return (
      <div 
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200`} 
        style={{ height, width }} 
        id={mapId}
        role="status"
        aria-label={t.loading}
      >
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm mx-4 text-center">
          <div className="relative mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-700 text-lg font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (filteredProviders.length === 0) {
    logWarn('Rendu de l\'état "aucun expert"', { 
      providersTotal: providers.length, 
      filteredTotal: filteredProviders.length 
    });
    
    return (
      <div 
        className={`relative ${className} flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200`} 
        style={{ height, width }} 
        id={mapId}
        role="status"
        aria-label={t.noExperts}
      >
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm mx-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
            <MapPin className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 text-lg">{t.noExperts}</p>
          <div className="mt-4 text-sm text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
            <div><strong>Debug Info:</strong></div>
            <div>Providers totaux: {providers.length}</div>
            <div>Après filtrage: {filteredProviders.length}</div>
            <div>Filtres: {showOnlineOnly ? 'En ligne seulement' : 'Tous'}, {filterByRole === 'all' ? 'Tous rôles' : filterByRole}</div>
          </div>
        </div>
      </div>
    );
  }

  logInfo(`Rendu de la carte avec ${filteredProviders.length} providers`);
  logDebug('Providers à afficher:', filteredProviders.map(p => ({
    id: p.id,
    name: p.fullName,
    role: p.role,
    online: p.isOnline,
    coords: p.mapLocation ? `[${p.mapLocation.lat}, ${p.mapLocation.lng}]` : 'Aucune'
  })));

  return (
    <div 
      id={mapId} 
      ref={mapContainerRef}
      className={`relative ${className} rounded-2xl overflow-hidden shadow-xl border border-gray-200 ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''
      }`} 
      style={isFullscreen ? { height: '100vh', width: '100vw' } : { height, width }}
      role="application"
      aria-label={ariaLabel}
    >
      {/* Indicateur de chargement moderne */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex flex-col items-center justify-center z-[1000]"
          role="status"
          aria-label={t.loading}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-700 text-lg font-medium mt-6">{t.loading}</p>
        </div>
      )}
      
      {/* Bouton plein écran - Repositionné */}
      {allowFullscreen && !isLoading && (
        <button
          onClick={() => {
            logDebug('Clic sur toggle fullscreen');
            toggleFullscreen();
          }}
          className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-gray-200 hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-gray-700" />
          ) : (
            <Maximize2 className="w-5 h-5 text-gray-700" />
          )}
        </button>
      )}

      {/* Statistiques des experts - Repositionnées pour éviter la superposition */}
      {!isLoading && filteredProviders.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-gray-200 max-w-[calc(100%-8rem)]">
          <div className="flex items-center space-x-4 text-sm font-medium">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-2 shadow-sm"></div>
              <span className="text-gray-800 whitespace-nowrap">
                {statistics.onlineLawyers} {t.lawyer.toLowerCase()}{statistics.onlineLawyers > 1 ? 's' : ''} {t.online.toLowerCase()}
              </span>
            </div>
            <div className="text-gray-300 hidden sm:block">|</div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full mr-2 shadow-sm"></div>
              <span className="text-gray-800 whitespace-nowrap">
                {statistics.onlineExpats} {t.expat.toLowerCase()}{statistics.onlineExpats > 1 ? 's' : ''} {t.online.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Container de la carte */}
      <div className="leaflet-map-container" style={{ height, width, minHeight: height, position: 'relative' }\}>
        {/* ✅ RENDU DE LA CARTE AVEC LOGS DÉTAILLÉS */}
        <MapContainer 
          key={mapKey}
          center={mapCenter} 
          zoom={2} 
          minZoom={2}
          maxZoom={12}
          style={{ 
            height: '100%', 
            width: '100%', 
            zIndex: 1
          }}
          scrollWheelZoom={true}
          touchZoom={true}
          doubleClickZoom={true}
          dragging={true}
          attributionControl={true}
          zoomControl={true}
          preferCanvas={true}
          whenReady={() => {
            logSuccess('MapContainer prêt');
            setMapReady(true);
          }}
        >
          {/* Tile layer moderne */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            tileSize={256}
            detectRetina={true}
            crossOrigin={true}
            onLoad={() => logSuccess('Tiles chargées')}
            onError={(error) => logError('Erreur de chargement des tiles', error)}
          />
          
          <MapInvalidator />
          <MapUpdater providers={filteredProviders} isLoading={isLoading} />
          <MapResizer />
          
          {/* Clustering des marqueurs avec react-leaflet-cluster - Fixé */}
          {mapReady && filteredProviders.length > 0 && (
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterIcon}
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              zoomToBoundsOnClick={true}
              spiderfyDistanceMultiplier={1.5}
              removeOutsideVisibleBounds={true}
              animate={true}
              animateAddingMarkers={true}
              disableClusteringAtZoom={10}
            >
              {filteredProviders.map((provider, index) => {
                logDebug(`=== Rendu marker ${index + 1}/${filteredProviders.length}: ${provider.id} ===`);
                
                if (!provider.mapLocation || !validateCoordinates(provider.mapLocation)) {
                  logWarn(`Marker ${index + 1} ignoré - coordonnées invalides`, {
                    id: provider.id,
                    mapLocation: provider.mapLocation
                  });
                  return null;
                }
                
                const icon = MODERN_ICONS[provider.role][provider.isOnline ? 'online' : 'offline'];
                
                logSuccess(`Marker ${index + 1} rendu:`, {
                  id: provider.id,
                  name: provider.fullName,
                  position: [provider.mapLocation.lat, provider.mapLocation.lng],
                  role: provider.role,
                  online: provider.isOnline,
                  iconType: `${provider.role}-${provider.isOnline ? 'online' : 'offline'}`
                });
                
                return (
                  <Marker
                    key={`${provider.id}-${index}-${provider.isOnline ? 'on' : 'off'}`}
                    position={[provider.mapLocation.lat, provider.mapLocation.lng]}
                    icon={icon}
                    alt={`${provider.role}-${provider.id}`}
                    eventHandlers={{
                      add: () => logDebug(`Marker ajouté à la carte: ${provider.id}`),
                      remove: () => logDebug(`Marker retiré de la carte: ${provider.id}`)
                    }}
                  >
                    <Popup
                      maxWidth={380}
                      minWidth={320}
                      className="modern-popup"
                      eventHandlers={{
                        popupopen: () => logDebug(`Popup ouverte pour: ${provider.id}`),
                        popupclose: () => logDebug(`Popup fermée pour: ${provider.id}`)
                      }}
                    >
                      <div className="p-0 max-w-sm bg-white rounded-2xl overflow-hidden">
                        {/* Header moderne avec dégradé selon le rôle */}
                        <div className={`p-6 text-white relative overflow-hidden ${
                          provider.role === 'lawyer' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                          
                          <div className="flex items-start space-x-4 relative z-10">
                            <ModernAvatar 
                              src={provider.profilePhoto}
                              alt={`Photo de profil de ${provider.fullName}`}
                              firstName={provider.firstName}
                              fullName={provider.fullName}
                              role={provider.role}
                              size="lg"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-bold text-white text-lg truncate">
                                  {provider.fullName}
                                </h3>
                                {provider.isVerified && (
                                  <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-3 mb-3">
                                <span className={`px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white`}>
                                  {provider.role === 'lawyer' ? t.lawyer : t.expat}
                                </span>
                                {provider.isOnline && (
                                  <div className="flex items-center text-white/90 text-xs">
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                    {t.available}
                                  </div>
                                )}
                              </div>
                              
                              {/* Statut de connexion moderne */}
                              <div className="flex items-center">
                                {provider.isOnline ? (
                                  <Wifi className="w-4 h-4 text-green-300 mr-2" />
                                ) : (
                                  <WifiOff className="w-4 h-4 text-white/60 mr-2" />
                                )}
                                <span className={`text-sm font-medium ${
                                  provider.isOnline ? 'text-green-200' : 'text-white/60'
                                }`}>
                                  {provider.isOnline ? t.online : t.offline}
                                </span>
                                {provider.responseTime && provider.isOnline && (
                                  <span className="text-white/80 text-xs ml-3">
                                    {t.responseIn} {provider.responseTime}{t.minutes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contenu principal */}
                        <div className="p-6 space-y-5">
                          {/* Évaluation moderne */}
                          {provider.rating > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1.5 rounded-full">
                                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                                  <span className="ml-1.5 text-sm font-bold text-amber-700">
                                    {provider.rating}
                                  </span>
                                </div>
                                {provider.totalReviews && provider.totalReviews > 0 && (
                                  <span className="text-sm text-gray-500 font-medium">
                                    ({provider.totalReviews} {t.reviews})
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {provider.price}€
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                  /{provider.role === 'lawyer' ? '20min' : '30min'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Spécialités modernes */}
                          {provider.specialties && provider.specialties.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                {language === 'fr' ? 'Spécialités' : 'Specialties'}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {provider.specialties.slice(0, 4).map((specialty, specIndex) => (
                                  <span
                                    key={specIndex}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                                      provider.role === 'lawyer' 
                                        ? 'bg-gradient-to-r from-blue-50 to-blue-50 text-blue-700 border border-blue-200' 
                                        : 'bg-gradient-to-r from-green-50 to-green-50 text-green-700 border border-green-200'
                                    }`}
                                  >
                                    {specialty}
                                  </span>
                                ))}
                                {provider.specialties.length > 4 && (
                                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                                    +{provider.specialties.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Langues modernes */}
                          {provider.languages && provider.languages.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                {language === 'fr' ? 'Langues' : 'Languages'}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {provider.languages.slice(0, 5).map((lang, langIndex) => (
                                  <span
                                    key={langIndex}
                                    className="px-3 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full border border-gray-200"
                                  >
                                    {lang}
                                  </span>
                                ))}
                                {provider.languages.length > 5 && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                    +{provider.languages.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Localisation moderne avec traduction */}
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center text-gray-600">
                              <MapPin className={`w-4 h-4 mr-3 ${
                                provider.role === 'lawyer' ? 'text-blue-500' : 'text-green-500'
                              }`} />
                              <span className="text-sm font-medium">
                                {provider.city ? `${provider.city}, ` : ''}
                                {getTranslatedCountryName(provider.country, language) || 'Localisation non définie'}
                              </span>
                            </div>
                          </div>

                          {/* Boutons d'action modernes */}
                          <div className="space-y-3 pt-2">
                            <button
                              onClick={() => {
                                logInfo(`Clic sur bouton d'action pour ${provider.id}`);
                                handleViewProfile(provider.id);
                              }}
                              className={`w-full py-4 px-6 rounded-2xl text-white text-sm font-bold flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                                provider.isOnline
                                  ? (provider.role === 'lawyer' 
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
                                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500')
                                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:ring-gray-400'
                              }`}
                              aria-label={`${provider.isOnline ? t.callNow : t.viewProfile} - ${provider.fullName}`}
                            >
                              {provider.isOnline ? (
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
                            
                            {/* Bouton secondaire pour profil complet */}
                            {provider.isOnline && (
                              <button
                                onClick={() => {
                                  logInfo(`Clic sur bouton secondaire pour ${provider.id}`);
                                  handleViewProfile(provider.id);
                                }}
                                className={`w-full py-3 px-6 rounded-xl border-2 text-sm font-semibold flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                                  provider.role === 'lawyer'
                                    ? 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 focus:ring-blue-100'
                                    : 'border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 focus:ring-green-100'
                                }`}
                                aria-label={`${t.viewProfile} - ${provider.fullName}`}
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
      
      {/* Légende moderne - Repositionnée */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-gray-200">
        <div className="flex items-center space-x-4 text-sm font-medium">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mr-2 shadow-sm"></div>
            <span className="text-gray-700">{t.lawyer}s</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-br from-green-600 to-green-700 rounded-full mr-2 shadow-sm"></div>
            <span className="text-gray-700">{t.expat}s</span>
          </div>
        </div>
      </div>
      
      {/* Console de debug */}
      <div className="absolute bottom-20 left-4 z-[1000] bg-black/90 text-green-400 rounded-lg p-3 max-w-md text-xs font-mono max-h-32 overflow-y-auto">
        <div className="text-yellow-400 font-bold mb-1">🔍 Debug Console</div>
        <div>Providers chargés: {providers.length}</div>
        <div>Providers filtrés: {filteredProviders.length}</div>
        <div>Markers rendus: {filteredProviders.filter(p => p.mapLocation && validateCoordinates(p.mapLocation)).length}</div>
        <div>Carte prête: {mapReady ? '✅' : '❌'}</div>
        <div>Dimensions: {containerDimensions.width}x{containerDimensions.height}</div>
        <div className="text-cyan-400 mt-1">Derniers providers:</div>
        {filteredProviders.slice(0, 3).map(p => (
          <div key={p.id} className="text-xs">
            • {p.fullName} ({p.role}) - {p.isOnline ? '🟢' : '🔴'}
          </div>
        ))}
      </div>
      
      {/* Styles CSS modernes */}
      <style>{`
        /* Import Leaflet CSS */
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        
        /* Conteneur de carte moderne */
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          border-radius: 1rem;
          z-index: 1 !important;
          position: relative !important;
        }
        
        /* Contrôles modernes - Repositionnés */
        .leaflet-control-zoom {
          border: none !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
          overflow: hidden;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95) !important;
          margin-top: 80px !important;
          margin-right: 10px !important;
        }
        
        .leaflet-control-zoom a {
          background: rgba(255, 255, 255, 0.95) !important;
          color: #374151 !important;
          font-weight: bold !important;
          border: none !important;
          font-size: 20px !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          transition: all 0.2s ease !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: #374151 !important;
          color: white !important;
          transform: scale(1.05);
        }
        
        /* Attribution moderne */
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(10px) !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          font-size: 11px !important;
          color: #6B7280 !important;
        }
        
        /* Popup moderne */
        .modern-popup .leaflet-popup-content-wrapper {
          border-radius: 1rem !important;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          padding: 0 !important;
          backdrop-filter: blur(20px);
          overflow: hidden;
        }
        
        .modern-popup .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          max-height: 600px;
          overflow-y: auto;
          border-radius: 1rem;
        }
        
        .modern-popup .leaflet-popup-tip {
          background: white !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15) !important;
        }
        
        .modern-popup .leaflet-popup-close-button {
          color: white !important;
          font-size: 18px !important;
          font-weight: bold !important;
          top: 15px !important;
          right: 15px !important;
          width: 30px !important;
          height: 30px !important;
          background: rgba(255, 255, 255, 0.2) !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          backdrop-filter: blur(10px) !important;
          transition: all 0.2s ease !important;
        }
        
        .modern-popup .leaflet-popup-close-button:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: scale(1.1) !important;
        }
        
        /* Marqueurs avec couleurs correctes */
        .modern-marker.lawyer.online {
          filter: drop-shadow(0 0 15px rgba(37, 99, 235, 0.6)) !important;
          animation: pulse-glow-blue 3s ease-in-out infinite !important;
        }
        
        .modern-marker.expat.online {
          filter: drop-shadow(0 0 15px rgba(5, 150, 105, 0.6)) !important;
          animation: pulse-glow-green 3s ease-in-out infinite !important;
        }
        
        .modern-marker.offline {
          filter: drop-shadow(0 0 8px rgba(156, 163, 175, 0.4)) !important;
          opacity: 0.8 !important;
        }
        
        @keyframes pulse-glow-blue {
          0%, 100% {
            filter: drop-shadow(0 0 15px rgba(37, 99, 235, 0.6));
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(37, 99, 235, 0.8));
          }
        }
        
        @keyframes pulse-glow-green {
          0%, 100% {
            filter: drop-shadow(0 0 15px rgba(5, 150, 105, 0.6));
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(5, 150, 105, 0.8));
          }
        }
        
        /* Animation de clustering */
        @keyframes cluster-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        .custom-cluster-icon {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .custom-cluster-icon:hover {
          transform: scale(1.1) !important;
        }
        
        /* Animation d'apparition des marqueurs */
        .leaflet-marker-icon {
          animation: markerAppear 0.6s ease-out !important;
        }
        
        @keyframes markerAppear {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.5);
          }
          60% {
            transform: translateY(-5px) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Scrollbar personnalisée pour popup */
        .modern-popup .leaflet-popup-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .modern-popup .leaflet-popup-content::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 3px;
        }
        
        .modern-popup .leaflet-popup-content::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6B7280, #9CA3AF);
          border-radius: 3px;
        }
        
        .modern-popup .leaflet-popup-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #4B5563, #6B7280);
        }
        
        /* Responsive pour mobile */
        @media (max-width: 768px) {
          .modern-popup .leaflet-popup-content-wrapper {
            max-width: 280px !important;
          }
          
          .leaflet-control-zoom a {
            width: 35px !important;
            height: 35px !important;
            line-height: 35px !important;
            font-size: 18px !important;
          }
          
          .leaflet-control-zoom {
            margin-top: 120px !important;
          }
        }
        
        /* Plein écran */
        .leaflet-container.leaflet-fullscreen-on {
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(WorldMap);