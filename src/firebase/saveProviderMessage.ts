import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

export async function saveProviderMessage(providerId: string, message: string, metadata: any = {}) {
  try {
    const db = getFirestore();
    const ref = collection(db, "providerMessageOrderCustomers");

    await addDoc(ref, {
      providerId,
      message,
      metadata, // (optionnel) on garde aussi l'objet complet si tu veux l'afficher dans le détail
      clientFirstName: metadata.clientFirstName || null,
      clientCountry: metadata.clientCountry || null,
      providerPhone: metadata.providerPhone || null,
      bookingId: metadata.bookingId || null,
      createdAt: Timestamp.now(),
      isRead: false,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du message :", error);
  }
}
