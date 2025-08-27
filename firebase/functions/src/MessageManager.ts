import * as admin from 'firebase-admin';
import { twilioClient, twilioPhoneNumber, getTwilioPhoneNumber, getTwilioWhatsAppNumber } from './lib/twilio'; // ✅ AJOUT des imports manquants
import { logError } from './utils/logs/logError';

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms' | 'voice';
  language: 'fr' | 'en' | 'es';
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export class MessageManager {
  private db = admin.firestore();
  private templateCache = new Map<string, MessageTemplate>();

  /**
   * Récupère un template depuis Firestore (avec cache)
   */
  async getTemplate(templateId: string): Promise<MessageTemplate | null> {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    try {
      const doc = await this.db.collection('message_templates').doc(templateId).get();
      
      if (!doc.exists) {
        console.warn(`Template non trouvé: ${templateId}`);
        return null;
      }

      const template = doc.data() as MessageTemplate;
      
      // Cache pour 10 minutes
      this.templateCache.set(templateId, template);
      setTimeout(() => this.templateCache.delete(templateId), 10 * 60 * 1000);
      
      return template;
    } catch (error) {
      await logError(`MessageManager:getTemplate:${templateId}`, error);
      return null;
    }
  }

  /**
   * Remplace les variables dans un template
   */
  private interpolateTemplate(content: string, variables: Record<string, string>): string {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  }

  /**
   * Envoie un WhatsApp avec template
   */
  async sendWhatsApp(params: {
    to: string;
    templateId: string;
    variables?: Record<string, string>;
    fallbackMessage?: string;
  }): Promise<boolean> {
    try {
      const template = await this.getTemplate(params.templateId);
      
      if (!template || !template.isActive) {
        if (params.fallbackMessage) {
          return await this.sendWhatsAppDirect(params.to, params.fallbackMessage);
        }
        throw new Error(`Template WhatsApp non disponible: ${params.templateId}`);
      }

      const message = this.interpolateTemplate(template.content, params.variables || {});
      return await this.sendWhatsAppDirect(params.to, message);

    } catch (error) {
      await logError('MessageManager:sendWhatsApp', error);
      
      // Fallback vers SMS si WhatsApp échoue
      if (params.fallbackMessage) {
        return await this.sendSMS({ 
          to: params.to, 
          templateId: params.templateId.replace('whatsapp_', 'sms_'),
          variables: params.variables,
          fallbackMessage: params.fallbackMessage 
        });
      }
      
      return false;
    }
  }

  /**
   * Envoie un SMS avec template
   */
  async sendSMS(params: {
    to: string;
    templateId: string;
    variables?: Record<string, string>;
    fallbackMessage?: string;
  }): Promise<boolean> {
    try {
      const template = await this.getTemplate(params.templateId);
      
      if (!template || !template.isActive) {
        if (params.fallbackMessage) {
          return await this.sendSMSDirect(params.to, params.fallbackMessage);
        }
        throw new Error(`Template SMS non disponible: ${params.templateId}`);
      }

      const message = this.interpolateTemplate(template.content, params.variables || {});
      return await this.sendSMSDirect(params.to, message);

    } catch (error) {
      await logError('MessageManager:sendSMS', error);
      return false;
    }
  }

  /**
   * Envoie un appel vocal avec template
   */
  async sendVoiceCall(params: {
    to: string;
    templateId: string;
    variables?: Record<string, string>;
    language?: string;
  }): Promise<boolean> {
    try {
      const template = await this.getTemplate(params.templateId);
      
      if (!template || !template.isActive) {
        throw new Error(`Template vocal non disponible: ${params.templateId}`);
      }

      const message = this.interpolateTemplate(template.content, params.variables || {});
      
      const twiml = `
        <Response>
          <Say voice="alice" language="${params.language || 'fr-FR'}">${message}</Say>
        </Response>
      `;

      await twilioClient.calls.create({
        to: params.to,
        from: twilioPhoneNumber,
        twiml: twiml,
        timeout: 30
      });

      return true;

    } catch (error) {
      await logError('MessageManager:sendVoiceCall', error);
      return false;
    }
  }

  /**
   * Envoie un appel de notification
   */
  async sendNotificationCall(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // ✅ CORRIGÉ : Utiliser la fonction Firebase Secrets
      const twilioPhone = getTwilioPhoneNumber();
      if (!twilioPhone) {
        throw new Error('Configuration Twilio manquante');
      }

      await twilioClient.calls.create({
        to: phoneNumber,
        from: twilioPhone, // ✅ CORRIGÉ : Firebase Secrets
        twiml: `<Response><Say voice="alice" language="fr-FR">${message}</Say></Response>`,
        timeout: 20
      });

      console.log(`✅ Appel de notification envoyé vers ${phoneNumber}`);
      return true;

    } catch (error) {
      console.warn(`❌ Échec notification call vers ${phoneNumber}:`, error);
      
      // Essayer SMS en fallback
      try {
        await this.sendSMSDirect(phoneNumber, message);
        console.log(`✅ SMS fallback envoyé vers ${phoneNumber}`);
        return true;
      } catch (smsError) {
        console.warn(`❌ Échec SMS fallback vers ${phoneNumber}:`, smsError);
        await logError('MessageManager:sendNotificationCall:fallback', smsError);
        return false;
      }
    }
  }

  /**
   * Méthodes privées pour envoi direct
   */
  private async sendWhatsAppDirect(to: string, message: string): Promise<boolean> {
    try {
      // ✅ CORRIGÉ : Utiliser la fonction Firebase Secrets
      const whatsappNumber = getTwilioWhatsAppNumber();
      if (!whatsappNumber) {
        throw new Error('Numéro WhatsApp Twilio non configuré');
      }

      await twilioClient.messages.create({
        body: message,
        from: whatsappNumber, // ✅ CORRIGÉ : Firebase Secrets (déjà formaté avec whatsapp:)
        to: `whatsapp:${to}`
      });
      return true;
    } catch (error) {
      await logError('MessageManager:sendWhatsAppDirect', error);
      return false;
    }
  }

  private async sendSMSDirect(to: string, message: string): Promise<boolean> {
    try {
      // ✅ CORRIGÉ : Utiliser la fonction Firebase Secrets
      const twilioPhone = getTwilioPhoneNumber();
      if (!twilioPhone) {
        throw new Error('Numéro SMS Twilio non configuré');
      }

      await twilioClient.messages.create({
        body: message,
        from: twilioPhone, // ✅ CORRIGÉ : Firebase Secrets
        to: to
      });
      return true;
    } catch (error) {
      await logError('MessageManager:sendSMSDirect', error);
      return false;
    }
  }

  /**
   * Méthode intelligente avec fallback automatique
   */
  async sendSmartMessage(params: {
    to: string;
    templateId: string;
    variables?: Record<string, string>;
    preferWhatsApp?: boolean;
  }): Promise<{ success: boolean; channel: 'whatsapp' | 'sms' | 'failed' }> {
    
    if (params.preferWhatsApp !== false) {
      // Essayer WhatsApp d'abord
      const whatsappSuccess = await this.sendWhatsApp({
        to: params.to,
        templateId: `whatsapp_${params.templateId}`,
        variables: params.variables
      });
      
      if (whatsappSuccess) {
        return { success: true, channel: 'whatsapp' };
      }
    }

    // Fallback vers SMS
    const smsSuccess = await this.sendSMS({
      to: params.to,
      templateId: `sms_${params.templateId}`,
      variables: params.variables
    });

    return { 
      success: smsSuccess, 
      channel: smsSuccess ? 'sms' : 'failed' 
    };
  }

  /**
   * Récupère un message TwiML pour les conférences
   */
  async getTwiMLMessage(templateId: string, variables?: Record<string, string>): Promise<string> {
    const template = await this.getTemplate(templateId);
    
    if (!template || !template.isActive) {
      // Messages de fallback selon le templateId
      const fallbacks: Record<string, string> = {
        'voice_provider_welcome': 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter.',
        'voice_client_welcome': 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter.'
      };
      
      return fallbacks[templateId] || 'Bonjour, mise en relation en cours.';
    }

    return this.interpolateTemplate(template.content, variables || {});
  }
}

// Instance singleton
export const messageManager = new MessageManager();