// firebase/functions/src/runtime/executeCallTask.ts - VERSION CORRIGÉE
import { Request, Response } from "express";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { getTwilioClient, getTwilioPhoneNumber } from "../lib/twilio";
import { beginOutboundCallForSession } from "../services/twilioCallManagerAdapter";
import { logError } from "../utils/logs/logError";
import { logCallRecord } from "../utils/logs/logCallRecord";

// --- Secrets (v2) ---
export const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");
export const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
export const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

// --- Handler principal ---
export async function runExecuteCallTask(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  let callSessionId = '';
  
  try {
    console.log('🔍 [executeCallTask] === DÉBUT EXÉCUTION ===');
    console.log('🔍 [executeCallTask] Method:', req.method);
    console.log('🔍 [executeCallTask] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 [executeCallTask] Raw Body:', req.body);

    // ✅ ÉTAPE 1: Authentification Cloud Tasks
    const authHeader = req.get("X-Task-Auth") || "";
    const expectedAuth = TASKS_AUTH_SECRET.value() || "";
    
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
    await logCallRecord({
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
      const twilio = getTwilioClient();
      const fromNumber = getTwilioPhoneNumber();
      console.log('✅ [executeCallTask] Twilio credentials OK:', {
        hasClient: !!twilio,
        fromNumber: fromNumber ? fromNumber.substring(0, 5) + '...' : 'MISSING'
      });
    } catch (twilioError) {
      console.error('❌ [executeCallTask] Twilio credentials issue:', twilioError);
      // Continue quand même car TwilioCallManager gère ses propres credentials
    }

    // ✅ ÉTAPE 5: Exécution via l'adapter
    console.log(`🚀 [executeCallTask] Starting call execution for: ${callSessionId}`);
    
    const callResult = await beginOutboundCallForSession(callSessionId);

    const executionTime = Date.now() - startTime;

    console.log('✅ [executeCallTask] Call execution completed:', {
      callSessionId,
      executionTimeMs: executionTime,
      resultStatus: callResult?.status || 'unknown',
      hasResult: !!callResult
    });

    // ✅ ÉTAPE 6: Log de succès
    await logCallRecord({
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

  } catch (error) {
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
    await logError('executeCallTask:runExecuteCallTask', error);

    if (callSessionId) {
      await logCallRecord({
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
export const executeCallTask = onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    cpu: 0.25,              // réduit la pression CPU
    maxInstances: 10,       // limite le fan-out
    minInstances: 0,        // pas de réservation permanente
    concurrency: 1,         // OK avec cpu < 1
    timeoutSeconds: 120
  },
  (req, res) => runExecuteCallTask(req as Request, res as Response)
);