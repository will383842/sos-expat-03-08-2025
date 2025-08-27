// src/config/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  serverTimestamp,
  setLogLevel,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";

/** ----------------------------------------
 *  Configuration Firebase (variables .env)
 * ---------------------------------------- */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Vérifications basiques d’env
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Variables d'environnement Firebase manquantes");
  throw new Error("Configuration Firebase incomplète");
}
if (!firebaseConfig.storageBucket) {
  console.error("❌ VITE_FIREBASE_STORAGE_BUCKET manquant");
  throw new Error("Storage bucket non configuré");
}

/** ----------------------------------------------------
 *  Initialisation app (HMR-safe) + services Firebase
 * ---------------------------------------------------- */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth / Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Firestore avec cache offline multi-onglets
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// 🔇 Réduire le bruit Firestore (logs seulement si erreur)
setLogLevel("error");

/** ----------------------------------------------------
 *  Cloud Functions — Région unifiée
 * ---------------------------------------------------- */
const RAW_REGION = (import.meta.env.VITE_FUNCTIONS_REGION ?? "europe-west1").toString();
const RAW_REGION_DEV = (import.meta.env.VITE_FUNCTIONS_REGION_DEV ?? "").toString();
const IS_DEV = !!import.meta.env.DEV;
const REGION = IS_DEV && RAW_REGION_DEV ? RAW_REGION_DEV : RAW_REGION;

// ✅ Instance Functions
export const functions = getFunctions(app, REGION);

/** ----------------------------------------
 *  Emulateurs (optionnels en local)
 * ---------------------------------------- */
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

if (USE_EMULATORS && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, `http://${EMU_HOST}:${PORT_AUTH}`, { disableWarnings: true });
  } catch {}
  try {
    connectFirestoreEmulator(db, EMU_HOST, PORT_FS);
  } catch {}
  try {
    connectFunctionsEmulator(functions, EMU_HOST, PORT_FUNC);
  } catch {}
  try {
    connectStorageEmulator(storage, EMU_HOST, PORT_STORAGE);
  } catch {}
}

/** ----------------------------------------
 *  Log unique de diagnostic (au boot)
 * ---------------------------------------- */
console.log("✅ Firebase initialisé :", {
  projectId: app.options.projectId,
  usingEmulators: USE_EMULATORS,
  functionsRegion: REGION,
});

/** ----------------------------------------
 *  Helper httpsCallable typé
 * ---------------------------------------- */
export const call = <T, R = unknown>(name: string) => httpsCallable<T, R>(functions, name);

// ✅ Expose aussi httpsCallable si besoin d'import direct
export { httpsCallable } from "firebase/functions";

// Exports utiles ponctuels
export { serverTimestamp };

export default app;
