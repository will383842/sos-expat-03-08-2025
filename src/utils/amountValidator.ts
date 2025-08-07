export interface AmountSet {
  total: number;
  commission: number;
  provider: number;
}

export const validateAmounts = (amounts: AmountSet): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Cohérence totale
  const calculatedTotal = amounts.commission + amounts.provider;
  if (Math.abs(amounts.total - calculatedTotal) > 0.01) {
    errors.push(`Total incohérent: ${amounts.total} ≠ ${calculatedTotal}`);
  }
  
  // Limites
  if (amounts.total < 5) errors.push('Montant minimum: 5€');
  if (amounts.total > 500) errors.push('Montant maximum: 500€');
  
  // Commission raisonnable (15-25%)
  const commissionRate = amounts.commission / amounts.total;
  if (commissionRate < 0.15 || commissionRate > 0.25) {
    errors.push(`Taux de commission suspect: ${(commissionRate * 100).toFixed(1)}%`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};