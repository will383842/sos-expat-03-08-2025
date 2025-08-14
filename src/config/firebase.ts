// src/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
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

// 🔁 Supporte HMR / multi-imports sans ré-initialiser
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Expose les services **depuis CETTE instance uniquement**
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

// -------------------------------
// Emulateurs (optionnels)
// -------------------------------
// ✅ Accepte "1" | "true" (minimise les désalignements .env)
const RAW = (import.meta.env.VITE_USE_EMULATORS ?? "").toString().toLowerCase();
const USE_EMULATORS = RAW === "1" || RAW === "true";

// Les connect* doivent se faire AVANT toute requête réseau
if (USE_EMULATORS && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch (e) {
    console.warn("ℹ️ Impossible de connecter un des émulateurs (peut-être déjà connectés)", e);
  }
}

// Logs de diagnostic (une seule fois au boot)
console.log("✅ Firebase prêt :", {
  projectId: app.options.projectId,
  authDomain: app.options.authDomain,
  usingEmulators: USE_EMULATORS,
});

// Petit helper debug
export const call = <T, R = unknown>(name: string) => httpsCallable<T, R>(functions, name);

export default app;
