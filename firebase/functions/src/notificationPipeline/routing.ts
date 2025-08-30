import { getFirestore, Timestamp } from 'firebase-admin/firestore';
const db = getFirestore();

export async function getRouting(eventId: string) {
  const conf = await db.collection('message_routing').doc('config').get();
  const routing = conf.data()?.routing ?? {};
  return routing[eventId] ?? { channels: ['email'], rate_limit_h: 0 };
}

export async function isRateLimited(uid: string, eventId: string, hours: number) {
  if (!hours || hours <= 0) return false;
  const since = Timestamp.fromMillis(Date.now() - hours * 3600 * 1000);
  const snap = await db.collection('message_deliveries')
    .where('uid','==',uid)
    .where('eventId','==',eventId)
    .where('createdAt','>=',since)
    .where('status','in',['queued','sent','delivered'])
    .limit(1).get();
  return !snap.empty;
}
