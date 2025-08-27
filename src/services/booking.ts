// src/services/booking.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

/**
 * Champs MINIMAUX exigés par tes rules :
 *  - clientId == auth.currentUser.uid (déduit ici)
 *  - providerId (string non vide)
 *  - serviceType (string non vide)
 *  - status == "pending"
 */
export type BookingRequestMinimal = {
  providerId: string;
  serviceType: string; // "lawyer_call" | "expat_call" | ...
  status?: "pending";
};

export type BookingRequestOptional = {
  title?: string;
  description?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  price?: number;
  duration?: number;
  clientLanguages?: string[];
  clientLanguagesDetails?: Array<{ code: string; name: string }>;
  providerName?: string;
  providerType?: string;
  providerCountry?: string;
  providerAvatar?: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientNationality?: string;
  clientCurrentCountry?: string;
  ip?: string;
  userAgent?: string;
  providerEmail?: string;
  providerPhone?: string;
};

export type BookingRequestCreate = BookingRequestMinimal & BookingRequestOptional;

export async function createBookingRequest(data: BookingRequestCreate) {
  const u = auth.currentUser;
  if (!u) throw new Error("Utilisateur non connecté");

  const providerId = String(data.providerId || "").trim();
  const serviceType = String(data.serviceType || "").trim();
  if (!providerId || !serviceType) {
    throw new Error("providerId/serviceType manquants");
  }

  // Respecte strictement tes rules : clientId = auth.uid, status = "pending"
  const payload = {
    clientId: u.uid,
    providerId,
    serviceType,
    status: "pending" as const,

    // champs optionnels tolérés par tes rules
    title: data.title ?? null,
    description: data.description ?? null,
    clientPhone: data.clientPhone ?? null,
    clientWhatsapp: data.clientWhatsapp ?? null,
    price: data.price ?? null,
    duration: data.duration ?? null,
    clientLanguages: data.clientLanguages ?? [],
    clientLanguagesDetails: data.clientLanguagesDetails ?? [],
    providerName: data.providerName ?? null,
    providerType: data.providerType ?? null,
    providerCountry: data.providerCountry ?? null,
    providerAvatar: data.providerAvatar ?? null,
    providerRating: data.providerRating ?? null,
    providerReviewCount: data.providerReviewCount ?? null,
    providerLanguages: data.providerLanguages ?? [],
    providerSpecialties: data.providerSpecialties ?? [],
    clientName: data.clientName ?? null,
    clientFirstName: data.clientFirstName ?? null,
    clientLastName: data.clientLastName ?? null,
    clientNationality: data.clientNationality ?? null,
    clientCurrentCountry: data.clientCurrentCountry ?? null,
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
    providerEmail: data.providerEmail ?? null,
    providerPhone: data.providerPhone ?? null,

    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, "booking_requests"), payload); // ✅ camelCase centralisée
}
