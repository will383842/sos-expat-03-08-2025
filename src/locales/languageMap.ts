/**
 * Mapping des noms de langues en français vers leurs codes ISO 639-1
 * Optimisé pour la production avec support SEO et accessibility
 * @version 1.0.0
 * @author Generated for production use
 */

// Type pour une meilleure sécurité de type
export interface LanguageEntry {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean; // Right-to-left languages
}

// Mapping principal avec codes ISO 639-1 standards
export const LANGUAGE_MAP: Readonly<Record<string, string>> = Object.freeze({
  // Langues européennes principales
  français: 'fr',
  anglais: 'en',
  espagnol: 'es',
  portugais: 'pt',
  allemand: 'de',
  italien: 'it',
  néerlandais: 'nl',
  
  // Langues slaves
  russe: 'ru',
  polonais: 'pl',
  tchèque: 'cs',
  ukrainien: 'uk',
  bulgare: 'bg',
  croate: 'hr',
  serbe: 'sr',
  slovaque: 'sk',
  slovène: 'sl',
  
  // Langues nordiques
  suédois: 'sv',
  norvégien: 'no',
  danois: 'da',
  finnois: 'fi',
  islandais: 'is',
  
  // Langues baltiques et autres européennes
  letton: 'lv',
  lituanien: 'lt',
  estonien: 'et',
  hongrois: 'hu',
  roumain: 'ro',
  grec: 'el',
  irlandais: 'ga',
  gallois: 'cy',
  
  // Langues asiatiques principales
  chinois: 'zh',
  japonais: 'ja',
  coréen: 'ko',
  hindi: 'hi',
  arabe: 'ar',
  
  // Langues du sous-continent indien
  bengali: 'bn',
  ourdou: 'ur',
  pendjabi: 'pa',
  malayalam: 'ml',
  tamoul: 'ta',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  télougou: 'te',
  
  // Langues d'Asie du Sud-Est
  vietnamien: 'vi',
  thaï: 'th',
  indonésien: 'id',
  malais: 'ms',
  
  // Langues du Moyen-Orient
  persan: 'fa',
  turc: 'tr',
  hébreu: 'he',
  azéri: 'az',
  
  // Langues africaines
  swahili: 'sw',
  amharique: 'am',
  somali: 'so'
} as const);

// Mapping inverse pour retrouver le nom français depuis le code
export const CODE_TO_LANGUAGE: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(LANGUAGE_MAP).map(([name, code]) => [code, name])
  )
);

// Métadonnées enrichies pour chaque langue (SEO et UX)
export const LANGUAGE_METADATA: Readonly<Record<string, LanguageEntry>> = Object.freeze({
  fr: { code: 'fr', name: 'français', nativeName: 'Français' },
  en: { code: 'en', name: 'anglais', nativeName: 'English' },
  es: { code: 'es', name: 'espagnol', nativeName: 'Español' },
  pt: { code: 'pt', name: 'portugais', nativeName: 'Português' },
  ar: { code: 'ar', name: 'arabe', nativeName: 'العربية', rtl: true },
  zh: { code: 'zh', name: 'chinois', nativeName: '中文' },
  hi: { code: 'hi', name: 'hindi', nativeName: 'हिन्दी' },
  ru: { code: 'ru', name: 'russe', nativeName: 'Русский' },
  ja: { code: 'ja', name: 'japonais', nativeName: '日本語' },
  de: { code: 'de', name: 'allemand', nativeName: 'Deutsch' },
  ko: { code: 'ko', name: 'coréen', nativeName: '한국어' },
  vi: { code: 'vi', name: 'vietnamien', nativeName: 'Tiếng Việt' },
  tr: { code: 'tr', name: 'turc', nativeName: 'Türkçe' },
  it: { code: 'it', name: 'italien', nativeName: 'Italiano' },
  pl: { code: 'pl', name: 'polonais', nativeName: 'Polski' },
  nl: { code: 'nl', name: 'néerlandais', nativeName: 'Nederlands' },
  ro: { code: 'ro', name: 'roumain', nativeName: 'Română' },
  el: { code: 'el', name: 'grec', nativeName: 'Ελληνικά' },
  sv: { code: 'sv', name: 'suédois', nativeName: 'Svenska' },
  fi: { code: 'fi', name: 'finnois', nativeName: 'Suomi' },
  no: { code: 'no', name: 'norvégien', nativeName: 'Norsk' },
  da: { code: 'da', name: 'danois', nativeName: 'Dansk' },
  cs: { code: 'cs', name: 'tchèque', nativeName: 'Čeština' },
  hu: { code: 'hu', name: 'hongrois', nativeName: 'Magyar' },
  he: { code: 'he', name: 'hébreu', nativeName: 'עברית', rtl: true },
  uk: { code: 'uk', name: 'ukrainien', nativeName: 'Українська' },
  bg: { code: 'bg', name: 'bulgare', nativeName: 'Български' },
  hr: { code: 'hr', name: 'croate', nativeName: 'Hrvatski' },
  sr: { code: 'sr', name: 'serbe', nativeName: 'Српски' },
  sk: { code: 'sk', name: 'slovaque', nativeName: 'Slovenčina' },
  sl: { code: 'sl', name: 'slovène', nativeName: 'Slovenščina' },
  lv: { code: 'lv', name: 'letton', nativeName: 'Latviešu' },
  lt: { code: 'lt', name: 'lituanien', nativeName: 'Lietuvių' },
  et: { code: 'et', name: 'estonien', nativeName: 'Eesti' },
  ga: { code: 'ga', name: 'irlandais', nativeName: 'Gaeilge' },
  cy: { code: 'cy', name: 'gallois', nativeName: 'Cymraeg' },
  is: { code: 'is', name: 'islandais', nativeName: 'Íslenska' },
  ms: { code: 'ms', name: 'malais', nativeName: 'Bahasa Melayu' },
  th: { code: 'th', name: 'thaï', nativeName: 'ไทย' },
  id: { code: 'id', name: 'indonésien', nativeName: 'Bahasa Indonesia' },
  fa: { code: 'fa', name: 'persan', nativeName: 'فارسی', rtl: true },
  ur: { code: 'ur', name: 'ourdou', nativeName: 'اردو', rtl: true },
  bn: { code: 'bn', name: 'bengali', nativeName: 'বাংলা' },
  pa: { code: 'pa', name: 'pendjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ml: { code: 'ml', name: 'malayalam', nativeName: 'മലയാളം' },
  ta: { code: 'ta', name: 'tamoul', nativeName: 'தமிழ்' },
  mr: { code: 'mr', name: 'marathi', nativeName: 'मराठी' },
  gu: { code: 'gu', name: 'gujarati', nativeName: 'ગુજરાતી' },
  kn: { code: 'kn', name: 'kannada', nativeName: 'ಕನ್ನಡ' },
  te: { code: 'te', name: 'télougou', nativeName: 'తెలుగు' },
  so: { code: 'so', name: 'somali', nativeName: 'Soomaali' },
  sw: { code: 'sw', name: 'swahili', nativeName: 'Kiswahili' },
  am: { code: 'am', name: 'amharique', nativeName: 'አማርኛ' },
  az: { code: 'az', name: 'azéri', nativeName: 'Azərbaycan' }
});

// Langues RTL pour le support CSS directionnel
export const RTL_LANGUAGES: Readonly<Set<string>> = Object.freeze(
  new Set(['ar', 'he', 'fa', 'ur'])
);

// Langues les plus populaires (pour les suggestions prioritaires - UX)
export const POPULAR_LANGUAGES: Readonly<string[]> = Object.freeze([
  'fr', 'en', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ar', 'hi'
]);

// Utilitaires pour la production
export const LanguageUtils = {
  /**
   * Obtient le code de langue depuis le nom français
   * @param languageName - Nom de la langue en français
   * @returns Code ISO 639-1 ou null si non trouvé
   */
  getLanguageCode: (languageName: string): string | null => {
    const normalizedName = languageName.toLowerCase().trim();
    return LANGUAGE_MAP[normalizedName] || null;
  },

  /**
   * Obtient le nom français depuis le code de langue
   * @param languageCode - Code ISO 639-1
   * @returns Nom de la langue en français ou null si non trouvé
   */
  getLanguageName: (languageCode: string): string | null => {
    return CODE_TO_LANGUAGE[languageCode.toLowerCase()] || null;
  },

  /**
   * Vérifie si une langue utilise l'écriture RTL
   * @param languageCode - Code ISO 639-1
   * @returns true si la langue est RTL
   */
  isRTL: (languageCode: string): boolean => {
    return RTL_LANGUAGES.has(languageCode.toLowerCase());
  },

  /**
   * Obtient les métadonnées complètes d'une langue
   * @param languageCode - Code ISO 639-1
   * @returns Métadonnées de la langue ou null si non trouvé
   */
  getLanguageMetadata: (languageCode: string): LanguageEntry | null => {
    return LANGUAGE_METADATA[languageCode.toLowerCase()] || null;
  },

  /**
   * Obtient toutes les langues disponibles triées par popularité
   * @returns Array des codes de langue triés
   */
  getAllLanguagesSorted: (): string[] => {
    const popular = new Set(POPULAR_LANGUAGES);
    const others = Object.keys(LANGUAGE_METADATA)
      .filter(code => !popular.has(code))
      .sort();
    
    return [...POPULAR_LANGUAGES, ...others];
  },

  /**
   * Recherche de langues avec support de la recherche partielle
   * @param query - Terme de recherche
   * @returns Array des langues matchant la recherche
   */
  searchLanguages: (query: string): LanguageEntry[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    return Object.values(LANGUAGE_METADATA).filter(lang => 
      lang.name.toLowerCase().includes(normalizedQuery) ||
      lang.nativeName.toLowerCase().includes(normalizedQuery) ||
      lang.code.toLowerCase().includes(normalizedQuery)
    );
  }
} as const;

// Export par défaut pour la compatibilité
export default LANGUAGE_MAP;