// src/services/notificationService.ts

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning' | 'sos';
  title: string;
  message: string;
  timestamp?: Date;
  read?: boolean;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface MultiChannelNotification {
  type: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  recipientCountry?: string;
  emailSubject?: string;
  emailHtml?: string;
  smsMessage?: string;
  whatsappMessage?: string;
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];
  
  // Cloud Functions references
  private sendNotificationFn = httpsCallable(functions, 'sendNotification');
  private sendPushNotificationFn = httpsCallable(functions, 'sendPushNotification');

  /**
   * Affiche une notification toast dans l'interface
   */
  showToast(notification: Omit<ToastNotification, 'id'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastNotification = {
      id,
      duration: 5000,
      autoClose: true,
      ...notification
    };

    // Émettre l'événement pour l'UI
    window.dispatchEvent(new CustomEvent('show-toast', { detail: toast }));
    
    return id;
  }

  /**
   * Ferme une notification toast
   */
  closeToast(id: string): void {
    window.dispatchEvent(new CustomEvent('close-toast', { detail: { id } }));
  }

  /**
   * Ajoute une notification système
   */
  addNotification(notification: Omit<NotificationData, 'timestamp'>): void {
    const newNotification: NotificationData = {
      ...notification,
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();
  }

  /**
   * Marque une notification comme lue
   */
  markAsRead(index: number): void {
    if (this.notifications[index]) {
      this.notifications[index].read = true;
      this.notifyListeners();
    }
  }

  /**
   * Supprime une notification
   */
  removeNotification(index: number): void {
    this.notifications.splice(index, 1);
    this.notifyListeners();
  }

  /**
   * Efface toutes les notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Récupère toutes les notifications
   */
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  /**
   * Compte les notifications non lues
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * S'abonne aux changements de notifications
   */
  subscribe(listener: (notifications: NotificationData[]) => void): () => void {
    this.listeners.push(listener);
    
    // Retourne une fonction de désabonnement
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Envoie une notification multi-canaux via Cloud Function
   */
  async sendMultiChannelNotification(data: MultiChannelNotification): Promise<boolean> {
    try {
      const result = await this.sendNotificationFn(data);
      const response = result.data as { success: boolean; results: any[] };
      
      if (response.success) {
        this.showToast({
          type: 'success',
          title: 'Notification envoyée',
          message: 'La notification a été envoyée avec succès'
        });
        return true;
      } else {
        this.showToast({
          type: 'error',
          title: 'Erreur d\'envoi',
          message: 'Échec de l\'envoi de la notification'
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur envoi notification:', error);
      this.showToast({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors de l\'envoi de la notification'
      });
      return false;
    }
  }

  /**
   * Envoie une notification push
   */
  async sendPushNotification(data: PushNotificationPayload): Promise<boolean> {
    try {
      const result = await this.sendPushNotificationFn(data);
      const response = result.data as { success: boolean; successCount: number; failureCount: number };
      
      if (response.success) {
        this.showToast({
          type: 'success',
          title: 'Push notification envoyée',
          message: `${response.successCount} notification(s) envoyée(s)`
        });
        return true;
      } else {
        this.showToast({
          type: 'warning',
          title: 'Push notification',
          message: 'Aucune notification push n\'a pu être envoyée'
        });
        return false;
      }
    } catch (error) {
      console.error('Erreur push notification:', error);
      this.showToast({
        type: 'error',
        title: 'Erreur Push',
        message: 'Erreur lors de l\'envoi de la notification push'
      });
      return false;
    }
  }

  /**
   * Notifications prédéfinies pour les événements SOS Expat
   */
  notifyNewSOS(clientName: string, location: string): void {
    this.addNotification({
      type: 'sos',
      title: '🚨 Nouveau SOS',
      message: `${clientName} a besoin d'aide à ${location}`,
      metadata: { clientName, location, priority: 'urgent' }
    });

    this.showToast({
      type: 'error',
      title: '🚨 Nouveau SOS',
      message: `${clientName} - ${location}`,
      duration: 10000
    });
  }

  notifyCallCompleted(clientName: string, providerName: string, duration: number): void {
    this.addNotification({
      type: 'success',
      title: '✅ Appel terminé',
      message: `Appel entre ${clientName} et ${providerName} (${Math.round(duration/60)}min)`,
      metadata: { clientName, providerName, duration }
    });
  }

  notifyPaymentReceived(amount: number, clientName: string): void {
    this.addNotification({
      type: 'success',
      title: '💰 Paiement reçu',
      message: `${amount}€ de ${clientName}`,
      metadata: { amount, clientName }
    });
  }

  notifySystemError(error: string, context?: string): void {
    this.addNotification({
      type: 'error',
      title: '⚠️ Erreur système',
      message: error,
      metadata: { context, timestamp: new Date().toISOString() }
    });

    this.showToast({
      type: 'error',
      title: 'Erreur système',
      message: error,
      duration: 8000
    });
  }

  /**
   * Notifie les listeners des changements
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  /**
   * Demande la permission pour les notifications navigateur
   */
  async requestBrowserNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Affiche une notification navigateur
   */
  showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/sos-expat-icon-192.png',
        badge: '/icons/sos-expat-badge-72.png',
        ...options
      });

      // Auto-fermeture après 5 secondes
      setTimeout(() => notification.close(), 5000);
    }
  }
}

// Instance singleton
export const notificationService = new NotificationService();

// Types d'événements pour l'interface
export type NotificationEventType = 
  | 'new-sos'
  | 'call-completed' 
  | 'payment-received'
  | 'system-error'
  | 'user-registered'
  | 'provider-online'
  | 'provider-offline';

// Helpers pour les notifications spécifiques à SOS Expat
export const sosNotifications = {
  newEmergency: (clientName: string, location: string, urgency: 'low' | 'medium' | 'high' | 'critical') => 
    notificationService.notifyNewSOS(clientName, location),
    
  callStarted: (clientName: string, providerName: string) =>
    notificationService.addNotification({
      type: 'info',
      title: '📞 Appel en cours',
      message: `${clientName} ↔ ${providerName}`
    }),
    
  paymentFailed: (clientName: string, amount: number, reason: string) =>
    notificationService.addNotification({
      type: 'error',
      title: '💳 Échec paiement',
      message: `${amount}€ - ${clientName}: ${reason}`
    }),
    
  newReview: (rating: number, clientName: string, providerName: string) =>
    notificationService.addNotification({
      type: 'info',
      title: '⭐ Nouvel avis',
      message: `${rating}/5 étoiles - ${clientName} → ${providerName}`
    })
};

export default notificationService;