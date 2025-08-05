// src/services/analytics.ts

import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

// Interfaces pour les différents types d'événements analytiques
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
  metadata?: Record<string, any>;
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
}

export interface PerformanceEvent extends BaseAnalyticsEvent {
  metricType: 'page_load' | 'api_response' | 'user_interaction';
  duration: number;
  endpoint?: string;
  status?: 'success' | 'error' | 'timeout';
}

// Service principal d'analytics
class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupErrorTracking();
    this.setupPerformanceTracking();
  }

  /**
   * Génère un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Définit l'utilisateur actuel pour les analytics
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Active ou désactive les analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Données de base pour tous les événements
   */
  private getBaseEventData(): BaseAnalyticsEvent {
    return {
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer || undefined
    };
  }

  /**
   * Enregistre un événement d'incompatibilité linguistique
   */
  async logLanguageMismatch(data: Omit<LanguageMismatchEvent, keyof BaseAnalyticsEvent>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: LanguageMismatchEvent = {
        ...this.getBaseEventData(),
        ...data
      };

      // Enregistrer dans Firestore
      await addDoc(collection(db, 'analytics_language_mismatches'), {
        ...event,
        timestamp: serverTimestamp(),
        eventType: 'language_mismatch'
      });

      // Incrémenter les compteurs pour les métriques rapides
      await this.incrementCounter('language_mismatches_total');
      await this.incrementCounter(`language_mismatches_${data.source}`);

      console.log('📊 Language mismatch logged:', {
        providerId: data.providerId,
        clientLanguages: data.clientLanguages,
        providerLanguages: data.providerLanguages,
        source: data.source
      });

    } catch (error) {
      console.error('❌ Erreur lors du logging de l\'incompatibilité linguistique:', error);
      // Ne pas faire échouer l'application pour un problème d'analytics
    }
  }

  /**
   * Enregistre une action utilisateur
   */
  async logUserAction(data: Omit<UserActionEvent, keyof BaseAnalyticsEvent>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: UserActionEvent = {
        ...this.getBaseEventData(),
        ...data
      };

      await addDoc(collection(db, 'analytics_user_actions'), {
        ...event,
        timestamp: serverTimestamp(),
        eventType: 'user_action'
      });

      // Google Analytics 4 style tracking (si disponible)
      if (typeof gtag !== 'undefined') {
        gtag('event', data.action, {
          event_category: data.category,
          event_label: data.label,
          value: data.value,
          custom_map: data.metadata
        });
      }

    } catch (error) {
      console.error('❌ Erreur lors du logging de l\'action utilisateur:', error);
    }
  }

  /**
   * Enregistre un événement de conversion
   */
  async logConversion(data: Omit<ConversionEvent, keyof BaseAnalyticsEvent>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: ConversionEvent = {
        ...this.getBaseEventData(),
        ...data
      };

      await addDoc(collection(db, 'analytics_conversions'), {
        ...event,
        timestamp: serverTimestamp(),
        eventType: 'conversion'
      });

      // Incrémenter les compteurs de conversion
      await this.incrementCounter(`conversions_${data.conversionType}`);
      if (data.providerType) {
        await this.incrementCounter(`conversions_${data.conviderType}_${data.providerType}`);
      }

      // Google Analytics conversion tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'conversion', {
          transaction_id: this.sessionId,
          value: data.amount || 0,
          currency: 'EUR',
          event_category: 'ecommerce',
          event_label: data.conversionType
        });
      }

      console.log('🎯 Conversion logged:', data.conversionType, data.amount);

    } catch (error) {
      console.error('❌ Erreur lors du logging de conversion:', error);
    }
  }

  /**
   * Enregistre une erreur
   */
  async logError(data: Omit<ErrorEvent, keyof BaseAnalyticsEvent>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: ErrorEvent = {
        ...this.getBaseEventData(),
        ...data
      };

      await addDoc(collection(db, 'analytics_errors'), {
        ...event,
        timestamp: serverTimestamp(),
        eventType: 'error'
      });

      // Incrémenter les compteurs d'erreurs
      await this.incrementCounter('errors_total');
      await this.incrementCounter(`errors_${data.errorType}`);
      await this.incrementCounter(`errors_severity_${data.severity}`);

      // Log critique en console pour le debugging
      if (data.severity === 'critical' || data.severity === 'high') {
        console.error('🚨 Critical error logged:', data);
      }

    } catch (error) {
      console.error('❌ Erreur lors du logging d\'erreur:', error);
    }
  }

  /**
   * Enregistre une métrique de performance
   */
  async logPerformance(data: Omit<PerformanceEvent, keyof BaseAnalyticsEvent>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const event: PerformanceEvent = {
        ...this.getBaseEventData(),
        ...data
      };

      await addDoc(collection(db, 'analytics_performance'), {
        ...event,
        timestamp: serverTimestamp(),
        eventType: 'performance'
      });

      // Alertes pour les performances dégradées
      if (data.duration > 5000) { // Plus de 5 secondes
        console.warn('⚠️ Performance issue detected:', data);
      }

    } catch (error) {
      console.error('❌ Erreur lors du logging de performance:', error);
    }
  }

  /**
   * Incrémente un compteur dans Firestore
   */
  private async incrementCounter(counterName: string, value: number = 1): Promise<void> {
    try {
      const counterRef = doc(db, 'analytics_counters', counterName);
      await updateDoc(counterRef, {
        count: increment(value),
        lastUpdated: serverTimestamp()
      }).catch(async () => {
        // Si le document n'existe pas, le créer
        await addDoc(collection(db, 'analytics_counters'), {
          name: counterName,
          count: value,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'incrémentation du compteur:', error);
    }
  }

  /**
   * Configure le tracking automatique des erreurs JavaScript
   */
  private setupErrorTracking(): void {
    // Erreurs non catchées
    window.addEventListener('error', (event) => {
      this.logError({
        errorType: 'javascript_error',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        component: event.filename,
        severity: 'high'
      });
    });

    // Promesses rejetées non catchées
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        errorType: 'javascript_error',
        errorMessage: event.reason?.message || String(event.reason),
        errorStack: event.reason?.stack,
        severity: 'medium'
      });
    });
  }

  /**
   * Configure le tracking automatique des performances
   */
  private setupPerformanceTracking(): void {
    // Navigation Timing API
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.logPerformance({
              metricType: 'page_load',
              duration: navigation.loadEventEnd - navigation.navigationStart,
              status: 'success'
            });
          }
        }, 1000);
      });
    }
  }

  /**
   * Track une recherche de prestataires
   */
  async trackProviderSearch(filters: {
    country?: string;
    language?: string;
    providerType?: 'lawyer' | 'expat';
    specialty?: string;
  }, resultsCount: number): Promise<void> {
    await this.logUserAction({
      action: 'provider_search',
      category: 'search',
      label: `${filters.providerType || 'all'}_${filters.country || 'all'}`,
      value: resultsCount,
      metadata: {
        filters,
        resultsCount
      }
    });
  }

  /**
   * Track la sélection d'un prestataire
   */
  async trackProviderSelected(providerId: string, providerType: 'lawyer' | 'expat'): Promise<void> {
    await this.logUserAction({
      action: 'provider_selected',
      category: 'provider',
      label: providerType,
      metadata: {
        providerId,
        providerType
      }
    });
  }

  /**
   * Track le début d'une demande de réservation
   */
  async trackBookingStarted(providerId: string, providerType: 'lawyer' | 'expat'): Promise<void> {
    await this.logConversion({
      conversionType: 'booking_started',
      providerId,
      providerType,
      funnel_step: 1
    });
  }

  /**
   * Track la completion d'une demande de réservation
   */
  async trackBookingCompleted(providerId: string, providerType: 'lawyer' | 'expat', amount: number): Promise<void> {
    await this.logConversion({
      conversionType: 'booking_completed',
      providerId,
      providerType,
      amount,
      funnel_step: 2
    });
  }

  /**
   * Track un paiement réussi
   */
  async trackPaymentSuccessful(amount: number, providerId: string, providerType: 'lawyer' | 'expat'): Promise<void> {
    await this.logConversion({
      conversionType: 'payment_successful',
      providerId,
      providerType,
      amount,
      funnel_step: 3
    });
  }

  /**
   * Track un appel complété
   */
  async trackCallCompleted(duration: number, providerId: string, providerType: 'lawyer' | 'expat', amount: number): Promise<void> {
    await this.logConversion({
      conversionType: 'call_completed',
      providerId,
      providerType,
      amount,
      duration,
      funnel_step: 4
    });
  }

  /**
   * Track une erreur de paiement
   */
  async trackPaymentError(errorMessage: string, amount: number): Promise<void> {
    await this.logError({
      errorType: 'payment_error',
      errorMessage,
      severity: 'high',
      metadata: { amount }
    });
  }

  /**
   * Track une erreur d'appel
   */
  async trackCallError(errorMessage: string, providerId: string): Promise<void> {
    await this.logError({
      errorType: 'call_error',
      errorMessage,
      severity: 'high',
      metadata: { providerId }
    });
  }
}

// Instance singleton du service d'analytics
export const analyticsService = new AnalyticsService();

// Fonctions d'aide pour l'utilisation dans les composants
export const logLanguageMismatch = (data: Omit<LanguageMismatchEvent, keyof BaseAnalyticsEvent>) => {
  return analyticsService.logLanguageMismatch(data);
};

export const logUserAction = (data: Omit<UserActionEvent, keyof BaseAnalyticsEvent>) => {
  return analyticsService.logUserAction(data);
};

export const logConversion = (data: Omit<ConversionEvent, keyof BaseAnalyticsEvent>) => {
  return analyticsService.logConversion(data);
};

export const logError = (data: Omit<ErrorEvent, keyof BaseAnalyticsEvent>) => {
  return analyticsService.logError(data);
};

export const logPerformance = (data: Omit<PerformanceEvent, keyof BaseAnalyticsEvent>) => {
  return analyticsService.logPerformance(data);
};

// Configuration du service (à appeler au démarrage de l'app)
export const configureAnalytics = (userId?: string, enabled: boolean = true) => {
  if (userId) {
    analyticsService.setUser(userId);
  }
  analyticsService.setEnabled(enabled);
};

// Export de l'instance pour les cas d'usage avancés
export default analyticsService;