// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuration Firebase depuis .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('✅ Clés Firebase chargées :', {
  apiKey: firebaseConfig.apiKey,
  storageBucket: firebaseConfig.storageBucket,
  projectId: firebaseConfig.projectId,
});

// Initialisation Firebase
const app = initializeApp(firebaseConfig);

// Services Firebase exportés
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ ne pas mettre d'URL manuelle

// Persistance offline Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('This browser does not support offline persistence.');
  }
});

console.log('🔥 Firebase initialized with configuration from environment variables');
