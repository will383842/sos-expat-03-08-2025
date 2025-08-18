// src/pages/admin/AdminBackups.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  subscribeBackups,
  startBackup,
  getBackupSchedule,
  updateBackupSchedule,
  restoreFromBackup,
  deleteBackup,
  openTestBackupHttp,
  grantAdminIfToken,
} from "@/services/backupService";
import AdminLayout from "@/components/admin/AdminLayout";
import Button from "@/components/common/Button";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Trash,
  Database,
  Play,
} from "lucide-react";
import { getAuth } from "firebase/auth";

// Types

type Row = {
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

// Utils

async function isAdminNow(): Promise<boolean> {
  const auth = getAuth();
  // Attendre que Firebase connaisse l'état d'auth
  await new Promise<void>((res) => {
    const off = auth.onAuthStateChanged(() => {
      off();
      res();
    });
  });
  // Forcer un token frais
  await auth.currentUser?.getIdToken(true);
  const t = await auth.currentUser?.getIdTokenResult();
  return t?.claims?.role === "admin";
}

const AdminBackups: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [cron, setCron] = useState("0 3 * * *");
  const [timeZone, setTimeZone] = useState("Europe/Paris");
  const [restorePrefix, setRestorePrefix] = useState("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [secretToken, setSecretToken] = useState("");
  const [granting, setGranting] = useState(false);

  // --- Init ---
  useEffect(() => {
    const unsub = subscribeBackups((list) => setRows(list as unknown as Row[]));

    (async () => {
      const ok = await isAdminNow();
      setIsAdmin(ok);
      if (!ok) {
        console.debug(
          "Skip getBackupSchedule: rôle 'admin' absent. Utilise le bloc 'Devenir admin'."
        );
        return;
      }
      try {
        const s = await getBackupSchedule();
        if (s?.schedule) setCron(s.schedule);
        if (s?.timeZone) setTimeZone(s.timeZone);
      } catch (e) {
        console.debug("getBackupSchedule (non-bloquant):", e);
      }
    })();

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // --- Helpers ---
  const fmtDate = (v: unknown) => {
    try {
      const d =
        typeof v === "object" &&
        v !== null &&
        "toDate" in (v as Record<string, unknown>) &&
        typeof (v as { toDate?: () => Date }).toDate === "function"
          ? (v as { toDate: () => Date }).toDate()
          : v instanceof Date
          ? v
          : typeof v === "object" &&
            v !== null &&
            "_seconds" in (v as Record<string, unknown>)
          ? new Date(Number((v as { _seconds: number })._seconds) * 1000)
          : undefined;

      return d
        ? new Intl.DateTimeFormat("fr-FR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(d)
        : "-";
    } catch {
      return "-";
    }
  };

  const StatusBadge: React.FC<{ s: Row["status"] }> = ({ s }) => {
    if (s === "completed")
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">
          <CheckCircle size={12} className="mr-1" />
          Terminé
        </span>
      );
    if (s === "failed")
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
          <AlertTriangle size={12} className="mr-1" />
          Échoué
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs">
        <Clock size={12} className="mr-1" />
        En cours
      </span>
    );
  };

  const TypeBadge: React.FC<{ t: string }> = ({ t }) => {
    if (t === "automatic")
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
          <RefreshCw size={12} className="mr-1" />
          Automatique
        </span>
      );
    if (t === "manual")
      return (
        <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-xs">
          <Save size={12} className="mr-1" />
          Manuel
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs">
        <Database size={12} className="mr-1" />
        {t}
      </span>
    );
  };

  const latestPrefix = useMemo(() => {
    const completed = rows.filter((r) => r.status === "completed");
    if (completed.length === 0) return "";
    for (const r of completed) if (r.prefix) return r.prefix as string;
    for (const r of completed) {
      const a = r.artifacts || {};
      const anyVal = (a as any).firestore || (a as any).auth || (a as any).functions;
      if (typeof anyVal === "string" && anyVal.includes("/app/")) {
        const m = anyVal.match(/app\/(^[^/]+\/[^/]+)/);
        if (m) return m[1];
      }
    }
    return "";
  }, [rows]);

  // ---- Actions ----
  async function ensureAdminOrExplain() {
    const ok = await isAdminNow();
    setIsAdmin(ok);
    if (!ok) {
      alert(
        "Ton jeton n'a pas encore le rôle admin. Utilise le bloc 'Devenir admin', puis recharge la page."
      );
    }
    return ok;
  }

  function getErrMsg(e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }

  async function onTest() {
    try {
      await openTestBackupHttp();
    } catch (e) {
      alert(getErrMsg(e));
    }
  }

  async function onStartBackup() {
    if (!(await ensureAdminOrExplain())) return;
    setLoading(true);
    try {
      await startBackup();
      alert("Sauvegarde lancée.");
    } catch (e: unknown) {
      alert(getErrMsg(e) || "Erreur sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveSchedule() {
    if (!(await ensureAdminOrExplain())) return;
    setLoading(true);
    try {
      await updateBackupSchedule(cron, timeZone);
      alert("Planification mise à jour.");
    } catch (e: unknown) {
      alert(getErrMsg(e) || "Erreur planification");
    } finally {
      setLoading(false);
    }
  }

  async function onRestore(prefix: string) {
    if (!(await ensureAdminOrExplain())) return;
    const p = prefix || latestPrefix;
    if (!p) {
      alert("Renseigne un prefix AAAA-MM-JJ/HHMMSS");
      return;
    }
    if (!confirm(`Restaurer depuis ${p} ? Cela peut écraser des données.`)) return;
    setRestoring(true);
    try {
      await restoreFromBackup(p, { firestore: true, storage: true, auth: "basic" });
      alert("Restauration lancée.");
    } catch (e: unknown) {
      alert(getErrMsg(e) || "Erreur restauration");
    } finally {
      setRestoring(false);
    }
  }

  async function onDelete(id: string) {
    if (!(await ensureAdminOrExplain())) return;
    if (!confirm("Supprimer cette sauvegarde ? Les fichiers seront effacés du bucket.")) return;
    setLoading(true);
    try {
      await deleteBackup(id);
      alert("Sauvegarde supprimée.");
    } catch (e: unknown) {
      alert(getErrMsg(e) || "Erreur suppression");
    } finally {
      setLoading(false);
    }
  }

  // --- Devenir admin ---
  async function onGrantAdmin() {
    if (!secretToken) {
      alert("Colle d'abord BACKUP_CRON_TOKEN");
      return;
    }
    setGranting(true);
    try {
      await grantAdminIfToken(secretToken);
      const auth = getAuth();
      await auth.currentUser?.getIdToken(true);
      const t = await auth.currentUser?.getIdTokenResult();
      console.log("Claims:", t?.claims); // on s'attend à { role: "admin", ... }
      alert("OK: rôle admin accordé. Recharge la page.");
    } catch (e: any) {
      alert(e?.message || "Erreur grantAdminIfToken");
    } finally {
      setGranting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Backups</h1>
          <div className="flex gap-2">
            <Button onClick={onTest} variant="outline">
              <Play size={16} className="mr-2" />
              Test HTTP
            </Button>
            <Button onClick={onStartBackup} loading={loading} className="bg-red-600 hover:bg-red-700">
              <Save size={16} className="mr-2" />
              Sauvegarder maintenant
            </Button>
          </div>
        </div>

        {/* Devenir admin (setup temporaire) */}
        {isAdmin === false && (
          <div className="mt-4 p-3 border rounded bg-white mb-6">
            <h4 className="font-medium mb-2">Devenir admin (setup)</h4>
            <input
              value={secretToken}
              onChange={(e) => setSecretToken(e.target.value)}
              placeholder="Colle BACKUP_CRON_TOKEN"
              className="border px-2 py-1 rounded w-full mb-2"
              type="password"
            />
            <button
              onClick={onGrantAdmin}
              disabled={granting || !secretToken}
              className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            >
              {granting ? "Validation..." : "Valider et devenir admin"}
            </button>
          </div>
        )}

        {/* Planification */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="font-medium mb-3">Planification</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600">Cron</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="0 3 * * *"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Fuseau</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="Europe/Paris"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={onSaveSchedule} loading={loading} className="w-full">
                Enregistrer la planification
              </Button>
            </div>
          </div>
        </div>

        {/* Restaurer */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="font-medium mb-3">Restaurer</h2>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <input
              className="w-full border rounded px-3 py-2"
              value={restorePrefix}
              onChange={(e) => setRestorePrefix(e.target.value)}
              placeholder={latestPrefix ? `Ex: ${latestPrefix}` : "AAAA-MM-JJ/HHMMSS"}
            />
            <Button onClick={() => onRestore(restorePrefix)} loading={restoring}>
              Lancer la restauration
            </Button>
          </div>
          {latestPrefix && (
            <p className="text-xs text-gray-500 mt-2">
              Dernier préfixe détecté : <code>{latestPrefix}</code>
            </p>
          )}
        </div>

        {/* Tableau des backups */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créée le</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erreur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucune sauvegarde pour le moment.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-sm">{r.id}</td>
                      <td className="px-6 py-3">
                        <TypeBadge t={r.type} />
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700">{fmtDate(r.createdAt)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge s={r.status} />
                      </td>
                      <td className="px-6 py-3 text-sm text-red-700">{r.error ? r.error : "-"}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => onDelete(r.id)}
                          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          <span className="inline-flex items-center">
                            <Trash size={14} className="mr-1" />
                            Supprimer
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBackups;
