import * as admin from "firebase-admin";

// Initialise une seule fois (local + prod)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const messaging = admin.messaging();
export const storage = admin.storage();

/** Compat: plusieurs utilitaires importent FieldValue */
export const FieldValue = admin.firestore.FieldValue;
