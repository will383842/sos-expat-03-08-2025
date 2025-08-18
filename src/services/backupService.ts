import { db, functions } from "@/config/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  limit,
  query,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

/** Données d’un document "backups" (sans l’id Firestore) */
type BackupDoc = {
  type: "manual" | "automatic" | "scheduled-http";
  status: "pending" | "completed" | "failed";
  createdAt?: Timestamp;
  completedAt?: Timestamp;
  createdBy?: string;
  artifacts?: {
    firestore?: string;
    auth?: string;
    functions?: string;
    storageJob?: string;
    [k: string]: string | undefined;
  };
  prefix?: string;
  error?: string;
};

/** Ligne envoyée au composant (inclut l’id) */
export type BackupRow = BackupDoc & { id: string };

type StartBackupResponse = {
  ok: boolean;
  artifacts?: Record<string, unknown>;
  prefix?: string;
};

type GetScheduleResponse = {
  schedule: string | null;
  timeZone: string;
  uri: string | null;
};

type UpdateScheduleResponse = { ok: boolean };

export type RestoreParts = {
  firestore?: boolean;
  storage?: boolean;
  auth?: "basic";
};

type RestoreResponse = {
  ok: boolean;
  firestore?: unknown;
  storageJob?: string;
  auth?: { restored: number; mode: "basic" };
};

type DeleteBackupResponse = { ok: boolean };

export function subscribeBackups(cb: (rows: BackupRow[]) => void): () => void {
  const q = query(
    collection(db, "backups"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const rows: BackupRow[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as BackupDoc),
    }));
    cb(rows);
  });
}

export async function startBackup(): Promise<StartBackupResponse> {
  const call = httpsCallable<void, StartBackupResponse>(functions, "startBackup");
  return (await call(undefined)).data;
}

export async function getBackupSchedule(): Promise<GetScheduleResponse> {
  const call = httpsCallable<void, GetScheduleResponse>(
    functions,
    "getBackupSchedule"
  );
  return (await call(undefined)).data;
}

export async function updateBackupSchedule(
  cron: string,
  timeZone = "Europe/Paris"
): Promise<UpdateScheduleResponse> {
  const call = httpsCallable<{ cron: string; timeZone: string }, UpdateScheduleResponse>(
    functions,
    "updateBackupSchedule"
  );
  return (await call({ cron, timeZone })).data;
}

export async function restoreFromBackup(
  prefix: string,
  parts: RestoreParts
): Promise<RestoreResponse> {
  const call = httpsCallable<{ prefix: string; parts: RestoreParts }, RestoreResponse>(
    functions,
    "restoreFromBackup"
  );
  return (await call({ prefix, parts })).data;
}

export async function deleteBackupDoc(docId: string): Promise<DeleteBackupResponse> {
  const call = httpsCallable<{ docId: string }, DeleteBackupResponse>(
    functions,
    "deleteBackup"
  );
  return (await call({ docId })).data;
}

// Pour le bouton "Test" (HTTP GET) : ouvre la page (évite CORS)
export function openTestBackupHttp(): void {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const region = import.meta.env.VITE_FUNCTIONS_REGION || "europe-west1";
  window.open(
    `https://${region}-${projectId}.cloudfunctions.net/testBackup`,
    "_blank"
  );
}
