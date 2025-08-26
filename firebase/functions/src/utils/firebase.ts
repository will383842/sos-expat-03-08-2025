// firebase/functions/src/utils/firebase.ts
import * as admin from 'firebase-admin';

// Initialiser Firebase Admin une seule fois
if (!admin.apps.length) {
  admin.initializeApp();
}

// Firestore (⚠️ pas de db.settings() ici, ça sera appliqué dans index.ts)
export const db = admin.firestore();

// Autres services Firebase disponibles via Admin SDK
export const storage = admin.storage();
export const messaging = admin.messaging();
export const auth = admin.auth();

// Constantes utiles pour manipuler Firestore
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
