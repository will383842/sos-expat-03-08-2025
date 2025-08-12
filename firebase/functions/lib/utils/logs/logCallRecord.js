"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCallRecord = logCallRecord;
exports.getCallRecords = getCallRecords;
const firebase_1 = require("../firebase");
const logError_1 = require("../logs/logError");
// ✅ UNE SEULE fonction qui gère les deux cas
async function logCallRecord(data) {
    try {
        const { callId, status, retryCount, additionalData = {}, duration, errorMessage } = data;
        if (!callId || !status) {
            throw new Error('callId and status are required for call record logging');
        }
        const recordData = Object.assign({ callId,
            status, retryCount: retryCount || 0, timestamp: firebase_1.FieldValue.serverTimestamp(), createdAt: new Date(), duration: duration || null, errorMessage: errorMessage || null, environment: process.env.NODE_ENV || 'development' }, additionalData);
        await firebase_1.db.collection('call_records').add(recordData);
        const significantStatuses = [
            'scheduled',
            'provider_connected',
            'client_connected',
            'both_connected',
            'completed',
            'failed',
            'cancelled'
        ];
        if (significantStatuses.includes(status)) {
            const callSessionRef = firebase_1.db.collection('call_sessions').doc(callId);
            await callSessionRef.update({
                lastRecordedStatus: status,
                lastRecordedAt: firebase_1.FieldValue.serverTimestamp(),
                retryCount: retryCount
            });
        }
        console.log(`[CALL RECORD] ${callId}: ${status} (retry: ${retryCount})`);
    }
    catch (error) {
        console.error('Failed to log call record:', error);
        console.error('Call record data:', data);
        try {
            await (0, logError_1.logError)('logCallRecord:failure', error);
        }
        catch (logErrorFailure) {
            console.error('Failed to log call record error:', logErrorFailure);
        }
    }
}
async function getCallRecords(callId) {
    try {
        const snapshot = await firebase_1.db.collection('call_records')
            .where('callId', '==', callId)
            .orderBy('timestamp', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    }
    catch (error) {
        console.error('Failed to get call records:', error);
        await (0, logError_1.logError)('getCallRecords:failure', error);
        return [];
    }
}
//# sourceMappingURL=logCallRecord.js.map