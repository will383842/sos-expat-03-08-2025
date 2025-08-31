import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

// Type pour définir la configuration de routing
export interface RoutingConfig {
  channels: ('email' | 'sms' | 'whatsapp' | 'push' | 'inapp')[];
  strategy?: 'all' | 'first_success' | 'fallback' | 'priority';
  order?: ('email' | 'sms' | 'whatsapp' | 'push' | 'inapp')[];
  rate_limit_h?: number;
  // Autres propriétés optionnelles
  priority?: Record<string, number>;
  delay_between_channels?: number;
  max_retries?: number;
}

export async function getRouting(eventId: string): Promise<RoutingConfig> {
  const conf = await db.collection('message_routing').doc('config').get();
  const routing = conf.data()?.routing ?? {};
  
  const eventRouting = routing[eventId];
  
  if (!eventRouting) {
    // Configuration par défaut
    return {
      channels: ['email'],
      strategy: 'all',
      rate_limit_h: 0
    };
  }
  
  return {
    channels: eventRouting.channels || ['email'],
    strategy: eventRouting.strategy || 'all',
    order: eventRouting.order || eventRouting.channels || ['email'],
    rate_limit_h: eventRouting.rate_limit_h || 0,
    // Propriétés optionnelles
    priority: eventRouting.priority,
    delay_between_channels: eventRouting.delay_between_channels,
    max_retries: eventRouting.max_retries
  };
}

export async function isRateLimited(uid: string, eventId: string, hours: number): Promise<boolean> {
  if (!hours || hours <= 0) return false;
  
  const since = Timestamp.fromMillis(Date.now() - hours * 3600 * 1000);
  const snap = await db.collection('message_deliveries')
    .where('uid', '==', uid)
    .where('eventId', '==', eventId)
    .where('createdAt', '>=', since)
    .where('status', 'in', ['queued', 'sent', 'delivered'])
    .limit(1)
    .get();
    
  return !snap.empty;
}