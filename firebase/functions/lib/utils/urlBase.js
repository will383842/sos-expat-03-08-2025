"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunctionsBaseUrl = getFunctionsBaseUrl;
// firebase/functions/src/utils/urlBase.ts
const params_1 = require("firebase-functions/params");
const CLOUD_TASKS_LOCATION = (0, params_1.defineString)("CLOUD_TASKS_LOCATION", { default: "europe-west1" });
const FUNCTIONS_BASE_URL_PARAM = (0, params_1.defineString)("FUNCTIONS_BASE_URL");
function getProjectId() {
    return (process.env.GCLOUD_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        "unknown-project");
}
function getFunctionsBaseUrl() {
    const fromParam = (FUNCTIONS_BASE_URL_PARAM.value() || "").trim();
    if (fromParam)
        return fromParam.replace(/\/$/, "");
    const fromEnv = (process.env.FUNCTIONS_BASE_URL || "").trim();
    if (fromEnv)
        return fromEnv.replace(/\/$/, "");
    const region = CLOUD_TASKS_LOCATION.value() || "europe-west1";
    const projectId = getProjectId();
    return `https://${region}-${projectId}.cloudfunctions.net`;
}
//# sourceMappingURL=urlBase.js.map