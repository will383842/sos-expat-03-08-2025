"use strict";
// firebase/functions/src/services/couponService.ts
// Service Coupons pour Cloud Functions (Admin SDK)
// - Réplique les features de la version front (286 lignes) : types, mapping, pagination, recherche, CRUD, utilitaires.
// - Utilise admin.firestore() (aucun alias "@/config/firebase").
// - Pagination: retourne un cursor string (doc.id + created_at) pour la page suivante.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoupons = getCoupons;
exports.getCouponByCode = getCouponByCode;
exports.createCoupon = createCoupon;
exports.updateCoupon = updateCoupon;
exports.toggleCouponActive = toggleCouponActive;
exports.deleteCoupon = deleteCoupon;
exports.applyCouponToTotal = applyCouponToTotal;
const admin = __importStar(require("firebase-admin"));
// Cold start safe
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
const db = admin.firestore();
/* ===================== Helpers ===================== */
const COUPONS_COL = db.collection('coupons');
function toDateSafe(v) {
    if (v instanceof Date)
        return v;
    if (typeof v === 'number')
        return new Date(v);
    if (v && typeof v === 'object' && 'toDate' in v) {
        const d = v.toDate();
        return d instanceof Date ? d : new Date();
    }
    if (typeof v === 'string') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
}
function toTsOrNull(d) {
    return d ? admin.firestore.Timestamp.fromDate(d) : null;
}
function fromTsToDate(v) {
    if (v instanceof admin.firestore.Timestamp)
        return v.toDate();
    return toDateSafe(v);
}
function normalizeServices(arr) {
    if (!Array.isArray(arr))
        return [];
    return arr.map((s) => s === 'lawyer_call' || s === 'expat_call' ? s : 'lawyer_call');
}
function mapSnapToCoupon(snap) {
    const raw = snap.data() ?? {};
    return {
        id: snap.id,
        code: String(raw.code ?? ''),
        type: raw.type === 'percentage' ? 'percentage' : 'fixed',
        amount: typeof raw.amount === 'number' ? raw.amount : 0,
        min_order_amount: typeof raw.min_order_amount === 'number' ? raw.min_order_amount : 0,
        max_uses_total: typeof raw.max_uses_total === 'number' ? raw.max_uses_total : 0,
        max_uses_per_user: typeof raw.max_uses_per_user === 'number' ? raw.max_uses_per_user : 0,
        valid_from: fromTsToDate(raw.valid_from),
        valid_until: fromTsToDate(raw.valid_until),
        services: normalizeServices(raw.services),
        active: Boolean(raw.active),
        created_at: fromTsToDate(raw.created_at),
        created_by: String(raw.created_by ?? 'admin'),
        updated_at: fromTsToDate(raw.updated_at),
        description: typeof raw.description === 'string' ? raw.description : undefined,
        maxDiscount: typeof raw.maxDiscount === 'number' ? raw.maxDiscount : undefined,
    };
}
function toFirestorePayload(input) {
    const payload = {};
    if ('code' in input && input.code !== undefined)
        payload.code = String(input.code).toUpperCase();
    if (input.type !== undefined)
        payload.type = input.type;
    if (input.amount !== undefined)
        payload.amount = input.amount;
    if (input.min_order_amount !== undefined)
        payload.min_order_amount = input.min_order_amount;
    if (input.max_uses_total !== undefined)
        payload.max_uses_total = input.max_uses_total;
    if (input.max_uses_per_user !== undefined)
        payload.max_uses_per_user = input.max_uses_per_user;
    if (input.valid_from !== undefined)
        payload.valid_from = toTsOrNull(input.valid_from);
    if (input.valid_until !== undefined)
        payload.valid_until = toTsOrNull(input.valid_until);
    if (input.services !== undefined)
        payload.services = input.services;
    if (input.active !== undefined)
        payload.active = input.active;
    if (input.description !== undefined)
        payload.description = input.description;
    if (input.maxDiscount !== undefined)
        payload.maxDiscount = input.maxDiscount;
    return payload;
}
/**
 * Encode/Décode un cursor simple sous forme "docId|createdAtMillis"
 * pour éviter d’exposer un snapshot Firestore côté serveur.
 */
function encodeCursor(id, createdAt) {
    return `${id}|${createdAt.getTime()}`;
}
function decodeCursor(c) {
    if (!c)
        return null;
    const [id, msStr] = c.split('|');
    const ms = Number(msStr);
    if (!id || Number.isNaN(ms))
        return null;
    return { id, createdAtMs: ms };
}
/**
 * Récupère une page de coupons.
 * Filtres serveur: active, service, ordre, cursor.
 * Filtre texte: tente de fitter code/description (LIKE approximatif avec where('code', '==') n’est pas possible, on le fait en post-filtre).
 */
async function getCoupons(options = {}) {
    const perPage = Math.max(1, Math.min(100, options.perPage ?? 10));
    const orderAsc = options.order === 'created_at_asc';
    let ref = COUPONS_COL;
    // filtres
    if (options.onlyActive)
        ref = ref.where('active', '==', true);
    if (options.service)
        ref = ref.where('services', 'array-contains', options.service);
    // tri
    ref = ref.orderBy('created_at', orderAsc ? 'asc' : 'desc');
    // cursor (startAfter)
    const decoded = decodeCursor(options.cursor ?? null);
    if (decoded) {
        // On reconstruit un sentinel avec created_at : Timestamp
        ref = ref.startAfter(admin.firestore.Timestamp.fromMillis(decoded.createdAtMs));
    }
    ref = ref.limit(perPage);
    const snap = await ref.get();
    let items = snap.docs.map(mapSnapToCoupon);
    // Filtre texte approximatif (post-filtre)
    if (options.search) {
        const s = options.search.toLowerCase();
        items = items.filter((c) => c.code.toLowerCase().includes(s) ||
            (c.description ? c.description.toLowerCase().includes(s) : false));
    }
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    const lastCursor = lastDoc
        ? encodeCursor(lastDoc.id, fromTsToDate(lastDoc.get('created_at')))
        : null;
    const hasMore = snap.docs.length === perPage;
    return { items, lastCursor, hasMore };
}
/** Récupère un coupon par son code (insensible à la casse) */
async function getCouponByCode(code) {
    const normalized = code.toUpperCase().trim();
    if (!normalized)
        return null;
    const snap = await COUPONS_COL.where('code', '==', normalized).limit(1).get();
    if (snap.empty)
        return null;
    return mapSnapToCoupon(snap.docs[0]);
}
/** Crée un coupon (garantit l’unicité du code) */
async function createCoupon(input, currentUserId) {
    const code = input.code.toUpperCase().trim();
    if (!code)
        throw new Error('Code promo invalide.');
    // unicité
    const exists = await getCouponByCode(code);
    if (exists)
        throw new Error('Ce code promo existe déjà.');
    const now = admin.firestore.Timestamp.now();
    const payload = toFirestorePayload({ ...input, code });
    const docRef = await COUPONS_COL.add({
        ...payload,
        active: input.active ?? true,
        created_at: now,
        created_by: currentUserId || 'admin',
        updated_at: now,
    });
    const created = await docRef.get();
    return mapSnapToCoupon(created);
}
/** Met à jour un coupon existant (partiel) */
async function updateCoupon(couponId, input) {
    const ref = COUPONS_COL.doc(couponId);
    const exists = await ref.get();
    if (!exists.exists)
        throw new Error('Coupon introuvable');
    const now = admin.firestore.Timestamp.now();
    const payload = toFirestorePayload(input);
    await ref.set({ ...payload, updated_at: now }, { merge: true });
}
/** Active/désactive un coupon rapidement */
async function toggleCouponActive(couponId, active) {
    const ref = COUPONS_COL.doc(couponId);
    await ref.set({ active, updated_at: admin.firestore.Timestamp.now() }, { merge: true });
}
/** Supprime un coupon */
async function deleteCoupon(couponId) {
    await COUPONS_COL.doc(couponId).delete();
}
/* ===================== Utilitaires de calcul ===================== */
/** Applique un coupon à un montant et renvoie la remise + total final (aligné avec le back) */
function applyCouponToTotal(params) {
    const { total } = params;
    let discount = 0;
    if (params.coupon.type === 'fixed') {
        discount = Math.min(params.coupon.amount, total);
    }
    else {
        discount = (params.coupon.amount / 100) * total;
    }
    if (params.coupon.maxDiscount !== undefined) {
        discount = Math.min(discount, params.coupon.maxDiscount);
    }
    const finalTotal = Math.max(0, Math.round((total - discount) * 100) / 100);
    return { discount: Math.round(discount * 100) / 100, finalTotal };
}
//# sourceMappingURL=couponService.js.map