import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Save, RotateCcw, TrendingUp, Calculator } from 'lucide-react';
import Button from '../common/Button';
import MoneyInput from '@/components/admin/MoneyInput';

/* =========================================
 * Types ajoutés en haut du fichier
 * ========================================= */
type Currency = 'eur' | 'usd';
type StrikeTarget = 'provider' | 'default' | 'both';

type PriceOverride = {
  enabled: boolean;
  totalAmount: number;
  connectionFeeAmount: number;
  label?: string;
  startsAt?: number;
  endsAt?: number;
  strikeTargets?: StrikeTarget;
  stackableWithCoupons?: boolean;
};

type OverridesConfig = {
  lawyer?: Partial<Record<Currency, PriceOverride>>;
  expat?: Partial<Record<Currency, PriceOverride>>;
};

interface ServiceConfig {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}

interface PricingConfig {
  lawyer: { eur: ServiceConfig; usd: ServiceConfig };
  expat: { eur: ServiceConfig; usd: ServiceConfig };
  overrides?: OverridesConfig;
}

/* =========================================
 * Hydratation sûre des overrides
 * ========================================= */
const hydrateMissingOverrides = (data: PricingConfig): PricingConfig => {
  const copy: PricingConfig = JSON.parse(JSON.stringify(data));
  copy.overrides ||= {};
  copy.overrides.lawyer ||= {};
  copy.overrides.expat ||= {};
  for (const s of ['lawyer', 'expat'] as const) {
    for (const c of ['eur', 'usd'] as const) {
      (copy.overrides as any)[s][c] ||= {
        enabled: false,
        totalAmount: 0,
        connectionFeeAmount: 0,
        label: '',
        startsAt: undefined,
        endsAt: undefined,
        strikeTargets: 'default',
        stackableWithCoupons: true,
      };
    }
  }
  return copy;
};

/* =========================================
 * Composant principal
 * ========================================= */
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
        const data = hydrateMissingOverrides(configDoc.data() as PricingConfig);
        setConfig(data);
        setOriginalConfig(JSON.parse(JSON.stringify(data)));
      } else {
        const defaultConfig = hydrateMissingOverrides(getDefaultConfig());
        setConfig(defaultConfig);
        setOriginalConfig(JSON.parse(JSON.stringify(defaultConfig)));

        await setDoc(doc(db, 'admin_config', 'pricing'), {
          ...defaultConfig,
          updatedAt: serverTimestamp(),
          updatedBy: user?.id || 'system',
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
      usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 30, duration: 25, currency: 'usd' },
    },
    expat: {
      eur: { totalAmount: 19, connectionFeeAmount: 9, providerAmount: 10, duration: 35, currency: 'eur' },
      usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 10, duration: 35, currency: 'usd' },
    },
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
      [field]: value,
    };

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
      await setDoc(
        doc(db, 'admin_config', 'pricing'),
        {
          lawyer: config.lawyer,
          expat: config.expat,
          overrides: config.overrides || {},
          updatedAt: serverTimestamp(),
          updatedBy: user.id,
        },
        { merge: true }
      );

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
    return <div className="text-center text-red-600">Erreur de chargement de la configuration</div>;
  }

  /* =========================================
   * Helper UI : bloc Override
   * ========================================= */
  const OverrideBlock = ({
    service,
    currency,
    title,
    currencySymbol,
    placeholderTotal,
    placeholderFee,
  }: {
    service: 'lawyer' | 'expat';
    currency: 'eur' | 'usd';
    title: string;
    currencySymbol: string;
    placeholderTotal: string;
    placeholderFee: string;
  }) => (
    <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-rose-700">🎯 Prix spécial (Override) — {title}</h4>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!config.overrides?.[service]?.[currency]?.enabled}
            onChange={(e) =>
              setConfig((prev) => {
                const c = structuredClone(prev!);
                c.overrides![service]![currency]!.enabled = e.target.checked;
                if (e.target.checked) {
                  c.overrides![service]![currency]!.totalAmount = c[service][currency].totalAmount;
                  c.overrides![service]![currency]!.connectionFeeAmount =
                    c[service][currency].connectionFeeAmount;
                }
                return c;
              })
            }
          />
          <span>Activer</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Total client ({currencySymbol})</label>
          <MoneyInput
            value={config.overrides?.[service]?.[currency]?.totalAmount}
            onChange={(n) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.totalAmount = n ?? 0;
                return c;
              })
            }
            placeholder={placeholderTotal}
            suffix={currencySymbol}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Frais plateforme ({currencySymbol})</label>
          <MoneyInput
            value={config.overrides?.[service]?.[currency]?.connectionFeeAmount}
            onChange={(n) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.connectionFeeAmount = n ?? 0;
                return c;
              })
            }
            placeholder={placeholderFee}
            suffix={currencySymbol}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Label (badge)</label>
          <input
            type="text"
            value={config.overrides?.[service]?.[currency]?.label ?? ''}
            onChange={(e) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.label = e.target.value;
                return c;
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Début</label>
          <input
            type="datetime-local"
            value={
              config.overrides?.[service]?.[currency]?.startsAt
                ? new Date(config.overrides![service]![currency]!.startsAt!).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.startsAt = e.target.value
                  ? new Date(e.target.value).getTime()
                  : undefined;
                return c;
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Fin</label>
          <input
            type="datetime-local"
            value={
              config.overrides?.[service]?.[currency]?.endsAt
                ? new Date(config.overrides![service]![currency]!.endsAt!).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.endsAt = e.target.value
                  ? new Date(e.target.value).getTime()
                  : undefined;
                return c;
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Barre (strike)</label>
          <select
            value={config.overrides?.[service]?.[currency]?.strikeTargets ?? 'default'}
            onChange={(e) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.strikeTargets = e.target.value as any;
                return c;
              })
            }
            className="w-full border rounded px-3 py-2"
          >
            <option value="default">Prix standard</option>
            <option value="provider">Prix prestataire</option>
            <option value="both">Les deux</option>
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.overrides?.[service]?.[currency]?.stackableWithCoupons ?? true}
            onChange={(e) =>
              setConfig((p) => {
                const c = structuredClone(p!);
                c.overrides![service]![currency]!.stackableWithCoupons = e.target.checked;
                return c;
              })
            }
          />
          <span>Cumulable avec codes promo</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-7 h-7 mr-2 text-green-600" />
            Gestion des Frais de Mise en Relation
          </h2>
          <p className="text-gray-600 mt-1">Modifiez les prix en temps réel - Les changements sont appliqués immédiatement</p>
        </div>
        <div className="flex space-x-3">
          {hasChanges && (
            <Button onClick={resetChanges} variant="outline" className="flex items-center">
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

      {/* Avocat */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Appels Avocat</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Avocat EUR */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">🇪🇺 EUR (€)</h4>
            {/* UI standard */}
            {/* ... (inchangé, voir version précédente) */}
            <OverrideBlock
              service="lawyer"
              currency="eur"
              title="Avocat / EUR"
              currencySymbol="€"
              placeholderTotal="ex: 39"
              placeholderFee="ex: 19"
            />
          </div>
          {/* Avocat USD */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">🇺🇸 USD ($)</h4>
            {/* UI standard */}
            {/* ... (inchangé) */}
            <OverrideBlock
              service="lawyer"
              currency="usd"
              title="Avocat / USD"
              currencySymbol="$"
              placeholderTotal="ex: 45"
              placeholderFee="ex: 25"
            />
          </div>
        </div>
      </div>

      {/* Expat */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Appels Expat</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expat EUR */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">🇪🇺 EUR (€)</h4>
            {/* UI standard */}
            {/* ... */}
            <OverrideBlock
              service="expat"
              currency="eur"
              title="Expat / EUR"
              currencySymbol="€"
              placeholderTotal="ex: 15"
              placeholderFee="ex: 9"
            />
          </div>
          {/* Expat USD */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">🇺🇸 USD ($)</h4>
            {/* UI standard */}
            {/* ... */}
            <OverrideBlock
              service="expat"
              currency="usd"
              title="Expat / USD"
              currencySymbol="$"
              placeholderTotal="ex: 20"
              placeholderFee="ex: 15"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
