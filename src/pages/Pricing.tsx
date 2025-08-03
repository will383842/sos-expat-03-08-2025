import React, { useState, useEffect, useCallback } from 'react';
import { Check, Phone, MessageCircle, Clock, Shield, Star, CreditCard, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { validateCoupon } from '../utils/coupon';

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

const PROMO_STORAGE_KEY = 'activePromoCode';

const Pricing: React.FC = () => {
  const { language, services } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Handle service selection with correct navigation
  const handleSelectService = useCallback((serviceType: string) => {
    if (serviceType === 'lawyer_call') {
      navigate('/sos-appel?tab=avocat');
    } else if (serviceType === 'expat_call') {
      navigate('/sos-appel?tab=expat');
    } else {
      // Fallback pour d'autres types de services
      navigate('/sos-appel');
    }
  }, [navigate]);

  // Optimized promo code fetching
  const fetchAndSetPromoCode = useCallback(async () => {
    try {
      const savedPromo = sessionStorage.getItem(PROMO_STORAGE_KEY);
      if (savedPromo) {
        setActivePromo(JSON.parse(savedPromo));
        return;
      }
      
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('promo');
      
      if (codeFromUrl) {
        setPromoCode(codeFromUrl);
        // We'll validate the code from URL separately to avoid circular dependency
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      setError(language === 'fr' ? 'Erreur lors du chargement du code promo' : 'Error loading promo code');
    }
  }, [language]);

  const validatePromoCode = useCallback(async (code: string = promoCode) => {
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

      if (result.isValid && result.discountType && result.discountValue) {
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
    } catch (error) {
      console.error('Error validating promo code:', error);
      setError(language === 'fr' ? 'Erreur lors de la validation du code promo' : 'Error validating promo code');
      setActivePromo(null);
    } finally {
      setIsValidating(false);
    }
  }, [promoCode, user?.id, language]);

  const calculateDiscountedPrice = useCallback((originalPrice: number, serviceType: string): number => {
    if (!activePromo || !activePromo.services.includes(serviceType)) {
      return originalPrice;
    }
    
    if (activePromo.discountType === 'percentage') {
      return originalPrice * (1 - activePromo.discountValue / 100);
    }
    
    return Math.max(0, originalPrice - activePromo.discountValue);
  }, [activePromo]);

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

  // Common text content
  const texts = {
    fr: {
      title: 'Tarifs transparents',
      subtitle: 'Obtenez de l\'aide immédiate avec nos tarifs fixes, sans surprise',
      promoPlaceholder: 'Code promo',
      apply: 'Appliquer',
      validating: 'Validation...',
      lawyerTitle: 'Appel Avocat',
      expatTitle: 'Appel Expatrié',
      chooseService: 'Choisir ce service',
      securePayment: 'Paiement sécurisé',
      securePaymentDesc: 'Toutes vos transactions sont protégées par un cryptage SSL 256-bit. Nous n\'enregistrons jamais vos données de carte bancaire.',
      satisfactionGuarantee: 'Garantie satisfaction',
      satisfactionGuaranteeDesc: 'Si l\'expert ne répond pas après 3 tentatives, vous êtes automatiquement remboursé. Nous garantissons votre satisfaction à 100%.',
      refundTime: 'Remboursement sous 24h',
      faq: 'Questions fréquentes',
      paymentQuestion: 'Comment fonctionne le paiement ?',
      paymentAnswer: 'Le paiement se fait en ligne de manière sécurisée via Stripe. Vous n\'êtes débité qu\'après la confirmation de votre appel.',
      availabilityQuestion: 'Que se passe-t-il si l\'expert n\'est pas disponible ?',
      availabilityAnswer: 'Si l\'expert ne répond pas après 3 tentatives, vous êtes automatiquement remboursé et pouvez choisir un autre profil.',
      invoiceQuestion: 'Puis-je obtenir une facture ?',
      invoiceAnswer: 'Oui, vous recevez automatiquement une facture PDF après chaque appel, téléchargeable depuis votre tableau de bord.',
      discount: 'de réduction',
      applied: 'appliqué'
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
      securePaymentDesc: 'All your transactions are protected by 256-bit SSL encryption. We never store your credit card data.',
      satisfactionGuarantee: 'Satisfaction guarantee',
      satisfactionGuaranteeDesc: 'If the expert doesn\'t answer after 3 attempts, you are automatically refunded. We guarantee 100% satisfaction.',
      refundTime: 'Refund within 24h',
      faq: 'Frequently asked questions',
      paymentQuestion: 'How does payment work?',
      paymentAnswer: 'Payment is made online securely via Stripe. You are only charged after your call is confirmed.',
      availabilityQuestion: 'What happens if the expert is not available?',
      availabilityAnswer: 'If the expert doesn\'t answer after 3 attempts, you are automatically refunded and can choose another profile.',
      invoiceQuestion: 'Can I get an invoice?',
      invoiceAnswer: 'Yes, you automatically receive a PDF invoice after each call, downloadable from your dashboard.',
      discount: 'discount',
      applied: 'applied'
    }
  };

  const currentText = texts[language as keyof typeof texts] || texts.en;

  // Service features data
  const getServiceFeatures = useCallback((isLawyer: boolean) => {
    const commonFeatures = [
      language === 'fr' ? 'Appel téléphonique sécurisé' : 'Secure phone call',
      language === 'fr' ? 'Facture PDF automatique' : 'Automatic PDF invoice',
      language === 'fr' ? 'Support 24/7' : '24/7 support',
      language === 'fr' ? 'Garantie remboursement' : 'Money back guarantee'
    ];

    if (isLawyer) {
      return [
        language === 'fr' ? 'Consultation avec avocat certifié' : 'Consultation with certified lawyer',
        ...commonFeatures.slice(0, 1),
        language === 'fr' ? 'Durée : 20 minutes' : 'Duration: 20 minutes',
        ...commonFeatures.slice(1)
      ];
    }

    return [
      language === 'fr' ? 'Conseil d\'expatrié expérimenté' : 'Advice from experienced expat',
      ...commonFeatures.slice(0, 1),
      language === 'fr' ? 'Durée : 30 minutes' : 'Duration: 30 minutes',
      ...commonFeatures.slice(1)
    ];
  }, [language]);

  const activeServices = services.filter(service => service.isActive);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {currentText.title}
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              {currentText.subtitle}
            </p>
            
            {/* Promo Code Input */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex">
                <input
                  type="text"
                  placeholder={currentText.promoPlaceholder}
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 rounded-l-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  maxLength={20}
                />
                <button
                  onClick={() => validatePromoCode()}
                  disabled={isValidating || !promoCode.trim()}
                  className="bg-red-800 hover:bg-red-900 px-4 py-3 rounded-r-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {currentText.validating}
                    </span>
                  ) : (
                    currentText.apply
                  )}
                </button>
              </div>
              
              {error && (
                <p className="mt-2 text-sm text-red-200">{error}</p>
              )}
              
              {activePromo && (
                <div className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>
                    {`${currentText.applied} "${activePromo.code}" : ${activePromo.discountValue}${activePromo.discountType === 'percentage' ? '%' : '€'} ${currentText.discount}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {activeServices.map((service) => {
                const isLawyer = service.type === 'lawyer_call';
                const originalPrice = service.price;
                const discountedPrice = calculateDiscountedPrice(originalPrice, service.type);
                const hasDiscount = activePromo && activePromo.services.includes(service.type);
                
                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-105 hover:shadow-2xl"
                  >
                    <div className={`p-1 ${isLawyer ? 'bg-blue-600' : 'bg-green-600'}`}></div>
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isLawyer ? 'bg-blue-100' : 'bg-green-100'}`}>
                          {isLawyer ? (
                            <Phone className={`w-8 h-8 ${isLawyer ? 'text-blue-600' : 'text-green-600'}`} />
                          ) : (
                            <MessageCircle className={`w-8 h-8 ${isLawyer ? 'text-blue-600' : 'text-green-600'}`} />
                          )}
                        </div>
                        <div className="text-right">
                          {hasDiscount ? (
                            <div>
                              <span className="text-gray-500 line-through text-lg">{originalPrice}€</span>
                              <span className="text-3xl font-bold ml-2 text-red-600">{Math.round(discountedPrice)}€</span>
                            </div>
                          ) : (
                            <span className="text-3xl font-bold text-gray-900">{originalPrice}€</span>
                          )}
                          <div className="text-gray-500 flex items-center justify-end mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{service.duration} min</span>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className={`text-2xl font-bold mb-4 ${isLawyer ? 'text-blue-600' : 'text-green-600'}`}>
                        {isLawyer ? currentText.lawyerTitle : currentText.expatTitle}
                      </h3>
                      
                      <p className="text-gray-600 mb-6">
                        {service.description}
                      </p>
                      
                      <ul className="space-y-3 mb-8">
                        {getServiceFeatures(isLawyer).map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <Check className={`w-5 h-5 ${isLawyer ? 'text-blue-600' : 'text-green-600'} mr-2 mt-0.5 flex-shrink-0`} />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <button
                        onClick={() => handleSelectService(service.type)}
                        className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-colors ${isLawyer ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {currentText.chooseService}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security & Guarantee */}
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                      <Shield className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {currentText.securePayment}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {currentText.securePaymentDesc}
                  </p>
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">Visa, Mastercard, American Express</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                      <Star className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {currentText.satisfactionGuarantee}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {currentText.satisfactionGuaranteeDesc}
                  </p>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500">
                      {currentText.refundTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              {currentText.faq}
            </h2>
            
            <div className="max-w-3xl mx-auto space-y-6">
              {[
                { question: currentText.paymentQuestion, answer: currentText.paymentAnswer },
                { question: currentText.availabilityQuestion, answer: currentText.availabilityAnswer },
                { question: currentText.invoiceQuestion, answer: currentText.invoiceAnswer }
              ].map((faq, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pricing;