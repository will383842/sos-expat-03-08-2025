// src/types/pricing.ts
// Centralisation des types liés au pricing (front-end)

import type { Timestamp } from "firebase/firestore";

/** Devises supportées */
export type Currency = "eur" | "usd";

/** Types de service (catégories) */
export type ServiceKind = "expat" | "lawyer";

/** Cibles d’affichage du prix barré lors d’une promo */
export type StrikeTarget = "provider" | "default" | "both";

/** Nœud de prix « de base » pour un service + devise */
export interface PricingNode {
  /** Frais plateforme (même unité que totalAmount) */
  connectionFeeAmount: number;
  /** Part reversée au prestataire (peut être = total - fee) */
  providerAmount: number;
  /** Total payé par le client (devise principale, ex: 49.00) */
  totalAmount: number;
  /** Devise du nœud */
  currency: Currency;
  /** Durée de la prestation en minutes */
  duration: number;
}

/** Nœud d’override/promo pour un service + devise */
export interface PricingOverrideNode {
  /** Active/désactive l’override */
  enabled?: boolean;
  /** Fenêtre de validité (timestamp Firestore ou nombre ms/epoch) */
  startsAt?: Timestamp | number;
  endsAt?: Timestamp | number;
  /** Montants promo (si définis, remplacent les montants de base) */
  connectionFeeAmount?: number;
  providerAmount?: number;
  totalAmount?: number;
  /** Cumuler avec les coupons ? */
  stackableWithCoupons?: boolean;
  /** Label marketing (ex: “Promo rentrée”) */
  label?: string;
  /** Cible(s) prix barré dans l’UI */
  strikeTargets?: StrikeTarget;
}

/** Document Firestore complet pour admin_config/pricing */
export interface PricingDoc {
  /** Prix de base par service/devise (champs optionnels car merge partiel) */
  expat?: Partial<Record<Currency, PricingNode>>;
  lawyer?: Partial<Record<Currency, PricingNode>>;

  /** Overrides / promotions */
  overrides?: {
    /** Réglages globaux pour les overrides */
    settings?: {
      /** Défault pour le cumul coupons quand non précisé dans l’override */
      stackableDefault?: boolean;
    };
    /** Overrides par service/devise */
    expat?: Partial<Record<Currency, PricingOverrideNode>>;
    lawyer?: Partial<Record<Currency, PricingOverrideNode>>;
  };

  /** Métadonnées d’audit */
  updatedAt?: Timestamp;
  updatedBy?: string;
}
