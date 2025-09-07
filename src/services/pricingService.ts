// src/services/pricingService.ts
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useEffect, useState } from "react";

/** Types */
export type Currency = "eur" | "usd";
export type ServiceType = "lawyer" | "expat";

// === ADD: overrides types
export type StrikeTarget = "provider" | "default" | "both";

export interface PriceOverride {
  enabled: boolean;
  totalAmount: number;
  connectionFeeAmount: number;
  label?: string;
  startsAt?: number | { seconds: number };
  endsAt?: number | { seconds: number };
  strikeTargets?: StrikeTarget;
  stackableWithCoupons?: boolean;
}
// === END

export interface ServiceConfig {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}

export interface PricingConfig {
  lawyer: { eur: ServiceConfig; usd: ServiceConfig };
  expat: { eur: ServiceConfig; usd: ServiceConfig };
  overrides?: {
    lawyer?: Partial<Record<Currency, PriceOverride>>;
    expat?: Partial<Record<Currency, PriceOverride>>;
    settings?: {
      stackableDefault?: boolean;
    };
  };
}

export interface FirestorePricingDoc {
  lawyer?: {
    eur?: Partial<ServiceConfig & { platformFeePercent?: number }>;
    usd?: Partial<ServiceConfig & { platformFeePercent?: number }>;
  };
  expat?: {
    eur?: Partial<ServiceConfig & { platformFeePercent?: number }>;
    usd?: Partial<ServiceConfig & { platformFeePercent?: number }>;
  };
  overrides?: {
    lawyer?: Partial<Record<Currency, PriceOverride>>;
    expat?: Partial<Record<Currency, PriceOverride>>;
    settings?: {
      stackableDefault?: boolean;
    };
  };
}

const PRICING_REF = doc(db, "admin_config", "pricing");

/** Cache mémoire (5 min) */
let _cache: { data: PricingConfig | null; ts: number } = { data: null, ts: 0 };
const CACHE_MS = 5 * 60 * 1000;

/** Fallback */
const DEFAULT_FALLBACK: PricingConfig = {
  lawyer: {
    eur: makeConfigFromBase({ base: 50, feePercent: 20, duration: 20, currency: "eur" }),
    usd: makeConfigFromBase({ base: 55, feePercent: 20, duration: 20, currency: "usd" }),
  },
  expat: {
    eur: makeConfigFromBase({ base: 50, feePercent: 20, duration: 30, currency: "eur" }),
    usd: makeConfigFromBase({ base: 55, feePercent: 20, duration: 30, currency: "usd" }),
  },
};

/** Utils */
function makeConfigFromBase(params: {
  base: number;
  feePercent: number;
  duration: number;
  currency: Currency | string;
}): ServiceConfig {
  const total = round2(params.base);
  const fee = round2((params.feePercent / 100) * total);
  const provider = Math.max(0, round2(total - fee));
  return {
    totalAmount: total,
    connectionFeeAmount: fee,
    providerAmount: provider,
    duration: params.duration,
    currency: params.currency,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isValidServiceConfig(c: unknown): c is ServiceConfig {
  if (!c || typeof c !== "object") return false;
  const cfg = c as ServiceConfig;
  return (
    typeof cfg.totalAmount === "number" &&
    typeof cfg.connectionFeeAmount === "number" &&
    typeof cfg.providerAmount === "number" &&
    typeof cfg.duration === "number" &&
    typeof cfg.currency === "string"
  );
}

function isValidPricingConfig(cfg: unknown): cfg is PricingConfig {
  if (!cfg || typeof cfg !== "object") return false;
  const c = cfg as PricingConfig;
  return (
    isValidServiceConfig(c.lawyer?.eur) &&
    isValidServiceConfig(c.lawyer?.usd) &&
    isValidServiceConfig(c.expat?.eur) &&
    isValidServiceConfig(c.expat?.usd)
  );
}

/** Lecture Firestore */
export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  if (_cache.data && now - _cache.ts < CACHE_MS) return _cache.data;

  try {
    const snap = await getDoc(PRICING_REF);
    if (!snap.exists()) {
      _cache = { data: DEFAULT_FALLBACK, ts: now };
      return DEFAULT_FALLBACK;
    }

    const data = snap.data() as FirestorePricingDoc;
    const normalized = normalizeFirestoreDocument(data);

    if (!isValidPricingConfig(normalized)) {
      _cache = { data: DEFAULT_FALLBACK, ts: now };
      return DEFAULT_FALLBACK;
    }

    _cache = { data: normalized, ts: now };
    return normalized;
  } catch (err) {
    console.error("[pricingService] Firestore error:", err);
    _cache = { data: DEFAULT_FALLBACK, ts: now };
    return DEFAULT_FALLBACK;
  }
}

function normalizeFirestoreDocument(raw: FirestorePricingDoc): PricingConfig {
  const fromNode = (
    node: Partial<ServiceConfig & { platformFeePercent?: number }> | undefined,
    service: ServiceType,
    currency: Currency,
    defaultDuration: number
  ): ServiceConfig => {
    if (!node) return DEFAULT_FALLBACK[service][currency];

    if (typeof node.totalAmount === "number" && typeof node.platformFeePercent === "number") {
      return makeConfigFromBase({
        base: node.totalAmount,
        feePercent: node.platformFeePercent,
        duration: typeof node.duration === "number" ? node.duration : defaultDuration,
        currency,
      });
    }

    const total = round2(Number(node.totalAmount));
    const fee = round2(Number(node.connectionFeeAmount));
    const provider = Math.max(0, round2(Number(node.providerAmount ?? total - fee)));
    const duration = typeof node.duration === "number" ? node.duration : defaultDuration;

    const config: ServiceConfig = {
      totalAmount: total,
      connectionFeeAmount: fee,
      providerAmount: provider,
      duration,
      currency,
    };

    return isValidServiceConfig(config) ? config : DEFAULT_FALLBACK[service][currency];
  };

  const defaultDurations: Record<ServiceType, number> = { lawyer: 20, expat: 30 };

  return {
    lawyer: {
      eur: fromNode(raw?.lawyer?.eur, "lawyer", "eur", defaultDurations.lawyer),
      usd: fromNode(raw?.lawyer?.usd, "lawyer", "usd", defaultDurations.lawyer),
    },
    expat: {
      eur: fromNode(raw?.expat?.eur, "expat", "eur", defaultDurations.expat),
      usd: fromNode(raw?.expat?.usd, "expat", "usd", defaultDurations.expat),
    },
    overrides: raw?.overrides,
  };
}

export function clearPricingCache() {
  _cache = { data: null, ts: 0 };
}

/** Hook React */
export function usePricingConfig() {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await getPricingConfig();
      setPricing(cfg);
    } catch (e) {
      console.error("[usePricingConfig] load error:", e);
      setError(e instanceof Error ? e.message : "Erreur chargement pricing");
      setPricing(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { pricing, loading, error, reload };
}

/** Simple util */
export async function getServicePricing(
  serviceType: ServiceType,
  currency: Currency = "eur"
): Promise<ServiceConfig> {
  const cfg = await getPricingConfig();
  return cfg[serviceType][currency];
}

export async function calculateServiceAmounts(
  serviceType: ServiceType,
  currency: Currency = "eur"
) {
  const c = await getServicePricing(serviceType, currency);
  return {
    totalAmount: round2(c.totalAmount),
    connectionFeeAmount: round2(c.connectionFeeAmount),
    providerAmount: Math.max(0, round2(c.totalAmount - c.connectionFeeAmount)),
    duration: c.duration,
    currency: c.currency,
  };
}

export function detectUserCurrency(): Currency {
  try {
    const saved = localStorage.getItem("preferredCurrency") as Currency | null;
    if (saved === "eur" || saved === "usd") return saved;
    const nav = (navigator?.language || "").toLowerCase();
    return nav.match(/fr|de|es|it|pt|nl/) ? "eur" : "usd";
  } catch {
    return "eur";
  }
}

// === Overrides Helpers ===
function toMillis(v?: number | { seconds: number }): number | undefined {
  if (typeof v === "number") return v;
  if (v && typeof (v as any).seconds === "number") return (v as any).seconds * 1000;
  return undefined;
}

export function getEffectivePrice(
  cfg: PricingConfig,
  service: ServiceType,
  currency: Currency
) {
  const standard = cfg[service][currency];
  const ov = cfg.overrides?.[service]?.[currency];
  const now = Date.now();
  const active =
    !!ov?.enabled &&
    (!toMillis(ov.startsAt) || now >= toMillis(ov.startsAt)!) &&
    (!toMillis(ov.endsAt) || now <= toMillis(ov.endsAt)!);

  const price = active
    ? {
        ...standard,
        totalAmount: ov!.totalAmount,
        connectionFeeAmount: ov!.connectionFeeAmount,
        providerAmount: Math.max(0, ov!.totalAmount - ov!.connectionFeeAmount),
      }
    : standard;

  return { price, standard, override: active ? ov! : null };
}

// === New Mutators ===

/** Met à jour les champs de base (merge) */
export async function saveBasePricing(
  partial: Partial<FirestorePricingDoc>
): Promise<void> {
  await setDoc(PRICING_REF, partial, { merge: true });
  clearPricingCache();
}

/** Met à jour un override (merge) */
export async function saveOverride(
  service: ServiceType,
  currency: Currency,
  payload: Partial<PriceOverride>
): Promise<void> {
  const path = `overrides.${service}.${currency}`;
  await updateDoc(PRICING_REF, { [path]: payload });
  clearPricingCache();
}

/** Active/désactive le stackable par défaut */
export async function setStackableDefault(value: boolean): Promise<void> {
  await updateDoc(PRICING_REF, {
    "overrides.settings.stackableDefault": value,
  });
  clearPricingCache();
}

/** Simulation d’un total avec coupon (optionnel) */
export async function simulateTotal(params: {
  service: ServiceType;
  currency: Currency;
  coupon?: { type: "fixed" | "percentage"; amount: number; maxDiscount?: number };
}) {
  const { service, currency, coupon } = params;
  const cfg = await getPricingConfig();
  const { price } = getEffectivePrice(cfg, service, currency);

  let finalTotal = price.totalAmount;
  let discount = 0;

  if (coupon) {
    if (coupon.type === "fixed") {
      discount = Math.min(coupon.amount, finalTotal);
    } else {
      discount = (coupon.amount / 100) * finalTotal;
    }
    if (coupon.maxDiscount !== undefined) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    finalTotal = Math.max(0, round2(finalTotal - discount));
  }

  return {
    base: price,
    finalTotal: round2(finalTotal),
    discount: round2(discount),
  };
}
