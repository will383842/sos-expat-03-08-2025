// src/admin/callables.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "node:fs";
import * as path from "node:path";

// ⚠️ Pas de setGlobalOptions ici (il est unique dans src/index.ts)

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

type RoutingFile = {
  version?: number;
  routing?: unknown;
  [k: string]: unknown;
};

type TemplatesFile = {
  defaults?: Record<string, unknown>;
  templates?: Array<{ id: string; [k: string]: unknown }>;
  [k: string]: unknown;
};

export const admin_templates_seed = onCall(async (_req) => {
  const dir = path.join(__dirname, "..", "assets");

  // Vérification basique de présence des fichiers
  const routingPath = path.join(dir, "sos-expat-message-routing.json");
  const frPath = path.join(dir, "sos-expat-message-templates-fr.json");
  const enPath = path.join(dir, "sos-expat-message-templates-en.json");

  if (![routingPath, frPath, enPath].every((p) => fs.existsSync(p))) {
    throw new Error(
      `Fichiers manquants dans /assets. Requis: 
- ${path.basename(routingPath)}
- ${path.basename(frPath)}
- ${path.basename(enPath)}`
    );
  }

  const routing = JSON.parse(fs.readFileSync(routingPath, "utf8")) as RoutingFile;
  const fr = JSON.parse(fs.readFileSync(frPath, "utf8")) as TemplatesFile | Array<any>;
  const en = JSON.parse(fs.readFileSync(enPath, "utf8")) as TemplatesFile | Array<any>;

  // ROUTING
  await db
    .collection("message_routing")
    .doc("config")
    .set(
      {
        version: (routing as RoutingFile).version ?? 1,
        routing: (routing as RoutingFile).routing ?? routing,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  const writeLocale = async (locale: string, payload: TemplatesFile | Array<any>) => {
    const root = db.collection("message_templates").doc(locale);

    // _meta/defaults
    if (!Array.isArray(payload) && payload.defaults) {
      await root
        .collection("_meta")
        .doc("defaults")
        .set(
          {
            ...payload.defaults,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    const list: Array<{ id: string; [k: string]: unknown }> = Array.isArray(payload)
      ? (payload as Array<any>)
      : ((payload as TemplatesFile).templates ?? []);

    // Écriture en lot (batch) pour performance
    const batch = db.batch();
    for (const t of list) {
      if (!t?.id) continue;
      batch.set(root.collection("items").doc(String(t.id)), {
        ...t,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  };

  await writeLocale("fr-FR", fr);
  await writeLocale("en", en);

  return { ok: true };
});
