import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Clock, Shield, AlertCircle, CreditCard, Lock, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { functions, db } from '../config/firebase';
import { httpsCallable, HttpsCallable } from 'firebase/functions';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Provider, normalizeProvider } from '../types/provider';
import Layout from '../components/layout/Layout';
import { detectUserCurrency, usePricingConfig } from '../services/pricingService';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/* ------------------------------ Stripe init ------------------------------ */
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

/* --------------------------------- Types --------------------------------- */
type Currency = 'eur' | 'usd';
type ServiceKind = 'lawyer' | 'expat';
type Lang = 'fr' | 'en';

interface ServiceData {
  providerId: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerRole: ServiceKind;
  amount: number;
  duration: number;
  clientPhone: string;
  commissionAmount: number;
  providerAmount: number;
  currency?: Currency;
}

interface User {
  uid?: string;
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
  providerType: ServiceKind;
  paymentIntentId: string;
  amount: number;
  currency: 'EUR' | 'USD';
  delayMinutes?: number;
  clientLanguages?: string[];
  providerLanguages?: string[];
  clientWhatsapp?: string;
}

type StepType = 'payment' | 'calling' | 'completed';

interface CallCheckoutProps {
  selectedProvider?: Provider;
  serviceData?: Partial<ServiceData>;
  onGoBack?: () => void;
}

/* --------------------------------- gtag ---------------------------------- */
type GtagFunction = (...args: unknown[]) => void;
interface GtagWindow { gtag?: GtagFunction; }
const getGtag = (): GtagFunction | undefined =>
  (typeof window !== 'undefined' ? (window as unknown as GtagWindow).gtag : undefined);

/* -------------------------------- i18n ----------------------------------- */
const useTranslation = () => {
  const { language: ctxLang } = { language: 'fr' as Lang };
  const language: Lang = (ctxLang === 'en' ? 'en' : 'fr');

  const dict: Record<string, Record<Lang, string>> = {
    'meta.title': { fr: 'Paiement & Mise en relation - SOS Expats', en: 'Checkout & Connection - SOS Expats' },
    'meta.description': { fr: "Réglez en toute sécurité et lancez votre consultation avec l'expert sélectionné.", en: 'Pay securely and start your consultation with the selected expert.' },
    'meta.keywords': { fr: 'paiement, consultation, avocat, expatriés, SOS Expats, appel', en: 'payment, consultation, lawyer, expats, call' },
    'meta.og_title': { fr: 'Paiement sécurisé - SOS Expats', en: 'Secure Checkout - SOS Expats' },
    'meta.og_description': { fr: 'Paiement SSL, mise en relation automatique avec votre expert.', en: 'SSL payment, automatic connection with your expert.' },
    'meta.og_image_alt': { fr: 'Paiement SOS Expats', en: 'SOS Expats Checkout' },
    'meta.twitter_image_alt': { fr: 'Interface de paiement SOS Expats', en: 'SOS Expats checkout interface' },

    'ui.back': { fr: 'Retour', en: 'Back' },
    'ui.securePayment': { fr: 'Paiement sécurisé', en: 'Secure payment' },
    'ui.connecting': { fr: 'Mise en relation', en: 'Connecting' },
    'ui.completed': { fr: 'Consultation terminée', en: 'Consultation completed' },
    'ui.payToStart': { fr: 'Validez pour lancer la consultation', en: 'Confirm to start the consultation' },
    'ui.connectingExpert': { fr: 'Connexion avec votre expert', en: 'Connecting to your expert' },
    'ui.thanks': { fr: "Merci d'avoir utilisé nos services", en: 'Thank you for using our services' },

    'card.title': { fr: 'Paiement', en: 'Payment' },
    'card.number': { fr: 'Numéro de carte', en: 'Card number' },
    'card.expiry': { fr: 'Expiration', en: 'Expiry' },
    'card.cvc': { fr: 'CVC', en: 'CVC' },

    'summary.title': { fr: 'Récapitulatif', en: 'Summary' },
    'summary.expert': { fr: 'Expert', en: 'Expert' },
    'summary.service': { fr: 'Service', en: 'Service' },
    'summary.duration': { fr: 'Durée', en: 'Duration' },
    'summary.total': { fr: 'Total', en: 'Total' },

    'btn.pay': { fr: 'Payer', en: 'Pay' },
    'btn.evaluate': { fr: 'Évaluer', en: 'Review' },
    'btn.receipt': { fr: 'Télécharger le reçu', en: 'Download receipt' },
    'btn.home': { fr: "Retour à l'accueil", en: 'Back to home' },

    'status.paid': { fr: 'Paiement confirmé', en: 'Payment confirmed' },
    'status.expertContacted': { fr: 'Expert contacté(e)', en: 'Expert contacted' },
    'status.callStarted': { fr: 'Consultation démarrée', en: 'Consultation started' },

    'alert.missingDataTitle': { fr: 'Données manquantes', en: 'Missing data' },
    'alert.missingDataText': { fr: 'Veuillez sélectionner à nouveau un expert.', en: 'Please select an expert again.' },
    'alert.loginRequiredTitle': { fr: 'Connexion requise', en: 'Login required' },
    'alert.loginRequiredText': { fr: 'Connectez-vous pour lancer une consultation.', en: 'Sign in to start a consultation.' },

    'banner.secure': { fr: 'Paiement sécurisé', en: 'Secure payment' },
    'banner.ssl': {
      fr: 'Données protégées par SSL. Appel lancé automatiquement après paiement.',
      en: 'Data protected by SSL. Call launched automatically after payment.'
    },

    'err.invalidConfig': { fr: 'Configuration de paiement invalide', en: 'Invalid payment configuration' },
    'err.unauth': { fr: 'Utilisateur non authentifié', en: 'Unauthenticated user' },
    'err.sameUser': { fr: "Vous ne pouvez pas réserver avec vous-même", en: "You can't book yourself" },
    'err.minAmount': { fr: 'Montant minimum 5€', en: 'Minimum amount €5' },
    'err.maxAmount': { fr: 'Montant maximum 500€', en: 'Maximum amount €500' },
    'err.amountMismatch': { fr: 'Montant invalide. Merci de réessayer.', en: 'Invalid amount. Please try again.' },
    'err.noClientSecret': { fr: 'ClientSecret manquant', en: 'Missing ClientSecret' },
    'err.noCardElement': { fr: 'Champ carte introuvable', en: 'Card field not found' },
    'err.stripe': { fr: 'Erreur de paiement Stripe', en: 'Stripe payment error' },
    'err.paymentFailed': { fr: 'Le paiement a échoué', en: 'Payment failed' },
    'err.actionRequired': { fr: 'Authentification supplémentaire requise', en: 'Additional authentication required' },
    'err.invalidMethod': { fr: 'Méthode de paiement invalide', en: 'Invalid payment method' },
    'err.canceled': { fr: 'Le paiement a été annulé', en: 'Payment was canceled' },
    'err.unexpectedStatus': { fr: 'Statut de paiement inattendu', en: 'Unexpected payment status' },
    'err.genericPayment': { fr: 'Une erreur est survenue lors du paiement', en: 'An error occurred during payment' },
    'err.invalidPhone': { fr: 'Numéro de téléphone invalide', en: 'Invalid phone number' },
  };

  const t = (key: keyof typeof dict, fallback?: string) =>
    dict[key]?.[language] ?? fallback ?? String(key);

  return { t, language };
};

/* ------------------------------ SEO helpers ------------------------------ */
const useSEO = (meta: {
  title: string; description: string; keywords: string; ogTitle: string; ogDescription: string;
  canonicalUrl: string; alternateUrls: Record<'fr' | 'en', string>; structuredData: Record<string, unknown>;
  locale: Lang; ogImagePath: string; twitterImagePath: string; ogImageAlt: string; twitterImageAlt: string;
}) => {
  useEffect(() => {
    document.title = meta.title;
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };

    updateMeta('description', meta.description);
    updateMeta('keywords', meta.keywords);
    updateMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateMeta('og:type', 'website', true);
    updateMeta('og:title', meta.ogTitle, true);
    updateMeta('og:description', meta.ogDescription, true);
    updateMeta('og:url', meta.canonicalUrl, true);
    updateMeta('og:site_name', 'SOS Expats', true);

    const ogLocale =
      meta.locale === 'fr' ? 'fr_FR' :
      meta.locale === 'en' ? 'en_US' :
      `${String(meta.locale)}_${String(meta.locale).toUpperCase()}`;
    updateMeta('og:locale', ogLocale, true);

    updateMeta('og:image', meta.ogImagePath, true);
    updateMeta('og:image:alt', meta.ogImageAlt, true);
    updateMeta('og:image:width', '1200', true);
    updateMeta('og:image:height', '630', true);

    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:site', '@sosexpats');
    updateMeta('twitter:creator', '@sosexpats');
    updateMeta('twitter:title', meta.ogTitle);
    updateMeta('twitter:description', meta.ogDescription);
    updateMeta('twitter:image', meta.twitterImagePath);
    updateMeta('twitter:image:alt', meta.twitterImageAlt);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = meta.canonicalUrl;

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => l.parentElement?.removeChild(l));
    Object.entries(meta.alternateUrls).forEach(([lang, url]) => {
      const el = document.createElement('link');
      el.rel = 'alternate'; el.hreflang = lang; el.href = url; document.head.appendChild(el);
    });
    const xDef = document.createElement('link');
    xDef.rel = 'alternate'; xDef.hreflang = 'x-default'; xDef.href = meta.alternateUrls.fr; document.head.appendChild(xDef);

    let ld = document.querySelector('#structured-data') as HTMLScriptElement | null;
    if (!ld) { ld = document.createElement('script'); ld.id = 'structured-data'; ld.type = 'application/ld+json'; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify(meta.structuredData);
  }, [meta]);
};

/* ------------------------ Helpers: device & phone utils ------------------ */
const normalizePhone = (raw: string) => raw.replace(/[^\d+]/g, '');

// E.164 normalizer (critique pour la CF)
const toE164 = (raw?: string) => {
  if (!raw) return '';
  const p = parsePhoneNumberFromString(raw);
  return p?.isValid() ? p.number : '';
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 640px), (pointer: coarse)');
    const update = () => setIsMobile(!!mq.matches);
    update();
    if ('addEventListener' in mq) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      // @ts-expect-error legacy safari
      mq.addListener(update);
      // @ts-expect-error legacy safari
      return () => mq.removeListener(update);
    }
  }, []);
  return isMobile;
};

/* --------------------- Price tracing: hook & helpers --------------------- */
interface PricingEntryTrace {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
}
interface PricingConfigShape {
  lawyer: Record<Currency, PricingEntryTrace>;
  expat:  Record<Currency, PricingEntryTrace>;
}
type TraceAttributes = {
  [K in `data-${string}`]?: string | number;
} & { title?: string };

function usePriceTracing() {
  const { pricing, loading } = usePricingConfig() as { pricing?: PricingConfigShape; loading: boolean };

  const getTraceAttributes = (
    serviceType: ServiceKind,
    currency: Currency,
    providerOverride?: number
  ): TraceAttributes => {
    if (loading) {
      return {
        'data-price-source': 'loading',
        'data-currency': currency,
        title: 'Prix en cours de chargement...',
      };
    }

    if (typeof providerOverride === 'number') {
      return {
        'data-price-source': 'provider',
        'data-currency': currency,
        'data-service-type': serviceType,
        title: `Prix personnalisé prestataire (${providerOverride}${currency === 'eur' ? '€' : '$'})`,
      };
    }

    if (pricing) {
      const cfg = pricing[serviceType][currency];
      return {
        'data-price-source': 'admin',
        'data-currency': currency,
        'data-service-type': serviceType,
        'data-total-amount': cfg.totalAmount,
        'data-connection-fee': cfg.connectionFeeAmount,
        'data-provider-amount': cfg.providerAmount,
        'data-duration': cfg.duration,
        title: `Prix admin: ${cfg.totalAmount}${currency === 'eur' ? '€' : '$'} • Frais: ${cfg.connectionFeeAmount}${currency === 'eur' ? '€' : '$'} • Provider: ${cfg.providerAmount}${currency === 'eur' ? '€' : '$'} • ${cfg.duration}min`,
      };
    }

    return {
      'data-price-source': 'fallback',
      'data-currency': currency,
      title: 'Prix de secours (admin indisponible)',
    };
  };

  return { getTraceAttributes };
}

/* -------------------------- Stripe card element opts --------------------- */
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      letterSpacing: '0.025em',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '500',
      '::placeholder': { color: '#9ca3af', fontWeight: '400' },
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
    complete: { color: '#10b981', iconColor: '#10b981' }
  },
} as const;

const singleCardElementOptions = {
  style: cardElementOptions.style,
  hidePostalCode: true,
} as const;

/* --------------------------- Confirm Modal UI ---------------------------- */
const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, title, message, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-4 shadow-xl border">
        <div className="flex items-start gap-2">
          <div className="p-2 rounded-md bg-blue-100 text-blue-700">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-700">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="px-3 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50">Annuler</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirmer</button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------ Payment Form ----------------------------- */
interface PaymentFormSuccessPayload {
  paymentIntentId: string;
  call: 'scheduled' | 'skipped';
  callId?: string;
}
interface PaymentFormProps {
  user: User;
  provider: Provider;
  service: ServiceData;
  adminPricing: PricingEntryTrace;
  onSuccess: (payload: PaymentFormSuccessPayload) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isMobile: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = React.memo(({ user, provider, service, adminPricing, onSuccess, onError, isProcessing, setIsProcessing, isMobile }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t, language } = useTranslation();
  const { getTraceAttributes } = usePriceTracing();

  const serviceCurrency = (service.currency || 'eur').toLowerCase() as Currency;
  const currencySymbol = serviceCurrency === 'usd' ? '$' : '€';
  const stripeCurrency = serviceCurrency;

  const priceInfo = useMemo(
    () => getTraceAttributes(service.serviceType === 'lawyer_call' ? 'lawyer' : 'expat', serviceCurrency),
    [getTraceAttributes, service.serviceType, serviceCurrency]
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<(() => Promise<void>) | null>(null);

  const validatePaymentData = useCallback(() => {
    if (!stripe || !elements) throw new Error(t('err.invalidConfig'));
    if (!user?.uid) throw new Error(t('err.unauth'));
    if (provider.id === user.uid) throw new Error(t('err.sameUser'));
    if (adminPricing.totalAmount < 5) throw new Error(t('err.minAmount'));
    if (adminPricing.totalAmount > 500) throw new Error(t('err.maxAmount'));
    const eq = Math.abs(service.amount - adminPricing.totalAmount) < 0.01;
    if (!eq) throw new Error(t('err.amountMismatch'));
  }, [stripe, elements, user, provider.id, service.amount, adminPricing.totalAmount, t]);

  const persistPaymentDocs = useCallback(
    async (paymentIntentId: string) => {
      const baseDoc = {
        paymentIntentId,
        providerId: provider.id,
        providerName: provider.fullName || provider.name || '',
        providerRole: provider.role || provider.type || 'expat',
        clientId: user.uid!,
        clientEmail: user.email || '',
        clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        clientPhone: service.clientPhone,
        clientWhatsapp: '',
        serviceType: service.serviceType,
        duration: adminPricing.duration,
        amount: adminPricing.totalAmount,
        commissionAmount: adminPricing.connectionFeeAmount,
        providerAmount: adminPricing.providerAmount,
        currency: serviceCurrency,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      try { await setDoc(doc(db, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch { /* no-op */ }
      try { await setDoc(doc(db, 'users', user.uid!, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch { /* no-op */ }
      try { await setDoc(doc(db, 'providers', provider.id, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch { /* no-op */ }
    },
    [provider, service.clientPhone, service.serviceType, user, adminPricing, serviceCurrency]
  );

  const actuallySubmitPayment = useCallback(async () => {
    try {
      setIsProcessing(true);
      validatePaymentData();

      const createPaymentIntent: HttpsCallable<PaymentIntentData, PaymentIntentResponse> = httpsCallable(functions, 'createPaymentIntent');

      const paymentData: PaymentIntentData = {
        amount: adminPricing.totalAmount,
        commissionAmount: adminPricing.connectionFeeAmount,
        providerAmount: adminPricing.providerAmount,
        currency: stripeCurrency,
        serviceType: service.serviceType,
        providerId: provider.id,
        clientId: user.uid!,
        clientEmail: user.email || '',
        providerName: provider.fullName || provider.name || '',
        description: service.serviceType === 'lawyer_call'
          ? (language === 'fr' ? 'Consultation avocat' : 'Lawyer consultation')
          : (language === 'fr' ? 'Consultation expatriation' : 'Expat consultation'),
        metadata: {
          providerType: provider.role || provider.type || 'expat',
          duration: String(adminPricing.duration),
          clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          clientPhone: service.clientPhone,
          clientWhatsapp: '',
          currency: serviceCurrency,
          timestamp: new Date().toISOString()
        }
      };

      const res = await createPaymentIntent(paymentData);
      const clientSecret = res.data.clientSecret;
      if (!clientSecret) throw new Error(t('err.noClientSecret'));

      const chosenCardElement = isMobile
        ? elements!.getElement(CardElement)
        : elements!.getElement(CardNumberElement);

      if (!chosenCardElement) throw new Error(t('err.noCardElement'));

      const result = await stripe!.confirmCardPayment(clientSecret, {
        payment_method: {
          card: chosenCardElement,
          billing_details: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email || '',
          },
        },
      });

      if (result.error) throw new Error(result.error.message || t('err.stripe'));
      const paymentIntent = result.paymentIntent;
      if (!paymentIntent) throw new Error(t('err.paymentFailed'));

      const status = paymentIntent.status;
      if (!['succeeded', 'requires_capture', 'processing'].includes(status)) {
        if (status === 'requires_action') throw new Error(t('err.actionRequired'));
        if (status === 'requires_payment_method') throw new Error(t('err.invalidMethod'));
        if (status === 'canceled') throw new Error(t('err.canceled'));
        throw new Error(`${t('err.unexpectedStatus')}: ${status}`);
      }

      // ✅ ne pas bloquer l'UX
      void persistPaymentDocs(paymentIntent.id);

      const rawClientPhone   = service.clientPhone || user?.phone || '';
      const rawProviderPhone = provider.phoneNumber || provider.phone || '';
      const clientPhoneE164   = toE164(rawClientPhone);
      const providerPhoneE164 = toE164(rawProviderPhone);

      // ✅ naviguer immédiatement
      const gtag = getGtag();
      gtag?.('event', 'checkout_success', {
        service_type: service.serviceType,
        provider_id: provider.id,
        payment_intent: paymentIntent.id,
        currency: serviceCurrency,
        amount: adminPricing.totalAmount,
        call_status: 'skipped',
      });

      onSuccess({ paymentIntentId: paymentIntent.id, call: 'skipped' });

      // 🚀 planifier l'appel en tâche de fond (sans bloquer la navigation)
      if (clientPhoneE164 && providerPhoneE164) {
        const createAndScheduleCall: HttpsCallable<CreateAndScheduleCallData, { success: boolean; callId?: string }> =
          httpsCallable(functions, 'createAndScheduleCall');
        const callData: CreateAndScheduleCallData = {
          providerId: provider.id,
          clientId: user.uid!,
          providerPhone: providerPhoneE164,
          clientPhone: clientPhoneE164,
          clientWhatsapp: '',
          serviceType: service.serviceType,
          providerType: (provider.role || provider.type || 'expat') as ServiceKind,
          paymentIntentId: paymentIntent.id,
          amount: adminPricing.totalAmount,
          currency: serviceCurrency.toUpperCase() as 'EUR' | 'USD',
          delayMinutes: 5,
          clientLanguages: [language],
          providerLanguages: provider.languagesSpoken || provider.languages || ['fr'],
        };
        void (async () => {
          try {
            await createAndScheduleCall(callData);
          } catch (cfErr) {
            console.warn('createAndScheduleCall failed (post-nav):', cfErr);
          }
        })();
      } else {
        console.warn('Missing/invalid phone(s). Skipping call scheduling.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const msg = err?.message || err?.details || (typeof err === 'string' ? err : t('err.genericPayment'));
      onError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [
    setIsProcessing,
    validatePaymentData,
    adminPricing.totalAmount,
    adminPricing.connectionFeeAmount,
    adminPricing.providerAmount,
    stripeCurrency,
    service.serviceType,
    provider.id,
    user.uid,
    user.email,
    provider.fullName,
    provider.name,
    language,
    service.clientPhone,
    adminPricing.duration,
    serviceCurrency,
    isMobile,
    elements,
    stripe,
    onSuccess,
    onError,
    provider.role,
    provider.type,
    provider.phoneNumber,
    provider.phone,
    user.firstName,
    user.lastName,
    persistPaymentDocs,
  ]);

  const handlePaymentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    // Remplace confirm() bloquant par une modale non bloquante
    if (adminPricing.totalAmount > 100) {
      setPendingSubmit(() => actuallySubmitPayment);
      setShowConfirm(true);
      return;
    }

    await actuallySubmitPayment();
  }, [isProcessing, adminPricing.totalAmount, actuallySubmitPayment]);

  const providerDisplayName = useMemo(
    () => provider?.fullName || provider?.name || `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim() || 'Expert',
    [provider]
  );

  const serviceTypeDisplay = useMemo(
    () => service.serviceType === 'lawyer_call'
      ? (language === 'fr' ? 'Consultation Avocat' : 'Lawyer Consultation')
      : (language === 'fr' ? 'Consultation Expatrié' : 'Expat Consultation'),
    [service.serviceType, language]
  );

  return (
    <>
      <form onSubmit={handlePaymentSubmit} className="space-y-4" noValidate>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span className="sr-only">{t('card.title')}</span>
            </div>
          </label>

          {isMobile ? (
            <div className="space-y-2" aria-live="polite">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                {t('card.number')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </div>
                <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                  <CardElement options={singleCardElementOptions} />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {language === 'fr'
                    ? 'Saisie simplifiée pour mobile. Sécurisé par Stripe.'
                    : 'Simplified entry on mobile. Secured by Stripe.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {t('card.number')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="pl-10 pr-3 py-3.5 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200 hover:border-gray-300">
                    <CardNumberElement options={cardElementOptions} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('card.expiry')}
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
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {t('card.cvc')}
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
            </>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Expert</span>
              <div className="flex items-center space-x-2">
                <img
                  src={provider.avatar || provider.profilePhoto || '/default-avatar.png'}
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const name = providerDisplayName;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=40`;
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
              <span className="font-medium text-gray-800 text-xs">{adminPricing.duration} min</span>
            </div>

            <div className="border-t-2 border-gray-400 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span
                  className="text-lg font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent"
                  {...priceInfo}
                >
                  {adminPricing.totalAmount.toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className={
            "w-full py-4 rounded-xl font-bold text-white transition-all duration-300 " +
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 " +
            "active:scale-[0.98] touch-manipulation relative overflow-hidden " +
            ((!stripe || isProcessing)
              ? "bg-gray-400 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl")
          }
          aria-label={`${
            language === 'fr' ? 'Payer ' : 'Pay '
          }${new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
            style: 'currency',
            currency: serviceCurrency.toUpperCase(),
            minimumFractionDigits: 2,
          }).format(adminPricing.totalAmount)}`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-5 h-5" />
              <span>...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Lock className="w-5 h-5" aria-hidden="true" />
              <span>
                {language === 'fr' ? 'Payer ' : 'Pay '}
                {new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
                  style: 'currency',
                  currency: serviceCurrency.toUpperCase(),
                  minimumFractionDigits: 2,
                }).format(adminPricing.totalAmount)}
              </span>
            </div>
          )}
        </button>

        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <Shield className="w-3 h-3 text-green-600" aria-hidden="true" />
            <span className="text-xs font-medium text-gray-700">Stripe</span>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
          </div>
        </div>
      </form>

      {/* Modale de confirmation non bloquante */}
      <ConfirmModal
        open={showConfirm}
        title={language === 'fr' ? 'Confirmer le paiement' : 'Confirm payment'}
        message={
          language === 'fr'
            ? `Confirmer le paiement de ${adminPricing.totalAmount.toFixed(2)}${currencySymbol} en ${serviceCurrency.toUpperCase()} ?`
            : `Confirm payment of ${adminPricing.totalAmount.toFixed(2)}${currencySymbol} in ${serviceCurrency.toUpperCase()}?`
        }
        onCancel={() => { setShowConfirm(false); setPendingSubmit(null); }}
        onConfirm={async () => {
          setShowConfirm(false);
          const fn = pendingSubmit;
          setPendingSubmit(null);
          if (fn) await fn();
        }}
      />
    </>
  );
});
PaymentForm.displayName = 'PaymentForm';

interface DebugPriceEntry {
  element: Element;
  source: string;
  currency: string;
  serviceType?: string;
  text: string;
}
interface DebugPricingAPI {
  showAllPrices: () => DebugPriceEntry[];
  highlightBySource: (source: 'admin' | 'provider' | 'fallback' | 'loading') => void;
  clearHighlights: () => void;
}
declare global {
  interface Window {
    debugPricing?: DebugPricingAPI;
  }
}

const CallCheckout: React.FC<CallCheckoutProps> = ({ selectedProvider, serviceData, onGoBack }) => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { getTraceAttributes } = usePriceTracing();

  const { pricing, error: pricingError, loading: pricingLoading } = usePricingConfig() as {
    pricing?: { lawyer: Record<Currency, PricingEntryTrace>; expat: Record<Currency, PricingEntryTrace> };
    error?: unknown;
    loading: boolean;
  };

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('eur');

  useEffect(() => {
    const initializeCurrency = () => {
      if (serviceData?.currency && ['eur', 'usd'].includes(serviceData.currency)) {
        setSelectedCurrency(serviceData.currency as Currency);
        return;
      }
      try {
        const saved = sessionStorage.getItem('selectedCurrency') as Currency | null;
        if (saved && ['eur', 'usd'].includes(saved)) {
          setSelectedCurrency(saved);
          return;
        }
      } catch { /* no-op */ }
      try {
        const preferred = localStorage.getItem('preferredCurrency') as Currency | null;
        if (preferred && ['eur', 'usd'].includes(preferred)) {
          setSelectedCurrency(preferred);
          return;
        }
      } catch { /* no-op */ }
      const detected = detectUserCurrency();
      setSelectedCurrency(detected);
    };
    initializeCurrency();
  }, [serviceData?.currency]);

  useEffect(() => {
    try {
      sessionStorage.setItem('selectedCurrency', selectedCurrency);
      localStorage.setItem('preferredCurrency', selectedCurrency);
    } catch { /* no-op */ }
  }, [selectedCurrency]);

  const provider = useMemo<Provider | null>(() => {
    if (selectedProvider?.id) return normalizeProvider(selectedProvider);
    try {
      const saved = sessionStorage.getItem('selectedProvider');
      if (saved) {
        const p = JSON.parse(saved) as Provider;
        if (p?.id) return normalizeProvider(p);
      }
    } catch { /* no-op */ }
    return null;
  }, [selectedProvider]);

  const providerRole: ServiceKind | null = useMemo(() => {
    if (!provider) return null;
    return ((provider.role || provider.type || 'expat') as ServiceKind);
  }, [provider]);

  const storedClientPhone = useMemo(() => {
    try { return sessionStorage.getItem('clientPhone') || ''; } catch { return ''; }
  }, []);

  const adminPricing: PricingEntryTrace | null = useMemo(() => {
    if (!pricing || !providerRole) return null;
    return pricing[providerRole]?.[selectedCurrency] ?? null;
  }, [pricing, providerRole, selectedCurrency]);

  const service: ServiceData | null = useMemo(() => {
    if (!provider || !adminPricing || !providerRole) return null;
    return {
      providerId: provider.id,
      serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
      providerRole,
      amount: adminPricing.totalAmount,
      duration: adminPricing.duration,
      clientPhone: toE164(storedClientPhone || user?.phone || ''),
      commissionAmount: adminPricing.connectionFeeAmount,
      providerAmount: adminPricing.providerAmount,
      currency: selectedCurrency,
    };
  }, [provider, adminPricing, providerRole, user?.phone, selectedCurrency, storedClientPhone]);

  const cardTraceAttrs = useMemo(
    () => getTraceAttributes(providerRole || 'expat', selectedCurrency),
    [getTraceAttributes, providerRole, selectedCurrency]
  );

  // Expose debug helpers (DEV only)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    if (!window.debugPricing) {
      window.debugPricing = {
        showAllPrices: () => {
          const elements = document.querySelectorAll('[data-price-source]');
          const prices: DebugPriceEntry[] = [];
          elements.forEach(el => {
            prices.push({
              element: el,
              source: el.getAttribute('data-price-source') || 'unknown',
              currency: el.getAttribute('data-currency') || 'unknown',
              serviceType: el.getAttribute('data-service-type') || undefined,
              text: (el.textContent || '').trim()
            });
          });
          console.table(prices);
          return prices;
        },
        highlightBySource: (source) => {
          document.querySelectorAll('.debug-price-highlight').forEach(el => {
            el.classList.remove('debug-price-highlight');
            (el as HTMLElement).style.outline = '';
            (el as HTMLElement).style.backgroundColor = '';
          });
          document.querySelectorAll(`[data-price-source="${source}"]`).forEach(el => {
            el.classList.add('debug-price-highlight');
            (el as HTMLElement).style.outline = '3px solid red';
            (el as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
          });
        },
        clearHighlights: () => {
          document.querySelectorAll('.debug-price-highlight').forEach(el => {
            el.classList.remove('debug-price-highlight');
            (el as HTMLElement).style.outline = '';
            (el as HTMLElement).style.backgroundColor = '';
          });
        }
      };
      console.log('Debug pricing disponible: window.debugPricing');
    }
  }

  // ✅ Mémoïse l'objet SEO pour éviter des recalculs inutiles
  const seoMeta = useMemo(() => ({
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: t('meta.keywords'),
    ogTitle: t('meta.og_title'),
    ogDescription: t('meta.og_description'),
    ogImagePath: `${window.location.origin}/images/og-checkout-${language}.jpg`,
    twitterImagePath: `${window.location.origin}/images/twitter-checkout-${language}.jpg`,
    ogImageAlt: t('meta.og_image_alt'),
    twitterImageAlt: t('meta.twitter_image_alt'),
    canonicalUrl: `${window.location.origin}/${language}/checkout`,
    alternateUrls: {
      fr: `${window.location.origin}/fr/checkout`,
      en: `${window.location.origin}/en/checkout`
    } as Record<'fr' | 'en', string>,
    locale: language as Lang,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${window.location.origin}/${language}/checkout#webpage`,
      name: t('meta.title'),
      description: t('meta.description'),
      url: `${window.location.origin}/${language}/checkout`,
      inLanguage: language,
      mainEntity: {
        '@type': 'Action',
        '@id': `${window.location.origin}/${language}/checkout#action`,
        name: t('meta.title'),
        target: `${window.location.origin}/${language}/checkout`,
        object: { '@type': 'Service', name: 'Call consultation' }
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
          { '@type': 'ListItem', position: 2, name: 'Checkout', item: `${window.location.origin}/${language}/checkout` }
        ]
      },
      author: {
        '@type': 'Organization',
        '@id': `${window.location.origin}#organization`,
        name: 'SOS Expats',
        url: window.location.origin,
        logo: `${window.location.origin}/images/logo.png`
      },
      publisher: { '@id': `${window.location.origin}#organization` }
    } as Record<string, unknown>
  }), [language, t]);

  useSEO(seoMeta);

  const goBack = useCallback(() => {
    if (onGoBack) return onGoBack();
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [onGoBack, navigate]);

  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePaymentSuccess = useCallback((payload: { paymentIntentId: string; call: 'scheduled' | 'skipped'; callId?: string }) => {
    setCurrentStep('calling');
    setCallProgress(1);

    const params = new URLSearchParams({
      paymentIntentId: payload.paymentIntentId,
      providerId: (provider?.id || ''),
      call: payload.call,
    });
    if (payload.callId) params.set('callId', payload.callId);

    navigate(`/payment-success?${params.toString()}`, { replace: true });
  }, [navigate, provider?.id]);

  const handlePaymentError = useCallback((msg: string) => setError(msg), []);

  useEffect(() => {
    if (currentStep === 'calling' && callProgress < 5) {
      const timer = setTimeout(() => {
        setCallProgress(prev => {
          const next = prev + 1;
          if (next === 5) setTimeout(() => setCurrentStep('completed'), 2500);
          return next;
        });
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, callProgress]);

  if (pricingLoading || !providerRole) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          ...
        </div>
      </Layout>
    );
  }

  if (!provider || !adminPricing || !service) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('alert.missingDataTitle')}</h2>
            <p className="text-gray-600 text-sm mb-4">{t('alert.missingDataText')}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/experts')}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                {language === 'fr' ? 'Sélectionner un expert' : 'Select an expert'}
              </button>
              <button
                onClick={goBack}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gray-500 text-white"
              >
                {t('ui.back')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !user.uid) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('alert.loginRequiredTitle')}</h2>
            <p className="text-gray-600 text-sm mb-4">{t('alert.loginRequiredText')}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                {language === 'fr' ? 'Se connecter' : 'Sign in'}
              </button>
              <button
                onClick={goBack}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gray-500 text-white"
              >
                {t('ui.back')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="bg-gradient-to-br from-red-50 to-red-100 min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-80px)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          {(pricingError) && (
            <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {language === 'fr'
                ? 'Les tarifs affichés proviennent d\'une configuration de secours. La configuration centrale sera rechargée automatiquement.'
                : 'Displayed prices are using a fallback configuration. Central pricing will be reloaded automatically.'}
            </div>
          )}

          <div className="mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-3 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1 touch-manipulation"
              aria-label={t('ui.back')}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{t('ui.back')}</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {t('ui.securePayment')}
              </h1>
              <p className="text-gray-600 text-sm">
                {t('ui.payToStart')}
              </p>
            </div>
          </div>

          <section className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={provider.avatar || provider.profilePhoto || '/default-avatar.png'}
                  alt={provider.fullName || provider.name || 'Expert'}
                  className="w-12 h-12 rounded-lg object-cover ring-2 ring-white shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const name = provider.fullName || provider.name || 'Expert';
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=100&background=4F46E5&color=fff`;
                  }}
                  loading="lazy"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" aria-label="online" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate text-sm">{provider.fullName || provider.name || 'Expert'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={
                    "px-2 py-0.5 rounded-md text-xs font-medium " +
                    ((provider.role || provider.type) === 'lawyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')
                  }>
                    {(provider.role || provider.type) === 'lawyer' ? (language === 'fr' ? 'Avocat' : 'Lawyer') : (language === 'fr' ? 'Expert' : 'Expert')}
                  </span>
                  <span className="text-gray-600 text-xs">{provider?.country || 'FR'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <Clock size={12} aria-hidden="true" />
                  <span>{adminPricing.duration} min</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">{language === 'fr' ? 'Disponible' : 'Available'}</span>
                </div>
              </div>

              <div
                className="text-right flex-shrink-0"
                {...cardTraceAttrs}
              >
                <div className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  {new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
                  style: 'currency',
                  currency: selectedCurrency.toUpperCase(),
                  minimumFractionDigits: 2,
                }).format(adminPricing.totalAmount)}

                </div>
                <div className="text-xs text-gray-500">{adminPricing.duration} min</div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setSelectedCurrency('eur')}
                className={
                  "px-4 py-2 rounded-lg font-medium transition-all " +
                  (selectedCurrency === 'eur'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                EUR (€)
              </button>
              <button
                onClick={() => setSelectedCurrency('usd')}
                className={
                  "px-4 py-2 rounded-lg font-medium transition-all " +
                  (selectedCurrency === 'usd'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                USD ($)
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <CreditCard className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Paiement</h4>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <Elements stripe={stripePromise}>
                <PaymentForm
                  user={user}
                  provider={provider}
                  service={service}
                  adminPricing={adminPricing}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isProcessing={isProcessing}
                  setIsProcessing={(p) => {
                    setError('');
                    setIsProcessing(p);
                  }}
                  isMobile={isMobile}
                />
              </Elements>
            </div>
          </section>

          <aside className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Paiement sécurisé</h4>
                <p className="text-xs text-blue-800 mt-1">Données protégées par SSL. Appel lancé automatiquement après paiement.</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </Layout>
  );
};

CallCheckout.displayName = 'CallCheckout';
export default React.memo(CallCheckout);
