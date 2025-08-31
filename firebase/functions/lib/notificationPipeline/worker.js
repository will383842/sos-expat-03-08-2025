"use strict";
// firebase/functions/src/notificationPipeline/worker.ts
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
// 🔐 SECRETS (EMAIL_FROM supprimé)
const EMAIL_USER = (0, params_1.defineSecret)("EMAIL_USER");
const EMAIL_PASS = (0, params_1.defineSecret)("EMAIL_PASS");
const TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = (0, params_1.defineSecret)("TWILIO_PHONE_NUMBER");
const TWILIO_WHATSAPP_NUMBER = (0, params_1.defineSecret)("TWILIO_WHATSAPP_NUMBER");
// 📤 IMPORTS DES MODULES TEMPLATES, ROUTING & RENDU
const templates_1 = require("./templates");
const routing_1 = require("./routing");
const render_1 = require("./render");
// ----- Admin init (idempotent)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ----- Rate limiting
async function isRateLimited(uid, eventId, limitPerHour) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const query = db.collection("message_deliveries")
        .where("uid", "==", uid)
        .where("eventId", "==", eventId)
        .where("createdAt", ">=", oneHourAgo)
        .where("status", "in", ["sent", "delivered"]);
    const snapshot = await query.get();
    return snapshot.size >= limitPerHour;
}
// ----- Idempotence + journalisation (même logique qu'avant)
function deliveryDocId(evt, channel, to) {
    const key = evt.dedupeKey || evt.eventId || "noevent";
    const dest = (to || "none").replace(/[^\w@+]/g, "_").slice(0, 80);
    return `${key}_${channel}_${dest}`;
}
async function enqueueDelivery(params) {
    var _a, _b;
    const { evt, channel, to } = params;
    const docId = deliveryDocId(evt, channel, to);
    const ref = db.collection("message_deliveries").doc(docId);
    const nowQueued = {
        eventId: evt.eventId || null,
        uid: ((_b = (_a = evt.context) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.uid) || null,
        channel,
        to: to || null,
        status: "queued",
        providerMessageId: null,
        error: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sentAt: null,
        failedAt: null,
        deliveredAt: null
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
async function markSent(ref, providerMessageId) {
    await ref.update({
        status: "sent",
        providerMessageId: providerMessageId !== null && providerMessageId !== void 0 ? providerMessageId : null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        error: null
    });
}
async function markFailed(ref, err) {
    const msg = typeof err === "string" ? err : (err === null || err === void 0 ? void 0 : err.message) || JSON.stringify(err);
    await ref.update({
        status: "failed",
        error: String(msg),
        failedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}
// ----- Providers (même logique qu'avant)
async function sendEmailZoho(to, subject, html, text) {
    const { sendZoho } = await Promise.resolve().then(() => __importStar(require("./providers/email/zohoSmtp")));
    return await sendZoho(to, subject, html, text);
}
async function sendSmsTwilio(toE164, body) {
    const { sendSms } = await Promise.resolve().then(() => __importStar(require("./providers/sms/twilioSms")));
    return await sendSms(toE164, body);
}
async function sendWhatsappTwilio(toE164, body) {
    const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require("./providers/whatsapp/twilio")));
    const sid = await sendWhatsApp(toE164, body);
    return { sid };
}
async function sendPushFcm(token, title, body, data) {
    const message = {
        token,
        notification: { title, body },
        data
    };
    const res = await admin.messaging().send(message);
    return { messageId: res };
}
// ----- Interrupteur global (même logique qu'avant)
async function isMessagingEnabled() {
    const snap = await db.doc("config/messaging").get();
    return !!(snap.exists && snap.get("enabled"));
}
// ----- Worker principal avec logique complète intégrée
exports.onMessageEventCreate = (0, firestore_1.onDocumentCreated)({
    region: "europe-west1",
    document: "message_events/{id}",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [EMAIL_USER, EMAIL_PASS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER]
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12;
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
    // 2) 📤 NOUVEAUTÉ : Résolution de la langue
    const lang = (0, i18n_1.resolveLang)((evt === null || evt === void 0 ? void 0 : evt.locale) || ((_c = (_b = evt === null || evt === void 0 ? void 0 : evt.context) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.preferredLanguage));
    console.log(`🌐 Resolved language: ${lang}`);
    // 3) 📤 NOUVEAUTÉ : Lecture du template Firestore + fallback EN
    const tpl = await (0, templates_1.getTemplate)(lang, evt.eventId);
    if (!tpl) {
        console.warn(`⚠️  No template for ${evt.eventId} in language ${lang}`);
        return;
    }
    console.log(`✅ Template loaded for ${evt.eventId}`);
    // 4) 📤 NOUVEAUTÉ : Routing + rate-limit
    const routing = await (0, routing_1.getRouting)(evt.eventId);
    const channels = Array.isArray(routing === null || routing === void 0 ? void 0 : routing.channels) && routing.channels.length
        ? routing.channels
        : ["email"];
    const uidForLimit = (evt === null || evt === void 0 ? void 0 : evt.uid) || ((_e = (_d = evt === null || evt === void 0 ? void 0 : evt.context) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.uid) || "unknown";
    if ((routing === null || routing === void 0 ? void 0 : routing.rate_limit_h) && routing.rate_limit_h > 0) {
        const isLimited = await isRateLimited(uidForLimit, evt.eventId, routing.rate_limit_h);
        if (isLimited) {
            console.log(`🚫 Rate-limited: ${uidForLimit} for ${evt.eventId}`);
            return;
        }
    }
    console.log(`📋 Channels to process: ${channels.join(", ")}`);
    // 5) 📤 NOUVEAUTÉ : Rendu avec helpers
    const ctx = Object.assign(Object.assign({}, evt.context), { locale: lang });
    const subject = (0, render_1.render)(tpl.email.subject, ctx);
    const html = (0, render_1.render)(tpl.email.html, ctx);
    const text = tpl.email.text ? (0, render_1.render)(tpl.email.text, ctx) : undefined;
    // 6) Envoi par canal avec idempotence + journaux
    for (const channel of channels) {
        try {
            if (channel === "email") {
                const to = ((_f = evt.to) === null || _f === void 0 ? void 0 : _f.email) || ((_h = (_g = evt.context) === null || _g === void 0 ? void 0 : _g.user) === null || _h === void 0 ? void 0 : _h.email) || null;
                if (!to) {
                    console.log("📧 [email] No destination");
                    continue;
                }
                const { ref, already } = await enqueueDelivery({ evt, channel, to });
                if (already)
                    continue;
                const res = await sendEmailZoho(to, subject, html, text || html);
                await markSent(ref, (_j = res === null || res === void 0 ? void 0 : res.messageId) !== null && _j !== void 0 ? _j : null);
                console.log(`✅ [email] Sent to ${to}`);
            }
            if (channel === "sms") {
                const to = ((_k = evt.to) === null || _k === void 0 ? void 0 : _k.phone) || ((_m = (_l = evt.context) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.phoneNumber) || null;
                const smsBody = tpl.sms ? (0, render_1.render)(tpl.sms, ctx) : text || subject;
                if (!to || !smsBody) {
                    console.log("📱 [sms] Missing destination/body");
                    continue;
                }
                const { ref, already } = await enqueueDelivery({ evt, channel, to });
                if (already)
                    continue;
                const res = await sendSmsTwilio(to, smsBody);
                await markSent(ref, (_o = res === null || res === void 0 ? void 0 : res.sid) !== null && _o !== void 0 ? _o : null);
                console.log(`✅ [sms] Sent to ${to}`);
            }
            if (channel === "whatsapp") {
                const to = ((_p = evt.to) === null || _p === void 0 ? void 0 : _p.whatsapp) || ((_q = evt.to) === null || _q === void 0 ? void 0 : _q.phone) || ((_s = (_r = evt.context) === null || _r === void 0 ? void 0 : _r.user) === null || _s === void 0 ? void 0 : _s.phoneNumber) || null;
                const waBody = tpl.whatsapp ? (0, render_1.render)(tpl.whatsapp, ctx) : text || subject;
                if (!to || !waBody) {
                    console.log("💬 [whatsapp] Missing destination/body");
                    continue;
                }
                const { ref, already } = await enqueueDelivery({ evt, channel, to });
                if (already)
                    continue;
                const res = await sendWhatsappTwilio(to, waBody);
                await markSent(ref, (_t = res === null || res === void 0 ? void 0 : res.sid) !== null && _t !== void 0 ? _t : null);
                console.log(`✅ [whatsapp] Sent to ${to}`);
            }
            if (channel === "push") {
                const token = ((_u = evt.to) === null || _u === void 0 ? void 0 : _u.fcmToken) || null;
                const pushTitle = ((_v = tpl.push) === null || _v === void 0 ? void 0 : _v.title) ? (0, render_1.render)(tpl.push.title, ctx) : subject;
                const pushBody = ((_w = tpl.push) === null || _w === void 0 ? void 0 : _w.body) ? (0, render_1.render)(tpl.push.body, ctx) : text || html;
                if (!token || !pushTitle || !pushBody) {
                    console.log("🔔 [push] Missing token/title/body");
                    continue;
                }
                const { ref, already } = await enqueueDelivery({ evt, channel, to: token });
                if (already)
                    continue;
                const res = await sendPushFcm(token, pushTitle, pushBody, {});
                await markSent(ref, (_x = res === null || res === void 0 ? void 0 : res.messageId) !== null && _x !== void 0 ? _x : null);
                console.log(`✅ [push] Sent to ${token.slice(0, 20)}...`);
            }
            if (channel === "inapp") {
                const to = ((_z = (_y = evt.context) === null || _y === void 0 ? void 0 : _y.user) === null || _z === void 0 ? void 0 : _z.uid) || null;
                const { ref, already } = await enqueueDelivery({ evt, channel, to });
                if (!already) {
                    await db.collection("inapp_messages").add({
                        uid: to,
                        eventId: evt.eventId,
                        title: subject || "",
                        body: text || html || "",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        readAt: null
                    });
                    await markSent(ref, null);
                    console.log(`✅ [inapp] Sent to user ${to}`);
                }
            }
        }
        catch (err) {
            console.error(`❌ [${channel}] send failed`, err);
            try {
                const to = channel === "email" ? (((_0 = evt.to) === null || _0 === void 0 ? void 0 : _0.email) || ((_2 = (_1 = evt.context) === null || _1 === void 0 ? void 0 : _1.user) === null || _2 === void 0 ? void 0 : _2.email) || null)
                    : channel === "sms" ? (((_3 = evt.to) === null || _3 === void 0 ? void 0 : _3.phone) || ((_5 = (_4 = evt.context) === null || _4 === void 0 ? void 0 : _4.user) === null || _5 === void 0 ? void 0 : _5.phoneNumber) || null)
                        : channel === "whatsapp" ? (((_6 = evt.to) === null || _6 === void 0 ? void 0 : _6.whatsapp) || ((_7 = evt.to) === null || _7 === void 0 ? void 0 : _7.phone) || ((_9 = (_8 = evt.context) === null || _8 === void 0 ? void 0 : _8.user) === null || _9 === void 0 ? void 0 : _9.phoneNumber) || null)
                            : channel === "push" ? (((_10 = evt.to) === null || _10 === void 0 ? void 0 : _10.fcmToken) || null)
                                : (((_12 = (_11 = evt.context) === null || _11 === void 0 ? void 0 : _11.user) === null || _12 === void 0 ? void 0 : _12.uid) || null);
                const ref = db.collection("message_deliveries").doc(deliveryDocId(evt, channel, to));
                await markFailed(ref, err);
            }
            catch (e2) {
                console.error(`❌ [${channel}] failed to mark as failed`, e2);
            }
        }
    }
    console.log(`🎉 Event ${evt.eventId} processing completed`);
});
//# sourceMappingURL=worker.js.map