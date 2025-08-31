import * as admin from 'firebase-admin';

export type FirestoreTimestamp = admin.firestore.Timestamp;
export type FieldValue = admin.firestore.FieldValue;

// Interface de base pour tous les logs
export interface BaseLogEntry {
  timestamp: FieldValue;
  createdAt: Date;
  environment: string;
}

// Interface pour les enregistrements d'appels
export interface CallRecordData extends BaseLogEntry {
  callId: string;
  status: string;
  retryCount: number;
  additionalData?: Record<string, any>;
  duration?: number;
  errorMessage?: string;
}

// Interface pour les logs de notification
export interface NotificationLogData extends BaseLogEntry {
  to: string;
  channel: 'whatsapp' | 'sms' | 'voice' | 'email' | 'push';
  type: 'notify' | 'success' | 'failure' | 'info' | 'warning';
  userId?: string;
  content: string;
  status: 'sent' | 'failed' | 'pending' | 'delivered';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Interface pour les factures
export interface InvoiceRecord extends BaseLogEntry {
  invoiceNumber: string;
  type: 'platform' | 'provider';
  callId: string;
  clientId: string;
  providerId: string;
  amount: number;
  currency: string;
  downloadUrl: string;
  status: 'issued' | 'sent' | 'paid' | 'cancelled';
  sentToAdmin: boolean;
  locale?: string;
}
