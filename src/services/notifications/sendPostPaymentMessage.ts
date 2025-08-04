import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase"; // ou ton chemin correct
import { sendWhatsAppViaFirebase } from "./sendWhatsAppViaFirebase";

interface MessagePayload {
  clientFirstName: string;
  clientNationality: string;
  requestedCountry: string;
  requestTitle: string;
  requestDescription: string;
  selectedLanguage: string;
  providerId: string;
  callId: string;
}

/**
 * Envoie automatiquement un message complet après paiement réussi.
 */
export async function sendPostPaymentMessage(payload: MessagePayload) {
  const {
    clientFirstName,
    clientNationality,
    requestedCountry,
    requestTitle,
    requestDescription,
    selectedLanguage,
    providerId,
    callId,
  } = payload;

  try {
    // 🔹 1. Récupérer infos prestataire
    const providerRef = doc(db, "sos_profiles", providerId);
    const providerSnap = await getDoc(providerRef);

    if (!providerSnap.exists()) {
      console.error("Prestataire introuvable après paiement.");
      return;
    }

    const providerData = providerSnap.data();
    const providerPhone = providerData.phoneNumber || providerData.whatsappNumber || "";

    // 🔹 2. Composer le message
    const message = `🆕 Nouvelle demande après paiement :
👤 Prénom client : ${clientFirstName}
🌍 Nationalité : ${clientNationality}
📌 Pays demandé : ${requestedCountry}
📝 Titre : ${requestTitle}
📄 Détail : ${requestDescription}
🗣️ Langue choisie : ${selectedLanguage}`;

    // 🔹 3. Enregistrer dans Firestore pour dashboard prestataire
    await addDoc(collection(db, "providerMessages"), {
      providerId,
      message,
      callId,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 🔹 4. Enregistrer dans Firestore admin
    await addDoc(collection(db, "admin_contact_messages"), {
      providerId,
      message,
      context: "post_payment",
      callId,
      sentAt: serverTimestamp(),
      read: false, 
    });

    // 🔹 5. Envoyer sur WhatsApp (si numéro valide)
    if (providerPhone) {
      await sendWhatsAppViaFirebase(providerPhone, message);
    }       

    console.log("✅ Message post-paiement envoyé.");
  } catch (error) {
    console.error("Erreur lors de l'envoi du message post-paiement :", error);
  }
}