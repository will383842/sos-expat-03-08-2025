// firebase/functions/src/utils/paymentValidators.ts

import * as admin from 'firebase-admin';

/**
 * Configuration RÉELLE des montants - MODIFIABLE depuis l'admin
 * (uniquement en termes de frais de mise en relation)
 */
export const DEFAULT_PRICING_CONFIG = {
  lawyer: {
    eur: {
      totalAmount: 49,           // Prix total payé par le client
      connectionFeeAmount: 19,   // ✅ Frais fixes de mise en relation
      providerAmount: 30,        // ✅ Ce que reçoit le prestataire (49 - 19 = 30)
      duration: 25,
      currency: 'eur'
    },
    usd: {
      totalAmount: 55,           // Prix total payé par le client
      connectionFeeAmount: 25,   // ✅ Frais fixes de mise en relation
      providerAmount: 30,        // ✅ Ce que reçoit le prestataire (55 - 25 = 30)
      duration: 25,
      currency: 'usd'
    }
  },
  expat: {
    eur: {
      totalAmount: 19,           // Prix total payé par le client
      connectionFeeAmount: 9,    // ✅ Frais fixes de mise en relation
      providerAmount: 10,        // ✅ Ce que reçoit le prestataire (19 - 9 = 10)
      duration: 35,
      currency: 'eur'
    },
    usd: {
      totalAmount: 25,           // Prix total payé par le client
      connectionFeeAmount: 15,   // ✅ Frais fixes de mise en relation
      providerAmount: 10,        // ✅ Ce que reçoit le prestataire (25 - 15 = 10)
      duration: 35,
      currency: 'usd'
    }
  }
} as const;

/**
 * Limites de validation par devise
 */
export const PAYMENT_LIMITS = {
  eur: {
    MIN_AMOUNT: 5,
    MAX_AMOUNT: 500,
    MAX_DAILY: 2000,
    TOLERANCE: 10
  },
  usd: {
    MIN_AMOUNT: 6,
    MAX_AMOUNT: 600,
    MAX_DAILY: 2400,
    TOLERANCE: 12
  },
  SPLIT_TOLERANCE_CENTS: 1
} as const;

/**
 * Convertit un montant vers des centimes selon la devise
 */
export function toCents(amount: number, currency: 'eur' | 'usd' = 'eur'): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Montant invalide: ${amount}`);
  }
  // Arrondir d'abord à 2 décimales puis convertir
  const rounded = Math.round(amount * 100) / 100;
  return Math.round(rounded * 100);
}

/**
 * Convertit des centimes vers l'unité principale selon la devise
 */
export function fromCents(cents: number, currency: 'eur' | 'usd' = 'eur'): number {
  if (typeof cents !== 'number' || isNaN(cents)) {
    throw new Error(`Montant en centimes invalide: ${cents}`);
  }
  return Math.round(cents) / 100;
}

/**
 * Garde les anciennes fonctions pour compatibilité
 */
export const eurosToCents = (euros: number) => toCents(euros, 'eur');
export const centsToEuros = (cents: number) => fromCents(cents, 'eur');

/**
 * Formate un montant selon la devise
 */
export function formatAmount(amount: number, currency: 'eur' | 'usd' = 'eur'): string {
  return new Intl.NumberFormat(currency === 'eur' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Garde l'ancienne fonction pour compatibilité
 */
export const formatEuros = (euros: number) => formatAmount(euros, 'eur');

/**
 * Récupère la configuration de pricing depuis Firestore (avec cache)
 */
let pricingCache: any = null;
let pricingCacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getPricingConfig(
  type: 'lawyer' | 'expat',
  currency: 'eur' | 'usd' = 'eur',
  db?: admin.firestore.Firestore
): Promise<{
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
  currency: string;
}> {
  try {
    // Utiliser le cache si valide
    const now = Date.now();
    if (pricingCache && now < pricingCacheExpiry) {
      const cached = pricingCache[type]?.[currency];
      if (cached) return cached;
    }

    // Récupérer depuis Firestore si disponible
    if (db) {
      const configDoc = await db.collection('admin_config').doc('pricing').get();
      if (configDoc.exists) {
        const adminPricing = configDoc.data();

        // Mettre en cache
        pricingCache = adminPricing;
        pricingCacheExpiry = now + CACHE_DURATION;

        const adminConfig = adminPricing?.[type]?.[currency];
        
        // === GESTION DES OVERRIDES ACTIFS ===
        const ov = adminPricing?.overrides?.[type]?.[currency];
        const toMillis = (v: any) => (typeof v === 'number' ? v : (v?.seconds ? v.seconds * 1000 : undefined));
        const active = !!ov?.enabled
          && (!toMillis(ov?.startsAt) || now >= toMillis(ov?.startsAt)!)
          && (!toMillis(ov?.endsAt) || now <= toMillis(ov?.endsAt)!);

        if (active) {
          return {
            totalAmount: ov.totalAmount,
            connectionFeeAmount: ov.connectionFeeAmount || 0,
            providerAmount: Math.max(0, ov.totalAmount - (ov.connectionFeeAmount || 0)),
            duration: adminConfig?.duration ?? DEFAULT_PRICING_CONFIG[type][currency].duration,
            currency
          };
        }
        // === FIN GESTION DES OVERRIDES ===

        if (adminConfig && typeof adminConfig.totalAmount === 'number') {
          return {
            totalAmount: adminConfig.totalAmount,
            connectionFeeAmount: adminConfig.connectionFeeAmount || 0,
            providerAmount:
              adminConfig.providerAmount ??
              (adminConfig.totalAmount - (adminConfig.connectionFeeAmount || 0)),
            duration:
              adminConfig.duration ??
              DEFAULT_PRICING_CONFIG[type][currency].duration,
            currency
          };
        }
      }
    }

    // Fallback vers la config par défaut
    console.log(`💡 Utilisation config par défaut pour ${type}/${currency}`);
    return DEFAULT_PRICING_CONFIG[type][currency];

  } catch (error) {
    console.error('Erreur récupération pricing config:', error);
    // Fallback vers config par défaut en cas d'erreur
    return DEFAULT_PRICING_CONFIG[type][currency];
  }
}

/**
 * Valide qu'un montant est dans les limites acceptables selon la devise
 */
export function validateAmount(
  amount: number,
  type: 'lawyer' | 'expat',
  currency: 'eur' | 'usd' = 'eur'
): {
  valid: boolean;
  error?: string;
  warning?: string;
} {
  // Vérifications de base
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Montant invalide' };
  }

  const limits = PAYMENT_LIMITS[currency];
  const config = DEFAULT_PRICING_CONFIG[type][currency];

  if (amount < limits.MIN_AMOUNT) {
    return {
      valid: false,
      error: `Montant minimum ${limits.MIN_AMOUNT}${currency === 'eur' ? '€' : '$'}`
    };
  }

  if (amount > limits.MAX_AMOUNT) {
    return {
      valid: false,
      error: `Montant maximum ${limits.MAX_AMOUNT}${currency === 'eur' ? '€' : '$'}`
    };
  }

  // Cohérence avec le prix total attendu
  const expectedAmount = config.totalAmount;
  const difference = Math.abs(amount - expectedAmount);

  if (difference > limits.TOLERANCE) {
    return {
      valid: true,
      warning: `Montant inhabituel: ${formatAmount(amount, currency)} (attendu: ${formatAmount(expectedAmount, currency)})`
    };
  }

  return { valid: true };
}

/**
 * Calcule la répartition (frais de mise en relation / prestataire) selon la devise
 */
export function calculateSplit(
  totalAmount: number,
  type: 'lawyer' | 'expat',
  currency: 'eur' | 'usd' = 'eur'
): {
  totalCents: number;
  connectionFeeCents: number;
  providerCents: number;
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  currency: string;
  isValid: boolean;
} {
  const config = DEFAULT_PRICING_CONFIG[type][currency];

  // Montants en unité principale avec arrondi à 2 décimales
  const connectionFeeAmount = Math.round(config.connectionFeeAmount * 100) / 100;
  const providerAmount = Math.round((totalAmount - connectionFeeAmount) * 100) / 100;

  // Conversion en centimes
  const totalCents = toCents(totalAmount, currency);
  const connectionFeeCents = toCents(connectionFeeAmount, currency);
  const providerCents = toCents(providerAmount, currency);

  // Vérification de cohérence
  const sumCents = connectionFeeCents + providerCents;
  const isValid =
    Math.abs(sumCents - totalCents) <= PAYMENT_LIMITS.SPLIT_TOLERANCE_CENTS;

  if (!isValid) {
    console.error('⚠️ Incohérence dans la répartition:', {
      totalCents,
      connectionFeeCents,
      providerCents,
      sumCents,
      difference: sumCents - totalCents,
      currency
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
    isValid
  };
}

/**
 * Vérifie la cohérence d'une répartition existante selon la devise
 */
export function validateSplit(
  totalAmount: number,
  connectionFeeAmount: number,
  providerAmount: number,
  currency: 'eur' | 'usd' = 'eur'
): {
  valid: boolean;
  error?: string;
  difference?: number;
} {
  const sum = Math.round((connectionFeeAmount + providerAmount) * 100) / 100;
  const total = Math.round(totalAmount * 100) / 100;
  const difference = Math.abs(sum - total);

  if (difference > 0.01) { // Tolérance de 1 centime
    return {
      valid: false,
      error: `Répartition incohérente: ${formatAmount(sum, currency)} != ${formatAmount(total, currency)}`,
      difference
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
  currency: 'eur' | 'usd' = 'eur',
  db: admin.firestore.Firestore
): Promise<{
  allowed: boolean;
  currentTotal: number;
  limit: number;
  error?: string;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = admin.firestore.Timestamp.fromDate(today);

    const paymentsSnapshot = await db.collection('payments')
      .where('clientId', '==', userId)
      .where('createdAt', '>=', todayTimestamp)
      .where('currency', '==', currency)
      .where('status', 'in', ['succeeded', 'captured', 'processing'])
      .get();

    let currentTotal = 0;
    paymentsSnapshot.docs.forEach(doc => {
      const payment = doc.data();
      // Utiliser le montant dans l'unité principale
      const paymentAmount = payment.amount || fromCents(payment.amountCents || 0, currency);
      currentTotal += paymentAmount;
    });

    const limits = PAYMENT_LIMITS[currency];
    const newTotal = currentTotal + amount;
    const allowed = newTotal <= limits.MAX_DAILY;

    return {
      allowed,
      currentTotal,
      limit: limits.MAX_DAILY,
      error: allowed ? undefined : `Limite journalière dépassée: ${formatAmount(newTotal, currency)} / ${formatAmount(limits.MAX_DAILY, currency)}`
    };
  } catch (error) {
    console.error('Erreur vérification limite journalière:', error);
    // En cas d'erreur, on autorise par défaut (pour ne pas bloquer les paiements)
    return {
      allowed: true,
      currentTotal: 0,
      limit: PAYMENT_LIMITS[currency].MAX_DAILY
    };
  }
}

/**
 * Vérifie si un montant est suspect selon la devise
 */
export function isSuspiciousAmount(
  amount: number,
  type: 'lawyer' | 'expat',
  currency: 'eur' | 'usd' = 'eur',
  previousPayments: number[] = []
): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Montant très différent du prix total standard pour cette devise
  const expected = DEFAULT_PRICING_CONFIG[type][currency].totalAmount;
  const deviation = Math.abs(amount - expected) / expected;
  if (deviation > 0.5) { // 50% de déviation
    reasons.push(`Déviation importante du prix standard (${Math.round(deviation * 100)}%)`);
  }

  // Montant avec trop de décimales (tentative de manipulation)
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 2) {
    reasons.push(`Trop de décimales: ${decimals}`);
  }

  // Pattern de montants répétitifs suspects
  if (previousPayments.length >= 3) {
    const lastThree = previousPayments.slice(-3);
    if (lastThree.every(p => p === amount)) {
      reasons.push('Montants identiques répétés');
    }
  }

  // Montants ronds suspects pour ce type de service
  if (amount % 10 === 0 && amount !== expected) {
    reasons.push('Montant rond inhabituel');
  }

  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Log de transaction pour audit avec devise
 */
export async function logPaymentAudit(
  data: {
    paymentId: string;
    userId: string;
    amount: number;
    currency: 'eur' | 'usd';
    type: 'lawyer' | 'expat';
    action: 'create' | 'capture' | 'refund' | 'cancel';
    metadata?: Record<string, any>;
  },
  db: admin.firestore.Firestore
): Promise<void> {
  try {
    await db.collection('payment_audit').add({
      ...data,
      amountCents: toCents(data.amount, data.currency),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Erreur log audit:', error);
    // Ne pas bloquer le process si le log échoue
  }
}

/**
 * Génère un identifiant de paiement unique
 */
export function generatePaymentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `pay_${timestamp}_${random}`;
}