// src/services/analytics.ts

import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

/* -------------------------------- Utilities -------------------------------- */

/**
 * Retire les clés dont la valeur est `undefined` tout en conservant le typage.
 */
const cleanObject = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  const entries = Object.entries(obj) as [keyof T, T[keyof T]][];
  for (const [key, value] of entries) {
    if (value !== undefined) {
      (cleaned as Record<keyof T, unknown>)[key] = value;
    }
  }
  return cleaned;
};

/* ----------------------------- Global typings ------------------------------ */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/* --------------------------------- Types ----------------------------------- */

export interface BaseAnalyticsEvent {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  referrer?: string;
}

export interface LanguageMismatchEvent extends BaseAnalyticsEvent {
  clientLanguages: string[];
  customLanguage?: string;
  providerId: string;
  providerLanguages: string[];
  formData: {
    title: string;
    description: string;
    nationality: string;
    currentCountry: string;
  };
  source: 'booking_request_form' | 'provider_selection' | 'call_setup';
}

export interface UserActionEvent extends BaseAnalyticsEvent {
  action: string;
  category: 'user' | 'provider' | 'call' | 'payment' | 'search' | 'navigation';
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface ConversionEvent extends BaseAnalyticsEvent {
  conversionType: 'booking_started' | 'booking_completed' | 'payment_successful' | 'call_completed';
  providerId?: string;
  providerType?: 'lawyer' | 'expat';
  amount?: number;
  duration?: number;
  funnel_step?: number;
}

export interface ErrorEvent extends BaseAnalyticsEvent {
  errorType: 'javascript_error' | 'api_error' | 'payment_error' | 'call_error';
  errorMessage: string;
  errorStack?: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface PerformanceEvent extends BaseAnalyticsEvent {
  metricType: 'page_load' | 'api_response' | 'user_interaction';
  duration: number;
  endpoint?: string;
  status?: 'success' | 'error' | 'timeout';
}

/* ----------------------------- Service class ------------------------------- */

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private isEnabled = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupErrorTracking();
    this.setupPerformanceTracking();
  }

  /** Génère un ID de session unique */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /** Définit l'utilisateur courant pour les analytics */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /** Active / désactive l'envoi des analytics */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /** Données de base communes à tous les événements */
  private getBaseEventData(): Omit<BaseAnalyticsEvent, 'timestamp'> {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    };
  }

  /* --------------------------- Public log methods -------------------------- */

  /** Incompatibilité linguistique */
  async logLanguageMismatch(
    data: Omit<LanguageMismatchEvent, keyof BaseAnalyticsEvent>
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const eventData: Record<string, unknown> = {
        ...this.getBaseEventData(),
        ...cleanObject(data),
        timestamp: serverTimestamp(),
        eventType: 'language_mismatch',
      };

      await addDoc(collection(db, 'analytics_language_mismatches'), eventData);

      await this.incrementCounter('language_mismatches_total');
      await this.incrementCounter(`language_mismatches_${data.source}`);

      // Optionnel: console debug
      // eslint-disable-next-line no-console
      console.log('📊 Language mismatch logged:', {
        providerId: data.providerId,
        clientLanguages: data.clientLanguages,
        providerLanguages: data.providerLanguages,
        source: data.source,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ Erreur lors du logging de l'incompatibilité linguistique:", error);
    }
  }

  /** Action utilisateur */
  async logUserAction(
    data: Omit<UserActionEvent, keyof BaseAnalyticsEvent>
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const eventData: Record<string, unknown> = {
        ...this.getBaseEventData(),
        ...cleanObject(data),
        timestamp: serverTimestamp(),
        eventType: 'user_action',
      };

      await addDoc(collection(db, 'analytics_user_actions'), eventData);

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', data.action, {
          event_category: data.category,
          event_label: data.label,
          value: data.value,
          custom_map: data.metadata,
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ Erreur lors du logging de l'action utilisateur:", error);
    }
  }

  /** Conversion */
  async logConversion(
    data: Omit<ConversionEvent, keyof BaseAnalyticsEvent>
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const eventData: Record<string, unknown> = {
        ...this.getBaseEventData(),
        ...cleanObject(data),
        timestamp: serverTimestamp(),
        eventType: 'conversion',
      };

      await addDoc(collection(db, 'analytics_conversions'), eventData);

      await this.incrementCounter(`conversions_${data.conversionType}`);
      if (data.providerType) {
        await this.incrementCounter(`conversions_${data.providerType}_${data.conversionType}`);
      }

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          transaction_id: this.sessionId,
          value: data.amount ?? 0,
          currency: 'EUR',
          event_category: 'ecommerce',
          event_label: data.conversionType,
        });
      }

      // eslint-disable-next-line no-console
      console.log('🎯 Conversion logged:', data.conversionType, data.amount);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Erreur lors du logging de conversion:', error);
    }
  }

  /** Erreur */
  async logError(
    data: Omit<ErrorEvent, keyof BaseAnalyticsEvent>
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const eventData: Record<string, unknown> = {
        ...this.getBaseEventData(),
        ...cleanObject(data),
        timestamp: serverTimestamp(),
        eventType: 'error',
      };

      await addDoc(collection(db, 'analytics_errors'), eventData);

      await this.incrementCounter('errors_total');
      await this.incrementCounter(`errors_${data.errorType}`);
      await this.incrementCounter(`errors_severity_${data.severity}`);

      if (data.severity === 'critical' || data.severity === 'high') {
        // eslint-disable-next-line no-console
        console.error('🚨 Critical error logged:', data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ Erreur lors du logging d'erreur:", error);
    }
  }

  /** Performance */
  async logPerformance(
    data: Omit<PerformanceEvent, keyof BaseAnalyticsEvent>
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const eventData: Record<string, unknown> = {
        ...this.getBaseEventData(),
        ...cleanObject(data),
        timestamp: serverTimestamp(),
        eventType: 'performance',
      };

      await addDoc(collection(db, 'analytics_performance'), eventData);

      if (data.duration > 5000) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Performance issue detected:', data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Erreur lors du logging de performance:', error);
    }
  }

  /* ------------------------------ Internals -------------------------------- */

  /** Incrémente un compteur dans Firestore */
  private async incrementCounter(counterName: string, value = 1): Promise<void> {
    try {
      const counterRef = doc(db, 'analytics_counters', counterName);
      await updateDoc(counterRef, {
        count: increment(value),
        lastUpdated: serverTimestamp(),
      }).catch(async () => {
        // Si le document n'existe pas, créer une ligne dans la collection
        await addDoc(
          collection(db, 'analytics_counters'),
          cleanObject({
            name: counterName,
            count: value,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          })
        );
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ Erreur lors de l'incrémentation du compteur:", error);
    }
  }

  /** Tracking automatique des erreurs JS */
  private setupErrorTracking(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event: globalThis.ErrorEvent) => {
      this.logError({
        errorType: 'javascript_error',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        component: event.filename,
        severity: 'high',
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = (event as PromiseRejectionEvent).reason as unknown;
      const message =
        typeof reason === 'object' && reason !== null && 'message' in reason
          ? String((reason as { message?: unknown }).message)
          : String(reason);

      const stack =
        typeof reason === 'object' && reason !== null && 'stack' in reason
          ? String((reason as { stack?: unknown }).stack)
          : undefined;

      this.logError({
        errorType: 'javascript_error',
        errorMessage: message || 'Unhandled promise rejection',
        errorStack: stack,
        severity: 'medium',
      });
    });
  }

  /** Tracking automatique des perfs */
  private setupPerformanceTracking(): void {
    if (typeof window === 'undefined') return;

    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navigation) {
            this.logPerformance({
              metricType: 'page_load',
              duration: navigation.loadEventEnd - navigation.fetchStart,
              status: 'success',
            });
          }
        }, 1000);
      });
    }
  }

  /* -------------------------- Convenience trackers -------------------------- */

  async trackProviderSearch(
    filters: {
      country?: string;
      language?: string;
      providerType?: 'lawyer' | 'expat';
      specialty?: string;
    },
    resultsCount: number
  ): Promise<void> {
    await this.logUserAction({
      action: 'provider_search',
      category: 'search',
      label: `${filters.providerType || 'all'}_${filters.country || 'all'}`,
      value: resultsCount,
      metadata: cleanObject({
        filters: cleanObject(filters),
        resultsCount,
      }),
    });
  }

  async trackProviderSelected(providerId: string, providerType: 'lawyer' | 'expat'): Promise<void> {
    await this.logUserAction({
      action: 'provider_selected',
      category: 'provider',
      label: providerType,
      metadata: {
        providerId,
        providerType,
      },
    });
  }

  async trackBookingStarted(providerId: string, providerType: 'lawyer' | 'expat'): Promise<void> {
    await this.logConversion({
      conversionType: 'booking_started',
      providerId,
      providerType,
      funnel_step: 1,
    });
  }

  async trackBookingCompleted(providerId: string, providerType: 'lawyer' | 'expat', amount: number): Promise<void> {
    await this.logConversion({
      conversionType: 'booking_completed',
      providerId,
      providerType,
      amount,
      funnel_step: 2,
    });
  }

  async trackPaymentSuccessful(amount: number, providerId: string, providerType: 'lawyer' | 'expat'): Promise<void> {
    await this.logConversion({
      conversionType: 'payment_successful',
      providerId,
      providerType,
      amount,
      funnel_step: 3,
    });
  }

  async trackCallCompleted(
    duration: number,
    providerId: string,
    providerType: 'lawyer' | 'expat',
    amount: number
  ): Promise<void> {
    await this.logConversion({
      conversionType: 'call_completed',
      providerId,
      providerType,
      amount,
      duration,
      funnel_step: 4,
    });
  }

  async trackPaymentError(errorMessage: string, amount?: number): Promise<void> {
    await this.logError({
      errorType: 'payment_error',
      errorMessage,
      severity: 'high',
      metadata: cleanObject({ amount }),
    });
  }

  async trackCallError(errorMessage: string, providerId: string): Promise<void> {
    await this.logError({
      errorType: 'call_error',
      errorMessage,
      severity: 'high',
      metadata: { providerId },
    });
  }
}

/* ------------------------------- Exports ----------------------------------- */

export const analyticsService = new AnalyticsService();

export const logLanguageMismatch = (data: Omit<LanguageMismatchEvent, keyof BaseAnalyticsEvent>) =>
  analyticsService.logLanguageMismatch(data);

export const logUserAction = (data: Omit<UserActionEvent, keyof BaseAnalyticsEvent>) =>
  analyticsService.logUserAction(data);

export const logConversion = (data: Omit<ConversionEvent, keyof BaseAnalyticsEvent>) =>
  analyticsService.logConversion(data);

export const logError = (data: Omit<ErrorEvent, keyof BaseAnalyticsEvent>) =>
  analyticsService.logError(data);

export const logPerformance = (data: Omit<PerformanceEvent, keyof BaseAnalyticsEvent>) =>
  analyticsService.logPerformance(data);

/** A appeler au démarrage de l'app */
export const configureAnalytics = (userId?: string, enabled = true): void => {
  if (userId) analyticsService.setUser(userId);
  analyticsService.setEnabled(enabled);
};

export default analyticsService;
