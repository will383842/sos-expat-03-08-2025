"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const twilioWebhooks_1 = require("../Webhooks/twilioWebhooks");
exports.unifiedWebhook = (0, https_1.onRequest)({
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1
}, async (req, res) => {
    const path = (req.path || '').toLowerCase();
    const body = req.body || {};
    const isRecording = path.includes('record') || 'RecordingSid' in body || 'RecordingUrl' in body;
    const isConference = path.includes('conference') || 'ConferenceSid' in body || 'ConferenceName' in body;
    if (isRecording) {
        return twilioWebhooks_1.twilioRecordingWebhook(req, res);
    }
    else if (isConference) {
        return twilioWebhooks_1.twilioConferenceWebhook(req, res);
    }
    else {
        return twilioWebhooks_1.twilioCallWebhook(req, res);
    }
});
//# sourceMappingURL=unifiedWebhook.js.map