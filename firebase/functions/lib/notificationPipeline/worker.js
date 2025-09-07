"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessageEventCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const i18n_1 = require("./i18n");
// 🔐 SECRETS
const EMAIL_USER = (0, params_1.defineSecret)("EMAIL_USER");
const EMAIL_PASS = (0, params_1.defineSecret)("EMAIL_PASS");
const TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = (0, params_1.defineSecret)("TWILIO_PHONE_NUMBER");
const TWILIO_WHATSAPP_NUMBER = (0, params_1.defineSecret)("TWILIO_WHATSAPP_NUMBER"); // Gardé pour compatibilité/rotation, même si WA n'est pas envoyé ici.
// 📤 IMPORTS DES MODULES
const templates_1 = require("./templates");
const routing_1 = require("./routing");
const render_1 = require("./render");
// IMPORTS DES PROVIDERS
const zohoSmtp_1 = require("./providers/email/zohoSmtp");
const twilioSms_1 = require("./providers/sms/twilioSms");
// import { sendWhatsApp } from "./providers/whatsapp/twilio"; // ❌ retiré : WhatsApp non géré ici
const fcm_1 = require("./providers/push/fcm");
const firestore_2 = require("./providers/inapp/firestore");
// ➕ NORMALISATION D'EVENTID
function normalizeEventId(id) {
    if (id === "whatsapp_provider_booking_request")
        return "request.created.provider";
    return id.replace(/^whatsapp_/, "").replace(/^sms_/, "");
}
// ----- Admin init (idempotent)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ----- Helpers pour sélection des canaux
function hasContact(channel, ctx) {
    if (channel === "email")
        return !!(ctx?.user?.email || ctx?.to?.email);
    if (channel === "sms")
        return !!(ctx?.user?.phoneNumber || ctx?.to?.phone);
    // if (channel === "whatsapp") return !!(ctx?.user?.waNumber || ctx?.user?.phoneNumber || ctx?.to?.whatsapp || ctx?.to?.phone); // ❌ retiré
    if (channel === "push")
        return ((Array.isArray(ctx?.user?.fcmTokens) && (ctx.user?.fcmTokens?.length ?? 0) > 0) ||
            !!ctx?.to?.fcmToken);
    if (channel === "inapp")
        return !!ctx?.user?.uid;
    return false;
}
function channelsToAttempt(strategy, order, routeChannels, tmpl, ctx) {
    // Liste sans WhatsApp (supprimé)
    const all = ["email", "push", "sms", "inapp"];
    const base = all.filter((c) => routeChannels[c]?.enabled && tmpl[c]?.enabled && hasContact(c, ctx));
    if (strategy === "parallel")
        return base;
    const ord = (order ?? all).filter((c) => base.includes(c));
    return ord;
}
// ----- Envoi unitaire par canal
async function sendOne(channel, _provider, // <- paramètre non utilisé, préfixé pour lever TS6133
tmpl, ctx, evt) {
    if (channel === "email") {
        const to = ctx?.user?.email || evt.to?.email;
        if (!to || !tmpl.email?.enabled)
            throw new Error("Missing email destination or disabled template");
        const subject = (0, render_1.render)(tmpl.email.subject || "", { ...ctx, ...evt.vars });
        const html = (0, render_1.render)(tmpl.email.html || "", { ...ctx, ...evt.vars });
        const text = tmpl.email.text
            ? (0, render_1.render)(tmpl.email.text, { ...ctx, ...evt.vars })
            : undefined;
        const messageId = await (0, zohoSmtp_1.sendZoho)(to, subject, html, text || html);
        return { messageId };
    }
    if (channel === "sms") {
        const to = ctx?.user?.phoneNumber || evt.to?.phone;
        if (!to || !tmpl.sms?.enabled)
            throw new Error("Missing SMS destination or disabled template");
        const body = (0, render_1.render)(tmpl.sms.text || "", { ...ctx, ...evt.vars });
        const sid = await (0, twilioSms_1.sendSms)(to, body);
        return { sid };
    }
    // ❌ Branche WhatsApp complètement retirée
    // if (channel === "whatsapp") { ... }
    if (channel === "push") {
        const token = ctx?.user?.fcmTokens?.[0] || evt.to?.fcmToken;
        if (!token || !tmpl.push?.enabled)
            throw new Error("Missing FCM token or disabled template");
        const title = (0, render_1.render)(tmpl.push.title || "", { ...ctx, ...evt.vars });
        const body = (0, render_1.render)(tmpl.push.body || "", { ...ctx, ...evt.vars });
        const data = tmpl.push.deeplink
            ? { deeplink: String(tmpl.push.deeplink) }
            : {};
        await (0, fcm_1.sendPush)(token, title, body, data);
        return { messageId: `fcm_${Date.now()}` };
    }
    if (channel === "inapp") {
        const uid = ctx?.user?.uid;
        if (!uid || !tmpl.inapp?.enabled)
            throw new Error("Missing user ID or disabled template");
        const title = (0, render_1.render)(tmpl.inapp.title || "", { ...ctx, ...evt.vars });
        const body = (0, render_1.render)(tmpl.inapp.body || "", { ...ctx, ...evt.vars });
        return await (0, firestore_2.writeInApp)({ uid, title, body, eventId: evt.eventId });
    }
    throw new Error(`Unknown channel: ${channel}`);
}
// ----- Journalisation des livraisons
function deliveryDocId(evt, channel, to) {
    const key = evt.dedupeKey || evt.eventId || "noevent";
    const dest = (to || "none").replace(/[^\w@+]/g, "_").slice(0, 80);
    return `${key}_${channel}_${dest}`;
}
async function logDelivery(params) {
    const { eventId, channel, status, provider, messageId, sid, error, to, uid } = params;
    const docId = deliveryDocId({ eventId }, channel, to || null);
    const data = {
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
    }
    else if (status === "failed") {
        data.failedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    await db.collection("message_deliveries").doc(docId).set(data, { merge: true });
}
// ----- Interrupteur global
async function isMessagingEnabled() {
    const snap = await db.doc("config/messaging").get();
    return !!(snap.exists && snap.get("enabled"));
}
// ----- Worker principal
exports.onMessageEventCreate = (0, firestore_1.onDocumentCreated)({
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
}, async (event) => {
    // 0) Interrupteur global
    const enabled = await isMessagingEnabled();
    if (!enabled) {
        console.log("🔒 Messaging disabled: ignoring event");
        return;
    }
    // 1) Récupérer l'événement
    const evt = event.data?.data();
    if (!evt) {
        console.log("❌ No event payload, abort");
        return;
    }
    console.log(`📨 Processing event: ${evt.eventId} | Locale: ${evt.locale || "auto"}`);
    // 2) Résolution de la langue
    const lang = (0, i18n_1.resolveLang)(evt?.locale || evt?.context?.user?.preferredLanguage);
    console.log(`🌐 Resolved language: ${lang}`);
    // 3) Lecture du template Firestore + fallback EN
    const canonicalId = normalizeEventId(evt.eventId);
    const templates = await (0, templates_1.getTemplate)(lang, canonicalId);
    if (!templates) {
        console.warn(`⚠️  No template for ${canonicalId} in language ${lang}`);
        return;
    }
    console.log(`✅ Template loaded for ${canonicalId}`);
    // 4) Routing + rate-limit
    const routing = await (0, routing_1.getRouting)(canonicalId);
    const uidForLimit = evt?.uid || evt?.context?.user?.uid || "unknown";
    // Vérifier rate limit global s'il existe
    const globalRateLimit = Math.max(...Object.values(routing.channels).map((c) => c.rateLimitH));
    if (globalRateLimit > 0) {
        const limited = await (0, routing_1.isRateLimited)(uidForLimit, evt.eventId, globalRateLimit);
        if (limited) {
            console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
            return;
        }
    }
    // 5) Sélection des canaux à tenter
    const context = { ...(evt.context ?? {}), locale: lang, to: evt.to };
    const channelsToTry = channelsToAttempt(routing.strategy, routing.order, routing.channels, templates, { ...context, user: context.user });
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
                const result = await sendOne(channel, routing.channels[channel].provider, templates, context, evt);
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
            }
            catch (e) {
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
        }));
    }
    else {
        // Envoi en fallback
        let success = false;
        for (const channel of channelsToTry) {
            if (success)
                break;
            try {
                console.log(`🚀 [${channel}] Starting fallback send...`);
                const result = await sendOne(channel, routing.channels[channel].provider, templates, context, evt);
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
            }
            catch (e) {
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
});
// Helper pour récupérer la destination selon le canal
function getDestinationForChannel(channel, ctx, evt) {
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
//# sourceMappingURL=worker.js.map