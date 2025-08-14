// src/i18n/index.ts
// -------------------------------------------------------------
// Point d'entrée i18n unique (FR/EN) — strict TypeScript, sans dépendance.
// Exporte : Lang, SUPPORTED_LANGS, detectLang, setLang, getLang, normalizeLang,
//           useLang (hook réactif), et réexporte tes constants & utils existants.
// -------------------------------------------------------------

export type Lang = 'fr' | 'en';

export const SUPPORTED_LANGS: readonly Lang[] = ['fr', 'en'] as const;
const DEFAULT_LANG: Lang = 'fr';
const STORAGE_KEY = 'app:lang';
export const LANG_EVENT = 'i18n:change' as const;

/** Normalise une langue si supportée, sinon null. */
export function normalizeLang(input: string | null | undefined): Lang | null {
  if (!input) return null;
  const lower = input.toLowerCase();
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('en')) return 'en';
  return null;
}

/** Lit le paramètre d’URL ?lang=fr|en (prioritaire). */
function readQueryLang(): Lang | null {
  try {
    if (typeof window === 'undefined') return null;
    const qp = new URLSearchParams(window.location.search);
    return normalizeLang(qp.get('lang'));
  } catch {
    return null;
  }
}

/** Langue sauvegardée en localStorage (sécurisé). */
function readStoredLang(): Lang | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return normalizeLang(stored);
  } catch {
    return null;
  }
}

/** Détection navigateur, fallback garanti. */
function detectFromNavigator(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const candidates = (navigator.languages ?? [navigator.language]).filter(Boolean);
  for (const cand of candidates) {
    const n = normalizeLang(cand);
    if (n) return n;
  }
  return DEFAULT_LANG;
}

/** Détection finale : ?lang > localStorage > navigateur > fallback. */
export function detectLang(): Lang {
  const lang =
    readQueryLang() ??
    readStoredLang() ??
    detectFromNavigator() ??
    DEFAULT_LANG;

  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
  } catch {
    /* ignore */
  }
  return lang;
}

/** Définit explicitement la langue (persiste + notifie). */
export function setLang(lang: Lang): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
  } catch {
    /* ignore */
  }
  // 🔔 notifie les composants qui écoutent
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang } }));
  }
}

/** Récupère la langue courante (équivalent detectLang, mais nommé). */
export function getLang(): Lang {
  return detectLang();
}

// -------------------------------------------------------------
// Hook réactif : se met à jour quand setLang() est appelé
// ou quand localStorage change (autres onglets).
// -------------------------------------------------------------
import { useEffect, useState } from 'react';

export function useLang() {
  const [lang, set] = useState<Lang>(() => detectLang());

  useEffect(() => {
    const onChange = () => set(detectLang());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) set(detectLang());
    };

    window.addEventListener(LANG_EVENT, onChange as EventListener);
    window.addEventListener('storage', onStorage);

    // applique l'attribut html lang au montage aussi
    try {
      document.documentElement.setAttribute('lang', lang);
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener(LANG_EVENT, onChange as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [lang]);

  return { lang, setLang };
}

// -------------------------------------------------------------
// Réexports des modules existants pour conserver l’API publique.
// (Ces fichiers restent inchangés.)
// -------------------------------------------------------------
export * from './constants/language-codes';
export * from './constants/locales';
export * from './utils/languages';
