import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { CreditCard, Shield, CheckCircle } from 'lucide-react';
// import { useApp } from '../contexts/AppContext';

interface ServicePlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  popular?: boolean;
}

const Checkout: React.FC = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // const { language } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [bookingRequest, setBookingRequest] = useState<{
    providerName: string;
    providerType: 'lawyer' | 'expat';
    title: string;
    description: string;
    price: number;
    duration: number;
  } | null>(null);

  // Déplacer servicePlans en dehors du composant pour éviter les dépendances de useEffect
  const servicePlans = React.useMemo((): Record<string, ServicePlan[]> => ({
    consultation: [
      {
        id: 'consultation-basic',
        name: 'Consultation Express',
        price: 49,
        duration: '30 minutes',
        features: [
          'Consultation téléphonique de 30 minutes',
          'Conseils juridiques personnalisés',
          'Résumé écrit de la consultation',
          'Support par email pendant 7 jours'
        ]
      },
      {
        id: 'consultation-premium',
        name: 'Consultation Approfondie',
        price: 89,
        duration: '60 minutes',
        features: [
          'Consultation téléphonique de 60 minutes',
          'Analyse détaillée de votre situation',
          'Rapport juridique complet',
          'Support par email pendant 14 jours',
          'Une consultation de suivi gratuite'
        ],
        popular: true
      }
    ],
    assistance: [
      {
        id: 'assistance-monthly',
        name: 'Assistance Mensuelle',
        price: 99,
        duration: '1 mois',
        features: [
          'Support juridique illimité par email',
          '2 consultations téléphoniques incluses',
          'Révision de documents',
          'Assistance administrative',
          'Réponse sous 24h garantie'
        ]
      },
      {
        id: 'assistance-yearly',
        name: 'Assistance Annuelle',
        price: 999,
        duration: '12 mois',
        features: [
          'Support juridique illimité',
          'Consultations téléphoniques illimitées',
          'Révision de documents illimitée',
          'Assistance administrative prioritaire',
          'Réponse sous 4h garantie',
          'Avocat dédié',
          '2 mois gratuits'
        ],
        popular: true
      }
    ],
    emergency: [
      {
        id: 'emergency-sos',
        name: 'SOS Juridique',
        price: 149,
        duration: 'Immédiat',
        features: [
          'Intervention immédiate (24h/24)',
          'Consultation d\'urgence de 45 minutes',
          'Conseils juridiques d\'urgence',
          'Assistance pour démarches urgentes',
          'Support pendant 48h après l\'intervention'
        ]
      }
    ]
  }), []);

  useEffect(() => {
    // Charger la demande de réservation depuis sessionStorage
    const savedRequest = sessionStorage.getItem('bookingRequest');
    if (savedRequest) {
      setBookingRequest(JSON.parse(savedRequest));
    }

    if (!user) {
      // Rediriger vers login avec les paramètres actuels
      const currentUrl = window.location.pathname + window.location.search;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    const plans = servicePlans[serviceType || ''];
    if (!plans || plans.length === 0) {
      navigate('/pricing');
      return;
    }

    // Sélectionner le plan populaire par défaut ou le premier
    const defaultPlan = plans.find(plan => plan.popular) || plans[0];
    setSelectedPlan(defaultPlan);
  }, [serviceType, user, navigate, servicePlans]);

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    
    try {
      // Simuler le processus de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Nettoyer sessionStorage
      sessionStorage.removeItem('bookingRequest');
      
      // Rediriger vers la page de succès
      const successParams = new URLSearchParams({
        service: serviceType || '',
        provider: searchParams.get('provider') || '',
        amount: selectedPlan.price.toString()
      });
      navigate(`/payment-success?${successParams}`);
    } catch (error) {
      console.error('Payment error:', error);
      setIsLoading(false);
    }
  };

  // Logique unifiée pour prix, durée et nom - utilise soit selectedPlan soit bookingRequest
  const getServiceInfo = () => {
    if (selectedPlan) {
      return {
        price: selectedPlan.price,
        duration: selectedPlan.duration,
        name: selectedPlan.name
      };
    }
    
    if (bookingRequest) {
      return {
        price: bookingRequest.price,
        duration: `${bookingRequest.duration} min`,
        name: bookingRequest.providerType === 'lawyer' ? 'Appel Avocat' : 'Appel Expatrié'
      };
    }
    
    // Fallback basé sur serviceType
    return {
      price: serviceType === 'lawyer_call' ? 49 : 19,
      duration: `${serviceType === 'lawyer_call' ? 20 : 30} min`,
      name: serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'
    };
  };

  if (isLoading) {
  return null; // ou un petit skeleton non bloquant si tu préfères
}


  const plans = servicePlans[serviceType || ''];
  if (!plans || plans.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Service non trouvé
            </h1>
            <Button onClick={() => navigate('/pricing')}>
              Retour aux tarifs
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const serviceInfo = getServiceInfo();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Finaliser votre commande
            </h1>
            <p className="text-lg text-gray-600">
              Choisissez votre plan et procédez au paiement sécurisé
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plans disponibles */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Plans disponibles
              </h2>
              
              {plans.map((plan: ServicePlan) => (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${plan.popular ? 'border-t-8 border-t-indigo-600' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Populaire
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {plan.name}
                      </h3>
                      <p className="text-gray-600">{plan.duration}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">
                        {plan.price}€
                      </span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Résumé et paiement */}
            <div className="space-y-6">
              {/* Résumé de la commande */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Résumé de votre consultation
                </h2>
                
                {bookingRequest && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=60&h=60&dpr=2"
                        alt={bookingRequest.providerName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{bookingRequest.providerName}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bookingRequest.providerType === 'lawyer' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {bookingRequest.providerType === 'lawyer' ? 'Avocat' : 'Expatrié'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Sujet :</span>
                        <p className="text-sm text-gray-600">{bookingRequest.title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Description :</span>
                        <p className="text-sm text-gray-600 line-clamp-3">{bookingRequest.description}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">{serviceInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Durée</span>
                    <span className="font-medium">{serviceInfo.duration}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>€{serviceInfo.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations de facturation */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Informations de facturation
                </h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={user?.firstName || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        value={user?.lastName || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Méthode de paiement */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Méthode de paiement
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3"
                    />
                    <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                    <span>Carte bancaire</span>
                  </label>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Paiement 100% sécurisé</p>
                    <p>Vos données sont protégées par un cryptage SSL</p>
                  </div>
                </div>
              </div>

              {/* Bouton de paiement */}
              <Button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full py-3 text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Traitement en cours...</span>
                  </div>
                ) : (
                  `Payer €${serviceInfo.price}`
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                En procédant au paiement, vous acceptez nos conditions générales de vente
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;