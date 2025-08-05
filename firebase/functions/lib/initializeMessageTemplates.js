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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMessageTemplates = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const defaultTemplates = [
    // WhatsApp Templates
    {
        id: 'whatsapp_provider_notification',
        name: 'Notification WhatsApp Prestataire',
        type: 'whatsapp',
        language: 'fr',
        content: '🔔 SOS Expat : Un client va vous appeler dans 5 minutes.\nTitre : {requestTitle}\nLangue : {language}',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    {
        id: 'whatsapp_client_notification',
        name: 'Notification WhatsApp Client',
        type: 'whatsapp',
        language: 'fr',
        content: '✅ Votre appel avec un expert SOS Expat est prévu dans quelques minutes.\nSujet : {requestTitle}\nLangue : {language}',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    // SMS Templates
    {
        id: 'sms_provider_notification',
        name: 'Notification SMS Prestataire',
        type: 'sms',
        language: 'fr',
        content: 'SOS Expat: un client va vous appeler dans 5min. Titre: {requestTitle}. Langue: {language}',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    {
        id: 'sms_client_notification',
        name: 'Notification SMS Client',
        type: 'sms',
        language: 'fr',
        content: 'Votre appel SOS Expat est prévu dans quelques minutes. Sujet : {requestTitle}. Langue : {language}.',
        variables: ['requestTitle', 'language'],
        isActive: true
    },
    // Voice Templates
    {
        id: 'voice_provider_welcome',
        name: 'Message vocal accueil prestataire',
        type: 'voice',
        language: 'fr',
        content: 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter.',
        variables: [],
        isActive: true
    },
    {
        id: 'voice_client_welcome',
        name: 'Message vocal accueil client',
        type: 'voice',
        language: 'fr',
        content: 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.',
        variables: [],
        isActive: true
    },
    // Call Failure Templates
    {
        id: 'sms_call_failure_provider_no_answer_client',
        name: 'SMS échec - prestataire non réponse (client)',
        type: 'sms',
        language: 'fr',
        content: 'Le prestataire n\'a pas répondu à nos appels. Vous ne serez pas débité. Nous vous remboursons automatiquement.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_client_no_answer_provider',
        name: 'SMS échec - client non réponse (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'Le client n\'a pas répondu à nos appels. L\'appel est annulé. Vous serez payé pour votre disponibilité selon nos conditions.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_system_error_client',
        name: 'SMS échec - erreur système (client)',
        type: 'sms',
        language: 'fr',
        content: 'Un problème technique a empêché l\'établissement de l\'appel. Vous ne serez pas débité. Notre équipe technique a été notifiée.',
        variables: [],
        isActive: true
    },
    {
        id: 'sms_call_failure_system_error_provider',
        name: 'SMS échec - erreur système (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'Un problème technique a empêché l\'établissement de l\'appel. Notre équipe technique a été notifiée. Merci pour votre compréhension.',
        variables: [],
        isActive: true
    },
    // Success Templates
    {
        id: 'sms_call_success_client',
        name: 'SMS succès (client)',
        type: 'sms',
        language: 'fr',
        content: 'Votre appel SOS Expat est terminé ({duration}min {seconds}s). Merci ! Vous pouvez laisser un avis sur votre expérience.',
        variables: ['duration', 'seconds'],
        isActive: true
    },
    {
        id: 'sms_call_success_provider',
        name: 'SMS succès (prestataire)',
        type: 'sms',
        language: 'fr',
        content: 'Appel client terminé avec succès ({duration}min {seconds}s). Merci pour votre service ! Le paiement sera traité sous 24h.',
        variables: ['duration', 'seconds'],
        isActive: true
    }
];
exports.initializeMessageTemplates = (0, https_1.onCall)(async (request) => {
    // Vérifier que l'utilisateur est admin
    if (!request.auth) {
        throw new Error('Utilisateur non authentifié');
    }
    // TODO: Ajouter vérification du rôle admin
    // const userDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    // if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    //   throw new Error('Accès refusé');
    // }
    try {
        const db = admin.firestore();
        const batch = db.batch();
        let created = 0;
        let updated = 0;
        for (const template of defaultTemplates) {
            const templateRef = db.collection('message_templates').doc(template.id);
            const existingDoc = await templateRef.get();
            const templateData = Object.assign(Object.assign({}, template), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            if (existingDoc.exists) {
                // Mise à jour du template existant (garde le contenu actuel si modifié)
                batch.update(templateRef, {
                    name: template.name,
                    type: template.type,
                    language: template.language,
                    variables: template.variables,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updated++;
            }
            else {
                // Création d'un nouveau template
                batch.set(templateRef, Object.assign(Object.assign({}, templateData), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
                created++;
            }
        }
        await batch.commit();
        return {
            success: true,
            message: `Templates initialisés: ${created} créés, ${updated} mis à jour`,
            created,
            updated
        };
    }
    catch (error) {
        console.error('Erreur initialisation templates:', error);
        throw new Error(`Erreur lors de l'initialisation: ${error}`);
    }
});
//# sourceMappingURL=initializeMessageTemplates.js.map