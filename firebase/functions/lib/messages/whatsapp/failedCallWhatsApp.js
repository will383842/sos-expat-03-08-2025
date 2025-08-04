"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failedCallWhatsApp = failedCallWhatsApp;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function failedCallWhatsApp(to, isProvider) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: isProvider
            ? `❌ L'appel a échoué. Le client n’a pas répondu. Vous ne serez pas rémunéré.`
            : `❌ Le prestataire n’a pas répondu. Aucun paiement ne sera effectué. Vous pouvez choisir un autre expert sur S.O.S Expat.`,
        preferWhatsApp: true
    });
}
//# sourceMappingURL=failedCallWhatsApp.js.map