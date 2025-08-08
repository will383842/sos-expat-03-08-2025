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
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
// Import des types et utilitaires depuis les fichiers séparés
import type { SupportedLanguage, EnhancedSettings } from './types';
import {
  DeviceInfo,
  AuthError,
  getDeviceInfo,
  getLocalizedErrorMessage,
  logAuthEvent,
  createUserDocumentInFirestore,
  getUserDocument,
  processProfilePhoto
} from './authUtils';

// ===============================
// TYPES ET INTERFACES
// ===============================

interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
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
} (!userDoc.exists()) {
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

// Export de useAuth pour éviter l'erreur react-refresh/only-export-components
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
          setUser((prevUser: User | null) => {
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
      } catch (_importError) {
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