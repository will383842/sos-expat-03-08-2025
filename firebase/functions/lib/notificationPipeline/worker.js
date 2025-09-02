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
const TWILIO_WHATSAPP_NUMBER = (0, params_1.defineSecret)("TWILIO_WHATSAPP_NUMBER");
// 📤 IMPORTS DES MODULES
const templates_1 = require("./templates");
const routing_1 = require("./routing");
const render_1 = require("./render");
// IMPORTS DES PROVIDERS
const zohoSmtp_1 = require("./providers/email/zohoSmtp");
const twilioSms_1 = require("./providers/sms/twilioSms");
const twilio_1 = require("./providers/whatsapp/twilio");
const fcm_1 = require("./providers/push/fcm");
const firestore_2 = require("./providers/inapp/firestore");
// ➕ NORMALISATION D'EVENTID
function normalizeEventId(id) {
    if (id === 'whatsapp_provider_booking_request')
        return 'request.created.provider';
    return id.replace(/^whatsapp_/, '').replace(/^sms_/, '');
}
// ----- Admin init (idempotent)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ----- Helpers pour sélection des canaux
function hasContact(channel, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (channel === "email")
        return !!(((_a = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _a === void 0 ? void 0 : _a.email) || ((_b = ctx === null || ctx === void 0 ? void 0 : ctx.to) === null || _b === void 0 ? void 0 : _b.email));
    if (channel === "sms")
        return !!(((_c = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _c === void 0 ? void 0 : _c.phoneNumber) || ((_d = ctx === null || ctx === void 0 ? void 0 : ctx.to) === null || _d === void 0 ? void 0 : _d.phone));
    if (channel === "whatsapp")
        return !!(((_e = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _e === void 0 ? void 0 : _e.waNumber) || ((_f = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _f === void 0 ? void 0 : _f.phoneNumber) || ((_g = ctx === null || ctx === void 0 ? void 0 : ctx.to) === null || _g === void 0 ? void 0 : _g.whatsapp) || ((_h = ctx === null || ctx === void 0 ? void 0 : ctx.to) === null || _h === void 0 ? void 0 : _h.phone));
    if (channel === "push")
        return !!(Array.isArray((_j = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _j === void 0 ? void 0 : _j.fcmTokens) && ctx.user.fcmTokens.length > 0) || !!((_k = ctx === null || ctx === void 0 ? void 0 : ctx.to) === null || _k === void 0 ? void 0 : _k.fcmToken);
    if (channel === "inapp")
        return !!((_l = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _l === void 0 ? void 0 : _l.uid);
    return false;
}
function channelsToAttempt(strategy, order, routeChannels, tmpl, ctx) {
    const all = ["email", "push", "sms", "whatsapp", "inapp"];
    const base = all.filter(c => {
        var _a, _b;
        return ((_a = routeChannels[c]) === null || _a === void 0 ? void 0 : _a.enabled) &&
            ((_b = tmpl[c]) === null || _b === void 0 ? void 0 : _b.enabled) &&
            hasContact(c, ctx);
    });
    if (strategy === "parallel")
        return base;
    const ord = (order !== null && order !== void 0 ? order : all).filter(c => base.includes(c));
    return ord;
}
// ----- Envoi unitaire par canal
async function sendOne(channel, provider, tmpl, ctx, evt) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    if (channel === 'whatsapp') {
        return { skipped: true, reason: 'whatsapp_disabled' };
    }
    if (channel === "email") {
        const to = ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _a === void 0 ? void 0 : _a.email) || ((_b = evt.to) === null || _b === void 0 ? void 0 : _b.email);
        if (!to || !((_c = tmpl.email) === null || _c === void 0 ? void 0 : _c.enabled))
            throw new Error("Missing email destination or disabled template");
        const subject = (0, render_1.render)(tmpl.email.subject || "", Object.assign(Object.assign({}, ctx), evt.vars));
        const html = (0, render_1.render)(tmpl.email.html || "", Object.assign(Object.assign({}, ctx), evt.vars));
        const text = tmpl.email.text ? (0, render_1.render)(tmpl.email.text, Object.assign(Object.assign({}, ctx), evt.vars)) : undefined;
        const messageId = await (0, zohoSmtp_1.sendZoho)(to, subject, html, text || html);
        return { messageId };
    }
    if (channel === "sms") {
        const to = ((_d = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _d === void 0 ? void 0 : _d.phoneNumber) || ((_e = evt.to) === null || _e === void 0 ? void 0 : _e.phone);
        if (!to || !((_f = tmpl.sms) === null || _f === void 0 ? void 0 : _f.enabled))
            throw new Error("Missing SMS destination or disabled template");
        const body = (0, render_1.render)(tmpl.sms.text || "", Object.assign(Object.assign({}, ctx), evt.vars));
        const sid = await (0, twilioSms_1.sendSms)(to, body);
        return { sid };
    }
    if (channel === "whatsapp") {
        const to = ((_g = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _g === void 0 ? void 0 : _g.waNumber) || ((_h = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _h === void 0 ? void 0 : _h.phoneNumber) || ((_j = evt.to) === null || _j === void 0 ? void 0 : _j.whatsapp) || ((_k = evt.to) === null || _k === void 0 ? void 0 : _k.phone);
        if (!to || !((_l = tmpl.whatsapp) === null || _l === void 0 ? void 0 : _l.enabled))
            throw new Error("Missing WhatsApp destination or disabled template");
        // Pour WhatsApp, on peut utiliser soit le templateName soit un message direct
        if (tmpl.whatsapp.templateName) {
            const params = ((_m = tmpl.whatsapp.params) === null || _m === void 0 ? void 0 : _m.map(p => (0, render_1.render)(String(p), Object.assign(Object.assign({}, ctx), evt.vars)))) || [];
            const sid = await (0, twilio_1.sendWhatsApp)(to, ""); // Template WhatsApp géré par Twilio
            return { sid };
        }
        else {
            const body = (0, render_1.render)(tmpl.whatsapp.templateName || "", Object.assign(Object.assign({}, ctx), evt.vars));
            const sid = await (0, twilio_1.sendWhatsApp)(to, body);
            return { sid };
        }
    }
    if (channel === "push") {
        const token = ((_p = (_o = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _o === void 0 ? void 0 : _o.fcmTokens) === null || _p === void 0 ? void 0 : _p[0]) || ((_q = evt.to) === null || _q === void 0 ? void 0 : _q.fcmToken);
        if (!token || !((_r = tmpl.push) === null || _r === void 0 ? void 0 : _r.enabled))
            throw new Error("Missing FCM token or disabled template");
        const title = (0, render_1.render)(tmpl.push.title || "", Object.assign(Object.assign({}, ctx), evt.vars));
        const body = (0, render_1.render)(tmpl.push.body || "", Object.assign(Object.assign({}, ctx), evt.vars));
        const data = tmpl.push.deeplink ? { deeplink: tmpl.push.deeplink } : {};
        await (0, fcm_1.sendPush)(token, title, body, data);
        return { messageId: `fcm_${Date.now()}` };
    }
    if (channel === "inapp") {
        const uid = (_s = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _s === void 0 ? void 0 : _s.uid;
        if (!uid || !((_t = tmpl.inapp) === null || _t === void 0 ? void 0 : _t.enabled))
            throw new Error("Missing user ID or disabled template");
        const title = (0, render_1.render)(tmpl.inapp.title || "", Object.assign(Object.assign({}, ctx), evt.vars));
        const body = (0, render_1.render)(tmpl.inapp.body || "", Object.assign(Object.assign({}, ctx), evt.vars));
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
    secrets: [EMAIL_USER, EMAIL_PASS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER]
}, async (event) => {
    var _a, _b, _c, _d, _e;
    // 0) Interrupteur global
    const enabled = await isMessagingEnabled();
    if (!enabled) {
        console.log("🔒 Messaging disabled: ignoring event");
        return;
    }
    // 1) Récupérer l'événement
    const evt = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!evt) {
        console.log("❌ No event payload, abort");
        return;
    }
    console.log(`📨 Processing event: ${evt.eventId} | Locale: ${evt.locale || "auto"}`);
    // 2) Résolution de la langue
    const lang = (0, i18n_1.resolveLang)((evt === null || evt === void 0 ? void 0 : evt.locale) || ((_c = (_b = evt === null || evt === void 0 ? void 0 : evt.context) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.preferredLanguage));
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
    const uidForLimit = (evt === null || evt === void 0 ? void 0 : evt.uid) || ((_e = (_d = evt === null || evt === void 0 ? void 0 : evt.context) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.uid) || "unknown";
    // Vérifier rate limit global s'il existe
    const globalRateLimit = Math.max(...Object.values(routing.channels).map(c => c.rateLimitH));
    if (globalRateLimit > 0) {
        const isLimited = await (0, routing_1.isRateLimited)(uidForLimit, evt.eventId, globalRateLimit);
        if (isLimited) {
            console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
            return;
        }
    }
    // 5) Sélection des canaux à tenter
    const context = Object.assign(Object.assign({}, evt.context), { locale: lang, to: evt.to });
    const channelsToTry = channelsToAttempt(routing.strategy, routing.order, routing.channels, templates, Object.assign(Object.assign({}, context), { user: context.user }));
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
                    messageId: result === null || result === void 0 ? void 0 : result.messageId,
                    sid: result === null || result === void 0 ? void 0 : result.sid,
                    to: getDestinationForChannel(channel, context, evt),
                    uid: uidForLimit
                });
                console.log(`✅ [${channel}] Sent successfully`);
            }
            catch (e) {
                console.error(`❌ [${channel}] Send failed:`, e.message);
                await logDelivery({
                    eventId: evt.eventId,
                    channel,
                    status: "failed",
                    provider: routing.channels[channel].provider,
                    error: (e === null || e === void 0 ? void 0 : e.message) || "Unknown error",
                    to: getDestinationForChannel(channel, context, evt),
                    uid: uidForLimit
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
                    messageId: result === null || result === void 0 ? void 0 : result.messageId,
                    sid: result === null || result === void 0 ? void 0 : result.sid,
                    to: getDestinationForChannel(channel, context, evt),
                    uid: uidForLimit
                });
                console.log(`✅ [${channel}] Sent successfully - stopping fallback chain`);
                success = true;
            }
            catch (e) {
                console.error(`❌ [${channel}] Send failed, trying next:`, e.message);
                await logDelivery({
                    eventId: evt.eventId,
                    channel,
                    status: "failed",
                    provider: routing.channels[channel].provider,
                    error: (e === null || e === void 0 ? void 0 : e.message) || "Unknown error",
                    to: getDestinationForChannel(channel, context, evt),
                    uid: uidForLimit
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    switch (channel) {
        case "email":
            return ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _a === void 0 ? void 0 : _a.email) || ((_b = evt.to) === null || _b === void 0 ? void 0 : _b.email);
        case "sms":
            return ((_c = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _c === void 0 ? void 0 : _c.phoneNumber) || ((_d = evt.to) === null || _d === void 0 ? void 0 : _d.phone);
        case "whatsapp":
            return ((_e = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _e === void 0 ? void 0 : _e.waNumber) || ((_f = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _f === void 0 ? void 0 : _f.phoneNumber) || ((_g = evt.to) === null || _g === void 0 ? void 0 : _g.whatsapp) || ((_h = evt.to) === null || _h === void 0 ? void 0 : _h.phone);
        case "push":
            return ((_m = (((_k = (_j = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _j === void 0 ? void 0 : _j.fcmTokens) === null || _k === void 0 ? void 0 : _k[0]) || ((_l = evt.to) === null || _l === void 0 ? void 0 : _l.fcmToken))) === null || _m === void 0 ? void 0 : _m.slice(0, 20)) + "...";
        case "inapp":
            return (_o = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _o === void 0 ? void 0 : _o.uid;
        default:
            return undefined;
    }
}
//# sourceMappingURL=worker.js.map