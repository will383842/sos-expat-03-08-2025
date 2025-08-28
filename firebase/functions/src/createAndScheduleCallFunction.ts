// firebase/functions/src/createAndScheduleCallFunction.ts - Version rectifiée sans planification
import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createCallSession } from './callScheduler';
import { logError } from './utils/logs/logError';

// ✅ Déclarations des secrets Twilio (même si pas utilisés dans cette fonction)
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = defineSecret('TWILIO_PHONE_NUMBER');

// ✅ Interface corrigée pour correspondre exactement aux données frontend
interface CreateCallRequest {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number; // EN EUROS - Interface simplifiée
  delayMinutes?: number; // ✅ Garde le champ pour compatibilité mais ne l'utilise plus
  clientLanguages?: string[];
  providerLanguages?: string[];
  clientWhatsapp?: string;
}

/**
 * ✅ Cloud Function RECTIFIÉE - Crée l'appel SANS planification
 * La planification sera gérée par le webhook Stripe à +5 min
 */
export const createAndScheduleCallHTTPS = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true,
    // ✅ Déclarer les secrets même si pas utilisés (évite les warnings)
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]
  },
  async (request: CallableRequest<CreateCallRequest>) => {
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
        delayMinutes = 5, // ✅ Garde pour compatibilité mais ne sera plus utilisé
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
      // 7. VALIDATION DU PAYMENT INTENT
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
      // 8. CRÉATION DE LA SESSION D'APPEL (SANS PLANIFICATION)
      // ========================================
      console.log(`📞 [${requestId}] Création session d'appel initiée`);
      console.log(`👥 [${requestId}] Client: ${clientId.substring(0, 8)}... → Provider: ${providerId.substring(0, 8)}...`);
      console.log(`💰 [${requestId}] Montant: ${amount}€ pour service ${serviceType}`);
      console.log(`💳 [${requestId}] PaymentIntent: ${paymentIntentId}`);
      console.log(`⚠️ [${requestId}] NOUVEAU FLUX: Pas de planification immédiate - sera géré par webhook Stripe`);

      // ✅ RECTIFICATION: Appel uniquement à createCallSession (sans planification)
      const callSession = await createCallSession({
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        clientWhatsapp: clientWhatsapp || clientPhone, // Fallback si clientWhatsapp n'est pas fourni
        serviceType,
        providerType,
        paymentIntentId,
        amount, // ✅ EN EUROS directement
        requestId,
        clientLanguages: clientLanguages || ['fr'],
        providerLanguages: providerLanguages || ['fr']
      });

      // ✅ RECTIFICATION MAJEURE: Plus de planification ici
      // La planification sera désormais gérée par le webhook Stripe à payment_intent.succeeded
      // qui créera une Cloud Task programmée à +5 minutes

      console.log(`✅ [${requestId}] Session d'appel créée avec succès - ID: ${callSession.id}`);
      console.log(`📅 [${requestId}] Status: ${callSession.status}`);
      console.log(`⏰ [${requestId}] Planification: Sera gérée par webhook Stripe à +5 min`);

      // Calculer l'heure théorique de programmation (pour info uniquement)
      const theoreticalScheduledTime = new Date(Date.now() + (5 * 60 * 1000)); // +5 min fixe

      // ========================================
      // 9. RÉPONSE DE SUCCÈS
      // ========================================
      const response = {
        success: true,
        sessionId: callSession.id,
        status: callSession.status,
        scheduledFor: theoreticalScheduledTime.toISOString(), // ✅ Théorique - sera confirmé par webhook
        scheduledForReadable: theoreticalScheduledTime.toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        message: `Session d'appel créée. Planification dans 5 minutes via webhook Stripe.`,
        amount: amount, // ✅ Retourner en euros
        serviceType,
        providerType,
        requestId,
        paymentIntentId,
        delayMinutes: 5, // ✅ Fixe à 5 minutes maintenant
        timestamp: new Date().toISOString(),
        // ✅ NOUVEAU: Indiquer le nouveau flux
        schedulingMethod: 'stripe_webhook', // vs 'immediate' dans l'ancien flux
        note: 'L\'appel sera automatiquement planifié par Stripe webhook une fois le paiement confirmé'
      };

      console.log(`🎉 [${requestId}] Réponse envoyée:`, {
        sessionId: response.sessionId,
        status: response.status,
        scheduledFor: response.scheduledFor,
        amount: response.amount,
        schedulingMethod: response.schedulingMethod
      });

      return response;

    } catch (error: unknown) {
      // ========================================
      // 10. GESTION D'ERREURS COMPLÈTE
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
          hasProviderPhone: !!request.data?.providerPhone,
          hasClientPhone: !!request.data?.clientPhone,
          providerPhoneLength: request.data?.providerPhone?.length || 0,
          clientPhoneLength: request.data?.clientPhone?.length || 0,
        },
        userAuth: request.auth?.uid?.substring(0, 8) + '...' || 'not-authenticated',
        timestamp: new Date().toISOString(),
        newFlow: 'stripe_webhook_scheduling' // ✅ Indiquer le nouveau flux dans les logs d'erreur
      };

      // Log détaillé de l'erreur
      await logError('createCallSession:error', errorDetails);

      console.error(`❌ [${requestId}] Erreur lors de la création de session:`, {
        error: errorDetails.error,
        errorType: errorDetails.errorType,
        serviceType: request.data?.serviceType,
        amount: request.data?.amount,
        hasProviderPhone: errorDetails.requestData.hasProviderPhone,
        hasClientPhone: errorDetails.requestData.hasClientPhone,
        newFlow: errorDetails.newFlow
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

        if (error.message.includes('session') || error.message.includes('call')) {
          throw new HttpsError(
            'internal',
            'Erreur lors de la création de la session d\'appel. Service temporairement indisponible.'
          );
        }

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
        'Erreur interne lors de la création de la session d\'appel. Veuillez réessayer dans quelques instants.'
      );
    }
  }
);