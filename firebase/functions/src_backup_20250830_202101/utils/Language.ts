// firebase/functions/src/utils/Language.ts

/**
 * Utilitaires pour gérer la langue commune Client/Prestataire
 * et la conversion vers les locales TTS Twilio.
 *
 * Principes :
 * - On normalise toutes les entrées vers un code court ('fr', 'en', 'es').
 * - On choisit une langue commune si possible (intersection),
 *   sinon on retombe sur une préférence client, puis sur un fallback global.
 * - On expose le mapping vers les locales Twilio (<Say language="...">).
 */

export type SupportedLangKey = 'fr' | 'en' | 'es';

/** Mapping "langue courte" -> locale TTS Twilio */
export const VOICE_LOCALES: Record<SupportedLangKey, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
};

/** Ensemble de langues supportées côté produit/voix */
export const SUPPORTED_LANGS: SupportedLangKey[] = ['fr', 'en', 'es'];

/** Fallback global si aucune langue commune ne peut être trouvée */
export const DEFAULT_FALLBACK_LANG: SupportedLangKey = 'en';

/** Options pour resolveCommonLanguage */
export interface ResolveLangOptions {
  /**
   * Si true, on donne la priorité à l'ordre des préférences du client
   * (par défaut true).
   */
  prioritizeClientOrder?: boolean;
  /**
   * Fallback global si rien ne matche (par défaut 'en').
   */
  fallback?: SupportedLangKey;
  /**
   * Si fourni, priorise cette langue si elle est dans l'intersection.
   * Utile pour forcer FR quand c'est disponible, par ex.
   */
  preferredIntersectionFirst?: SupportedLangKey;
}

/**
 * Normalise une valeur de langue arbitraire vers un code court 'fr' | 'en' | 'es'
 * @example normalizeToShortLang('FR-fr') -> 'fr'
 * @example normalizeToShortLang('en_US') -> 'en'
 * @example normalizeToShortLang('es') -> 'es'
 * @returns le code court supporté ou undefined si non reconnu
 */
export function normalizeToShortLang(input?: string | null): SupportedLangKey | undefined {
  if (!input) return undefined;
  const s = String(input).trim().toLowerCase();

  // formats courants: 'fr', 'fr-fr', 'fr_fr'
  const primary = s.split(/[-_]/)[0];

  switch (primary) {
    case 'fr':
      return 'fr';
    case 'en':
      return 'en';
    case 'es':
    case 'spa':
      return 'es';
    default:
      return undefined;
  }
}

/**
 * Normalise un tableau de langues vers une liste dédupliquée de codes courts supportés.
 * Exclut silencieusement les langues non supportées.
 */
export function normalizeLangList(langs: Array<string | null | undefined>): SupportedLangKey[] {
  const out: SupportedLangKey[] = [];
  for (const raw of langs || []) {
    const norm = normalizeToShortLang(raw);
    if (norm && !out.includes(norm)) {
      out.push(norm);
    }
  }
  return out;
}

/**
 * Calcule l'intersection ordonnée des listes A et B.
 * - L'ordre de A est conservé (utile pour prioriser les préférences du client).
 * - Les doublons sont évités.
 */
export function orderedIntersection<A extends string>(
  a: readonly A[],
  b: readonly A[]
): A[] {
  const setB = new Set(b);
  const out: A[] = [];
  for (const x of a) {
    if (setB.has(x) && !out.includes(x)) {
      out.push(x);
    }
  }
  return out;
}

/**
 * Choisit la langue "commune" pour l'appel, à partir des préférences
 * client et prestataire. Renvoie aussi la locale TTS Twilio.
 *
 * Algorithme :
 * 1) Normaliser les deux listes vers ('fr'|'en'|'es').
 * 2) Intersection ordonnée (par défaut on respecte l'ordre client).
 * 3) Si `preferredIntersectionFirst` est dans l'intersection, on la choisit.
 * 4) Sinon première de l'intersection.
 * 5) Sinon première préférence du client qui est supportée.
 * 6) Sinon fallback global.
 */
export function resolveCommonLanguage(
  clientLangs: Array<string | null | undefined>,
  providerLangs: Array<string | null | undefined>,
  options: ResolveLangOptions = {}
): { langKey: SupportedLangKey; ttsLocale: string; origin: 'intersection' | 'client' | 'fallback' } {
  const {
    prioritizeClientOrder = true,
    fallback = DEFAULT_FALLBACK_LANG,
    preferredIntersectionFirst,
  } = options;

  const c = normalizeLangList(clientLangs);
  const p = normalizeLangList(providerLangs);

  // Rien de valide des deux côtés -> fallback direct
  if (c.length === 0 && p.length === 0) {
    return { langKey: fallback, ttsLocale: VOICE_LOCALES[fallback], origin: 'fallback' };
  }

  const left = prioritizeClientOrder ? c : p;
  const right = prioritizeClientOrder ? p : c;

  const inter = orderedIntersection(left, right) as SupportedLangKey[];

  // Si on a imposé une langue préférée et qu'elle est dans l'intersection
  if (preferredIntersectionFirst && inter.includes(preferredIntersectionFirst)) {
    return {
      langKey: preferredIntersectionFirst,
      ttsLocale: VOICE_LOCALES[preferredIntersectionFirst],
      origin: 'intersection',
    };
  }

  // 1) prendre la 1ère de l'intersection si dispo
  if (inter.length > 0) {
    const lang = inter[0];
    return { langKey: lang, ttsLocale: VOICE_LOCALES[lang], origin: 'intersection' };
  }

  // 2) sinon, prendre la 1ère préférence client supportée (si on a priorisé client)
  if (prioritizeClientOrder && c.length > 0) {
    const lang = c[0];
    return { langKey: lang, ttsLocale: VOICE_LOCALES[lang], origin: 'client' };
  }

  // 3) sinon fallback global
  return { langKey: fallback, ttsLocale: VOICE_LOCALES[fallback], origin: 'fallback' };
}

/**
 * Convertit un code court ('fr'|'en'|'es') vers locale Twilio.
 * Lance une erreur si non supporté (utile pour attraper les régressions).
 */
export function langKeyToTwilioLocale(lang: SupportedLangKey): string {
  const loc = VOICE_LOCALES[lang];
  if (!loc) {
    throw new Error(`Twilio locale inconnue pour la langue: ${lang}`);
  }
  return loc;
}

/**
 * Utilitaire pratique : à partir d'un Accept-Language HTTP,
 * renvoie une liste normalisée (ordonnée par qualité 'q').
 * NB: parsing simple, suffisant pour la majorité des cas.
 *
 * @example parseAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8,es;q=0.7') -> ['fr','en','es']
 */
export function parseAcceptLanguage(header?: string | null): SupportedLangKey[] {
  if (!header) return [];
  // Split par virgule, récupérer q si présent, trier par q desc
  const parts = header.split(',').map((token) => {
    const [langRaw, ...params] = token.trim().split(';');
    const qParam = params.find((p) => p.trim().startsWith('q='));
    const q = qParam ? Number(qParam.split('=')[1]) : 1;
    const short = normalizeToShortLang(langRaw);
    return { short, q: isNaN(q) ? 1 : q };
  });

  // Filtrer non-supportés + trier par q
  const filtered = parts
    .filter((p) => !!p.short)
    .sort((a, b) => b.q - a.q)
    .map((p) => p.short!) as SupportedLangKey[];

  // Dédupliquer en conservant l'ordre
  return Array.from(new Set(filtered));
}

/**
 * Helper de haut niveau pour Twilio :
 * renvoie directement { langKey, ttsLocale } à partir d'inputs "bruités".
 */
export function resolveLangForTwilio(
  clientLangs: Array<string | null | undefined>,
  providerLangs: Array<string | null | undefined>,
  options?: ResolveLangOptions
): { langKey: SupportedLangKey; ttsLocale: string } {
  const { langKey, ttsLocale } = resolveCommonLanguage(clientLangs, providerLangs, options);
  return { langKey, ttsLocale };
}

/**
 * Valide qu'une langue courte est supportée.
 */
export function isSupportedLang(lang?: string | null): lang is SupportedLangKey {
  const n = normalizeToShortLang(lang);
  return !!n && (SUPPORTED_LANGS as string[]).includes(n);
}

/**
 * Renvoie la meilleure langue côté client seule (sans prestataire),
 * utile pour choisir la langue des notifications initiales.
 */
export function pickBestClientLang(
  clientLangs: Array<string | null | undefined>,
  fallback: SupportedLangKey = DEFAULT_FALLBACK_LANG
): SupportedLangKey {
  const c = normalizeLangList(clientLangs);
  return c[0] ?? fallback;
}
