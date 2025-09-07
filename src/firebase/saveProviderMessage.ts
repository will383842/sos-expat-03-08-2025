import { db, auth } from "@/config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Interface pour typer les métadonnées transmises à l'enregistrement
export interface MessageMetadata {
  clientFirstName?: string | null;
  clientCountry?: string | null;
  providerPhone?: string | null;
  bookingId?: string | null;
  // autres propriétés libres si besoin :
  [key: string]: unknown;
}

// Interface du document stocké en base (utile si tu veux réutiliser le type ailleurs)
export interface ProviderMessageDoc {
  providerId: string;
  senderId: string | null;          // null si pas connecté (mais les règles exigent un user connecté)
  message: string;
  // champs "APLATIS" pour l'affichage rapide
  clientFirstName: string | null;
  clientCountry: string | null;
  providerPhone: string | null;
  bookingId: string | null;
  // bloc metadata brut (pour audit / évolutions)
  metadata: MessageMetadata;
  createdAt: ReturnType<typeof serverTimestamp>; // FieldValue de Firestore
  isRead: boolean;
}

export async function saveProviderMessage(
  providerId: string,
  message: string,
  metadata: MessageMetadata = {}
): Promise<void> {
  if (!providerId || typeof providerId !== "string") {
    throw new Error("providerId invalide");
  }
  if (!message || typeof message !== "string") {
    throw new Error("message invalide");
  }

  const uid = auth.currentUser?.uid ?? null;
  // Les règles exigent un user connecté (senderId == request.auth.uid)
  if (!uid) {
    throw new Error("Utilisateur non authentifié");
  }

  const ref = collection(db, "providerMessageOrderCustomers");

  const docData: ProviderMessageDoc = {
    providerId,
    senderId: uid,                         // <— important pour les règles et les filtres
    message,
    metadata,                              // objet complet pour audit/évolution
    clientFirstName: (metadata.clientFirstName ?? null) as string | null,
    clientCountry: (metadata.clientCountry ?? null) as string | null,
    providerPhone: (metadata.providerPhone ?? null) as string | null,
    bookingId: (metadata.bookingId ?? null) as string | null,
    createdAt: serverTimestamp(),          // <— au lieu de Timestamp.now()
    isRead: false,
  };

  await addDoc(ref, docData);
  // console.log("✅ Message prestataire enregistré avec succès");
}
