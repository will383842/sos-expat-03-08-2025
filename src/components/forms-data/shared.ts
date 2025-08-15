// src/components/forms-data/shared.ts
import type { StylesConfig } from 'react-select';

export type Locale = 'fr' | 'en';

export interface SharedOption {
  value: string;
  label: string;
}

/**
 * Détecte la langue du navigateur (FR/EN) sans dépendance externe.
 */
export const getDetectedBrowserLanguage = (): Locale => {
  const nav: any =
    typeof navigator !== 'undefined' ? navigator : {};
  const raw: string =
    (Array.isArray(nav.languages) && nav.languages[0]) ||
    nav.language ||
    nav.userLanguage ||
    'en';
  return String(raw).toLowerCase().startsWith('fr') ? 'fr' : 'en';
};

/**
 * Normalise une chaîne pour clé/slug : minuscules, sans accents, alphanum + tirets.
 */
export const normalize = (s: string): string =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Retourne le libellé selon la locale.
 */
export const getLocalizedLabel = (
  labelFr: string,
  labelEn: string,
  locale: Locale
): string => (locale === 'fr' ? labelFr : labelEn);

/**
 * Trie un tableau d’options par libellé selon la locale.
 */
export const orderByLocale = <T extends SharedOption>(
  arr: T[],
  locale: Locale
): T[] =>
  [...arr].sort((a, b) =>
    a.label.localeCompare(
      b.label,
      locale === 'fr' ? 'fr' : 'en',
      { sensitivity: 'base' }
    )
  );

/**
 * Styles de base pour react-select (mono et multi).
 */
export const makeAdaptiveStyles = ():
  StylesConfig<SharedOption, boolean> => ({
  control: (base) => ({
    ...base,
    minHeight: 42,
    borderRadius: 10
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50
  }),
  multiValue: (base) => ({
    ...base,
    borderRadius: 6
  })
});
