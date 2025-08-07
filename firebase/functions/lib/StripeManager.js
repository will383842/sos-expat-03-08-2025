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
exports.stripeManager = exports.StripeManager = void 0;
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const logError_1 = require("./utils/logs/logError");
const logCallRecord_1 = require("./utils/logs/logCallRecord");
// Configuration Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
class StripeManager {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Valide la configuration Stripe
     */
    validateConfiguration() {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.warn('STRIPE_WEBHOOK_SECRET manquante - les webhooks ne fonctionneront pas');
        }
    }
    /**
     * 🔧 FIX: Valide les données de paiement - MONTANTS EN CENTIMES
     */
    validatePaymentData(data) {
        const { amount, commissionAmount, providerAmount, clientId, providerId } = data;
        // Validation des montants EN CENTIMES
        if (!amount || amount <= 0) {
            throw new Error('Montant invalide');
        }
        if (amount < 500) { // 5€ minimum EN CENTIMES
            throw new Error('Montant minimum de 5€ requis');
        }
        if (amount > 200000) { // 2000€ maximum EN CENTIMES
            throw new Error('Montant maximum de 2000€ dépassé');
        }
        // Validation de la répartition EN CENTIMES
        if (Math.abs(commissionAmount + providerAmount - amount) > 1) { // Tolérance 1 centime pour arrondis
            throw new Error(`La répartition des montants ne correspond pas au total. Total: ${amount}, Commission: ${commissionAmount}, Provider: ${providerAmount}`);
        }
        if (commissionAmount < 0 || providerAmount < 0) {
            throw new Error('Les montants ne peuvent pas être négatifs');
        }
        // Validation des IDs
        if (!clientId || !providerId) {
            throw new Error('IDs client et prestataire requis');
        }
        if (clientId === providerId) {
            throw new Error('Le client et le prestataire ne peuvent pas être identiques');
        }
        console.log('✅ StripeManager - Validation des montants réussie:', {
            amount,
            amountInEuros: amount / 100,
            commissionAmount,
            providerAmount,
            coherent: Math.abs(commissionAmount + providerAmount - amount) <= 1
        });
    }
    /**
     * 🔧 FIX: Crée un PaymentIntent avec montants EN CENTIMES
     */
    async createPaymentIntent(data) {
        try {
            this.validateConfiguration();
            this.validatePaymentData(data);
            // Vérifier qu'il n'y a pas déjà un paiement en cours
            const existingPayment = await this.findExistingPayment(data.clientId, data.providerId);
            if (existingPayment) {
                throw new Error('Un paiement est déjà en cours pour cette combinaison client/prestataire');
            }
            // Vérifier que les utilisateurs existent
            await this.validateUsers(data.clientId, data.providerId);
            console.log('💳 Création PaymentIntent Stripe:', {
                amount: data.amount,
                amountInEuros: data.amount / 100,
                currency: data.currency || 'eur',
                serviceType: data.serviceType
            });
            // 🔧 FIX: Créer le PaymentIntent avec les montants EN CENTIMES (Stripe attend des centimes)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: data.amount, // Déjà en centimes
                currency: data.currency || 'eur',
                capture_method: 'manual', // Capture différée obligatoire
                metadata: Object.assign({ clientId: data.clientId, providerId: data.providerId, serviceType: data.serviceType, providerType: data.providerType, commissionAmount: data.commissionAmount.toString(), providerAmount: data.providerAmount.toString(), commissionAmountEuros: (data.commissionAmount / 100).toFixed(2), providerAmountEuros: (data.providerAmount / 100).toFixed(2), callSessionId: data.callSessionId || '', environment: process.env.NODE_ENV || 'development' }, data.metadata),
                description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount / 100}€`,
                statement_descriptor_suffix: 'SOS EXPAT',
                receipt_email: await this.getClientEmail(data.clientId)
            });
            console.log('✅ PaymentIntent Stripe créé:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                amountInEuros: paymentIntent.amount / 100,
                status: paymentIntent.status
            });
            // Sauvegarder dans Firestore avec montants EN CENTIMES
            await this.savePaymentRecord(paymentIntent, data);
            return {
                success: true,
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret || undefined
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:createPaymentIntent', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue'
            };
        }
    }
    /**
     * Capture un paiement avec validation
     */
    async capturePayment(paymentIntentId, sessionId) {
        try {
            this.validateConfiguration();
            // Récupérer le PaymentIntent
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'requires_capture') {
                throw new Error(`Impossible de capturer le paiement. Statut actuel: ${paymentIntent.status}`);
            }
            // Double vérification avec les données de session si disponibles
            if (sessionId) {
                const canCapture = await this.validateCaptureConditions(sessionId);
                if (!canCapture) {
                    throw new Error('Conditions de capture non remplies');
                }
            }
            console.log('💰 Capture du paiement:', {
                paymentIntentId,
                amount: paymentIntent.amount,
                amountInEuros: paymentIntent.amount / 100
            });
            // Capturer le paiement
            const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
            // Mettre à jour dans Firestore
            await this.updatePaymentStatus(paymentIntentId, 'captured');
            // Logger pour audit
            if (sessionId) {
                await (0, logCallRecord_1.logCallRecord)({
                    callId: sessionId,
                    status: 'payment_captured',
                    retryCount: 0,
                    additionalData: {
                        paymentIntentId,
                        amount: capturedPayment.amount,
                        amountInEuros: capturedPayment.amount / 100,
                        currency: capturedPayment.currency
                    }
                });
            }
            console.log('✅ Paiement capturé avec succès:', {
                id: capturedPayment.id,
                amount: capturedPayment.amount,
                amountInEuros: capturedPayment.amount / 100
            });
            return {
                success: true,
                paymentIntentId: capturedPayment.id
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:capturePayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur de capture'
            };
        }
    }
    /**
     * Rembourse un paiement
     */
    async refundPayment(paymentIntentId, reason, sessionId, amount // EN CENTIMES si spécifié
    ) {
        try {
            this.validateConfiguration();
            // Récupérer le PaymentIntent
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
                // Si le paiement n'est pas encore capturé, l'annuler
                if (paymentIntent.status === 'requires_capture') {
                    await stripe.paymentIntents.cancel(paymentIntentId);
                    await this.updatePaymentStatus(paymentIntentId, 'canceled');
                    console.log('✅ Paiement annulé (non capturé):', paymentIntentId);
                    return { success: true, paymentIntentId };
                }
                throw new Error(`Impossible de rembourser. Statut: ${paymentIntent.status}`);
            }
            console.log('💰 Remboursement du paiement:', {
                paymentIntentId,
                originalAmount: paymentIntent.amount,
                refundAmount: amount || paymentIntent.amount,
                amountInEuros: (amount || paymentIntent.amount) / 100,
                reason
            });
            // Créer le remboursement
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount, // Remboursement partiel si spécifié (EN CENTIMES)
                reason: 'requested_by_customer',
                metadata: {
                    refundReason: reason,
                    sessionId: sessionId || '',
                    environment: process.env.NODE_ENV || 'development',
                    refundAmountEuros: ((amount || paymentIntent.amount) / 100).toString()
                }
            });
            // Mettre à jour dans Firestore
            await this.updatePaymentStatus(paymentIntentId, 'refunded', {
                refundId: refund.id,
                refundReason: reason,
                refundAmount: refund.amount,
                refundAmountEuros: refund.amount / 100,
                refundedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Logger pour audit
            if (sessionId) {
                await (0, logCallRecord_1.logCallRecord)({
                    callId: sessionId,
                    status: 'payment_refunded',
                    retryCount: 0,
                    additionalData: {
                        paymentIntentId,
                        refundId: refund.id,
                        refundAmount: refund.amount,
                        refundAmountEuros: refund.amount / 100,
                        refundReason: reason
                    }
                });
            }
            console.log('✅ Remboursement effectué avec succès:', {
                refundId: refund.id,
                amount: refund.amount,
                amountInEuros: refund.amount / 100
            });
            return {
                success: true,
                paymentIntentId: refund.payment_intent
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:refundPayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur de remboursement'
            };
        }
    }
    /**
     * Annule un PaymentIntent
     */
    async cancelPayment(paymentIntentId, reason, sessionId) {
        try {
            this.validateConfiguration();
            const canceledPayment = await stripe.paymentIntents.cancel(paymentIntentId);
            // Mettre à jour dans Firestore
            await this.updatePaymentStatus(paymentIntentId, 'canceled', {
                cancelReason: reason,
                canceledAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Logger pour audit
            if (sessionId) {
                await (0, logCallRecord_1.logCallRecord)({
                    callId: sessionId,
                    status: 'payment_canceled',
                    retryCount: 0,
                    additionalData: {
                        paymentIntentId,
                        cancelReason: reason,
                        amount: canceledPayment.amount,
                        amountInEuros: canceledPayment.amount / 100
                    }
                });
            }
            console.log('✅ Paiement annulé:', {
                id: canceledPayment.id,
                reason,
                amount: canceledPayment.amount,
                amountInEuros: canceledPayment.amount / 100
            });
            return {
                success: true,
                paymentIntentId: canceledPayment.id
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:cancelPayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur d\'annulation'
            };
        }
    }
    /**
     * Valide les conditions de capture d'un paiement
     */
    async validateCaptureConditions(sessionId) {
        try {
            // Récupérer les données de la session
            const sessionDoc = await this.db.collection('call_sessions').doc(sessionId).get();
            if (!sessionDoc.exists)
                return false;
            const session = sessionDoc.data();
            if (!session)
                return false;
            // Vérifications standard
            const { participants, conference } = session;
            // Les deux participants doivent être connectés
            if (participants.provider.status !== 'connected' ||
                participants.client.status !== 'connected') {
                console.log('Capture refusée: participants non connectés');
                return false;
            }
            // La conférence doit avoir duré au moins 2 minutes
            if (!conference.duration || conference.duration < 120) {
                console.log('Capture refusée: durée insuffisante');
                return false;
            }
            // Le statut de l'appel doit être complété ou actif
            if (session.status !== 'completed' && session.status !== 'active') {
                console.log('Capture refusée: statut d\'appel incorrect');
                return false;
            }
            return true;
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:validateCaptureConditions', error);
            return false;
        }
    }
    /**
     * Recherche un paiement existant
     */
    async findExistingPayment(clientId, providerId) {
        try {
            const snapshot = await this.db.collection('payments')
                .where('clientId', '==', clientId)
                .where('providerId', '==', providerId)
                .where('status', 'in', ['pending', 'authorized', 'requires_capture'])
                .limit(1)
                .get();
            return !snapshot.empty;
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:findExistingPayment', error);
            return false;
        }
    }
    /**
     * Valide l'existence des utilisateurs
     */
    async validateUsers(clientId, providerId) {
        const [clientDoc, providerDoc] = await Promise.all([
            this.db.collection('users').doc(clientId).get(),
            this.db.collection('users').doc(providerId).get()
        ]);
        if (!clientDoc.exists) {
            throw new Error('Client non trouvé');
        }
        if (!providerDoc.exists) {
            throw new Error('Prestataire non trouvé');
        }
        // Vérifications additionnelles
        const clientData = clientDoc.data();
        const providerData = providerDoc.data();
        if ((clientData === null || clientData === void 0 ? void 0 : clientData.status) === 'suspended') {
            throw new Error('Compte client suspendu');
        }
        if ((providerData === null || providerData === void 0 ? void 0 : providerData.status) === 'suspended') {
            throw new Error('Compte prestataire suspendu');
        }
    }
    /**
     * Récupère l'email du client pour le reçu
     */
    async getClientEmail(clientId) {
        var _a;
        try {
            const clientDoc = await this.db.collection('users').doc(clientId).get();
            return (_a = clientDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
        }
        catch (error) {
            console.warn('Impossible de récupérer l\'email client:', error);
            return undefined;
        }
    }
    /**
     * 🔧 FIX: Sauvegarde l'enregistrement de paiement avec montants EN CENTIMES
     */
    async savePaymentRecord(paymentIntent, data) {
        const paymentRecord = {
            stripePaymentIntentId: paymentIntent.id,
            clientId: data.clientId,
            providerId: data.providerId,
            amount: data.amount, // EN CENTIMES
            amountInEuros: data.amount / 100, // Pour référence humaine
            currency: data.currency || 'eur',
            commissionAmount: data.commissionAmount, // EN CENTIMES
            commissionAmountEuros: data.commissionAmount / 100,
            providerAmount: data.providerAmount, // EN CENTIMES
            providerAmountEuros: data.providerAmount / 100,
            serviceType: data.serviceType,
            providerType: data.providerType,
            callSessionId: (data.callSessionId === undefined || data.callSessionId === 'undefined' || data.callSessionId === null || data.callSessionId === '') ? null : data.callSessionId,
            status: paymentIntent.status,
            clientSecret: paymentIntent.client_secret,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: data.metadata || {},
            environment: process.env.NODE_ENV || 'development'
        };
        await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);
        console.log('✅ Enregistrement paiement sauvegardé en DB:', {
            id: paymentIntent.id,
            amount: data.amount,
            amountInEuros: data.amount / 100
        });
    }
    /**
     * Met à jour le statut d'un paiement
     */
    async updatePaymentStatus(paymentIntentId, status, additionalData = {}) {
        await this.db.collection('payments').doc(paymentIntentId).update(Object.assign({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, additionalData));
        console.log(`📝 Statut paiement mis à jour: ${paymentIntentId} -> ${status}`);
    }
    /**
     * 🔧 FIX: Récupère les statistiques de paiement avec montants EN CENTIMES
     */
    async getPaymentStatistics(options = {}) {
        try {
            let query = this.db.collection('payments');
            if (options.startDate) {
                query = query.where('createdAt', '>=', options.startDate);
            }
            if (options.endDate) {
                query = query.where('createdAt', '<=', options.endDate);
            }
            if (options.providerId) {
                query = query.where('providerId', '==', options.providerId);
            }
            if (options.serviceType) {
                query = query.where('serviceType', '==', options.serviceType);
            }
            const snapshot = await query.get();
            let totalAmount = 0; // EN CENTIMES
            let totalCommission = 0; // EN CENTIMES
            let totalProviderAmount = 0; // EN CENTIMES
            let successfulPayments = 0;
            let refundedPayments = 0;
            snapshot.docs.forEach((doc) => {
                const payment = doc.data();
                if (payment.status === 'succeeded' || payment.status === 'captured') {
                    totalAmount += payment.amount; // Déjà en centimes
                    totalCommission += payment.commissionAmount; // Déjà en centimes
                    totalProviderAmount += payment.providerAmount; // Déjà en centimes
                    successfulPayments++;
                }
                if (payment.status === 'refunded') {
                    refundedPayments++;
                }
            });
            const averageAmount = successfulPayments > 0 ? totalAmount / successfulPayments : 0;
            return {
                totalAmount,
                totalAmountEuros: totalAmount / 100,
                totalCommission,
                totalProviderAmount,
                paymentCount: snapshot.size,
                successfulPayments,
                refundedPayments,
                averageAmount,
                averageAmountEuros: averageAmount / 100
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:getPaymentStatistics', error);
            throw error;
        }
    }
    /**
     * Récupère un paiement par ID
     */
    async getPayment(paymentIntentId) {
        try {
            const [stripePayment, firestorePayment] = await Promise.all([
                stripe.paymentIntents.retrieve(paymentIntentId),
                this.db.collection('payments').doc(paymentIntentId).get()
            ]);
            return {
                stripe: stripePayment,
                firestore: firestorePayment.exists ? firestorePayment.data() : null
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:getPayment', error);
            return null;
        }
    }
}
exports.StripeManager = StripeManager;
// Instance singleton
exports.stripeManager = new StripeManager();
//# sourceMappingURL=StripeManager.js.map