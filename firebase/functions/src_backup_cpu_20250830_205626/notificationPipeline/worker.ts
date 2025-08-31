// firebase/functions/src/notificationPipeline/worker.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

// 🔐 SECRETS AJOUTÉS (alignés avec les providers Twilio)
const EMAIL_FROM = defineSecret("EMAIL_FROM");
const EMAIL_USER = defineSecret("EMAIL_USER"); 
const EMAIL_PASS = defineSecret("EMAIL_PASS");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");
const TWILIO_WHATSAPP_NUMBER = defineSecret("TWILIO_WHATSAPP_NUMBER");

// 📤 IMPORTS DES MODULES TEMPLATES, ROUTING & RENDU
import { getTemplate } from "./templates";
import { getRouting } from "./routing";
import { render } from "./render";

// ----- Admin init (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ----- Types de base
type Channel = "email" | "sms" | "whatsapp" | "push" | "inapp";

type MessageEvent = {
  eventId: string;
  templateId?: string;  // Optionnel pour compatibilité
  locale?: string;
  to?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    fcmToken?: string;
  };
  context?: {
    user?: { uid?: string; email?: string; phoneNumber?: string; preferredLanguage?: string };
    [k: string]: any;
  };
  vars?: Record<string, any>;
  channels?: Channel[];
  dedupeKey?: string;
  uid?: string; // UID direct sur l'event
};

// ----- Utilitaire de rendu simple (fallback si pas de système avancé)
function renderSimple(tpl: string | undefined, ctx: any): string {
  if (!tpl) return "";
  return tpl.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    const path = k.trim().split(".");
    let v = ctx;
    for (const p of path) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

// ----- Idempotence + journalisation (même logique qu'avant)
function deliveryDocId(evt: MessageEvent, channel: Channel, to: string | null): string {
  const key = evt.dedupeKey || evt.eventId || "noevent";
  const dest = (to || "none").replace(/[^\w@+]/g, "_").slice(0, 80);
  return `${key}_${channel}_${dest}`;
}

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

// ----- Providers (même logique qu'avant)
async function sendEmailZoho(to: string, subject: string, html: string, text: string) {
  const { sendZoho } = await import("./providers/email/zohoSmtp");
  return await sendZoho(to, subject, html, text);
}

async function sendSmsTwilio(toE164: string, body: string) {
  const { sendSms } = await import("./providers/sms/twilioSms");
  return await sendSms(toE164, body);
}

async function sendWhatsappTwilio(toE164: string, body: string) {
  const { sendWhatsApp } = await import("./providers/whatsapp/twilio");
  const sid = await sendWhatsApp(toE164, body);
  return { sid };
}

async function sendPushFcm(token: string, title: string, body: string, data?: Record<string, string>) {
  const message: admin.messaging.Message = {
    token,
    notification: { title, body },
    data,
  };
  const res = await admin.messaging().send(message);
  return { messageId: res };
}

// ----- Interrupteur global (même logique qu'avant)
async function isMessagingEnabled(): Promise<boolean> {
  const snap = await db.doc("config/messaging").get();
  return !!(snap.exists && snap.get("enabled"));
}

// ----- Worker principal avec logique complète intégrée
export const onMessageEventCreate = onDocumentCreated(
  { 
    region: "europe-west1", 
    document: "message_events/{id}",
    memory: "512MiB",
    timeoutSeconds: 120
  },
  async (event) => {
    // 0) Interrupteur global
    const enabled = await isMessagingEnabled();
    if (!enabled) {
      console.log("🔒 Messaging disabled: ignoring event");
      return;
    }

    // 1) Récupérer l'événement
    const evt = event.data?.data() as MessageEvent | undefined;
    if (!evt) {
      console.log("❌ No event payload, abort");
      return;
    }

    console.log(`📨 Processing event: ${evt.eventId} | Locale: ${evt.locale || "auto"}`);

    // 2) 📤 NOUVEAUTÉ : Résolution de la langue
    const lang = resolveLang(evt?.locale || evt?.context?.user?.preferredLanguage);
    console.log(`🌐 Resolved language: ${lang}`);

    // 3) 📤 NOUVEAUTÉ : Lecture du template Firestore + fallback EN
    const tpl = await getTemplate(lang, evt.eventId);
    if (!tpl) {
      console.warn(`⚠️  No template for ${evt.eventId} in language ${lang}`);
      return;
    }
    console.log(`✅ Template loaded for ${evt.eventId}`);

    // 4) 📤 NOUVEAUTÉ : Routing + rate-limit
    const routing = await getRouting(evt.eventId);
    const channels = Array.isArray(routing?.channels) && routing.channels.length
      ? routing.channels
      : ["email"];
    
    const uidForLimit = evt?.uid || evt?.context?.user?.uid || "unknown";
    if (routing?.rate_limit_h && routing.rate_limit_h > 0) {
      const isLimited = await isRateLimited(uidForLimit, evt.eventId, routing.rate_limit_h);
      if (isLimited) {
        console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
        return;
      }
    }
    console.log(`📋 Channels to process: ${channels.join(", ")}`);

    // 5) 📤 NOUVEAUTÉ : Rendu avec helpers
    const ctx = { ...evt.context, locale: lang };
    const subject = render(tpl.email.subject, ctx);
    const html = render(tpl.email.html, ctx);
    const text = tpl.email.text ? render(tpl.email.text, ctx) : undefined;

    // 6) Envoi par canal avec idempotence + journaux
    for (const channel of channels) {
      try {
        if (channel === "email") {
          const to = evt.to?.email || evt.context?.user?.email || null;
          if (!to) { 
            console.log("📧 [email] No destination"); 
            continue; 
          }

          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (already) continue;

          const res = await sendEmailZoho(to, subject, html, text || html);
          await markSent(ref, (res as any)?.messageId ?? null);
          console.log(`✅ [email] Sent to ${to}`);
        }

        if (channel === "sms") {
          const to = evt.to?.phone || evt.context?.user?.phoneNumber || null;
          const smsBody = tpl.sms ? render(tpl.sms, ctx) : text || subject;
          if (!to || !smsBody) { 
            console.log("📱 [sms] Missing destination/body"); 
            continue; 
          }

          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (already) continue;

          const res = await sendSmsTwilio(to, smsBody);
          await markSent(ref, (res as any)?.sid ?? null);
          console.log(`✅ [sms] Sent to ${to}`);
        }

        if (channel === "whatsapp") {
          const to = evt.to?.whatsapp || evt.to?.phone || evt.context?.user?.phoneNumber || null;
          const waBody = tpl.whatsapp ? render(tpl.whatsapp, ctx) : text || subject;
          if (!to || !waBody) { 
            console.log("💬 [whatsapp] Missing destination/body"); 
            continue; 
          }

          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (already) continue;

          const res = await sendWhatsappTwilio(to, waBody);
          await markSent(ref, (res as any)?.sid ?? null);
          console.log(`✅ [whatsapp] Sent to ${to}`);
        }

        if (channel === "push") {
          const token = evt.to?.fcmToken || null;
          const pushTitle = tpl.push?.title ? render(tpl.push.title, ctx) : subject;
          const pushBody = tpl.push?.body ? render(tpl.push.body, ctx) : text || html;
          if (!token || !pushTitle || !pushBody) { 
            console.log("🔔 [push] Missing token/title/body"); 
            continue; 
          }

          const { ref, already } = await enqueueDelivery({ evt, channel, to: token });
          if (already) continue;

          const res = await sendPushFcm(token, pushTitle, pushBody, {});
          await markSent(ref, (res as any)?.messageId ?? null);
          console.log(`✅ [push] Sent to ${token.slice(0, 20)}...`);
        }

        if (channel === "inapp") {
          const to = evt.context?.user?.uid || null;
          const { ref, already } = await enqueueDelivery({ evt, channel, to });
          if (!already) {
            await db.collection("inapp_messages").add({
              uid: to,
              eventId: evt.eventId,
              title: subject || "",
              body: text || html || "",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readAt: null,
            });
            await markSent(ref, null);
            console.log(`✅ [inapp] Sent to user ${to}`);
          }
        }
      } catch (err) {
        console.error(`❌ [${channel}] send failed`, err);
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
          console.error(`❌ [${channel}] failed to mark as failed`, e2);
        }
      }
    }

    console.log(`🎉 Event ${evt.eventId} processing completed`);
  }
);

export {};