// src/services/pricingService.ts (FRONTEND VERSION)

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useEffect, useState } from "react";

/** Types */
export type Currency = "eur" | "usd";
export type ServiceType = "lawyer" | "expat";

export interface ServiceConfig {
  totalAmount: number;          // Total payé par le client
  connectionFeeAmount: number;  // Nos frais (service fee)
  providerAmount: number;       // Net prestataire
  duration: number;             // minutes
  currency: string;             // "eur" | "usd"
}

export interface PricingConfig {
  lawyer: { eur: ServiceConfig; usd: ServiceConfig };
  expat:  { eur: ServiceConfig; usd: ServiceConfig };
}

/** Source de vérité Firestore */
const PRICING_REF = doc(db, "admin_config", "pricing");

// Cache mémoire (5 min)
let _cache: { data: PricingConfig | null; ts: number } = { data: null, ts: 0 };
const CACHE_MS = 5 * 60 * 1000;

/** Secours demandé
 * Avocat : total 49€/55$, frais 19€/25$, durée 20 min
 * Expat  : total 19€/25$, frais  9€/15$, durée 30 min
 */
const FALLBACK: PricingConfig = {
  lawyer: {
    eur: { totalAmount: 49, connectionFeeAmount: 19, providerAmount: 49 - 19, duration: 20, currency: "eur" },
    usd: { totalAmount: 55, connectionFeeAmount: 25, providerAmount: 55 - 25, duration: 20, currency: "usd" },
  },
  expat: {
    eur: { totalAmount: 19, connectionFeeAmount: 9,  providerAmount: 19 - 9,  duration: 30, currency: "eur" },
    usd: { totalAmount: 25, connectionFeeAmount: 15, providerAmount: 25 - 15, duration: 30, currency: "usd" },
  },
};

/** Normalisation / merge admin + fallback (si admin partiel) */
function normalizeAndMerge(adminData: any): PricingConfig {
  const base = structuredClone(FALLBACK) as PricingConfig;

  const apply = (role: ServiceType, cur: Currency, src: any) => {
    if (!src) return; // garde fallback
    const total = Number(src.totalAmount);
    const fee   = Number(src.connectionFeeAmount);
    const dur   = Number(src.duration);
    const curStr = (src.currency ?? cur) as string;

    // si total/fee fournis, on recalcule providerAmount de façon sûre
    const okNumbers = Number.isFinite(total) && Number.isFinite(fee) && Number.isFinite(dur);
    if (okNumbers) {
      base[role][cur] = {
        totalAmount: total,
        connectionFeeAmount: fee,
        providerAmount: Math.max(0, Math.round((total - fee) * 100) / 100),
        duration: dur,
        currency: curStr,
      };
    }
  };

  try {
    apply("lawyer", "eur", adminData?.lawyer?.eur);
    apply("lawyer", "usd", adminData?.lawyer?.usd);
    apply("expat",  "eur", adminData?.expat?.eur);
    apply("expat",  "usd", adminData?.expat?.usd);
  } catch {
    // en cas d’admin cassé, on retourne le FALLBACK intégral
    return FALLBACK;
  }

  return base;
}

/** Validation minimale (après merge) */
function isValidServiceConfig(c: any): c is ServiceConfig {
  return c && typeof c.totalAmount === "number" &&
    typeof c.connectionFeeAmount === "number" &&
    typeof c.providerAmount === "number" &&
    typeof c.duration === "number" &&
    typeof c.currency === "string";
}
function isValidPricingConfig(cfg: any): cfg is PricingConfig {
  try {
    return cfg && cfg.lawyer && cfg.expat &&
      isValidServiceConfig(cfg.lawyer?.eur) &&
      isValidServiceConfig(cfg.lawyer?.usd) &&
      isValidServiceConfig(cfg.expat?.eur) &&
      isValidServiceConfig(cfg.expat?.usd);
  } catch { return false; }
}

/** Fetch + cache avec secours */
export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  if (_cache.data && now - _cache.ts < CACHE_MS) return _cache.data;

  try {
    const snap = await getDoc(PRICING_REF);
    if (!snap.exists()) {
      _cache = { data: FALLBACK, ts: now };
      return FALLBACK;
    }
    const merged = normalizeAndMerge(snap.data());
    if (!isValidPricingConfig(merged)) {
      _cache = { data: FALLBACK, ts: now };
      return FALLBACK;
    }
    _cache = { data: merged, ts: now };
    return merged;
  } catch {
    _cache = { data: FALLBACK, ts: now };
    return FALLBACK;
  }
}
export function clearPricingCache() { _cache = { data: null, ts: 0 }; }

/** Hook React pratique */
export function usePricingConfig() {
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true); setError(null);
    try { setPricing(await getPricingConfig()); }
    catch (e: any) { setError(e?.message ?? "Erreur chargement pricing"); setPricing(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);
  return { pricing, loading, error, reload };
}

/** Utilitaires */
export async function getServicePricing(serviceType: ServiceType, currency: Currency = "eur"): Promise<ServiceConfig> {
  const cfg = await getPricingConfig();
  return cfg[serviceType][currency];
}

/** API centrale pour CallCheckout/Wrapper */
export async function calculateServiceAmounts(serviceType: ServiceType, currency: Currency = "eur") {
  const c = await getServicePricing(serviceType, currency);
  // sécurité : garantis les arrondis
  const total       = Math.round(c.totalAmount * 100) / 100;
  const fee         = Math.round(c.connectionFeeAmount * 100) / 100;
  const providerNet = Math.max(0, Math.round((total - fee) * 100) / 100);
  return {
    totalAmount: total,
    connectionFeeAmount: fee,
    providerAmount: providerNet,
    duration: c.duration,
    currency: c.currency,
  };
}

/** Détection devise côté navigateur (inchangé) */
export function detectUserCurrency(): Currency {
  try {
    const saved = localStorage.getItem("preferredCurrency") as Currency | null;
    if (saved === "eur" || saved === "usd") return saved;
    const nav = (navigator?.language || "").toLowerCase();
    return nav.includes("fr") || nav.includes("de") || nav.includes("es") || nav.includes("it") || nav.includes("pt") || nav.includes("nl")
      ? "eur" : "usd";
  } catch { return "eur"; }
}
