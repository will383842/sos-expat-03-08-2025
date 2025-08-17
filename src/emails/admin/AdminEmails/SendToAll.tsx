// SendToAll.tsx
import React, { useState } from "react";
import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";
import { newsletter } from "../../templates/newsletter";
import { getErrorMessage } from "../../../utils/errors";

const getRecipients = httpsCallable<
  Record<string, never>,
  string[]
>(functions, "admin_getRecipients"); // à implémenter côté Functions

const sendEmail = httpsCallable<
  { to: string; subject: string; html: string },
  { success: boolean }
>(functions, "admin_sendEmail"); // à implémenter côté Functions

const logEmail = httpsCallable<
  { type: string; count: number },
  { logged: boolean }
>(functions, "admin_logEmail"); // à implémenter côté Functions

const SendToAll: React.FC = () => {
  const [greeting, setGreeting] = useState("Bonjour à tous,");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  const handleSend = async () => {
    setStatus("Chargement des destinataires...");
    try {
      // ✅ destructuration directe
      const { data: emails = [] } = await getRecipients({});
      const filteredEmails = emails.filter((email) => email !== "");

      if (filteredEmails.length === 0) {
        setStatus("❌ Aucun destinataire trouvé");
        return;
      }

      for (const email of filteredEmails) {
        const html = newsletter({ greeting, content });

        await sendEmail({
          to: email,
          subject: "Message de l’équipe SOS",
          html,
        });
      }

      // ✅ log global du batch
      await logEmail({ type: "newsletter", count: filteredEmails.length });

      setStatus(`Email envoyé à ${filteredEmails.length} utilisateurs ✅`);
    } catch (err) {
      setStatus("Erreur ❌ " + getErrorMessage(err));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">📢 Envoi global à tous</h2>
      <div className="grid gap-4">
        <input
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="Salutation"
          className="input"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenu du message"
          className="textarea"
        />
        <button onClick={handleSend} className="btn btn-primary">
          Envoyer à tous
        </button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToAll;
