/**
 * Système de géolocalisation par pays pour Leaflet
 * Version optimisée pour production
 * Compatible avec Firebase/Firestore et TypeScript
 */

export interface CountryCoordinates {
  lat: number;
  lng: number;
  name: string;
  code?: string;
}

/**
 * Base de données complète des coordonnées des pays du monde
 * Structure optimisée pour éviter les doublons
 */
const COUNTRY_DATA = new Map<string, CountryCoordinates>([
  // Europe
  ['france', { lat: 46.2276, lng: 2.2137, name: 'France', code: 'FR' }],
  ['allemagne', { lat: 51.1657, lng: 10.4515, name: 'Allemagne', code: 'DE' }],
  ['germany', { lat: 51.1657, lng: 10.4515, name: 'Germany', code: 'DE' }],
  ['espagne', { lat: 40.4637, lng: -3.7492, name: 'Espagne', code: 'ES' }],
  ['spain', { lat: 40.4637, lng: -3.7492, name: 'Spain', code: 'ES' }],
  ['italie', { lat: 41.8719, lng: 12.5674, name: 'Italie', code: 'IT' }],
  ['italy', { lat: 41.8719, lng: 12.5674, name: 'Italy', code: 'IT' }],
  ['royaume-uni', { lat: 55.3781, lng: -3.4360, name: 'Royaume-Uni', code: 'GB' }],
  ['united kingdom', { lat: 55.3781, lng: -3.4360, name: 'United Kingdom', code: 'GB' }],
  ['uk', { lat: 55.3781, lng: -3.4360, name: 'UK', code: 'GB' }],
  ['pays-bas', { lat: 52.1326, lng: 5.2913, name: 'Pays-Bas', code: 'NL' }],
  ['netherlands', { lat: 52.1326, lng: 5.2913, name: 'Netherlands', code: 'NL' }],
  ['belgique', { lat: 50.8503, lng: 4.3517, name: 'Belgique', code: 'BE' }],
  ['belgium', { lat: 50.8503, lng: 4.3517, name: 'Belgium', code: 'BE' }],
  ['suisse', { lat: 46.8182, lng: 8.2275, name: 'Suisse', code: 'CH' }],
  ['switzerland', { lat: 46.8182, lng: 8.2275, name: 'Switzerland', code: 'CH' }],
  ['portugal', { lat: 39.3999, lng: -8.2245, name: 'Portugal', code: 'PT' }],
  ['autriche', { lat: 47.5162, lng: 14.5501, name: 'Autriche', code: 'AT' }],
  ['austria', { lat: 47.5162, lng: 14.5501, name: 'Austria', code: 'AT' }],
  ['norvège', { lat: 60.4720, lng: 8.4689, name: 'Norvège', code: 'NO' }],
  ['norway', { lat: 60.4720, lng: 8.4689, name: 'Norway', code: 'NO' }],
  ['suède', { lat: 60.1282, lng: 18.6435, name: 'Suède', code: 'SE' }],
  ['sweden', { lat: 60.1282, lng: 18.6435, name: 'Sweden', code: 'SE' }],
  ['finlande', { lat: 61.9241, lng: 25.7482, name: 'Finlande', code: 'FI' }],
  ['finland', { lat: 61.9241, lng: 25.7482, name: 'Finland', code: 'FI' }],
  ['danemark', { lat: 56.2639, lng: 9.5018, name: 'Danemark', code: 'DK' }],
  ['denmark', { lat: 56.2639, lng: 9.5018, name: 'Denmark', code: 'DK' }],
  ['pologne', { lat: 51.9194, lng: 19.1451, name: 'Pologne', code: 'PL' }],
  ['poland', { lat: 51.9194, lng: 19.1451, name: 'Poland', code: 'PL' }],
  ['grèce', { lat: 39.0742, lng: 21.8243, name: 'Grèce', code: 'GR' }],
  ['greece', { lat: 39.0742, lng: 21.8243, name: 'Greece', code: 'GR' }],
  ['irlande', { lat: 53.4129, lng: -8.2439, name: 'Irlande', code: 'IE' }],
  ['ireland', { lat: 53.4129, lng: -8.2439, name: 'Ireland', code: 'IE' }],

  // Amérique du Nord
  ['canada', { lat: 56.1304, lng: -106.3468, name: 'Canada', code: 'CA' }],
  ['états-unis', { lat: 37.0902, lng: -95.7129, name: 'États-Unis', code: 'US' }],
  ['united states', { lat: 37.0902, lng: -95.7129, name: 'United States', code: 'US' }],
  ['usa', { lat: 37.0902, lng: -95.7129, name: 'USA', code: 'US' }],
  ['mexique', { lat: 23.6345, lng: -102.5528, name: 'Mexique', code: 'MX' }],
  ['mexico', { lat: 23.6345, lng: -102.5528, name: 'Mexico', code: 'MX' }],

  // Amérique du Sud
  ['brésil', { lat: -14.2350, lng: -51.9253, name: 'Brésil', code: 'BR' }],
  ['brazil', { lat: -14.2350, lng: -51.9253, name: 'Brazil', code: 'BR' }],
  ['argentine', { lat: -38.4161, lng: -63.6167, name: 'Argentine', code: 'AR' }],
  ['argentina', { lat: -38.4161, lng: -63.6167, name: 'Argentina', code: 'AR' }],
  ['chili', { lat: -35.6751, lng: -71.5430, name: 'Chili', code: 'CL' }],
  ['chile', { lat: -35.6751, lng: -71.5430, name: 'Chile', code: 'CL' }],
  ['pérou', { lat: -9.1900, lng: -75.0152, name: 'Pérou', code: 'PE' }],
  ['peru', { lat: -9.1900, lng: -75.0152, name: 'Peru', code: 'PE' }],
  ['colombie', { lat: 4.5709, lng: -74.2973, name: 'Colombie', code: 'CO' }],
  ['colombia', { lat: 4.5709, lng: -74.2973, name: 'Colombia', code: 'CO' }],
  ['venezuela', { lat: 6.4238, lng: -66.5897, name: 'Venezuela', code: 'VE' }],
  ['équateur', { lat: -1.8312, lng: -78.1834, name: 'Équateur', code: 'EC' }],
  ['ecuador', { lat: -1.8312, lng: -78.1834, name: 'Ecuador', code: 'EC' }],
  ['uruguay', { lat: -32.5228, lng: -55.7658, name: 'Uruguay', code: 'UY' }],

  // Asie
  ['chine', { lat: 35.8617, lng: 104.1954, name: 'Chine', code: 'CN' }],
  ['china', { lat: 35.8617, lng: 104.1954, name: 'China', code: 'CN' }],
  ['japon', { lat: 36.2048, lng: 138.2529, name: 'Japon', code: 'JP' }],
  ['japan', { lat: 36.2048, lng: 138.2529, name: 'Japan', code: 'JP' }],
  ['inde', { lat: 20.5937, lng: 78.9629, name: 'Inde', code: 'IN' }],
  ['india', { lat: 20.5937, lng: 78.9629, name: 'India', code: 'IN' }],
  ['russie', { lat: 61.5240, lng: 105.3188, name: 'Russie', code: 'RU' }],
  ['russia', { lat: 61.5240, lng: 105.3188, name: 'Russia', code: 'RU' }],
  ['corée du sud', { lat: 35.9078, lng: 127.7669, name: 'Corée du Sud', code: 'KR' }],
  ['south korea', { lat: 35.9078, lng: 127.7669, name: 'South Korea', code: 'KR' }],
  ['thaïlande', { lat: 15.8700, lng: 100.9925, name: 'Thaïlande', code: 'TH' }],
  ['thailand', { lat: 15.8700, lng: 100.9925, name: 'Thailand', code: 'TH' }],
  ['vietnam', { lat: 14.0583, lng: 108.2772, name: 'Vietnam', code: 'VN' }],
  ['singapour', { lat: 1.3521, lng: 103.8198, name: 'Singapour', code: 'SG' }],
  ['singapore', { lat: 1.3521, lng: 103.8198, name: 'Singapore', code: 'SG' }],
  ['malaisie', { lat: 4.2105, lng: 101.9758, name: 'Malaisie', code: 'MY' }],
  ['malaysia', { lat: 4.2105, lng: 101.9758, name: 'Malaysia', code: 'MY' }],
  ['indonésie', { lat: -0.7893, lng: 113.9213, name: 'Indonésie', code: 'ID' }],
  ['indonesia', { lat: -0.7893, lng: 113.9213, name: 'Indonesia', code: 'ID' }],
  ['philippines', { lat: 12.8797, lng: 121.7740, name: 'Philippines', code: 'PH' }],

  // Moyen-Orient
  ['arabie saoudite', { lat: 23.8859, lng: 45.0792, name: 'Arabie Saoudite', code: 'SA' }],
  ['saudi arabia', { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia', code: 'SA' }],
  ['émirats arabes unis', { lat: 23.4241, lng: 53.8478, name: 'Émirats Arabes Unis', code: 'AE' }],
  ['uae', { lat: 23.4241, lng: 53.8478, name: 'UAE', code: 'AE' }],
  ['turquie', { lat: 38.9637, lng: 35.2433, name: 'Turquie', code: 'TR' }],
  ['turkey', { lat: 38.9637, lng: 35.2433, name: 'Turkey', code: 'TR' }],
  ['israël', { lat: 31.0461, lng: 34.8516, name: 'Israël', code: 'IL' }],
  ['israel', { lat: 31.0461, lng: 34.8516, name: 'Israel', code: 'IL' }],
  ['iran', { lat: 32.4279, lng: 53.6880, name: 'Iran', code: 'IR' }],

  // Afrique
  ['maroc', { lat: 31.7917, lng: -7.0926, name: 'Maroc', code: 'MA' }],
  ['morocco', { lat: 31.7917, lng: -7.0926, name: 'Morocco', code: 'MA' }],
  ['égypte', { lat: 26.0975, lng: 30.0444, name: 'Égypte', code: 'EG' }],
  ['egypt', { lat: 26.0975, lng: 30.0444, name: 'Egypt', code: 'EG' }],
  ['afrique du sud', { lat: -30.5595, lng: 22.9375, name: 'Afrique du Sud', code: 'ZA' }],
  ['south africa', { lat: -30.5595, lng: 22.9375, name: 'South Africa', code: 'ZA' }],
  ['nigeria', { lat: 9.0820, lng: 8.6753, name: 'Nigeria', code: 'NG' }],
  ['kenya', { lat: -0.0236, lng: 37.9062, name: 'Kenya', code: 'KE' }],
  ['algérie', { lat: 28.0339, lng: 1.6596, name: 'Algérie', code: 'DZ' }],
  ['algeria', { lat: 28.0339, lng: 1.6596, name: 'Algeria', code: 'DZ' }],
  ['tunisie', { lat: 33.8869, lng: 9.5375, name: 'Tunisie', code: 'TN' }],
  ['tunisia', { lat: 33.8869, lng: 9.5375, name: 'Tunisia', code: 'TN' }],
  ['sénégal', { lat: 14.4974, lng: -14.4524, name: 'Sénégal', code: 'SN' }],
  ['senegal', { lat: 14.4974, lng: -14.4524, name: 'Senegal', code: 'SN' }],

  // Océanie
  ['australie', { lat: -25.2744, lng: 133.7751, name: 'Australie', code: 'AU' }],
  ['australia', { lat: -25.2744, lng: 133.7751, name: 'Australia', code: 'AU' }],
  ['nouvelle-zélande', { lat: -40.9006, lng: 174.8860, name: 'Nouvelle-Zélande', code: 'NZ' }],
  ['new zealand', { lat: -40.9006, lng: 174.8860, name: 'New Zealand', code: 'NZ' }]
]);

interface CacheStats {
  size: number;
  validEntries: number;
  hitRate: number;
}

/**
 * Cache optimisé avec LRU et TTL
 */
class OptimizedCache {
  private cache: Map<string, CountryCoordinates | null>;
  private timestamps: Map<string, number>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 1800000) { // 30 minutes
    this.cache = new Map();
    this.timestamps = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): CountryCoordinates | null {
    if (!this.cache.has(key)) return null;
    
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    // LRU: déplacer vers la fin
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value || null);
    
    return value || null;
  }

  set(key: string, value: CountryCoordinates | null): void {
    // Supprimer l'ancienne entrée si elle existe
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Nettoyer le cache si trop plein
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.delete(firstKey);
      }
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  getStats(): CacheStats {
    const now = Date.now();
    let validEntries = 0;
    
    for (const timestamp of this.timestamps.values()) {
      if (now - timestamp <= this.ttl) validEntries++;
    }
    
    return {
      size: this.cache.size,
      validEntries,
      hitRate: this.cache.size > 0 ? validEntries / this.cache.size : 0
    };
  }
}

// Instance globale du cache
const cache = new OptimizedCache();

/**
 * Normalise et valide le nom d'un pays
 */
function normalizeCountryName(countryName: string): string {
  if (typeof countryName !== 'string' || !countryName.trim()) return '';
  
  return countryName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calcule la similarité entre deux chaînes optimisée
 */
function calculateSimilarity(search: string, target: string): number {
  const normalizedSearch = normalizeCountryName(search);
  const normalizedTarget = normalizeCountryName(target);
  
  if (!normalizedSearch || !normalizedTarget) return 0;
  if (normalizedSearch === normalizedTarget) return 1;
  if (normalizedTarget.startsWith(normalizedSearch)) return 0.9;
  if (normalizedTarget.includes(normalizedSearch)) return 0.8;
  
  // Correspondance par mots
  const searchWords = normalizedSearch.split(' ');
  const targetWords = normalizedTarget.split(' ');
  
  let matchScore = 0;
  const maxWords = Math.max(searchWords.length, targetWords.length);
  
  for (const searchWord of searchWords) {
    for (const targetWord of targetWords) {
      if (searchWord === targetWord) {
        matchScore += 1;
        break;
      } else if (searchWord.length >= 3 && targetWord.includes(searchWord)) {
        matchScore += 0.7;
        break;
      }
    }
  }
  
  return maxWords > 0 ? matchScore / maxWords : 0;
}

/**
 * Valide les coordonnées géographiques
 */
export function validateCoordinates(coords: any): coords is CountryCoordinates {
  if (!coords || typeof coords !== 'object') return false;
  
  const { lat, lng } = coords;
  return typeof lat === 'number' && typeof lng === 'number' &&
         lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
         !isNaN(lat) && !isNaN(lng);
}

/**
 * Génère un nombre pseudo-aléatoire déterministe
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  
  // LCG algorithm
  const a = 1664525;
  const c = 1013904223;
  const m = 0x100000000;
  
  return ((a * Math.abs(hash) + c) % m) / m;
}

/**
 * Convertit un nom de pays en coordonnées géographiques
 */
export function getCountryCoordinates(countryName: string): CountryCoordinates | null {
  if (!countryName || typeof countryName !== 'string' || !countryName.trim()) {
    return null;
  }

  const normalizedName = normalizeCountryName(countryName);
  const cacheKey = normalizedName;

  // Vérifier le cache
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached;

  try {
    // Recherche exacte
    const exactMatch = COUNTRY_DATA.get(normalizedName);
    if (exactMatch) {
      cache.set(cacheKey, exactMatch);
      return exactMatch;
    }

    // Recherche fuzzy optimisée
    let bestMatch: CountryCoordinates | null = null;
    let bestScore = 0.6; // Seuil minimum

    for (const [key, coords] of COUNTRY_DATA) {
      const similarity = calculateSimilarity(normalizedName, key);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = coords;
      }
    }

    cache.set(cacheKey, bestMatch);
    return bestMatch;

  } catch {
    return null;
  }
}

/**
 * Génère une position cohérente dans un pays
 */
export function generateCountryPosition(coords: CountryCoordinates, providerId: string, variationKm: number = 150): CountryCoordinates {
  if (!coords || !validateCoordinates(coords) || !providerId) {
    return coords;
  }

  try {
    const rand1 = seededRandom(providerId + '_lat');
    const rand2 = seededRandom(providerId + '_lng');
    
    const variationDegrees = Math.min(variationKm / 111, 2);
    
    // Distribution gaussienne simplifiée
    const u1 = Math.max(0.001, rand1);
    const u2 = rand2;
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    
    const latVariation = (z0 * variationDegrees) / 3;
    const lngVariation = (z1 * variationDegrees) / 3;
    
    return {
      ...coords,
      lat: Math.max(-90, Math.min(90, coords.lat + latVariation)),
      lng: Math.max(-180, Math.min(180, coords.lng + lngVariation))
    };

  } catch {
    return coords;
  }
}

/**
 * Génère des positions éparpillées pour plusieurs prestataires
 */
export function generateScatteredPositions(coords: CountryCoordinates, providerIds: string[], variationKm: number = 200): Map<string, CountryCoordinates> {
  const positions = new Map<string, CountryCoordinates>();
  
  if (!coords || !validateCoordinates(coords) || !Array.isArray(providerIds)) {
    return positions;
  }

  try {
    const variationDegrees = Math.min(variationKm / 111, 3);
    const numProviders = providerIds.length;
    const angleStep = (2 * Math.PI) / Math.max(numProviders, 8);

    providerIds.forEach((providerId, index) => {
      if (!providerId) {
        positions.set(providerId || `unknown_${index}`, coords);
        return;
      }

      const seedVariation = seededRandom(providerId + '_angle');
      const baseAngle = index * angleStep;
      const finalAngle = baseAngle + (seedVariation - 0.5) * angleStep;
      
      const spiralFactor = Math.sqrt(index / Math.max(numProviders - 1, 1));
      const distance = spiralFactor * variationDegrees;
      
      const latVariation = Math.sin(finalAngle) * distance;
      const lngVariation = Math.cos(finalAngle) * distance;
      
      positions.set(providerId, {
        ...coords,
        lat: Math.max(-90, Math.min(90, coords.lat + latVariation)),
        lng: Math.max(-180, Math.min(180, coords.lng + lngVariation))
      });
    });

    return positions;

  } catch {
    return positions;
  }
}

interface SearchResult {
  coords: CountryCoordinates;
  score: number;
}

/**
 * Recherche des pays par nom partiel
 */
export function searchCountries(searchTerm: string, limit: number = 10): CountryCoordinates[] {
  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    
    for (const [key, coords] of COUNTRY_DATA) {
      const similarity = calculateSimilarity(searchTerm, key);
      if (similarity >= 0.3) {
        const countryKey = coords.code || coords.name;
        if (!seen.has(countryKey)) {
          seen.add(countryKey);
          results.push({ coords, score: similarity });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(limit, 50))
      .map(result => result.coords);

  } catch {
    return [];
  }
}

/**
 * Calcule le centre géographique d'un ensemble de coordonnées
 */
export function calculateCenter(coordinatesList: CountryCoordinates[]): CountryCoordinates | null {
  if (!Array.isArray(coordinatesList) || coordinatesList.length === 0) {
    return null;
  }

  const validCoords = coordinatesList.filter(validateCoordinates);
  if (validCoords.length === 0) return null;

  const totalLat = validCoords.reduce((sum, coord) => sum + coord.lat, 0);
  const totalLng = validCoords.reduce((sum, coord) => sum + coord.lng, 0);

  return {
    lat: totalLat / validCoords.length,
    lng: totalLng / validCoords.length,
    name: 'Center',
    code: 'CENTER'
  };
}

/**
 * Obtient toutes les coordonnées disponibles avec déduplication
 */
export function getAllCountryCoordinates(offset: number = 0, limit: number = 100): CountryCoordinates[] {
  try {
    const uniqueCountries = new Map<string, CountryCoordinates>();
    
    for (const coords of COUNTRY_DATA.values()) {
      if (coords.code && !uniqueCountries.has(coords.code)) {
        uniqueCountries.set(coords.code, coords);
      }
    }
    
    const countries = Array.from(uniqueCountries.values());
    const start = Math.max(0, offset);
    const end = Math.min(countries.length, start + Math.max(1, limit));
    
    return countries.slice(start, end);
    
  } catch {
    return [];
  }
}

/**
 * Ajoute une variation aléatoire simple
 */
export function addRandomVariation(coords: CountryCoordinates, variationKm: number = 100): CountryCoordinates {
  if (!validateCoordinates(coords)) return coords;
  
  const variationDegrees = Math.min(variationKm / 111, 2);
  
  return {
    ...coords,
    lat: Math.max(-90, Math.min(90, coords.lat + (Math.random() - 0.5) * variationDegrees)),
    lng: Math.max(-180, Math.min(180, coords.lng + (Math.random() - 0.5) * variationDegrees))
  };
}

/**
 * Nettoie le cache
 */
export function clearCoordinatesCache(): void {
  cache.clear();
}

/**
 * Obtient les statistiques du cache
 */
export function getCacheStats(): CacheStats {
  return cache.getStats();
}

// Export par défaut
export default {
  getCountryCoordinates,
  generateCountryPosition,
  generateScatteredPositions,
  validateCoordinates,
  searchCountries,
  calculateCenter,
  getAllCountryCoordinates,
  clearCoordinatesCache,
  getCacheStats,
  addRandomVariation
};