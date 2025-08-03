import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  User as FirebaseUser,
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import { logError } from './logging';

// Configurations des emails de vérification par langue
const verificationEmailConfig = {
  fr: {
    url: 'https://sosexpats.com/email-verification',
    subject: 'Vérifiez votre adresse email - SOS Expats',
    handleCodeInApp: true
  },
  en: {
    url: 'https://sosexpats.com/email-verification',
    subject: 'Verify your email address - SOS Expats',
    handleCodeInApp: true
  }
};

// Configurations des SMS de vérification par langue
const verificationSmsConfig = {
  fr: {
    message: 'Votre code de vérification SOS Expats est: {CODE}. Ne le partagez avec personne.'
  },
  en: {
    message: 'Your SOS Expats verification code is: {CODE}. Do not share it with anyone.'
  }
};

// Initialiser reCAPTCHA invisible
const initRecaptcha = (elementId: string = 'recaptcha-container') => {
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA resolved, allow signInWithPhoneNumber.
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        console.log('reCAPTCHA expired');
      }
    });
    
    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
};

// Enregistrer un nouvel utilisateur
const registerUser = async (userData: Partial<User>, password: string): Promise<FirebaseUser> => {
  try {
    // Vérifier que le rôle est valide
    if (!userData.role || !['client', 'lawyer', 'expat'].includes(userData.role)) {
      throw new Error('Rôle utilisateur invalide ou manquant');
    }
    
    // Créer l'utilisateur dans Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email!, password);
    const firebaseUser = userCredential.user;
    
    // Déterminer la langue préférée de l'utilisateur
    const userLanguage = userData.preferredLanguage || 'fr';
    
    // Mettre à jour le profil Firebase Auth
    await updateProfile(firebaseUser, {
      displayName: `${userData.firstName} ${userData.lastName}`,
      photoURL: userData.profilePhoto || null
    });
    
    // Envoyer l'email de vérification
    await sendEmailVerification(firebaseUser, verificationEmailConfig[userLanguage]);
    
    // Créer le document utilisateur dans Firestore
    const userDocData = {
      ...userData,
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,
      displayName: `${userData.firstName} ${userData.lastName}`,
      photoURL: userData.profilePhoto || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
      isApproved: userData.role === 'client', // Les clients sont approuvés automatiquement
      isBanned: false,
      isVerified: userData.role === 'client', // Les clients sont vérifiés automatiquement
      isAdmin: false,
      isOnline: false,
      isVisibleOnMap: true,
      isVisible: true,
      fullName: `${userData.firstName} ${userData.lastName}`,
      lang: userData.preferredLanguage || 'fr',
      country: userData.currentCountry || '',
      avatar: userData.profilePhoto || null,
      isSOS: userData.role !== 'client',
      points: 0,
      affiliateCode: `SOS-${firebaseUser.uid.substring(0, 6).toUpperCase()}`,
      referralBy: userData.referralBy || null,
      registrationIP: '',
      deviceInfo: '',
      userAgent: navigator.userAgent || '',
      notificationPreferences: {
        email: true,
        push: true,
        sms: false
      }
    };
    // 🔒 Sécurité renforcée pour les avocats
if (userData.role === 'lawyer') {
  userDocData.isOnline = false;
  userDocData.isApproved = false;
}

    // Enregistrer dans Firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), userDocData);
    
    // Si c'est un prestataire (avocat ou expatrié), créer un profil SOS
    if (userData.role === 'lawyer' || userData.role === 'expat') {
      const sosProfileData = {
        uid: firebaseUser.uid,
        type: userData.role,
        fullName: `${userData.firstName} ${userData.lastName}`,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone || '',
        phoneCountryCode: userData.phoneCountryCode || '+33',
        languages: userData.languages || ['Français'],
        country: userData.currentCountry || userData.country || '',
        city: userData.city || '',
        description: userData.bio || '',
        profilePhoto: userData.profilePhoto || null,
        photoURL: userData.profilePhoto || null,
        avatar: userData.profilePhoto || null,
        isActive: true,
        isApproved: userData.role === 'expat' ? true : false,
        isVerified: userData.role === 'expat' ? true : false,
        isVisible: true,
        isVisibleOnMap: true,
        isOnline: false,
        availability: 'offline',
        rating: 5.0, // Commencer avec 5 étoiles par défaut
        reviewCount: 0,
        specialties: userData.role === 'lawyer' ? (userData.specialties || []) : (userData.helpTypes || []),
        yearsOfExperience: userData.role === 'lawyer' ? (userData.yearsOfExperience || 0) : (userData.yearsAsExpat || 0),
        price: userData.role === 'lawyer' ? 49 : 19,
        duration: userData.role === 'lawyer' ? 20 : 30,
        documents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'sos_profiles', firebaseUser.uid), sosProfileData);
    }
    
    // Enregistrer l'événement d'inscription
    await addDoc(collection(db, 'logs'), {
      type: 'registration',
      userId: firebaseUser.uid,
      userEmail: firebaseUser.email,
      userRole: userData.role,
      timestamp: serverTimestamp()
    });
    
    return firebaseUser;
  } catch (error) {
    console.error('Error registering user:', error);
    logError({
      origin: 'frontend',
      error: `Registration error: ${error.message}`,
      context: { email: userData.email, role: userData.role }
    });
    throw error;
  }
};

// Connecter un utilisateur existant
const loginUser = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Mettre à jour le statut de connexion dans Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      isActive: true
    });
    
    // Enregistrer l'événement de connexion
    await addDoc(collection(db, 'logs'), {
      type: 'login',
      userId: firebaseUser.uid,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    });
    
    return firebaseUser;
  } catch (error) {
    console.error('Error logging in:', error);
    logError({
      origin: 'frontend',
      error: `Login error: ${error.message}`,
      context: { email }
    });
    throw error;
  }
};

// Connecter avec Google
const loginWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;
    
    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Nouvel utilisateur Google, créer un profil client par défaut
      const userData = {
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        isVerifiedEmail: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName || '',
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        photoURL: firebaseUser.photoURL,
        profilePhoto: firebaseUser.photoURL,
        avatar: firebaseUser.photoURL,
        role: 'client', // Par défaut, les connexions Google créent des clients
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        isApproved: true, // Les clients sont approuvés automatiquement
        isBanned: false,
        isVerified: true, // Les clients sont vérifiés automatiquement
        isAdmin: false,
        isOnline: false,
        isVisibleOnMap: false,
        isVisible: false,
        fullName: firebaseUser.displayName || '',
        lang: 'fr',
        country: '',
        points: 0,
        affiliateCode: `SOS-${firebaseUser.uid.substring(0, 6).toUpperCase()}`,
        referralBy: null,
        notificationPreferences: {
          email: true,
          push: true,
          sms: false
        }
      };
      
      await setDoc(userRef, userData);
      
      // Enregistrer l'événement d'inscription
      await addDoc(collection(db, 'logs'), {
        type: 'google_registration',
        userId: firebaseUser.uid,
        userEmail: firebaseUser.email,
        timestamp: serverTimestamp()
      });
    } else {
      // Utilisateur existant, mettre à jour le statut de connexion
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        isActive: true,
        emailVerified: firebaseUser.emailVerified,
        isVerifiedEmail: firebaseUser.emailVerified
      });
      
      // Enregistrer l'événement de connexion
      await addDoc(collection(db, 'logs'), {
        type: 'google_login',
        userId: firebaseUser.uid,
        timestamp: serverTimestamp()
      });
    }
    
    return firebaseUser;
  } catch (error) {
    console.error('Error logging in with Google:', error);
    logError({
      origin: 'frontend',
      error: `Google login error: ${error.message}`,
      context: {}
    });
    throw error;
  }
};

// Déconnecter l'utilisateur
const logoutUser = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Mettre à jour le statut en ligne
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        availability: 'offline',
        lastLogoutAt: serverTimestamp()
      });
      
      // Si c'est un prestataire, mettre à jour le profil SOS
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && (userDoc.data().role === 'lawyer' || userDoc.data().role === 'expat')) {
        const sosProfileRef = doc(db, 'sos_profiles', currentUser.uid);
        await updateDoc(sosProfileRef, {
          isOnline: false,
          availability: 'offline',
          updatedAt: serverTimestamp()
        });
      }
      
      // Enregistrer l'événement de déconnexion
      await addDoc(collection(db, 'logs'), {
        type: 'logout',
        userId: currentUser.uid,
        timestamp: serverTimestamp()
      });
    }
    
    // Déconnecter de Firebase Auth
    await signOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    logError({
      origin: 'frontend',
      error: `Logout error: ${error.message}`,
      context: { userId: auth.currentUser?.uid }
    });
    throw error;
  }
};

// Réinitialiser le mot de passe
const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
    
    // Enregistrer l'événement de réinitialisation
    await addDoc(collection(db, 'logs'), {
      type: 'password_reset_request',
      userEmail: email,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    logError({
      origin: 'frontend',
      error: `Password reset error: ${error.message}`,
      context: { email }
    });
    throw error;
  }
};

// Envoyer un email de vérification
export const sendVerificationEmail = async (userLanguage?: string) => {
  if (!auth.currentUser) {
    throw new Error('Aucun utilisateur connecté');
  }
  
  try {
    // Récupérer la langue de l'utilisateur depuis Firestore si non fournie
    if (!userLanguage) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        userLanguage = userDoc.data().preferredLanguage || userDoc.data().lang || 'fr';
      } else {
        userLanguage = 'fr'; // Langue par défaut
      }
    }
    
    // Utiliser la configuration correspondant à la langue
    const emailConfig = verificationEmailConfig[userLanguage] || verificationEmailConfig.fr;
    
    await sendEmailVerification(auth.currentUser, emailConfig);
    
    // Enregistrer l'événement
    await addDoc(collection(db, 'logs'), {
      type: 'verification_email_sent',
      userId: auth.currentUser.uid,
      language: userLanguage,
      timestamp: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    logError({
      origin: 'frontend',
      error: `Verification email error: ${error.message}`,
      context: { userId: auth.currentUser?.uid }
    });
    throw error;
  }
};

// Envoyer un SMS de vérification
const sendVerificationSMS = async (phoneNumber: string, recaptchaVerifier: any, userLanguage?: string) => {
  try {
    // Récupérer la langue de l'utilisateur depuis Firestore si non fournie
    if (!userLanguage && auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        userLanguage = userDoc.data().preferredLanguage || userDoc.data().lang || 'fr';
      } else {
        userLanguage = 'fr'; // Langue par défaut
      }
    }
    
    // Utiliser la configuration correspondant à la langue
    const smsConfig = verificationSmsConfig[userLanguage || 'fr'];
    
    // Envoyer le SMS de vérification
    const confirmationResult = await signInWithPhoneNumber(
      auth, 
      phoneNumber, 
      recaptchaVerifier, 
      { smsTemplate: smsConfig.message }
    );
    
    // Enregistrer l'événement
    if (auth.currentUser) {
      await addDoc(collection(db, 'logs'), {
        type: 'verification_sms_sent',
        userId: auth.currentUser.uid,
        phoneNumber,
        language: userLanguage || 'fr',
        timestamp: serverTimestamp()
      });
    }
    
    return confirmationResult;
  } catch (error) {
    console.error('Error sending verification SMS:', error);
    logError({
      origin: 'frontend',
      error: `Verification SMS error: ${error.message}`,
      context: { phoneNumber, userId: auth.currentUser?.uid }
    });
    throw error;
  }
};

// Vérifier si l'utilisateur est connecté et a un rôle spécifique
// Vérifie si l'utilisateur passé en paramètre a un rôle donné
export const checkUserRole = (
  user: { role?: string },
  allowedRoles: string | string[]
): boolean => {
  if (!user || !user.role) return false;
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return rolesArray.includes(user.role);
};


// Vérifier si l'utilisateur est vérifié par email
export const isEmailVerified = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (!user) {
        resolve(false);
        return;
      }
      
      try {
        // Vérifier dans Firebase Auth
        if (!user.emailVerified) {
          resolve(false);
          return;
        }
        
        // Vérifier aussi dans Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          resolve(false);
          return;
        }
        
        const userData = userDoc.data();
        resolve(userData.isVerifiedEmail === true);
      } catch (error) {
        console.error('Error checking email verification:', error);
        resolve(false);
      }
    });
  });
};

// Mettre à jour le statut de vérification d'email dans Firestore
const updateEmailVerificationStatus = async (userId: string, isVerified: boolean): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      emailVerified: isVerified,
      isVerifiedEmail: isVerified,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating email verification status:', error);
    throw error;
  }
};

// Vérifier si l'utilisateur est banni
export const isUserBanned = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    
    return userDoc.data().isBanned === true;
  } catch (error) {
    console.error('Error checking if user is banned:', error);
    return false;
  }
};

// Obtenir les données utilisateur complètes
const getUserData = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    
    return {
      ...userDoc.data(),
      id: userDoc.id,
      createdAt: userDoc.data().createdAt?.toDate() || new Date(),
      updatedAt: userDoc.data().updatedAt?.toDate() || new Date(),
      lastLoginAt: userDoc.data().lastLoginAt?.toDate() || new Date()
    } as User;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Vérifier si l'utilisateur est approuvé (pour les avocats et expatriés)
const isUserApproved = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    
    return userDoc.data().isApproved === true;
  } catch (error) {
    console.error('Error checking if user is approved:', error);
    return false;
  }
};

// Vérifier si l'utilisateur est admin
const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    
    return userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
};

export {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  initRecaptcha,
  sendVerificationSMS,
  getUserData,
  updateEmailVerificationStatus,
  isUserApproved,
  isUserAdmin
};