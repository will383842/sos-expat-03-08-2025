import type { Payment, Invoice, Dispute, Refund, TaxRate, CurrencyRate } from '@/types/finance';

// NOTE: Stubs de lecture RO. À brancher sur Stripe/Firestore si nécessaire.
// On laisse volontairement vide côté write pour ne rien casser.

export async function listPayments(params?: { from?: string; to?: string; country?: string }): Promise<Payment[]> {
  return []; // TODO: brancher Firestore/Stripe
}
export async function listInvoices(params?: { from?: string; to?: string; country?: string }): Promise<Invoice[]> {
  return [];
}
export async function listDisputes(params?: { from?: string; to?: string; country?: string }): Promise<Dispute[]> {
  return [];
}
export async function listRefunds(params?: { from?: string; to?: string; country?: string }): Promise<Refund[]> {
  return [];
}
export async function listTaxRates(country?: string): Promise<TaxRate[]> {
  return [];
}
