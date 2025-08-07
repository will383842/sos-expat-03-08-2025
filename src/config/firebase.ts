// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
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
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
export { db };

// Configuration de la persistance offline pour Firestore
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(), // support multi-onglet
  }),
});


console.log('🔥 Firebase initialisé avec succès');

export default app;