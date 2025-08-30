import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit, startAfter, addDoc
} from "firebase/firestore";

const db = getFirestore();

/** TEMPLATES **/
export async function listTemplateIds(locale: "fr-FR"|"en") {
  const snap = await getDocs(collection(db, `message_templates/${locale}/items`));
  return snap.docs.map(d => d.id).sort();
}
export async function getTemplate(locale: "fr-FR"|"en", eventId: string) {
  const ref = doc(db, `message_templates/${locale}/items/${eventId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() as any : null;
}
export async function upsertTemplate(locale: "fr-FR"|"en", eventId: string, payload: any, adminUid?: string) {
  const ref = doc(db, `message_templates/${locale}/items/${eventId}`);
  const body = { ...payload, updatedAt: new Date().toISOString(), updatedBy: adminUid||"admin" };
  await setDoc(ref, body, { merge: true });
  return true;
}

/** ROUTING **/
export async function getRouting() {
  const ref = doc(db, "message_routing/config");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() as any : { routing:{}, updatedAt:null };
}
export async function upsertRouting(routing: Record<string, any>, adminUid?: string) {
  const ref = doc(db, "message_routing/config");
  const body = { routing, updatedAt: new Date().toISOString(), updatedBy: adminUid||"admin" };
  await setDoc(ref, body, { merge: true });
  return true;
}

/** LOGS (deliveries) **/
export type DeliveryFilters = { eventId?: string; channel?: string; status?: string; to?: string; };
export async function listDeliveries(filters: DeliveryFilters = {}, pageSize = 50, cursor?: any) {
  let q = query(collection(db, "message_deliveries"), orderBy("createdAt", "desc"), limit(pageSize));
  // NB: ajoute ici where(...) si tu as des champs indexés pour filtrer
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const next = snap.docs.length === pageSize ? snap.docs[snap.docs.length-1] : null;
  return { items, next };
}

/** RESEND: recrée un message_events à partir d'un delivery */
export async function resendDelivery(delivery: any) {
  const evt = {
    eventId: delivery.eventId,
    uid: delivery.uid || null,
    locale: delivery.locale || "en",
    to: delivery.to || null,
    context: delivery.context || {},
    createdAt: new Date().toISOString()
  };
  await addDoc(collection(db, "message_events"), evt);
  return true;
}

/** Envoi manuel (crée un message_events) */
export async function manualSend(eventId: string, locale: "fr-FR"|"en", to: any, context: any) {
  const payload = {
    eventId, locale, to, context,
    createdAt: new Date().toISOString()
  };
  await addDoc(collection(db, "message_events"), payload);
  return true;
}
