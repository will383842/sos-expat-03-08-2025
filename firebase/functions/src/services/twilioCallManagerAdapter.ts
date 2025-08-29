// firebase/functions/src/services/twilioCallManagerAdapter.ts
import { getFirestore } from "firebase-admin/firestore";
import { getTwilioClient } from "../lib/twilio";
import { getFunctionsBaseUrl } from "../utils/urlBase"; // crÃ©ons ce helper juste aprÃ¨s
// âš ï¸ Importe ton manager rÃ©el (chemin/nom Ã  ajuster selon ton repo)
import { TwilioCallManager } from "../TwilioCallManager";

export async function beginOutboundCallForSession({
  callSessionId,
  twilio,
  fromNumber,
}: {
  callSessionId: string;
  twilio: ReturnType<typeof getTwilioClient>;
  fromNumber: string;
}) {
  const db = getFirestore();

// 1) Try snake_case (front/scheduler actuel)
let snap = await db.collection("call_sessions").doc(callSessionId).get();

// 2) Fallback éventuel sur l’ancienne collection (compat)
if (!snap.exists) {
  snap = await db.collection("callSessions").doc(callSessionId).get();
}
if (!snap.exists) throw new Error(`Session ${callSessionId} introuvable`);

const s: any = snap.data() || {};

// ✅ Vérifier le paiement avant de continuer
const paymentStatus = s?.payment?.status ?? null;
if (paymentStatus && paymentStatus !== "authorized") {
  throw new Error(`Paiement non autorisé (status=${paymentStatus})`);
}
// Numéros acceptés (plat OU imbriqué)
const clientPhone =
  s.clientPhone ??
  s?.participants?.client?.phone ??
  s?.client?.phone ??
  null;

const providerPhone =
  s.providerPhone ??
  s?.participants?.provider?.phone ??
  s?.provider?.phone ??
  null;

const toNumber = clientPhone ?? providerPhone;
if (!toNumber) throw new Error("Aucun numéro (client/provider) trouvé");

const base = getFunctionsBaseUrl();
const statusCallback = `${base}/twilioCallWebhook`;
const connectUrl = `${base}/twiml/connectProvider?sessionId=${callSessionId}`;

const call = await TwilioCallManager.startOutboundCall({
  from: fromNumber,
  to: toNumber,
  url: connectUrl,
  statusCallback,
});

if (!call?.sid) throw new Error("TwilioCallManager.startOutboundCall n'a pas renvoyé de sid");

await snap.ref.update({
  twilioCallSid: call.sid,
  status: "calling",
  startedAt: new Date().toISOString(),
});

return call.sid;


  if (!call?.sid) {
    throw new Error("TwilioCallManager.startOutboundCall n'a pas renvoyÃ© de sid");
  }

  await snap.ref.update({
    twilioCallSid: call.sid,
    status: "calling",
    startedAt: new Date().toISOString(),
  });

  return call.sid;
}


