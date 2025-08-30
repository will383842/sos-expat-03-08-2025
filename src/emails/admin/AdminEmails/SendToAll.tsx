// SendToAll.tsx
import React, { useState } from "react";
import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";
import { newsletter } from "../../templates/newsletter";
import { getErrorMessage } from "../../../utils/errors";

const getRecipients = httpsCallable<
  Record<string, never>,
  string[]
>(functions, "admin_getRecipients"); // Ã  implÃ©menter cÃ´tÃ© Functions

const sendEmail = httpsCallable<
  { to: string; subject: string; html: string },
  { success: boolean }
>(functions, "admin_sendEmail"); // Ã  implÃ©menter cÃ´tÃ© Functions

const logEmail = httpsCallable<
  { type: string; count: number },
  { logged: boolean }
>(functions, "admin_logEmail"); // Ã  implÃ©menter cÃ´tÃ© Functions

const SendToAll: React.FC = () => {
  const [greeting, setGreeting] = useState("Bonjour Ã  tous,");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  const handleSend = async () => {
    setStatus("Chargement des destinataires...");
    try {
      // âœ… destructuration directe
      const { data: emails = [] } = await getRecipients({});
      const filteredEmails = emails.filter((email) => email !== "");

      if (filteredEmails.length === 0) {
        setStatus("âŒ Aucun destinataire trouvÃ©");
        return;
      }

      for (const email of filteredEmails) {
        const html = newsletter({ greeting, content });

        await sendEmail({
          to: email,
          subject: "Message de lâ€™Ã©quipe SOS",
          html,
        });
      }

      // âœ… log global du batch
      await logEmail({ type: "newsletter", count: filteredEmails.length });

      setStatus(`Email envoyÃ© Ã  ${filteredEmails.length} utilisateurs âœ…`);
    } catch (err) {
      setStatus("Erreur âŒ " + getErrorMessage(err));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">ðŸ“¢ Envoi global Ã  tous</h2>
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
          Envoyer Ã  tous
        </button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToAll;
