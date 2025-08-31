// firebase/functions/src/utils/urlBase.ts
import { defineString } from "firebase-functions/params";

const CLOUD_TASKS_LOCATION = defineString("CLOUD_TASKS_LOCATION", { default: "europe-west1" });
const FUNCTIONS_BASE_URL_PARAM = defineString("FUNCTIONS_BASE_URL");

function getProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "unknown-project"
  );
}

export function getFunctionsBaseUrl(): string {
  const fromParam = (FUNCTIONS_BASE_URL_PARAM.value() || "").trim();
  if (fromParam) return fromParam.replace(/\/$/, "");

  const fromEnv = (process.env.FUNCTIONS_BASE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const region = CLOUD_TASKS_LOCATION.value() || "europe-west1";
  const projectId = getProjectId();
  return `https://${region}-${projectId}.cloudfunctions.net`;
}
