"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
// Initialiser Stripe avec la configuration d'environnement
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
// ✅ Cloud Function sécurisée avec Firebase Functions v2
exports.createPaymentIntent = (0, https_1.onCall)(async (request) => {
    try {
        // Vérifier l'authentification
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour créer un paiement.');
        }
        const { amount, currency = 'eur', serviceType, providerId, clientId, clientEmail, providerName, description, commissionAmount, providerAmount, metadata = {} } = request.data;
        // Validation des données requises
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', 'Montant manquant ou invalide.');
        }
        if (!serviceType || !providerId || !clientId) {
            throw new https_1.HttpsError('invalid-argument', 'Données de service manquantes (serviceType, providerId, clientId).');
        }
        // Vérifier que l'utilisateur authentifié correspond au clientId
        if (request.auth.uid !== clientId) {
            throw new https_1.HttpsError('permission-denied', 'Vous ne pouvez créer un paiement que pour votre propre compte.');
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
            metadata: Object.assign({ serviceType,
                providerId,
                clientId, clientEmail: clientEmail || '', providerName: providerName || '', commissionAmount: (commissionAmount === null || commissionAmount === void 0 ? void 0 : commissionAmount.toString()) || '0', providerAmount: (providerAmount === null || providerAmount === void 0 ? void 0 : providerAmount.toString()) || amount.toString() }, metadata),
            description: description || `Service ${serviceType} - ${providerName || 'Prestataire'}`,
        });
        console.log('PaymentIntent créé avec succès:', paymentIntent.id);
        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
        };
    }
    catch (error) {
        console.error('❌ Erreur création PaymentIntent:', error);
        console.error('Stack trace:', error.stack);
        console.error('Données reçues:', request.data);
        // Si c'est déjà une HttpsError, la relancer telle quelle
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Sinon, créer une nouvelle HttpsError
        throw new https_1.HttpsError('internal', `Erreur lors de la création du paiement: ${error.message || 'Erreur inconnue'}`, {
            originalError: error.message,
            code: error.code,
            type: error.type
        });
    }
});
//# sourceMappingURL=createPaymentIntent.js.map