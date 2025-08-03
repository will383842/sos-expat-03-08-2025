// Imports optimisés
import { collection, doc, setDoc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, limit, 
  serverTimestamp, Timestamp, increment, arrayUnion, writeBatch, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { User, CallRecord, Payment, Review, Document, Notification, Testimonial, CallSession, 
  SosProfile, EnhancedSettings } from '../types';

export const normalizeUserData = (userData: any, docId: string): User => {
  return {
    id: docId,
    uid: docId,
    role: userData.role || 'client',
    country: userData.country || userData.currentCountry || '',
    fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Utilisateur',
    updatedAt: userData.updatedAt?.toDate() || new Date(),
    lastLoginAt: userData.lastLoginAt?.toDate() || new Date(),
    createdAt: userData.createdAt?.toDate() || new Date(),
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    email: userData.email || '',
    phone: userData.phone || '',
    phoneCountryCode: userData.phoneCountryCode || '+33',
    currentCountry: userData.currentCountry || '',
    preferredLanguage: userData.preferredLanguage || 'fr',
    profilePhoto: userData.profilePhoto || userData.photoURL || userData.avatar || '/default-avatar.png',
    isActive: userData.isActive !== false,
    isApproved: userData.isApproved || false,
    isVerified: userData.isVerified || false,
    isVisibleOnMap: userData.isVisibleOnMap !== false,
    isAvailable: userData.isAvailable || false,
    isBanned: userData.isBanned || false,
    banReason: userData.banReason || '',
    profileCompleted: userData.profileCompleted || false,
    stripeCustomerId: userData.stripeCustomerId || '',
    stripeAccountId: userData.stripeAccountId || '',
    notificationPreferences: userData.notificationPreferences || {
      email: true,
      push: true,
      sms: false
    },
    deviceTokens: userData.deviceTokens || [],
    marketingConsent: userData.marketingConsent || false,
    lastActive: userData.lastActive?.toDate() || new Date(),
    createdByAdmin: userData.createdByAdmin || false,
    isTestProfile: userData.isTestProfile || false,
    isCallable: userData.isCallable !== false,
    // Nouveaux champs requis
    lang: userData.lang || userData.preferredLanguage || 'fr',
    avatar: userData.avatar || userData.profilePhoto || userData.photoURL || '/default-avatar.png',
    isSOS: userData.isSOS || (userData.role === 'lawyer' || userData.role === 'expat'),
    points: userData.points || 0,
    affiliateCode: userData.affiliateCode || `SOS-${docId.substring(0, 6).toUpperCase()}`,
    referralBy: userData.referralBy || null,
    // Champs pour production
    bio: userData.bio || '',
    hourlyRate: userData.hourlyRate || (userData.role === 'lawyer' ? 49 : 19),
    responseTime: userData.responseTime || '< 5 minutes',
    availability: userData.availability || 'available',
    totalCalls: userData.totalCalls || 0,
    totalEarnings: userData.totalEarnings || 0,
    averageRating: userData.averageRating || 5.0,
    // Autres champs
    ...userData
  };
};

// Ensure collections exist
export const ensureCollectionsExist = async () => {
  try {
    // List of collections to check/create
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
      'promo_codes'
    ];
    
    // Check each collection
    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(query(collectionRef, limit(1)));
      
      // If collection is empty, add a placeholder document
      if (snapshot.empty) {
        console.log(`Creating collection: ${collectionName}`);
        await addDoc(collectionRef, {
          _placeholder: true,
          _created: serverTimestamp(),
          _description: `Placeholder document for ${collectionName} collection`
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring collections exist:', error);
    return false;
  }
};

// Create initial app settings
export const createInitialAppSettings = async () => {
  try {
    const settingsRef = doc(db, 'app_settings', 'main');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      console.log('Creating initial app settings');
      await setDoc(settingsRef, {
        servicesEnabled: {
          lawyerCalls: true,
          expatCalls: true
        },
        pricing: {
          lawyerCall: 49,
          expatCall: 19
        },
        platformCommission: 0.15,
        maxCallDuration: 30,
        callTimeout: 30,
        supportedCountries: ['CA', 'UK', 'DE', 'ES', 'IT', 'BE', 'CH', 'LU', 'NL', 'AT'],
        supportedLanguages: ['fr', 'en'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error creating initial app settings:', error);
    return false;
  }
};

// User functions
const createUserProfile = async (userData: Partial<User>) => {
  try {
    if (!userData.id) {
      throw new Error('User ID is required');
    }
    
    console.log("createUserProfile - Début avec photo:", userData.profilePhoto ? "Photo présente" : "Aucune photo");
    
    // Traitement robuste de la photo de profil
    let finalProfilePhoto = '/default-avatar.png';
    
    if (userData.profilePhoto) {
      if (userData.profilePhoto.startsWith('data:image')) {
        try {
          console.log("Upload de la photo de profil en base64 vers Firebase Storage");
          const storageRef = ref(storage, `profilePhotos/${userData.id}/${Date.now()}.jpg`);
          const uploadResult = await uploadString(storageRef, userData.profilePhoto, 'data_url');
          finalProfilePhoto = await getDownloadURL(uploadResult.ref);
          console.log("Photo uploadée avec succès:", finalProfilePhoto);
        } catch (uploadError) {
          console.error("Erreur upload photo:", uploadError);
          finalProfilePhoto = '/default-avatar.png';
        }
      } else if (userData.profilePhoto.startsWith('http')) {
        finalProfilePhoto = userData.profilePhoto;
      }
    }
    
    // Créer un slug à partir du nom
    const fullName = `${userData.firstName} ${userData.lastName}`;
    let slug = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
    
    // Ajouter un identifiant unique si nécessaire pour éviter les doublons
    if (userData.id) {
      const shortId = userData.id.substring(0, 6);
      slug = `${slug}-${shortId}`;
    }
    
    const userRef = doc(db, 'users', userData.id);
    const userDocData = {
      ...userData,
      profilePhoto: finalProfilePhoto,
      photoURL: finalProfilePhoto,
      avatar: finalProfilePhoto,
      slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(userRef, userDocData);
    
    // Si c'est un avocat ou un expatrié, créer automatiquement son profil SOS
    if (userData.role === 'lawyer' || userData.role === 'expat') {
      const sosProfileRef = doc(db, 'sos_profiles', userData.id);
      
      // Déterminer la langue principale
      const mainLanguage = (userData.languages && userData.languages.length > 0) 
        ? userData.languages[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')
        : 'francais';

      // Déterminer le pays principal
      const country = userData.currentCountry || '';
      const countrySlug = country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
      
      await setDoc(sosProfileRef, {
        uid: userData.id,
        type: userData.role,
        fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        slug,
        mainLanguage,
        countrySlug,
        email: userData.email || '',
        phone: userData.phone || '',
        phoneCountryCode: userData.phoneCountryCode || '+33',
        languages: userData.languages || ['Français'],
        country: country,
        city: userData.city || '',
        description: userData.bio || '', 
        profilePhoto: finalProfilePhoto,
        photoURL: finalProfilePhoto,
        avatar: finalProfilePhoto,
        isActive: true,
        isOnline: true,
        availability: 'available',
        motivation: userData.motivation || '',
        isApproved: userData.isApproved || false,
        specialties: userData.role === 'lawyer' ? (userData.specialties || []) : (userData.helpTypes || []),
        yearsOfExperience: userData.role === 'lawyer' ? userData.yearsOfExperience : userData.yearsAsExpat || 0,
        price: userData.role === 'lawyer' ? 49 : 19,
        graduationYear: userData.graduationYear || new Date().getFullYear() - 5,
        certifications: userData.certifications || [],
        // Champs calculés automatiquement
        responseTime: '< 5 minutes',
        successRate: userData.role === 'lawyer' ? 95 : 90,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        interventionCountries: userData.interventionCountries || [country]
      });
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
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

const updateUserEnhancedSettings = async (userId: string, settings: Partial<EnhancedSettings>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      enhancedSettings: settings,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user enhanced settings:', error);
    throw error;
  }
};

const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return normalizeUserData(userDoc.data(), userDoc.id);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Mettre à jour le statut en ligne d'un utilisateur
export const updateUserOnlineStatus = async (userId: string, isOnline: boolean) => {
  try {
    console.log(`updateUserOnlineStatus - Début de mise à jour du statut pour ${userId} - isOnline: ${isOnline}`);
    
    // Utiliser un batch pour mettre à jour les deux documents de manière atomique
    const batch = writeBatch(db);
    
    // 1. Référence au document utilisateur
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      isOnline,
      availability: isOnline ? 'available' : 'unavailable',
    });

    // 2. Mettre à jour le profil SOS
    const sosProfileRef = doc(db, 'sos_profiles', userId);
    
    try {
      // Vérifier si le profil SOS existe
      const sosDoc = await getDoc(sosProfileRef);
      console.log("Vérification du profil SOS pour:", userId);
      if (sosDoc.exists() && sosDoc.data()) {
        // Mettre à jour le profil existant
        batch.update(sosProfileRef, {
          isOnline,
          availability: isOnline ? 'available' : 'unavailable',
          isVisible: true, // Toujours visible dans les recherches
          isVisibleOnMap: true, // Toujours visible sur la carte
          lastStatusChange: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        console.error("Le profil SOS n'existe toujours pas après tentative de création");
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Créer un nouveau profil SOS
          await setDoc(sosProfileRef, {
            uid: userId,
            type: userData.role || 'expat',
            fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Expert',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            phoneCountryCode: userData.phoneCountryCode || '+33',
            languages: userData.languages || ['Français'],
            country: userData.currentCountry || userData.country || '',
            description: userData.bio || '',
            profilePhoto: userData.profilePhoto || userData.photoURL || userData.avatar || '/default-avatar.png',
            isActive: true,
            isApproved: userData.role === 'client',
            isVerified: userData.isVerified || false,
            isVisible: true, // Crucial pour l'affichage
            isVisibleOnMap: true, // Crucial pour la carte
            isOnline, // Statut actuel
            availability: isOnline ? 'available' : 'unavailable',
            rating: 5.0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastStatusChange: serverTimestamp()
          });
          
          console.log(`updateUserOnlineStatus - Profil SOS créé pour ${userId}`);
        }
      }
      
      // Exécuter le batch
      await batch.commit();
      console.log(`updateUserOnlineStatus - Statut mis à jour avec succès pour ${userId}`);
      
      // Vérification finale
      const finalCheck = await getDoc(doc(db, 'sos_profiles', userId));
      if (finalCheck.exists()) {
        const data = finalCheck.data();
        console.log(`Vérification finale du profil SOS pour ${userId}: isOnline=${data.isOnline}, isVisible=${data.isVisible}`);
      }
      
      return true;
    } catch (error) {
      console.error(`updateUserOnlineStatus - Erreur lors de la mise à jour du profil SOS:`, error);
      
      // Essayer de mettre à jour uniquement l'utilisateur en cas d'échec
      await updateDoc(userRef, {
        isOnline: isOnline,
        availability: isOnline ? 'available' : 'unavailable',
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`updateUserOnlineStatus - Mise à jour partielle (utilisateur uniquement) réussie`);
      return true;
    }
    return true;
  } catch (error) {
    console.error(`Error updating online status for ${userId}:`, error);
    throw error;
  }
};

// Écouter les changements de statut en ligne
const listenToUserOnlineStatus = (userId: string, callback: (isOnline: boolean) => void) => {
  const userRef = doc(db, 'users', userId);
  
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      callback(userData.isOnline || false);
    }
  });
};

// Call functions
export const createCallRecord = async (callData: Partial<CallRecord>) => {
  try {
    const callsRef = collection(db, 'calls');
    const callDoc = await addDoc(callsRef, {
      ...callData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return callDoc.id;
  } catch (error) {
    console.error('Error creating call record:', error);
    throw error;
  }
};

export const updateCallRecord = async (callId: string, callData: Partial<CallRecord>) => {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      ...callData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating call record:', error);
    throw error;
  }
};

// Payment functions
export const createPaymentRecord = async (paymentData: Partial<Payment>) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentDoc = await addDoc(paymentsRef, {
      ...paymentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return paymentDoc.id;
  } catch (error) {
    console.error('Error creating payment record:', error);
    throw error;
  }
};

const updatePaymentRecord = async (paymentId: string, paymentData: Partial<Payment>) => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      ...paymentData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating payment record:', error);
    throw error;
  }
};

// Review functions
export const createReviewRecord = async (reviewData: Partial<Review>) => {
  try {
    const reviewsRef = collection(db, 'reviews');
    
    // Créer une copie avec createdAt comme Timestamp pour l'indexation
    const reviewDataWithTimestamp = {
      ...reviewData,
      createdAt: serverTimestamp()
    };
    
    const reviewDoc = await addDoc(reviewsRef, reviewDataWithTimestamp);
    
    // Update provider rating
    if (reviewData.providerId && reviewData.rating) {
      // Mettre à jour le profil SOS
      const sosProfileRef = doc(db, 'sos_profiles', reviewData.providerId);
      const sosProfileDoc = await getDoc(sosProfileRef);
      
      if (sosProfileDoc.exists()) {
        const provider = sosProfileDoc.data();
        const currentRating = provider.rating || 0;
        const currentReviewCount = provider.reviewCount || 0;
        
        // Calculate new average rating
        const newRating = ((currentRating * currentReviewCount) + reviewData.rating) / (currentReviewCount + 1);
        
        await updateDoc(sosProfileRef, {
          rating: newRating,
          reviewCount: increment(1),
          updatedAt: serverTimestamp()
        });
        
        // Mettre également à jour le document utilisateur
        const userRef = doc(db, 'users', reviewData.providerId);
        await updateDoc(userRef, {
          rating: newRating,
          reviewCount: increment(1),
          updatedAt: serverTimestamp()
        });
        
        console.log(`Rating updated for provider ${reviewData.providerId}:`, {
          oldRating: currentRating,
          newRating,
          reviewCount: currentReviewCount + 1
        });
      }
    }
    
    return reviewDoc.id;
  } catch (error) {
    console.error('Error creating review record:', error);
    throw error;
  }
};

// Mettre à jour le taux de succès d'un prestataire
const updateProviderSuccessRate = async (providerId: string, isSuccessful: boolean) => {
  try {
    // Récupérer le profil SOS
    const sosProfileRef = doc(db, 'sos_profiles', providerId);
    const sosProfileDoc = await getDoc(sosProfileRef);
    
    if (sosProfileDoc.exists()) {
      const provider = sosProfileDoc.data();
      const totalCalls = (provider.totalCalls || 0) + 1;
      const successfulCalls = isSuccessful 
        ? (provider.successfulCalls || 0) + 1 
        : (provider.successfulCalls || 0);
      
      // Calculer le nouveau taux de succès
      const successRate = Math.round((successfulCalls / totalCalls) * 100);
      
      // Mettre à jour le profil SOS
      await updateDoc(sosProfileRef, {
        totalCalls,
        successfulCalls,
        successRate,
        updatedAt: serverTimestamp()
      });
      
      // Mettre également à jour le document utilisateur
      const userRef = doc(db, 'users', providerId);
      await updateDoc(userRef, {
        totalCalls,
        successfulCalls,
        successRate,
        updatedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating provider success rate:', error);
    throw error;
  }
};

// Mettre à jour le temps de réponse moyen d'un prestataire
const updateProviderResponseTime = async (providerId: string, responseTimeMs: number) => {
  try {
    // Récupérer le profil SOS
    const sosProfileRef = doc(db, 'sos_profiles', providerId);
    const sosProfileDoc = await getDoc(sosProfileRef);
    
    if (sosProfileDoc.exists()) {
      const provider = sosProfileDoc.data();
      const totalResponses = (provider.totalResponses || 0) + 1;
      const totalResponseTime = (provider.totalResponseTime || 0) + responseTimeMs;
      
      // Calculer le nouveau temps de réponse moyen
      const avgResponseTimeMs = Math.round(totalResponseTime / totalResponses);
      
      // Convertir en format lisible
      let responseTime = '< 1 minute';
      if (avgResponseTimeMs < 30000) {
        responseTime = '< 30 secondes';
      } else if (avgResponseTimeMs < 60000) {
        responseTime = '< 1 minute';
      } else if (avgResponseTimeMs < 300000) {
        responseTime = '< 5 minutes';
      } else {
        responseTime = `${Math.round(avgResponseTimeMs / 60000)} minutes`;
      }
      
      // Mettre à jour le profil SOS
      await updateDoc(sosProfileRef, {
        totalResponses,
        totalResponseTime,
        avgResponseTimeMs,
        responseTime,
        updatedAt: serverTimestamp()
      });
      
      // Mettre également à jour le document utilisateur
      const userRef = doc(db, 'users', providerId);
      await updateDoc(userRef, {
        responseTime,
        updatedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating provider response time:', error);
    throw error;
  }
};

export const updateReviewStatus = async (reviewId: string, status: 'published' | 'pending' | 'hidden') => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      status,
      moderatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating review status:', error);
    throw error;
  }
};

export const incrementReviewHelpfulCount = async (reviewId: string) => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      helpfulVotes: increment(1)
    });
    
    return true;
  } catch (error) {
    console.error('Error incrementing review helpful count:', error);
    throw error;
  }
};

export const reportReview = async (reviewId: string, reason: string) => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    await updateDoc(reviewRef, {
      reportedCount: increment(1)
    });
    
    // Create report
    const reportsRef = collection(db, 'reports');
    await addDoc(reportsRef, {
      targetId: reviewId,
      targetType: 'review',
      reason,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error reporting review:', error);
    throw error;
  }
};

export const getAllReviews = async (options?: {
  status?: 'published' | 'pending' | 'hidden';
  providerId?: string;
  minRating?: number;
  limit?: number;
}) => {
  try {
    let reviewsQuery: any = collection(db, 'reviews');
    
    // Apply filters
    if (options?.status) {
      reviewsQuery = query(reviewsQuery, where('status', '==', options.status));
    }
    
    if (options?.providerId) {
      reviewsQuery = query(reviewsQuery, where('providerId', '==', options.providerId));
    }
    
    if (options?.minRating) {
      reviewsQuery = query(reviewsQuery, where('rating', '>=', options.minRating));
    }
    
    // Apply ordering and limit
    reviewsQuery = query(reviewsQuery, orderBy('createdAt', 'desc'));
    
    if (options?.limit) {
      reviewsQuery = query(reviewsQuery, limit(options.limit));
    }
    
    const snapshot = await getDocs(reviewsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Review[];
  } catch (error) {
    console.error('Error getting reviews:', error);
    throw error;
  }
};

export const getProviderReviews = async (providerId: string) => {
  try {
    console.log('Récupération des avis pour le prestataire:', providerId);
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(reviewsQuery);
    console.log(`Nombre d'avis trouvés: ${snapshot.size}`);
    
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Conversion du Timestamp en Date pour l'affichage
      createdAt: doc.data().createdAt instanceof Timestamp ? 
                doc.data().createdAt.toDate() : 
                (doc.data().createdAt || new Date())
    })) as Review[];
    
    // Log pour débogage
    reviews.forEach(review => {
      console.log(`Avis ID: ${review.id}, Client: ${review.clientName}, Note: ${review.rating}, Date: ${review.createdAt}`);
    });
    
    return reviews;
  } catch (error) {
    console.error('Error getting provider reviews:', error);
    throw error;
  }
};

// Document functions
const uploadDocument = async (userId: string, file: File, type: string, metadata?: Record<string, any>) => {
  try {
    // Upload file to storage
    const storageRef = ref(storage, `documents/${userId}/${Date.now()}_${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    // Create document record
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
      ...metadata
    });
    
    return documentDoc.id;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

// Image upload and manipulation
const uploadImage = async (file: File, folder: string = 'images') => {
  try {
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

const resizeImage = async (imageUrl: string, maxWidth: number, maxHeight: number) => {
  // In a real app, you would use a cloud function or image processing service
  // For now, we'll just return the original URL
  return imageUrl;
};

// Call session functions
const createCallSession = async (sessionData: Partial<CallSession>) => {
  try {
    // Générer un ID unique pour la session d'appel
    const sessionId = sessionData.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const callSessionRef = doc(db, 'call_sessions', sessionId);
    
    // Assurez-vous que les dates sont des Timestamp pour l'indexation
    const sessionDataWithTimestamps = {
      ...sessionData,
      id: sessionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(callSessionRef, sessionDataWithTimestamps);
    
    // Créer un log initial pour la session
    await addDoc(collection(db, 'call_logs'), {
      callSessionId: sessionId,
      type: 'session_created',
      status: 'initiating',
      timestamp: serverTimestamp(),
      details: {
        clientId: sessionData.clientId,
        providerId: sessionData.providerId,
        providerType: sessionData.providerType
      }
    });
    
    return sessionId;
  } catch (error) {
    console.error('Error creating call session:', error);
    throw error;
  }
};

const updateCallSession = async (sessionId: string, sessionData: Partial<CallSession>) => {
  try {
    // Récupérer la session actuelle pour les logs
    const sessionRef = doc(db, 'call_sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    const currentSession = sessionDoc.exists() ? sessionDoc.data() : null;
    
    // Préparer les données de mise à jour
    const updateWithTimestamp = {
      ...sessionData,
      updatedAt: serverTimestamp()
    };
    
    // Mettre à jour la session
    await updateDoc(sessionRef, updateWithTimestamp);
    
    // Créer un log pour cette mise à jour si le statut a changé
    if (sessionData.status && sessionData.status !== currentSession?.status) {
      await addDoc(collection(db, 'call_logs'), {
        callSessionId: sessionId,
        type: 'status_change',
        previousStatus: currentSession?.status || 'unknown',
        newStatus: sessionData.status,
        timestamp: serverTimestamp(),
        details: sessionData
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating call session:', error);
    return false;
  }
};

// Créer un log d'appel
const createCallLog = async (callSessionId: string, logData: {
  type: string;
  status: string;
  details?: any;
}) => {
  try {
    const callLogsRef = collection(db, 'call_logs');
    
    await addDoc(callLogsRef, {
      callSessionId,
      ...logData,
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error creating call log:', error);
    return false;
  }
};

// Booking request functions
export const createBookingRequest = async (requestData: any) => {
  try {
    const bookingRequestsRef = collection(db, 'booking_requests');

    // Nettoyage des champs undefined
    const cleanData = Object.fromEntries(
      Object.entries(requestData).filter(([_, v]) => v !== undefined)
    );

    const finalData = {
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const requestDoc = await addDoc(bookingRequestsRef, finalData);
    return requestDoc.id;

  } catch (error) {
    console.error('Error creating booking request:', error);
    throw error;
  }
};


// Invoice functions
export const createInvoiceRecord = async (invoiceData: any) => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const invoiceDoc = await addDoc(invoicesRef, {
      ...invoiceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return invoiceDoc.id;
  } catch (error) {
    console.error('Error creating invoice record:', error);
    throw error;
  }
};

// Analytics functions
export const logAnalyticsEvent = async (eventData: {
  eventType: string;
  userId?: string;
  eventData: Record<string, any>;
}) => {
  try {
    const analyticsRef = collection(db, 'analytics');
    await addDoc(analyticsRef, {
      ...eventData,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    return true;
  } catch (error) {
    console.error('Error logging analytics event:', error);
    // Don't throw error for analytics to avoid breaking user experience
    return false;
  }
};

// Audit logging
export const logAuditEvent = async (userId: string, action: string, details?: Record<string, any>) => {
  try {
    const logsRef = collection(db, 'logs');
    await addDoc(logsRef, {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      ip: 'client-side' // IP will be added by server
    });
    
    return true;
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw error for audit logs to avoid breaking user experience
    return false;
  }
};

// Admin functions - these should only be called by admin users
export const updateExistingProfiles = async () => {
  try {
    // Mettre à jour les profils existants avec les champs manquants
    console.log("Mise à jour des profils existants...");
    
    // Mettre à jour les profils SOS
    const sosProfilesRef = collection(db, 'sos_profiles');
    const sosSnapshot = await getDocs(sosProfilesRef);
    
    if (!sosSnapshot.empty) {
      const batch = writeBatch(db);
      let count = 0;
      
      for (const profileDoc of sosSnapshot.docs) {
        const profileData = profileDoc.data();
        const updates: Record<string, any> = {};
        
        // Ajouter le champ language s'il est manquant
        if (!profileData.language) {
          updates.language = profileData.preferredLanguage || 'fr';
        }
        
        // Ajouter countrySlug si manquant
        if (!profileData.countrySlug && profileData.country) {
          updates.countrySlug = profileData.country.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-');
        }
        
        // Ajouter mainLanguage si manquant
        if (!profileData.mainLanguage && profileData.languages && profileData.languages.length > 0) {
          updates.mainLanguage = profileData.languages[0].toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-');
        }
        
        // Ajouter slug si manquant
        if (!profileData.slug && profileData.firstName && profileData.lastName) {
          updates.slug = `${profileData.firstName}-${profileData.lastName}`
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-');
        }
        
        // Ajouter le champ language s'il est manquant
        if (!profileData.language) {
          updates.language = profileData.preferredLanguage || 'fr';
        }
        
        if (Object.keys(updates).length > 0) {
          batch.update(profileDoc.ref, updates);
          count++;
          
          if (count >= 450) {
            await batch.commit();
            console.log(`Committed batch of ${count} SOS profile updates`);
            count = 0;
          }
        }
      }
      
      if (count > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${count} SOS profile updates`);
      }
    }
    
    // Mettre à jour les profils utilisateurs
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    if (usersSnapshot.empty) {
      console.log('No users found');
      return true;
    }
    
    const batch = writeBatch(db);
    let count = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Vérifier si l'utilisateur a besoin d'être mis à jour
      if (!userData.fullName || !userData.lang || !userData.country || !userData.language) {
        // Ajouter les champs manquants
        const updates: Record<string, any> = {};
        
        if (!userData.fullName) {
          updates.fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
        
        if (!userData.lang) {
          updates.lang = userData.preferredLanguage || 'fr';
        }
        
        if (!userData.language) {
          updates.language = userData.preferredLanguage || 'fr';
        }
        
        if (!userData.country) {
          updates.country = userData.currentCountry || '';
        }
        
        // Ajouter le champ language s'il est manquant
        if (!userData.language) {
          updates.language = userData.preferredLanguage || 'fr';
        }
        
        if (!userData.avatar && userData.profilePhoto) {
          updates.avatar = userData.profilePhoto;
        }
        
        if (userData.role === 'lawyer' || userData.role === 'expat') {
          updates.isSOS = true;
        } else {
          updates.isSOS = false;
        }
        
        if (!userData.points) {
          updates.points = 0;
        }
        
        if (!userData.affiliateCode) {
          updates.affiliateCode = `ULIX-${userDoc.id.substring(0, 6).toUpperCase()}`;
        }
        
        // Appliquer les mises à jour
        batch.update(userDoc.ref, updates);
        count++;
        
        // Les batches Firestore sont limités à 500 opérations
        if (count >= 450) {
          await batch.commit();
          console.log(`Committed batch of ${count} updates`);
          count = 0;
        }
      }
    }
    
    // Valider les mises à jour restantes
    if (count > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${count} updates`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating existing profiles:', error);
    throw error;
  }
};

// Fonction pour réparer tous les profils
const fixAllProfiles = async () => {
  try {
    console.log("Début de la réparation des profils...");
    
    // Vérifier que l'utilisateur est admin
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      throw new Error('Accès non autorisé - Admin requis');
    }
    
    // 1. Récupérer tous les profils SOS
    const sosProfilesRef = collection(db, 'sos_profiles');
    const sosSnapshot = await getDocs(sosProfilesRef);
    
    if (sosSnapshot.empty) {
      console.log("Aucun profil SOS trouvé");
      return false;
    }
    
    // 2. Récupérer tous les utilisateurs
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    if (usersSnapshot.empty) {
      console.log("Aucun utilisateur trouvé");
      return false;
    }
    
    // Créer un batch pour les mises à jour
    const batch = writeBatch(db);
    let count = 0;
    
    // 3. Mettre à jour les profils SOS
    for (const profileDoc of sosSnapshot.docs) {
      const profileData = profileDoc.data();
      const updates: Record<string, any> = {};
      
      // Forcer les champs de visibilité et de statut en ligne
      updates.isVisible = true;
      updates.isVisibleOnMap = true;
      updates.isActive = true;
      
      // Ajouter le champ type s'il est manquant
      if (!profileData.type) {
        // Chercher l'utilisateur correspondant
        const userDoc = usersSnapshot.docs.find(doc => doc.id === profileDoc.id);
        if (userDoc) {
          const userData = userDoc.data();
          updates.type = userData.role === 'lawyer' ? 'lawyer' : 'expat';
        } else {
          updates.type = 'expat'; // Valeur par défaut
        }
      }
      
      // Ajouter le champ uid s'il est manquant
      if (!profileData.uid) {
        updates.uid = profileDoc.id;
      }
      
      // Ajouter le champ rating s'il est manquant ou incorrect
      if (!profileData.rating || profileData.rating < 0 || profileData.rating > 5) {
        updates.rating = 5.0;
      }
      
      // Ajouter le champ reviewCount s'il est manquant
      if (!profileData.reviewCount) {
        updates.reviewCount = 0;
      }
      
      // Ajouter le champ price s'il est manquant
      if (!profileData.price) {
        updates.price = profileData.type === 'lawyer' ? 49 : 19;
      }
      
      // Ajouter le champ duration s'il est manquant
      if (!profileData.duration) {
        updates.duration = profileData.type === 'lawyer' ? 20 : 30;
      }
      
      // Ajouter le champ isApproved s'il est manquant
      if (profileData.isApproved === undefined) {
        // Pour les avocats, on met à true seulement s'ils sont déjà vérifiés
        if (profileData.type === 'lawyer') {
          updates.isApproved = profileData.isVerified === true;
        } else {
          // Pour les expatriés, on approuve automatiquement
          updates.isApproved = true;
        }
      }
      
      // Ajouter le champ updatedAt
      updates.updatedAt = serverTimestamp();
      
      // Validation des données critiques
      if (!profileData.uid || !profileData.type) {
        console.error(`Profil SOS ${profileDoc.id} - Données critiques manquantes`);
        continue;
      }
      
      // Appliquer les mises à jour
      if (Object.keys(updates).length > 0) {
        batch.update(profileDoc.ref, updates);
        count++;
        
        // Les batches Firestore sont limités à 500 opérations
        if (count >= 450) {
          await batch.commit();
          console.log(`Committed batch of ${count} SOS profile updates`);
          count = 0;
        }
      }
    }
    
    // 4. Mettre à jour les utilisateurs
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const updates: Record<string, any> = {};
      
      // Forcer les champs de visibilité et de statut en ligne pour les prestataires
      if (userData.role === 'lawyer' || userData.role === 'expat') {
        updates.isVisible = true;
        updates.isVisibleOnMap = true;
        updates.isActive = true;
        
        // Pour les avocats, on met isApproved à true seulement s'ils sont déjà vérifiés
        if (userData.role === 'lawyer' && userData.isApproved === undefined) {
          updates.isApproved = userData.isVerified === true;
        }
        
        // Pour les expatriés, on approuve automatiquement
        if (userData.role === 'expat' && userData.isApproved === undefined) {
          updates.isApproved = true;
        }
      }
      
      // Ajouter le champ updatedAt
      updates.updatedAt = serverTimestamp();
      
      // Validation des données critiques
      if (!userData.email || !userData.role) {
        console.error(`Utilisateur ${userDoc.id} - Données critiques manquantes`);
        continue;
      }
      
      // Appliquer les mises à jour
      if (Object.keys(updates).length > 0) {
        batch.update(userDoc.ref, updates);
        count++;
        
        // Les batches Firestore sont limités à 500 opérations
        if (count >= 450) {
          await batch.commit();
          console.log(`Committed batch of ${count} user updates`);
          count = 0;
        }
      }
    }
    
    // Valider les mises à jour restantes
    if (count > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${count} updates`);
    }
    
    console.log("Réparation des profils terminée avec succès");
    return true;
  } catch (error) {
    console.error('Error fixing profiles:', error);
    return false;
  }
};

// Fonction pour valider l'intégrité des données
export const validateDataIntegrity = async (): Promise<{
  isValid: boolean;
  issues: string[];
  fixes: any[];
}> => {
  try {
    const issues: string[] = [];
    const fixes: any[] = [];
    
    // Vérifier les utilisateurs
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const sosProfilesSnapshot = await getDocs(collection(db, 'sos_profiles'));
    
    const users = new Map();
    const sosProfiles = new Map();
    
    usersSnapshot.docs.forEach(doc => {
      users.set(doc.id, doc.data());
    });
    
    sosProfilesSnapshot.docs.forEach(doc => {
      sosProfiles.set(doc.id, doc.data());
    });
    
    // Vérifier les prestataires sans profil SOS
    for (const [uid, userData] of users) {
      if ((userData.role === 'lawyer' || userData.role === 'expat') && !sosProfiles.has(uid)) {
        issues.push(`Prestataire ${uid} sans profil SOS`);
        fixes.push({
          type: 'create_sos_profile',
          uid,
          userData
        });
      }
    }
    
    // Vérifier les profils SOS orphelins
    for (const [uid, sosData] of sosProfiles) {
      if (!users.has(uid)) {
        issues.push(`Profil SOS ${uid} orphelin`);
        fixes.push({
          type: 'delete_orphan_sos',
          uid
        });
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      fixes
    };
    
  } catch (error) {
    console.error('Error validating data integrity:', error);
    return {
      isValid: false,
      issues: ['Erreur lors de la validation'],
      fixes: []
    };
  }
};

// Fonctions pour gérer les factures
const getInvoicesForPayment = async (paymentId: string): Promise<any[]> => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('paymentId', '==', paymentId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

// Fonction pour vérifier si un paiement est un paiement de test
const isTestPayment = (payment: Payment): boolean => {
  // Vérifier si le montant est inférieur à 1€ (100 centimes)
  if (payment.amount < 1) {
    return true;
  }
  
  // Vérifier si le paiement a un flag isTest
  if (payment.isTest === true) {
    return true;
  }
  
  // Vérifier si le paiement a une description contenant "test"
  if (payment.description && payment.description.toLowerCase().includes('test')) {
    return true;
  }
  
  return false;
};

// Fonction pour nettoyer les données obsolètes
export const cleanupObsoleteData = async (): Promise<boolean> => {
  try {
    // Vérifier que l'utilisateur est admin
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Utilisateur non authentifié');
    }
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      throw new Error('Accès non autorisé - Admin requis');
    }
    
    const batch = writeBatch(db);
    let operationCount = 0;
    
    // Supprimer les sessions d'appel anciennes (> 30 jours)
    const oldSessionsQuery = query(
      collection(db, 'call_sessions'),
      where('createdAt', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    );
    
    const oldSessionsSnapshot = await getDocs(oldSessionsQuery);
    oldSessionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      operationCount++;
    });
    
    // Supprimer les logs anciens (> 90 jours)
    const oldLogsQuery = query(
      collection(db, 'logs'),
      where('timestamp', '<', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    );
    
    const oldLogsSnapshot = await getDocs(oldLogsQuery);
    oldLogsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      operationCount++;
    });
    
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Nettoyage terminé: ${operationCount} documents supprimés`);
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up obsolete data:', error);
    return false;
  }
};