import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logError } from './utils/logs/logError';
import { logCallRecord } from './utils/logs/logCallRecord';

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

export interface StripePaymentData {
  amount: number;
  currency?: string;
  clientId: string;
  providerId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  commissionAmount: number;
  providerAmount: number;
  callSessionId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

export class StripeManager {
  private db = admin.firestore();

  /**
   * Valide la configuration Stripe
   */
  private validateConfiguration(): void {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
    }
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn('STRIPE_WEBHOOK_SECRET manquante - les webhooks ne fonctionneront pas');
    }
  }

  /**
   * Valide les données de paiement
   */
  private validatePaymentData(data: StripePaymentData): void {
    const { amount, commissionAmount, providerAmount, clientId, providerId } = data;

    // Validation des montants
    if (!amount || amount <= 0) {
      throw new Error('Montant invalide');
    }

    if (amount < 500) { // 5€ minimum
      throw new Error('Montant minimum de 5€ requis');
    }

    if (amount > 50000) { // 500€ maximum
      throw new Error('Montant maximum de 500€ dépassé');
    }

    // Validation de la répartition
    if (commissionAmount + providerAmount !== amount) {
      throw new Error('La répartition des montants ne correspond pas au total');
    }

    if (commissionAmount < 0 || providerAmount < 0) {
      throw new Error('Les montants ne peuvent pas être négatifs');
    }

    // Validation des IDs
    if (!clientId || !providerId) {
      throw new Error('IDs client et prestataire requis');
    }

    if (clientId === providerId) {
      throw new Error('Le client et le prestataire ne peuvent pas être identiques');
    }
  }

  /**
   * Crée un PaymentIntent avec validation complète
   */
  async createPaymentIntent(data: StripePaymentData): Promise<PaymentResult> {
    try {
      this.validateConfiguration();
      this.validatePaymentData(data);

      // Vérifier qu'il n'y a pas déjà un paiement en cours
      const existingPayment = await this.findExistingPayment(data.clientId, data.providerId);
      if (existingPayment) {
        throw new Error('Un paiement est déjà en cours pour cette combinaison client/prestataire');
      }

      // Vérifier que les utilisateurs existent
      await this.validateUsers(data.clientId, data.providerId);

      // Créer le PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: data.amount,
        currency: data.currency || 'eur',
        capture_method: 'manual', // Capture différée obligatoire
        metadata: {
          clientId: data.clientId,
          providerId: data.providerId,
          serviceType: data.serviceType,
          providerType: data.providerType,
          commissionAmount: data.commissionAmount.toString(),
          providerAmount: data.providerAmount.toString(),
          callSessionId: data.callSessionId || '',
          environment: process.env.NODE_ENV || 'development',
          ...data.metadata
        },
        description: `Service ${data.serviceType} - ${data.providerType}`,
        statement_descriptor: 'SOS EXPAT',
        receipt_email: await this.getClientEmail(data.clientId)
      });

      // Sauvegarder dans Firestore
      await this.savePaymentRecord(paymentIntent, data);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined
      };

    } catch (error) {
      await logError('StripeManager:createPaymentIntent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Capture un paiement avec validation
   */
  async capturePayment(paymentIntentId: string, sessionId?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration();

      // Récupérer le PaymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if ((paymentIntent.status as string) === 'requires_capture') {
        throw new Error(`Impossible de capturer le paiement. Statut actuel: ${paymentIntent.status}`);
      }

      // Double vérification avec les données de session si disponibles
      if (sessionId) {
        const canCapture = await this.validateCaptureConditions(sessionId);
        if (!canCapture) {
          throw new Error('Conditions de capture non remplies');
        }
      }

      // Capturer le paiement
      const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);

      // Mettre à jour dans Firestore
      await this.updatePaymentStatus(paymentIntentId, 'captured');

      // Logger pour audit
      if (sessionId) {
        await logCallRecord({
          callId: sessionId,
          status: 'payment_captured',
          retryCount: 0,
          additionalData: {
            paymentIntentId,
            amount: capturedPayment.amount,
            currency: capturedPayment.currency
          }
        });
      }

      return {
        success: true,
        paymentIntentId: capturedPayment.id
      };

    } catch (error) {
      await logError('StripeManager:capturePayment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de capture'
      };
    }
  }

  /**
   * Rembourse un paiement
   */
  async refundPayment(
    paymentIntentId: string, 
    reason: string, 
    sessionId?: string,
    amount?: number
  ): Promise<PaymentResult> {
    try {
      this.validateConfiguration();

      // Récupérer le PaymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
        // Si le paiement n'est pas encore capturé, l'annuler
        if ((paymentIntent.status as string) === 'requires_capture') {
          await stripe.paymentIntents.cancel(paymentIntentId);
          await this.updatePaymentStatus(paymentIntentId, 'canceled');
          return { success: true, paymentIntentId };
        }
        
        throw new Error(`Impossible de rembourser. Statut: ${paymentIntent.status}`);
      }

      // Créer le remboursement
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount, // Remboursement partiel si spécifié
        reason: 'requested_by_customer',
        metadata: {
          refundReason: reason,
          sessionId: sessionId || '',
          environment: process.env.NODE_ENV || 'development'
        }
      });

      // Mettre à jour dans Firestore
      await this.updatePaymentStatus(paymentIntentId, 'refunded', {
        refundId: refund.id,
        refundReason: reason,
        refundAmount: refund.amount,
        refundedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Logger pour audit
      if (sessionId) {
        await logCallRecord({
          callId: sessionId,
          status: 'payment_refunded',
          retryCount: 0,
          additionalData: {
            paymentIntentId,
            refundId: refund.id,
            refundAmount: refund.amount,
            refundReason: reason
          }
        });
      }

      return {
        success: true,
        paymentIntentId: refund.payment_intent as string
      };

    } catch (error) {
      await logError('StripeManager:refundPayment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de remboursement'
      };
    }
  }

  /**
   * Annule un PaymentIntent
   */
  async cancelPayment(paymentIntentId: string, reason: string, sessionId?: string): Promise<PaymentResult> {
    try {
      this.validateConfiguration();

      const canceledPayment = await stripe.paymentIntents.cancel(paymentIntentId);
      
      // Mettre à jour dans Firestore
      await this.updatePaymentStatus(paymentIntentId, 'canceled', {
        cancelReason: reason,
        canceledAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Logger pour audit
      if (sessionId) {
        await logCallRecord({
          callId: sessionId,
          status: 'payment_canceled',
          retryCount: 0,
          additionalData: {
            paymentIntentId,
            cancelReason: reason
          }
        });
      }

      return {
        success: true,
        paymentIntentId: canceledPayment.id
      };

    } catch (error) {
      await logError('StripeManager:cancelPayment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur d\'annulation'
      };
    }
  }

  /**
   * Valide les conditions de capture d'un paiement
   */
  private async validateCaptureConditions(sessionId: string): Promise<boolean> {
    try {
      // Récupérer les données de la session
      const sessionDoc = await this.db.collection('call_sessions').doc(sessionId).get();
      if (!sessionDoc.exists) return false;

      const session = sessionDoc.data();
      if (!session) return false;

      // Vérifications standard
      const { participants, conference } = session;
      
      // Les deux participants doivent être connectés
      if (participants.provider.status !== 'connected' || 
          participants.client.status !== 'connected') {
        console.log('Capture refusée: participants non connectés');
        return false;
      }

      // La conférence doit avoir duré au moins 2 minutes
      if (!conference.duration || conference.duration < 120) {
        console.log('Capture refusée: durée insuffisante');
        return false;
      }

      // Le statut de l'appel doit être complété ou actif
      if (session.status !== 'completed' && session.status !== 'active') {
        console.log('Capture refusée: statut d\'appel incorrect');
        return false;
      }

      return true;

    } catch (error) {
      await logError('StripeManager:validateCaptureConditions', error);
      return false;
    }
  }

  /**
   * Recherche un paiement existant
   */
  private async findExistingPayment(clientId: string, providerId: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('payments')
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

  /**
   * Valide l'existence des utilisateurs
   */
  private async validateUsers(clientId: string, providerId: string): Promise<void> {
    const [clientDoc, providerDoc] = await Promise.all([
      this.db.collection('users').doc(clientId).get(),
      this.db.collection('users').doc(providerId).get()
    ]);

    if (!clientDoc.exists) {
      throw new Error('Client non trouvé');
    }

    if (!providerDoc.exists) {
      throw new Error('Prestataire non trouvé');
    }

    // Vérifications additionnelles
    const clientData = clientDoc.data();
    const providerData = providerDoc.data();

    if (clientData?.status === 'suspended') {
      throw new Error('Compte client suspendu');
    }

    if (providerData?.status === 'suspended') {
      throw new Error('Compte prestataire suspendu');
    }
  }

  /**
   * Récupère l'email du client pour le reçu
   */
  private async getClientEmail(clientId: string): Promise<string | undefined> {
    try {
      const clientDoc = await this.db.collection('users').doc(clientId).get();
      return clientDoc.data()?.email;
    } catch (error) {
      console.warn('Impossible de récupérer l\'email client:', error);
      return undefined;
    }
  }

  /**
   * Sauvegarde l'enregistrement de paiement
   */
  private async savePaymentRecord(paymentIntent: Stripe.PaymentIntent, data: StripePaymentData): Promise<void> {
    const paymentRecord = {
      stripePaymentIntentId: paymentIntent.id,
      clientId: data.clientId,
      providerId: data.providerId,
      amount: data.amount,
      currency: data.currency || 'eur',
      commissionAmount: data.commissionAmount,
      providerAmount: data.providerAmount,
      serviceType: data.serviceType,
      providerType: data.providerType,
      callSessionId: data.callSessionId || null,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: data.metadata || {},
      environment: process.env.NODE_ENV || 'development'
    };

    await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);
  }

  /**
   * Met à jour le statut d'un paiement
   */
  private async updatePaymentStatus(
    paymentIntentId: string, 
    status: string, 
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    await this.db.collection('payments').doc(paymentIntentId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    });
  }

  /**
   * Récupère les statistiques de paiement
   */
  async getPaymentStatistics(options: {
    startDate?: admin.firestore.Timestamp;
    endDate?: admin.firestore.Timestamp;
    providerId?: string;
    serviceType?: string;
  } = {}): Promise<{
    totalAmount: number;
    totalCommission: number;
    totalProviderAmount: number;
    paymentCount: number;
    successfulPayments: number;
    refundedPayments: number;
    averageAmount: number;
  }> {
    try {
      let query = this.db.collection('payments') as any;

      if (options.startDate) {
        query = query.where('createdAt', '>=', options.startDate);
      }
      if (options.endDate) {
        query = query.where('createdAt', '<=', options.endDate);
      }
      if (options.providerId) {
        query = query.where('providerId', '==', options.providerId);
      }
      if (options.serviceType) {
        query = query.where('serviceType', '==', options.serviceType);
      }

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

      return {
        totalAmount,
        totalCommission,
        totalProviderAmount,
        paymentCount: snapshot.size,
        successfulPayments,
        refundedPayments,
        averageAmount: successfulPayments > 0 ? totalAmount / successfulPayments : 0
      };

    } catch (error) {
      await logError('StripeManager:getPaymentStatistics', error);
      throw error;
    }
  }

  /**
   * Récupère un paiement par ID
   */
  async getPayment(paymentIntentId: string): Promise<any> {
    try {
      const [stripePayment, firestorePayment] = await Promise.all([
        stripe.paymentIntents.retrieve(paymentIntentId),
        this.db.collection('payments').doc(paymentIntentId).get()
      ]);

      return {
        stripe: stripePayment,
        firestore: firestorePayment.exists ? firestorePayment.data() : null
      };

    } catch (error) {
      await logError('StripeManager:getPayment', error);
      return null;
    }
  }
}

// Instance singleton
export const stripeManager = new StripeManager();