import React, { useEffect, useState } from "react";
import { db } from "@/config/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

interface Message {
  id: string;
  providerId: string;
  message: string;
  isRead: boolean;
  createdAt: { seconds: number; nanoseconds: number };
  metadata?: {
    clientFirstName?: string;
    clientCountry?: string;
    bookingId?: string;
    providerPhone?: string;
  };
}

const DashboardMessages: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const messagesRef = collection(db, "providerMessageOrderCustomers");
    const q = query(
      messagesRef,
      where("providerId", "==", user.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      }));
      setMessages(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (messageId: string) => {
    const messageRef = doc(db, "providerMessageOrderCustomers", messageId);
    await updateDoc(messageRef, { isRead: true });
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📩 Mes messages</h2>

      {messages.length === 0 && (
        <p className="text-gray-500">Aucun message pour l’instant.</p>
      )}

      {messages.map((msg) => (
        <Card key={msg.id}>
          <div className={msg.isRead ? "" : "border-2 border-red-500"}>
            <CardContent>
              <div className="p-4 space-y-2">
                <p className="font-semibold text-sm text-gray-500">
                  Reçu le{" "}
                  {new Date(msg.createdAt.seconds * 1000).toLocaleString()}
                </p>
                <p>
                  <strong>Client :</strong>{" "}
                  {msg.metadata?.clientFirstName || "Inconnu"}
                </p>
                <p>
                  <strong>Pays :</strong>{" "}
                  {msg.metadata?.clientCountry || "Non précisé"}
                </p>
                <p>
                  <strong>Message :</strong> {msg.message}
                </p>

                {!msg.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead(msg.id)}
                  >
                    ✅ Marquer comme lu
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DashboardMessages;
