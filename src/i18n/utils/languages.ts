export const languageName = (code: string, locale = 'fr') => {
  try {
    const normalized = code.replace('_', '-').toLowerCase();
    const [lang, region] = normalized.split('-');
    const finalCode = region ? `${lang}-${region.toUpperCase()}` : lang;

    const dn = new Intl.DisplayNames([locale], { type: 'language' });
    return dn.of(finalCode) || code;
  } catch {
    return code;
  }
};

export const formatLanguages = (codes: string[] = [], locale = 'fr') =>
  codes.map(c => languageName(c, locale)).join(', ');
