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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = void 0;
const functions = __importStar(require("firebase-functions"));
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(functions.config().stripe.secret, {
    apiVersion: '2023-08-16',
});
// ✅ Cloud Function sécurisée
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    try {
        const { amount, currency = 'eur', serviceType, providerId, clientId, clientEmail, providerName, description, } = data;
        if (!amount || typeof amount !== 'number') {
            throw new functions.https.HttpsError('invalid-argument', 'Montant manquant ou invalide.');
        }
        // 🧾 Création du PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata: {
                serviceType,
                providerId,
                clientId,
                clientEmail,
                providerName,
            },
            description,
        });
        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };
    }
    catch (error) {
        console.error('Erreur Stripe PaymentIntent:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Erreur lors de la création du paiement.');
    }
});
//# sourceMappingURL=createPaymentIntent.js.map