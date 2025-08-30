// src/components/checkout/CurrencySelector.tsx
import React, { useState, useEffect } from 'react';
import { DollarSign, Euro } from 'lucide-react';
import { detectUserCurrency, getServicePricing } from '../../services/pricingService';

interface CurrencySelectorProps {
  serviceType: 'lawyer' | 'expat';
  selectedCurrency: 'eur' | 'usd';
  onCurrencyChange: (currency: 'eur' | 'usd') => void;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  serviceType,
  selectedCurrency,
  onCurrencyChange,
  className = ''
}) => {
  const [prices, setPrices] = useState<{
    eur: { total: number; fee: number };
    usd: { total: number; fee: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const [eurConfig, usdConfig] = await Promise.all([
          getServicePricing(serviceType, 'eur'),
          getServicePricing(serviceType, 'usd')
        ]);

        setPrices({
          eur: { total: eurConfig.totalAmount, fee: eurConfig.connectionFeeAmount },
          usd: { total: usdConfig.totalAmount, fee: usdConfig.connectionFeeAmount }
        });
      } catch (error) {
        console.error('Erreur chargement prix:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, [serviceType]);

  if (loading || !prices) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-16 ${className}`} />
    );
  }

  const handleCurrencySelect = (currency: 'eur' | 'usd') => {
    onCurrencyChange(currency);
    // Sauvegarder la prÃ©fÃ©rence
    localStorage.setItem('preferredCurrency', currency);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">Devise de paiement</h4>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Option EUR */}
        <button
          type="button"
          onClick={() => handleCurrencySelect('eur')}
          className={`
            relative p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${selectedCurrency === 'eur'
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Euro className={`w-5 h-5 ${selectedCurrency === 'eur' ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className={`font-medium text-sm ${selectedCurrency === 'eur' ? 'text-blue-900' : 'text-gray-900'}`}>
                EUR (â‚¬)
              </span>
            </div>
            {selectedCurrency === 'eur' && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
          
          <div className="space-y-1">
            <div className={`text-lg font-bold ${selectedCurrency === 'eur' ? 'text-blue-900' : 'text-gray-900'}`}>
              {prices.eur.total.toFixed(2)}â‚¬
            </div>
            <div className="text-xs text-gray-500">
              Frais: {prices.eur.fee.toFixed(2)}â‚¬
            </div>
          </div>
        </button>

        {/* Option USD */}
        <button
          type="button"
          onClick={() => handleCurrencySelect('usd')}
          className={`
            relative p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${selectedCurrency === 'usd'
              ? 'border-green-500 bg-green-50 ring-2 ring-green-500/20'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <DollarSign className={`w-5 h-5 ${selectedCurrency === 'usd' ? 'text-green-600' : 'text-gray-600'}`} />
              <span className={`font-medium text-sm ${selectedCurrency === 'usd' ? 'text-green-900' : 'text-gray-900'}`}>
                USD ($)
              </span>
            </div>
            {selectedCurrency === 'usd' && (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            )}
          </div>
          
          <div className="space-y-1">
            <div className={`text-lg font-bold ${selectedCurrency === 'usd' ? 'text-green-900' : 'text-gray-900'}`}>
              ${prices.usd.total.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              Frais: ${prices.usd.fee.toFixed(2)}
            </div>
          </div>
        </button>
      </div>

      {/* Info complÃ©mentaire */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600">
          ðŸ’¡ La devise est dÃ©tectÃ©e automatiquement selon votre localisation. 
          Vous pouvez la modifier Ã  tout moment.
        </p>
      </div>
    </div>
  );
};
