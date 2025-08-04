"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWithLogging = sendWithLogging;
const logNotification_1 = require("./logNotification");
const logError_1 = require("./logError");
/**
 * Envoie un message (SMS, WhatsApp, vocal...) et loggue automatiquement.
 */
async function sendWithLogging({ to, channel, type, userId, content, sendFunction }) {
    try {
        await sendFunction();
        await (0, logNotification_1.logNotification)({
            to,
            channel,
            type,
            userId,
            content,
            status: 'sent'
        });
    }
    catch (error) {
        await (0, logError_1.logError)(`sendWithLogging:${channel}`, error);
        await (0, logNotification_1.logNotification)({
            to,
            channel,
            type,
            userId,
            content,
            status: 'failed'
        });
    }
}
//# sourceMappingURL=sendWithLogging.js.map