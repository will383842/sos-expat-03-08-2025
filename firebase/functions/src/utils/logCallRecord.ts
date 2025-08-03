import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore();

export async function logCallRecord(data: {
  callId: string;
  status: string;
  retryCount: number;
}) {
  await db.collection('call_records').add({
    ...data,
    createdAt: new Date()
  });
}
