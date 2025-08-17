export type Locale = 'fr' | 'en';

export interface SharedOption {
  value: string;
  label: string;
  isShared?: boolean;
}

export const defaultPlaceholderByLocale: Record<Locale, string> = {
  fr: "Sélectionner...",
  en: "Select..."
};

export const getDetectedBrowserLanguage = (): Locale => {
  if (typeof navigator !== 'undefined') {
    return navigator.language.startsWith('fr') ? 'fr' : 'en';
  }
  return 'fr';
};

export const normalize = (text: string): string => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const getLocalizedLabel = (item: any, locale: Locale, fallback: string): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    return item[locale] || item.name || item.label || fallback;
  }
  return fallback;
};

export const makeAdaptiveStyles = <T extends SharedOption = SharedOption>(highlightShared = false) => {
  return {
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.data?.isShared && highlightShared ? '#f3f4f6' : provided.backgroundColor
    }),
    control: (provided: any) => ({
      ...provided,
      minHeight: '40px'
    })
  };
};
