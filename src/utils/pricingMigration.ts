// src/utils/pricingMigration.ts
// Script de migration pour nettoyer le système de pricing

import { doc, getDoc, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

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

export interface ServiceConfig {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  details: string[];
  errors: string[];
}

/**
 * 🚀 MIGRATION PRINCIPALE: Nettoie et consolide le système de pricing
 */
export async function migratePricingSystem(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    details: [],
    errors: []
  };

  try {
    console.log('🔧 Démarrage de la migration du système de pricing...');
    
    // 1. Vérifier l'existence de admin_config/pricing
    const pricingRef = doc(db, 'admin_config', 'pricing');
    const pricingSnap = await getDoc(pricingRef);
    
    if (!pricingSnap.exists()) {
      // Créer la configuration par défaut
      await createDefaultPricingConfig();
      result.details.push('✅ Configuration pricing par défaut créée dans admin_config/pricing');
    } else {
      // Valider la configuration existante
      const isValid = await validatePricingConfig(pricingSnap.data());
      if (!isValid) {
        await createDefaultPricingConfig();
        result.details.push('🔄 Configuration pricing invalide - remplacée par la configuration par défaut');
      } else {
        result.details.push('✅ Configuration pricing existante validée');
      }
    }

    // 2. Nettoyer admin_settings/main.sosCommission
    const settingsRef = doc(db, 'admin_settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const settingsData = settingsSnap.data();
      if (settingsData?.sosCommission) {
        // Sauvegarder l'ancienne config pour référence
        result.details.push(`📋 Ancienne config commission détectée: ${JSON.stringify(settingsData.sosCommission)}`);
        
        // Supprimer le champ sosCommission
        await updateDoc(settingsRef, {
          sosCommission: deleteField(),
          updatedAt: serverTimestamp(),
          migrationNote: 'sosCommission moved to admin_config/pricing'
        });
        result.details.push('🗑️ Ancien champ sosCommission supprimé de admin_settings');
      } else {
        result.details.push('✅ Aucune ancienne configuration commission trouvée');
      }
    }

    // 3. Vérifier la cohérence des calculs
    await validatePricingCalculations();
    result.details.push('✅ Calculs de pricing validés');

    // 4. Nettoyer le cache
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('pricingCache');
      result.details.push('🧹 Cache pricing nettoyé');
    }

    result.success = true;
    result.message = '🎉 Migration du système de pricing terminée avec succès !';
    console.log('✅ Migration terminée:', result);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    result.errors.push(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    result.message = '❌ Échec de la migration du système de pricing';
  }

  return result;
}

/**
 * Crée la configuration pricing par défaut
 */
async function createDefaultPricingConfig(): Promise<void> {
  const defaultConfig: PricingConfig = {
    lawyer: {
      eur: {
        totalAmount: 49,
        connectionFeeAmount: 19,
        providerAmount: 30,
        duration: 25,
        currency: 'eur'
      },
      usd: {
        totalAmount: 55,
        connectionFeeAmount: 25,
        providerAmount: 30,
        duration: 25,
        currency: 'usd'
      }
    },
    expat: {
      eur: {
        totalAmount: 19,
        connectionFeeAmount: 9,
        providerAmount: 10,
        duration: 35,
        currency: 'eur'
      },
      usd: {
        totalAmount: 25,
        connectionFeeAmount: 15,
        providerAmount: 10,
        duration: 35,
        currency: 'usd'
      }
    }
  };

  const pricingRef = doc(db, 'admin_config', 'pricing');
  await setDoc(pricingRef, {
    ...defaultConfig,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: '1.0.0',
    description: 'Configuration des prix et commissions de la plateforme'
  });
}

/**
 * Valide la configuration pricing
 */
async function validatePricingConfig(config: any): Promise<boolean> {
  try {
    if (!config?.lawyer?.eur || !config?.lawyer?.usd || !config?.expat?.eur || !config?.expat?.usd) {
      return false;
    }

    const services = [config.lawyer.eur, config.lawyer.usd, config.expat.eur, config.expat.usd];
    
    for (const service of services) {
      if (typeof service.totalAmount !== 'number' ||
          typeof service.connectionFeeAmount !== 'number' ||
          typeof service.providerAmount !== 'number' ||
          typeof service.duration !== 'number' ||
          typeof service.currency !== 'string') {
        return false;
      }

      // Vérifier la cohérence des calculs
      const calculatedProvider = service.totalAmount - service.connectionFeeAmount;
      if (Math.abs(calculatedProvider - service.providerAmount) > 0.01) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Valide les calculs de pricing
 */
async function validatePricingCalculations(): Promise<void> {
  const pricingRef = doc(db, 'admin_config', 'pricing');
  const pricingSnap = await getDoc(pricingRef);
  
  if (!pricingSnap.exists()) {
    throw new Error('Configuration pricing non trouvée');
  }

  const config = pricingSnap.data() as PricingConfig;
  const services = [
    { name: 'lawyer_eur', config: config.lawyer.eur },
    { name: 'lawyer_usd', config: config.lawyer.usd },
    { name: 'expat_eur', config: config.expat.eur },
    { name: 'expat_usd', config: config.expat.usd }
  ];

  for (const service of services) {
    const expected = service.config.totalAmount - service.config.connectionFeeAmount;
    const actual = service.config.providerAmount;
    
    if (Math.abs(expected - actual) > 0.01) {
      throw new Error(`Calcul incohérent pour ${service.name}: attendu ${expected}, trouvé ${actual}`);
    }
  }
}

/**
 * 🧹 Fonction de nettoyage rapide (peut être appelée depuis l'admin)
 */
export async function quickCleanupPricing(): Promise<boolean> {
  try {
    // Supprimer les caches
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pricingCache');
      sessionStorage.removeItem('selectedCurrency');
      localStorage.removeItem('pricingConfig');
    }

    // Vérifier admin_config/pricing
    const pricingRef = doc(db, 'admin_config', 'pricing');
    const pricingSnap = await getDoc(pricingRef);
    
    if (!pricingSnap.exists()) {
      await createDefaultPricingConfig();
    }

    return true;
  } catch (error) {
    console.error('Erreur lors du nettoyage rapide:', error);
    return false;
  }
}

/**
 * 📊 Fonction de diagnostic du système de pricing
 */
export async function diagnosePricingSystem(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Vérifier admin_config/pricing
    const pricingRef = doc(db, 'admin_config', 'pricing');
    const pricingSnap = await getDoc(pricingRef);
    
    if (!pricingSnap.exists()) {
      issues.push('❌ admin_config/pricing n\'existe pas');
      recommendations.push('Créer la configuration pricing par défaut');
    } else {
      const config = pricingSnap.data();
      const isValid = await validatePricingConfig(config);
      if (!isValid) {
        issues.push('❌ Configuration pricing invalide');
        recommendations.push('Corriger ou recréer la configuration pricing');
      }
    }

    // Vérifier admin_settings/main
    const settingsRef = doc(db, 'admin_settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      const settingsData = settingsSnap.data();
      if (settingsData?.sosCommission) {
        issues.push('⚠️ Ancienne configuration sosCommission détectée dans admin_settings');
        recommendations.push('Exécuter la migration pour nettoyer les anciennes configurations');
      }
    }

    // Déterminer le statut global
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (issues.some(issue => issue.includes('❌'))) {
      status = 'error';
    } else if (issues.some(issue => issue.includes('⚠️'))) {
      status = 'warning';
    }

    return { status, issues, recommendations };

  } catch (error) {
    return {
      status: 'error',
      issues: [`❌ Erreur lors du diagnostic: ${error instanceof Error ? error.message : String(error)}`],
      recommendations: ['Vérifier les permissions Firestore et la connectivité']
    };
  }
}

// Export pour utilisation dans l'admin
export const pricingMigrationUtils = {
  migrate: migratePricingSystem,
  quickCleanup: quickCleanupPricing,
  diagnose: diagnosePricingSystem,
  createDefault: createDefaultPricingConfig
};