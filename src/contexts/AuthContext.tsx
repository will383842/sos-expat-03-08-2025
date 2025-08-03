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
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { User } from '../types'; 
import { updateUserOnlineStatus, normalizeUserData } from '../utils/firestore';
import { logError } from '../utils/logging';
import { onSnapshot } from 'firebase/firestore';

// Fonction pour générer un code d'affiliation unique
const generateAffiliateCode = (uid: string): string => {
  const shortUid = uid.substring(0, 6).toUpperCase();
  return `ULIX-${shortUid}`;
};

// Fonction dédiée pour créer un nouveau document utilisateur dans Firestore
const createUserDocumentInFirestore = async (firebaseUser: FirebaseUser, userData: Partial<User>): Promise<User> => {
  try {
    console.log("createUserDocumentInFirestore - Début de la fonction", JSON.stringify(userData));
    const userRef = doc(db, 'users', firebaseUser.uid);
    
    // Vérification si le document existe déjà
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      console.log("Document utilisateur existe déjà, mise à jour...");
      const existingData = userDoc.data();
      const updatedUser = {
        id: firebaseUser.uid,
        ...existingData,
        createdAt: existingData.createdAt?.toDate() || new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      } as User;
      
      // Mise à jour de la dernière connexion
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      });
      
      return updatedUser;
    }
    
    // Validation du rôle obligatoire
    const userRole = userData.role;
    console.log("createUserDocumentInFirestore - Rôle reçu:", userRole, "Type:", typeof userRole, "JSON:", JSON.stringify(userRole));
    
    if (!userRole || !['client', 'lawyer', 'expat', 'admin'].includes(userRole)) {
      console.error('ERREUR CRITIQUE: Rôle invalide ou manquant pour nouvel utilisateur:', userRole);
      throw new Error(`Rôle invalide ou manquant pour nouvel utilisateur: ${userRole}`);
    }
    
    console.log('ROLE POUR NOUVEL UTILISATEUR:', userRole);
    
    // Traiter la photo de profil (base64 data URL)
   let finalProfilePhoto = '';
    
    console.log("Photo de profil à traiter:", userData.profilePhoto ? "Photo présente" : "Aucune photo");
    
    if (userData.profilePhoto && userData.profilePhoto.startsWith('data:image')) {
      try {
        console.log("Upload de la photo de profil vers Firebase Storage");
        
        // Upload avec timestamp pour éviter les conflits
        const storageRef = ref(storage, `profilePhotos/${firebaseUser.uid}/${Date.now()}.jpg`);
        const uploadResult = await uploadString(storageRef, userData.profilePhoto, 'data_url');
        finalProfilePhoto = await getDownloadURL(uploadResult.ref);
        console.log("Photo uploadée avec succès:", finalProfilePhoto);
      } catch (error) {
        console.error("Erreur upload photo:", error);
        // En cas d'erreur, garder l'image par défaut
      }
    } else if (userData.profilePhoto && userData.profilePhoto.startsWith('http')) {
      // Si c'est déjà une URL, l'utiliser directement
      finalProfilePhoto = userData.profilePhoto;
      console.log("Utilisation de l'URL existante:", finalProfilePhoto);
    } else if (firebaseUser.photoURL) {
      finalProfilePhoto = firebaseUser.photoURL;
    }
    
    console.log('Photo de profil finale:', finalProfilePhoto);
    
    // Créer un nouveau document utilisateur
    const newUser = {
      role: userRole as 'client' | 'lawyer' | 'expat' | 'admin',
      rating: 5.0,  // Commencer avec 5 étoiles par défaut
      reviewCount: 0,
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      photoURL: finalProfilePhoto,
      provider: firebaseUser.providerData[0]?.providerId || 'password',
      firstName: userData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
      lastName: userData.lastName || firebaseUser.displayName?.split(' ')[1] || '',
      phone: userData.phone || '',
      phoneCountryCode: userData.phoneCountryCode || '+33',
      currentCountry: userData.currentCountry || '',
      currentPresenceCountry: userData.currentPresenceCountry || '',
      preferredLanguage: userData.preferredLanguage || 'fr',
      profilePhoto: finalProfilePhoto,
      avatar: finalProfilePhoto, // Utiliser la même URL pour tous les champs d'image
      isOnline: userData.role === 'lawyer' ? false : true,
      isApproved: userData.role !== 'lawyer',
      isVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,

      createdAt: new Date(),
      lastLoginAt: new Date(),
      
      // Nouveaux champs requis
      fullName: `${userData.firstName || firebaseUser.displayName?.split(' ')[0] || ''} ${userData.lastName || firebaseUser.displayName?.split(' ')[1] || ''}`.trim(),
      lang: userData.preferredLanguage || 'fr',
      country: userData.currentCountry || '',
      isSOS: (userData.role === 'lawyer' || userData.role === 'expat'),
      points: 0,
      affiliateCode: generateAffiliateCode(firebaseUser.uid),
      referralBy: userData.referralBy || null,
      registrationIP: '',
      deviceInfo: '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
      
      // Nouveaux champs pour production
      bio: userData.bio || '',
      hourlyRate: userData.hourlyRate || (userData.role === 'lawyer' ? 49 : 19),
      responseTime: userData.responseTime || '< 5 minutes',
      totalCalls: 0,
      totalEarnings: 0,
      averageRating: 0,
      
      // Champs spécifiques selon le rôle
      ...(userData.role === 'lawyer' && {
        practiceCountries: userData.practiceCountries || [],
        languages: userData.languages || ['fr'],
        yearsOfExperience: userData.yearsOfExperience || 0,
        specialties: userData.specialties || [],
        barNumber: userData.barNumber || '',
        lawSchool: userData.lawSchool || '',
        graduationYear: userData.graduationYear || new Date().getFullYear(),
        certifications: userData.certifications || []
      }),
      
      ...(userData.role === 'expat' && {
        residenceCountry: userData.residenceCountry || '',
        languages: userData.languages || ['fr'],
        helpTypes: userData.helpTypes || [],
        yearsAsExpat: userData.yearsAsExpat || 0,
        previousCountries: userData.previousCountries || [],
        motivation: userData.motivation || ''
      })
    };
    
    // Utiliser serverTimestamp pour les dates
    const userDataForFirestore = {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };
    
    console.log('ROLE FINAL AVANT SETDOC:', userRole);
    console.log('userDataForFirestore.role:', userDataForFirestore.role);
    
    // Créer explicitement le document utilisateur
    await setDoc(userRef, userDataForFirestore);
    console.log("Document utilisateur créé avec succès dans Firestore:", userRef.path);

    // Si c'est un avocat ou un expatrié, créer également un profil SOS
    if (userRole === 'lawyer' || userRole === 'expat') {
      const sosProfileRef = doc(db, 'sos_profiles', firebaseUser.uid);
      console.log(`CRÉATION PROFIL SOS pour ${userRole}:`, firebaseUser.uid);
      
      // Déterminer la langue principale
      const mainLanguage = (userData.languages && userData.languages.length > 0) 
        ? userData.languages[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')
        : 'francais';

      // Déterminer le pays principal
      const country = userData.currentCountry || userData.country || '';
      const countrySlug = country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
      
      await setDoc(sosProfileRef, {
        uid: firebaseUser.uid,
        type: userRole,
        fullName: newUser.fullName,
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        slug: `${newUser.firstName.toLowerCase()}-${newUser.lastName.toLowerCase()}`,
        mainLanguage,
        countrySlug,
        email: newUser.email || '',
        phone: newUser.phone || '',
        phoneCountryCode: newUser.phoneCountryCode || '+33',
        languages: userData.languages || ['Français'],
        country: userData.currentCountry || userData.residenceCountry || '',
        city: '',
        description: userData.bio || '',
        ...(finalProfilePhoto && finalProfilePhoto !== '' && finalProfilePhoto !== '/default-avatar.png' ? {
  photoURL: finalProfilePhoto,
  profilePhoto: finalProfilePhoto,
  avatar: finalProfilePhoto
} : {}),
        isActive: false,
        isApproved: userData.role !== 'lawyer',
        isVerified: false,
        isVisible: true,
        isOnline: userRole === 'lawyer' ? false : true,
        rating: 5.0,
        reviewCount: 0,
        specialties: userRole === 'lawyer' ? (userData.specialties || []) : (userData.helpTypes || []),
        yearsOfExperience: userRole === 'lawyer' ? userData.yearsOfExperience : userData.yearsAsExpat || 0,
        price: userRole === 'lawyer' ? 49 : 19,
        duration: userRole === 'lawyer' ? 20 : 30,
        documents: [],
        motivation: userData.motivation || '',
        education: userData.education || '',
        lawSchool: userData.lawSchool || '',
        graduationYear: userData.graduationYear || new Date().getFullYear() - 5,
        certifications: userData.certifications || [],
        // Champs calculés automatiquement
        responseTime: '< 5 minutes',
        successRate: userData.role === 'lawyer' ? 95 : 90,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        interventionCountries: userData.interventionCountries || [country]
      });
      console.log(`Profil SOS créé pour ${userRole}:`, firebaseUser.uid);
    }
    
    // Retourner avec des dates réelles pour l'état local
    return {
      ...newUser,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    } as User;
  } catch (error) {
    console.error('Error creating user document in Firestore:', error);
    throw new Error('Failed to create user profile');
  }
};

// Fonction pour récupérer un document utilisateur existant
const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    console.log("getUserDocument - Récupération du document utilisateur existant");
    const userRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn('User document does not exist');
      return null;
    }
    
    const userData = userDoc.data();
    const existingRole = userData.role;
    
    console.log('ROLE EXISTANT RÉCUPÉRÉ:', existingRole);
    
    // Mettre à jour la dernière connexion
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true
    });
    
    return normalizeUserData(userData, firebaseUser.uid);
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
};

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isUserLoggedIn: () => boolean;
  isLoading: boolean;
  authInitialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>; 
  loginWithGoogle: () => Promise<void>; 
  register: (userData: Partial<User>, password: string) => Promise<void>; 
  logout: () => Promise<void>; 
  sendVerificationEmail: () => Promise<void>; 
  checkEmailVerification: () => Promise<boolean>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Fonction pour obtenir un message d'erreur localisé
const getErrorMessage = (errorCode: string = ''): string => {
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email ou mot de passe incorrect';
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà utilisée';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 8 caractères';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard';
    case 'auth/network-request-failed':
      return 'Erreur de connexion. Vérifiez votre internet';
    case 'auth/popup-closed-by-user':
      return 'Connexion annulée par l\'utilisateur';
    case 'auth/cancelled-popup-request':
      return 'Connexion annulée';
    case 'auth/operation-not-allowed':
      return 'Méthode de connexion non autorisée';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé';
    case 'auth/requires-recent-login':
      return 'Cette action nécessite une connexion récente';
    case 'auth/credential-already-in-use':
      return 'Ces identifiants sont déjà utilisés par un autre compte';
    default:
      return 'Une erreur est survenue. Veuillez réessayer';
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ❌ PROBLÈME 1: Cette fonction crée une boucle de dépendances
  // Elle est recréée à chaque render et cause des re-renders infinis
  const updateUserState = useCallback(async (currentFirebaseUser: FirebaseUser) => {
    try {
      const userData = await getUserDocument(currentFirebaseUser);
      if (userData) {
        setUser({
          ...userData,
          isVerifiedEmail: currentFirebaseUser.emailVerified
        });
      } else {
        console.warn('Aucun document utilisateur trouvé');
        setUser(null);
      }
    } catch (error) {
      console.error('Error updating user state:', error);
      setUser(null);
    }
  }, []); // ✅ CORRECTION: Supprimer les dépendances inutiles

  // ❌ PROBLÈME 2: useEffect avec trop de dépendances qui changent constamment
  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeUserDoc: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        if (!authInitialized) {
          setIsLoading(true);
        }
        
        unsubscribeAuth = onAuthStateChanged(auth, async (currentFirebaseUser) => {
          try {
            if (currentFirebaseUser) {
              console.log("Auth state changed: User logged in");
              setFirebaseUser(currentFirebaseUser);
              
              await updateUserState(currentFirebaseUser);
              
              // ❌ PROBLÈME 3: Cette vérification crée une dépendance circulaire
              // Supprimer cette logique qui cause des updates en boucle
              // if (currentFirebaseUser.emailVerified && user && !user.isVerifiedEmail) {
              //   try {
              //     await updateDoc(doc(db, 'users', currentFirebaseUser.uid), {
              //       emailVerified: true,
              //       isVerifiedEmail: true,
              //       updatedAt: serverTimestamp()
              //     });
              //   } catch (updateError) {
              //     console.error('Error updating email verification status:', updateError);
              //   }
              // }
            } else {
              console.log("Auth state changed: User logged out");
              setFirebaseUser(null);
              setUser(null);
              if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
                unsubscribeUserDoc = null;
              }
            }
          } catch (error) {
            console.error('Error in auth state change:', error);
            setError('Erreur lors du chargement du profil utilisateur');
            setUser(null);
          } finally {
            setIsLoading(false);
            if (!authInitialized) {
              setAuthInitialized(true);
            }
          } 
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [authInitialized, updateUserState]); // ✅ CORRECTION: Garder seulement les dépendances nécessaires

  // ✅ CORRECTION: Séparer l'écoute Firestore dans un useEffect distinct
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    console.log("Setting up Firestore listener for user:", firebaseUser.uid);
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', firebaseUser.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          // ✅ CORRECTION: Éviter les updates inutiles en comparant les données
          setUser((prevUser) => {
            const newUser = {
              ...prevUser,
              ...userData,
              uid: firebaseUser.uid,
              isVerifiedEmail: firebaseUser.emailVerified
            } as User;
            
            // Éviter les re-renders inutiles si les données n'ont pas changé
            if (JSON.stringify(prevUser) === JSON.stringify(newUser)) {
              return prevUser;
            }
            
            return newUser;
          });
        }
      },
      (error) => {
        console.error("Error listening to user document:", error);
      }
    );

    return () => {
      console.log("Cleaning up Firestore listener");
      unsubscribe();
    };
  }, [firebaseUser?.uid, firebaseUser?.emailVerified]); // ✅ Dépendances spécifiques

  const login = async (email: string, password: string) => {
    setIsLoading(true); 
    setError(null);
    
    // Validation des champs avant soumission
    if (!email || !password) {
      const errorMsg = 'Email et mot de passe sont obligatoires';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      // Si l'utilisateur n'existe pas dans Firestore, le créer avec un rôle par défaut
      if (!userDoc.exists()) {
        const userData = {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || '',
          role: 'client' as const, // Rôle par défaut avec type strict
          firstName: userCredential.user.displayName?.split(' ')[0] || '',
          lastName: userCredential.user.displayName?.split(' ')[1] || '',
          profilePhoto: userCredential.user.photoURL || '/default-avatar.png',
          photoURL: userCredential.user.photoURL || '/default-avatar.png',
          avatar: userCredential.user.photoURL || '/default-avatar.png',
          isActive: true,
          isApproved: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userRef, userData);
      }
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);
      const errorMsg = getErrorMessage(error.code);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isUserLoggedIn = useCallback(() => !!user || !!firebaseUser, [user, firebaseUser]);
  
  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Activer la persistance pour la session 
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google login error:', error);
      const errorMsg = getErrorMessage(error.code);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Partial<User>, password: string) => {
    setIsLoading(true);
    setError(null);
    
    console.log("REGISTER - Début de la fonction avec rôle:", userData.role);

    // Validation stricte du rôle avant de continuer
    if (!userData.role) {
      const errorMsg = 'Le rôle utilisateur est obligatoire pour l\'inscription';
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

    // Validation des champs obligatoires
    if (!userData.email || !password) {
      const errorMsg = 'Email et mot de passe sont obligatoires';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      const errorMsg = 'Format d\'email invalide';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    // Validation du mot de passe
    if (password.length < 8) {
      const errorMsg = 'Le mot de passe doit contenir au moins 8 caractères';
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      // Créer l'utilisateur Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      console.log("REGISTER - Utilisateur Firebase créé avec succès, UID:", userCredential.user.uid, "Rôle:", userData.role);
      
      // Traiter la photo de profil si elle existe et est au bon format
      let finalProfilePhotoURL = '';
       
      if (userData.profilePhoto && userData.profilePhoto.startsWith('data:image')) {
        try {
          console.log("REGISTER - Uploading profile photo to Firebase Storage");

          // Référence de stockage pour la photo de profil
          const storageRef = ref(storage, `profilePhotos/${userCredential.user.uid}/${Date.now()}.jpg`);
          
          // Upload de l'image en format data_url 
          const uploadResult = await uploadString(storageRef, userData.profilePhoto, 'data_url');
          
          // Récupération de l'URL publique
          finalProfilePhotoURL = await getDownloadURL(uploadResult.ref);
          
          console.log("REGISTER - Photo de profil uploadée avec succès");
          
          // Vérifier que l'URL est accessible
          try {
            const response = await fetch(finalProfilePhotoURL, { method: 'HEAD' });
            if (!response.ok) {
              console.warn("REGISTER - URL de photo non accessible, utilisation de l'image par défaut");
              finalProfilePhotoURL = '/default-avatar.png';
            }
          } catch (fetchError) {
            console.warn("REGISTER - Erreur de vérification de l'URL:", fetchError);
            finalProfilePhotoURL = '/default-avatar.png';
          }
        } catch (error) {
          console.error("REGISTER - Erreur lors de l'upload de la photo de profil:", error);
          // En cas d'erreur, on utilise l'image par défaut
          finalProfilePhotoURL = '/default-avatar.png';
        }
      } else if (userData.profilePhoto && userData.profilePhoto.startsWith('http')) {
        // Si c'est déjà une URL, on la garde
        finalProfilePhotoURL = userData.profilePhoto;
        console.log("REGISTER - Utilisation de l'URL de photo existante");
      }

      // Enregistrer l'événement d'inscription dans les logs 
      try {
        const logRef = collection(db, 'logs');
        await addDoc(logRef, {
          type: 'registration',
          userId: userCredential.user.uid,
          userEmail: userCredential.user.email,
          userRole: userData.role,
          profilePhotoUploaded: userData.profilePhoto ? true : false,
          registrationMethod: 'email_password',
          timestamp: serverTimestamp()
        }); 
        console.log("REGISTER - Événement d'inscription enregistré avec rôle:", userData.role);
      } catch (logError) {
        console.error("REGISTER - Erreur lors de l'enregistrement du log:", logError);
        // Ne pas faire échouer l'inscription pour un problème de log
      }
      
      // Créer une copie de userData avec le rôle explicitement défini
      const userDataWithRole = {
        ...userData,
        role: userData.role as 'client' | 'lawyer' | 'expat' | 'admin',
        profilePhoto: finalProfilePhotoURL,
        photoURL: finalProfilePhotoURL,
        avatar: finalProfilePhotoURL,
        // Champs de sécurité
        emailVerified: userCredential.user.emailVerified,
        isVerifiedEmail: userCredential.user.emailVerified,
        registrationIP: '', // À remplir côté serveur si nécessaire
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
        registrationDate: new Date().toISOString()
      };
       
      console.log("REGISTER - userDataWithRole préparé");
      
      const newUser = await createUserDocumentInFirestore(userCredential.user, userDataWithRole);
      console.log("REGISTER - Document utilisateur créé avec succès, rôle final:", newUser.role);
      
      // ✅ CORRECTION: Ne pas mettre à jour l'état manuellement ici
      // Laisser onAuthStateChanged gérer cela pour éviter les conflits
      // setUser(newUser);
      // setFirebaseUser(userCredential.user);
       
      // Envoyer l'email de vérification dans la langue de l'utilisateur
      try {
        const userLanguage = userData.preferredLanguage || 'fr';
        const { sendVerificationEmail } = await import('../utils/auth');
        await sendVerificationEmail(userLanguage);
        console.log("REGISTER - Email de vérification envoyé dans la langue:", userLanguage);
      } catch (emailError: any) {
        console.error("REGISTER - Erreur lors de l'envoi de l'email de vérification:", emailError);
        // Ne pas faire échouer l'inscription pour un problème d'email
      }
       
      console.log("REGISTER - Inscription terminée avec succès. Photo de profil finale:", finalProfilePhotoURL);

    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Log de l'erreur pour debugging
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'registration_error',
          error: error.message,
          userEmail: userData.email,
          userRole: userData.role,
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.error('Error logging registration error:', logError);
      }
      
      const errorMsg = getErrorMessage(error.code || '') || error.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try { 
      if (user && user.id) {
        console.log('Logging out user:', user.id);
        // Enregistrer l'événement de déconnexion
        try {
          await addDoc(collection(db, 'logs'), {
            type: 'logout',
            userId: user.id,
            timestamp: serverTimestamp()
          });
        } catch (logError) {
          console.error('Error logging logout event:', logError);
        }
        
        
      }
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error); 
      // Ne pas empêcher la déconnexion pour une erreur de nettoyage
    }
  };

  // Envoyer un email de vérification
  const sendVerificationEmail = async () => { 
    if (!firebaseUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    try {
      // Récupérer la langue de l'utilisateur
      const userLanguage = user?.preferredLanguage || user?.lang || 'fr';
       
      // Importer la fonction depuis utils/auth
      const { sendVerificationEmail: sendEmail } = await import('../utils/auth');
      await sendEmail(userLanguage);
      
      // Enregistrer l'événement
      await addDoc(collection(db, 'logs'), {
        type: 'verification_email_sent',
        userId: firebaseUser.uid,
        timestamp: serverTimestamp()
      });
       
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      const errorMsg = getErrorMessage(error.code);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };
   
  // Vérifier si l'email est vérifié (recharge l'utilisateur Firebase)
  const checkEmailVerification = async (): Promise<boolean> => {
    if (!firebaseUser) {
      return false;
    } 
    
    try {
      // Recharger l'utilisateur pour obtenir le statut le plus récent
      await firebaseUser.reload();
      const reloadedUser = auth.currentUser;
        
      if (reloadedUser && reloadedUser.emailVerified) {
        // Mettre à jour Firestore
        await updateDoc(doc(db, 'users', reloadedUser.uid), {
          emailVerified: true,
          isVerifiedEmail: true,
          updatedAt: serverTimestamp()
        });
        
        // ✅ CORRECTION: Éviter la mise à jour directe de l'état
        // Laisser le listener Firestore gérer cela pour éviter les conflits
        // if (user) {
        //   setUser({
        //     ...user,
        //     isVerified: true,
        //     isVerifiedEmail: true
        //   });
        // }
        
        // Forcer le rafraîchissement du token ID pour mettre à jour la claim email_verified
        await reloadedUser.getIdToken(true);
         
        return true;
      } 
      
      return false;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  };

  // ✅ CORRECTION: Fonction manquante dans l'interface
  const updateUserEmail = async (newEmail: string): Promise<void> => {
    if (!auth.currentUser) throw new Error("Aucun utilisateur connecté");

    try {
      // Import dynamique pour éviter les erreurs de dépendances circulaires
      const { updateEmail } = await import('firebase/auth');
      
      // Étape 1 : Mise à jour de l'email dans Firebase Auth
      await updateEmail(auth.currentUser, newEmail);

      // Étape 2 : Recharge le user pour garantir la cohérence
      await auth.currentUser.reload();

      // Étape 3 : Mise à jour dans Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        email: newEmail,
        updatedAt: serverTimestamp()
      });

      // ✅ CORRECTION: Ne pas mettre à jour l'état directement
      // Laisser le listener Firestore gérer cela
      // if (user) {
      //   setUser({
      //     ...user,
      //     email: newEmail
      //   });
      // }

      console.log('✅ Email mis à jour avec succès');
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour de l'email:", error);
      throw new Error("Impossible de mettre à jour l'email");
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isUserLoggedIn,
    isLoading, 
    authInitialized, 
    error,
    login, 
    loginWithGoogle, 
    register, 
    logout, 
    sendVerificationEmail, 
    checkEmailVerification
  };

  return ( 
    <AuthContext.Provider value={value}>
      {children}  
    </AuthContext.Provider> 
  );
};
