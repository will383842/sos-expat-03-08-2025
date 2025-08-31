import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore();

export async function getTemplate(locale: 'fr-FR'|'en', eventId: string) {
  const col = db.collection('message_templates').doc(locale);
  let doc = await col.collection('items').doc(eventId).get();
  if (!doc.exists && locale !== 'en') {
    doc = await db.collection('message_templates').doc('en').collection('items').doc(eventId).get();
  }
  if (!doc.exists) return null;
  const defaultsSnap = await col.collection('_meta').doc('defaults').get();
  return { ...doc.data(), defaults: defaultsSnap.data() ?? {} } as any;
}
