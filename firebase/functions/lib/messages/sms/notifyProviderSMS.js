"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyProviderSMS = notifyProviderSMS;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function notifyProviderSMS(to, data) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: `SOS Expat: un client va vous appeler dans 5min. Titre: ${data.title}. Langue: ${data.language}`,
        preferWhatsApp: false,
    });
}
//# sourceMappingURL=notifyProviderSMS.js.map