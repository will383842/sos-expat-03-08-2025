import { Request, Response } from "express";
import { defineSecret } from "firebase-functions/params";
import { getTwilioClient, getTwilioPhoneNumber } from "../lib/twilio";
import { startBridgedCallForSession } from "../services/call/startBridgedCall"; // ta logique domaine
const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");

export async function runExecuteCallTask(req: Request, res: Response) {
  try {
    // Vérif header HMAC simple
    if (req.get("X-Task-Auth") !== (TASKS_AUTH_SECRET.value() || "")) {
      return res.status(401).send("Unauthorized");
    }
    const { callSessionId, taskId } = req.body || {};
    if (!callSessionId) return res.status(400).send("Missing callSessionId");

    // Lazy init Twilio
    const twilio = getTwilioClient();
    const fromNumber = getTwilioPhoneNumber();

    // Démarrer l’appel (à adapter à ton service)
    await startBridgedCallForSession({ callSessionId, twilio, fromNumber });

    return res.status(200).send({ ok: true, taskId, callSessionId });
  } catch (e) {
    console.error("[executeCallTask] error:", e);
    return res.status(500).send("Internal error");
  }
}
