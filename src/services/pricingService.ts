// src/services/pricingService.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ServiceConfig {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}

export interface PricingConfig {
  lawyer: {
    eur: ServiceConfig;
    usd: ServiceConfig;
  };
  expat: {
    eur: ServiceConfig;
    usd: ServiceConfig;
  };
}

// Configuration par défaut (fallback)
const DEFAULT_PRICING_CONFIG: PricingConfig = {
  lawyer: {
    eur: { totalAmount: 49, connectionFeeAmount: 19, providerAmount: 30, duration: 25, currency: 'eur' },
    usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 30, duration: 25, currency: 'usd' }
  },
  expat: {
    eur: { totalAmount: 19, connectionFeeAmount: 9, providerAmount: 10, duration: 35, currency: 'eur' },
    usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 10, duration: 35, currency: 'usd' }
  }
};

/**
 * Récupère la configuration des prix depuis Firebase Admin
 */
export const getPricingConfig = async (): Promise<PricingConfig> => {
  try {
    const configDoc = await getDoc(doc(db, 'admin_config', 'pricing'));
    
    if (configDoc.exists()) {
      const data = configDoc.data() as PricingConfig;
      
      // Validation des données
      if (isValidPricingConfig(data)) {
        return data;
      } else {
        console.warn('Configuration pricing invalide, utilisation du fallback');
        return DEFAULT_PRICING_CONFIG;
      }
    } else {
      console.warn('Configuration pricing non trouvée, utilisation du fallback');
      return DEFAULT_PRICING_CONFIG;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration pricing:', error);
    return DEFAULT_PRICING_CONFIG;
  }
};

/**
 * Récupère la configuration pour un service spécifique
 */
export const getServicePricing = async (
  serviceType: 'lawyer' | 'expat',
  currency: 'eur' | 'usd' = 'eur'
): Promise<ServiceConfig> => {
  const config = await getPricingConfig();
  return config[serviceType][currency];
};

/**
 * 🔥 DÉTECTION AUTOMATIQUE DE LA DEVISE selon la localisation
 */
export const detectUserCurrency = (): 'eur' | 'usd' => {
  try {
    // 1. Préférence utilisateur stockée
    const savedCurrency = localStorage.getItem('preferredCurrency') as 'eur' | 'usd' | null;
    if (savedCurrency && ['eur', 'usd'].includes(savedCurrency)) {
      return savedCurrency;
    }

    // 2. Détection via timezone/locale du navigateur
    const userLocale = navigator.language || 'fr-FR';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Zones USD prioritaires
    const usdZones = [
      'America/', 'US/', 'Pacific/Honolulu', 'Pacific/Midway',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'
    ];
    
    const usdLocales = ['en-US', 'en-CA'];
    
    if (usdZones.some(zone => timezone.startsWith(zone)) || usdLocales.includes(userLocale)) {
      return 'usd';
    }

    // 3. Fallback EUR pour l'Europe et le reste
    return 'eur';
  } catch {
    return 'eur'; // Fallback sécurisé
  }
};

/**
 * Calcule les montants basés sur la configuration admin + devise auto
 */
export const calculateServiceAmounts = async (
  serviceType: 'lawyer' | 'expat',
  currency?: 'eur' | 'usd'
): Promise<{
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}> => {
  const finalCurrency = currency || detectUserCurrency();
  const config = await getServicePricing(serviceType, finalCurrency);
  
  return {
    totalAmount: config.totalAmount,
    connectionFeeAmount: config.connectionFeeAmount,
    providerAmount: config.providerAmount,
    duration: config.duration,
    currency: config.currency
  };
};

/**
 * Validation de la structure de configuration
 */
const isValidPricingConfig = (config: any): config is PricingConfig => {
  try {
    return (
      config &&
      typeof config === 'object' &&
      config.lawyer &&
      config.expat &&
      isValidServiceConfig(config.lawyer.eur) &&
      isValidServiceConfig(config.lawyer.usd) &&
      isValidServiceConfig(config.expat.eur) &&
      isValidServiceConfig(config.expat.usd)
    );
  } catch {
    return false;
  }
};

const isValidServiceConfig = (config: any): config is ServiceConfig => {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.totalAmount === 'number' &&
    typeof config.connectionFeeAmount === 'number' &&
    typeof config.providerAmount === 'number' &&
    typeof config.duration === 'number' &&
    typeof config.currency === 'string' &&
    config.totalAmount > 0 &&
    config.connectionFeeAmount >= 0 &&
    config.providerAmount >= 0 &&
    config.duration > 0
  );
};

/**
 * Hook React pour utiliser la configuration pricing
 */
import { useState, useEffect } from 'react';

export const usePricingConfig = () => {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const pricingConfig = await getPricingConfig();
        setConfig(pricingConfig);
      } catch (err) {
        console.error('Erreur chargement pricing config:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setConfig(DEFAULT_PRICING_CONFIG); // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const refreshConfig = async () => {
    await loadConfig();
  };

  return { config, loading, error, refreshConfig };
};

/**
 * Cache simple pour éviter les appels répétés
 */
class PricingCache {
  private cache: PricingConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async get(): Promise<PricingConfig> {
    const now = Date.now();
    
    if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache;
    }

    this.cache = await getPricingConfig();
    this.lastFetch = now;
    return this.cache;
  }

  clear(): void {
    this.cache = null;
    this.lastFetch = 0;
  }
}

export const pricingCache = new PricingCache();