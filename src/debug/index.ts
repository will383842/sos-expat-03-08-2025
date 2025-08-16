// src/debug/index.ts
export { default as CheckPricing } from './CheckPricing';

// Utilitaires debug
export const debugUtils = {
  clearPricingCache: () => {
    sessionStorage.removeItem('selectedProvider');
    sessionStorage.removeItem('serviceData');
    sessionStorage.removeItem('selectedCurrency');
    localStorage.removeItem('preferredCurrency');
    console.log('✅ Cache pricing nettoyé');
  },

  testCurrencySwitch: (currency: 'eur' | 'usd') => {
    sessionStorage.setItem('selectedCurrency', currency);
    localStorage.setItem('preferredCurrency', currency);
    console.log(`💱 Devise forcée: ${currency.toUpperCase()}`);
  },

  addDebugMarkers: () => {
    const priceElements = document.querySelectorAll('*');
    let count = 0;
    priceElements.forEach(el => {
      const text = el.textContent || '';
      if (text.match(/\d+[€$]/) && !el.hasAttribute('data-price-source')) {
        el.setAttribute('data-price-source', 'unknown');
        (el as HTMLElement).style.border = '2px solid orange';
        count++;
      }
    });
    console.log(`🏷️ ${count} éléments marqués comme prix unknown`);
  }
};

// Exposer globalement en dev
if (process.env.NODE_ENV === 'development') {
  (window as any).debugUtils = debugUtils;
}