// SendToRoles.tsx
import React, { useState } from "react";
import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";
import { newsletter } from "../../templates/newsletter";
import { getErrorMessage } from "../../../utils/errors";

const getRecipients = httpsCallable<
  { role: string },
  string[]
>(functions, "admin_getRecipients"); // Ã  implÃ©menter cÃ´tÃ© Functions

const sendEmail = httpsCallable<
  { to: string; subject: string; html: string },
  { success: boolean }
>(functions, "admin_sendEmail"); // Ã  implÃ©menter cÃ´tÃ© Functions

const logEmail = httpsCallable<
  { type: string; count: number; error?: string },
  { logged: boolean }
>(functions, "admin_logEmail"); // Ã  implÃ©menter cÃ´tÃ© Functions

const SendToRoles: React.FC = () => {
  const [role, setRole] = useState("");
  const [greeting, setGreeting] = useState("Bonjour Ã  tous,");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  const handleSend = async (): Promise<void> => {
    if (!role) {
      setStatus("âŒ Veuillez choisir un rÃ´le avant dâ€™envoyer");
      return;
    }

    setStatus("Chargement des destinataires...");
    try {
      // âœ… destructuration directe
      const { data: emails = [] } = await getRecipients({ role });
      const filteredEmails = emails.filter((email) => email !== "");

      if (filteredEmails.length === 0) {
        setStatus("âŒ Aucun destinataire trouvÃ© pour ce rÃ´le");
        return;
      }

      for (const email of filteredEmails) {
        const html = newsletter({ greeting, content });

        await sendEmail({
          to: email,
          subject: "Message Ã  tous les " + role,
          html,
        });
      }

      // âœ… log global
      await logEmail({ type: "newsletter", count: filteredEmails.length });

      setStatus(`Email envoyÃ© Ã  ${filteredEmails.length} utilisateurs âœ…`);
    } catch (err) {
      await logEmail({
        type: "newsletter",
        count: 0,
        error: getErrorMessage(err),
      });

      setStatus("Erreur âŒ " + getErrorMessage(err));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">ðŸ‘¥ Envoi par rÃ´le</h2>
      <div className="grid gap-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input"
        >
          <option value="">Choisir un rÃ´le</option>
          <option value="lawyer">Avocats</option>
          <option value="expat">ExpatriÃ©s aidants</option>
        </select>

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
          Envoyer Ã  tous
        </button>

        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToRoles;
