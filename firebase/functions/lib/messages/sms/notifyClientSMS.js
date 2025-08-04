"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyClientSMS = notifyClientSMS;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function notifyClientSMS(to, data) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: `Votre appel SOS Expat est prévu dans quelques minutes. Sujet : ${data.title}. Langue : ${data.language}.`,
        preferWhatsApp: false
    });
}
//# sourceMappingURL=notifyClientSMS.js.map