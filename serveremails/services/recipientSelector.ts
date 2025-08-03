import { db } from '../firebaseEmails';
import {
  collection,
  query,
  where,
  getDocs,
  QueryConstraint,
} from 'firebase/firestore';

/**
 * Récupère une liste d'adresses email de destinataires
 * selon des critères (role, langue, pays).
 *
 * @param filters - Filtres facultatifs à appliquer
 * @returns Liste d'adresses email (string[])
 */
export const getRecipients = async ({
  role,
  language,
  country,
}: {
  role?: string;
  language?: string;
  country?: string;
}): Promise<string[]> => {
  const constraints: QueryConstraint[] = [];

  if (role) constraints.push(where('role', '==', role));
  if (language) constraints.push(where('languages', 'array-contains', language));
  if (country) constraints.push(where('country', '==', country));

  const q = query(collection(db, 'users'), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data().email);
};
