// src/emails/services/campaignManager.ts

import { db } from '../firebaseEmails';
import { collection, getDocs } from 'firebase/firestore';
import { Campaign } from '../types/emailTypes'; // ✅ Chemin corrigé

/**
* Récupère toutes les campagnes d'emails stockées dans Firestore.
* Utilisé dans l'interface admin pour affichage ou sélection.
*/
export const getAllCampaigns = async (): Promise<Campaign[]> => {
 const snapshot = await getDocs(collection(db, 'email_campaigns'));
 return snapshot.docs.map(doc => ({
   ...(doc.data() as Campaign),
   id: doc.id, // ✅ L'id du document Firestore remplace celui du spread
 }));
};