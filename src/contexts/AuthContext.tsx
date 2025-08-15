/* eslint-disable react-refresh/only-export-components */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
  useContext,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reload,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import type { User } from './types';
import type { AuthContextType } from './AuthContextBase';
import { AuthContext as BaseAuthContext } from './AuthContextBase';

/* =========================================================
   Typages utilitaires
   ========================================================= */
type ConnectionSpeed = 'slow' | 'medium' | 'fast';
type DeviceType = 'mobile' | 'tablet' | 'desktop';

type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g';
interface NetworkInformation {
  effectiveType?: NetworkEffectiveType;
}
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface DeviceInfo {
  type: DeviceType;
  os: string;
  browser: string;
  isOnline: boolean;
  connectionSpeed: ConnectionSpeed;
}

interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
}

interface AppError extends Error {
  code?: string;
}

/* =========================================================
   Helpers d’environnement / device
   ========================================================= */
const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      type: 'desktop',
      os: 'unknown',
      browser: 'unknown',
      isOnline: true,
      connectionSpeed: 'fast',
    };
  }

  const ua = navigator.userAgent;
  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  const type: DeviceType =
    /Android|iPhone|iPod/i.test(ua) ? 'mobile' :
    /iPad|Android.*tablet/i.test(ua) ? 'tablet' : 'desktop';

  let os = 'unknown';
  if (/Android/i.test(ua)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'ios';
  else if (/Windows/i.test(ua)) os = 'windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'mac';
  else if (/Linux/i.test(ua)) os = 'linux';

  let browser = 'unknown';
  if (/Edg\//i.test(ua)) browser = 'edge';
  else if (/Chrome\//i.test(ua)) browser = 'chrome';
  else if (/Firefox\//i.test(ua)) browser = 'firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';

  let connectionSpeed: ConnectionSpeed = 'fast';
  const eff = conn?.effectiveType;
  if (eff === 'slow-2g' || eff === '2g') connectionSpeed = 'slow';
  else if (eff === '3g') connectionSpeed = 'medium';

  return { type, os, browser, isOnline: navigator.onLine, connectionSpeed };
};

/* =========================================================
   Helpers email (locaux)
   ========================================================= */
const normalizeEmail = (s: string): string =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\u00A0/g, '')            // NBSP
    .replace(/[\u2000-\u200D]/g, '');  // espaces fines / zero-width

const isValidEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

type LogPayload = Record<string, unknown>;
const logAuthEvent = async (type: string, data: LogPayload = {}): Promise<void> => {
  try {
    await addDoc(collection(db, 'logs'), {
      type,
      category: 'authentication',
      ...data,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : '',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      screenSize: typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : '',
      device: getDeviceInfo(),
    });
  } catch (e) {
    console.warn('[Auth] logAuthEvent error', e);
  }
};

/* =========================================================
   Utils photo de profil
   ========================================================= */
const processProfilePhoto = async (
  photoUrl: string | undefined,
  uid: string,
  provider: 'google' | 'manual'
): Promise<string> => {
  try {
    if (!photoUrl) return '/default-avatar.png';

    if (provider === 'google' && photoUrl.includes('googleusercontent.com')) {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(photoUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(to);
        if (res.ok) {
          const size = getDeviceInfo().type === 'mobile' ? 's150-c' : 's300-c';
          return photoUrl.replace(/s\d+-c/, size);
        }
      } catch {
        /* no-op */ void 0;
      }
      return '/default-avatar.png';
    }

    if (photoUrl.startsWith('data:image')) {
      if (typeof document === 'undefined') return '/default-avatar.png';
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '/default-avatar.png';

      const img = new Image();
      return await new Promise<string>((resolve) => {
        img.onload = async () => {
          try {
            const maxSize = getDeviceInfo().type === 'mobile' ? 200 : 400;
            const ratio = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = Math.max(1, Math.round(img.width * ratio));
            canvas.height = Math.max(1, Math.round(img.height * ratio));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);

            const storageRef = ref(storage, `profilePhotos/${uid}/${Date.now()}.jpg`);
            const upload = await uploadString(storageRef, compressed, 'data_url');
            const url = await getDownloadURL(upload.ref);
            resolve(url);
          } catch {
            resolve('/default-avatar.png');
          }
        };
        img.onerror = () => resolve('/default-avatar.png');
        img.src = photoUrl;
      });
    }

    if (photoUrl.startsWith('http')) return photoUrl;
    return '/default-avatar.png';
  } catch {
    return '/default-avatar.png';
  }
};

/* =========================================================
   Création / lecture du user Firestore
   ========================================================= */
const generateAffiliateCode = (uid: string, email = ''): string => {
  const shortUid = uid.slice(0, 6).toUpperCase();
  const prefix = email.split('@')[0]?.slice(0, 3).toUpperCase() || 'USR';
  const tail = Date.now().toString().slice(-3);
  return `ULIX-${prefix}${shortUid}${tail}`;
};

const createSOSProfile = async (
  uid: string,
  userData: Partial<User>,
  role: 'lawyer' | 'expat'
): Promise<void> => {
  try {
    const sosRef = doc(db, 'sos_profiles', uid);
    const country =
      userData.currentCountry || (userData as { residenceCountry?: string }).residenceCountry || '';
    const languages = (userData.languages as string[] | undefined) || ['Français'];

    await setDoc(
      sosRef,
      {
        uid,
        type: role,
        fullName: userData.fullName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone || '',
        phoneCountryCode: userData.phoneCountryCode || '+33',
        languages,
        country,
        description: userData.bio || '',
        profilePhoto: userData.profilePhoto,
        photoURL: userData.profilePhoto,
        avatar: userData.profilePhoto,
        isActive: false,
        isApproved: role !== 'lawyer',
        isVerified: false,
        isVisible: true,
        isVisibleOnMap: true,
        isOnline: false,
        rating: 5.0,
        reviewCount: 0,
        responseTime: '< 5 minutes',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('Erreur création profil SOS:', e);
  }
};

const createUserDocumentInFirestore = async (
  firebaseUser: FirebaseUser,
  userData: Partial<User>
): Promise<User> => {
  const emailLower = (firebaseUser.email || '').trim().toLowerCase();
  const userRef = doc(db, 'users', firebaseUser.uid);
  const docSnap = await getDoc(userRef);

  // Mise à jour si existe
  if (docSnap.exists()) {
    const existing = docSnap.data() as Partial<User>;
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
    });
    return {
      id: firebaseUser.uid,
      ...existing,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    } as User;
  }

  // Création
  const providerId = firebaseUser.providerData[0]?.providerId;
  const role = userData.role as User['role'];
  if (!role || !['client', 'lawyer', 'expat', 'admin'].includes(role)) {
    throw new Error(`Rôle utilisateur invalide: ${String(role)}`);
  }
  if (providerId === 'google.com' && role !== 'client') {
    throw new Error('GOOGLE_ROLE_RESTRICTION');
  }

  const profilePhoto = await processProfilePhoto(
    userData.profilePhoto || firebaseUser.photoURL || undefined,
    firebaseUser.uid,
    providerId === 'google.com' ? 'google' : 'manual'
  );

  const displayNameParts = firebaseUser.displayName?.split(' ') || [];
  const firstName = userData.firstName || displayNameParts[0] || '';
  const lastName = userData.lastName || displayNameParts.slice(1).join(' ') || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const affiliateCode = generateAffiliateCode(firebaseUser.uid, firebaseUser.email ?? '');

  const newUser: Partial<User> & {
    id: string;
    uid: string;
    email: string;
    role: User['role'];
  } = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: emailLower,
    emailLower,
    firstName,
    lastName,
    displayName: fullName,
    fullName,
    profilePhoto,
    photoURL: profilePhoto,
    avatar: profilePhoto,
    role,
    isApproved: role === 'client' || providerId === 'google.com',
    isActive: true,
    isVerified: firebaseUser.emailVerified,
    isVerifiedEmail: firebaseUser.emailVerified,
    preferredLanguage: userData.preferredLanguage || 'fr',
    lang: userData.preferredLanguage || 'fr',
    isOnline: role === 'client',
    isSOS: role === 'lawyer' || role === 'expat',
    rating: 5.0,
    reviewCount: 0,
    totalCalls: 0,
    points: 0,
    provider: providerId || 'password',
    affiliateCode,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  await setDoc(userRef, {
    ...newUser,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  if (role === 'lawyer' || role === 'expat') {
    await createSOSProfile(firebaseUser.uid, newUser, role);
  }

  await logAuthEvent('user_creation', {
    userId: firebaseUser.uid,
    userRole: role,
    provider: providerId || 'password',
  });

  return newUser as User;
};

const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  const refUser = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(refUser);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<User>;

  // Mise à jour légère (non bloquant)
  updateDoc(refUser, {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
  }).catch(() => { /* no-op */ });

  return {
    id: firebaseUser.uid,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  } as User;
};

/* =========================================================
   Mise à jour présence (sos_profiles = source de vérité)
   ========================================================= */
const writeSosPresence = async (
  userId: string,
  role: User['role'] | undefined,
  isOnline: boolean
): Promise<void> => {
  const sosRef = doc(db, 'sos_profiles', userId);
  const payload = {
    isOnline,
    availability: isOnline ? 'available' : 'unavailable',
    lastStatusChange: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isVisible: true,
    isVisibleOnMap: true,
  };

  try {
    await updateDoc(sosRef, payload);
  } catch {
    // fallback: créer si absent
    await setDoc(
      sosRef,
      {
        uid: userId,
        type: role || 'expat',
        fullName: '',
        rating: 5,
        reviewCount: 0,
        isActive: true,
        isApproved: role !== 'lawyer',
        isVerified: false,
        createdAt: serverTimestamp(),
        ...payload,
      },
      { merge: true }
    );
  }
};

const writeUsersPresenceBestEffort = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isOnline,
      availability: isOnline ? 'available' : 'unavailable',
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[Presence] update users ignoré (règles):', e);
  }
};

/* =========================================================
   Provider
   ========================================================= */
interface Props {
  children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authMetrics, setAuthMetrics] = useState<AuthMetrics>({
    loginAttempts: 0,
    lastAttempt: new Date(),
    successfulLogins: 0,
    failedLogins: 0,
    googleAttempts: 0,
    roleRestrictionBlocks: 0,
  });

  const deviceInfo = useMemo(getDeviceInfo, []);

  // Synchronise le state local avec Firestore users/{uid}
  const updateUserState = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const u = await getUserDocument(fbUser);
      if (u) {
        setUser({ ...u, isVerifiedEmail: fbUser.emailVerified });
        setAuthMetrics((m) => ({
          ...m,
          successfulLogins: m.successfulLogins + 1,
          lastAttempt: new Date(),
        }));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('[Auth] updateUserState error:', e);
      setUser(null);
    }
  }, []);

  // onAuthStateChanged
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (current) => {
      setIsLoading(true);
      try {
        if (current) {
          setFirebaseUser(current);
          await updateUserState(current);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
      }
    });
    return () => unsub();
  }, [updateUserState]);

  // Snapshot temps réel sur users/{uid}
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const unsub = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Partial<User>;
        setUser((prev) => {
          const merged: User = {
            ...(prev ?? ({} as User)),
            ...(data as Partial<User>),
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            isVerifiedEmail: firebaseUser.emailVerified,
          } as User;
          return merged;
        });
      },
      (e) => console.error('[Auth] users snapshot error', e)
    );
    return () => unsub();
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  // Écoute l’événement global "availabilityChanged"
  type AvailabilityChangedDetail = { isOnline: boolean };
  type AvailabilityEventName = 'availabilityChanged' | 'availability:changed';
  const availabilityHandler = useCallback((e: Event) => {
    const ce = (e as CustomEvent<AvailabilityChangedDetail>);
    if (typeof ce.detail?.isOnline === 'boolean') {
      setUser((prev) => (prev ? { ...prev, isOnline: ce.detail.isOnline } as User : prev));
    }
  }, []);
  useEffect(() => {
    const names: AvailabilityEventName[] = ['availabilityChanged', 'availability:changed'];
    names.forEach((n) => window.addEventListener(n, availabilityHandler as EventListener));
    return () => {
      names.forEach((n) => window.removeEventListener(n, availabilityHandler as EventListener));
    };
  }, [availabilityHandler]);

  /* ============================
     Méthodes d’auth
     ============================ */
  const isUserLoggedIn = useCallback(() => !!user || !!firebaseUser, [user, firebaseUser]);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({ ...m, loginAttempts: m.loginAttempts + 1, lastAttempt: new Date() }));

    if (!email || !password) {
      const msg = 'Email et mot de passe sont obligatoires';
      setError(msg);
      setIsLoading(false);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      throw new Error(msg);
    }

    try {
      const timeout = deviceInfo.connectionSpeed === 'slow' ? 15000 : 10000;
      const loginPromise = signInWithEmailAndPassword(auth, email, password);
      const cred = await Promise.race([
        loginPromise,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('auth/timeout')), timeout)),
      ]);
      await logAuthEvent('successful_login', { userId: cred.user.uid, provider: 'email' });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'auth/timeout'
          ? 'Connexion trop lente, réessayez.'
          : 'Email ou mot de passe invalide.';
      setError(msg);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      await logAuthEvent('login_failed', { error: e instanceof Error ? e.message : String(e) });
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({
      ...m,
      loginAttempts: m.loginAttempts + 1,
      googleAttempts: m.googleAttempts + 1,
      lastAttempt: new Date(),
    }));
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      if (window.crossOriginIsolated === true) {
        await signInWithRedirect(auth, provider);
        return;
      }
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      // S’il existe déjà
      const userRef = doc(db, 'users', googleUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const existing = snap.data() as Partial<User>;
        if (existing.role && existing.role !== 'client') {
          await firebaseSignOut(auth);
          setAuthMetrics((m) => ({
            ...m,
            failedLogins: m.failedLogins + 1,
            roleRestrictionBlocks: m.roleRestrictionBlocks + 1,
          }));
          const msg = 'La connexion Google est réservée aux clients.';
          setError(msg);
          await logAuthEvent('google_login_role_restriction', { userId: googleUser.uid, role: existing.role });
          throw new Error('GOOGLE_ROLE_RESTRICTION');
        }
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
          ...(googleUser.photoURL &&
            googleUser.photoURL !== existing.photoURL && {
              photoURL: googleUser.photoURL,
              profilePhoto: googleUser.photoURL,
              avatar: googleUser.photoURL,
            }),
        });
      } else {
        // Création user client
        await createUserDocumentInFirestore(googleUser, {
          role: 'client',
          email: googleUser.email || '',
          profilePhoto: googleUser.photoURL || '',
          photoURL: googleUser.photoURL || '',
          avatar: googleUser.photoURL || '',
          preferredLanguage: 'fr',
          isApproved: true,
          isActive: true,
          provider: 'google.com',
          isVerified: googleUser.emailVerified,
          isVerifiedEmail: googleUser.emailVerified,
        });
      }

      await logAuthEvent('successful_google_login', { userId: googleUser.uid, userEmail: googleUser.email });
    } catch (e) {
      if (!(e instanceof Error && e.message === 'GOOGLE_ROLE_RESTRICTION')) {
        const msg = 'Connexion Google annulée ou impossible.';
        setError(msg);
        setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
        await logAuthEvent('google_login_failed', { error: e instanceof Error ? e.message : String(e) });
        throw new Error(msg);
      } else {
        throw e;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Récupération redirect Google en contexte crossOriginIsolated
  const redirectHandledRef = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        if (window.crossOriginIsolated !== true) return;
        if (redirectHandledRef.current) return;
        const result = await getRedirectResult(auth);
        if (!result?.user) return;
        redirectHandledRef.current = true;
        const googleUser = result.user;

        const userRef = doc(db, 'users', googleUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const existing = userDoc.data() as Partial<User>;
          if (existing.role && existing.role !== 'client') {
            await firebaseSignOut(auth);
            setAuthMetrics((m) => ({
              ...m,
              failedLogins: m.failedLogins + 1,
              roleRestrictionBlocks: m.roleRestrictionBlocks + 1,
            }));
            const msg = 'La connexion Google est réservée aux clients.';
            setError(msg);
            await logAuthEvent('google_login_role_restriction', { userId: googleUser.uid, role: existing.role });
            return;
          }
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
          });
        } else {
          await createUserDocumentInFirestore(googleUser, {
            role: 'client',
            email: googleUser.email || '',
            profilePhoto: googleUser.photoURL || '',
            photoURL: googleUser.photoURL || '',
            avatar: googleUser.photoURL || '',
            preferredLanguage: 'fr',
            isApproved: true,
            isActive: true,
            provider: 'google.com',
            isVerified: googleUser.emailVerified,
            isVerifiedEmail: googleUser.emailVerified,
          });
        }

        await logAuthEvent('successful_google_login', { userId: googleUser.uid, userEmail: googleUser.email });
      } catch (e) {
        console.warn('[Auth] getRedirectResult error', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // REGISTER corrigé (pré-check email + rollback Firestore)
  const register = async (userData: Partial<User>, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Vérifs de base
      if (!userData.role || !['client', 'lawyer', 'expat', 'admin'].includes(userData.role)) {
        const err = new Error('Rôle utilisateur invalide ou manquant.') as AppError;
        err.code = 'sos/invalid-role';
        throw err;
      }
      if (!userData.email || !password) {
        const err = new Error('Email et mot de passe sont obligatoires') as AppError;
        err.code = 'sos/missing-credentials';
        throw err;
      }
      if (password.length < 6) {
        const err = new Error('Le mot de passe doit contenir au moins 6 caractères') as AppError;
        err.code = 'auth/weak-password';
        throw err;
      }

      // Normalisation + validation email
      const email = normalizeEmail(userData.email);
      if (!isValidEmail(email)) {
        const err = new Error('Adresse email invalide') as AppError;
        err.code = 'auth/invalid-email';
        throw err;
      }

      // Pré-check Auth
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        if (methods.includes('password')) {
          const err = new Error('Cet email est déjà associé à un compte.') as AppError;
          err.code = 'auth/email-already-in-use';
          throw err;
        }
        if (methods.includes('google.com')) {
          const err = new Error('Cet email est lié à un compte Google.') as AppError;
          err.code = 'sos/email-linked-to-google';
          throw err;
        }
        const err = new Error("Email lié à un autre fournisseur d'identité.") as AppError;
        err.code = 'sos/email-linked-to-other';
        throw err;
      }

      // Création Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Photo de profil finale
      let finalProfilePhotoURL = '/default-avatar.png';
      if (userData.profilePhoto?.startsWith('data:image')) {
        finalProfilePhotoURL = await processProfilePhoto(userData.profilePhoto, cred.user.uid, 'manual');
      } else if (userData.profilePhoto?.startsWith('http')) {
        finalProfilePhotoURL = userData.profilePhoto;
      }

      // Création Firestore + rollback si échec
      try {
        await createUserDocumentInFirestore(cred.user, {
          ...userData,
          email,
          role: userData.role as User['role'],
          profilePhoto: finalProfilePhotoURL,
          photoURL: finalProfilePhotoURL,
          avatar: finalProfilePhotoURL,
          provider: 'password',
        });
      } catch (docErr) {
        try { await deleteUser(cred.user); } catch { /* no-op */ }
        throw docErr;
      }

      // MAJ du profil Auth (non bloquant)
      if (userData.firstName || userData.lastName) {
        await updateProfile(cred.user, {
          displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          photoURL: finalProfilePhotoURL || null,
        }).catch(() => { /* no-op */ });
      }

      // Email de vérification (non bloquant)
      try {
        await sendEmailVerification(cred.user);
      } catch {
        /* no-op */ void 0;
      }

      await logAuthEvent('registration_success', { userId: cred.user.uid, role: userData.role });
    } catch (err) {
      const e = err as AppError;
      // Mapping d'erreurs clair
      let msg = 'Inscription impossible. Réessayez.';
      switch (e?.code) {
        case 'auth/email-already-in-use':
          msg = 'Cet email est déjà associé à un compte. Connectez-vous ou réinitialisez votre mot de passe.';
          break;
        case 'sos/email-linked-to-google':
          msg = 'Cet email est lié à un compte Google. Utilisez « Se connecter avec Google » puis complétez votre profil.';
          break;
        case 'auth/invalid-email':
          msg = 'Adresse email invalide.';
          break;
        case 'auth/weak-password':
          msg = 'Le mot de passe doit contenir au moins 6 caractères.';
          break;
        case 'sos/invalid-role':
        case 'sos/missing-credentials':
          msg = e.message || msg;
          break;
        default:
          break;
      }
      setError(msg);
      await logAuthEvent('registration_error', {
        errorCode: e?.code ?? 'unknown',
        errorMessage: e?.message ?? String(e),
      });
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const uid = user?.id || user?.uid;
      const role = user?.role;
      if (uid && (role === 'lawyer' || role === 'expat')) {
        await Promise.allSettled([writeSosPresence(uid, role, false), writeUsersPresenceBestEffort(uid, false)]);
      }
      await logAuthEvent('logout', { userId: uid });
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      setAuthMetrics({
        loginAttempts: 0,
        lastAttempt: new Date(),
        successfulLogins: 0,
        failedLogins: 0,
        googleAttempts: 0,
        roleRestrictionBlocks: 0,
      });
    } catch (e) {
      console.error('[Auth] logout error:', e);
    }
  };

  const clearError = (): void => setError(null);

  const refreshUser = async (): Promise<void> => {
    if (!firebaseUser) return;
    try {
      setIsLoading(true);
      await reload(firebaseUser);
      await updateUserState(firebaseUser);
    } catch (e) {
      console.error('[Auth] refreshUser error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getLastLoginInfo = useCallback((): { date: Date | null; device: string | null } => {
    if (!user) return { date: null, device: null };
    const deviceType = deviceInfo.type;
    const os = deviceInfo.os;
    return { date: user.lastLoginAt || null, device: `${deviceType} (${os})` };
  }, [user, deviceInfo]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    isUserLoggedIn,
    isLoading,
    authInitialized,
    error,
    authMetrics,
    deviceInfo,
    login,
    loginWithGoogle,
    register,
    logout,
    clearError,
    refreshUser,
    getLastLoginInfo,
  };

  return <BaseAuthContext.Provider value={value}>{children}</BaseAuthContext.Provider>;
};

export default AuthProvider;
/* =========================================================
   Compat : re-export d’un hook useAuth ici aussi
   (pour les imports existants: import { useAuth } from '../contexts/AuthContext')
   ========================================================= */
export const useAuth = () => {
  const ctx = useContext(BaseAuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
};
