import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Types pour les logs
interface CallLog extends Record<string, unknown> {
  callId: string;
  clientId: string;
  providerId: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  status: 'success' | 'failed' | 'no_answer' | 'cancelled';
  errorMessage?: string;
}

interface ErrorLog extends Record<string, unknown> {
  origin: 'cloudFunction' | 'frontend' | 'twilio' | 'stripe';
  userId?: string;
  error: string;
  context?: Record<string, unknown>;
}

// Types pour les éléments HTML
interface HTMLElementWithSrc extends HTMLElement {
  src?: string;
  href?: string;
  tagName: string;
}

// Type pour window avec propriétés étendues
interface ExtendedWindow extends Window {
  _errorLoggingInitialized?: boolean;
}

// Types pour les données Firestore
type FirestoreData = Record<string, unknown>;

// Service de logging centralisé
class LoggingService {
  private static instance: LoggingService;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 seconde
  private readonly MAX_STRING_LENGTH = 1000;
  private readonly MAX_ARRAY_LENGTH = 50;
  private readonly MAX_OBJECT_PROPS = 20;

  private constructor() {}

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Sanitise les données pour éviter les injections et limiter la taille
   */
  private sanitizeData<T extends Record<string, unknown>>(data: T): FirestoreData {
    const sanitizeValue = (value: unknown): unknown => {
      if (value === null || value === undefined) {
        return value;
      }

      if (typeof value === 'string') {
        return value.length > this.MAX_STRING_LENGTH ? 
          `${value.substring(0, this.MAX_STRING_LENGTH)}...[truncated]` : value;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }

      if (value instanceof Date) {
        return value;
      }

      if (Array.isArray(value)) {
        return value
          .slice(0, this.MAX_ARRAY_LENGTH)
          .map(item => sanitizeValue(item));
      }

      if (typeof value === 'object') {
        const result: Record<string, unknown> = {};
        const entries = Object.entries(value as Record<string, unknown>);
        
        entries.slice(0, this.MAX_OBJECT_PROPS).forEach(([key, val]) => {
          result[key] = sanitizeValue(val);
        });
        
        return result;
      }

      // Fallback pour les types non supportés
      return String(value);
    };

    try {
      const serialized = JSON.parse(JSON.stringify(data));
      return sanitizeValue(serialized) as FirestoreData;
    } catch {
      return { error: String(data) };
    }
  }

  /**
   * Retry avec backoff exponentiel
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.MAX_RETRY_ATTEMPTS) {
        console.error(`Operation failed after ${this.MAX_RETRY_ATTEMPTS} attempts:`, error);
        return null;
      }

      const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(operation, attempt + 1);
    }
  }

  /**
   * Créer un log d'appel avec retry et validation
   */
  public async createCallLog(logData: CallLog): Promise<string | null> {
    // Validation des données obligatoires
    if (!logData.callId || !logData.clientId || !logData.providerId) {
      console.error('Invalid call log data: missing required fields');
      return null;
    }

    const sanitizedData = this.sanitizeData(logData as Record<string, unknown>);

    return this.retryWithBackoff(async () => {
      const callLogsRef = collection(db, 'call_logs');
      const docRef = await addDoc(callLogsRef, {
        ...sanitizedData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    });
  }

  /**
   * Créer un log d'erreur avec retry et validation
   */
  public async logError(logData: ErrorLog): Promise<string | null> {
    // Validation des données obligatoires
    if (!logData.error || !logData.origin) {
      console.error('Invalid error log data: missing required fields');
      return null;
    }

    const sanitizedData = this.sanitizeData(logData as Record<string, unknown>);

    return this.retryWithBackoff(async () => {
      const errorLogsRef = collection(db, 'error_logs');
      const docRef = await addDoc(errorLogsRef, {
        ...sanitizedData,
        timestamp: serverTimestamp(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      });
      return docRef.id;
    });
  }

  /**
   * Configuration du logging global des erreurs (production uniquement)
   */
  public setupGlobalErrorLogging(): void {
    // Vérification environnement et disponibilité window
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return;
    }

    const extendedWindow = window as ExtendedWindow;

    // Éviter la double initialisation
    if (extendedWindow._errorLoggingInitialized) {
      return;
    }
    extendedWindow._errorLoggingInitialized = true;

    // Erreurs JavaScript non gérées
    window.addEventListener('error', (event: ErrorEvent) => {
      this.logError({
        origin: 'frontend',
        error: `Unhandled error: ${event.message}`,
        context: {
          filename: event.filename || 'unknown',
          lineno: event.lineno || 0,
          colno: event.colno || 0,
          stack: event.error?.stack || 'No stack trace',
          timestamp: new Date().toISOString()
        }
      }).catch(err => console.error('Failed to log unhandled error:', err));
    }, { passive: true });

    // Promesses rejetées non gérées
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? 
        event.reason.message : 
        String(event.reason);

      this.logError({
        origin: 'frontend',
        error: `Unhandled promise rejection: ${error}`,
        context: {
          stack: event.reason instanceof Error ? event.reason.stack : 'No stack trace',
          timestamp: new Date().toISOString()
        }
      }).catch(err => console.error('Failed to log unhandled rejection:', err));
    }, { passive: true });

    // Erreurs de ressources (images, scripts, etc.)
    window.addEventListener('error', (event: Event) => {
      const target = event.target as HTMLElementWithSrc | null;
      
      if (target && target !== (window as unknown)) {
        this.logError({
          origin: 'frontend',
          error: `Resource loading error: ${target.src || target.href || 'unknown resource'}`,
          context: {
            tagName: target.tagName || 'unknown',
            type: event.type,
            timestamp: new Date().toISOString()
          }
        }).catch(err => console.error('Failed to log resource error:', err));
      }
    }, true);
  }
}

// Export du singleton
export const loggingService = LoggingService.getInstance();

// Export des fonctions principales pour compatibilité
export const createCallLog = (logData: CallLog): Promise<string | null> => 
  loggingService.createCallLog(logData);

export const logError = (logData: ErrorLog): Promise<string | null> => 
  loggingService.logError(logData);

export const setupGlobalErrorLogging = (): void => 
  loggingService.setupGlobalErrorLogging();

// Export des types
export type { CallLog, ErrorLog };