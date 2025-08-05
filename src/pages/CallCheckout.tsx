import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Clock, Shield, Check, AlertCircle, CreditCard, Lock, User, Calendar, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { functions } from '../config/firebase';
import { httpsCallable, HttpsCallable } from 'firebase/functions';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

// Types cohérents avec CallCheckoutWrapper
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

interface User {
  uid: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fullName?: string;
}

interface PaymentIntentData {
  amount: number;
  currency: string;
  providerId: string;
  clientId: string;
  serviceType: string;
}

interface PaymentIntentResponse {
  data: {
    clientSecret: string;
    paymentIntentId: string;
    status: string;
  };
}

interface CreateAndScheduleCallData {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  providerType: string;
  serviceType: string;
  amount: number;
  duration: number;
  paymentIntentId: string;
}

type StepType = 'payment' | 'calling' | 'completed';

// Props du composant
interface CallCheckoutProps {
  selectedProvider: Provider;
  serviceData: ServiceData;
  onGoBack?: () => void;
}

// Composant de bouton personnalisé
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  type = 'button', 
  fullWidth = false 
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      disabled 
        ? 'bg-gray-400 text-white cursor-not-allowed' 
        : 'bg-red-600 hover:bg-red-700 text-white'
    } ${fullWidth ? 'w-full' : ''} ${className}`}
  >
    {children}
  </button>
);

// Composant de spinner de chargement
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'red' | 'white';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', color = 'red' }) => {
  const sizeClass = size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-8 h-8' : 'w-6 h-6';
  const colorClass = color === 'white' ? 'border-white border-t-transparent' : 'border-red-600 border-t-transparent';
  
  return (
    <div className={`animate-spin rounded-full border-2 ${sizeClass} ${colorClass}`}></div>
  );
};

// Style moderne pour Stripe CardElement
const cardStyle = {
  style: {
    base: {
      fontSize: '18px',
      color: '#1a202c',
      letterSpacing: '0.025em',
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
      fontWeight: '500',
      '::placeholder': { 
        color: '#a0aec0',
        fontWeight: '400'
      },
      iconColor: '#4F46E5',
    },
    invalid: { 
      color: '#e53e3e',
      iconColor: '#e53e3e'
    },
    complete: {
      color: '#38a169',
      iconColor: '#38a169'
    }
  },
};

// Composant interne pour le formulaire de paiement avec Stripe
interface PaymentFormProps {
  user: User;
  provider: Provider;
  service: ServiceData;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ 
  user, 
  provider, 
  service, 
  onSuccess, 
  onError, 
  isProcessing, 
  setIsProcessing 
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handlePaymentSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    
    if (!stripe || !elements || !user?.uid) {
      onError('Configuration de paiement invalide');
      return;
    }

try {
  setIsProcessing(true);

  // 1. Créer le PaymentIntent via Firebase Function
  const createPaymentIntent: HttpsCallable<PaymentIntentData, PaymentIntentResponse> =
    httpsCallable(functions, 'createPaymentIntent');
  const paymentResponse = await createPaymentIntent({
    amount: service.amount * 100, // Convertir en centimes
    currency: 'eur',
    providerId: provider.id,
    clientId: user.uid,
    serviceType: service.serviceType,
    commissionAmount: Math.round(service.commissionAmount * 100),
    providerAmount: Math.round(service.providerAmount * 100),
  });

  console.log("🧪 paymentResponse reçu :", paymentResponse);
  const clientSecret = paymentResponse.data.clientSecret;

  // 2. Confirmer le paiement avec Stripe
  const cardElement = elements.getElement(CardElement);
  if (!cardElement) {
    throw new Error('Élément de carte non trouvé');
  }

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Erreur de paiement');
  }

  if (!paymentIntent) {
    throw new Error("Le paiement a échoué (pas de PaymentIntent)");
  }

  if (paymentIntent.status === 'succeeded') {
    console.log("✅ Paiement réussi :", paymentIntent.id);
  } else if (paymentIntent.status === 'processing') {
    console.warn("⚠️ Paiement en cours de traitement :", paymentIntent.id);
    toast.info("Votre paiement est en cours de traitement. Vous recevrez une confirmation sous peu.");
  } else {
    throw new Error(`Le paiement a échoué. Statut : ${paymentIntent.status}`);
  }

  // 3. Programmer l'appel via Firebase Function
  const createAndScheduleCall: HttpsCallable<CreateAndScheduleCallData, { success: boolean }> =
    httpsCallable(functions, 'createAndScheduleCall');
  await createAndScheduleCall({
    providerId: provider.id,
    clientId: user.uid,
    providerPhone: provider.phoneNumber || provider.phone || '',
    clientPhone: service.clientPhone || user.phone || '',
    providerType: provider.role || provider.type || 'expat',
    serviceType: service.serviceType,
    amount: service.amount,
    duration: service.duration,
    paymentIntentId: paymentIntent.id,
  });

  onSuccess(paymentIntent.id);

} catch (error: unknown) {
  console.error('❌ Erreur lors du paiement:', error);
  const errorMessage = error instanceof Error
    ? error.message
    : 'Une erreur est survenue lors du paiement';
  onError(errorMessage);
} finally {
  setIsProcessing(false);
}

  };

  return (
    <form onSubmit={handlePaymentSubmit} className="space-y-6">
      {/* Stripe Card Element avec style moderne */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Informations de carte bancaire</span>
          </div>
        </label>
        <div className="relative">
          <div className="p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-white via-gray-50 to-white shadow-inner focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:shadow-lg transition-all duration-300">
            <CardElement options={cardStyle} />
          </div>
          {/* Icônes de cartes acceptées */}
          <div className="absolute -bottom-3 right-3 flex space-x-1 bg-white px-2 py-1 rounded-full shadow-sm border">
            <div className="w-6 h-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded text-white text-xs flex items-center justify-center font-bold">V</div>
            <div className="w-6 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">M</div>
            <div className="w-6 h-4 bg-gradient-to-r from-green-600 to-teal-600 rounded text-white text-xs flex items-center justify-center font-bold">A</div>
          </div>
        </div>
      </div>

      {/* Détail du paiement avec design amélioré */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 backdrop-blur-sm rounded-xl p-5 border border-gray-200">
        <h4 className="font-bold text-gray-900 mb-4 text-base flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          Détail du paiement
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Client</span>
            <span className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Expert</span>
            <div className="flex items-center space-x-2">
              <img 
                src={provider.avatar || provider.profilePhoto || '/default-avatar.png'} 
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.fullName || provider.name || 'Expert')}&size=50`;
                }}
                alt="Avatar expert"
              />
              <span className="font-semibold text-gray-900">{provider.fullName || provider.name}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Service</span>
            <span className="font-medium text-gray-800">
              {service.serviceType === 'lawyer_call' ? 'Consultation Avocat' : 'Consultation Expatrié'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Durée</span>
            <span className="font-medium text-gray-800">{service.duration} minutes</span>
          </div>
          <div className="border-t border-gray-300 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Frais de service</span>
              <span className="font-medium text-gray-800">{service.commissionAmount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-600">Consultation</span>
              <span className="font-medium text-gray-800">{service.providerAmount.toFixed(2)} €</span>
            </div>
          </div>
          <div className="border-t-2 border-gray-400 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                {service.amount.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton de paiement moderne */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-5 rounded-xl font-bold text-white text-lg transition-all duration-300 transform relative overflow-hidden ${
          (!stripe || isProcessing)
            ? 'bg-gray-400 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:to-pink-700 hover:scale-105 active:scale-95 shadow-xl hover:shadow-red-500/30'
        }`}
      >
        {/* Effet de brillance */}
        {!isProcessing && stripe && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000"></div>
        )}
        
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-3">
            <LoadingSpinner size="small" color="white" />
            <span>Traitement sécurisé...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-3">
            <Lock className="w-6 h-6" />
            <span>Payer {service.amount}€ et lancer la consultation</span>
          </div>
        )}
      </button>

      {/* Informations légales */}
      <div className="space-y-2 text-xs text-gray-500 text-center">
        <p>
          En validant ce paiement, vous acceptez nos{' '}
          <button type="button" className="text-blue-600 underline font-medium">
            conditions générales
          </button>
        </p>
        <p className="text-green-600 font-medium">
          ✓ Remboursement intégral si la mise en relation échoue
        </p>
      </div>

      {/* Badge de sécurité */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 rounded-full border border-green-200/50">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-xs font-bold text-gray-700">Paiement sécurisé par Stripe</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </form>
  );
};

const CallCheckout: React.FC<CallCheckoutProps> = ({ 
  selectedProvider, 
  serviceData, 
  onGoBack 
}) => {
  const { user } = useAuth();
  
  // 🔧 FONCTION HANDLEGOBACK DÉFINIE EN PREMIER
  const handleGoBack = (): void => {
    if (onGoBack) {
      onGoBack();
    } else {
      // Fallback - redirection vers la page d'accueil
      window.location.href = '/';
    }
  };

  // 🔍 RÉCUPÉRATION DES DONNÉES DEPUIS PLUSIEURS SOURCES
  const getProviderFromSources = (): Provider | null => {
    // 1. Props (priorité haute)
    if (selectedProvider && selectedProvider.id) {
      console.log('✅ Provider trouvé via props:', selectedProvider);
      return selectedProvider;
    }

    // 2. SessionStorage (priorité moyenne)
    try {
      const savedProvider = sessionStorage.getItem('selectedProvider');
      if (savedProvider) {
        const providerData = JSON.parse(savedProvider) as Provider;
        if (providerData && providerData.id) {
          console.log('✅ Provider trouvé via sessionStorage:', providerData);
          return providerData;
        }
      }
    } catch (error) {
      console.error('❌ Erreur parsing sessionStorage provider:', error);
    }

    // 3. Location state (priorité basse)
    try {
      const locationState = (window as any).history?.state?.usr;
      if (locationState?.selectedProvider?.id) {
        console.log('✅ Provider trouvé via location state:', locationState.selectedProvider);
        return locationState.selectedProvider as Provider;
      }
    } catch (error) {
      console.error('❌ Erreur récupération location state:', error);
    }

    console.warn('⚠️ Aucun provider trouvé dans toutes les sources');
    return null;
  };

  const getServiceFromSources = (): ServiceData | null => {
    // 1. Props (priorité haute)
    if (serviceData && serviceData.amount) {
      console.log('✅ Service trouvé via props:', serviceData);
      return serviceData;
    }

    // 2. SessionStorage (priorité moyenne)
    try {
      const savedService = sessionStorage.getItem('serviceData');
      if (savedService) {
        const serviceInfo = JSON.parse(savedService) as ServiceData;
        if (serviceInfo && serviceInfo.amount) {
          console.log('✅ Service trouvé via sessionStorage:', serviceInfo);
          return serviceInfo;
        }
      }
    } catch (error) {
      console.error('❌ Erreur parsing sessionStorage service:', error);
    }

    // 3. Reconstruction depuis provider (fallback)
    const provider = getProviderFromSources();
    if (provider && (provider.price || provider.price === 0)) {
      const price = provider.price || (provider.role === 'lawyer' || provider.type === 'lawyer' ? 49 : 19);
      const duration = provider.duration || (provider.role === 'lawyer' || provider.type === 'lawyer' ? 20 : 30);
      
      const reconstructedService: ServiceData = {
        providerId: provider.id,
        serviceType: (provider.role || provider.type) === 'lawyer' ? 'lawyer_call' : 'expat_call',
        providerRole: (provider.role || provider.type || 'expat') as 'lawyer' | 'expat',
        amount: price,
        duration: duration,
        clientPhone: user?.phone || '',
        commissionAmount: Math.round(price * 0.2 * 100) / 100,
        providerAmount: Math.round(price * 0.8 * 100) / 100
      };
      console.log('✅ Service reconstruit depuis provider:', reconstructedService);
      return reconstructedService;
    }

    console.warn('⚠️ Aucun service trouvé dans toutes les sources');
    return null;
  };

  // 🔍 AJOUT DE LOGS POUR DEBUG
  useEffect(() => {
    console.log('CallCheckout - Props reçues:', {
      selectedProvider,
      serviceData,
      user: user ? { uid: user.uid, firstName: user.firstName } : null
    });
  }, [selectedProvider, serviceData, user]);

  // 🔒 RÉCUPÉRATION SÉCURISÉE DES DONNÉES
  const provider = getProviderFromSources();
  const service = getServiceFromSources();

  // State management
  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [callId] = useState<string>('call_' + Date.now());

  // 🚨 EARLY RETURN SI DONNÉES MANQUANTES
  if (!provider || !service) {
    console.error('CallCheckout - Données manquantes:', { provider, service });
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center max-w-lg mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-6">
            Les données de consultation sont manquantes. Veuillez sélectionner à nouveau un expert.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/experts'}
              fullWidth
              className="bg-red-600 hover:bg-red-700"
            >
              Retour à la sélection d'experts
            </Button>
            <Button 
              onClick={handleGoBack}
              fullWidth
              className="bg-gray-600 hover:bg-gray-700"
            >
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Gestion de la progression d'appel
  useEffect(() => {
    if (currentStep === 'calling' && callProgress < 5) {
      const timer = setTimeout(() => {
        setCallProgress(prev => prev + 1);
        
        // Transition automatique vers "completed" après progression complète
        if (callProgress === 4) {
          setTimeout(() => {
            setCurrentStep('completed');
          }, 5000);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, callProgress]);

  const handlePaymentSuccess = (paymentIntentId: string): void => {
    setPaymentIntentId(paymentIntentId);
    setCurrentStep('calling');
    setCallProgress(1);
    console.log(`✅ Paiement réussi, appel programmé avec ${provider.fullName || provider.name}`);
  };

  const handlePaymentError = (errorMessage: string): void => {
    setError(errorMessage);
  };

  const isLawyer = (provider?.role || provider?.type) === 'lawyer';
  const stepTitles: Record<StepType, string> = {
    payment: 'Paiement sécurisé',
    calling: 'Mise en relation en cours',
    completed: 'Consultation terminée'
  };
  
  const stepDescriptions: Record<StepType, string> = {
    payment: 'Autorisez le paiement pour lancer la consultation',
    calling: 'Connexion avec votre expert en cours',
    completed: 'Merci d\'avoir utilisé nos services'
  };

  // Vérification de l'utilisateur connecté
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center max-w-lg mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600 mb-6">
            Vous devez être connecté pour accéder au paiement et lancer une consultation.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/login'}
              fullWidth
              className="bg-red-600 hover:bg-red-700"
            >
              Se connecter
            </Button>
            <Button 
              onClick={handleGoBack}
              fullWidth
              className="bg-gray-600 hover:bg-gray-700"
            >
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 mb-4 transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            <span>Retour</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {stepTitles[currentStep]}
            </h1>
            <p className="text-gray-600 text-sm">
              {stepDescriptions[currentStep]}
            </p>
          </div>
        </div>

        {/* Provider Info avec photo visible */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-shrink-0">
              <img
                src={provider?.avatar || provider?.profilePhoto || '/default-avatar.png'}
                alt={`Photo de profil de ${provider?.fullName || provider?.name || 'Expert'}`}
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-white shadow-lg"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(provider?.fullName || provider?.name || 'Expert')}&size=150&background=4F46E5&color=fff`;
                }}
              />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {provider?.fullName || provider?.name || 'Expert non défini'}
              </h3>
              <div className="flex items-center space-x-2 text-sm mt-1">
                <span className={`px-3 py-1 rounded-full font-medium text-xs ${
                  isLawyer 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isLawyer ? 'Avocat certifié' : 'Expert expatriation'}
                </span>
                <span className="text-gray-600 text-sm">{provider?.country || 'Non spécifié'}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2">
                <Clock size={14} />
                <span>{service?.duration || 0} minutes</span>
                <span>•</span>
                <span className="text-green-600 font-medium">Disponible maintenant</span>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                {service?.amount || 0}€
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {service?.duration || 0} min
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20">
          {currentStep === 'payment' && (
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Paiement par carte</h4>
              </div>

              {/* Affichage des erreurs */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {/* Formulaire de paiement Stripe */}
              <Elements stripe={stripePromise}>
                <PaymentForm
                  user={user}
                  provider={provider}
                  service={service}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                />
              </Elements>
            </div>
          )}

          {currentStep === 'calling' && (
            <div className="p-6 text-center">
              <div className="mb-6">
                <Phone size={40} className={`mx-auto ${isLawyer ? 'text-blue-600' : 'text-green-600'} mb-4 animate-pulse`} />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Mise en relation en cours
                </h2>
                <p className="text-gray-600 text-sm">
                  {callProgress < 3 
                    ? `Nous contactons ${provider?.fullName || provider?.name}...` 
                    : callProgress === 3 
                      ? `${provider?.fullName || provider?.name} a accepté! Préparation de votre appel...` 
                      : callProgress === 4 
                        ? `Connexion établie avec ${provider?.fullName || provider?.name}!` 
                        : `Consultation en cours avec ${provider?.fullName || provider?.name}...`}
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-green-100 rounded-lg p-3 flex items-center text-sm">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-green-800">Paiement confirmé</span>
                </div>
                
                {callProgress >= 2 && (
                  <div className="bg-blue-100 rounded-lg p-3 flex items-center text-sm">
                    <Phone className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-blue-800">{provider?.fullName || provider?.name} a été contacté(e)</span>
                  </div>
                )}
                
                {callProgress >= 4 && (
                  <div className="bg-purple-100 rounded-lg p-3 flex items-center text-sm">
                    <Clock className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-purple-800">Consultation en cours...</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isLawyer ? 'border-blue-600' : 'border-green-600'}`}></div>
              </div>

              {paymentIntentId && (
                <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    ID de transaction: <code className="bg-gray-200 px-1 rounded">{paymentIntentId}</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 'completed' && (
            <div className="p-6 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Consultation terminée
                </h2>
                <p className="text-gray-600 text-sm">
                  Votre consultation avec {provider?.fullName || provider?.name} s'est terminée avec succès.
                </p>
                
                {/* Résumé */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Résumé de la consultation</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Expert:</span>
                      <span className="font-medium">{provider?.fullName || provider?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Durée:</span>
                      <span className="font-medium">{service?.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Montant:</span>
                      <span className="font-medium text-green-600">{service?.amount}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="font-medium">{new Date().toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = `/evaluation/${provider?.id}`}
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  ⭐ Évaluer {provider?.fullName || provider?.name}
                </Button>
                <Button 
                  onClick={() => window.location.href = `/receipt/${paymentIntentId}`}
                  fullWidth
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  📄 Télécharger le reçu
                </Button>
                <Button 
                  onClick={handleGoBack}
                  fullWidth
                  className="bg-red-600 hover:bg-red-700"
                >
                  🏠 Retour à l'accueil
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Messages informatifs */}
        {currentStep === 'payment' && (
          <div className="mt-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Paiement sécurisé</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Vos données de paiement sont protégées par le chiffrement SSL.
                  L'appel sera lancé automatiquement après confirmation du paiement.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallCheckout;