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
export function normalizeProvider(providerData: any): Provider {
  if (!providerData) {
    throw new Error('Provider data is required');
  }

  // Gestion du nom avec fallbacks multiples
  const name = providerData.name || 
               providerData.fullName || 
               providerData.providerName ||
               providerData.displayName ||
               `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 
               (providerData.id ? `Expert ${providerData.id.slice(-4)}` : 'Expert');

  const fullName = providerData.fullName || 
                  providerData.name || 
                  name;

  // Gestion du type/rôle avec fallbacks (OBLIGATOIRE dans interface originale)
  const type = (providerData.type || 
                providerData.role || 
                providerData.providerType || 
                'expat') as 'lawyer' | 'expat';

  // Gestion du pays avec fallbacks (OBLIGATOIRE dans interface originale)
  const country = providerData.country || 
                 providerData.currentCountry || 
                 providerData.currentPresenceCountry ||
                 providerData.providerCountry || 
                 'France';

  // Gestion des langues avec fallbacks (OBLIGATOIRE dans interface originale)
  const languages = Array.isArray(providerData.languages) 
                   ? providerData.languages 
                   : Array.isArray(providerData.languagesSpoken)
                     ? providerData.languagesSpoken
                     : Array.isArray(providerData.providerLanguages)
                       ? providerData.providerLanguages
                       : ['fr'];

  // Gestion des spécialités avec fallbacks (OBLIGATOIRE dans interface originale)
  const specialties = Array.isArray(providerData.specialties)
                     ? providerData.specialties
                     : Array.isArray(providerData.providerSpecialties)
                       ? providerData.providerSpecialties
                       : [];

  // Prix par défaut selon le type (OBLIGATOIRE dans interface originale)
  const price = (typeof providerData.price === 'number' && providerData.price > 0) 
                ? providerData.price 
                : (type === 'lawyer' ? 49 : 19);

  // Durée par défaut selon le type (extension pour autres composants)
  const duration = (typeof providerData.duration === 'number' && providerData.duration > 0)
                   ? providerData.duration
                   : (type === 'lawyer' ? 20 : 30);

  // Rating avec validation (OBLIGATOIRE dans interface originale)
  const rating = (typeof providerData.rating === 'number' && providerData.rating >= 0 && providerData.rating <= 5)
                 ? providerData.rating
                 : (providerData.providerRating || 4.5);

  // Review count avec validation (OBLIGATOIRE dans interface originale)
  const reviewCount = (typeof providerData.reviewCount === 'number' && providerData.reviewCount >= 0)
                      ? providerData.reviewCount
                      : (providerData.providerReviewCount || 0);

  // Years of experience avec validation (OBLIGATOIRE dans interface originale)
  const yearsOfExperience = (typeof providerData.yearsOfExperience === 'number' && providerData.yearsOfExperience >= 0)
                           ? providerData.yearsOfExperience
                           : (typeof providerData.yearsAsExpat === 'number' && providerData.yearsAsExpat >= 0)
                             ? providerData.yearsAsExpat
                             : 1;

  // Avatar avec fallback (OBLIGATOIRE dans interface originale)
  const avatar = providerData.avatar || 
                 providerData.profilePhoto || 
                 providerData.providerAvatar || 
                 '/default-avatar.png';

  // Description avec fallback (OBLIGATOIRE dans interface originale)
  const description = providerData.description || providerData.bio || '';

  return {
    // Champs obligatoires de l'interface originale Providers.tsx
    id: providerData.id || providerData.providerId || Math.random().toString(36),
    name: name,
    type: type,
    country: country,
    languages: languages,
    specialties: specialties,
    rating: rating,
    reviewCount: reviewCount,
    yearsOfExperience: yearsOfExperience,
    isOnline: providerData.isOnline === true,
    avatar: avatar,
    description: description,
    price: price,
    isVisible: providerData.isVisible !== false,
    isApproved: providerData.isApproved !== false,
    isBanned: providerData.isBanned === true,
    
    // Champs étendus pour compatibilité avec autres composants
    fullName: fullName,
    firstName: providerData.firstName || '',
    lastName: providerData.lastName || '',
    role: type, // Alias de type
    currentCountry: providerData.currentCountry || country,
    currentPresenceCountry: providerData.currentPresenceCountry || country,
    profilePhoto: avatar,
    email: providerData.email || '',
    phone: providerData.phone || 
           providerData.phoneNumber || 
           providerData.providerPhone || 
           '',
    phoneNumber: providerData.phoneNumber || 
                providerData.phone || 
                providerData.providerPhone || 
                '',
    whatsapp: providerData.whatsapp || 
             providerData.whatsAppNumber || 
             '',
    whatsAppNumber: providerData.whatsAppNumber || 
                   providerData.whatsapp || 
                   '',
    languagesSpoken: languages, // Alias de languages
    preferredLanguage: providerData.preferredLanguage || 'fr',
    duration: duration,
    bio: providerData.bio || description,
    yearsAsExpat: providerData.yearsAsExpat || yearsOfExperience,
    graduationYear: providerData.graduationYear || '',
    expatriationYear: providerData.expatriationYear || '',
    isActive: providerData.isActive !== false
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