import { db } from "@/config/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

// Interface pour typer les métadonnées
interface MessageMetadata {
  clientFirstName?: string | null;
  clientCountry?: string | null;
  providerPhone?: string | null;
  bookingId?: string | null;
  [key: string]: unknown; // Pour permettre d'autres propriétés supplémentaires
}

export async function saveProviderMessage(
  providerId: string,
  message: string,
  metadata: MessageMetadata = {}
): Promise<void> {
  try {
    const ref = collection(db, "providerMessageOrderCustomers");

    await addDoc(ref, {
      providerId,
      message,
      metadata, // Objet complet pour affichage détaillé
      clientFirstName: metadata.clientFirstName || null,
      clientCountry: metadata.clientCountry || null,
      providerPhone: metadata.providerPhone || null,
      bookingId: metadata.bookingId || null,
      createdAt: Timestamp.now(),
      isRead: false,
    });

    console.log("✅ Message prestataire enregistré avec succès");
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement du message :", error);
    throw error; // Re-throw pour gestion en amont
  }
}
