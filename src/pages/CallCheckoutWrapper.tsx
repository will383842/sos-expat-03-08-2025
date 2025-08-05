import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CallCheckout from './CallCheckout';
import { AlertCircle } from 'lucide-react';

interface Provider {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: 'lawyer' | 'expat';
  country: string;
  currentCountry: string;
  avatar: string;
  profilePhoto: string;
  email: string;
  phone: string;
  whatsapp?: string;
  whatsAppNumber?: string;
  phoneNumber?: string;
  languagesSpoken?: string[];
  preferredLanguage?: string;
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

const CallCheckoutWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { providerId } = useParams();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔍 CallCheckoutWrapper - Recherche des données...');
        
        // 1. Essayer location.state d'abord (navigation directe)
        const stateProvider = location.state?.selectedProvider;
        const stateService = location.state?.serviceData;
        
        if (stateProvider && stateService) {
          console.log('✅ Données trouvées dans location.state');
          setProvider(stateProvider);
          setServiceData(stateService);
          setIsLoading(false);
          return;
        }

        // 2. Essayer sessionStorage
        const savedProvider = sessionStorage.getItem('selectedProvider');
        const savedService = sessionStorage.getItem('serviceData');
        
        if (savedProvider && savedService) {
          try {
            const providerData = JSON.parse(savedProvider);
            const serviceInfo = JSON.parse(savedService);
            
            // Vérifier que c'est le bon provider
            if (providerData.id === providerId || !providerId) {
              console.log('✅ Données trouvées dans sessionStorage');
              setProvider(providerData);
              setServiceData(serviceInfo);
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            console.error('❌ Erreur parsing sessionStorage:', parseError);
          }
        }

        // 3. Essayer de reconstruire avec juste le provider
        if (savedProvider) {
          try {
            const providerData = JSON.parse(savedProvider);
            if (providerData.id === providerId || !providerId) {
              console.log('⚙️ Reconstruction des données service...');
              
              const reconstructedService: ServiceData = {
                providerId: providerData.id,
                serviceType: providerData.role === 'lawyer' ? 'lawyer_call' : 'expat_call',
                providerRole: providerData.role,
                amount: providerData.price || 49,
                duration: providerData.duration || 20,
                clientPhone: '',
                commissionAmount: Math.round((providerData.price || 49) * 0.2),
                providerAmount: Math.round((providerData.price || 49) * 0.8)
              };
              
              setProvider(providerData);
              setServiceData(reconstructedService);
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            console.error('❌ Erreur reconstruction service:', parseError);
          }
        }

        // 4. Aucune donnée trouvée
        console.error('❌ Aucune donnée trouvée');
        setError('Les données de consultation sont manquantes');
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [location.state, providerId]);

  const handleGoBack = () => {
    // Essayer de retourner à la page précédente
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback vers la liste des experts
      navigate('/experts');
    }
  };

  // Loading state
  if (isLoading) {
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
  if (error || !provider || !serviceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center max-w-lg mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Données manquantes</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Les informations de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/experts')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Retour à la sélection d'experts
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
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
      selectedProvider={provider}
      serviceData={serviceData}
      onGoBack={handleGoBack}
    />
  );
};

export default CallCheckoutWrapper;