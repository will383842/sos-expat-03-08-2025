// src/emails/admin/AdminEmails/SendToContact.tsx

import React, { useState } from 'react';
import { sendContactReply } from '../../../api/sendContactReply.ts'; // <-- adapter si nÃ©cessaire

const SendToContact: React.FC = () => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setStatus('');

    const result = await sendContactReply({ to: email, firstName, userMessage, adminReply });

    try {
      await updateContactMessageStatus(email, {
        status: result.success ? 'sent' : 'error',
        replyMessage: adminReply,
        respondedAt: new Date().toISOString(),
        error: result.error || '',
      });

      setStatus(result.success ? 'âœ… Message envoyÃ© avec succÃ¨s' : `âŒ Erreur : ${result.error}`);
    } catch (e: any) {
      setStatus(`âŒ Erreur Firestore : ${e.message}`);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">âœ‰ï¸ RÃ©pondre Ã  un contact</h2>
      <div className="grid grid-cols-1 gap-4">
        <input
          placeholder="Email du contact"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input"
        />
        <input
          placeholder="PrÃ©nom"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="input"
        />
        <textarea
          placeholder="Message reÃ§u"
          value={userMessage}
          onChange={e => setUserMessage(e.target.value)}
          className="textarea"
        />
        <textarea
          placeholder="Votre rÃ©ponse"
          value={adminReply}
          onChange={e => setAdminReply(e.target.value)}
          className="textarea"
        />
        <button onClick={handleSend} className="btn btn-primary" disabled={loading}>
          {loading ? 'Envoi en cours...' : 'Envoyer la rÃ©ponse'}
        </button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </div>
  );
};

export default SendToContact;


