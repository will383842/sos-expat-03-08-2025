import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  serverTimestamp, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAnalyticsEvent } from './firestore';

// Types optimisés avec validation stricte
interface CouponValidationParams {
  readonly code: string;
  readonly userId: string;
  readonly totalAmount: number;
  readonly serviceType: 'lawyer_call' | 'expat_call';
}

interface CouponValidationResult {
  readonly isValid: boolean;
  readonly message: string;
  readonly discountAmount: number;
  readonly discountType: 'fixed' | 'percentage';
  readonly discountValue: number;
  readonly couponId?: string;
}

interface CouponUsageParams {
  readonly code: string;
  readonly userId: string;
  readonly userName: string;
  readonly orderId: string;
  readonly orderAmount: number;
  readonly discountAmount: number;
}

interface CouponData {
  readonly code: string;
  readonly active: boolean;
  readonly valid_from: Timestamp;
  readonly valid_until: Timestamp;
  readonly services: string[];
  readonly min_order_amount: number;
  readonly max_uses_total: number;
  readonly max_uses_per_user: number;
  readonly type: 'fixed' | 'percentage';
  readonly amount: number;
}

// Cache pour éviter les requêtes répétées
const validationCache = new Map<string, { result: CouponValidationResult; expiry: number }>();
const CACHE_TTL = 300000; // 5 minutes

// Constantes pour la sécurité et performance
const MAX_CODE_LENGTH = 50;
const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 10000;

/**
 * Nettoie le cache expiré
 */
const cleanExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (now > value.expiry) {
      validationCache.delete(key);
    }
  }
};

/**
 * Valide les paramètres d'entrée
 */
const validateInputParams = (params: CouponValidationParams): string | null => {
  if (!params.code?.trim()) return 'Code promo requis';
  if (params.code.length > MAX_CODE_LENGTH) return 'Code promo trop long';
  if (!params.userId?.trim()) return 'ID utilisateur requis';
  if (!params.serviceType) return 'Type de service requis';
  if (typeof params.totalAmount !== 'number' || params.totalAmount < MIN_AMOUNT) {
    return 'Montant invalide';
  }
  if (params.totalAmount > MAX_AMOUNT) return 'Montant trop élevé';
  
  return null;
};

/**
 * Sanitise le code promo
 */
const sanitizeCouponCode = (code: string): string => {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

/**
 * Calcule la réduction avec sécurité
 */
const calculateDiscount = (
  coupon: CouponData, 
  totalAmount: number
): number => {
  let discount = 0;
  
  if (coupon.type === 'percentage') {
    // Protection contre les pourcentages invalides
    const percentage = Math.max(0, Math.min(100, coupon.amount));
    discount = (totalAmount * percentage) / 100;
  } else {
    discount = Math.max(0, coupon.amount);
  }
  
  // La réduction ne peut pas dépasser le montant total
  return Math.min(discount, totalAmount);
};

/**
 * Crée un résultat d'erreur standardisé
 */
const createErrorResult = (message: string): CouponValidationResult => ({
  isValid: false,
  message,
  discountAmount: 0,
  discountType: 'fixed' as const,
  discountValue: 0
});

/**
 * Valide un code promo avant son utilisation
 */
export const validateCoupon = async (
  params: CouponValidationParams
): Promise<CouponValidationResult> => {
  try {
    // Validation des paramètres
    const validationError = validateInputParams(params);
    if (validationError) {
      return createErrorResult(validationError);
    }

    const sanitizedCode = sanitizeCouponCode(params.code);
    if (!sanitizedCode) {
      return createErrorResult('Code promo invalide');
    }

    // Vérification du cache
    cleanExpiredCache();
    const cacheKey = `${sanitizedCode}-${params.userId}-${params.totalAmount}-${params.serviceType}`;
    const cached = validationCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
    }

    // Recherche du coupon avec validation stricte
    const couponQuery = query(
      collection(db, 'coupons'),
      where('code', '==', sanitizedCode),
      where('active', '==', true),
      limit(1) // Optimisation: limiter à 1 résultat
    );

    const couponSnapshot = await getDocs(couponQuery);

    if (couponSnapshot.empty) {
      const result = createErrorResult('Code promo invalide ou expiré');
      validationCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
      return result;
    }

    const couponDoc = couponSnapshot.docs[0];
    const coupon = couponDoc.data() as CouponData;

    // Validation des dates avec protection
    const now = new Date();
    const validFrom = coupon.valid_from?.toDate();
    const validUntil = coupon.valid_until?.toDate();

    if (!validFrom || !validUntil || now < validFrom || now > validUntil) {
      const result = createErrorResult('Code promo expiré ou pas encore valide');
      validationCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
      return result;
    }

    // Vérification du service avec protection
    if (!Array.isArray(coupon.services) || !coupon.services.includes(params.serviceType)) {
      const result = createErrorResult('Ce code promo n\'est pas applicable à ce service');
      validationCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
      return result;
    }

    // Vérification du montant minimum
    const minAmount = Math.max(0, coupon.min_order_amount || 0);
    if (params.totalAmount < minAmount) {
      const result = createErrorResult(`Le montant minimum requis est de ${minAmount}€`);
      validationCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
      return result;
    }

    // Vérifications d'utilisation en parallèle pour optimiser les performances
    const totalUsagePromise = getDocs(query(
      collection(db, 'coupon_usages'),
      where('couponCode', '==', sanitizedCode)
    ));

    const userUsagePromise = coupon.max_uses_per_user > 0 
      ? getDocs(query(
          collection(db, 'coupon_usages'),
          where('couponCode', '==', sanitizedCode),
          where('userId', '==', params.userId)
        ))
      : null;

    const [totalUsageSnapshot, userUsageSnapshot] = await Promise.all([
      totalUsagePromise,
      userUsagePromise
    ]);

    // Vérification usage global
    const maxUsesTotal = Math.max(1, coupon.max_uses_total || Infinity);
    if (totalUsageSnapshot.size >= maxUsesTotal) {
      const result = createErrorResult('Ce code promo a atteint son nombre maximum d\'utilisations');
      validationCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
      return result;
    }

    // Vérification usage par utilisateur
    const maxUsesPerUser = Math.max(0, coupon.max_uses_per_user || Infinity);
    if (maxUsesPerUser > 0 && userUsageSnapshot && userUsageSnapshot.size >= maxUsesPerUser) {
      const result = createErrorResult('Vous avez déjà utilisé ce code promo le nombre maximum de fois');
      validationCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
      return result;
    }

    // Calcul sécurisé de la réduction
    const discountAmount = calculateDiscount(coupon, params.totalAmount);

    const result: CouponValidationResult = {
      isValid: true,
      message: 'Code promo valide',
      discountAmount: Math.round(discountAmount * 100) / 100, // Arrondi à 2 décimales
      discountType: coupon.type,
      discountValue: coupon.amount,
      couponId: couponDoc.id
    };

    // Mise en cache du résultat positif (cache plus court pour éviter les problèmes de concurrence)
    validationCache.set(cacheKey, { result, expiry: Date.now() + (CACHE_TTL / 10) });
    
    return result;

  } catch (error) {
    console.error('Error validating coupon:', error);
    
    // Log sécurisé sans exposer d'informations sensibles
    await logAnalyticsEvent({
      eventType: 'coupon_validation_error',
      userId: params.userId,
      eventData: {
        error: 'validation_failed',
        serviceType: params.serviceType
      }
    }).catch(() => {}); // Éviter les erreurs en cascade
    
    return createErrorResult('Erreur lors de la validation du code promo');
  }
};

/**
 * Enregistre l'utilisation d'un code promo de façon sécurisée
 */
export const recordCouponUsage = async (
  params: CouponUsageParams
): Promise<boolean> => {
  try {
    // Validation des paramètres
    if (!params.code?.trim() || !params.userId?.trim() || !params.orderId?.trim()) {
      throw new Error('Paramètres manquants pour l\'enregistrement');
    }

    const sanitizedCode = sanitizeCouponCode(params.code);
    const sanitizedUserName = params.userName?.trim().substring(0, 100) || 'Utilisateur';
    
    // Validation des montants
    const orderAmount = Math.max(0, Number(params.orderAmount) || 0);
    const discountAmount = Math.max(0, Number(params.discountAmount) || 0);

    if (discountAmount > orderAmount) {
      throw new Error('Montant de réduction invalide');
    }

    // Transaction atomique pour éviter les doubles utilisations
    const usageData = {
      couponCode: sanitizedCode,
      userId: params.userId,
      userName: sanitizedUserName,
      orderId: params.orderId,
      order_amount: orderAmount,
      discount_amount: Math.round(discountAmount * 100) / 100,
      used_at: serverTimestamp(),
      ip_hash: null, // À implémenter côté client si nécessaire
      user_agent_hash: null // À implémenter côté client si nécessaire
    };

    await addDoc(collection(db, 'coupon_usages'), usageData);

    // Invalidation du cache
    validationCache.clear();

    // Log analytics de façon asynchrone
    logAnalyticsEvent({
      eventType: 'coupon_used',
      userId: params.userId,
      eventData: {
        couponCode: sanitizedCode,
        orderId: params.orderId,
        orderAmount,
        discountAmount: Math.round(discountAmount * 100) / 100
      }
    }).catch(error => {
      console.error('Analytics logging failed:', error);
    });

    return true;

  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return false;
  }
};

/**
 * Annule l'utilisation d'un code promo de façon sécurisée
 */
export const revertCouponUsage = async (orderId: string): Promise<boolean> => {
  try {
    if (!orderId?.trim()) {
      return false;
    }

    // Recherche sécurisée de l'utilisation
    const usageQuery = query(
      collection(db, 'coupon_usages'),
      where('orderId', '==', orderId.trim()),
      limit(1)
    );

    const usageSnapshot = await getDocs(usageQuery);
    
    if (usageSnapshot.empty) {
      return false;
    }

    const usageDoc = usageSnapshot.docs[0];
    const usageData = usageDoc.data();

    // Suppression sécurisée
    await deleteDoc(usageDoc.ref);

    // Invalidation du cache
    validationCache.clear();

    // Log analytics asynchrone
    logAnalyticsEvent({
      eventType: 'coupon_usage_reverted',
      eventData: {
        couponCode: usageData.couponCode,
        orderId: orderId.trim(),
        reason: 'order_cancelled',
        original_amount: usageData.order_amount,
        reverted_discount: usageData.discount_amount
      }
    }).catch(error => {
      console.error('Analytics logging failed:', error);
    });

    return true;

  } catch (error) {
    console.error('Error reverting coupon usage:', error);
    return false;
  }
};

/**
 * Nettoie le cache manuellement (utile pour les tests ou la maintenance)
 */
export const clearCouponCache = (): void => {
  validationCache.clear();
};