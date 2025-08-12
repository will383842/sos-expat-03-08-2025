import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, updateDoc, onSnapshot, addDoc, collection, serverTimestamp, query, where, getDocs, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useTranslation } from 'react-i18next';
import { Bell } from "lucide-react";
import ReminderModal from '../../notificationsonline/ReminderModal';
import { playAvailabilityReminder } from '../../notificationsonline/playAvailabilityReminder';
import { getNotificationPreferences, saveNotificationPreferences } from '../../notifications/notificationsDashboardProviders/preferencesProviders';
import { NotificationPreferences } from '../../notifications/notificationsDashboardProviders/types';

interface AvailabilityToggleProps {
  className?: string;
}

const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ className = '' }) => {
  // ✅ TOUS LES HOOKS EN PREMIER - JAMAIS CONDITIONNELS
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [isAvailable, setIsAvailable] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enableSound: true,
    enableVoice: true,
    enableModal: true
  });
  const [statusSyncError, setStatusSyncError] = useState<string | null>(null);

  // 🛡️ Protection contre les conflits de synchronisation
  const skipNextSyncRef = useRef(false);
  const skipTimeoutRef = useRef<NodeJS.Timeout>();

  // Optimisation: mémoriser la langue et le rôle
  const userLanguage = useMemo(() => {
    return i18n.language || 'fr';
  }, [i18n.language]);

  const isProvider = useMemo(() => {
    return user?.role === 'lawyer' || user?.role === 'expat';
  }, [user?.role]);

  const isApprovedProvider = useMemo(() => {
    if (!isProvider || !user) return false;
    return user.role === 'expat' || (user.role === 'lawyer' && user.isApproved === true);
  }, [isProvider, user]);

  // Fonction pour créer un log d'activité
  const createStatusLog = useCallback(async (previousStatus: boolean, newStatus: boolean) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'logs'), {
        type: 'status_change',
        userId: user.id,
        previousStatus: previousStatus ? 'online' : 'offline',
        newStatus: newStatus ? 'online' : 'offline',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur création log:', error);
    }
  }, [user]);

  // Fonction pour mettre à jour le profil SOS
  const updateSOSProfile = useCallback(async (newStatus: boolean) => {
    if (!user || !isProvider) return;

    const sosProfileRef = doc(db, 'sos_profiles', user.id);
    const updateData = {
      isOnline: newStatus,
      availability: newStatus ? 'available' : 'unavailable',
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isVisible: true,
    };

    try {
      await updateDoc(sosProfileRef, updateData);
      console.log(`Profil SOS mis à jour - isOnline: ${newStatus}`);
    } catch (error) {
      console.error('Erreur mise à jour profil SOS:', error);
      
      // Fallback: recherche par uid
      try {
        const sosProfilesQuery = query(
          collection(db, 'sos_profiles'),
          where('uid', '==', user.id)
        );
        
        const sosProfilesSnapshot = await getDocs(sosProfilesQuery);

        if (!sosProfilesSnapshot.empty) {
          const batch = writeBatch(db);
          
          sosProfilesSnapshot.docs.forEach((docRef) => {
            batch.update(docRef.ref, updateData);
          });
          
          await batch.commit();
          console.log('Profils SOS mis à jour via requête alternative');
        } else {
          // Créer le profil SOS s'il n'existe pas
          const newProfileData = {
            uid: user.id,
            type: user.role,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            ...updateData,
            isActive: true,
            isApproved: user.role !== 'lawyer',
            isVerified: false,
            rating: 5.0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await setDoc(sosProfileRef, newProfileData);
          console.log('Profil SOS créé (fallback)');
        }
      } catch (alternativeError) {
        console.error('Erreur méthode alternative:', alternativeError);
        throw alternativeError;
      }
    }
  }, [user, isProvider]);

  // Fonction principale pour changer la disponibilité
  const toggleAvailability = useCallback(async () => {
    console.log('🎯 [TOGGLE-START] Début toggle - État actuel:', isAvailable, 'Loading:', isLoading);
    
    if (!user || isLoading) {
      console.log('⛔ [TOGGLE-ABORT] Abandon toggle - User:', !!user, 'Loading:', isLoading);
      return;
    }

    // Vérification de l'approbation pour les avocats
    if (!isApprovedProvider) {
      console.log('⛔ [TOGGLE-ABORT] Provider non approuvé');
      setStatusSyncError(t('availability.errors.notApproved'));
      return;
    }

    setIsLoading(true);
    setStatusSyncError(null);

    try {
      const newStatus = !isAvailable;
      console.log(`Changement statut ${user.id}: ${newStatus ? 'En ligne' : 'Hors ligne'}`);

      // Créer le log avant la mise à jour
      await createStatusLog(isAvailable, newStatus);

      // 🛡️ Activer protection sync + timeout sécurité
      console.log('🛡️ [TOGGLE] Activation protection sync pour:', newStatus);
      skipNextSyncRef.current = true;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = setTimeout(() => {
        console.log('⏰ [TIMEOUT] Auto-déblocage après 2s');
        skipNextSyncRef.current = false;
      }, 2000);

      // Optimistic update local
      console.log('⚡ [OPTIMISTIC] Mise à jour UI locale:', isAvailable, '->', newStatus);
      setIsAvailable(newStatus);

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.id);
      
      const userUpdateData = {
        isOnline: newStatus,
        availability: newStatus ? 'available' : 'unavailable',
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('📝 [FIRESTORE-WRITE] User ID:', user.id);
      console.log('📝 [FIRESTORE-WRITE] Update data:', userUpdateData);
      console.log('📝 [FIRESTORE-WRITE] User ref path:', userRef.path);

      batch.update(userRef, userUpdateData);

      // Mettre à jour le profil SOS pour les prestataires
      if (isProvider) {
        const sosProfileRef = doc(db, 'sos_profiles', user.id);
        const sosSnap = await getDoc(sosProfileRef);

        const profileUpdate = {
          ...userUpdateData,
          isVisible: true,
        };

        if (sosSnap.exists()) {
          batch.update(sosProfileRef, profileUpdate);
        } else {
          batch.set(sosProfileRef, {
            uid: user.id,
            type: user.role,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            ...profileUpdate,
            isActive: true,
            isApproved: user.role !== 'lawyer',
            isVerified: false,
            rating: 5.0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      console.log('🚀 [FIRESTORE-WRITE] Tentative batch.commit()...');
      await batch.commit();
      console.log('✅ [FIRESTORE] Batch commit réussi');
      
      // ✅ Succès : débloquer protection
      console.log('🔓 [SUCCESS] Déblocage protection après succès Firestore');
      skipNextSyncRef.current = false;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      
      // Déclencher l'événement de synchronisation
      window.dispatchEvent(new CustomEvent('availabilityChanged', { 
        detail: { isOnline: newStatus } 
      }));

    } catch (error) {
      console.error('❌ [ERROR] Erreur mise à jour disponibilité:', error);
      
      // ❌ Erreur : débloquer + rollback optimistic
      console.log('🔙 [ROLLBACK] Rollback optimistic update:', newStatus, '->', isAvailable);
      skipNextSyncRef.current = false;
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      setIsAvailable(isAvailable); // Rollback à l'ancien état
      
      setStatusSyncError(t('availability.errors.updateFailed'));
      
      // Fallback: mettre à jour le profil SOS séparément
      if (isProvider) {
        try {
          await updateSOSProfile(!isAvailable);
          setIsAvailable(!isAvailable);
        } catch (fallbackError) {
          console.error('Erreur fallback:', fallbackError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, isAvailable, isLoading, isProvider, isApprovedProvider, createStatusLog, updateSOSProfile, t]);

  // 🔔 Gestion du modal de rappel
  const handleStayOnline = useCallback(() => {
    setShowReminderModal(false);
  }, []);

  const handleGoOffline = useCallback(() => {
    toggleAvailability();
    setShowReminderModal(false);
  }, [toggleAvailability]);

  const handleDisableReminderToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('disableOnlineReminderUntil', today);
    setShowReminderModal(false);
  }, []);

  // Charger les préférences de notification
  useEffect(() => {
    const prefs = getNotificationPreferences();
    setNotificationPrefs(prefs);
  }, []);

  // Écouter les changements de statut en temps réel
  useEffect(() => {
    if (!user) return;

    setIsAvailable(user.isOnline === true);
    
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', user.id),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          if (userData.isOnline !== undefined && userData.isOnline !== isAvailable) {
            // 🛡️ Ignorer si update en cours
            if (skipNextSyncRef.current) {
              console.log('🛡️ [SYNC-USERS] Sync ignorée pendant update - Firebase:', userData.isOnline, 'Local:', isAvailable);
              return;
            }
            console.log('📡 [SYNC-USERS] Synchronisation depuis Firestore:', isAvailable, '->', userData.isOnline);
            setIsAvailable(userData.isOnline);
            console.log(`✅ [SYNC-USERS] Statut synchronisé depuis Firestore: ${userData.isOnline}`);
            
            window.dispatchEvent(new CustomEvent('availabilityChanged', { 
              detail: { isOnline: userData.isOnline } 
            }));
          }
        }
      },
      (error) => {
        console.error('Erreur écoute changements statut:', error);
        setStatusSyncError(t('availability.errors.syncFailed'));
      }
    );
    
    // Écouter le profil SOS pour les prestataires
    let unsubscribeSOS: (() => void) | null = null;
    if (isProvider) {
      unsubscribeSOS = onSnapshot(
        doc(db, 'sos_profiles', user.id),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const sosData = docSnapshot.data();
            if (sosData.isOnline !== undefined && sosData.isOnline !== isAvailable) {
              // 🛡️ Ignorer si update en cours
              if (skipNextSyncRef.current) {
                console.log('🛡️ [SYNC-SOS] Sync ignorée pendant update - Firebase:', sosData.isOnline, 'Local:', isAvailable);
                return;
              }
              console.log('📡 [SYNC-SOS] Synchronisation depuis SOS profile:', isAvailable, '->', sosData.isOnline);
              setIsAvailable(sosData.isOnline);
              console.log(`✅ [SYNC-SOS] Statut SOS synchronisé: ${sosData.isOnline}`);
            }
          }
        },
        (error) => {
          console.error('Erreur écoute profil SOS:', error);
        }
      );
    }
    
    return () => {
      unsubscribeUser();
      unsubscribeSOS?.();
    };
  }, [user, isProvider, isAvailable, t]);

  // Gestion des rappels de disponibilité
  useEffect(() => {
    if (!isAvailable) return;

    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      const disableUntil = localStorage.getItem('disableOnlineReminderUntil');

      if (disableUntil !== today) {
        const langCode = i18n.language || 'en';

        // Respecter les préférences de l'utilisateur
        if (notificationPrefs.enableSound || notificationPrefs.enableVoice) {
          playAvailabilityReminder(langCode, notificationPrefs);
        }

        const now = Date.now();
        const lastVoice = parseInt(localStorage.getItem('lastVoiceReminderTimestamp') || '0', 10);

        if (notificationPrefs.enableModal && now - lastVoice > 59 * 60 * 1000) {
          setShowReminderModal(true);
        }
      }
    }, 300000); // toutes les 5 minutes

    return () => clearInterval(interval);
  }, [isAvailable, i18n.language, notificationPrefs]);

  // Écouter les changements du profil SOS
  useEffect(() => {
    if (!user?.id || !isProvider) return;

    const sosProfileRef = doc(db, 'sos_profiles', user.id);
    const unsubscribe = onSnapshot(sosProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isOnline !== isAvailable) {
          // 🛡️ Ignorer si update en cours
          if (skipNextSyncRef.current) {
            console.log('🛡️ [SYNC-SOS-PROFILE] Sync ignorée pendant update - Firebase:', data.isOnline, 'Local:', isAvailable);
            return;
          }
          console.log('📡 [SYNC-SOS-PROFILE] Synchronisation depuis SOS profile listener:', isAvailable, '->', data.isOnline);
          setIsAvailable(data.isOnline === true);
        }
      }
    }, (error) => {
      console.error('Erreur écoute profil SOS:', error);
    });

    return () => unsubscribe();
  }, [user?.id, isProvider, isAvailable]);

  // Cleanup timeout au démontage
  useEffect(() => {
    return () => {
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
      }
    };
  }, []);

  // ✅ MAINTENANT ON PEUT FAIRE LES VÉRIFICATIONS CONDITIONNELLES
  // Ne pas afficher pour les clients ou utilisateurs non connectés
  if (!user || !isProvider) return null;

  // Message d'erreur avec design mobile-first
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
              ${isAvailable 
                ? 'bg-green-600 focus:ring-green-500' 
                : 'bg-red-500 focus:ring-red-500'
              }
            `}
            aria-pressed={isAvailable}
            aria-label={isAvailable ? t('availability.actions.goOffline') : t('availability.actions.goOnline')}
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

