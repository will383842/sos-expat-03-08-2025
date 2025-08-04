import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Phone, Clock, Shield, Check, AlertCircle, CreditCard, Lock, User, Calendar, Eye, EyeOff, CheckCircle } from 'lucide-react';

// Types simulés
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

type StepType = 'payment' | 'calling' | 'completed';

// Composant de bouton personnalisé
const Button = ({ children, onClick, disabled, className = '', type = 'button', fullWidth = false }) => (
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
const LoadingSpinner = ({ size = 'medium', color = 'red' }) => {
  const sizeClass = size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-8 h-8' : 'w-6 h-6';
  const colorClass = color === 'white' ? 'border-white border-t-transparent' : 'border-red-600 border-t-transparent';
  
  return (
    <div className={`animate-spin rounded-full border-2 ${sizeClass} ${colorClass}`}></div>
  );
};

const CallCheckout = () => {
  // Données mockées pour la démo
  const [provider] = useState<Provider>({
    id: '1',
    fullName: 'avocat 1',
    firstName: 'Avocat',
    lastName: '1',
    role: 'lawyer',
    country: 'Autriche',
    currentCountry: 'Autriche',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    profilePhoto: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    email: 'avocat1@example.com',
    phone: '+33612345678',
    languagesSpoken: ['fr', 'de']
  });

  const [serviceData] = useState<ServiceData>({
    providerId: '1',
    serviceType: 'lawyer_call',
    providerRole: 'lawyer',
    amount: 49,
    duration: 20,
    clientPhone: '+33612345678',
    commissionAmount: 9,
    providerAmount: 40
  });

  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('mock_client_secret');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour le formulaire de carte personnalisé
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [useCustomForm, setUseCustomForm] = useState(true);
  const [stripeElementsReady, setStripeElementsReady] = useState(true);

  // Formatage du numéro de carte
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Formatage de la date d'expiration
  const formatExpiryDate = (value) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Détection du type de carte
  const getCardType = (number) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.match(/^4/)) return 'visa';
    if (cleanNumber.match(/^5/)) return 'mastercard';
    if (cleanNumber.match(/^3[47]/)) return 'amex';
    return 'generic';
  };

  // Validation des champs du formulaire personnalisé
  const validateField = (name, value) => {
    const newErrors = { ...formErrors };
    
    switch (name) {
      case 'cardNumber':
        const cleanNumber = value.replace(/\s/g, '');
        if (!cleanNumber) {
          newErrors.cardNumber = 'Numéro de carte requis';
        } else if (cleanNumber.length < 13 || cleanNumber.length > 19) {
          newErrors.cardNumber = 'Numéro de carte invalide';
        } else {
          delete newErrors.cardNumber;
        }
        break;
      
      case 'expiryDate':
        if (!value) {
          newErrors.expiryDate = 'Date d\'expiration requise';
        } else if (!/^\d{2}\/\d{2}$/.test(value)) {
          newErrors.expiryDate = 'Format invalide (MM/AA)';
        } else {
          const [month, year] = value.split('/');
          const currentYear = new Date().getFullYear() % 100;
          const currentMonth = new Date().getMonth() + 1;
          
          if (parseInt(month) < 1 || parseInt(month) > 12) {
            newErrors.expiryDate = 'Mois invalide';
          } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
            newErrors.expiryDate = 'Carte expirée';
          } else {
            delete newErrors.expiryDate;
          }
        }
        break;
      
      case 'cvv':
        if (!value) {
          newErrors.cvv = 'CVV requis';
        } else if (!/^\d{3,4}$/.test(value)) {
          newErrors.cvv = 'CVV invalide (3-4 chiffres)';
        } else {
          delete newErrors.cvv;
        }
        break;
      
      case 'cardholderName':
        if (!value.trim()) {
          newErrors.cardholderName = 'Nom du titulaire requis';
        } else if (value.trim().length < 2) {
          newErrors.cardholderName = 'Nom trop court';
        } else {
          delete newErrors.cardholderName;
        }
        break;
    }
    
    setFormErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (name === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    } else if (name === 'cardholderName') {
      formattedValue = value.toUpperCase();
    }

    setFormData({ ...formData, [name]: formattedValue });
    validateField(name, formattedValue);
  };

  const cardType = getCardType(formData.cardNumber);
  const isCustomFormValid = Object.keys(formErrors).length === 0 && 
                           formData.cardNumber && 
                           formData.expiryDate && 
                           formData.cvv && 
                           formData.cardholderName;

  const getCardIcon = (type) => {
    switch (type) {
      case 'visa':
        return (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-2 py-1 rounded text-xs font-bold">
            VISA
          </div>
        );
      case 'mastercard':
        return (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
            MC
          </div>
        );
      case 'amex':
        return (
          <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-2 py-1 rounded text-xs font-bold">
            AMEX
          </div>
        );
      default:
        return <CreditCard className="w-4 h-4 text-gray-400" />;
    }
  };

  // Simulation du paiement
  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);

    // Simuler le traitement du paiement
    setTimeout(() => {
      setPaymentIntentId('pi_mock_payment_intent');
      setCurrentStep('calling');
      setCallProgress(1);
      setIsProcessing(false);
    }, 2000);
  };

  const handleCallCompleted = (success: boolean) => {
    setCurrentStep('completed');
    alert(success ? 'Appel terminé avec succès !' : 'Appel échoué - vous serez remboursé');
  };

  const handleGoBack = () => {
    alert('Retour à la liste des experts');
  };

  // Simulation de la progression d'appel
  useEffect(() => {
    if (currentStep === 'calling' && callProgress < 5) {
      const timer = setTimeout(() => {
        setCallProgress(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, callProgress]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <LoadingSpinner size="large" color="red" />
        <p className="mt-4 text-gray-600 text-sm">Chargement des informations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <div className="max-w-sm mx-auto px-4 py-6">
        {/* Header Mobile */}
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

        {/* Provider Info - Mobile optimized */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={provider.avatar}
                alt={provider.fullName}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {provider.fullName}
              </h3>
              <div className="flex items-center space-x-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  isLawyer 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isLawyer ? 'Avocat certifié' : 'Expatrié expert'}
                </span>
                <span className="text-gray-600">{provider.country}</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                <Clock size={12} />
                <span>{serviceData.duration} min</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                €{serviceData.amount}
              </div>
              <div className="text-xs text-gray-500">
                {serviceData.duration} minutes
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20">
          {currentStep === 'payment' && (
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Carte bancaire</h4>
              </div>

              {useCustomForm ? (
                // Formulaire personnalisé mobile first
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {/* Numéro de carte */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                      <span>Numéro de carte</span>
                      {formData.cardNumber && !formErrors.cardNumber && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('cardNumber')}
                        onBlur={() => setFocusedField('')}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        className={`w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-mono ${
                          formErrors.cardNumber ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'
                        } ${focusedField === 'cardNumber' ? 'transform scale-105 shadow-xl' : 'shadow-md'}`}
                      />
                      <div className="absolute right-3 top-3">
                        {getCardIcon(cardType)}
                      </div>
                    </div>
                    {formErrors.cardNumber && (
                      <div className="flex items-center mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {formErrors.cardNumber}
                      </div>
                    )}
                  </div>

                  {/* Date et CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <span>Expiration</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('expiryDate')}
                          onBlur={() => setFocusedField('')}
                          placeholder="MM/AA"
                          maxLength="5"
                          className={`w-full px-3 py-3 bg-white/70 backdrop-blur-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-mono ${
                            formErrors.expiryDate ? 'border-red-400' : 'border-gray-200'
                          }`}
                        />
                        <Calendar className="absolute right-2 top-3 w-4 h-4 text-gray-400" />
                      </div>
                      {formErrors.expiryDate && (
                        <div className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <span>CVV</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCvv ? "text" : "password"}
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          onFocus={() => setFocusedField('cvv')}
                          onBlur={() => setFocusedField('')}
                          placeholder="123"
                          maxLength="4"
                          className={`w-full px-3 py-3 bg-white/70 backdrop-blur-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base font-mono ${
                            formErrors.cvv ? 'border-red-400' : 'border-gray-200'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCvv(!showCvv)}
                          className="absolute right-2 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.cvv && (
                        <div className="text-red-500 text-xs mt-1">{formErrors.cvv}</div>
                      )}
                    </div>
                  </div>

                  {/* Nom du titulaire */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <span>Nom du titulaire</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="cardholderName"
                        value={formData.cardholderName}
                        onChange={handleInputChange}
                        onFocus={() => setFocusedField('cardholderName')}
                        onBlur={() => setFocusedField('')}
                        placeholder="JEAN DUPONT"
                        className={`w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-base ${
                          formErrors.cardholderName ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                      <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    </div>
                    {formErrors.cardholderName && (
                      <div className="flex items-center mt-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {formErrors.cardholderName}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setUseCustomForm(false)}
                    className="text-blue-600 text-sm underline"
                  >
                    Utiliser Stripe Elements (simulé)
                  </button>
                </form>
              ) : (
                // Stripe Elements simulé
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Informations de carte
                    </label>
                    <div className="border-2 border-gray-200 rounded-xl p-4 bg-white/70 backdrop-blur-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
                      <div className="text-gray-500 text-sm">
                        [Simulation Stripe Elements]<br />
                        Numéro de carte: 4242 4242 4242 4242<br />
                        Expiration: 12/34 | CVV: 123
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUseCustomForm(true)}
                    className="text-blue-600 text-sm underline"
                  >
                    Utiliser un formulaire personnalisé
                  </button>
                </div>
              )}

              {/* Détail du paiement - Mobile optimized */}
              <div className="mt-6 bg-gray-50/80 backdrop-blur-sm rounded-xl p-4">
                <h4 className="font-bold text-gray-900 mb-3 text-sm">Détail du paiement</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">{serviceData.serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais de mise en relation</span>
                    <span className="font-medium">{serviceData.commissionAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant consultation</span>
                    <span className="font-medium">{serviceData.providerAmount.toFixed(2)} €</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-red-600">{serviceData.amount.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bouton de paiement - Mobile optimized */}
              <div className="mt-6">
                <button
                  onClick={handlePaymentSubmit}
                  disabled={(useCustomForm ? !isCustomFormValid : !stripeElementsReady) || isProcessing}
                  className={`relative w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-300 transform overflow-hidden ${
                    ((useCustomForm ? isCustomFormValid : stripeElementsReady) && !isProcessing)
                      ? 'bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:to-pink-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-500/25'
                      : 'bg-gray-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="small" color="white" />
                      <span>Traitement...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Lock className="w-5 h-5" />
                      <span>Autoriser le paiement</span>
                    </div>
                  )}
                </button>

                {/* Informations légales - Mobile optimized */}
                <div className="mt-4 space-y-2 text-xs text-gray-500 text-center">
                  <p>
                    En autorisant ce paiement, vous acceptez nos{' '}
                    <button className="text-blue-600 underline font-medium">
                      conditions générales
                    </button>
                  </p>
                  <p className="text-green-600 font-medium">
                    ✓ Aucun débit sans mise en relation réussie
                  </p>
                  <p className="font-bold text-gray-700">
                    Prix: {serviceData.amount}€ pour {serviceData.duration} minutes
                  </p>
                </div>

                {/* Badge de sécurité */}
                <div className="mt-4 flex items-center justify-center">
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 rounded-full border border-green-200/50">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-gray-700">Sécurisé par Stripe</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'calling' && (
            <div className="p-6 text-center">
              <div className="animate-pulse mb-6">
                <Phone size={40} className={`mx-auto ${isLawyer ? 'text-blue-600' : 'text-green-600'} mb-4`} />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {isLawyer ? 'Appel avocat en cours...' : 'Appel expatrié en cours...'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {callProgress < 3 
                    ? `Nous contactons ${provider.fullName}. Veuillez patienter.` 
                    : callProgress === 3 
                      ? `${provider.fullName} a répondu! Nous vous appelons...` 
                      : callProgress === 4 
                        ? 'Connexion établie! Appel en cours...' 
                        : 'Appel en cours...'}
                </p>
                <div className="mt-4 bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ⏰ L'appel Twilio sera initié dans 5 minutes après validation du paiement
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {callProgress < 3 && (
                  <div className="bg-yellow-100 rounded-lg p-3 flex items-center text-sm">
                    <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-yellow-800">Messages envoyés - Attente de 5 minutes</span>
                  </div>
                )}
                
                {callProgress === 3 && (
                  <div className="bg-blue-100 rounded-lg p-3 flex items-center text-sm">
                    <Phone className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-blue-800">Préparation de l'appel...</span>
                  </div>
                )}
                
                {callProgress >= 4 && (
                  <div className="bg-green-100 rounded-lg p-3 flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-green-800">Connexion établie! Appel en cours - {serviceData.duration} minutes</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                {callProgress < 5 ? (
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isLawyer ? 'border-blue-600' : 'border-green-600'} mx-auto`}></div>
                ) : (
                  <div className="flex justify-center">
                    <div className="bg-gray-200 w-full max-w-xs h-3 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full flex items-center justify-center text-xs text-white" style={{ width: '80%' }}>
                        {Math.floor(serviceData.duration * 0.8)}:00 / {serviceData.duration}:00
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons de simulation - Mobile */}
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => handleCallCompleted(true)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Simuler succès appel
                </button>
                <button
                  onClick={() => handleCallCompleted(false)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Simuler échec appel
                </button>
              </div>
            </div>
          )}

          {currentStep === 'completed' && (
            <div className="p-6 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Appel terminé
                </h2>
                <p className="text-gray-600 text-sm">
                  Merci d'avoir utilisé nos services. Votre avis nous intéresse !
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => alert('Redirection vers la page d\'évaluation')}
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Évaluer la consultation
                </Button>
                <Button 
                  onClick={handleGoBack}
                  fullWidth
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Retour à l'accueil
                </Button>
              </div>
            </div>
          )}
        </div>

        {currentStep === 'payment' && (
          <div className="mt-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Paiement sécurisé</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Votre paiement est traité de manière sécurisée.
                  Vous ne serez débité que si la mise en relation téléphonique réussit.
                  <br />
                  <strong>L'appel sera initié automatiquement 5 minutes après le paiement.</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styles CSS pour les animations personnalisées */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default CallCheckout;