import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Save, RotateCcw, TrendingUp, Calculator } from 'lucide-react';
import Button from '../common/Button';

interface PricingConfig {
  lawyer: {
    eur: ServiceConfig;
    usd: ServiceConfig;
  };
  expat: {
    eur: ServiceConfig;
    usd: ServiceConfig;
  };
}

interface ServiceConfig {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}

export const PricingManagement: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config && originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
    }
  }, [config, originalConfig]);

  const loadConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'admin_config', 'pricing'));
      if (configDoc.exists()) {
        const data = configDoc.data() as PricingConfig;
        setConfig(data);
        setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep copy
      } else {
        // Utiliser la config par défaut
        const defaultConfig = getDefaultConfig();
        setConfig(defaultConfig);
        setOriginalConfig(JSON.parse(JSON.stringify(defaultConfig)));
        
        // Créer le document avec la config par défaut
        await setDoc(doc(db, 'admin_config', 'pricing'), {
          ...defaultConfig,
          updatedAt: serverTimestamp(),
          updatedBy: user?.id || 'system'
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement config:', error);
      alert(
        `Erreur lors du chargement de la configuration : ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = (): PricingConfig => ({
    lawyer: {
      eur: { totalAmount: 49, connectionFeeAmount: 19, providerAmount: 30, duration: 25, currency: 'eur' },
      usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 30, duration: 25, currency: 'usd' }
    },
    expat: {
      eur: { totalAmount: 19, connectionFeeAmount: 9, providerAmount: 10, duration: 35, currency: 'eur' },
      usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 10, duration: 35, currency: 'usd' }
    }
  });

  const updateServiceConfig = (
    serviceType: 'lawyer' | 'expat',
    currency: 'eur' | 'usd',
    field: keyof ServiceConfig,
    value: number
  ) => {
    if (!config) return;

    const newConfig = { ...config };
    newConfig[serviceType][currency] = {
      ...newConfig[serviceType][currency],
      [field]: value
    };

    // Recalculer automatiquement le montant prestataire
    if (field === 'totalAmount' || field === 'connectionFeeAmount') {
      const total = field === 'totalAmount' ? value : newConfig[serviceType][currency].totalAmount;
      const fee = field === 'connectionFeeAmount' ? value : newConfig[serviceType][currency].connectionFeeAmount;
      newConfig[serviceType][currency].providerAmount = Math.max(0, total - fee);
    }

    setConfig(newConfig);
  };

  const resetChanges = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
    }
  };

  const saveConfig = async () => {
    if (!config || !user) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'admin_config', 'pricing'), {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: user.id
      });
      
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      alert('✅ Configuration sauvegardée avec succès ! Les nouveaux prix sont actifs immédiatement.');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      alert(
        `❌ Erreur lors de la sauvegarde : ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const calculateRevenueSplit = (serviceType: 'lawyer' | 'expat', currency: 'eur' | 'usd') => {
    if (!config) return { platformPercentage: 0, providerPercentage: 0 };
    
    const service = config[serviceType][currency];
    const platformPercentage = (service.connectionFeeAmount / service.totalAmount) * 100;
    const providerPercentage = (service.providerAmount / service.totalAmount) * 100;
    
    return { platformPercentage, providerPercentage };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600">Chargement de la configuration...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center text-red-600">
        Erreur de chargement de la configuration
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-7 h-7 mr-2 text-green-600" />
            Gestion des Frais de Mise en Relation
          </h2>
          <p className="text-gray-600 mt-1">
            Modifiez les prix en temps réel - Les changements sont appliqués immédiatement
          </p>
        </div>
        
        <div className="flex space-x-3">
          {hasChanges && (
            <Button
              onClick={resetChanges}
              variant="outline"
              className="flex items-center"
            >
              <RotateCcw size={16} className="mr-2" />
              Annuler
            </Button>
          )}
          
          <Button
            onClick={saveConfig}
            disabled={saving || !hasChanges}
            className={`flex items-center ${hasChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
          >
            <Save size={16} className="mr-2" />
            {saving ? 'Sauvegarde...' : hasChanges ? 'Sauvegarder les changements' : 'Aucun changement'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Modifications non sauvegardées</strong> - N'oubliez pas de sauvegarder vos changements
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Avocat */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-900">Appels Avocat</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EUR */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇪🇺 EUR (€)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('lawyer', 'eur').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix Total Client
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.lawyer.eur.totalAmount}
                    onChange={(e) => updateServiceConfig('lawyer', 'eur', 'totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frais de Mise en Relation (SOS Expats)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.lawyer.eur.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('lawyer', 'eur', 'connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rémunération Avocat
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.lawyer.eur.providerAmount}
                    disabled
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 bg-gray-100 text-gray-600"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <Calculator size={12} className="inline mr-1" />
                  Calculé automatiquement : {config.lawyer.eur.totalAmount} - {config.lawyer.eur.connectionFeeAmount} = {config.lawyer.eur.providerAmount}€
                </p>
              </div>
            </div>
          </div>

          {/* USD */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇺🇸 USD ($)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('lawyer', 'usd').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix Total Client
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.lawyer.usd.totalAmount}
                    onChange={(e) => updateServiceConfig('lawyer', 'usd', 'totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frais de Mise en Relation (SOS Expats)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.lawyer.usd.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('lawyer', 'usd', 'connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rémunération Avocat
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.lawyer.usd.providerAmount}
                    disabled
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 bg-gray-100 text-gray-600"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <Calculator size={12} className="inline mr-1" />
                  Calculé automatiquement : {config.lawyer.usd.totalAmount} - {config.lawyer.usd.connectionFeeAmount} = {config.lawyer.usd.providerAmount}$
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Expat */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-3 h-3 bg-green-600 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-900">Appels Expatrié</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EUR */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇪🇺 EUR (€)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('expat', 'eur').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix Total Client
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.expat.eur.totalAmount}
                    onChange={(e) => updateServiceConfig('expat', 'eur', 'totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frais de Mise en Relation (SOS Expats)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.expat.eur.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('expat', 'eur', 'connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rémunération Expatrié
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.expat.eur.providerAmount}
                    disabled
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 bg-gray-100 text-gray-600"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <Calculator size={12} className="inline mr-1" />
                  Calculé automatiquement : {config.expat.eur.totalAmount} - {config.expat.eur.connectionFeeAmount} = {config.expat.eur.providerAmount}€
                </p>
              </div>
            </div>
          </div>

          {/* USD */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇺🇸 USD ($)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('expat', 'usd').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix Total Client
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.expat.usd.totalAmount}
                    onChange={(e) => updateServiceConfig('expat', 'usd', 'totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frais de Mise en Relation (SOS Expats)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.expat.usd.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('expat', 'usd', 'connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rémunération Expatrié
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.expat.usd.providerAmount}
                    disabled
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 bg-gray-100 text-gray-600"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <Calculator size={12} className="inline mr-1" />
                  Calculé automatiquement : {config.expat.usd.totalAmount} - {config.expat.usd.connectionFeeAmount} = {config.expat.usd.providerAmount}$
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aperçu des changements */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-gray-200">
        <h4 className="font-semibold mb-4 text-gray-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Aperçu des Tarifs Actuels
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-blue-700 mb-2">🎓 Avocat</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>EUR:</span>
                <span className="font-mono">{config.lawyer.eur.totalAmount}€ (Frais: {config.lawyer.eur.connectionFeeAmount}€)</span>
              </div>
              <div className="flex justify-between">
                <span>USD:</span>
                <span className="font-mono">{config.lawyer.usd.totalAmount}$ (Frais: {config.lawyer.usd.connectionFeeAmount}$)</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-green-700 mb-2">🌍 Expatrié</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>EUR:</span>
                <span className="font-mono">{config.expat.eur.totalAmount}€ (Frais: {config.expat.eur.connectionFeeAmount}€)</span>
              </div>
              <div className="flex justify-between">
                <span>USD:</span>
                <span className="font-mono">{config.expat.usd.totalAmount}$ (Frais: {config.expat.usd.connectionFeeAmount}$)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
