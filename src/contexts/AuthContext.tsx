import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  reload
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  updateDoc,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';
import { auth, db, storage } from '../config/firebase';
import { User } from './types';

declare global {
  interface Window {
    /** défini quand la page est en COOP/COEP */
    crossOriginIsolated?: boolean;
  }
}

interface ExistingUserData {
  role?: string;
  photoURL?: string;
  profilePhoto?: string;
  avatar?: string;
}
// ===============================
// TYPES ET INTERFACES
// ===============================

interface AuthError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  helpText?: string;
}

interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
}

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  isOnline: boolean;
  connectionSpeed: 'slow' | 'medium' | 'fast';
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isUserLoggedIn: () => boolean;
  isLoading: boolean;
  authInitialized: boolean;
  error: string | null;
  authMetrics: AuthMetrics;
  deviceInfo: DeviceInfo;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: Partial<User>, password: string) => Promise<void>;
  logout: () => Promise<void>;

  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;

  clearError: () => void;
  refreshUser: () => Promise<void>;
  getLastLoginInfo: () => { date: Date | null; device: string | null };
}

// ===============================
// CONFIGURATION DES ERREURS UX
// ===============================

const AUTH_ERRORS: Record<string, { severity: AuthError['severity']; userMessage: string; helpText?: string }> = {
  GOOGLE_ROLE_RESTRICTION: {
    severity: 'high',
    userMessage: '🚫 La connexion Google est réservée aux clients',
    helpText: '👨‍⚖️ Avocats et 🌍 expatriés : utilisez votre email et mot de passe professionnels ci-dessous'
  },
  'auth/popup-closed-by-user': {
    severity: 'low',
    userMessage: '❌ Connexion Google annulée',
    helpText: '💡 Gardez la fenêtre Google ouverte pour terminer la connexion'
  },
  'auth/popup-blocked': {
    severity: 'medium',
    userMessage: '🚫 Popup Google bloquée',
    helpText: '🔧 Autorisez les popups dans votre navigateur pour continuer'
  },
  'auth/cancelled-popup-request': {
    severity: 'low',
    userMessage: '⏹️ Connexion Google interrompue',
    helpText: '🔄 Réessayez en cliquant sur "Continuer avec Google"'
  },
  'auth/invalid-credential': {
    severity: 'medium',
    userMessage: '🔐 Email ou mot de passe incorrect',
    helpText: '💡 Vérifiez votre email et mot de passe, ou utilisez "Mot de passe oublié"'
  },
  'auth/invalid-login-credentials': {
    severity: 'medium',
    userMessage: '🔐 Identifiants invalides',
    helpText: '📧 Double-vérifiez votre adresse email et mot de passe'
  },
  'auth/user-not-found': {
    severity: 'medium',
    userMessage: '👤 Aucun compte trouvé',
    helpText: '📝 Créez un nouveau compte ou vérifiez l\'adresse email'
  },
  'auth/wrong-password': {
    severity: 'medium',
    userMessage: '🔑 Mot de passe incorrect',
    helpText: '🔄 Réessayez ou cliquez sur "Mot de passe oublié"'
  },
  'auth/network-request-failed': {
    severity: 'high',
    userMessage: '📶 Problème de connexion internet',
    helpText: '🌐 Vérifiez votre connexion et réessayez'
  },
  'auth/timeout': {
    severity: 'medium',
    userMessage: '⏱️ Délai d\'attente dépassé',
    helpText: '🔄 Votre connexion semble lente, réessayez'
  },
  'auth/email-already-in-use': {
    severity: 'medium',
    userMessage: '📧 Email déjà utilisé',
    helpText: '🔑 Connectez-vous ou utilisez "Mot de passe oublié"'
  },
  'auth/weak-password': {
    severity: 'low',
    userMessage: '🔒 Mot de passe trop faible',
    helpText: '💪 Utilisez au moins 8 caractères avec majuscules, minuscules et chiffres'
  },
  'auth/invalid-email': {
    severity: 'low',
    userMessage: '📧 Format d\'email invalide',
    helpText: '✅ Exemple : votre.email@domaine.com'
  },
  'auth/too-many-requests': {
    severity: 'high',
    userMessage: '🛡️ Trop de tentatives',
    helpText: '⏰ Attendez 15 minutes avant de réessayer pour votre sécurité'
  },
  'auth/user-disabled': {
    severity: 'critical',
    userMessage: '🚫 Compte temporairement suspendu',
    helpText: '📞 Contactez le support pour réactiver votre compte'
  },
  'auth/operation-not-allowed': {
    severity: 'critical',
    userMessage: '⚠️ Service temporairement indisponible',
    helpText: '🔧 Maintenance en cours, réessayez dans quelques minutes'
  },
  'auth/requires-recent-login': {
    severity: 'medium',
    userMessage: '🔄 Reconnexion requise',
    helpText: '🔐 Reconnectez-vous pour des raisons de sécurité'
  }
};

// ===============================
// UTILITAIRES
// ===============================

const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { type: 'desktop', os: 'unknown', browser: 'unknown', isOnline: true, connectionSpeed: 'fast' };
  }

  const userAgent = navigator.userAgent;
  const connection =
    (navigator as unknown as { connection?: { effectiveType?: string }; mozConnection?: { effectiveType?: string }; webkitConnection?: { effectiveType?: string } }).connection ||
    (navigator as unknown as { mozConnection?: { effectiveType?: string } }).mozConnection ||
    (navigator as unknown as { webkitConnection?: { effectiveType?: string } }).webkitConnection;

  let deviceType: DeviceInfo['type'] = 'desktop';
  if (/Android|iPhone|iPod/i.test(userAgent)) deviceType = 'mobile';
  else if (/iPad|Android.*tablet/i.test(userAgent)) deviceType = 'tablet';

  let os = 'unknown';
  if (/Android/i.test(userAgent)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'ios';
  else if (/Windows/i.test(userAgent)) os = 'windows';
  else if (/Macintosh|Mac OS X/i.test(userAgent)) os = 'mac';
  else if (/Linux/i.test(userAgent)) os = 'linux';

  let browser = 'unknown';
  if (/Chrome/i.test(userAgent)) browser = 'chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'firefox';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'safari';
  else if (/Edge/i.test(userAgent)) browser = 'edge';

  let connectionSpeed: DeviceInfo['connectionSpeed'] = 'fast';
  if (connection?.effectiveType) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') connectionSpeed = 'slow';
    else if (effectiveType === '3g') connectionSpeed = 'medium';
  }

  return { type: deviceType, os, browser, isOnline: navigator.onLine, connectionSpeed };
};

const generateAffiliateCode = (uid: string, email: string): string => {
  const shortUid = uid.substring(0, 6).toUpperCase();
  const emailPrefix = email.split('@')[0].substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-3);
  return `ULIX-${emailPrefix}${shortUid}${timestamp}`;
};

const processProfilePhoto = async (photoUrl: string | undefined, uid: string, provider: 'google' | 'manual'): Promise<string> => {
  try {
    if (!photoUrl) return '/default-avatar.png';

    if (provider === 'google' && photoUrl.includes('googleusercontent.com')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(photoUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const deviceInfo = getDeviceInfo();
          const size = deviceInfo.type === 'mobile' ? 's150-c' : 's300-c';
          return photoUrl.replace(/s\d+-c/, size);
        }
      } catch {
        console.warn("Photo Google non accessible, utilisation de l'avatar par défaut");
      }
      return '/default-avatar.png';
    }

    if (photoUrl.startsWith('data:image')) {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return '/default-avatar.png';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '/default-avatar.png';

        const img = new Image();

        return new Promise((resolve) => {
          img.onload = async () => {
            try {
              const maxSize = getDeviceInfo().type === 'mobile' ? 200 : 400;
              const ratio = Math.min(maxSize / img.width, maxSize / img.height);
              canvas.width = img.width * ratio;
              canvas.height = img.height * ratio;
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressedData = canvas.toDataURL('image/jpeg', 0.8);

              const storageRef = ref(storage, `profilePhotos/${uid}/${Date.now()}.jpg`);
              const uploadResult = await uploadString(storageRef, compressedData, 'data_url');
              const downloadUrl = await getDownloadURL(uploadResult.ref);
              resolve(downloadUrl);
            } catch (uploadError) {
              console.error('Erreur upload photo:', uploadError);
              resolve('/default-avatar.png');
            }
          };
          img.onerror = () => resolve('/default-avatar.png');
          img.src = photoUrl;
        });
      } catch (error) {
        console.error('Erreur compression photo:', error);
        return '/default-avatar.png';
      }
    }

    if (photoUrl.startsWith('http')) return photoUrl;

    return '/default-avatar.png';
  } catch (error) {
    console.error('Erreur traitement photo:', error);
    return '/default-avatar.png';
  }
};

type LogPayload = Record<string, unknown>;

const logAuthEvent = async (type: string, data: LogPayload = {}, deviceInfo: DeviceInfo) => {
  try {
    const logData: Record<string, unknown> = {
      type,
      category: 'authentication',
      ...data,
      deviceType: deviceInfo.type,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      isOnline: deviceInfo.isOnline,
      connectionSpeed: deviceInfo.connectionSpeed,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : '',
      screenSize: typeof window !== 'undefined' ? `${window.screen?.width || 0}x${window.screen?.height || 0}` : '',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth || 0}x${window.innerHeight || 0}` : ''
    };

    await addDoc(collection(db, 'logs'), logData);
  } catch (error) {
    console.warn('Erreur logging auth:', error);
  }
};

const getLocalizedErrorMessage = (errorCode: string, deviceInfo: DeviceInfo): { message: string; helpText?: string } => {
  const errorConfig = AUTH_ERRORS[errorCode];
  if (!errorConfig) {
    return {
      message: deviceInfo.type === 'mobile' ? '❌ Erreur de connexion' : 'Une erreur est survenue. Veuillez réessayer',
      helpText: deviceInfo.type === 'mobile' ? '🔄 Réessayez ou contactez le support' : undefined
    };
  }
  return { message: errorConfig.userMessage, helpText: errorConfig.helpText };
};

const getErrorCode = (err: unknown): string => {
  if (err && typeof err === 'object') {
    const error = err as any;
    
    // Firebase Error direct
    if (typeof error.code === 'string') return error.code;
    
    // Firebase Error dans l'objet
    if (error.error && typeof error.error.code === 'string') return error.error.code;
    
    // Message d'erreur Firebase
    if (typeof error.message === 'string') {
      if (error.message.includes('weak-password')) return 'auth/weak-password';
      if (error.message.includes('email-already-in-use')) return 'auth/email-already-in-use';
      if (error.message.includes('invalid-email')) return 'auth/invalid-email';
      if (error.message.includes('too-many-requests')) return 'auth/too-many-requests';
    }
  }
  
  console.log('🔍 Erreur non reconnue:', err); // Pour debug
  return '';
};

// ===============================
// FONCTIONS PRINCIPALES
// ===============================

const createUserDocumentInFirestore = async (firebaseUser: FirebaseUser, userData: Partial<User>, deviceInfo: DeviceInfo): Promise<User> => {
  try {
    const emailLower = (firebaseUser.email || '').trim().toLowerCase();
    console.log('🔧 [Debug] Début createUserDocumentInFirestore', { uid: firebaseUser.uid, role: userData.role });
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      console.log('✅ [Debug] Utilisateur existe déjà, mise à jour...');
      const existingData = userDoc.data() as Record<string, unknown>;
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        lastDeviceInfo: { type: deviceInfo.type, os: deviceInfo.os, browser: deviceInfo.browser }
      });

      return {
        id: firebaseUser.uid,
        ...existingData,
        createdAt: (existingData.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      } as User;
    }

    console.log('🔧 [Debug] Nouvel utilisateur, création...');
    const userRole = userData.role;
    const provider = firebaseUser.providerData[0]?.providerId;

    if (provider === 'google.com' && userRole !== 'client') throw new Error('GOOGLE_ROLE_RESTRICTION');
    if (!userRole || !['client', 'lawyer', 'expat', 'admin'].includes(userRole)) {
      throw new Error(`Rôle utilisateur invalide: ${userRole as string}`);
    }

    console.log('🔧 [Debug] Traitement photo profil...');
    const finalProfilePhoto = await processProfilePhoto(
      userData.profilePhoto || firebaseUser.photoURL || undefined,
      firebaseUser.uid,
      provider === 'google.com' ? 'google' : 'manual'
    );

    console.log('🔧 [Debug] Génération des données utilisateur...');
    const affiliateCode = generateAffiliateCode(firebaseUser.uid, firebaseUser.email || '');
    const displayNameParts = firebaseUser.displayName?.split(' ') || [];
    const firstName = userData.firstName || displayNameParts[0] || '';
    const lastName = userData.lastName || displayNameParts.slice(1).join(' ') || '';
    const fullDisplayName = `${firstName} ${lastName}`.trim();

    const newUser: Partial<User> & {
      id: string;
      uid: string;
      email: string;
      role: 'client' | 'lawyer' | 'expat' | 'admin';
    } = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: emailLower,
      emailLower: emailLower,
      firstName,
      lastName,
      displayName: fullDisplayName,
      fullName: fullDisplayName,
      profilePhoto: finalProfilePhoto,
      photoURL: finalProfilePhoto,
      avatar: finalProfilePhoto,
      role: userRole as 'client' | 'lawyer' | 'expat' | 'admin',
      isApproved: userRole === 'client' || provider === 'google.com',
      isActive: true,
      isVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,
      phone: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      currentCountry: userData.currentCountry || '',
      currentPresenceCountry: userData.currentPresenceCountry || '',
      country: userData.currentCountry || '',
      preferredLanguage: userData.preferredLanguage || 'fr',
      lang: userData.preferredLanguage || 'fr',
      rating: 5.0,
      reviewCount: 0,
      totalCalls: 0,
      totalEarnings: 0,
      averageRating: 0,
      points: 0,
      isOnline: userRole === 'client',
      isSOS: userRole === 'lawyer' || userRole === 'expat',
      hourlyRate: userData.hourlyRate || (userRole === 'lawyer' ? 49 : 19),
      responseTime: userData.responseTime || '< 5 minutes',
      provider: provider || 'password',
      affiliateCode,
      ...(userData.referralBy && { referralBy: userData.referralBy }),
      registrationIP: '',
      deviceInfo: {
        type: deviceInfo.type,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        registrationDevice: `${deviceInfo.type}-${deviceInfo.os}`
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      bio: userData.bio || '',
      ...(userRole === 'lawyer' && {
        practiceCountries: userData.practiceCountries || [],
        languages: userData.languages || ['Français'],
        yearsOfExperience: userData.yearsOfExperience || 0,
        specialties: userData.specialties || [],
        barNumber: userData.barNumber || '',
        lawSchool: userData.lawSchool || '',
        graduationYear: userData.graduationYear || new Date().getFullYear(),
        certifications: userData.certifications || []
      }),
      ...(userRole === 'expat' && {
        residenceCountry: userData.residenceCountry || '',
        languages: userData.languages || ['Français'],
        helpTypes: userData.helpTypes || [],
        yearsAsExpat: userData.yearsAsExpat || 0,
        previousCountries: userData.previousCountries || [],
        motivation: userData.motivation || ''
      })
    };

    console.log('🔧 [Debug] Sauvegarde dans Firestore...');
    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });

    console.log('✅ [Debug] Document utilisateur créé avec succès');

    if (userRole === 'lawyer' || userRole === 'expat') {
      console.log('🔧 [Debug] Création profil SOS...');
      await createSOSProfile(firebaseUser.uid, newUser, userRole);
    }

    console.log('🔧 [Debug] Log de l\'événement...');
    await logAuthEvent('user_creation', {
      userId: firebaseUser.uid,
      userRole,
      provider: provider || 'unknown',
      profilePhotoUploaded: finalProfilePhoto !== '/default-avatar.png'
    }, deviceInfo);

    console.log('✅ [Debug] createUserDocumentInFirestore terminé avec succès');
    return newUser as User;
  } catch (error) {
    console.error('❌ [Debug] Erreur dans createUserDocumentInFirestore:', error);
    if (error instanceof Error && error.message === 'GOOGLE_ROLE_RESTRICTION') throw error;
    throw new Error('Impossible de créer le profil utilisateur');
  }
};

const createSOSProfile = async (uid: string, userData: Partial<User>, role: 'lawyer' | 'expat') => {
  try {
    const sosProfileRef = doc(db, 'sos_profiles', uid);

    const mainLanguage =
      (Array.isArray(userData.languages) && userData.languages.length > 0
        ? String(userData.languages[0])
        : 'francais')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-');

    const country = userData.currentCountry || (userData as { residenceCountry?: string }).residenceCountry || '';
    const countrySlug = country
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');

    const sosProfile: Record<string, unknown> = {
      uid,
      type: role,
      fullName: userData.fullName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      slug: `${(userData.firstName || '').toLowerCase()}-${(userData.lastName || '').toLowerCase()}`,
      mainLanguage,
      countrySlug,
      email: userData.email,
      phone: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      languages: userData.languages || ['Français'],
      country,
      city: '',
      description: userData.bio || '',
      profilePhoto: userData.profilePhoto,
      photoURL: userData.profilePhoto,
      avatar: userData.profilePhoto,
      isActive: false,
      isApproved: role !== 'lawyer',
      isVerified: false,
      isVisible: true,
      isOnline: false,
      rating: 5.0,
      reviewCount: 0,
      specialties: role === 'lawyer' ? (userData.specialties || []) : (userData as { helpTypes?: unknown[] }).helpTypes || [],
      yearsOfExperience: role === 'lawyer' ? (userData.yearsOfExperience || 0) : (userData as { yearsAsExpat?: number }).yearsAsExpat || 0,
      price: role === 'lawyer' ? 49 : 19,
      duration: role === 'lawyer' ? 20 : 30,
      documents: [],
      motivation: (userData as { motivation?: string }).motivation || '',
      education: (userData as { education?: string }).education || '',
      lawSchool: (userData as { lawSchool?: string }).lawSchool || '',
      graduationYear: (userData as { graduationYear?: number }).graduationYear || new Date().getFullYear() - 5,
      certifications: userData.certifications || [],
      responseTime: '< 5 minutes',
      successRate: role === 'lawyer' ? 95 : 90,
      interventionCountries: [country],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(sosProfileRef, sosProfile);
  } catch (error) {
    console.error(`Erreur création profil SOS pour ${role}:`, error);
  }
};

const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as Record<string, unknown>;

    updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    }).catch(e => console.warn('Erreur mise à jour silencieuse lastLoginAt:', e));

    return {
      id: firebaseUser.uid,
      ...userData,
      createdAt: (userData.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date(),
      updatedAt: (userData.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date(),
      lastLoginAt: (userData.lastLoginAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date()
    } as User;
  } catch (error) {
    console.error('Erreur récupération document utilisateur:', error);
    return null;
  }
};

// ===============================
// CONTEXTE D'AUTHENTIFICATION
// ===============================

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
};

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());
  const [authMetrics, setAuthMetrics] = useState<AuthMetrics>({
    loginAttempts: 0,
    lastAttempt: new Date(),
    successfulLogins: 0,
    failedLogins: 0,
    googleAttempts: 0,
    roleRestrictionBlocks: 0
  });

  const updateUserState = useCallback(async (currentFirebaseUser: FirebaseUser) => {
    try {
      const userData = await getUserDocument(currentFirebaseUser);
      if (userData) {
        setUser({ ...userData, isVerifiedEmail: currentFirebaseUser.emailVerified });
        setAuthMetrics(prev => ({ ...prev, successfulLogins: prev.successfulLogins + 1, lastAttempt: new Date() }));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Erreur mise à jour état utilisateur:', e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        unsubscribeAuth = onAuthStateChanged(auth, async (currentFirebaseUser) => {
          if (!isMounted) return;
          try {
            if (currentFirebaseUser) {
              setFirebaseUser(currentFirebaseUser);
              await updateUserState(currentFirebaseUser);
            } else {
              setFirebaseUser(null);
              setUser(null);
            }
          } catch {
            if (isMounted) {
              setError('Erreur lors du chargement du profil');
              setUser(null);
            }
          } finally {
            if (isMounted) {
              setIsLoading(false);
              if (!authInitialized) setAuthInitialized(true);
            }
          }
        });
      } catch {
        if (isMounted) {
          setIsLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [authInitialized, updateUserState]);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    let isMounted = true;
    const unsubscribe = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const userData = docSnap.data() as Record<string, unknown>;
          setUser((prevUser: User | null) => {
            if (!isMounted) return prevUser;
            const newUser: User = {
              ...(prevUser || ({} as User)),
              ...(userData as Partial<User>),
              uid: firebaseUser.uid,
              isVerifiedEmail: firebaseUser.emailVerified,
              createdAt: (userData.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || prevUser?.createdAt || new Date(),
              updatedAt: (userData.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date(),
              lastLoginAt: (userData.lastLoginAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date()
            };
            if (prevUser && prevUser.id === newUser.id && prevUser.updatedAt?.getTime() === newUser.updatedAt?.getTime()) {
              return prevUser;
            }
            return newUser;
          });
        }
      },
      (e) => {
        console.error('Erreur listener document utilisateur:', e);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  // ===============================
  // MÉTHODES D'AUTHENTIFICATION
  // ===============================

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setAuthMetrics(prev => ({ ...prev, loginAttempts: prev.loginAttempts + 1, lastAttempt: new Date() }));

    if (!email || !password) {
      const errorMsg = deviceInfo.type === 'mobile' ? '📧 Email et 🔑 mot de passe requis' : 'Email et mot de passe sont obligatoires';
      setError(errorMsg);
      setIsLoading(false);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));
      throw new Error(errorMsg);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = deviceInfo.type === 'mobile' ? '📧 Format email invalide' : "Format d'email invalide";
      setError(errorMsg);
      setIsLoading(false);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));
      throw new Error(errorMsg);
    }

    try {
      const loginTimeout = deviceInfo.connectionSpeed === 'slow' ? 15000 : 10000;
      const loginPromise = signInWithEmailAndPassword(auth, email, password);
      const userCredential = await Promise.race([
        loginPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('auth/timeout')), loginTimeout))
      ]);

      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const userData = {
          role: 'client' as const,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || '',
          firstName: userCredential.user.displayName?.split(' ')[0] || '',
          lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || '',
          profilePhoto: userCredential.user.photoURL || '/default-avatar.png',
          photoURL: userCredential.user.photoURL || '/default-avatar.png',
          avatar: userCredential.user.photoURL || '/default-avatar.png',
          isActive: true,
          isApproved: true,
          provider: 'password',
          deviceInfo: {
            type: deviceInfo.type,
            os: deviceInfo.os,
            browser: deviceInfo.browser,
            loginDevice: `${deviceInfo.type}-${deviceInfo.os}`
          }
        };
        await setDoc(userRef, { ...userData, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastLoginAt: serverTimestamp() });
      }

      await logAuthEvent('successful_login', { userId: userCredential.user.uid, provider: 'email', connectionSpeed: deviceInfo.connectionSpeed }, deviceInfo);
    } catch (e) {
      const code = getErrorCode(e) || (e as Error).message || '';
      const { message, helpText } = getLocalizedErrorMessage(code, deviceInfo);
      const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : message;

      setError(finalMessage);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));

      await logAuthEvent('login_failed', { errorCode: code, provider: 'email', attempts: authMetrics.loginAttempts + 1 }, deviceInfo);
      throw new Error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isUserLoggedIn = useCallback(() => !!user || !!firebaseUser, [user, firebaseUser]);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    setAuthMetrics(prev => ({ ...prev, loginAttempts: prev.loginAttempts + 1, googleAttempts: prev.googleAttempts + 1, lastAttempt: new Date() }));

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
      prompt: 'select_account',
      display: getDeviceInfo().type === 'mobile' ? 'touch' : 'popup'
      });


      // ✅ En COOP/COEP, éviter signInWithPopup (fenêtre ne peut pas se fermer) → use redirect
      const isCrossOriginIsolated = window.crossOriginIsolated === true;
      if (isCrossOriginIsolated) {
        await signInWithRedirect(auth, provider);
        return; // Suite gérée dans le useEffect getRedirectResult
      }

      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      const userRef = doc(db, 'users', googleUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const existingData = userDoc.data() as { role?: string; photoURL?: string };
        if (existingData.role !== 'client') {
          await firebaseSignOut(auth);
          setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1, roleRestrictionBlocks: prev.roleRestrictionBlocks + 1 }));

          const { message, helpText } = getLocalizedErrorMessage('GOOGLE_ROLE_RESTRICTION', getDeviceInfo());
          const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : message;
          setError(finalMessage);

          await logAuthEvent('google_login_role_restriction', {
            userId: googleUser.uid,
            userEmail: googleUser.email,
            blockedRole: existingData.role,
            deviceType: getDeviceInfo().type
          }, getDeviceInfo());

          throw new Error('GOOGLE_ROLE_RESTRICTION');
        }

        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
          lastDeviceInfo: {
            type: getDeviceInfo().type,
            os: getDeviceInfo().os,
            browser: getDeviceInfo().browser,
            loginTimestamp: new Date().toISOString()
          },
          ...(googleUser.photoURL && googleUser.photoURL !== existingData.photoURL && {
            photoURL: googleUser.photoURL,
            profilePhoto: googleUser.photoURL,
            avatar: googleUser.photoURL
          })
        });
      } else {
        const newUserData: Partial<User> = {
          role: 'client',
          email: googleUser.email || '',
          firstName: googleUser.displayName?.split(' ')[0] || '',
          lastName: googleUser.displayName?.split(' ').slice(1).join(' ') || '',
          profilePhoto: googleUser.photoURL || '',
          photoURL: googleUser.photoURL || '',
          avatar: googleUser.photoURL || '',
          preferredLanguage: 'fr',
          isApproved: true,
          isActive: true,
          provider: 'google.com',
          isVerified: googleUser.emailVerified,
          isVerifiedEmail: googleUser.emailVerified
        };

        await createUserDocumentInFirestore(googleUser, newUserData, getDeviceInfo());
      }

      await logAuthEvent('successful_google_login', {
        userId: googleUser.uid,
        userEmail: googleUser.email,
        isNewUser: !userDoc.exists(),
        deviceType: getDeviceInfo().type,
        connectionSpeed: getDeviceInfo().connectionSpeed
      }, getDeviceInfo());
    } catch (e) {
      let errorCode = getErrorCode(e);
      if ((e as Error).message === 'GOOGLE_ROLE_RESTRICTION') errorCode = 'GOOGLE_ROLE_RESTRICTION';

      const { message, helpText } = getLocalizedErrorMessage(errorCode, getDeviceInfo());
      const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : message;

      setError(finalMessage);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));

      await logAuthEvent('google_login_failed', {
        errorCode,
        errorMessage: (e as Error).message,
        deviceType: getDeviceInfo().type,
        attempts: authMetrics.googleAttempts + 1
      }, getDeviceInfo());

      throw new Error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Partial<User>, password: string) => {
    setIsLoading(true);
    setError(null);

    if (!userData.role) {
      const errorMsg = getDeviceInfo().type === 'mobile' ? '⚠️ Rôle requis pour inscription' : "Le rôle utilisateur est obligatoire pour l'inscription";
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    if (!['client', 'lawyer', 'expat', 'admin'].includes(userData.role)) {
      const errorMsg = `Rôle utilisateur invalide: ${userData.role}`;
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    if (!userData.email || !password) {
      const errorMsg = getDeviceInfo().type === 'mobile' ? '📧 Email et 🔑 mot de passe requis' : 'Email et mot de passe sont obligatoires';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      const errorMsg = getDeviceInfo().type === 'mobile' ? '📧 Format email invalide' : "Format d'email invalide";
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    if (password.length < 6) {
  const errorMsg = getDeviceInfo().type === 'mobile' ? '🔒 Mot de passe min. 6 caractères' : 'Le mot de passe doit contenir au moins 6 caractères';
  setError(errorMsg);
  setIsLoading(false);
  throw new Error(errorMsg);
}
// Suppression des contraintes de complexité - mot de passe simple accepté ! 🎉

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);

      let finalProfilePhotoURL = '';
      if (userData.profilePhoto && userData.profilePhoto.startsWith('data:image')) {
        finalProfilePhotoURL = await processProfilePhoto(userData.profilePhoto, userCredential.user.uid, 'manual');
      } else if (userData.profilePhoto && userData.profilePhoto.startsWith('http')) {
        finalProfilePhotoURL = userData.profilePhoto;
      } else {
        finalProfilePhotoURL = '/default-avatar.png';
      }

      await createUserDocumentInFirestore(
        userCredential.user,
        {
          ...userData,
          role: userData.role as 'client' | 'lawyer' | 'expat' | 'admin',
          profilePhoto: finalProfilePhotoURL,
          photoURL: finalProfilePhotoURL,
          avatar: finalProfilePhotoURL,
          provider: 'password'
        },
        getDeviceInfo()
      );

      try {
        const userLanguage = userData.preferredLanguage || 'fr';
        const authUtils = await import('../utils/auth').catch(() => null);
        if (authUtils?.sendVerificationEmail) {
          await authUtils.sendVerificationEmail(userLanguage);
        }
      } catch {
        // non bloquant
      }

      if (userData.firstName || userData.lastName) {
        try {
          await updateProfile(userCredential.user, {
            displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            photoURL: finalProfilePhotoURL || null
          });
        } catch (profileError) {
          console.warn('Erreur mise à jour profil Firebase:', profileError);
        }
      }
    } catch (e) {
      await logAuthEvent(
        'registration_error',
        { errorCode: getErrorCode(e), errorMessage: (e as Error).message, userEmail: userData.email, userRole: userData.role, deviceType: getDeviceInfo().type },
        getDeviceInfo()
      );

      const { message, helpText } = getLocalizedErrorMessage(getErrorCode(e), getDeviceInfo());
      const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : (message || (e as Error).message);
      setError(finalMessage);
      throw new Error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user?.id) {
        await logAuthEvent('logout', { userId: user.id, sessionDuration: Date.now() - (user.lastLoginAt?.getTime() || Date.now()), userRole: user.role }, getDeviceInfo());
        if (user.role === 'lawyer' || user.role === 'expat') {
          try {
            await updateDoc(doc(db, 'users', user.id), { isOnline: false, lastSeenAt: serverTimestamp() });
          } catch (statusError) {
            console.warn('Erreur mise à jour statut hors ligne:', statusError);
          }
        }
      }
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      setAuthMetrics({ loginAttempts: 0, lastAttempt: new Date(), successfulLogins: 0, failedLogins: 0, googleAttempts: 0, roleRestrictionBlocks: 0 });
    } catch (e) {
      console.error('Erreur déconnexion:', e);
    }
  };

  const sendVerificationEmail = async () => {
    if (!firebaseUser) throw new Error('Aucun utilisateur connecté');
    try {
      const userLanguage = user?.preferredLanguage || user?.lang || 'fr';
      try {
        const authUtils = await import('../utils/auth');
        if (authUtils.sendVerificationEmail) {
          await authUtils.sendVerificationEmail(userLanguage);
        } else {
          const { sendEmailVerification } = await import('firebase/auth');
          await sendEmailVerification(firebaseUser);
        }
      } catch {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(firebaseUser);
      }
      await logAuthEvent('verification_email_sent', { userId: firebaseUser.uid, language: userLanguage }, getDeviceInfo());
    } catch (e) {
      const { message } = getLocalizedErrorMessage(getErrorCode(e), getDeviceInfo());
      setError(message);
      throw new Error(message);
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (!firebaseUser) return false;
    try {
      await reload(firebaseUser);
      const reloadedUser = auth.currentUser;
      if (reloadedUser?.emailVerified) {
        await updateDoc(doc(db, 'users', reloadedUser.uid), { emailVerified: true, isVerifiedEmail: true, updatedAt: serverTimestamp() });
        await reloadedUser.getIdToken(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erreur vérification email:', e);
      return false;
    }
  };

  const clearError = () => setError(null);

  const refreshUser = async () => {
    if (!firebaseUser) return;
    try {
      setIsLoading(true);
      await reload(firebaseUser);
      await updateUserState(firebaseUser);
    } catch (e) {
      console.error('Erreur refresh utilisateur:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getLastLoginInfo = useCallback(() => {
    if (!user) return { date: null, device: null };
    const deviceType = (user as { deviceInfo?: { type?: string; os?: string } }).deviceInfo?.type || 'unknown';
    const os = (user as { deviceInfo?: { type?: string; os?: string } }).deviceInfo?.os || 'unknown';
    return { date: user.lastLoginAt || null, device: deviceType !== 'unknown' ? `${deviceType} (${os})` : null };
  }, [user]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    isUserLoggedIn,
    isLoading,
    authInitialized,
    error,
    authMetrics,
    deviceInfo: getDeviceInfo(),
    login,
    loginWithGoogle,
    register,
    logout,
    sendVerificationEmail,
    checkEmailVerification,
    clearError,
    refreshUser,
    getLastLoginInfo
  };

  // ===============================
  // 🔁 RÉCUPÉRER LE RÉSULTAT GOOGLE EN COOP/COEP (Redirect flow)
  // (à placer tout en bas du composant, juste avant le return)
  // ===============================
  const redirectHandledRef = useRef(false);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Si la page est "crossOriginIsolated", on vient d'un signInWithRedirect
        const isCrossOriginIsolated = window.crossOriginIsolated === true;
        if (!isCrossOriginIsolated) return;
        if (redirectHandledRef.current) return; // évite double-traitement (StrictMode)

        const result = await getRedirectResult(auth);
        if (!result || !result.user) return;

        redirectHandledRef.current = true;
        const googleUser = result.user;

        const userRef = doc(db, 'users', googleUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const existingData = userDoc.data() as ExistingUserData;


          // Blocage rôle pour Google si ≠ client
          if (existingData.role && existingData.role !== 'client') {
            await firebaseSignOut(auth);
            setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1, roleRestrictionBlocks: prev.roleRestrictionBlocks + 1 }));
            const { message, helpText } = getLocalizedErrorMessage('GOOGLE_ROLE_RESTRICTION', getDeviceInfo());
            setError(helpText ? `${message}\n\n💡 ${helpText}` : message);

            await logAuthEvent('google_login_role_restriction', {
              userId: googleUser.uid,
              userEmail: googleUser.email,
              blockedRole: existingData.role
            }, getDeviceInfo());
            return;
          }

          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
            lastDeviceInfo: {
              type: getDeviceInfo().type,
              os: getDeviceInfo().os,
              browser: getDeviceInfo().browser,
              loginTimestamp: new Date().toISOString()
            },
            ...(googleUser.photoURL && googleUser.photoURL !== existingData.photoURL && {
              photoURL: googleUser.photoURL,
              profilePhoto: googleUser.photoURL,
              avatar: googleUser.photoURL
            })
          });
        } else {
          const newUserData: Partial<User> = {
            role: 'client',
            email: googleUser.email || '',
            firstName: googleUser.displayName?.split(' ')[0] || '',
            lastName: googleUser.displayName?.split(' ').slice(1).join(' ') || '',
            profilePhoto: googleUser.photoURL || '',
            photoURL: googleUser.photoURL || '',
            avatar: googleUser.photoURL || '',
            preferredLanguage: 'fr',
            isApproved: true,
            isActive: true,
            provider: 'google.com',
            isVerified: googleUser.emailVerified,
            isVerifiedEmail: googleUser.emailVerified
          };
          try {
      await createUserDocumentInFirestore(googleUser, newUserData, getDeviceInfo());
    } catch (err) {
      try {
        const { deleteUser } = await import('firebase/auth');
        await deleteUser(userCredential.user);
      } catch {}
      throw err;
    }
        }

        await logAuthEvent('successful_google_login', {
          userId: googleUser.uid,
          userEmail: googleUser.email,
          isNewUser: !userDoc.exists(),
          deviceType: getDeviceInfo().type,
          connectionSpeed: getDeviceInfo().connectionSpeed
        }, getDeviceInfo());
      } catch (e) {
        console.warn('[Auth] getRedirectResult error', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
    
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
