// SendToAll.tsx
import React, { useState } from 'react';
import { getRecipients } from '../../../../serveremails/services/recipientSelector';
import { sendEmail } from '../../../../serveremails/services/emailSender';
import { newsletter } from '../../templates/newsletter';
import { logEmail } from '../../../../serveremails/services/emailLogger';
import { getErrorMessage } from '../../../utils/errors';
const SendToAll: React.FC = () => {
  const [greeting, setGreeting] = useState('Bonjour à tous,');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async () => {
    setStatus('Chargement des destinataires...');
    try {
      const emails = await getRecipients({}); // Aucun filtre = tous
      const filteredEmails = emails.filter(email => email !== ''); // Optionnel si jamais il y a des vides

      for (const email of filteredEmails) {
        const html = newsletter({ greeting, content });
        await sendEmail({ to: email, subject: 'Message de l’équipe SOS', html });
        await logEmail({ to: email, subject: 'Global Message', status: 'success', template: 'newsletter' });
      }

      setStatus(`Email envoyé à ${filteredEmails.length} utilisateurs ✅`);
    } catch (err) {
      setStatus('Erreur ❌ ' + getErrorMessage(err));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">📢 Envoi global à tous</h2>
      <div className="grid gap-4">
        <input value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Salutation" className="input" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu du message" className="textarea" />
        <button onClick={handleSend} className="btn btn-primary">Envoyer à tous</button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToAll;


