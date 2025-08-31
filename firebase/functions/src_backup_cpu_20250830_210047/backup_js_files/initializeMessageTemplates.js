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
exports.initializeMessageTemplates = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
// 🔧 FIX CRITIQUE: Configuration d'optimisation CPU SEULEMENT
var CPU_OPTIMIZED_CONFIG = {
    memory: "256MiB", // Un peu plus de mémoire pour les templates complets
    timeoutSeconds: 120, // Plus de temps pour tous les templates
    maxInstances: 2, // Limite stricte pour cette fonction d'initialisation
    minInstances: 0,
    concurrency: 1 // Une seule exécution à la fois
};
// ⚠️ TOUS LES TEMPLATES ORIGINAUX GARDÉS (pas de suppression fonctionnelle)
var defaultTemplates = [
    // ====== TEMPLATES WHATSAPP ======
    {
        id: 'whatsapp_provider_notification',
        name: 'Notification WhatsApp Prestataire',
        type: 'whatsapp',
        language: 'fr',
        content: '🔔 SOS Expat : Un client va vous appeler dans 5 minutes.\n📋 Titre : {requestTitle}\n🗣️ Langue : {language}\n📞 Soyez prêt à répondre !',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    {
        id: 'whatsapp_client_notification',
        name: 'Notification WhatsApp Client',
        type: 'whatsapp',
        language: 'fr',
        content: '✅ Votre appel avec un expert SOS Expat est prévu dans quelques minutes.\n📋 Sujet : {requestTitle}\n🗣️ Langue : {language}\n📞 Restez proche de votre téléphone !',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    // ====== TEMPLATES SMS ======
    {
        id: 'sms_provider_notification',
        name: 'Notification SMS Prestataire',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Un client va vous appeler dans 5min. Titre: {requestTitle}. Langue: {language}. Soyez prêt !',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    {
        id: 'sms_client_notification',
        name: 'Notification SMS Client',
        type: 'sms',
        language: 'fr',
        content: 'Votre appel SOS Expat est prévu dans quelques minutes. Sujet: {requestTitle}. Langue: {language}. Restez disponible !',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    // ====== TEMPLATES VOCAUX ======
    {
        id: 'voice_provider_welcome',
        name: 'Message vocal accueil prestataire',
        type: 'voice',
        language: 'fr',
        content: 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter quelques instants.',
        variables: [],
        isActive: true
    },
    {
        id: 'voice_client_welcome',
        name: 'Message vocal accueil client',
        type: 'voice',
        language: 'fr',
        content: 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter quelques instants.',
        variables: [],
        isActive: true
    },
    // ====== TEMPLATES ÉCHECS D'APPEL ======
    {
        id: 'whatsapp_call_failure_provider_no_answer_client',
        name: 'WhatsApp échec - prestataire non réponse (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '❌ Appel non établi\n\nLe prestataire n\'a pas répondu à nos appels répétés.\n\n💰 Vous ne serez pas débité\n✅ Remboursement automatique en cours\n\n🔄 Vous pouvez sélectionner un autre expert sur notre plateforme.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_provider_no_answer_client',
        name: 'SMS échec - prestataire non réponse (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Le prestataire n\'a pas répondu. Vous ne serez pas débité. Remboursement automatique. Vous pouvez choisir un autre expert.',
        variables: [],
        isActive: true
    },
    {
        id: 'whatsapp_call_failure_client_no_answer_provider',
        name: 'WhatsApp échec - client non réponse (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '📞 Appel client annulé\n\nLe client n\'a pas répondu à nos appels.\n\n💰 Vous serez indemnisé pour votre disponibilité selon nos conditions.\n\n📧 Notre équipe vous contactera sous 24h.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_client_no_answer_provider',
        name: 'SMS échec - client non réponse (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Le client n\'a pas répondu. Vous serez indemnisé selon nos conditions. Notre équipe vous contactera.',
        variables: [],
        isActive: true
    },
    {
        id: 'whatsapp_call_failure_system_error_client',
        name: 'WhatsApp échec - erreur système (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '⚠️ Problème technique\n\nUn problème technique a empêché l\'établissement de l\'appel.\n\n💰 Vous ne serez pas débité\n🔧 Notre équipe technique a été notifiée\n\n📞 Vous pouvez réessayer dans quelques minutes.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_system_error_client',
        name: 'SMS échec - erreur système (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Problème technique, appel impossible. Vous ne serez pas débité. Équipe technique notifiée. Réessayez plus tard.',
        variables: [],
        isActive: true
    },
    {
        id: 'whatsapp_call_failure_system_error_provider',
        name: 'WhatsApp échec - erreur système (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '⚠️ Problème technique\n\nUn problème technique a empêché l\'établissement de l\'appel avec le client.\n\n🔧 Notre équipe technique a été notifiée\n💰 Compensation selon nos conditions\n\nMerci pour votre compréhension.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_system_error_provider',
        name: 'SMS échec - erreur système (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Problème technique, appel impossible. Équipe notifiée. Compensation selon conditions. Merci compréhension.',
        variables: [],
        isActive: true
    },
    // ====== TEMPLATES SUCCÈS ======
    {
        id: 'whatsapp_call_success_client',
        name: 'WhatsApp succès (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '✅ Appel terminé avec succès !\n\n⏱️ Durée : {duration}min {seconds}s\n\nMerci d\'avoir utilisé SOS Expat !\n\n⭐ Laissez un avis sur votre expérience\n📧 Vous recevrez votre facture par email',
        variables: ['duration', 'seconds'],
        isActive: true
    },
    {
        id: 'sms_call_success_client',
        name: 'SMS succès (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel terminé ({duration}min {seconds}s). Merci ! Laissez un avis sur votre expérience. Facture par email.',
        variables: ['duration', 'seconds'],
        isActive: true
    },
    {
        id: 'whatsapp_call_success_provider',
        name: 'WhatsApp succès (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '✅ Consultation terminée avec succès !\n\n⏱️ Durée : {duration}min {seconds}s\n💰 Paiement traité sous 24h\n\nMerci pour votre excellent service !\n\n📊 Vos statistiques ont été mises à jour',
        variables: ['duration', 'seconds'],
        isActive: true
    },
    {
        id: 'sms_call_success_provider',
        name: 'SMS succès (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Consultation terminée ({duration}min {seconds}s). Paiement sous 24h. Merci pour votre service !',
        variables: ['duration', 'seconds'],
        isActive: true
    },
    // ====== TEMPLATES DEMANDES DE CONSULTATION ======
    {
        id: 'whatsapp_provider_booking_request',
        name: 'WhatsApp nouvelle demande (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '🔔 Nouvelle demande de consultation !\n\n👤 Client : {clientName}\n🌍 Pays : {clientCountry}\n🗣️ Langues : {clientLanguages}\n📋 Sujet : {requestTitle}\n\n💰 Montant : {amount}€\n\n📱 Consultez votre espace prestataire pour accepter ou refuser cette demande.',
        variables: ['clientName', 'clientCountry', 'clientLanguages', 'requestTitle', 'amount'],
        isActive: true
    },
    {
        id: 'sms_provider_booking_request',
        name: 'SMS nouvelle demande (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Nouvelle demande de {clientName} ({clientCountry}). Sujet: {requestTitle}. {amount}€. Consultez votre espace prestataire.',
        variables: ['clientName', 'clientCountry', 'requestTitle', 'amount'],
        isActive: true
    },
    // ====== TEMPLATES PAIEMENT ======
    {
        id: 'whatsapp_payment_issue_client',
        name: 'WhatsApp problème paiement (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '⚠️ Problème de paiement détecté\n\n{issueDescription}\n\n💳 Actions requises :\n• Vérifiez votre mode de paiement\n• Contactez votre banque si nécessaire\n• Notre équipe vous contactera sous 24h\n\n🔒 Vos données sont sécurisées',
        variables: ['issueDescription'],
        isActive: true
    },
    {
        id: 'sms_payment_issue_client',
        name: 'SMS problème paiement (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Problème paiement détecté. {issueDescription}. Vérifiez votre mode de paiement. Support: 24h.',
        variables: ['issueDescription'],
        isActive: true
    },
    {
        id: 'whatsapp_payment_issue_provider',
        name: 'WhatsApp problème paiement (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '💳 Information paiement\n\nUn problème de paiement est survenu avec le client.\n\n✅ Votre rémunération sera traitée manuellement par notre équipe finance\n⏱️ Délai de traitement : 24-48h\n\nMerci pour votre patience.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_payment_issue_provider',
        name: 'SMS problème paiement (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Problème paiement client. Votre rémunération sera traitée manuellement par équipe finance (24-48h).',
        variables: [],
        isActive: true
    },
    // ====== TEMPLATES CONFIRMATION APPEL ======
    {
        id: 'whatsapp_call_scheduled_client',
        name: 'WhatsApp appel programmé (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '📅 Votre appel est programmé !\n\n🕐 Dans 5 minutes\n👨‍💼 Expert : {providerName}\n📞 Restez proche de votre téléphone\n\n✅ Paiement confirmé : {amount}€\n⏱️ Durée prévue : {duration} minutes',
        variables: ['providerName', 'amount', 'duration'],
        isActive: true
    },
    {
        id: 'sms_call_scheduled_client',
        name: 'SMS appel programmé (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel avec {providerName} dans 5min. Restez disponible. Paiement confirmé: {amount}€.',
        variables: ['providerName', 'amount'],
        isActive: true
    },
    {
        id: 'whatsapp_call_scheduled_provider',
        name: 'WhatsApp appel programmé (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '📅 Appel client programmé !\n\n🕐 Dans 5 minutes\n👤 Client confirmé et payé\n📞 Préparez-vous à recevoir l\'appel\n\n💰 Rémunération : {providerAmount}€\n⏱️ Durée prévue : {duration} minutes',
        variables: ['providerAmount', 'duration'],
        isActive: true
    },
    {
        id: 'sms_call_scheduled_provider',
        name: 'SMS appel programmé (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel client dans 5min. Client payé. Préparez-vous. Rémunération: {providerAmount}€.',
        variables: ['providerAmount'],
        isActive: true
    },
    // ====== TEMPLATES DÉCONNEXION PRÉCOCE ======
    {
        id: 'whatsapp_early_disconnection_client',
        name: 'WhatsApp déconnexion précoce (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '⚠️ Appel terminé prématurément\n\n⏱️ Durée : {duration} secondes\n\n💰 Remboursement automatique en cours\n🔄 Vous pouvez relancer une consultation\n\n❓ Si c\'était involontaire, contactez notre support.',
        variables: ['duration'],
        isActive: true
    },
    {
        id: 'sms_early_disconnection_client',
        name: 'SMS déconnexion précoce (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel terminé prématurément ({duration}s). Remboursement automatique. Contactez support si involontaire.',
        variables: ['duration'],
        isActive: true
    },
    {
        id: 'whatsapp_early_disconnection_provider',
        name: 'WhatsApp déconnexion précoce (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '⚠️ Appel client terminé prématurément\n\n⏱️ Durée : {duration} secondes\n\n💰 Compensation minimale selon nos conditions\n📧 Notre équipe vous contactera si nécessaire\n\nMerci pour votre disponibilité.',
        variables: ['duration'],
        isActive: true
    },
    {
        id: 'sms_early_disconnection_provider',
        name: 'SMS déconnexion précoce (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel terminé prématurément ({duration}s). Compensation minimale selon conditions. Merci disponibilité.',
        variables: ['duration'],
        isActive: true
    },
    // ====== TEMPLATES RAPPELS ======
    {
        id: 'whatsapp_call_reminder_client',
        name: 'WhatsApp rappel appel (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '⏰ Rappel : Votre appel dans 2 minutes !\n\n👨‍💼 Expert : {providerName}\n📞 Assurez-vous d\'être disponible\n🔊 Vérifiez que votre téléphone n\'est pas en mode silencieux',
        variables: ['providerName'],
        isActive: true
    },
    {
        id: 'sms_call_reminder_client',
        name: 'SMS rappel appel (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: RAPPEL - Votre appel avec {providerName} dans 2min. Soyez disponible !',
        variables: ['providerName'],
        isActive: true
    },
    // ====== TEMPLATES ANNULATION ======
    {
        id: 'whatsapp_call_cancelled_client',
        name: 'WhatsApp appel annulé (client)',
        type: 'whatsapp',
        language: 'fr',
        content: '❌ Appel annulé\n\nRaison : {cancelReason}\n\n💰 Remboursement intégral automatique\n⏱️ Délai : 3-5 jours ouvrés\n\n🔄 Vous pouvez programmer un nouvel appel quand vous le souhaitez.',
        variables: ['cancelReason'],
        isActive: true
    },
    {
        id: 'sms_call_cancelled_client',
        name: 'SMS appel annulé (client)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel annulé. Raison: {cancelReason}. Remboursement intégral automatique (3-5j).',
        variables: ['cancelReason'],
        isActive: true
    },
    {
        id: 'whatsapp_call_cancelled_provider',
        name: 'WhatsApp appel annulé (prestataire)',
        type: 'whatsapp',
        language: 'fr',
        content: '❌ Appel client annulé\n\nRaison : {cancelReason}\n\n📊 Cela n\'affecte pas vos statistiques\n💰 Compensation selon nos conditions si applicable\n\nMerci pour votre compréhension.',
        variables: ['cancelReason'],
        isActive: true
    },
    {
        id: 'sms_call_cancelled_provider',
        name: 'SMS appel annulé (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: Appel annulé. Raison: {cancelReason}. Pas d\'impact statistiques. Compensation si applicable.',
        variables: ['cancelReason'],
        isActive: true
    }
];
exports.initializeMessageTemplates = (0, https_1.onCall)(CPU_OPTIMIZED_CONFIG, // 🔧 FIX CRITIQUE: SEULEMENT la configuration d'optimisation CPU
function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var db, created, updated, errors, batchSize, batches, i, _i, _a, _b, batchIndex, batchTemplates, batch, batchOperations, _c, batchTemplates_1, template, templateRef, existingDoc, templateData, existingData, shouldUpdate, templateError_1, summary, error_1;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 14, , 15]);
                // Vérifier que l'utilisateur est admin
                if (!request.auth) {
                    throw new Error('Utilisateur non authentifié');
                }
                // TODO: Ajouter vérification du rôle admin
                // const userDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
                // if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
                //   throw new Error('Accès refusé - Admin requis');
                // }
                console.log('🚀 Initialisation des templates de messages (optimisé CPU mais COMPLET)...');
                db = admin.firestore();
                created = 0;
                updated = 0;
                errors = 0;
                batchSize = 8;
                batches = [];
                for (i = 0; i < defaultTemplates.length; i += batchSize) {
                    batches.push(defaultTemplates.slice(i, i + batchSize));
                }
                console.log("\uD83D\uDCCA Traitement de ".concat(defaultTemplates.length, " templates en ").concat(batches.length, " lots"));
                _i = 0, _a = batches.entries();
                _d.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 12];
                _b = _a[_i], batchIndex = _b[0], batchTemplates = _b[1];
                batch = db.batch();
                batchOperations = 0;
                console.log("\uD83D\uDCE6 Traitement du lot ".concat(batchIndex + 1, "/").concat(batches.length, " (").concat(batchTemplates.length, " templates)"));
                _c = 0, batchTemplates_1 = batchTemplates;
                _d.label = 2;
            case 2:
                if (!(_c < batchTemplates_1.length)) return [3 /*break*/, 7];
                template = batchTemplates_1[_c];
                _d.label = 3;
            case 3:
                _d.trys.push([3, 5, , 6]);
                templateRef = db.collection('message_templates').doc(template.id);
                return [4 /*yield*/, templateRef.get()];
            case 4:
                existingDoc = _d.sent();
                templateData = __assign(__assign({}, template), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                if (existingDoc.exists) {
                    existingData = existingDoc.data();
                    shouldUpdate = !(existingData === null || existingData === void 0 ? void 0 : existingData.isCustomized);
                    if (shouldUpdate) {
                        batch.update(templateRef, {
                            name: template.name,
                            type: template.type,
                            language: template.language,
                            content: template.content, // Mettre à jour le contenu
                            variables: template.variables,
                            isActive: template.isActive,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        updated++;
                        batchOperations++;
                        console.log("\uD83D\uDCDD Template mis \u00E0 jour: ".concat(template.id));
                    }
                    else {
                        console.log("\u23ED\uFE0F Template personnalis\u00E9 ignor\u00E9: ".concat(template.id));
                    }
                }
                else {
                    // Création d'un nouveau template
                    batch.set(templateRef, __assign(__assign({}, templateData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), isCustomized: false // Marquer comme non personnalisé
                     }));
                    created++;
                    batchOperations++;
                    console.log("\u2705 Nouveau template cr\u00E9\u00E9: ".concat(template.id));
                }
                return [3 /*break*/, 6];
            case 5:
                templateError_1 = _d.sent();
                console.error("\u274C Erreur avec template ".concat(template.id, ":"), templateError_1);
                errors++;
                return [3 /*break*/, 6];
            case 6:
                _c++;
                return [3 /*break*/, 2];
            case 7:
                if (!(batchOperations > 0)) return [3 /*break*/, 9];
                return [4 /*yield*/, batch.commit()];
            case 8:
                _d.sent();
                console.log("\uD83C\uDF89 Lot ".concat(batchIndex + 1, " valid\u00E9: ").concat(batchOperations, " op\u00E9rations"));
                _d.label = 9;
            case 9:
                if (!(batchIndex < batches.length - 1)) return [3 /*break*/, 11];
                console.log('⏳ Pause entre lots pour optimiser CPU...');
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
            case 10:
                _d.sent(); // 200ms de pause
                _d.label = 11;
            case 11:
                _i++;
                return [3 /*break*/, 1];
            case 12: 
            // Créer les templates par défaut pour les langues supplémentaires (COMPLET)
            return [4 /*yield*/, createMultiLanguageTemplates(db)];
            case 13:
                // Créer les templates par défaut pour les langues supplémentaires (COMPLET)
                _d.sent();
                summary = {
                    success: true,
                    message: "Templates initialis\u00E9s avec succ\u00E8s (optimis\u00E9 CPU + COMPLET) !",
                    details: {
                        created: created,
                        updated: updated,
                        errors: errors,
                        total: defaultTemplates.length
                    }
                };
                console.log('✅ Initialisation terminée (optimisé mais complet):', summary);
                return [2 /*return*/, summary];
            case 14:
                error_1 = _d.sent();
                console.error('❌ Erreur lors de l\'initialisation des templates:', error_1);
                return [2 /*return*/, {
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : 'Erreur inconnue',
                        details: {
                            created: 0,
                            updated: 0,
                            errors: 1,
                            total: defaultTemplates.length
                        }
                    }];
            case 15: return [2 /*return*/];
        }
    });
}); });
/**
 * Créer des templates pour les langues supplémentaires (FONCTION COMPLÈTE GARDÉE)
 */
function createMultiLanguageTemplates(db) {
    return __awaiter(this, void 0, void 0, function () {
        var criticalTemplates, translations, multiLangBatchSize, multiLangCreated, _i, _a, _b, lang, langTranslations, templatesArray, langBatches, i, _c, _d, _e, batchIndex, batchTemplateIds, batch, batchOps, _loop_1, _f, batchTemplateIds_1, templateId, error_2;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 13, , 14]);
                    console.log('🌍 Création des templates multi-langues (version complète)...');
                    criticalTemplates = [
                        'voice_provider_welcome',
                        'voice_client_welcome',
                        'sms_call_success_client',
                        'sms_call_success_provider',
                        'sms_call_failure_provider_no_answer_client',
                        'sms_call_failure_client_no_answer_provider'
                    ];
                    translations = {
                        en: {
                            'voice_provider_welcome': 'Hello, you will be connected with your SOS Expat client. Please wait a moment.',
                            'voice_client_welcome': 'Hello, you will be connected with your SOS Expat expert. Please wait a moment.',
                            'sms_call_success_client': 'SOS Expat: Call completed ({duration}min {seconds}s). Thank you! Leave a review. Invoice by email.',
                            'sms_call_success_provider': 'SOS Expat: Consultation completed ({duration}min {seconds}s). Payment within 24h. Thank you!',
                            'sms_call_failure_provider_no_answer_client': 'SOS Expat: Provider did not answer. No charge. Automatic refund. Choose another expert.',
                            'sms_call_failure_client_no_answer_provider': 'SOS Expat: Client did not answer. You will be compensated. Our team will contact you.'
                        },
                        es: {
                            'voice_provider_welcome': 'Hola, será conectado con su cliente SOS Expat. Por favor espere un momento.',
                            'voice_client_welcome': 'Hola, será conectado con su experto SOS Expat. Por favor espere un momento.',
                            'sms_call_success_client': 'SOS Expat: Llamada completada ({duration}min {seconds}s). ¡Gracias! Deje su opinión. Factura por email.',
                            'sms_call_success_provider': 'SOS Expat: Consulta completada ({duration}min {seconds}s). Pago en 24h. ¡Gracias!',
                            'sms_call_failure_provider_no_answer_client': 'SOS Expat: Proveedor no respondió. Sin cargo. Reembolso automático. Elija otro experto.',
                            'sms_call_failure_client_no_answer_provider': 'SOS Expat: Cliente no respondió. Será compensado. Nuestro equipo lo contactará.'
                        }
                    };
                    multiLangBatchSize = 6;
                    multiLangCreated = 0;
                    _i = 0, _a = Object.entries(translations);
                    _g.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 12];
                    _b = _a[_i], lang = _b[0], langTranslations = _b[1];
                    console.log("\uD83C\uDF0D Traitement langue: ".concat(lang.toUpperCase()));
                    templatesArray = criticalTemplates.slice();
                    langBatches = [];
                    for (i = 0; i < templatesArray.length; i += multiLangBatchSize) {
                        langBatches.push(templatesArray.slice(i, i + multiLangBatchSize));
                    }
                    _c = 0, _d = langBatches.entries();
                    _g.label = 2;
                case 2:
                    if (!(_c < _d.length)) return [3 /*break*/, 11];
                    _e = _d[_c], batchIndex = _e[0], batchTemplateIds = _e[1];
                    batch = db.batch();
                    batchOps = 0;
                    _loop_1 = function (templateId) {
                        var translation, newId, templateRef, exists, originalTemplate;
                        return __generator(this, function (_h) {
                            switch (_h.label) {
                                case 0:
                                    translation = langTranslations[templateId];
                                    if (!translation) return [3 /*break*/, 2];
                                    newId = "".concat(templateId, "_").concat(lang);
                                    templateRef = db.collection('message_templates').doc(newId);
                                    return [4 /*yield*/, templateRef.get()];
                                case 1:
                                    exists = _h.sent();
                                    if (!exists.exists) {
                                        originalTemplate = defaultTemplates.find(function (t) { return t.id === templateId; });
                                        if (originalTemplate) {
                                            batch.set(templateRef, {
                                                id: newId,
                                                name: "".concat(originalTemplate.name, " (").concat(lang.toUpperCase(), ")"),
                                                type: originalTemplate.type,
                                                language: lang,
                                                content: translation,
                                                variables: originalTemplate.variables,
                                                isActive: true,
                                                isCustomized: false,
                                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                                updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                            });
                                            multiLangCreated++;
                                            batchOps++;
                                        }
                                    }
                                    _h.label = 2;
                                case 2: return [2 /*return*/];
                            }
                        });
                    };
                    _f = 0, batchTemplateIds_1 = batchTemplateIds;
                    _g.label = 3;
                case 3:
                    if (!(_f < batchTemplateIds_1.length)) return [3 /*break*/, 6];
                    templateId = batchTemplateIds_1[_f];
                    return [5 /*yield**/, _loop_1(templateId)];
                case 4:
                    _g.sent();
                    _g.label = 5;
                case 5:
                    _f++;
                    return [3 /*break*/, 3];
                case 6:
                    if (!(batchOps > 0)) return [3 /*break*/, 8];
                    return [4 /*yield*/, batch.commit()];
                case 7:
                    _g.sent();
                    console.log("  \uD83D\uDCE6 Lot ".concat(lang, "-").concat(batchIndex + 1, " valid\u00E9: ").concat(batchOps, " templates"));
                    _g.label = 8;
                case 8:
                    if (!(batchIndex < langBatches.length - 1)) return [3 /*break*/, 10];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                case 9:
                    _g.sent(); // 100ms
                    _g.label = 10;
                case 10:
                    _c++;
                    return [3 /*break*/, 2];
                case 11:
                    _i++;
                    return [3 /*break*/, 1];
                case 12:
                    if (multiLangCreated > 0) {
                        console.log("\uD83C\uDF0D ".concat(multiLangCreated, " templates multi-langues cr\u00E9\u00E9s au total"));
                    }
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _g.sent();
                    console.error('❌ Erreur création templates multi-langues:', error_2);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
