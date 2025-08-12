// src/utils/countryCoordinates.ts
// Utilitaires robustes pour coordonnées pays (FR/EN) + validation + jitter léger

export type LatLng = { lat: number; lng: number };

const canonical: Record<string, LatLng> = {
  // === Europe
  "france": { lat: 46.2276, lng: 2.2137 },
  "austria": { lat: 47.5162, lng: 14.5501 },        // Autriche
  "germany": { lat: 51.1657, lng: 10.4515 },
  "italy": { lat: 41.8719, lng: 12.5674 },
  "spain": { lat: 40.4637, lng: -3.7492 },
  "united kingdom": { lat: 55.3781, lng: -3.4360 },
  "netherlands": { lat: 52.1326, lng: 5.2913 },
  "belgium": { lat: 50.5039, lng: 4.4699 },
  "switzerland": { lat: 46.8182, lng: 8.2275 },
  "sweden": { lat: 60.1282, lng: 18.6435 },
  "norway": { lat: 60.4720, lng: 8.4689 },
  "denmark": { lat: 56.2639, lng: 9.5018 },

  // === Amériques
  "united states": { lat: 37.0902, lng: -95.7129 },
  "canada": { lat: 56.1304, lng: -106.3468 },
  "brazil": { lat: -14.2350, lng: -51.9253 },

  // === Moyen-Orient / Afrique
  "saudi arabia": { lat: 23.8859, lng: 45.0792 },   // Arabie Saoudite ✅ (corrigé)
  "morocco": { lat: 31.7917, lng: -7.0926 },
  "algeria": { lat: 28.0339, lng: 1.6596 },
  "tunisia": { lat: 33.8869, lng: 9.5375 },
  "egypt": { lat: 26.8206, lng: 30.8025 },
  "uae": { lat: 23.4241, lng: 53.8478 },
  "united arab emirates": { lat: 23.4241, lng: 53.8478 },

  // === Asie / Océanie
  "india": { lat: 20.5937, lng: 78.9629 },
  "japan": { lat: 36.2048, lng: 138.2529 },
  "china": { lat: 35.8617, lng: 104.1954 },
  "australia": { lat: -25.2744, lng: 133.7751 },
};

// alias FR/variantes -> clé canonique
const aliases: Record<string, string> = {
  "autriche": "austria",
  "allemagne": "germany",
  "italie": "italy",
  "espagne": "spain",
  "royaume uni": "united kingdom",
  "royaume-uni": "united kingdom",
  "pays bas": "netherlands",
  "pays-bas": "netherlands",
  "belgique": "belgium",
  "suisse": "switzerland",
  "suede": "sweden",
  "suède": "sweden",
  "norvege": "norway",
  "norvège": "norway",
  "danemark": "denmark",

  "etats unis": "united states",
  "etats-unis": "united states",
  "états unis": "united states",
  "états-unis": "united states",
  "usa": "united states",
  "etatsunis": "united states",

  "bresil": "brazil",
  "brésil": "brazil",

  "maroc": "morocco",
  "algerie": "algeria",
  "algérie": "algeria",
  "tunisie": "tunisia",
  "egypte": "egypt",
  "emirats arabes unis": "united arab emirates",
  "emirats": "united arab emirates",
  "émi rats": "united arab emirates",
  "arabie saoudite": "saudi arabia",

  "inde": "india",
  "japon": "japan",
  "chine": "china",
  "australie": "australia",
};

export const normalizeCountryName = (name?: string): string => {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’`´]/g, "")
    .replace(/\s+/g, " ");
};

export const getCountryCoordinates = (rawName?: string): LatLng | null => {
  const key = normalizeCountryName(rawName);
  if (!key) return null;

  // correspondance alias → canonique
  const canonKey = aliases[key] || key;
  const coord = canonical[canonKey];
  return coord ? { ...coord } : null;
};

export const validateCoordinates = (c?: LatLng | null): c is LatLng => {
  if (!c || typeof c.lat !== "number" || typeof c.lng !== "number") return false;
  return c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180;
};

// petite dispersion (jitter) stable par id pour éviter les marqueurs exactement superposés
export const generateCountryPosition = (base: LatLng, seed: string, meters = 8000): LatLng => {
  // ~0.01° ≈ 1.1km à l’équateur
  const maxDeg = Math.min(0.2, Math.max(0.005, meters / 111_000)); // borne 0.005–0.2°
  // hash simple
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rndA = (h % 1000) / 1000;          // 0..1
  const rndB = ((h >> 10) % 1000) / 1000;  // 0..1

  const dLat = (rndA - 0.5) * 2 * maxDeg;
  const dLng = (rndB - 0.5) * 2 * maxDeg;

  return { lat: base.lat + dLat, lng: base.lng + dLng };
};
