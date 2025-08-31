"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPush = sendPush;
const firebase_1 = require("../../../utils/firebase"); // admin.messaging()
async function sendPush(token, title, body, data) {
    await firebase_1.messaging.send({
        token,
        notification: { title, body },
        data
    });
}
//# sourceMappingURL=fcm.js.map