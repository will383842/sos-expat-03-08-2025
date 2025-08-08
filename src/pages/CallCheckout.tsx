import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Phone, Clock, Shield, Check, AlertCircle, CreditCard, Lock, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { functions } from '../config/firebase';
import { httpsCallable, HttpsCallable } from 'firebase/functions';
import { Provider, normalizeProvider } from '../types/provider';
import Layout from '../components/layout/Layout';

// Initialize Stripe with lazy loading
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

// Performance optimized interfaces
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
  currency?: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerId: string;
  clientId: string;
  clientEmail?: string;
  providerName?: string;
  description?: string;
  commissionAmount: number;
  providerAmount: number;
  callSessionId?: string;
  metadata?: Record<string, string>;
}

interface PaymentIntentResponse {
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  serviceType: string;
  status: string;
  expiresAt: string;
}

interface CreateAndScheduleCallData {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number;
  delayMinutes?: number;
  clientLanguages?: string[];
  providerLanguages?: string[];
}

type StepType = 'payment' | 'calling' | 'completed';

interface CallCheckoutProps {
  selectedProvider: Provider;
  serviceData: ServiceData;
  onGoBack?: () => void;
}

// Optimized Button Component with proper accessibility
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  'aria-label'?: string;
  'data-testid'?: string;
}

const Button: React.FC<ButtonProps> = React.memo(({ 
  children, 
  onClick, 
  disabled = false, 
  className = '', 
  type = 'button', 
  fullWidth = false,
  'aria-label': ariaLabel,
  'data-testid': testId
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    data-testid={testId}
    className={`
      relative px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
      active:scale-[0.98] touch-manipulation
      ${disabled 
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60' 
        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg'
      } 
      ${fullWidth ? 'w-full' : ''} 
      ${className}
    `}
  >
    {children}
  </button>
));

Button.displayName = 'Button';

// Optimized Loading Spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'white' | 'blue';
  'aria-label'?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({ 
  size = 'md', 
  color = 'red',
  'aria-label': ariaLabel = 'Loading'
}) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  const colorClasses = {
    red: 'border-red-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    blue: 'border-blue-500 border-t-transparent'
  };
  
  return (
    <div 
      className={`animate-spin rounded-full border-2 ${sizeClass} ${colorClasses[color]}`}
      role="status"
      aria-label={ariaLabel}
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Optimized Stripe card styles pour champs séparés
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      letterSpacing: '0.025em',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '500',
      '::placeholder': { 
        color: '#9ca3af',
        fontWeight: '400'
      },
    },
    invalid: { 
      color: '#ef4444',
      iconColor: '#ef4444'
    },
    complete: {
      color: '#10b981',
      iconColor: '#10b981'
    }
  },
};

// Main Payment Form Component
interface PaymentFormProps {
  user: User;
  provider: Provider;
  service: ServiceData;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = React.memo(({ 
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

  // Memoized validation functions
  const validatePaymentData = useCallback(() => {
    if (!stripe || !elements || !user?.uid) {
      throw new Error('Configuration de paiement invalide');
    }

    if (provider.id === user.uid) {
      throw new Error('Vous ne pouvez pas vous programmer un appel avec vous-même');
    }

    if (service.amount < 5) {
      throw new Error('Le montant minimum est de 5€ pour une transaction sécurisée');
    }

    if (service.amount > 500) {
      throw new Error('Le montant maximum est de 500€ par transaction');
    }

    const calculatedTotal = Math.round((service.commissionAmount + service.providerAmount) * 100) / 100;
    const amountRounded = Math.round(service.amount * 100) / 100;
    
    if (Math.abs(amountRounded - calculatedTotal) > 0.01) {
      throw new Error('Erreur dans la répartition des montants');
    }
  }, [stripe, elements, user, provider, service]);

  // Optimized payment submission
  const handlePaymentSubmit = useCallback(async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    
    try {
      setIsProcessing(true);
      validatePaymentData();

      // Create PaymentIntent
      const createPaymentIntent: HttpsCallable<PaymentIntentData, PaymentIntentResponse> =
        httpsCallable(functions, 'createPaymentIntent');
      
      const paymentData: PaymentIntentData = {
        amount: service.amount,
        commissionAmount: service.commissionAmount,
        providerAmount: service.providerAmount,
        currency: 'eur',
        serviceType: service.serviceType,
        providerId: provider.id,
        clientId: user.uid,
        clientEmail: user.email || '',
        providerName: provider.fullName || provider.name || '',
        description: `Consultation ${service.serviceType === 'lawyer_call' ? 'avocat' : 'expatriation'}`,
        metadata: {
          providerType: provider.role || provider.type || 'expat',
          duration: service.duration.toString(),
          clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          timestamp: new Date().toISOString()
        }
      };

      const paymentResponse = await createPaymentIntent(paymentData);
      const clientSecret = paymentResponse.data.clientSecret;

      if (!clientSecret) {
        throw new Error('ClientSecret manquant dans la réponse');
      }

      // Confirm payment with Stripe
      const cardNumberElement = elements?.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Élément de numéro de carte non trouvé');
      }

      const { error, paymentIntent } = await stripe?.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email || '',
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur de paiement Stripe');
      }

      if (!paymentIntent) {
        throw new Error('Le paiement a échoué');
      }

      // Validate payment status
      const validStatuses = ['succeeded', 'requires_capture', 'processing'];
      if (!validStatuses.includes(paymentIntent.status)) {
        if (paymentIntent.status === 'requires_action') {
          throw new Error('Une authentification supplémentaire est requise');
        } else if (paymentIntent.status === 'requires_payment_method') {
          throw new Error('Méthode de paiement invalide');
        } else if (paymentIntent.status === 'canceled') {
          throw new Error('Le paiement a été annulé');
        } else {
          throw new Error(`Statut de paiement inattendu: ${paymentIntent.status}`);
        }
      }

      // Schedule call
      const createAndScheduleCall: HttpsCallable<CreateAndScheduleCallData, { success: boolean }> =
        httpsCallable(functions, 'createAndScheduleCall');
      
      const callData: CreateAndScheduleCallData = {
        providerId: provider.id,
        clientId: user.uid,
        providerPhone: provider.phoneNumber || provider.phone || '',
        clientPhone: service.clientPhone || user.phone || '',
        serviceType: service.serviceType,
        providerType: (provider.role || provider.type || 'expat') as 'lawyer' | 'expat',
        paymentIntentId: paymentIntent.id,
        amount: service.amount,
        delayMinutes: 5,
        clientLanguages: ['fr'],
        providerLanguages: provider.languagesSpoken || provider.languages || ['fr']
      };

      await createAndScheduleCall(callData);
      onSuccess(paymentIntent.id);

    } catch (error: unknown) {
      console.error('Payment error:', error);
      
      let errorMessage = 'Une erreur est survenue lors du paiement';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [stripe, elements, user, provider, service, onSuccess, onError, setIsProcessing, validatePaymentData]);

  // Memoized provider display name
  const providerDisplayName = useMemo(() => 
    provider?.fullName || provider?.name || `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim() || 'Expert',
    [provider]
  );

  // Memoized service type display
  const serviceTypeDisplay = useMemo(() => 
    service.serviceType === 'lawyer_call' ? 'Consultation Avocat' : 'Consultation Expatrié',
    [service.serviceType]
  );

  return (
    <form onSubmit={handlePaymentSubmit} className="space-y-4" noValidate>
      {/* Card Input Fields - Champs séparés */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span>Informations de carte bancaire</span>
          </div>
        </label>

        {/* Numéro de carte */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
            Numéro de carte
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CreditCard className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
              <CardNumberElement options={cardElementOptions} />
            </div>
            
            {/* Payment badges */}
            <div className="absolute -bottom-1.5 right-2 flex space-x-1 bg-white px-1.5 py-0.5 rounded-md shadow-sm border border-gray-100">
              <div className="w-5 h-3 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold" aria-label="Visa">V</div>
              <div className="w-5 h-3 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold" aria-label="Mastercard">M</div>
              <div className="w-5 h-3 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold" aria-label="Amex">A</div>
            </div>
          </div>
        </div>

        {/* Date d'expiration et CVC côte à côte */}
        <div className="grid grid-cols-2 gap-3">
          {/* Date d'expiration */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
              Expiration
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                <CardExpiryElement options={cardElementOptions} />
              </div>
            </div>
          </div>

          {/* Code CVC */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
              CVC
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Shield className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                <CardCvcElement options={cardElementOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary - Compact */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Récapitulatif</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Expert</span>
            <div className="flex items-center space-x-2">
              <img 
                src={provider.avatar || provider.profilePhoto || '/default-avatar.png'} 
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(providerDisplayName)}&size=40`;
                }}
                alt=""
                loading="lazy"
              />
              <span className="font-medium text-gray-900 text-xs">{providerDisplayName}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Service</span>
            <span className="font-medium text-gray-800 text-xs">{serviceTypeDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Durée</span>
            <span className="font-medium text-gray-800 text-xs">{service.duration} min</span>
          </div>
          
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Frais de service</span>
              <span className="font-medium text-gray-800 text-xs">{service.commissionAmount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-600">Consultation</span>
              <span className="font-medium text-gray-800 text-xs">{service.providerAmount.toFixed(2)} €</span>
            </div>
          </div>
          
          <div className="border-t-2 border-gray-400 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                {service.amount.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pay Button - Optimized */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`
          w-full py-4 rounded-xl font-bold text-white transition-all duration-300 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
          active:scale-[0.98] touch-manipulation relative overflow-hidden
          ${(!stripe || isProcessing)
            ? 'bg-gray-400 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl'
          }
        `}
        aria-label={`Payer ${service.amount.toFixed(2)}€ et lancer la consultation`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner size="sm" color="white" />
            <span>Traitement sécurisé...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <Lock className="w-5 h-5" aria-hidden="true" />
            <span>Payer {service.amount.toFixed(2)}€</span>
          </div>
        )}
      </button>

      {/* Legal Info - Compact */}
      <div className="space-y-2 text-xs text-gray-600 text-center">
        <p>
          En validant, vous acceptez nos{' '}
          <button type="button" className="text-blue-600 underline font-medium hover:text-blue-700">
            CGU
          </button>
        </p>
        <div className="flex items-center justify-center space-x-1 text-green-600 font-medium">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          <span>Remboursement si échec de connexion</span>
        </div>
      </div>

      {/* Security Badge - Compact */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <Shield className="w-3 h-3 text-green-600" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-700">Sécurisé par Stripe</span>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
        </div>
      </div>
    </form>
  );
});

PaymentForm.displayName = 'PaymentForm';

// Main Component with optimizations
const CallCheckout: React.FC<CallCheckoutProps> = ({ 
  selectedProvider, 
  serviceData, 
  onGoBack 
}) => {
  const { user } = useAuth();
  
  // Memoized data retrieval functions
  const getProviderFromSources = useCallback((): Provider | null => {
    if (selectedProvider?.id) {
      return normalizeProvider(selectedProvider);
    }

    try {
      const savedProvider = sessionStorage.getItem('selectedProvider');
      if (savedProvider) {
        const providerData = JSON.parse(savedProvider) as Provider;
        if (providerData?.id) {
          return normalizeProvider(providerData);
        }
      }
    } catch (error) {
      console.error('Error parsing sessionStorage provider:', error);
    }

    return null;
  }, [selectedProvider]);

  const getServiceFromSources = useCallback((): ServiceData | null => {
    if (serviceData?.amount) {
      return serviceData;
    }

    try {
      const savedService = sessionStorage.getItem('serviceData');
      if (savedService) {
        const serviceInfo = JSON.parse(savedService) as ServiceData;
        if (serviceInfo?.amount) {
          return serviceInfo;
        }
      }
    } catch (error) {
      console.error('Error parsing sessionStorage service:', error);
    }

    const provider = getProviderFromSources();
    if (provider?.price !== undefined) {
      const priceInEuros = provider.price || (provider.role === 'lawyer' || provider.type === 'lawyer' ? 49 : 19);
      const duration = provider.duration || (provider.role === 'lawyer' || provider.type === 'lawyer' ? 20 : 30);
      
      return {
        providerId: provider.id,
        serviceType: (provider.role || provider.type) === 'lawyer' ? 'lawyer_call' : 'expat_call',
        providerRole: (provider.role || provider.type || 'expat') as 'lawyer' | 'expat',
        amount: priceInEuros,
        duration: duration,
        clientPhone: user?.phone || '',
        commissionAmount: Math.round(priceInEuros * 0.2 * 100) / 100,
        providerAmount: Math.round(priceInEuros * 0.8 * 100) / 100
      };
    }

    return null;
  }, [serviceData, getProviderFromSources, user]);

  // Memoized data
  const provider = useMemo(() => getProviderFromSources(), [getProviderFromSources]);
  const service = useMemo(() => getServiceFromSources(), [getServiceFromSources]);

  // State management
  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Optimized handlers
  const handleGoBack = useCallback((): void => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.location.href = '/';
    }
  }, [onGoBack]);

  const handlePaymentSuccess = useCallback((paymentIntentId: string): void => {
    setPaymentIntentId(paymentIntentId);
    setCurrentStep('calling');
    setCallProgress(1);
  }, []);

  const handlePaymentError = useCallback((errorMessage: string): void => {
    setError(errorMessage);
  }, []);

  // Call progress effect
  useEffect(() => {
    if (currentStep === 'calling' && callProgress < 5) {
      const timer = setTimeout(() => {
        setCallProgress(prev => {
          const newProgress = prev + 1;
          if (newProgress === 5) {
            setTimeout(() => setCurrentStep('completed'), 3000);
          }
          return newProgress;
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, callProgress]);

  // Memoized values
  const isLawyer = useMemo(() => (provider?.role || provider?.type) === 'lawyer', [provider]);
  const providerDisplayName = useMemo(() => 
    provider?.fullName || provider?.name || `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim() || 'Expert',
    [provider]
  );

  // Early returns for missing data or user
  if (!provider || !service) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Données manquantes</h2>
            <p className="text-gray-600 text-sm mb-4">
              Veuillez sélectionner à nouveau un expert.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/experts'}
                fullWidth
                aria-label="Retour à la sélection d'experts"
              >
                Sélectionner un expert
              </Button>
              <Button 
                onClick={handleGoBack}
                fullWidth
                className="bg-gray-500 hover:bg-gray-600"
                aria-label="Retour à la page précédente"
              >
                Retour
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Connexion requise</h2>
            <p className="text-gray-600 text-sm mb-4">
              Connectez-vous pour lancer une consultation.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/login'}
                fullWidth
                aria-label="Se connecter"
              >
                Se connecter
              </Button>
              <Button 
                onClick={handleGoBack}
                fullWidth
                className="bg-gray-500 hover:bg-gray-600"
                aria-label="Retour"
              >
                Retour
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-br from-red-50 to-red-100 min-h-[calc(100vh-80px)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Header - Compact */}
          <div className="mb-4">
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 mb-3 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
              aria-label="Retour à la page précédente"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Retour</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {currentStep === 'payment' && 'Paiement sécurisé'}
                {currentStep === 'calling' && 'Mise en relation'}
                {currentStep === 'completed' && 'Consultation terminée'}
              </h1>
              <p className="text-gray-600 text-sm">
                {currentStep === 'payment' && 'Validez pour lancer la consultation'}
                {currentStep === 'calling' && 'Connexion avec votre expert'}
                {currentStep === 'completed' && 'Merci d\'avoir utilisé nos services'}
              </p>
            </div>
          </div>

          {/* Provider Card - Compact */}
          <div className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <img
                  src={provider.avatar || provider.profilePhoto || '/default-avatar.png'}
                  alt={`Photo de ${providerDisplayName}`}
                  className="w-12 h-12 rounded-lg object-cover ring-2 ring-white shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(providerDisplayName)}&size=100&background=4F46E5&color=fff`;
                  }}
                  loading="lazy"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" aria-label="En ligne" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate text-sm">{providerDisplayName}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    isLawyer 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {isLawyer ? 'Avocat' : 'Expert'}
                  </span>
                  <span className="text-gray-600 text-xs">{provider?.country || 'FR'}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                  <Clock size={12} aria-hidden="true" />
                  <span>{service.duration} min</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">Disponible</span>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  {service.amount.toFixed(2)}€
                </div>
                <div className="text-xs text-gray-500">{service.duration} min</div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {currentStep === 'payment' && (
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <CreditCard className="w-4 h-4 text-white" aria-hidden="true" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Paiement</h4>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  </div>
                )}

                {/* Stripe Payment Form */}
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
                  <Phone 
                    size={32} 
                    className={`mx-auto mb-4 animate-pulse ${isLawyer ? 'text-blue-600' : 'text-green-600'}`} 
                    aria-hidden="true" 
                  />
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Mise en relation en cours
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {callProgress < 3 
                      ? `Nous contactons ${providerDisplayName}...` 
                      : callProgress === 3 
                        ? `${providerDisplayName} a accepté!` 
                        : callProgress === 4 
                          ? `Connexion établie!` 
                          : `Consultation en cours...`}
                  </p>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="bg-green-100 rounded-lg p-3 flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" aria-hidden="true" />
                    <span className="text-green-800">Paiement confirmé</span>
                  </div>
                  
                  {callProgress >= 2 && (
                    <div className="bg-blue-100 rounded-lg p-3 flex items-center text-sm">
                      <Phone className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" aria-hidden="true" />
                      <span className="text-blue-800">{providerDisplayName} contacté(e)</span>
                    </div>
                  )}
                  
                  {callProgress >= 4 && (
                    <div className="bg-purple-100 rounded-lg p-3 flex items-center text-sm">
                      <Clock className="w-4 h-4 text-purple-600 mr-2 flex-shrink-0" aria-hidden="true" />
                      <span className="text-purple-800">Consultation démarrée</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center mb-4">
                  <LoadingSpinner size="lg" color={isLawyer ? 'blue' : 'red'} />
                </div>

                {paymentIntentId && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      Transaction: <code className="bg-gray-200 px-1 rounded text-xs">{paymentIntentId.slice(-8)}</code>
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'completed' && (
              <div className="p-6 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-green-600" aria-hidden="true" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Consultation terminée
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Votre consultation avec {providerDisplayName} s'est terminée avec succès.
                  </p>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Résumé</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Expert:</span>
                        <span className="font-medium">{providerDisplayName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Durée:</span>
                        <span className="font-medium">{service.duration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Montant:</span>
                        <span className="font-medium text-green-600">{service.amount.toFixed(2)}€</span>
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
                    onClick={() => window.location.href = `/evaluation/${provider.id}`}
                    fullWidth
                    className="bg-blue-600 hover:bg-blue-700"
                    aria-label={`Évaluer ${providerDisplayName}`}
                  >
                    ⭐ Évaluer {providerDisplayName}
                  </Button>
                  <Button 
                    onClick={() => window.location.href = `/receipt/${paymentIntentId}`}
                    fullWidth
                    className="bg-gray-500 hover:bg-gray-600"
                    aria-label="Télécharger le reçu"
                  >
                    📄 Télécharger le reçu
                  </Button>
                  <Button 
                    onClick={handleGoBack}
                    fullWidth
                    className="bg-red-600 hover:bg-red-700"
                    aria-label="Retour à l'accueil"
                  >
                    🏠 Retour à l'accueil
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Message - Only for payment step */}
          {currentStep === 'payment' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">Paiement sécurisé</h4>
                  <p className="text-xs text-blue-800 mt-1">
                    Données protégées par SSL. Appel lancé automatiquement après paiement.
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

// Performance optimizations
CallCheckout.displayName = 'CallCheckout';

export default React.memo(CallCheckout);