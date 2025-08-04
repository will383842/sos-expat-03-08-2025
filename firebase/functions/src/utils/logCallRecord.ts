import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Assurer que Firebase Admin est initialisé
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

export async function logCallRecord(data: {
  callId: string;
  status: string;
  retryCount: number;
}) {
  try {
    await db.collection('call_records').add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp() // Utiliser serverTimestamp au lieu de new Date()
    });
    console.log('Call record logged:', data);
  } catch (error) {
    console.error('Error logging call record:', error);
  }
}