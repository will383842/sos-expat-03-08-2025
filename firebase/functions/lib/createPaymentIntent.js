"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const StripeManager_1 = require("./StripeManager");
const logError_1 = require("./utils/logs/logError");
const admin = __importStar(require("firebase-admin"));
/**
 * Cloud Function sécurisée pour créer un PaymentIntent Stripe
 * Version production ready avec validations complètes
 */
exports.createPaymentIntent = (0, https_1.onCall)(async (request) => {
    var _a;
    try {
        // ========================================
        // 1. VALIDATION DE L'AUTHENTIFICATION
        // ========================================
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour créer un paiement.');
        }
        const { amount, currency = 'eur', serviceType, providerId, clientId, clientEmail, providerName, description, commissionAmount, providerAmount, callSessionId, metadata = {} } = request.data;
        // ========================================
        // 2. VALIDATION DES PERMISSIONS
        // ========================================
        if (request.auth.uid !== clientId) {
            throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
        }
        // ========================================
        // 3. VALIDATION DES DONNÉES DE BASE
        // ========================================
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', 'Montant manquant ou invalide.');
        }
        if (!serviceType || !providerId || !clientId) {
            throw new https_1.HttpsError('invalid-argument', 'Données de service manquantes (serviceType, providerId, clientId).');
        }
        if (!commissionAmount || !providerAmount) {
            throw new https_1.HttpsError('invalid-argument', 'Montants de commission et prestataire requis.');
        }
        // ========================================
        // 4. VALIDATION DE LA COHÉRENCE DES MONTANTS
        // ========================================
        if (commissionAmount + providerAmount !== amount) {
            throw new https_1.HttpsError('invalid-argument', 'La répartition des montants ne correspond pas au total.');
        }
        if (commissionAmount < 0 || providerAmount < 0) {
            throw new https_1.HttpsError('invalid-argument', 'Les montants ne peuvent pas être négatifs.');
        }
        // ========================================
        // 5. VALIDATION DES LIMITES DE MONTANT
        // ========================================
        const MIN_AMOUNT = 500; // 5€
        const MAX_AMOUNT = 50000; // 500€
        if (amount < MIN_AMOUNT) {
            throw new https_1.HttpsError('invalid-argument', `Montant minimum de ${MIN_AMOUNT / 100}€ requis.`);
        }
        if (amount > MAX_AMOUNT) {
            throw new https_1.HttpsError('invalid-argument', `Montant maximum de ${MAX_AMOUNT / 100}€ dépassé.`);
        }
        // ========================================
        // 6. VALIDATION DE LA DEVISE
        // ========================================
        const allowedCurrencies = ['eur', 'usd', 'gbp'];
        if (!allowedCurrencies.includes(currency.toLowerCase())) {
            throw new https_1.HttpsError('invalid-argument', `Devise non supportée. Devises autorisées: ${allowedCurrencies.join(', ')}`);
        }
        // ========================================
        // 7. VALIDATION DU TYPE DE SERVICE
        // ========================================
        const allowedServiceTypes = ['lawyer_call', 'expat_call'];
        if (!allowedServiceTypes.includes(serviceType)) {
            throw new https_1.HttpsError('invalid-argument', `Type de service invalide. Types autorisés: ${allowedServiceTypes.join(', ')}`);
        }
        // ========================================
        // 8. DÉTERMINATION DU TYPE DE PRESTATAIRE
        // ========================================
        const providerType = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
        // ========================================
        // 9. VÉRIFICATION DES DOUBLONS
        // ========================================
        const db = admin.firestore();
        const existingPayments = await db.collection('payments')
            .where('clientId', '==', clientId)
            .where('providerId', '==', providerId)
            .where('status', 'in', ['pending', 'requires_confirmation', 'requires_capture', 'processing'])
            .limit(1)
            .get();
        if (!existingPayments.empty) {
            throw new https_1.HttpsError('already-exists', 'Un paiement est déjà en cours pour cette combinaison client/prestataire.');
        }
        // ========================================
        // 10. VÉRIFICATION DE L'EXISTENCE DES UTILISATEURS
        // ========================================
        const [providerDoc, clientDoc] = await Promise.all([
            db.collection('users').doc(providerId).get(),
            db.collection('users').doc(clientId).get()
        ]);
        if (!providerDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Prestataire non trouvé.');
        }
        if (!clientDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Client non trouvé.');
        }
        const providerData = providerDoc.data();
        const clientData = clientDoc.data();
        // ========================================
        // 11. VÉRIFICATION DU STATUT DES COMPTES
        // ========================================
        if ((clientData === null || clientData === void 0 ? void 0 : clientData.status) === 'suspended' || (clientData === null || clientData === void 0 ? void 0 : clientData.status) === 'banned') {
            throw new https_1.HttpsError('permission-denied', 'Votre compte est suspendu.');
        }
        if ((providerData === null || providerData === void 0 ? void 0 : providerData.status) === 'suspended' || (providerData === null || providerData === void 0 ? void 0 : providerData.status) === 'banned') {
            throw new https_1.HttpsError('failed-precondition', 'Le prestataire n\'est pas disponible.');
        }
        if ((providerData === null || providerData === void 0 ? void 0 : providerData.isAvailable) === false) {
            throw new https_1.HttpsError('failed-precondition', 'Le prestataire n\'est pas disponible actuellement.');
        }
        // ========================================
        // 12. CRÉATION DU PAIEMENT VIA STRIPEMANAGER
        // ========================================
        console.log('🚀 Création PaymentIntent pour:', {
            amount,
            currency,
            serviceType,
            clientId,
            providerId,
            callSessionId
        });
        const stripePaymentData = {
            amount,
            currency,
            clientId,
            providerId,
            serviceType,
            providerType,
            commissionAmount,
            providerAmount,
            callSessionId,
            metadata: Object.assign({ clientEmail: clientEmail || (clientData === null || clientData === void 0 ? void 0 : clientData.email) || '', providerName: providerName || (providerData === null || providerData === void 0 ? void 0 : providerData.displayName) || '', description: description || `Service ${serviceType}` }, metadata)
        };
        const result = await StripeManager_1.stripeManager.createPaymentIntent(stripePaymentData);
        if (!result.success) {
            throw new https_1.HttpsError('internal', `Erreur lors de la création du paiement: ${result.error}`);
        }
        // ========================================
        // 13. LOGGING ET AUDIT
        // ========================================
        await db.collection('payment_audit_logs').add({
            action: 'payment_intent_created',
            paymentIntentId: result.paymentIntentId,
            clientId,
            providerId,
            amount,
            commissionAmount,
            providerAmount,
            serviceType,
            callSessionId,
            userAgent: request.rawRequest.headers['user-agent'] || 'unknown',
            ipAddress: request.rawRequest.ip || 'unknown',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            environment: process.env.NODE_ENV || 'development'
        });
        console.log('✅ PaymentIntent créé avec succès:', result.paymentIntentId);
        // ========================================
        // 14. RÉPONSE SÉCURISÉE
        // ========================================
        return {
            success: true,
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount,
            currency,
            serviceType,
            status: 'requires_payment_method'
        };
    }
    catch (error) {
        // ========================================
        // 15. GESTION D'ERREURS COMPLÈTE
        // ========================================
        console.error('❌ Erreur création PaymentIntent:', error);
        // Logger l'erreur pour debug
        await (0, logError_1.logError)('createPaymentIntent:error', {
            error: error.message,
            stack: error.stack,
            requestData: {
                amount: request.data.amount,
                serviceType: request.data.serviceType,
                clientId: request.data.clientId,
                providerId: request.data.providerId
            },
            userAuth: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'not-authenticated'
        });
        // Si c'est déjà une HttpsError, la relancer telle quelle
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Sinon, créer une nouvelle HttpsError générique
        throw new https_1.HttpsError('internal', 'Une erreur inattendue s\'est produite lors de la création du paiement.', {
            originalError: error.message,
            code: error.code,
            type: error.type,
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=createPaymentIntent.js.map