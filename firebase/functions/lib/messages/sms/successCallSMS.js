"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successCallSMS = successCallSMS;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function successCallSMS(to) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: `Merci d’avoir utilisé S.O.S Expat. Vous pouvez laisser un avis.`,
        preferWhatsApp: false
    });
}
//# sourceMappingURL=successCallSMS.js.map