"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyClientWhatsApp = notifyClientWhatsApp;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function notifyClientWhatsApp(to, data) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: `✅ Votre appel avec un expert S.O.S Expat est prévu dans quelques minutes. Sujet : ${data.title}. Langue : ${data.language}.`,
        preferWhatsApp: true
    });
}
//# sourceMappingURL=notifyClientWhatsApp.js.map