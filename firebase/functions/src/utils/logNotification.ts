import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function logNotification(data: {
  to: string;
  channel: 'whatsapp' | 'sms' | 'voice';
  type: 'notify' | 'success' | 'failure';
  userId?: string;
  content: string;
  status: 'sent' | 'failed';
}) {
  await db.collection('notification_logs').add({
    ...data,
    createdAt: new Date()
  });
}
