// SendToRoles.tsx
import React, { useState } from 'react';
import { getRecipients } from '../../../../serveremails/services/recipientSelector';
import { sendEmail } from '../../../../serveremails/services/emailSender';
import { newsletter } from '../../templates/newsletter';
import { logEmail } from '../../../../serveremails/services/emailLogger';

const SendToRoles: React.FC = () => {
  const [role, setRole] = useState('');
  const [greeting, setGreeting] = useState('Bonjour à tous,');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async () => {
    setStatus('Chargement des destinataires...');
    try {
      const emails = await getRecipients({ role });
      for (const email of emails) {
        const html = newsletter({ greeting, content });
        await sendEmail({ to: email, subject: 'Message à tous les ' + role, html });
        await logEmail({ to: email, subject: 'Role message', status: 'success', template: 'newsletter' });
      }
      setStatus(`Email envoyé à ${emails.length} utilisateurs ✅`);
    } catch (err: any) {
      setStatus('Erreur ❌ ' + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">👥 Envoi par rôle</h2>
      <div className="grid gap-4">
        <select value={role} onChange={e => setRole(e.target.value)} className="input">
          <option value="">Choisir un rôle</option>
          <option value="lawyer">Avocats</option>
          <option value="expat">Expatriés aidants</option>
        </select>
        <input value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Salutation" className="input" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu" className="textarea" />
        <button onClick={handleSend} className="btn btn-primary">Envoyer à tous</button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToRoles;


