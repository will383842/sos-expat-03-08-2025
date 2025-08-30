import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, CheckCircle, FileText, Scale, Users, Star } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import ReviewModal from '../components/review/ReviewModal';
import { logAnalyticsEvent, createInvoiceRecord } from '../utils/firestore';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  price: number;
  duration: number;
  role: string;
}

interface InvoiceUrls {
  platformInvoiceUrl?: string;
  providerInvoiceUrl?: string;
}

type CallState = 'connecting' | 'in_progress' | 'completed' | 'failed';
type InvoiceType = 'platform' | 'provider';

const PROVIDER_DEFAULTS = {
  '1': { type: 'lawyer', price: 49, duration: 20, role: 'lawyer' },
  '2': { type: 'expat', price: 19, duration: 30, role: 'expat' },
  '3': { type: 'lawyer', price: 49, duration: 20, role: 'lawyer' },
  '4': { type: 'expat', price: 19, duration: 30, role: 'expat' }
} as const;

const COMMISSION_RATES = {
  lawyer: 9,
  expat: 5
} as const;

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useApp();
  const { user } = useAuth();

  // URL Parameters
  const callStatus = searchParams.get('call');
  const providerId = searchParams.get('providerId') || searchParams.get('provider') || '1';
  const callId = searchParams.get('callId') || `call_${Date.now()}`;
  const paymentIntentId = searchParams.get('paymentIntentId');

  // State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [callState, setCallState] = useState<CallState>(
    callStatus === 'failed' ? 'failed' : 'completed'
  );
  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [activeInvoiceType, setActiveInvoiceType] = useState<InvoiceType>('platform');
  const [invoiceUrls, setInvoiceUrls] = useState<InvoiceUrls>({});
  
  // Service data
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidServiceType, setPaidServiceType] = useState<string>('');
  const [paidDuration, setPaidDuration] = useState<number>(0);
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [providerAmount, setProviderAmount] = useState<number>(0);
  const [providerRole, setProviderRole] = useState<string>('');

  const isLawyer = useMemo(() => 
    paidServiceType === 'lawyer_call' || providerRole === 'lawyer', 
    [paidServiceType, providerRole]
  );

  // âœ… CORRECTION - RÃ©cupÃ©rer les donnÃ©es depuis les sources correctes
  const getProviderFromStorage = useCallback((): ProviderInfo | null => {
    try {
      // âœ… Essayer d'abord selectedProvider (nom correct)
      const savedProvider = sessionStorage.getItem('selectedProvider');
      if (savedProvider) {
        const providerData = JSON.parse(savedProvider);
        return {
          id: providerData.id,
          name: providerData.name,
          type: providerData.type,
          price: providerData.price,
          duration: providerData.duration,
          role: providerData.type
        };
      }
      
      // âœ… Essayer ensuite bookingRequest
      const savedRequest = sessionStorage.getItem('bookingRequest');
      if (savedRequest) {
        const requestData = JSON.parse(savedRequest);
        return {
          id: requestData.providerId,
          name: requestData.providerName,
          type: requestData.providerType,
          price: requestData.price,
          duration: requestData.duration,
          role: requestData.providerType
        };
      }

      // âœ… Fallback - ancien format pour compatibilitÃ©
      const legacyProvider = sessionStorage.getItem('providerData');
      if (legacyProvider) {
        const providerData = JSON.parse(legacyProvider);
        return {
          id: providerData.id || providerId,
          name: providerData.name,
          type: providerData.type,
          price: providerData.price,
          duration: providerData.duration,
          role: providerData.type
        };
      }
    } catch (error) {
      console.error('Error parsing provider data:', error);
    }
    return null;
  }, [providerId]);

  // Initialize service data
  const initializeServiceData = useCallback(() => {
    // âœ… Prioriser les paramÃ¨tres URL (plus fiables)
    const urlAmount = searchParams.get('amount');
    const urlServiceType = searchParams.get('serviceType') || searchParams.get('service');
    const urlDuration = searchParams.get('duration');
    const urlPlatformFee = searchParams.get('platformFee');
    const urlProviderAmount = searchParams.get('providerAmount');
    const urlProviderRole = searchParams.get('providerRole');
    
    if (urlAmount && urlServiceType) {
      // Use URL parameters
      setPaidAmount(parseFloat(urlAmount));
      setPaidServiceType(urlServiceType);
      setPaidDuration(urlDuration ? parseInt(urlDuration) : 0);
      setPlatformFee(urlPlatformFee ? parseFloat(urlPlatformFee) : 0);
      setProviderAmount(urlProviderAmount ? parseFloat(urlProviderAmount) : 0);
      setProviderRole(urlProviderRole || '');
      setTimeRemaining((urlDuration ? parseInt(urlDuration) : 0) * 60);
      console.log('âœ… DonnÃ©es rÃ©cupÃ©rÃ©es depuis URL params:', {
        amount: parseFloat(urlAmount),
        serviceType: urlServiceType,
        duration: urlDuration
      });
      return;
    }
    
    // âœ… Essayer de rÃ©cupÃ©rer depuis storage avec les bons noms
    const providerInfo = getProviderFromStorage();
    if (providerInfo) {
      const price = providerInfo.price || (providerInfo.type === 'lawyer' ? 49 : 19);
      const duration = providerInfo.duration || (providerInfo.type === 'lawyer' ? 20 : 30);
      const commission = providerInfo.type === 'lawyer' ? COMMISSION_RATES.lawyer : COMMISSION_RATES.expat;
      
      setPaidAmount(price);
      setPaidServiceType(providerInfo.type === 'lawyer' ? 'lawyer_call' : 'expat_call');
      setPaidDuration(duration);
      setProviderRole(providerInfo.type);
      setTimeRemaining(duration * 60);
      setPlatformFee(commission);
      setProviderAmount(price - commission);
      
      console.log('âœ… DonnÃ©es rÃ©cupÃ©rÃ©es depuis storage:', {
        provider: providerInfo.name,
        price,
        duration,
        type: providerInfo.type
      });
      return;
    }
    
    // âœ… Fallback vers les dÃ©fauts
    const fallbackProvider = PROVIDER_DEFAULTS[providerId as keyof typeof PROVIDER_DEFAULTS];
    if (fallbackProvider) {
      const commission = fallbackProvider.role === 'lawyer' ? COMMISSION_RATES.lawyer : COMMISSION_RATES.expat;
      
      setPaidAmount(fallbackProvider.price);
      setPaidServiceType(fallbackProvider.type === 'lawyer' ? 'lawyer_call' : 'expat_call');
      setPaidDuration(fallbackProvider.duration);
      setProviderRole(fallbackProvider.role);
      setTimeRemaining(fallbackProvider.duration * 60);
      setPlatformFee(commission);
      setProviderAmount(fallbackProvider.price - commission);
      
      console.log('âœ… DonnÃ©es rÃ©cupÃ©rÃ©es depuis fallback:', fallbackProvider);
    }
  }, [searchParams, providerId, getProviderFromStorage]);

  // Generate invoices
  const generateInvoices = useCallback(async () => {
    if (isGeneratingInvoices) return;
    
    try {
      setIsGeneratingInvoices(true);
      
      const timestamp = Date.now();
      const urls = {
        platformInvoiceUrl: `https://example.com/invoices/platform_${timestamp}.pdf`,
        providerInvoiceUrl: `https://example.com/invoices/provider_${timestamp}.pdf`
      };
      
      setTimeout(() => {
        setInvoiceUrls(urls);
        
        if (user?.id) {
          const invoiceData = {
            callId,
            clientId: user.id,
            providerId: providerId || '',
            createdAt: new Date(),
            status: 'issued' as const
          };
          
          createInvoiceRecord({
            ...invoiceData,
            invoiceNumber: `INV-${timestamp}`,
            type: 'platform',
            amount: platformFee || (isLawyer ? 9 : 5),
            downloadUrl: urls.platformInvoiceUrl
          });
          
          createInvoiceRecord({
            ...invoiceData,
            invoiceNumber: `INV-PRV-${timestamp}`,
            type: 'provider',
            amount: providerAmount || (isLawyer ? 40 : 14),
            downloadUrl: urls.providerInvoiceUrl
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Error generating invoices:', error);
    } finally {
      setIsGeneratingInvoices(false);
    }
  }, [isGeneratingInvoices, user, callId, providerId, platformFee, providerAmount, isLawyer]);

  // Timer effect
  useEffect(() => {
    if (callState !== 'in_progress' || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setCallState('completed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callState, timeRemaining]);

  // Initialize data and generate invoices
  useEffect(() => {
    initializeServiceData();
  }, [initializeServiceData]);

  useEffect(() => {
    if (callState === 'completed' && user && paymentIntentId && !isGeneratingInvoices) {
      generateInvoices();

      // Show review modal after 2 seconds
      const reviewTimer = setTimeout(() => {
        if (!showReviewModal && !showInvoiceModal) {
          setShowReviewModal(true);
        }
      }, 2000);

      return () => clearTimeout(reviewTimer);
    }
  }, [callState, user, paymentIntentId, generateInvoices, showReviewModal, showInvoiceModal, isGeneratingInvoices]);

  // Utility functions
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const downloadInvoice = useCallback(() => {
    const invoiceData = `
FACTURE SOS-${Date.now()}
Date: ${new Date().toLocaleDateString()}
Service: ${paidServiceType === 'lawyer_call' ? 'Appel Avocat' : 'Appel ExpatriÃ©'}
Montant: ${paidAmount}â‚¬
    `;
    
    const blob = new Blob([invoiceData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [paidAmount, paidServiceType]);

  const viewInvoice = useCallback((type: InvoiceType) => {
    setActiveInvoiceType(type);
    setShowInvoiceModal(true);
    
    if (user) {
      logAnalyticsEvent({
        eventType: 'invoice_viewed',
        userId: user.id,
        eventData: {
          invoiceType: type,
          paymentId: paymentIntentId
        }
      });
    }
  }, [user, paymentIntentId]);

  // Text translations
  const t = useMemo(() => ({
    serviceNotFound: language === 'fr' ? 'Service non trouvÃ©' : 'Service not found',
    backToHome: language === 'fr' ? 'Retour Ã  l\'accueil' : 'Back to home',
    callFailed: language === 'fr' ? 'Appel non Ã©tabli' : 'Call failed',
    paymentSuccessful: language === 'fr' ? 'Paiement rÃ©ussi !' : 'Payment successful!',
    autoRefund: language === 'fr' ? 'Vous serez automatiquement remboursÃ©' : 'You will be automatically refunded',
    connecting: language === 'fr' ? 'Votre appel est en cours de connexion...' : 'Your call is being connected...',
    connectingTitle: language === 'fr' ? 'Connexion en cours...' : 'Connecting...',
    contactingExpert: language === 'fr' ? 'Nous contactons votre expert. Veuillez patienter.' : 'We are contacting your expert. Please wait.',
    callInProgress: language === 'fr' ? 'Appel en cours' : 'Call in progress',
    timeRemaining: language === 'fr' ? 'Temps restant' : 'Time remaining',
    callCompleted: language === 'fr' ? 'Appel terminÃ©' : 'Call completed',
    thankYou: language === 'fr' ? 'Merci d\'avoir utilisÃ© nos services !' : 'Thank you for using our services!',
    expertNoAnswer: language === 'fr' ? 'L\'expert n\'a pas rÃ©pondu aprÃ¨s 3 tentatives. Vous serez automatiquement remboursÃ©.' : 'The expert did not answer after 3 attempts. You will be automatically refunded.',
    chooseAnother: language === 'fr' ? 'Choisir un autre expert' : 'Choose another expert',
    serviceDetails: language === 'fr' ? 'DÃ©tails du service' : 'Service details',
    service: language === 'fr' ? 'Service' : 'Service',
    duration: language === 'fr' ? 'DurÃ©e' : 'Duration',
    price: language === 'fr' ? 'Prix' : 'Price',
    date: language === 'fr' ? 'Date' : 'Date',
    lawyerCall: language === 'fr' ? 'Appel Avocat' : 'Lawyer Call',
    expatCall: language === 'fr' ? 'Appel ExpatriÃ©' : 'Expat Call',
    generatingInvoices: language === 'fr' ? 'GÃ©nÃ©ration des factures...' : 'Generating invoices...',
    viewInvoices: language === 'fr' ? 'Voir les factures' : 'View invoices',
    leaveReview: language === 'fr' ? 'Laisser un avis' : 'Leave a review',
    goToDashboard: language === 'fr' ? 'Aller au tableau de bord' : 'Go to dashboard',
    close: language === 'fr' ? 'Fermer' : 'Close',
    platformInvoice: language === 'fr' ? 'Facture plateforme' : 'Platform invoice',
    providerInvoice: language === 'fr' ? 'Facture prestataire' : 'Provider invoice'
  }), [language]);

  // Early return if no service data
  if (!paidAmount && !paidServiceType) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t.serviceNotFound}
            </h1>
            <a href="/" className="text-red-600 hover:text-red-700">
              {t.backToHome}
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  const renderCallStatus = () => {
    const statusConfig: {
      [key in CallState]: {
        icon: React.ReactElement;
        title: string | React.ReactElement;
        description: string;
        extra?: React.ReactElement;
      }
    } = {
      connecting: {
        icon: <Phone size={48} className="mx-auto text-blue-600 mb-4 animate-pulse" />,
        title: t.connectingTitle,
        description: t.contactingExpert
      },
      in_progress: {
        icon: (
          <div className="bg-green-100 rounded-full p-4 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <Phone size={32} className="text-green-600" />
          </div>
        ),
        title: t.callInProgress,
        description: t.timeRemaining,
        extra: (
          <div className="text-3xl font-bold text-red-600 mb-2">
            {formatTime(timeRemaining)}
          </div>
        )
      },
      completed: {
        icon: <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />,
        title: (
          <div className="flex items-center justify-center">
            {t.callCompleted}
            {isLawyer ? (
              <Scale className="ml-2 w-5 h-5 text-blue-600" />
            ) : (
              <Users className="ml-2 w-5 h-5 text-green-600" />
            )}
          </div>
        ),
        description: t.thankYou
      },
      failed: {
        icon: (
          <div className="bg-red-100 rounded-full p-4 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <Phone size={32} className="text-red-600" />
          </div>
        ),
        title: t.callFailed,
        description: t.expertNoAnswer,
        extra: (
          <button 
            onClick={() => navigate('/prestataires')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors mt-4"
          >
            {t.chooseAnother}
          </button>
        )
      }
    };

    const config = statusConfig[callState];
    if (!config) return null;

    return (
      <div className="text-center mb-8">
        {config.icon}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {config.title}
        </h2>
        {config.extra}
        <p className="text-gray-600">
          {config.description}
        </p>
      </div>
    );
  };

  const serviceDetailRows = [
    { label: t.service, value: isLawyer ? t.lawyerCall : t.expatCall },
    { label: t.duration, value: `${paidDuration || (isLawyer ? '20' : '30')} min` },
    { label: t.price, value: `â‚¬${paidAmount || (isLawyer ? '49' : '19')}`, bold: true },
    { label: t.date, value: new Date().toLocaleDateString() }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Success Header */}
            <div className="bg-green-600 text-white px-6 py-8 text-center">
              {callState === 'failed' ? (
                <Phone size={64} className="mx-auto mb-4 text-red-300" />
              ) : (
                <CheckCircle size={64} className="mx-auto mb-4" />
              )}
              <h1 className="text-3xl font-bold mb-2">
                {callState === 'failed' ? t.callFailed : t.paymentSuccessful}
              </h1>
              <p className="text-green-100">
                {callState === 'failed' ? t.autoRefund : t.connecting}
              </p>
            </div>

            <div className="p-6">
              {/* Call Status */}
              {renderCallStatus()}

              {/* Service Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {t.serviceDetails}
                </h3>
                <div className="space-y-2 text-sm">
                  {serviceDetailRows.map((row, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-600">{row.label}:</span>
                      <span className={row.bold ? 'font-semibold' : ''}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={downloadInvoice}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  disabled={isGeneratingInvoices}
                >
                  <FileText size={20} className="mr-2" />
                  {isGeneratingInvoices ? t.generatingInvoices : t.viewInvoices}
                </button>

                {callState === 'completed' && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center"
                  >
                    <Star size={20} className="mr-2" />
                    {t.leaveReview}
                  </button>
                )}

                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {t.goToDashboard}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        providerId={providerId}
        providerName={isLawyer ? 'Avocat' : 'ExpatriÃ©'}
        callId={callId}
        serviceType={isLawyer ? 'lawyer_call' : 'expat_call'}
      />
      
      {/* Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setActiveInvoiceType('platform');
        }}
        title={activeInvoiceType === 'platform' ? 'Facture Plateforme' : 'Facture Prestataire'}
        size="large"
      >
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <iframe 
              src={activeInvoiceType === 'platform' ? invoiceUrls.platformInvoiceUrl : invoiceUrls.providerInvoiceUrl} 
              className="w-full h-[600px]" 
              title={`Facture ${activeInvoiceType === 'platform' ? 'Plateforme' : 'Prestataire'}`}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t.close}
            </button>
            <button
              onClick={() => viewInvoice('platform')}
              disabled={isGeneratingInvoices || !invoiceUrls.platformInvoiceUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {t.platformInvoice}
            </button>
            
            <button
              onClick={() => viewInvoice('provider')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={isGeneratingInvoices || !invoiceUrls.providerInvoiceUrl}
            >
              {t.providerInvoice}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default PaymentSuccess;

