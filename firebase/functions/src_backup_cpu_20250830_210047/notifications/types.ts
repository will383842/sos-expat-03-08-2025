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
    languages?: string[];
  };
  metadata?: Record<string, unknown>;
}
