// firebase/functions/src/StripeManager.ts
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logError } from './utils/logs/logError';
import { logCallRecord } from './utils/logs/logCallRecord';
import { db } from './utils/firebase'; // ← utiliser la même instance Firestore

// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
// ✅ Conversion unique EUROS → CENTIMES
export const toCents = (euros: number): number => Math.round(euros * 100);

// -------------------------------------------------------------
// Stripe client
// -------------------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
// ✅ Tous les MONTANTS de cette interface sont en **EUROS (unités réelles)**
// La conversion en centimes est faite **au dernier moment** dans createPaymentIntent().
export interface StripePaymentData {
  amount: number; // EN EUROS (ex: 49)
  currency?: 'eur' | 'usd' | 'EUR' | 'USD';
  clientId: string;
  providerId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  commissionAmount: number; // EN EUROS
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

  private validateConfiguration(): void {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY manquante dans les variables d'environnement");
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('STRIPE_WEBHOOK_SECRET manquante - les webhooks ne fonctionneront pas');
    }
  }

  /**
   * ✅ Validation légère des données (plus de vérifs complexes)
   * - Les montants sont en **euros**
   */
  private validatePaymentData(data: StripePaymentData): void {
    const { amount, commissionAmount, providerAmount, clientId, providerId } = data;

    // Bornes simples (en euros)
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Montant invalide');
    }
    if (amount < 5) throw new Error('Montant minimum de 5€ requis');
    if (amount > 2000) throw new Error('Montant maximum de 2000€ dépassé');

    if (typeof commissionAmount !== 'number' || commissionAmount < 0) {
      throw new Error('Commission invalide');
    }
    if (typeof providerAmount !== 'number' || providerAmount < 0) {
      throw new Error('Montant prestataire invalide');
    }

    if (!clientId || !providerId) {
      throw new Error('IDs client et prestataire requis');
    }
    if (clientId === providerId) {
      throw new Error('Le client et le prestataire ne peuvent pas être identiques');
    }
  }

  /**
   * ✅ Crée un PaymentIntent
   * IMPORTANT MONNAIE :
   * - Cette méthode reçoit des montants en **EUROS**.
   * - Elle réalise la **conversion AU DERNIER MOMENT** :
   *      const amountCents = toCents(amount)
   * - Stripe attend des **centimes** + currency en minuscule ("eur" | "usd").
   */
  async createPaymentIntent(data: StripePaymentData): Promise<PaymentResult> {
    try {
      this.validateConfiguration();
      this.validatePaymentData(data);

      // Unicité basique : éviter 2 paiements en parallèle pour la même paire
      const existingPayment = await this.findExistingPayment(data.clientId, data.providerId);
      if (existingPayment) {
        throw new Error('Un paiement est déjà en cours pour cette combinaison client/prestataire');
      }

      // Vérifier l’existence des utilisateurs
      await this.validateUsers(data.clientId, data.providerId);

      const currency = (data.currency || 'eur').toLowerCase() as 'eur' | 'usd';

      // ✅ Conversion unique EUROS → CENTIMES juste avant l’appel Stripe
      const amountCents = toCents(data.amount);
      const commissionAmountCents = toCents(data.commissionAmount);
      const providerAmountCents = toCents(data.providerAmount);

      console.log('💳 Création PaymentIntent Stripe:', {
        amountEuros: data.amount,
        amountCents,
        currency,
        serviceType: data.serviceType,
      });

      const paymentIntent = await stripe.paymentIntents.create({
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
          commissionAmountEuros: data.commissionAmount.toFixed(2),
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

      // Sauvegarder en DB (montants en centimes + miroirs en euros)
      await this.savePaymentRecord(paymentIntent, {
        ...data,
        // data ici est en euros — on passe les centimes pour l’enregistrement
        amount: data.amount,
        commissionAmount: data.commissionAmount,
        providerAmount: data.providerAmount,
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

  /**
   * ✅ Capture d’un paiement (aucun changement majeur)
   */
  async capturePayment(paymentIntentId: string, sessionId?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration();

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if ((paymentIntent.status as string) !== 'requires_capture') {
        throw new Error(`Impossible de capturer le paiement. Statut actuel: ${paymentIntent.status}`);
      }

      // Vérification optionnelle via la session
      if (sessionId) {
        const canCapture = await this.validateCaptureConditions(sessionId);
        if (!canCapture) throw new Error('Conditions de capture non remplies');
      }

      console.log('💰 Capture du paiement:', {
        paymentIntentId,
        amount: paymentIntent.amount,
        amountInEuros: paymentIntent.amount / 100,
      });

      const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);

      await this.updatePaymentStatus(paymentIntentId, 'captured');

      if (sessionId) {
        await logCallRecord({
          callId: sessionId,
          status: 'payment_captured',
          retryCount: 0,
          additionalData: {
            paymentIntentId,
            amount: capturedPayment.amount,
            amountInEuros: capturedPayment.amount / 100,
            currency: capturedPayment.currency,
          },
        });
      }

      console.log('✅ Paiement capturé avec succès:', {
        id: capturedPayment.id,
        amount: capturedPayment.amount,
        amountInEuros: capturedPayment.amount / 100,
      });

      return { success: true, paymentIntentId: capturedPayment.id };
    } catch (error) {
      await logError('StripeManager:capturePayment', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur de capture' };
    }
  }

  /**
   * ✅ Remboursement (ou annulation si non capturé)
   * - `amount` si fourni est en **centimes** (Stripe).
   */
  async refundPayment(
    paymentIntentId: string,
    reason: string,
    sessionId?: string,
    amount?: number // EN CENTIMES si spécifié
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration();

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
        if ((paymentIntent.status as string) === 'requires_capture') {
          await stripe.paymentIntents.cancel(paymentIntentId);
          await this.updatePaymentStatus(paymentIntentId, 'canceled');
          console.log('✅ Paiement annulé (non capturé):', paymentIntentId);
          return { success: true, paymentIntentId };
        }
        throw new Error(`Impossible de rembourser. Statut: ${paymentIntent.status}`);
      }

      console.log('💰 Remboursement du paiement:', {
        paymentIntentId,
        originalAmount: paymentIntent.amount,
        refundAmount: amount || paymentIntent.amount,
        amountInEuros: (amount || paymentIntent.amount) / 100,
        reason,
      });

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason: 'requested_by_customer',
        metadata: {
          refundReason: reason,
          sessionId: sessionId || '',
          environment: process.env.NODE_ENV || 'development',
          refundAmountEuros: ((amount || paymentIntent.amount) / 100).toString(),
        },
      });

      await this.updatePaymentStatus(paymentIntentId, 'refunded', {
        refundId: refund.id,
        refundReason: reason,
        refundAmount: refund.amount,
        refundAmountEuros: refund.amount / 100,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (sessionId) {
        await logCallRecord({
          callId: sessionId,
          status: 'payment_refunded',
          retryCount: 0,
          additionalData: {
            paymentIntentId,
            refundId: refund.id,
            refundAmount: refund.amount,
            refundAmountEuros: refund.amount / 100,
            refundReason: reason,
          },
        });
      }

      console.log('✅ Remboursement effectué avec succès:', {
        refundId: refund.id,
        amount: refund.amount,
        amountInEuros: refund.amount / 100,
      });

      return { success: true, paymentIntentId: refund.payment_intent as string };
    } catch (error) {
      await logError('StripeManager:refundPayment', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur de remboursement' };
    }
  }

  /**
   * ✅ Annulation d’un PaymentIntent
   */
  async cancelPayment(paymentIntentId: string, reason: string, sessionId?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration();

      const canceledPayment = await stripe.paymentIntents.cancel(paymentIntentId);

      await this.updatePaymentStatus(paymentIntentId, 'canceled', {
        cancelReason: reason,
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (sessionId) {
        await logCallRecord({
          callId: sessionId,
          status: 'payment_canceled',
          retryCount: 0,
          additionalData: {
            paymentIntentId,
            cancelReason: reason,
            amount: canceledPayment.amount,
            amountInEuros: canceledPayment.amount / 100,
          },
        });
      }

      console.log('✅ Paiement annulé:', {
        id: canceledPayment.id,
        reason,
        amount: canceledPayment.amount,
        amountInEuros: canceledPayment.amount / 100,
      });

      return { success: true, paymentIntentId: canceledPayment.id };
    } catch (error) {
      await logError('StripeManager:cancelPayment', error);
      return { success: false, error: error instanceof Error ? error.message : "Erreur d'annulation" };
    }
  }

  // -------------------------------------------------------------
  // Helpers internes
  // -------------------------------------------------------------
  private async validateCaptureConditions(sessionId: string): Promise<boolean> {
    try {
      const sessionDoc = await this.db.collection('call_sessions').doc(sessionId).get();
      if (!sessionDoc.exists) return false;

      const session = sessionDoc.data();
      if (!session) return false;

      const { participants, conference } = session;

      // Les deux participants doivent être connectés
      if (
        participants?.provider?.status !== 'connected' ||
        participants?.client?.status !== 'connected'
      ) {
        console.log('Capture refusée: participants non connectés');
        return false;
      }

      // Durée minimale 2 minutes
      if (!conference?.duration || conference.duration < 120) {
        console.log('Capture refusée: durée insuffisante');
        return false;
      }

      // Statut de l’appel
      if (session.status !== 'completed' && session.status !== 'active') {
        console.log("Capture refusée: statut d'appel incorrect");
        return false;
      }

      return true;
    } catch (error) {
      await logError('StripeManager:validateCaptureConditions', error);
      return false;
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
   * ✅ Sauvegarde en DB
   * - On enregistre les centimes (source Stripe) + miroirs en euros pour lisibilité.
   */
  private async savePaymentRecord(
    paymentIntent: Stripe.PaymentIntent,
    dataEuros: StripePaymentData,
    cents: { amountCents: number; commissionAmountCents: number; providerAmountCents: number; currency: 'eur' | 'usd' }
  ): Promise<void> {
    const paymentRecord: any = {
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

  private async updatePaymentStatus(
    paymentIntentId: string,
    status: string,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    await this.db.collection('payments').doc(paymentIntentId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData,
    });
    console.log(`📝 Statut paiement mis à jour: ${paymentIntentId} -> ${status}`);
  }

  /**
   * Statistiques (les champs `amount`, `commissionAmount`, etc. sont **en centimes** en DB)
   */
  async getPaymentStatistics(options: {
    startDate?: admin.firestore.Timestamp;
    endDate?: admin.firestore.Timestamp;
    providerId?: string;
    serviceType?: string;
  } = {}): Promise<{
    totalAmount: number; // CENTIMES
    totalAmountEuros: number; // EUROS (affichage)
    totalCommission: number; // CENTIMES
    totalProviderAmount: number; // CENTIMES
    paymentCount: number;
    successfulPayments: number;
    refundedPayments: number;
    averageAmount: number; // CENTIMES
    averageAmountEuros: number; // EUROS (affichage)
  }> {
    try {
      let query = this.db.collection('payments') as any;

      if (options.startDate) query = query.where('createdAt', '>=', options.startDate);
      if (options.endDate) query = query.where('createdAt', '<=', options.endDate);
      if (options.providerId) query = query.where('providerId', '==', options.providerId);
      if (options.serviceType) query = query.where('serviceType', '==', options.serviceType);

      const snapshot = await query.get();

      let totalAmount = 0;
      let totalCommission = 0;
      let totalProviderAmount = 0;
      let successfulPayments = 0;
      let refundedPayments = 0;

      snapshot.docs.forEach((doc: any) => {
        const payment = doc.data();

        if (payment.status === 'succeeded' || payment.status === 'captured') {
          totalAmount += payment.amount;
          totalCommission += payment.commissionAmount;
          totalProviderAmount += payment.providerAmount;
          successfulPayments++;
        }
        if (payment.status === 'refunded') {
          refundedPayments++;
        }
      });

      const averageAmount = successfulPayments > 0 ? totalAmount / successfulPayments : 0;

      return {
        totalAmount,
        totalAmountEuros: totalAmount / 100,
        totalCommission,
        totalProviderAmount,
        paymentCount: snapshot.size,
        successfulPayments,
        refundedPayments,
        averageAmount,
        averageAmountEuros: averageAmount / 100,
      };
    } catch (error) {
      await logError('StripeManager:getPaymentStatistics', error);
      throw error;
    }
  }

  async getPayment(paymentIntentId: string): Promise<any> {
    try {
      const [stripePayment, firestorePayment] = await Promise.all([
        stripe.paymentIntents.retrieve(paymentIntentId),
        this.db.collection('payments').doc(paymentIntentId).get(),
      ]);

      return {
        stripe: stripePayment,
        firestore: firestorePayment.exists ? firestorePayment.data() : null,
      };
    } catch (error) {
      await logError('StripeManager:getPayment', error);
      return null;
    }
  }
}

// Instance singleton
export const stripeManager = new StripeManager();
