import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CallCheckout from './CallCheckout';
import { AlertCircle } from 'lucide-react';

// Types cohérents avec BookingRequest.tsx
interface Provider {
  id: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: 'lawyer' | 'expat';
  type?: 'lawyer' | 'expat';
  country: string;
  currentCountry?: string;
  avatar?: string;
  profilePhoto?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  whatsapp?: string;
  whatsAppNumber?: string;
  languagesSpoken?: string[];
  languages?: string[];
  preferredLanguage?: string;
  price?: number;
  duration?: number;
  rating?: number;
  reviewCount?: number;
  specialties?: string[];
  isActive?: boolean;
  isApproved?: boolean;
}

interface ServiceData {
  providerId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerRole: 'lawyer' | 'expat';
  amount: number;
  duration: number;
  clientPhone: string;
  commissionAmount: number;
  providerAmount: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  provider: Provider | null;
  serviceData: ServiceData | null;
}

const CallCheckoutWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId: string }>();
  
  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    provider: null,
    serviceData: null
  });

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        console.log('🔍 CallCheckoutWrapper - Recherche des données pour providerId:', providerId);
        
        // 🔧 FIX 1: Essayer TOUTES les variantes de noms dans location.state
        const stateProvider = location.state?.selectedProvider || 
                            location.state?.providerData || 
                            location.state?.provider;
        const stateService = location.state?.serviceData || 
                           location.state?.service || 
                           location.state?.bookingData;
        
        if (stateProvider && stateProvider.id) {
          console.log('✅ Provider trouvé dans location.state');
          let serviceInfo = stateService;
          
          // Si pas de service data, la reconstruire
          if (!serviceInfo || !serviceInfo.amount) {
            console.log('⚙️ Reconstruction service data depuis location.state provider');
            serviceInfo = reconstructServiceData(stateProvider);
          }
          
          setState({
            isLoading: false,
            error: null,
            provider: normalizeProviderData(stateProvider),
            serviceData: serviceInfo
          });
          return;
        }

        // 🔧 FIX 2: SessionStorage avec gestion d'erreurs améliorée
        console.log('🔍 Recherche dans sessionStorage...');
        
        let savedProviderData: Provider | null = null;
        let savedServiceData: ServiceData | null = null;

        // Essayer selectedProvider
        try {
          const savedProvider = sessionStorage.getItem('selectedProvider');
          if (savedProvider) {
            savedProviderData = JSON.parse(savedProvider) as Provider;
            console.log('✅ selectedProvider trouvé:', savedProviderData.id);
          }
        } catch (error) {
          console.warn('⚠️ Erreur parsing selectedProvider:', error);
        }

        // Essayer serviceData
        try {
          const savedService = sessionStorage.getItem('serviceData');
          if (savedService) {
            savedServiceData = JSON.parse(savedService) as ServiceData;
            console.log('✅ serviceData trouvé:', savedServiceData.amount);
          }
        } catch (error) {
          console.warn('⚠️ Erreur parsing serviceData:', error);
        }

        // Vérifier correspondance avec providerId si fourni
        if (savedProviderData && (!providerId || savedProviderData.id === providerId)) {
          if (!savedServiceData) {
            console.log('⚙️ Reconstruction service data depuis sessionStorage provider');
            savedServiceData = reconstructServiceData(savedProviderData);
          }
          
          setState({
            isLoading: false,
            error: null,
            provider: normalizeProviderData(savedProviderData),
            serviceData: savedServiceData
          });
          return;
        }

        // 🔧 FIX 3: Essayer bookingRequest avec reconstruction complète
        console.log('🔍 Recherche dans bookingRequest...');
        try {
          const savedBookingRequest = sessionStorage.getItem('bookingRequest');
          if (savedBookingRequest) {
            const bookingData = JSON.parse(savedBookingRequest);
            console.log('✅ bookingRequest trouvé:', bookingData);
            
            if (!providerId || bookingData.providerId === providerId) {
              const reconstructedProvider = reconstructProviderFromBooking(bookingData);
              const reconstructedService = reconstructServiceFromBooking(bookingData);
              
              setState({
                isLoading: false,
                error: null,
                provider: reconstructedProvider,
                serviceData: reconstructedService
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur parsing bookingRequest:', error);
        }

        // 🔧 FIX 4: Essayer providerProfile (nouveau fallback)
        console.log('🔍 Recherche dans providerProfile...');
        try {
          const savedProviderProfile = sessionStorage.getItem('providerProfile');
          if (savedProviderProfile) {
            const profileData = JSON.parse(savedProviderProfile);
            console.log('✅ providerProfile trouvé:', profileData);
            
            if (!providerId || profileData.id === providerId) {
              const reconstructedService = reconstructServiceData(profileData);
              
              setState({
                isLoading: false,
                error: null,
                provider: normalizeProviderData(profileData),
                serviceData: reconstructedService
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur parsing providerProfile:', error);
        }

        // 🔧 FIX 5: Fallback avec données par défaut si providerId fourni
        if (providerId) {
          console.log('⚙️ Fallback avec données par défaut pour providerId:', providerId);
          const defaultProvider = createDefaultProvider(providerId);
          const defaultService = reconstructServiceData(defaultProvider);
          
          setState({
            isLoading: false,
            error: null,
            provider: defaultProvider,
            serviceData: defaultService
          });
          return;
        }

        // Aucune donnée trouvée
        console.error('❌ Aucune donnée trouvée pour providerId:', providerId);
        setState({
          isLoading: false,
          error: 'Les données de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.',
          provider: null,
          serviceData: null
        });
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        setState({
          isLoading: false,
          error: 'Erreur lors du chargement des données de consultation',
          provider: null,
          serviceData: null
        });
      }
    };

    loadData();
  }, [location.state, providerId]);

  /**
   * 🔧 FIX: Normalise les données du provider pour assurer la cohérence
   */
  const normalizeProviderData = (providerData: any): Provider => {
    return {
      id: providerData.id || providerData.providerId || Math.random().toString(36),
      fullName: providerData.fullName || 
               providerData.name || 
               providerData.providerName ||
               `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 
               'Expert',
      name: providerData.name || 
            providerData.fullName || 
            providerData.providerName || 
            'Expert',
      firstName: providerData.firstName || '',
      lastName: providerData.lastName || '',
      role: providerData.role || 
            providerData.type || 
            providerData.providerType || 
            'expat',
      type: providerData.type || 
            providerData.role || 
            providerData.providerType || 
            'expat',
      country: providerData.country || 
               providerData.currentCountry || 
               providerData.providerCountry || 
               '',
      currentCountry: providerData.currentCountry || 
                     providerData.country || 
                     providerData.providerCountry || 
                     '',
      avatar: providerData.avatar || 
              providerData.profilePhoto || 
              providerData.providerAvatar || 
              '/default-avatar.png',
      profilePhoto: providerData.profilePhoto || 
                   providerData.avatar || 
                   providerData.providerAvatar || 
                   '/default-avatar.png',
      email: providerData.email || '',
      phone: providerData.phone || 
             providerData.phoneNumber || 
             providerData.providerPhone || 
             '',
      phoneNumber: providerData.phoneNumber || 
                  providerData.phone || 
                  providerData.providerPhone || 
                  '',
      whatsapp: providerData.whatsapp || 
               providerData.whatsAppNumber || 
               '',
      whatsAppNumber: providerData.whatsAppNumber || 
                     providerData.whatsapp || 
                     '',
      languagesSpoken: providerData.languagesSpoken || 
                      providerData.languages || 
                      providerData.providerLanguages || 
                      [],
      languages: providerData.languages || 
                providerData.languagesSpoken || 
                providerData.providerLanguages || 
                [],
      preferredLanguage: providerData.preferredLanguage || 'fr',
      price: providerData.price || 
             (providerData.role === 'lawyer' || providerData.type === 'lawyer' || providerData.providerType === 'lawyer' ? 49 : 19),
      duration: providerData.duration || 
               (providerData.role === 'lawyer' || providerData.type === 'lawyer' || providerData.providerType === 'lawyer' ? 20 : 30),
      rating: providerData.rating || 
              providerData.providerRating || 
              5.0,
      reviewCount: providerData.reviewCount || 
                  providerData.providerReviewCount || 
                  0,
      specialties: providerData.specialties || 
                  providerData.providerSpecialties || 
                  [],
      isActive: providerData.isActive !== false,
      isApproved: providerData.isApproved !== false
    };
  };

  /**
   * 🔧 FIX: Reconstruit les données de service à partir du provider
   */
  const reconstructServiceData = (provider: any): ServiceData => {
    const providerRole = provider.role || provider.type || provider.providerType || 'expat';
    const baseAmount = provider.price || (providerRole === 'lawyer' ? 49 : 19);
    const duration = provider.duration || (providerRole === 'lawyer' ? 20 : 30);
    
    // Calcul des commissions (20% pour la plateforme)
    const commissionRate = 0.20;
    const commissionAmount = Math.round(baseAmount * commissionRate * 100) / 100;
    const providerAmount = Math.round((baseAmount - commissionAmount) * 100) / 100;
    
    return {
      providerId: provider.id || provider.providerId || Math.random().toString(36),
      serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
      providerRole: providerRole as 'lawyer' | 'expat',
      amount: baseAmount,
      duration: duration,
      clientPhone: '', // Sera rempli par CallCheckout
      commissionAmount: commissionAmount,
      providerAmount: providerAmount
    };
  };

  /**
   * 🔧 NOUVEAU: Reconstruit un provider depuis bookingRequest
   */
  const reconstructProviderFromBooking = (bookingData: any): Provider => {
    return {
      id: bookingData.providerId || Math.random().toString(36),
      fullName: bookingData.providerName || 'Expert',
      name: bookingData.providerName || 'Expert',
      firstName: '',
      lastName: '',
      role: bookingData.providerType as 'lawyer' | 'expat' || 'expat',
      type: bookingData.providerType as 'lawyer' | 'expat' || 'expat',
      country: bookingData.providerCountry || '',
      currentCountry: bookingData.providerCountry || '',
      avatar: bookingData.providerAvatar || '/default-avatar.png',
      profilePhoto: bookingData.providerAvatar || '/default-avatar.png',
      email: '',
      phone: bookingData.providerPhone || '',
      phoneNumber: bookingData.providerPhone || '',
      whatsapp: '',
      whatsAppNumber: '',
      languagesSpoken: bookingData.providerLanguages || [],
      languages: bookingData.providerLanguages || [],
      preferredLanguage: 'fr',
      price: bookingData.price || (bookingData.providerType === 'lawyer' ? 49 : 19),
      duration: bookingData.duration || (bookingData.providerType === 'lawyer' ? 20 : 30),
      rating: bookingData.providerRating || 5.0,
      reviewCount: bookingData.providerReviewCount || 0,
      specialties: bookingData.providerSpecialties || [],
      isActive: true,
      isApproved: true
    };
  };

  /**
   * 🔧 NOUVEAU: Reconstruit serviceData depuis bookingRequest
   */
  const reconstructServiceFromBooking = (bookingData: any): ServiceData => {
    const providerRole = bookingData.providerType || 'expat';
    const baseAmount = bookingData.price || (providerRole === 'lawyer' ? 49 : 19);
    const duration = bookingData.duration || (providerRole === 'lawyer' ? 20 : 30);
    
    const commissionRate = 0.20;
    const commissionAmount = Math.round(baseAmount * commissionRate * 100) / 100;
    const provider