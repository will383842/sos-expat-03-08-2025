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
exports.scheduledFirestoreExport = exports.twilioWebhook = exports.stripeWebhook = exports.updateCallStatus = exports.initiateCall = exports.cancelPayment = exports.capturePayment = exports.createPaymentIntent = exports.sendPushNotification = exports.sendNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const twilio_1 = __importDefault(require("twilio"));
const stripe_1 = __importDefault(require("stripe"));
const nodemailer = __importStar(require("nodemailer"));
const callScheduler_1 = require("./callScheduler");
// import { notifyAfterPayment } from './notifications/notifyAfterPayment'; // Temporairement commenté
const child_process_1 = require("child_process");
const util_1 = require("util");
// Charger les variables d'environnement depuis .env
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Initialiser Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Initialiser Twilio avec vos credentials
const twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Initialiser Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
// Initialiser le service d'email (exemple avec Gmail/SMTP)
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'notifications@sosexpats.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});
// Promisifier exec pour l'utiliser avec async/await
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Fonction Cloud pour envoyer des notifications
exports.sendNotification = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour envoyer des notifications.');
    }
    const { type, recipientEmail, recipientPhone, recipientName, recipientCountry, emailSubject, emailHtml, smsMessage, whatsappMessage } = data;
    try {
        const results = [];
        // 1. Envoyer l'email
        if (recipientEmail && emailSubject && emailHtml) {
            try {
                await emailTransporter.sendMail({
                    from: '"SOS Expats" <notifications@sosexpats.com>',
                    to: recipientEmail,
                    subject: emailSubject,
                    html: emailHtml,
                    priority: 'high'
                });
                results.push({ channel: 'email', success: true });
                console.log('✅ Email envoyé à:', recipientEmail);
            }
            catch (emailError) {
                console.error('❌ Erreur email:', emailError);
                results.push({ channel: 'email', success: false, error: emailError.message });
            }
        }
        // 2. Envoyer le SMS via Twilio
        if (recipientPhone && smsMessage && twilioClient) {
            try {
                await twilioClient.messages.create({
                    body: smsMessage,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: recipientPhone
                });
                results.push({ channel: 'sms', success: true });
                console.log('✅ SMS envoyé à:', recipientPhone);
            }
            catch (smsError) {
                console.error('❌ Erreur SMS:', smsError);
                results.push({ channel: 'sms', success: false, error: smsError.message });
            }
        }
        else if (recipientPhone && smsMessage) {
            results.push({ channel: 'sms', success: false, error: 'Twilio not configured' });
        }
        // 3. Envoyer WhatsApp via Twilio
        if (recipientPhone && whatsappMessage && twilioClient) {
            try {
                await twilioClient.messages.create({
                    body: whatsappMessage,
                    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                    to: `whatsapp:${recipientPhone}`
                });
                results.push({ channel: 'whatsapp', success: true });
                console.log('✅ WhatsApp envoyé à:', recipientPhone);
            }
            catch (whatsappError) {
                console.error('❌ Erreur WhatsApp:', whatsappError);
                results.push({ channel: 'whatsapp', success: false, error: whatsappError.message });
            }
        }
        else if (recipientPhone && whatsappMessage) {
            results.push({ channel: 'whatsapp', success: false, error: 'Twilio not configured' });
        }
        // Enregistrer les résultats dans Firestore
        await db.collection('notification_logs').add({
            type,
            recipientEmail,
            recipientPhone,
            recipientName,
            recipientCountry,
            results,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            success: results.some(r => r.success)
        });
        return {
            success: results.some(r => r.success),
            results
        };
    }
    catch (error) {
        console.error('Erreur générale lors de l\'envoi de notification:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de l\'envoi de la notification', error);
    }
});
// Fonction Cloud pour envoyer des notifications push via FCM
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié.');
    }
    const { userId, title, body, data: notificationData } = data;
    try {
        // Récupérer les tokens FCM de l'utilisateur
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('Utilisateur non trouvé');
        }
        const userData = userDoc.data();
        const deviceTokens = (userData === null || userData === void 0 ? void 0 : userData.deviceTokens) || [];
        if (deviceTokens.length === 0) {
            console.log('Aucun token FCM trouvé pour l\'utilisateur:', userId);
            return { success: false, message: 'Aucun token FCM' };
        }
        // Envoyer la notification push
        const message = {
            notification: {
                title,
                body
            },
            data: notificationData || {},
            tokens: deviceTokens
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Push notifications envoyées:', response.successCount, 'succès,', response.failureCount, 'échecs');
        return {
            success: response.successCount > 0,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    }
    catch (error) {
        console.error('Erreur envoi push notification:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de l\'envoi de la push notification', error);
    }
});
// Fonction pour créer un PaymentIntent Stripe
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    const { amount, currency, clientId, providerId, serviceType, commissionAmount, providerAmount, metadata } = data;
    try {
        // Créer un PaymentIntent avec Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: currency || 'eur',
            capture_method: 'manual', // Capture différée
            metadata: Object.assign({ clientId,
                providerId,
                serviceType, commissionAmount: commissionAmount.toString(), providerAmount: providerAmount.toString() }, metadata)
        });
        return {
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            status: paymentIntent.status
        };
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        console.error('Error stack:', error.stack || 'No stack trace available');
        console.error('Error details:', {
            message: error.message || 'Unknown error',
            data: { amount, currency, clientId, providerId, serviceType }
        });
        throw new functions.https.HttpsError('internal', 'Erreur lors de la création du paiement', error);
    }
});
// Fonction pour capturer un paiement
exports.capturePayment = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    const { paymentIntentId } = data;
    try {
        const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
        // Mettre à jour le statut dans Firestore
        const snapshot = await db.collection('payments').where('stripePaymentIntentId', '==', paymentIntentId).get();
        if (!snapshot.empty) {
            await snapshot.docs[0].ref.update({
                status: 'captured',
                capturedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return {
            success: true,
            status: paymentIntent.status
        };
    }
    catch (error) {
        console.error('Error capturing payment:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de la capture du paiement', error);
    }
});
// Fonction pour annuler un paiement
exports.cancelPayment = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    const { paymentIntentId } = data;
    try {
        const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        // Mettre à jour le statut dans Firestore
        const snapshot = await db.collection('payments').where('stripePaymentIntentId', '==', paymentIntentId).get();
        if (!snapshot.empty) {
            await snapshot.docs[0].ref.update({
                status: 'canceled',
                canceledAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return {
            success: true,
            status: paymentIntent.status
        };
    }
    catch (error) {
        console.error('Error canceling payment:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de l\'annulation du paiement', error);
    }
});
// Fonction pour initier un appel Twilio
exports.initiateCall = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    const { clientId, providerId, clientPhone, providerPhone, providerType, clientLanguage, providerLanguage, paymentIntentId } = data;
    try {
        // Vérifier que les numéros de téléphone sont valides
        if (!clientPhone || !providerPhone) {
            throw new functions.https.HttpsError('invalid-argument', 'Les numéros de téléphone sont requis');
        }
        // Créer une session d'appel dans Firestore
        const callSessionRef = db.collection('call_sessions').doc();
        const callSessionId = callSessionRef.id;
        const callSession = {
            id: callSessionId,
            clientId,
            providerId,
            clientPhone,
            providerPhone,
            status: 'initiating',
            providerAttempts: [],
            clientAttempts: [],
            paymentIntentId,
            providerType,
            clientLanguage: clientLanguage || 'fr-FR',
            providerLanguage: providerLanguage || 'fr-FR',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await callSessionRef.set(callSession);
        // Lance le processus d'appel après 5 minutes
        (0, callScheduler_1.scheduleCallSequence)(callSessionId); // ne pas await = en arrière-plan
        // Créer un log pour la session
        await db.collection('call_logs').add({
            callSessionId,
            type: 'session_created',
            status: 'initiating',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: {
                clientId,
                providerId,
                providerType
            }
        });
        return {
            success: true,
            callSessionId,
            status: 'initiating'
        };
    }
    catch (error) {
        console.error('Error initiating call:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de l\'initiation de l\'appel', error);
    }
});
// Fonction pour mettre à jour le statut d'un appel
exports.updateCallStatus = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'L\'utilisateur doit être authentifié pour effectuer cette action.');
    }
    const { callSessionId, status, details } = data;
    try {
        const callSessionRef = db.collection('call_sessions').doc(callSessionId);
        const callSession = await callSessionRef.get();
        if (!callSession.exists) {
            throw new functions.https.HttpsError('not-found', 'Session d\'appel non trouvée');
        }
        const callSessionData = callSession.data();
        // Vérifier que l'utilisateur est autorisé à mettre à jour cette session
        if (context.auth.uid !== (callSessionData === null || callSessionData === void 0 ? void 0 : callSessionData.clientId) &&
            context.auth.uid !== (callSessionData === null || callSessionData === void 0 ? void 0 : callSessionData.providerId) &&
            !(await isAdmin(context.auth.uid))) {
            throw new functions.https.HttpsError('permission-denied', 'Vous n\'êtes pas autorisé à mettre à jour cette session d\'appel');
        }
        // Mettre à jour le statut
        await callSessionRef.update(Object.assign({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, details));
        // Créer un log pour cette mise à jour
        await db.collection('call_logs').add({
            callSessionId,
            type: 'status_change',
            previousStatus: (callSessionData === null || callSessionData === void 0 ? void 0 : callSessionData.status) || 'unknown',
            newStatus: status,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details
        });
        return {
            success: true,
            status
        };
    }
    catch (error) {
        console.error('Error updating call status:', error);
        throw new functions.https.HttpsError('internal', 'Erreur lors de la mise à jour du statut de l\'appel', error);
    }
});
// Fonction utilitaire pour vérifier si un utilisateur est admin
async function isAdmin(uid) {
    var _a;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists && ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    }
    catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}
// Webhook Stripe pour gérer les événements de paiement
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).send('Signature Stripe manquante');
        return;
    }
    try {
        const rawBody = req.rawBody;
        if (!rawBody) {
            res.status(400).send('Raw body manquant');
            return;
        }
        const event = stripe.webhooks.constructEvent(rawBody.toString(), signature, process.env.STRIPE_WEBHOOK_SECRET || '');
        // Traiter l'événement
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            case 'payment_intent.canceled':
                await handlePaymentIntentCanceled(event.data.object);
                break;
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error processing Stripe webhook:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
// Webhook Twilio pour gérer les événements d'appel
exports.twilioWebhook = functions.https.onRequest(async (req, res) => {
    // Vérifier l'authentification Twilio
    // Dans une implémentation réelle, vous devriez vérifier la signature Twilio
    try {
        const { action, callSessionId, phoneNumber, twiml, attempt } = req.body;
        // Traiter l'action
        switch (action) {
            case 'call-provider':
                await handleCallProvider(callSessionId, phoneNumber, twiml, attempt);
                break;
            case 'call-client':
                await handleCallClient(callSessionId, phoneNumber, twiml, attempt);
                break;
            case 'call-status':
                await handleCallStatus(callSessionId, req.body.status, req.body.details);
                break;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error processing Twilio webhook:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
async function handlePaymentIntentSucceeded(paymentIntent) {
    try {
        // ✅ Mise à jour du paiement
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'captured',
                capturedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // ✅ Mise à jour de l'appel + déclenchement des notifications
        if (paymentIntent.metadata.callId) {
            const callRef = db.collection('calls').doc(paymentIntent.metadata.callId);
            await callRef.update({
                status: 'completed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // 🔔 Envoi des messages client et prestataire
            // Note: notifyAfterPayment est une fonction importée, pas une Cloud Function
            // Si c'est une Cloud Function, utilisez httpsCallable depuis le frontend
            console.log('Call completed, notifications should be sent from frontend');
        }
        return true;
    }
    catch (error) {
        console.error('❌ Erreur handlePaymentIntentSucceeded :', error);
        return false;
    }
}
async function handlePaymentIntentFailed(paymentIntent) {
    var _a;
    try {
        // Mettre à jour le paiement dans Firestore
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'failed',
                failureReason: ((_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Mettre à jour l'appel associé
        if (paymentIntent.metadata.callId) {
            const callRef = db.collection('calls').doc(paymentIntent.metadata.callId);
            await callRef.update({
                status: 'failed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return true;
    }
    catch (error) {
        console.error('Error handling payment intent failed:', error);
        return false;
    }
}
async function handlePaymentIntentCanceled(paymentIntent) {
    try {
        // Mettre à jour le paiement dans Firestore
        const paymentsQuery = db.collection('payments').where('stripePaymentIntentId', '==', paymentIntent.id);
        const paymentsSnapshot = await paymentsQuery.get();
        if (!paymentsSnapshot.empty) {
            const paymentDoc = paymentsSnapshot.docs[0];
            await paymentDoc.ref.update({
                status: 'canceled',
                canceledAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Mettre à jour l'appel associé
        if (paymentIntent.metadata.callId) {
            const callRef = db.collection('calls').doc(paymentIntent.metadata.callId);
            await callRef.update({
                status: 'canceled',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return true;
    }
    catch (error) {
        console.error('Error handling payment intent canceled:', error);
        return false;
    }
}
// Fonctions de gestion des événements Twilio
async function handleCallProvider(callSessionId, phoneNumber, twiml, attempt) {
    try {
        // Récupérer les données de la session pour obtenir providerType
        const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
        const callSessionData = callSessionDoc.data();
        const providerType = (callSessionData === null || callSessionData === void 0 ? void 0 : callSessionData.providerType) || 'default';
        // Mettre à jour la session d'appel
        const callSessionRef = db.collection('call_sessions').doc(callSessionId);
        await callSessionRef.update({
            status: 'calling_provider',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Effectuer l'appel via Twilio
        const call = await twilioClient.calls.create({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER || '',
            twiml,
            timeout: providerType === 'lawyer' ? 25 : 35, // Timeout en secondes
            statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
        });
        // Enregistrer la tentative
        await callSessionRef.update({
            providerAttempts: admin.firestore.FieldValue.arrayUnion({
                phoneNumber,
                status: 'ringing',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                callSid: call.sid
            })
        });
        return {
            success: true,
            callSid: call.sid,
            status: 'ringing'
        };
    }
    catch (error) {
        console.error('Error calling provider:', error);
        // Enregistrer l'erreur
        const callSessionRef = db.collection('call_sessions').doc(callSessionId);
        await callSessionRef.update({
            providerAttempts: admin.firestore.FieldValue.arrayUnion({
                phoneNumber,
                status: 'failed',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                error: error.message
            })
        });
        return {
            success: false,
            error: error.message
        };
    }
}
async function handleCallClient(callSessionId, phoneNumber, twiml, attempt) {
    try {
        // Récupérer les données de la session pour obtenir providerType
        const callSessionDoc = await db.collection('call_sessions').doc(callSessionId).get();
        const callSessionData = callSessionDoc.data();
        const providerType = (callSessionData === null || callSessionData === void 0 ? void 0 : callSessionData.providerType) || 'default';
        // Mettre à jour la session d'appel
        const callSessionRef = db.collection('call_sessions').doc(callSessionId);
        await callSessionRef.update({
            status: 'calling_client',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Effectuer l'appel via Twilio
        const call = await twilioClient.calls.create({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER || '',
            twiml,
            timeout: providerType === 'lawyer' ? 25 : 35, // Timeout en secondes
            statusCallback: `${process.env.FUNCTION_URL}/twilioWebhook`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
        });
        // Enregistrer la tentative
        await callSessionRef.update({
            clientAttempts: admin.firestore.FieldValue.arrayUnion({
                phoneNumber,
                status: 'ringing',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                callSid: call.sid
            })
        });
        return {
            success: true,
            callSid: call.sid,
            status: 'ringing'
        };
    }
    catch (error) {
        console.error('Error calling client:', error);
        // Enregistrer l'erreur
        const callSessionRef = db.collection('call_sessions').doc(callSessionId);
        await callSessionRef.update({
            clientAttempts: admin.firestore.FieldValue.arrayUnion({
                phoneNumber,
                status: 'failed',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                error: error.message
            })
        });
        return {
            success: false,
            error: error.message
        };
    }
}
async function handleCallStatus(callSessionId, status, details) {
    var _a, _b;
    try {
        const callSessionRef = db.collection('call_sessions').doc(callSessionId);
        const callSession = await callSessionRef.get();
        if (!callSession.exists) {
            throw new Error('Call session not found');
        }
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Mettre à jour le statut si nécessaire
        if (status === 'connected') {
            updates.status = 'connected';
            updates.connectedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        else if (status === 'completed') {
            updates.status = 'completed';
            updates.endedAt = admin.firestore.FieldValue.serverTimestamp();
            const sessionData = callSession.data();
            const connectedAt = (_b = (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.connectedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (connectedAt) {
                const endedAt = new Date();
                const durationSeconds = Math.round((endedAt.getTime() - connectedAt.getTime()) / 1000);
                updates.totalDuration = durationSeconds;
                // Si l'appel a duré plus de 0 secondes, capturer le paiement Stripe
                if (durationSeconds > 0 && (sessionData === null || sessionData === void 0 ? void 0 : sessionData.paymentIntentId)) {
                    try {
                        await stripe.paymentIntents.capture(sessionData.paymentIntentId);
                        updates.paid = true;
                        // Créer une demande d'avis post-appel pour le client
                        await admin.firestore().collection('reviews_requests').add({
                            clientId: sessionData === null || sessionData === void 0 ? void 0 : sessionData.clientId,
                            providerId: sessionData === null || sessionData === void 0 ? void 0 : sessionData.providerId,
                            callSessionId,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            status: 'pending'
                        });
                    }
                    catch (error) {
                        console.error('Error capturing payment:', error);
                    }
                }
            }
        }
        // Appliquer les mises à jour
        await callSessionRef.update(updates);
        // Créer un log pour cette mise à jour
        await db.collection('call_logs').add({
            callSessionId,
            type: 'status_change',
            status,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details
        });
        return {
            success: true,
            status
        };
    }
    catch (error) {
        console.error('Error updating call status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
// Fonction cron pour sauvegarder Firestore et Storage tous les jours à 2h du matin
exports.scheduledFirestoreExport = functions.pubsub
    .schedule('0 2 * * *')
    .timeZone('Europe/Paris')
    .onRun(async (context) => {
    try {
        const projectId = process.env.GCLOUD_PROJECT;
        const bucketName = `${projectId}-backups`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Créer le client pour l'API Firestore Admin
        const firestoreClient = new admin.firestore.v1.FirestoreAdminClient();
        // Exporter les collections Firestore
        const firestoreExportName = `firestore-export-${timestamp}`;
        const firestoreExportPath = `gs://${bucketName}/${firestoreExportName}`;
        const [firestoreOperation] = await firestoreClient.exportDocuments({
            name: `projects/${projectId}/databases/(default)`,
            outputUriPrefix: firestoreExportPath,
            // Exporter toutes les collections
            collectionIds: [],
        });
        console.log(`Firestore export operation started: ${firestoreOperation.name}`);
        // Exporter Storage
        const storageExportName = `storage-export-${timestamp}`;
        const storageExportPath = `gs://${bucketName}/${storageExportName}`;
        // Utiliser gsutil pour copier les fichiers Storage
        try {
            const { stderr } = await execAsync(`gsutil -m cp -r gs://${projectId}.appspot.com/* ${storageExportPath}`);
            console.log(`Storage export completed to ${storageExportPath}`);
            if (stderr) {
                console.warn(`Storage export warnings: ${stderr}`);
            }
        }
        catch (error) {
            console.error(`Storage export error: ${error.message}`);
        }
        // Enregistrer les logs de sauvegarde
        await admin.firestore().collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            firestoreExportPath,
            storageExportPath,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        });
        return null;
    }
    catch (error) {
        console.error('Error performing scheduled backup:', error);
        // Enregistrer l'erreur dans les logs
        await admin.firestore().collection('logs').doc('backups').collection('entries').add({
            type: 'scheduled_backup',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: error.message
        });
        return null;
    }
});
// Export de la fonction notifyAfterPayment (temporairement commenté)
// export { notifyAfterPayment } from './notifications/notifyAfterPayment';
//# sourceMappingURL=index.js.map