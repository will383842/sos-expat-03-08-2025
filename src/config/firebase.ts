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

/**
 * ----------------------------------------
 * Configuration Firebase (variables .env)
 * ----------------------------------------
 */
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
  console.error("Variables présentes:", Object.keys(firebaseConfig));
  throw new Error("Configuration Firebase incomplète");
}

// Vérification spéciale pour Storage
if (!firebaseConfig.storageBucket) {
  console.error("❌ VITE_FIREBASE_STORAGE_BUCKET manquant");
  throw new Error("Storage bucket non configuré");
}

/**
 * ----------------------------------------------------
 * Initialisation app (HMR-safe) + services Firebase
 * ----------------------------------------------------
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth / Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Firestore avec cache offline multi-onglets (plus robuste que getFirestore)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

/**
 * ----------------------------------------------------
 * Cloud Functions — Région unifiée
 * ----------------------------------------------------
 * On aligne la région utilisée par le front sur celle du backend.
 * Par défaut on utilise europe-west1, mais on peut surcharger via .env :
 *   VITE_FUNCTIONS_REGION=europe-west1
 *   (optionnel) VITE_FUNCTIONS_REGION_DEV pour forcer une région différente en dev
 */
const RAW_REGION = (import.meta.env.VITE_FUNCTIONS_REGION ?? "europe-west1").toString();
const RAW_REGION_DEV = (import.meta.env.VITE_FUNCTIONS_REGION_DEV ?? "").toString();
const IS_DEV = !!import.meta.env.DEV;
const REGION = (IS_DEV && RAW_REGION_DEV) ? RAW_REGION_DEV : RAW_REGION;

// Instance Functions (doit être créée AVANT tout connect*)
export const functions = getFunctions(app, REGION);

/**
 * ----------------------------------------
 * Emulateurs (optionnels en local)
 * ----------------------------------------
 * On accepte "1" | "true" | "yes" pour activer.
 * Hôte et ports surchargés via .env si besoin.
 */
const parseBool = (v: unknown): boolean => {
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
};

const USE_EMULATORS = parseBool(import.meta.env.VITE_USE_EMULATORS ?? "");
const EMU_HOST = (import.meta.env.VITE_EMULATOR_HOST ?? "127.0.0.1").toString();
const PORT_AUTH = Number(import.meta.env.VITE_EMULATOR_PORT_AUTH ?? 9099);
const PORT_FS = Number(import.meta.env.VITE_EMULATOR_PORT_FIRESTORE ?? 8080);
const PORT_FUNC = Number(import.meta.env.VITE_EMULATOR_PORT_FUNCTIONS ?? 5001);
const PORT_STORAGE = Number(import.meta.env.VITE_EMULATOR_PORT_STORAGE ?? 9199);

// IMPORTANT : Les connect* doivent se faire AVANT tout appel réseau réel
if (USE_EMULATORS && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, `http://${EMU_HOST}:${PORT_AUTH}`, { disableWarnings: true });
  } catch (e) {
    console.warn("ℹ️ Auth emulator déjà connecté ou indisponible", e);
  }
  try {
    connectFirestoreEmulator(db, EMU_HOST, PORT_FS);
  } catch (e) {
    console.warn("ℹ️ Firestore emulator déjà connecté ou indisponible", e);
  }
  try {
    connectFunctionsEmulator(functions, EMU_HOST, PORT_FUNC);
  } catch (e) {
    console.warn("ℹ️ Functions emulator déjà connecté ou indisponible", e);
  }
  try {
    connectStorageEmulator(storage, EMU_HOST, PORT_STORAGE);
  } catch (e) {
    console.warn("ℹ️ Storage emulator déjà connecté ou indisponible", e);
  }
}

/**
 * ----------------------------------------
 * Logs de diagnostic (une seule fois au boot)
 * ----------------------------------------
 */
// eslint-disable-next-line no-console
console.log("✅ Firebase prêt :", {
  projectId: app.options.projectId,
  authDomain: app.options.authDomain,
  storageBucket: app.options.storageBucket,
  usingEmulators: USE_EMULATORS,
  functionsRegion: REGION,
});

/**
 * ----------------------------------------
 * Petit helper httpsCallable typé
 * ----------------------------------------
 */
export const call = <T, R = unknown>(name: string) => httpsCallable<T, R>(functions, name);

// ✅ AJOUTEZ CETTE LIGNE POUR RÉSOUDRE LES ERREURS D'IMPORT
export { httpsCallable } from 'firebase/functions';

export default app;