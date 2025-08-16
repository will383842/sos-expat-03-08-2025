/* eslint-disable react-refresh/only-export-components */
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
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
  Timestamp,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import type { User } from './types';
import type { AuthContextType } from './AuthContextBase';
import { AuthContext as BaseAuthContext } from './AuthContextBase';

/* =========================================================
   Types utilitaires
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
  passwordResetRequests: number;
  emailUpdateAttempts: number;
  profileUpdateAttempts: number;
}

interface AppError extends Error {
  code?: string;
}

/* =========================================================
   Helpers d'environnement / device
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
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(photoUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
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
      userData.currentCountry || 
      (userData as { residenceCountry?: string }).residenceCountry || 
      userData.currentPresenceCountry ||
      userData.country || '';
    
    const languages = (userData.languages as string[] | undefined) || 
                     (userData.languagesSpoken as string[] | undefined) || 
                     ['Français'];

    const baseProfile = {
      uid,
      id: uid,
      type: role,
      role: role,
      fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      name: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      emailLower: userData.email?.toLowerCase(),
      phone: userData.phone || '',
      phoneNumber: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      whatsapp: userData.whatsapp || '',
      whatsappNumber: userData.whatsappNumber || '',
      whatsappCountryCode: userData.whatsappCountryCode || '+33',
      languages,
      languagesSpoken: languages,
      country,
      currentCountry: userData.currentCountry || country,
      currentPresenceCountry: userData.currentPresenceCountry || country,
      interventionCountry: userData.interventionCountry || country,
      practiceCountries: userData.practiceCountries || [country],
      description: userData.bio || userData.description || '',
      bio: userData.bio || userData.description || '',
      profilePhoto: userData.profilePhoto,
      photoURL: userData.profilePhoto,
      avatar: userData.profilePhoto,
      isActive: false,
      isApproved: role !== 'lawyer',
      isVerified: false,
      isVisible: true,
      isVisibleOnMap: true,
      isOnline: false,
      availability: 'available',
      rating: 5.0,
      reviewCount: 0,
      responseTime: '< 5 minutes',
      price: role === 'lawyer' ? 49 : 19,
      duration: 30,
      yearsOfExperience: userData.yearsOfExperience || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Ajouter des champs spécifiques selon le rôle
    if (role === 'lawyer') {
      Object.assign(baseProfile, {
        specialties: userData.specialties || [],
        education: userData.education || userData.educations || [],
        graduationYear: userData.graduationYear || new Date().getFullYear() - 5,
        barAdmission: userData.barAdmission || '',
        licenseNumber: userData.licenseNumber || '',
      });
    } else if (role === 'expat') {
      Object.assign(baseProfile, {
        helpTypes: userData.helpTypes || [],
        yearsAsExpat: userData.yearsAsExpat || userData.yearsOfExperience || 0,
        originCountry: userData.originCountry || '',
        residenceCountry: userData.residenceCountry || country,
      });
    }

    await setDoc(sosRef, baseProfile, { merge: true });
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
      isOnline: existing.role === 'client',
    });
    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      ...existing,
      createdAt: existing.createdAt instanceof Timestamp ? existing.createdAt.toDate() : new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isVerifiedEmail: firebaseUser.emailVerified,
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
  const fullName = userData.fullName || `${firstName} ${lastName}`.trim();
  const affiliateCode = generateAffiliateCode(firebaseUser.uid, firebaseUser.email ?? '');

  const baseUserData = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: emailLower,
    emailLower,
    firstName,
    lastName,
    displayName: fullName,
    fullName,
    name: fullName,
    profilePhoto,
    photoURL: profilePhoto,
    avatar: profilePhoto,
    role,
    type: role,
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
    languages: userData.languages || userData.languagesSpoken || ['fr'],
    languagesSpoken: userData.languages || userData.languagesSpoken || ['fr'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  // Ajouter des champs spécifiques selon le rôle
  const newUser: Partial<User> & {
    id: string;
    uid: string;
    email: string;
    role: User['role'];
  } = { ...baseUserData };

  if (role === 'client') {
    // Pas de champs supplémentaires spécifiques pour client
  } else if (role === 'lawyer') {
    Object.assign(newUser, {
      phone: userData.phone || '',
      phoneNumber: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      whatsapp: userData.whatsapp || '',
      whatsappNumber: userData.whatsappNumber || '',
      whatsappCountryCode: userData.whatsappCountryCode || '+33',
      currentCountry: userData.currentCountry || '',
      currentPresenceCountry: userData.currentPresenceCountry || '',
      practiceCountries: userData.practiceCountries || [],
      specialties: userData.specialties || [],
      education: userData.education || userData.educations || [],
      yearsOfExperience: userData.yearsOfExperience || 0,
      graduationYear: userData.graduationYear || new Date().getFullYear() - 5,
      bio: userData.bio || userData.description || '',
      description: userData.bio || userData.description || '',
      availability: userData.availability || 'available',
      barAdmission: userData.barAdmission || '',
      licenseNumber: userData.licenseNumber || '',
      price: 49,
      duration: 30,
    });
  } else if (role === 'expat') {
    Object.assign(newUser, {
      phone: userData.phone || '',
      phoneNumber: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      whatsapp: userData.whatsapp || '',
      whatsappNumber: userData.whatsappNumber || '',
      whatsappCountryCode: userData.whatsappCountryCode || '+33',
      currentCountry: userData.currentCountry || '',
      currentPresenceCountry: userData.currentPresenceCountry || '',
      interventionCountry: userData.interventionCountry || '',
      country: userData.currentPresenceCountry || userData.country || '',
      helpTypes: userData.helpTypes || [],
      yearsAsExpat: userData.yearsAsExpat || userData.yearsOfExperience || 0,
      yearsOfExperience: userData.yearsOfExperience || userData.yearsAsExpat || 0,
      bio: userData.bio || userData.description || '',
      description: userData.bio || userData.description || '',
      availability: userData.availability || 'available',
      originCountry: userData.originCountry || '',
      residenceCountry: userData.residenceCountry || userData.currentCountry || '',
      price: 19,
      duration: 30,
    });
  } else if (role === 'admin') {
    Object.assign(newUser, {
      permissions: userData.permissions || ['read', 'write'],
      department: userData.department || 'general',
    });
  }

  // Créer le document dans Firestore avec les timestamps serveur
  const firestoreData = {
    ...newUser,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(userRef, firestoreData);

  // Créer le profil SOS si nécessaire
  if (role === 'lawyer' || role === 'expat') {
    await createSOSProfile(firebaseUser.uid, newUser, role);
  }

  await logAuthEvent('user_creation', {
    userId: firebaseUser.uid,
    userRole: role,
    provider: providerId || 'password',
    email: emailLower,
    hasProfilePhoto: !!profilePhoto && profilePhoto !== '/default-avatar.png',
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
    isOnline: data.role === 'client',
  }).catch(() => { /* no-op */ });

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isVerifiedEmail: firebaseUser.emailVerified,
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
        id: userId,
        type: role || 'expat',
        role: role || 'expat',
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
    passwordResetRequests: 0,
    emailUpdateAttempts: 0,
    profileUpdateAttempts: 0,
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
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (prev?.createdAt || new Date()),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
            lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : new Date(),
            isVerifiedEmail: firebaseUser.emailVerified,
          } as User;
          return merged;
        });
      },
      (e) => console.error('[Auth] users snapshot error', e)
    );
    return () => unsub();
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  // Écoute l'événement global "availabilityChanged"
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
     Méthodes d'auth
     ============================ */
  const isUserLoggedIn = useCallback(() => !!user || !!firebaseUser, [user, firebaseUser]);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<void> => {
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
      // Configurer la persistance avant la connexion
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      const timeout = deviceInfo.connectionSpeed === 'slow' ? 15000 : 10000;
      const loginPromise = signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      const cred = await Promise.race([
        loginPromise,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('auth/timeout')), timeout)),
      ]);
      
      await logAuthEvent('successful_login', { 
        userId: cred.user.uid, 
        provider: 'email',
        rememberMe,
        deviceInfo 
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'auth/timeout'
          ? 'Connexion trop lente, réessayez.'
          : 'Email ou mot de passe invalide.';
      setError(msg);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      await logAuthEvent('login_failed', { 
        error: e instanceof Error ? e.message : String(e),
        email: normalizeEmail(email),
        deviceInfo 
      });
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (rememberMe: boolean = false): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({
      ...m,
      loginAttempts: m.loginAttempts + 1,
      googleAttempts: m.googleAttempts + 1,
      lastAttempt: new Date(),
    }));
    try {
      // Configurer la persistance avant la connexion Google
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

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

      // S'il existe déjà
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
          await logAuthEvent('google_login_role_restriction', { 
            userId: googleUser.uid, 
            role: existing.role,
            email: googleUser.email,
            deviceInfo 
          });
          throw new Error('GOOGLE_ROLE_RESTRICTION');
        }
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
          isOnline: true,
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

      await logAuthEvent('successful_google_login', { 
        userId: googleUser.uid, 
        userEmail: googleUser.email,
        rememberMe,
        deviceInfo 
      });
    } catch (e) {
      if (!(e instanceof Error && e.message === 'GOOGLE_ROLE_RESTRICTION')) {
        const msg = 'Connexion Google annulée ou impossible.';
        setError(msg);
        setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
        await logAuthEvent('google_login_failed', { 
          error: e instanceof Error ? e.message : String(e),
          deviceInfo 
        });
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
            await logAuthEvent('google_login_role_restriction', { 
              userId: googleUser.uid, 
              role: existing.role,
              email: googleUser.email,
              deviceInfo 
            });
            return;
          }
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
            isOnline: true,
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

        await logAuthEvent('successful_google_login', { 
          userId: googleUser.uid, 
          userEmail: googleUser.email,
          deviceInfo 
        });
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
      // Vérifications de base
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
        const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        await updateProfile(cred.user, {
          displayName,
          photoURL: finalProfilePhotoURL || null,
        }).catch(() => { /* no-op */ });
      }

      // Email de vérification (non bloquant)
      try {
        await sendEmailVerification(cred.user);
      } catch {
        /* no-op */ void 0;
      }

      await logAuthEvent('registration_success', { 
        userId: cred.user.uid, 
        role: userData.role,
        email,
        hasProfilePhoto: !!finalProfilePhotoURL && finalProfilePhotoURL !== '/default-avatar.png',
        deviceInfo 
      });
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
        email: userData.email,
        role: userData.role,
        deviceInfo
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
      
      // Log de déconnexion
      await logAuthEvent('logout', { 
        userId: uid,
        role,
        deviceInfo 
      });

      // Mettre à jour la présence si c'est un SOS
      if (uid && (role === 'lawyer' || role === 'expat')) {
        await Promise.allSettled([
          writeSosPresence(uid, role, false), 
          writeUsersPresenceBestEffort(uid, false)
        ]);
      }

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
        passwordResetRequests: 0,
        emailUpdateAttempts: 0,
        profileUpdateAttempts: 0,
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

  // Nouvelles méthodes pour la gestion complète du profil utilisateur
  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!firebaseUser || !user) throw new Error('Utilisateur non connecté');
    
    setAuthMetrics((m) => ({ ...m, profileUpdateAttempts: m.profileUpdateAttempts + 1 }));
    
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      // Traiter la photo de profil si nécessaire
      let finalUpdates = { ...updates };
      if (updates.profilePhoto && updates.profilePhoto.startsWith('data:image')) {
        finalUpdates.profilePhoto = await processProfilePhoto(
          updates.profilePhoto, 
          firebaseUser.uid, 
          'manual'
        );
        finalUpdates.photoURL = finalUpdates.profilePhoto;
        finalUpdates.avatar = finalUpdates.profilePhoto;
      }
      
      // Mettre à jour Firestore
      await updateDoc(userRef, {
        ...finalUpdates,
        updatedAt: serverTimestamp(),
      });

      // Mettre à jour le profil Firebase Auth si nécessaire
      if (updates.firstName || updates.lastName || updates.profilePhoto) {
        const displayName = `${updates.firstName || user.firstName || ''} ${updates.lastName || user.lastName || ''}`.trim();
        await updateProfile(firebaseUser, {
          displayName,
          photoURL: finalUpdates.profilePhoto || user.profilePhoto || null,
        });
      }

      // Mettre à jour le profil SOS si applicable
      if (user.role === 'lawyer' || user.role === 'expat') {
        const sosRef = doc(db, 'sos_profiles', firebaseUser.uid);
        await updateDoc(sosRef, {
          ...finalUpdates,
          updatedAt: serverTimestamp(),
        });
      }

      await logAuthEvent('profile_updated', {
        userId: firebaseUser.uid,
        updatedFields: Object.keys(finalUpdates),
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('profile_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string): Promise<void> => {
    if (!firebaseUser) throw new Error('Utilisateur non connecté');
    
    setAuthMetrics((m) => ({ ...m, emailUpdateAttempts: m.emailUpdateAttempts + 1 }));
    
    try {
      const normalizedEmail = normalizeEmail(newEmail);
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Adresse email invalide');
      }

      // Vérifier si l'email est déjà utilisé
      const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (methods.length > 0) {
        throw new Error('Cette adresse email est déjà utilisée');
      }

      // Mettre à jour Firebase Auth
      await updateEmail(firebaseUser, normalizedEmail);

      // Mettre à jour Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        email: normalizedEmail,
        emailLower: normalizedEmail,
        updatedAt: serverTimestamp(),
      });

      // Envoyer une vérification d'email
      await sendEmailVerification(firebaseUser);

      await logAuthEvent('email_updated', {
        userId: firebaseUser.uid,
        oldEmail: user?.email,
        newEmail: normalizedEmail,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('email_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const updateUserPassword = async (newPassword: string): Promise<void> => {
    if (!firebaseUser) throw new Error('Utilisateur non connecté');
    
    if (newPassword.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    try {
      await updatePassword(firebaseUser, newPassword);

      await logAuthEvent('password_updated', {
        userId: firebaseUser.uid,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('password_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const reauthenticateUser = async (password: string): Promise<void> => {
    if (!firebaseUser || !user?.email) throw new Error('Utilisateur non connecté');

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(firebaseUser, credential);

      await logAuthEvent('reauthentication_success', {
        userId: firebaseUser.uid,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('reauthentication_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    setAuthMetrics((m) => ({ ...m, passwordResetRequests: m.passwordResetRequests + 1 }));
    
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Adresse email invalide');
      }

      await sendPasswordResetEmail(auth, normalizedEmail);

      await logAuthEvent('password_reset_sent', {
        email: normalizedEmail,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('password_reset_failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    if (!firebaseUser) throw new Error('Utilisateur non connecté');

    try {
      await sendEmailVerification(firebaseUser);

      await logAuthEvent('verification_email_sent', {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('verification_email_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const deleteUserAccount = async (): Promise<void> => {
    if (!firebaseUser || !user) throw new Error('Utilisateur non connecté');

    try {
      const userId = firebaseUser.uid;
      const userRole = user.role;

      // Supprimer les documents Firestore associés
      const promises: Promise<any>[] = [
        deleteDoc(doc(db, 'users', userId))
      ];

      if (userRole === 'lawyer' || userRole === 'expat') {
        promises.push(deleteDoc(doc(db, 'sos_profiles', userId)));
      }

      // Supprimer les photos de profil du storage
      if (user.profilePhoto && user.profilePhoto.includes('firebase')) {
        try {
          const photoRef = ref(storage, user.profilePhoto);
          promises.push(deleteObject(photoRef));
        } catch (e) {
          console.warn('Erreur suppression photo:', e);
        }
      }

      await Promise.allSettled(promises);

      await logAuthEvent('account_deleted', {
        userId,
        userRole,
        deviceInfo
      });

      // Supprimer le compte Firebase Auth en dernier
      await deleteUser(firebaseUser);

      // Reset de l'état
      setUser(null);
      setFirebaseUser(null);
      setError(null);

    } catch (error) {
      await logAuthEvent('account_deletion_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  };

  const getUsersByRole = async (role: User['role'], limit_count: number = 10): Promise<User[]> => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', role),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limit_count)
      );
      
      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        lastLoginAt: doc.data().lastLoginAt?.toDate() || new Date(),
      })) as User[];
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      return [];
    }
  };

  const setUserAvailability = async (availability: 'available' | 'busy' | 'offline'): Promise<void> => {
    if (!user || !firebaseUser) throw new Error('Utilisateur non connecté');
    if (user.role !== 'lawyer' && user.role !== 'expat') return;

    try {
      const isOnline = availability === 'available';
      
      // Mettre à jour dans users
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        availability,
        isOnline,
        updatedAt: serverTimestamp(),
      });

      // Mettre à jour dans sos_profiles
      await writeSosPresence(firebaseUser.uid, user.role, isOnline);

      // Dispatcher l'événement pour synchroniser l'UI
      window.dispatchEvent(new CustomEvent('availabilityChanged', { 
        detail: { isOnline } 
      }));

      await logAuthEvent('availability_changed', {
        userId: firebaseUser.uid,
        oldAvailability: user.availability,
        newAvailability: availability,
        deviceInfo
      });

    } catch (error) {
      console.error('Erreur mise à jour disponibilité:', error);
      throw error;
    }
  };

  const value: AuthContextType = useMemo(() => ({
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
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    reauthenticateUser,
    sendPasswordReset,
    sendVerificationEmail,
    deleteUserAccount,
    getUsersByRole,
    setUserAvailability,
  }), [
    user, firebaseUser, isUserLoggedIn, isLoading, authInitialized, error, authMetrics, deviceInfo,
    login, loginWithGoogle, register, logout, clearError, refreshUser, getLastLoginInfo,
    updateUserProfile, updateUserEmail, updateUserPassword, reauthenticateUser,
    sendPasswordReset, sendVerificationEmail, deleteUserAccount, getUsersByRole, setUserAvailability
  ]);

  return <BaseAuthContext.Provider value={value}>{children}</BaseAuthContext.Provider>;
};

export default AuthProvider;

/* =========================================================
   Compat : re-export d'un hook useAuth ici aussi
   (pour les imports existants: import { useAuth } from '../contexts/AuthContext')
   ========================================================= */
export const useAuth = () => {
  const ctx = useContext(BaseAuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
};