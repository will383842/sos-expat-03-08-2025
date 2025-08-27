import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, CheckCircle, Scale, Users, Star } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import ReviewModal from '../components/review/ReviewModal';

// 🔁 Firestore (lecture seule côté client)
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  price: number;
  duration: number;
  role: string;
}

type CallState = 'connecting' | 'in_progress' | 'completed' | 'failed';

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

  // URL Parameters
  const callStatus = searchParams.get('call');
  const providerId = searchParams.get('providerId') || searchParams.get('provider') || '1';
  const callId = searchParams.get('callId') || `call_${Date.now()}`;

  // UI state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [callState, setCallState] = useState<CallState>(
    callStatus === 'failed' ? 'failed' : 'connecting'
  );
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Service data
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidServiceType, setPaidServiceType] = useState<string>('');
  const [paidDuration, setPaidDuration] = useState<number>(0);
  const [providerRole, setProviderRole] = useState<string>('');

  const isLawyer = useMemo(
    () => paidServiceType === 'lawyer_call' || providerRole === 'lawyer',
    [paidServiceType, providerRole]
  );

  // ----- Helpers pour récupérer le provider depuis le storage (fallback) -----
  const getProviderFromStorage = useCallback((): ProviderInfo | null => {
    try {
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

  // ----- Init des infos service (montant/durée) depuis URL ou storage -----
  const initializeServiceData = useCallback(() => {
    const urlAmount = searchParams.get('amount');
    const urlServiceType = searchParams.get('serviceType') || searchParams.get('service');
    const urlDuration = searchParams.get('duration');
    const urlProviderRole = searchParams.get('providerRole');

    if (urlAmount && urlServiceType) {
      setPaidAmount(parseFloat(urlAmount));
      setPaidServiceType(urlServiceType);
      const d = urlDuration ? parseInt(urlDuration) : 0;
      setPaidDuration(d);
      setProviderRole(urlProviderRole || '');
      setTimeRemaining(d * 60);
      return;
    }

    const providerInfo = getProviderFromStorage();
    if (providerInfo) {
      const price = providerInfo.price || (providerInfo.type === 'lawyer' ? 49 : 19);
      const duration = providerInfo.duration || (providerInfo.type === 'lawyer' ? 20 : 30);

      setPaidAmount(price);
      setPaidServiceType(providerInfo.type === 'lawyer' ? 'lawyer_call' : 'expat_call');
      setPaidDuration(duration);
      setProviderRole(providerInfo.type);
      setTimeRemaining(duration * 60);
      return;
    }

    const fallbackProvider = PROVIDER_DEFAULTS[providerId as keyof typeof PROVIDER_DEFAULTS];
    if (fallbackProvider) {
      setPaidAmount(fallbackProvider.price);
      setPaidServiceType(
        fallbackProvider.type === 'lawyer' ? 'lawyer_call' : 'expat_call'
      );
      setPaidDuration(fallbackProvider.duration);
      setProviderRole(fallbackProvider.role);
      setTimeRemaining(fallbackProvider.duration * 60);
    }
  }, [searchParams, providerId, getProviderFromStorage]);

  // ----- Timer d'affichage local pendant l'état "in_progress" (optionnel) -----
  useEffect(() => {
    if (callState !== 'in_progress' || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callState, timeRemaining]);

  // ----- Init des données -----
  useEffect(() => {
    initializeServiceData();
  }, [initializeServiceData]);

  // ----- Écoute Firestore : état de l'appel -----
  useEffect(() => {
    if (!callId) return;

    const ref = doc(db, 'calls', callId);
    const unsub = onSnapshot(ref, snap => {
      const data = snap.data();
      if (!data) return;

      // Statuts poussés par la Cloud Function (webhook Twilio)
      switch (data.status) {
        case 'scheduled':
          setCallState('connecting');
          break;
        case 'in_progress':
          setCallState('in_progress');
          break;
        case 'completed':
          setCallState('completed');
          break;
        case 'failed':
          setCallState('failed');
          break;
        default:
          break;
      }

      // Ouvrir l'avis seulement après complétion
      if (data.status === 'completed' && !showReviewModal) {
        setTimeout(() => setShowReviewModal(true), 1500);
      }
    });

    return () => unsub();
  }, [callId, showReviewModal]);

  // ----- Utils -----
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // ----- i18n -----
  const t = useMemo(
    () => ({
      serviceNotFound: language === 'fr' ? 'Service non trouvé' : 'Service not found',
      backToHome: language === 'fr' ? "Retour à l'accueil" : 'Back to home',
      callFailed: language === 'fr' ? 'Appel non établi' : 'Call failed',
      paymentSuccessful: language === 'fr' ? 'Paiement réussi !' : 'Payment successful!',
      autoRefund:
        language === 'fr'
          ? 'Vous serez automatiquement remboursé'
          : 'You will be automatically refunded',
      connecting:
        language === 'fr'
          ? 'Votre paiement est validé. Veuillez rester en ligne : nous contactons votre expert.'
          : 'Your payment is confirmed. Please stay by your phone: we’re contacting your expert.',
      connectingTitle:
        language === 'fr'
          ? 'Paiement validé — appel dans moins de 5 minutes'
          : 'Payment confirmed — call in under 5 minutes',
      contactingExpert:
        language === 'fr'
          ? 'Vous allez recevoir un appel téléphonique dans moins de 5 minutes. Pensez à bien décrocher.'
          : 'You will receive a phone call in under 5 minutes. Please be ready to answer.',
      callInProgress: language === 'fr' ? 'Appel en cours' : 'Call in progress',
      timeRemaining: language === 'fr' ? 'Temps restant' : 'Time remaining',
      callCompleted: language === 'fr' ? 'Appel terminé' : 'Call completed',
      thankYou:
        language === 'fr'
          ? 'Merci d\'avoir utilisé nos services !'
          : 'Thank you for using our services!',
      expertNoAnswer:
        language === 'fr'
          ? "L'expert n'a pas répondu après 3 tentatives. Vous serez automatiquement remboursé."
          : 'The expert did not answer after 3 attempts. You will be automatically refunded.',
      chooseAnother: language === 'fr' ? 'Choisir un autre expert' : 'Choose another expert',
      serviceDetails: language === 'fr' ? 'Détails du service' : 'Service details',
      service: language === 'fr' ? 'Service' : 'Service',
      duration: language === 'fr' ? 'Durée' : 'Duration',
      price: language === 'fr' ? 'Prix' : 'Price',
      date: language === 'fr' ? 'Date' : 'Date',
      lawyerCall: language === 'fr' ? 'Appel Avocat' : 'Lawyer Call',
      expatCall: language === 'fr' ? 'Appel Expatrié' : 'Expat Call',
      leaveReview: language === 'fr' ? 'Laisser un avis' : 'Leave a review',
      goToDashboard: language === 'fr' ? 'Aller au tableau de bord' : 'Go to dashboard'
    }),
    [language]
  );

  // ----- Early return si pas d'infos service -----
  if (!paidAmount && !paidServiceType) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.serviceNotFound}</h1>
            <a href="/" className="text-red-600 hover:text-red-700">
              {t.backToHome}
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  // ----- Rendu de l'état d'appel -----
  const renderCallStatus = () => {
    const statusConfig: {
      [key in CallState]: {
        icon: React.ReactElement;
        title: string | React.ReactElement;
        description: string;
        extra?: React.ReactElement;
      };
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
        extra: <div className="text-3xl font-bold text-red-600 mb-2">{formatTime(timeRemaining)}</div>
      },
      completed: {
        icon: <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />,
        title: (
          <div className="flex items-center justify-center">
            {t.callCompleted}
            {isLawyer ? <Scale className="ml-2 w-5 h-5 text-blue-600" /> : <Users className="ml-2 w-5 h-5 text-green-600" />}
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h2>
        {config.extra}
        <p className="text-gray-600">{config.description}</p>
      </div>
    );
  };

  const serviceDetailRows = [
    { label: t.service, value: isLawyer ? t.lawyerCall : t.expatCall },
    { label: t.duration, value: `${paidDuration || (isLawyer ? '20' : '30')} min` },
    { label: t.price, value: `€${paidAmount || (isLawyer ? '49' : '19')}`, bold: true },
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
                <h3 className="font-semibold text-gray-900 mb-3">{t.serviceDetails}</h3>
                <div className="space-y-2 text-sm">
                  {serviceDetailRows.map((row, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-600">{row.label}:</span>
                      <span className={row.bold ? 'font-semibold' : ''}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {/* Laisser un avis -> uniquement quand l'appel est terminé */}
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
                  onClick={() => (window.location.href = '/dashboard')}
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
        providerName={isLawyer ? 'Avocat' : 'Expatrié'}
        callId={callId}
        serviceType={isLawyer ? 'lawyer_call' : 'expat_call'}
      />
    </Layout>
  );
};

export default PaymentSuccess;
