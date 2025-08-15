// functions/src/services/pricingService.ts
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialiser Firebase Admin si pas déjà fait
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

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
    const configDoc = await db.collection('admin_config').doc('pricing').get();
    
    if (configDoc.exists) {
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
 * Note: Cette fonction est principalement pour le frontend, 
 * dans les Functions elle retournera toujours 'eur' par défaut
 */
export const detectUserCurrency = (): 'eur' | 'usd' => {
  try {
    // Dans l'environnement Functions, on ne peut pas accéder au localStorage ou navigator
    // On retourne EUR par défaut
    return 'eur';
  } catch {
    return 'eur'; // Fallback sécurisé
  }
};

/**
 * Calcule les montants basés sur la configuration admin + devise
 */
export const calculateServiceAmounts = async (
  serviceType: 'lawyer' | 'expat',
  currency: 'eur' | 'usd' = 'eur'
): Promise<{
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}> => {
  const config = await getServicePricing(serviceType, currency);
  
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