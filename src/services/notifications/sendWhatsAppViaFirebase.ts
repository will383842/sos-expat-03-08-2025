import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

export const sendWhatsAppViaFirebase = async (recipientPhone: string, message: string) => {
  const sendNotification = httpsCallable(functions, "sendNotification");

  try {
    const result = await sendNotification({
      recipientPhone,
      whatsappMessage: message,
    });
    return result;
  } catch (error) {
    console.error("Erreur lors de l’envoi WhatsApp via Firebase :", error);
    throw error;
  }
};
