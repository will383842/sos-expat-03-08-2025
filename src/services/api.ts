import { auth } from '../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialiser Firebase Functions
const functions = getFunctions();

/**
 * Interface pour les résultats des fonctions Cloud
 */
interface CloudFunctionResult {
  success?: boolean;
  [key: string]: unknown;
}

/**
 * Interface pour les données d'appel
 */
interface CallData {
  clientId: string;
  providerId: string;
  clientPhone: string;
  providerPhone: string;
  providerType: 'lawyer' | 'expat';
  clientLanguage?: string;
  providerLanguage?: string;
  paymentIntentId: string;
}

/**
 * Interface pour les données SMS
 */
interface SmsData {
  to: string;
  message: string;
  from?: string;
}

/**
 * Interface pour les données de paiement
 */
interface PaymentData {
  amount: number;
  currency?: string;
  description?: string;
}

/**
 * Vérification de l'authentification utilisateur
 */
function checkUserAuth(): void {
  if (!auth.currentUser) {
    throw new Error('Vous devez être connecté pour effectuer cette action');
  }
}

/**
 * Gestion des erreurs des fonctions Cloud
 */
function handleCloudFunctionError(error: unknown, operation: string): never {
  console.error(`Error ${operation}:`, error);
  throw error;
}

/**
 * Crée une intention de paiement via Stripe
 */
export async function createPaymentIntent(data: PaymentData) {
  try {
    checkUserAuth();
    
    const createPaymentIntentFn = httpsCallable(functions, 'createPaymentIntent');
    const result = await createPaymentIntentFn({
      amount: data.amount,
      currency: data.currency || 'eur',
      description: data.description
    });
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'creating payment intent');
  }
}

/**
 * Capture un paiement après un appel réussi
 */
export async function capturePayment(paymentIntentId: string): Promise<boolean> {
  try {
    checkUserAuth();
    
    const capturePaymentFn = httpsCallable(functions, 'capturePayment');
    const result = await capturePaymentFn({ paymentIntentId });
    
    return (result.data as CloudFunctionResult)?.success || false;
  } catch (error) {
    console.error('Error capturing payment:', error);
    return false;
  }
}

/**
 * Annule un paiement
 */
export async function cancelPayment(paymentIntentId: string): Promise<boolean> {
  try {
    checkUserAuth();
    
    const cancelPaymentFn = httpsCallable(functions, 'cancelPayment');
    const result = await cancelPaymentFn({ paymentIntentId });
    
    return (result.data as CloudFunctionResult)?.success || false;
  } catch (error) {
    console.error('Error canceling payment:', error);
    return false;
  }
}

/**
 * Initie un appel via Twilio
 */
export async function initiateCall(callData: CallData) {
  try {
    checkUserAuth();
    
    const initiateCallFn = httpsCallable(functions, 'initiateCall');
    const result = await initiateCallFn(callData);
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'initiating call');
  }
}

/**
 * Envoie un SMS via Twilio
 */
export async function sendSms(data: SmsData) {
  try {
    checkUserAuth();
    
    const sendSmsFn = httpsCallable(functions, 'sendSms');
    const result = await sendSmsFn(data);
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'sending SMS');
  }
}

/**
 * Met à jour le statut d'un appel
 */
export async function updateCallStatus(
  callSessionId: string, 
  status: string, 
  details?: Record<string, unknown>
) {
  try {
    checkUserAuth();
    
    const updateCallStatusFn = httpsCallable(functions, 'updateCallStatus');
    const result = await updateCallStatusFn({
      callSessionId,
      status,
      details
    });
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'updating call status');
  }
}