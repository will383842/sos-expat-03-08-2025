import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createAndScheduleCall } from './callScheduler';
import { logError } from './utils/logs/logError';

// 🔧 Interface pour les données reçues du frontend
interface CreateAndScheduleCallRequest {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number; // EN EUROS
  delayMinutes?: number;
  clientLanguages?: string[];
  providerLanguages?: string[];
}

/**
 * 🔧 Cloud Function CORRIGÉE - Convertie de onRequest vers onCall pour résoudre CORS
 * Crée et programme un appel entre client et prestataire
 */
export const createAndScheduleCallHTTPS = onCall(
  {
    memory: "128MiB",
    timeoutSeconds: 30
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
        amount, // EN EUROS
        delayMinutes = 5,
        clientLanguages,
        providerLanguages
      } = request.data;

      // 🔧 Debug des données reçues
      console.log('📞 === CREATE AND SCHEDULE CALL - DONNÉES REÇUES ===');
      console.log('💰 Montant reçu:', {
        amount,
        type: typeof amount,
        amountInEuros: amount,
        serviceType,
        providerType,
        requestId
      });

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
      // 5. VALIDATION DES MONTANTS EN EUROS
      // ========================================
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        throw new HttpsError(
          'invalid-argument',
          `Montant invalide: ${amount} (type: ${typeof amount})`
        );
      }

      if (amount > 500) { // Max 500€
        throw new HttpsError(
          'invalid-argument',
          'Montant maximum de 500€ dépassé.'
        );
      }

      if (amount < 5) { // 5€ minimum
        throw new HttpsError(
          'invalid-argument',
          'Montant minimum de 5€ requis.'
        );
      }

      // Validation cohérence montant/service EN EUROS
      const expectedAmountEuros = serviceType === 'lawyer_call' ? 49 : 19;
      const tolerance = 5; // 5€ de tolérance
      
      if (Math.abs(amount - expectedAmountEuros) > tolerance) {
        console.warn(`⚠️ [${requestId}] Montant inhabituel: reçu ${amount}€, attendu ${expectedAmountEuros}€ pour ${serviceType}`);
        // Ne pas bloquer mais logger pour audit
      }

      // ========================================
      // 6. VALIDATION DES NUMÉROS DE TÉLÉPHONE
      // ========================================
      const phoneRegex = /^\+[1-9]\d{8,14}$/;
      if (!phoneRegex.test(providerPhone)) {
        throw new HttpsError(
          'invalid-argument',
          'Numéro de téléphone prestataire invalide. Format requis: +33XXXXXXXXX'
        );
      }

      if (!phoneRegex.test(clientPhone)) {
        throw new HttpsError(
          'invalid-argument',
          'Numéro de téléphone client invalide. Format requis: +33XXXXXXXXX'
        );
      }

      if (providerPhone === clientPhone) {
        throw new HttpsError(
          'invalid-argument',
          'Les numéros du prestataire et du client doivent être différents.'
        );
      }

      // ========================================
      // 7. VALIDATION DU DÉLAI
      // ========================================
      const validDelayMinutes = Math.min(Math.max(delayMinutes, 0), 10); // Entre 0 et 10 minutes

      // ========================================
      // 8. VALIDATION DU PAYMENT INTENT
      // ========================================
      if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
        throw new HttpsError(
          'invalid-argument',
          'PaymentIntent ID invalide ou manquant.'
        );
      }

      // ========================================
      // 9. CRÉATION ET PLANIFICATION DE L'APPEL
      // ========================================
      console.log(`📞 [${requestId}] Création appel initiée`);
      console.log(`👥 [${requestId}] Client: ${clientId.substring(0, 8)}... → Provider: ${providerId.substring(0, 8)}...`);
      console.log(`💰 [${requestId}] Montant: ${amount}€ pour service ${serviceType}`);
      console.log(`⏰ [${requestId}] Délai programmé: ${validDelayMinutes} minutes`);
      console.log(`💳 [${requestId}] PaymentIntent: ${paymentIntentId}`);

      // Appel au callScheduler avec les données validées
      const callSession = await createAndScheduleCall({
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        serviceType,
        providerType,
        paymentIntentId,
        amount, // EN EUROS (le callScheduler gère la conversion si nécessaire)
        delayMinutes: validDelayMinutes,
        requestId,
        clientLanguages: clientLanguages || ['fr'],
        providerLanguages: providerLanguages || ['fr']
      });

      console.log(`✅ [${requestId}] Appel créé avec succès - Session: ${callSession.id}`);
      console.log(`📅 [${requestId}] Status: ${callSession.status}`);

      // Calculer l'heure de programmation
      const scheduledTime = new Date(Date.now() + (validDelayMinutes * 60 * 1000));

      // ========================================
      // 10. RÉPONSE DE SUCCÈS
      // ========================================
      const response = {
        success: true,
        sessionId: callSession.id,
        status: callSession.status,
        scheduledFor: scheduledTime.toISOString(),
        scheduledForReadable: scheduledTime.toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        message: `Appel programmé dans ${validDelayMinutes} minutes`,
        amount: amount, // Retourner en euros pour l'affichage frontend
        serviceType,
        providerType,
        requestId,
        paymentIntentId,
        delayMinutes: validDelayMinutes,
        timestamp: new Date().toISOString()
      };

      console.log(`🎉 [${requestId}] Réponse envoyée:`, {
        sessionId: response.sessionId,
        status: response.status,
        scheduledFor: response.scheduledFor,
        amount: response.amount
      });

      return response;

    } catch (error: unknown) {
      // ========================================
      // 11. GESTION D'ERREURS COMPLÈTE
      // ========================================
      const errorDetails = {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined,
        requestData: {
          providerId: request.data?.providerId?.substring(0, 8) + '...' || 'undefined',
          clientId: request.data?.clientId?.substring(0, 8) + '...' || 'undefined',
          serviceType: request.data?.serviceType,
          amount: request.data?.amount,
          amountType: typeof request.data?.amount,
          paymentIntentId: request.data?.paymentIntentId,
          hasAuth: !!request.auth,
          delayMinutes: request.data?.delayMinutes
        },
        userAuth: request.auth?.uid?.substring(0, 8) + '...' || 'not-authenticated',
        timestamp: new Date().toISOString()
      };

      // Log détaillé de l'erreur
      await logError('createAndScheduleCall:error', errorDetails);

      console.error(`❌ [${requestId}] Erreur lors de la création d'appel:`, {
        error: errorDetails.error,
        errorType: errorDetails.errorType,
        serviceType: request.data?.serviceType,
        amount: request.data?.amount
      });

      // Si c'est déjà une HttpsError Firebase, la relancer telle quelle
      if (error instanceof HttpsError) {
        throw error;
      }

      // Pour les autres types d'erreurs, les wrapper dans HttpsError
      if (error instanceof Error) {
        // Erreurs spécifiques selon le message
        if (error.message.includes('payment') || error.message.includes('PaymentIntent')) {
          throw new HttpsError(
            'failed-precondition',
            'Erreur liée au paiement. Vérifiez que le paiement a été validé.'
          );
        }
        
        if (error.message.includes('provider') || error.message.includes('client')) {
          throw new HttpsError(
            'not-found',
            'Prestataire ou client introuvable. Vérifiez les identifiants.'
          );
        }

        if (error.message.includes('schedule') || error.message.includes('call')) {
          throw new HttpsError(
            'internal',
            'Erreur lors de la programmation de l\'appel. Service temporairement indisponible.'
          );
        }
      }

      // Erreur générique pour tout le reste
      throw new HttpsError(
        'internal',
        'Erreur interne lors de la création de l\'appel. Veuillez réessayer dans quelques instants.'
      );
    }
  }
);