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
  authorName?: string
  authorId?: string
}

export interface Testimonial {
  id: string
  name: string
  message: string
  rating?: number
  createdAt?: number | Date
}

export interface Payment {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'canceled'
  createdAt: number | Date
}

export interface CallRecord {
  id: string
  userId: string
  providerId: string
  startedAt: number | Date
  endedAt?: number | Date
  durationSec?: number
  status?: 'missed' | 'completed' | 'canceled'
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

// Firestore document-like generic type without using `any`
export type Document = DocumentData

// Re-export selected types from the provider domain, aliasing `Provider` to avoid conflict

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

