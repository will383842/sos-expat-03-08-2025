import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { logError } from "./logging";
import { getErrorMessage } from "./errors";
import type { User } from "../contexts/types";

/* -------------------------------------------------------------------------- */
/*                          Config i18n SMS (typée)                            */
/* -------------------------------------------------------------------------- */

const verificationSmsConfig = {
  fr: {
    message:
      "Votre code de vérification SOS Expats est: {CODE}. Ne le partagez avec personne.",
  },
  en: {
    message:
      "Your SOS Expats verification code is: {CODE}. Do not share it with anyone.",
  },
} as const;

type Lang = keyof typeof verificationSmsConfig; // 'fr' | 'en'

/* -------------------------------------------------------------------------- */
/*                         reCAPTCHA (invisible) init                         */
/* -------------------------------------------------------------------------- */

const initRecaptcha = (elementId: string = "recaptcha-container") => {
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: "invisible",
      callback: () => {
        // OK
      },
      "expired-callback": () => {
        // expiré
      },
    });
    return recaptchaVerifier;
  } catch (err: unknown) {
    console.error("Error initializing reCAPTCHA:", err);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                               Register user                                */
/* -------------------------------------------------------------------------- */

const registerUser = async (
  userData: Partial<User>,
  password: string
): Promise<FirebaseUser> => {
  try {
    if (
      !userData.role ||
      !["client", "lawyer", "expat"].includes(userData.role)
    ) {
      throw new Error("Rôle utilisateur invalide ou manquant");
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email!,
      password
    );
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, {
      displayName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
      photoURL: userData.profilePhoto || null,
    });

    const baseUser = {
      ...userData,
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,
      displayName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
      photoURL: userData.profilePhoto || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
      isApproved: userData.role === "client",
      isBanned: false,
      isVerified: userData.role === "client",
      isAdmin: false,
      isOnline: false,
      isVisibleOnMap: true,
      isVisible: true,
      fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
      lang: userData.preferredLanguage || "fr",
      country: userData.currentCountry || "",
      avatar: userData.profilePhoto || null,
      isSOS: userData.role !== "client",
      points: 0,
      affiliateCode: `SOS-${firebaseUser.uid.substring(0, 6).toUpperCase()}`,
      referralBy: userData.referralBy || null,
      registrationIP: "",
      deviceInfo: "",
      userAgent: navigator.userAgent || "",
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
    };

    // 🔒 Avocats non approuvés/online par défaut
    const userDocData = {
      ...baseUser,
      isOnline: userData.role === "lawyer" ? false : baseUser.isOnline,
      isApproved: userData.role === "lawyer" ? false : baseUser.isApproved,
    };

    await setDoc(doc(db, "users", firebaseUser.uid), userDocData);

    // Profil SOS pour prestataires
    if (userData.role === "lawyer" || userData.role === "expat") {
      // D. city n’existe pas sur Partial<User> → accès sécurisé sans any
      const city =
        (userData as { city?: string }).city && typeof (userData as { city?: string }).city === "string"
          ? (userData as { city?: string }).city!
          : "";

      const sosProfileData = {
        uid: firebaseUser.uid,
        type: userData.role,
        fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
        firstName: userData.firstName ?? "",
        lastName: userData.lastName ?? "",
        email: userData.email ?? "",
        phone: userData.phone || "",
        phoneCountryCode: userData.phoneCountryCode || "+33",
        languages: userData.languages || ["Français"],
        country: userData.currentCountry || userData.country || "",
        city,
        description: userData.bio || "",
        profilePhoto: userData.profilePhoto || null,
        photoURL: userData.profilePhoto || null,
        avatar: userData.profilePhoto || null,
        isActive: true,
        isApproved: userData.role === "expat",
        isVerified: userData.role === "expat",
        isVisible: true,
        isVisibleOnMap: true,
        isOnline: false,
        availability: "offline",
        rating: 5.0,
        reviewCount: 0,
        specialties:
          userData.role === "lawyer"
            ? userData.specialties || []
            : userData.helpTypes || [],
        yearsOfExperience:
          userData.role === "lawyer"
            ? userData.yearsOfExperience || 0
            : userData.yearsAsExpat || 0,
        price: userData.role === "lawyer" ? 49 : 19,
        duration: userData.role === "lawyer" ? 20 : 30,
        documents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "sos_profiles", firebaseUser.uid), sosProfileData);
    }

    await addDoc(collection(db, "logs"), {
      type: "registration",
      userId: firebaseUser.uid,
      userEmail: firebaseUser.email,
      userRole: userData.role,
      timestamp: serverTimestamp(),
    });

    return firebaseUser;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error registering user:", err);
    logError({
      origin: "frontend",
      error: `Registration error: ${msg}`,
      context: { email: userData.email, role: userData.role },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                                   Login                                    */
/* -------------------------------------------------------------------------- */

const loginUser = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    const userRef = doc(db, "users", firebaseUser.uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      isActive: true,
    });

    await addDoc(collection(db, "logs"), {
      type: "login",
      userId: firebaseUser.uid,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    });

    return firebaseUser;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error logging in:", err);
    logError({
      origin: "frontend",
      error: `Login error: ${msg}`,
      context: { email },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                              Login with Google                             */
/* -------------------------------------------------------------------------- */

const loginWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    const userRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const userData = {
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        isVerifiedEmail: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName || "",
        firstName: firebaseUser.displayName?.split(" ")[0] || "",
        lastName:
          firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
        photoURL: firebaseUser.photoURL,
        profilePhoto: firebaseUser.photoURL,
        avatar: firebaseUser.photoURL,
        role: "client",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        isApproved: true,
        isBanned: false,
        isVerified: true,
        isAdmin: false,
        isOnline: false,
        isVisibleOnMap: false,
        isVisible: false,
        fullName: firebaseUser.displayName || "",
        lang: "fr",
        country: "",
        points: 0,
        affiliateCode: `SOS-${firebaseUser.uid.substring(0, 6).toUpperCase()}`,
        referralBy: null,
        notificationPreferences: {
          email: true,
          push: true,
          sms: false,
        },
      };

      await setDoc(userRef, userData);

      await addDoc(collection(db, "logs"), {
        type: "google_registration",
        userId: firebaseUser.uid,
        userEmail: firebaseUser.email,
        timestamp: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        isActive: true,
        emailVerified: firebaseUser.emailVerified,
        isVerifiedEmail: firebaseUser.emailVerified,
      });

      await addDoc(collection(db, "logs"), {
        type: "google_login",
        userId: firebaseUser.uid,
        timestamp: serverTimestamp(),
      });
    }

    return firebaseUser;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error logging in with Google:", err);
    logError({
      origin: "frontend",
      error: `Google login error: ${msg}`,
      context: {},
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                                  Logout                                    */
/* -------------------------------------------------------------------------- */

const logoutUser = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        availability: "offline",
        lastLogoutAt: serverTimestamp(),
      });

      const userDoc = await getDoc(userRef);
      const role = userDoc.exists()
        ? (userDoc.data().role as string | undefined)
        : undefined;

      if (role === "lawyer" || role === "expat") {
        const sosProfileRef = doc(db, "sos_profiles", currentUser.uid);
        await updateDoc(sosProfileRef, {
          isOnline: false,
          availability: "offline",
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "logs"), {
        type: "logout",
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
      });
    }

    await signOut(auth);
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error logging out:", err);
    logError({
      origin: "frontend",
      error: `Logout error: ${msg}`,
      context: { userId: auth.currentUser?.uid },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                                Reset password                              */
/* -------------------------------------------------------------------------- */

const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);

    await addDoc(collection(db, "logs"), {
      type: "password_reset_request",
      userEmail: email,
      timestamp: serverTimestamp(),
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error resetting password:", err);
    logError({
      origin: "frontend",
      error: `Password reset error: ${msg}`,
      context: { email },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                           SMS Verification (i18n)                           */
/* -------------------------------------------------------------------------- */

const sendVerificationSMS = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
  userLanguage?: string
): Promise<ConfirmationResult> => {
  try {
    // B. Indexation i18n sûre
    let lang: Lang = "fr";
    if (userLanguage === "en") lang = "en";

    // Si non fourni, on tente de récupérer la langue depuis Firestore
    if (!userLanguage && auth.currentUser) {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const fromDb =
        userDoc.exists() &&
        (userDoc.data().preferredLanguage || userDoc.data().lang);
      if (fromDb === "en") lang = "en";
      else lang = "fr";
    }

    // On peut inclure le template dans le log pour éviter un "unused var"
    const smsTemplate = verificationSmsConfig[lang].message;

    // C. Appel à la fonction SMS → 3 arguments (Firebase)
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );

    // Log
    if (auth.currentUser) {
      await addDoc(collection(db, "logs"), {
        type: "verification_sms_sent",
        userId: auth.currentUser.uid,
        phoneNumber,
        language: lang,
        template: smsTemplate,
        timestamp: serverTimestamp(),
      });
    }

    return confirmationResult;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error sending verification SMS:", err);
    logError({
      origin: "frontend",
      error: `Verification SMS error: ${msg}`,
      context: { phoneNumber, userId: auth.currentUser?.uid },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                             Role / Admin / Data                             */
/* -------------------------------------------------------------------------- */

export const checkUserRole = (
  user: { role?: string },
  allowedRoles: string | string[]
): boolean => {
  if (!user || !user.role) return false;
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return rolesArray.includes(user.role);
};

export const isUserBanned = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    return userDoc.data().isBanned === true;
  } catch (err: unknown) {
    console.error("Error checking if user is banned:", err);
    return false;
  }
};

const getUserData = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
      ...data,
      id: userDoc.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      lastLoginAt: data.lastLoginAt?.toDate?.() ?? new Date(),
    } as User;
  } catch (err: unknown) {
    console.error("Error getting user data:", err);
    return null;
  }
};

const isUserApproved = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    return userDoc.data().isApproved === true;
  } catch (err: unknown) {
    console.error("Error checking if user is approved:", err);
    return false;
  }
};

const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    return userDoc.data().role === "admin";
  } catch (err: unknown) {
    console.error("Error checking if user is admin:", err);
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
  isUserApproved,
  isUserAdmin,
};
