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
exports.stripeManager = exports.StripeManager = exports.toCents = void 0;
// firebase/functions/src/StripeManager.ts
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const logError_1 = require("./utils/logs/logError");
const firebase_1 = require("./utils/firebase");
// -------------------------------------------------------------
// Utils
// -------------------------------------------------------------
const toCents = (euros) => Math.round(euros * 100);
exports.toCents = toCents;
// -------------------------------------------------------------
// Manager avec initialisation dynamique
// -------------------------------------------------------------
class StripeManager {
    constructor() {
        this.db = firebase_1.db;
        this.stripe = null;
    }
    initializeStripe(secretKey) {
        if (!this.stripe) {
            this.stripe = new stripe_1.default(secretKey, {
                apiVersion: '2023-10-16',
            });
        }
    }
    validateConfiguration(secretKey) {
        if (secretKey) {
            this.initializeStripe(secretKey);
            return;
        }
        if (process.env.STRIPE_SECRET_KEY) {
            this.initializeStripe(process.env.STRIPE_SECRET_KEY);
            return;
        }
        throw new Error("STRIPE_SECRET_KEY manquante dans les variables d'environnement");
    }
    validatePaymentData(data) {
        var _a, _b;
        const { amount, clientId, providerId } = data;
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            throw new Error('Montant invalide');
        }
        if (amount < 5)
            throw new Error('Montant minimum de 5€ requis');
        if (amount > 2000)
            throw new Error('Montant maximum de 2000€ dépassé');
        const commission = (_b = (_a = data.connectionFeeAmount) !== null && _a !== void 0 ? _a : data.commissionAmount) !== null && _b !== void 0 ? _b : 0;
        if (typeof commission !== 'number' || commission < 0) {
            throw new Error('Commission/frais de connexion invalide');
        }
        if (typeof data.providerAmount !== 'number' || data.providerAmount < 0) {
            throw new Error('Montant prestataire invalide');
        }
        if (!clientId || !providerId) {
            throw new Error('IDs client et prestataire requis');
        }
        if (clientId === providerId) {
            throw new Error('Le client et le prestataire ne peuvent pas être identiques');
        }
        const calculatedTotal = commission + data.providerAmount;
        const tolerance = 0.02;
        if (Math.abs(calculatedTotal - amount) > tolerance) {
            console.warn('Incohérence montants:', {
                total: amount,
                commission,
                providerAmount: data.providerAmount,
                calculatedTotal,
                difference: Math.abs(calculatedTotal - amount)
            });
            if (Math.abs(calculatedTotal - amount) > 1) {
                throw new Error(`Incohérence montants: ${amount}€ != ${calculatedTotal}€`);
            }
        }
    }
    async createPaymentIntent(data, secretKey) {
        var _a, _b;
        try {
            this.validateConfiguration(secretKey);
            this.validatePaymentData(data);
            if (!this.stripe) {
                throw new Error('Stripe client not initialized');
            }
            // Vérification anti-doublons : bloquer seulement si paiement accepté
            const existingPayment = await this.findExistingPayment(data.clientId, data.providerId, data.callSessionId);
            if (existingPayment) {
                throw new Error('Un paiement a déjà été accepté pour cette demande de consultation.');
            }
            await this.validateUsers(data.clientId, data.providerId);
            const currency = (data.currency || 'eur').toLowerCase();
            const commissionAmount = (_b = (_a = data.connectionFeeAmount) !== null && _a !== void 0 ? _a : data.commissionAmount) !== null && _b !== void 0 ? _b : 0;
            const amountCents = (0, exports.toCents)(data.amount);
            const commissionAmountCents = (0, exports.toCents)(commissionAmount);
            const providerAmountCents = (0, exports.toCents)(data.providerAmount);
            console.log('Création PaymentIntent Stripe:', {
                amountEuros: data.amount,
                amountCents,
                currency,
                serviceType: data.serviceType,
                commissionEuros: commissionAmount,
                commissionCents: commissionAmountCents,
                providerEuros: data.providerAmount,
                providerCents: providerAmountCents,
            });
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountCents,
                currency,
                capture_method: 'manual',
                automatic_payment_methods: { enabled: true },
                metadata: Object.assign({ clientId: data.clientId, providerId: data.providerId, serviceType: data.serviceType, providerType: data.providerType, commissionAmountCents: String(commissionAmountCents), providerAmountCents: String(providerAmountCents), commissionAmountEuros: commissionAmount.toFixed(2), providerAmountEuros: data.providerAmount.toFixed(2), environment: process.env.NODE_ENV || 'development' }, data.metadata),
                description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount} ${currency.toUpperCase()}`,
                statement_descriptor_suffix: 'SOS EXPAT',
                receipt_email: await this.getClientEmail(data.clientId),
            });
            console.log('PaymentIntent Stripe créé:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                amountInEuros: paymentIntent.amount / 100,
                status: paymentIntent.status,
            });
            await this.savePaymentRecord(paymentIntent, Object.assign(Object.assign({}, data), { commissionAmount }), {
                amountCents,
                commissionAmountCents,
                providerAmountCents,
                currency,
            });
            return {
                success: true,
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret || undefined,
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:createPaymentIntent', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
            };
        }
    }
    async findExistingPayment(clientId, providerId, sessionId) {
        try {
            console.log('🔍 DÉBUT vérification anti-doublons StripeManager:', {
                clientId: clientId.substring(0, 8) + '...',
                providerId: providerId.substring(0, 8) + '...',
                sessionId: sessionId ? sessionId.substring(0, 8) + '...' : 'non fourni',
                fullClientId: clientId, // TEMPORAIRE pour debug
                fullProviderId: providerId // TEMPORAIRE pour debug
            });
            // Construire la requête de base - bloquer seulement les paiements acceptés
            let query = this.db
                .collection('payments')
                .where('clientId', '==', clientId)
                .where('providerId', '==', providerId)
                .where('status', 'in', ['succeeded', 'requires_capture']); // Seulement les paiements acceptés
            console.log('🔍 Requête de base construite pour statuts:', ['succeeded', 'requires_capture']);
            // Si un sessionId est fourni, filtrer par session pour cette demande spécifique
            if (sessionId && sessionId.trim() !== '') {
                console.log('🔍 Ajout du filtre sessionId:', sessionId);
                query = query.where('callSessionId', '==', sessionId);
            }
            console.log('🔍 Exécution de la requête...');
            const snapshot = await query.limit(5).get(); // Limit 5 pour voir plusieurs résultats
            console.log('🔍 Résultats de la requête:', {
                nombreDocuments: snapshot.size,
                isEmpty: snapshot.empty
            });
            // LOG DÉTAILLÉ des documents trouvés
            if (!snapshot.empty) {
                snapshot.docs.forEach((doc, index) => {
                    var _a, _b, _c, _d;
                    const data = doc.data();
                    console.log(`🔍 Document ${index + 1} trouvé:`, {
                        docId: doc.id,
                        clientId: data.clientId,
                        providerId: data.providerId,
                        status: data.status,
                        amount: data.amountInEuros || data.amount,
                        callSessionId: data.callSessionId,
                        createdAt: ((_d = (_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString) === null || _d === void 0 ? void 0 : _d.call(_c)) || 'pas de date',
                        stripePaymentIntentId: data.stripePaymentIntentId
                    });
                });
            }
            const hasDuplicate = !snapshot.empty;
            console.log('🔍 RÉSULTAT vérification anti-doublons:', {
                hasDuplicate,
                statusesChecked: ['succeeded', 'requires_capture'],
                message: hasDuplicate
                    ? 'Paiement déjà accepté trouvé - BLOCAGE'
                    : 'Aucun paiement accepté trouvé - AUTORISATION'
            });
            return hasDuplicate;
        }
        catch (error) {
            console.error('❌ ERREUR dans findExistingPayment:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            await (0, logError_1.logError)('StripeManager:findExistingPayment', error);
            return false; // En cas d'erreur, on autorise
        }
    }
    async validateUsers(clientId, providerId) {
        const [clientDoc, providerDoc] = await Promise.all([
            this.db.collection('users').doc(clientId).get(),
            this.db.collection('users').doc(providerId).get(),
        ]);
        if (!clientDoc.exists)
            throw new Error('Client non trouvé');
        if (!providerDoc.exists)
            throw new Error('Prestataire non trouvé');
        const clientData = clientDoc.data();
        const providerData = providerDoc.data();
        if ((clientData === null || clientData === void 0 ? void 0 : clientData.status) === 'suspended')
            throw new Error('Compte client suspendu');
        if ((providerData === null || providerData === void 0 ? void 0 : providerData.status) === 'suspended')
            throw new Error('Compte prestataire suspendu');
    }
    async getClientEmail(clientId) {
        var _a;
        try {
            const clientDoc = await this.db.collection('users').doc(clientId).get();
            return (_a = clientDoc.data()) === null || _a === void 0 ? void 0 : _a.email;
        }
        catch (error) {
            console.warn("Impossible de récupérer l'email client:", error);
            return undefined;
        }
    }
    async savePaymentRecord(paymentIntent, dataEuros, cents) {
        const paymentRecord = {
            stripePaymentIntentId: paymentIntent.id,
            clientId: dataEuros.clientId,
            providerId: dataEuros.providerId,
            amount: cents.amountCents,
            commissionAmount: cents.commissionAmountCents,
            providerAmount: cents.providerAmountCents,
            amountInEuros: dataEuros.amount,
            commissionAmountEuros: dataEuros.commissionAmount,
            providerAmountEuros: dataEuros.providerAmount,
            currency: cents.currency,
            serviceType: dataEuros.serviceType,
            providerType: dataEuros.providerType,
            status: paymentIntent.status,
            clientSecret: paymentIntent.client_secret,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: dataEuros.metadata || {},
            environment: process.env.NODE_ENV || 'development',
        };
        if (dataEuros.callSessionId && dataEuros.callSessionId.trim() !== '') {
            paymentRecord.callSessionId = dataEuros.callSessionId;
        }
        await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);
        console.log('Enregistrement paiement sauvegardé en DB:', {
            id: paymentIntent.id,
            amountCents: cents.amountCents,
            amountEuros: dataEuros.amount,
            hasCallSessionId: !!paymentRecord.callSessionId,
        });
    }
    async capturePayment(paymentIntentId, sessionId, secretKey) {
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe) {
                throw new Error('Stripe client not initialized');
            }
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'requires_capture') {
                throw new Error(`Cannot capture payment with status: ${paymentIntent.status}`);
            }
            const capturedPayment = await this.stripe.paymentIntents.capture(paymentIntentId);
            await this.db.collection('payments').doc(paymentIntentId).update({
                status: capturedPayment.status,
                capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sessionId: sessionId || null,
            });
            console.log('Paiement capturé:', {
                id: paymentIntentId,
                amount: capturedPayment.amount,
                status: capturedPayment.status,
            });
            return {
                success: true,
                paymentIntentId: capturedPayment.id,
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:capturePayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors de la capture',
            };
        }
    }
    async refundPayment(paymentIntentId, reason, sessionId, amount, secretKey) {
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe) {
                throw new Error('Stripe client not initialized');
            }
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            const refundData = {
                payment_intent: paymentIntentId,
                reason: reason,
                metadata: {
                    sessionId: sessionId || '',
                    refundReason: reason,
                }
            };
            if (amount !== undefined) {
                refundData.amount = (0, exports.toCents)(amount);
            }
            const refund = await this.stripe.refunds.create(refundData);
            await this.db.collection('payments').doc(paymentIntentId).update({
                status: 'refunded',
                refundId: refund.id,
                refundReason: reason,
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sessionId: sessionId || null,
            });
            console.log('Paiement remboursé:', {
                paymentIntentId,
                refundId: refund.id,
                amount: refund.amount,
                reason,
            });
            return {
                success: true,
                paymentIntentId: paymentIntent.id,
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:refundPayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors du remboursement',
            };
        }
    }
    async cancelPayment(paymentIntentId, reason, sessionId, secretKey) {
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe) {
                throw new Error('Stripe client not initialized');
            }
            const canceledPayment = await this.stripe.paymentIntents.cancel(paymentIntentId, {
                cancellation_reason: reason,
            });
            await this.db.collection('payments').doc(paymentIntentId).update({
                status: canceledPayment.status,
                cancelReason: reason,
                canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sessionId: sessionId || null,
            });
            console.log('Paiement annulé:', {
                id: paymentIntentId,
                status: canceledPayment.status,
                reason,
            });
            return {
                success: true,
                paymentIntentId: canceledPayment.id,
            };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:cancelPayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors de l\'annulation',
            };
        }
    }
    async getPaymentStatistics(options = {}) {
        try {
            let query = this.db.collection('payments');
            if (options.startDate) {
                query = query.where('createdAt', '>=', options.startDate);
            }
            if (options.endDate) {
                query = query.where('createdAt', '<=', options.endDate);
            }
            if (options.serviceType) {
                query = query.where('serviceType', '==', options.serviceType);
            }
            if (options.providerType) {
                query = query.where('providerType', '==', options.providerType);
            }
            const snapshot = await query.get();
            const stats = {
                totalAmount: 0,
                totalCommission: 0,
                totalProvider: 0,
                count: 0,
                byStatus: {},
            };
            snapshot.forEach(doc => {
                const data = doc.data();
                stats.count++;
                stats.totalAmount += data.amount || 0;
                stats.totalCommission += data.commissionAmount || 0;
                stats.totalProvider += data.providerAmount || 0;
                const status = data.status || 'unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            });
            return Object.assign(Object.assign({}, stats), { totalAmount: stats.totalAmount / 100, totalCommission: stats.totalCommission / 100, totalProvider: stats.totalProvider / 100 });
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:getPaymentStatistics', error);
            return {
                totalAmount: 0,
                totalCommission: 0,
                totalProvider: 0,
                count: 0,
                byStatus: {},
            };
        }
    }
    async getPayment(paymentIntentId) {
        try {
            const doc = await this.db.collection('payments').doc(paymentIntentId).get();
            if (!doc.exists) {
                return null;
            }
            const data = doc.data();
            return Object.assign(Object.assign({}, data), { amountInEuros: ((data === null || data === void 0 ? void 0 : data.amount) || 0) / 100, commissionAmountEuros: ((data === null || data === void 0 ? void 0 : data.commissionAmount) || 0) / 100, providerAmountEuros: ((data === null || data === void 0 ? void 0 : data.providerAmount) || 0) / 100 });
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:getPayment', error);
            return null;
        }
    }
}
exports.StripeManager = StripeManager;
exports.stripeManager = new StripeManager();
//# sourceMappingURL=StripeManager.js.map