#!/usr/bin/env bash
set -euo pipefail

echo "==> Dossiers Finance"
mkdir -p src/features/finance/pages
mkdir -p src/services/finance
mkdir -p src/types

echo "==> Types Finance"
cat > src/types/finance.ts <<'TS'
export type Currency = string; // 'EUR','USD',...
export interface CurrencyRate { base: Currency; quote: Currency; rate: number; asOf: string; }
export interface TaxRate { id: string; country: string; name: string; rate: number; }
export interface Payment { id: string; created: string; amount: number; currency: Currency; country?: string; status: 'succeeded'|'refunded'|'failed'|'disputed'; fee?: number; invoiceId?: string; tax?: number; }
export interface Invoice { id: string; created: string; total: number; currency: Currency; country?: string; tax?: number; taxRates?: TaxRate[]; paid: boolean; }
export interface Dispute { id: string; paymentId: string; amount: number; currency: Currency; status: 'needs_response'|'warning_closed'|'won'|'lost'; created: string; }
export interface Refund { id: string; paymentId: string; amount: number; currency: Currency; created: string; }
export interface CountryAmount { country: string; currency: Currency; gross: number; net: number; tax: number; count: number; }
export interface VatBucket { country: string; rate: number; taxable: number; tax: number; }
TS

echo "==> Services Finance (RO)"
cat > src/services/finance/read.ts <<'TS'
import type { Payment, Invoice, Dispute, Refund, TaxRate, CurrencyRate } from '@/types/finance';

// NOTE: Stubs de lecture RO. À brancher sur Stripe/Firestore si nécessaire.
// On laisse volontairement vide côté write pour ne rien casser.

export async function listPayments(params?: { from?: string; to?: string; country?: string }): Promise<Payment[]> {
  return []; // TODO: brancher Firestore/Stripe
}
export async function listInvoices(params?: { from?: string; to?: string; country?: string }): Promise<Invoice[]> {
  return [];
}
export async function listDisputes(params?: { from?: string; to?: string; country?: string }): Promise{Dispute[]} {
  return [] as any;
}
export async function listRefunds(params?: { from?: string; to?: string; country?: string }): Promise<Refund[]> {
  return [];
}
export async function listTaxRates(country?: string): Promise<TaxRate[]> {
  return [];
}
TS

cat > src/services/finance/reports.ts <<'TS'
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
TS

cat > src/services/finance/currencies.ts <<'TS'
import type { CurrencyRate } from '@/types/finance';

// Table des taux "reporting" (mock). À remplacer par une source réelle si besoin.
const RATES: CurrencyRate[] = [{ base:'EUR', quote:'USD', rate:1.1, asOf:new Date().toISOString() }];

export function convert(amount:number, from:string, to:string, rates:CurrencyRate[]=RATES): number {
  if (from === to) return amount;
  const r = rates.find(x=>x.base===to && x.quote===from) || rates.find(x=>x.base===from && x.quote===to);
  if (!r) return amount;
  return r.base===to ? amount / r.rate : amount * r.rate;
}
TS

echo "==> Pages Finance (UI-only)"
cat > src/features/finance/pages/Vat.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Vat(){ return <Placeholder title="TVA — Synthèse par pays/taux" />; }
TS

cat > src/features/finance/pages/VatReturns.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function VatReturns(){ return <Placeholder title="TVA — Déclarations & exports" />; }
TS

cat > src/features/finance/pages/CountryBreakdown.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function CountryBreakdown(){ return <Placeholder title="Ventilation par pays / devise" />; }
TS

cat > src/features/finance/pages/Reconciliation.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Reconciliation(){ return <Placeholder title="Rapprochement (Stripe/banque/Firestore)" />; }
TS

cat > src/features/finance/pages/Disputes.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Disputes(){ return <Placeholder title="Litiges (Stripe)" />; }
TS

cat > src/features/finance/pages/Refunds.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Refunds(){ return <Placeholder title="Remboursements" />; }
TS

cat > src/features/finance/pages/Ledger.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Ledger(){ return <Placeholder title="Grand livre (UI) + Export comptable" />; }
TS

cat > src/features/finance/pages/Exports.tsx <<'TS'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Exports(){ return <Placeholder title="Exports CSV (CA/TVA/écritures/rapprochement)" />; }
TS

echo "==> Fini. Ajoute les routes Finance listées dans AdminRoutesV2.tsx."
