// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

// -------------------------------
// Configuration Firebase (env)
// -------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Garde-fou env
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Variables d'environnement Firebase manquantes");
  throw new Error("Configuration Firebase incomplète");
}

console.log("✅ Configuration Firebase chargée :", {
  apiKey: firebaseConfig.apiKey ? "***" : "MANQUANT",
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  authDomain: firebaseConfig.authDomain,
  VITE_USE_EMULATORS: import.meta.env.VITE_USE_EMULATORS ?? "(non défini)",
});

// -------------------------------
// Init App + Services
// -------------------------------
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Firestore avec cache offline multi-onglets
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Functions (us-central1 par défaut)
export const functions = getFunctions(app, "us-central1");

console.log("🔥 Firebase initialisé avec succès");

// -------------------------------
// Emulateurs (optionnels)
// -------------------------------
// Active si ET SEULEMENT SI VITE_USE_EMULATORS = "1"
const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === "1";

if (USE_EMULATORS && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("🔧 Émulateurs Firebase connectés (auth:9099, fs:8080, storage:9199, functions:5001)");
  } catch (e) {
    console.warn("ℹ️ Impossible de connecter un des émulateurs (peut-être déjà connectés)", e);
  }
}

// Petit helper debug
export const call = <T, R = unknown>(name: string) => httpsCallable<T, R>(functions, name);


export default app;
