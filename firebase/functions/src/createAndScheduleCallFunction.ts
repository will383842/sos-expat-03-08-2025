import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createAndScheduleCall } from './callScheduler';
import { logError } from './utils/logs/logError';

// Interface pour les données de la requête
interface CreateAndScheduleCallRequest {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number;
  delayMinutes?: number;
  clientLanguages?: string[];
  providerLanguages?: string[];
}

/**
 * Cloud Function pour créer et programmer un appel
 */
export const createAndScheduleCallHTTPS = onCall(
  {
    // ✅ Configuration CORS
    cors: [
      /localhost:\d+/,
      /127\.0\.0\.1:\d+/,
      /firebase\.com$/,
    ],
  },
  async (request: CallableRequest<CreateAndScheduleCallRequest>) => {
    const requestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      // ========================================
      // 1. VALIDATION DE L'AUTHENTIFICATION
      // ========================================
      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          'Authentification requise pour créer un appel.'
        );
      }

      const userId = request.auth.uid;

      // ========================================
      // 2. VALIDATION DES DONNÉES
      // ========================================
      const {
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        serviceType,
        providerType,
        paymentIntentId,
        amount,
        delayMinutes = 5,
        clientLanguages,
        providerLanguages
      } = request.data;

      // Vérification des champs obligatoires
      if (!providerId || !clientId || !providerPhone || !clientPhone || 
          !serviceType || !providerType || !paymentIntentId || !amount) {
        throw new HttpsError(
          'invalid-argument',
          'Données requises manquantes pour créer l\'appel.'
        );
      }

      // ========================================
      // 3. VALIDATION DES PERMISSIONS
      // ========================================
      if (userId !== clientId) {
        throw new HttpsError(
          'permission-denied',
          'Vous ne pouvez créer un appel que pour votre propre compte.'
        );
      }

      // ========================================
      // 4. VALIDATION DES TYPES DE SERVICE
      // ========================================
      const allowedServiceTypes = ['lawyer_call', 'expat_call'];
      const allowedProviderTypes = ['lawyer', 'expat'];

      if (!allowedServiceTypes.includes(serviceType)) {
        throw new HttpsError(
          'invalid-argument',
          `Type de service invalide. Types autorisés: ${allowedServiceTypes.join(', ')}`
        );
      }

      if (!allowedProviderTypes.includes(providerType)) {
        throw new HttpsError(
          'invalid-argument',
          `Type de prestataire invalide. Types autorisés: ${allowedProviderTypes.join(', ')}`
        );
      }

      // ========================================
      // 5. VALIDATION DES MONTANTS
      // ========================================
      if (amount <= 0 || amount > 50000) { // Max 500€
        throw new HttpsError(
          'invalid-argument',
          'Montant invalide. Doit être entre 0.01€ et 500€.'
        );
      }

      // ========================================
      // 6. CRÉATION ET PLANIFICATION DE L'APPEL
      // ========================================
      console.log(`[${requestId}] Création appel - Client: ${clientId}, Provider: ${providerId}`);

      const callSession = await createAndScheduleCall({
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        serviceType,
        providerType,
        paymentIntentId,
        amount,
        delayMinutes: Math.min(Math.max(delayMinutes, 0), 10), // Entre 0 et 10 minutes
        requestId,
        clientLanguages,
        providerLanguages
      });

      console.log(`[${requestId}] Appel créé avec succès - Session: ${callSession.id}`);

      // ========================================
      // 7. RÉPONSE DE SUCCÈS
      // ========================================
      return {
        success: true,
        sessionId: callSession.id,
        status: callSession.status,
        scheduledFor: new Date(Date.now() + (delayMinutes * 60 * 1000)).toISOString(),
        message: `Appel programmé dans ${delayMinutes} minutes`
      };

    } catch (error: unknown) {
      // ========================================
      // 8. GESTION D'ERREURS
      // ========================================
      await logError('createAndScheduleCallFunction:error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        requestData: {
          providerId: request.data.providerId,
          serviceType: request.data.serviceType,
          hasAuth: !!request.auth
        },
        userAuth: request.auth?.uid || 'not-authenticated'
      });

      // Si c'est déjà une HttpsError, la relancer telle quelle
      if (error instanceof HttpsError) {
        throw error;
      }

      // Pour toute autre erreur, réponse générique sécurisée
      throw new HttpsError(
        'internal',
        'Erreur lors de la création de l\'appel. Veuillez réessayer.'
      );
    }
  }
);