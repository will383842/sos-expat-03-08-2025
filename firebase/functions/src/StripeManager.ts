// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logError } from './utils/logs/logError';
import { db } from './utils/firebase';

// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
export const toCents = (amountInMainUnit: number): number =>
  Math.round(Number(amountInMainUnit) * 100);

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Détection d'environnement & helpers
// -------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';

function inferModeFromKey(secret: string | undefined): 'live' | 'test' | undefined {
  if (!secret) return undefined;
  if (secret.startsWith('sk_live_')) return 'live';
  if (secret.startsWith('sk_test_')) return 'test';
  return undefined;
}

function normalizeCurrency(cur?: StripePaymentData['currency']): SupportedCurrency {
  const c = (cur || 'eur').toString().toLowerCase();
  return (c === 'usd' ? 'usd' : 'eur');
}

// -------------------------------------------------------------
// StripeManager
// -------------------------------------------------------------
export class StripeManager {
  private db = db;
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
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });
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

    const envMode =
      (process.env.STRIPE_MODE === 'live' || process.env.STRIPE_MODE === 'test')
        ? (process.env.STRIPE_MODE as 'live' | 'test')
        : (isProd ? 'live' : 'test');

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

    throw new Error(
      'Aucune clé Stripe disponible. Passe une clé en argument ou définis STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST.'
    );
  }

  private validatePaymentData(data: StripePaymentData): void {
    const { amount, clientId, providerId } = data;

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Montant invalide');
    }
    if (amount < 5) throw new Error('Montant minimum de 5€ requis');
    if (amount > 2000) throw new Error('Montant maximum de 2000€ dépassé');

    const commission = data.connectionFeeAmount ?? data.commissionAmount ?? 0;
    if (typeof commission !== 'number' || commission < 0) {
      throw new Error('Commission/frais de connexion invalide');
    }

    if (typeof data.providerAmount !== 'number' || data.providerAmount < 0) {
      throw new Error('Montant prestataire invalide');
    }

    if (!clientId || !providerId) {
      throw new Error('IDs client et prestataire requis');
    }
    if (clientId === providerId) {
      throw new Error('Le client et le prestataire ne peuvent pas être identiques');
    }

    const calculatedTotal = commission + data.providerAmount;
    const tolerance = 0.02;
    const delta = Math.abs(calculatedTotal - amount);

    if (delta > tolerance) {
      console.warn('Incohérence montants:', {
        total: amount,
        commission,
        providerAmount: data.providerAmount,
        calculatedTotal,
        difference: delta,
      });
      if (delta > 1) {
        throw new Error(`Incohérence montants: ${amount}€ != ${calculatedTotal}€`);
      }
    }
  }

  // -----------------------------------------------------------
  // Public API
  // -----------------------------------------------------------
  async createPaymentIntent(
    data: StripePaymentData,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new Error('Stripe client not initialized');

      // Anti-doublons (seulement si un paiement a déjà été accepté)
      const existingPayment = await this.findExistingPayment(
        data.clientId,
        data.providerId,
        data.callSessionId
      );
      if (existingPayment) {
        throw new Error('Un paiement a déjà été accepté pour cette demande de consultation.');
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  async capturePayment(
    paymentIntentId: string,
    sessionId?: string,
    secretKey?: string
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      if (!this.stripe) throw new Error('Stripe client not initialized');

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'requires_capture') {
        throw new Error(`Cannot capture payment with status: ${paymentIntent.status}`);
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la capture',
      };
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
      if (!this.stripe) throw new Error('Stripe client not initialized');

      // Stripe permet refund direct via payment_intent id
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du remboursement',
      };
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
      if (!this.stripe) throw new Error('Stripe client not initialized');

      const canceled = await this.stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: reason as Stripe.PaymentIntentCancelParams.CancellationReason,
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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors de l'annulation",
      };
    }
  }

  async getPaymentStatistics(options: {
    startDate?: Date;
    endDate?: Date;
    serviceType?: string;
    providerType?: string;
  } = {}): Promise<{
    totalAmount: number;
    totalCommission: number;
    totalProvider: number;
    count: number;
    byStatus: Record<string, number>;
  }> {
    try {
      let query: admin.firestore.Query = this.db.collection('payments');

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

      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        stats.count++;
        stats.totalAmount += data.amount || 0;
        stats.totalCommission += data.commissionAmount || 0;
        stats.totalProvider += data.providerAmount || 0;

        const status = data.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      return {
        ...stats,
        totalAmount: stats.totalAmount / 100,
        totalCommission: stats.totalCommission / 100,
        totalProvider: stats.totalProvider / 100,
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
      const doc = await this.db.collection('payments').doc(paymentIntentId).get();
      if (!doc.exists) return null;

      const data = doc.data() as any;
      return {
        ...data,
        amountInEuros: (data?.amount || 0) / 100,
        commissionAmountEuros: (data?.commissionAmount || 0) / 100,
        providerAmountEuros: (data?.providerAmount || 0) / 100,
      };
    } catch (error) {
      await logError('StripeManager:getPayment', error);
      return null;
    }
  }

  // -----------------------------------------------------------
  // Privées
  // -----------------------------------------------------------
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

      let query = this.db
        .collection('payments')
        .where('clientId', '==', clientId)
        .where('providerId', '==', providerId)
        .where('status', 'in', ['succeeded', 'requires_capture']); // on bloque seulement si un paiement a déjà été accepté

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

    if (!clientDoc.exists) throw new Error('Client non trouvé');
    if (!providerDoc.exists) throw new Error('Prestataire non trouvé');

    const clientData = clientDoc.data() as any;
    const providerData = providerDoc.data() as any;

    if (clientData?.status === 'suspended') throw new Error('Compte client suspendu');
    if (providerData?.status === 'suspended') throw new Error('Compte prestataire suspendu');
  }

  private async getClientEmail(clientId: string): Promise<string | undefined> {
    try {
      const clientDoc = await this.db.collection('users').doc(clientId).get();
      return (clientDoc.data() as any)?.email;
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
    const paymentRecord: Record<string, unknown> = {
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
      clientSecret: paymentIntent.client_secret,

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

      metadata: dataEuros.metadata || {},
      environment: process.env.NODE_ENV || 'development',
      mode: this.mode,
    };

    if (dataEuros.callSessionId && dataEuros.callSessionId.trim() !== '') {
      paymentRecord.callSessionId = dataEuros.callSessionId;
    }

    await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);

    console.log('Enregistrement paiement sauvegardé en DB:', {
      id: paymentIntent.id,
      amountCents: cents.amountCents,
      amountEuros: dataEuros.amount,
      mode: this.mode,
      hasCallSessionId: !!paymentRecord.callSessionId,
    });
    }
}

// Instance réutilisable
export const stripeManager = new StripeManager();
