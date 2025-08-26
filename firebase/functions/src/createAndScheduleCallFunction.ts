// firebase/functions/src/createAndScheduleCallFunction.ts - Version corrigée
import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createAndScheduleCall } from './callScheduler';
import { logError } from './utils/logs/logError';

// ✅ CORRECTION: Interface corrigée pour correspondre exactement aux données frontend
interface CreateAndScheduleCallRequest {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number; // EN EUROS - Interface simplifiée
  delayMinutes?: number;
  clientLanguages?: string[];
  providerLanguages?: string[];
  // ✅ CORRECTION: Ajouter le champ clientWhatsapp qui est maintenant envoyé
  clientWhatsapp?: string;
}

/**
 * ✅ Cloud Function CORRIGÉE avec validation détaillée et logs de debug
 */
export const createAndScheduleCallHTTPS = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
  },
  async (request: CallableRequest<CreateAndScheduleCallRequest>) => {
    const requestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      // ========================================
      // 1. VALIDATION DE L'AUTHENTIFICATION
      // ========================================
      if (!request.auth) {
        console.error(`❌ [${requestId}] Authentification manquante`);
        throw new HttpsError(
          'unauthenticated',
          'Authentification requise pour créer un appel.'
        );
      }

      const userId = request.auth.uid;
      console.log(`✅ [${requestId}] Utilisateur authentifié: ${userId.substring(0, 8)}...`);

      // ========================================
      // 2. VALIDATION DES DONNÉES DÉTAILLÉE
      // ========================================
      console.log(`🔍 [${requestId}] Données reçues:`, {
        providerId: request.data?.providerId ? request.data.providerId.substring(0, 8) + '...' : 'MANQUANT',
        clientId: request.data?.clientId ? request.data.clientId.substring(0, 8) + '...' : 'MANQUANT',
        providerPhone: request.data?.providerPhone ? '✅ Fourni' : '❌ MANQUANT',
        clientPhone: request.data?.clientPhone ? '✅ Fourni' : '❌ MANQUANT',
        serviceType: request.data?.serviceType || 'MANQUANT',
        providerType: request.data?.providerType || 'MANQUANT',
        paymentIntentId: request.data?.paymentIntentId ? '✅ Fourni' : '❌ MANQUANT',
        amount: request.data?.amount || 'MANQUANT',
        clientWhatsapp: request.data?.clientWhatsapp ? '✅ Fourni' : 'Non fourni (optionnel)',
        delayMinutes: request.data?.delayMinutes || 5
      });

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
        providerLanguages,
        clientWhatsapp,
      } = request.data;

      // ✅ VALIDATION CHAMP PAR CHAMP avec messages d'erreur spécifiques
      const missingFields = [];

      if (!providerId) {
        missingFields.push('providerId');
      }
      if (!clientId) {
        missingFields.push('clientId');
      }
      if (!providerPhone) {
        missingFields.push('providerPhone');
      }
      if (!clientPhone) {
        missingFields.push('clientPhone');
      }
      if (!serviceType) {
        missingFields.push('serviceType');
      }
      if (!providerType) {
        missingFields.push('providerType');
      }
      if (!paymentIntentId) {
        missingFields.push('paymentIntentId');
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        missingFields.push('amount (doit être un nombre positif)');
      }

      if (missingFields.length > 0) {
        console.error(`❌ [${requestId}] Champs manquants:`, missingFields);
        throw new HttpsError(
          'invalid-argument',
          `Données requises manquantes pour créer l'appel: ${missingFields.join(', ')}`
        );
      }

      console.log(`✅ [${requestId}] Tous les champs requis sont présents`);

      // ========================================
      // 3. VALIDATION DES PERMISSIONS
      // ========================================
      if (userId !== clientId) {
        console.error(`❌ [${requestId}] Permission refusée: userId=${userId.substring(0, 8)}... != clientId=${clientId.substring(0, 8)}...`);
        throw new HttpsError(
          'permission-denied',
          'Vous ne pouvez créer un appel que pour votre propre compte.'
        );
      }

      console.log(`✅ [${requestId}] Permissions validées`);

      // ========================================
      // 4. VALIDATION DES TYPES DE SERVICE
      // ========================================
      const allowedServiceTypes = ['lawyer_call', 'expat_call'];
      const allowedProviderTypes = ['lawyer', 'expat'];

      if (!allowedServiceTypes.includes(serviceType)) {
        console.error(`❌ [${requestId}] Type de service invalide:`, serviceType);
        throw new HttpsError(
          'invalid-argument',
          `Type de service invalide. Types autorisés: ${allowedServiceTypes.join(', ')}`
        );
      }

      if (!allowedProviderTypes.includes(providerType)) {
        console.error(`❌ [${requestId}] Type de prestataire invalide:`, providerType);
        throw new HttpsError(
          'invalid-argument',
          `Type de prestataire invalide. Types autorisés: ${allowedProviderTypes.join(', ')}`
        );
      }

      console.log(`✅ [${requestId}] Types de service validés`);

      // ========================================
      // 5. VALIDATION DES MONTANTS EN EUROS
      // ========================================
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        console.error(`❌ [${requestId}] Montant invalide:`, { amount, type: typeof amount });
        throw new HttpsError(
          'invalid-argument',
          `Montant invalide: ${amount} (type: ${typeof amount})`
        );
      }

      if (amount > 500) {
        console.error(`❌ [${requestId}] Montant trop élevé:`, amount);
        throw new HttpsError(
          'invalid-argument',
          'Montant maximum de 500€ dépassé.'
        );
      }

      if (amount < 5) {
        console.error(`❌ [${requestId}] Montant trop faible:`, amount);
        throw new HttpsError(
          'invalid-argument',
          'Montant minimum de 5€ requis.'
        );
      }

      // ✅ Validation cohérence montant/service avec tolérance élargie
      const expectedAmountEuros = serviceType === 'lawyer_call' ? 49 : 19;
      const tolerance = 15; // 15€ de tolérance
      
      if (Math.abs(amount - expectedAmountEuros) > tolerance) {
        console.warn(`⚠️ [${requestId}] Montant inhabituel: reçu ${amount}€, attendu ${expectedAmountEuros}€ pour ${serviceType}`);
        // ✅ Ne pas bloquer, juste logger pour audit
      }

      console.log(`✅ [${requestId}] Montant validé: ${amount}€`);

      // ========================================
      // 6. VALIDATION DES NUMÉROS DE TÉLÉPHONE
      // ========================================
      const phoneRegex = /^\+[1-9]\d{8,14}$/;
      
      if (!phoneRegex.test(providerPhone)) {
        console.error(`❌ [${requestId}] Numéro prestataire invalide:`, providerPhone);
        throw new HttpsError(
          'invalid-argument',
          'Numéro de téléphone prestataire invalide. Format requis: +33XXXXXXXXX'
        );
      }

      if (!phoneRegex.test(clientPhone)) {
        console.error(`❌ [${requestId}] Numéro client invalide:`, clientPhone);
        throw new HttpsError(
          'invalid-argument',
          'Numéro de téléphone client invalide. Format requis: +33XXXXXXXXX'
        );
      }

      if (providerPhone === clientPhone) {
        console.error(`❌ [${requestId}] Numéros identiques:`, { providerPhone, clientPhone });
        throw new HttpsError(
          'invalid-argument',
          'Les numéros du prestataire et du client doivent être différents.'
        );
      }

      console.log(`✅ [${requestId}] Numéros de téléphone validés`);

      // ========================================
      // 7. VALIDATION DU DÉLAI
      // ========================================
      const validDelayMinutes = Math.min(Math.max(delayMinutes, 0), 10);
      
      if (validDelayMinutes !== delayMinutes) {
        console.warn(`⚠️ [${requestId}] Délai ajusté: ${delayMinutes} → ${validDelayMinutes} minutes`);
      }

      // ========================================
      // 8. VALIDATION DU PAYMENT INTENT
      // ========================================
      if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
        console.error(`❌ [${requestId}] PaymentIntent ID invalide:`, paymentIntentId);
        throw new HttpsError(
          'invalid-argument',
          'PaymentIntent ID invalide ou manquant.'
        );
      }

      console.log(`✅ [${requestId}] PaymentIntent validé: ${paymentIntentId}`);

      // ========================================
      // 9. CRÉATION ET PLANIFICATION DE L'APPEL
      // ========================================
      console.log(`📞 [${requestId}] Création appel initiée`);
      console.log(`👥 [${requestId}] Client: ${clientId.substring(0, 8)}... → Provider: ${providerId.substring(0, 8)}...`);
      console.log(`💰 [${requestId}] Montant: ${amount}€ pour service ${serviceType}`);
      console.log(`⏰ [${requestId}] Délai programmé: ${validDelayMinutes} minutes`);
      console.log(`💳 [${requestId}] PaymentIntent: ${paymentIntentId}`);

      // ✅ Appel au callScheduler avec toutes les données
      const callSession = await createAndScheduleCall({
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        clientWhatsapp: clientWhatsapp || clientPhone, // Fallback si clientWhatsapp n'est pas fourni
        serviceType,
        providerType,
        paymentIntentId,
        amount, // ✅ EN EUROS directement
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
        amount: amount, // ✅ Retourner en euros
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
          delayMinutes: request.data?.delayMinutes,
          // ✅ AJOUT: Debug des numéros de téléphone
          hasProviderPhone: !!request.data?.providerPhone,
          hasClientPhone: !!request.data?.clientPhone,
          providerPhoneLength: request.data?.providerPhone?.length || 0,
          clientPhoneLength: request.data?.clientPhone?.length || 0,
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
        amount: request.data?.amount,
        hasProviderPhone: errorDetails.requestData.hasProviderPhone,
        hasClientPhone: errorDetails.requestData.hasClientPhone
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

        // ✅ AJOUT: Erreurs spécifiques aux numéros de téléphone
        if (error.message.includes('phone') || error.message.includes('téléphone')) {
          throw new HttpsError(
            'invalid-argument',
            error.message
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