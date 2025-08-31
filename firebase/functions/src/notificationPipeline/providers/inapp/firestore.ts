import { db } from "../../../utils/firebase";

export interface InAppParams {
  uid: string;
  title: string;
  body: string;
  eventId?: string;
  data?: Record<string, any>;
  action?: string;
}

export async function writeInApp(params: InAppParams) {
  const { uid, title, body, eventId, data = {}, action } = params;
  
  const inappMessage = {
    uid,
    eventId: eventId || null,
    title,
    body,
    action: action || null,
    data,
    createdAt: new Date(),
    readAt: null,
    read: false
  };

  const docRef = await db.collection("inapp_notifications").add(inappMessage);
  
  console.log(`InApp message created: ${docRef.id} for user ${uid}`);
  
  return {
    messageId: docRef.id,
    uid
  };
}