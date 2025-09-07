// firebase/functions/src/utils/paymentValidators.ts

import * as admin from 'firebase-admin';

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */
export type Currency = 'eur' | 'usd';
export type ServiceType = 'lawyer' | 'expat';

export interface PricingEntry {
  totalAmount: number;           // Prix total payé par le client (unité principale)
  connectionFeeAmount: number;   // Frais de mise en relation (unité principale)
  providerAmount: number;        // Montant prestataire (unité principale)
  duration: number;              // Durée en minutes
  currency: Currency;
}

export type PricingTable = {
  [K in ServiceType]: Record<Currency, PricingEntry>
};

export interface PricingOverride {
  enabled?: boolean;
  startsAt?: admin.firestore.Timestamp | number | { seconds?: number };
  endsAt?: admin.firestore.Timestamp | number | { seconds?: number };
  totalAmount: number;
  connectionFeeAmount?: number;
  providerAmount?: number; // facultatif: si absent, on déduit total - connectionFee
  stackableWithCoupons?: boolean;
}

export interface AdminPricingOverrides {
  settings?: { stackableDefault?: boolean; [k: string]: unknown };
  lawyer?: Partial<Record<Currency, PricingOverride>>;
  expat?: Partial<Record<Currency, PricingOverride>>;
  [k: string]: unknown;
}

export interface AdminPricingDoc {
  lawyer?: Partial<Record<Currency, Partial<PricingEntry>>>;
  expat?: Partial<Record<Currency, Partial<PricingEntry>>>;
  overrides?: AdminPricingOverrides;
  [k: string]: unknown;
}

/* ────────────────────────────────────────────────────────────────────────────
   Configuration par défaut (modifiable dans l'admin)
   ──────────────────────────────────────────────────────────────────────────── */
export const DEFAULT_PRICING_CONFIG: PricingTable = {
  lawyer: {
    eur: {
      totalAmount: 49,
      connectionFeeAmount: 19,
      providerAmount: 30,
      duration: 25,
      currency: 'eur',
    },
    usd: {
      totalAmount: 55,
      connectionFeeAmount: 25,
      providerAmount: 30,
      duration: 25,
      currency: 'usd',
    },
  },
  expat: {
    eur: {
      totalAmount: 19,
      connectionFeeAmount: 9,
      providerAmount: 10,
      duration: 35,
      currency: 'eur',
    },
    usd: {
      totalAmount: 25,
      connectionFeeAmount: 15,
      providerAmount: 10,
      duration: 35,
      currency: 'usd',
    },
  },
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   Limites de validation par devise
   ──────────────────────────────────────────────────────────────────────────── */
export const PAYMENT_LIMITS = {
  eur: { MIN_AMOUNT: 5, MAX_AMOUNT: 500, MAX_DAILY: 2000, TOLERANCE: 10 },
  usd: { MIN_AMOUNT: 6, MAX_AMOUNT: 600, MAX_DAILY: 2400, TOLERANCE: 12 },
  SPLIT_TOLERANCE_CENTS: 1,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   Helpers monétaires
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Convertit un montant (unité principale) en centimes selon la devise.
 * On centralise l'arrondi et on exploite le paramètre `currency`
 * (prêt pour d’autres devises avec un nombre de décimales différent).
 */
export function toCents(amount: number, currency: Currency = 'eur'): number {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new Error(`Montant invalide: ${amount}`);
  }
  const decimals = currency === 'usd' ? 2 : 2; // évolutif si d'autres devises
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor);
}

/**
 * Convertit des centimes vers l’unité principale selon la devise.
 */
export function fromCents(cents: number, currency: Currency = 'eur'): number {
  if (typeof cents !== 'number' || Number.isNaN(cents)) {
    throw new Error(`Montant en centimes invalide: ${cents}`);
  }
  const decimals = currency === 'usd' ? 2 : 2;
  const factor = Math.pow(10, decimals);
  // On garde un arrondi propre à `decimals` pour éviter des flottants bizarres
  return Math.round((cents / factor) * factor) / factor;
}

/** Garde les anciennes fonctions pour compatibilité */
export const eurosToCents = (euros: number) => toCents(euros, 'eur');
export const centsToEuros = (cents: number) => fromCents(cents, 'eur');

/**
 * Formate un montant selon la devise
 */
export function formatAmount(amount: number, currency: Currency = 'eur'): string {
  return new Intl.NumberFormat(currency === 'eur' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compatibilité historique */
export const formatEuros = (euros: number) => formatAmount(euros, 'eur');

/* ────────────────────────────────────────────────────────────────────────────
   Lecture configuration pricing (avec cache)
   ──────────────────────────────────────────────────────────────────────────── */
type PricingDocumentCache = AdminPricingDoc | null;

let pricingCache: PricingDocumentCache = null;
let pricingCacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function toMillis(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  // Firestore Timestamp
  if (v && typeof v === 'object') {
    const maybeTs = v as { seconds?: number; toDate?: () => Date };
    if (typeof maybeTs.toDate === 'function') {
      try { return maybeTs.toDate()!.getTime(); } catch { /* ignore */ }
    }
    if (typeof maybeTs.seconds === 'number') {
      return maybeTs.seconds * 1000;
    }
  }
  return undefined;
}

export async function getPricingConfig(
  type: ServiceType,
  currency: Currency = 'eur',
  db?: admin.firestore.Firestore
): Promise<PricingEntry> {
  try {
    const now = Date.now();

    // 1) Cache
    if (pricingCache && now < pricingCacheExpiry) {
      const cached = (pricingCache[type]?.[currency] as Partial<PriccingEntry> | undefined);
      if (cached && typeof cached.totalAmount === 'number') {
        return {
          totalAmount: cached.totalAmount,
          connectionFeeAmount: cached.connectionFeeAmount ?? 0,
          providerAmount:
            cached.providerAmount ?? (cached.totalAmount - (cached.connectionFeeAmount ?? 0)),
          duration: cached.duration ?? DEFAULT_PRICING_CONFIG[type][currency].duration,
          currency,
        };
      }
    }

    // 2) Firestore
    if (db) {
      const snap = await db.collection('admin_config').doc('pricing').get();
      if (snap.exists) {
        const adminPricing = snap.data() as AdminPricingDoc;

        pricingCache = adminPricing;
        pricingCacheExpiry = now + CACHE_DURATION;

        const adminCfg = adminPricing?.[type]?.[currency];

        // Overrides
        const ovTable =
          type === 'lawyer'
            ? adminPricing?.overrides?.lawyer
            : adminPricing?.overrides?.expat;

        const ov: PricingOverride | undefined = ovTable?.[currency];
        const active =
          ov?.enabled === true &&
          (toMillis(ov?.startsAt) ? now >= (toMillis(ov?.startsAt) as number) : true) &&
          (toMillis(ov?.endsAt) ? now <= (toMillis(ov?.endsAt) as number) : true);

        if (active && typeof ov?.totalAmount === 'number') {
          const total = ov.totalAmount;
          const conn = ov.connectionFeeAmount ?? 0;
          return {
            totalAmount: total,
            connectionFeeAmount: conn,
            providerAmount: typeof ov.providerAmount === 'number' ? ov.providerAmount : Math.max(0, total - conn),
            duration: adminCfg?.duration ?? DEFAULT_PRICING_CONFIG[type][currency].duration,
            currency,
          };
        }

        if (adminCfg && typeof adminCfg.totalAmount === 'number') {
          const total = adminCfg.totalAmount;
          const conn = adminCfg.connectionFeeAmount ?? 0;
          return {
            totalAmount: total,
            connectionFeeAmount: conn,
            providerAmount: typeof adminCfg.providerAmount === 'number' ? adminCfg.providerAmount : Math.max(0, total - conn),
            duration: adminCfg.duration ?? DEFAULT_PRICING_CONFIG[type][currency].duration,
            currency,
          };
        }
      }
    }

    // 3) Fallback
    // eslint-disable-next-line no-console
    console.log(`💡 Utilisation config par défaut pour ${type}/${currency}`);
    return DEFAULT_PRICING_CONFIG[type][currency];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Erreur récupération pricing config:', err);
    return DEFAULT_PRICING_CONFIG[type][currency];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Validations & calculs
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Valide qu'un montant est dans les limites acceptables selon la devise
 */
export function validateAmount(
  amount: number,
  type: ServiceType,
  currency: Currency = 'eur'
): { valid: boolean; error?: string; warning?: string } {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return { valid: false, error: 'Montant invalide' };
  }

  const limits = PAYMENT_LIMITS[currency];
  const config = DEFAULT_PRICING_CONFIG[type][currency];

  if (amount < limits.MIN_AMOUNT) {
    return { valid: false, error: `Montant minimum ${limits.MIN_AMOUNT}${currency === 'eur' ? '€' : '$'}` };
  }
  if (amount > limits.MAX_AMOUNT) {
    return { valid: false, error: `Montant maximum ${limits.MAX_AMOUNT}${currency === 'eur' ? '€' : '$'}` };
  }

  // Cohérence vis-à-vis du prix standard
  const expected = config.totalAmount;
  const difference = Math.abs(amount - expected);
  if (difference > limits.TOLERANCE) {
    return {
      valid: true,
      warning: `Montant inhabituel: ${formatAmount(amount, currency)} (attendu: ${formatAmount(expected, currency)})`,
    };
  }

  return { valid: true };
}

/**
 * Calcule la répartition (frais / prestataire) selon la devise
 */
export function calculateSplit(
  totalAmount: number,
  type: ServiceType,
  currency: Currency = 'eur'
): {
  totalCents: number;
  connectionFeeCents: number;
  providerCents: number;
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  currency: Currency;
  isValid: boolean;
} {
  const config = DEFAULT_PRICING_CONFIG[type][currency];

  const connectionFeeAmount = Math.round(config.connectionFeeAmount * 100) / 100;
  const providerAmount = Math.round((totalAmount - connectionFeeAmount) * 100) / 100;

  const totalCents = toCents(totalAmount, currency);
  const connectionFeeCents = toCents(connectionFeeAmount, currency);
  const providerCents = toCents(providerAmount, currency);

  const sumCents = connectionFeeCents + providerCents;
  const isValid = Math.abs(sumCents - totalCents) <= PAYMENT_LIMITS.SPLIT_TOLERANCE_CENTS;

  if (!isValid) {
    // eslint-disable-next-line no-console
    console.error('⚠️ Incohérence dans la répartition:', {
      totalCents, connectionFeeCents, providerCents, sumCents,
      difference: sumCents - totalCents, currency,
    });
  }

  return {
    totalCents,
    connectionFeeCents,
    providerCents,
    totalAmount,
    connectionFeeAmount,
    providerAmount,
    currency,
    isValid,
  };
}

/**
 * Vérifie la cohérence d'une répartition existante selon la devise
 */
export function validateSplit(
  totalAmount: number,
  connectionFeeAmount: number,
  providerAmount: number,
  currency: Currency = 'eur'
): { valid: boolean; error?: string; difference?: number } {
  const sum = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
  const total = Math.round(totalAmount * 100) / 100;
  const difference = Math.abs(sum - total);

  if (difference > 0.01) {
    return {
      valid: false,
      error: `Répartition incohérente: ${formatAmount(sum, currency)} != ${formatAmount(total, currency)}`,
      difference,
    };
  }
  return { valid: true };
}

/**
 * Vérifie la limite journalière d'un utilisateur selon la devise
 */
export async function checkDailyLimit(
  userId: string,
  amount: number,
  currency: Currency = 'eur',
  db: admin.firestore.Firestore
): Promise<{ allowed: boolean; currentTotal: number; limit: number; error?: string }> {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTs = admin.firestore.Timestamp.fromDate(today);

    const snap = await db
      .collection('payments')
      .where('clientId', '==', userId)
      .where('createdAt', '>=', todayTs)
      .where('currency', '==', currency)
      .where('status', 'in', ['succeeded', 'captured', 'processing'])
      .get();

    let currentTotal = 0;
    snap.docs.forEach(d => {
      const payment = d.data() as Partial<{ amount: number; amountCents: number }>;
      const paymentAmount =
        typeof payment.amount === 'number'
          ? payment.amount
          : fromCents(typeof payment.amountCents === 'number' ? payment.amountCents : 0, currency);
      currentTotal += paymentAmount;
    });

    const limits = PAYMENT_LIMITS[currency];
    const newTotal = currentTotal + amount;
    const allowed = newTotal <= limits.MAX_DAILY;

    return {
      allowed,
      currentTotal,
      limit: limits.MAX_DAILY,
      error: allowed
        ? undefined
        : `Limite journalière dépassée: ${formatAmount(newTotal, currency)} / ${formatAmount(limits.MAX_DAILY, currency)}`,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Erreur vérification limite journalière:', err);
    return { allowed: true, currentTotal: 0, limit: PAYMENT_LIMITS[currency].MAX_DAILY };
  }
}

/**
 * Détermine si un montant paraît suspect
 */
export function isSuspiciousAmount(
  amount: number,
  type: ServiceType,
  currency: Currency = 'eur',
  previousPayments: number[] = []
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const expected = DEFAULT_PRICING_CONFIG[type][currency].totalAmount;
  const deviation = Math.abs(amount - expected) / expected;
  if (deviation > 0.5) reasons.push(`Déviation importante du prix standard (${Math.round(deviation * 100)}%)`);

  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 2) reasons.push(`Trop de décimales: ${decimals}`);

  if (previousPayments.length >= 3) {
    const lastThree = previousPayments.slice(-3);
    if (lastThree.every((p) => p === amount)) reasons.push('Montants identiques répétés');
  }

  if (amount % 10 === 0 && amount !== expected) reasons.push('Montant rond inhabituel');

  return { suspicious: reasons.length > 0, reasons };
}

/**
 * Log d’audit (types stricts pour metadata)
 */
export async function logPaymentAudit(
  data: {
    paymentId: string;
    userId: string;
    amount: number;
    currency: Currency;
    type: ServiceType;
    action: 'create' | 'capture' | 'refund' | 'cancel';
    metadata?: Record<string, string | number | boolean | null | undefined>;
  },
  db: admin.firestore.Firestore
): Promise<void> {
  try {
    await db.collection('payment_audit').add({
      ...data,
      amountCents: toCents(data.amount, data.currency),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Erreur log audit:', err);
  }
}

/**
 * Génère un identifiant de paiement unique
 */
export function generatePaymentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `pay_${timestamp}_${random}`;
}

/* Petite aide locale pour éviter l’erreur de type dans getPricingConfig (cache) */
type PriccingEntry = {
  totalAmount: number;
  connectionFeeAmount?: number;
  providerAmount?: number;
  duration?: number;
};
