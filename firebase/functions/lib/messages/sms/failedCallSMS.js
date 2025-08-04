"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failedCallSMS = failedCallSMS;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function failedCallSMS(to, isProvider) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: isProvider
            ? `L'appel a échoué. Le client n’a pas répondu.`
            : `Le prestataire n’a pas répondu. Aucun paiement ne sera effectué.`,
        preferWhatsApp: false
    });
}
//# sourceMappingURL=failedCallSMS.js.map