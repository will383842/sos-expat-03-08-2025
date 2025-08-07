import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CallCheckout from './CallCheckout';
import { AlertCircle } from 'lucide-react';
import { Provider, normalizeProvider, createDefaultProvider } from '../types/Provider';

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
            provider: normalizeProvider(stateProvider),
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
            provider: normalizeProvider(savedProviderData),
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
                provider: normalizeProvider(profileData),
                serviceData: reconstructedService
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur parsing providerProfile:', error);
        }

        // 🔧 FIX 5: Essayer autres sources dans sessionStorage
        console.log('🔍 Recherche dans autres sources sessionStorage...');
        const sessionStorageKeys = [
          'providerData',
          'selectedExpert',
          'expertData',
          'consultationData',
          'callData'
        ];

        for (const key of sessionStorageKeys) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              const parsedData = JSON.parse(data);
              if (parsedData && parsedData.id && (!providerId || parsedData.id === providerId)) {
                console.log(`✅ Données trouvées dans ${key}:`, parsedData);
                
                setState({
                  isLoading: false,
                  error: null,
                  provider: normalizeProvider(parsedData),
                  serviceData: reconstructServiceData(parsedData)
                });
                return;
              }
            }
          } catch (error) {
            console.warn(`⚠️ Erreur parsing ${key}:`, error);
          }
        }

        // 🔧 FIX 6: Essayer de récupérer depuis l'historique de navigation
        console.log('🔍 Recherche dans l\'historique de navigation...');
        try {
          const historyState = window.history.state;
          if (historyState) {
            const historyProvider = historyState.selectedProvider || 
                                  historyState.provider || 
                                  historyState.providerData;
            
            if (historyProvider && historyProvider.id && (!providerId || historyProvider.id === providerId)) {
              console.log('✅ Provider trouvé dans history state:', historyProvider);
              
              setState({
                isLoading: false,
                error: null,
                provider: normalizeProvider(historyProvider),
                serviceData: reconstructServiceData(historyProvider)
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur récupération history state:', error);
        }

        // 🔧 FIX 7: Essayer de récupérer depuis localStorage (backup)
        console.log('🔍 Recherche dans localStorage (backup)...');
        try {
          const localStorageKeys = [
            'lastSelectedProvider',
            'recentProvider',
            'currentProvider'
          ];

          for (const key of localStorageKeys) {
            const data = localStorage.getItem(key);
            if (data) {
              const parsedData = JSON.parse(data);
              if (parsedData && parsedData.id && (!providerId || parsedData.id === providerId)) {
                console.log(`✅ Données trouvées dans localStorage ${key}:`, parsedData);
                
                setState({
                  isLoading: false,
                  error: null,
                  provider: normalizeProvider(parsedData),
                  serviceData: reconstructServiceData(parsedData)
                });
                return;
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur récupération localStorage:', error);
        }

        // 🔧 FIX 8: Essayer de récupérer depuis les paramètres URL
        console.log('🔍 Recherche dans les paramètres URL...');
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const providerParam = urlParams.get('provider');
          const serviceParam = urlParams.get('service');
          
          if (providerParam) {
            const providerData = JSON.parse(decodeURIComponent(providerParam));
            if (providerData && providerData.id && (!providerId || providerData.id === providerId)) {
              console.log('✅ Provider trouvé dans les paramètres URL:', providerData);
              
              let serviceData = null;
              if (serviceParam) {
                serviceData = JSON.parse(decodeURIComponent(serviceParam));
              }
              
              setState({
                isLoading: false,
                error: null,
                provider: normalizeProvider(providerData),
                serviceData: serviceData || reconstructServiceData(providerData)
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur récupération paramètres URL:', error);
        }

        // 🔧 FIX 9: Fallback avec données par défaut si providerId fourni
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

        // 🔧 FIX 10: Essayer de reconstruire depuis les données de l'URL elle-même
        console.log('🔍 Tentative de reconstruction depuis l\'URL...');
        try {
          const pathParts = window.location.pathname.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          
          if (lastPart && lastPart.includes('-')) {
            const extractedId = lastPart.split('-').pop();
            if (extractedId && extractedId.length > 5) {
              console.log('✅ ID extrait de l\'URL:', extractedId);
              const reconstructedProvider = createDefaultProvider(extractedId);
              
              setState({
                isLoading: false,
                error: null,
                provider: reconstructedProvider,
                serviceData: reconstructServiceData(reconstructedProvider)
              });
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur reconstruction depuis URL:', error);
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
    return normalizeProvider({
      id: bookingData.providerId || Math.random().toString(36),
      name: bookingData.providerName || 'Expert',
      fullName: bookingData.providerName || 'Expert',
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
      rating: bookingData.providerRating || 4.5,
      reviewCount: bookingData.providerReviewCount || 0,
      specialties: bookingData.providerSpecialties || [],
      description: '',
      bio: '',
      yearsOfExperience: 1,
      isActive: true,
      isApproved: true,
      isVisible: true,
      isBanned: false,
      isOnline: true
    });
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
    const providerAmount = Math.round((baseAmount - commissionAmount) * 100) / 100;
    
    return {
      providerId: bookingData.providerId || Math.random().toString(36),
      serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
      providerRole: providerRole as 'lawyer' | 'expat',
      amount: baseAmount,
      duration: duration,
      clientPhone: bookingData.clientPhone || '',
      commissionAmount: commissionAmount,
      providerAmount: providerAmount
    };
  };

  /**
   * 🔧 NOUVEAU: Sauvegarde sécurisée des données pour session suivante
   */
  const saveDataForSession = (provider: Provider, serviceData: ServiceData) => {
    try {
      // Sauvegarder dans sessionStorage
      sessionStorage.setItem('selectedProvider', JSON.stringify(provider));
      sessionStorage.setItem('serviceData', JSON.stringify(serviceData));
      
      // Sauvegarder dans localStorage comme backup
      localStorage.setItem('lastSelectedProvider', JSON.stringify(provider));
      localStorage.setItem('lastServiceData', JSON.stringify(serviceData));
      
      console.log('💾 Données sauvegardées pour session suivante');
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde session:', error);
    }
  };

  /**
   * 🔧 NOUVEAU: Validation avancée des données provider
   */
  const validateProviderData = (provider: any): boolean => {
    if (!provider) return false;
    
    const requiredFields = ['id'];
    const hasRequiredFields = requiredFields.every(field => provider[field]);
    
    if (!hasRequiredFields) {
      console.warn('⚠️ Provider manque des champs requis:', { provider, requiredFields });
      return false;
    }
    
    // Validation des types
    if (provider.price && (typeof provider.price !== 'number' || provider.price < 0)) {
      console.warn('⚠️ Prix invalid:', provider.price);
      return false;
    }
    
    if (provider.duration && (typeof provider.duration !== 'number' || provider.duration < 0)) {
      console.warn('⚠️ Durée invalid:', provider.duration);
      return false;
    }
    
    return true;
  };

  /**
   * 🔧 NOUVEAU: Validation avancée des données service
   */
  const validateServiceData = (serviceData: any): boolean => {
    if (!serviceData) return false;
    
    const requiredFields = ['providerId', 'amount'];
    const hasRequiredFields = requiredFields.every(field => serviceData[field]);
    
    if (!hasRequiredFields) {
      console.warn('⚠️ ServiceData manque des champs requis:', { serviceData, requiredFields });
      return false;
    }
    
    // Validation des montants
    if (typeof serviceData.amount !== 'number' || serviceData.amount <= 0) {
      console.warn('⚠️ Montant invalid:', serviceData.amount);
      return false;
    }
    
    return true;
  };

  const handleGoBack = (): void => {
    // Essayer de retourner à la page précédente
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // 🔧 FIX: Navigation cohérente avec les autres fichiers
      navigate('/');
    }
  };

  // 🔧 NOUVEAU: Hook pour sauvegarder automatiquement les données valides
  useEffect(() => {
    if (state.provider && state.serviceData && !state.isLoading && !state.error) {
      saveDataForSession(state.provider, state.serviceData);
    }
  }, [state.provider, state.serviceData, state.isLoading, state.error]);

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
          
          {/* Indicateur de progression */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Recherche des données de consultation</p>
          </div>
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
                <div>LocalStorage Backup: {localStorage.getItem('lastSelectedProvider') ? '✅ Présent' : '❌ Vide'}</div>
                <div>Current URL: {window.location.pathname}</div>
                <div>URL Search: {window.location.search}</div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/experts')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
            >
              🔍 Sélectionner un expert
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
            >
              🏠 Retour à l'accueil
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
            >
              ← Retour
            </button>
            
            {/* Bouton pour vider le cache */}
            <button
              onClick={() => {
                sessionStorage.clear();
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors duration-200"
            >
              🗑️ Vider le cache et recharger
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