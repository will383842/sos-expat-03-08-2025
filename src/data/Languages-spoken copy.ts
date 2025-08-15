// ========================================
// src/data/Languages-spoken.ts - VERSION MULTILINGUE INTELLIGENTE
// ========================================

// IMPORTANT: Définir et exporter l'interface AVANT le tableau
export interface Language {
  code: string;
  name: string;
  nameEn?: string; // Nom en anglais
  nameFr?: string; // Nom en français
}

// 🌍 Fonction pour détecter la langue du navigateur
const getBrowserLanguage = (): 'fr' | 'en' => {
  const browserLang = navigator.language.toLowerCase();
  
  // Si le navigateur est en français (fr, fr-FR, fr-CA, etc.)
  if (browserLang.startsWith('fr')) {
    return 'fr';
  }
  
  // Sinon, par défaut en anglais
  return 'en';
};

// 🌍 Tableau des langues avec noms français ET anglais
const languagesData: Array<{ code: string; nameFr: string; nameEn: string }> = [
  { code: "en", nameFr: "Anglais", nameEn: "English" },
  { code: "fr", nameFr: "Français", nameEn: "French" },
  { code: "de", nameFr: "Allemand", nameEn: "German" },
  { code: "es", nameFr: "Espagnol", nameEn: "Spanish" },
  { code: "pt", nameFr: "Portugais", nameEn: "Portuguese" },
  { code: "zh", nameFr: "Chinois (Mandarin)", nameEn: "Chinese (Mandarin)" },
  { code: "ru", nameFr: "Russe", nameEn: "Russian" },
  { code: "af", nameFr: "Afrikaans", nameEn: "Afrikaans" },
  { code: "sq", nameFr: "Albanais", nameEn: "Albanian" },
  { code: "am", nameFr: "Amharique", nameEn: "Amharic" },
  { code: "ar", nameFr: "Arabe", nameEn: "Arabic" },
  { code: "hy", nameFr: "Arménien", nameEn: "Armenian" },
  { code: "as", nameFr: "Assamais", nameEn: "Assamese" },
  { code: "ay", nameFr: "Aymara", nameEn: "Aymara" },
  { code: "az", nameFr: "Azéri", nameEn: "Azerbaijani" },
  { code: "eu", nameFr: "Basque", nameEn: "Basque" },
  { code: "be", nameFr: "Biélorusse", nameEn: "Belarusian" },
  { code: "bn", nameFr: "Bengali", nameEn: "Bengali" },
  { code: "bs", nameFr: "Bosniaque", nameEn: "Bosnian" },
  { code: "bg", nameFr: "Bulgare", nameEn: "Bulgarian" },
  { code: "my", nameFr: "Birman", nameEn: "Burmese" },
  { code: "ca", nameFr: "Catalan", nameEn: "Catalan" },
  { code: "ceb", nameFr: "Cebuano", nameEn: "Cebuano" },
  { code: "ny", nameFr: "Chichewa", nameEn: "Chichewa" },
  { code: "hr", nameFr: "Croate", nameEn: "Croatian" },
  { code: "cs", nameFr: "Tchèque", nameEn: "Czech" },
  { code: "da", nameFr: "Danois", nameEn: "Danish" },
  { code: "dv", nameFr: "Dhivehi", nameEn: "Dhivehi" },
  { code: "nl", nameFr: "Néerlandais", nameEn: "Dutch" },
  { code: "dz", nameFr: "Dzongkha", nameEn: "Dzongkha" },
  { code: "et", nameFr: "Estonien", nameEn: "Estonian" },
  { code: "fo", nameFr: "Féroïen", nameEn: "Faroese" },
  { code: "tl", nameFr: "Filipino", nameEn: "Filipino" },
  { code: "fi", nameFr: "Finnois", nameEn: "Finnish" },
  { code: "gl", nameFr: "Galicien", nameEn: "Galician" },
  { code: "ka", nameFr: "Géorgien", nameEn: "Georgian" },
  { code: "el", nameFr: "Grec", nameEn: "Greek" },
  { code: "gn", nameFr: "Guarani", nameEn: "Guarani" },
  { code: "gu", nameFr: "Gujarati", nameEn: "Gujarati" },
  { code: "ht", nameFr: "Créole haïtien", nameEn: "Haitian Creole" },
  { code: "ha", nameFr: "Haoussa", nameEn: "Hausa" },
  { code: "haw", nameFr: "Hawaïen", nameEn: "Hawaiian" },
  { code: "he", nameFr: "Hébreu", nameEn: "Hebrew" },
  { code: "hi", nameFr: "Hindi", nameEn: "Hindi" },
  { code: "hmn", nameFr: "Hmong", nameEn: "Hmong" },
  { code: "hu", nameFr: "Hongrois", nameEn: "Hungarian" },
  { code: "is", nameFr: "Islandais", nameEn: "Icelandic" },
  { code: "ig", nameFr: "Igbo", nameEn: "Igbo" },
  { code: "id", nameFr: "Indonésien", nameEn: "Indonesian" },
  { code: "ga", nameFr: "Irlandais", nameEn: "Irish" },
  { code: "it", nameFr: "Italien", nameEn: "Italian" },
  { code: "ja", nameFr: "Japonais", nameEn: "Japanese" },
  { code: "jv", nameFr: "Javanais", nameEn: "Javanese" },
  { code: "kn", nameFr: "Kannada", nameEn: "Kannada" },
  { code: "kk", nameFr: "Kazakh", nameEn: "Kazakh" },
  { code: "km", nameFr: "Khmer", nameEn: "Khmer" },
  { code: "ko", nameFr: "Coréen", nameEn: "Korean" },
  { code: "ku", nameFr: "Kurde (Kurmanji)", nameEn: "Kurdish (Kurmanji)" },
  { code: "ckb", nameFr: "Kurde (Sorani)", nameEn: "Kurdish (Sorani)" },
  { code: "ky", nameFr: "Kirghize", nameEn: "Kyrgyz" },
  { code: "lo", nameFr: "Lao", nameEn: "Lao" },
  { code: "la", nameFr: "Latin", nameEn: "Latin" },
  { code: "lv", nameFr: "Letton", nameEn: "Latvian" },
  { code: "lt", nameFr: "Lituanien", nameEn: "Lithuanian" },
  { code: "lb", nameFr: "Luxembourgeois", nameEn: "Luxembourgish" },
  { code: "mk", nameFr: "Macédonien", nameEn: "Macedonian" },
  { code: "mg", nameFr: "Malgache", nameEn: "Malagasy" },
  { code: "ms", nameFr: "Malais", nameEn: "Malay" },
  { code: "ml", nameFr: "Malayalam", nameEn: "Malayalam" },
  { code: "mt", nameFr: "Maltais", nameEn: "Maltese" },
  { code: "mi", nameFr: "Maori", nameEn: "Maori" },
  { code: "mr", nameFr: "Marathi", nameEn: "Marathi" },
  { code: "mn", nameFr: "Mongol", nameEn: "Mongolian" },
  { code: "ne", nameFr: "Népalais", nameEn: "Nepali" },
  { code: "no", nameFr: "Norvégien", nameEn: "Norwegian" },
  { code: "or", nameFr: "Odia", nameEn: "Odia" },
  { code: "ps", nameFr: "Pachto", nameEn: "Pashto" },
  { code: "fa", nameFr: "Persan", nameEn: "Persian" },
  { code: "pl", nameFr: "Polonais", nameEn: "Polish" },
  { code: "pa", nameFr: "Pendjabi", nameEn: "Punjabi" },
  { code: "qu", nameFr: "Quechua", nameEn: "Quechua" },
  { code: "ro", nameFr: "Roumain", nameEn: "Romanian" },
  { code: "gd", nameFr: "Gaélique écossais", nameEn: "Scottish Gaelic" },
  { code: "sr", nameFr: "Serbe", nameEn: "Serbian" },
  { code: "si", nameFr: "Singhalais", nameEn: "Sinhala" },
  { code: "sk", nameFr: "Slovaque", nameEn: "Slovak" },
  { code: "sl", nameFr: "Slovène", nameEn: "Slovenian" },
  { code: "so", nameFr: "Somali", nameEn: "Somali" },
  { code: "su", nameFr: "Soundanais", nameEn: "Sundanese" },
  { code: "sw", nameFr: "Swahili", nameEn: "Swahili" },
  { code: "sv", nameFr: "Suédois", nameEn: "Swedish" },
  { code: "tg", nameFr: "Tadjik", nameEn: "Tajik" },
  { code: "ta", nameFr: "Tamoul", nameEn: "Tamil" },
  { code: "tt", nameFr: "Tatar", nameEn: "Tatar" },
  { code: "te", nameFr: "Télougou", nameEn: "Telugu" },
  { code: "th", nameFr: "Thaï", nameEn: "Thai" },
  { code: "bo", nameFr: "Tibétain", nameEn: "Tibetan" },
  { code: "ti", nameFr: "Tigrigna", nameEn: "Tigrinya" },
  { code: "tr", nameFr: "Turc", nameEn: "Turkish" },
  { code: "tk", nameFr: "Turkmène", nameEn: "Turkmen" },
  { code: "uk", nameFr: "Ukrainien", nameEn: "Ukrainian" },
  { code: "ur", nameFr: "Ourdou", nameEn: "Urdu" },
  { code: "ug", nameFr: "Ouïghour", nameEn: "Uyghur" },
  { code: "uz", nameFr: "Ouzbek", nameEn: "Uzbek" },
  { code: "vi", nameFr: "Vietnamien", nameEn: "Vietnamese" },
  { code: "cy", nameFr: "Gallois", nameEn: "Welsh" },
  { code: "xh", nameFr: "Xhosa", nameEn: "Xhosa" },
  { code: "yi", nameFr: "Yiddish", nameEn: "Yiddish" },
  { code: "yo", nameFr: "Yoruba", nameEn: "Yoruba" },
  { code: "zu", nameFr: "Zoulou", nameEn: "Zulu" },
];

// 🌍 Fonction pour obtenir le nom localisé d'une langue
export const getLocalizedLanguageName = (code: string, locale?: 'fr' | 'en'): string => {
  const targetLocale = locale || getBrowserLanguage();
  const languageData = languagesData.find(lang => lang.code === code);
  
  if (!languageData) {
    return code; // Fallback vers le code si non trouvé
  }
  
  return targetLocale === 'fr' ? languageData.nameFr : languageData.nameEn;
};

// 🌍 Génération du tableau des langues selon la langue du navigateur
const generateLanguagesArray = (locale?: 'fr' | 'en'): Language[] => {
  const targetLocale = locale || getBrowserLanguage();
  
  return languagesData.map(langData => ({
    code: langData.code,
    name: targetLocale === 'fr' ? langData.nameFr : langData.nameEn,
    nameEn: langData.nameEn,
    nameFr: langData.nameFr
  }));
};

// 🌍 Export du tableau principal (détection automatique)
const languages: Language[] = generateLanguagesArray();

// 🌍 Export des versions spécifiques
export const languagesFr: Language[] = generateLanguagesArray('fr');
export const languagesEn: Language[] = generateLanguagesArray('en');

/**
 * 🌍 Fonction de recherche floue multilingue
 */
export const searchLanguages = (query: string, locale?: 'fr' | 'en'): Language[] => {
  const targetLanguages = locale ? generateLanguagesArray(locale) : languages;
  
  return targetLanguages.filter(lang =>
    lang.name.toLowerCase().includes(query.toLowerCase()) ||
    (lang.nameEn && lang.nameEn.toLowerCase().includes(query.toLowerCase())) ||
    (lang.nameFr && lang.nameFr.toLowerCase().includes(query.toLowerCase()))
  );
};

/**
 * 🌍 Liste triée alphabétiquement selon la locale
 */
export const getSortedLanguages = (locale?: 'fr' | 'en'): Language[] => {
  const targetLanguages = locale ? generateLanguagesArray(locale) : languages;
  
  return [...targetLanguages].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

/**
 * 🌍 Fonction utilitaire pour obtenir la langue du navigateur
 */
export const getDetectedBrowserLanguage = (): 'fr' | 'en' => {
  return getBrowserLanguage();
};

/**
 * 🌍 Export de constantes utiles
 */
export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export const DEFAULT_LOCALE = 'en' as const;

// Export par défaut du tableau (détection automatique)
export default languages;

// 🌍 UTILISATION DANS LES COMPOSANTS:
/*
// Utilisation basique (détection automatique):
import languages from '../data/Languages-spoken';

// Utilisation avec locale spécifique:
import { languagesFr, languagesEn, getLocalizedLanguageName } from '../data/Languages-spoken';

// Exemple d'utilisation dans un composant:
function MyComponent() {
  const [currentLocale, setCurrentLocale] = useState<'fr' | 'en'>('fr');
  const languages = getSortedLanguages(currentLocale);
  
  return (
    <div>
      <button onClick={() => setCurrentLocale('fr')}>Français</button>
      <button onClick={() => setCurrentLocale('en')}>English</button>
      {languages.map(lang => (
        <div key={lang.code}>{lang.name}</div>
      ))}
    </div>
  );
}
*/