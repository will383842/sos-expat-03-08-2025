// src/hooks/useDeviceDetection.ts - VERSION PARFAITE AVEC TYPES
import { useState, useEffect, useCallback, useMemo } from 'react';

interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  [key: string]: number;
}

interface DeviceState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  isInitialized: boolean;
}

interface StaticDetections {
  isTouchDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  supportsHover: boolean;
  pixelRatio: number;
}

interface ComputedProps {
  isSmallMobile: boolean;
  isLargeMobile: boolean;
  isSmallTablet: boolean;
  isLargeTablet: boolean;
  isSmallDesktop: boolean;
  isLargeDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  aspectRatio: number;
  isWideScreen: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  isMobileOrTablet: boolean;
  isTabletOrDesktop: boolean;
  viewportSize: string;
  isSmallViewport: boolean;
}

interface DebugInfo {
  userAgent: string;
  screenResolution: string;
  pixelRatio: number;
  touchPoints: number;
}

interface DeviceDetectionReturn extends DeviceState, StaticDetections, ComputedProps {
  breakpoints: Breakpoints;
  isReady: boolean;
  matchesMedia: (query: string) => boolean;
  debugInfo?: DebugInfo;
}

export const useDeviceDetection = (customBreakpoints: Partial<Breakpoints> = {}): DeviceDetectionReturn => {
  // 🎯 Breakpoints par défaut (mobile first)
  const breakpoints = useMemo(() => ({
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
    ...customBreakpoints
  }), [customBreakpoints]);

  // 🚀 États initiaux - MOBILE FIRST (SSR safe)
  const [deviceState, setDeviceState] = useState<DeviceState>(() => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    isInitialized: false
  }));

  // 📱 Détections statiques (calculées une seule fois)
  const staticDetections = useMemo<StaticDetections>(() => {
    if (typeof window === 'undefined') {
      return {
        isTouchDevice: false,
        isIOS: false,
        isAndroid: false,
        isSafari: false,
        isChrome: false,
        supportsHover: false,
        pixelRatio: 1
      };
    }

    const ua = navigator.userAgent;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return {
      isTouchDevice: hasTouch,
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isAndroid: /Android/.test(ua),
      isSafari: /^((?!chrome|android).)*safari/i.test(ua),
      isChrome: /Chrome/.test(ua) && !/Edge|Edg/.test(ua),
      supportsHover: window.matchMedia('(hover: hover)').matches,
      pixelRatio: window.devicePixelRatio || 1
    };
  }, []);

  // 🎯 Fonction de détection optimisée
  const checkDevice = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';

    // Déterminer le type d'appareil
    const isMobile = width < breakpoints.mobile;
    const isTablet = width >= breakpoints.mobile && width < breakpoints.tablet;
    const isDesktop = width >= breakpoints.tablet;

    setDeviceState(prev => {
      // Éviter les re-renders inutiles
      if (
        prev.screenWidth === width &&
        prev.screenHeight === height &&
        prev.orientation === orientation &&
        prev.isInitialized
      ) {
        return prev;
      }

      return {
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation,
        isInitialized: true
      };
    });
  }, [breakpoints]);

  // 🔄 Effect avec debouncing et optimisations
  useEffect(() => {
    // Vérification initiale immédiate
    checkDevice();

    let timeoutId: NodeJS.Timeout;
    let rafId: number;

    // Debounced resize handler
    const debouncedResize = () => {
      // Annuler les appels précédents
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);

      // Utiliser RAF pour les changements fréquents
      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(checkDevice, 100);
      });
    };

    // Orientation change handler (plus réactif)
    const handleOrientationChange = () => {
      // Délai pour laisser le navigateur ajuster les dimensions
      setTimeout(checkDevice, 150);
    };

    // Event listeners
    window.addEventListener('resize', debouncedResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [checkDevice]);

  // 🎨 Propriétés calculées (memoized)
  const computedProps = useMemo<ComputedProps>(() => {
    const { screenWidth, screenHeight, orientation, isMobile, isTablet, isDesktop } = deviceState;
    
    return {
      // Tailles spécifiques
      isSmallMobile: screenWidth > 0 && screenWidth < 480,
      isLargeMobile: screenWidth >= 480 && screenWidth < breakpoints.mobile,
      isSmallTablet: screenWidth >= breakpoints.mobile && screenWidth < 900,
      isLargeTablet: screenWidth >= 900 && screenWidth < breakpoints.tablet,
      isSmallDesktop: screenWidth >= breakpoints.tablet && screenWidth < breakpoints.desktop,
      isLargeDesktop: screenWidth >= breakpoints.desktop,
      
      // Orientations
      isLandscape: orientation === 'landscape',
      isPortrait: orientation === 'portrait',
      
      // Ratios
      aspectRatio: screenHeight > 0 ? screenWidth / screenHeight : 0,
      isWideScreen: screenWidth > 0 && screenHeight > 0 && (screenWidth / screenHeight) > 1.5,
      
      // Helpers
      breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      isMobileOrTablet: isMobile || isTablet,
      isTabletOrDesktop: isTablet || isDesktop,
      
      // Viewport
      viewportSize: `${screenWidth}x${screenHeight}`,
      isSmallViewport: screenWidth < 600 || screenHeight < 600,
    };
  }, [deviceState, breakpoints]);

  // 🎯 API finale complète
  return {
    // États de base
    ...deviceState,
    
    // Détections statiques
    ...staticDetections,
    
    // Propriétés calculées
    ...computedProps,
    
    // Utilitaires
    breakpoints,
    isReady: deviceState.isInitialized,
    
    // Helpers de requête media (pour usage avancé)
    matchesMedia: (query: string): boolean => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia(query).matches;
    },
    
    // Debug info
    debugInfo: process.env.NODE_ENV === 'development' ? {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      screenResolution: `${deviceState.screenWidth}x${deviceState.screenHeight}`,
      pixelRatio: staticDetections.pixelRatio,
      touchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
    } : undefined
  };
};