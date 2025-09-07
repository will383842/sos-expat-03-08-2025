// src/pages/admin/AdminPricing.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Settings,
  Save,
  Euro,
  DollarSign,
  Calendar,
  Check,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import AdminLayout from '../../components/admin/AdminLayout';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

/* ---------------- Types ---------------- */

type Currency = 'eur' | 'usd';
type ServiceKind = 'expat' | 'lawyer';
type ServiceLabel = 'Expat' | 'Avocat';

interface PricingNode {
  connectionFeeAmount: number; // notre marge
  providerAmount: number;      // reversé prestataire
  totalAmount: number;         // total client
  currency: Currency;
  duration: number;            // minutes
}

interface PricingOverrideNode {
  enabled: boolean;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  connectionFeeAmount: number;
  providerAmount: number;
  totalAmount: number;
  stackableWithCoupons: boolean;
  label: string;
  strikeTargets: string; // pour l’affichage "prix barré" si tu l’utilises au front
}

interface PricingDoc {
  expat?: Partial<Record<Currency, PricingNode>>;
  lawyer?: Partial<Record<Currency, PricingNode>>;
  overrides?: {
    settings?: { stackableDefault?: boolean };
    expat?: Partial<Record<Currency, Partial<PricingOverrideNode>>>;
    lawyer?: Partial<Record<Currency, Partial<PricingOverrideNode>>>;
  };
  updatedAt?: Timestamp;
  updatedBy?: string;
}

interface CouponDoc {
  code: string;
  type: 'fixed' | 'percentage';
  amount: number;
  active?: boolean;
  services?: Array<'expat_call' | 'lawyer_call'>;
  min_order_amount?: number;
  valid_from?: Timestamp;
  valid_until?: Timestamp;
  maxDiscount?: number;
}

/* ------------- Helpers ------------- */

const isSumOk = (a: number, b: number, total: number) =>
  Math.abs((a + b) - total) < 0.001;

const toDate = (t: Timestamp | null | undefined): Date | null =>
  t && typeof t.toDate === 'function' ? t.toDate() : null;

const toTs = (d: Date | null): Timestamp | null =>
  d ? Timestamp.fromDate(d) : null;

const SERVICE_LABEL: Record<ServiceKind, ServiceLabel> = {
  expat: 'Expat',
  lawyer: 'Avocat',
};

/* ------------- Composants réutilisables ------------- */

const Field: React.FC<{ label: string; children: React.ReactNode; help?: string }> = ({ label, children, help }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {help ? <p className="mt-1 text-xs text-gray-500">{help}</p> : null}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    aria-pressed={checked}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

/* ------------- Page ------------- */

const AdminPricing: React.FC = () => {
  const { user } = useAuth();

  // filtres de travail
  const [service, setService] = useState<ServiceKind>('expat');
  const [currency, setCurrency] = useState<Currency>('eur');

  // réglage global
  const [stackableDefault, setStackableDefault] = useState<boolean>(true);

  // base
  const [base, setBase] = useState<Record<ServiceKind, Record<Currency, PricingNode>>>({
    expat: {
      eur: { connectionFeeAmount: 9, providerAmount: 30, totalAmount: 39, currency: 'eur', duration: 30 },
      usd: { connectionFeeAmount: 15, providerAmount: 34, totalAmount: 49, currency: 'usd', duration: 30 },
    },
    lawyer: {
      eur: { connectionFeeAmount: 19, providerAmount: 36, totalAmount: 55, currency: 'eur', duration: 20 },
      usd: { connectionFeeAmount: 25, providerAmount: 35, totalAmount: 60, currency: 'usd', duration: 20 },
    },
  });

  // promo
  const [promo, setPromo] = useState<Record<ServiceKind, Record<Currency, PricingOverrideNode>>>({
    expat: {
      eur: {
        enabled: true, startsAt: null, endsAt: null,
        connectionFeeAmount: 19, providerAmount: 30, totalAmount: 49,
        stackableWithCoupons: true, label: 'Promo Expat EUR', strikeTargets: 'default',
      },
      usd: {
        enabled: true, startsAt: null, endsAt: null,
        connectionFeeAmount: 19, providerAmount: 30, totalAmount: 49,
        stackableWithCoupons: true, label: 'Promo Expat USD', strikeTargets: 'default',
      },
    },
    lawyer: {
      eur: {
        enabled: true, startsAt: null, endsAt: null,
        connectionFeeAmount: 19, providerAmount: 20, totalAmount: 39,
        stackableWithCoupons: true, label: 'Promo Avocat EUR', strikeTargets: 'default',
      },
      usd: {
        enabled: true, startsAt: null, endsAt: null,
        connectionFeeAmount: 19, providerAmount: 20, totalAmount: 39,
        stackableWithCoupons: true, label: 'Promo Avocat USD', strikeTargets: 'default',
      },
    },
  });

  // preview
  const [previewCoupon, setPreviewCoupon] = useState<string>('');
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewDetails, setPreviewDetails] = useState<string>('');

  const selBase = base[service][currency];
  const selPromo = promo[service][currency];

  /* ----------- Load Firestore ----------- */

  const loadConfig = useCallback(async () => {
    const snap = await getDoc(doc(db, 'admin_config', 'pricing'));
    if (!snap.exists()) return;

    const data = snap.data() as PricingDoc;

    // Base
    const b = { ...base };
    (['expat', 'lawyer'] as ServiceKind[]).forEach((s) => {
      (['eur', 'usd'] as Currency[]).forEach((c) => {
        const node = data?.[s]?.[c];
        if (node) {
          b[s][c] = {
            connectionFeeAmount: Number(node.connectionFeeAmount ?? 0),
            providerAmount: Number(node.providerAmount ?? 0),
            totalAmount: Number(node.totalAmount ?? 0),
            currency: c,
            duration: Number(node.duration ?? 0),
          };
        }
      });
    });
    setBase(b);

    // Promo
    const p = { ...promo };
    (['expat', 'lawyer'] as ServiceKind[]).forEach((s) => {
      (['eur', 'usd'] as Currency[]).forEach((c) => {
        const o = data?.overrides?.[s]?.[c];
        if (o) {
          p[s][c] = {
            enabled: Boolean(o.enabled),
            startsAt: o.startsAt ?? null,
            endsAt: o.endsAt ?? null,
            connectionFeeAmount: Number(o.connectionFeeAmount ?? 0),
            providerAmount: Number(o.providerAmount ?? 0),
            totalAmount: Number(o.totalAmount ?? 0),
            stackableWithCoupons: Boolean(o.stackableWithCoupons ?? true),
            label: String(o.label ?? ''),
            strikeTargets: String(o.strikeTargets ?? 'default'),
          };
        }
      });
    });
    setPromo(p);

    // Global default
    setStackableDefault(Boolean(data?.overrides?.settings?.stackableDefault ?? true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  /* ----------- Save Firestore ----------- */

  const saveBase = async (): Promise<void> => {
    if (!isSumOk(selBase.connectionFeeAmount, selBase.providerAmount, selBase.totalAmount)) {
      alert('La somme “Marge + Part prestataire” doit = Total');
      return;
    }
    await setDoc(
      doc(db, 'admin_config', 'pricing'),
      {
        [service]: {
          [currency]: {
            connectionFeeAmount: Number(selBase.connectionFeeAmount),
            providerAmount: Number(selBase.providerAmount),
            totalAmount: Number(selBase.totalAmount),
            currency,
            duration: Number(selBase.duration),
          },
        },
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid ?? 'admin',
      },
      { merge: true }
    );
    alert('Prix de base enregistré ✅');
  };

  const savePromo = async (): Promise<void> => {
    if (selPromo.enabled) {
      if (selPromo.startsAt && selPromo.endsAt) {
        const s = toDate(selPromo.startsAt)!;
        const e = toDate(selPromo.endsAt)!;
        if (s >= e) {
          alert('La date de début doit précéder la date de fin');
          return;
        }
      }
      if (!isSumOk(selPromo.connectionFeeAmount, selPromo.providerAmount, selPromo.totalAmount)) {
        alert('La somme “Marge + Part prestataire” doit = Total (promo)');
        return;
      }
    }
    await setDoc(
      doc(db, 'admin_config', 'pricing'),
      {
        overrides: {
          [service]: {
            [currency]: {
              enabled: selPromo.enabled,
              startsAt: selPromo.startsAt ?? null,
              endsAt: selPromo.endsAt ?? null,
              connectionFeeAmount: Number(selPromo.connectionFeeAmount),
              providerAmount: Number(selPromo.providerAmount),
              totalAmount: Number(selPromo.totalAmount),
              stackableWithCoupons: Boolean(selPromo.stackableWithCoupons),
              label: selPromo.label,
              strikeTargets: selPromo.strikeTargets || 'default',
            },
          },
        },
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid ?? 'admin',
      },
      { merge: true }
    );
    alert('Prix promotionnel enregistré ✅');
  };

  const saveGlobalStackable = async (value: boolean): Promise<void> => {
    await setDoc(
      doc(db, 'admin_config', 'pricing'),
      {
        overrides: { settings: { stackableDefault: value } },
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid ?? 'admin',
      },
      { merge: true }
    );
    setStackableDefault(value);
  };

  /* ----------- Preview (logique back) ----------- */

  const isPromoActiveNow = useMemo(() => {
    const o = selPromo;
    if (!o.enabled) return false;
    const now = new Date();
    const s = toDate(o.startsAt);
    const e = toDate(o.endsAt);
    return (s ? now >= s : true) && (e ? now <= e : true);
  }, [selPromo]);

  const runPreview = useCallback(async () => {
    let total = selBase.totalAmount;
    let explanation = `Prix de base: ${total.toFixed(2)} ${currency.toUpperCase()}`;

    if (isPromoActiveNow) {
      total = selPromo.totalAmount;
      explanation += ` → Promo active (“prix barré”): ${total.toFixed(2)} ${currency.toUpperCase()}`;
    }

    // coupon si empilable (vérification légère, comme le back)
    if (previewCoupon.trim()) {
      const canStack = isPromoActiveNow ? selPromo.stackableWithCoupons : stackableDefault;

      if (!canStack && isPromoActiveNow) {
        explanation += ' • Coupon ignoré (promo non cumulable).';
      } else {
        const q = query(
          collection(db, 'coupons'),
          where('code', '==', previewCoupon.trim().toUpperCase()),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const c = snap.docs[0].data() as CouponDoc;
          const now = new Date();
          const from = c.valid_from ? c.valid_from.toDate() : undefined;
          const until = c.valid_until ? c.valid_until.toDate() : undefined;
          const okDate = (from ? now >= from : true) && (until ? now <= until : true);
          const okActive = c.active !== false;
          const okService =
            Array.isArray(c.services)
              ? c.services.includes(service === 'lawyer' ? 'lawyer_call' : 'expat_call')
              : true;
          const okMin = typeof c.min_order_amount === 'number' ? total >= c.min_order_amount : true;

          if (okDate && okActive && okService && okMin) {
            let discount = 0;
            if (c.type === 'fixed') discount = c.amount;
            if (c.type === 'percentage') discount = Math.round((total * c.amount) / 100 * 100) / 100;
            if (typeof c.maxDiscount === 'number') discount = Math.min(discount, c.maxDiscount);
            discount = Math.min(discount, total);
            total = Math.max(0, Math.round((total - discount) * 100) / 100);
            explanation += ` • Coupon “${previewCoupon.toUpperCase()}” appliqué: -${discount.toFixed(2)}.`;
          } else {
            explanation += ' • Coupon non applicable.';
          }
        } else {
          explanation += ' • Coupon introuvable.';
        }
      }
    }

    setPreviewTotal(total);
    setPreviewDetails(explanation);
  }, [selBase, selPromo, isPromoActiveNow, previewCoupon, service, currency, stackableDefault]);

  /* ----------- UI ----------- */

  const PriceBadge: React.FC<{ value: number; currency: Currency; strike?: boolean }> = ({ value, currency, strike }) => (
    <div className="text-lg font-semibold text-gray-900">
      {strike ? <span className="line-through text-gray-400 mr-2">{value.toFixed(2)}</span> : value.toFixed(2)} {currency.toUpperCase()}
    </div>
  );

  const errorSumBase = !isSumOk(selBase.connectionFeeAmount, selBase.providerAmount, selBase.totalAmount);
  const errorSumPromo = selPromo.enabled && !isSumOk(selPromo.connectionFeeAmount, selPromo.providerAmount, selPromo.totalAmount);
  const errorDates =
    selPromo.enabled &&
    selPromo.startsAt &&
    selPromo.endsAt &&
    toDate(selPromo.startsAt)! >= toDate(selPromo.endsAt)!;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Tarification & Promotions
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure les <strong>prix de base</strong>, puis éventuellement un <strong>prix promotionnel</strong> (“prix barré”) actif sur une période.
          </p>
        </div>

        {/* Choix Service / Devise */}
        <div className="bg-white border rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Service</div>
              <div className="inline-flex rounded-lg border overflow-hidden">
                {(['expat', 'lawyer'] as ServiceKind[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setService(s)}
                    className={`px-4 py-2 text-sm ${service === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                  >
                    {SERVICE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Devise</div>
              <div className="inline-flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setCurrency('eur')}
                  className={`px-4 py-2 text-sm flex items-center gap-1 ${currency === 'eur' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                >
                  <Euro className="w-4 h-4" /> EUR
                </button>
                <button
                  onClick={() => setCurrency('usd')}
                  className={`px-4 py-2 text-sm flex items-center gap-1 ${currency === 'usd' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                >
                  <DollarSign className="w-4 h-4" /> USD
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm">Coupons cumulables par défaut</span>
              <Toggle
                checked={stackableDefault}
                onChange={(v) => void saveGlobalStackable(v)}
              />
            </div>
          </div>
        </div>

        {/* Bloc Prix de base */}
        <div className="bg-white border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Prix de base — {SERVICE_LABEL[service]} • {currency.toUpperCase()}</h2>
            <button
              onClick={() => void saveBase()}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" /> Enregistrer prix de base
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Field label="Marge (connection fee)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={selBase.connectionFeeAmount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value || '0');
                  setBase((prev) => {
                    const next = { ...prev };
                    const provider = next[service][currency].providerAmount;
                    next[service][currency].connectionFeeAmount = v;
                    next[service][currency].totalAmount = Math.round((v + provider) * 100) / 100;
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Part prestataire">
              <input
                type="number"
                min={0}
                step="0.01"
                value={selBase.providerAmount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value || '0');
                  setBase((prev) => {
                    const next = { ...prev };
                    const connection = next[service][currency].connectionFeeAmount;
                    next[service][currency].providerAmount = v;
                    next[service][currency].totalAmount = Math.round((connection + v) * 100) / 100;
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Total client">
              <input
                type="number"
                min={0}
                step="0.01"
                value={selBase.totalAmount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value || '0');
                  setBase((prev) => {
                    const next = { ...prev };
                    const connection = next[service][currency].connectionFeeAmount;
                    next[service][currency].totalAmount = v;
                    next[service][currency].providerAmount = Math.max(0, Math.round((v - connection) * 100) / 100);
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Durée (min)">
              <input
                type="number"
                min={0}
                step="1"
                value={selBase.duration}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0', 10);
                  setBase((prev) => {
                    const next = { ...prev };
                    next[service][currency].duration = Math.max(0, v);
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <div className="flex items-end">
              {errorSumBase ? (
                <div className="text-sm inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                  <X className="w-4 h-4 mr-1" /> Somme incohérente
                </div>
              ) : (
                <div className="text-sm inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <Check className="w-4 h-4 mr-1" /> Somme cohérente
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloc Prix promotionnel */}
        <div className="bg-white border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Prix promotionnel (affiché comme “prix barré”)</h2>
            <button
              onClick={() => void savePromo()}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" /> Enregistrer prix promo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Field label="Activer la promo">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={selPromo.enabled}
                  onChange={(v) =>
                    setPromo((prev) => {
                      const next = { ...prev };
                      next[service][currency].enabled = v;
                      return next;
                    })
                  }
                />
                <span className="text-sm text-gray-700">{selPromo.enabled ? 'Active' : 'Inactive'}</span>
              </div>
            </Field>

            <Field label="Début">
              <input
                type="datetime-local"
                value={
                  toDate(selPromo.startsAt)
                    ? new Date(toDate(selPromo.startsAt)!.getTime() - toDate(selPromo.startsAt)!.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setPromo((prev) => {
                    const next = { ...prev };
                    next[service][currency].startsAt = e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : null;
                    return next;
                  })
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>

            <Field label="Fin">
              <input
                type="datetime-local"
                value={
                  toDate(selPromo.endsAt)
                    ? new Date(toDate(selPromo.endsAt)!.getTime() - toDate(selPromo.endsAt)!.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  setPromo((prev) => {
                    const next = { ...prev };
                    next[service][currency].endsAt = e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : null;
                    return next;
                  })
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Field label="Marge (promo)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={selPromo.connectionFeeAmount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value || '0');
                  setPromo((prev) => {
                    const next = { ...prev };
                    const prov = next[service][currency].providerAmount;
                    next[service][currency].connectionFeeAmount = v;
                    next[service][currency].totalAmount = Math.round((v + prov) * 100) / 100;
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Part prestataire (promo)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={selPromo.providerAmount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value || '0');
                  setPromo((prev) => {
                    const next = { ...prev };
                    const con = next[service][currency].connectionFeeAmount;
                    next[service][currency].providerAmount = v;
                    next[service][currency].totalAmount = Math.round((con + v) * 100) / 100;
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Total client (promo)">
              <input
                type="number"
                min={0}
                step="0.01"
                value={selPromo.totalAmount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value || '0');
                  setPromo((prev) => {
                    const next = { ...prev };
                    const con = next[service][currency].connectionFeeAmount;
                    next[service][currency].totalAmount = v;
                    next[service][currency].providerAmount = Math.max(0, Math.round((v - con) * 100) / 100);
                    return next;
                  });
                }}
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Label (affichage)">
              <input
                type="text"
                value={selPromo.label}
                onChange={(e) =>
                  setPromo((prev) => {
                    const next = { ...prev };
                    next[service][currency].label = e.target.value;
                    return next;
                  })
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Prix barré – cible (strikeTargets)">
              <input
                type="text"
                value={selPromo.strikeTargets}
                onChange={(e) =>
                  setPromo((prev) => {
                    const next = { ...prev };
                    next[service][currency].strikeTargets = e.target.value || 'default';
                    return next;
                  })
                }
                className="w-full border rounded-md px-3 py-2"
              />
            </Field>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {errorSumPromo ? (
              <div className="text-sm inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                <X className="w-4 h-4 mr-1" /> Somme incohérente (promo)
              </div>
            ) : (
              <div className="text-sm inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                <Check className="w-4 h-4 mr-1" /> Somme cohérente (promo)
              </div>
            )}
            {errorDates ? (
              <div className="text-sm inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                <Calendar className="w-4 h-4 mr-1" /> Période invalide
              </div>
            ) : null}
          </div>

          {/* Résumé visuel base vs promo */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-gray-500">Base</div>
              <PriceBadge value={selBase.totalAmount} currency={currency} />
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-gray-500">Prix promotionnel</div>
              <PriceBadge value={selPromo.totalAmount} currency={currency} strike />
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-gray-500">Écart</div>
              <div className="text-lg font-semibold text-gray-900">
                {(selBase.totalAmount - selPromo.totalAmount).toFixed(2)} {currency.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Prévisualisation */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Prévisualisation (comme le back)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-3">
              <Field label="Coupon (optionnel)">
                <input
                  type="text"
                  value={previewCoupon}
                  onChange={(e) => setPreviewCoupon(e.target.value.toUpperCase())}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="WELCOME10"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Promo active maintenant ?</div>
              <div className={`inline-flex items-center px-2 py-1 rounded ${isPromoActiveNow ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                {isPromoActiveNow ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                {isPromoActiveNow ? 'Oui' : 'Non'}
              </div>
            </div>
            <div>
              <button
                onClick={() => void runPreview()}
                className="inline-flex items-center justify-center w-full px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700"
              >
                <Eye className="w-4 h-4 mr-2" /> Calculer
              </button>
            </div>
          </div>

          {previewTotal !== null && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-700">{previewDetails}</div>
              <div className="text-lg font-semibold">
                Total final: {previewTotal.toFixed(2)} {currency.toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Aide rapide */}
        <div className="mt-6 text-xs text-gray-500">
          <p>Astuce : “Prix promotionnel” est ce que le client verra comme <em>prix barré</em> sur le front.</p>
          <p>Les <strong>codes promo</strong> se gèrent dans <code>/admin/promos</code> et peuvent se cumuler selon
            la case “Coupons cumulables par défaut” ou la case “Cumuler avec coupon” du prix promo.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPricing;
