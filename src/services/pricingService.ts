// src/services/pricingService.ts (FRONTEND VERSION — STRICT TYPAGE)
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useEffect, useState } from "react";

/** Types */
export type Currency = "eur" | "usd";
export type ServiceType = "lawyer" | "expat";

export interface ServiceConfig {
  /** Total payé par le client (unités de devise, ex: 50.00) */
  totalAmount: number;
  /** Frais de service plateforme (même unité que totalAmount) */
  connectionFeeAmount: number;
  /** Montant net pour le prestataire (total - fees) */
  providerAmount: number;
  /** Durée de la prestation en minutes */
  duration: number;
  /** "eur" | "usd" */
  currency: string;
}

export interface PricingConfig {
  lawyer: { eur: ServiceConfig; usd: ServiceConfig };
  expat: { eur: ServiceConfig; usd: ServiceConfig };
}

/** Firestore: structure attendue */
export interface FirestorePricingDoc {
  lawyer?: { eur?: Partial<ServiceConfig & { platformFeePercent?: number }>; usd?: Partial<ServiceConfig & { platformFeePercent?: number }> };
  expat?: { eur?: Partial<ServiceConfig & { platformFeePercent?: number }>; usd?: Partial<ServiceConfig & { platformFeePercent?: number }> };
}

/** Source de vérité Firestore */
const PRICING_REF = doc(db, "admin_config", "pricing");

/** Cache mémoire (5 min) */
let _cache: { data: PricingConfig | null; ts: number } = { data: null, ts: 0 };
const CACHE_MS = 5 * 60 * 1000;

/**
 * ✅ Fallback unique (exigence projet)
 */
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

/** Utilitaire pour construire un ServiceConfig à partir d’un prix de base + % fee */
function makeConfigFromBase(params: {
  base: number; // total payé par le client
  feePercent: number; // ex: 20 (= 20%)
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

/** Arrondi bancaire simple à 2 décimales */
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Validation stricte d’un ServiceConfig */
function isValidServiceConfig(c: unknown): c is ServiceConfig {
  if (!c || typeof c !== "object") return false;
  const cfg = c as ServiceConfig;
  return (
    typeof cfg.totalAmount === "number" &&
    typeof cfg.connectionFeeAmount === "number" &&
    typeof cfg.providerAmount === "number" &&
    typeof cfg.duration === "number" &&
    typeof cfg.currency === "string" &&
    Number.isFinite(cfg.totalAmount) &&
    Number.isFinite(cfg.connectionFeeAmount) &&
    Number.isFinite(cfg.providerAmount) &&
    Number.isFinite(cfg.duration)
  );
}

/** Validation stricte d’un PricingConfig complet */
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

/**
 * Lecture Firestore (sans merge partiel).
 */
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

/**
 * Normalise le document Firestore quel que soit le format retenu côté admin.
 */
function normalizeFirestoreDocument(raw: FirestorePricingDoc): PricingConfig {
  const fromNode = (
    node: Partial<ServiceConfig & { platformFeePercent?: number }> | undefined,
    service: ServiceType,
    currency: Currency,
    defaultDuration: number
  ): ServiceConfig => {
    if (!node) {
      return DEFAULT_FALLBACK[service][currency];
    }

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

/** Utilitaire simple pour récupérer le pricing d’un service+devise */
export async function getServicePricing(
  serviceType: ServiceType,
  currency: Currency = "eur"
): Promise<ServiceConfig> {
  const cfg = await getPricingConfig();
  return cfg[serviceType][currency];
}

/** API centrale pour CallCheckout/Wrapper */
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

/** Détection devise côté navigateur */
export function detectUserCurrency(): Currency {
  try {
    const saved = localStorage.getItem("preferredCurrency") as Currency | null;
    if (saved === "eur" || saved === "usd") return saved;
    const nav = (navigator?.language || "").toLowerCase();
    return nav.includes("fr") ||
      nav.includes("de") ||
      nav.includes("es") ||
      nav.includes("it") ||
      nav.includes("pt") ||
      nav.includes("nl")
      ? "eur"
      : "usd";
  } catch {
    return "eur";
  }
}
