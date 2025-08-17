/* -------------------------------------------------------------------------- */
/*                            src/utils/debugLogger.ts                         */
/* -------------------------------------------------------------------------- */

/**
 * Payload pour les logs de debug service
 */
type ServiceDebugPayload = {
  providerId: string;
  serviceInfo: Record<string, unknown>;
};

/**
 * Fonction générique de log debug
 */
export function debugLog(payload: { event: string; data: unknown }) {
  // Tu peux brancher ici un vrai logger (console, Sentry, Firebase, etc.)
  console.log("[DEBUG]", payload.event, payload.data);
}

/**
 * Log spécifique pour les services
 */
export function logServiceDebug(payload: ServiceDebugPayload) {
  debugLog({
    event: "service_debug",
    data: {
      providerId: payload.providerId,
      serviceData: payload.serviceInfo,
    },
  });
}
