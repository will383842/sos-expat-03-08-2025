// src/utils/firestore.ts

// ========================= Imports =========================
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';

// Import correct du type User depuis contexts/types
import type { User } from '../contexts/types';
import type { CallRecord, Payment, Review, CallSession } from '../types';

// ========================= Utils =========================
const toDate = (v: unknown): Date | null => {
  try {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v instanceof Timestamp) return v.toDate();
    const maybe = (v as any);
    if (typeof maybe?.toDate === 'function') return maybe.toDate();
    const d = new Date(v as string | number);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const truthy = (v: unknown) => v !== undefined && v !== null;

export const firstString = (val: unknown, preferredLang: string = 'fr'): string | undefined => {
  if (!val) return;
  if (typeof val === 'string') return val.trim() || undefined;
  if (Array.isArray(val)) {
    const joined = val
      .map((x) => firstString(x, preferredLang))
      .filter(Boolean)
      .join(', ');
    return joined || undefined;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const byLang = obj[preferredLang];
    if (typeof byLang === 'string' && byLang.trim()) return byLang.trim();
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return;
};

// ========================= Normalization =========================
export const normalizeUserData = (userData: Record<string, any>, docId: string): User => {
  return {
    id: docId,
    uid: (userData?.uid as string) || docId,
    role: (userData?.role as string) || 'client',
    country: (userData?.country as string) || (userData?.currentCountry as string) || '',
    fullName:
      (userData?.fullName as string) ||
      `${(userData?.firstName as string) || ''} ${(userData?.lastName as string) || ''}`.trim() ||
      'Utilisateur',
    updatedAt: toDate(userData?.updatedAt) || new Date(),
    lastLoginAt: toDate(userData?.lastLoginAt) || new Date(),
    createdAt: toDate(userData?.createdAt) || new Date(),
    firstName: (userData?.firstName as string) || '',
    lastName: (userData?.lastName as string) || '',
    email: (userData?.email as string) || '',
    phone: (userData?.phone as string) || '',
    phoneCountryCode: (userData?.phoneCountryCode as string) || '+33',
    currentCountry: (userData?.currentCountry as string) || '',
    preferredLanguage: (userData?.preferredLanguage as string) || 'fr',
    profilePhoto:
      (userData?.profilePhoto as string) ||
      (userData?.photoURL as string) ||
      (userData?.avatar as string) ||
      '/default-avatar.png',
    isActive: userData?.isActive !== false,
    isApproved: !!userData?.isApproved,
    isVerified: !!userData?.isVerified,
    isVisibleOnMap: userData?.isVisibleOnMap !== false,
    isAvailable: !!userData?.isAvailable,
    isBanned: !!userData?.isBanned,
    banReason: (userData?.banReason as string) || '',
    profileCompleted: !!userData?.profileCompleted,
    stripeCustomerId: (userData?.stripeCustomerId as string) || '',
    stripeAccountId: (userData?.stripeAccountId as string) || '',
    notificationPreferences:
      (userData?.notificationPreferences as { email: boolean; push: boolean; sms: boolean }) || {
        email: true,
        push: true,
        sms: false,
      },
    deviceTokens: Array.isArray(userData?.deviceTokens) ? (userData.deviceTokens as string[]) : [],
    marketingConsent: !!userData?.marketingConsent,
    lastActive: toDate(userData?.lastActive) || new Date(),
    createdByAdmin: !!userData?.createdByAdmin,
    isTestProfile: !!userData?.isTestProfile,
    isCallable: userData?.isCallable !== false,

    // Nouveaux champs requis
    lang: (userData?.lang as string) || (userData?.preferredLanguage as string) || 'fr',
    avatar:
      (userData?.avatar as string) ||
      (userData?.profilePhoto as string) ||
      (userData?.photoURL as string) ||
      '/default-avatar.png',
    isSOS:
      (userData?.isSOS as boolean) ||
      ((userData?.role as string) === 'lawyer' || (userData?.role as string) === 'expat'),
    points: Number(userData?.points ?? 0),
    affiliateCode: (userData?.affiliateCode as string) || `SOS-${docId.substring(0, 6).toUpperCase()}`,
    referralBy: truthy(userData?.referralBy) ? (userData?.referralBy as string) : null,

    // Champs pour production
    bio: (userData?.bio as string) || '',
    hourlyRate: Number(userData?.hourlyRate ?? ((userData?.role as string) === 'lawyer' ? 49 : 19)),
    responseTime: (userData?.responseTime as string) || '< 5 minutes',
    availability: (userData?.availability as string) || 'available',
    totalCalls: Number(userData?.totalCalls ?? 0),
    totalEarnings: Number(userData?.totalEarnings ?? 0),
    averageRating: Number(userData?.averageRating ?? 5.0),

    // Champs supplémentaires
    mainLanguage: userData?.mainLanguage as string | undefined,
    languages: Array.isArray(userData?.languages) ? (userData.languages as string[]) : [],
    city: (userData?.city as string) || '',
    interventionCountries: Array.isArray(userData?.interventionCountries)
      ? (userData.interventionCountries as string[])
      : [],
    certifications: userData?.certifications as string | undefined,
    education: userData?.education as string | string[] | undefined,
    lawSchool: userData?.lawSchool as string | undefined,
    graduationYear: truthy(userData?.graduationYear) ? Number(userData.graduationYear) : undefined,
    successRate: truthy(userData?.successRate) ? Number(userData.successRate) : undefined,
    duration: truthy(userData?.duration) ? Number(userData.duration) : undefined,
    price:
      truthy(userData?.price) ? Number(userData.price) : (userData?.role as string) === 'lawyer' ? 49 : 19,
    rating: Number(userData?.rating ?? userData?.averageRating ?? 5),
    reviewCount: Number(userData?.reviewCount ?? 0),
    lastSeen: toDate(userData?.lastSeen),

    // champs riches
    description: userData?.description as string | undefined,
    professionalDescription: userData?.professionalDescription as string | undefined,
    experienceDescription: userData?.experienceDescription as string | undefined,
    motivation: userData?.motivation as string | undefined,
    slug: userData?.slug as string | undefined,
    countrySlug: userData?.countrySlug as string | undefined,
    photoURL: userData?.photoURL as string | undefined,
  } as User;
};

// ========================= Collections bootstrapping =========================
export const ensureCollectionsExist = async () => {
  try {
    const collections = [
      'users',
      'calls',
      'payments',
      'reviews',
      'documents',
      'notifications',
      'testimonials',
      'call_sessions',
      'sos_profiles',
      'invoices',
      'logs',
      'app_settings',
      'admin_settings',
      'help_articles',
      'countries',
      'analytics',
      'affiliate_codes',
      'referrals',
      'booking_requests',
      'call_records',
      'refund_requests',
      'promo_codes',
      'review_reports',
      'call_logs',
    ];
    for (const collectionName of collections) {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(query(colRef, fsLimit(1)));
      if (snapshot.empty) {
        await addDoc(colRef, {
          _placeholder: true,
          _created: serverTimestamp(),
          _description: `Placeholder document for ${collectionName} collection`,
        });
      }
    }
    return true;
  } catch (error) {
    console.error('Error ensuring collections exist:', error);
    return false;
  }
};

export const createInitialAppSettings = async () => {
  try {
    const settingsRef = doc(db, 'app_settings', 'main');
    const settingsDoc = await getDoc(settingsRef);
    if (!settingsDoc.exists()) {
      await setDoc(settingsRef, {
        servicesEnabled: { lawyerCalls: true, expatCalls: true },
        pricing: { lawyerCall: 49, expatCall: 19 },
        platformCommission: 0.15,
        maxCallDuration: 30,
        callTimeout: 30,
        supportedCountries: ['CA', 'UK', 'DE', 'ES', 'IT', 'BE', 'CH', 'LU', 'NL', 'AT'],
        supportedLanguages: ['fr', 'en'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    console.error('Error creating initial app settings:', error);
    return false;
  }
};

// ========================= User =========================
export const createUserProfile = async (userData: Partial<User>) => {
  try {
    if (!userData.id) throw new Error('User ID is required');

    // Photo de profil (support base64 et URL)
    let finalProfilePhoto = '/default-avatar.png';
    if (userData.profilePhoto) {
      if (userData.profilePhoto.startsWith('data:image')) {
        const storageRef = ref(storage, `profilePhotos/${userData.id}/${Date.now()}.jpg`);
        const uploadResult = await uploadString(storageRef, userData.profilePhoto, 'data_url');
        finalProfilePhoto = await getDownloadURL(uploadResult.ref);
      } else if (userData.profilePhoto.startsWith('http')) {
        finalProfilePhoto = userData.profilePhoto;
      }
    }

    // Créer un slug à partir du nom
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    let slug = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    if (userData.id) slug = `${slug}-${userData.id.substring(0, 6)}`;

    const userRef = doc(db, 'users', userData.id);
    const userDocData = {
      ...userData,
      profilePhoto: finalProfilePhoto,
      photoURL: finalProfilePhoto,
      avatar: finalProfilePhoto,
      slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, userDocData, { merge: true });

    // Créer automatiquement le profil SOS si prestataire
    if (userData.role === 'lawyer' || userData.role === 'expat') {
      const sosProfileRef = doc(db, 'sos_profiles', userData.id);
      const mainLanguage =
        Array.isArray(userData.languages) && userData.languages.length > 0
          ? userData.languages[0]
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '-')
          : 'francais';
      const country = userData.currentCountry || userData.country || '';
      const countrySlug = country
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-');

      await setDoc(
        sosProfileRef,
        {
          uid: userData.id,
          type: userData.role,
          fullName:
            userData.fullName ||
            `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
            'Expert',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          slug,
          mainLanguage,
          countrySlug,
          email: userData.email || '',
          phone: userData.phone || '',
          phoneCountryCode: userData.phoneCountryCode || '+33',
          languages: Array.isArray(userData.languages) ? userData.languages : ['Français'],
          country,
          city: (userData as any).city || '',
          description: userData.bio || '',
          profilePhoto: finalProfilePhoto,
          photoURL: finalProfilePhoto,
          avatar: finalProfilePhoto,
          isActive: true,
          isOnline: true,
          availability: 'available',
          motivation: (userData as any).motivation || '',
          isApproved: !!userData.isApproved,
          specialties:
            userData.role === 'lawyer'
              ? ((userData as any).specialties || [])
              : ((userData as any).helpTypes || []),
          yearsOfExperience:
            userData.role === 'lawyer'
              ? Number((userData as any).yearsOfExperience ?? 0)
              : Number((userData as any).yearsAsExpat ?? 0),
          price: userData.role === 'lawyer' ? 49 : 19,
          graduationYear:
            truthy((userData as any).graduationYear)
              ? Number((userData as any).graduationYear)
              : new Date().getFullYear() - 5,
          certifications: (userData as any).certifications || [],
          responseTime: '< 5 minutes',
          successRate: userData.role === 'lawyer' ? 95 : 90,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          interventionCountries: Array.isArray((userData as any).interventionCountries)
            ? (userData as any).interventionCountries
            : country
            ? [country]
            : [],
        },
        { merge: true }
      );
    }

    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, userData: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { ...userData, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

type EnhancedSettings = {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: { email: boolean; push: boolean; sms: boolean };
  privacy: { profileVisible: boolean; showOnMap: boolean };
};

export const updateUserEnhancedSettings = async (
  userId: string,
  settings: Partial<EnhancedSettings>
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { enhancedSettings: settings, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error updating user enhanced settings:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) return normalizeUserData(userDoc.data(), userDoc.id);
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// ========================= Online status =========================
export const updateUserOnlineStatus = async (userId: string, isOnline: boolean) => {
  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      isOnline,
      availability: isOnline ? 'available' : 'unavailable',
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const sosProfileRef = doc(db, 'sos_profiles', userId);
    const sosDoc = await getDoc(sosProfileRef);
    if (sosDoc.exists()) {
      batch.update(sosProfileRef, {
        isOnline,
        availability: isOnline ? 'available' : 'unavailable',
        isVisible: true,
        isVisibleOnMap: true,
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const u = userDoc.data() as any;
        await setDoc(sosProfileRef, {
          uid: userId,
          type: u.role || 'expat',
          fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Expert',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          phone: u.phone || '',
          phoneCountryCode: u.phoneCountryCode || '+33',
          languages: Array.isArray(u.languages) ? u.languages : ['Français'],
          country: u.currentCountry || u.country || '',
          description: u.bio || '',
          profilePhoto: u.profilePhoto || u.photoURL || u.avatar || '/default-avatar.png',
          isActive: true,
          isApproved: !!u.isApproved,
          isVerified: !!u.isVerified,
          isVisible: true,
          isVisibleOnMap: true,
          isOnline,
          availability: isOnline ? 'available' : 'unavailable',
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastStatusChange: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error updating online status for ${userId}:`, error);
    throw error;
  }
};

export const listenToUserOnlineStatus = (
  userId: string,
  callback: (isOnline: boolean) => void
) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(!!(snap.data() as any).isOnline);
    }
  });
};

// ========================= Calls =========================
export const createCallRecord = async (callData: Partial<CallRecord>) => {
  const callsRef = collection(db, 'calls');
  const callDoc = await addDoc(callsRef, {
    ...callData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return callDoc.id;
};

export const updateCallRecord = async (callId: string, callData: Partial<CallRecord>) => {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, { ...callData, updatedAt: serverTimestamp() });
  return true;
};

// ========================= Payments =========================
export const createPaymentRecord = async (paymentData: Partial<Payment>) => {
  const paymentsRef = collection(db, 'payments');
  const paymentDoc = await addDoc(paymentsRef, {
    ...paymentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return paymentDoc.id;
};

export const updatePaymentRecord = async (paymentId: string, paymentData: Partial<Payment>) => {
  const paymentRef = doc(db, 'payments', paymentId);
  await updateDoc(paymentRef, { ...paymentData, updatedAt: serverTimestamp() });
  return true;
};

// ========================= Reviews =========================
export const createReviewRecord = async (reviewData: Partial<Review>) => {
  const reviewsRef = collection(db, 'reviews');
  const reviewDoc = await addDoc(reviewsRef, {
    ...reviewData,
    createdAt: serverTimestamp(),
  });

  // Update provider rating (both sos_profiles and users)
  if (reviewData.providerId && truthy(reviewData.rating)) {
    const providerId = reviewData.providerId as string;
    const sosRef = doc(db, 'sos_profiles', providerId);
    const sosSnap = await getDoc(sosRef);
    if (sosSnap.exists()) {
      const p = sosSnap.data() as any;
      const currentRating = Number(p.rating || 0);
      const currentCount = Number(p.reviewCount || 0);
      const newRating = (currentRating * currentCount + Number(reviewData.rating)) / (currentCount + 1);
      await updateDoc(sosRef, {
        rating: newRating,
        reviewCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      const userRef = doc(db, 'users', providerId);
      await updateDoc(userRef, {
        rating: newRating,
        reviewCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  }

  return reviewDoc.id;
};

export const updateReviewStatus = async (
  reviewId: string,
  status: 'published' | 'pending' | 'hidden'
) => {
  const reviewRef = doc(db, 'reviews', reviewId);
  await updateDoc(reviewRef, { status, moderatedAt: serverTimestamp() });
  return true;
};

export const incrementReviewHelpfulCount = async (reviewId: string) => {
  const reviewRef = doc(db, 'reviews', reviewId);
  await updateDoc(reviewRef, { helpfulVotes: increment(1) });
  return true;
};

export const reportReview = async (reviewId: string, reason: string, reporterId?: string) => {
  const reviewRef = doc(db, 'reviews', reviewId);
  await updateDoc(reviewRef, { reportedCount: increment(1) });
  await addDoc(collection(db, 'review_reports'), {
    reviewId,
    reason: (reason || '').trim(),
    reporterId: reporterId || null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return true;
};

export const getAllReviews = async (options?: {
  status?: 'published' | 'pending' | 'hidden';
  providerId?: string;
  minRating?: number;
  limit?: number;
}) => {
  const base = collection(db, 'reviews');
  const constraints: any[] = [];

  if (options?.status) constraints.push(where('status', '==', options.status));
  if (options?.providerId) constraints.push(where('providerId', '==', options.providerId));
  if (typeof options?.minRating === 'number') constraints.push(where('rating', '>=', options.minRating));

  constraints.push(orderBy('createdAt', 'desc'));

  if (typeof options?.limit === 'number') constraints.push(fsLimit(options.limit));

  const q = constraints.length ? query(base, ...constraints) : base;

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data?.createdAt) || new Date(),
    } as Review;
  });
};

// IMPORTANT FIX: tolerant fetch by providerId or providerUid, with subcollection fallback.
export const getProviderReviews = async (providerIdOrUid: string): Promise<Review[]> => {
  try {
    const reviewsCol = collection(db, 'reviews');

    const q1 = query(
      reviewsCol,
      where('providerId', '==', providerIdOrUid),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      fsLimit(100)
    );
    let snap = await getDocs(q1);

    if (snap.empty) {
      const q2 = query(
        reviewsCol,
        where('providerUid', '==', providerIdOrUid),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        fsLimit(100)
      );
      snap = await getDocs(q2);
    }

    if (snap.empty) {
      // fallback sous-collection
      try {
        const sub = await getDocs(collection(db, 'sos_profiles', providerIdOrUid, 'reviews'));
        return sub.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              ...data,
              createdAt: toDate(data?.createdAt) || new Date(0),
              helpfulVotes: typeof data?.helpfulVotes === 'number' ? data.helpfulVotes : 0,
            } as Review;
          })
          .sort((a, b) => {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bTime - aTime;
          });
      } catch {
        // ignore error
      }
    }

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        createdAt: toDate(data?.createdAt) || new Date(0),
        helpfulVotes: typeof data?.helpfulVotes === 'number' ? data.helpfulVotes : 0,
      } as Review;
    });
  } catch (error) {
    console.error('[getProviderReviews] error:', error);
    return [];
  }
};

// ========================= Documents =========================
export const uploadDocument = async (
  userId: string,
  file: File,
  type: string,
  metadata?: Record<string, unknown>
) => {
  const storageRef = ref(storage, `documents/${userId}/${Date.now()}_${file.name}`);
  const uploadResult = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(uploadResult.ref);

  const documentsRef = collection(db, 'documents');
  const documentDoc = await addDoc(documentsRef, {
    userId,
    type,
    filename: file.name,
    url: downloadURL,
    mimeType: file.type,
    fileSize: file.size,
    status: 'pending',
    uploadedAt: serverTimestamp(),
    ...metadata,
  });
  return documentDoc.id;
};

export const uploadImage = async (file: File, folder: string = 'images') => {
  const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const uploadResult = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(uploadResult.ref);
  return downloadURL;
};

export const resizeImage = async (imageUrl: string, _maxWidth: number, _maxHeight: number) => {
  // éviter warning vars non utilisées
  void _maxWidth;
  void _maxHeight;
  // Placeholder: use a real image service if needed
  return imageUrl;
};

// ========================= Call sessions & logs =========================
export const createCallSession = async (sessionData: Partial<CallSession>) => {
  const sessionId =
    sessionData.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const callSessionRef = doc(db, 'call_sessions', sessionId);
  await setDoc(callSessionRef, {
    ...sessionData,
    id: sessionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'call_logs'), {
    callSessionId: sessionId,
    type: 'session_created',
    status: 'initiating',
    timestamp: serverTimestamp(),
    details: {
      clientId: (sessionData as any).clientId,
      providerId: (sessionData as any).providerId,
      providerType: (sessionData as any).providerType,
    },
  });
  return sessionId;
};

export const updateCallSession = async (sessionId: string, sessionData: Partial<CallSession>) => {
  const sessionRef = doc(db, 'call_sessions', sessionId);
  const updateWithTimestamp = { ...sessionData, updatedAt: serverTimestamp() };
  await updateDoc(sessionRef, updateWithTimestamp);

  // simple log if status changes
  if ((sessionData as any).status) {
    await addDoc(collection(db, 'call_logs'), {
      callSessionId: sessionId,
      type: 'status_change',
      newStatus: (sessionData as any).status,
      timestamp: serverTimestamp(),
      details: sessionData,
    });
  }
  return true;
};

export const createCallLog = async (
  callSessionId: string,
  logData: { type: string; status: string; details?: unknown }
) => {
  await addDoc(collection(db, 'call_logs'), {
    callSessionId,
    ...logData,
    timestamp: serverTimestamp(),
  });
  return true;
};

// ========================= Booking requests =========================
export const createBookingRequest = async (requestData: Record<string, unknown>) => {
  const bookingRequestsRef = collection(db, 'booking_requests');
  const cleanData = Object.fromEntries(Object.entries(requestData).filter(([_, v]) => v !== undefined));
  const finalData = { ...cleanData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const requestDoc = await addDoc(bookingRequestsRef, finalData);
  return requestDoc.id;
};

// ========================= Invoices =========================
export const createInvoiceRecord = async (invoiceData: Record<string, unknown>) => {
  const invoicesRef = collection(db, 'invoices');
  const invoiceDoc = await addDoc(invoicesRef, {
    ...invoiceData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return invoiceDoc.id;
};

export const getInvoicesForPayment = async (
  paymentId: string
): Promise<Record<string, unknown>[]> => {
  const invoicesRef = collection(db, 'invoices');
  const q = query(invoicesRef, where('paymentId', '==', paymentId));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return [];
  return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ========================= Analytics & Audit =========================
export const logAnalyticsEvent = async (eventData: {
  eventType: string;
  userId?: string;
  eventData: Record<string, unknown>;
}) => {
  try {
    const analyticsRef = collection(db, 'analytics');
    await addDoc(analyticsRef, {
      ...eventData,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
    return true;
  } catch (error) {
    console.error('Error logging analytics event:', error);
    return false;
  }
};

export const logAuditEvent = async (
  userId: string,
  action: string,
  details?: Record<string, unknown>
) => {
  try {
    const logsRef = collection(db, 'logs');
    await addDoc(logsRef, {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      ip: 'client-side',
    });
    return true;
  } catch (error) {
    console.error('Error logging audit event:', error);
    return false;
  }
};

// ========================= Admin bulk updates =========================
export const updateExistingProfiles = async () => {
  try {
    const sosProfilesRef = collection(db, 'sos_profiles');
    const sosSnapshot = await getDocs(sosProfilesRef);
    if (!sosSnapshot.empty) {
      let count = 0;
      let batch = writeBatch(db);
      for (const profileDoc of sosSnapshot.docs) {
        const profileData = profileDoc.data() as any;
        const updates: Record<string, unknown> = {};

        if (!profileData.language) updates.language = profileData.preferredLanguage || 'fr';

        if (!profileData.countrySlug && profileData.country) {
          updates.countrySlug = String(profileData.country)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-');
        }

        if (!profileData.mainLanguage && Array.isArray(profileData.languages) && profileData.languages.length) {
          updates.mainLanguage = String(profileData.languages[0])
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-');
        }

        if (!profileData.slug && profileData.firstName && profileData.lastName) {
          updates.slug = `${profileData.firstName}-${profileData.lastName}`
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-');
        }

        if (!profileData.uid) updates.uid = profileDoc.id;

        const rating = Number(profileData.rating);
        if (!Number.isFinite(rating) || rating < 0 || rating > 5) updates.rating = 5.0;

        if (!truthy(profileData.reviewCount)) updates.reviewCount = 0;
        if (!truthy(profileData.price)) updates.price = profileData.type === 'lawyer' ? 49 : 19;
        if (!truthy(profileData.duration)) updates.duration = profileData.type === 'lawyer' ? 20 : 30;
        if (profileData.isApproved === undefined) {
          updates.isApproved = profileData.type === 'lawyer' ? !!profileData.isVerified : true;
        }

        if (Object.keys(updates).length) {
          batch.update(profileDoc.ref, { ...updates, updatedAt: serverTimestamp() });
          count++;
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) await batch.commit();
    }

    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    if (!usersSnapshot.empty) {
      let count = 0;
      let batch = writeBatch(db);
      for (const userDoc of usersSnapshot.docs) {
        const u = userDoc.data() as any;
        const updates: Record<string, unknown> = {};

        if (!u.fullName) updates.fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        if (!u.lang) updates.lang = u.preferredLanguage || 'fr';
        if (!u.language) updates.language = u.preferredLanguage || 'fr';
        if (!u.country) updates.country = u.currentCountry || '';
        if (!u.avatar && u.profilePhoto) updates.avatar = u.profilePhoto;
        updates.isSOS = u.role === 'lawyer' || u.role === 'expat';
        if (!truthy(u.points)) updates.points = 0;
        if (!u.affiliateCode) updates.affiliateCode = `ULIX-${userDoc.id.substring(0, 6).toUpperCase()}`;

        if (Object.keys(updates).length) {
          batch.update(userDoc.ref, { ...updates, updatedAt: serverTimestamp() });
          count++;
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) await batch.commit();
    }

    return true;
  } catch (error) {
    console.error('Error updating existing profiles:', error);
    throw error;
  }
};

export const fixAllProfiles = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non authentifié');
    const adminDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!adminDoc.exists() || (adminDoc.data() as any).role !== 'admin') {
      throw new Error('Accès non autorisé - Admin requis');
    }

    const sosProfilesRef = collection(db, 'sos_profiles');
    const sosSnapshot = await getDocs(sosProfilesRef);
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    if (sosSnapshot.empty || usersSnapshot.empty) return false;

    let batch = writeBatch(db);
    let count = 0;

    for (const profileDoc of sosSnapshot.docs) {
      const profileData = profileDoc.data() as any;
      const updates: Record<string, any> = {
        isVisible: true,
        isVisibleOnMap: true,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (!profileData.type) {
        const pair = usersSnapshot.docs.find((d) => d.id === profileDoc.id);
        updates.type = pair ? ((pair.data() as any).role === 'lawyer' ? 'lawyer' : 'expat') : 'expat';
      }
      if (!profileData.uid) updates.uid = profileDoc.id;

      const rating = Number(profileData.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) updates.rating = 5.0;

      if (!truthy(profileData.reviewCount)) updates.reviewCount = 0;
      if (!truthy(profileData.price))
        updates.price = updates.type === 'lawyer' ? 49 : 19;
      if (!truthy(profileData.duration))
        updates.duration = updates.type === 'lawyer' ? 20 : 30;
      if (profileData.isApproved === undefined) {
        updates.isApproved = updates.type === 'lawyer' ? !!profileData.isVerified : true;
      }

      batch.update(profileDoc.ref, updates);
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    for (const userDoc of usersSnapshot.docs) {
      const u = userDoc.data() as any;
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (u.role === 'lawyer' || u.role === 'expat') {
        (updates as any).isVisible = true;
        (updates as any).isVisibleOnMap = true;
        (updates as any).isActive = true;
        if (u.role === 'lawyer' && u.isApproved === undefined) (updates as any).isApproved = !!u.isVerified;
        if (u.role === 'expat' && u.isApproved === undefined) (updates as any).isApproved = true;
      }
      batch.update(userDoc.ref, updates);
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) await batch.commit();
    return true;
  } catch (error) {
    console.error('Error fixing profiles:', error);
    return false;
  }
};

export const validateDataIntegrity = async (): Promise<{
  isValid: boolean;
  issues: string[];
  fixes: unknown[];
}> => {
  try {
    const issues: string[] = [];
    const fixes: unknown[] = [];

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const sosProfilesSnapshot = await getDocs(collection(db, 'sos_profiles'));

    const users = new Map<string, unknown>();
    const sosProfiles = new Map<string, unknown>();

    usersSnapshot.docs.forEach((d) => users.set(d.id, d.data()));
    sosProfilesSnapshot.docs.forEach((d) => sosProfiles.set(d.id, d.data()));

    for (const [uid, userData] of users) {
      const userDataObj = userData as { role?: string };
      if ((userDataObj.role === 'lawyer' || userDataObj.role === 'expat') && !sosProfiles.has(uid)) {
        issues.push(`Prestataire ${uid} sans profil SOS`);
        fixes.push({ type: 'create_sos_profile', uid, userData });
      }
    }

    for (const [uid] of sosProfiles) {
      if (!users.has(uid)) {
        issues.push(`Profil SOS ${uid} orphelin`);
        fixes.push({ type: 'delete_orphan_sos', uid });
      }
    }

    return { isValid: issues.length === 0, issues, fixes };
  } catch (error) {
    console.error('Error validating data integrity:', error);
    return { isValid: false, issues: ['Erreur lors de la validation'], fixes: [] };
  }
};

// ========================= Cleanup =========================
export const cleanupObsoleteData = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non authentifié');
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists() || (userDoc.data() as any).role !== 'admin') {
      throw new Error('Accès non autorisé - Admin requis');
    }

    const batch = writeBatch(db);
    let operationCount = 0;

    const oldSessionsQuery = query(
      collection(db, 'call_sessions'),
      where('createdAt', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    );
    const oldSessionsSnapshot = await getDocs(oldSessionsQuery);
    for (const d of oldSessionsSnapshot.docs) {
      batch.delete(d.ref);
      operationCount++;
    }

    const oldLogsQuery = query(
      collection(db, 'logs'),
      where('timestamp', '<', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    );
    const oldLogsSnapshot = await getDocs(oldLogsQuery);
    for (const d of oldLogsSnapshot.docs) {
      batch.delete(d.ref);
      operationCount++;
    }

    if (operationCount > 0) await batch.commit();
    return true;
  } catch (error) {
    console.error('Error cleaning up obsolete data:', error);
    return false;
  }
};
