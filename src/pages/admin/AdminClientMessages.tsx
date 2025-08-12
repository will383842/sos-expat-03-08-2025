import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  providerId: string;
  message: string;
  isRead: boolean;
  createdAt: any;
  metadata?: {
    clientFirstName?: string;
    clientCountry?: string;
    providerPhone?: string;
    bookingId?: string;
  };
}

const AdminClientMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = async () => {
    setIsLoading(true);
    const db = getFirestore();
    const ref = collection(db, 'providerMessageOrderCustomers');
    const snapshot = await getDocs(ref);
    const data: Message[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Message, 'id'>),
    }));
    setMessages(data.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    }));
    setIsLoading(false);
  };

  const markAsRead = async (messageId: string) => {
    const db = getFirestore();
    const docRef = doc(db, 'providerMessageOrderCustomers', messageId);
    await updateDoc(docRef, { isRead: true });
    fetchMessages(); // refresh after update
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Messages clients après paiement</h1>
      {isLoading ? (
        <p>Chargement en cours...</p>
      ) : messages.length === 0 ? (
        <p>Aucun message pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border border-gray-200 rounded-md p-4 flex justify-between items-start bg-white"
            >
              <div>
                <p className="text-gray-900 font-medium mb-2">{msg.message}</p>
                {msg.metadata?.clientFirstName && (
                  <p className="text-sm text-gray-700">
                    👤 Client : {msg.metadata.clientFirstName} — 🌍 {msg.metadata.clientCountry}
                  </p>
                )}
                {msg.metadata?.providerPhone && (
                  <p className="text-sm text-gray-500">📞 Prestataire : {msg.metadata.providerPhone}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  🕒 Envoyé le :{' '}
                  {msg.createdAt?.seconds
                    ? format(new Date(msg.createdAt.seconds * 1000), 'dd/MM/yyyy HH:mm')
                    : 'Date inconnue'}
                </p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {!msg.isRead && <Badge variant="destructive">Non lu</Badge>}
                {msg.isRead && <Badge variant="outline">Lu</Badge>}
                {!msg.isRead && (
                  <Button size="sm" onClick={() => markAsRead(msg.id)}>
                    Marquer comme lu
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClientMessages;


