import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

// Initialiser Stripe avec la configuration d'environnement
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Interface pour les données de PaymentIntent
interface PaymentIntentData {
  amount: number;
  currency?: string;
  serviceType: string;
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  commissionAmount?: number;
  providerAmount?: number;
  metadata?: Record<string, string>;
}

// ✅ Cloud Function sécurisée avec Firebase Functions v2
export const createPaymentIntent = onCall(async (request: CallableRequest<PaymentIntentData>) => {
  try {
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'L\'utilisateur doit être authentifié pour créer un paiement.'
      );
    }

    const {
      amount,
      currency = 'eur',
      serviceType,
      providerId,
      clientId,
      clientEmail,
      providerName,
      description,
      commissionAmount,
      providerAmount,
      metadata = {}
    } = request.data;

    // Validation des données requises
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Montant manquant ou invalide.');
    }

    if (!serviceType || !providerId || !clientId) {
      throw new HttpsError('invalid-argument', 'Données de service manquantes (serviceType, providerId, clientId).');
    }

    // Vérifier que l'utilisateur authentifié correspond au clientId
    if (request.auth.uid !== clientId) {
      throw new HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
    }

    console.log('Création PaymentIntent pour:', {
      amount,
      currency,
      serviceType,
      clientId,
      providerId
    });

    // 🧾 Création du PaymentIntent avec Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: 'manual', // Capture différée pour validation
      metadata: {
        serviceType,
        providerId,
        clientId,
        clientEmail: clientEmail || '',
        providerName: providerName || '',
        commissionAmount: commissionAmount?.toString() || '0',
        providerAmount: providerAmount?.toString() || amount.toString(),
        ...metadata
      },
      description: description || `Service ${serviceType} - ${providerName || 'Prestataire'}`,
    });

    console.log('PaymentIntent créé avec succès:', paymentIntent.id);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    };

  } catch (error: any) {
    console.error('❌ Erreur création PaymentIntent:', error);
    console.error('Stack trace:', error.stack);
    console.error('Données reçues:', request.data);

    // Si c'est déjà une HttpsError, la relancer telle quelle
    if (error instanceof HttpsError) {
      throw error;
    }

    // Sinon, créer une nouvelle HttpsError
    throw new HttpsError(
      'internal',
      `Erreur lors de la création du paiement: ${error.message || 'Erreur inconnue'}`,
      {
        originalError: error.message,
        code: error.code,
        type: error.type
      }
    );
  }
});