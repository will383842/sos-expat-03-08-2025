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
const toCents = (amountInMainUnit) => Math.round(Number(amountInMainUnit) * 100);
exports.toCents = toCents;
// -------------------------------------------------------------
// Détection d'environnement & helpers
// -------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';
function inferModeFromKey(secret) {
    if (!secret)
        return undefined;
    if (secret.startsWith('sk_live_'))
        return 'live';
    if (secret.startsWith('sk_test_'))
        return 'test';
    return undefined;
}
function normalizeCurrency(cur) {
    const c = (cur || 'eur').toString().toLowerCase();
    return (c === 'usd' ? 'usd' : 'eur');
}
// -------------------------------------------------------------
// StripeManager
// -------------------------------------------------------------
class StripeManager {
    constructor() {
        this.db = firebase_1.db;
        this.stripe = null;
        /** 'live' | 'test' pour tracer ce qui a été utilisé */
        this.mode = isProd ? 'live' : 'test';
    }
    /**
     * Initialise Stripe avec une clé donnée (TEST ou LIVE)
     */
    initializeStripe(secretKey) {
        if (this.stripe)
            return; // éviter les réinits
        const detected = inferModeFromKey(secretKey);
        if (detected)
            this.mode = detected;
        this.stripe = new stripe_1.default(secretKey, {
            apiVersion: '2023-10-16'
        });
    }
    /**
     * Résolution de configuration :
     * 1) si une clé est fournie en paramètre → on l'utilise
     * 2) sinon on tente via variables d'env (STRIPE_SECRET_KEY_LIVE/TEST),
     *    avec STRIPE_MODE (live|test) ou NODE_ENV pour choisir.
     * 3) fallback STRIPE_SECRET_KEY (ancien schéma)
     */
    validateConfiguration(secretKey) {
        if (secretKey) {
            this.initializeStripe(secretKey);
            return;
        }
        const envMode = (process.env.STRIPE_MODE === 'live' || process.env.STRIPE_MODE === 'test')
            ? process.env.STRIPE_MODE
            : (isProd ? 'live' : 'test');
        const keyFromEnv = envMode === 'live'
            ? process.env.STRIPE_SECRET_KEY_LIVE
            : process.env.STRIPE_SECRET_KEY_TEST;
        if (keyFromEnv) {
            this.initializeStripe(keyFromEnv);
            return;
        }
        // Dernier fallback : ancien nom unique (déconseillé)
        if (process.env.STRIPE_SECRET_KEY) {
            this.initializeStripe(process.env.STRIPE_SECRET_KEY);
            return;
        }
        throw new Error('Aucune clé Stripe disponible. Passe une clé en argument ou définis STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST.');
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
        const delta = Math.abs(calculatedTotal - amount);
        if (delta > tolerance) {
            console.warn('Incohérence montants:', {
                total: amount,
                commission,
                providerAmount: data.providerAmount,
                calculatedTotal,
                difference: delta
            });
            if (delta > 1) {
                throw new Error(`Incohérence montants: ${amount}€ != ${calculatedTotal}€`);
            }
        }
    }
    // -----------------------------------------------------------
    // Public API
    // -----------------------------------------------------------
    async createPaymentIntent(data, secretKey) {
        var _a, _b;
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe)
                throw new Error('Stripe client not initialized');
            // Anti-doublons (seulement si un paiement a déjà été accepté)
            const existingPayment = await this.findExistingPayment(data.clientId, data.providerId, data.callSessionId);
            if (existingPayment) {
                throw new Error('Un paiement a déjà été accepté pour cette demande de consultation.');
            }
            this.validatePaymentData(data);
            await this.validateUsers(data.clientId, data.providerId);
            const currency = normalizeCurrency(data.currency);
            const commissionEuros = (_b = (_a = data.connectionFeeAmount) !== null && _a !== void 0 ? _a : data.commissionAmount) !== null && _b !== void 0 ? _b : 0;
            const amountCents = (0, exports.toCents)(data.amount);
            const commissionAmountCents = (0, exports.toCents)(commissionEuros);
            const providerAmountCents = (0, exports.toCents)(data.providerAmount);
            console.log('Création PaymentIntent Stripe:', {
                amountEuros: data.amount,
                amountCents,
                currency,
                serviceType: data.serviceType,
                commissionEuros,
                commissionAmountCents,
                providerEuros: data.providerAmount,
                providerAmountCents,
                mode: this.mode
            });
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountCents,
                currency,
                capture_method: 'manual', // on capture après la consultation
                automatic_payment_methods: { enabled: true },
                metadata: Object.assign(Object.assign({ clientId: data.clientId, providerId: data.providerId, serviceType: data.serviceType, providerType: data.providerType, commissionAmountCents: String(commissionAmountCents), providerAmountCents: String(providerAmountCents), commissionAmountEuros: commissionEuros.toFixed(2), providerAmountEuros: data.providerAmount.toFixed(2), environment: process.env.NODE_ENV || 'development', mode: this.mode }, (data.callSessionId ? { callSessionId: data.callSessionId } : {})), (data.metadata || {})),
                description: `Service ${data.serviceType} - ${data.providerType} - ${data.amount} ${currency.toUpperCase()}`,
                statement_descriptor_suffix: 'SOS EXPAT',
                receipt_email: await this.getClientEmail(data.clientId)
            });
            console.log('PaymentIntent Stripe créé:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                amountInEuros: paymentIntent.amount / 100,
                status: paymentIntent.status,
                mode: this.mode
            });
            await this.savePaymentRecord(paymentIntent, Object.assign(Object.assign({}, data), { commissionAmount: commissionEuros }), { amountCents, commissionAmountCents, providerAmountCents, currency });
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
    async capturePayment(paymentIntentId, sessionId, secretKey) {
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe)
                throw new Error('Stripe client not initialized');
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== 'requires_capture') {
                throw new Error(`Cannot capture payment with status: ${paymentIntent.status}`);
            }
            const captured = await this.stripe.paymentIntents.capture(paymentIntentId);
            await this.db.collection('payments').doc(paymentIntentId).update({
                status: captured.status,
                capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sessionId: sessionId || null
            });
            console.log('Paiement capturé:', {
                id: paymentIntentId,
                amount: captured.amount,
                status: captured.status,
                mode: this.mode
            });
            return { success: true, paymentIntentId: captured.id };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:capturePayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors de la capture'
            };
        }
    }
    async refundPayment(paymentIntentId, reason, sessionId, amount, secretKey) {
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe)
                throw new Error('Stripe client not initialized');
            // Stripe permet refund direct via payment_intent id
            const refundData = {
                payment_intent: paymentIntentId,
                reason: reason,
                metadata: {
                    sessionId: sessionId || '',
                    refundReason: reason,
                    mode: this.mode
                }
            };
            if (amount !== undefined)
                refundData.amount = (0, exports.toCents)(amount);
            const refund = await this.stripe.refunds.create(refundData);
            await this.db.collection('payments').doc(paymentIntentId).update({
                status: 'refunded',
                refundId: refund.id,
                refundReason: reason,
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sessionId: sessionId || null
            });
            console.log('Paiement remboursé:', {
                paymentIntentId,
                refundId: refund.id,
                amount: refund.amount,
                reason,
                mode: this.mode
            });
            return { success: true, paymentIntentId };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:refundPayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors du remboursement'
            };
        }
    }
    async cancelPayment(paymentIntentId, reason, sessionId, secretKey) {
        try {
            this.validateConfiguration(secretKey);
            if (!this.stripe)
                throw new Error('Stripe client not initialized');
            const canceled = await this.stripe.paymentIntents.cancel(paymentIntentId, {
                cancellation_reason: reason
            });
            await this.db.collection('payments').doc(paymentIntentId).update({
                status: canceled.status,
                cancelReason: reason,
                canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sessionId: sessionId || null
            });
            console.log('Paiement annulé:', {
                id: paymentIntentId,
                status: canceled.status,
                reason,
                mode: this.mode
            });
            return { success: true, paymentIntentId: canceled.id };
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:cancelPayment', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Erreur lors de l'annulation"
            };
        }
    }
    async getPaymentStatistics(options = {}) {
        try {
            let query = this.db.collection('payments');
            if (options.startDate)
                query = query.where('createdAt', '>=', options.startDate);
            if (options.endDate)
                query = query.where('createdAt', '<=', options.endDate);
            if (options.serviceType)
                query = query.where('serviceType', '==', options.serviceType);
            if (options.providerType)
                query = query.where('providerType', '==', options.providerType);
            const snapshot = await query.get();
            const stats = {
                totalAmount: 0,
                totalCommission: 0,
                totalProvider: 0,
                count: 0,
                byStatus: {}
            };
            snapshot.forEach((doc) => {
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
                byStatus: {}
            };
        }
    }
    async getPayment(paymentIntentId) {
        try {
            const doc = await this.db.collection('payments').doc(paymentIntentId).get();
            if (!doc.exists)
                return null;
            const data = doc.data();
            return Object.assign(Object.assign({}, data), { amountInEuros: ((data === null || data === void 0 ? void 0 : data.amount) || 0) / 100, commissionAmountEuros: ((data === null || data === void 0 ? void 0 : data.commissionAmount) || 0) / 100, providerAmountEuros: ((data === null || data === void 0 ? void 0 : data.providerAmount) || 0) / 100 });
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:getPayment', error);
            return null;
        }
    }
    // -----------------------------------------------------------
    // Privées
    // -----------------------------------------------------------
    async findExistingPayment(clientId, providerId, sessionId) {
        try {
            console.log('🔍 Vérification anti-doublons:', {
                clientId: clientId.substring(0, 8) + '...',
                providerId: providerId.substring(0, 8) + '...',
                sessionId: sessionId ? sessionId.substring(0, 8) + '...' : '—'
            });
            let query = this.db
                .collection('payments')
                .where('clientId', '==', clientId)
                .where('providerId', '==', providerId)
                .where('status', 'in', ['succeeded', 'requires_capture']); // on bloque seulement si un paiement a déjà été accepté
            if (sessionId && sessionId.trim() !== '') {
                query = query.where('callSessionId', '==', sessionId);
            }
            const snapshot = await query.limit(5).get();
            return !snapshot.empty;
        }
        catch (error) {
            await (0, logError_1.logError)('StripeManager:findExistingPayment', error);
            // En cas d’erreur, on préfère **ne pas** bloquer
            return false;
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
            // Montants en cents (source de vérité chiffrée)
            amount: cents.amountCents,
            commissionAmount: cents.commissionAmountCents,
            providerAmount: cents.providerAmountCents,
            // Redondance lisible (euros) pour analytics
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
            mode: this.mode
        };
        if (dataEuros.callSessionId && dataEuros.callSessionId.trim() !== '') {
            paymentRecord.callSessionId = dataEuros.callSessionId;
        }
        await this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord);
        console.log('Enregistrement paiement sauvegardé en DB:', {
            id: paymentIntent.id,
            amountCents: cents.amountCents,
            amountEuros: dataEuros.amount,
            mode: this.mode,
            hasCallSessionId: !!paymentRecord.callSessionId
        });
    }
}
exports.StripeManager = StripeManager;
// Instance réutilisable
exports.stripeManager = new StripeManager();
//# sourceMappingURL=StripeManager.js.map