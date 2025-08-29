"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCallTask = exports.TWILIO_PHONE_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = exports.TASKS_AUTH_SECRET = void 0;
exports.runExecuteCallTask = runExecuteCallTask;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const twilio_1 = require("../lib/twilio");
const twilioCallManagerAdapter_1 = require("../services/twilioCallManagerAdapter");
// --- Secrets (v2) ---
exports.TASKS_AUTH_SECRET = (0, params_1.defineSecret)("TASKS_AUTH_SECRET");
// Même si ces valeurs sont lues dans d'autres modules, on les "monte" ici
// pour que Functions v2 injecte bien les secrets à l'exécution.
exports.TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)("TWILIO_ACCOUNT_SID");
exports.TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)("TWILIO_AUTH_TOKEN");
exports.TWILIO_PHONE_NUMBER = (0, params_1.defineSecret)("TWILIO_PHONE_NUMBER");
// --- Ton handler existant (inchangé) ---
async function runExecuteCallTask(req, res) {
    try {
        // 1) Auth Cloud Tasks
        const header = req.get("X-Task-Auth") || "";
        if (header !== (exports.TASKS_AUTH_SECRET.value() || "")) {
            res.status(401).send("Unauthorized");
            return;
        }
        // 2) Payload minimal
        const { callSessionId } = req.body || {};
        if (!callSessionId) {
            res.status(400).send("Missing callSessionId");
            return;
        }
        // 3) Lazy init Twilio (via secrets v2)
        const twilio = (0, twilio_1.getTwilioClient)();
        const fromNumber = (0, twilio_1.getTwilioPhoneNumber)();
        // 4) Lancer l'appel
        await (0, twilioCallManagerAdapter_1.beginOutboundCallForSession)({ callSessionId, twilio, fromNumber });
        res.status(200).send({ ok: true, callSessionId });
        return;
    }
    catch (e) {
        console.error("[executeCallTask] error:", e);
        res.status(500).send("Internal error");
        return;
    }
}
// --- LA PARTIE IMPORTANTE : l’enveloppe v2 avec le parallélisme ---
exports.executeCallTask = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
    maxInstances: 100, // nb max d’instances simultanées
    concurrency: 80, // nb de requêtes traitées en parallèle par instance
    secrets: [
        exports.TASKS_AUTH_SECRET,
        exports.TWILIO_ACCOUNT_SID,
        exports.TWILIO_AUTH_TOKEN,
        exports.TWILIO_PHONE_NUMBER,
    ],
}, 
// on réutilise ton handler tel quel
(req, res) => runExecuteCallTask(req, res));
//# sourceMappingURL=executeCallTask.js.map