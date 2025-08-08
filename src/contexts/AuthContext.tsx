import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
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
import { auth, db, storage } from '../config/firebase';
import { User } from './contexts/types';

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
  
  // Méthodes d'authentification
  login: (email: string, password: string) => Promise<void>; 
  loginWithGoogle: () => Promise<void>; 
  register: (userData: Partial<User>, password: string) => Promise<void>; 
  logout: () => Promise<void>; 
  
  // Méthodes de vérification
  sendVerificationEmail: () => Promise<void>; 
  checkEmailVerification: () => Promise<boolean>;
  
  // Méthodes utilitaires UX
  clearError: () => void;
  refreshUser: () => Promise<void>;
  getLastLoginInfo: () => { date: Date | null; device: string | null };
}

// ===============================
// CONFIGURATION DES ERREURS UX
// ===============================

const AUTH_ERRORS: Record<string, { severity: AuthError['severity']; userMessage: string; helpText?: string }> = {
  // Erreurs Google spécifiques
  'GOOGLE_ROLE_RESTRICTION': {
    severity: 'high',
    userMessage: '🚫 La connexion Google est réservée aux clients',
    helpText: '👨‍⚖️ Avocats et 🌍 expatriés : utilisez votre email et mot de passe professionnels ci-dessous'
  },
  
  // Erreurs de popup Google
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
  
  // Erreurs de credentials
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
  
  // Erreurs de réseau
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
  
  // Erreurs de validation
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
  
  // Erreurs de sécurité
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
  
  // Erreurs de permission
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

// Détection du type d'appareil pour UX mobile-first
const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { 
      type: 'desktop', 
      os: 'unknown', 
      browser: 'unknown', 
      isOnline: true, 
      connectionSpeed: 'fast' 
    };
  }
  
  const userAgent = navigator.userAgent;
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  // Détection du type d'appareil
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/Android|iPhone|iPod/i.test(userAgent)) deviceType = 'mobile';
  else if (/iPad|Android.*tablet/i.test(userAgent)) deviceType = 'tablet';
  
  // Détection de l'OS
  let os = 'unknown';
  if (/Android/i.test(userAgent)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'ios';
  else if (/Windows/i.test(userAgent)) os = 'windows';
  else if (/Macintosh|Mac OS X/i.test(userAgent)) os = 'mac';
  else if (/Linux/i.test(userAgent)) os = 'linux';
  
  // Détection du navigateur
  let browser = 'unknown';
  if (/Chrome/i.test(userAgent)) browser = 'chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'firefox';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'safari';
  else if (/Edge/i.test(userAgent)) browser = 'edge';
  
  // Vitesse de connexion pour optimiser l'UX
  let connectionSpeed: 'slow' | 'medium' | 'fast' = 'fast';
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') connectionSpeed = 'slow';
    else if (effectiveType === '3g') connectionSpeed = 'medium';
  }
  
  return {
    type: deviceType,
    os,
    browser,
    isOnline: navigator.onLine,
    connectionSpeed
  };
};

// Génération de code d'affiliation unique et mémorable
const generateAffiliateCode = (uid: string, email: string): string => {
  const shortUid = uid.substring(0, 6).toUpperCase();
  const emailPrefix = email.split('@')[0].substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-3);
  return `ULIX-${emailPrefix}${shortUid}${timestamp}`;
};

// Optimisation des photos de profil pour mobile
const processProfilePhoto = async (
  photoUrl: string | undefined, 
  uid: string, 
  provider: 'google' | 'manual'
): Promise<string> => {
  try {
    if (!photoUrl) return '/default-avatar.png';

    // Photos Google - optimisation pour mobile
    if (provider === 'google' && photoUrl.includes('googleusercontent.com')) {
      try {
        // Test de disponibilité avec timeout pour mobile
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(photoUrl, { 
          method: 'HEAD', 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Optimisation pour différentes tailles d'écran
          const deviceInfo = getDeviceInfo();
          const size = deviceInfo.type === 'mobile' ? 's150-c' : 's300-c';
          return photoUrl.replace(/s\d+-c/, size);
        }
      } catch (error) {
        console.warn('Photo Google non accessible, utilisation de l\'avatar par défaut');
      }
      return '/default-avatar.png';
    }

    // Upload manuel avec compression pour mobile
    if (photoUrl.startsWith('data:image')) {
      try {
        // Vérification environnement navigateur
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return '/default-avatar.png';
        }
        
        // Compression basique pour économiser la bande passante mobile
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

    // URL existante - validation
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }

    return '/default-avatar.png';
  } catch (error) {
    console.error('Erreur traitement photo:', error);
    return '/default-avatar.png';
  }
};

// Fonction de logging optimisée pour mobile (évite les gros objets)
const logAuthEvent = async (
  type: string, 
  data: Record<string, any> = {}, 
  deviceInfo: DeviceInfo
) => {
  try {
    // Limiter la taille des logs sur mobile pour économiser les ressources
    const logData = {
      type,
      category: 'authentication',
      ...data,
      deviceType: deviceInfo.type,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      isOnline: deviceInfo.isOnline,
      connectionSpeed: deviceInfo.connectionSpeed,
      timestamp: serverTimestamp(),
      // Informations techniques minimales
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : '',
      screenSize: typeof window !== 'undefined' ? `${window.screen?.width || 0}x${window.screen?.height || 0}` : '',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth || 0}x${window.innerHeight || 0}` : ''
    };

    await addDoc(collection(db, 'logs'), logData);
  } catch (error) {
    // Logging silencieux en cas d'erreur pour ne pas impacter l'UX
    console.warn('Erreur logging auth:', error);
  }
};

// Fonction pour obtenir un message d'erreur localisé avec UX mobile
const getLocalizedErrorMessage = (errorCode: string, deviceInfo: DeviceInfo): { message: string; helpText?: string } => {
  const errorConfig = AUTH_ERRORS[errorCode];
  
  if (!errorConfig) {
    return {
      message: deviceInfo.type === 'mobile' 
        ? '❌ Erreur de connexion' 
        : 'Une erreur est survenue. Veuillez réessayer',
      helpText: deviceInfo.type === 'mobile' 
        ? '🔄 Réessayez ou contactez le support' 
        : undefined
    };
  }
  
  return {
    message: errorConfig.userMessage,
    helpText: errorConfig.helpText
  };
};

// ===============================
// FONCTIONS PRINCIPALES
// ===============================

// Création de document utilisateur avec optimisations mobile
const createUserDocumentInFirestore = async (
  firebaseUser: FirebaseUser, 
  userData: Partial<User>,
  deviceInfo: DeviceInfo
): Promise<User> => {
  try {
    console.log('🔧 Création document utilisateur:', firebaseUser.uid);
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    
    // Vérification document existant
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      console.log('📋 Document existant, mise à jour...');
      const existingData = userDoc.data();
      
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        lastDeviceInfo: {
          type: deviceInfo.type,
          os: deviceInfo.os,
          browser: deviceInfo.browser
        }
      });
      
      return {
        id: firebaseUser.uid,
        ...existingData,
        createdAt: existingData.createdAt?.toDate?.() || new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      } as User;
    }
    
    // Validation sécurité rôle
    const userRole = userData.role;
    const provider = firebaseUser.providerData[0]?.providerId;
    
    console.log('🔐 Provider:', provider, 'Role:', userRole);
    
    // SÉCURITÉ : Google = Client uniquement
    if (provider === 'google.com' && userRole !== 'client') {
      console.error('🚨 SÉCURITÉ : Tentative création non-client via Google');
      throw new Error('GOOGLE_ROLE_RESTRICTION');
    }
    
    if (!userRole || !['client', 'lawyer', 'expat', 'admin'].includes(userRole)) {
      console.error('🚨 SÉCURITÉ : Rôle invalide:', userRole);
      throw new Error(`Rôle utilisateur invalide: ${userRole}`);
    }
    
    // Traitement photo optimisé pour mobile
    const finalProfilePhoto = await processProfilePhoto(
      userData.profilePhoto || firebaseUser.photoURL || undefined,
      firebaseUser.uid,
      provider === 'google.com' ? 'google' : 'manual'
    );
    
    // Génération données utilisateur
    const affiliateCode = generateAffiliateCode(firebaseUser.uid, firebaseUser.email!);
    
    // Parsing du nom depuis displayName si disponible
    const displayNameParts = firebaseUser.displayName?.split(' ') || [];
    const firstName = userData.firstName || displayNameParts[0] || '';
    const lastName = userData.lastName || displayNameParts.slice(1).join(' ') || '';
    const fullDisplayName = `${firstName} ${lastName}`.trim();
    
    const newUser = {
      // Identifiants
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      
      // Profil
      firstName,
      lastName,
      displayName: fullDisplayName,
      fullName: fullDisplayName,
      
      // Photos optimisées
      profilePhoto: finalProfilePhoto,
      photoURL: finalProfilePhoto,
      avatar: finalProfilePhoto,
      
      // Rôle et permissions
      role: userRole as 'client' | 'lawyer' | 'expat' | 'admin',
      isApproved: userRole === 'client' || provider === 'google.com',
      isActive: true,
      isVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,
      
      // Localisation
      phone: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      currentCountry: userData.currentCountry || '',
      currentPresenceCountry: userData.currentPresenceCountry || '',
      country: userData.currentCountry || '',
      preferredLanguage: userData.preferredLanguage || 'fr',
      lang: userData.preferredLanguage || 'fr',
      
      // Métriques
      rating: 5.0,
      reviewCount: 0,
      totalCalls: 0,
      totalEarnings: 0,
      averageRating: 0,
      points: 0,
      
      // Statuts
      isOnline: userRole === 'client' ? true : false,
      isSOS: (userRole === 'lawyer' || userRole === 'expat'),
      
      // Tarification
      hourlyRate: userData.hourlyRate || (userRole === 'lawyer' ? 49 : 19),
      responseTime: userData.responseTime || '< 5 minutes',
      
      // Technique
      provider: provider || 'password',
      affiliateCode,
      referralBy: userData.referralBy || null,
      registrationIP: '',
      deviceInfo: {
        type: deviceInfo.type,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        registrationDevice: `${deviceInfo.type}-${deviceInfo.os}`
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : '',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      
      // Profil détaillé
      bio: userData.bio || '',
      
      // Champs spécifiques selon le rôle
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
    
    // Préparation pour Firestore
    const userDataForFirestore = {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };
    
    // Création document
    await setDoc(userRef, userDataForFirestore);
    console.log('✅ Document utilisateur créé');

    // Création profil SOS si nécessaire
    if (userRole === 'lawyer' || userRole === 'expat') {
      await createSOSProfile(firebaseUser.uid, newUser, userRole);
    }
    
    // Log de création
    await logAuthEvent('user_creation', {
      userId: firebaseUser.uid,
      userRole,
      provider: provider || 'unknown',
      profilePhotoUploaded: finalProfilePhoto !== '/default-avatar.png'
    }, deviceInfo);
    
    return newUser as User;
    
  } catch (error) {
    console.error('❌ Erreur création document utilisateur:', error);
    
    // Si c'est une erreur de restriction de rôle Google, on la propage
    if (error instanceof Error && error.message === 'GOOGLE_ROLE_RESTRICTION') {
      throw error;
    }
    
    throw new Error('Impossible de créer le profil utilisateur');
  }
};

// Création profil SOS optimisé
const createSOSProfile = async (uid: string, userData: any, role: 'lawyer' | 'expat') => {
  try {
    const sosProfileRef = doc(db, 'sos_profiles', uid);
    
    const mainLanguage = (userData.languages && userData.languages.length > 0) 
      ? userData.languages[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')
      : 'francais';

    const country = userData.currentCountry || userData.residenceCountry || '';
    const countrySlug = country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
    
    const sosProfile = {
      uid,
      type: role,
      fullName: userData.fullName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      slug: `${userData.firstName.toLowerCase()}-${userData.lastName.toLowerCase()}`,
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
      specialties: role === 'lawyer' ? (userData.specialties || []) : (userData.helpTypes || []),
      yearsOfExperience: role === 'lawyer' ? userData.yearsOfExperience : userData.yearsAsExpat || 0,
      price: role === 'lawyer' ? 49 : 19,
      duration: role === 'lawyer' ? 20 : 30,
      documents: [],
      motivation: userData.motivation || '',
      education: userData.education || '',
      lawSchool: userData.lawSchool || '',
      graduationYear: userData.graduationYear || new Date().getFullYear() - 5,
      certifications: userData.certifications || [],
      responseTime: '< 5 minutes',
      successRate: role === 'lawyer' ? 95 : 90,
      interventionCountries: [country],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(sosProfileRef, sosProfile);
    console.log(`✅ Profil SOS créé pour ${role}:`, uid);
    
  } catch (error) {
    console.error(`❌ Erreur création profil SOS pour ${role}:`, error);
  }
};

// Récupération document utilisateur existant
const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn('❌ Document utilisateur inexistant');
      return null;
    }
    
    const userData = userDoc.data();
    
    // Mise à jour silencieuse dernière connexion
    updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    }).catch(error => {
      console.warn('Erreur mise à jour silencieuse lastLoginAt:', error);
    });
    
    return {
      id: firebaseUser.uid,
      ...userData,
      createdAt: userData.createdAt?.toDate?.() || new Date(),
      updatedAt: userData.updatedAt?.toDate?.() || new Date(),
      lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date()
    } as User;
  } catch (error) {
    console.error('❌ Erreur récupération document utilisateur:', error);
    return null;
  }
};

// ===============================
// CONTEXTE D'AUTHENTIFICATION
// ===============================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

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

  // Mise à jour état utilisateur avec gestion d'erreurs améliorée
  const updateUserState = useCallback(async (currentFirebaseUser: FirebaseUser) => {
    try {
      const userData = await getUserDocument(currentFirebaseUser);
      if (userData) {
        setUser({
          ...userData,
          isVerifiedEmail: currentFirebaseUser.emailVerified
        });
        
        setAuthMetrics(prev => ({
          ...prev,
          successfulLogins: prev.successfulLogins + 1,
          lastAttempt: new Date()
        }));
      } else {
        console.warn('❌ Aucun document utilisateur trouvé');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour état utilisateur:', error);
      setUser(null);
    }
  }, []);

  // Gestionnaire état d'authentification avec cleanup amélioré
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
              console.log('🔐 État auth : Utilisateur connecté');
              setFirebaseUser(currentFirebaseUser);
              await updateUserState(currentFirebaseUser);
            } else {
              console.log('🔓 État auth : Utilisateur déconnecté');
              setFirebaseUser(null);
              setUser(null);
            }
          } catch (error) {
            if (isMounted) {
              console.error('❌ Erreur changement état auth:', error);
              setError('Erreur lors du chargement du profil');
              setUser(null);
            }
          } finally {
            if (isMounted) {
              setIsLoading(false);
              if (!authInitialized) {
                setAuthInitialized(true);
              }
            }
          }
        });
      } catch (error) {
        if (isMounted) {
          console.error('❌ Erreur initialisation auth:', error);
          setIsLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [authInitialized, updateUserState]);

  // Listener temps réel mises à jour utilisateur avec cleanup amélioré
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    console.log('🔄 Configuration listener utilisateur temps réel');
    let isMounted = true;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', firebaseUser.uid), 
      (docSnap) => {
        if (!isMounted) return;
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUser((prevUser) => {
            if (!isMounted) return prevUser;
            
            const newUser = {
              ...prevUser,
              ...userData,
              uid: firebaseUser.uid,
              isVerifiedEmail: firebaseUser.emailVerified,
              createdAt: userData.createdAt?.toDate?.() || prevUser?.createdAt || new Date(),
              updatedAt: userData.updatedAt?.toDate?.() || new Date(),
              lastLoginAt: userData.lastLoginAt?.toDate?.() || new Date()
            } as User;
            
            // Éviter re-renders inutiles avec comparaison plus robuste
            if (prevUser && 
                prevUser.id === newUser.id &&
                prevUser.updatedAt?.getTime() === newUser.updatedAt?.getTime()) {
              return prevUser;
            }
            
            return newUser;
          });
        }
      },
      (error) => {
        if (isMounted) {
          console.error("❌ Erreur listener document utilisateur:", error);
        }
      }
    );

    return () => {
      isMounted = false;
      console.log('🧹 Nettoyage listener utilisateur');
      unsubscribe();
    };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]);

  // ===============================
  // MÉTHODES D'AUTHENTIFICATION
  // ===============================

  // Connexion email/mot de passe avec UX mobile optimisée
  const login = async (email: string, password: string) => {
    setIsLoading(true); 
    setError(null);
    
    // Mise à jour métriques
    setAuthMetrics(prev => ({
      ...prev,
      loginAttempts: prev.loginAttempts + 1,
      lastAttempt: new Date()
    }));
    
    // Validations avec messages UX mobile
    if (!email || !password) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '📧 Email et 🔑 mot de passe requis' 
        : 'Email et mot de passe sont obligatoires';
      setError(errorMsg);
      setIsLoading(false);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));
      throw new Error(errorMsg);
    }
    
    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '📧 Format email invalide' 
        : 'Format d\'email invalide';
      setError(errorMsg);
      setIsLoading(false);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));
      throw new Error(errorMsg);
    }
    
    try {
      // Optimisation mobile : timeout plus court sur connexions lentes
      const loginTimeout = deviceInfo.connectionSpeed === 'slow' ? 15000 : 10000;
      const loginPromise = signInWithEmailAndPassword(auth, email, password);
      
      const userCredential = await Promise.race([
        loginPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('auth/timeout')), loginTimeout)
        )
      ]);
      
      // Vérification existence document utilisateur
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      // Création utilisateur si inexistant avec rôle client par défaut
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
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      }

      // Log connexion réussie
      await logAuthEvent('successful_login', {
        userId: userCredential.user.uid,
        provider: 'email',
        connectionSpeed: deviceInfo.connectionSpeed
      }, deviceInfo);

    } catch (error: any) {
      console.error('❌ Erreur connexion:', error);
      
      const { message, helpText } = getLocalizedErrorMessage(error.code, deviceInfo);
      const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : message;
      
      setError(finalMessage);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));
      
      await logAuthEvent('login_failed', {
        errorCode: error.code,
        provider: 'email',
        attempts: authMetrics.loginAttempts + 1
      }, deviceInfo);
      
      throw new Error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Vérification statut utilisateur connecté
  const isUserLoggedIn = useCallback(() => !!user || !!firebaseUser, [user, firebaseUser]);
  
  // Connexion Google avec UX mobile optimisée et blocage non-clients
  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    
    // Mise à jour métriques
    setAuthMetrics(prev => ({
      ...prev,
      loginAttempts: prev.loginAttempts + 1,
      googleAttempts: prev.googleAttempts + 1,
      lastAttempt: new Date()
    }));
    
    try {
      // Configuration persistance
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Configuration UX mobile optimisée
      provider.setCustomParameters({
        prompt: 'select_account',
        display: deviceInfo.type === 'mobile' ? 'touch' : 'popup'
      });
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      console.log('🔐 Connexion Google réussie pour:', googleUser.email);
      
      // Vérification utilisateur existant
      const userRef = doc(db, 'users', googleUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Utilisateur existant - VÉRIFICATION CRITIQUE DU RÔLE
        const existingData = userDoc.data();
        
        if (existingData.role !== 'client') {
          // 🚨 BLOCAGE IMMÉDIAT pour avocats/expatriés
          await firebaseSignOut(auth);
          
          setAuthMetrics(prev => ({ 
            ...prev, 
            failedLogins: prev.failedLogins + 1,
            roleRestrictionBlocks: prev.roleRestrictionBlocks + 1
          }));
          
          // Message d'erreur spécifique avec aide contextuelle UX
          const { message, helpText } = getLocalizedErrorMessage('GOOGLE_ROLE_RESTRICTION', deviceInfo);
          const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : message;
          setError(finalMessage);
          
          // Log tentative non autorisée
          await logAuthEvent('google_login_role_restriction', {
            userId: googleUser.uid,
            userEmail: googleUser.email,
            blockedRole: existingData.role,
            deviceType: deviceInfo.type
          }, deviceInfo);
          
          throw new Error('GOOGLE_ROLE_RESTRICTION');
        }
        
        console.log('✅ Client existant, mise à jour timestamp connexion');
        
        // Client existant - mise à jour dernière connexion
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
          lastDeviceInfo: {
            type: deviceInfo.type,
            os: deviceInfo.os,
            browser: deviceInfo.browser,
            loginTimestamp: new Date().toISOString()
          },
          // Mise à jour photo Google si changée
          ...(googleUser.photoURL && googleUser.photoURL !== existingData.photoURL && {
            photoURL: googleUser.photoURL,
            profilePhoto: googleUser.photoURL,
            avatar: googleUser.photoURL
          })
        });
        
      } else {
        console.log('🆕 Nouvel utilisateur Google, création compte client');
        
        // Nouvel utilisateur Google - CRÉATION FORCÉE COMME CLIENT
        const userData: Partial<User> = {
          role: 'client', // 🔒 FORCÉ à client pour Google - IMMUABLE
          email: googleUser.email!,
          firstName: googleUser.displayName?.split(' ')[0] || '',
          lastName: googleUser.displayName?.split(' ').slice(1).join(' ') || '',
          profilePhoto: googleUser.photoURL || '',
          photoURL: googleUser.photoURL || '',
          avatar: googleUser.photoURL || '',
          preferredLanguage: 'fr',
          // Spécifique clients Google
          isApproved: true, // Auto-approuvé
          isActive: true,
          provider: 'google.com'
        };
        
        await createUserDocumentInFirestore(googleUser, userData, deviceInfo);
        
        console.log('✅ Compte client Google créé avec succès');
      }
      
      // Log connexion Google réussie
      await logAuthEvent('successful_google_login', {
        userId: googleUser.uid,
        userEmail: googleUser.email,
        isNewUser: !userDoc.exists(),
        deviceType: deviceInfo.type,
        connectionSpeed: deviceInfo.connectionSpeed
      }, deviceInfo);
      
    } catch (error: any) {
      console.error('❌ Erreur connexion Google:', error);
      
      // Gestion erreurs spécifiques Google avec UX mobile optimisée
      let errorCode = error.code;
      if (error.message === 'GOOGLE_ROLE_RESTRICTION') {
        errorCode = 'GOOGLE_ROLE_RESTRICTION';
      }
      
      const { message, helpText } = getLocalizedErrorMessage(errorCode, deviceInfo);
      const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : message;
      
      setError(finalMessage);
      setAuthMetrics(prev => ({ ...prev, failedLogins: prev.failedLogins + 1 }));
      
      // Log erreur
      await logAuthEvent('google_login_failed', {
        errorCode: errorCode,
        errorMessage: error.message,
        deviceType: deviceInfo.type,
        attempts: authMetrics.googleAttempts + 1
      }, deviceInfo);
      
      throw new Error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Inscription avec validation renforcée et UX mobile
  const register = async (userData: Partial<User>, password: string) => {
    setIsLoading(true);
    setError(null);
    
    console.log('📝 Début inscription pour rôle:', userData.role);

    // Validation stricte rôle
    if (!userData.role) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '⚠️ Rôle requis pour inscription' 
        : 'Le rôle utilisateur est obligatoire pour l\'inscription';
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

    // Validations champs obligatoires
    if (!userData.email || !password) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '📧 Email et 🔑 mot de passe requis' 
        : 'Email et mot de passe sont obligatoires';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '📧 Format email invalide' 
        : 'Format d\'email invalide';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    // Validation mot de passe renforcée
    if (password.length < 8) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '🔒 Mot de passe min. 8 caractères' 
        : 'Le mot de passe doit contenir au moins 8 caractères';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    // Validation force mot de passe
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      const errorMsg = deviceInfo.type === 'mobile' 
        ? '💪 Mot de passe : A-z + 0-9 requis' 
        : 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      // Création utilisateur Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      console.log('✅ Utilisateur Firebase créé, UID:', userCredential.user.uid);
      
      // Traitement photo profil optimisé mobile
      let finalProfilePhotoURL = '';
       
      if (userData.profilePhoto && userData.profilePhoto.startsWith('data:image')) {
        finalProfilePhotoURL = await processProfilePhoto(
          userData.profilePhoto,
          userCredential.user.uid,
          'manual'
        );
      } else if (userData.profilePhoto && userData.profilePhoto.startsWith('http')) {
        finalProfilePhotoURL = userData.profilePhoto;
      } else {
        finalProfilePhotoURL = '/default-avatar.png';
      }
      
      // Préparation données utilisateur sécurisées
      const userDataWithRole = {
        ...userData,
        role: userData.role as 'client' | 'lawyer' | 'expat' | 'admin',
        profilePhoto: finalProfilePhotoURL,
        photoURL: finalProfilePhotoURL,
        avatar: finalProfilePhotoURL,
        // Champs sécurité
        emailVerified: userCredential.user.emailVerified,
        isVerifiedEmail: userCredential.user.emailVerified,
        registrationIP: '', // À remplir côté serveur si nécessaire
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : '',
        registrationDate: new Date().toISOString(),
        provider: 'password'
      };
       
      console.log('📋 Création document Firestore...');
      
      const newUser = await createUserDocumentInFirestore(userCredential.user, userDataWithRole, deviceInfo);
      console.log('✅ Inscription terminée avec succès pour rôle:', newUser.role);
      
      // Envoi email vérification seulement si utils/auth existe
      try {
        const userLanguage = userData.preferredLanguage || 'fr';
        const authUtils = await import('../utils/auth').catch(() => null);
        if (authUtils?.sendVerificationEmail) {
          await authUtils.sendVerificationEmail(userLanguage);
          console.log('📧 Email vérification envoyé en:', userLanguage);
        }
      } catch (emailError: any) {
        console.warn('❌ Erreur envoi email vérification:', emailError);
        // Ne pas faire échouer inscription pour problème email
      }

      // Mise à jour profil Firebase
      if (userData.firstName || userData.lastName) {
        try {
          await updateProfile(userCredential.user, {
            displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            photoURL: finalProfilePhotoURL || null
          });
        } catch (profileError) {
          console.warn('❌ Erreur mise à jour profil Firebase:', profileError);
        }
      }
       
      console.log('🎉 Processus inscription terminé avec succès');

    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      
      // Log erreur avec métriques
      await logAuthEvent('registration_error', {
        errorCode: error.code,
        errorMessage: error.message,
        userEmail: userData.email,
        userRole: userData.role,
        deviceType: deviceInfo.type
      }, deviceInfo);
      
      const { message, helpText } = getLocalizedErrorMessage(error.code || '', deviceInfo);
      const finalMessage = helpText ? `${message}\n\n💡 ${helpText}` : (message || error.message);
      setError(finalMessage);
      throw new Error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Déconnexion avec nettoyage complet
  const logout = async () => {
    try { 
      if (user && user.id) {
        console.log('🔓 Déconnexion utilisateur:', user.id);
        
        // Log événement déconnexion
        await logAuthEvent('logout', {
          userId: user.id,
          sessionDuration: Date.now() - (user.lastLoginAt?.getTime() || Date.now()),
          userRole: user.role
        }, deviceInfo);
        
        // Mise à jour statut hors ligne pour professionnels
        if (user.role === 'lawyer' || user.role === 'expat') {
          try {
            await updateDoc(doc(db, 'users', user.id), {
              isOnline: false,
              lastSeenAt: serverTimestamp()
            });
          } catch (statusError) {
            console.warn('❌ Erreur mise à jour statut hors ligne:', statusError);
          }
        }
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
        roleRestrictionBlocks: 0
      });
      
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error); 
      // Ne pas empêcher déconnexion pour erreur nettoyage
    }
  };

  // Envoi email vérification multilingue
  const sendVerificationEmail = async () => { 
    if (!firebaseUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    try {
      // Récupération langue utilisateur
      const userLanguage = user?.preferredLanguage || user?.lang || 'fr';
       
      // Import fonction utils/auth avec fallback
      try {
        const authUtils = await import('../utils/auth');
        if (authUtils.sendVerificationEmail) {
          await authUtils.sendVerificationEmail(userLanguage);
        } else {
          // Fallback: utiliser Firebase directement
          const { sendEmailVerification } = await import('firebase/auth');
          await sendEmailVerification(firebaseUser);
        }
      } catch (importError) {
        // Fallback: utiliser Firebase directement
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(firebaseUser);
      }
      
      // Log événement
      await logAuthEvent('verification_email_sent', {
        userId: firebaseUser.uid,
        language: userLanguage
      }, deviceInfo);
       
    } catch (error: any) {
      console.error('❌ Erreur envoi email vérification:', error);
      const { message } = getLocalizedErrorMessage(error.code, deviceInfo);
      setError(message);
      throw new Error(message);
    }
  };
   
  // Vérification email avec refresh automatique
  const checkEmailVerification = async (): Promise<boolean> => {
    if (!firebaseUser) {
      return false;
    } 
    
    try {
      // Rechargement utilisateur pour statut récent
      await reload(firebaseUser);
      const reloadedUser = auth.currentUser;
        
      if (reloadedUser && reloadedUser.emailVerified) {
        // Mise à jour Firestore
        await updateDoc(doc(db, 'users', reloadedUser.uid), {
          emailVerified: true,
          isVerifiedEmail: true,
          updatedAt: serverTimestamp()
        });
        
        // Refresh token ID
        await reloadedUser.getIdToken(true);
         
        return true;
      } 
      
      return false;
    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      return false;
    }
  };

  // Nettoyage erreurs
  const clearError = () => {
    setError(null);
  };

  // Refresh manuel données utilisateur
  const refreshUser = async () => {
    if (!firebaseUser) return;
    
    try {
      setIsLoading(true);
      await reload(firebaseUser);
      await updateUserState(firebaseUser);
    } catch (error) {
      console.error('❌ Erreur refresh utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Informations dernière connexion pour UX
  const getLastLoginInfo = useCallback(() => {
    if (!user) return { date: null, device: null };
    
    const deviceType = user.deviceInfo?.type || 'unknown';
    const os = user.deviceInfo?.os || 'unknown';
    
    return {
      date: user.lastLoginAt || null,
      device: deviceType !== 'unknown' ? `${deviceType} (${os})` : null
    };
  }, [user]);

  // ===============================
  // VALEUR CONTEXTE
  // ===============================

  const value: AuthContextType = {
    user,
    firebaseUser,
    isUserLoggedIn,
    isLoading, 
    authInitialized, 
    error,
    authMetrics,
    deviceInfo,
    
    // Méthodes authentification
    login, 
    loginWithGoogle, 
    register, 
    logout, 
    
    // Méthodes vérification
    sendVerificationEmail, 
    checkEmailVerification,
    
    // Méthodes utilitaires UX
    clearError,
    refreshUser,
    getLastLoginInfo
  };

  return ( 
    <AuthContext.Provider value={value}>
      {children}  
    </AuthContext.Provider> 
  );
};

export default AuthProvider;