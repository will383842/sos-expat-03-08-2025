import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star, MapPin, Clock, Phone, Shield, Award, Globe,  Users, ThumbsUp, Flag, Share2, Facebook, Twitter, Linkedin, GraduationCap, Briefcase, Languages } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { logAnalyticsEvent, getProviderReviews, incrementReviewHelpfulCount, reportReview } from '../utils/firestore';
import Reviews from '../components/review/Reviews';
import { normalizeUserData } from '../utils/firestore';
import SEOHead from '../components/layout/SEOHead';
import { Review } from '../types';

interface SosProfile {
  uid: string;
  id?: string;
  type: 'lawyer' | 'expat';
  fullName: string;
  firstName: string;
  lastName: string;
  slug?: string;
  country: string;
  city?: string;
  languages: string[];
  mainLanguage?: string;
  specialties: string[];
  helpTypes?: string[];
  description: string;
  professionalDescription?: string;
  experienceDescription?: string;
  motivation?: string;
  profilePhoto: string;
  photoURL?: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  yearsAsExpat?: number;
  isOnline?: boolean;
  isActive: boolean;
  isApproved: boolean;
  isVerified: boolean;
  isVisibleOnMap?: boolean;
  price: number;
  duration: number;
  education?: string;
  certifications?: string[];
  lawSchool?: string;
  graduationYear?: number;
  responseTime?: string;
  successRate?: number;
  totalCalls?: number;
  successfulCalls?: number;
  totalResponses?: number;
  totalResponseTime?: number;
  avgResponseTimeMs?: number;
  createdAt?: any;
  updatedAt?: any;
  lastSeen?: any;
}

const ProviderProfile: React.FC = () => {
  const { id, country: countryParam, language: langParam, type: typeParam } = useParams<{ 
    id?: string; 
    country?: string; 
    language?: string; 
    type?: string; 
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useApp();
  const [provider, setProvider] = useState<SosProfile | null>(null);
  const [realProviderId, setRealProviderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<{
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  }>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  
  // ✅ Debug: Historique des changements
  const [debugHistory, setDebugHistory] = useState<Array<{
    timestamp: string;
    field: string;
    oldValue: any;
    newValue: any;
    source: string;
  }>>([]);

  // ✅ État pour tracker UNIQUEMENT isOnline en temps réel
  const [onlineStatus, setOnlineStatus] = useState({
    isOnline: false,
    lastUpdate: null as Date | null,
    listenerActive: false,
    connectionAttempts: 0
  });

  // Charger les avis du prestataire
  const loadReviews = useCallback(async (providerId: string) => {  
    try {
      setIsLoadingReviews(true);
      console.log('Chargement des avis pour le prestataire:', providerId);
      const providerReviews = await getProviderReviews(providerId);
      console.log('Avis récupérés:', providerReviews.length);
      setReviews(providerReviews);
      
      // Calculer la distribution des notes
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      providerReviews.forEach(review => {
        const rating = Math.floor(review.rating) as 1 | 2 | 3 | 4 | 5;
        if (rating >= 1 && rating <= 5) {
          distribution[rating]++;
        }
      });
      setRatingDistribution(distribution);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  // ✅ CHARGEMENT INITIAL DES DONNÉES
  useEffect(() => {    
    const loadProviderData = async () => {
      try {
        setIsLoading(true);
        
        let providerData: SosProfile | null = null;
        let foundProviderId: string | null = null;
        
        // 1. Essayer d'extraire l'ID du slug ou utiliser l'ID directement
        let providerId: string | null = null;
        if (id) {
          if (id.length >= 15) {
            providerId = id;
            foundProviderId = id;
          } else if (typeof id === 'string') {
            const idMatch = id.match(/-([a-zA-Z0-9]+)$/);
            if (idMatch && idMatch[1] && idMatch[1].length >= 15) {
              providerId = idMatch[1];
              foundProviderId = idMatch[1];
            }
          }
        }

        // Charger directement depuis Firestore si on a un ID
        if (providerId && providerId.length >= 15) {
          try {
            const docRef = doc(db, 'sos_profiles', providerId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              providerData = {
                ...normalizeUserData(data, docSnap.id),
                id: docSnap.id,
                type: data.type || 'expat',
              } as SosProfile;
              foundProviderId = docSnap.id;
              
              // ✅ Initialiser le statut en ligne
              console.log('🔍 INITIAL DATA - isOnline:', data.isOnline);
              setOnlineStatus({
                isOnline: data.isOnline || false,
                lastUpdate: new Date(),
                listenerActive: false,
                connectionAttempts: 0
              });
            }
          } catch (error) {
            console.error('Error loading provider by ID:', error);
          }
        }
        
        // 2. Si pas trouvé par ID, essayer par les paramètres SEO
        if (!providerData && typeParam && countryParam && langParam && id) {
          const type = typeParam === 'avocat' ? 'lawyer' : typeParam === 'expatrie' ? 'expat' : null;
          const country = countryParam ? countryParam.charAt(0).toUpperCase() + countryParam.slice(1) : null;
          const slug = id ? id.replace(/-[a-zA-Z0-9]+$/, '') : null;
          
          if (type && country) {
            const sosProfilesQuery = query(
              collection(db, "sos_profiles"),
              where("type", "==", type),
              where("country", "==", country),
              where("isActive", "==", true),
              limit(10)
            );
            
            const querySnapshot = await getDocs(sosProfilesQuery);
            
            const matchingDoc = querySnapshot.docs.find(doc => {
              const data = doc.data();
              return data.slug === slug || 
                     (data.slug && data.slug.startsWith(slug)) || 
                     (data.firstName && data.lastName && 
                      `${data.firstName}-${data.lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') === slug);
            });
            
            if (matchingDoc) {
              const data = matchingDoc.data();
              providerData = {
                ...normalizeUserData(data, matchingDoc.id),
                id: matchingDoc.id,
                type: data.type || 'expat',
              } as SosProfile;
              foundProviderId = matchingDoc.id;
              
              console.log('🔍 SEO DATA - isOnline:', data.isOnline);
              setOnlineStatus({
                isOnline: data.isOnline || false,
                lastUpdate: new Date(),
                listenerActive: false,
                connectionAttempts: 0
              });
            }
          }
        }
        
        // 3. Si on a des données dans l'état de navigation, les utiliser comme fallback
        if (!providerData && location.state) {
          const state = location.state as any;
          if (state.providerData) {
            const navData = state.providerData;
            
            providerData = {
              uid: navData.id || '',
              id: navData.id || '',
              fullName: navData.name || `${navData.firstName || ''} ${navData.lastName || ''}`.trim(),
              firstName: navData.firstName || '',
              lastName: navData.lastName || '',
              type: navData.type === 'lawyer' ? 'lawyer' : 'expat', 
              country: navData.country || '',
              languages: navData.languages || ['Français'],
              specialties: navData.specialties || [],
              helpTypes: navData.helpTypes || [],
              description: navData.description || navData.bio || '',
              professionalDescription: navData.professionalDescription || '',
              experienceDescription: navData.experienceDescription || '',
              motivation: navData.motivation || '',
              profilePhoto: navData.avatar || navData.profilePhoto || '',
              rating: navData.rating || 4.5,
              reviewCount: navData.reviewCount || 0,
              yearsOfExperience: navData.yearsOfExperience || 0,
              yearsAsExpat: navData.yearsAsExpat || 0,
              price: navData.price || (navData.type === 'lawyer' ? 49 : 19),
              duration: navData.type === 'lawyer' ? 20 : 30,
              isOnline: navData.isOnline || false,
              isActive: true,
              isApproved: true,
              isVerified: true,
              education: navData.education || '',
              lawSchool: navData.lawSchool || '',
              graduationYear: navData.graduationYear || new Date().getFullYear() - 5,
              certifications: navData.certifications || [],
              responseTime: navData.responseTime || '< 5 minutes',
              successRate: navData.successRate || 95
            } as SosProfile;
            foundProviderId = navData.id || '';
            
            console.log('🔍 NAV DATA - isOnline:', navData.isOnline);
            setOnlineStatus({
              isOnline: navData.isOnline || false,
              lastUpdate: new Date(),
              listenerActive: false,
              connectionAttempts: 0
            });
          }
        }

        if (providerData && foundProviderId) {
          setProvider(providerData);
          setRealProviderId(foundProviderId);
          console.log("🔍 DEBUG - Provider data loaded:", providerData);
          console.log("🔍 DEBUG - Real Provider ID:", foundProviderId);
          
          // Charger les avis
          if (providerData.uid || foundProviderId) {
            await loadReviews(providerData.uid || foundProviderId);
          }
        } else {
          setNotFound(true);
        }
        
      } catch (error) {
        console.error('Error loading provider data:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProviderData();
  }, [id, typeParam, countryParam, langParam, loadReviews, location.state]);

  // ✅ LISTENER TEMPS RÉEL ULTRA-SIMPLIFIÉ - FOCUS UNIQUEMENT SUR isOnline
  useEffect(() => {
    if (!realProviderId || realProviderId.length < 15) {
      console.log("🔄 No valid provider ID for real-time listener");
      return;
    }

    console.log("🔄 ========================================");
    console.log("🔄 SETTING UP REAL-TIME LISTENER");
    console.log("🔄 Provider ID:", realProviderId);
    console.log("🔄 ========================================");

    // Marquer le listener comme actif
    setOnlineStatus(prev => ({ ...prev, listenerActive: true, connectionAttempts: prev.connectionAttempts + 1 }));

    const unsubscribe = onSnapshot(
      doc(db, 'sos_profiles', realProviderId),
      {
        includeMetadataChanges: true // ✅ Inclure pour debug
      },
      (docSnap) => {
        const timestamp = new Date().toISOString();
        const isFromCache = docSnap.metadata.fromCache;
        const hasPendingWrites = docSnap.metadata.hasPendingWrites;
        
        console.log("🔄 ========================================");
        console.log("🔄 REAL-TIME UPDATE RECEIVED");
        console.log("🔄 Timestamp:", timestamp);
        console.log("🔄 From cache:", isFromCache);
        console.log("🔄 Has pending writes:", hasPendingWrites);
        console.log("🔄 Document exists:", docSnap.exists());
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const newIsOnline = data.isOnline;
          
          console.log("🔄 Raw isOnline from Firestore:", newIsOnline);
          console.log("🔄 Type of isOnline:", typeof newIsOnline);
          console.log("🔄 All data keys:", Object.keys(data));
          
          // ✅ Log de tous les champs liés au statut
          console.log("🔄 Status fields:", {
            isOnline: data.isOnline,
            isActive: data.isActive,
            lastSeen: data.lastSeen,
            updatedAt: data.updatedAt
          });

          // ✅ Mise à jour IMMÉDIATE du statut en ligne
          setOnlineStatus(prevStatus => {
            const oldIsOnline = prevStatus.isOnline;
            const statusChanged = oldIsOnline !== newIsOnline;
            
            console.log("🔄 Status comparison:");
            console.log("🔄 Old isOnline:", oldIsOnline);
            console.log("🔄 New isOnline:", newIsOnline);
            console.log("🔄 Status changed:", statusChanged);
            
            if (statusChanged) {
              console.log("🔄 ⚡ STATUS CHANGE DETECTED! ⚡");
              console.log("🔄 From:", oldIsOnline, "To:", newIsOnline);
              
              // ✅ Ajouter à l'historique de debug
              setDebugHistory(prev => [...prev.slice(-9), {
                timestamp,
                field: 'isOnline',
                oldValue: oldIsOnline,
                newValue: newIsOnline,
                source: isFromCache ? 'cache' : 'server'
              }]);
            }

            return {
              isOnline: newIsOnline !== undefined ? newIsOnline : prevStatus.isOnline,
              lastUpdate: new Date(),
              listenerActive: true,
              connectionAttempts: prevStatus.connectionAttempts
            };
          });

          // ✅ Mettre à jour aussi le provider principal
          setProvider(prevProvider => {
            if (!prevProvider) return null;
            
            const needsUpdate = prevProvider.isOnline !== newIsOnline;
            
            if (needsUpdate) {
              console.log("🔄 Updating main provider isOnline:", prevProvider.isOnline, "->", newIsOnline);
              return {
                ...prevProvider,
                isOnline: newIsOnline !== undefined ? newIsOnline : prevProvider.isOnline,
                updatedAt: new Date()
              };
            }
            
            return prevProvider;
          });
          
        } else {
          console.log("🔄 ❌ Document does not exist!");
          setOnlineStatus(prev => ({ ...prev, isOnline: false, lastUpdate: new Date() }));
        }
        
        console.log("🔄 ========================================");
      },
      (error) => {
        console.error("🔄 ❌ REAL-TIME LISTENER ERROR:");
        console.error("🔄 Error code:", error.code);
        console.error("🔄 Error message:", error.message);
        console.error("🔄 Full error:", error);
        
        setOnlineStatus(prev => ({ 
          ...prev, 
          listenerActive: false,
          lastUpdate: new Date()
        }));
        
        // ✅ Retry après 3 secondes
        if (error.code === 'unavailable') {
          console.log("🔄 Service unavailable, retrying in 3 seconds...");
          setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            setOnlineStatus(prev => ({ ...prev, connectionAttempts: prev.connectionAttempts + 1 }));
          }, 3000);
        }
      }
    );

    // ✅ Cleanup
    return () => {
      console.log("🔄 CLEANING UP REAL-TIME LISTENER");
      setOnlineStatus(prev => ({ ...prev, listenerActive: false }));
      unsubscribe();
    };
  }, [realProviderId]);

  // ✅ GESTION DU CAS "NON TROUVÉ"
  useEffect(() => {
    if (!isLoading && !provider) {
      setNotFound(true);
      const timeout = setTimeout(() => {
        navigate('/sos-appel');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, provider, navigate]);

  // Mettre à jour l'URL et les méta-tags SEO
  const updateSEOMetadata = useCallback(() => {
    if (!provider || isLoading) return;

    try {
      const isLawyer = provider.type === 'lawyer';
      const displayType = isLawyer ? 'avocat' : 'expatrie';
      const countrySlug = (provider.country || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const langSlug = provider.mainLanguage || 
                       (provider.languages && provider.languages.length > 0 ? 
                        provider.languages[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') : 
                        'francais');
      const nameSlug = provider.slug || 
                      `${provider.firstName || ''}-${provider.lastName || ''}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      
      const seoUrl = `/${displayType}/${countrySlug}/${langSlug}/${nameSlug}-${provider.uid}`;
      
      if (window.location.pathname !== seoUrl) {
        window.history.replaceState(null, '', seoUrl);
      }
      
      document.title = `${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country} | SOS Expat & Travelers`;
      
      const updateOrCreateMeta = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };
      
      updateOrCreateMeta('og:title', `${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country}`);
      updateOrCreateMeta('og:description', provider.description.substring(0, 160));
      updateOrCreateMeta('og:image', provider.profilePhoto);
      updateOrCreateMeta('og:url', window.location.href);
      updateOrCreateMeta('og:type', 'profile');
    } catch (error) {
      console.error('Error updating SEO metadata:', error);
    }
  }, [provider, isLoading]);
  
  useEffect(() => {
    updateSEOMetadata();
  }, [updateSEOMetadata]);

  const handleBookCall = useCallback(() => {
    if (!provider) return;

    const currentOnlineStatus = onlineStatus.isOnline;

    if (user) {
      logAnalyticsEvent({
        eventType: 'book_call_click',
        userId: user.id,
        eventData: {
          providerId: provider.uid,
          providerType: provider.type,
          providerName: provider.fullName,
          providerOnlineStatus: currentOnlineStatus
        }
      });
      
      const providerData = {
        id: provider.uid,
        name: provider.fullName,
        firstName: provider.firstName,
        lastName: provider.lastName,
        type: provider.type,
        country: provider.country,
        languages: provider.languages,
        specialties: provider.specialties,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        yearsOfExperience: provider.yearsOfExperience,
        isOnline: currentOnlineStatus,
        avatar: provider.profilePhoto,
        description: provider.description,
        price: provider.price,
        duration: provider.duration,
        responseTime: provider.responseTime,
        successRate: provider.successRate
      };
      
      sessionStorage.setItem('selectedProvider', JSON.stringify(providerData));
      navigate(`/booking-request/${provider.uid}`);
      window.scrollTo(0, 0);
    } else {
      const providerData = {
        id: provider.uid,
        name: provider.fullName,
        firstName: provider.firstName,
        lastName: provider.lastName,
        type: provider.type,
        country: provider.country,
        languages: provider.languages,
        specialties: provider.specialties,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        yearsOfExperience: provider.yearsOfExperience,
        isOnline: currentOnlineStatus,
        avatar: provider.profilePhoto,
        description: provider.description,
        price: provider.price,
        duration: provider.duration,
        responseTime: provider.responseTime,
        successRate: provider.successRate
      };
      
      sessionStorage.setItem('selectedProvider', JSON.stringify(providerData));
      const redirectUrl = `/booking-request/${provider.uid}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      window.scrollTo(0, 0);
    }
  }, [provider, user, navigate, onlineStatus.isOnline]);

  const shareProfile = useCallback((platform: string) => {
    if (!provider) return;

    const isLawyer = provider.type === 'lawyer';
    const countrySlug = provider.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const langSlug = provider.mainLanguage || provider.languages?.[0]?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') || 'francais';
    const nameSlug = provider.slug || `${provider.firstName}-${provider.lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    
    const seoUrl = `/${isLawyer ? 'avocat' : 'expatrie'}/${countrySlug}/${langSlug}/${nameSlug}`;
    const currentUrl = window.location.origin + seoUrl;
    const title = `${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country}`;
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(currentUrl);
        alert(language === 'fr' ? 'Lien copié !' : 'Link copied!');
        break;
    }
  }, [provider, language]);

  const handleHelpfulClick = useCallback(async (reviewId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      await incrementReviewHelpfulCount(reviewId);
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId 
            ? { ...review, helpfulVotes: (review.helpfulVotes || 0) + 1 }
            : review
        )
      );
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  }, [user, navigate]);

  const handleReportClick = useCallback(async (reviewId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const reason = prompt('Veuillez indiquer la raison du signalement:');
    if (reason) {
      try {
        await reportReview(reviewId, reason);
        alert('Merci pour votre signalement. Notre équipe va l\'examiner.');
      } catch (error) {
        console.error('Error reporting review:', error);
      }
    }
  }, [user, navigate]);

  const renderStars = useCallback((rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={
          i < fullStars 
            ? 'text-yellow-400 fill-current' 
            : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-[url(#half-star)]' 
              : 'text-gray-300'
        }
      />
    ));
  }, []);

  // Gestion du cas de chargement
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="large" color="red" text="Chargement du profil..." />
        </div>
      </Layout>
    );
  }

  // Gestion du cas "non trouvé"
  if (notFound || !provider) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-8 text-center text-red-600 text-lg">
            Ce profil prestataire est introuvable. Redirection en cours...
          </div>
        </div>
      </Layout>
    );
  }
  
  // Déterminer si c'est un avocat ou un expatrié
  const isLawyer = provider.type === 'lawyer';
  const isExpat = provider.type === 'expat';

  return (
    <Layout>
      {provider && (
        <SEOHead
          title={`${provider.fullName} - ${isLawyer ? 'Avocat' : 'Expatrié'} en ${provider.country} | SOS Expat & Travelers`}
          description={`Consultez ${provider.fullName}, ${isLawyer ? 'avocat' : 'expatrié'} francophone en ${provider.country}. ${provider.description?.substring(0, 120)}...`}
          canonicalUrl={`/${isLawyer ? 'avocat' : 'expatrie'}/${provider.country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}/${provider.languages?.[0]?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') || 'francais'}/${provider.fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}-${provider.uid}`}
          ogImage={provider.profilePhoto}
          ogType="profile"
          structuredData={{
            "@context": "https://schema.org",
            "@type": isLawyer ? "Attorney" : "Person",
            "name": provider.fullName,
            "image": provider.profilePhoto,
            "description": provider.description,
            "telephone": "",
            "email": "",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": provider.country
            },
            "jobTitle": isLawyer ? "Avocat" : "Expatrié consultant",
            "worksFor": {
              "@type": "Organization",
              "name": "SOS Expat & Travelers"
            },
            "knowsLanguage": provider.languages,
            "review": {
              "@type": "AggregateRating",
              "ratingValue": provider.rating,
              "reviewCount": provider.reviewCount
            }
          }}
        />
      )}
      
      {/* ✅ PANNEAU DE DEBUG - Visible en développement */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
          <h3 className="font-bold mb-2">🔄 Debug Real-time Status</h3>
          <div className="space-y-1">
            <div>Provider ID: <span className="text-green-400">{realProviderId || 'N/A'}</span></div>
            <div>Current isOnline: <span className={onlineStatus.isOnline ? 'text-green-400' : 'text-red-400'}>{String(onlineStatus.isOnline)}</span></div>
            <div>Listener Active: <span className={onlineStatus.listenerActive ? 'text-green-400' : 'text-red-400'}>{String(onlineStatus.listenerActive)}</span></div>
            <div>Last Update: <span className="text-blue-400">{onlineStatus.lastUpdate?.toLocaleTimeString() || 'N/A'}</span></div>
            <div>Connection Attempts: <span className="text-yellow-400">{onlineStatus.connectionAttempts}</span></div>
          </div>
          {debugHistory.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-600">
              <h4 className="font-bold mb-1">Recent Changes:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {debugHistory.slice(-5).map((change, i) => (
                  <div key={i} className="text-xs">
                    <div className="text-gray-400">{new Date(change.timestamp).toLocaleTimeString()}</div>
                    <div>{change.field}: <span className="text-red-400">{String(change.oldValue)}</span> → <span className="text-green-400">{String(change.newValue)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SVG pattern for half stars */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="half-star" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="50%" stopColor="#D1D5DB" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate('/sos-appel')}
              className="text-red-200 hover:text-white mb-6 transition-colors"
            >
              ← Retour aux experts
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <img
                      src={provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png'}
                      alt={`Photo de ${provider.fullName}`}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white/20 cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.warn("Failed to load profile image, using fallback");
                        target.onerror = null;
                        target.src = '/default-avatar.png'; 
                      }}
                    />
                    {/* ✅ Indicateur de statut temps réel avec animation */}
                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white transition-all duration-500 ${
                      onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {/* ✅ Animation de pulsation uniquement si en ligne */}
                      {onlineStatus.isOnline && (
                        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                      )}
                    </div>
                    {/* ✅ Indicateur de listener actif */}
                    {!onlineStatus.listenerActive && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-3xl font-bold">{provider.fullName}</h1>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isLawyer
                          ? 'bg-blue-500/20 text-blue-100' 
                          : 'bg-green-500/20 text-green-100'
                      }`}>
                        {isLawyer ? 'Avocat certifié' : 'Expatrié expert'}
                      </span>
                      {provider.isVerified && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                          ✓ {language === 'fr' ? 'Vérifié' : 'Verified'}
                        </span>
                      )}
                      {/* ✅ Badge de statut temps réel ultra-visible */}
                      <span className={`px-3 py-1 rounded-full text-sm font-bold transition-all duration-500 border-2 ${
                        onlineStatus.isOnline 
                          ? 'bg-green-500 text-white border-green-300 shadow-lg shadow-green-500/50' 
                          : 'bg-red-500 text-white border-red-300'
                      }`}>
                        {onlineStatus.isOnline ? '🟢 EN LIGNE' : '🔴 HORS LIGNE'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-red-100 mb-4">
                      <div className="flex items-center space-x-1">
                        <MapPin size={16} />
                        <span>{provider.country}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isLawyer ? <Briefcase size={16} /> : <Users size={16} />}
                        <span>
                          {isLawyer 
                            ? `${provider.yearsOfExperience || 0} ans d'expérience` 
                            : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ans d'expatriation`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={16} />
                        <span>Répond en {provider.responseTime || '< 5 minutes'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-4">
                      {renderStars(provider.rating)}
                      <span className="text-red-100 font-medium">{provider.rating.toFixed(2)}</span>
                      <span className="text-red-200">({provider.reviewCount || reviews.length || 0} avis)</span>
                    </div>
                    
                    <div className="text-red-100 leading-relaxed">
                      <p className="mb-2 whitespace-pre-line">
                        {provider.description || 'Aucune description professionnelle disponible.'}
                      </p>

                      {/* Motivation pour les avocats */}
                      {isLawyer && provider.motivation && provider.motivation.trim() !== '' && (
                        <div className="mt-4 pt-4 border-t border-red-200/30">
                          <h3 className="text-lg font-semibold text-white mb-2">Description professionnelle</h3>
                          <p className="text-red-100 whitespace-pre-line">{provider.motivation}</p>
                        </div>
                      )}

                      {/* Motivation pour les expatriés */}
                      {isExpat && provider.motivation && provider.motivation.trim() !== '' && (
                        <div className="mt-4 pt-4 border-t border-red-200/30">
                          <h3 className="text-lg font-semibold text-white mb-2">Pourquoi souhaitez-vous aider ?</h3>
                          <p className="text-red-100 whitespace-pre-line">{provider.motivation}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Partage social */}
                    <div className="flex items-center space-x-3 mt-4">
                      <span className="text-red-200">Partager :</span>
                      <button
                        onClick={() => shareProfile('facebook')}
                        className="text-white hover:text-red-200 transition-colors"
                        aria-label="Partager sur Facebook"
                      >
                        <Facebook size={20} />
                      </button>
                      <button
                        onClick={() => shareProfile('twitter')}
                        className="text-white hover:text-red-200 transition-colors"
                        aria-label="Partager sur Twitter"
                      >
                        <Twitter size={20} />
                      </button>
                      <button
                        onClick={() => shareProfile('linkedin')}
                        className="text-white hover:text-red-200 transition-colors"
                        aria-label="Partager sur LinkedIn"
                      >
                        <Linkedin size={20} />
                      </button>
                      <button
                        onClick={() => shareProfile('copy')}
                        className="text-white hover:text-red-200 transition-colors"
                        aria-label="Copier le lien"
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ✅ Booking Card avec statut temps réel très visible */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-xl p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-red-600 mb-2">€{provider.price}</div>
                    <div className="text-gray-600">
                      {provider.duration || (isLawyer ? 20 : 30)} minutes
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Taux de succès</span>
                      <span className="font-medium text-green-600">{provider.successRate || 98}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Temps de réponse</span>
                      <span className="font-medium">{provider.responseTime || '< 5 minutes'}</span>
                    </div>
                    {/* ✅ Statut de disponibilité temps réel ULTRA-VISIBLE */}
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-600 font-medium">Disponibilité</span>
                      <span className={`font-bold text-sm px-3 py-1 rounded-full transition-all duration-500 ${
                        onlineStatus.isOnline 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {onlineStatus.isOnline ? '🟢 EN LIGNE' : '🔴 HORS LIGNE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Appels réalisés</span>
                      <span className="font-medium">{provider.totalCalls || 0}</span>
                    </div>
                    {/* ✅ Debug info en développement */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Listener</span>
                        <span className={onlineStatus.listenerActive ? 'text-green-600' : 'text-red-600'}>
                          {onlineStatus.listenerActive ? '✓ Actif' : '✗ Inactif'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* ✅ Bouton d'appel avec statut temps réel ultra-réactif */}
                  <button
                    onClick={handleBookCall}
                    disabled={!onlineStatus.isOnline}
                    className={`w-full py-4 px-4 rounded-lg font-bold text-lg transition-all duration-500 flex items-center justify-center space-x-3 ${
                      onlineStatus.isOnline
                        ? 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-green-500'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-300'
                    }`}
                  >
                    <Phone size={24} />
                    <span>
                      {onlineStatus.isOnline ? 'APPELER MAINTENANT' : 'NON DISPONIBLE'}
                    </span>
                    {/* ✅ Indicateur visuel dynamique */}
                    {onlineStatus.isOnline && (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse delay-150"></div>
                      </div>
                    )}
                  </button>
                  
                  {/* ✅ Messages informatifs détaillés */}
                  <div className="mt-4 text-center text-sm">
                    {onlineStatus.isOnline ? (
                      <div className="text-green-600 font-medium">
                        ✅ Expert disponible maintenant !
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ❌ Expert actuellement hors ligne
                        {onlineStatus.lastUpdate && (
                          <div className="text-gray-500 text-xs mt-1">
                            Dernier statut : {onlineStatus.lastUpdate.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <Shield size={16} />
                      <span>Paiement sécurisé • Satisfaction garantie</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8" id="reviews-section">
              {/* Specialties */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Spécialités</h2>
                {isLawyer ? (
                  <div className="flex flex-wrap gap-2">
                    {(provider.specialties || []).map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(provider.helpTypes || provider.specialties || []).map((helpType, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {helpType}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Langues parlées</h2>
                <div className="flex flex-wrap gap-2">
                  {(provider.languages || []).map((lang, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center"
                    >
                      <Globe size={14} className="mr-1" />
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education & Certifications */}
              {isLawyer && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Formation et certifications</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Formation</h3>
                      <div className="flex items-center space-x-2">
                        <GraduationCap size={18} className="text-blue-600" />
                        <p className="text-gray-600">
                          {provider.lawSchool || provider.education || 'Non renseigné'}
                          {provider.graduationYear && ` (${provider.graduationYear})`}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Certifications</h3>
                      <ul className="space-y-1">
                        {(provider.certifications || []).map((cert, index) => (
                          <li key={index} className="text-gray-600 flex items-center">
                            <Award size={14} className="mr-2 text-yellow-500" />
                            {cert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Expérience d'expatriation - Uniquement pour les expatriés */}
              {!isLawyer && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Expérience d'expatriation</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Expérience</h3>
                      <div className="flex items-center space-x-2">
                        <Users size={18} className="text-green-600 flex-shrink-0" />
                        <p className="text-gray-600">
                          {provider.yearsAsExpat || provider.yearsOfExperience || 0} ans d'expatriation en {provider.country}
                        </p>
                      </div>
                    </div>
                    
                    {provider.experienceDescription && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Détail de l'expérience</h3>
                        <p className="text-gray-600 whitespace-pre-line">{provider.experienceDescription}</p>
                      </div>
                    )}
                    
                    {provider.motivation && provider.motivation.trim() !== '' && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Motivation</h3>
                        <p className="text-gray-600 whitespace-pre-line">{provider.motivation}</p>
                      </div>
                    )}
                    
                    {(provider.education || provider.lawSchool) && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Formation</h3>
                        <p className="text-gray-600">
                          {provider.lawSchool || provider.education}
                          {provider.graduationYear && ` (${provider.graduationYear})`}
                        </p>
                      </div>
                    )}
                    {provider.certifications && provider.certifications.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Certifications</h3>
                        <ul className="space-y-1">
                          {provider.certifications.map((cert, index) => (
                            <li key={index} className="text-gray-600 flex items-center">
                              <Award size={14} className="mr-2 text-green-500" />
                              {cert}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Avis clients ({reviews.length || 0})
                </h2>
                
                {isLoadingReviews ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Chargement des avis...</p>
                  </div>
                ) : (
                  <>
                    <Reviews 
                      mode="summary"
                      averageRating={provider.rating}
                      totalReviews={reviews.length}
                      ratingDistribution={ratingDistribution}
                    />
                    
                    <div className="mt-8">
                      <Reviews 
                        mode="list"
                        reviews={reviews}
                        showControls={!!user}
                        onHelpfulClick={handleHelpfulClick}
                        onReportClick={handleReportClick}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Statistiques</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Note moyenne</span>
                      <span className="font-medium">{provider.rating.toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avis clients</span>
                      <span className="font-medium">{reviews.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux de succès</span>
                      <span className="font-medium text-green-600">{provider.successRate || 98}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expérience</span>
                      <span className="font-medium">
                        {isLawyer 
                          ? `${provider.yearsOfExperience || 0} ans` 
                          : `${provider.yearsAsExpat || provider.yearsOfExperience || 0} ans`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info avec statut temps réel très visible */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Informations</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>Basé en {provider.country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Languages size={16} className="text-gray-400" />
                      <span>Parle {(provider.languages || []).join(', ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-400" />
                      <span>Répond en {provider.responseTime || '< 5 minutes'}</span>
                    </div>
                    {/* ✅ Statut temps réel ULTRA-VISIBLE dans la sidebar */}
                    <div className={`flex items-center space-x-2 p-3 rounded-lg transition-all duration-500 ${
                      onlineStatus.isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                        onlineStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {onlineStatus.isOnline && (
                          <div className="w-6 h-6 rounded-full bg-green-500 animate-ping opacity-75 absolute"></div>
                        )}
                        <div className="w-3 h-3 bg-white rounded-full relative z-10"></div>
                      </div>
                      <span className={`font-bold transition-all duration-500 ${
                        onlineStatus.isOnline ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {onlineStatus.isOnline ? 'EN LIGNE MAINTENANT' : 'HORS LIGNE'}
                      </span>
                    </div>
                    {provider.isVerified && (
                      <div className="flex items-center space-x-2">
                        <Shield size={16} className="text-gray-400" />
                        <span>Expert vérifié</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal pour agrandir la photo de profil */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <img 
              src={provider.profilePhoto || provider.photoURL || provider.avatar || '/default-avatar.png'} 
              alt={`Photo de ${provider.fullName}`} 
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.warn("Failed to load modal image, using fallback");
                target.onerror = null;
                target.src = '/default-avatar.png';
              }}
            />
            <button 
              className="absolute top-4 right-4 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200"
              onClick={() => setShowImageModal(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProviderProfile;