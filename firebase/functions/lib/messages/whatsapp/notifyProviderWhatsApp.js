"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyProviderWhatsApp = notifyProviderWhatsApp;
const sendSmartMessage_1 = require("../sendSmartMessage");
async function notifyProviderWhatsApp(to, data) {
    await (0, sendSmartMessage_1.sendSmartMessage)({
        toPhone: to,
        body: `🔔 SOS Expat : Un client va vous appeler dans 5 minutes.\nTitre : ${data.title}\nLangue : ${data.language}`,
        preferWhatsApp: true,
    });
}
//# sourceMappingURL=notifyProviderWhatsApp.js.map