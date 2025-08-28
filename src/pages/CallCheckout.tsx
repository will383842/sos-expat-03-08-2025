// src/pages/CallCheckout.tsx
// ============================================================================
// SOS Expats — Checkout & Mise en relation (EUR/USD + FR/EN + Payment Request)
// Ton: fun, rassurant, utile. Quelques emojis pour le sourire 😄
// ----------------------------------------------------------------------------
// ✅ Points clés inclus :
// - Stripe Elements (split + CardElement) + Payment Request (Apple Pay / Google Pay)
// - EUR/USD avec détection et préférence persistée
// - i18n FR/EN avec messages chaleureux (style RegisterExpat)
// - Appels CF: createPaymentIntent (PI) + createAndScheduleCall (mise en relation)
// - Persistance Firestore payments (+ sous-collections user/provider)
// - Métadonnées riches (providerPhone E.164, duration, serviceType…)
// - SEO minimal + gtag + attributs de traçage prix (debug admin)
// - UX mobile/desktop soignée, a11y, messages d’erreurs humains
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Elements,
  CardElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js';
import { loadStripe, PaymentRequest, StripePaymentRequestButtonElementOptions } from '@stripe/stripe-js';
import { ArrowLeft, Clock, Shield, AlertCircle, CreditCard, Lock, Calendar } from 'lucide-react';

import { httpsCallable, HttpsCallable } from 'firebase/functions';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';

import { Provider, normalizeProvider } from '../types/provider';
import { detectUserCurrency, usePricingConfig } from '../services/pricingService';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/* ──────────────────────────────────────────────────────────────────────────
  Stripe init
────────────────────────────────────────────────────────────────────────── */
const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
if (!pk) {
  // En dev : on logue, en prod la variable doit être définie
  console.error('❌ VITE_STRIPE_PUBLIC_KEY manquante — ajoute la clé publique Stripe dans ton .env');
}
const stripePromise = loadStripe(pk || '');

/* ──────────────────────────────────────────────────────────────────────────
  Types
────────────────────────────────────────────────────────────────────────── */
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
  currency?: string; // 'eur' | 'usd'
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
  amount: number;   // cents
  currency: string; // 'eur' | 'usd'
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

/* ──────────────────────────────────────────────────────────────────────────
  gtag (analytics) — optionnel
────────────────────────────────────────────────────────────────────────── */
type GtagFunction = (...args: unknown[]) => void;
interface GtagWindow { gtag?: GtagFunction }
const getGtag = (): GtagFunction | undefined =>
  (typeof window !== 'undefined' ? (window as unknown as GtagWindow).gtag : undefined);

/* ──────────────────────────────────────────────────────────────────────────
  i18n — ton “friendly & pro”
────────────────────────────────────────────────────────────────────────── */
const useTranslation = () => {
  // Tu peux brancher ton vrai contexte; ici on se base sur la langue du navigateur
  const language: Lang = (navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en');

  const d: Record<string, Record<Lang, string>> = {
    // meta
    'meta.title': {
      fr: 'Paiement & mise en relation — SOS Expats',
      en: 'Payment & instant connection — SOS Expats',
    },
    'meta.description': {
      fr: "Réglez en toute sécurité. On connecte votre expert juste après. C’est simple et rapide ✨",
      en: 'Pay securely. We connect your expert right after. Simple & fast ✨',
    },
    'meta.og_title': {
      fr: 'Paiement sécurisé',
      en: 'Secure Payment',
    },
    'meta.og_description': {
      fr: 'Données protégées, experts vérifiés, appel automatique après paiement.',
      en: 'Protected data, vetted experts, auto-call after payment.',
    },
    'meta.og_image_alt': { fr: 'Paiement SOS Expats', en: 'SOS Expats Payment' },
    'meta.twitter_image_alt': { fr: 'Interface paiement SOS Expats', en: 'SOS Expats Checkout UI' },

    // ui
    'ui.back': { fr: 'Retour', en: 'Back' },
    'ui.securePayment': { fr: 'Paiement sécurisé', en: 'Secure payment' },
    'ui.payToStart': {
      fr: 'Validez pour lancer la consultation ⚡',
      en: 'Confirm to start your consultation ⚡',
    },
    'ui.connecting': { fr: 'Mise en relation', en: 'Connecting' },
    'ui.completed': { fr: 'Consultation terminée', en: 'Consultation completed' },

    // prices & summary
    'summary.title': { fr: 'Récapitulatif', en: 'Summary' },
    'summary.expert': { fr: 'Expert', en: 'Expert' },
    'summary.service': { fr: 'Service', en: 'Service' },
    'summary.duration': { fr: 'Durée', en: 'Duration' },
    'summary.total': { fr: 'Total', en: 'Total' },

    // card labels
    'card.title': { fr: 'Carte bancaire', en: 'Card payment' },
    'card.number': { fr: 'Numéro de carte', en: 'Card number' },
    'card.expiry': { fr: 'Expiration', en: 'Expiry' },
    'card.cvc': { fr: 'CVC', en: 'CVC' },

    // buttons
    'btn.pay': { fr: 'Payer', en: 'Pay' },
    'btn.evaluate': { fr: 'Évaluer', en: 'Review' },
    'btn.receipt': { fr: 'Télécharger le reçu', en: 'Download receipt' },
    'btn.home': { fr: "Retour à l'accueil", en: 'Back to home' },

    // status
    'status.paid': { fr: 'Paiement confirmé ✅', en: 'Payment confirmed ✅' },
    'status.expertContacted': { fr: 'Expert contacté(e)', en: 'Expert contacted' },
    'status.callStarted': { fr: 'Consultation démarrée', en: 'Consultation started' },

    // banners
    'banner.secure': { fr: 'Paiement sécurisé', en: 'Secure payment' },
    'banner.ssl': {
      fr: 'Données chiffrées, appel automatique après validation.',
      en: 'Encrypted data, automatic call after confirmation.',
    },

    // errors (friendly tone)
    'err.invalidConfig': { fr: 'Oups, config Stripe manquante 😅', en: 'Oops, Stripe config missing 😅' },
    'err.unauth': { fr: 'Vous devez être connecté(e) pour continuer.', en: 'You need to be signed in to continue.' },
    'err.sameUser': { fr: "Petite curiosité : on ne peut pas réserver avec soi-même 😉", en: "Fun fact: you can't book with yourself 😉" },
    'err.minAmount': { fr: 'Montant minimum: 5€', en: 'Minimum amount: €5' },
    'err.maxAmount': { fr: 'Montant maximum: 500€', en: 'Maximum amount: €500' },
    'err.amountMismatch': { fr: 'Le montant ne matche pas. On ré-essaie ?', en: 'Amount mismatch. Try again?' },
    'err.noClientSecret': { fr: 'ClientSecret introuvable 🤔', en: 'Missing ClientSecret 🤔' },
    'err.noCardElement': { fr: 'Champ carte introuvable 😶', en: 'Card field not found 😶' },
    'err.stripe': { fr: 'Stripe n’est pas content. On réessaie ?', en: 'Stripe error. Want to try again?' },
    'err.paymentFailed': { fr: 'Le paiement a échoué 😢', en: 'Payment failed 😢' },
    'err.actionRequired': { fr: 'Une étape d’authentification est requise.', en: 'Additional authentication required.' },
    'err.invalidMethod': { fr: 'Méthode de paiement invalide.', en: 'Invalid payment method.' },
    'err.canceled': { fr: 'Paiement annulé 👋', en: 'Payment canceled 👋' },
    'err.unexpectedStatus': { fr: 'Statut inattendu', en: 'Unexpected status' },
    'err.genericPayment': { fr: 'Oups, petit pépin…', en: 'Oops, a small hiccup…' },
    'err.invalidPhone': { fr: 'Numéro de téléphone invalide', en: 'Invalid phone number' },

    // Payment Request
    'payrequest.or': { fr: 'ou', en: 'or' },
    'payrequest.title': { fr: 'Payer avec', en: 'Pay with' },
  };

  const t = (key: keyof typeof d, fallback?: string) => d[key]?.[language] ?? fallback ?? String(key);
  return { t, language };
};

/* ──────────────────────────────────────────────────────────────────────────
  SEO helper (light)
────────────────────────────────────────────────────────────────────────── */
const useSEO = (meta: {
  title: string; description: string; ogTitle: string; ogDescription: string;
  ogImageAlt: string; twitterImageAlt: string;
  canonicalUrl: string; locale: Lang;
}) => {
  useEffect(() => {
    document.title = meta.title;

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:title', meta.ogTitle);
    setMeta('property', 'og:description', meta.ogDescription);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', meta.locale === 'fr' ? 'fr_FR' : 'en_US');
    setMeta('property', 'og:image:alt', meta.ogImageAlt);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:image:alt', meta.twitterImageAlt);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = meta.canonicalUrl;
  }, [meta]);
};

/* ──────────────────────────────────────────────────────────────────────────
  Helpers: device & phone
────────────────────────────────────────────────────────────────────────── */
const toE164 = (raw?: string) => {
  if (!raw) return '';
  const p = parsePhoneNumberFromString(raw);
  return p?.isValid() ? p.number : '';
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 640px), (pointer: coarse)');
    const update = () => setIsMobile(!!mq.matches);
    update();
    if ('addEventListener' in mq) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      // @ts-expect-error legacy
      mq.addListener(update);
      // @ts-expect-error legacy
      return () => mq.removeListener(update);
    }
  }, []);
  return isMobile;
};

/* ──────────────────────────────────────────────────────────────────────────
  Pricing trace (debug admin)
────────────────────────────────────────────────────────────────────────── */
interface PricingEntryTrace {
  totalAmount: number;
  connectionFeeAmount: number;
  providerAmount: number;
  duration: number;
}
interface PricingConfigShape {
  lawyer: Record<Currency, PricingEntryTrace>;
  expat: Record<Currency, PricingEntryTrace>;
}
type TraceAttributes = {
  [K in `data-${string}`]?: string | number;
} & { title?: string };

function usePriceTracing() {
  const { pricing, loading } = usePricingConfig() as { pricing?: PricingConfigShape; loading: boolean };

  const getTraceAttributes = (serviceType: ServiceKind, currency: Currency, providerOverride?: number): TraceAttributes => {
    if (loading) {
      return {
        'data-price-source': 'loading',
        'data-currency': currency,
        title: 'Chargement des tarifs…',
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
      title: 'Tarifs indisponibles — fallback appliqué',
    };
  };

  return { getTraceAttributes };
}

/* ──────────────────────────────────────────────────────────────────────────
  Stripe Elements styles
────────────────────────────────────────────────────────────────────────── */
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      letterSpacing: '0.025em',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontWeight: '500',
      '::placeholder': { color: '#9ca3af', fontWeight: '400' },
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
    complete: { color: '#10b981', iconColor: '#10b981' },
  },
} as const;

const singleCardElementOptions = {
  style: cardElementOptions.style,
  hidePostalCode: true,
} as const;

/* ──────────────────────────────────────────────────────────────────────────
  PaymentForm — le cœur du paiement (Elements + Payment Request)
────────────────────────────────────────────────────────────────────────── */
interface PaymentFormProps {
  user: User;
  provider: Provider;
  service: ServiceData;
  adminPricing: PricingEntryTrace;
  onSuccess: (payload: { paymentIntentId: string; call: 'scheduled' | 'skipped'; callId?: string }) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isMobile: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = React.memo(({
  user, provider, service, adminPricing, onSuccess, onError, isProcessing, setIsProcessing, isMobile,
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

  // -------- Payment Request (Apple Pay / Google Pay) ----------
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [prReady, setPrReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!stripe) return;
      try {
        const pr = stripe.paymentRequest({
          country: 'FR', // country billing; si tu veux, détecte via IP/locale
          currency: stripeCurrency,
          total: {
            label: language === 'fr' ? 'Consultation SOS Expats' : 'SOS Expats Consultation',
            amount: Math.round(adminPricing.totalAmount * 100), // en cents
          },
          requestPayerName: true,
          requestPayerEmail: true,
          requestPayerPhone: true,
        });
        const result = await pr.canMakePayment();
        if (mounted && result) {
          setPaymentRequest(pr);
          setPrReady(true);

          pr.on('paymentmethod', async (ev) => {
            try {
              if (!user?.uid) throw new Error(t('err.unauth'));

              // 1) créer le PI côté backend
              const createPaymentIntent: HttpsCallable<PaymentIntentData, PaymentIntentResponse> =
                httpsCallable(functions, 'createPaymentIntent');

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
                description:
                  service.serviceType === 'lawyer_call'
                    ? (language === 'fr' ? 'Consultation avocat' : 'Lawyer consultation')
                    : (language === 'fr' ? 'Consultation expatriation' : 'Expat consultation'),
                metadata: {
                  providerType: (provider.role || provider.type || 'expat') as string,
                  duration: String(adminPricing.duration),
                  clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                  clientPhone: service.clientPhone,
                  clientWhatsapp: '',
                  currency: stripeCurrency,
                  timestamp: new Date().toISOString(),
                  providerPhone: toE164(provider.phoneNumber || provider.phone || ''),
                },
              };

              const res = await createPaymentIntent(paymentData);
              const clientSecret = res.data.clientSecret;
              if (!clientSecret) throw new Error(t('err.noClientSecret'));

              // 2) confirmer le paiement avec le paymentMethod de l’événement
              const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                { payment_method: ev.paymentMethod.id },
                { handleActions: false }
              );

              if (confirmError) {
                ev.complete('fail');
                throw new Error(confirmError.message || t('err.stripe'));
              }

              // 3) actions supplémentaires si 3DS nécessaire
              if (paymentIntent && paymentIntent.status === 'requires_action') {
                const { error: actionError, paymentIntent: actionPI } =
                  await stripe.confirmCardPayment(clientSecret);
                if (actionError) {
                  ev.complete('fail');
                  throw new Error(actionError.message || t('err.actionRequired'));
                }
                if (!actionPI) {
                  ev.complete('fail');
                  throw new Error(t('err.paymentFailed'));
                }
                ev.complete('success');
                await afterPaymentSucceeded(actionPI.id);
              } else {
                ev.complete('success');
                await afterPaymentSucceeded(paymentIntent!.id);
              }
            } catch (e: any) {
              console.error('Payment Request error:', e);
              ev.complete('fail');
              onError(e?.message || t('err.genericPayment'));
            }
          });
        }
      } catch (e) {
        console.log('PaymentRequest unsupported or failed init:', e);
      }
    })();
    return () => { mounted = false; };
  }, [stripe, adminPricing.totalAmount, stripeCurrency, language, onError, provider, service, t, user]);

  // -------- petite validation UX ----------
  const validatePaymentData = useCallback(() => {
    if (!stripe || !elements) throw new Error(t('err.invalidConfig'));
    if (!user?.uid) throw new Error(t('err.unauth'));
    if (provider.id === user.uid) throw new Error(t('err.sameUser'));
    if (adminPricing.totalAmount < 5) throw new Error(t('err.minAmount'));
    if (adminPricing.totalAmount > 500) throw new Error(t('err.maxAmount'));
    // Vérif simple: au front, on se fie à adminPricing — le vrai contrôle est au backend 💪
  }, [stripe, elements, user, provider.id, adminPricing.totalAmount, t]);

  // -------- persistance Firestore ----------
  const persistPaymentDocs = useCallback(async (paymentIntentId: string) => {
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
    try { await setDoc(doc(db, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch {}
    try { await setDoc(doc(db, 'users', user.uid!, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch {}
    try { await setDoc(doc(db, 'providers', provider.id, 'payments', paymentIntentId), baseDoc, { merge: true }); } catch {}
  }, [provider, user, service.clientPhone, service.serviceType, adminPricing, serviceCurrency]);

  // -------- post-paiement : planifier l’appel & analytics ----------
  const afterPaymentSucceeded = useCallback(async (paymentIntentId: string) => {
    // Fire-and-forget la persistance “pending”
    void persistPaymentDocs(paymentIntentId);

    const rawClientPhone   = service.clientPhone || user?.phone || '';
    const rawProviderPhone = provider.phoneNumber || provider.phone || '';
    const clientPhoneE164   = toE164(rawClientPhone);
    const providerPhoneE164 = toE164(rawProviderPhone);

    let callScheduled: 'scheduled' | 'skipped' = 'skipped';
    let createdCallId: string | undefined;

    if (clientPhoneE164 && providerPhoneE164) {
      try {
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
          paymentIntentId,
          amount: adminPricing.totalAmount,
          currency: serviceCurrency.toUpperCase() as 'EUR' | 'USD',
          delayMinutes: 5,
          clientLanguages: [language],
          providerLanguages: provider.languagesSpoken || provider.languages || ['fr'],
        };

        const callRes = await createAndScheduleCall(callData);
        if (callRes?.data?.success) {
          callScheduled = 'scheduled';
          createdCallId = callRes?.data?.callId;
        }
      } catch (e) {
        console.warn('createAndScheduleCall failed — we’ll still route to success page:', e);
      }
    } else {
      console.warn('Missing/invalid phone(s). Skipping call scheduling.');
    }

    const gtag = getGtag();
    gtag?.('event', 'checkout_success', {
      service_type: service.serviceType,
      provider_id: provider.id,
      payment_intent: paymentIntentId,
      currency: serviceCurrency,
      amount: adminPricing.totalAmount,
      call_status: callScheduled,
    });

    // Notifie le parent
    onSuccess({ paymentIntentId, call: callScheduled, callId: createdCallId });
  }, [persistPaymentDocs, service.clientPhone, user, provider, adminPricing, serviceCurrency, language, onSuccess]);

  // -------- submit Elements ----------
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      validatePaymentData();

      const createPaymentIntent: HttpsCallable<PaymentIntentData, PaymentIntentResponse> =
        httpsCallable(functions, 'createPaymentIntent');

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
        description:
          service.serviceType === 'lawyer_call'
            ? (language === 'fr' ? 'Consultation avocat' : 'Lawyer consultation')
            : (language === 'fr' ? 'Consultation expatriation' : 'Expat consultation'),
        metadata: {
          providerType: provider.role || provider.type || 'expat',
          duration: String(adminPricing.duration),
          clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          clientPhone: service.clientPhone,
          clientWhatsapp: '',
          currency: serviceCurrency,
          timestamp: new Date().toISOString(),
          providerPhone: toE164(provider.phoneNumber || provider.phone || ''),
        },
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
      if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
        await afterPaymentSucceeded(paymentIntent.id);
      } else if (status === 'requires_action') {
        throw new Error(t('err.actionRequired'));
      } else if (status === 'requires_payment_method') {
        throw new Error(t('err.invalidMethod'));
      } else if (status === 'canceled') {
        throw new Error(t('err.canceled'));
      } else {
        throw new Error(`${t('err.unexpectedStatus')}: ${status}`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      onError(err?.message || err?.details || t('err.genericPayment'));
      setIsProcessing(false);
    }
  }, [
    isProcessing, setIsProcessing, validatePaymentData, adminPricing, stripeCurrency, service,
    provider, user, elements, stripe, t, language, isMobile, afterPaymentSucceeded, onError
  ]);

  const providerDisplayName = useMemo(
    () => provider?.fullName || provider?.name || `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim() || 'Expert',
    [provider]
  );

  const serviceTypeDisplay = useMemo(
    () => service.serviceType === 'lawyer_call'
      ? (language === 'fr' ? 'Consultation Avocat' : 'Lawyer Consultation')
      : (language === 'fr' ? 'Consultation Expat' : 'Expat Consultation'),
    [service.serviceType, language]
  );

  // Payment Request button options
  const prButtonOptions = useMemo<StripePaymentRequestButtonElementOptions>(() => ({
    style: { paymentRequestButton: { type: 'default', theme: 'dark', height: '44px' } },
  }), []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Payment Request (Apple Pay / Google Pay) */}
      {prReady && paymentRequest && (
        <div className="mb-2">
          <div className="mb-2 text-xs text-gray-500">{t('payrequest.title')}</div>
          <PaymentRequestButtonElement options={prButtonOptions} />
          <div className="my-3 flex items-center text-gray-400 text-xs gap-2">
            <div className="h-px bg-gray-200 flex-1" />
            <span>{t('payrequest.or')}</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>
        </div>
      )}

      {/* Cartes */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span>{t('card.title')}</span>
          </div>
        </label>

        {isMobile ? (
          <div className="space-y-2" aria-live="polite">
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
              {t('card.number')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-4 w-4 text-gray-400" aria-hidden />
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
                  <CreditCard className="h-4 w-4 text-gray-400" aria-hidden />
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
                    <Calendar className="h-4 w-4 text-gray-400" aria-hidden />
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
                    <Shield className="h-4 w-4 text-gray-400" aria-hidden />
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

      {/* Récap */}
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
            <span className="font-medium text-gray-800 text-xs">{adminPricing.duration} min</span>
          </div>

          <div className="border-t-2 border-gray-400 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">{t('summary.total')}</span>
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

      {/* CTA */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={
          'w-full py-4 rounded-xl font-bold text-white transition-all duration-300 ' +
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ' +
          'active:scale-[0.98] relative overflow-hidden ' +
          ((!stripe || isProcessing)
            ? 'bg-gray-400 cursor-not-allowed opacity-60'
            : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl')
        }
        aria-label={`${language === 'fr' ? 'Payer ' : 'Pay '}${new Intl.NumberFormat(
          language === 'fr' ? 'fr-FR' : 'en-US',
          { style: 'currency', currency: serviceCurrency.toUpperCase(), minimumFractionDigits: 2 }
        ).format(adminPricing.totalAmount)}`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-5 h-5" />
            <span>...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <Lock className="w-5 h-5" aria-hidden />
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

      {/* Trust badge */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <Shield className="w-3 h-3 text-green-600" aria-hidden />
          <span className="text-xs font-medium text-gray-700">Stripe</span>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden />
        </div>
      </div>
    </form>
  );
});
PaymentForm.displayName = 'PaymentForm';

/* ──────────────────────────────────────────────────────────────────────────
  Écran Checkout
────────────────────────────────────────────────────────────────────────── */
interface CallCheckoutProps {
  selectedProvider?: Provider;
  serviceData?: Partial<ServiceData>;
  onGoBack?: () => void;
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

  // SEO minimal
  useSEO({
    title: t('meta.title'),
    description: t('meta.description'),
    ogTitle: t('meta.og_title'),
    ogDescription: t('meta.og_description'),
    ogImageAlt: t('meta.og_image_alt'),
    twitterImageAlt: t('meta.twitter_image_alt'),
    canonicalUrl: `${window.location.origin}/${language}/checkout`,
    locale: language,
  });

  // Init currency: serviceData > sessionStorage > localStorage > detect
  useEffect(() => {
    const init = () => {
      if (serviceData?.currency && ['eur', 'usd'].includes(serviceData.currency)) {
        setSelectedCurrency(serviceData.currency as Currency);
        return;
      }
      try {
        const ss = sessionStorage.getItem('selectedCurrency') as Currency | null;
        if (ss && ['eur', 'usd'].includes(ss)) { setSelectedCurrency(ss); return; }
      } catch {}
      try {
        const ls = localStorage.getItem('preferredCurrency') as Currency | null;
        if (ls && ['eur', 'usd'].includes(ls)) { setSelectedCurrency(ls); return; }
      } catch {}
      setSelectedCurrency(detectUserCurrency());
    };
    init();
  }, [serviceData?.currency]);

  // Persist preference
  useEffect(() => {
    try {
      sessionStorage.setItem('selectedCurrency', selectedCurrency);
      localStorage.setItem('preferredCurrency', selectedCurrency);
    } catch {}
  }, [selectedCurrency]);

  // Provider (depuis props ou session)
  const provider = useMemo<Provider | null>(() => {
    if (selectedProvider?.id) return normalizeProvider(selectedProvider);
    try {
      const saved = sessionStorage.getItem('selectedProvider');
      if (saved) {
        const p = JSON.parse(saved) as Provider;
        if (p?.id) return normalizeProvider(p);
      }
    } catch {}
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

  const goBack = useCallback(() => {
    if (onGoBack) return onGoBack();
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [onGoBack, navigate]);

  const [currentStep] = useState<'payment' | 'calling' | 'completed'>('payment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePaymentSuccess = useCallback((payload: { paymentIntentId: string; call: 'scheduled' | 'skipped'; callId?: string }) => {
    // Ici on file direct vers une page de succès dédiée, plus claire
    const params = new URLSearchParams({
      paymentIntentId: payload.paymentIntentId,
      providerId: (provider?.id || ''),
      call: payload.call,
    });
    if (payload.callId) params.set('callId', payload.callId);
    navigate(`/payment-success?${params.toString()}`, { replace: true });
  }, [navigate, provider?.id]);

  const handlePaymentError = useCallback((msg: string) => setError(msg), []);

  // Écrans d’attente / erreurs
  if (pricingLoading || !providerRole) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-gray-600">…</div>
      </Layout>
    );
  }

  if (!provider || !adminPricing || !service) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center max-w-sm mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden />
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
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden />
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
      <main className="bg-gradient-to-br from-red-50 to-red-100 min-h-[calc(100vh-80px)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          {/* Info pricing source */}
          {pricingError && (
            <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              {language === 'fr'
                ? 'Astuce: on affiche un prix “secours”. La config centrale va revenir toute seule 🤙'
                : 'Heads-up: using fallback pricing. Central config will reload on its own 🤙'}
            </div>
          )}

          {/* Back + header */}
          <div className="mb-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-3 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
              aria-label={t('ui.back')}
            >
              <ArrowLeft size={16} aria-hidden />
              <span>{t('ui.back')}</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{t('ui.securePayment')}</h1>
              <p className="text-gray-600 text-sm">{t('ui.payToStart')}</p>
            </div>
          </div>

          {/* Expert card */}
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
                <h3 className="font-bold text-gray-900 truncate text-sm">
                  {provider.fullName || provider.name || 'Expert'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={
                      'px-2 py-0.5 rounded-md text-xs font-medium ' +
                      ((provider.role || provider.type) === 'lawyer'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800')
                    }
                  >
                    {(provider.role || provider.type) === 'lawyer'
                      ? (language === 'fr' ? 'Avocat' : 'Lawyer')
                      : (language === 'fr' ? 'Expert' : 'Expert')}
                  </span>
                  <span className="text-gray-600 text-xs">{provider?.country || 'FR'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <Clock size={12} aria-hidden />
                  <span>{adminPricing.duration} min</span>
                  <span>•</span>
                  <span className="text-green-600 font-medium">
                    {language === 'fr' ? 'Disponible' : 'Available'}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0" {...cardTraceAttrs}>
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

          {/* Devise toggle */}
          <section className="bg-white rounded-xl shadow-md border p-4 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setSelectedCurrency('eur')}
                className={
                  'px-4 py-2 rounded-lg font-medium transition-all ' +
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
                  'px-4 py-2 rounded-lg font-medium transition-all ' +
                  (selectedCurrency === 'usd'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                USD ($)
              </button>
            </div>
          </section>

          {/* Paiement */}
          <section className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <CreditCard className="w-4 h-4 text-white" aria-hidden />
                </div>
                <h4 className="text-lg font-bold text-gray-900">{t('card.title')}</h4>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" aria-hidden />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <Elements stripe={stripePromise} options={{ locale: language === 'fr' ? 'fr' : 'en' }}>
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

          {/* Badge sécurité */}
          <aside className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" aria-hidden />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">{t('banner.secure')}</h4>
                <p className="text-xs text-blue-800 mt-1">{t('banner.ssl')}</p>
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
