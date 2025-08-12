import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import { useMap } from 'react-leaflet'
import type { ReactElement } from 'react'
import type * as LeafletNS from 'leaflet' // <-- types only (aucune exécution)

// Types pour l'internationalisation
interface I18nStrings {
  clusterTooltip: string
  markerTooltip: string
}

// Configuration par défaut en français
const defaultI18n: I18nStrings = {
  clusterTooltip: 'Cliquez pour zoomer sur les marqueurs',
  markerTooltip: 'Marqueur sur la carte',
}

// Interface pour les props des marqueurs React Leaflet
interface MarkerProps {
  position: [number, number]
  icon?: LeafletNS.Icon | LeafletNS.DivIcon
  children?: ReactElement | ReactElement[]
  eventHandlers?: Record<string, (...args: unknown[]) => void>
  [key: string]: unknown
}

// Props du composant principal
interface CustomMarkerClusterProps {
  children: ReactElement<MarkerProps> | ReactElement<MarkerProps>[]
  maxClusterRadius?: number
  disableClusteringAtZoom?: number
  showCoverageOnHover?: boolean
  spiderfyOnMaxZoom?: boolean
  chunkedLoading?: boolean
  removeOutsideVisibleBounds?: boolean
  animate?: boolean
  animateAddingMarkers?: boolean
  spiderfyDistanceMultiplier?: number
  iconCreateFunction?: (cluster: LeafletNS.MarkerCluster) => LeafletNS.Icon | LeafletNS.DivIcon
  i18n?: Partial<I18nStrings>
  className?: string
  onClusterReady?: (clusterGroup: LeafletNS.MarkerClusterGroup) => void
}

/**
 * Composant CustomMarkerCluster optimisé pour la production
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
  className = '',
  onClusterReady,
}: CustomMarkerClusterProps) => {
  const map = useMap()

  // L est chargé dynamiquement côté client
  const [L, setL] = useState<null | typeof LeafletNS>(null)

  // Réfs
  const markerClusterRef = useRef<LeafletNS.MarkerClusterGroup | null>(null)
  const markersRef = useRef<Set<LeafletNS.Marker>>(new Set())
  const processingRef = useRef<boolean>(false)

  // Charger Leaflet et markercluster uniquement dans le navigateur
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (typeof window === 'undefined') return
      const leaflet = await import('leaflet')
      await import('leaflet.markercluster')
      await import('leaflet/dist/leaflet.css')
      if (mounted) setL(leaflet)
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Gestion d'erreur
  if (!L || !map) {
    return null // ou un composant de loading si besoin
  }

  // Fusion des traductions
  const translations = useMemo(() => ({ ...defaultI18n, ...i18n }), [i18n])

  // Icône de cluster avec gestion d'erreur
  const createClusterIcon = useCallback(
    (cluster: LeafletNS.MarkerCluster): LeafletNS.DivIcon => {
      try {
        if (iconCreateFunction) {
          return iconCreateFunction(cluster)
        }
        
        const childCount = cluster.getChildCount()
        let sizeClass = 'marker-cluster-small'
        if (childCount >= 100) sizeClass = 'marker-cluster-large'
        else if (childCount >= 10) sizeClass = 'marker-cluster-medium'

        return new L.DivIcon({
          html: `<div class="marker-cluster-inner" role="button" tabindex="0" aria-label="${childCount} marqueurs groupés, ${translations.clusterTooltip}">
                   <span aria-hidden="true">${childCount}</span>
                 </div>`,
          className: `marker-cluster ${sizeClass} ${className}`.trim(),
          iconSize: new L.Point(40, 40),
          iconAnchor: [20, 20],
        })
      } catch (error) {
        console.error('CustomMarkerCluster: Erreur création icône cluster', error)
        // Fallback vers une icône simple
        return new L.DivIcon({
          html: `<div>${cluster.getChildCount()}</div>`,
          className: 'marker-cluster-fallback',
        })
      }
    },
    [L, iconCreateFunction, translations.clusterTooltip, className]
  )

  // Normalisation des enfants avec validation
  const childrenArray = useMemo(() => {
    if (!children) return []
    const array = Array.isArray(children) ? children : [children]
    
    // Validation des enfants
    return array.filter((child) => {
      if (!child?.props?.position) {
        console.warn('CustomMarkerCluster: Enfant ignoré, position manquante', child)
        return false
      }
      return true
    })
  }, [children])

  // Options de cluster avec validation
  const clusterOptions = useMemo(
    () => ({
      maxClusterRadius: Math.max(0, Math.min(maxClusterRadius, 500)), // Limite raisonnable
      disableClusteringAtZoom,
      showCoverageOnHover,
      spiderfyOnMaxZoom,
      chunkedLoading,
      removeOutsideVisibleBounds,
      animate,
      animateAddingMarkers,
      spiderfyDistanceMultiplier: Math.max(0.1, Math.min(spiderfyDistanceMultiplier, 5)),
      iconCreateFunction: createClusterIcon,
      spiderfyShapePositions: (count: number, centerPt: LeafletNS.Point) => {
        try {
          const radius = Math.min(window.innerWidth, window.innerHeight) * 0.1
          const angleStep = (2 * Math.PI) / count
          const positions: LeafletNS.Point[] = []
          
          for (let i = 0; i < count; i++) {
            const angle = i * angleStep
            positions.push(
              new L.Point(
                centerPt.x + radius * Math.cos(angle),
                centerPt.y + radius * Math.sin(angle)
              )
            )
          }
          return positions
        } catch (error) {
          console.error('CustomMarkerCluster: Erreur spiderfy positions', error)
          return [centerPt] // Fallback
        }
      },
    }),
    [
      L,
      maxClusterRadius,
      disableClusteringAtZoom,
      showCoverageOnHover,
      spiderfyOnMaxZoom,
      chunkedLoading,
      removeOutsideVisibleBounds,
      animate,
      animateAddingMarkers,
      spiderfyDistanceMultiplier,
      createClusterIcon,
    ]
  )

  // Créer un marqueur Leaflet à partir d'un enfant React avec validation renforcée
  const createLeafletMarker = useCallback(
    (child: ReactElement<MarkerProps>): LeafletNS.Marker | null => {
      try {
        if (!child?.props?.position) {
          console.warn('CustomMarkerCluster: Marqueur ignoré, position manquante')
          return null
        }
        
        const { position, icon, children: popupContent, eventHandlers, ...otherProps } = child.props

        // Validation stricte de la position
        if (
          !Array.isArray(position) ||
          position.length !== 2 ||
          typeof position[0] !== 'number' ||
          typeof position[1] !== 'number' ||
          !isFinite(position[0]) ||
          !isFinite(position[1]) ||
          Math.abs(position[0]) > 90 || // Latitude valide
          Math.abs(position[1]) > 180   // Longitude valide
        ) {
          console.warn('CustomMarkerCluster: Position invalide pour le marqueur', position)
          return null
        }

        const marker = L.marker(position, {
          icon,
          alt: translations.markerTooltip,
          keyboard: true,
          ...otherProps,
        })

        // Gestion du popup avec sécurité
        if (popupContent) {
          const popupContainer = document.createElement('div')
          popupContainer.setAttribute('role', 'dialog')
          popupContainer.setAttribute('aria-label', 'Informations du marqueur')

          if (typeof popupContent === 'string') {
            popupContainer.textContent = popupContent
          } else {
            // Sanitisation basique pour éviter XSS
            const contentStr = String(popupContent).replace(/<script[^>]*>.*?<\/script>/gi, '')
            popupContainer.innerHTML = contentStr
          }

          marker.bindPopup(popupContainer, {
            closeButton: true,
            autoClose: true,
            closeOnClick: true,
            className: 'custom-popup',
            maxWidth: 300,
          })
        }

        // Event handlers avec protection
        if (eventHandlers && typeof eventHandlers === 'object') {
          Object.entries(eventHandlers).forEach(([event, handler]) => {
            if (typeof handler === 'function') {
              marker.on(event as keyof LeafletNS.LeafletEventHandlerFnMap, (...args) => {
                try {
                  handler(...args)
                } catch (error) {
                  console.error(`CustomMarkerCluster: Erreur event handler ${event}`, error)
                }
              })
            }
          })
        }

        // Amélioration accessibilité
        marker.on('add', () => {
          try {
            const element = marker.getElement()
            if (element) {
              element.setAttribute('role', 'button')
              element.setAttribute('tabindex', '0')
              element.setAttribute('aria-label', translations.markerTooltip)
              
              const handleKeydown = (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  marker.fire('click')
                }
              }
              
              element.addEventListener('keydown', handleKeydown)
              
              // Cleanup sur remove
              marker.on('remove', () => {
                element.removeEventListener('keydown', handleKeydown)
              })
            }
          } catch (error) {
            console.error('CustomMarkerCluster: Erreur accessibilité marqueur', error)
          }
        })

        return marker
      } catch (error) {
        console.error('CustomMarkerCluster: Erreur création marqueur', error)
        return null
      }
    },
    [L, translations.markerTooltip]
  )

  // Fonction de traitement des marqueurs avec débounce
  const debouncedProcessMarkers = useMemo(
    () => async (clusterGroup: LeafletNS.MarkerClusterGroup, children: ReactElement<MarkerProps>[]) => {
      if (processingRef.current) return
      processingRef.current = true
      
      try {
        const batchSize = chunkedLoading ? 50 : children.length
        const totalMarkers = children.length
        const currentMarkersRef = markersRef.current

        for (let i = 0; i < totalMarkers; i += batchSize) {
          const batch = children.slice(i, i + batchSize)
          const markers: LeafletNS.Marker[] = []

          batch.forEach((child) => {
            const marker = createLeafletMarker(child)
            if (marker) {
              markers.push(marker)
              currentMarkersRef.add(marker)
            }
          })

          if (markers.length > 0) {
            clusterGroup.addLayers(markers as any)
          }

          // Pause entre les batches pour éviter de bloquer l'UI
          if (chunkedLoading && i + batchSize < totalMarkers) {
            await new Promise((resolve) => requestAnimationFrame(() => resolve(void 0)))
          }
        }
        
        // Callback optionnel quand le cluster est prêt
        if (onClusterReady) {
          onClusterReady(clusterGroup)
        }
      } catch (error) {
        console.error('CustomMarkerCluster: Erreur traitement marqueurs', error)
      } finally {
        processingRef.current = false
      }
    },
    [chunkedLoading, createLeafletMarker, onClusterReady]
  )

  // Effet principal cluster
  useEffect(() => {
    if (!map || !L) return

    const currentMarkersRef = markersRef.current

    // Nettoyage du cluster précédent
    if (markerClusterRef.current) {
      try {
        map.removeLayer(markerClusterRef.current)
      } catch (error) {
        console.warn('CustomMarkerCluster: Erreur suppression ancien cluster', error)
      }
      currentMarkersRef.clear()
    }

    try {
      const clusterGroup = (L as any).markerClusterGroup(clusterOptions) as LeafletNS.MarkerClusterGroup
      markerClusterRef.current = clusterGroup

      map.addLayer(clusterGroup)
      
      // Traitement asynchrone des marqueurs
      if (childrenArray.length > 0) {
        debouncedProcessMarkers(clusterGroup, childrenArray)
      }

    } catch (error) {
      console.error('CustomMarkerCluster: Erreur création cluster', error)
    }

    // Cleanup
    return () => {
      if (markerClusterRef.current && map) {
        try {
          map.removeLayer(markerClusterRef.current)
        } catch (error) {
          console.warn('CustomMarkerCluster: Erreur cleanup', error)
        }
      }
      currentMarkersRef.clear()
      markerClusterRef.current = null
    }
  }, [map, L, clusterOptions, debouncedProcessMarkers, childrenArray])

  // Nettoyage au démontage
  useEffect(() => {
    const currentMarkersRef = markersRef.current
    return () => {
      if (markerClusterRef.current && map) {
        try {
          map.removeLayer(markerClusterRef.current)
        } catch (error) {
          console.warn('CustomMarkerCluster: Erreur démontage', error)
        }
      }
      currentMarkersRef.clear()
    }
  }, [map])

  // Styles injectés (identiques à votre version)
  useEffect(() => {
    const styleId = 'custom-marker-cluster-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .marker-cluster { background-clip: padding-box; border-radius: 50%; transition: all 0.2s ease; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .marker-cluster:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .marker-cluster:focus { outline: 2px solid #0078d4; outline-offset: 2px; }
        .marker-cluster-small { background-color: rgba(181,226,140,0.8); border: 2px solid rgba(110,204,57,0.8); }
        .marker-cluster-medium { background-color: rgba(241,211,87,0.8); border: 2px solid rgba(240,194,12,0.8); }
        .marker-cluster-large { background-color: rgba(253,156,115,0.8); border: 2px solid rgba(241,128,23,0.8); }
        .marker-cluster-inner { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: #333; border-radius: 50%; }
        .marker-cluster-fallback { background-color: #ccc; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
        .custom-popup { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @media (max-width: 768px) { .marker-cluster { min-width: 44px; min-height: 44px; } .marker-cluster-inner { font-size: 14px; } }
        @media (prefers-color-scheme: dark) { .marker-cluster-inner { color: #fff; } }
        @media (prefers-reduced-motion: reduce) { .marker-cluster, .marker-cluster:hover { transition: none; transform: none; } }
      `
      document.head.appendChild(style)
    }
  }, [])

  return null
CustomMarkerCluster.displayName = 'CustomMarkerCluster'

export default CustomMarkerCluster