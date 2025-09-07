"use strict";
// firebase/functions/src/utils/Language.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FALLBACK_LANG = exports.SUPPORTED_LANGS = exports.VOICE_LOCALES = void 0;
exports.normalizeToShortLang = normalizeToShortLang;
exports.normalizeLangList = normalizeLangList;
exports.orderedIntersection = orderedIntersection;
exports.resolveCommonLanguage = resolveCommonLanguage;
exports.langKeyToTwilioLocale = langKeyToTwilioLocale;
exports.parseAcceptLanguage = parseAcceptLanguage;
exports.resolveLangForTwilio = resolveLangForTwilio;
exports.isSupportedLang = isSupportedLang;
exports.pickBestClientLang = pickBestClientLang;
/** Mapping "langue courte" -> locale TTS Twilio */
exports.VOICE_LOCALES = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES'
};
/** Ensemble de langues supportées côté produit/voix */
exports.SUPPORTED_LANGS = ['fr', 'en', 'es'];
/** Fallback global si aucune langue commune ne peut être trouvée */
exports.DEFAULT_FALLBACK_LANG = 'en';
/**
 * Normalise une valeur de langue arbitraire vers un code court 'fr' | 'en' | 'es'
 * @example normalizeToShortLang('FR-fr') -> 'fr'
 * @example normalizeToShortLang('en_US') -> 'en'
 * @example normalizeToShortLang('es') -> 'es'
 * @returns le code court supporté ou undefined si non reconnu
 */
function normalizeToShortLang(input) {
    if (!input)
        return undefined;
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
function normalizeLangList(langs) {
    const out = [];
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
function orderedIntersection(a, b) {
    const setB = new Set(b);
    const out = [];
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
function resolveCommonLanguage(clientLangs, providerLangs, options = {}) {
    const { prioritizeClientOrder = true, fallback = exports.DEFAULT_FALLBACK_LANG, preferredIntersectionFirst } = options;
    const c = normalizeLangList(clientLangs);
    const p = normalizeLangList(providerLangs);
    // Rien de valide des deux côtés -> fallback direct
    if (c.length === 0 && p.length === 0) {
        return { langKey: fallback, ttsLocale: exports.VOICE_LOCALES[fallback], origin: 'fallback' };
    }
    const left = prioritizeClientOrder ? c : p;
    const right = prioritizeClientOrder ? p : c;
    const inter = orderedIntersection(left, right);
    // Si on a imposé une langue préférée et qu'elle est dans l'intersection
    if (preferredIntersectionFirst && inter.includes(preferredIntersectionFirst)) {
        return {
            langKey: preferredIntersectionFirst,
            ttsLocale: exports.VOICE_LOCALES[preferredIntersectionFirst],
            origin: 'intersection'
        };
    }
    // 1) prendre la 1ère de l'intersection si dispo
    if (inter.length > 0) {
        const lang = inter[0];
        return { langKey: lang, ttsLocale: exports.VOICE_LOCALES[lang], origin: 'intersection' };
    }
    // 2) sinon, prendre la 1ère préférence client supportée (si on a priorisé client)
    if (prioritizeClientOrder && c.length > 0) {
        const lang = c[0];
        return { langKey: lang, ttsLocale: exports.VOICE_LOCALES[lang], origin: 'client' };
    }
    // 3) sinon fallback global
    return { langKey: fallback, ttsLocale: exports.VOICE_LOCALES[fallback], origin: 'fallback' };
}
/**
 * Convertit un code court ('fr'|'en'|'es') vers locale Twilio.
 * Lance une erreur si non supporté (utile pour attraper les régressions).
 */
function langKeyToTwilioLocale(lang) {
    const loc = exports.VOICE_LOCALES[lang];
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
function parseAcceptLanguage(header) {
    if (!header)
        return [];
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
        .map((p) => p.short);
    // Dédupliquer en conservant l'ordre
    return Array.from(new Set(filtered));
}
/**
 * Helper de haut niveau pour Twilio :
 * renvoie directement { langKey, ttsLocale } à partir d'inputs "bruités".
 */
function resolveLangForTwilio(clientLangs, providerLangs, options) {
    const { langKey, ttsLocale } = resolveCommonLanguage(clientLangs, providerLangs, options);
    return { langKey, ttsLocale };
}
/**
 * Valide qu'une langue courte est supportée.
 */
function isSupportedLang(lang) {
    const n = normalizeToShortLang(lang);
    return !!n && exports.SUPPORTED_LANGS.includes(n);
}
/**
 * Renvoie la meilleure langue côté client seule (sans prestataire),
 * utile pour choisir la langue des notifications initiales.
 */
function pickBestClientLang(clientLangs, fallback = exports.DEFAULT_FALLBACK_LANG) {
    const c = normalizeLangList(clientLangs);
    return c[0] ?? fallback;
}
//# sourceMappingURL=Language.js.map