/**
 * Performance utilities optimized for mobile-first with desktop compatibility
 * Comprehensive performance monitoring, optimization and resource management
 */

// =============================================================================
// SERVICE WORKER MANAGEMENT
// =============================================================================

export const registerSW = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    // Defer SW registration to avoid blocking main thread
    await new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve(), { once: true });
      }
    });

    // ✅ Évite un second register si déjà contrôlé (StrictMode double-mount en dev)
    if (navigator.serviceWorker.controller) {
      console.log('SW already controlling this page, skip register');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New content available, notify user
          dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    console.log('✅ Service Worker registered successfully');
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
};

// =============================================================================
// PERFORMANCE MONITORING & WEB VITALS
// =============================================================================

export const measurePerformance = () => {
  if (!('performance' in window)) {
    console.warn('Performance API not supported');
    return;
  }

  const metrics: {
    navigationTiming: any;
    webVitals: {
      LCP: number | null;
      FID: number | null;
      CLS: number | null;
      FCP: number | null;
      TTFB: number | null;
      INP: number | null;
    };
    customMetrics: {
      domReady: number | null;
      firstRender: number | null;
      jsHeapSize: { used: number; total: number; limit: number } | null;
      connectionType:
        | { effectiveType: string; downlink: number; rtt: number; saveData: boolean }
        | null;
    };
  } = {
    navigationTiming: null,
    webVitals: {
      LCP: null,
      FID: null,
      CLS: null,
      FCP: null,
      TTFB: null,
      INP: null
    },
    customMetrics: {
      domReady: null,
      firstRender: null,
      jsHeapSize: null,
      connectionType: null
    }
  };

  // Navigation Timing API
  const measureNavigationTiming = () => {
    const perfData = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!perfData) return;

    const safe = (v: number) => (Number.isFinite(v) ? Math.round(v) : null);

    metrics.navigationTiming = {
      dns: safe(perfData.domainLookupEnd - perfData.domainLookupStart),
      tcp: safe(perfData.connectEnd - perfData.connectStart),
      ssl: safe(perfData.secureConnectionStart ? perfData.connectEnd - perfData.secureConnectionStart : 0),
      ttfb: safe(perfData.responseStart - perfData.requestStart),
      download: safe(perfData.responseEnd - perfData.responseStart),
      domParsing: safe(perfData.domContentLoadedEventStart - perfData.responseEnd),
      domReady: safe(perfData.domContentLoadedEventEnd - perfData.navigationStart),
      windowLoad: safe(perfData.loadEventEnd - perfData.navigationStart),
      totalTime: safe(perfData.loadEventEnd - perfData.navigationStart)
    };
  };

  // Web Vitals measurement using Performance Observer
  const measureWebVitals = () => {
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry | undefined;
          if (lastEntry && typeof lastEntry.startTime === 'number') {
            metrics.webVitals.LCP = Math.round(lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries as PerformanceEntry[]) {
            // @ts-expect-error name exists on PerformancePaintTiming
            if ((entry as any).name === 'first-contentful-paint' && typeof entry.startTime === 'number') {
              metrics.webVitals.FCP = Math.round(entry.startTime);
            }
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0;
            }
          }
          metrics.webVitals.CLS = Math.round(clsValue * 1000) / 1000;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Input Delay (FID)
        try {
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (entry.processingStart && entry.startTime) {
                const delay = entry.processingStart - entry.startTime;
                if (Number.isFinite(delay)) {
                  metrics.webVitals.FID = metrics.webVitals.FID ?? Math.round(delay);
                }
              }
            }
          });
          fidObserver.observe({ type: 'first-input', buffered: true } as any);
        } catch {
          // Some browsers may not support this combination
        }

        // Interaction to Next Paint (INP) – keep worst interaction
        try {
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              // Some browsers expose 'duration' as latency proxy for INP
              const latency =
                (typeof entry.duration === 'number' && entry.duration) ||
                (entry.processingStart && entry.startTime
                  ? entry.processingStart - entry.startTime
                  : null);
              if (latency && Number.isFinite(latency)) {
                const rounded = Math.round(latency);
                if (!metrics.webVitals.INP || rounded > metrics.webVitals.INP) {
                  metrics.webVitals.INP = rounded;
                }
              }
            }
          });
          inpObserver.observe({ type: 'event', buffered: true } as any);
        } catch {
          // ignore if not supported
        }
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }

    // TTFB from Navigation Timing
    const navTiming = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navTiming) {
      const ttfb = navTiming.responseStart - navTiming.requestStart;
      if (Number.isFinite(ttfb)) {
        metrics.webVitals.TTFB = Math.round(ttfb);
      }
    }
  };

  // Custom metrics
  const measureCustomMetrics = () => {
    // DOM Ready time
    const navTiming = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (document.readyState === 'complete' && navTiming) {
      const v = navTiming.domContentLoadedEventEnd - navTiming.navigationStart;
      metrics.customMetrics.domReady = Number.isFinite(v) ? Math.round(v) : null;
    }

    // Memory usage (Chrome only)
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      metrics.customMetrics.jsHeapSize = {
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
      };
    }

    // Connection information
    const anyNav = navigator as any;
    if (anyNav.connection) {
      const conn = anyNav.connection;
      metrics.customMetrics.connectionType = {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }
  };

  // Execute measurements
  const runMeasurements = () => {
    measureNavigationTiming();
    measureWebVitals();
    measureCustomMetrics();

    // Log comprehensive performance report
    console.group('📊 Performance Metrics Report');
    console.log('Navigation Timing:', metrics.navigationTiming);
    console.log('Web Vitals:', metrics.webVitals);
    console.log('Custom Metrics:', metrics.customMetrics);
    console.groupEnd();

    // Dispatch custom event with metrics
    window.dispatchEvent(
      new CustomEvent('performance-measured', {
        detail: metrics
      })
    );

    return metrics;
  };

  // Run after page load
  if (document.readyState === 'complete') {
    setTimeout(runMeasurements, 100);
  } else {
    window.addEventListener(
      'load',
      () => {
        setTimeout(runMeasurements, 100);
      },
      { once: true }
    );
  }

  return metrics;
};

// =============================================================================
// CRITICAL RESOURCES PRELOADING
// =============================================================================

export const preloadCriticalResources = (customResources: Partial<{
  images: string[];
  fonts: string[];
  styles: string[];
  scripts: string[];
}> = {}) => {
  const isMobile = window.innerWidth <= 768;
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const hasWebP = checkWebPSupport();

  // Default critical resources optimized for mobile
  const defaultResources = {
    images: [
      // Mobile-first images
      isMobile ? '/images/hero-mobile.webp' : '/images/hero-desktop.webp',
      '/images/logo.svg',
      ...(isDarkMode ? ['/images/logo-dark.svg'] : []),
      // Above-the-fold images
      '/images/critical-icon.webp'
    ],
    fonts: [
      // Preload critical fonts with font-display: swap
      '/fonts/inter-400.woff2',
      '/fonts/inter-600.woff2'
    ],
    styles: [
      // Critical CSS
      '/css/critical.css',
      ...(isMobile ? ['/css/mobile.css'] : ['/css/desktop.css'])
    ],
    scripts: [
      // Essential JS modules
      '/js/critical.js'
    ]
  };

  // Merge with custom resources
  const resources = {
    images: [...defaultResources.images, ...(customResources.images || [])],
    fonts: [...defaultResources.fonts, ...(customResources.fonts || [])],
    styles: [...defaultResources.styles, ...(customResources.styles || [])],
    scripts: [...defaultResources.scripts, ...(customResources.scripts || [])]
  };

  const preloadResource = (href: string, as: string, type: string | null = null, crossorigin: string | null = null) => {
    // Check if already preloaded
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;

    if (type) (link as any).type = type;
    if (crossorigin) link.crossOrigin = crossorigin;

    // Add media query for responsive images
    if (as === 'image' && href.includes('mobile') && !isMobile) {
      return; // Skip mobile images on desktop
    }

    // Error handling
    link.onerror = () => {
      console.warn(`Failed to preload resource: ${href}`);
    };

    document.head.appendChild(link);
  };

  // Preload images
  resources.images.forEach((src) => {
    if (src && src.trim()) {
      preloadResource(src, 'image');
    }
  });

  // Preload fonts
  resources.fonts.forEach((src) => {
    if (src && src.trim()) {
      preloadResource(src, 'font', 'font/woff2', 'anonymous');
    }
  });

  // Preload stylesheets
  resources.styles.forEach((src) => {
    if (src && src.trim()) {
      preloadResource(src, 'style', 'text/css');
    }
  });

  // Preload scripts
  resources.scripts.forEach((src) => {
    if (src && src.trim()) {
      preloadResource(src, 'script', 'text/javascript');
    }
  });

  console.log(`✅ Preloaded ${Object.values(resources).flat().length} critical resources`);
};

// =============================================================================
// LAZY LOADING UTILITIES
// =============================================================================

export const setupLazyLoading = () => {
  if (!('IntersectionObserver' in window)) {
    console.warn('IntersectionObserver not supported, loading all images');
    return;
  }

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;

          // Load the image
          if ((img as any).dataset?.src) {
            img.src = (img as any).dataset.src;
            img.removeAttribute('data-src');
          }

          // Load responsive images
          if ((img as any).dataset?.srcset) {
            (img as any).srcset = (img as any).dataset.srcset;
            img.removeAttribute('data-srcset');
          }

          // Remove loading placeholder
          img.classList.remove('lazy-loading');
          img.classList.add('lazy-loaded');

          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: '50px 0px', // Start loading 50px before entering viewport
      threshold: 0.01
    }
  );

  // Observe all lazy images
  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.classList.add('lazy-loading');
    imageObserver.observe(img);
  });

  return imageObserver;
};

// =============================================================================
// ADAPTIVE LOADING BASED ON CONNECTION
// =============================================================================

export const adaptiveLoading = () => {
  const anyNav = navigator as any;
  if (!anyNav.connection) {
    return { shouldOptimize: false, reason: 'Connection API not supported' };
  }

  const connection = anyNav.connection;
  const isSlowConnection =
    connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  const isSaveDataEnabled = connection.saveData;
  const isLowEndDevice = (navigator as any).hardwareConcurrency && (navigator as any).hardwareConcurrency <= 2;

  const shouldOptimize = isSlowConnection || isSaveDataEnabled || isLowEndDevice;

  if (shouldOptimize) {
    console.log('🚀 Adaptive loading: Optimizing for slow connection/device');

    // Disable non-essential features
    document.documentElement.classList.add('reduce-motion');
    document.documentElement.classList.add('optimize-bandwidth');

    // Reduce image quality
    document.querySelectorAll('img').forEach((img) => {
      if (img instanceof HTMLImageElement && img.src && !img.src.includes('q=')) {
        img.src += img.src.includes('?') ? '&q=60' : '?q=60';
      }
    });
  }

  return {
    shouldOptimize,
    connectionType: connection.effectiveType,
    saveData: isSaveDataEnabled,
    downlink: connection.downlink,
    rtt: connection.rtt
  };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const checkWebPSupport = () => {
  const canvas = document.createElement('canvas');
  return canvas.toDataURL && canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

export const prefetchNextPageResources = (urls: string[]) => {
  if (!urls || !Array.isArray(urls)) return;

  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
};

export const prioritizeUserInteraction = () => {
  // Use scheduler API if available for better UX
  const anyScheduler = (window as any).scheduler;
  if (anyScheduler && 'postTask' in anyScheduler) {
    return (callback: () => void, priority: 'user-visible' | 'background' = 'user-visible') => {
      anyScheduler.postTask(callback, { priority });
    };
  }

  // Fallback to requestIdleCallback or setTimeout
  return (callback: () => void) => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;
    if (ric) {
      ric(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 0);
    }
  };
};

// =============================================================================
// INITIALIZATION FUNCTION
// =============================================================================

export const initPerformanceOptimizations = (options: Partial<{
  enableSW: boolean;
  enableMetrics: boolean;
  enablePreload: boolean;
  enableLazyLoad: boolean;
  enableAdaptive: boolean;
  customResources: {
    images?: string[];
    fonts?: string[];
    styles?: string[];
    scripts?: string[];
  };
}> = {}) => {
  const defaults = {
    enableSW: true,
    enableMetrics: true,
    enablePreload: true,
    enableLazyLoad: true,
    enableAdaptive: true,
    customResources: {}
  };

  const config = { ...defaults, ...options };

  console.log('🚀 Initializing performance optimizations...');

  // Register Service Worker
  if (config.enableSW) {
    registerSW();
  }

  // Setup performance monitoring
  if (config.enableMetrics) {
    measurePerformance();
  }

  // Preload critical resources
  if (config.enablePreload) {
    preloadCriticalResources(config.customResources as any);
  }

  // Setup lazy loading
  if (config.enableLazyLoad) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLazyLoading, { once: true });
    } else {
      setupLazyLoading();
    }
  }

  // Apply adaptive loading
  if (config.enableAdaptive) {
    adaptiveLoading();
  }

  console.log('✅ Performance optimizations initialized');
};
