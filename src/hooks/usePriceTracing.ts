import { usePricingConfig } from '../services/pricingService';

export function usePriceTracing() {
  const { pricing, loading } = usePricingConfig();
  
  const getTraceAttributes = (
    serviceType: 'lawyer' | 'expat', 
    currency: 'eur' | 'usd', 
    providerOverride?: number
  ) => {
    const currencySymbol = currency === 'eur' ? '€' : '$';
    
    if (loading) {
      return {
        'data-price-source': 'loading',
        'data-currency': currency,
        title: 'Prix en cours de chargement...'
      };
    }
    
    if (typeof providerOverride === 'number') {
      return {
        'data-price-source': 'provider',
        'data-currency': currency,
        'data-service-type': serviceType,
        title: `Prix personnalisé: ${providerOverride}${currencySymbol}`
      };
    }
    
    if (pricing) {
      const config = pricing[serviceType][currency];
      return {
        'data-price-source': 'admin',
        'data-currency': currency,
        'data-service-type': serviceType,
        'data-total-amount': config.totalAmount,
        'data-connection-fee': config.connectionFeeAmount,
        title: `Admin: ${config.totalAmount}${currencySymbol} (Frais: ${config.connectionFeeAmount}${currencySymbol})`
      };
    }
    
    return {
      'data-price-source': 'fallback',
      'data-currency': currency,
      title: `Prix par défaut`
    };
  };
  
  return { getTraceAttributes };
}