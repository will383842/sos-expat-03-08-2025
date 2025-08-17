import type { CurrencyRate } from '@/types/finance';

// Table des taux "reporting" (mock). À remplacer par une source réelle si besoin.
const RATES: CurrencyRate[] = [{ base:'EUR', quote:'USD', rate:1.1, asOf:new Date().toISOString() }];

export function convert(amount:number, from:string, to:string, rates:CurrencyRate[]=RATES): number {
  if (from === to) return amount;
  const r = rates.find(x=>x.base===to && x.quote===from) || rates.find(x=>x.base===from && x.quote===to);
  if (!r) return amount;
  return r.base===to ? amount / r.rate : amount * r.rate;
}
