// Interface Provider unifiée pour assurer la cohérence entre tous les composants
// Basée sur l'interface originale de Providers.tsx + extensions pour tous les autres fichiers
export interface Provider {
  // Champs obligatoires de base (présents dans Providers.tsx original)
  id: string;
  name: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  isOnline: boolean;
  avatar: string;
  description: string;
  price: number;
  isVisible: boolean;
  isApproved: boolean;
  isBanned: boolean;
  
  // Champs étendus pour compatibilité avec les autres composants
  fullName?: string;
  firstName?: string;
  lastName?: string;
  role: 'lawyer' | 'expat'; // Alias de type pour compatibilité
  currentCountry?: string;
  currentPresenceCountry?: string;
  profilePhoto?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  whatsapp?: string;
  whatsAppNumber?: string;
  languagesSpoken?: string[]; // Alias de languages pour compatibilité
  preferredLanguage?: string;
  duration: number; // Obligatoire avec fallback
  bio?: string;
  yearsAsExpat?: number;
  graduationYear?: string;
  expatriationYear?: string;
  isActive: boolean; // Obligatoire avec fallback
}

/**
 * Normalise les données d'un provider pour assurer la cohérence
 * Respecte l'interface originale de Providers.tsx + extensions
 */
export function normalizeProvider(providerData: unknown): Provider {
  if (typeof providerData !== 'object' || providerData === null) {
    throw new Error('Provider data is required');
  }
  const o = providerData as Record<string, unknown>;

  // helpers
  const toStr = (v: unknown, fb = ''): string =>
    typeof v === 'string' ? v : fb;

  const toNum = (v: unknown, fb = 0): number => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : fb;
    }
    return fb;
  };

  const toBool = (v: unknown, fb = false): boolean =>
    typeof v === 'boolean' ? v : fb;

  const toStrArray = (v: unknown, fb: string[] = []): string[] => {
    if (!Array.isArray(v)) return fb;
    const arr = v.filter((x) => typeof x === 'string') as string[];
    return arr.length ? arr : fb;
  };

  // id
  const id =
    toStr(o.id) ||
    toStr(o.providerId) ||
    Math.random().toString(36);

  // type / role
  const rawType = (o.type ?? o.role ?? o.providerType);
  const type: 'lawyer' | 'expat' =
    rawType === 'lawyer' || rawType === 'expat' ? rawType : 'expat';

  // name / fullName
  const nameCandidate =
    toStr(o.name) ||
    toStr(o.fullName) ||
    toStr(o.providerName) ||
    toStr(o.displayName) ||
    `${toStr(o.firstName)} ${toStr(o.lastName)}`.trim();
  const name = nameCandidate || (id ? `Expert ${id.slice(-4)}` : 'Expert');
  const fullName = toStr(o.fullName) || toStr(o.name) || name;

  // country
  const country =
    toStr(o.country) ||
    toStr(o.currentCountry) ||
    toStr(o.currentPresenceCountry) ||
    toStr(o.providerCountry) ||
    'France';

  // languages
  const languages =
    toStrArray(o.languages) ||
    toStrArray(o.languagesSpoken) ||
    toStrArray(o.providerLanguages, ['fr']);

  // specialties
  const specialties =
    toStrArray(o.specialties) ||
    toStrArray(o.providerSpecialties, []);

  // price / duration
  const price =
    toNum(o.price, type === 'lawyer' ? 49 : 19);
  const duration =
    toNum(o.duration, type === 'lawyer' ? 20 : 30);

  // rating / reviews
  const rating = (() => {
    const r = toNum(o.rating, toNum(o.providerRating, 4.5));
    return Math.min(Math.max(r, 0), 5);
  })();
  const reviewCount = Math.max(0, toNum(o.reviewCount, toNum(o.providerReviewCount, 0)));

  // years of experience
  const yearsOfExperience = Math.max(
    0,
    toNum(o.yearsOfExperience, toNum(o.yearsAsExpat, 1))
  );

  // media / description
  const avatar = toStr(o.avatar) || toStr(o.profilePhoto) || toStr(o.providerAvatar) || '/default-avatar.png';
  const description = toStr(o.description) || toStr(o.bio) || '';

  // contact
  const phone = toStr(o.phone) || toStr(o.phoneNumber) || toStr(o.providerPhone);
  const phoneNumber = toStr(o.phoneNumber) || toStr(o.phone) || toStr(o.providerPhone);
  const whatsapp = toStr(o.whatsapp) || toStr(o.whatsAppNumber);
  const whatsAppNumber = toStr(o.whatsAppNumber) || toStr(o.whatsapp);
  const email = toStr(o.email);

  // flags
  const isOnline = toBool(o.isOnline, false);
  const isVisible = o.isVisible === false ? false : true;
  const isApproved = o.isApproved === false ? false : true;
  const isBanned = o.isBanned === true;

  // autres
  const preferredLanguage = toStr(o.preferredLanguage, 'fr');
  const yearsAsExpat = toNum(o.yearsAsExpat, yearsOfExperience);
  const graduationYear = toStr(o.graduationYear);
  const expatriationYear = toStr(o.expatriationYear);
  const currentCountry = toStr(o.currentCountry, country);
  const currentPresenceCountry = toStr(o.currentPresenceCountry, country);
  const firstName = toStr(o.firstName);
  const lastName = toStr(o.lastName);
  const profilePhoto = avatar;
  const isActive = o.isActive === false ? false : true;

  return {
    // Champs obligatoires de l'interface originale Providers.tsx
    id,
    name,
    type,
    country,
    languages,
    specialties,
    rating,
    reviewCount,
    yearsOfExperience,
    isOnline,
    avatar,
    description,
    price,
    isVisible,
    isApproved,
    isBanned,
    
    // Champs étendus pour compatibilité avec autres composants
    fullName,
    firstName,
    lastName,
    role: type,
    currentCountry,
    currentPresenceCountry,
    profilePhoto,
    email,
    phone,
    phoneNumber,
    whatsapp,
    whatsAppNumber,
    languagesSpoken: languages,
    preferredLanguage,
    duration,
    bio: description,
    yearsAsExpat,
    graduationYear,
    expatriationYear,
    isActive
  };
}

/**
 * Valide qu'un provider a les données minimales requises
 */
export function validateProvider(provider: Provider | null): provider is Provider {
  if (!provider) return false;
  
  return Boolean(
    provider.id?.trim() &&
    provider.name?.trim() &&
    provider.role &&
    !provider.isBanned &&
    provider.isVisible &&
    provider.isApproved
  );
}

/**
 * Crée un provider par défaut avec un ID donné
 * Respecte l'interface originale de Providers.tsx
 */
export function createDefaultProvider(providerId: string): Provider {
  return {
    // Champs obligatoires de l'interface originale
    id: providerId,
    name: 'Expert Consultant',
    type: 'expat',
    country: 'France',
    languages: ['fr'],
    specialties: [],
    rating: 4.5,
    reviewCount: 0,
    yearsOfExperience: 1,
    isOnline: false,
    avatar: '/default-avatar.png',
    description: '',
    price: 19,
    isVisible: true,
    isApproved: true,
    isBanned: false,
    
    // Champs étendus
    fullName: 'Expert Consultant',
    firstName: '',
    lastName: '',
    role: 'expat',
    currentCountry: 'France',
    currentPresenceCountry: 'France',
    profilePhoto: '/default-avatar.png',
    email: '',
    phone: '',
    phoneNumber: '',
    whatsapp: '',
    whatsAppNumber: '',
    languagesSpoken: ['fr'],
    preferredLanguage: 'fr',
    duration: 30,
    bio: '',
    yearsAsExpat: 1,
    graduationYear: '',
    expatriationYear: '',
    isActive: true
  };
}
