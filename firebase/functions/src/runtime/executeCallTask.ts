// firebase/functions/src/runtime/executeCallTask.ts
import { Request, Response } from "express";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { getTwilioClient, getTwilioPhoneNumber } from "../lib/twilio";
import { beginOutboundCallForSession } from "../services/twilioCallManagerAdapter";

// --- Secrets (v2) ---
export const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");
// Même si ces valeurs sont lues dans d'autres modules, on les "monte" ici
// pour que Functions v2 injecte bien les secrets à l'exécution.
export const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
export const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

// --- Ton handler existant (inchangé) ---
export async function runExecuteCallTask(req: Request, res: Response): Promise<void> {
  try {
    // 1) Auth Cloud Tasks
    const header = req.get("X-Task-Auth") || "";
    if (header !== (TASKS_AUTH_SECRET.value() || "")) {
      res.status(401).send("Unauthorized");
      return;
    }

    // 2) Payload minimal
    const { callSessionId } = (req as any).body || {};
    if (!callSessionId) {
      res.status(400).send("Missing callSessionId");
      return;
    }

    // 3) Lazy init Twilio (via secrets v2)
    const twilio = getTwilioClient();
    const fromNumber = getTwilioPhoneNumber();

    // 4) Lancer l'appel
    await beginOutboundCallForSession({ callSessionId, twilio, fromNumber });

    res.status(200).send({ ok: true, callSessionId });
    return;
  } catch (e) {
    console.error("[executeCallTask] error:", e);
    res.status(500).send("Internal error");
    return;
  }
}

// --- LA PARTIE IMPORTANTE : l’enveloppe v2 avec le parallélisme ---
export const executeCallTask = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
    maxInstances: 100,   // nb max d’instances simultanées
    concurrency: 80,     // nb de requêtes traitées en parallèle par instance
    secrets: [
      TASKS_AUTH_SECRET,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
    ],
  },
  // on réutilise ton handler tel quel
  (req, res) => runExecuteCallTask(req as Request, res as Response)
);
