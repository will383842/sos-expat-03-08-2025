// firebase/functions/src/admin/callables.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) initializeApp();

/** Autorise UNIQUEMENT les comptes avec claim { admin: true } */
function assertAdmin(ctx: any) {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;
  if (!uid) throw new HttpsError("unauthenticated", "Auth requise.");
  if (!claims?.admin) throw new HttpsError("permission-denied", "Réservé aux admins.");
}

/** 1) LISTE les IDs d'événements pour un locale donné */
export const admin_templates_list = onCall({ cors: true }, async (req) => {
  assertAdmin(req);
  const { locale } = req.data || {};
  if (!locale || !["fr-FR", "en"].includes(locale)) {
    throw new HttpsError("invalid-argument", "locale doit être 'fr-FR' ou 'en'.");
  }
  const db = getFirestore();
  const snap = await db.collection(`message_templates/${locale}/items`).select().get();
  const eventIds = snap.docs.map((d) => d.id).sort();
  return { eventIds };
});

/** 2) GET: récupère un template pour (locale, eventId) */
export const admin_templates_get = onCall({ cors: true }, async (req) => {
  assertAdmin(req);
  const { locale, eventId } = req.data || {};
  if (!locale || !eventId) {
    throw new HttpsError("invalid-argument", "locale et eventId sont requis.");
  }
  const db = getFirestore();
  const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
  const doc = await ref.get();
  if (!doc.exists) return { exists: false };
  return { exists: true, data: doc.data() };
});

/** Types simples pour valider grossièrement le payload */
type EmailTpl = { subject: string; html: string; text?: string };
type SmsTpl = { text: string };
type PushTpl = { title: string; body: string; deeplink?: string };
type TemplatePayload = { email?: EmailTpl; sms?: SmsTpl; push?: PushTpl };

/** 3) UPSERT: crée/merge un template (locale, eventId) */
export const admin_templates_upsert = onCall({ cors: true }, async (req) => {
  assertAdmin(req);
  const { locale, eventId, payload } = req.data || {};
  if (!locale || !eventId || !payload) {
    throw new HttpsError("invalid-argument", "locale, eventId, payload requis.");
  }
  if (payload.email && (!payload.email.subject || !payload.email.html)) {
    throw new HttpsError(
      "invalid-argument",
      "email.subject et email.html sont requis quand email est fourni."
    );
  }
  const db = getFirestore();
  const ref = db.doc(`message_templates/${locale}/items/${eventId}`);
  await ref.set(payload as TemplatePayload, { merge: true });
  return { ok: true };
});

/** 4) ROUTING GET: lit le doc unique message_routing/config */
export const admin_routing_get = onCall({ cors: true }, async (req) => {
  assertAdmin(req);
  const db = getFirestore();
  const ref = db.doc("message_routing/config");
  const doc = await ref.get();
  if (!doc.exists) return { exists: false, data: { events: {} } };
  return { exists: true, data: doc.data() };
});

/** Définition d'une entrée de routing */
type RoutingEntry = {
  channels: ("email" | "sms" | "push" | "whatsapp" | "inapp")[];
  rate_limit_h?: number;
  delays?: Record<string, number>; // ex: { email: 0, sms: 15 }
};

/** 5) ROUTING UPSERT: merge une entrée de routing pour un eventId */
export const admin_routing_upsert = onCall({ cors: true }, async (req) => {
  assertAdmin(req);
  const { eventId, channels, rate_limit_h, delays } = req.data || {};
  if (!eventId || !Array.isArray(channels) || channels.length === 0) {
    throw new HttpsError("invalid-argument", "eventId et channels (non vide) requis.");
  }
  const entry: RoutingEntry = {
    channels,
    rate_limit_h: Number(rate_limit_h) || 0,
    delays: delays || {},
  };
  const db = getFirestore();
  await db.doc("message_routing/config").set({ events: { [eventId]: entry } }, { merge: true });
  return { ok: true };
});

/** 6) TEST SEND: crée un doc message_events de test que le worker va traiter */
export const admin_testSend = onCall({ cors: true }, async (req) => {
  assertAdmin(req);
  const { locale, eventId, to, context } = req.data || {};
  if (!eventId) throw new HttpsError("invalid-argument", "eventId requis.");
  const loc = (locale && String(locale).toLowerCase().startsWith("fr")) ? "fr-FR" : "en";

  // Construit un contexte minimal avec l'email destination attendu par le provider email
  const ctx = {
    ...context,
    user: {
      email: to || context?.user?.email || "test@example.com",
      preferredLanguage: loc,
      ...context?.user,
    },
  };

  const db = getFirestore();
  await db.collection("message_events").add({
    eventId,
    uid: context?.uid || "ADMIN_TEST",
    locale: loc,
    context: ctx,
    createdAt: new Date().toISOString(),
    source: "admin_testSend",
  });
  return { ok: true };
});

// ---- SEED DES TEMPLATES & ROUTING ----
import * as fs from "node:fs";
import * as path from "node:path";

export const admin_templates_seed = onCall({ cors: true }, async (req) => {
  assertAdmin(req); // réutilise la même fonction assertAdmin de ce fichier

  const db = getFirestore();

  // charge les JSON depuis src/assets
  const assetsDir = path.join(__dirname, "..", "assets");
  const fr = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-templates-fr.json"), "utf8"));
  const en = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-templates-en.json"), "utf8"));
  const routing = JSON.parse(fs.readFileSync(path.join(assetsDir, "sos-expat-message-routing.json"), "utf8"));

  // upsert routing
  await db.doc("message_routing/config").set(routing, { merge: true });

  // upsert templates FR
  for (const [eventId, payload] of Object.entries<any>(fr.items || {})) {
    await db.doc(`message_templates/fr-FR/items/${eventId}`).set(payload, { merge: true });
  }
  // upsert templates EN
  for (const [eventId, payload] of Object.entries<any>(en.items || {})) {
    await db.doc(`message_templates/en/items/${eventId}`).set(payload, { merge: true });
  }

  return { ok: true, frCount: Object.keys(fr.items || {}).length, enCount: Object.keys(en.items || {}).length };
});
