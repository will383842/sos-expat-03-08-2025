// src/pages/Pricing.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Check,
  Phone,
  Clock,
  Shield,
  Star,
  CreditCard,
  CheckCircle,
  Briefcase,
  User,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { validateCoupon } from '../utils/coupon';
import { usePricingConfig, detectUserCurrency } from '../services/pricingService';

interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  expiresAt: Date;
  services: string[];
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  couponId?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

type CurrencyCode = 'eur' | 'usd';
type ServiceType = 'expat_call' | 'lawyer_call';

interface DynamicService {
  id: 'expat_call' | 'lawyer_call';
  type: ServiceType;
  title: string;
  price: number;
  duration: number;
  currency: CurrencyCode;
  description: string;
  isActive: boolean;
  connectionFee: number;
  providerAmount: number;
}

const PROMO_STORAGE_KEY = 'activePromoCode';

const Pricing: React.FC = () => {
  const { language } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ðŸ”¥ Hook pricing dynamique
  const { pricing, loading: pricingLoading, error: pricingError } = usePricingConfig();

  const [promoCode, setPromoCode] = useState<string>('');
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // ðŸ”¥ Gestion devise
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    try {
      const saved = sessionStorage.getItem('selectedCurrency') as CurrencyCode | null;
      return saved && (saved === 'eur' || saved === 'usd') ? saved : detectUserCurrency();
    } catch {
      return detectUserCurrency();
    }
  });

  // Persistance devise
  useEffect(() => {
    try {
      sessionStorage.setItem('selectedCurrency', selectedCurrency);
      localStorage.setItem('preferredCurrency', selectedCurrency);
    } catch {
      // noop
    }
  }, [selectedCurrency]);

  // Handle service selection with correct navigation
  const handleSelectService = useCallback(
    (serviceType: ServiceType | string) => {
      if (serviceType === 'lawyer_call') {
        navigate('/sos-appel?tab=avocat');
      } else if (serviceType === 'expat_call') {
        navigate('/sos-appel?tab=expat');
      } else {
        navigate('/sos-appel');
      }
    },
    [navigate]
  );

  // Optimized promo code fetching
  const fetchAndSetPromoCode = useCallback(async () => {
    try {
      const savedPromo = sessionStorage.getItem(PROMO_STORAGE_KEY);
      if (savedPromo) {
        setActivePromo(JSON.parse(savedPromo) as PromoCode);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('promo');

      if (codeFromUrl) {
        setPromoCode(codeFromUrl);
      }
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError(language === 'fr' ? 'Erreur lors du chargement du code promo' : 'Error loading promo code');
    }
  }, [language]);

  const validatePromoCode = useCallback(
    async (code: string = promoCode) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        setError(language === 'fr' ? 'Veuillez entrer un code promo' : 'Please enter a promo code');
        return;
      }

      setIsValidating(true);
      setError('');

      try {
        const result: ValidationResult = await validateCoupon({
          code: trimmedCode,
          userId: user?.id || 'anonymous',
          totalAmount: 49,
          serviceType: 'lawyer_call'
        });

        if (result.isValid && result.discountType && typeof result.discountValue === 'number') {
          const promoData: PromoCode = {
            id: result.couponId || `promo-${Date.now()}`,
            code: trimmedCode.toUpperCase(),
            discountType: result.discountType,
            discountValue: result.discountValue,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            services: ['lawyer_call', 'expat_call']
          };

          setActivePromo(promoData);
          sessionStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promoData));
        } else {
          setError(result.message || (language === 'fr' ? 'Code promo invalide' : 'Invalid promo code'));
          setActivePromo(null);
        }
      } catch (err) {
        console.error('Error validating promo code:', err);
        setError(language === 'fr' ? 'Erreur lors de la validation du code promo' : 'Error validating promo code');
        setActivePromo(null);
      } finally {
        setIsValidating(false);
      }
    },
    [promoCode, user?.id, language]
  );

  // Common text content
  const texts = {
    fr: {
      title: 'Tarifs transparents',
      subtitle: "Obtenez de l'aide immÃ©diate avec nos tarifs fixes, sans surprise",
      promoPlaceholder: 'Code promo',
      apply: 'Appliquer',
      validating: 'Validation...',
      lawyerTitle: 'Appel Avocat',
      expatTitle: 'Appel ExpatriÃ©',
      chooseService: 'Choisir ce service',
      securePayment: 'Paiement sÃ©curisÃ©',
      securePaymentDesc:
        "Toutes vos transactions sont protÃ©gÃ©es par un cryptage SSL 256-bit. Nous n'enregistrons jamais vos donnÃ©es de carte bancaire.",
      satisfactionGuarantee: 'Garantie satisfaction',
      satisfactionGuaranteeDesc:
        "Si l'expert ne rÃ©pond pas aprÃ¨s 3 tentatives, vous Ãªtes automatiquement remboursÃ©. Nous garantissons votre satisfaction Ã  100%.",
      refundTime: 'Remboursement sous 24h',
      faq: 'Questions frÃ©quentes',
      paymentQuestion: 'Comment fonctionne le paiement ?',
      paymentAnswer:
        "Le paiement se fait en ligne de maniÃ¨re sÃ©curisÃ©e via Stripe. Vous n'Ãªtes dÃ©bitÃ© qu'aprÃ¨s la confirmation de votre appel.",
      availabilityQuestion: "Que se passe-t-il si l'expert n'est pas disponible ?",
      availabilityAnswer:
        "Si l'expert ne rÃ©pond pas aprÃ¨s 3 tentatives, vous Ãªtes automatiquement remboursÃ© et pouvez choisir un autre profil.",
      invoiceQuestion: 'Puis-je obtenir une facture ?',
      invoiceAnswer:
        'Oui, vous recevez automatiquement une facture PDF aprÃ¨s chaque appel, tÃ©lÃ©chargeable depuis votre tableau de bord.',
      discount: 'de rÃ©duction',
      applied: 'appliquÃ©'
    },
    en: {
      title: 'Transparent pricing',
      subtitle: 'Get immediate help with our fixed rates, no surprises',
      promoPlaceholder: 'Promo code',
      apply: 'Apply',
      validating: 'Validating...',
      lawyerTitle: 'Lawyer Call',
      expatTitle: 'Expat Call',
      chooseService: 'Choose this service',
      securePayment: 'Secure payment',
      securePaymentDesc:
        'All your transactions are protected by 256-bit SSL encryption. We never store your credit card data.',
      satisfactionGuarantee: 'Satisfaction guarantee',
      satisfactionGuaranteeDesc:
        "If the expert doesn't answer after 3 attempts, you are automatically refunded. We guarantee 100% satisfaction.",
      refundTime: 'Refund within 24h',
      faq: 'Frequently asked questions',
      paymentQuestion: 'How does payment work?',
      paymentAnswer: 'Payment is made online securely via Stripe. You are only charged after your call is confirmed.',
      availabilityQuestion: 'What happens if the expert is not available?',
      availabilityAnswer:
        "If the expert doesn't answer after 3 attempts, you are automatically refunded and can choose another profile.",
      invoiceQuestion: 'Can I get an invoice?',
      invoiceAnswer: 'Yes, you automatically receive a PDF invoice after each call, downloadable from your dashboard.',
      discount: 'discount',
      applied: 'applied'
    }
  };

  const currentText = texts[language as keyof typeof texts] || texts.en;

  // Service features data
  const getServiceFeatures = useCallback(
    (isLawyer: boolean): string[] => {
      const commonFeatures: string[] = [
        language === 'fr' ? 'Appel tÃ©lÃ©phonique sÃ©curisÃ©' : 'Secure phone call',
        language === 'fr' ? 'Facture PDF automatique' : 'Automatic PDF invoice',
        language === 'fr' ? 'Support 24/7' : '24/7 support',
        language === 'fr' ? 'Garantie remboursement' : 'Money back guarantee'
      ];

      if (isLawyer) {
        return [
          language === 'fr'
            ? 'Consultation avec avocat certifiÃ©'
            : 'Consultation with certified lawyer',
          ...commonFeatures.slice(0, 1),
          language === 'fr' ? 'DurÃ©e : 20 minutes' : 'Duration: 20 minutes',
          ...commonFeatures.slice(1)
        ];
      }

      return [
        language === 'fr' ? "Conseil d'expatriÃ© expÃ©rimentÃ©" : 'Advice from experienced expat',
        ...commonFeatures.slice(0, 1),
        language === 'fr' ? 'DurÃ©e : 30 minutes' : 'Duration: 30 minutes',
        ...commonFeatures.slice(1)
      ];
    },
    [language]
  );

  // ðŸ”¥ SERVICES DYNAMIQUES depuis admin config
  const dynamicServices = useMemo<DynamicService[]>(() => {
    if (!pricing) return [];
    return [
      {
        id: 'expat_call',
        type: 'expat_call',
        title: currentText.expatTitle,
        price: pricing.expat[selectedCurrency].totalAmount,
        duration: pricing.expat[selectedCurrency].duration,
        currency: selectedCurrency,
        description:
          language === 'fr'
            ? "Obtenez des conseils pratiques d'un expatriÃ© expÃ©rimentÃ© dans votre pays de destination."
            : 'Get practical advice from an experienced expat in your destination country.',
        isActive: true,
        connectionFee: pricing.expat[selectedCurrency].connectionFeeAmount,
        providerAmount: pricing.expat[selectedCurrency].providerAmount
      },
      {
        id: 'lawyer_call',
        type: 'lawyer_call',
        title: currentText.lawyerTitle,
        price: pricing.lawyer[selectedCurrency].totalAmount,
        duration: pricing.lawyer[selectedCurrency].duration,
        currency: selectedCurrency,
        description:
          language === 'fr'
            ? "Consultez un avocat qualifiÃ© pour toutes vos questions juridiques liÃ©es Ã  l'expatriation."
            : 'Consult a qualified lawyer for all your legal questions related to expatriation.',
        isActive: true,
        connectionFee: pricing.lawyer[selectedCurrency].connectionFeeAmount,
        providerAmount: pricing.lawyer[selectedCurrency].providerAmount
      }
    ];
  }, [pricing, selectedCurrency, currentText, language]);

  // Remplacer calculateDiscountedPrice
  const calculateDiscountedPrice = useCallback(
    (service: DynamicService): number => {
      if (!activePromo || !activePromo.services.includes(service.type)) {
        return service.price;
      }
      if (activePromo.discountType === 'percentage') {
        return service.price * (1 - activePromo.discountValue / 100);
      }
      return Math.max(0, service.price - activePromo.discountValue);
    },
    [activePromo]
  );

  // Load promo code on component mount
  useEffect(() => {
    fetchAndSetPromoCode();
  }, [fetchAndSetPromoCode]);

  // Validate promo code from URL when promoCode changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('promo');
    if (codeFromUrl && promoCode === codeFromUrl && !activePromo) {
      validatePromoCode(codeFromUrl);
    }
  }, [promoCode, validatePromoCode, activePromo]);

  const currencySymbol = selectedCurrency === 'eur' ? 'â‚¬' : '$';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950">
        {/* Banner non bloquant */}
        {(pricingLoading || pricingError) && (
          <div className="bg-red-600/10 border border-red-600/30 text-red-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {pricingLoading
                  ? (language === 'fr'
                      ? 'Chargement des tarifs en coursâ€¦'
                      : 'Loading pricingâ€¦')
                  : (language === 'fr'
                      ? 'Configuration des prix indisponible. Affichage limitÃ©.'
                      : 'Pricing configuration unavailable. Limited display.')}
              </p>
              {!pricingLoading && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  {language === 'fr' ? 'Recharger' : 'Reload'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hero Section avec sÃ©lecteur de devise */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-8">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">
                  Tarifs fixes â€¢ Sans surprise â€¢ Paiement sÃ©curisÃ©
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>

              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  {language === 'fr' ? 'Tarifs ' : 'Transparent '}
                </span>
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  {language === 'fr' ? 'transparents' : 'pricing'}
                </span>
              </h1>

              <h2 className="text-2xl md:text-3xl text-white font-semibold max-w-4xl mx-auto mb-12 leading-relaxed">
                {currentText.subtitle}
              </h2>

              {/* SÃ©lecteur de devise */}
              <div className="mb-8">
                <div className="inline-flex bg-white/10 rounded-full p-1 backdrop-blur-sm border border-white/20">
                  <button
                    onClick={() => setSelectedCurrency('eur')}
                    disabled={pricingLoading}
                    className={`px-6 py-2 rounded-full transition-all font-semibold ${
                      selectedCurrency === 'eur'
                        ? 'bg-white text-gray-900'
                        : 'text-white hover:bg-white/10'
                    } ${pricingLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    ðŸ‡ªðŸ‡º EUR
                  </button>
                  <button
                    onClick={() => setSelectedCurrency('usd')}
                    disabled={pricingLoading}
                    className={`px-6 py-2 rounded-full transition-all font-semibold ${
                      selectedCurrency === 'usd'
                        ? 'bg-white text-gray-900'
                        : 'text-white hover:bg-white/10'
                    } ${pricingLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    ðŸ‡ºðŸ‡¸ USD
                  </button>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="max-w-md mx-auto">
                <div className="flex rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden">
                  <input
                    type="text"
                    placeholder={currentText.promoPlaceholder}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 px-6 py-4 bg-transparent text-white placeholder-white/60 focus:outline-none text-lg"
                    maxLength={20}
                  />
                  <button
                    onClick={() => validatePromoCode()}
                    disabled={isValidating || !promoCode.trim()}
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-8 py-4 font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isValidating ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {currentText.validating}
                      </span>
                    ) : (
                      currentText.apply
                    )}
                  </button>
                </div>

                {error && (
                  <p className="mt-4 text-red-300 bg-red-900/20 border border-red-500/30 rounded-2xl px-4 py-2">
                    {error}
                  </p>
                )}

                {activePromo && (
                  <div className="mt-4 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-2xl flex items-center border border-green-400/30">
                    <CheckCircle className="w-5 h-5 mr-3" />
                    <span className="font-semibold">
                      {`${currentText.applied} "${activePromo.code}" : ${activePromo.discountValue}${
                        activePromo.discountType === 'percentage' ? '%' : '$'
                      } ${currentText.discount}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ðŸ”¥ PRICING CARDS DYNAMIQUES */}
        <section className="py-28 bg-gradient-to-b from-white via-rose-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-gray-900 mb-4">
                Nos{' '}
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  offres
                </span>
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Choisissez le service qui correspond Ã  vos besoins
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {dynamicServices.filter((svc) => svc.isActive).length > 0 ? (
                dynamicServices
                  .filter((svc) => svc.isActive)
                  .map((service) => {
                    const isLawyer = service.type === 'lawyer_call';
                    const originalPrice = service.price;
                    const discountedPrice = calculateDiscountedPrice(service);
                    const hasDiscount = !!activePromo && activePromo.services.includes(service.type);

                    return (
                      <article
                        key={service.id}
                        className={`group relative rounded-3xl border ${
                          isLawyer ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                        } overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] focus-within:scale-[1.02]`}
                        data-price-source="admin"
                        data-currency={selectedCurrency}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${
                            isLawyer ? 'from-red-600 to-red-700' : 'from-blue-600 to-indigo-600'
                          } opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`}
                        />
                        <div className="relative z-10 p-8 sm:p-10">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-8">
                            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/80 rounded-full px-4 py-2 text-gray-900 text-sm font-semibold">
                              {isLawyer ? <Briefcase className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              {isLawyer ? 'Offre Avocat' : 'Offre ExpatriÃ©'}
                            </div>
                            <div className="text-sm text-gray-600">Appel en ~5 min</div>
                          </div>

                          {/* Title */}
                          <h3
                            className={`text-3xl font-extrabold mb-3 ${
                              isLawyer ? 'text-red-600' : 'text-blue-600'
                            }`}
                          >
                            {service.title}
                          </h3>

                          {/* Description */}
                          <p className="text-gray-700 mb-8 leading-relaxed text-lg">{service.description}</p>

                          {/* ðŸ”¥ PRIX DYNAMIQUE */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
                            <div className="flex items-end gap-3">
                              {hasDiscount ? (
                                <div className="flex items-end gap-3">
                                  <span className="text-gray-500 line-through text-2xl">
                                    {currencySymbol}
                                    {originalPrice}
                                  </span>
                                  <span className="text-5xl font-black text-red-600 leading-none">
                                    {currencySymbol}
                                    {Math.round(discountedPrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-5xl font-black text-gray-900 leading-none">
                                  {currencySymbol}
                                  {originalPrice}
                                </span>
                              )}
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                              <Clock className="w-4 h-4" />
                              <span>{service.duration} minutes</span>
                            </div>
                          </div>

                          {/* Features */}
                          <ul className="space-y-4 mb-10" role="list" aria-label="BÃ©nÃ©fices inclus">
                            {getServiceFeatures(isLawyer).map((feature, index) => (
                              <li key={index} role="listitem" className="flex items-start gap-3">
                                <span
                                  className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white bg-gradient-to-r ${
                                    isLawyer ? 'from-red-600 to-red-700' : 'from-blue-600 to-indigo-600'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                </span>
                                <span className="text-gray-800 font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          {/* CTA Button */}
                          <button
                            onClick={() => handleSelectService(service.type)}
                            className={`w-full inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl font-bold text-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
                              isLawyer
                                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                            } hover:scale-105`}
                            aria-label={`${currentText.chooseService} â€“ ${service.title}`}
                          >
                            {currentText.chooseService}
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </article>
                    );
                  })
              ) : (
                <div className="col-span-1 lg:col-span-2">
                  <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
                    <p className="text-gray-800 text-lg mb-4">
                      {pricingLoading
                        ? (language === 'fr'
                            ? 'Chargement des offresâ€¦'
                            : 'Loading plansâ€¦')
                        : (language === 'fr'
                            ? 'Les tarifs sont temporairement indisponibles.'
                            : 'Pricing is temporarily unavailable.')}
                    </p>
                    {!pricingLoading && (
                      <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
                      >
                        {language === 'fr' ? 'Recharger' : 'Reload'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Indicateur source prix */}
            <div className="text-center mt-8">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                ðŸ’° Tarifs synchronisÃ©s depuis la console admin
              </span>
            </div>
          </div>
        </section>

        {/* Security & Guarantee */}
        <section className="py-28 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/3 w-64 h-64 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-white mb-4">
                SÃ©curitÃ© &{' '}
                <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  garanties
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Votre tranquillitÃ© d'esprit est notre prioritÃ©
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <article className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/5 backdrop-blur-xl p-8 sm:p-10 hover:border-white/25 hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mr-6">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">{currentText.securePayment}</h3>
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed text-lg">{currentText.securePaymentDesc}</p>
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                    <CreditCard className="w-6 h-6 text-green-400" />
                    <span className="text-gray-300 font-medium">Visa, Mastercard, American Express</span>
                  </div>
                </div>
              </article>

              <article className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/5 backdrop-blur-xl p-8 sm:p-10 hover:border-white/25 hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mr-6">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">{currentText.satisfactionGuarantee}</h3>
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed text-lg">
                    {currentText.satisfactionGuaranteeDesc}
                  </p>
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                    <Clock className="w-6 h-6 text-blue-400" />
                    <span className="text-gray-300 font-medium">{currentText.refundTime}</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-28 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-gray-900 mb-4">{currentText.faq}</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Tout ce que vous devez savoir sur nos services
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                { question: currentText.paymentQuestion, answer: currentText.paymentAnswer },
                { question: currentText.availabilityQuestion, answer: currentText.availabilityAnswer },
                { question: currentText.invoiceQuestion, answer: currentText.invoiceAnswer }
              ].map((faq, index) => (
                <article
                  key={index}
                  className="group bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{faq.question}</h3>
                    <p className="text-gray-700 text-lg leading-relaxed">{faq.answer}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-32 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
          <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-8">PrÃªt Ã  commencer ?</h2>
            <p className="text-2xl text-white/90 mb-12 leading-relaxed">
              Rejoignez plus de <strong>15 000 expatriÃ©s</strong> qui font confiance Ã  SOS Expats pour leurs
              dÃ©marches Ã  l'Ã©tranger.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={() => navigate('/sos-appel')}
                className="group bg-white hover:bg-gray-100 text-red-600 px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center space-x-4 touch-manipulation"
              >
                <Phone className="w-8 h-8 group-hover:animate-pulse" />
                <span>Commencer maintenant</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </button>

              <button
                onClick={() => navigate('/register')}
                className="group bg-transparent border-2 border-white hover:bg-white hover:text-red-600 text-white px-12 py-6 rounded-3xl font-bold text-xl transition-all duration-300 hover:scale-105 flex items-center space-x-4 touch-manipulation"
              >
                <User className="w-6 h-6" />
                <span>CrÃ©er un compte</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Pricing;
