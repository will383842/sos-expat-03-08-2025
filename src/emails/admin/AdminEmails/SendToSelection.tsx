// SendToSelection.tsx
import React, { useState } from "react";
import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";
import { newsletter } from "../../templates/newsletter";
import { getErrorMessage } from "../../../utils/errors";

const sendEmail = httpsCallable<
  { to: string; subject: string; html: string },
  { success: boolean }
>(functions, "admin_sendEmail"); // à implémenter côté Functions

const logEmail = httpsCallable<
  { type: string; count: number; error?: string },
  { logged: boolean }
>(functions, "admin_logEmail"); // à implémenter côté Functions

const SendToSelection: React.FC = () => {
  const [emailsRaw, setEmailsRaw] = useState("");
  const [greeting, setGreeting] = useState("Bonjour,");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  const handleSend = async (): Promise<void> => {
    const emails = emailsRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      setStatus("❌ Veuillez entrer au moins une adresse email");
      return;
    }

    try {
      for (const email of emails) {
        const html = newsletter({ greeting, content });

        await sendEmail({
          to: email,
          subject: "Message personnalisé",
          html,
        });
      }

      // ✅ log global
      await logEmail({ type: "newsletter", count: emails.length });

      setStatus(`Emails envoyés à ${emails.length} destinataires ✅`);
    } catch (err) {
      await logEmail({
        type: "newsletter",
        count: 0,
        error: getErrorMessage(err),
      });

      setStatus("Erreur ❌ " + getErrorMessage(err));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">✅ Envoi ciblé manuel</h2>
      <div className="grid gap-4">
        <textarea
          value={emailsRaw}
          onChange={(e) => setEmailsRaw(e.target.value)}
          placeholder="Email1, Email2, ..."
          className="textarea"
        />
        <input
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Salutation"
          className="input"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenu"
          className="textarea"
        />
        <button onClick={handleSend} className="btn btn-primary">
          Envoyer
        </button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToSelection;
