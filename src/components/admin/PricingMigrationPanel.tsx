// src/components/admin/PricingMigrationPanel.tsx
// Interface admin pour gérer la migration du système de pricing

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Trash2, 
  Play,
  FileText,
  Shield
} from 'lucide-react';
import Button from '../common/Button';
import { 
  migratePricingSystem, 
  quickCleanupPricing, 
  diagnosePricingSystem,
  MigrationResult 
} from '../../utils/pricingMigration';

interface DiagnosticResult {
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  recommendations: string[];
}

export const PricingMigrationPanel: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  // Exécuter le diagnostic au chargement
  useEffect(() => {
    handleDiagnostic();
  }, []);

  const handleDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const result = await diagnosePricingSystem();
      setDiagnostic(result);
    } catch (error) {
      console.error('Erreur diagnostic:', error);
      setDiagnostic({
        status: 'error',
        issues: ['❌ Impossible d\'exécuter le diagnostic'],
        recommendations: ['Vérifiez la connectivité et les permissions']
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const handleMigration = async () => {
    if (!confirm('⚠️ Voulez-vous vraiment exécuter la migration du système de pricing ? Cette action va modifier la configuration.')) {
      return;
    }

    setIsRunningMigration(true);
    try {
      const result = await migratePricingSystem();
      setMigrationResult(result);
      
      // Reexécuter le diagnostic après migration
      setTimeout(() => {
        handleDiagnostic();
      }, 1000);

      if (result.success) {
        alert('✅ Migration terminée avec succès !');
      } else {
        alert('❌ Échec de la migration. Consultez les détails ci-dessous.');
      }
    } catch (error) {
      console.error('Erreur migration:', error);
      setMigrationResult({
        success: false,
        message: '❌ Erreur inattendue lors de la migration',
        details: [],
        errors: [error instanceof Error ? error.message : String(error)]
      });
    } finally {
      setIsRunningMigration(false);
    }
  };

  const handleQuickCleanup = async () => {
    if (!confirm('🧹 Voulez-vous nettoyer rapidement le système de pricing (cache + validation) ?')) {
      return;
    }

    setIsRunningCleanup(true);
    try {
      const success = await quickCleanupPricing();
      if (success) {
        alert('✅ Nettoyage rapide terminé !');
        handleDiagnostic(); // Reexécuter le diagnostic
      } else {
        alert('❌ Erreur lors du nettoyage rapide');
      }
    } catch (error) {
      console.error('Erreur nettoyage:', error);
      alert('❌ Erreur lors du nettoyage rapide');
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            🔧 Migration & Maintenance du Système de Pricing
          </h3>
          <p className="text-gray-600 mt-1">
            Diagnostiquez et réparez les problèmes de configuration des prix
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={handleDiagnostic}
            loading={isRunningDiagnostic}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Diagnostic
          </Button>
        </div>
      </div>

      {/* Diagnostic Status */}
      {diagnostic && (
        <div className={`rounded-lg border p-4 ${getStatusColor(diagnostic.status)}`}>
          <div className="flex items-center mb-3">
            {getStatusIcon(diagnostic.status)}
            <h4 className="ml-2 font-semibold">
              État du système: {diagnostic.status === 'healthy' ? '✅ Sain' : 
                               diagnostic.status === 'warning' ? '⚠️ Attention' : 
                               '❌ Problème'}
            </h4>
          </div>

          {diagnostic.issues.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium mb-2">Problèmes détectés:</h5>
              <ul className="space-y-1">
                {diagnostic.issues.map((issue, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <span className="w-2 h-2 rounded-full bg-current mt-2 mr-2 flex-shrink-0"></span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diagnostic.recommendations.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Recommandations:</h5>
              <ul className="space-y-1">
                {diagnostic.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <span className="w-2 h-2 rounded-full bg-current mt-2 mr-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Migration complète */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-3">
            <Play className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-gray-900">Migration Complète</h4>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Exécute une migration complète du système de pricing. 
            Nettoie les anciennes configurations et valide les nouvelles.
          </p>
          <Button
            onClick={handleMigration}
            loading={isRunningMigration}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Play size={16} className="mr-2" />
            Exécuter la migration
          </Button>
        </div>

        {/* Nettoyage rapide */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-3">
            <Trash2 className="w-5 h-5 text-orange-600 mr-2" />
            <h4 className="font-semibold text-gray-900">Nettoyage Rapide</h4>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Nettoie les caches et valide la configuration existante. 
            Action plus légère que la migration complète.
          </p>
          <Button
            onClick={handleQuickCleanup}
            loading={isRunningCleanup}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Trash2 size={16} className="mr-2" />
            Nettoyage rapide
          </Button>
        </div>
      </div>

      {/* Résultat de migration */}
      {migrationResult && (
        <div className={`rounded-lg border p-4 ${
          migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center mb-3">
            {migrationResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <h4 className={`ml-2 font-semibold ${
              migrationResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {migrationResult.message}
            </h4>
          </div>

          {migrationResult.details.length > 0 && (
            <div className="mb-3">
              <h5 className="font-medium mb-2">Détails:</h5>
              <ul className="space-y-1">
                {migrationResult.details.map((detail, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <span className="w-2 h-2 rounded-full bg-current mt-2 mr-2 flex-shrink-0"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {migrationResult.errors.length > 0 && (
            <div>
              <h5 className="font-medium mb-2 text-red-800">Erreurs:</h5>
              <ul className="space-y-1">
                {migrationResult.errors.map((error, index) => (
                  <li key={index} className="text-sm flex items-start text-red-700">
                    <span className="w-2 h-2 rounded-full bg-current mt-2 mr-2 flex-shrink-0"></span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Documentation */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center mb-3">
          <FileText className="w-5 h-5 text-blue-600 mr-2" />
          <h4 className="font-semibold text-blue-900">📚 Documentation</h4>
        </div>
        <div className="text-blue-800 text-sm space-y-2">
          <p>
            <strong>Système unifié:</strong> Tous les prix sont maintenant gérés dans <code>admin_config/pricing</code>
          </p>
          <p>
            <strong>Structure:</strong> 4 configurations (lawyer/expat × eur/usd) avec calcul automatique des montants
          </p>
          <p>
            <strong>Cache:</strong> Les prix sont mis en cache côté client (5 min) pour optimiser les performances
          </p>
          <p>
            <strong>Migration:</strong> Supprime automatiquement les anciennes configurations dans <code>admin_settings</code>
          </p>
        </div>
      </div>

      {/* Informations techniques */}
      <details className="bg-gray-50 rounded-lg border border-gray-200">
        <summary className="p-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-100">
          🔍 Informations techniques détaillées
        </summary>
        <div className="px-4 pb-4 text-sm text-gray-700 space-y-3">
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Documents Firestore:</h5>
            <ul className="space-y-1 ml-4">
              <li>• <code>admin_config/pricing</code> - Configuration principale (NOUVEAU)</li>
              <li>• <code>admin_settings/main</code> - Paramètres généraux (sans commission)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Services et caches:</h5>
            <ul className="space-y-1 ml-4">
              <li>• <code>pricingService.ts</code> - Service frontend avec cache 5 min</li>
              <li>• <code>PricingManagement.tsx</code> - Interface de gestion admin</li>
              <li>• <code>CurrencySelector.tsx</code> - Sélecteur de devise dynamique</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Calculs automatiques:</h5>
            <ul className="space-y-1 ml-4">
              <li>• <code>providerAmount = totalAmount - connectionFeeAmount</code></li>
              <li>• Validation automatique de la cohérence des montants</li>
              <li>• Support multi-devises (EUR/USD) avec détection automatique</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
};

export default PricingMigrationPanel;