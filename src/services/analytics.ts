import { db } from "../config/firebase";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const logLanguageMismatch = async ({
  clientLanguages,
  customLanguage,
  providerId,
  userId,
}: {
  clientLanguages: string[];
  customLanguage?: string;
  providerId: string;
  userId?: string;
}) => {
  try {
    await addDoc(collection(db, 'language_mismatch_logs'), {
      clientLanguages,
      customLanguage: customLanguage || null,
      providerId,
      userId: userId || null,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erreur journalisation mismatch langue :', error);
  }
};
