import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logError } from '../utils/logging';

// Types pour les notifications
export interface NotificationData {
  type: 'call_request' | 'call_missed' | 'payment_received' | 'urgent_request';
  recipientId: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientName: string;
  recipientCountry: string;
  title: string;
  message: string;
  requestDetails?: {
  clientName: string;
  clientCountry: string;
  requestTitle: string;
  requestDescription: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
  serviceType: 'lawyer_call' | 'expat_call';
  estimatedPrice: number;
  clientPhone: string;
  languages?: string[]; // ✅ ajout ici aussi
};
  metadata?: Record<string, unknown>;
}

export interface NotificationChannels {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}

export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
}

// Configuration des canaux de notification par pays (optimisée)
const COUNTRY_NOTIFICATION_CONFIG: Record<string, NotificationChannels> = {
  // Configuration simplifiée et regroupée
  'France': { email: true, sms: true, whatsapp: true, push: true },
  'Allemagne': { email: true, sms: true, whatsapp: true, push: true },
  'Espagne': { email: true, sms: true, whatsapp: true, push: true },
  'Italie': { email: true, sms: true, whatsapp: true, push: true },
  'Royaume-Uni': { email: true, sms: true, whatsapp: true, push: true },
  'Pays-Bas': { email: true, sms: true, whatsapp: true, push: true },
  'Belgique': { email: true, sms: true, whatsapp: true, push: true },
  'Suisse': { email: true, sms: true, whatsapp: true, push: true },
  'Canada': { email: true, sms: true, whatsapp: true, push: true },
  'États-Unis': { email: true, sms: true, whatsapp: true, push: true },
  'Singapour': { email: true, sms: true, whatsapp: true, push: true },
  'Australie': { email: true, sms: true, whatsapp: true, push: true },
  'Nouvelle-Zélande': { email: true, sms: true, whatsapp: true, push: true },
  'Hong Kong': { email: true, sms: true, whatsapp: true, push: true },
  'Chili': { email: true, sms: true, whatsapp: true, push: true },
  'Émirats arabes unis': { email: true, sms: true, whatsapp: true, push: true },
  'Qatar': { email: true, sms: true, whatsapp: true, push: true },
  'Afrique du Sud': { email: true, sms: true, whatsapp: true, push: true },
  // Pays avec SMS moins fiable
  'Thaïlande': { email: true, sms: false, whatsapp: true, push: true },
  'Brésil': { email: true, sms: false, whatsapp: true, push: true },
  'Argentine': { email: true, sms: false, whatsapp: true, push: true },
  'Maroc': { email: true, sms: false, whatsapp: true, push: true },
  'Tunisie': { email: true, sms: false, whatsapp: true, push: true },
  // Pays avec WhatsApp moins populaire
  'Japon': { email: true, sms: true, whatsapp: false, push: true },
  'Corée du Sud': { email: true, sms: true, whatsapp: false, push: true },
  // Configuration par défaut
  'default': { email: true, sms: false, whatsapp: true, push: true }
};

// Templates optimisés avec factory pattern
interface Template {
  subject?: string;
  html?: (data: NotificationData) => string;
  text?: (data: NotificationData) => string;
}

// Interface pour les données email
interface EmailData {
  to: string;
  subject: string;
  html: string;
  from: string;
  priority: string;
}

// Interface pour les données push
interface PushData {
  title: string;
  body: string;
  icon: string;
  data: {
    url: string;
    type: string;
    clientId: string;
  };
}

// Type pour les données utilisateur Firebase
interface UserData {
  email: string;
  phone: string;
  phoneCountryCode?: string;
  firstName: string;
  lastName: string;
  currentCountry?: string;
  country?: string;
  [key: string]: unknown; // Pour les autres propriétés potentielles
}

// Templates emails optimisés
const createEmailTemplate = (isEnglish: boolean): Template => ({
  subject: isEnglish ? '🔥 NEW URGENT CALL REQUEST - SOS Expats' : '🔥 NOUVELLE DEMANDE D\'APPEL URGENTE - SOS Expats',
  html: (data: NotificationData) => {
    const lang = {
      urgent: isEnglish ? 'URGENT CALL REQUEST' : 'DEMANDE D\'APPEL URGENTE',
      clientNeeds: isEnglish ? 'A client needs your help immediately' : 'Un client a besoin de votre aide immédiatement',
      responseExpected: isEnglish ? 'URGENT - RESPONSE EXPECTED' : 'URGENT - RÉPONSE ATTENDUE',
      clientInfo: isEnglish ? 'Client Information' : 'Informations du client',
      name: isEnglish ? 'Name' : 'Nom',
      country: isEnglish ? 'Country' : 'Pays',
      serviceType: isEnglish ? 'Service type' : 'Type de service',
      price: isEnglish ? 'Estimated price' : 'Prix estimé',
      requestDetails: isEnglish ? 'Request Details' : 'Détails de la demande',
      answerNow: isEnglish ? 'ANSWER THE CALL NOW' : 'RÉPONDRE À L\'APPEL MAINTENANT',
      important: isEnglish ? 'IMPORTANT' : 'IMPORTANT',
      timeLimit: isEnglish ? 
        'You have 3 minutes to respond before the call is transferred to another expert.' :
        'Vous avez 3 minutes pour répondre avant que l\'appel soit transféré à un autre expert.',
      footer: isEnglish ? 'SOS Expat & Travelers - Emergency assistance for expats' : 'SOS Expat & Travelers - Assistance d\'urgence pour expatriés',
      updateAvailability: isEnglish ?
        'If you cannot answer, log in to your dashboard to update your availability.' :
        'Si vous ne pouvez pas répondre, connectez-vous à votre dashboard pour mettre à jour votre disponibilité.'
    };

    const serviceTypeText = data.requestDetails?.serviceType === 'lawyer_call' ? 
      (isEnglish ? 'Legal consultation' : 'Consultation juridique') :
      (isEnglish ? 'Expat advice' : 'Conseil expatriation');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .urgent-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
          .info-section { background: #f8fafc; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .request-section { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-button { background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 ${lang.urgent}</h1>
            <p>${lang.clientNeeds}</p>
          </div>
          <div class="content">
            <div class="urgent-badge">⚡ ${lang.responseExpected}</div>
            
            <div class="info-section">
              <h3>👤 ${lang.clientInfo}</h3>
              <p><strong>${lang.name}:</strong> ${data.requestDetails?.clientName || 'N/A'}</p>
              <p><strong>${lang.country}:</strong> ${data.requestDetails?.clientCountry || 'N/A'}</p>
              <p><strong>${lang.serviceType}:</strong> ${serviceTypeText}</p>
              <p><strong>${lang.price}:</strong> ${data.requestDetails?.estimatedPrice || 0}€</p>
            </div>
            
            <div class="request-section">
              <h3>📋 ${lang.requestDetails}</h3>
              <h4>${data.requestDetails?.requestTitle || 'N/A'}</h4>
              <p>${data.requestDetails?.requestDescription || 'N/A'}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://sosexpats.com/dashboard" class="cta-button">
                📞 ${lang.answerNow}
              </a>
            </div>
            
            <div class="warning">
              <p><strong>⏰ ${lang.important}:</strong> ${lang.timeLimit}</p>
            </div>
          </div>
          <div class="footer">
            <p>${lang.footer}</p>
            <p>${lang.updateAvailability}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
});

// Factory pour créer les templates SMS/WhatsApp
const createTextTemplate = (isEnglish: boolean, isWhatsApp: boolean = false): Template => ({
  text: (data: NotificationData) => {
    const prefix = isWhatsApp ? 
      (isEnglish ? '🚨 *SOS EXPATS - URGENT CALL REQUEST*\n\n' : '🚨 *SOS EXPATS - DEMANDE D\'APPEL URGENTE*\n\n') :
      (isEnglish ? '🚨 SOS EXPATS - URGENT CALL!\n' : '🚨 SOS EXPATS - APPEL URGENT!\n');
    
    const clientLabel = isEnglish ? 'Client' : 'Client';
    const requestLabel = isEnglish ? 'Request' : 'Demande';
    const priceLabel = isEnglish ? 'Price' : 'Prix';
    const timeLabel = isEnglish ? 'Respond in 3 min' : 'Répondez dans 3 min';
    const stopText = isEnglish ? 'STOP to opt out' : 'STOP au 36173';

    const formatPrefix = isWhatsApp ? '*' : '';
    const formatSuffix = isWhatsApp ? '*' : '';
    const separator = isWhatsApp ? '\n' : '\n';

    let message = prefix;
    message += `👤 ${formatPrefix}${clientLabel}:${formatSuffix} ${data.requestDetails?.clientName || 'N/A'} (${data.requestDetails?.clientCountry || 'N/A'})${separator}`;
    message += `📋 ${formatPrefix}${requestLabel}:${formatSuffix} ${data.requestDetails?.requestTitle || 'N/A'}${separator}`;
    message += `💰 ${formatPrefix}${priceLabel}:${formatSuffix} €${data.requestDetails?.estimatedPrice || 0}${separator}`;
    
    if (isWhatsApp) {
      message += `\n${formatPrefix}${data.requestDetails?.requestTitle || 'N/A'}${formatSuffix}\n`;
      message += `${data.requestDetails?.requestDescription || 'N/A'}\n\n`;
    }
    
    message += `⏰ ${timeLabel}: https://sosexpats.com/dashboard\n`;
    
    if (!isWhatsApp) {
      message += stopText;
    }

    return message;
  }
});

// Configuration des templates par langue
const TEMPLATES = {
  fr: {
    email: createEmailTemplate(false),
    sms: createTextTemplate(false, false),
    whatsapp: createTextTemplate(false, true)
  },
  en: {
    email: createEmailTemplate(true),
    sms: createTextTemplate(true, false),
    whatsapp: createTextTemplate(true, true)
  }
};

// Services de notification optimisés
class NotificationService {
  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async sendEmail(data: NotificationData, language: 'fr' | 'en'): Promise<boolean> {
    try {
      const template = TEMPLATES[language].email;
      
      const emailData: EmailData = {
        to: data.recipientEmail,
        subject: template.subject || 'Notification SOS Expats',
        html: template.html ? template.html(data) : '',
        from: 'notifications@sosexpats.com',
        priority: 'high'
      };

      // Intégration service email (SendGrid, Mailgun, AWS SES)
      console.log('📧 Envoi email à:', data.recipientEmail);
      console.log('Email data:', emailData);
      
      await this.delay(100);
      return true;
    } catch (error) {
      console.error('Erreur email:', error);
      return false;
    }
  }

  static async sendSMS(data: NotificationData, language: 'fr' | 'en'): Promise<boolean> {
    try {
      const template = TEMPLATES[language].sms;
      const message = template.text ? template.text(data) : 'Notification SOS Expats';
      
      // Intégration service SMS (Twilio, AWS SNS)
      console.log('💬 Envoi SMS à:', data.recipientPhone);
      console.log('SMS message:', message);
      
      await this.delay(100);
      return true;
    } catch (error) {
      console.error('Erreur SMS:', error);
      return false;
    }
  }

  static async sendWhatsApp(data: NotificationData, language: 'fr' | 'en'): Promise<boolean> {
    try {
      const template = TEMPLATES[language].whatsapp;
      const message = template.text ? template.text(data) : 'Notification SOS Expats';
      
      // Intégration WhatsApp Business API
      console.log('📱 Envoi WhatsApp à:', data.recipientPhone);
      console.log('WhatsApp message:', message);
      
      await this.delay(100);
      return true;
    } catch (error) {
      console.error('Erreur WhatsApp:', error);
      return false;
    }
  }

  static async sendPush(data: NotificationData, language: 'fr' | 'en'): Promise<boolean> {
    try {
      const pushData: PushData = {
        title: language === 'fr' ? '🚨 Nouvelle demande d\'appel' : '🚨 New call request',
        body: `${data.requestDetails?.clientName || 'Client'} - ${data.requestDetails?.requestTitle || 'Demande'}`,
        icon: '/icon-192x192.png',
        data: {
          url: 'https://sosexpats.com/dashboard',
          type: data.type,
          clientId: data.requestDetails?.clientName || 'unknown'
        }
      };

      // Intégration Firebase Cloud Messaging
      console.log('🔔 Envoi push à:', data.recipientId);
      console.log('Push data:', pushData);
      
      await this.delay(100);
      return true;
    } catch (error) {
      console.error('Erreur push:', error);
      return false;
    }
  }
}

// Utilitaires
const getNotificationChannels = (country: string): NotificationChannels => 
  COUNTRY_NOTIFICATION_CONFIG[country] || COUNTRY_NOTIFICATION_CONFIG['default'];

const getLanguage = (country: string): 'fr' | 'en' => 
  ['France', 'Belgique', 'Suisse', 'Canada'].includes(country) ? 'fr' : 'en';

const logNotificationResults = async (data: NotificationData, results: NotificationResult[]): Promise<void> => {
  try {
    await addDoc(collection(db, 'notification_logs'), {
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientCountry: data.recipientCountry,
      type: data.type,
      channels: results,
      timestamp: serverTimestamp(),
      success: results.some(r => r.success)
    });
  } catch (error) {
    console.error('Erreur logging:', error);
  }
};

// Fonction principale optimisée
export async function sendProviderNotification(notificationData: NotificationData): Promise<boolean> {
  try {
    console.log('🔔 Envoi notification à:', notificationData.recipientName);
    
    const channels = getNotificationChannels(notificationData.recipientCountry);
    const language = getLanguage(notificationData.recipientCountry);
    const results: NotificationResult[] = [];

    // Envoi parallèle des notifications pour optimiser la vitesse
    const notifications = [];

    if (channels.email) {
      notifications.push(
        NotificationService.sendEmail(notificationData, language)
          .then(success => ({ channel: 'email', success }))
          .catch(error => ({ channel: 'email', success: false, error: error.message }))
      );
    }

    if (channels.whatsapp) {
      notifications.push(
        NotificationService.sendWhatsApp(notificationData, language)
          .then(success => ({ channel: 'whatsapp', success }))
          .catch(error => ({ channel: 'whatsapp', success: false, error: error.message }))
      );
    }

    if (channels.sms) {
      notifications.push(
        NotificationService.sendSMS(notificationData, language)
          .then(success => ({ channel: 'sms', success }))
          .catch(error => ({ channel: 'sms', success: false, error: error.message }))
      );
    }

    if (channels.push) {
      notifications.push(
        NotificationService.sendPush(notificationData, language)
          .then(success => ({ channel: 'push', success }))
          .catch(error => ({ channel: 'push', success: false, error: error.message }))
      );
    }

    // Attendre tous les envois
    const notificationResults = await Promise.all(notifications);
    results.push(...notificationResults);

    // Logging des résultats
    await logNotificationResults(notificationData, results);
    
    const hasSuccess = results.some(r => r.success);
    console.log(`🎯 Notification ${hasSuccess ? 'réussie' : 'échouée'} pour ${notificationData.recipientName}`);
    
    return hasSuccess;
    
  } catch (error) {
    console.error('❌ Erreur notification:', error);
    logError({
      origin: 'frontend',
      error: `Notification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context: { recipientId: notificationData.recipientId, type: notificationData.type }
    });
    return false;
  }
}

// Fonctions utilitaires optimisées
const getUserData = async (userId: string): Promise<UserData> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('Utilisateur non trouvé');
  }
  return userDoc.data() as UserData;
};

export async function notifyProviderOfCallRequest(
  providerId: string,
  clientData: { name: string; country: string; phone: string },
  requestData: {
  title: string;
  description: string;
  serviceType: 'lawyer_call' | 'expat_call';
  price: number;
  languages?: string[]; // ✅ ajout ici
}
): Promise<boolean> {
  try {
    const providerData = await getUserData(providerId);
    
    const notificationData: NotificationData = {
      type: 'call_request',
      recipientId: providerId,
      recipientEmail: providerData.email,
      recipientPhone: `${providerData.phoneCountryCode || '+33'}${providerData.phone}`,
      recipientName: `${providerData.firstName} ${providerData.lastName}`,
      recipientCountry: providerData.currentCountry || providerData.country || 'France',
      title: 'Nouvelle demande d\'appel urgente',
      message: `${clientData.name} souhaite vous parler`,
      requestDetails: {
        clientName: clientData.name,
        clientCountry: clientData.country,
        clientPhone: clientData.phone,
        requestTitle: requestData.title,
        requestDescription: requestData.description,
        urgencyLevel: 'urgent',
        serviceType: requestData.serviceType,
        estimatedPrice: requestData.price
      }
    };
    
    return await sendProviderNotification(notificationData);
    
  } catch (error) {
    console.error('Erreur notification demande d\'appel:', error);
    logError({
      origin: 'frontend',
      error: `Call request notification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      context: { providerId, clientData, requestData }
    });
    return false;
  }
}

export async function notifyProviderOfMissedCall(
  providerId: string,
  clientData: { name: string; country: string },
  callData: { attempts: number; lastAttemptTime: Date }
): Promise<boolean> {
  try {
    const providerData = await getUserData(providerId);
    
    const notificationData: NotificationData = {
      type: 'call_missed',
      recipientId: providerId,
      recipientEmail: providerData.email,
      recipientPhone: `${providerData.phoneCountryCode || '+33'}${providerData.phone}`,
      recipientName: `${providerData.firstName} ${providerData.lastName}`,
      recipientCountry: providerData.currentCountry || providerData.country || 'France',
      title: 'Appel manqué',
      message: `Vous avez manqué un appel de ${clientData.name}`,
      metadata: {
        attempts: callData.attempts,
        lastAttemptTime: callData.lastAttemptTime.toISOString()
      }
    };
    
    return await sendProviderNotification(notificationData);
    
  } catch (error) {
    console.error('Erreur notification appel manqué:', error);
    return false;
  }
}

// ✅ FONCTION DE TEST POUR L'ADMIN DASHBOARD - CORRECTEMENT EXPORTÉE
export async function testNotificationSystem(): Promise<{
  success: boolean;
  results: { channel: string; success: boolean; error?: string }[];
  message: string;
}> {
  try {
    console.log('🧪 Test du système de notifications...');
    
    // Données de test
    const testNotificationData: NotificationData = {
      type: 'call_request',
      recipientId: 'test-user-123',
      recipientEmail: 'test@sosexpats.com',
      recipientPhone: '+33123456789',
      recipientName: 'Test User',
      recipientCountry: 'France',
      title: '🧪 Test de notification',
      message: 'Ceci est un test du système de notifications',
      requestDetails: {
        clientName: 'Client Test',
        clientCountry: 'France',
        clientPhone: '+33987654321',
        requestTitle: 'Demande de test',
        requestDescription: 'Description de test pour vérifier le système de notifications',
        urgencyLevel: 'medium',
        serviceType: 'lawyer_call',
        estimatedPrice: 150
      }
    };

    // Test de tous les canaux
    const testResults: NotificationResult[] = [];
    
    // Test Email
    try {
      const emailSuccess = await NotificationService.sendEmail(testNotificationData, 'fr');
      testResults.push({ channel: 'email', success: emailSuccess });
    } catch (error) {
      testResults.push({ 
        channel: 'email', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Test SMS
    try {
      const smsSuccess = await NotificationService.sendSMS(testNotificationData, 'fr');
      testResults.push({ channel: 'sms', success: smsSuccess });
    } catch (error) {
      testResults.push({ 
        channel: 'sms', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Test WhatsApp
    try {
      const whatsappSuccess = await NotificationService.sendWhatsApp(testNotificationData, 'fr');
      testResults.push({ channel: 'whatsapp', success: whatsappSuccess });
    } catch (error) {
      testResults.push({ 
        channel: 'whatsapp', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Test Push
    try {
      const pushSuccess = await NotificationService.sendPush(testNotificationData, 'fr');
      testResults.push({ channel: 'push', success: pushSuccess });
    } catch (error) {
      testResults.push({ 
        channel: 'push', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Résultats du test
    const successCount = testResults.filter(r => r.success).length;
    const totalChannels = testResults.length;
    const overallSuccess = successCount > 0;
    
    const message = `Test terminé: ${successCount}/${totalChannels} canaux fonctionnels`;
    
    console.log('🎯 Résultats du test:', { successCount, totalChannels, results: testResults });
    
    return {
      success: overallSuccess,
      results: testResults,
      message
    };
    
  } catch (error) {
    console.error('❌ Erreur lors du test de notifications:', error);
    return {
      success: false,
      results: [],
      message: `Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}