import React, { useEffect, useState } from "react";
import { db, auth } from "@/config/firebase"; // ← ajoute auth
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
  senderId?: string;
  message: string;
  isRead: boolean;
  createdAt: { seconds: number; nanoseconds: number } | { toDate: () => Date };
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
    // attendre que l’auth soit prête
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Alerte utile si jamais ton contexte n'a pas le même identifiant
    if (user?.id && user.id !== uid) {
      // Cela arrive souvent quand user.id = id du doc Firestore et pas l’UID Auth
      console.warn("[Messages] user.id != auth.uid → j’utilise auth.uid pour la requête", { userId: user.id, authUid: uid });
    }

    const messagesRef = collection(db, "providerMessageOrderCustomers");
    const q = query(
      messagesRef,
      where("providerId", "==", uid),        // ← FILTRE SUR L’UID AUTH
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Message[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Message, "id">;
        return { id: d.id, ...data };
        });
        setMessages(fetched);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("onSnapshot messages error:", err);
        setLoading(false);
        unsubscribe(); // coupe pour éviter le spam si permission-denied
      }
    );

    return () => unsubscribe();
  }, [user]); // le hook se relance si le contexte change

  const markAsRead = async (messageId: string) => {
    // règles: seul le provider (auth.uid == providerId) peut passer isRead à true
    const messageRef = doc(db, "providerMessageOrderCustomers", messageId);
    await updateDoc(messageRef, { isRead: true });
  };

  if (loading) return <Loader />;

  const formatDate = (createdAt: Message["createdAt"]): string => {
    try {
      if ("toDate" in createdAt && typeof createdAt.toDate === "function") {
        return createdAt.toDate().toLocaleString();
      }
      // @ts-expect-error: fallback sur shape seconds/nanoseconds
      if (typeof createdAt?.seconds === "number") {
        // @ts-expect-error: idem
        return new Date(createdAt.seconds * 1000).toLocaleString();
      }
    } catch {}
    return "—";
  };

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
                  Reçu le {formatDate(msg.createdAt)}
                </p>
                <p>
                  <strong>Client :</strong>{" "}
                  {msg.metadata?.clientFirstName ?? "Inconnu"}
                </p>
                <p>
                  <strong>Pays :</strong>{" "}
                  {msg.metadata?.clientCountry ?? "Non précisé"}
                </p>
                <p>
                  <strong>Message :</strong> {msg.message}
                </p>

                {!msg.isRead && (
                  <Button size="sm" variant="outline" onClick={() => markAsRead(msg.id)}>
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
