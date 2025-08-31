export type Lang = 'fr-FR' | 'en';
export function resolveLang(input?: string): Lang {
  if (!input) return 'en';
  const s = String(input).toLowerCase();
  return s.startsWith('fr') ? 'fr-FR' : 'en';
}
