"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logNotification = logNotification;
const firebase_1 = require("../firebase");
async function logNotification(data) {
    try {
        const logData = {
            ...data,
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            createdAt: new Date(),
            environment: process.env.NODE_ENV || 'development'
        };
        await firebase_1.db.collection('notification_logs').add(logData);
        console.log(`[NOTIFICATION] ${data.channel.toUpperCase()} to ${data.to}: ${data.status}`);
        if (data.status === 'failed' && data.errorMessage) {
            await firebase_1.db.collection('error_logs').add({
                context: `notification_${data.channel}`,
                message: data.errorMessage,
                timestamp: firebase_1.FieldValue.serverTimestamp(),
                severity: 'medium',
                additionalData: {
                    to: data.to,
                    channel: data.channel,
                    type: data.type
                }
            });
        }
    }
    catch (error) {
        console.error('Failed to log notification:', error);
        console.error('Notification data:', data);
    }
}
//# sourceMappingURL=logNotification.js.map