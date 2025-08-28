import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Phone, CheckCircle, Scale, Users, Star, Clock, Shield, 
  ArrowRight, Zap, User, Briefcase, AlertCircle, RefreshCw 
} from 'lucide-react';
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

type CallState = 'connecting' | 'countdown' | 'ready_to_ring' | 'in_progress' | 'completed' | 'failed';

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
  const paymentIntentId = searchParams.get('paymentIntentId');

  // UI state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [callState, setCallState] = useState<CallState>(
    callStatus === 'failed' ? 'failed' : 'connecting'
  );
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownToCall, setCountdownToCall] = useState(300); // 5 minutes countdown
  const [paymentTimestamp, setPaymentTimestamp] = useState<number | null>(null);

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

  // ----- Init et récupération du timestamp de paiement -----
  useEffect(() => {
    if (!paymentIntentId) return;

    // 1. Chercher d'abord dans sessionStorage (plus fiable pour cette session)
    const sessionKey = `payment_timestamp_${paymentIntentId}`;
    try {
      const savedTimestamp = sessionStorage.getItem(sessionKey);
      if (savedTimestamp) {
        const timestamp = parseInt(savedTimestamp);
        setPaymentTimestamp(timestamp);
        console.log(`✅ Timestamp de paiement récupéré: ${new Date(timestamp).toLocaleString()}`);
        return;
      }
    } catch {}

    // 2. Sinon, chercher dans Firestore
    const fetchPaymentTimestamp = async () => {
      try {
        const paymentDoc = await (await import('firebase/firestore')).getDoc(
          (await import('firebase/firestore')).doc(db, 'payments', paymentIntentId)
        );
        
        if (paymentDoc.exists()) {
          const data = paymentDoc.data();
          let timestamp: number | null = null;

          // Essayer différents champs possibles pour le timestamp
          if (data.paymentSuccessTimestamp) {
            timestamp = data.paymentSuccessTimestamp.toDate?.() ? data.paymentSuccessTimestamp.toDate().getTime() : data.paymentSuccessTimestamp;
          } else if (data.updatedAt) {
            timestamp = data.updatedAt.toDate?.() ? data.updatedAt.toDate().getTime() : data.updatedAt;
          } else if (data.createdAt) {
            timestamp = data.createdAt.toDate?.() ? data.createdAt.toDate().getTime() : data.createdAt;
          }

          if (timestamp) {
            setPaymentTimestamp(timestamp);
            // Sauvegarder en session pour les prochains chargements
            sessionStorage.setItem(sessionKey, timestamp.toString());
            console.log(`✅ Timestamp de paiement récupéré depuis Firestore: ${new Date(timestamp).toLocaleString()}`);
          } else {
            // Si pas de timestamp trouvé, utiliser maintenant comme fallback
            const now = Date.now();
            setPaymentTimestamp(now);
            sessionStorage.setItem(sessionKey, now.toString());
            console.log(`⚠️ Pas de timestamp trouvé, utilisation de maintenant: ${new Date(now).toLocaleString()}`);
          }
        } else {
          // Document de paiement non trouvé, utiliser maintenant
          const now = Date.now();
          setPaymentTimestamp(now);
          sessionStorage.setItem(sessionKey, now.toString());
          console.log(`⚠️ Document de paiement non trouvé, utilisation de maintenant: ${new Date(now).toLocaleString()}`);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du timestamp:', error);
        // En cas d'erreur, utiliser maintenant
        const now = Date.now();
        setPaymentTimestamp(now);
        sessionStorage.setItem(sessionKey, now.toString());
      }
    };

    fetchPaymentTimestamp();
  }, [paymentIntentId]);

  // ----- Calcul du compte à rebours basé sur le timestamp de paiement -----
  useEffect(() => {
    if (!paymentTimestamp || callState !== 'connecting') return;

    const updateCountdown = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - paymentTimestamp) / 1000);
      const totalCountdownSeconds = 300; // 5 minutes
      const remainingSeconds = Math.max(0, totalCountdownSeconds - elapsedSeconds);

      setCountdownToCall(remainingSeconds);

      // Passage automatique à "ready_to_ring" quand le compte à rebours atteint 0
      if (remainingSeconds === 0 && callState === 'connecting') {
        setCallState('ready_to_ring');
      }
    };

    // Mise à jour immédiate
    updateCountdown();

    // Mise à jour toutes les secondes
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [paymentTimestamp, callState]);

  // ----- Timer d'affichage local pendant l'état "in_progress" -----
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
          if (callState === 'connecting') {
            // Keep countdown state
          } else {
            setCallState('connecting');
          }
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
  }, [callId, showReviewModal, callState]);

  // ----- Utils -----
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // ----- i18n avec ton fun & cool -----
  const t = useMemo(
    () => ({
      serviceNotFound: language === 'fr' ? 'Oups, service introuvable 🤔' : 'Oops, service not found 🤔',
      backToHome: language === 'fr' ? "Retour à l'accueil" : 'Back to home',
      callFailed: language === 'fr' ? 'Petit souci d\'appel 📞' : 'Call hiccup 📞',
      paymentSuccessful: language === 'fr' ? 'Paiement confirmé ! 🎉' : 'Payment locked in! 🎉',
      autoRefund:
        language === 'fr'
          ? 'On vous rembourse automatiquement — promis ! 💰'
          : 'Auto-refund coming your way — promise! 💰',
      countdownTitle: language === 'fr' ? 'Votre expert vous appelle dans' : 'Your expert calls in',
      readyToRingTitle: language === 'fr' ? 'Ça va sonner dans quelques secondes !' : 'Your phone\'s about to ring!',
      readyToRingDesc: language === 'fr' ? 'Restez près de votre téléphone et décrochez quand ça sonne 📱✨' : 'Stay close to your phone and pick up when it rings 📱✨',
      connecting:
        language === 'fr'
          ? 'C\'est parti ! On prépare la connexion avec votre expert. Ça arrive ! 🚀'
          : 'Here we go! Connecting you with your expert. Almost there! 🚀',
      connectingTitle:
        language === 'fr'
          ? 'Mise en relation en cours ⚡'
          : 'Getting you connected ⚡',
      callInProgress: language === 'fr' ? 'En pleine discussion ! 🗣️' : 'Live conversation! 🗣️',
      timeRemaining: language === 'fr' ? 'Temps restant pour papoter' : 'Time left to chat',
      callCompleted: language === 'fr' ? 'Consultation terminée ! 🎯' : 'Consultation done! 🎯',
      thankYou:
        language === 'fr'
          ? 'Merci de nous avoir fait confiance ! Vous êtes au top 🌟'
          : 'Thanks for trusting us! You\'re awesome 🌟',
      expertNoAnswer:
        language === 'fr'
          ? "Zut ! L'expert n'a pas décroché après 3 tentatives. Remboursement automatique en route ! 💸"
          : 'Oops! Expert didn\'t pick up after 3 tries. Auto-refund on the way! 💸',
      chooseAnother: language === 'fr' ? 'Choisir un autre expert' : 'Pick another expert',
      serviceDetails: language === 'fr' ? 'Le récap de votre consultation ✨' : 'Your consultation recap ✨',
      service: language === 'fr' ? 'Service' : 'Service',
      duration: language === 'fr' ? 'Durée' : 'Duration',
      price: language === 'fr' ? 'Prix' : 'Price',
      date: language === 'fr' ? 'Date' : 'Date',
      lawyerCall: language === 'fr' ? 'Consultation Avocat' : 'Lawyer Chat',
      expatCall: language === 'fr' ? 'Consultation Expat' : 'Expat Chat',
      leaveReview: language === 'fr' ? 'Donner votre avis 💫' : 'Share your thoughts 💫',
      goToDashboard: language === 'fr' ? 'Voir mon espace' : 'Check my space',
      paymentAt: language === 'fr' ? 'Paiement validé à' : 'Payment locked at',
      loadingPaymentInfo: language === 'fr' ? 'On récupère vos infos... ⏳' : 'Getting your info... ⏳',
      almostThere: language === 'fr' ? 'On y est presque ! 🎯' : 'Almost there! 🎯',
      stayTuned: language === 'fr' ? 'Restez dans le coin, ça arrive !' : 'Stay tuned, it\'s coming!',
      expertComing: language === 'fr' ? 'Votre expert arrive au bout du fil ! 📞' : 'Your expert is dialing in! 📞',
      allGood: language === 'fr' ? 'Tout est parfait ! ✨' : 'All looking good! ✨',
      superFast: language === 'fr' ? 'Ultra-rapide comme promis ⚡' : 'Lightning fast as promised ⚡',
      youRock: language === 'fr' ? 'Vous assurez ! 🤘' : 'You rock! 🤘'
    }),
    [language]
  );

  // ----- Early return si pas d'infos service -----
  if (!paidAmount && !paidServiceType) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">{t.serviceNotFound}</h1>
            <a href="/" className="text-red-400 hover:text-red-300">
              {t.backToHome}
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  // ----- Rendu principal selon l'état -----
  return (
    <Layout>
      <div className="min-h-screen bg-gray-950">
        {/* Hero Section avec état dynamique */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          
          {/* Particules d'arrière-plan animées */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            {/* Badge de statut avec plus de fun */}
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full pl-6 pr-6 py-3 border border-white/20 mb-8">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">{t.paymentSuccessful}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            {/* Affichage du timestamp de paiement avec style fun */}
            {paymentTimestamp && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <Clock className="w-4 h-4 text-gray-300" />
                  <span className="text-white/80 text-sm">
                    {t.paymentAt}: {new Date(paymentTimestamp).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')} ✨
                  </span>
                </div>
              </div>
            )}

            {/* Indicateur de chargement fun */}
            {!paymentTimestamp && callState === 'connecting' && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white/60 text-sm">{t.loadingPaymentInfo}</span>
                </div>
              </div>
            )}

            {/* État de l'appel */}
            {callState === 'connecting' && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    {t.countdownTitle}
                  </span>
                </h1>
                
                {/* Compte à rebours principal */}
                <div className="mb-8">
                  {paymentTimestamp ? (
                    <>
                      <div className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-r from-red-600 to-orange-500 shadow-2xl mb-6">
                        <div className="w-44 h-44 rounded-full bg-gray-950 flex items-center justify-center">
                          <div className="text-6xl font-black text-white">
                            {formatTime(countdownToCall)}
                          </div>
                        </div>
                      </div>
                      <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {t.connecting}
                      </p>
                      {/* Message encourageant supplémentaire */}
                      <div className="mt-4 inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2">
                        <span className="text-white/70 text-sm">{t.almostThere}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-500 shadow-2xl mb-6">
                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                      <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {t.loadingPaymentInfo}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {callState === 'ready_to_ring' && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {t.readyToRingTitle}
                  </span>
                </h1>
                
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-blue-500 shadow-2xl mb-6 animate-bounce">
                    <Phone className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                    {t.readyToRingDesc}
                  </p>
                  {/* Message fun supplémentaire */}
                  <div className="mt-4 inline-flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-400/20">
                    <span className="text-green-300 text-sm font-medium">{t.expertComing}</span>
                  </div>
                </div>
              </>
            )}

            {callState === 'in_progress' && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {t.callInProgress}
                  </span>
                </h1>
                
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-blue-500 shadow-2xl mb-6">
                    <Phone className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <div className="text-4xl font-black text-white mb-4">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-xl text-gray-300">{t.timeRemaining}</p>
                  {/* Badge fun */}
                  <div className="mt-4 inline-flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-400/20">
                    <span className="text-green-300 text-sm font-medium">{t.youRock}</span>
                  </div>
                </div>
              </>
            )}

            {callState === 'completed' && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {t.callCompleted}
                  </span>
                </h1>
                
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-blue-500 shadow-2xl mb-6">
                    <CheckCircle className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                    {t.thankYou}
                  </p>
                  {/* Badge de félicitations */}
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 backdrop-blur-sm rounded-full px-6 py-3 border border-yellow-400/20">
                    <span className="text-yellow-300 text-lg font-bold">{t.superFast}</span>
                  </div>
                </div>
              </>
            )}

            {callState === 'failed' && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    {t.callFailed}
                  </span>
                </h1>
                
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-2xl mb-6">
                    <AlertCircle className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                    {t.expertNoAnswer}
                  </p>
                <button
                  onClick={() => navigate('/prestataires')}
                  className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  {t.chooseAnother} 🔄
                </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Section Détails du service */}
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                {isLawyer ? (
                  <>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    {t.serviceDetails} — Avocat 🎯
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <User className="w-5 h-5" />
                    </div>
                    {t.serviceDetails} — Expat 🌍
                  </>
                )}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-gray-600 font-medium">{t.service}:</span>
                    <span className="font-bold text-gray-900">
                      {isLawyer ? t.lawyerCall : t.expatCall}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-gray-600 font-medium">{t.duration}:</span>
                    <span className="font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {paidDuration || (isLawyer ? '20' : '30')} min
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border border-green-200">
                    <span className="text-green-700 font-medium">{t.price}:</span>
                    <span className="font-black text-2xl text-green-800">
                      €{paidAmount || (isLawyer ? '49' : '19')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-gray-600 font-medium">{t.date}:</span>
                    <span className="font-bold text-gray-900">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Garanties avec style fun */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center mb-4">
                  <span className="text-sm font-semibold text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                    {t.allGood}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {language === 'fr' ? 'Paiement ultra-sécurisé 🔐' : 'Ultra-secure payment 🔐'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Zap className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {language === 'fr' ? 'Connexion rapide ⚡' : 'Lightning connection ⚡'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {language === 'fr' ? 'Satisfaction garantie 🌟' : 'Satisfaction guaranteed 🌟'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="py-16 bg-gray-950">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="space-y-4">
              {/* Laisser un avis -> uniquement quand l'appel est terminé */}
              {callState === 'completed' && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-4 px-8 rounded-2xl hover:scale-105 transition-all duration-300 font-bold text-lg inline-flex items-center justify-center gap-3"
                >
                  <Star size={20} />
                  {t.leaveReview}
                  <ArrowRight size={16} />
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => (window.location.href = '/dashboard')}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white py-4 px-8 rounded-2xl hover:bg-white/20 transition-all duration-300 font-bold inline-flex items-center justify-center gap-3"
                >
                  {t.goToDashboard} 🚀
                  <ArrowRight size={16} />
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 py-4 px-8 rounded-2xl hover:bg-white/10 hover:text-white transition-all duration-300 font-medium inline-flex items-center justify-center gap-3"
                >
                  {t.backToHome} 🏠
                </button>
              </div>
            </div>
          </div>
        </section>
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