"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successCallWhatsApp = successCallWhatsApp;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function successCallWhatsApp(to) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: `✅ Votre appel a bien été réalisé. Merci d’avoir utilisé S.O.S Expat ! Vous pouvez maintenant laisser un avis.`,
        preferWhatsApp: true
    });
}
//# sourceMappingURL=successCallWhatsApp.js.map