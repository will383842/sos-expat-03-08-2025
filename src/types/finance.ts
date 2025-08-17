export type Currency = string; // 'EUR','USD',...
export interface CurrencyRate { base: Currency; quote: Currency; rate: number; asOf: string; }
export interface TaxRate { id: string; country: string; name: string; rate: number; }
export interface Payment { id: string; created: string; amount: number; currency: Currency; country?: string; status: 'succeeded'|'refunded'|'failed'|'disputed'; fee?: number; invoiceId?: string; tax?: number; }
export interface Invoice { id: string; created: string; total: number; currency: Currency; country?: string; tax?: number; taxRates?: TaxRate[]; paid: boolean; }
export interface Dispute { id: string; paymentId: string; amount: number; currency: Currency; status: 'needs_response'|'warning_closed'|'won'|'lost'; created: string; }
export interface Refund { id: string; paymentId: string; amount: number; currency: Currency; created: string; }
export interface CountryAmount { country: string; currency: Currency; gross: number; net: number; tax: number; count: number; }
export interface VatBucket { country: string; rate: number; taxable: number; tax: number; }
