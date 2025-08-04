import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Clock, Shield, Check, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { createPaymentRecord, logAnalyticsEvent } from '../utils/firestore';
import { initiateCall } from '../services/api';

import { getFunctions, httpsCallable } from 'firebase/functions';

// Imports Stripe
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

const functions = getFunctions();
const notifyAfterPayment = httpsCallable(functions, 'notifyAfterPayment');

// Initialisation Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Types améliorés
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

interface SessionData {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  type?: string;
  country?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsAppNumber?: string;
  phoneNumber?: string;
  languagesSpoken?: string[];
  providerId?: string;
  providerName?: string;
  providerType?: string;
  providerCountry?: string;
  providerAvatar?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerWhatsapp?: string;
  providerWhatsAppNumber?: string;
  providerPhoneNumber?: string;
  providerLanguagesSpoken?: string[];
  price?: number;
  duration?: number;
  clientPhone?: string;
  countryRequested?: string;
  title?: string;
  description?: string;
  language?: string;
  role?: string;
}

type StepType = 'payment' | 'calling' | 'completed';

const CheckoutForm: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useApp();
  const stripe = useStripe();
  const elements = useElements();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifyProviderOfMissedCall = async (
    providerId: string,
    clientInfo: { name: string; country: string },
    callInfo: { attempts: number; lastAttemptTime: Date }
  ) => {
    try {
      // Implémentation de la notification d'appel manqué
      console.log('Notification appel manqué:', { providerId, clientInfo, callInfo });
      // Logique de notification à implémenter
    } catch (error) {
      console.error('Erreur notification appel manqué:', error);
      throw error;
    }
  };

  // Fonction pour créer un PaymentIntent côté backend
  const createPaymentIntent = useCallback(async (): Promise<{ clientSecret: string; paymentIntentId: string }> => {
    try {
      if (!serviceData || !user) {
        throw new Error('Données manquantes pour créer le paiement');
      }

      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: serviceData.amount * 100, // Convertir en centimes
          currency: 'eur',
          serviceType: serviceData.serviceType,
          providerId: serviceData.providerId,
          clientId: user.id,
          clientEmail: user.email,
          providerName: provider?.fullName,
          description: `Paiement pour ${serviceData.serviceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel Expatrié'}`
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du paiement');
      }

      const data = await response.json();
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId
      };
    } catch (error) {
      console.error('Erreur création PaymentIntent:', error);
      throw error;
    }
  }, [serviceData, user, provider]);

  // Fonction pour envoyer toutes les notifications
  const sendAllNotifications = async () => {
    try {
      console.log('Envoi des notifications post-paiement...');
      // Implémentation de l'envoi des notifications
      
      const callId = sessionStorage.getItem("callId");
      if (callId) {
        try {
          await notifyAfterPayment({ callId });
          console.log("✅ Notifications post-paiement envoyées avec succès.");
        } catch (error) {
          console.error("❌ Erreur lors de l'envoi des notifications post-paiement :", error);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications:', error);
    }
  };

  // Fonction utilitaire pour créer un provider à partir des données de session
  const createProviderFromData = (data: SessionData, dataType: 'selectedProvider' | 'bookingRequest'): Provider => {
    if (dataType === 'selectedProvider') {
      return {
        id: data.id || '',
        fullName: data.name || '',
        firstName: data.firstName || data.name?.split(' ')[0] || '',
        lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
        role: (data.type as 'lawyer' | 'expat') || 'expat',
        country: data.country || '',
        currentCountry: data.country || '',
        avatar: data.avatar || '',
        profilePhoto: data.avatar || '',
        email: data.email || `${data.firstName?.toLowerCase() || 'expert'}@example.com`,
        phone: data.phone || '+33612345678',
        whatsapp: data.whatsapp || data.whatsAppNumber || data.phoneNumber,
        whatsAppNumber: data.whatsAppNumber || data.whatsapp,
        phoneNumber: data.phoneNumber || data.phone,
        languagesSpoken: data.languagesSpoken || ['fr']
      };
    } else {
      return {
        id: data.providerId || '',
        fullName: data.providerName || '',
        firstName: data.providerName?.split(' ')[0] || '',
        lastName: data.providerName?.split(' ').slice(1).join(' ') || '',
        role: (data.providerType as 'lawyer' | 'expat') || 'expat',
        country: data.providerCountry || '',
        currentCountry: data.providerCountry || '',
        avatar: data.providerAvatar || '',
        profilePhoto: data.providerAvatar || '',
        email: data.providerEmail || `${data.providerName?.split(' ')[0]?.toLowerCase() || 'expert'}@example.com`,
        phone: data.providerPhone || '+33612345678',
        whatsapp: data.providerWhatsapp || data.providerWhatsAppNumber || data.providerPhoneNumber,
        whatsAppNumber: data.providerWhatsAppNumber || data.providerWhatsapp,
        phoneNumber: data.providerPhoneNumber || data.providerPhone,
        languagesSpoken: data.providerLanguagesSpoken || ['fr']
      };
    }
  };

  // Fonction utilitaire pour récupérer les données depuis sessionStorage
  const getSessionData = (key: string): SessionData | null => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error parsing ${key} data:`, error);
      return null;
    }
  };

  const loadProviderAndSettings = useCallback(async () => {
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
      
      const newServiceData: ServiceData = {
        providerId: currentProvider.id,
        serviceType: (isLawyer ? 'lawyer_call' : 'expat_call') as 'lawyer_call' | 'expat_call',
        providerRole: currentProvider.role,
        amount: baseAmount,
        duration: duration,
        clientPhone: clientPhone,
        commissionAmount,
        providerAmount
      };

      setServiceData(newServiceData);

      // Créer le PaymentIntent après avoir configuré serviceData
      // Note: createPaymentIntent sera appelé après que serviceData soit défini
      // donc on ne peut pas l'appeler ici directement
      // Il sera appelé dans un useEffect séparé

    } catch (error) {
      console.error('Error loading provider and settings:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [providerId, searchParams, user]);

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
  }, [providerId, user, authLoading, navigate, loadProviderAndSettings]);

  // UseEffect séparé pour créer le PaymentIntent une fois que serviceData est défini
  useEffect(() => {
    const initializePayment = async () => {
      if (serviceData && user && provider && !clientSecret) {
        try {
          const { clientSecret: newClientSecret, paymentIntentId: newPaymentIntentId } = await createPaymentIntent();
          setClientSecret(newClientSecret);
          setPaymentIntentId(newPaymentIntentId);
        } catch (error) {
          console.error('Erreur lors de l\'initialisation du paiement:', error);
          setError('Erreur lors de l\'initialisation du paiement');
        }
      }
    };

    initializePayment();
  }, [serviceData, user, provider, clientSecret, createPaymentIntent]);

  const handlePaymentAuthorized = async (paymentIntentId: string) => {
    try {
      const bookingRequest = getSessionData('bookingRequest');
      const clientPhone = bookingRequest?.clientPhone || user?.phone || '';
      
      if (!serviceData || !user || !provider) {
        throw new Error('Missing required data for payment');
      }
      
      // 1. Enregistrer le paiement dans Firestore
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
      
      // 2. 📱 ENVOYER TOUS LES MESSAGES/NOTIFICATIONS INSTANTANÉMENT
      await sendAllNotifications();
      
      // 3. 📞 Démarrer immédiatement la programmation côté backend (le backend attendra 5 min)
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
      
      // 4. Log analytics
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

      setCurrentStep('calling');
      setCallProgress(1);

    } catch (error) {
      console.error('Error recording payment in Firestore:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Stripe n\'est pas encore chargé');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Carte non trouvée');
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client SOS',
            email: user?.email || undefined
          }
        }
      });

      if (error) {
        setError(error.message || 'Paiement échoué');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'requires_capture') {
        await handlePaymentAuthorized(paymentIntent.id);
      } else {
        setError('Le paiement n\'a pas pu être autorisé.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      setError('Une erreur est survenue lors du paiement');
      setIsProcessing(false);
    }
  };

  // Fonction pour gérer le retour en arrière
  const handleGoBack = () => {
    try {
      // Essayer de revenir à la page précédente
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Fallback vers la liste des prestataires
        navigate('/prestataires');
      }
    } catch (error) {
      console.error('Erreur lors du retour:', error);
      // En cas d'erreur, aller vers la liste des prestataires
      navigate('/prestataires');
    }
  };

  // Fonction utilitaire pour récupérer les données de provider pour la navigation
  const getProviderDataForNavigation = () => {
    const savedProvider = getSessionData('selectedProvider');
    const savedRequest = getSessionData('bookingRequest');
    
    let providerName = provider?.fullName || 'Expert';
    let providerType = provider?.role || serviceData?.providerRole || 'expat';
    
    if (savedProvider) {
      providerName = savedProvider.name || '';
      providerType = (savedProvider.type as 'lawyer' | 'expat') || 'expat';
    } else if (savedRequest) {
      providerName = savedRequest.providerName || '';
      providerType = (savedRequest.providerType as 'lawyer' | 'expat') || 'expat';
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
    
    const searchParamsNav = new URLSearchParams(successParams);
    navigate(`/payment-success?${searchParamsNav.toString()}`, { replace: true });
  };

  // Early returns pour les états d'erreur et de chargement
  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <LoadingSpinner size="large" color="red" />
          <p className="mt-4 text-gray-600">Authentification en cours...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // useEffect gère la redirection
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
            <Button onClick={handleGoBack}>
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
              onClick={handleGoBack}
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
              onClick={handleGoBack}
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
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  {/* Carte bancaire avec Stripe Elements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Carte bancaire
                    </label>
                    <div className="border border-gray-300 rounded-md p-3 bg-white">
                      <CardElement 
                        options={{
                          hidePostalCode: true,
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#424770',
                              '::placeholder': {
                                color: '#aab7c4',
                              },
                            },
                          },
                        }}
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
                  type="submit"
                  disabled={!stripe || isProcessing}
                  fullWidth
                  size="large"
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="small" color="white" />
                      <span className="ml-2">Traitement...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={20} className="mr-2" />
                      Autoriser le paiement
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    En autorisant ce paiement, vous acceptez nos <Link to="/cgu-clients" className="text-blue-600 hover:text-blue-700 underline">conditions générales de vente</Link>.
                    Aucun débit ne sera effectué sans mise en relation réussie.<br />
                    <span className="font-medium">Prix: {isLawyer ? '49€ pour 20 minutes' : '19€ pour 30 minutes'}</span>
                  </p>
                </div>
              </form>
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
                  <div className="mt-4 bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      ⏰ L'appel Twilio sera initié dans 5 minutes après validation du paiement
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  {callProgress < 3 && (
                    <div className="bg-yellow-100 rounded-lg p-4 flex items-center">
                      <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                      <span className="text-yellow-800">Messages envoyés au prestataire - Attente de 5 minutes</span>
                    </div>
                  )}
                  
                  {callProgress === 3 && (
                    <div className="bg-blue-100 rounded-lg p-4 flex items-center">
                      <Phone className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-blue-800">Préparation de l'appel en cours...</span>
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

                {/* Bouton pour simuler la fin d'appel (pour le développement) */}
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleCallCompleted(true)}
                    className="mr-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Simuler succès appel
                  </button>
                  <button
                    onClick={() => handleCallCompleted(false)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Simuler échec appel
                  </button>
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
                    <br />
                    <strong>L'appel sera initié automatiquement 5 minutes après le paiement.</strong>
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

// Composant principal avec wrapper Elements
const CallCheckout: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default CallCheckout;