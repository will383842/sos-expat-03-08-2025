import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Clock, Shield, Check, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { createPaymentRecord, logAnalyticsEvent } from '../utils/firestore';
import { initiateCall } from '../services/api';
import { notifyProviderOfMissedCall } from '../services/notificationService';

// Types pour améliorer la sécurité des types
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

type StepType = 'payment' | 'calling' | 'completed';

const CallCheckout: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useApp();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiryDate, setExpiryDate] = useState('12/25');
  const [cvc, setCvc] = useState('123');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      const currentUrl = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }
    
    if (providerId) {
      loadProviderAndSettings();
    }
  }, [providerId, user, authLoading, navigate]);

  // Fonction utilitaire pour créer un provider à partir des données de session
  const createProviderFromData = (data: any, dataType: 'selectedProvider' | 'bookingRequest'): Provider => {
    if (dataType === 'selectedProvider') {
      return {
        id: data.id,
        fullName: data.name,
        firstName: data.firstName || data.name.split(' ')[0],
        lastName: data.lastName || data.name.split(' ')[1],
        role: data.type as 'lawyer' | 'expat',
        country: data.country,
        currentCountry: data.country,
        avatar: data.avatar,
        profilePhoto: data.avatar,
        email: data.email || `${data.firstName?.toLowerCase() || 'expert'}@example.com`,
        phone: data.phone || '+33612345678'
      };
    } else {
      return {
        id: data.providerId,
        fullName: data.providerName,
        firstName: data.providerName.split(' ')[0],
        lastName: data.providerName.split(' ')[1],
        role: data.providerType as 'lawyer' | 'expat',
        country: data.providerCountry,
        currentCountry: data.providerCountry,
        avatar: data.providerAvatar,
        profilePhoto: data.providerAvatar,
        email: data.providerEmail || `${data.providerName.split(' ')[0]?.toLowerCase() || 'expert'}@example.com`,
        phone: data.providerPhone || '+33612345678'
      };
    }
  };

  // Fonction utilitaire pour récupérer les données depuis sessionStorage
  const getSessionData = (key: string) => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error parsing ${key} data:`, error);
      return null;
    }
  };

  const loadProviderAndSettings = () => {
    try {
      let currentProvider: Provider | null = null;
      
      // Récupérer les données du prestataire depuis sessionStorage
      const savedProvider = getSessionData('selectedProvider');
      if (savedProvider && savedProvider.id === providerId) {
        currentProvider = createProviderFromData(savedProvider, 'selectedProvider');
      }
      
      // Si pas trouvé, essayer depuis bookingRequest
      if (!currentProvider) {
        const savedRequest = getSessionData('bookingRequest');
        if (savedRequest && savedRequest.providerId === providerId) {
          currentProvider = createProviderFromData(savedRequest, 'bookingRequest');
        }
      }
      
      // Si toujours pas trouvé, c'est une erreur
      if (!currentProvider) {
        throw new Error('Prestataire non trouvé. Veuillez sélectionner un prestataire depuis la liste.');
      }

      // Mise à jour du rôle depuis les paramètres URL
      const typeParam = searchParams.get('type');
      if (typeParam === 'lawyer' || typeParam === 'expat') {
        currentProvider.role = typeParam;
      }
      
      setProvider(currentProvider);
      
      // Récupération des données de réservation
      const bookingRequest = getSessionData('bookingRequest');
      const clientPhone = bookingRequest?.clientPhone || user?.phone || '';
      
      // Configuration des prix et durées
      const isLawyer = currentProvider.role === 'lawyer';
      const baseAmount = bookingRequest?.price || (isLawyer ? 49 : 19);
      const duration = bookingRequest?.duration || (isLawyer ? 20 : 30);
      const commissionAmount = isLawyer ? 9 : 5;
      const providerAmount = baseAmount - commissionAmount;
      
      setServiceData({
        providerId: currentProvider.id,
        serviceType: isLawyer ? 'lawyer_call' : 'expat_call',
        providerRole: currentProvider.role,
        amount: baseAmount,
        duration: duration,
        clientPhone: clientPhone,
        commissionAmount,
        providerAmount
      });

    } catch (error) {
      console.error('Error loading provider and settings:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentAuthorized = async (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId);
    
    try {
      const bookingRequest = getSessionData('bookingRequest');
      const clientPhone = bookingRequest?.clientPhone || user?.phone || '';
      
      if (!serviceData || !user || !provider) {
        throw new Error('Missing required data for payment');
      }
      
      await createPaymentRecord({
        paymentIntentId: paymentIntentId,
        clientId: user.id || '',
        providerId: serviceData.providerId,
        amount: serviceData.amount,
        platformFee: serviceData.commissionAmount,
        providerAmount: serviceData.providerAmount,
        status: 'authorized',
        currency: 'eur',
        serviceType: serviceData.serviceType,
        clientEmail: user.email || '',
        clientName: `${user.firstName || ''} ${user.lastName || ''}`,
        providerName: provider.fullName,
        description: `Paiement pour ${serviceData.serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'}`
      });
      
      await initiateCall({
        clientId: user.id || '',
        providerId: serviceData.providerId,
        clientPhone: serviceData.clientPhone || clientPhone,
        providerPhone: provider.phone,
        providerType: provider.role === 'lawyer' ? 'lawyer' : 'expat',
        clientLanguage: user.preferredLanguage || language || 'fr',
        providerLanguage: provider.preferredLanguage || 'fr',
        paymentIntentId: paymentIntentId,
      });
      
      logAnalyticsEvent({
        eventType: 'payment_authorized',
        userId: user.id || '',
        eventData: {
          paymentIntentId,
          amount: serviceData.amount,
          serviceType: serviceData.serviceType,
          providerId: serviceData.providerId
        }
      });
    } catch (error) {
      console.error('Error recording payment in Firestore:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        paymentIntentId,
        userId: user?.id,
        providerId: serviceData?.providerId,
        amount: serviceData?.amount
      });
    }
    
    setCurrentStep('calling');
    setCallProgress(1);
  };
  
  const handlePaymentError = (error: string) => {
    setError(`Erreur de paiement: ${error}`);
  };

  // Fonction utilitaire pour récupérer les données de provider pour la navigation
  const getProviderDataForNavigation = () => {
    const savedProvider = getSessionData('selectedProvider');
    const savedRequest = getSessionData('bookingRequest');
    
    let providerName = provider?.fullName || 'Expert';
    let providerType = provider?.role || serviceData?.providerRole || 'expat';
    
    if (savedProvider) {
      providerName = savedProvider.name;
      providerType = savedProvider.type;
    } else if (savedRequest) {
      providerName = savedRequest.providerName;
      providerType = savedRequest.providerType;
    }
    
    return { providerName, providerType };
  };

  const handleCallCompleted = (success: boolean) => {
    setCurrentStep('completed');
    
    // 🔔 Si l'appel a échoué, notifier le prestataire
    if (!success && provider && user) {
      notifyProviderOfMissedCall(
        provider.id,
        {
          name: `${user.firstName} ${user.lastName}`,
          country: user.currentCountry || 'Non spécifié'
        },
        {
          attempts: 3,
          lastAttemptTime: new Date()
        }
      ).catch(error => {
        console.error('Erreur notification appel manqué:', error);
      });
    }
    
    try {
      if (user && paymentIntentId && serviceData) {
        logAnalyticsEvent({
          eventType: success ? 'call_completed' : 'call_failed',
          userId: user.id,
          eventData: {
            paymentIntentId,
            success,
            providerId: serviceData.providerId
          }
        });
      }
    } catch (error) {
      console.error('Error updating call status in Firestore:', error);
    }
    
    if (!serviceData) {
      console.error('Service data is missing for navigation');
      return;
    }
    
    const { providerName, providerType } = getProviderDataForNavigation();
    
    const baseParams = {
      call: success ? 'success' : 'failed',
      paymentIntentId: paymentIntentId,
      amount: serviceData.amount.toString(),
      serviceType: serviceData.serviceType,
      providerId: serviceData.providerId,
      providerRole: providerType
    };
    
    const successParams = success ? {
      ...baseParams,
      providerName: providerName,
      platformFee: serviceData.commissionAmount.toString(),
      providerAmount: serviceData.providerAmount.toString(),
      duration: serviceData.duration.toString()
    } : baseParams;
    
    const searchParams = new URLSearchParams(successParams);
    navigate(`/payment-success?${searchParams.toString()}`, { replace: true });
  };

  // Early returns pour les états d'erreur et de chargement
  if (!user) {
    navigate('/login');
    return null;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <LoadingSpinner size="large" color="red" />
          <p className="mt-4 text-gray-600">Chargement des informations...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h1 className="text-xl font-bold text-red-700 mb-4">Une erreur est survenue</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            <Button onClick={() => navigate('/prestataires')}>
              Retourner à la liste des experts
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!provider || !serviceData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Prestataire non trouvé
            </h1>
            <button
              onClick={() => navigate('/prestataires')}
              className="text-red-600 hover:text-red-700"
            >
              Retour aux experts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Rendu principal du composant
  const isLawyer = provider.role === 'lawyer';
  const stepTitles: Record<StepType, string> = {
    payment: 'Paiement sécurisé',
    calling: 'Mise en relation en cours',
    completed: 'Appel terminé'
  };
  
  const stepDescriptions: Record<StepType, string> = {
    payment: 'Autorisez le paiement pour lancer l\'appel',
    calling: 'Connexion avec votre expert',
    completed: 'Merci d\'avoir utilisé nos services'
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/prestataires')}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour aux experts</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {stepTitles[currentStep]}
              </h1>
              <p className="text-gray-600">
                {stepDescriptions[currentStep]}
              </p>
            </div>
          </div>

          {/* Provider Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center space-x-4">
              <img
                src={provider.avatar || provider.profilePhoto || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2'}
                alt={provider.fullName}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {provider.fullName}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isLawyer 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {isLawyer ? 'Avocat certifié' : 'Expatrié expert'}
                  </span>
                  <span>{provider.country || provider.currentCountry}</span>
                  <div className="flex items-center space-x-1">
                    <Clock size={14} />
                    <span>{isLawyer ? '20 min' : '30 min'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">
                  €{serviceData.amount}
                </div>
                <div className="text-sm text-gray-500">
                  {isLawyer ? '20 minutes' : '30 minutes'}
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {currentStep === 'payment' && (
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de carte
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 bg-white"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date d'expiration
                      </label>
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 bg-white"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code de sécurité (CVC)
                      </label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 bg-white"
                        placeholder="123"
                        maxLength={3}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Détail du paiement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Service</span>
                        <span>{serviceData.serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frais de mise en relation</span>
                        <span>{serviceData.commissionAmount.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Montant consultation</span>
                        <span>{serviceData.providerAmount.toFixed(2)} €</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-medium">
                        <span>Total</span>
                        <span>{serviceData.amount.toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handlePaymentAuthorized('pi_mock_' + Date.now())}
                  fullWidth
                  size="large"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Shield size={20} className="mr-2" />
                  Autoriser le paiement
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    En autorisant ce paiement, vous acceptez nos <Link to="/cgu-clients" className="text-blue-600 hover:text-blue-700 underline">conditions générales de vente</Link>.
                    Aucun débit ne sera effectué sans mise en relation réussie.<br />
                    <span className="font-medium">Prix: {isLawyer ? '49€ pour 20 minutes' : '19€ pour 30 minutes'}</span>
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'calling' && (
              <div className="p-8 text-center">
                <div className="animate-pulse mb-6">
                  <Phone size={48} className={`mx-auto ${isLawyer ? 'text-blue-600' : 'text-green-600'} mb-4`} />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {isLawyer ? 'Appel avocat en cours...' : 'Appel expatrié en cours...'}
                  </h2>
                  <p className="text-gray-600">
                    {callProgress < 3 
                      ? `Nous contactons ${provider.fullName}. Veuillez patienter.` 
                      : callProgress === 3 
                        ? `${provider.fullName} a répondu! Nous vous appelons...` 
                        : callProgress === 4 
                          ? 'Connexion établie! Appel en cours...' 
                          : 'Appel en cours...'}
                  </p>
                </div>
                
                <div className="space-y-4 mb-6">
                  {callProgress < 3 && (
                    <div className="bg-yellow-100 rounded-lg p-4 flex items-center">
                      <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                      <span className="text-yellow-800">Tentative d'appel du prestataire ({callProgress + 1}/3)</span>
                    </div>
                  )}
                  
                  {callProgress === 3 && (
                    <div className="bg-blue-100 rounded-lg p-4 flex items-center">
                      <Phone className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-blue-800">{provider.fullName} a répondu! Nous vous appelons...</span>
                    </div>
                  )}
                  
                  {callProgress >= 4 && (
                    <div className="bg-green-100 rounded-lg p-4 flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800">Connexion établie! Appel en cours - {isLawyer ? '20' : '30'} minutes</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  {callProgress < 5 ? (
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isLawyer ? 'border-blue-600' : 'border-green-600'} mx-auto`}></div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="bg-gray-200 w-full max-w-md h-4 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full flex items-center justify-center text-xs text-white" style={{ width: '80%' }}>
                          {isLawyer ? '16:00 / 20:00' : '24:00 / 30:00'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentStep === 'payment' && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Paiement sécurisé</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Votre paiement est traité de manière sécurisée.
                    Vous ne serez débité que si la mise en relation téléphonique réussit.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CallCheckout;