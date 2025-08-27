"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndScheduleCallHTTPS = void 0;
// firebase/functions/src/createAndScheduleCallFunction.ts - Version corrigée
const https_1 = require("firebase-functions/v2/https");
const callScheduler_1 = require("./callScheduler");
const logError_1 = require("./utils/logs/logError");
/**
 * ✅ Cloud Function CORRIGÉE avec validation détaillée et logs de debug
 */
exports.createAndScheduleCallHTTPS = (0, https_1.onCall)({
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true
}, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
    const requestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
        // ========================================
        // 1. VALIDATION DE L'AUTHENTIFICATION
        // ========================================
        if (!request.auth) {
            console.error(`❌ [${requestId}] Authentification manquante`);
            throw new https_1.HttpsError('unauthenticated', 'Authentification requise pour créer un appel.');
        }
        const userId = request.auth.uid;
        console.log(`✅ [${requestId}] Utilisateur authentifié: ${userId.substring(0, 8)}...`);
        // ========================================
        // 2. VALIDATION DES DONNÉES DÉTAILLÉE
        // ========================================
        console.log(`🔍 [${requestId}] Données reçues:`, {
            providerId: ((_a = request.data) === null || _a === void 0 ? void 0 : _a.providerId) ? request.data.providerId.substring(0, 8) + '...' : 'MANQUANT',
            clientId: ((_b = request.data) === null || _b === void 0 ? void 0 : _b.clientId) ? request.data.clientId.substring(0, 8) + '...' : 'MANQUANT',
            providerPhone: ((_c = request.data) === null || _c === void 0 ? void 0 : _c.providerPhone) ? '✅ Fourni' : '❌ MANQUANT',
            clientPhone: ((_d = request.data) === null || _d === void 0 ? void 0 : _d.clientPhone) ? '✅ Fourni' : '❌ MANQUANT',
            serviceType: ((_e = request.data) === null || _e === void 0 ? void 0 : _e.serviceType) || 'MANQUANT',
            providerType: ((_f = request.data) === null || _f === void 0 ? void 0 : _f.providerType) || 'MANQUANT',
            paymentIntentId: ((_g = request.data) === null || _g === void 0 ? void 0 : _g.paymentIntentId) ? '✅ Fourni' : '❌ MANQUANT',
            amount: ((_h = request.data) === null || _h === void 0 ? void 0 : _h.amount) || 'MANQUANT',
            clientWhatsapp: ((_j = request.data) === null || _j === void 0 ? void 0 : _j.clientWhatsapp) ? '✅ Fourni' : 'Non fourni (optionnel)',
            delayMinutes: ((_k = request.data) === null || _k === void 0 ? void 0 : _k.delayMinutes) || 5
        });
        const { providerId, clientId, providerPhone, clientPhone, serviceType, providerType, paymentIntentId, amount, delayMinutes = 5, clientLanguages, providerLanguages, clientWhatsapp, } = request.data;
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
            throw new https_1.HttpsError('invalid-argument', `Données requises manquantes pour créer l'appel: ${missingFields.join(', ')}`);
        }
        console.log(`✅ [${requestId}] Tous les champs requis sont présents`);
        // ========================================
        // 3. VALIDATION DES PERMISSIONS
        // ========================================
        if (userId !== clientId) {
            console.error(`❌ [${requestId}] Permission refusée: userId=${userId.substring(0, 8)}... != clientId=${clientId.substring(0, 8)}...`);
            throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un appel que pour votre propre compte.');
        }
        console.log(`✅ [${requestId}] Permissions validées`);
        // ========================================
        // 4. VALIDATION DES TYPES DE SERVICE
        // ========================================
        const allowedServiceTypes = ['lawyer_call', 'expat_call'];
        const allowedProviderTypes = ['lawyer', 'expat'];
        if (!allowedServiceTypes.includes(serviceType)) {
            console.error(`❌ [${requestId}] Type de service invalide:`, serviceType);
            throw new https_1.HttpsError('invalid-argument', `Type de service invalide. Types autorisés: ${allowedServiceTypes.join(', ')}`);
        }
        if (!allowedProviderTypes.includes(providerType)) {
            console.error(`❌ [${requestId}] Type de prestataire invalide:`, providerType);
            throw new https_1.HttpsError('invalid-argument', `Type de prestataire invalide. Types autorisés: ${allowedProviderTypes.join(', ')}`);
        }
        console.log(`✅ [${requestId}] Types de service validés`);
        // ========================================
        // 5. VALIDATION DES MONTANTS EN EUROS
        // ========================================
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            console.error(`❌ [${requestId}] Montant invalide:`, { amount, type: typeof amount });
            throw new https_1.HttpsError('invalid-argument', `Montant invalide: ${amount} (type: ${typeof amount})`);
        }
        if (amount > 500) {
            console.error(`❌ [${requestId}] Montant trop élevé:`, amount);
            throw new https_1.HttpsError('invalid-argument', 'Montant maximum de 500€ dépassé.');
        }
        if (amount < 5) {
            console.error(`❌ [${requestId}] Montant trop faible:`, amount);
            throw new https_1.HttpsError('invalid-argument', 'Montant minimum de 5€ requis.');
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
            throw new https_1.HttpsError('invalid-argument', 'Numéro de téléphone prestataire invalide. Format requis: +33XXXXXXXXX');
        }
        if (!phoneRegex.test(clientPhone)) {
            console.error(`❌ [${requestId}] Numéro client invalide:`, clientPhone);
            throw new https_1.HttpsError('invalid-argument', 'Numéro de téléphone client invalide. Format requis: +33XXXXXXXXX');
        }
        if (providerPhone === clientPhone) {
            console.error(`❌ [${requestId}] Numéros identiques:`, { providerPhone, clientPhone });
            throw new https_1.HttpsError('invalid-argument', 'Les numéros du prestataire et du client doivent être différents.');
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
            throw new https_1.HttpsError('invalid-argument', 'PaymentIntent ID invalide ou manquant.');
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
        const callSession = await (0, callScheduler_1.createAndScheduleCall)({
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
    }
    catch (error) {
        // ========================================
        // 11. GESTION D'ERREURS COMPLÈTE
        // ========================================
        const errorDetails = {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
            stack: error instanceof Error ? error.stack : undefined,
            requestData: {
                providerId: ((_m = (_l = request.data) === null || _l === void 0 ? void 0 : _l.providerId) === null || _m === void 0 ? void 0 : _m.substring(0, 8)) + '...' || 'undefined',
                clientId: ((_p = (_o = request.data) === null || _o === void 0 ? void 0 : _o.clientId) === null || _p === void 0 ? void 0 : _p.substring(0, 8)) + '...' || 'undefined',
                serviceType: (_q = request.data) === null || _q === void 0 ? void 0 : _q.serviceType,
                amount: (_r = request.data) === null || _r === void 0 ? void 0 : _r.amount,
                amountType: typeof ((_s = request.data) === null || _s === void 0 ? void 0 : _s.amount),
                paymentIntentId: (_t = request.data) === null || _t === void 0 ? void 0 : _t.paymentIntentId,
                hasAuth: !!request.auth,
                delayMinutes: (_u = request.data) === null || _u === void 0 ? void 0 : _u.delayMinutes,
                // ✅ AJOUT: Debug des numéros de téléphone
                hasProviderPhone: !!((_v = request.data) === null || _v === void 0 ? void 0 : _v.providerPhone),
                hasClientPhone: !!((_w = request.data) === null || _w === void 0 ? void 0 : _w.clientPhone),
                providerPhoneLength: ((_y = (_x = request.data) === null || _x === void 0 ? void 0 : _x.providerPhone) === null || _y === void 0 ? void 0 : _y.length) || 0,
                clientPhoneLength: ((_0 = (_z = request.data) === null || _z === void 0 ? void 0 : _z.clientPhone) === null || _0 === void 0 ? void 0 : _0.length) || 0,
            },
            userAuth: ((_2 = (_1 = request.auth) === null || _1 === void 0 ? void 0 : _1.uid) === null || _2 === void 0 ? void 0 : _2.substring(0, 8)) + '...' || 'not-authenticated',
            timestamp: new Date().toISOString()
        };
        // Log détaillé de l'erreur
        await (0, logError_1.logError)('createAndScheduleCall:error', errorDetails);
        console.error(`❌ [${requestId}] Erreur lors de la création d'appel:`, {
            error: errorDetails.error,
            errorType: errorDetails.errorType,
            serviceType: (_3 = request.data) === null || _3 === void 0 ? void 0 : _3.serviceType,
            amount: (_4 = request.data) === null || _4 === void 0 ? void 0 : _4.amount,
            hasProviderPhone: errorDetails.requestData.hasProviderPhone,
            hasClientPhone: errorDetails.requestData.hasClientPhone
        });
        // Si c'est déjà une HttpsError Firebase, la relancer telle quelle
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Pour les autres types d'erreurs, les wrapper dans HttpsError
        if (error instanceof Error) {
            // Erreurs spécifiques selon le message
            if (error.message.includes('payment') || error.message.includes('PaymentIntent')) {
                throw new https_1.HttpsError('failed-precondition', 'Erreur liée au paiement. Vérifiez que le paiement a été validé.');
            }
            if (error.message.includes('provider') || error.message.includes('client')) {
                throw new https_1.HttpsError('not-found', 'Prestataire ou client introuvable. Vérifiez les identifiants.');
            }
            if (error.message.includes('schedule') || error.message.includes('call')) {
                throw new https_1.HttpsError('internal', 'Erreur lors de la programmation de l\'appel. Service temporairement indisponible.');
            }
            // ✅ AJOUT: Erreurs spécifiques aux numéros de téléphone
            if (error.message.includes('phone') || error.message.includes('téléphone')) {
                throw new https_1.HttpsError('invalid-argument', error.message);
            }
        }
        // Erreur générique pour tout le reste
        throw new https_1.HttpsError('internal', 'Erreur interne lors de la création de l\'appel. Veuillez réessayer dans quelques instants.');
    }
});
//# sourceMappingURL=createAndScheduleCallFunction.js.map