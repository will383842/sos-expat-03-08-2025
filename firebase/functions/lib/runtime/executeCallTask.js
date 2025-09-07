"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCallTask = exports.TWILIO_PHONE_NUMBER = exports.TWILIO_AUTH_TOKEN = exports.TWILIO_ACCOUNT_SID = exports.TASKS_AUTH_SECRET = void 0;
exports.runExecuteCallTask = runExecuteCallTask;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const twilio_1 = require("../lib/twilio");
const twilioCallManagerAdapter_1 = require("../services/twilioCallManagerAdapter");
const logError_1 = require("../utils/logs/logError");
const logCallRecord_1 = require("../utils/logs/logCallRecord");
// --- Secrets (v2) ---
exports.TASKS_AUTH_SECRET = (0, params_1.defineSecret)("TASKS_AUTH_SECRET");
exports.TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)("TWILIO_ACCOUNT_SID");
exports.TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)("TWILIO_AUTH_TOKEN");
exports.TWILIO_PHONE_NUMBER = (0, params_1.defineSecret)("TWILIO_PHONE_NUMBER");
// --- Handler principal ---
async function runExecuteCallTask(req, res) {
    const startTime = Date.now();
    let callSessionId = '';
    try {
        console.log('🔍 [executeCallTask] === DÉBUT EXÉCUTION ===');
        console.log('🔍 [executeCallTask] Method:', req.method);
        console.log('🔍 [executeCallTask] Headers:', JSON.stringify(req.headers, null, 2));
        console.log('🔍 [executeCallTask] Raw Body:', req.body);
        // ✅ ÉTAPE 1: Authentification Cloud Tasks
        const authHeader = req.get("X-Task-Auth") || "";
        const expectedAuth = exports.TASKS_AUTH_SECRET.value() || "";
        console.log('🔐 [executeCallTask] Auth check:', {
            hasAuthHeader: !!authHeader,
            authHeaderLength: authHeader.length,
            hasExpectedAuth: !!expectedAuth,
            expectedAuthLength: expectedAuth.length,
            authMatch: authHeader === expectedAuth
        });
        if (!authHeader) {
            console.error('❌ [executeCallTask] Missing X-Task-Auth header');
            res.status(401).send("Missing X-Task-Auth header");
            return;
        }
        if (authHeader !== expectedAuth) {
            console.error('❌ [executeCallTask] Invalid X-Task-Auth header');
            res.status(401).send("Invalid X-Task-Auth header");
            return;
        }
        console.log('✅ [executeCallTask] Authentication successful');
        // ✅ ÉTAPE 2: Extraction du payload
        const requestBody = req.body || {};
        callSessionId = requestBody.callSessionId || '';
        console.log('📋 [executeCallTask] Payload extracted:', {
            hasBody: !!req.body,
            bodyKeys: Object.keys(requestBody),
            callSessionId: callSessionId || 'MISSING',
            fullPayload: JSON.stringify(requestBody, null, 2)
        });
        if (!callSessionId) {
            console.error('❌ [executeCallTask] Missing callSessionId in request body');
            console.error('❌ [executeCallTask] Available keys:', Object.keys(requestBody));
            res.status(400).send("Missing callSessionId in request body");
            return;
        }
        console.log(`📞 [executeCallTask] Processing call session: ${callSessionId}`);
        // ✅ ÉTAPE 3: Log initial
        await (0, logCallRecord_1.logCallRecord)({
            callId: callSessionId,
            status: 'cloud_task_received',
            retryCount: 0,
            additionalData: {
                executedAt: new Date().toISOString(),
                requestMethod: req.method,
                userAgent: req.get('User-Agent') || 'unknown'
            }
        });
        // ✅ ÉTAPE 4: Vérification Twilio (pour les logs)
        console.log('📞 [executeCallTask] Checking Twilio credentials...');
        try {
            const twilio = (0, twilio_1.getTwilioClient)();
            const fromNumber = (0, twilio_1.getTwilioPhoneNumber)();
            console.log('✅ [executeCallTask] Twilio credentials OK:', {
                hasClient: !!twilio,
                fromNumber: fromNumber ? fromNumber.substring(0, 5) + '...' : 'MISSING'
            });
        }
        catch (twilioError) {
            console.error('❌ [executeCallTask] Twilio credentials issue:', twilioError);
            // Continue quand même car TwilioCallManager gère ses propres credentials
        }
        // ✅ ÉTAPE 5: Exécution via l'adapter
        console.log(`🚀 [executeCallTask] Starting call execution for: ${callSessionId}`);
        const callResult = await (0, twilioCallManagerAdapter_1.beginOutboundCallForSession)(callSessionId);
        const executionTime = Date.now() - startTime;
        console.log('✅ [executeCallTask] Call execution completed:', {
            callSessionId,
            executionTimeMs: executionTime,
            resultStatus: callResult?.status || 'unknown',
            hasResult: !!callResult
        });
        // ✅ ÉTAPE 6: Log de succès
        await (0, logCallRecord_1.logCallRecord)({
            callId: callSessionId,
            status: 'cloud_task_completed_successfully',
            retryCount: 0,
            additionalData: {
                executionTimeMs: executionTime,
                completedAt: new Date().toISOString(),
                resultStatus: callResult?.status || 'unknown'
            }
        });
        // ✅ ÉTAPE 7: Réponse de succès
        const response = {
            success: true,
            callSessionId,
            executionTimeMs: executionTime,
            result: callResult,
            timestamp: new Date().toISOString()
        };
        console.log('🎉 [executeCallTask] === SUCCÈS ===');
        console.log('🎉 [executeCallTask] Response:', JSON.stringify(response, null, 2));
        res.status(200).json(response);
        return;
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        console.error('❌ [executeCallTask] === ERREUR ===');
        console.error('❌ [executeCallTask] Error details:', {
            callSessionId: callSessionId || 'unknown',
            executionTimeMs: executionTime,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        });
        // Logger l'erreur
        await (0, logError_1.logError)('executeCallTask:runExecuteCallTask', error);
        if (callSessionId) {
            await (0, logCallRecord_1.logCallRecord)({
                callId: callSessionId,
                status: 'cloud_task_failed',
                retryCount: 0,
                errorMessage: error instanceof Error ? error.message : String(error),
                additionalData: {
                    executionTimeMs: executionTime,
                    failedAt: new Date().toISOString(),
                    errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
                }
            });
        }
        const errorResponse = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            callSessionId: callSessionId || 'unknown',
            executionTimeMs: executionTime,
            timestamp: new Date().toISOString()
        };
        res.status(500).json(errorResponse);
        return;
    }
}
// --- Fonction Firebase v2 avec configuration optimisée ---
exports.executeCallTask = (0, https_1.onRequest)({
    region: "europe-west1",
    memory: "512MiB",
    cpu: 0.25, // réduit la pression CPU
    maxInstances: 10, // limite le fan-out
    minInstances: 0, // pas de réservation permanente
    concurrency: 1, // OK avec cpu < 1
    timeoutSeconds: 120
}, (req, res) => runExecuteCallTask(req, res));
//# sourceMappingURL=executeCallTask.js.map