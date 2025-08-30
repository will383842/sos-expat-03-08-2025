// firebase/functions/src/notificationPipeline/worker.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// ----- Admin init (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ----- Types de base (adapte selon ton schéma réel)
type Channel = "email" | "sms" | "whatsapp" | "push" | "inapp";

type MessageEvent = {
  eventId: string;
  locale?: string;
  to?: {
    email?: string;
    phone?: string;        // E.164
    whatsapp?: string;     // E.164 (même que phone en général)
    fcmToken?: string;
  };
  context?: {
    user?: { uid?: string; email?: string; phoneNumber?: string };
    [k: string]: any;
  };
  vars?: Record<string, any>;
  templates?: {
    subject?: string;
    html?: string;
    text?: string;
    whatsapp?: string;
    sms?: string;
    pushTitle?: string;
    pushBody?: string;
  };
  channels?: Channel[]; // si absent => ["email"]
  dedupeKey?: string;   // optionnel pour forcer un regroupement idempotent
};

// ----- Petit utilitaire de rendu (remplace par ton moteur actuel)
function render(tpl: string | undefined, ctx: any): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    const path = k.trim().split(".");
    let v = ctx;
    for (const p of path) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

// ----- Clé idempotente par canal
function deliveryDocId(evt: MessageEvent, channel: Channel, to: string | null): string {
  const key = evt.dedupeKey || evt.eventId || "noevent";
  const dest = (to || "none").replace(/[^\w@+]/g, "_").slice(0, 80);
  return `${key}_${channel}_${dest}`;
}

// ----- Journaliser "queued" puis mettre à jour en "sent"/"failed"
async function enqueueDelivery(params: {
  evt: MessageEvent;
  channel: Channel;
  to: string | null;
}) {
  const { evt, channel, to } = params;
  const docId = deliveryDocId(evt, channel, to);
  const ref = db.collection("message_deliveries").doc(docId);

  const nowQueued = {
    eventId: evt.eventId || null,
    uid: evt.context?.user?.uid || null,
    channel,
    to: to || null,
    status: "queued" as const,
    providerMessageId: null as string | null,
    error: null as string | null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: null as admin.firestore.FieldValue | null,
    failedAt: null as admin.firestore.FieldValue | null,
    deliveredAt: null as admin.firestore.FieldValue | null,
  };

  const existing = await ref.get();
  if (existing.exists) {
    // Idempotence : si déjà envoyé/résolu, on ne renvoie pas
    const st = existing.get("status");
    if (st === "sent" || st === "delivered") {
      console.log(`[${channel}] Skipping, already ${st} for`, docId);
      return { ref, already: true };
    }
    if (st === "queued") {
      console.log(`[${channel}] Reusing queued entry for`, docId);
      return { ref, already: false };
    }
  }

  await ref.set(nowQueued, { merge: false });
  return { ref, already: false };
}

async function markSent(ref: FirebaseFirestore.DocumentReference, providerMessageId?: string | null) {
  await ref.update({
    status: "sent",
    providerMessageId: providerMessageId ?? null,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    error: null,
  });
}

async function markFailed(ref: FirebaseFirestore.DocumentReference, err: unknown) {
  const msg = typeof err === "string" ? err : (err as any)?.message || JSON.stringify(err);
  await ref.update({
    status: "failed",
    error: String(msg),
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ----- Envoi par canal (branche tes providers ici)
async function sendEmailZoho(to: string, subject: string, html: string, text: string) {
  // Import dynamique pour réduire le cold start si besoin
  const { sendZoho } = await import("./providers/email/zohoSmtp");
  // À adapter à ta signature réelle
  // return { messageId: string }
  return await sendZoho(to, subject, html, text);
}

async function sendSmsTwilio(toE164: string, body: string) {
  const { sendSms } = await import("./providers/sms/twilioSms");
  // return { sid: string }
  return await sendSms(toE164, body);
}

async function sendWhatsappTwilio(toE164: string, body: string) {
  const { sendWhatsapp } = await import("./providers/whatsapp/twilio");
  // return { sid: string }
  return await sendWhatsapp(toE164, body);
}

async function sendPushFcm(token: string, title: string, body: string, data?: Record<string, string>) {
  // Utilise l'admin SDK directement (ou ton helper)
  const message: admin.messaging.Message = {
    token,
    notification: { title, body },
    data,
  };
  const res = await admin.messaging().send(message);
  return { messageId: res };
}

// ----- Interrupteur global
async function isMessagingEnabled(): Promise<boolean> {
  const snap = await db.doc("config/messaging").get();
  return !!(snap.exists && snap.get("enabled"));
}

// ----- Worker principal
export const onMessageEventCreate = onDocumentCreated(
  { region: "europe-west1", document: "message_events/{id}" },
  async (event) => {
    // 0) Interrupteur global
    const enabled = await isMessagingEnabled();
    if (!enabled) {
      console.log("Messaging disabled: ignoring event");
      return;
    }

    // 1) Récupérer l’événement
    const evt = event.data?.data() as MessageEvent | undefined;
    if (!evt) {
      console.log("No event payload, abort");
      return;
    }
    if (!evt.eventId) {
      console.warn("Missing eventId; consider enforcing it");
    }

    // 2) Rendu du contenu (remplace par ton moteur de template existant)
    const ctx = { ...evt.context, vars: evt.vars };
    const subject = render(evt.templates?.subject, ctx);
    const html = render(evt.templates?.html, ctx);
    const text = render(evt.templates?.text, ctx);
    const smsBody = render(evt.templates?.sms, ctx);
    const waBody = render(evt.templates?.whatsapp, ctx);
    const pushTitle = render(evt.templates?.pushTitle, ctx);
    const pushBody = render(evt.templates?.pushBody, ctx);

    // 3) Routage + anti-spam / rate-limit (branche ta logique ici)
    //    -> Ici on applique un défaut simple
    const channels: Channel[] = Array.isArray(evt.channels) && evt.channels.length
      ? evt.channels
      : ["email"];

    // 4) Envoi par canal avec idempotence + journaux
    for (const channel of channels) {
      try {
        if (channel === "email") {
          const to = evt.to?.email || evt.context?.user?.email || null;
          if (!to) { console.log("[email] No destination"); continue; }

          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (already) continue;

          const res = await sendEmailZoho(to, subject, html, text);
          await markSent(ref, (res as any)?.messageId ?? null);
        }

        if (channel === "sms") {
          const to = evt.to?.phone || evt.context?.user?.phoneNumber || null;
          if (!to || !smsBody) { console.log("[sms] Missing destination/body"); continue; }

          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (already) continue;

          const res = await sendSmsTwilio(to, smsBody);
          await markSent(ref, (res as any)?.sid ?? null);
        }

        if (channel === "whatsapp") {
          const to = evt.to?.whatsapp || evt.to?.phone || evt.context?.user?.phoneNumber || null;
          if (!to || !waBody) { console.log("[whatsapp] Missing destination/body"); continue; }

          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (already) continue;

          const res = await sendWhatsappTwilio(to, waBody);
          await markSent(ref, (res as any)?.sid ?? null);
        }

        if (channel === "push") {
          const token = evt.to?.fcmToken || null;
          if (!token || !pushTitle || !pushBody) { console.log("[push] Missing token/title/body"); continue; }

          const { ref, already } = await enqueueDelivery({ evt, channel, to: token });
          if (already) continue;

          const res = await sendPushFcm(token, pushTitle, pushBody, {});
          await markSent(ref, (res as any)?.messageId ?? null);
        }

        if (channel === "inapp") {
          // Exemple : écrire dans une collection in-app + journal
          const to = evt.context?.user?.uid || null;
          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (!already) {
            await db.collection("inapp_messages").add({
              uid: to,
              eventId: evt.eventId,
              title: subject || evt.templates?.pushTitle || "",
              body: text || html || smsBody || waBody || "",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readAt: null,
            });
            await markSent(ref, null);
          }
        }
      } catch (err) {
        console.error(`[${channel}] send failed`, err);
        try {
          const to =
            channel === "email" ? (evt.to?.email || evt.context?.user?.email || null)
            : channel === "sms" ? (evt.to?.phone || evt.context?.user?.phoneNumber || null)
            : channel === "whatsapp" ? (evt.to?.whatsapp || evt.to?.phone || evt.context?.user?.phoneNumber || null)
            : channel === "push" ? (evt.to?.fcmToken || null)
            : (evt.context?.user?.uid || null);

          const ref = db.collection("message_deliveries").doc(deliveryDocId(evt, channel, to));
          await markFailed(ref, err);
        } catch (e2) {
          console.error(`[${channel}] failed to mark as failed`, e2);
        }
      }
    }
  }
);

// S'assure que le fichier est un module
export {};
