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
        
        // 1. Essayer location.state d'abord (navigation directe)
        const stateProvider = location.state?.selectedProvider as Provider | undefined;
        const stateService = location.state?.serviceData as ServiceData | undefined;
        
        if (stateProvider && stateService) {
          console.log('✅ Données trouvées dans location.state');
          setState({
            isLoading: false,
            error: null,
            provider: stateProvider,
            serviceData: stateService
          });
          return;
        }

        // 2. Essayer sessionStorage
        const savedProvider = sessionStorage.getItem('selectedProvider');
        const savedService = sessionStorage.getItem('serviceData');
        
        if (savedProvider) {
          try {
            const providerData = JSON.parse(savedProvider) as Provider;
            
            // Vérifier que c'est le bon provider
            if (providerData.id === providerId || !providerId) {
              console.log('✅ Provider trouvé dans sessionStorage');
              
              let serviceInfo: ServiceData | null = null;
              
              // Essayer de récupérer les données de service sauvegardées
              if (savedService) {
                try {
                  serviceInfo = JSON.parse(savedService) as ServiceData;
                  console.log('✅ Service data trouvée dans sessionStorage');
                } catch (parseError) {
                  console.warn('⚠️ Erreur parsing service data:', parseError);
                }
              }
              
              // Si pas de service data, la reconstruire
              if (!serviceInfo) {
                console.log('⚙️ Reconstruction des données service...');
                serviceInfo = reconstructServiceData(providerData);
              }
              
              setState({
                isLoading: false,
                error: null,
                provider: normalizeProviderData(providerData),
                serviceData: serviceInfo
              });
              return;
            }
          } catch (parseError) {
            console.error('❌ Erreur parsing sessionStorage provider:', parseError);
          }
        }

        // 3. Essayer de récupérer depuis bookingRequest
        const savedBookingRequest = sessionStorage.getItem('bookingRequest');
        if (savedBookingRequest) {
          try {
            const bookingData = JSON.parse(savedBookingRequest);
            if (bookingData.providerId === providerId || !providerId) {
              console.log('✅ Données trouvées dans bookingRequest');
              
              const reconstructedProvider: Provider = {
                id: bookingData.providerId,
                name: bookingData.providerName,
                fullName: bookingData.providerName,
                role: bookingData.providerType as 'lawyer' | 'expat',
                type: bookingData.providerType as 'lawyer' | 'expat',
                country: bookingData.providerCountry,
                currentCountry: bookingData.providerCountry,
                avatar: bookingData.providerAvatar,
                profilePhoto: bookingData.providerAvatar,
                price: bookingData.price,
                duration: bookingData.duration,
                rating: bookingData.providerRating,
                reviewCount: bookingData.providerReviewCount,
                languages: bookingData.providerLanguages,
                languagesSpoken: bookingData.providerLanguages,
                specialties: bookingData.providerSpecialties,
                phone: '', // À compléter si disponible
                email: '', // À compléter si disponible
                isActive: true,
                isApproved: true
              };
              
              const serviceInfo = reconstructServiceData(reconstructedProvider);
              
              setState({
                isLoading: false,
                error: null,
                provider: reconstructedProvider,
                serviceData: serviceInfo
              });
              return;
            }
          } catch (parseError) {
            console.error('❌ Erreur parsing bookingRequest:', parseError);
          }
        }

        // 4. Aucune donnée trouvée
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
   * Normalise les données du provider pour assurer la cohérence
   */
  const normalizeProviderData = (providerData: Provider): Provider => {
    return {
      id: providerData.id,
      fullName: providerData.fullName || providerData.name || `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Expert',
      name: providerData.name || providerData.fullName || 'Expert',
      firstName: providerData.firstName || '',
      lastName: providerData.lastName || '',
      role: providerData.role || providerData.type || 'expat',
      type: providerData.type || providerData.role || 'expat',
      country: providerData.country || providerData.currentCountry || '',
      currentCountry: providerData.currentCountry || providerData.country || '',
      avatar: providerData.avatar || providerData.profilePhoto || '/default-avatar.png',
      profilePhoto: providerData.profilePhoto || providerData.avatar || '/default-avatar.png',
      email: providerData.email || '',
      phone: providerData.phone || providerData.phoneNumber || '',
      phoneNumber: providerData.phoneNumber || providerData.phone || '',
      whatsapp: providerData.whatsapp || providerData.whatsAppNumber || '',
      whatsAppNumber: providerData.whatsAppNumber || providerData.whatsapp || '',
      languagesSpoken: providerData.languagesSpoken || providerData.languages || [],
      languages: providerData.languages || providerData.languagesSpoken || [],
      preferredLanguage: providerData.preferredLanguage || 'fr',
      price: providerData.price || (providerData.role === 'lawyer' || providerData.type === 'lawyer' ? 49 : 19),
      duration: providerData.duration || (providerData.role === 'lawyer' || providerData.type === 'lawyer' ? 20 : 30),
      rating: providerData.rating || 5.0,
      reviewCount: providerData.reviewCount || 0,
      specialties: providerData.specialties || [],
      isActive: providerData.isActive !== false,
      isApproved: providerData.isApproved !== false
    };
  };

  /**
   * Reconstruit les données de service à partir du provider
   */
  const reconstructServiceData = (provider: Provider): ServiceData => {
    const providerRole = provider.role || provider.type || 'expat';
    const baseAmount = provider.price || (providerRole === 'lawyer' ? 49 : 19);
    const duration = provider.duration || (providerRole === 'lawyer' ? 20 : 30);
    
    // Calcul des commissions (20% pour la plateforme)
    const commissionRate = 0.20;
    const commissionAmount = Math.round(baseAmount * commissionRate * 100) / 100;
    const providerAmount = Math.round((baseAmount - commissionAmount) * 100) / 100;
    
    return {
      providerId: provider.id,
      serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
      providerRole: providerRole,
      amount: baseAmount,
      duration: duration,
      clientPhone: '', // Sera rempli par CallCheckout
      commissionAmount: commissionAmount,
      providerAmount: providerAmount
    };
  };

  const handleGoBack = (): void => {
    // Essayer de retourner à la page précédente
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback vers la liste des experts
      navigate('/experts');
    }
  };

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center max-w-lg mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Chargement</h2>
          <p className="text-gray-600">
            Préparation de votre consultation...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error || !state.provider || !state.serviceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center max-w-lg mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Données manquantes</h2>
          <p className="text-gray-600 mb-6">
            {state.error || 'Les informations de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.'}
          </p>
          
          {/* Debug info en développement */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
              <h3 className="font-semibold text-gray-800 mb-2">Debug Info:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Provider ID: {providerId || 'Non fourni'}</div>
                <div>Provider Data: {state.provider ? '✅ Trouvé' : '❌ Manquant'}</div>
                <div>Service Data: {state.serviceData ? '✅ Trouvé' : '❌ Manquant'}</div>
                <div>Location State: {location.state ? '✅ Présent' : '❌ Vide'}</div>
                <div>SessionStorage Provider: {sessionStorage.getItem('selectedProvider') ? '✅ Présent' : '❌ Vide'}</div>
                <div>SessionStorage Service: {sessionStorage.getItem('serviceData') ? '✅ Présent' : '❌ Vide'}</div>
                <div>SessionStorage Booking: {sessionStorage.getItem('bookingRequest') ? '✅ Présent' : '❌ Vide'}</div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/experts')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
            >
              Retour à la sélection d'experts
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success - render CallCheckout with data
  return (
    <CallCheckout
      selectedProvider={state.provider}
      serviceData={state.serviceData}
      onGoBack={handleGoBack}
    />
  );
};

export default CallCheckoutWrapper;