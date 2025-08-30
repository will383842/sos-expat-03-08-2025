import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { render } from "./render";

// ⚠️ On charge le provider Zoho au runtime pour éviter les problèmes d'ordre d'import
export const onMessageEventCreate = onDocumentCreated(
  {
    region: "us-central1",
    document: "message_events/{id}",
    // Aligné à la localisation Firestore (nam7 via Eventarc, implicite ici)
  },
  async (event) => {
    const evt = event.data?.data() as any;
    if (!evt) return;

    // Construit un contexte minimal pour le rendu
    const locale = String(
      evt.locale || evt?.context?.user?.preferredLanguage || "en"
    )
      .toLowerCase()
      .startsWith("fr")
      ? "fr-FR"
      : "en";

    const ctx = { ...evt, locale };

    // Fallbacks de rendu si tu n'utilises pas encore templates.ts
    const subjectTpl =
      evt?.template?.email?.subject ??
      "✅ {{user.firstName}} — {{eventId}}";
    const htmlTpl =
      evt?.template?.email?.html ??
      "<p>Hello {{user.firstName}}, event {{eventId}} processed.</p>";
    const textTpl =
      evt?.template?.email?.text ??
      "Hello {{user.firstName}}, event {{eventId}} processed.";

    const subject = render(subjectTpl, ctx);
    const html = render(htmlTpl, ctx);
    const text = render(textTpl, ctx);

    const to = evt?.context?.user?.email;
    if (!to) return;

    const { sendZoho } = await import("./providers/email/zohoSmtp");
    await sendZoho(to, subject, html, text);

    // TODO: log message_deliveries ici si tu as déjà l'utilitaire
  }
);

// S'assure que le fichier est un module (évite TS2306 si aucun autre export)
export {};
