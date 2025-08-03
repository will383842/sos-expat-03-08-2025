// src/notifications/sendWhatsAppMessage.ts
export async function sendWhatsAppMessage({
  to,
  body,
  language,
}: {
  to: string;
  body: string;
  language?: string;
}) {
  try {
    // Log de la langue utilisée pour le debug
    console.log(`📱 Envoi WhatsApp vers ${to} en ${language || 'langue par défaut'}`);
    
    const res = await fetch("/api/notifications/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sos-secret": import.meta.env.VITE_SOS_SECRET || "",
      },
      body: JSON.stringify({ 
        to, 
        body,
        language: language || "fr", // Inclure la langue dans l'envoi à l'API
        metadata: {
          timestamp: new Date().toISOString(),
          source: "post-payment-notification"
        }
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur envoi WhatsApp");
    }

    const result = await res.json();
    console.log(`✅ Message WhatsApp envoyé avec succès en ${language || 'fr'}`);
    
    return result;
  } catch (err) {
    console.error(`❌ Erreur sendWhatsAppMessage (langue: ${language || 'inconnue'}):`, err);
    throw err;
  }
}