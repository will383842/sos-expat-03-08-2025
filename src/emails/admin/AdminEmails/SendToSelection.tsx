// SendToSelection.tsx
import React, { useState } from 'react';
import { sendEmail } from '../../../../serveremails/services/emailSender';
import { newsletter } from '../../templates/newsletter';
import { logEmail } from '../../../../serveremails/services/emailLogger';

const SendToSelection: React.FC = () => {
  const [emailsRaw, setEmailsRaw] = useState('');
  const [greeting, setGreeting] = useState('Bonjour,');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async () => {
    const emails = emailsRaw.split(',').map(e => e.trim()).filter(Boolean);
    try {
      for (const email of emails) {
        const html = newsletter({ greeting, content });
        await sendEmail({ to: email, subject: 'Message personnalisé', html });
        await logEmail({ to: email, subject: 'Manual message', status: 'success', template: 'newsletter' });
      }
      setStatus(`Emails envoyés à ${emails.length} destinataires ✅`);
    } catch (err: any) {
      setStatus('Erreur ❌ ' + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">✅ Envoi ciblé manuel</h2>
      <div className="grid gap-4">
        <textarea value={emailsRaw} onChange={e => setEmailsRaw(e.target.value)} placeholder="Email1, Email2, ..." className="textarea" />
        <input value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Salutation" className="input" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu" className="textarea" />
        <button onClick={handleSend} className="btn btn-primary">Envoyer</button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToSelection;
