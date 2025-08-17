// src/firebase/contactMessages.ts

import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; // ✅ Import depuis config/firebase

// ✅ Fonction manquante pour SendToContact.tsx
export const updateContactMessageStatus = async (
  messageId: string, 
  updates: { 
    status?: string; 
    processedAt?: Date; 
    notes?: string;
    isReplied?: boolean;
    replyStatus?: 'success' | 'error';
    replyError?: string | null;
    adminReply?: string;
    repliedAt?: any;
  }
) => {
  try {
    const messageRef = doc(db, 'contact_messages', messageId);
    await updateDoc(messageRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating contact message status:', error);
    throw error;
  }
};

// Fonction pour enregistrer la réponse à un message de contact
export const saveContactReply = async ({
  messageId,
  to,
  firstName,
  userMessage,
  adminReply,
  sentSuccessfully,
  errorMessage,
  extraData = {},
}: {
  messageId: string;
  to: string;
  firstName: string;
  userMessage: string;
  adminReply: string;
  sentSuccessfully: boolean;
  errorMessage?: string;
  extraData?: Record<string, any>;
}) => {
  try {
    // 🔄 Mise à jour du message d'origine (dans contact_messages)
    const messageRef = doc(db, 'contact_messages', messageId);
    await updateDoc(messageRef, {
      adminReply,
      repliedAt: serverTimestamp(),
      isReplied: true,
      replyStatus: sentSuccessfully ? 'success' : 'error',
      replyError: sentSuccessfully ? null : errorMessage || 'Erreur inconnue',
      ...extraData, // ✅ Ajout des champs supplémentaires dynamiques
    });

    // 🗃️ Journalisation dans email_logs
    const logRef = doc(db, 'email_logs', `${messageId}-reply`);
    await setDoc(logRef, {
      to,
      template: 'contactReply',
      sentAt: serverTimestamp(),
      status: sentSuccessfully ? 'success' : 'error',
      error: sentSuccessfully ? null : errorMessage || 'Erreur inconnue',
      message: userMessage,
      reply: adminReply,
      messageId,
      ...extraData,
    });
  } catch (err) {
    console.error('Erreur Firestore (saveContactReply)', err);
  }
};