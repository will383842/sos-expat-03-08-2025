// src/services/pricingService.ts (FRONTEND VERSION)
// Remplace l'ancienne version qui importait `firebase-admin/*` (backend uniquement)

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useEffect, useState } from "react";

/** Types */
export type Currency = "eur" | "usd";
export type ServiceType = "lawyer" | "expat";

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
}

/** Source de vérité Firestore */
const PRICING_REF = doc(db, "admin_config", "pricing");

// Cache mémoire (5 min)
let _cache: { data: PricingConfig | null; ts: number } = { data: null, ts: 0 };
const CACHE_MS = 5 * 60 * 1000;

export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  if (_cache.data && now - _cache.ts < CACHE_MS) return _cache.data;

  const snap = await getDoc(PRICING_REF);
  if (!snap.exists()) throw new Error("Config pricing absente (admin_config/pricing).");

  const data = snap.data() as PricingConfig;
  if (!isValidPricingConfig(data)) throw new Error("Config pricing invalide.");
  _cache = { data, ts: now };
  return data;
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

export async function calculateServiceAmounts(serviceType: ServiceType, currency: Currency = "eur") {
  const c = await getServicePricing(serviceType, currency);
  return {
    totalAmount: c.totalAmount,
    connectionFeeAmount: c.connectionFeeAmount,
    providerAmount: c.providerAmount,
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
    return nav.includes("fr") || nav.includes("de") || nav.includes("es") || nav.includes("it") || nav.includes("pt") || nav.includes("nl")
      ? "eur" : "usd";
  } catch { return "eur"; }
}

/** Validation */
function isValidPricingConfig(cfg: any): cfg is PricingConfig {
  try {
    return cfg && cfg.lawyer && cfg.expat &&
      isValidServiceConfig(cfg.lawyer?.eur) &&
      isValidServiceConfig(cfg.lawyer?.usd) &&
      isValidServiceConfig(cfg.expat?.eur) &&
      isValidServiceConfig(cfg.expat?.usd);
  } catch { return false; }
}
function isValidServiceConfig(c: any): c is ServiceConfig {
  return c && typeof c.totalAmount === "number" &&
    typeof c.connectionFeeAmount === "number" &&
    typeof c.providerAmount === "number" &&
    typeof c.duration === "number" &&
    typeof c.currency === "string";
}
