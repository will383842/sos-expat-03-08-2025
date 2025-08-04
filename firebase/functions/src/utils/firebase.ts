import * as admin from 'firebase-admin';

// Initialiser Firebase Admin une seule fois
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const storage = admin.storage();
export const messaging = admin.messaging();
export const auth = admin.auth();

// Constantes utiles
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;