/**
 * Performance utilities optimized for mobile-first with desktop compatibility
 * Comprehensive performance monitoring, optimization and resource management
 */

/* =============================================================================
   SERVICE WORKER MANAGEMENT
============================================================================= */

export const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return null;
  }

  try {
    // Defer SW registration to avoid blocking main thread
    await new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", () => resolve(), { once: true });
      }
    });

    // ✅ Évite un second register si déjà contrôlé (StrictMode double-mount en dev)
    if (navigator.serviceWorker.controller) {
      console.log("SW already controlling this page, skip register");
      return null;
    }

    // Note: updateViaCache accepte "imports" | "all"
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "imports",
    });

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent("sw-update-available"));
        }
      });
    });

    console.log("✅ Service Worker registered successfully");
    return registration;
  } catch (error) {
    console.error("❌ Service Worker registration failed:", error);
    return null;
  }
};

/* =============================================================================
   PERFORMANCE MONITORING & WEB VITALS
============================================================================= */

interface NavigationTimingSummary {
  dns: number | null;
  tcp: number | null;
  ssl: number | null;
  ttfb: number | null;
  download: number | null;
  domParsing: number | null;
  domReady: number | null;
  windowLoad: number | null;
  totalTime: number | null;
}

interface WebVitals {
  LCP: number | null;
  FID: number | null;
  CLS: number | null;
  FCP: number | null;
  TTFB: number | null;
  INP: number | null;
}

interface JSHeapSize {
  used: number;
  total: number;
  limit: number;
}

interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface CustomMetrics {
  domReady: number | null;
  firstRender: number | null;
  jsHeapSize: JSHeapSize | null;
  connectionType: ConnectionInfo | null;
}

interface Metrics {
  navigationTiming: NavigationTimingSummary | null;
  webVitals: WebVitals;
  customMetrics: CustomMetrics;
}

export const measurePerformance = (): Metrics | undefined => {
  if (!("performance" in window)) {
    console.warn("Performance API not supported");
    return;
  }

  const metrics: Metrics = {
    navigationTiming: null,
    webVitals: {
      LCP: null,
      FID: null,
      CLS: null,
      FCP: null,
      TTFB: null,
      INP: null,
    },
    customMetrics: {
      domReady: null,
      firstRender: null,
      jsHeapSize: null,
      connectionType: null,
    },
  };

  const measureNavigationTiming = (): void => {
    const perfData = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!perfData) return;

    const safe = (v: number): number | null => (Number.isFinite(v) ? Math.round(v) : null);
    const navigationStart =
      (perfData as unknown as { navigationStart?: number }).navigationStart ?? perfData.fetchStart;

    metrics.navigationTiming = {
      dns: safe(perfData.domainLookupEnd - perfData.domainLookupStart),
      tcp: safe(perfData.connectEnd - perfData.connectStart),
      ssl: safe(perfData.secureConnectionStart ? perfData.connectEnd - perfData.secureConnectionStart : 0),
      ttfb: safe(perfData.responseStart - perfData.requestStart),
      download: safe(perfData.responseEnd - perfData.responseStart),
      domParsing: safe(perfData.domContentLoadedEventStart - perfData.responseEnd),
      domReady: safe(perfData.domContentLoadedEventEnd - navigationStart),
      windowLoad: safe(perfData.loadEventEnd - navigationStart),
      totalTime: safe(perfData.loadEventEnd - navigationStart),
    };
  };

  const measureWebVitals = (): void => {
    if ("PerformanceObserver" in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const lastEntry = list.getEntries().at(-1) as PerformanceEntry | undefined;
          if (lastEntry && typeof lastEntry.startTime === "number") {
            metrics.webVitals.LCP = Math.round(lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceEntry[]) {
            if ((entry as { name?: string }).name === "first-contentful-paint" && typeof entry.startTime === "number") {
              metrics.webVitals.FCP = Math.round(entry.startTime);
            }
          }
        });
        fcpObserver.observe({ entryTypes: ["paint"] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<{ hadRecentInput?: boolean; value?: number }>) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0;
            }
          }
          metrics.webVitals.CLS = Math.round(clsValue * 1000) / 1000;
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });

        // First Input Delay (FID)
        try {
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as Array<{ processingStart?: number; startTime?: number }>) {
              if (entry.processingStart && entry.startTime) {
                const delay = entry.processingStart - entry.startTime;
                if (Number.isFinite(delay)) {
                  metrics.webVitals.FID = metrics.webVitals.FID ?? Math.round(delay);
                }
              }
            }
          });
          fidObserver.observe({ entryTypes: ["first-input"] });
        } catch {}

        // Interaction to Next Paint (INP)
        try {
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as Array<{ duration?: number; processingStart?: number; startTime?: number }>) {
              const latency =
                (typeof entry.duration === "number" && entry.duration) ||
                (entry.processingStart && entry.startTime ? entry.processingStart - entry.startTime : null);
              if (latency && Number.isFinite(latency)) {
                const rounded = Math.round(latency);
                if (!metrics.webVitals.INP || rounded > metrics.webVitals.INP) {
                  metrics.webVitals.INP = rounded;
                }
              }
            }
          });
          inpObserver.observe({ entryTypes: ["event"] });
        } catch {}
      } catch (error) {
        console.warn("Performance Observer not fully supported:", error);
      }
    }

    const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navTiming) {
      const ttfb = navTiming.responseStart - navTiming.requestStart;
      if (Number.isFinite(ttfb)) {
        metrics.webVitals.TTFB = Math.round(ttfb);
      }
    }
  };

  const measureCustomMetrics = (): void => {
    const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (document.readyState === "complete" && navTiming) {
      const navigationStart =
        (navTiming as unknown as { navigationStart?: number }).navigationStart ?? navTiming.fetchStart;
      const v = navTiming.domContentLoadedEventEnd - navigationStart;
      metrics.customMetrics.domReady = Number.isFinite(v) ? Math.round(v) : null;
    }

    // Memory usage
    const perfWithMemory = performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
    };
    if (perfWithMemory.memory) {
      const mem = perfWithMemory.memory;
      metrics.customMetrics.jsHeapSize = {
        used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
        total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
      };
    }

    const navWithConn = navigator as Navigator & {
      connection?: ConnectionInfo;
    };
    if (navWithConn.connection) {
      metrics.customMetrics.connectionType = navWithConn.connection;
    }
  };

  const runMeasurements = (): Metrics => {
    measureNavigationTiming();
    measureWebVitals();
    measureCustomMetrics();

    console.group("📊 Performance Metrics Report");
    console.log("Navigation Timing:", metrics.navigationTiming);
    console.log("Web Vitals:", metrics.webVitals);
    console.log("Custom Metrics:", metrics.customMetrics);
    console.groupEnd();

    window.dispatchEvent(new CustomEvent("performance-measured", { detail: metrics }));
    return metrics;
  };

  if (document.readyState === "complete") {
    setTimeout(runMeasurements, 100);
  } else {
    window.addEventListener("load", () => setTimeout(runMeasurements, 100), { once: true });
  }

  return metrics;
};

/* =============================================================================
   CRITICAL RESOURCES PRELOADING
============================================================================= */

const checkWebPSupport = (): boolean => {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
};

export const preloadCriticalResources = (customResources: Partial<{
  images: string[];
  fonts: string[];
  styles: string[];
  scripts: string[];
}> = {}): void => {
  const isMobile = window.innerWidth <= 768;
  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const hasWebP = checkWebPSupport();

  const defaultResources = {
    images: [
      isMobile
        ? hasWebP ? "/images/hero-mobile.webp" : "/images/hero-mobile.jpg"
        : hasWebP ? "/images/hero-desktop.webp" : "/images/hero-desktop.jpg",
      "/images/logo.svg",
      ...(isDarkMode ? ["/images/logo-dark.svg"] : []),
      hasWebP ? "/images/critical-icon.webp" : "/images/critical-icon.png",
    ],
    fonts: ["/fonts/inter-400.woff2", "/fonts/inter-600.woff2"],
    styles: ["/css/critical.css", ...(isMobile ? ["/css/mobile.css"] : ["/css/desktop.css"])],
    scripts: ["/js/critical.js"],
  };

  const resources = {
    images: [...defaultResources.images, ...(customResources.images || [])],
    fonts: [...defaultResources.fonts, ...(customResources.fonts || [])],
    styles: [...defaultResources.styles, ...(customResources.styles || [])],
    scripts: [...defaultResources.scripts, ...(customResources.scripts || [])],
  };

  const preloadResource = (href: string, as: string, type: string | null = null, crossorigin: string | null = null) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = href;
    link.as = as;
    if (type) (link as HTMLLinkElement).type = type;
    if (crossorigin) link.crossOrigin = crossorigin;
    document.head.appendChild(link);
  };

  resources.images.forEach((src) => src && preloadResource(src, "image"));
  resources.fonts.forEach((src) => src && preloadResource(src, "font", "font/woff2", "anonymous"));
  resources.styles.forEach((src) => src && preloadResource(src, "style", "text/css"));
  resources.scripts.forEach((src) => src && preloadResource(src, "script", "text/javascript"));

  console.log(`✅ Preloaded ${Object.values(resources).flat().length} critical resources`);
};

/* =============================================================================
   LAZY LOADING UTILITIES
============================================================================= */

export const setupLazyLoading = (): IntersectionObserver | void => {
  if (!("IntersectionObserver" in window)) {
    console.warn("IntersectionObserver not supported, loading all images");
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute("data-srcset");
        }
        img.classList.remove("lazy-loading");
        img.classList.add("lazy-loaded");
        observer.unobserve(img);
      }
    });
  }, { rootMargin: "50px 0px", threshold: 0.01 });

  document.querySelectorAll("img[data-src]").forEach((img) => {
    img.classList.add("lazy-loading");
    imageObserver.observe(img);
  });

  return imageObserver;
};

/* =============================================================================
   ADAPTIVE LOADING BASED ON CONNECTION
============================================================================= */

export const adaptiveLoading = () => {
  const nav = navigator as Navigator & {
    connection?: { effectiveType: string; saveData: boolean; downlink: number; rtt: number };
    hardwareConcurrency?: number;
  };
  if (!nav.connection) return { shouldOptimize: false, reason: "Connection API not supported" };

  const { effectiveType, saveData, downlink, rtt } = nav.connection;
  const isSlowConnection = effectiveType === "slow-2g" || effectiveType === "2g";
  const isLowEndDevice = nav.hardwareConcurrency && nav.hardwareConcurrency <= 2;
  const shouldOptimize = isSlowConnection || saveData || isLowEndDevice;

  if (shouldOptimize) {
    document.documentElement.classList.add("reduce-motion", "optimize-bandwidth");
    document.querySelectorAll("img").forEach((img) => {
      if (img instanceof HTMLImageElement && img.src && !img.src.includes("q=")) {
        img.src += img.src.includes("?") ? "&q=60" : "?q=60";
      }
    });
  }

  return { shouldOptimize, connectionType: effectiveType, saveData, downlink, rtt };
};

/* =============================================================================
   UTILITY FUNCTIONS
============================================================================= */

export const prefetchNextPageResources = (urls: string[]): void => {
  if (!Array.isArray(urls)) return;
  urls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  });
};

export const prioritizeUserInteraction = () => {
  const schedulerAPI = (window as unknown as { scheduler?: { postTask: (cb: () => void, opts?: { priority?: string }) => void } }).scheduler;
  if (schedulerAPI && "postTask" in schedulerAPI) {
    return (callback: () => void, priority: "user-visible" | "background" = "user-visible") => {
      schedulerAPI.postTask(callback, { priority });
    };
  }
  return (callback: () => void) => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback;
    if (ric) ric(callback, { timeout: 2000 });
    else setTimeout(callback, 0);
  };
};

/* =============================================================================
   INITIALIZATION FUNCTION
============================================================================= */

export const initPerformanceOptimizations = (options: Partial<{
  enableSW: boolean;
  enableMetrics: boolean;
  enablePreload: boolean;
  enableLazyLoad: boolean;
  enableAdaptive: boolean;
  customResources: { images?: string[]; fonts?: string[]; styles?: string[]; scripts?: string[] };
}> = {}): void => {
  const defaults = { enableSW: true, enableMetrics: true, enablePreload: true, enableLazyLoad: true, enableAdaptive: true, customResources: {} };
  const config = { ...defaults, ...options };

  if (config.enableSW) registerSW();
  if (config.enableMetrics) measurePerformance();
  if (config.enablePreload) preloadCriticalResources(config.customResources);
  if (config.enableLazyLoad) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupLazyLoading, { once: true });
    } else {
      setupLazyLoading();
    }
  }
  if (config.enableAdaptive) adaptiveLoading();

  console.log("✅ Performance optimizations initialized");
};
