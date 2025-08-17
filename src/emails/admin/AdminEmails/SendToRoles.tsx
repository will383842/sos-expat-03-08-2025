// SendToRoles.tsx
import React, { useState } from "react";
import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";
import { newsletter } from "../../templates/newsletter";
import { getErrorMessage } from "../../../utils/errors";

const getRecipients = httpsCallable<
  { role: string },
  string[]
>(functions, "admin_getRecipients"); // à implémenter côté Functions

const sendEmail = httpsCallable<
  { to: string; subject: string; html: string },
  { success: boolean }
>(functions, "admin_sendEmail"); // à implémenter côté Functions

const logEmail = httpsCallable<
  { type: string; count: number; error?: string },
  { logged: boolean }
>(functions, "admin_logEmail"); // à implémenter côté Functions

const SendToRoles: React.FC = () => {
  const [role, setRole] = useState("");
  const [greeting, setGreeting] = useState("Bonjour à tous,");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  const handleSend = async (): Promise<void> => {
    if (!role) {
      setStatus("❌ Veuillez choisir un rôle avant d’envoyer");
      return;
    }

    setStatus("Chargement des destinataires...");
    try {
      // ✅ destructuration directe
      const { data: emails = [] } = await getRecipients({ role });
      const filteredEmails = emails.filter((email) => email !== "");

      if (filteredEmails.length === 0) {
        setStatus("❌ Aucun destinataire trouvé pour ce rôle");
        return;
      }

      for (const email of filteredEmails) {
        const html = newsletter({ greeting, content });

        await sendEmail({
          to: email,
          subject: "Message à tous les " + role,
          html,
        });
      }

      // ✅ log global
      await logEmail({ type: "newsletter", count: filteredEmails.length });

      setStatus(`Email envoyé à ${filteredEmails.length} utilisateurs ✅`);
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
      <h2 className="text-xl font-semibold mb-4">👥 Envoi par rôle</h2>
      <div className="grid gap-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input"
        >
          <option value="">Choisir un rôle</option>
          <option value="lawyer">Avocats</option>
          <option value="expat">Expatriés aidants</option>
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
          Envoyer à tous
        </button>

        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToRoles;
