import type { Payment, Invoice, CountryAmount, VatBucket } from '@/types/finance';

export function aggregateByCountry(payments: Payment[], invoices: Invoice[]) : CountryAmount[] {
  const map = new Map<string, CountryAmount>();
  const push = (country:string, currency:string, gross:number, tax:number)=>{
    const k = country+'|'+currency;
    const prev = map.get(k) || { country, currency, gross:0, net:0, tax:0, count:0 };
    prev.gross += gross; prev.tax += (tax||0); prev.net = prev.gross - prev.tax; prev.count += 1; map.set(k, prev);
  };
  for(const p of payments){ push(p.country||'UNK', p.currency, p.amount, p.tax||0); }
  for(const inv of invoices){ push(inv.country||'UNK', inv.currency, inv.total, inv.tax||0); }
  return Array.from(map.values());
}

export function bucketsVat(invoices: Invoice[]): VatBucket[] {
  const map = new Map<string, VatBucket>();
  for(const inv of invoices){
    const country = inv.country||'UNK';
    const rates = inv.taxRates?.length ? inv.taxRates : [{id:'', country, name:'n/a', rate: 0}];
    for(const tr of rates){
      const k = `${country}|${tr.rate}`;
      const prev = map.get(k) || { country, rate: tr.rate, taxable: 0, tax: 0 };
      // Hypothèse: inv.tax est global; si lignes indisponibles, on répartit au taux unique
      // Pour un vrai split par ligne, brancher depuis Firestore/Stripe invoice lines
      prev.tax += inv.tax || 0;
      prev.taxable += Math.max(inv.total - (inv.tax||0), 0);
      map.set(k, prev);
    }
  }
  return Array.from(map.values());
}

export function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v:any)=> `"${String(v??'').replace(/"/g,'""')}"`;
  return [headers.join(','), ...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n');
}
