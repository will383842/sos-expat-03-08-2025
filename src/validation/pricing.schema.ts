// src/validation/pricing.schema.ts
import { z } from "zod";
import type { Timestamp } from "firebase/firestore";
import type {
  Currency,
  ServiceKind,
  StrikeTarget,
  PricingNode,
  PricingOverrideNode,
  PricingDoc,
} from "@/types/pricing";

/* =========================
   Helpers (runtime)
   ========================= */

const EPSILON = 0.01; // tolérance sur l'égalité des montants

/** Convertit tout "timestamp-like" vers Date (accepte Date, number ms/s, Firestore Timestamp). */
function toDateOrUndefined(input: unknown): Date | undefined {
  if (input instanceof Date) return input;
  if (typeof input === "number") {
    // Heuristique : <1e12 -> secondes epoch ; sinon millisecondes
    const ms = input < 1e12 ? input * 1000 : input;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : undefined;
  }
  if (input && typeof input === "object") {
    const obj = input as Partial<Timestamp> & { seconds?: number; nanoseconds?: number; toDate?: () => Date };
    if (typeof obj.toDate === "function") {
      const d = obj.toDate();
      return d instanceof Date ? d : undefined;
    }
    if (typeof obj.seconds === "number") {
      const d = new Date(obj.seconds * 1000);
      return Number.isFinite(d.getTime()) ? d : undefined;
    }
  }
  return undefined;
}

/** Schéma pour timestamp-like → Date */
const zTimestampLikeAsDate = z.preprocess((val) => toDateOrUndefined(val), z.date());

/** Nombre >= 0, fini. */
const zNonNeg = z.number().min(0).finite();

/** Devise stricte */
export const currencySchema = z.enum(["eur", "usd"]) satisfies z.ZodType<Currency>;
/** Service kind stricte (utile si besoin) */
export const serviceKindSchema = z.enum(["expat", "lawyer"]) satisfies z.ZodType<ServiceKind>;
/** Strike target stricte */
export const strikeTargetSchema = z.enum(["provider", "default", "both"]) satisfies z.ZodType<StrikeTarget>;

/* =========================
   Schémas de nœuds
   ========================= */

/** Nœud de prix « base » */
export const pricingNodeSchema = z
  .object({
    connectionFeeAmount: zNonNeg,
    providerAmount: zNonNeg,
    totalAmount: zNonNeg,
    currency: currencySchema,
    duration: z.number().int().min(1),
  })
  .superRefine((val, ctx) => {
    const sum = Number((val.connectionFeeAmount + val.providerAmount).toFixed(2));
    const total = Number(val.totalAmount.toFixed(2));
    if (Math.abs(sum - total) > EPSILON) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Incohérence des montants: commission (${val.connectionFeeAmount}) + prestataire (${val.providerAmount}) ≠ total (${val.totalAmount}).`,
        path: ["totalAmount"],
      });
    }
  }) satisfies z.ZodType<PricingNode>;

/** Nœud d’override (tous les champs optionnels) */
export const pricingOverrideNodeSchema = z
  .object({
    enabled: z.boolean().optional(),
    startsAt: zTimestampLikeAsDate.optional(),
    endsAt: zTimestampLikeAsDate.optional(),
    connectionFeeAmount: zNonNeg.optional(),
    providerAmount: zNonNeg.optional(),
    totalAmount: zNonNeg.optional(),
    stackableWithCoupons: z.boolean().optional(),
    label: z.string().trim().max(120).optional(),
    strikeTargets: strikeTargetSchema.optional(),
  })
  .superRefine((val, ctx) => {
    // startsAt < endsAt (si les deux sont définis)
    if (val.startsAt && val.endsAt && val.startsAt.getTime() >= val.endsAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de début (startsAt) doit être strictement antérieure à la date de fin (endsAt).",
        path: ["endsAt"],
      });
    }

    // Si les 3 montants de l'override sont fournis, on vérifie la cohérence de la somme
    const hasAllAmounts =
      typeof val.connectionFeeAmount === "number" &&
      typeof val.providerAmount === "number" &&
      typeof val.totalAmount === "number";

    if (hasAllAmounts) {
      const sum = Number(((val.connectionFeeAmount ?? 0) + (val.providerAmount ?? 0)).toFixed(2));
      const total = Number((val.totalAmount ?? 0).toFixed(2));
      if (Math.abs(sum - total) > EPSILON) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Incohérence des montants override: commission (${val.connectionFeeAmount}) + prestataire (${val.providerAmount}) ≠ total (${val.totalAmount}).`,
          path: ["totalAmount"],
        });
      }
    }
  }) satisfies z.ZodType<PricingOverrideNode>;

/* =========================
   Schéma du document global
   ========================= */

const perCurrencyBaseSchema = z
  .object({
    eur: pricingNodeSchema.optional(),
    usd: pricingNodeSchema.optional(),
  })
  .partial()
  .optional();

const perCurrencyOverrideSchema = z
  .object({
    eur: pricingOverrideNodeSchema.optional(),
    usd: pricingOverrideNodeSchema.optional(),
  })
  .partial()
  .optional();

export const pricingDocSchema = z
  .object({
    expat: perCurrencyBaseSchema,
    lawyer: perCurrencyBaseSchema,
    overrides: z
      .object({
        settings: z
          .object({
            stackableDefault: z.boolean().optional(),
          })
          .partial()
          .optional(),
        expat: perCurrencyOverrideSchema,
        lawyer: perCurrencyOverrideSchema,
      })
      .partial()
      .optional(),
    updatedAt: zTimestampLikeAsDate.optional(),
    updatedBy: z.string().optional(),
  })
  // Validation transversale optionnelle (ex: rien d'autre à imposer ici)
  .strict() satisfies z.ZodType<PricingDoc>;

/* =========================
   API de validation (helpers)
   ========================= */

export type PricingNodeInput = z.input<typeof pricingNodeSchema>;
export type PricingOverrideNodeInput = z.input<typeof pricingOverrideNodeSchema>;
export type PricingDocInput = z.input<typeof pricingDocSchema>;

export function validatePricingNode(input: unknown) {
  return pricingNodeSchema.safeParse(input);
}

export function validatePricingOverrideNode(input: unknown) {
  return pricingOverrideNodeSchema.safeParse(input);
}

export function validatePricingDoc(input: unknown) {
  return pricingDocSchema.safeParse(input);
}

/**
 * Utilitaire pratique : normalise startsAt/endsAt en Date si possible (pour l’UI),
 * sans altérer les autres champs.
 */
export function normalizeOverrideDates<T extends PricingOverrideNode | undefined>(ov: T): T {
  if (!ov) return ov;
  const startsAt = toDateOrUndefined(ov.startsAt as unknown);
  const endsAt = toDateOrUndefined(ov.endsAt as unknown);
  return {
    ...ov,
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
  } as T;
}
