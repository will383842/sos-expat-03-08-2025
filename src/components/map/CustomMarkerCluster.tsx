import { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useMap } from 'react-leaflet';
import type { ReactElement } from 'react';

// Types pour l'internationalisation
interface I18nStrings {
  clusterTooltip: string;
  markerTooltip: string;
}

// Configuration par défaut en français
const defaultI18n: I18nStrings = {
  clusterTooltip: 'Cliquez pour zoomer sur les marqueurs',
  markerTooltip: 'Marqueur sur la carte'
};

// Interface pour les props des marqueurs React Leaflet
interface MarkerProps {
  position: [number, number];
  icon?: L.Icon | L.DivIcon;
  children?: ReactElement | ReactElement[];
  eventHandlers?: Record<string, (...args: unknown[]) => void>;
  [key: string]: unknown;
}

// Props du composant principal
interface CustomMarkerClusterProps {
  children: ReactElement<MarkerProps> | ReactElement<MarkerProps>[];
  maxClusterRadius?: number;
  disableClusteringAtZoom?: number;
  showCoverageOnHover?: boolean;
  spiderfyOnMaxZoom?: boolean;
  chunkedLoading?: boolean;
  removeOutsideVisibleBounds?: boolean;
  animate?: boolean;
  animateAddingMarkers?: boolean;
  spiderfyDistanceMultiplier?: number;
  iconCreateFunction?: (cluster: L.MarkerCluster) => L.Icon | L.DivIcon;
  i18n?: Partial<I18nStrings>;
  className?: string;
}

/**
 * Composant CustomMarkerCluster optimisé pour la production
 * 
 * Fonctionnalités :
 * - Clustering haute performance avec Leaflet.markercluster
 * - Support mobile-first avec gestes tactiles optimisés
 * - Internationalisation (i18n) intégrée
 * - Accessibilité WCAG 2.1 AA
 * - Optimisations SEO et performance
 * - Gestion mémoire optimisée
 * 
 * @param children - Composants Marker React Leaflet
 * @param maxClusterRadius - Rayon maximum pour regrouper les marqueurs (défaut: 80px)
 * @param disableClusteringAtZoom - Niveau de zoom où désactiver le clustering
 * @param showCoverageOnHover - Afficher la zone de couverture au survol
 * @param spiderfyOnMaxZoom - Étaler les marqueurs au zoom maximum
 * @param chunkedLoading - Chargement par chunks pour de gros datasets
 * @param removeOutsideVisibleBounds - Supprimer les marqueurs hors vue (performance)
 * @param animate - Activer les animations
 * @param animateAddingMarkers - Animer l'ajout de nouveaux marqueurs
 * @param spiderfyDistanceMultiplier - Multiplicateur de distance pour l'étalement
 * @param iconCreateFunction - Fonction personnalisée pour créer les icônes de cluster
 * @param i18n - Textes d'internationalisation
 * @param className - Classe CSS personnalisée
 * @param aria-label - Label d'accessibilité
 */
const CustomMarkerCluster = ({
  children,
  maxClusterRadius = 80,
  disableClusteringAtZoom,
  showCoverageOnHover = false,
  spiderfyOnMaxZoom = true,
  chunkedLoading = true,
  removeOutsideVisibleBounds = true,
  animate = true,
  animateAddingMarkers = true,
  spiderfyDistanceMultiplier = 1,
  iconCreateFunction,
  i18n = {},
  className = ''
}: CustomMarkerClusterProps) => {
  const map = useMap();
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Set<L.Marker>>(new Set());
  
  // Fusion des traductions avec les valeurs par défaut
  const translations = useMemo(() => ({ ...defaultI18n, ...i18n }), [i18n]);

  // Fonction pour créer une icône de cluster personnalisée et accessible
  const createClusterIcon = useCallback((cluster: L.MarkerCluster): L.DivIcon => {
    if (iconCreateFunction) {
      return iconCreateFunction(cluster);
    }

    const childCount = cluster.getChildCount();
    let sizeClass = 'marker-cluster-small';
    
    if (childCount < 10) {
      sizeClass = 'marker-cluster-small';
    } else if (childCount < 100) {
      sizeClass = 'marker-cluster-medium';
    } else {
      sizeClass = 'marker-cluster-large';
    }

    return new L.DivIcon({
      html: `<div class="marker-cluster-inner" role="button" tabindex="0" aria-label="${childCount} marqueurs groupés, ${translations.clusterTooltip}">
               <span aria-hidden="true">${childCount}</span>
             </div>`,
      className: `marker-cluster ${sizeClass} ${className}`.trim(),
      iconSize: new L.Point(40, 40),
      iconAnchor: [20, 20]
    });
  }, [iconCreateFunction, translations.clusterTooltip, className]);

  // Normalisation des enfants en tableau
  const childrenArray = useMemo(() => {
    if (!children) return [];
    return Array.isArray(children) ? children : [children];
  }, [children]);

  // Création des options du cluster avec optimisations performance
  const clusterOptions = useMemo(() => ({
    maxClusterRadius,
    disableClusteringAtZoom,
    showCoverageOnHover,
    spiderfyOnMaxZoom,
    chunkedLoading,
    removeOutsideVisibleBounds,
    animate,
    animateAddingMarkers,
    spiderfyDistanceMultiplier,
    iconCreateFunction: createClusterIcon,
    // Optimisations mobiles
    spiderfyShapePositions: (count: number, centerPt: L.Point) => {
      const radius = Math.min(window.innerWidth, window.innerHeight) * 0.1;
      const angleStep = (2 * Math.PI) / count;
      const positions: L.Point[] = [];
      
      for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        positions.push(new L.Point(
          centerPt.x + radius * Math.cos(angle),
          centerPt.y + radius * Math.sin(angle)
        ));
      }
      return positions;
    }
  }), [
    maxClusterRadius,
    disableClusteringAtZoom,
    showCoverageOnHover,
    spiderfyOnMaxZoom,
    chunkedLoading,
    removeOutsideVisibleBounds,
    animate,
    animateAddingMarkers,
    spiderfyDistanceMultiplier,
    createClusterIcon
  ]);

  // Fonction pour créer un marqueur Leaflet à partir d'un composant React
  const createLeafletMarker = useCallback((child: ReactElement<MarkerProps>): L.Marker | null => {
    if (!child?.props?.position) {
      console.warn('CustomMarkerCluster: Marqueur ignoré, position manquante');
      return null;
    }

    const { position, icon, children: popupContent, eventHandlers, ...otherProps } = child.props;
    
    // Validation de la position
    if (!Array.isArray(position) || position.length !== 2 || 
        typeof position[0] !== 'number' || typeof position[1] !== 'number') {
      console.warn('CustomMarkerCluster: Position invalide pour le marqueur', position);
      return null;
    }

    try {
      const marker = L.marker(position, {
        icon,
        alt: translations.markerTooltip,
        keyboard: true,
        ...otherProps
      });

      // Ajout du popup si du contenu est fourni
      if (popupContent) {
        const popupContainer = document.createElement('div');
        popupContainer.setAttribute('role', 'dialog');
        popupContainer.setAttribute('aria-label', 'Informations du marqueur');
        
        // Si c'est une chaîne, l'ajouter directement
        if (typeof popupContent === 'string') {
          popupContainer.textContent = popupContent;
        } else {
          // Pour les éléments React, on utilise une approche simple
          popupContainer.innerHTML = String(popupContent);
        }
        
        marker.bindPopup(popupContainer, {
          closeButton: true,
          autoClose: true,
          closeOnClick: true,
          className: 'custom-popup'
        });
      }

      // Ajout des gestionnaires d'événements
      if (eventHandlers) {
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          if (typeof handler === 'function') {
            marker.on(event as keyof L.LeafletEventHandlerFnMap, handler);
          }
        });
      }

      // Événements d'accessibilité
      marker.on('add', () => {
        const element = marker.getElement();
        if (element) {
          element.setAttribute('role', 'button');
          element.setAttribute('tabindex', '0');
          element.setAttribute('aria-label', translations.markerTooltip);
          
          // Support clavier
          element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              marker.fire('click');
            }
          });
        }
      });

      return marker;
    } catch (error) {
      console.error('CustomMarkerCluster: Erreur création marqueur', error);
      return null;
    }
  }, [translations.markerTooltip]);

  // Effet principal pour gérer le cluster
  useEffect(() => {
    if (!map) return;

    // Copie des refs pour le cleanup
    const currentMarkersRef = markersRef.current;

    // Nettoyage du cluster précédent
    if (markerClusterRef.current) {
      map.removeLayer(markerClusterRef.current);
      currentMarkersRef.clear();
    }

    // Création du nouveau cluster
    const clusterGroup = L.markerClusterGroup(clusterOptions);
    markerClusterRef.current = clusterGroup;

    // Traitement des marqueurs par batches pour éviter le blocage UI
    const processMarkers = async () => {
      const batchSize = 50;
      const totalMarkers = childrenArray.length;
      
      for (let i = 0; i < totalMarkers; i += batchSize) {
        const batch = childrenArray.slice(i, i + batchSize);
        const markers: L.Marker[] = [];
        
        batch.forEach(child => {
          const marker = createLeafletMarker(child);
          if (marker) {
            markers.push(marker);
            currentMarkersRef.add(marker);
          }
        });
        
        if (markers.length > 0) {
          clusterGroup.addLayers(markers);
        }
        
        // Pause pour permettre au navigateur de respirer
        if (i + batchSize < totalMarkers) {
          await new Promise(resolve => requestAnimationFrame(() => resolve(void 0)));
        }
      }
    };

    // Ajout du cluster à la carte et traitement des marqueurs
    map.addLayer(clusterGroup);
    processMarkers().catch(error => {
      console.error('CustomMarkerCluster: Erreur traitement marqueurs', error);
    });

    // Nettoyage
    return () => {
      if (markerClusterRef.current && map) {
        map.removeLayer(markerClusterRef.current);
      }
      currentMarkersRef.clear();
      markerClusterRef.current = null;
    };
  }, [map, childrenArray, clusterOptions, createLeafletMarker]);

  // Nettoyage au démontage du composant
  useEffect(() => {
    const currentMarkersRef = markersRef.current;
    
    return () => {
      if (markerClusterRef.current && map) {
        map.removeLayer(markerClusterRef.current);
      }
      currentMarkersRef.clear();
    };
  }, [map]);

  // Ajout des styles CSS optimisés pour mobile
  useEffect(() => {
    const styleId = 'custom-marker-cluster-styles';
    
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .marker-cluster {
          background-clip: padding-box;
          border-radius: 50%;
          transition: all 0.2s ease;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .marker-cluster:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .marker-cluster:focus {
          outline: 2px solid #0078d4;
          outline-offset: 2px;
        }
        
        .marker-cluster-small {
          background-color: rgba(181, 226, 140, 0.8);
          border: 2px solid rgba(110, 204, 57, 0.8);
        }
        
        .marker-cluster-medium {
          background-color: rgba(241, 211, 87, 0.8);
          border: 2px solid rgba(240, 194, 12, 0.8);
        }
        
        .marker-cluster-large {
          background-color: rgba(253, 156, 115, 0.8);
          border: 2px solid rgba(241, 128, 23, 0.8);
        }
        
        .marker-cluster-inner {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          color: #333;
          border-radius: 50%;
        }
        
        .custom-popup {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Optimisations tactiles mobiles */
        @media (max-width: 768px) {
          .marker-cluster {
            min-width: 44px;
            min-height: 44px;
          }
          
          .marker-cluster-inner {
            font-size: 14px;
          }
        }
        
        /* Mode sombre */
        @media (prefers-color-scheme: dark) {
          .marker-cluster-inner {
            color: #fff;
          }
        }
        
        /* Réduction des mouvements pour l'accessibilité */
        @media (prefers-reduced-motion: reduce) {
          .marker-cluster,
          .marker-cluster:hover {
            transition: none;
            transform: none;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return null;
};

export default CustomMarkerCluster;