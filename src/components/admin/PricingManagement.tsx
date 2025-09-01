import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Save, RotateCcw, TrendingUp, Calculator } from 'lucide-react';
import Button from '../common/Button';
import MoneyInput from '@/components/admin/MoneyInput';

/* =========================================
 * Types
 * ========================================= */
type Currency = 'eur' | 'usd';
type StrikeTarget = 'provider' | 'default' | 'both';

type PriceOverride = {
  enabled: boolean;
  totalAmount: number;
  connectionFeeAmount: number;
  label?: string;
  startsAt?: number; // timestamp ms
  endsAt?: number;   // timestamp ms
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
  expat:  { eur: ServiceConfig; usd: ServiceConfig };
  overrides?: OverridesConfig;
}

/* =========================================
 * Helpers Date (éviter RangeError: Invalid time value)
 * ========================================= */
const toDatetimeLocal = (ts?: unknown): string => {
  const n = typeof ts === 'number' ? ts : Number(ts);
  if (!Number.isFinite(n)) return '';
  const d = new Date(n);
  const t = d.getTime();
  if (!Number.isFinite(t) || isNaN(t)) return '';
  // datetime-local attend "YYYY-MM-DDTHH:mm"
  return new Date(t - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fromDatetimeLocal = (s: string): number | undefined => {
  if (!s) return undefined;
  // Le contrôle renvoie une date locale. On la convertit en ms epoch.
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : undefined;
};

const normalizeTs = (x: any): number | undefined =>
  typeof x === 'number' && Number.isFinite(x) ? x : undefined;

/* =========================================
 * Hydratation sûre des overrides (+ normalisation)
 * ========================================= */
const hydrateMissingOverrides = (data: PricingConfig): PricingConfig => {
  const copy: PricingConfig = JSON.parse(JSON.stringify(data));
  copy.overrides ||= {};
  copy.overrides.lawyer ||= {};
  copy.overrides.expat  ||= {};
  for (const s of ['lawyer','expat'] as const) {
    for (const c of ['eur','usd'] as const) {
      const cur = ((copy.overrides as any)[s][c] ||= {
        enabled: false,
        totalAmount: 0,
        connectionFeeAmount: 0,
        label: '',
        startsAt: undefined,
        endsAt: undefined,
        strikeTargets: 'default',
        stackableWithCoupons: true,
      });
      // Normalisation défensive des timestamps
      cur.startsAt = normalizeTs(cur.startsAt);
      cur.endsAt   = normalizeTs(cur.endsAt);
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
      usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 30, duration: 25, currency: 'usd' }
    },
    expat: {
      eur: { totalAmount: 19, connectionFeeAmount: 9, providerAmount: 10, duration: 35, currency: 'eur' },
      usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 10, duration: 35, currency: 'usd' }
    }
    // overrides hydratés ensuite
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

    // Recalcul auto du providerAmount
    if (field === 'totalAmount' || field === 'connectionFeeAmount') {
      const total = field === 'totalAmount' ? value : newConfig[serviceType][currency].totalAmount;
      const fee   = field === 'connectionFeeAmount' ? value : newConfig[serviceType][currency].connectionFeeAmount;
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
          expat:  config.expat,
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
    const providerPercentage  = (service.providerAmount / service.totalAmount) * 100;
    return { platformPercentage, providerPercentage };
  };

  /* =========================================
   * Rendu
   * ========================================= */
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

      {/* =========================
          Configuration Avocat
         ========================= */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-900">Appels Avocat</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AVOCAT / EUR */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇪🇺 EUR (€)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('lawyer','eur').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>

            {/* UI standard */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix Total Client</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.lawyer.eur.totalAmount}
                    onChange={(e) => updateServiceConfig('lawyer','eur','totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais de Mise en Relation (SOS Expats)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.lawyer.eur.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('lawyer','eur','connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rémunération Avocat</label>
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

            {/* OVERRIDE — Avocat / EUR */}
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-rose-700">🎯 Prix spécial (Override) — Avocat / EUR</h4>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!config.overrides?.lawyer?.eur?.enabled}
                    onChange={(e) => setConfig(prev => {
                      const c = structuredClone(prev!);
                      c.overrides!.lawyer!.eur!.enabled = e.target.checked;
                      if (e.target.checked) {
                        c.overrides!.lawyer!.eur!.totalAmount = c.lawyer.eur.totalAmount;
                        c.overrides!.lawyer!.eur!.connectionFeeAmount = c.lawyer.eur.connectionFeeAmount;
                      }
                      return c;
                    })}
                  />
                  <span>Activer</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Total client (€)</label>
                  <MoneyInput
                    value={config.overrides?.lawyer?.eur?.totalAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.totalAmount = n ?? 0; return c; })}
                    placeholder="ex: 39"
                    suffix="€"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Frais plateforme (€)</label>
                  <MoneyInput
                    value={config.overrides?.lawyer?.eur?.connectionFeeAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.connectionFeeAmount = n ?? 0; return c; })}
                    placeholder="ex: 19"
                    suffix="€"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Label (badge)</label>
                  <input
                    type="text"
                    value={config.overrides?.lawyer?.eur?.label ?? ''}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.label = e.target.value; return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.lawyer?.eur?.startsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.startsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.lawyer?.eur?.endsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.endsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Barre (strike)</label>
                  <select
                    value={config.overrides?.lawyer?.eur?.strikeTargets ?? 'default'}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.strikeTargets = e.target.value as any; return c; })}
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
                    checked={config.overrides?.lawyer?.eur?.stackableWithCoupons ?? true}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.eur!.stackableWithCoupons = e.target.checked; return c; })}
                  />
                  <span>Cumulable avec codes promo</span>
                </label>
              </div>
            </div>
          </div>

          {/* AVOCAT / USD */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇺🇸 USD ($)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('lawyer','usd').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>

            {/* UI standard */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix Total Client</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.lawyer.usd.totalAmount}
                    onChange={(e) => updateServiceConfig('lawyer','usd','totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais de Mise en Relation (SOS Expats)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.lawyer.usd.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('lawyer','usd','connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rémunération Avocat</label>
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

            {/* OVERRIDE — Avocat / USD */}
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-rose-700">🎯 Prix spécial (Override) — Avocat / USD</h4>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!config.overrides?.lawyer?.usd?.enabled}
                    onChange={(e) => setConfig(prev => {
                      const c = structuredClone(prev!);
                      c.overrides!.lawyer!.usd!.enabled = e.target.checked;
                      if (e.target.checked) {
                        c.overrides!.lawyer!.usd!.totalAmount = c.lawyer.usd.totalAmount;
                        c.overrides!.lawyer!.usd!.connectionFeeAmount = c.lawyer.usd.connectionFeeAmount;
                      }
                      return c;
                    })}
                  />
                  <span>Activer</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Total client ($)</label>
                  <MoneyInput
                    value={config.overrides?.lawyer?.usd?.totalAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.totalAmount = n ?? 0; return c; })}
                    placeholder="ex: 45"
                    suffix="$"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Frais plateforme ($)</label>
                  <MoneyInput
                    value={config.overrides?.lawyer?.usd?.connectionFeeAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.connectionFeeAmount = n ?? 0; return c; })}
                    placeholder="ex: 25"
                    suffix="$"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Label (badge)</label>
                  <input
                    type="text"
                    value={config.overrides?.lawyer?.usd?.label ?? ''}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.label = e.target.value; return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.lawyer?.usd?.startsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.startsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.lawyer?.usd?.endsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.endsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Barre (strike)</label>
                  <select
                    value={config.overrides?.lawyer?.usd?.strikeTargets ?? 'default'}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.strikeTargets = e.target.value as any; return c; })}
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
                    checked={config.overrides?.lawyer?.usd?.stackableWithCoupons ?? true}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.lawyer!.usd!.stackableWithCoupons = e.target.checked; return c; })}
                  />
                  <span>Cumulable avec codes promo</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          Configuration Expat
         ========================= */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-3 h-3 bg-green-600 rounded-full mr-3"></div>
          <h3 className="text-xl font-semibold text-gray-900">Appels Expatrié</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EXPAT / EUR */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇪🇺 EUR (€)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('expat','eur').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>

            {/* UI standard */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix Total Client</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.expat.eur.totalAmount}
                    onChange={(e) => updateServiceConfig('expat','eur','totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais de Mise en Relation (SOS Expats)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.expat.eur.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('expat','eur','connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">€</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rémunération Expatrié</label>
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

            {/* OVERRIDE — Expat / EUR */}
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-rose-700">🎯 Prix spécial (Override) — Expat / EUR</h4>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!config.overrides?.expat?.eur?.enabled}
                    onChange={(e) => setConfig(prev => {
                      const c = structuredClone(prev!);
                      c.overrides!.expat!.eur!.enabled = e.target.checked;
                      if (e.target.checked) {
                        c.overrides!.expat!.eur!.totalAmount = c.expat.eur.totalAmount;
                        c.overrides!.expat!.eur!.connectionFeeAmount = c.expat.eur.connectionFeeAmount;
                      }
                      return c;
                    })}
                  />
                  <span>Activer</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Total client (€)</label>
                  <MoneyInput
                    value={config.overrides?.expat?.eur?.totalAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.totalAmount = n ?? 0; return c; })}
                    placeholder="ex: 15"
                    suffix="€"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Frais plateforme (€)</label>
                  <MoneyInput
                    value={config.overrides?.expat?.eur?.connectionFeeAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.connectionFeeAmount = n ?? 0; return c; })}
                    placeholder="ex: 9"
                    suffix="€"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Label (badge)</label>
                  <input
                    type="text"
                    value={config.overrides?.expat?.eur?.label ?? ''}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.label = e.target.value; return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.expat?.eur?.startsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.startsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.expat?.eur?.endsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.endsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Barre (strike)</label>
                  <select
                    value={config.overrides?.expat?.eur?.strikeTargets ?? 'default'}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.strikeTargets = e.target.value as any; return c; })}
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
                    checked={config.overrides?.expat?.eur?.stackableWithCoupons ?? true}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.eur!.stackableWithCoupons = e.target.checked; return c; })}
                  />
                  <span>Cumulable avec codes promo</span>
                </label>
              </div>
            </div>
          </div>

          {/* EXPAT / USD */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-800 flex items-center">
              🇺🇸 USD ($)
              <span className="ml-2 text-sm text-gray-500">
                ({calculateRevenueSplit('expat','usd').platformPercentage.toFixed(1)}% frais)
              </span>
            </h4>

            {/* UI standard */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix Total Client</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.expat.usd.totalAmount}
                    onChange={(e) => updateServiceConfig('expat','usd','totalAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frais de Mise en Relation (SOS Expats)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.expat.usd.connectionFeeAmount}
                    onChange={(e) => updateServiceConfig('expat','usd','connectionFeeAmount', Number(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">$</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rémunération Expatrié</label>
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

            {/* OVERRIDE — Expat / USD */}
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-rose-700">🎯 Prix spécial (Override) — Expat / USD</h4>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!config.overrides?.expat?.usd?.enabled}
                    onChange={(e) => setConfig(prev => {
                      const c = structuredClone(prev!);
                      c.overrides!.expat!.usd!.enabled = e.target.checked;
                      if (e.target.checked) {
                        c.overrides!.expat!.usd!.totalAmount = c.expat.usd.totalAmount;
                        c.overrides!.expat!.usd!.connectionFeeAmount = c.expat.usd.connectionFeeAmount;
                      }
                      return c;
                    })}
                  />
                  <span>Activer</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Total client ($)</label>
                  <MoneyInput
                    value={config.overrides?.expat?.usd?.totalAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.totalAmount = n ?? 0; return c; })}
                    placeholder="ex: 20"
                    suffix="$"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Frais plateforme ($)</label>
                  <MoneyInput
                    value={config.overrides?.expat?.usd?.connectionFeeAmount}
                    onChange={(n) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.connectionFeeAmount = n ?? 0; return c; })}
                    placeholder="ex: 15"
                    suffix="$"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Label (badge)</label>
                  <input
                    type="text"
                    value={config.overrides?.expat?.usd?.label ?? ''}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.label = e.target.value; return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.expat?.usd?.startsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.startsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(config.overrides?.expat?.usd?.endsAt)}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.endsAt = fromDatetimeLocal(e.target.value); return c; })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Barre (strike)</label>
                  <select
                    value={config.overrides?.expat?.usd?.strikeTargets ?? 'default'}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.strikeTargets = e.target.value as any; return c; })}
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
                    checked={config.overrides?.expat?.usd?.stackableWithCoupons ?? true}
                    onChange={(e) => setConfig(p => { const c = structuredClone(p!); c.overrides!.expat!.usd!.stackableWithCoupons = e.target.checked; return c; })}
                  />
                  <span>Cumulable avec codes promo</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          Aperçu des changements
         ========================= */}
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
