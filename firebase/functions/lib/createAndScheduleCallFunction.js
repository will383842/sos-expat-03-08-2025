"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndScheduleCallHTTPS = void 0;
const https_1 = require("firebase-functions/v2/https");
const callScheduler_1 = require("./callScheduler");
const logError_1 = require("./utils/logs/logError");
/**
 * 🔧 Cloud Function CORRIGÉE pour créer et programmer un appel
 */
exports.createAndScheduleCallHTTPS = (0, https_1.onCall)({
    // ✅ Configuration CORS
    cors: [
        /localhost:\d+/,
        /127\.0\.0\.1:\d+/,
        /firebase\.com$/,
    ],
}, async (request) => {
    var _a;
    const requestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        // ========================================
        // 1. VALIDATION DE L'AUTHENTIFICATION
        // ========================================
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un appel.');
        }
        const userId = request.auth.uid;
        // ========================================
        // 2. VALIDATION DES DONNÉES
        // ========================================
        const { providerId, clientId, providerPhone, clientPhone, serviceType, providerType, paymentIntentId, amount, // 🔧 FIX: EN EUROS
        delayMinutes = 5, clientLanguages, providerLanguages } = request.data;
        // 🔧 FIX: Debug des données reçues
        console.log('📞 === CREATE AND SCHEDULE CALL - DONNÉES REÇUES ===');
        console.log('💰 Montant reçu:', {
            amount,
            type: typeof amount,
            amountInEuros: amount,
            serviceType,
            providerType
        });
        // Vérification des champs obligatoires
        if (!providerId || !clientId || !providerPhone || !clientPhone ||
            !serviceType || !providerType || !paymentIntentId || !amount) {
            throw new https_1.HttpsError('invalid-argument', 'Données requises manquantes pour créer l\'appel.');
        }
        // ========================================
        // 3. VALIDATION DES PERMISSIONS
        // ========================================
        if (userId !== clientId) {
            throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un appel que pour votre propre compte.');
        }
        // ========================================
        // 4. VALIDATION DES TYPES DE SERVICE
        // ========================================
        const allowedServiceTypes = ['lawyer_call', 'expat_call'];
        const allowedProviderTypes = ['lawyer', 'expat'];
        if (!allowedServiceTypes.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', `Type de service invalide. Types autorisés: ${allowedServiceTypes.join(', ')}`);
        }
        if (!allowedProviderTypes.includes(providerType)) {
            throw new https_1.HttpsError('invalid-argument', `Type de prestataire invalide. Types autorisés: ${allowedProviderTypes.join(', ')}`);
        }
        // ========================================
        // 5. 🔧 FIX: VALIDATION DES MONTANTS EN EUROS
        // ========================================
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', `Montant invalide: ${amount} (type: ${typeof amount})`);
        }
        if (amount > 500) { // Max 500€
            throw new https_1.HttpsError('invalid-argument', 'Montant maximum de 500€ dépassé.');
        }
        if (amount < 5) { // 5€ minimum
            throw new https_1.HttpsError('invalid-argument', 'Montant minimum de 5€ requis.');
        }
        // 🔧 FIX: Validation cohérence montant/service EN EUROS
        const expectedAmountEuros = serviceType === 'lawyer_call' ? 49 : 19;
        const tolerance = 5; // 5€ de tolérance
        if (Math.abs(amount - expectedAmountEuros) > tolerance) {
            console.warn(`⚠️ Montant inhabituel: reçu ${amount}€, attendu ${expectedAmountEuros}€ pour ${serviceType}`);
            // Ne pas bloquer mais logger pour audit
        }
        // ========================================
        // 6. VALIDATION DES NUMÉROS DE TÉLÉPHONE
        // ========================================
        const phoneRegex = /^\+[1-9]\d{8,14}$/;
        if (!phoneRegex.test(providerPhone)) {
            throw new https_1.HttpsError('invalid-argument', 'Numéro de téléphone prestataire invalide. Format requis: +33XXXXXXXXX');
        }
        if (!phoneRegex.test(clientPhone)) {
            throw new https_1.HttpsError('invalid-argument', 'Numéro de téléphone client invalide. Format requis: +33XXXXXXXXX');
        }
        if (providerPhone === clientPhone) {
            throw new https_1.HttpsError('invalid-argument', 'Les numéros du prestataire et du client doivent être différents.');
        }
        // ========================================
        // 7. VALIDATION DU DÉLAI
        // ========================================
        const validDelayMinutes = Math.min(Math.max(delayMinutes, 0), 10); // Entre 0 et 10 minutes
        // ========================================
        // 8. CRÉATION ET PLANIFICATION DE L'APPEL
        // ========================================
        console.log(`[${requestId}] Création appel - Client: ${clientId}, Provider: ${providerId}`);
        console.log(`[${requestId}] Montant: ${amount}€ pour ${serviceType}`);
        console.log(`[${requestId}] Service: ${serviceType}, Provider: ${providerType}`);
        console.log(`[${requestId}] Délai: ${validDelayMinutes} minutes`);
        // 🔧 FIX: Le callScheduler reçoit maintenant des EUROS et convertit en centimes si nécessaire
        const callSession = await (0, callScheduler_1.createAndScheduleCall)({
            providerId,
            clientId,
            providerPhone,
            clientPhone,
            serviceType,
            providerType,
            paymentIntentId,
            amount, // 🔧 FIX: EN EUROS (callScheduler gère la conversion si nécessaire)
            delayMinutes: validDelayMinutes,
            requestId,
            clientLanguages: clientLanguages || ['fr'],
            providerLanguages: providerLanguages || ['fr']
        });
        console.log(`[${requestId}] Appel créé avec succès - Session: ${callSession.id}`);
        // ========================================
        // 9. RÉPONSE DE SUCCÈS
        // ========================================
        return {
            success: true,
            sessionId: callSession.id,
            status: callSession.status,
            scheduledFor: new Date(Date.now() + (validDelayMinutes * 60 * 1000)).toISOString(),
            message: `Appel programmé dans ${validDelayMinutes} minutes`,
            amount: amount, // 🔧 FIX: Retourner en euros pour l'affichage
            serviceType,
            providerType,
            requestId,
            paymentIntentId
        };
    }
    catch (error) {
        // ========================================
        // 10. GESTION D'ERREURS
        // ========================================
        await (0, logError_1.logError)('createAndScheduleCallFunction:error', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            requestData: {
                providerId: request.data.providerId,
                serviceType: request.data.serviceType,
                amount: request.data.amount,
                amountType: typeof request.data.amount,
                hasAuth: !!request.auth
            },
            userAuth: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'not-authenticated',
            timestamp: new Date().toISOString()
        });
        // Si c'est déjà une HttpsError, la relancer telle quelle
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Pour toute autre erreur, réponse générique sécurisée
        throw new https_1.HttpsError('internal', 'Erreur lors de la création de l\'appel. Veuillez réessayer.');
    }
});
//# sourceMappingURL=createAndScheduleCallFunction.js.map