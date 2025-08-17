// Central barrel for project types.
// - Avoids name clashes by ALIASING types that would otherwise conflict.
// - No `any`: uses concrete interfaces or `unknown`/Firebase `DocumentData`.

import type { DocumentData } from 'firebase/firestore'

/**
 * Re-export app context types WITHOUT flattening conflicting names.
 * If you need something from contexts/types, import it directly from there.
 * We do not `export *` to avoid clashing with the Provider domain model.
 */
// export * from '../contexts/types'  <-- removed to prevent 'Provider' conflict
export * as CtxTypes from '../contexts/types'

/**
 * Domain types
 * (You can refine these later according to your Firestore schema.)
 */
export interface Review {
  id: string
  rating: number
  comment?: string
  createdAt: number | Date
  
  // Client information
  clientId?: string
  clientName?: string
  clientCountry?: string
  authorName?: string
  authorId?: string
  
  // Provider information
  providerId?: string
  providerName?: string
  
  // Service information
  serviceType?: 'lawyer_call' | 'expat_call'
  callId?: string
  
  // Status and moderation
  status?: 'pending' | 'published' | 'hidden'
  reportedCount?: number
  
  // Additional fields
  helpfulVotes?: number
}

export interface Report {
  id: string
  type: 'contact' | 'user' | 'review' | 'call'
  reporterId: string
  reporterName: string
  targetId: string
  targetType: 'contact' | 'user' | 'review' | 'call'
  reason: string
  details: Record<string, unknown>
  status: 'pending' | 'dismissed' | 'resolved'
  createdAt: Date | { toDate(): Date }
  updatedAt: Date | { toDate(): Date }
  firstName?: string
  lastName?: string
  email?: string
  subject?: string
  category?: string
  message?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface Testimonial {
  id: string
  name: string
  message: string
  rating?: number
  createdAt?: number | Date
}

// Interface Payment étendue pour correspondre aux usages dans AdminPayments
export interface Payment {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'authorized' | 'captured' | 'refunded'
  createdAt: number | Date
  updatedAt?: number | Date
  paidAt?: number | Date
  capturedAt?: number | Date
  canceledAt?: number | Date
  refundedAt?: number | Date
  
  // Client and provider information
  clientId: string
  providerId: string
  clientName?: string
  providerName?: string
  clientEmail?: string
  providerEmail?: string
  
  // Payment details
  platformFee: number
  providerAmount: number
  stripePaymentIntentId?: string
  stripeChargeId?: string
  description?: string
  refundReason?: string
  
  // Invoice URLs
  platformInvoiceUrl?: string
  providerInvoiceUrl?: string
  
  // Call association
  callId?: string
}

// Interface CallRecord étendue pour correspondre aux usages dans AdminPayments
export interface CallRecord {
  id: string
  userId: string
  providerId: string
  startedAt: number | Date
  endedAt?: number | Date
  createdAt?: number | Date
  updatedAt?: number | Date
  durationSec?: number
  duration?: number // en minutes
  status?: 'missed' | 'completed' | 'canceled' | 'pending' | 'in_progress' | 'failed' | 'refunded'
  serviceType?: 'lawyer_call' | 'expat_call'
}

export interface CallSession {
  id: string
  twilioSid?: string
  record?: CallRecord
}

export interface SosProfile {
  firstName: string
  nationality?: string
  country?: string
  title?: string
  description?: string
  language?: string
}

export * from './user';
export * from './notification';
export * from './provider';

// Firestore document-like generic type without using `any`
export type Document = DocumentData

// Re-export selected types from the provider domain, aliasing `Provider` to avoid conflict
export type { Provider as ProviderDoc } from './provider'

/**
 * Some projects import these from the barrel. If your ./provider file
 * doesn't export them, we provide soft definitions here so the rest
 * of the app compiles. You can refine them later to your exact schema.
 */
export type ProviderCategory = string

export interface AvailabilitySlot {
  /** 0 (Sunday) .. 6 (Saturday). Keep number if your app uses 1..7 */
  weekday: number
  /** Start time as 'HH:mm' */
  start: string
  /** End time as 'HH:mm' */
  end: string
  /** Optional IANA timezone like 'Europe/Paris' */
  timezone?: string
}
