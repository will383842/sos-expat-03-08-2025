"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = logError;
const firebase_1 = require("../firebase");
function safeStringify(obj) {
    const seen = new WeakSet();
    try {
        return JSON.stringify(obj, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            if (value instanceof Error) {
                return {
                    name: value.name,
                    message: value.message
                };
            }
            return value;
        });
    }
    catch (err) {
        return `Unstringifiable object: ${String(err)}`;
    }
}
async function logError(context, error) {
    try {
        let message = 'Erreur inconnue';
        let stack = '';
        let errorType = 'unknown';
        if (error instanceof Error) {
            message = error.message;
            stack = (error.stack || '').slice(0, 5000); // tronqué pour Firestore
            errorType = error.constructor.name;
        }
        else if (typeof error === 'string') {
            message = error;
            errorType = 'string';
        }
        else if (error && typeof error === 'object') {
            message = safeStringify(error);
            errorType = 'object';
        }
        else {
            message = String(error);
            errorType = typeof error;
        }
        await firebase_1.db.collection('error_logs').add({
            context,
            message,
            stack,
            errorType,
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            createdAt: new Date(),
            severity: getSeverityLevel(context),
            environment: process.env.NODE_ENV || 'development'
        });
        console.error(`[${context}] ${message}`, error);
    }
    catch (logError) {
        console.error('Failed to log error to Firestore:', logError);
        console.error('Original error:', { context, error });
    }
}
function getSeverityLevel(context) {
    const criticalContexts = ['payment', 'stripe', 'billing'];
    const highContexts = ['twilio', 'call', 'webhook'];
    const mediumContexts = ['notification', 'email', 'sms'];
    if (criticalContexts.some(ctx => context.toLowerCase().includes(ctx))) {
        return 'critical';
    }
    if (highContexts.some(ctx => context.toLowerCase().includes(ctx))) {
        return 'high';
    }
    if (mediumContexts.some(ctx => context.toLowerCase().includes(ctx))) {
        return 'medium';
    }
    return 'low';
}
//# sourceMappingURL=logError.js.map