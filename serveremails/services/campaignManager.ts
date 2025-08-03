// src/emails/services/campaignManager.ts

import { db } from '../firebaseEmails';
import { collection, getDocs } from 'firebase/firestore';
import { Campaign } from '../../types/emailTypes'; // ✅ Chemin corrigé

/**
 * Récupère toutes les campagnes d'emails stockées dans Firestore.
 * Utilisé dans l'interface admin pour affichage ou sélection.
 */
export const getAllCampaigns = async (): Promise<Campaign[]> => {
  const snapshot = await getDocs(collection(db, 'email_campaigns'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Campaign),
  }));
};
