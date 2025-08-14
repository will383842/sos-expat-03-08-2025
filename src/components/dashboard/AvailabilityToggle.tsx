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

// Helper sûr pour récupérer un userId string sans `any`
// Utilise `unknown` + affinage de type pour satisfaire eslint `no-explicit-any`
type MaybeId = { id?: unknown; uid?: unknown };
const getUserId = (u: unknown): string | null => {
  if (typeof u !== 'object' || u === null) return null;
  const obj = u as MaybeId;
  const id = typeof obj.id === 'string' ? obj.id : undefined;
  const uid = typeof obj.uid === 'string' ? obj.uid : undefined;
  return id ?? uid ?? null;
};

const AvailabilityToggle: FC<AvailabilityToggleProps> = ({ className = '' }) => {
  // ✅ Hooks en tête
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const userId = useMemo(() => getUserId(user), [user]);

  const [isAvailable, setIsAvailable] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enableSound: true,
    enableVoice: true,
    enableModal: true,
  });
  const [statusSyncError, setStatusSyncError] = useState<string | null>(null);

  // 🛡️ Protection contre les boucles de sync
  const skipNextSyncRef = useRef(false);
  const skipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rôles
  const isProvider = useMemo(() => {
    return user?.role === 'lawyer' || user?.role === 'expat';
  }, [user?.role]);

  const isApprovedProvider = useMemo(() => {
    if (!isProvider || !user) return false;
    return user.role === 'expat' || (user.role === 'lawyer' && user.isApproved === true);
  }, [isProvider, user]);

  // Log d'activité
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
      } catch (error) {
        console.error('Erreur création log:', error);
      }
    },
    [userId]
  );

  // Mise à jour/creation du profil SOS
  const updateSOSProfile = useCallback(
    async (newStatus: boolean) => {
      if (!userId || !user || !isProvider) return;

      const sosProfileRef = doc(db, 'sos_profiles', userId);
      const updateData = {
        isOnline: newStatus,
        availability: newStatus ? 'available' : 'unavailable',
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isVisible: true,
        isVisibleOnMap: true,
      };

      try {
        await updateDoc(sosProfileRef, updateData);
      } catch (error) {
        console.warn('updateDoc sos_profiles a échoué, tentative fallback...', error);
        try {
          const sosProfilesQuery = query(
            collection(db, 'sos_profiles'),
            where('uid', '==', userId)
          );
          const sosProfilesSnapshot = await getDocs(sosProfilesQuery);

          if (!sosProfilesSnapshot.empty) {
            const batch = writeBatch(db);
            sosProfilesSnapshot.docs.forEach((d) => batch.update(d.ref, updateData));
            await batch.commit();
          } else {
            // Créer si inexistant
            const newProfileData = {
              uid: userId,
              type: user.role,
              fullName:
                user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              ...updateData,
              isActive: true,
              isApproved: user.role !== 'lawyer',
              isVerified: false,
              rating: 5.0,
              reviewCount: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(sosProfileRef, newProfileData, { merge: true });
          }
        } catch (alternativeError) {
          console.error('Erreur méthode alternative SOS:', alternativeError);
          throw alternativeError;
        }
      }
    },
    [userId, user, isProvider]
  );

  // Fonction principale de toggle
  const toggleAvailability = useCallback(async () => {
    if (!userId || !user || isLoading) return;

    if (!isApprovedProvider) {
      setStatusSyncError(t('availability.errors.notApproved'));
      return;
    }

    setIsLoading(true);
    setStatusSyncError(null);

    // Sauvegarde l’état précédent pour rollback
    const previous = isAvailable;
    const newStatus = !previous;

    try {
      await createStatusLog(previous, newStatus);

      // 🛡️ Anti-boucle de sync pendant l’update
      skipNextSyncRef.current = true;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = setTimeout(() => {
        skipNextSyncRef.current = false;
      }, 2000);

      // Optimistic UI
      setIsAvailable(newStatus);

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', userId);

      const userUpdateData = {
        isOnline: newStatus,
        availability: newStatus ? 'available' : 'unavailable',
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as const;

      batch.update(userRef, userUpdateData);

      // Sync aussi le profil SOS (source affichage public)
      const sosProfileRef = doc(db, 'sos_profiles', userId);
      const sosSnap = await getDoc(sosProfileRef);
      const profileUpdate = { ...userUpdateData, isVisible: true, isVisibleOnMap: true };

      if (sosSnap.exists()) {
        batch.update(sosProfileRef, profileUpdate);
      } else {
        batch.set(sosProfileRef, {
          uid: userId,
          type: user.role,
          fullName:
            user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          ...profileUpdate,
          isActive: true,
          isApproved: user.role !== 'lawyer',
          isVerified: false,
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      // Débloque la protection
      skipNextSyncRef.current = false;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);

      // Notifie toute l’appli
      const detail = { isOnline: newStatus };
      window.dispatchEvent(new CustomEvent('availabilityChanged', { detail }));
      window.dispatchEvent(new CustomEvent('availability:changed', { detail }));
    } catch (error) {
      console.error('Erreur toggle disponibilité:', error);

      // Rollback
      skipNextSyncRef.current = false;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      setIsAvailable(previous);
      setStatusSyncError(t('availability.errors.updateFailed'));

      // Fallback SOS
      if (isProvider) {
        try {
          await updateSOSProfile(newStatus);
          setIsAvailable(newStatus);
        } catch (fallbackError) {
          console.error('Erreur fallback SOS:', fallbackError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    userId,
    user,
    isLoading,
    isApprovedProvider,
    isAvailable,
    isProvider,
    t,
    createStatusLog,
    updateSOSProfile,
  ]);

  // 🔔 Rappels
  const handleStayOnline = useCallback(() => setShowReminderModal(false), []);
  const handleGoOffline = useCallback(() => {
    toggleAvailability();
    setShowReminderModal(false);
  }, [toggleAvailability]);
  const handleDisableReminderToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('disableOnlineReminderUntil', today);
    setShowReminderModal(false);
  }, []);

  // Charger préférences
  useEffect(() => {
    const prefs = getNotificationPreferences();
    setNotificationPrefs(prefs);
  }, []);

  // Sync temps réel depuis users/{id}
  useEffect(() => {
    if (!userId) return;
    setIsAvailable(user?.isOnline === true);

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', userId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as { isOnline?: boolean };
          if (typeof data.isOnline === 'boolean' && data.isOnline !== isAvailable) {
            if (skipNextSyncRef.current) return;
            setIsAvailable(data.isOnline);

            const detail = { isOnline: data.isOnline };
            window.dispatchEvent(new CustomEvent('availabilityChanged', { detail }));
            window.dispatchEvent(new CustomEvent('availability:changed', { detail }));
          }
        }
      },
      (error) => {
        console.error('Erreur écoute users:', error);
        setStatusSyncError(t('availability.errors.syncFailed'));
      }
    );

    // Sync SOS pour prestataires
    let unsubscribeSOS: (() => void) | null = null;
    if (isProvider) {
      unsubscribeSOS = onSnapshot(
        doc(db, 'sos_profiles', userId),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as { isOnline?: boolean };
            if (typeof data.isOnline === 'boolean' && data.isOnline !== isAvailable) {
              if (skipNextSyncRef.current) return;
              setIsAvailable(data.isOnline);
            }
          }
        },
        (error) => console.error('Erreur écoute sos_profiles:', error)
      );
    }

    return () => {
      unsubscribeUser();
      unsubscribeSOS?.();
    };
  }, [userId, user?.isOnline, isProvider, isAvailable, t]);

  // Rappel périodique quand online
  useEffect(() => {
    if (!isAvailable) return;

    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      const disableUntil = localStorage.getItem('disableOnlineReminderUntil');
      if (disableUntil === today) return;

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

  // Écoute SOS dédiée (déjà couvert mais conservée pour robustesse)
  useEffect(() => {
    if (!userId || !isProvider) return;

    const sosProfileRef = doc(db, 'sos_profiles', userId);
    const unsubscribe = onSnapshot(
      sosProfileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as { isOnline?: boolean };
          if (typeof data.isOnline === 'boolean' && data.isOnline !== isAvailable) {
            if (skipNextSyncRef.current) return;
            setIsAvailable(data.isOnline);
          }
        }
      },
      (error) => console.error('Erreur écoute SOS bis:', error)
    );

    return () => unsubscribe();
  }, [userId, isProvider, isAvailable]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    };
  }, []);

  // Ne pas afficher si non prestataire
  if (!user || !isProvider) return null;

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
        onClose={handleStayOnline}
        onGoOffline={handleGoOffline}
        onDisableReminderToday={handleDisableReminderToday}
        langCode={i18n.language || 'en'}
      />
    </>
  );
};

export default AvailabilityToggle;
