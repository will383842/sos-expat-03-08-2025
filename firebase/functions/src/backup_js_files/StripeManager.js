"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeManager = exports.StripeManager = void 0;
var admin = require("firebase-admin");
var stripe_1 = require("stripe");
var logError_1 = require("./utils/logs/logError");
var logCallRecord_1 = require("./utils/logs/logCallRecord");
var firebase_1 = require("./utils/firebase"); // ← AJOUTER CET IMPORT
// Configuration Stripe
var stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
var StripeManager = /** @class */ (function () {
    function StripeManager() {
        this.db = firebase_1.db; // ← UTILISER LE DB CONFIGURÉ
    }
    /**
     * Valide la configuration Stripe
     */
    StripeManager.prototype.validateConfiguration = function () {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.warn('STRIPE_WEBHOOK_SECRET manquante - les webhooks ne fonctionneront pas');
        }
    };
    /**
     * 🔧 FIX: Valide les données de paiement - MONTANTS EN CENTIMES
     */
    StripeManager.prototype.validatePaymentData = function (data) {
        var amount = data.amount, commissionAmount = data.commissionAmount, providerAmount = data.providerAmount, clientId = data.clientId, providerId = data.providerId;
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
            throw new Error("La r\u00E9partition des montants ne correspond pas au total. Total: ".concat(amount, ", Commission: ").concat(commissionAmount, ", Provider: ").concat(providerAmount));
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
            amount: amount,
            amountInEuros: amount / 100,
            commissionAmount: commissionAmount,
            providerAmount: providerAmount,
            coherent: Math.abs(commissionAmount + providerAmount - amount) <= 1
        });
    };
    /**
     * 🔧 FIX: Crée un PaymentIntent avec montants EN CENTIMES
     */
    StripeManager.prototype.createPaymentIntent = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var existingPayment, paymentIntent, _a, _b, error_1;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 6, , 8]);
                        this.validateConfiguration();
                        this.validatePaymentData(data);
                        return [4 /*yield*/, this.findExistingPayment(data.clientId, data.providerId)];
                    case 1:
                        existingPayment = _d.sent();
                        if (existingPayment) {
                            throw new Error('Un paiement est déjà en cours pour cette combinaison client/prestataire');
                        }
                        // Vérifier que les utilisateurs existent
                        return [4 /*yield*/, this.validateUsers(data.clientId, data.providerId)];
                    case 2:
                        // Vérifier que les utilisateurs existent
                        _d.sent();
                        console.log('💳 Création PaymentIntent Stripe:', {
                            amount: data.amount,
                            amountInEuros: data.amount / 100,
                            currency: data.currency || 'eur',
                            serviceType: data.serviceType
                        });
                        _b = (_a = stripe.paymentIntents).create;
                        _c = {
                            amount: data.amount, // Déjà en centimes
                            currency: data.currency || 'eur',
                            capture_method: 'manual', // Capture différée obligatoire
                            metadata: __assign({ clientId: data.clientId, providerId: data.providerId, serviceType: data.serviceType, providerType: data.providerType, commissionAmount: data.commissionAmount.toString(), providerAmount: data.providerAmount.toString(), commissionAmountEuros: (data.commissionAmount / 100).toFixed(2), providerAmountEuros: (data.providerAmount / 100).toFixed(2), environment: process.env.NODE_ENV || 'development' }, data.metadata),
                            description: "Service ".concat(data.serviceType, " - ").concat(data.providerType, " - ").concat(data.amount / 100, "\u20AC"),
                            statement_descriptor_suffix: 'SOS EXPAT'
                        };
                        return [4 /*yield*/, this.getClientEmail(data.clientId)];
                    case 3: return [4 /*yield*/, _b.apply(_a, [(_c.receipt_email = _d.sent(),
                                _c)])];
                    case 4:
                        paymentIntent = _d.sent();
                        console.log('✅ PaymentIntent Stripe créé:', {
                            id: paymentIntent.id,
                            amount: paymentIntent.amount,
                            amountInEuros: paymentIntent.amount / 100,
                            status: paymentIntent.status
                        });
                        // Sauvegarder dans Firestore avec montants EN CENTIMES
                        return [4 /*yield*/, this.savePaymentRecord(paymentIntent, data)];
                    case 5:
                        // Sauvegarder dans Firestore avec montants EN CENTIMES
                        _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                paymentIntentId: paymentIntent.id,
                                clientSecret: paymentIntent.client_secret || undefined
                            }];
                    case 6:
                        error_1 = _d.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:createPaymentIntent', error_1)];
                    case 7:
                        _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Erreur inconnue'
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Capture un paiement avec validation
     */
    StripeManager.prototype.capturePayment = function (paymentIntentId, sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var paymentIntent, canCapture, capturedPayment, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 10]);
                        this.validateConfiguration();
                        return [4 /*yield*/, stripe.paymentIntents.retrieve(paymentIntentId)];
                    case 1:
                        paymentIntent = _a.sent();
                        if (paymentIntent.status !== 'requires_capture') {
                            throw new Error("Impossible de capturer le paiement. Statut actuel: ".concat(paymentIntent.status));
                        }
                        if (!sessionId) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.validateCaptureConditions(sessionId)];
                    case 2:
                        canCapture = _a.sent();
                        if (!canCapture) {
                            throw new Error('Conditions de capture non remplies');
                        }
                        _a.label = 3;
                    case 3:
                        console.log('💰 Capture du paiement:', {
                            paymentIntentId: paymentIntentId,
                            amount: paymentIntent.amount,
                            amountInEuros: paymentIntent.amount / 100
                        });
                        return [4 /*yield*/, stripe.paymentIntents.capture(paymentIntentId)];
                    case 4:
                        capturedPayment = _a.sent();
                        // Mettre à jour dans Firestore
                        return [4 /*yield*/, this.updatePaymentStatus(paymentIntentId, 'captured')];
                    case 5:
                        // Mettre à jour dans Firestore
                        _a.sent();
                        if (!sessionId) return [3 /*break*/, 7];
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: 'payment_captured',
                                retryCount: 0,
                                additionalData: {
                                    paymentIntentId: paymentIntentId,
                                    amount: capturedPayment.amount,
                                    amountInEuros: capturedPayment.amount / 100,
                                    currency: capturedPayment.currency
                                }
                            })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        console.log('✅ Paiement capturé avec succès:', {
                            id: capturedPayment.id,
                            amount: capturedPayment.amount,
                            amountInEuros: capturedPayment.amount / 100
                        });
                        return [2 /*return*/, {
                                success: true,
                                paymentIntentId: capturedPayment.id
                            }];
                    case 8:
                        error_2 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:capturePayment', error_2)];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Erreur de capture'
                            }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Rembourse un paiement
     */
    StripeManager.prototype.refundPayment = function (paymentIntentId, reason, sessionId, amount // EN CENTIMES si spécifié
    ) {
        return __awaiter(this, void 0, void 0, function () {
            var paymentIntent, refund, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 12]);
                        this.validateConfiguration();
                        return [4 /*yield*/, stripe.paymentIntents.retrieve(paymentIntentId)];
                    case 1:
                        paymentIntent = _a.sent();
                        if (!(paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'requires_capture')) return [3 /*break*/, 5];
                        if (!(paymentIntent.status === 'requires_capture')) return [3 /*break*/, 4];
                        return [4 /*yield*/, stripe.paymentIntents.cancel(paymentIntentId)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.updatePaymentStatus(paymentIntentId, 'canceled')];
                    case 3:
                        _a.sent();
                        console.log('✅ Paiement annulé (non capturé):', paymentIntentId);
                        return [2 /*return*/, { success: true, paymentIntentId: paymentIntentId }];
                    case 4: throw new Error("Impossible de rembourser. Statut: ".concat(paymentIntent.status));
                    case 5:
                        console.log('💰 Remboursement du paiement:', {
                            paymentIntentId: paymentIntentId,
                            originalAmount: paymentIntent.amount,
                            refundAmount: amount || paymentIntent.amount,
                            amountInEuros: (amount || paymentIntent.amount) / 100,
                            reason: reason
                        });
                        return [4 /*yield*/, stripe.refunds.create({
                                payment_intent: paymentIntentId,
                                amount: amount, // Remboursement partiel si spécifié (EN CENTIMES)
                                reason: 'requested_by_customer',
                                metadata: {
                                    refundReason: reason,
                                    sessionId: sessionId || '',
                                    environment: process.env.NODE_ENV || 'development',
                                    refundAmountEuros: ((amount || paymentIntent.amount) / 100).toString()
                                }
                            })];
                    case 6:
                        refund = _a.sent();
                        // Mettre à jour dans Firestore
                        return [4 /*yield*/, this.updatePaymentStatus(paymentIntentId, 'refunded', {
                                refundId: refund.id,
                                refundReason: reason,
                                refundAmount: refund.amount,
                                refundAmountEuros: refund.amount / 100,
                                refundedAt: admin.firestore.FieldValue.serverTimestamp()
                            })];
                    case 7:
                        // Mettre à jour dans Firestore
                        _a.sent();
                        if (!sessionId) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: 'payment_refunded',
                                retryCount: 0,
                                additionalData: {
                                    paymentIntentId: paymentIntentId,
                                    refundId: refund.id,
                                    refundAmount: refund.amount,
                                    refundAmountEuros: refund.amount / 100,
                                    refundReason: reason
                                }
                            })];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        console.log('✅ Remboursement effectué avec succès:', {
                            refundId: refund.id,
                            amount: refund.amount,
                            amountInEuros: refund.amount / 100
                        });
                        return [2 /*return*/, {
                                success: true,
                                paymentIntentId: refund.payment_intent
                            }];
                    case 10:
                        error_3 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:refundPayment', error_3)];
                    case 11:
                        _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_3 instanceof Error ? error_3.message : 'Erreur de remboursement'
                            }];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Annule un PaymentIntent
     */
    StripeManager.prototype.cancelPayment = function (paymentIntentId, reason, sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var canceledPayment, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 7]);
                        this.validateConfiguration();
                        return [4 /*yield*/, stripe.paymentIntents.cancel(paymentIntentId)];
                    case 1:
                        canceledPayment = _a.sent();
                        // Mettre à jour dans Firestore
                        return [4 /*yield*/, this.updatePaymentStatus(paymentIntentId, 'canceled', {
                                cancelReason: reason,
                                canceledAt: admin.firestore.FieldValue.serverTimestamp()
                            })];
                    case 2:
                        // Mettre à jour dans Firestore
                        _a.sent();
                        if (!sessionId) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, logCallRecord_1.logCallRecord)({
                                callId: sessionId,
                                status: 'payment_canceled',
                                retryCount: 0,
                                additionalData: {
                                    paymentIntentId: paymentIntentId,
                                    cancelReason: reason,
                                    amount: canceledPayment.amount,
                                    amountInEuros: canceledPayment.amount / 100
                                }
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        console.log('✅ Paiement annulé:', {
                            id: canceledPayment.id,
                            reason: reason,
                            amount: canceledPayment.amount,
                            amountInEuros: canceledPayment.amount / 100
                        });
                        return [2 /*return*/, {
                                success: true,
                                paymentIntentId: canceledPayment.id
                            }];
                    case 5:
                        error_4 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:cancelPayment', error_4)];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Erreur d\'annulation'
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Valide les conditions de capture d'un paiement
     */
    StripeManager.prototype.validateCaptureConditions = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionDoc, session, participants, conference, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.db.collection('call_sessions').doc(sessionId).get()];
                    case 1:
                        sessionDoc = _a.sent();
                        if (!sessionDoc.exists)
                            return [2 /*return*/, false];
                        session = sessionDoc.data();
                        if (!session)
                            return [2 /*return*/, false];
                        participants = session.participants, conference = session.conference;
                        // Les deux participants doivent être connectés
                        if (participants.provider.status !== 'connected' ||
                            participants.client.status !== 'connected') {
                            console.log('Capture refusée: participants non connectés');
                            return [2 /*return*/, false];
                        }
                        // La conférence doit avoir duré au moins 2 minutes
                        if (!conference.duration || conference.duration < 120) {
                            console.log('Capture refusée: durée insuffisante');
                            return [2 /*return*/, false];
                        }
                        // Le statut de l'appel doit être complété ou actif
                        if (session.status !== 'completed' && session.status !== 'active') {
                            console.log('Capture refusée: statut d\'appel incorrect');
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 2:
                        error_5 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:validateCaptureConditions', error_5)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Recherche un paiement existant
     */
    StripeManager.prototype.findExistingPayment = function (clientId, providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var snapshot, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.db.collection('payments')
                                .where('clientId', '==', clientId)
                                .where('providerId', '==', providerId)
                                .where('status', 'in', ['pending', 'authorized', 'requires_capture'])
                                .limit(1)
                                .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, !snapshot.empty];
                    case 2:
                        error_6 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:findExistingPayment', error_6)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Valide l'existence des utilisateurs
     */
    StripeManager.prototype.validateUsers = function (clientId, providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, clientDoc, providerDoc, clientData, providerData;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.db.collection('users').doc(clientId).get(),
                            this.db.collection('users').doc(providerId).get()
                        ])];
                    case 1:
                        _a = _b.sent(), clientDoc = _a[0], providerDoc = _a[1];
                        if (!clientDoc.exists) {
                            throw new Error('Client non trouvé');
                        }
                        if (!providerDoc.exists) {
                            throw new Error('Prestataire non trouvé');
                        }
                        clientData = clientDoc.data();
                        providerData = providerDoc.data();
                        if ((clientData === null || clientData === void 0 ? void 0 : clientData.status) === 'suspended') {
                            throw new Error('Compte client suspendu');
                        }
                        if ((providerData === null || providerData === void 0 ? void 0 : providerData.status) === 'suspended') {
                            throw new Error('Compte prestataire suspendu');
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère l'email du client pour le reçu
     */
    StripeManager.prototype.getClientEmail = function (clientId) {
        return __awaiter(this, void 0, void 0, function () {
            var clientDoc, error_7;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.collection('users').doc(clientId).get()];
                    case 1:
                        clientDoc = _b.sent();
                        return [2 /*return*/, (_a = clientDoc.data()) === null || _a === void 0 ? void 0 : _a.email];
                    case 2:
                        error_7 = _b.sent();
                        console.warn('Impossible de récupérer l\'email client:', error_7);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔧 FIX: Sauvegarde l'enregistrement de paiement avec montants EN CENTIMES
     */
    StripeManager.prototype.savePaymentRecord = function (paymentIntent, data) {
        return __awaiter(this, void 0, void 0, function () {
            var paymentRecord;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        paymentRecord = {
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
                            status: paymentIntent.status,
                            clientSecret: paymentIntent.client_secret,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            metadata: data.metadata || {},
                            environment: process.env.NODE_ENV || 'development'
                        };
                        // Ajouter callSessionId SEULEMENT s'il est valide
                        if (data.callSessionId &&
                            data.callSessionId !== 'undefined' &&
                            data.callSessionId.trim() !== '') {
                            paymentRecord.callSessionId = data.callSessionId;
                            console.log('✅ CallSessionId ajouté:', data.callSessionId);
                        }
                        else {
                            console.log('⚠️ CallSessionId omis (invalide):', data.callSessionId);
                        }
                        return [4 /*yield*/, this.db.collection('payments').doc(paymentIntent.id).set(paymentRecord)];
                    case 1:
                        _a.sent();
                        console.log('✅ Enregistrement paiement sauvegardé en DB:', {
                            id: paymentIntent.id,
                            amount: data.amount,
                            amountInEuros: data.amount / 100,
                            hasCallSessionId: !!paymentRecord.callSessionId
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Met à jour le statut d'un paiement
     */
    StripeManager.prototype.updatePaymentStatus = function (paymentIntentId_1, status_1) {
        return __awaiter(this, arguments, void 0, function (paymentIntentId, status, additionalData) {
            if (additionalData === void 0) { additionalData = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.db.collection('payments').doc(paymentIntentId).update(__assign({ status: status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, additionalData))];
                    case 1:
                        _a.sent();
                        console.log("\uD83D\uDCDD Statut paiement mis \u00E0 jour: ".concat(paymentIntentId, " -> ").concat(status));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 🔧 FIX: Récupère les statistiques de paiement avec montants EN CENTIMES
     */
    StripeManager.prototype.getPaymentStatistics = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var query, snapshot, totalAmount_1, totalCommission_1, totalProviderAmount_1, successfulPayments_1, refundedPayments_1, averageAmount, error_8;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        query = this.db.collection('payments');
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
                        return [4 /*yield*/, query.get()];
                    case 1:
                        snapshot = _a.sent();
                        totalAmount_1 = 0;
                        totalCommission_1 = 0;
                        totalProviderAmount_1 = 0;
                        successfulPayments_1 = 0;
                        refundedPayments_1 = 0;
                        snapshot.docs.forEach(function (doc) {
                            var payment = doc.data();
                            if (payment.status === 'succeeded' || payment.status === 'captured') {
                                totalAmount_1 += payment.amount; // Déjà en centimes
                                totalCommission_1 += payment.commissionAmount; // Déjà en centimes
                                totalProviderAmount_1 += payment.providerAmount; // Déjà en centimes
                                successfulPayments_1++;
                            }
                            if (payment.status === 'refunded') {
                                refundedPayments_1++;
                            }
                        });
                        averageAmount = successfulPayments_1 > 0 ? totalAmount_1 / successfulPayments_1 : 0;
                        return [2 /*return*/, {
                                totalAmount: totalAmount_1,
                                totalAmountEuros: totalAmount_1 / 100,
                                totalCommission: totalCommission_1,
                                totalProviderAmount: totalProviderAmount_1,
                                paymentCount: snapshot.size,
                                successfulPayments: successfulPayments_1,
                                refundedPayments: refundedPayments_1,
                                averageAmount: averageAmount,
                                averageAmountEuros: averageAmount / 100
                            }];
                    case 2:
                        error_8 = _a.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:getPaymentStatistics', error_8)];
                    case 3:
                        _a.sent();
                        throw error_8;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Récupère un paiement par ID
     */
    StripeManager.prototype.getPayment = function (paymentIntentId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, stripePayment, firestorePayment, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, Promise.all([
                                stripe.paymentIntents.retrieve(paymentIntentId),
                                this.db.collection('payments').doc(paymentIntentId).get()
                            ])];
                    case 1:
                        _a = _b.sent(), stripePayment = _a[0], firestorePayment = _a[1];
                        return [2 /*return*/, {
                                stripe: stripePayment,
                                firestore: firestorePayment.exists ? firestorePayment.data() : null
                            }];
                    case 2:
                        error_9 = _b.sent();
                        return [4 /*yield*/, (0, logError_1.logError)('StripeManager:getPayment', error_9)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return StripeManager;
}());
exports.StripeManager = StripeManager;
// Instance singleton
exports.stripeManager = new StripeManager();
