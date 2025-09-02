// src/services/admin/comms.ts
import {
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  addDoc, 
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
// Remplacez par le bon chemin selon votre structure :
// import { db } from "./firebase";
// import { db } from "../firebase";
// import { db } from "../../firebase";
// import { db } from "@/lib/firebase";
import { db } from "@/config/firebase";
import { getAuth } from "firebase/auth";

// Types
type Locale = "fr-FR" | "en";

type Recipient = {
  uid?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type MessageTemplate = {
  subject?: string;
  body: string;
  variables?: string[];
  updatedAt: string;
  updatedBy: string;
};

type RoutingConfig = {
  routing: Record<string, unknown>;
  updatedAt: string | null;
  updatedBy?: string;
};

type DeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "cancelled";
type MessageChannel = "email" | "sms" | "whatsapp" | "push";

type MessageDelivery = {
  id: string;
  eventId: string;
  uid?: string | null;
  locale: Locale;
  to: Recipient;
  context: Record<string, unknown>;
  status: DeliveryStatus;
  channel?: MessageChannel;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
};

type DeliveryFilters = { 
  eventId?: string; 
  channel?: MessageChannel; 
  status?: DeliveryStatus; 
  to?: string; 
};

type PaginationResult<T> = {
  items: T[];
  next: QueryDocumentSnapshot<DocumentData> | null;
};

type MessageEvent = {
  eventId: string;
  locale: Locale;
  to: Recipient;
  context: Record<string, unknown>;
  vars: Record<string, unknown>;
  createdAt: ReturnType<typeof serverTimestamp> | string;
  status: DeliveryStatus;
  channelHint?: MessageChannel | null;
  uid?: string | null;
  createdBy?: string | null;
};

/** TEMPLATES **/
export async function listTemplateIds(locale: Locale): Promise<string[]> {
  const snap = await getDocs(collection(db, `message_templates/${locale}/items`));
  return snap.docs.map(d => d.id).sort();
}

export async function getTemplate(locale: Locale, eventId: string): Promise<MessageTemplate | null> {
  const ref = doc(db, `message_templates/${locale}/items/${eventId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() as MessageTemplate : null;
}

export async function upsertTemplate(
  locale: Locale, 
  eventId: string, 
  payload: Partial<MessageTemplate>, 
  adminUid?: string
): Promise<boolean> {
  const ref = doc(db, `message_templates/${locale}/items/${eventId}`);
  const body: Partial<MessageTemplate> = { 
    ...payload, 
    updatedAt: new Date().toISOString(), 
    updatedBy: adminUid || "admin" 
  };
  await setDoc(ref, body, { merge: true });
  return true;
}

/** ROUTING **/
export async function getRouting(): Promise<RoutingConfig> {
  const ref = doc(db, "message_routing/config");
  const snap = await getDoc(ref);
  return snap.exists() 
    ? snap.data() as RoutingConfig 
    : { routing: {}, updatedAt: null };
}

export async function upsertRouting(
  routing: Record<string, unknown>, 
  adminUid?: string
): Promise<boolean> {
  const ref = doc(db, "message_routing/config");
  const body: RoutingConfig = { 
    routing, 
    updatedAt: new Date().toISOString(), 
    updatedBy: adminUid || "admin" 
  };
  await setDoc(ref, body, { merge: true });
  return true;
}

/** LOGS (deliveries) **/
export async function listDeliveries(
  filters: DeliveryFilters = {}, 
  pageSize = 50, 
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginationResult<MessageDelivery>> {
  let q = query(
    collection(db, "message_deliveries"), 
    orderBy("createdAt", "desc"), 
    limit(pageSize)
  );
  
  if (cursor) {
    q = query(q, startAfter(cursor));
  }
  
  // NB: ajoute ici where(...) si tu as des champs indexés pour filtrer
  const snap = await getDocs(q);
  const items: MessageDelivery[] = snap.docs.map(d => ({ 
    id: d.id, 
    ...(d.data() as Omit<MessageDelivery, 'id'>) 
  }));
  const next = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  
  return { items, next };
}

/** RESEND: recrée un message_events à partir d'un delivery */
export async function resendDelivery(delivery: MessageDelivery): Promise<boolean> {
  const evt: Omit<MessageEvent, 'createdAt'> & { createdAt: string } = {
    eventId: delivery.eventId,
    uid: delivery.uid || null,
    locale: delivery.locale || "en",
    to: delivery.to || { uid: null, email: null, phone: null, whatsapp: null },
    context: delivery.context || {},
    vars: delivery.context || {},
    createdAt: new Date().toISOString(),
    status: "queued",
    channelHint: null
  };
  await addDoc(collection(db, "message_events"), evt);
  return true;
}

/** Envoi manuel (crée un message_events) */
export async function manualSend(
  eventId: string,
  locale: Locale,
  to: Recipient,
  context: Record<string, unknown>
): Promise<void> {
  const uid = getAuth().currentUser?.uid || null;
  
  const payload: MessageEvent = {
    eventId,           // ex: "whatsapp_provider_booking_request"
    locale,            // ex: "fr-FR"
    to,                // { uid, email, phone, whatsapp }
    context,           // variables pour le template
    vars: context,     // ✅ miroir des variables pour le worker
    createdAt: serverTimestamp(),
    status: "queued",  // lu par le worker
    channelHint: null, // optionnel: "whatsapp" | "sms" | "email"
    createdBy: uid,    // UID de l'admin qui envoie
  };
  await addDoc(collection(db, "message_events"), payload);
}