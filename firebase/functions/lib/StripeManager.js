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
     * Valide les données de paiement
     */
    validatePaymentData(data) {
        const { amount, commissionAmount, providerAmount, clientId, providerId } = data;
        // Validation des montants
        if (!amount || amount <= 0) {
            throw new Error('Montant invalide');
        }
        if (amount < 500) { // 5€ minimum
            throw new Error('Montant minimum de 5€ requis');
        }
        if (amount > 50000) { // 500€ maximum
            throw new Error('Montant maximum de 500€ dépassé');
        }
        // Validation de la répartition
        if (commissionAmount + providerAmount !== amount) {
            throw new Error('La répartition des montants ne correspond pas au total');
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
    }
    /**
     * Crée un PaymentIntent avec validation complète
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
            // Créer le PaymentIntent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: data.amount,
                currency: data.currency || 'eur',
                capture_method: 'manual', // Capture différée obligatoire
                metadata: Object.assign({ clientId: data.clientId, providerId: data.providerId, serviceType: data.serviceType, providerType: data.providerType, commissionAmount: data.commissionAmount.toString(), providerAmount: data.providerAmount.toString(), callSessionId: data.callSessionId || '', environment: process.env.NODE_ENV || 'development' }, data.metadata),
                description: `Service ${data.serviceType} - ${data.providerType}`,
                statement_descriptor: 'SOS EXPAT',
                receipt_email: await this.getClientEmail(data.clientId)
            });
            // Sauvegarder dans Firestore
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
            if (paymentIntent.status === 'requires_capture') {
                throw new Error(`Impossible de capturer le paiement. Statut actuel: ${paymentIntent.status}`);
            }
            // Double vérification avec les données de session si disponibles
            if (sessionId) {
                const canCapture = await this.validateCaptureConditions(sessionId);
                if (!canCapture) {
                    throw new Error('Conditions de capture non remplies');
                }
            }
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
                        currency: capturedPayment.currency
                    }
                });
            }
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
    async refundPayment(paymentIntentId, reason, sessionId, amount) {
        try {
            this.validateConfiguration();
            // Récupérer le PaymentIntent
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture') {
                // Si le paiement n'est pas encore capturé, l'annuler
                if (paymentIntent.status === 'requires_capture') {
                    await stripe.paymentIntents.cancel(paymentIntentId);
                    await this.updatePaymentStatus(paymentIntentId, 'canceled');
                    return { success: true, paymentIntentId };
                }
                throw new Error(`Impossible de rembourser. Statut: ${paymentIntent.status}`);
            }
            // Créer le remboursement
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount, // Remboursement partiel si spécifié
                reason: 'requested_by_customer',
                metadata: {
                    refundReason: reason,
                    sessionId: sessionId || '',
                    environment: process.env.NODE_ENV || 'development'
                }
            });
            // Mettre à jour dans Firestore
            await this.updatePaymentStatus(paymentIntentId, 'refunded', {
                refundId: refund.id,
                refundReason: reason,
                refundAmount: refund.amount,
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
                        refundReason: reason
                    }
                });
            }
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
                        cancelReason: reason
                    }
                });
            }
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
     * Sauvegarde l'enregistrement de paiement
     */
    async savePaymentRecord(paymentIntent, data) {
        const paymentRecord = {
            stripePaymentIntentId: paymentIntent.id,
            clientId: data.clientId,
            providerId: data.providerId,
            amount: data.amount,
            currency: data.currency || 'eur',
            commissionAmount: data.commissionAmount,
            providerAmount: data.providerAmount,
            serviceType: data.serviceType,
            providerType: data.providerType,
            callSessionId: data.callSessionId || null,
            status: paymentIntent.status,
            clientSecret: paymentIntent.client_secret,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: data.metadata || {},
            environment: process.env.NODE_ENV || 'development'
        };
        await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);
    }
    /**
     * Met à jour le statut d'un paiement
     */
    async updatePaymentStatus(paymentIntentId, status, additionalData = {}) {
        await this.db.collection('payments').doc(paymentIntentId).update(Object.assign({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, additionalData));
    }
    /**
     * Récupère les statistiques de paiement
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
            let totalAmount = 0;
            let totalCommission = 0;
            let totalProviderAmount = 0;
            let successfulPayments = 0;
            let refundedPayments = 0;
            snapshot.docs.forEach((doc) => {
                const payment = doc.data();
                if (payment.status === 'succeeded' || payment.status === 'captured') {
                    totalAmount += payment.amount;
                    totalCommission += payment.commissionAmount;
                    totalProviderAmount += payment.providerAmount;
                    successfulPayments++;
                }
                if (payment.status === 'refunded') {
                    refundedPayments++;
                }
            });
            return {
                totalAmount,
                totalCommission,
                totalProviderAmount,
                paymentCount: snapshot.size,
                successfulPayments,
                refundedPayments,
                averageAmount: successfulPayments > 0 ? totalAmount / successfulPayments : 0
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