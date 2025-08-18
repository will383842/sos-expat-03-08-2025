// src/services/backupService.ts
import { getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";

export type BackupRow = {
  id: string;
  type: string;
  status: "pending" | "completed" | "failed";
  createdAt?: unknown;
  completedAt?: unknown;
  createdBy?: string;
  artifacts?: Record<string, string>;
  error?: string;
  prefix?: string;
};

export type BackupSchedule = {
  schedule: string;
  timeZone: string;
};

export type RestoreParts = {
  firestore?: boolean;
  storage?: boolean;
  auth?: "none" | "basic" | "full";
};

// ---- Firestore subscription ----
export function subscribeBackups(cb: (rows: BackupRow[]) => void): () => void {
  const db = getFirestore();
  const col = collection(db, "backups");
  const q = query(col, orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    const list: BackupRow[] = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        type: data.type ?? "manual",
        status: data.status ?? "pending",
        createdAt: data.createdAt,
        completedAt: data.completedAt,
        createdBy: data.createdBy,
        artifacts: data.artifacts ?? {},
        error: data.error,
        prefix: data.prefix,
      };
    });
    cb(list);
  });
  return unsub;
}

// ---- Callables ----
export async function startBackup() {
  const call = httpsCallable(functions, "startBackup");
  return (await call()).data as { ok: boolean };
}

export async function getBackupSchedule() {
  const call = httpsCallable(functions, "getBackupSchedule");
  return (await call()).data as Partial<BackupSchedule> & { uri?: string | null };
}

export async function updateBackupSchedule(cron: string, timeZone: string) {
  // backend attend { cron, timeZone }
  const call = httpsCallable(functions, "updateBackupSchedule");
  return (await call({ cron, timeZone })).data as { ok: boolean };
}

export async function restoreFromBackup(prefix: string, parts: RestoreParts) {
  // backend attend { prefix, parts } (pas "options")
  const call = httpsCallable(functions, "restoreFromBackup");
  return (await call({ prefix, parts })).data as { ok: boolean };
}

export async function deleteBackup(id: string) {
  // backend exporte "deleteBackup" et attend { docId }
  const call = httpsCallable(functions, "deleteBackup");
  return (await call({ docId: id })).data as { ok: boolean };
}

export function openTestBackupHttp() {
  if (typeof window === "undefined") return;
  // backend expose "testBackup" (pas "backupTest")
  const app = getApp();
  const projectId =
    ((app.options as any)?.projectId as string | undefined) ||
    (import.meta as any)?.env?.VITE_FIREBASE_PROJECT_ID ||
    "demo-project";
  const region = (import.meta as any)?.env?.VITE_FUNCTIONS_REGION || "europe-west1";
  const url = `https://${region}-${projectId}.cloudfunctions.net/testBackup`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ---- Admin elevation ----
export async function grantAdminIfToken(token: string) {
  const call = httpsCallable(functions, "grantAdminIfToken");
  return (await call({ token })).data as { ok: boolean };
}
