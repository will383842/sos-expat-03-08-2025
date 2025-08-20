// src/pages/CallCheckout.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Clock, Shield, AlertCircle, CreditCard, Lock, Calendar, Phone, Check } from 'lucide-react';
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
import { detectUserCurrency, usePricingConfig, calculateServiceAmounts } from '../services/pricingService';

/* ------------------------------ Stripe init ------------------------------ */
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

/* --------------------------------- Types --------------------------------- */
type Currency = 'eur' | 'usd';
type ServiceKind = 'lawyer' | 'expat';

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
type Lang = 'fr' | 'en';
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
    'summary.fee': { fr: 'Frais de service', en: 'Service fee' },
    'summary.consult': { fr: 'Consultation', en: 'Consultation' },
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

    'form.phone': { fr: 'Numéro de téléphone', en: 'Phone number' },
    'form.whatsapp': { fr: 'Numéro WhatsApp (facultatif)', en: 'WhatsApp number (optional)' },
    'form.phonePlaceholder': { fr: 'ex: +33612345678', en: 'e.g. +447911123456' },
    'form.whatsappPlaceholder': { fr: 'ex: +33612345678', en: 'e.g. +447911123456' },
    'form.phoneHelp': { fr: 'Incluez le code pays (format +33, +44, ...).', en: 'Include country code (format +33, +44, ...).' },

    'err.invalidConfig': { fr: 'Configuration de paiement invalide', en: 'Invalid payment configuration' },
    'err.unauth': { fr: 'Utilisateur non authentifié', en: 'Unauthenticated user' },
    'err.sameUser': { fr: "Vous ne pouvez pas réserver avec vous-même", en: "You can't book yourself" },
    'err.minAmount': { fr: 'Montant minimum 5€', en: 'Minimum amount €5' },
    'err.maxAmount': { fr: 'Montant maximum 500€', en: 'Maximum amount €500' },
    'err.amountSplit': { fr: 'Erreur dans la répartition des montants', en: 'Amounts split mismatch' },
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
      return () => mq.removeListener('change', update);
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

/* ------------------------------ Payment Form ----------------------------- */
interface PaymentFormProps {
  user: User;
  provider: Provider;
  service: ServiceData;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isMobile: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = React.memo(({
  user, provider, service, onSuccess, onError, isProcessing, setIsProcessing, isMobile
}) => {
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

  const validatePaymentData = useCallback(() => {
    if (!stripe || !elements) throw new Error(t('err.invalidConfig'));
    if (!user?.uid) throw new Error(t('err.unauth'));
    if (provider.id === user.uid) throw new Error(t('err.sameUser'));
    if (service.amount < 5) throw new Error(t('err.minAmount'));
    if (service.amount > 500) throw new Error(t('err.maxAmount'));

    const total = Math.round((service.commissionAmount + service.providerAmount) * 100) / 100;
    const amountRounded = Math.round(service.amount * 100) / 100;
    if (Math.abs(amountRounded - total) > 0.01) throw new Error(t('err.amountSplit'));
  }, [stripe, elements, user, provider, service, t]);

  const validateCurrencyBeforePayment = useCallback(() => {
    const confirmMessage =
      `Confirmer le paiement de ${service.amount.toFixed(2)}${currencySymbol} en ${serviceCurrency.toUpperCase()} ?`;
    if (service.amount > 100) {
      return confirm(confirmMessage);
    }
    return true;
  }, [service.amount, currencySymbol, serviceCurrency]);

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
        duration: service.duration,
        amount: service.amount,
        commissionAmount: service.commissionAmount,
        providerAmount: service.providerAmount,
        currency: serviceCurrency,
        status: 'succeeded',
        createdAt: serverTimestamp(),
      };

      try { await setDoc(doc(db, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch { /* no-op */ }
      try { await setDoc(doc(db, 'users', user.uid!, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch { /* no-op */ }
      try { await setDoc(doc(db, 'providers', provider.id, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch { /* no-op */ }
    },
    [provider, service, user, serviceCurrency]
  );

  const handlePaymentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (!validateCurrencyBeforePayment()) {
        setIsProcessing(false);
        return;
      }

      validatePaymentData();

      const createPaymentIntent: HttpsCallable<PaymentIntentData, PaymentIntentResponse> =
        httpsCallable(functions, 'createPaymentIntent');

      const paymentData: PaymentIntentData = {
        amount: service.amount,
        commissionAmount: service.commissionAmount,
        providerAmount: service.providerAmount,
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
          duration: String(service.duration),
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

      await persistPaymentDocs(paymentIntent.id);

      const createAndScheduleCall: HttpsCallable<CreateAndScheduleCallData, { success: boolean }> =
        httpsCallable(functions, 'createAndScheduleCall');

      const callData: CreateAndScheduleCallData = {
        providerId: provider.id,
        clientId: user.uid!,
        providerPhone: provider.phoneNumber || provider.phone || '',
        clientPhone: service.clientPhone,
        clientWhatsapp: '',
        serviceType: service.serviceType,
        providerType: (provider.role || provider.type || 'expat') as ServiceKind,
        paymentIntentId: paymentIntent.id,
        amount: service.amount,
        delayMinutes: 5,
        clientLanguages: [language],
        providerLanguages: provider.languagesSpoken || provider.languages || ['fr'],
      };

      await createAndScheduleCall(callData);

      const gtag = getGtag();
      gtag?.('event', 'checkout_success', {
        service_type: service.serviceType,
        provider_id: provider.id,
        payment_intent: paymentIntent.id,
        currency: serviceCurrency,
        amount: service.amount,
      });

      onSuccess(paymentIntent.id);
    } catch (err) {
      console.error('Payment error:', err);
      const msg = err instanceof Error ? err.message : t('err.genericPayment');
      onError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    setIsProcessing,
    validatePaymentData,
    validateCurrencyBeforePayment,
    service,
    provider,
    user,
    elements,
    stripe,
    t,
    onSuccess,
    onError,
    language,
    isMobile,
    persistPaymentDocs,
    stripeCurrency,
    serviceCurrency
  ]);

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

      {/* Récapitulatif simplifié */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">{t('summary.title')}</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{t('summary.expert')}</span>
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
            <span className="text-gray-600">{t('summary.service')}</span>
            <span className="font-medium text-gray-800 text-xs">{serviceTypeDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{t('summary.duration')}</span>
            <span className="font-medium text-gray-800 text-xs">{service.duration} min</span>
          </div>

          <div className="border-t-2 border-gray-400 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">{t('summary.total')}</span>
              <span
                className="text-lg font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent"
                {...priceInfo}
              >
                {service.amount.toFixed(2)} {currencySymbol}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton payer */}
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
        aria-label={`${t('btn.pay')} ${service.amount.toFixed(2)}${currencySymbol}`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-5 h-5" />
            <span>...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <Lock className="w-5 h-5" aria-hidden="true" />
            <span>{t('btn.pay')} {service.amount.toFixed(2)}{currencySymbol}</span>
          </div>
        )}
      </button>

      {/* Badge sécurité */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <Shield className="w-3 h-3 text-green-600" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-700">Stripe</span>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
        </div>
      </div>
    </form>
  );
});
PaymentForm.displayName = 'PaymentForm';

/* ------------------------------ Debug pricing types ---------------------- */
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

/* ------------------------------ Page wrapper ----------------------------- */
const CallCheckout: React.FC<CallCheckoutProps> = ({ selectedProvider, serviceData, onGoBack }) => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { getTraceAttributes } = usePriceTracing();

  // On ne bloque pas l’affichage si la config pricing échoue
  const { error: pricingError } = usePricingConfig();

  // Devise
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

  // Provider
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

  // Pricing via ADMIN (avec secours intégré côté service)
  const [serviceWithPricing, setServiceWithPricing] = useState<ServiceData | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const handleCurrencyChange = useCallback((newCurrency: Currency) => {
    setSelectedCurrency(newCurrency);
    try {
      sessionStorage.setItem('selectedCurrency', newCurrency);
      localStorage.setItem('preferredCurrency', newCurrency);
    } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    const loadServicePricing = async () => {
      if (!provider?.id || !selectedCurrency) return;
      const providerRole: ServiceKind = (provider.role || provider.type || 'expat') as ServiceKind;

      try {
        const adminPricing = await calculateServiceAmounts(providerRole, selectedCurrency);
        setServiceWithPricing({
          providerId: provider.id,
          serviceType: providerRole === 'lawyer' ? 'lawyer_call' : 'expat_call',
          providerRole,
          amount: adminPricing.totalAmount,
          duration: adminPricing.duration,
          clientPhone: normalizePhone(user?.phone || ''),
          commissionAmount: adminPricing.connectionFeeAmount,
          providerAmount: adminPricing.providerAmount,
          currency: selectedCurrency,
        });
        setIsFallback(false);
      } catch {
        // Par sécurité (cas improbable si Firestore indispo), on garde un secours homogène
        // — mais calculateServiceAmounts gère déjà un secours; on ne devrait pas passer ici.
        setServiceWithPricing(null);
        setIsFallback(true);
      }
    };

    loadServicePricing();
  }, [provider, selectedCurrency, user]);

  const service: ServiceData | null = useMemo(() => {
    if (!serviceWithPricing) return null;
    return serviceWithPricing;
  }, [serviceWithPricing]);

  const cardTraceAttrs = useMemo(
    () => getTraceAttributes(
      (provider?.role === 'lawyer' || provider?.type === 'lawyer') ? 'lawyer' : 'expat',
      selectedCurrency
    ),
    [getTraceAttributes, provider?.role, provider?.type, selectedCurrency]
  );

  // expose debug helper
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
      console.log('🔍 Debug pricing disponible: window.debugPricing');
    }
  }

  /* --------------------------------- SEO --------------------------------- */
  useSEO({
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
    },
    locale: language,
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
    }
  });

  /* ------------------------------- Handlers ------------------------------ */
  const goBack = useCallback(() => {
    if (onGoBack) return onGoBack();
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [onGoBack, navigate]);

  const [currentStep, setCurrentStep] = useState<StepType>('payment');
  const [callProgress, setCallProgress] = useState<number>(0);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePaymentSuccess = useCallback((pid: string) => {
    setPaymentIntentId(pid);
    setCurrentStep('calling');
    setCallProgress(1);
  }, []);

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

  /* ------------------------- Guards minimales ------------------------- */
  if (!provider || !service) {
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

  /* ------------------------------ Render page ---------------------------- */
  return (
    <Layout>
      <main className="bg-gradient-to-br from-red-50 to-red-100 min-h=[calc(100vh-80px)] sm:min-h-[calc(100vh-80px)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          {(pricingError || isFallback) && (
            <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {language === 'fr'
                ? 'Les tarifs affichés proviennent d’une configuration de secours. La configuration centrale sera rechargée automatiquement.'
                : 'Displayed prices are using a fallback configuration. Central pricing will be reloaded automatically.'}
            </div>
          )}

          {/* Header */}
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
                {currentStep === 'payment' && t('ui.securePayment')}
                {currentStep === 'calling' && t('ui.connecting')}
                {currentStep === 'completed' && t('ui.completed')}
              </h1>
              <p className="text-gray-600 text-sm">
                {currentStep === 'payment' && t('ui.payToStart')}
                {currentStep === 'calling' && t('ui.connectingExpert')}
                {currentStep === 'completed' && t('ui.thanks')}
              </p>
            </div>
          </div>

          {/* Provider card */}
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
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    (provider.role || provider.type) === 'lawyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {(provider.role || provider.type) === 'lawyer' ? (language === 'fr' ? 'Avocat' : 'Lawyer') : (language === 'fr' ? 'Expert' : 'Expert')}
                  </span>
                  <span className="text-gray-600 text-xs">{provider?.country || 'FR'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <Clock size={12} aria-hidden="true" />
                  <span>{service.duration} min</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">{language === 'fr' ? 'Disponible' : 'Available'}</span>
                </div>
              </div>

              {/* Traçabilité prix */}
              <div
                className="text-right flex-shrink-0"
                {...cardTraceAttrs}
              >
                <div className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  {selectedCurrency === 'usd' ? '$' : ''}{service.amount.toFixed(2)}{selectedCurrency === 'eur' ? '€' : ''}
                </div>
                <div className="text-xs text-gray-500">{service.duration} min</div>
              </div>
            </div>
          </section>

          {/* Sélecteur devise simple */}
          <section className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => handleCurrencyChange('eur')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCurrency === 'eur'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                EUR (€)
              </button>
              <button
                onClick={() => handleCurrencyChange('usd')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCurrency === 'usd'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                USD ($)
              </button>
            </div>
          </section>

          {/* Contenu principal */}
          <section className="bg-white rounded-xl shadow-md overflow-hidden">
            {currentStep === 'payment' && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <CreditCard className="w-4 h-4 text-white" aria-hidden="true" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">{t('card.title')}</h4>
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
            )}

            {currentStep === 'calling' && (
              <div className="p-6 text-center">
                <div className="mb-6">
                  <Phone
                    size={32}
                    className={`mx-auto mb-4 animate-pulse ${(provider.role || provider.type) === 'lawyer' ? 'text-blue-600' : 'text-green-600'}`}
                    aria-hidden={true}
                  />
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('ui.connecting')}</h2>
                  <p className="text-gray-600 text-sm">
                    {`${language === 'fr' ? 'Connexion à' : 'Connecting to'} ${provider.fullName || provider.name || 'Expert'}...`}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-green-100 rounded-lg p-3 flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-600 mr-2" aria-hidden="true" />
                    <span className="text-green-800">{t('status.paid')}</span>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3 flex items-center text-sm">
                    <Phone className="w-4 h-4 text-blue-600 mr-2" aria-hidden="true" />
                    <span className="text-blue-800">{t('status.expertContacted')}</span>
                  </div>
                </div>

                <div className="flex justify-center mb-4">
                  <div className={`animate-spin rounded-full border-2 ${(provider.role || provider.type) === 'lawyer' ? 'border-blue-500' : 'border-red-500'} border-t-transparent w-8 h-8`} />
                </div>

                {paymentIntentId && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      Transaction:{' '}
                      <code className="bg-gray-200 px-1 rounded text-xs">
                        {paymentIntentId.slice(-8)}
                      </code>
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
                    {t('ui.completed')}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4">
                    {language === 'fr'
                      ? `Votre consultation avec ${(provider.fullName || provider.name || 'Expert')} s'est terminée avec succès.`
                      : `Your consultation with ${(provider.fullName || provider.name || 'Expert')} finished successfully.`}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('summary.title')}</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>{t('summary.expert')}:</span>
                        <span className="font-medium">{provider.fullName || provider.name || 'Expert'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('summary.duration')}:</span>
                        <span className="font-medium">{service.duration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('summary.total')}:</span>
                        <span className="font-medium text-green-600">
                          {(service.currency === 'usd' ? '$' : '')}{service.amount.toFixed(2)}{(service.currency === 'eur' ? '€' : '')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">{new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => navigate(`/evaluation/${provider.id}`)}
                      className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      ⭐ {t('btn.evaluate')} {provider.fullName || provider.name || 'Expert'}
                    </button>
                    <button
                      onClick={() => navigate(`/receipt/${paymentIntentId}`)}
                      className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-gray-500 hover:bg-gray-600 text-white transition-colors"
                    >
                      📄 {t('btn.receipt')}
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full px-4 py-3 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      🏠 {t('btn.home')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Bandeau sécurité */}
          {currentStep === 'payment' && (
            <aside className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">{t('banner.secure')}</h4>
                  <p className="text-xs text-blue-800 mt-1">{t('banner.ssl')}</p>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </Layout>
  );
};

CallCheckout.displayName = 'CallCheckout';
export default React.memo(CallCheckout);
