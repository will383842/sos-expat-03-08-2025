// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Configuration Firebase depuis les variables d'environnement
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Vérification que les variables d'environnement sont bien chargées
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Variables d\'environnement Firebase manquantes');
  throw new Error('Configuration Firebase incomplète');
}

console.log('✅ Configuration Firebase chargée :', {
  apiKey: firebaseConfig.apiKey ? '***' : 'MANQUANT',
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  authDomain: firebaseConfig.authDomain
});

// Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

// Services Firebase exportés
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configuration de la persistance offline pour Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('⚠️ Plusieurs onglets ouverts, la persistance ne peut être activée que sur un seul onglet à la fois.');
  } else if (err.code === 'unimplemented') {
    console.warn('⚠️ Ce navigateur ne supporte pas la persistance offline.');
  } else {
    console.warn('⚠️ Erreur lors de l\'activation de la persistance:', err);
  }
});

console.log('🔥 Firebase initialisé avec succès');

export default app;