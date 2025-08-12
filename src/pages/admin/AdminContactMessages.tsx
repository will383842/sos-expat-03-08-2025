import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { MailCheck, Mail } from 'lucide-react';
import { sendContactReply } from "../../api/sendContactReply";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  reply?: string;
  createdAt?: { toDate: () => Date };
    repliedAt?: { toDate: () => Date };
    }

const AdminContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const loadMessages = async () => {
    const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactMessage[];
    setMessages(items);
  };

  const markAsRead = async (id: string) => {
    const ref = doc(db, 'contact_messages', id);
    await updateDoc(ref, { isRead: true });
    await loadMessages();
  };

  const handleReply = async (msg: ContactMessage) => {
    if (!replyText[msg.id]) return;
    setLoading(true);
    try {
      await sendContactReply(msg.email, replyText[msg.id]);
      await updateDoc(doc(db, 'contact_messages', msg.id), {
        reply: replyText[msg.id],
        repliedAt: serverTimestamp(),
        isRead: true,
      });
      setReplyText(prev => ({ ...prev, [msg.id]: '' }));
      await loadMessages();
    } catch (error) {
      console.error("Erreur d'envoi :", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Messages de contact</h1>
        {messages.map(msg => (
          <div key={msg.id} className="border p-4 rounded-xl shadow mb-4 bg-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{msg.name} ({msg.email})</p>
                <p className="text-sm text-gray-500">Reçu le {msg.createdAt?.toDate().toLocaleString() || "?"}</p>
              </div>
              <div>
                {msg.isRead ? (
                  <span className="text-green-600 flex items-center"><MailCheck className="w-5 h-5 mr-1" /> Lu</span>
                ) : (
                  <button onClick={() => markAsRead(msg.id)} className="text-blue-600 flex items-center"><Mail className="w-5 h-5 mr-1" /> Marquer comme lu</button>
                )}
              </div>
            </div>
            <div className="mt-4 text-gray-800">{msg.message}</div>

            {msg.reply ? (
              <div className="mt-4 bg-green-50 p-3 rounded border text-sm">
                <p className="text-green-700 font-semibold">Réponse envoyée :</p>
                <p>{msg.reply}</p>
                <p className="text-xs text-gray-500 mt-1">Répondu le {msg.repliedAt?.toDate().toLocaleString() || "?"}</p>
              </div>
            ) : (
              <div className="mt-4">
                <textarea
                  value={replyText[msg.id] || ''}
                  onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                  placeholder="Votre réponse..."
                  className="w-full p-2 border rounded mb-2"
                  rows={3}
                />
                <button
                  disabled={loading}
                  onClick={() => handleReply(msg)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Envoyer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminContactMessages;

