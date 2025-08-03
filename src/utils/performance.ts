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
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve, { once: true });
      }
    });

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

  const metrics = {
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
    const perfData = performance.getEntriesByType('navigation')[0];
    if (!perfData) return;

    metrics.navigationTiming = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ssl: perfData.connectEnd - perfData.secureConnectionStart,
      ttfb: perfData.responseStart - perfData.requestStart,
      download: perfData.responseEnd - perfData.responseStart,
      domParsing: perfData.domContentLoadedEventStart - perfData.responseEnd,
      domReady: perfData.domContentLoadedEventEnd - perfData.navigationStart,
      windowLoad: perfData.loadEventEnd - perfData.navigationStart,
      totalTime: perfData.loadEventEnd - perfData.navigationStart
    };
  };

  // Web Vitals measurement using Performance Observer
  const measureWebVitals = () => {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.webVitals.LCP = Math.round(lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              metrics.webVitals.FCP = Math.round(entry.startTime);
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metrics.webVitals.CLS = Math.round(clsValue * 1000) / 1000;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Input Delay (FID) / Interaction to Next Paint (INP)
        const interactionObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.processingStart && entry.startTime) {
              const delay = entry.processingStart - entry.startTime;
              if (!metrics.webVitals.FID) {
                metrics.webVitals.FID = Math.round(delay);
              }
              // Update INP (keep track of worst interaction)
              if (!metrics.webVitals.INP || delay > metrics.webVitals.INP) {
                metrics.webVitals.INP = Math.round(delay);
              }
            }
          });
        });
        interactionObserver.observe({ entryTypes: ['event'] });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }

    // TTFB from Navigation Timing
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      metrics.webVitals.TTFB = Math.round(navTiming.responseStart - navTiming.requestStart);
    }
  };

  // Custom metrics
  const measureCustomMetrics = () => {
    // DOM Ready time
    if (document.readyState === 'complete') {
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        metrics.customMetrics.domReady = Math.round(navTiming.domContentLoadedEventEnd - navTiming.navigationStart);
      }
    }

    // Memory usage (Chrome only)
    if ('memory' in performance) {
      metrics.customMetrics.jsHeapSize = {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }

    // Connection information
    if ('connection' in navigator) {
      const conn = navigator.connection;
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
    window.dispatchEvent(new CustomEvent('performance-measured', {
      detail: metrics
    }));

    return metrics;
  };

  // Run after page load
  if (document.readyState === 'complete') {
    setTimeout(runMeasurements, 100);
  } else {
    window.addEventListener('load', () => {
      setTimeout(runMeasurements, 100);
    }, { once: true });
  }

  return metrics;
};

// =============================================================================
// CRITICAL RESOURCES PRELOADING
// =============================================================================

export const preloadCriticalResources = (customResources = {}) => {
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

  const preloadResource = (href, as, type = null, crossorigin = null) => {
    // Check if already preloaded
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (type) link.type = type;
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
  resources.images.forEach(src => {
    if (src && src.trim()) {
      preloadResource(src, 'image');
    }
  });

  // Preload fonts
  resources.fonts.forEach(src => {
    if (src && src.trim()) {
      preloadResource(src, 'font', 'font/woff2', 'anonymous');
    }
  });

  // Preload stylesheets
  resources.styles.forEach(src => {
    if (src && src.trim()) {
      preloadResource(src, 'style', 'text/css');
    }
  });

  // Preload scripts
  resources.scripts.forEach(src => {
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

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        
        // Load the image
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        // Load responsive images
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }
        
        // Remove loading placeholder
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px', // Start loading 50px before entering viewport
    threshold: 0.01
  });

  // Observe all lazy images
  document.querySelectorAll('img[data-src]').forEach(img => {
    img.classList.add('lazy-loading');
    imageObserver.observe(img);
  });

  return imageObserver;
};

// =============================================================================
// ADAPTIVE LOADING BASED ON CONNECTION
// =============================================================================

export const adaptiveLoading = () => {
  if (!('connection' in navigator)) {
    return { shouldOptimize: false, reason: 'Connection API not supported' };
  }

  const connection = navigator.connection;
  const isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  const isSaveDataEnabled = connection.saveData;
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;

  const shouldOptimize = isSlowConnection || isSaveDataEnabled || isLowEndDevice;

  if (shouldOptimize) {
    console.log('🚀 Adaptive loading: Optimizing for slow connection/device');
    
    // Disable non-essential features
    document.documentElement.classList.add('reduce-motion');
    document.documentElement.classList.add('optimize-bandwidth');
    
    // Reduce image quality
    document.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.includes('q=')) {
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

export const prefetchNextPageResources = (urls) => {
  if (!urls || !Array.isArray(urls)) return;
  
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
};

export const prioritizeUserInteraction = () => {
  // Use scheduler API if available for better UX
  if ('scheduler' in window && 'postTask' in scheduler) {
    return (callback, priority = 'user-visible') => {
      scheduler.postTask(callback, { priority });
    };
  }
  
  // Fallback to requestIdleCallback or setTimeout
  return (callback) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 0);
    }
  };
};

// =============================================================================
// INITIALIZATION FUNCTION
// =============================================================================

export const initPerformanceOptimizations = (options = {}) => {
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
    preloadCriticalResources(config.customResources);
  }

  // Setup lazy loading
  if (config.enableLazyLoad) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLazyLoading);
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