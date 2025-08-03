// src/notifications/sendWhatsAppMessage.ts
export async function sendWhatsAppMessage({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  try {
    const res = await fetch("/api/notifications/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sos-secret": import.meta.env.VITE_SOS_SECRET || "",
      },
      body: JSON.stringify({ to, body }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur envoi WhatsApp");
    }

    return await res.json();
  } catch (err) {
    console.error("❌ Erreur sendWhatsAppMessage:", err);
    throw err;
  }
}
