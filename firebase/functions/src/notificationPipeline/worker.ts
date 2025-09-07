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
const TWILIO_WHATSAPP_NUMBER = defineSecret("TWILIO_WHATSAPP_NUMBER"); // Gardé pour compatibilité/rotation, même si WA n'est pas envoyé ici.

// 📤 IMPORTS DES MODULES
import { getTemplate } from "./templates";
import { getRouting, isRateLimited } from "./routing";
import { render } from "./render";
import { Channel, TemplatesByEvent, RoutingPerEvent } from "./types";

// IMPORTS DES PROVIDERS
import { sendZoho } from "./providers/email/zohoSmtp";
import { sendSms } from "./providers/sms/twilioSms";
// import { sendWhatsApp } from "./providers/whatsapp/twilio"; // ❌ retiré : WhatsApp non géré ici
import { sendPush } from "./providers/push/fcm";
import { writeInApp } from "./providers/inapp/firestore";

// ➕ NORMALISATION D'EVENTID
function normalizeEventId(id: string) {
  if (id === "whatsapp_provider_booking_request") return "request.created.provider";
  return id.replace(/^whatsapp_/, "").replace(/^sms_/, "");
}

// ----- Admin init (idempotent)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ----- Types locaux (éviter les `any`)
type UserCtx = {
  uid?: string;
  email?: string;
  phoneNumber?: string;
  waNumber?: string;
  fcmTokens?: string[];
  preferredLanguage?: string;
};

type Destinations = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  fcmToken?: string;
};

type Context = {
  user?: UserCtx;
  to?: Destinations;
  [k: string]: unknown;
};

type MessageEvent = {
  eventId: string;
  templateId?: string;
  locale?: string;
  to?: Destinations;
  context?: Context;
  vars?: Record<string, string | number | boolean | null | undefined>;
  channels?: Channel[];
  dedupeKey?: string;
  uid?: string;
};

// ----- Helpers pour sélection des canaux
function hasContact(channel: Channel, ctx: Context): boolean {
  if (channel === "email") return !!(ctx?.user?.email || ctx?.to?.email);
  if (channel === "sms") return !!(ctx?.user?.phoneNumber || ctx?.to?.phone);
  // if (channel === "whatsapp") return !!(ctx?.user?.waNumber || ctx?.user?.phoneNumber || ctx?.to?.whatsapp || ctx?.to?.phone); // ❌ retiré
  if (channel === "push")
    return (
      (Array.isArray(ctx?.user?.fcmTokens) && (ctx.user?.fcmTokens?.length ?? 0) > 0) ||
      !!ctx?.to?.fcmToken
    );
  if (channel === "inapp") return !!ctx?.user?.uid;
  return false;
}

function channelsToAttempt(
  strategy: "parallel" | "fallback",
  order: Channel[] | undefined,
  routeChannels: RoutingPerEvent["channels"],
  tmpl: TemplatesByEvent,
  ctx: Context
): Channel[] {
  // Liste sans WhatsApp (supprimé)
  const all: Channel[] = ["email", "push", "sms", "inapp"];
  const base = all.filter(
    (c) => routeChannels[c]?.enabled && tmpl[c]?.enabled && hasContact(c, ctx)
  );

  if (strategy === "parallel") return base;
  const ord = (order ?? all).filter((c) => base.includes(c));
  return ord;
}

// Résultat d'envoi unitaire
type SendResult = {
  messageId?: string;
  sid?: string;
  skipped?: boolean;
  reason?: string;
};

// ----- Envoi unitaire par canal
async function sendOne(
  channel: Channel,
  _provider: string, // <- paramètre non utilisé, préfixé pour lever TS6133
  tmpl: TemplatesByEvent,
  ctx: Context,
  evt: MessageEvent
): Promise<SendResult> {
  if (channel === "email") {
    const to = ctx?.user?.email || evt.to?.email;
    if (!to || !tmpl.email?.enabled)
      throw new Error("Missing email destination or disabled template");

    const subject = render(tmpl.email.subject || "", { ...ctx, ...evt.vars });
    const html = render(tmpl.email.html || "", { ...ctx, ...evt.vars });
    const text = tmpl.email.text
      ? render(tmpl.email.text, { ...ctx, ...evt.vars })
      : undefined;

    const messageId = await sendZoho(to, subject, html, text || html);
    return { messageId };
  }

  if (channel === "sms") {
    const to = ctx?.user?.phoneNumber || evt.to?.phone;
    if (!to || !tmpl.sms?.enabled)
      throw new Error("Missing SMS destination or disabled template");

    const body = render(tmpl.sms.text || "", { ...ctx, ...evt.vars });
    const sid = await sendSms(to, body);
    return { sid };
  }

  // ❌ Branche WhatsApp complètement retirée
  // if (channel === "whatsapp") { ... }

  if (channel === "push") {
    const token = ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken;
    if (!token || !tmpl.push?.enabled)
      throw new Error("Missing FCM token or disabled template");

    const title = render(tmpl.push.title || "", { ...ctx, ...evt.vars });
    const body = render(tmpl.push.body || "", { ...ctx, ...evt.vars });
    const data: Record<string, string> = tmpl.push.deeplink
      ? { deeplink: String(tmpl.push.deeplink) }
      : {};

    await sendPush(token, title, body, data);
    return { messageId: `fcm_${Date.now()}` };
  }

  if (channel === "inapp") {
    const uid = ctx?.user?.uid;
    if (!uid || !tmpl.inapp?.enabled)
      throw new Error("Missing user ID or disabled template");

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
  eventId: string;
  channel: Channel;
  status: "sent" | "failed";
  provider: string;
  messageId?: string;
  sid?: string;
  error?: string;
  to?: string;
  uid?: string;
}) {
  const { eventId, channel, status, provider, messageId, sid, error, to, uid } = params;
  const docId = deliveryDocId({ eventId } as MessageEvent, channel, to || null);

  const data: Record<string, unknown> = {
    eventId,
    uid: uid || null,
    channel,
    provider,
    to: to || null,
    status,
    providerMessageId: messageId || sid || null,
    error: error || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === "sent") {
    data.sentAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (status === "failed") {
    data.failedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await db.collection("message_deliveries").doc(docId).set(data, { merge: true });
}

// ----- Interrupteur global
async function isMessagingEnabled(): Promise<boolean> {
  const snap = await db.doc("config/messaging").get();
  return !!(snap.exists && snap.get("enabled"));
}

// ----- Worker principal
export const onMessageEventCreate = onDocumentCreated(
  {
    region: "europe-west1",
    document: "message_events/{id}",
    memory: "512MiB",
    timeoutSeconds: 120,
    // On laisse les secrets déclarés (même si WA est inactif) pour cohérence d'environnement
    secrets: [
      EMAIL_USER,
      EMAIL_PASS,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TWILIO_WHATSAPP_NUMBER,
    ],
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
    const canonicalId = normalizeEventId(evt.eventId);
    const templates = await getTemplate(lang, canonicalId);
    if (!templates) {
      console.warn(`⚠️  No template for ${canonicalId} in language ${lang}`);
      return;
    }
    console.log(`✅ Template loaded for ${canonicalId}`);

    // 4) Routing + rate-limit
    const routing = await getRouting(canonicalId);

    const uidForLimit = evt?.uid || evt?.context?.user?.uid || "unknown";

    // Vérifier rate limit global s'il existe
    const globalRateLimit = Math.max(...Object.values(routing.channels).map((c) => c.rateLimitH));
    if (globalRateLimit > 0) {
      const limited = await isRateLimited(uidForLimit, evt.eventId, globalRateLimit);
      if (limited) {
        console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
        return;
      }
    }

    // 5) Sélection des canaux à tenter
    const context: Context = { ...(evt.context ?? {}), locale: lang, to: evt.to };
    const channelsToTry = channelsToAttempt(
      routing.strategy,
      routing.order,
      routing.channels,
      templates,
      { ...context, user: context.user }
    );

    console.log(
      `📋 Channels to attempt: ${channelsToTry.join(", ")} (strategy: ${routing.strategy})`
    );

    if (channelsToTry.length === 0) {
      console.log("⚠️  No available channels for this event");
      return;
    }

    // 6) Envoi selon la stratégie
    if (routing.strategy === "parallel") {
      // Envoi en parallèle
      await Promise.all(
        channelsToTry.map(async (channel) => {
          try {
            console.log(`🚀 [${channel}] Starting parallel send...`);
            const result = await sendOne(
              channel,
              routing.channels[channel].provider,
              templates,
              context,
              evt
            );

            await logDelivery({
              eventId: evt.eventId,
              channel,
              status: "sent",
              provider: routing.channels[channel].provider,
              messageId: result?.messageId,
              sid: result?.sid,
              to: getDestinationForChannel(channel, context, evt),
              uid: uidForLimit,
            });

            console.log(`✅ [${channel}] Sent successfully`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error(`❌ [${channel}] Send failed:`, msg);
            await logDelivery({
              eventId: evt.eventId,
              channel,
              status: "failed",
              provider: routing.channels[channel].provider,
              error: msg,
              to: getDestinationForChannel(channel, context, evt),
              uid: uidForLimit,
            });
          }
        })
      );
    } else {
      // Envoi en fallback
      let success = false;
      for (const channel of channelsToTry) {
        if (success) break;

        try {
          console.log(`🚀 [${channel}] Starting fallback send...`);
          const result = await sendOne(
            channel,
            routing.channels[channel].provider,
            templates,
            context,
            evt
          );

          await logDelivery({
            eventId: evt.eventId,
            channel,
            status: "sent",
            provider: routing.channels[channel].provider,
            messageId: result?.messageId,
            sid: result?.sid,
            to: getDestinationForChannel(channel, context, evt),
            uid: uidForLimit,
          });

          console.log(`✅ [${channel}] Sent successfully - stopping fallback chain`);
          success = true;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          console.error(`❌ [${channel}] Send failed, trying next:`, msg);
          await logDelivery({
            eventId: evt.eventId,
            channel,
            status: "failed",
            provider: routing.channels[channel].provider,
            error: msg,
            to: getDestinationForChannel(channel, context, evt),
            uid: uidForLimit,
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
function getDestinationForChannel(
  channel: Channel,
  ctx: Context,
  evt: MessageEvent
): string | undefined {
  switch (channel) {
    case "email":
      return ctx?.user?.email || evt.to?.email;
    case "sms":
      return ctx?.user?.phoneNumber || evt.to?.phone;
    // case "whatsapp":
    //   return ctx?.user?.waNumber || ctx?.user?.phoneNumber || evt.to?.whatsapp || evt.to?.phone; // ❌ retiré
    case "push":
      return ((ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken) ?? "").slice(0, 20) + "...";
    case "inapp":
      return ctx?.user?.uid;
    default:
      return undefined;
  }
}

export {};
