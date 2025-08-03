import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function logError(context: string, error: unknown) {
  let message = 'Erreur inconnue';
  let stack = '';

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack || '';
  } else {
    message = JSON.stringify(error);
  }

  await db.collection('error_logs').add({
    context,
    message,
    stack,
    createdAt: new Date()
  });
}
