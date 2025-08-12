// SendToOne.tsx
import React, { useState } from 'react';
import { sendEmail } from '../../../../serveremails/services/emailSender';
import { newsletter } from '../../templates/newsletter';
import { logEmail } from '../../../../serveremails/services/emailLogger';

const SendToOne: React.FC = () => {
  const [email, setEmail] = useState('');
  const [greeting, setGreeting] = useState('Bonjour !');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  const handleSend = async () => {
    try {
      const html = newsletter({ greeting, content });
      await sendEmail({ to: email, subject: 'Newsletter personnalisée', html });
      await logEmail({ to: email, subject: 'Newsletter personnalisée', status: 'success', template: 'newsletter' });
      setStatus('Email envoyé ✅');
    } catch (err: any) {
      await logEmail({ to: email, subject: 'Newsletter personnalisée', status: 'error', template: 'newsletter', error: err.message });
      setStatus('Erreur lors de l’envoi ❌');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">👤 Envoi individuel</h2>
      <div className="grid gap-4">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input" />
        <input value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Salutation" className="input" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contenu" className="textarea" />
        <button onClick={handleSend} className="btn btn-primary">Envoyer</button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToOne;


