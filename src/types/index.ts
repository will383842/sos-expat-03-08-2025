// src/types/index.ts
// -----------------------------------------------------------------------------
// Central barrel for project types.
// - Pas de `any`: on utilise des interfaces concrètes, `unknown` ou Firebase
//   `DocumentData` lorsque nécessaire.
// - On N'exporte PAS tout depuis ../contexts/types pour éviter les collisions,
//   on ne ré-exporte que les types utiles (User, UserRole, Notification).
// - Le domaine "provider" est exporté depuis ./provider, et on fournit un alias
//   `ProviderDoc` si besoin d'éviter une collision de nom ailleurs.
// -----------------------------------------------------------------------------

import type { DocumentData } from 'firebase/firestore';

// -----------------------------------------------------------------------------
// Ré-export ciblé des types du contexte (évite les conflits de noms)
// -----------------------------------------------------------------------------
export type { User, UserRole, Notification } from '../contexts/types';

// -----------------------------------------------------------------------------
// Domaine Provider (fichier présent dans ce dossier)
// -----------------------------------------------------------------------------
export * from './provider';
export type { Provider as ProviderDoc } from './provider';

// -----------------------------------------------------------------------------
// Types de domaine transverses (reviews, reports, paiements, appels, etc.)
// Ces interfaces reflètent l'usage observé dans le code et évitent les `any`.
// -----------------------------------------------------------------------------

// Review utilisée dans utils/firestore.ts et AdminReviews.tsx
export interface Review {
  id: string;
  rating: number;
  comment?: string;

  // Dates: on accepte Date native, timestamp number (ms/s) ou Firestore Timestamp-like
  createdAt: Date | number | { toDate(): Date };

  // Infos client / auteur
  clientId?: string;
  clientName?: string;
  clientCountry?: string;
  authorName?: string;
  authorId?: string;

  // Infos prestataire (provider)
  providerId?: string;
  providerName?: string;

  // Lien avec un service / appel
  serviceType?: 'lawyer_call' | 'expat_call';
  callId?: string;

  // Modération / statut
  status?: 'pending' | 'published' | 'hidden';
  isPublic?: boolean;          // utilisé dans utils/firestore.ts
  moderatorNotes?: string;     // utilisé dans AdminReviews.tsx
  reportedCount?: number;

  // Divers
  helpfulVotes?: number;
}

// Report utilisé dans AdminReports.tsx (statuts stricts)
export interface Report {
  id: string;
  type: 'contact' | 'user' | 'review' | 'call';
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'contact' | 'user' | 'review' | 'call';
  reason: string;
  details: Record<string, unknown>;
  status: 'pending' | 'dismissed' | 'resolved';
  createdAt: Date | number | { toDate(): Date };
  updatedAt: Date | number | { toDate(): Date };

  // Champs additionnels (présents dans certaines variantes de rapports)
  firstName?: string;
  lastName?: string;
  email?: string;
  subject?: string;
  category?: string;
  message?: string;

  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Testimonial {
  id: string;
  name: string;
  message: string;
  rating?: number;
  createdAt?: Date | number;
}

// Paiement (aligné sur les usages AdminPayments)
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status:
    | 'pending'
    | 'succeeded'
    | 'failed'
    | 'canceled'
    | 'authorized'
    | 'captured'
    | 'refunded';
  createdAt: Date | number;
  updatedAt?: Date | number;
  paidAt?: Date | number;
  capturedAt?: Date | number;
  canceledAt?: Date | number;
  refundedAt?: Date | number;

  // Parties
  clientId: string;
  providerId: string;
  clientName?: string;
  providerName?: string;
  clientEmail?: string;
  providerEmail?: string;

  // Détails de calcul
  platformFee: number;
  providerAmount: number;

  // Références Stripe
  stripePaymentIntentId?: string;
  stripeChargeId?: string;

  description?: string;
  refundReason?: string;

  // Factures
  platformInvoiceUrl?: string;
  providerInvoiceUrl?: string;

  // Lien avec l'appel
  callId?: string;
}

// Enregistrements d'appels (AdminCalls / finance éventuel)
export interface CallRecord {
  id: string;
  userId: string;
  providerId: string;
  startedAt: Date | number;
  endedAt?: Date | number;
  createdAt?: Date | number;
  updatedAt?: Date | number;

  // Durées (seconds et/ou minutes selon l'usage)
  durationSec?: number;
  duration?: number; // minutes

  status?:
    | 'missed'
    | 'completed'
    | 'canceled'
    | 'pending'
    | 'in_progress'
    | 'failed'
    | 'refunded';

  serviceType?: 'lawyer_call' | 'expat_call';
}

// Session d'appel (couplage Twilio/CallRecord)
export interface CallSession {
  id: string;
  twilioSid?: string;
  record?: CallRecord;
}

// Mini-profil pour payloads (analytics / after-payment messages)
export interface SosProfile {
  firstName: string;
  nationality?: string;
  country?: string;
  title?: string;
  description?: string;
  language?: string;
}

// Catégorie de provider (peut être affinée si enum disponible)
export type ProviderCategory = string;

// Slot de disponibilité (dashboard provider)
export interface AvailabilitySlot {
  /** 0=Sunday .. 6=Saturday (adapter si 1..7 dans l’app) */
  weekday: number;
  /** Heure de début 'HH:mm' */
  start: string;
  /** Heure de fin 'HH:mm' */
  end: string;
  /** Timezone IANA optionnelle */
  timezone?: string;
}

// -----------------------------------------------------------------------------
// Firestore document-like generic (sans `any`)
// -----------------------------------------------------------------------------
export type Document = DocumentData;
