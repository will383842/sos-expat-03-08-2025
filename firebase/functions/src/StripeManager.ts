// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { HttpsError } from 'firebase-functions/v2/https';
import { logError } from './utils/logs/logError';
import { db } from './utils/firebase';

/* ===================================================================
 * Utils
 * =================================================================== */

export const toCents = (amountInMainUnit: number): number =>
  Math.round(Number(amountInMainUnit) * 100);

const isProd = process.env.NODE_ENV === 'production';

function inferModeFromKey(secret: string | undefined): 'live' | 'test' | undefined {
  if (!secret) return undefined;
  if (secret.startsWith('sk_live_')) return 'live';
  if (secret.startsWith('sk_test_')) return 'test';
  return undefined;
}

function normalizeCurrency(cur?: StripePaymentData['currency']): SupportedCurrency {
  const c = (cur || 'eur').toString().toLowerCase();
  return c === 'usd' ? 'usd' : 'eur';
}

/** Valide que la clé est bien une clé secrète Stripe "sk_*" et pas une restricted "rk_*". */
function assertIsSecretStripeKey(secret: string): void {
  if (!/^sk_(live|test)_[A-Za-z0-9]+$/.test(secret)) {
    // On tolère des variantes Stripe mais on refuse explicitement les rk_ et autres
    if (secret.startsWith('rk_')) {
      throw new HttpsError(
        'failed-precondition',
        'La clé Stripe fournie est une "restricted key" (rk_*). Utilise une clé secrète (sk_*) pour les PaymentIntents.'
      );
    }
    throw new HttpsError(
      'failed-precondition',
      'Clé Stripe invalide. Fournis une clé secrète (sk_live_* ou sk_test_*).'
    );
  }
}

/* ===================================================================
 * Types
 * =================================================================== */

export type SupportedCurrency = 'eur' | 'usd';

export interface StripePaymentData {
  /** Montant total (ex: 49) en unité principale */
  amount: number;
  /** Devise (par défaut: 'eur') */
  currency?: SupportedCurrency | Uppercase<SupportedCurrency>;
  /** Références métier */
  clientId: string;
  providerId: string;
  /** Type du service */
  serviceType: 'lawyer_call' | 'expat_call';
  /** Type de prestataire */
  providerType: 'lawyer' | 'expat';

  /** Commission (legacy) */
  commissionAmount?: number;
  /** Nouveau nom: frais de connexion (si présent, prioritaire) */
  connectionFeeAmount?: number;

  /** Part prestataire en unité principale */
  providerAmount: number;

  /** Contexte */
  callSessionId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

/** Shape minimale des docs "users" qu’on lit. */
interface UserDoc {
  email?: string;
  status?: 'active' | 'suspended' | string;
}

/** Shape des docs "payments" enregistrés par cette classe. */
interface PaymentDoc {
  stripePaymentIntentId: string;
  clientId: string;
  providerId: string;
  amount: number; // cents
  commissionAmount: number; // cents
  providerAmount: number; // cents
  amountInEuros: number; // lecture facilité
  commissionAmountEuros: number;
  providerAmountEuros: number;
  currency: SupportedCurrency;
  serviceType: StripePaymentData['serviceType'];
  providerType: StripePaymentData['providerType'];
  status: string;
  clientSecret?: string | null;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  metadata?: Record<string, unknown>;
  environment?: string;
  mode?: 'live' | 'test';
  callSessionId?: string;
}

/* ===================================================================
 * Helpers d’instanciation Stripe
 * =================================================================== */

export function makeStripeClient(secret: string): Stripe {
  assertIsSecretStripeKey(secret);
  return new Stripe(secret, { apiVersion: '2023-10-16' });
}

/* ===================================================================
 * StripeManager
 * =================================================================== */

export class StripeManager {
  private db: admin.firestore.Firestore = db;
  private stripe: Stripe | null = null;
  /** 'live' | 'test' pour tracer ce qui a été utilisé */
  private mode: 'live' | 'test' = isProd ? 'live' : 'test';

  /**
   * Initialise Stripe avec une clé donnée (TEST ou LIVE)
   */
  private initializeStripe(secretKey: string): void {
    if (this.stripe) return; // éviter les réinits
    const detected = inferModeFromKey(secretKey);
    if (detected) this.mode = detected;
    this.stripe = makeStripeClient(secretKey);
  }

  /**
   * Résolution de configuration :
   * 1) si une clé est fournie en paramètre → on l'utilise
   * 2) sinon on tente via variables d'env (STRIPE_SECRET_KEY_LIVE/TEST),
   *    avec STRIPE_MODE (live|test) ou NODE_ENV pour choisir.
   * 3) fallback STRIPE_SECRET_KEY (ancien schéma)
   */
  private validateConfiguration(secretKey?: string): void {
    if (secretKey) {
      this.initializeStripe(secretKey);
      return;
    }

    const envMode: 'live' | 'test' =
      process.env.STRIPE_MODE === 'live' || process.env.STRIPE_MODE === 'test'
        ? (process.env.STRIPE_MODE as 'live' | 'test')
        : isProd
        ? 'live'
        : 'test';

    const keyFromEnv =
      envMode === 'live'
        ? process.env.STRIPE_SECRET_KEY_LIVE
        : process.env.STRIPE_SECRET_KEY_TEST;

    if (keyFromEnv) {
      this.initializeStripe(keyFromEnv);
      return;
    }

    // Dernier fallback : ancien nom unique (déconseillé)
    if (process.env.STRIPE_SECRET_KEY) {
      this.initializeStripe(process.env.STRIPE_SECRET_KEY);
      return;
    }

    throw new HttpsError(
      'failed-precondition',
      'Aucune clé Stripe disponible. Passe une clé en argument ou définis STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST.'
    );
  }

  private validatePaymentData(data: StripePaymentData): void {
    const { amount, clientId, providerId } = data;

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Montant invalide');
    }
    if (amount < 5) throw new HttpsError('failed-precondition', 'Montant minimum de 5€ requis');
    if (amount > 2000) throw new HttpsError('failed-precondition', 'Montant maximum de 2000€ dépassé');

    const commission = data.connectionFeeAmount ?? data.commissionAmount ?? 0;
    if (typeof commission !== 'number' || commission < 0) {
      throw new HttpsError('invalid-argument', 'Commission/frais de connexion invalide');
    }

    if (typeof data.providerAmount !== 'number' || data.providerAmount < 0) {
      throw new HttpsError('invalid-argument', 'Montant prestataire invalide');
    }

    if (!clientId || !providerId) {
      throw new HttpsError('invalid-argument', 'IDs client et prestataire requis');
    }
    if (clientId === providerId) {
      throw new HttpsError(
        'failed-precondition',
        'Le client et le prestataire ne peuvent pas être identiques'
      );
    }

    const calculatedTotal = commission + data.providerAmount;
    const tolerance = 0.02;
    const delta = Math.abs(calculatedTotal - amount);

    if (delta > tolerance) {
      // tolérance pour arrondis; si > 1€, on bloque
      if (delta > 1) {
        throw new HttpsError(
          'failed-precondition',
          `Incohérence montants: ${amount}€ != ${calculatedTotal}€`
        );
      }
    }
  }

  /* -------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------- */

  async createPaymentIntent(
    data: StripePaymentData,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      // Anti-doublons (seulement si un paiement a déjà été accepté)
      const existingPayment = await this.findExistingPayment(
        data.clientId,
        data.providerId,
        data.callSessionId
      );
      if (existingPayment) {
        throw new HttpsError(
          'failed-precondition',
          'Un paiement a déjà été accepté pour cette demande de consultation.'
        );
      }

      this.validatePaymentData(data);
      await this.validateUsers(data.clientId, data.providerId);

      const currency = normalizeCurrency(data.currency);
      const commissionEuros = data.connectionFeeAmount ?? data.commissionAmount ?? 0;

      const amountCents = toCents(data.amount);
      const commissionAmountCents = toCents(commissionEuros);
      const providerAmountCents = toCents(data.providerAmount);

      console.log('Création PaymentIntent Stripe:', {
        amountEuros: data.amount,
        amountCents,
        currency,
        serviceType: data.serviceType,
        commissionEuros,
        commissionAmountCents,
        providerEuros: data.providerAmount,
        providerAmountCents,
        mode: this.mode,
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency,
        capture_method: 'manual', // on capture après la consultation
        automatic_payment_methods: { enabled: true },
        metadata: {
          clientId: data.clientId,
          providerId: data.providerId,
          serviceType: data.serviceType,
          providerType: data.providerType,
          commissionAmountCents: String(commissionAmountCents),
          providerAmountCents: String(providerAmountCents),
          commissionAmountEuros: commissionEuros.toFixed(2),
          providerAmountEuros: data.providerAmount.toFixed(2),
          environment: process.env.NODE_ENV || 'development',
          mode: this.mode,
          ...(data.callSessionId ? { callSessionId: data.callSessionId } : {}),
          ...(data.metadata || {}),
        },
        description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount} ${currency.toUpperCase()}`,
        statement_descriptor_suffix: 'SOS EXPAT',
        receipt_email: await this.getClientEmail(data.clientId),
      });

      console.log('PaymentIntent Stripe créé:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInEuros: paymentIntent.amount / 100,
        status: paymentIntent.status,
        mode: this.mode,
      });

      await this.savePaymentRecord(
        paymentIntent,
        { ...data, commissionAmount: commissionEuros },
        { amountCents, commissionAmountCents, providerAmountCents, currency }
      );

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      await logError('StripeManager:createPaymentIntent', error);
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur inconnue';
      return { success: false, error: msg };
    }
  }

  async capturePayment(
    paymentIntentId: string,
    sessionId?: string,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'requires_capture') {
        throw new HttpsError(
          'failed-precondition',
          `Impossible de capturer un paiement au statut: ${paymentIntent.status}`
        );
      }

      const captured = await this.stripe.paymentIntents.capture(paymentIntentId);

      await this.db.collection('payments').doc(paymentIntentId).update({
        status: captured.status,
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionId: sessionId || null,
      });

      console.log('Paiement capturé:', {
        id: paymentIntentId,
        amount: captured.amount,
        status: captured.status,
        mode: this.mode,
      });

      return { success: true, paymentIntentId: captured.id };
    } catch (error) {
      await logError('StripeManager:capturePayment', error);
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur lors de la capture';
      return { success: false, error: msg };
    }
  }

  async refundPayment(
    paymentIntentId: string,
    reason: string,
    sessionId?: string,
    amount?: number,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

      type RefundReason = Stripe.RefundCreateParams.Reason;
      const allowedReasons: RefundReason[] = [
        'duplicate',
        'fraudulent',
        'requested_by_customer',
      ];
      const normalizedReason = (allowedReasons.includes(reason as RefundReason)
        ? (reason as RefundReason)
        : undefined) as RefundReason | undefined;

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        ...(normalizedReason ? { reason: normalizedReason } : {}),
        metadata: {
          sessionId: sessionId || '',
          refundReason: reason,
          mode: this.mode,
        },
      };
      if (amount !== undefined) refundData.amount = toCents(amount);

      const refund = await this.stripe.refunds.create(refundData);

      await this.db.collection('payments').doc(paymentIntentId).update({
        status: 'refunded',
        refundId: refund.id,
        refundReason: reason,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionId: sessionId || null,
      });

      console.log('Paiement remboursé:', {
        paymentIntentId,
        refundId: refund.id,
        amount: refund.amount,
        reason,
        mode: this.mode,
      });

      return { success: true, paymentIntentId };
    } catch (error) {
      await logError('StripeManager:refundPayment', error);
      const msg =
        error instanceof HttpsError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Erreur lors du remboursement';
      return { success: false, error: msg };
    }
  }

async cancelPayment(
  paymentIntentId: string,
  reason: string,
  sessionId?: string,
  secretKey?: string
): Promise<PaymentResult> {
  try {
    this.validateConfiguration(secretKey);
    if (!this.stripe) throw new HttpsError('internal', 'Stripe non initialisé');

    type CancelReason = Stripe.PaymentIntentCancelParams.CancellationReason;
    // ✅ Liste valide pour PaymentIntents
    const allowedReasons: CancelReason[] = [
      'duplicate',
      'fraudulent',
      'requested_by_customer',
      'abandoned',
    ];
    const normalized: CancelReason | undefined = allowedReasons.includes(
      reason as CancelReason
    )
      ? (reason as CancelReason)
      : undefined;

    const canceled = await this.stripe.paymentIntents.cancel(paymentIntentId, {
      ...(normalized ? { cancellation_reason: normalized } : {}),
    });

    await this.db.collection('payments').doc(paymentIntentId).update({
      status: canceled.status,
      cancelReason: reason,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionId: sessionId || null,
    });

    console.log('Paiement annulé:', {
      id: paymentIntentId,
      status: canceled.status,
      reason,
      mode: this.mode,
    });

    return { success: true, paymentIntentId: canceled.id };
  } catch (error) {
    await logError('StripeManager:cancelPayment', error);
    const msg =
      error instanceof HttpsError
        ? error.message
        : error instanceof Error
        ? error.message
        : "Erreur lors de l'annulation";
    return { success: false, error: msg };
  }
}


  async getPaymentStatistics(options: {
    startDate?: Date;
    endDate?: Date;
    serviceType?: StripePaymentData['serviceType'];
    providerType?: StripePaymentData['providerType'];
  } = {}): Promise<{
    totalAmount: number;
    totalCommission: number;
    totalProvider: number;
    count: number;
    byStatus: Record<string, number>;
  }> {
    try {
      let query: admin.firestore.Query<admin.firestore.DocumentData> =
        this.db.collection('payments');

      if (options.startDate) query = query.where('createdAt', '>=', options.startDate);
      if (options.endDate) query = query.where('createdAt', '<=', options.endDate);
      if (options.serviceType) query = query.where('serviceType', '==', options.serviceType);
      if (options.providerType) query = query.where('providerType', '==', options.providerType);

      const snapshot = await query.get();

      const stats = {
        totalAmount: 0,
        totalCommission: 0,
        totalProvider: 0,
        count: 0,
        byStatus: {} as Record<string, number>,
      };

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<PaymentDoc> | undefined;
        if (!data) return;
        stats.count++;
        stats.totalAmount += typeof data.amount === 'number' ? data.amount : 0;
        stats.totalCommission +=
          typeof data.commissionAmount === 'number' ? data.commissionAmount : 0;
        stats.totalProvider +=
          typeof data.providerAmount === 'number' ? data.providerAmount : 0;

        const status = (data.status ?? 'unknown') as string;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      // Conversion en unités principales pour le retour
      return {
        totalAmount: stats.totalAmount / 100,
        totalCommission: stats.totalCommission / 100,
        totalProvider: stats.totalProvider / 100,
        count: stats.count,
        byStatus: stats.byStatus,
      };
    } catch (error) {
      await logError('StripeManager:getPaymentStatistics', error);
      return {
        totalAmount: 0,
        totalCommission: 0,
        totalProvider: 0,
        count: 0,
        byStatus: {},
      };
    }
  }

  async getPayment(paymentIntentId: string): Promise<Record<string, unknown> | null> {
    try {
      const docSnap = await this.db.collection('payments').doc(paymentIntentId).get();
      if (!docSnap.exists) return null;

      const data = docSnap.data() as PaymentDoc | undefined;
      if (!data) return null;

      return {
        ...data,
        amountInEuros: (data.amount || 0) / 100,
        commissionAmountEuros: (data.commissionAmount || 0) / 100,
        providerAmountEuros: (data.providerAmount || 0) / 100,
      };
    } catch (error) {
      await logError('StripeManager:getPayment', error);
      return null;
    }
  }

  /* -------------------------------------------------------------------
   * Privées
   * ------------------------------------------------------------------- */

  private async findExistingPayment(
    clientId: string,
    providerId: string,
    sessionId?: string
  ): Promise<boolean> {
    try {
      console.log('🔍 Vérification anti-doublons:', {
        clientId: clientId.substring(0, 8) + '...',
        providerId: providerId.substring(0, 8) + '...',
        sessionId: sessionId ? sessionId.substring(0, 8) + '...' : '—',
      });

      let query: admin.firestore.Query<admin.firestore.DocumentData> = this.db
        .collection('payments')
        .where('clientId', '==', clientId)
        .where('providerId', '==', providerId)
        .where('status', 'in', ['succeeded', 'requires_capture']);

      if (sessionId && sessionId.trim() !== '') {
        query = query.where('callSessionId', '==', sessionId);
      }

      const snapshot = await query.limit(5).get();
      return !snapshot.empty;
    } catch (error) {
      await logError('StripeManager:findExistingPayment', error);
      // En cas d’erreur, on préfère **ne pas** bloquer
      return false;
    }
  }

  private async validateUsers(clientId: string, providerId: string): Promise<void> {
    const [clientDoc, providerDoc] = await Promise.all([
      this.db.collection('users').doc(clientId).get(),
      this.db.collection('users').doc(providerId).get(),
    ]);

    if (!clientDoc.exists) throw new HttpsError('failed-precondition', 'Client non trouvé');
    if (!providerDoc.exists) throw new HttpsError('failed-precondition', 'Prestataire non trouvé');

    const clientData = clientDoc.data() as UserDoc | undefined;
    const providerData = providerDoc.data() as UserDoc | undefined;

    if (clientData?.status === 'suspended')
      throw new HttpsError('failed-precondition', 'Compte client suspendu');
    if (providerData?.status === 'suspended')
      throw new HttpsError('failed-precondition', 'Compte prestataire suspendu');
  }

  private async getClientEmail(clientId: string): Promise<string | undefined> {
    try {
      const clientDoc = await this.db.collection('users').doc(clientId).get();
      const data = clientDoc.data() as UserDoc | undefined;
      return data?.email;
    } catch (error) {
      console.warn("Impossible de récupérer l'email client:", error);
      return undefined;
    }
  }

  private async savePaymentRecord(
    paymentIntent: Stripe.PaymentIntent,
    dataEuros: StripePaymentData & { commissionAmount: number },
    cents: {
      amountCents: number;
      commissionAmountCents: number;
      providerAmountCents: number;
      currency: SupportedCurrency;
    }
  ): Promise<void> {
    const paymentRecord: PaymentDoc = {
      stripePaymentIntentId: paymentIntent.id,
      clientId: dataEuros.clientId,
      providerId: dataEuros.providerId,

      // Montants en cents (source de vérité chiffrée)
      amount: cents.amountCents,
      commissionAmount: cents.commissionAmountCents,
      providerAmount: cents.providerAmountCents,

      // Redondance lisible (euros) pour analytics
      amountInEuros: dataEuros.amount,
      commissionAmountEuros: dataEuros.commissionAmount,
      providerAmountEuros: dataEuros.providerAmount,

      currency: cents.currency,
      serviceType: dataEuros.serviceType,
      providerType: dataEuros.providerType,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret ?? null,

      createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as admin.firestore.Timestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as admin.firestore.Timestamp,

      metadata: (dataEuros.metadata || {}) as Record<string, unknown>,
      environment: process.env.NODE_ENV || 'development',
      mode: this.mode,
      ...(dataEuros.callSessionId && dataEuros.callSessionId.trim() !== ''
        ? { callSessionId: dataEuros.callSessionId }
        : {}),
    };

    await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord as unknown as admin.firestore.DocumentData);

    console.log('Enregistrement paiement sauvegardé en DB:', {
      id: paymentIntent.id,
      amountCents: cents.amountCents,
      amountEuros: dataEuros.amount,
      mode: this.mode,
      hasCallSessionId: Boolean(paymentRecord.callSessionId),
    });
  }
}

/** Instance réutilisable */
export const stripeManager = new StripeManager();
