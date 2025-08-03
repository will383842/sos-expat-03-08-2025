import { db } from '../firebaseEmails';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Enregistre un log d'email (succès ou erreur) dans Firestore.
 * Utilisé pour le suivi des envois dans l’interface d’administration.
 */
export const logEmail = async (data: {
  to: string;
  subject: string;
  status: 'success' | 'error';
  template?: string;
  error?: string;
}) => {
  await addDoc(collection(db, 'email_logs'), {
    ...data,
    timestamp: Timestamp.now(),
  });
};
