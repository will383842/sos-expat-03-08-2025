import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { RoutingPerEvent } from './types';

const db = getFirestore();

export async function getRouting(eventId: string): Promise<RoutingPerEvent> {
  const conf = await db.collection('message_routing').doc('config').get();
  const routing = conf.data()?.routing ?? {};
  
  const eventRouting = routing[eventId];
  
  if (!eventRouting) {
    // Configuration par défaut
    return {
      strategy: 'parallel',
      channels: {
        email: { enabled: true, provider: 'zoho', rateLimitH: 0, retries: 1, delaySec: 0 },
        sms: { enabled: false, provider: 'twilio', rateLimitH: 0, retries: 1, delaySec: 0 },
        whatsapp: { enabled: false, provider: 'twilio', rateLimitH: 0, retries: 1, delaySec: 0 },
        push: { enabled: false, provider: 'fcm', rateLimitH: 0, retries: 1, delaySec: 0 },
        inapp: { enabled: false, provider: 'firestore', rateLimitH: 0, retries: 1, delaySec: 0 }
      }
    };
  }
  
  // ADAPTATEUR : Convertir l'ancien format vers le nouveau
  // Ancien format : { "channels": ["email", "sms"], "rate_limit_h": 0 }
  // Nouveau format : { "strategy": "parallel", "channels": { "email": { "enabled": true, ... } } }
  
  const oldChannels = eventRouting.channels || ["email"];
  const rateLimitH = eventRouting.rate_limit_h || 0;
  
  return {
    strategy: eventRouting.strategy || "parallel",
    order: eventRouting.order || oldChannels,
    channels: {
      email: {
        enabled: oldChannels.includes("email"),
        provider: "zoho",
        rateLimitH: rateLimitH,
        retries: 1,
        delaySec: 0
      },
      sms: {
        enabled: oldChannels.includes("sms"),
        provider: "twilio",
        rateLimitH: rateLimitH,
        retries: 1,
        delaySec: 0
      },
      whatsapp: {
        enabled: oldChannels.includes("whatsapp"),
        provider: "twilio",
        rateLimitH: rateLimitH,
        retries: 1,
        delaySec: 0
      },
      push: {
        enabled: oldChannels.includes("push"),
        provider: "fcm",
        rateLimitH: rateLimitH,
        retries: 1,
        delaySec: 0
      },
      inapp: {
        enabled: oldChannels.includes("inapp"),
        provider: "firestore",
        rateLimitH: rateLimitH,
        retries: 1,
        delaySec: 0
      }
    }
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