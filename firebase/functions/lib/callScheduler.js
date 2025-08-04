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
exports.scheduleCallSequence = void 0;
const logCallRecord_1 = require("./utils/logCallRecord");
const logError_1 = require("./utils/logError");
const admin = __importStar(require("firebase-admin"));
const twilio_1 = __importDefault(require("twilio"));
const stripe_1 = __importDefault(require("stripe"));
const dotenv = __importStar(require("dotenv"));
// Charger les variables d'environnement
dotenv.config();
// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
    admin.initializeApp();
}
// Initialiser Twilio avec vos credentials
const twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Initialiser Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
const scheduleCallSequence = async (callSessionId) => {
    var _a;
    const db = admin.firestore();
    const callRef = db.collection('call_sessions').doc(callSessionId);
    const doc = await callRef.get();
    if (!doc.exists)
        return;
    const call = doc.data();
    if (!call)
        return;
    await (0, logCallRecord_1.logCallRecord)({
        callId: callSessionId,
        status: 'scheduled',
        retryCount: 0,
    });
    const { providerPhone, clientPhone, paymentIntentId, providerType } = call;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(5 * 60 * 1000); // ⏳ Attente 5 minutes
    let providerAnswered = false;
    let clientAnswered = false;
    // ✳️ PARTIE A : APPEL DU PRESTATAIRE (3 tentatives)
    for (let i = 0; i < 3; i++) {
        try {
            await twilioClient.calls.create({
                to: providerPhone,
                from: process.env.TWILIO_PHONE_NUMBER,
                twiml: `<Response><Say voice="alice">Restez en ligne, vous allez être mis en relation avec votre client SOS Expat.</Say><Dial timeout="20" timeLimit="${providerType === 'lawyer' ? 1500 : 2100}">${clientPhone}</Dial></Response>`,
                statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
                statusCallbackMethod: 'POST',
                timeout: 20,
            });
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: `provider_attempt_${i + 1}`,
                retryCount: i + 1,
            });
            await delay(60 * 1000); // 🕐 Attente 1 min
            const updated = (await callRef.get()).data();
            if ((updated === null || updated === void 0 ? void 0 : updated.status) === 'connected') {
                providerAnswered = true;
                const startTime = admin.firestore.Timestamp.now();
                await (0, logCallRecord_1.logCallRecord)({
                    callId: callSessionId,
                    status: 'provider_connected',
                    retryCount: i + 1,
                });
                await callRef.update({
                    startTime,
                    status: 'provider_connected',
                });
                // ✳️ PARTIE B : APPEL DU CLIENT (3 tentatives) - NOUVEAU CODE
                for (let j = 0; j < 3; j++) {
                    try {
                        // Calcul du temps limite basé sur le type de prestataire
                        const timeLimit = providerType === 'lawyer' ? 1500 : 2100; // 25min ou 35min en secondes
                        await twilioClient.calls.create({
                            to: clientPhone,
                            from: process.env.TWILIO_PHONE_NUMBER,
                            twiml: `<Response>
                <Say voice="alice">Votre prestataire SOS Expat est disponible. Restez en ligne pour être mis en relation.</Say>
                <Dial timeout="20" timeLimit="${timeLimit}">${providerPhone}</Dial>
              </Response>`,
                            statusCallback: `${process.env.FUNCTION_URL}/twilioClientWebhook`,
                            statusCallbackMethod: 'POST',
                            timeout: 20,
                        });
                        await (0, logCallRecord_1.logCallRecord)({
                            callId: callSessionId,
                            status: `client_attempt_${j + 1}`,
                            retryCount: j + 1,
                        });
                        await delay(10 * 1000); // ⚡ Attente 10 secondes avant de vérifier
                        const statusSnap = await callRef.get();
                        const statusData = statusSnap.data();
                        if ((statusData === null || statusData === void 0 ? void 0 : statusData.clientStatus) === 'connected') {
                            clientAnswered = true;
                            await callRef.update({
                                clientConnectedAt: admin.firestore.Timestamp.now(),
                                clientStatus: 'connected',
                                fullStatus: 'both_connected'
                            });
                            await (0, logCallRecord_1.logCallRecord)({
                                callId: callSessionId,
                                status: 'client_connected',
                                retryCount: j + 1,
                            });
                            break; // Client connecté, sortir de la boucle
                        }
                    }
                    catch (error) {
                        await (0, logError_1.logError)('callScheduler:tryCallClient', error);
                        await (0, logCallRecord_1.logCallRecord)({
                            callId: callSessionId,
                            status: `client_error_attempt_${j + 1}`,
                            retryCount: j + 1,
                        });
                    }
                }
                // Si le client n'a pas répondu après 3 tentatives
                if (!clientAnswered) {
                    await callRef.update({
                        status: 'client_no_answer',
                        refunded: true,
                    });
                    // Prévenir le prestataire que le client n'a pas répondu
                    await twilioClient.calls.create({
                        to: providerPhone,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        twiml: `<Response><Say voice="alice">Le client n'a pas répondu. L'appel est annulé. Merci.</Say></Response>`,
                    });
                    await (0, logCallRecord_1.logCallRecord)({
                        callId: callSessionId,
                        status: 'failed_client_no_answer',
                        retryCount: 3,
                    });
                    // Annuler le paiement
                    if (paymentIntentId) {
                        try {
                            await stripe.paymentIntents.cancel(paymentIntentId);
                            console.log(`Payment ${paymentIntentId} cancelled - client no answer`);
                        }
                        catch (error) {
                            await (0, logError_1.logError)('callScheduler:cancelPayment:clientNoAnswer', error);
                        }
                    }
                    return;
                }
                // ✳️ PARTIE C : Si BOTH sont connectés, générer facture et notifications
                if (providerAnswered && clientAnswered) {
                    try {
                        const clientSnap = await db.collection('users').doc(call.clientId).get();
                        const providerSnap = await db.collection('users').doc(call.providerId).get();
                        const client = clientSnap.data();
                        const provider = providerSnap.data();
                        if (client && provider) {
                            const sharedLang = ((_a = client.languages) === null || _a === void 0 ? void 0 : _a.find((l) => { var _a; return (_a = provider.languages) === null || _a === void 0 ? void 0 : _a.includes(l); })) || 'en';
                            // 🧾 GÉNÉRATION DE LA FACTURE (à réactiver si nécessaire)
                            /*
                            await generateInvoice({
                              invoiceNumber: `INV-${Date.now()}`,
                              type: 'platform',
                              callId: callSessionId,
                              clientId: call.clientId,
                              providerId: call.providerId,
                              amount: call.amount || 1900,
                              currency: 'EUR',
                              downloadUrl: '',
                              createdAt: admin.firestore.Timestamp.now(),
                              status: 'issued',
                              sentToAdmin: false,
                              locale: sharedLang,
                            });
                            */
                            // 🔔 NOTIFICATION MULTILINGUE (à réactiver si nécessaire)
                            /*
                            await sendNotificationToProvider({
                              type: 'payment_received',
                              recipientId: call.providerId,
                              recipientEmail: provider.email,
                              recipientPhone: provider.phone,
                              recipientName: provider.firstName,
                              recipientCountry: provider.country,
                              title: sharedLang === 'fr' ? 'Paiement confirmé' : 'Payment confirmed',
                              message:
                                sharedLang === 'fr'
                                  ? `Vous avez reçu une demande confirmée de ${client.firstName}`
                                  : `You have received a confirmed request from ${client.firstName}`,
                              requestDetails: {
                                clientName: client.firstName,
                                clientCountry: client.country,
                                requestTitle: call.title || '',
                                requestDescription: call.description || '',
                                urgencyLevel: 'medium',
                                serviceType: call.serviceType || 'lawyer_call',
                                estimatedPrice: call.amount || 1900,
                                clientPhone: client.phone,
                                languages: [sharedLang],
                              },
                            });
                            */
                            console.log('Both participants connected successfully', {
                                callSessionId,
                                sharedLang,
                                providerAnswered,
                                clientAnswered
                            });
                        }
                    }
                    catch (err) {
                        await (0, logError_1.logError)('callScheduler:postBothConnectedError', err);
                    }
                }
                break; // Provider connecté, sortir de la boucle des tentatives prestataire
            }
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error(`Tentative prestataire ${i + 1} échouée :`, errorMessage);
            await (0, logError_1.logError)('callScheduler:tryCallProvider', e);
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: `provider_error_attempt_${i + 1}`,
                retryCount: i + 1,
            });
        }
    }
    // Si le prestataire n'a pas répondu du tout après 3 tentatives
    if (!providerAnswered) {
        await twilioClient.calls.create({
            to: clientPhone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml: `<Response><Say voice="alice">Le prestataire n'a pas répondu. Vous ne serez pas débité. Merci pour votre compréhension.</Say></Response>`,
        });
        await (0, logCallRecord_1.logCallRecord)({
            callId: callSessionId,
            status: 'failed_all_provider_attempts',
            retryCount: 3,
        });
        await callRef.update({
            status: 'cancelled_by_provider',
            refunded: true,
        });
        // Annuler le paiement Stripe si disponible
        if (paymentIntentId) {
            try {
                await stripe.paymentIntents.cancel(paymentIntentId);
                console.log(`Payment ${paymentIntentId} cancelled successfully - provider no answer`);
            }
            catch (error) {
                console.error('Error cancelling payment:', error);
                await (0, logError_1.logError)('callScheduler:cancelPayment:providerNoAnswer', error);
            }
        }
    }
};
exports.scheduleCallSequence = scheduleCallSequence;
//# sourceMappingURL=callScheduler.js.map