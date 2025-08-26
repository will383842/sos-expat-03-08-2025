// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logError } from './utils/logs/logError';
import { db } from './utils/firebase';

// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
// ✅ Conversion unique EUROS → CENTIMES
export const toCents = (euros: number): number => Math.round(euros * 100);

// -------------------------------------------------------------
// Types - Interface UNIFIÉE
// -------------------------------------------------------------
// ✅ INTERFACE UNIFIÉE : accepte à la fois connectionFeeAmount ET commissionAmount
// Tous les montants sont en **EUROS (unités réelles)**
export interface StripePaymentData {
  amount: number; // EN EUROS (ex: 49)
  currency?: 'eur' | 'usd' | 'EUR' | 'USD';
  clientId: string;
  providerId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  
  // ✅ FLEXIBILITÉ : accepte les deux noms de champs
  commissionAmount?: number; // EN EUROS (legacy)
  connectionFeeAmount?: number; // EN EUROS (nouveau)
  
  providerAmount: number; // EN EUROS
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
// Manager
// -------------------------------------------------------------
export class StripeManager {
  private db = db;
  private stripe: Stripe | null = null;

  // ✅ Initialize Stripe dynamically with secret key
  private initializeStripe(secretKey: string): void {
    if (!this.stripe) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
      });
    }
  }

  private validateConfiguration(secretKey?: string): void {
    // ✅ Try to use provided secret key first
    if (secretKey) {
      this.initializeStripe(secretKey);
      return;
    }

    // ✅ Fallback to environment variable (for local development)
    if (process.env.STRIPE_SECRET_KEY) {
      this.initializeStripe(process.env.STRIPE_SECRET_KEY);
      return;
    }

    throw new Error("STRIPE_SECRET_KEY manquante dans les variables d'environnement");
  }

  /**
   * ✅ Validation unifiée avec support des deux formats
   */
  private validatePaymentData(data: StripePaymentData): void {
    const { amount, clientId, providerId } = data;

    // Bornes simples (en euros)
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Montant invalide');
    }
    if (amount < 5) throw new Error('Montant minimum de 5€ requis');
    if (amount > 2000) throw new Error('Montant maximum de 2000€ dépassé');

    // ✅ Support flexible des deux formats de commission
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

    // ✅ Validation cohérence : total = commission + prestataire
    const calculatedTotal = commission + data.providerAmount;
    const tolerance = 0.02; // 2 centimes de tolérance
    if (Math.abs(calculatedTotal - amount) > tolerance) {
      console.warn('⚠️ Incohérence montants:', {
        total: amount,
        commission,
        providerAmount: data.providerAmount,
        calculatedTotal,
        difference: Math.abs(calculatedTotal - amount)
      });
      // Ne pas bloquer pour de petites différences d'arrondi
      if (Math.abs(calculatedTotal - amount) > 1) {
        throw new Error(`Incohérence montants: ${amount}€ != ${calculatedTotal}€`);
      }
    }
  }

  /**
   * ✅ Crée un PaymentIntent avec interface unifiée
   * @param data - Payment data
   * @param secretKey - Optional Stripe secret key (for Firebase Functions v2 secrets)
   */
  async createPaymentIntent(data: StripePaymentData, secretKey?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      this.validatePaymentData(data);

      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      // Unicité basique
      const existingPayment = await this.findExistingPayment(data.clientId, data.providerId);
      if (existingPayment) {
        throw new Error('Un paiement est déjà en cours pour cette combinaison client/prestataire');
      }

      // Vérifier l'existence des utilisateurs
      await this.validateUsers(data.clientId, data.providerId);

      const currency = (data.currency || 'eur').toLowerCase() as 'eur' | 'usd';

      // ✅ Gestion unifiée des commissions
      const commissionAmount = data.connectionFeeAmount ?? data.commissionAmount ?? 0;

      // ✅ Conversion unique EUROS → CENTIMES juste avant l'appel Stripe
      const amountCents = toCents(data.amount);
      const commissionAmountCents = toCents(commissionAmount);
      const providerAmountCents = toCents(data.providerAmount);

      console.log('💳 Création PaymentIntent Stripe:', {
        amountEuros: data.amount,
        amountCents,
        currency,
        serviceType: data.serviceType,
        commissionEuros: commissionAmount,
        commissionCents: commissionAmountCents,
        providerEuros: data.providerAmount,
        providerCents: providerAmountCents,
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency,
        capture_method: 'manual', // Capture différée
        automatic_payment_methods: { enabled: true },
        metadata: {
          clientId: data.clientId,
          providerId: data.providerId,
          serviceType: data.serviceType,
          providerType: data.providerType,
          commissionAmountCents: String(commissionAmountCents),
          providerAmountCents: String(providerAmountCents),
          commissionAmountEuros: commissionAmount.toFixed(2),
          providerAmountEuros: data.providerAmount.toFixed(2),
          environment: process.env.NODE_ENV || 'development',
          ...data.metadata,
        },
        description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount} ${currency.toUpperCase()}`,
        statement_descriptor_suffix: 'SOS EXPAT',
        receipt_email: await this.getClientEmail(data.clientId),
      });

      console.log('✅ PaymentIntent Stripe créé:', {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInEuros: paymentIntent.amount / 100,
        status: paymentIntent.status,
      });

      // Sauvegarder en DB
      await this.savePaymentRecord(paymentIntent, {
        ...data,
        commissionAmount, // ✅ Montant unifié
      }, {
        amountCents,
        commissionAmountCents,
        providerAmountCents,
        currency,
      });

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

  private async findExistingPayment(clientId: string, providerId: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection('payments')
        .where('clientId', '==', clientId)
        .where('providerId', '==', providerId)
        .where('status', 'in', ['pending', 'authorized', 'requires_capture'])
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      await logError('StripeManager:findExistingPayment', error);
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

    const clientData = clientDoc.data();
    const providerData = providerDoc.data();

    if (clientData?.status === 'suspended') throw new Error('Compte client suspendu');
    if (providerData?.status === 'suspended') throw new Error('Compte prestataire suspendu');
  }

  private async getClientEmail(clientId: string): Promise<string | undefined> {
    try {
      const clientDoc = await this.db.collection('users').doc(clientId).get();
      return clientDoc.data()?.email;
    } catch (error) {
      console.warn("Impossible de récupérer l'email client:", error);
      return undefined;
    }
  }

  /**
   * ✅ Sauvegarde en DB avec support unifié
   */
  private async savePaymentRecord(
    paymentIntent: Stripe.PaymentIntent,
    dataEuros: StripePaymentData & { commissionAmount: number },
    cents: { amountCents: number; commissionAmountCents: number; providerAmountCents: number; currency: 'eur' | 'usd' }
  ): Promise<void> {
    const paymentRecord: Record<string, unknown> = {
      stripePaymentIntentId: paymentIntent.id,
      clientId: dataEuros.clientId,
      providerId: dataEuros.providerId,

      // Legacy + source de vérité côté stats internes (centimes)
      amount: cents.amountCents,
      commissionAmount: cents.commissionAmountCents,
      providerAmount: cents.providerAmountCents,

      // Miroirs pour lisibilité
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
    };

    if (dataEuros.callSessionId && dataEuros.callSessionId.trim() !== '') {
      paymentRecord.callSessionId = dataEuros.callSessionId;
    }

    await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);

    console.log('✅ Enregistrement paiement sauvegardé en DB:', {
      id: paymentIntent.id,
      amountCents: cents.amountCents,
      amountEuros: dataEuros.amount,
      hasCallSessionId: !!paymentRecord.callSessionId,
    });
  }

  // ✅ Update all other methods to accept optional secretKey parameter
  async capturePayment(paymentIntentId: string, sessionId?: string, secretKey?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      
      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      // Récupérer le paiement depuis Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'requires_capture') {
        throw new Error(`Cannot capture payment with status: ${paymentIntent.status}`);
      }

      // Capturer le paiement
      const capturedPayment = await this.stripe.paymentIntents.capture(paymentIntentId);
      
      // Mettre à jour en DB
      await this.db.collection('payments').doc(paymentIntentId).update({
        status: capturedPayment.status,
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionId: sessionId || null,
      });

      console.log('✅ Paiement capturé:', {
        id: paymentIntentId,
        amount: capturedPayment.amount,
        status: capturedPayment.status,
      });

      return {
        success: true,
        paymentIntentId: capturedPayment.id,
      };
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
      
      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
        metadata: {
          sessionId: sessionId || '',
          refundReason: reason,
        }
      };

      if (amount !== undefined) {
        refundData.amount = toCents(amount);
      }

      const refund = await this.stripe.refunds.create(refundData);
      
      // Mettre à jour en DB
      await this.db.collection('payments').doc(paymentIntentId).update({
        status: 'refunded',
        refundId: refund.id,
        refundReason: reason,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionId: sessionId || null,
      });

      console.log('✅ Paiement remboursé:', {
        paymentIntentId,
        refundId: refund.id,
        amount: refund.amount,
        reason,
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      await logError('StripeManager:refundPayment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du remboursement',
      };
    }
  }

  async cancelPayment(paymentIntentId: string, reason: string, sessionId?: string, secretKey?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration(secretKey);
      
      if (!this.stripe) {
        throw new Error('Stripe client not initialized');
      }

      const canceledPayment = await this.stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: reason as Stripe.PaymentIntentCancelParams.CancellationReason,
      });
      
      // Mettre à jour en DB
      await this.db.collection('payments').doc(paymentIntentId).update({
        status: canceledPayment.status,
        cancelReason: reason,
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionId: sessionId || null,
      });

      console.log('✅ Paiement annulé:', {
        id: paymentIntentId,
        status: canceledPayment.status,
        reason,
      });

      return {
        success: true,
        paymentIntentId: canceledPayment.id,
      };
    } catch (error) {
      await logError('StripeManager:cancelPayment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'annulation',
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
      
      if (options.startDate) {
        query = query.where('createdAt', '>=', options.startDate);
      }
      if (options.endDate) {
        query = query.where('createdAt', '<=', options.endDate);
      }
      if (options.serviceType) {
        query = query.where('serviceType', '==', options.serviceType);
      }
      if (options.providerType) {
        query = query.where('providerType', '==', options.providerType);
      }

      const snapshot = await query.get();
      
      const stats = {
        totalAmount: 0,
        totalCommission: 0,
        totalProvider: 0,
        count: 0,
        byStatus: {} as Record<string, number>,
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        stats.count++;
        stats.totalAmount += data.amount || 0;
        stats.totalCommission += data.commissionAmount || 0;
        stats.totalProvider += data.providerAmount || 0;
        
        const status = data.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      // Convertir en euros pour l'affichage
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
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
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
}

// Instance singleton
export const stripeManager = new StripeManager();