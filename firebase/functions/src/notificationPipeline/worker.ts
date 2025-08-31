// firebase/functions/src/notificationPipeline/worker.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { resolveLang } from "./i18n";

// 🔐 SECRETS
const EMAIL_USER = defineSecret("EMAIL_USER"); 
const EMAIL_PASS = defineSecret("EMAIL_PASS");
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");
const TWILIO_WHATSAPP_NUMBER = defineSecret("TWILIO_WHATSAPP_NUMBER");

// 📤 IMPORTS DES MODULES
import { getTemplate } from "./templates";
import { getRouting } from "./routing";
import { render } from "./render";
import { Channel, TemplatesByEvent, RoutingConfig, RoutingPerEvent } from "./types";

// IMPORTS DES PROVIDERS
import { sendZoho as sendZohoEmail } from "./providers/email/zohoSmtp";
import { sendSms as sendTwilioSms } from "./providers/sms/twilioSms";
import { sendWhatsApp as sendTwilioWhatsApp } from "./providers/whatsapp/twilio";
import { sendPush } from "./providers/push/fcm";
import { writeInApp } from "./providers/inapp/firestore";

// ----- Admin init (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ----- Types de base
type Channel = "email" | "sms" | "whatsapp" | "push" | "inapp";

type MessageEvent = {
  eventId: string;
  templateId?: string;
  locale?: string;
  to?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    fcmToken?: string;
  };
  context?: {
    user?: { 
      uid?: string; 
      email?: string; 
      phoneNumber?: string; 
      waNumber?: string;
      fcmTokens?: string[];
      preferredLanguage?: string; 
    };
    [k: string]: any;
  };
  vars?: Record<string, any>;
  channels?: Channel[];
  dedupeKey?: string;
  uid?: string;
};

// ----- Rate limiting (utilise la fonction du routing.ts)
import { isRateLimited } from "./routing";

// ----- Helpers pour sélection des canaux
function hasContact(channel: Channel, ctx: any): boolean {
  if (channel === "email") return !!(ctx?.user?.email || ctx?.to?.email);
  if (channel === "sms") return !!(ctx?.user?.phoneNumber || ctx?.to?.phone);
  if (channel === "whatsapp") return !!(ctx?.user?.waNumber || ctx?.user?.phoneNumber || ctx?.to?.whatsapp || ctx?.to?.phone);
  if (channel === "push") return !!(Array.isArray(ctx?.user?.fcmTokens) && ctx.user.fcmTokens.length > 0) || !!ctx?.to?.fcmToken;
  if (channel === "inapp") return !!(ctx?.user?.uid);
  return false;
}

function channelsToAttempt(
  routing: RoutingPerEvent,
  tmpl: TemplatesByEvent,
  ctx: any
): Channel[] {
  const all: Channel[] = ["email", "sms", "whatsapp", "push", "inapp"];
  
  // Filtre les canaux : enabled dans routing ET template, et contact disponible
  const base = all.filter(c => 
    routing.channels[c]?.enabled && 
    tmpl[c]?.enabled && 
    hasContact(c, ctx)
  );
  
  if (routing.strategy === "parallel") return base;
  
  // Pour fallback, respecter l'ordre défini
  const ord = (routing.order ?? all).filter(c => base.includes(c));
  return ord;
}

// ----- Envoi unitaire par canal
async function sendOne(channel: Channel, tmpl: TemplatesByEvent, ctx: any, evt: MessageEvent) {
  if (channel === "email") {
    const to = ctx?.user?.email || evt.to?.email;
    if (!to || !tmpl.email?.enabled) throw new Error("Missing email destination or disabled template");
    
    const subject = render(tmpl.email.subject || "", { ...ctx, ...evt.vars });
    const html = render(tmpl.email.html || "", { ...ctx, ...evt.vars });
    const text = tmpl.email.text ? render(tmpl.email.text, { ...ctx, ...evt.vars }) : undefined;
    
    return await sendZohoEmail(to, subject, html, text || html);
  }
  
  if (channel === "sms") {
    const to = ctx?.user?.phoneNumber || evt.to?.phone;
    if (!to || !tmpl.sms?.enabled) throw new Error("Missing SMS destination or disabled template");
    
    const body = render(tmpl.sms.text || "", { ...ctx, ...evt.vars });
    return await sendTwilioSms(to, body);
  }
  
  if (channel === "whatsapp") {
    const to = ctx?.user?.waNumber || ctx?.user?.phoneNumber || evt.to?.whatsapp || evt.to?.phone;
    if (!to || !tmpl.whatsapp?.enabled) throw new Error("Missing WhatsApp destination or disabled template");
    
    // Pour WhatsApp, on peut utiliser soit le templateName soit un message direct
    if (tmpl.whatsapp.templateName) {
      const params = tmpl.whatsapp.params?.map(p => render(p, { ...ctx, ...evt.vars })) || [];
      return await sendTwilioWhatsApp(to, "", tmpl.whatsapp.templateName, params);
    } else {
      const body = render(tmpl.whatsapp.templateName || "", { ...ctx, ...evt.vars });
      return await sendTwilioWhatsApp(to, body);
    }
  }
  
  if (channel === "push") {
    const token = ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken;
    if (!token || !tmpl.push?.enabled) throw new Error("Missing FCM token or disabled template");
    
    const title = render(tmpl.push.title || "", { ...ctx, ...evt.vars });
    const body = render(tmpl.push.body || "", { ...ctx, ...evt.vars });
    const data = tmpl.push.deeplink ? { deeplink: tmpl.push.deeplink } : {};
    
    await sendPush(token, title, body, data);
    return { messageId: `fcm_${Date.now()}` }; // Votre sendPush ne retourne rien
  }
  
  if (channel === "inapp") {
    const uid = ctx?.user?.uid;
    if (!uid || !tmpl.inapp?.enabled) throw new Error("Missing user ID or disabled template");
    
    const title = render(tmpl.inapp.title || "", { ...ctx, ...evt.vars });
    const body = render(tmpl.inapp.body || "", { ...ctx, ...evt.vars });
    
    return await writeInApp({ uid, title, body, eventId: evt.eventId });
  }
  
  throw new Error(`Unknown channel: ${channel}`);
}

// ----- Journalisation des livraisons
function deliveryDocId(evt: MessageEvent, channel: Channel, to: string | null): string {
  const key = evt.dedupeKey || evt.eventId || "noevent";
  const dest = (to || "none").replace(/[^\w@+]/g, "_").slice(0, 80);
  return `${key}_${channel}_${dest}`;
}

async function logDelivery(params: {
  evt: MessageEvent;
  channel: Channel;
  status: "sent" | "failed" | "queued";
  provider?: string;
  providerMessageId?: string;
  error?: string;
  to?: string;
}) {
  const { evt, channel, status, provider, providerMessageId, error, to } = params;
  const docId = deliveryDocId(evt, channel, to || null);
  const ref = db.collection("message_deliveries").doc(docId);

  const data: any = {
    eventId: evt.eventId || null,
    uid: evt.context?.user?.uid || evt.uid || null,
    channel,
    provider: provider || null,
    to: to || null,
    status,
    providerMessageId: providerMessageId || null,
    error: error || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (status === "sent") {
    data.sentAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (status === "failed") {
    data.failedAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (status === "queued") {
    data.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  // Vérifier si déjà envoyé pour éviter les doublons
  const existing = await ref.get();
  if (existing.exists) {
    const existingStatus = existing.get("status");
    if (existingStatus === "sent" && status !== "sent") {
      console.log(`[${channel}] Skipping, already sent for ${docId}`);
      return { ref, skipped: true };
    }
  }

  await ref.set(data, { merge: true });
  return { ref, skipped: false };
}

// ----- Interrupteur global
async function isMessagingEnabled(): Promise<boolean> {
  const snap = await db.doc("config/messaging").get();
  return !!(snap.exists && snap.get("enabled"));
}

// ----- Worker principal avec nouvelle logique multi-canal
export const onMessageEventCreate = onDocumentCreated(
  { 
    region: "europe-west1", 
    document: "message_events/{id}",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [EMAIL_USER, EMAIL_PASS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER]
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

    // 2) Résolution de la langue
    const lang = resolveLang(evt?.locale || evt?.context?.user?.preferredLanguage);
    console.log(`🌐 Resolved language: ${lang}`);

    // 3) Lecture du template Firestore + fallback EN
    const templates = await getTemplate(lang, evt.eventId);
    if (!templates) {
      console.warn(`⚠️  No template for ${evt.eventId} in language ${lang}`);
      return;
    }
    console.log(`✅ Template loaded for ${evt.eventId}`);

    // 4) Routing + rate-limit
    const routing = await getRouting(evt.eventId);
    
    const uidForLimit = evt?.uid || evt?.context?.user?.uid || "unknown";
    
    // Vérifier rate limit global s'il existe
    if (routing?.rate_limit_h && routing.rate_limit_h > 0) {
      const isLimited = await isRateLimited(uidForLimit, evt.eventId, routing.rate_limit_h);
      if (isLimited) {
        console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
        return;
      }
    }

    // 5) Sélection des canaux à tenter
    const context = { ...evt.context, locale: lang, to: evt.to };
    const channelsToTry = channelsToAttempt(routing, templates, { ...context, user: context.user });

    console.log(`📋 Channels to attempt: ${channelsToTry.join(", ")} (strategy: ${routing.strategy})`);

    if (channelsToTry.length === 0) {
      console.log("⚠️  No available channels for this event");
      return;
    }

    // 6) Envoi selon la stratégie
    if (routing.strategy === "parallel") {
      // Envoi en parallèle
      await Promise.all(channelsToTry.map(async (channel) => {
        try {
          console.log(`🚀 [${channel}] Starting parallel send...`);
          const result = await sendOne(channel, templates, context, evt);
          
          await logDelivery({ 
            evt, 
            channel, 
            status: "sent", 
            provider: routing.channels[channel]?.provider || "default",
            providerMessageId: (result as any)?.messageId || (result as any)?.sid || null,
            to: getDestinationForChannel(channel, context, evt)
          });
          
          console.log(`✅ [${channel}] Sent successfully`);
        } catch (e: any) {
          console.error(`❌ [${channel}] Send failed:`, e.message);
          await logDelivery({ 
            evt, 
            channel, 
            status: "failed", 
            provider: routing.channels[channel]?.provider || "default",
            error: e?.message || "Unknown error",
            to: getDestinationForChannel(channel, context, evt)
          });
        }
      }));
    } else {
      // Envoi en fallback
      let success = false;
      for (const channel of channelsToTry) {
        if (success) break;
        
        try {
          console.log(`🚀 [${channel}] Starting fallback send...`);
          const result = await sendOne(channel, templates, context, evt);
          
          await logDelivery({ 
            evt, 
            channel, 
            status: "sent", 
            provider: routing.channels[channel]?.provider || "default",
            providerMessageId: (result as any)?.messageId || (result as any)?.sid || null,
            to: getDestinationForChannel(channel, context, evt)
          });
          
          console.log(`✅ [${channel}] Sent successfully - stopping fallback chain`);
          success = true;
        } catch (e: any) {
          console.error(`❌ [${channel}] Send failed, trying next:`, e.message);
          await logDelivery({ 
            evt, 
            channel, 
            status: "failed", 
            provider: routing.channels[channel]?.provider || "default",
            error: e?.message || "Unknown error",
            to: getDestinationForChannel(channel, context, evt)
          });
        }
      }
      
      if (!success) {
        console.error("💥 All channels failed for fallback strategy");
      }
    }

    console.log(`🎉 Event ${evt.eventId} processing completed`);
  }
);

// Helper pour récupérer la destination selon le canal
function getDestinationForChannel(channel: Channel, ctx: any, evt: MessageEvent): string | undefined {
  switch (channel) {
    case "email":
      return ctx?.user?.email || evt.to?.email;
    case "sms":
      return ctx?.user?.phoneNumber || evt.to?.phone;
    case "whatsapp":
      return ctx?.user?.waNumber || ctx?.user?.phoneNumber || evt.to?.whatsapp || evt.to?.phone;
    case "push":
      return (ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken)?.slice(0, 20) + "...";
    case "inapp":
      return ctx?.user?.uid;
    default:
      return undefined;
  }
}

export {};