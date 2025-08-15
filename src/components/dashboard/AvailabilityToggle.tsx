import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FC } from 'react';
import {
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import ReminderModal from '../../notificationsonline/ReminderModal';
import { playAvailabilityReminder } from '../../notificationsonline/playAvailabilityReminder';
import { getNotificationPreferences } from '../../notifications/notificationsDashboardProviders/preferencesProviders';
import { NotificationPreferences } from '../../notifications/notificationsDashboardProviders/types';

interface AvailabilityToggleProps {
  className?: string;
}

/** -------- Types locaux -------- */
interface AppUser {
  uid?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: 'lawyer' | 'expat' | 'admin' | string;
  type?: 'lawyer' | 'expat' | string;
  isOnline?: boolean;
  isApproved?: boolean;
  isVerified?: boolean;
}
type FireUserDoc = { isOnline?: boolean };
type FireSosDoc = { isOnline?: boolean; uid?: string };

/** Helper sûr pour récupérer un userId string */
type MaybeId = { id?: unknown; uid?: unknown };
const getUserId = (u: unknown): string | null => {
  if (typeof u !== 'object' || u === null) return null;
  const obj = u as MaybeId;
  const id = typeof obj.id === 'string' ? obj.id : undefined;
  const uid = typeof obj.uid === 'string' ? obj.uid : undefined;
  return id ?? uid ?? null;
};

/** -------- Event global + anti-doublon -------- */
declare global {
  interface Window {
    __availabilityDispatchLock?: number;
  }
}
const useAvailabilityBroadcaster = () =>
  useCallback((isOnline: boolean) => {
    const now = Date.now();
    if (window.__availabilityDispatchLock && now - window.__availabilityDispatchLock < 500) return;
    window.__availabilityDispatchLock = now;
    window.dispatchEvent(new CustomEvent('availability:changed', { detail: { isOnline } }));
  }, []);

/** ======================================================================== */

const AvailabilityToggle: FC<AvailabilityToggleProps> = ({ className = '' }) => {
  // ✅ Hooks
  const { user } = useAuth();
  const authUser = (user as unknown) as AppUser | null;
  const { t, i18n } = useTranslation();

  const broadcastAvailability = useAvailabilityBroadcaster();

  const userId = useMemo(() => getUserId(authUser), [authUser]);

  const [isAvailable, setIsAvailable] = useState<boolean>(!!authUser?.isOnline);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enableSound: true,
    enableVoice: true,
    enableModal: true,
  });
  const [statusSyncError, setStatusSyncError] = useState<string | null>(null);

  // 🛡️ Protection anti-boucles de sync
  const skipNextSyncRef = useRef(false);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rôles
  const isProvider = useMemo(() => {
    return (
      authUser?.role === 'lawyer' ||
      authUser?.role === 'expat' ||
      authUser?.type === 'lawyer' ||
      authUser?.type === 'expat'
    );
  }, [authUser?.role, authUser?.type]);

  const isApprovedProvider = useMemo(() => {
    if (!isProvider || !authUser) return false;
    return authUser.role === 'expat' || (authUser.role === 'lawyer' && authUser.isApproved === true);
  }, [isProvider, authUser]);

  /** ---------- Logs d'activité (silencieux en cas d'erreur) ---------- */
  const createStatusLog = useCallback(
    async (previousStatus: boolean, newStatus: boolean) => {
      if (!userId) return;
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'status_change',
          userId,
          previousStatus: previousStatus ? 'online' : 'offline',
          newStatus: newStatus ? 'online' : 'offline',
          timestamp: serverTimestamp(),
        });
      } catch {
        // Permission/règles : ignorer pour éviter le spam console
      }
    },
    [userId]
  );

  /** ---------- Écritures (vérité = sos_profiles) ---------- */
  const writeSosProfile = useCallback(
    async (newStatus: boolean) => {
      if (!userId || !authUser || !isProvider) return;

      const sosRef = doc(db, 'sos_profiles', userId);
      const updateData = {
        isOnline: newStatus,
        availability: newStatus ? 'available' : 'unavailable',
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isVisible: true,
        isVisibleOnMap: true,
      };

      try {
        // 1) Update direct
        await updateDoc(sosRef, updateData);
        return;
      } catch (error) {
        // 2) Existe ?
        try {
          const snap = await getDoc(sosRef);
          if (snap.exists()) {
            throw error;
          }
          // 3) Create si inexistant
          const base = {
            uid: userId,
            type: authUser.role || authUser.type,
            fullName:
              authUser.fullName ||
              `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() ||
              'Expert',
            email: authUser.email || '',
            isActive: true,
            isApproved: (authUser.role || authUser.type) !== 'lawyer',
            isVerified: !!authUser.isVerified,
            rating: 5.0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(sosRef, { ...base, ...updateData }, { merge: true });
          return;
        } catch {
          // 4) Fallback query par uid
          try {
            const qSos = query(collection(db, 'sos_profiles'), where('uid', '==', userId));
            const found = await getDocs(qSos);
            if (!found.empty) {
              const batch = writeBatch(db);
              found.docs.forEach((d) => batch.update(d.ref, updateData));
              await batch.commit();
              return;
            }
            // 5) Dernier recours : force create
            await setDoc(
              sosRef,
              {
                uid: userId,
                type: authUser.role || authUser.type,
                fullName:
                  authUser.fullName ||
                  `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() ||
                  'Expert',
                email: authUser.email || '',
                ...updateData,
                isActive: true,
                isApproved: (authUser.role || authUser.type) !== 'lawyer',
                isVerified: !!authUser.isVerified,
                rating: 5.0,
                reviewCount: 0,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (finalError) {
            throw finalError;
          }
        }
      }
    },
    [userId, authUser, isProvider]
  );

  /** users = best effort avec silence si rules bloquent */
  const writeUsersPresenceBestEffort = useCallback(
    async (newStatus: boolean) => {
      if (!userId) return;
      const userRef = doc(db, 'users', userId);
      const payload = {
        isOnline: newStatus,
        availability: newStatus ? 'available' : 'unavailable',
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await updateDoc(userRef, payload);
      } catch (e: unknown) {
        const msg = e?.code || e?.message || '';
        if (
          typeof msg === 'string' &&
          (msg.includes('permission') || msg.includes('Missing or insufficient permissions'))
        ) {
          // silencieux pour éviter le spam console
          return;
        }
        // autres erreurs : log léger
        // eslint-disable-next-line no-console
        console.warn('users presence (best-effort) ignorée:', e);
      }
    },
    [userId]
  );

  /** ---------- Toggle principal ---------- */
  const toggleAvailability = useCallback(async () => {
    if (!userId || !authUser || isLoading) return;

    if (!isApprovedProvider) {
      setStatusSyncError(t('availability.errors.notApproved'));
      return;
    }

    setIsLoading(true);
    setStatusSyncError(null);

    const previous = isAvailable;
    const newStatus = !previous;

    try {
      await createStatusLog(previous, newStatus);

      // Anti-boucle de sync pendant l’update
      skipNextSyncRef.current = true;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = setTimeout(() => {
        skipNextSyncRef.current = false;
      }, 2000);

      // Optimistic UI
      setIsAvailable(newStatus);

      // 1) SOS (vérité) avec retry simple
      let ok = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await writeSosProfile(newStatus);
          ok = true;
          break;
        } catch {
          if (attempt === 3) throw new Error('SOS update failed after retries');
          await new Promise((r) => setTimeout(r, 300 * attempt));
        }
      }
      if (!ok) throw new Error('SOS update failed');

      // 2) users (best-effort)
      await writeUsersPresenceBestEffort(newStatus);

      // Notifie l’app (événement unique, anti-doublon)
      broadcastAvailability(newStatus);
    } catch {
      // Rollback visuel
      skipNextSyncRef.current = false;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      setIsAvailable(previous);
      setStatusSyncError(t('availability.errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    authUser,
    isLoading,
    isApprovedProvider,
    isAvailable,
    t,
    createStatusLog,
    writeSosProfile,
    writeUsersPresenceBestEffort,
    broadcastAvailability,
  ]);

  /** ---------- Préférences ---------- */
  useEffect(() => {
    const prefs = getNotificationPreferences();
    setNotificationPrefs(prefs);
  }, []);

  /** ---------- Écoute temps réel unifiée (priorité = sos_profiles) ---------- */
  useEffect(() => {
    if (!userId) return;

    // init depuis l'utilisateur auth
    setIsAvailable(authUser?.isOnline === true);

    const sosRef = doc(db, 'sos_profiles', userId);
    const userRef = doc(db, 'users', userId);

    let unsubUser: (() => void) | null = null;

    const unsubSos = onSnapshot(
      sosRef,
      (snap) => {
        if (snap.exists()) {
          // SOS = source de vérité → coupe le fallback users
          if (unsubUser) {
            unsubUser();
            unsubUser = null;
          }
          const data = snap.data() as FireSosDoc;
          const next = data?.isOnline === true;
          if (!skipNextSyncRef.current) setIsAvailable(next);
        } else {
          // Fallback unique sur users si SOS inexistant
          if (!unsubUser) {
            unsubUser = onSnapshot(
              userRef,
              (userSnap) => {
                if (userSnap.exists()) {
                  const udata = userSnap.data() as FireUserDoc;
                  const next = udata?.isOnline === true;
                  if (!skipNextSyncRef.current) setIsAvailable(next);
                }
              },
              () => {
                // ignore erreurs users (souvent rules)
              }
            );
          }
        }
      },
      () => {
        setStatusSyncError(t('availability.errors.syncFailed'));
      }
    );

    return () => {
      unsubSos();
      if (unsubUser) unsubUser();
    };
  }, [userId, authUser?.isOnline, t]);

  /** ---------- Rappel périodique quand online ---------- */
  useEffect(() => {
    if (!isAvailable) return;

    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      const disableUntil = localStorage.getItem('disableOnlineReminderUntil');
      if (disableUntil === today) return;

      if (document.visibilityState !== 'visible') { return; }
const langCode = i18n.language || 'en';

      if (notificationPrefs.enableSound || notificationPrefs.enableVoice) {
        playAvailabilityReminder(langCode, notificationPrefs);
      }

      const now = Date.now();
      const lastVoice = parseInt(localStorage.getItem('lastVoiceReminderTimestamp') || '0', 10);
      if (notificationPrefs.enableModal && now - lastVoice > 59 * 60 * 1000) {
        setShowReminderModal(true);
      }
    }, 300000); // 5 min

    return () => clearInterval(interval);
  }, [isAvailable, i18n.language, notificationPrefs]);

  /** ---------- Cleanup timeout ---------- */
  useEffect(() => {
    return () => {
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    };
  }, []);

  // Ne pas afficher si non prestataire
  if (!authUser || !isProvider) return null;

  if (statusSyncError) {
    return (
      <div
        className="text-red-600 text-xs sm:text-sm p-3 bg-red-50 rounded-lg border border-red-200 shadow-sm"
        role="alert"
        aria-live="polite"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="flex-1">{statusSyncError}</span>
          <button
            onClick={() => window.location.reload()}
            className="text-red-700 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded px-2 py-1 text-xs font-medium"
            aria-label={t('common.refresh')}
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center justify-between sm:justify-start ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
            {isAvailable ? t('availability.status.online') : t('availability.status.offline')}
            <span
              className={`inline-block w-2 h-2 ml-1.5 rounded-full ${
                isAvailable ? 'bg-green-500' : 'bg-red-500'
              }`}
              aria-hidden="true"
            />
          </span>

          <button
            onClick={toggleAvailability}
            disabled={isLoading || !isApprovedProvider}
            className={`
              relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full
              transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isAvailable ? 'bg-green-600 focus:ring-green-500' : 'bg-red-500 focus:ring-red-500'}
            `}
            aria-pressed={isAvailable}
            aria-label={
              isAvailable ? t('availability.actions.goOffline') : t('availability.actions.goOnline')
            }
            type="button"
          >
            <span
              className={`
                inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white
                transition-transform duration-200 ease-in-out
                ${isAvailable ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'}
              `}
              aria-hidden="true"
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>
      </div>

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onGoOffline={() => {
          toggleAvailability();
          setShowReminderModal(false);
        }}
        onDisableReminderToday={() => {
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('disableOnlineReminderUntil', today);
          setShowReminderModal(false);
        }}
        langCode={i18n.language || 'en'}
      />
    </>
  );
};

export default AvailabilityToggle;
