import { db } from "../../../utils/firebase";

export async function sendInApp(
  uid: string,
  title: string,
  body: string,
  data?: any
) {
  await db.collection("inapp_notifications").add({
    uid,
    title,
    body,
    data: data || {},
    createdAt: new Date(),
    read: false});
}
