"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beginOutboundCallForSession = beginOutboundCallForSession;
// firebase/functions/src/services/twilioCallManagerAdapter.ts
const firestore_1 = require("firebase-admin/firestore");
const urlBase_1 = require("../utils/urlBase"); // crÃ©ons ce helper juste aprÃ¨s
// âš ï¸ Importe ton manager rÃ©el (chemin/nom Ã  ajuster selon ton repo)
const TwilioCallManager_1 = require("../TwilioCallManager");
async function beginOutboundCallForSession({ callSessionId, twilio, fromNumber, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const db = (0, firestore_1.getFirestore)();
    // 1) Try snake_case (front/scheduler actuel)
    let snap = await db.collection("call_sessions").doc(callSessionId).get();
    // 2) Fallback éventuel sur l’ancienne collection (compat)
    if (!snap.exists) {
        snap = await db.collection("callSessions").doc(callSessionId).get();
    }
    if (!snap.exists)
        throw new Error(`Session ${callSessionId} introuvable`);
    const s = snap.data() || {};
    // ✅ Vérifier le paiement avant de continuer
    const paymentStatus = (_b = (_a = s === null || s === void 0 ? void 0 : s.payment) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : null;
    if (paymentStatus && paymentStatus !== "authorized") {
        throw new Error(`Paiement non autorisé (status=${paymentStatus})`);
    }
    // Numéros acceptés (plat OU imbriqué)
    const clientPhone = (_h = (_f = (_c = s.clientPhone) !== null && _c !== void 0 ? _c : (_e = (_d = s === null || s === void 0 ? void 0 : s.participants) === null || _d === void 0 ? void 0 : _d.client) === null || _e === void 0 ? void 0 : _e.phone) !== null && _f !== void 0 ? _f : (_g = s === null || s === void 0 ? void 0 : s.client) === null || _g === void 0 ? void 0 : _g.phone) !== null && _h !== void 0 ? _h : null;
    const providerPhone = (_p = (_m = (_j = s.providerPhone) !== null && _j !== void 0 ? _j : (_l = (_k = s === null || s === void 0 ? void 0 : s.participants) === null || _k === void 0 ? void 0 : _k.provider) === null || _l === void 0 ? void 0 : _l.phone) !== null && _m !== void 0 ? _m : (_o = s === null || s === void 0 ? void 0 : s.provider) === null || _o === void 0 ? void 0 : _o.phone) !== null && _p !== void 0 ? _p : null;
    const toNumber = clientPhone !== null && clientPhone !== void 0 ? clientPhone : providerPhone;
    if (!toNumber)
        throw new Error("Aucun numéro (client/provider) trouvé");
    const base = (0, urlBase_1.getFunctionsBaseUrl)();
    const statusCallback = `${base}/twilioCallWebhook`;
    const connectUrl = `${base}/twiml/connectProvider?sessionId=${callSessionId}`;
    const call = await TwilioCallManager_1.TwilioCallManager.startOutboundCall({
        from: fromNumber,
        to: toNumber,
        url: connectUrl,
        statusCallback,
    });
    if (!(call === null || call === void 0 ? void 0 : call.sid))
        throw new Error("TwilioCallManager.startOutboundCall n'a pas renvoyé de sid");
    await snap.ref.update({
        twilioCallSid: call.sid,
        status: "calling",
        startedAt: new Date().toISOString(),
    });
    return call.sid;
    if (!(call === null || call === void 0 ? void 0 : call.sid)) {
        throw new Error("TwilioCallManager.startOutboundCall n'a pas renvoyÃ© de sid");
    }
    await snap.ref.update({
        twilioCallSid: call.sid,
        status: "calling",
        startedAt: new Date().toISOString(),
    });
    return call.sid;
}
//# sourceMappingURL=twilioCallManagerAdapter.js.map