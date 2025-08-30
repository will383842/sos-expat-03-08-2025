const minorUnitsMap: Record<string, number> = {
  // 0-decimal currencies
  BIF: 1, CLP: 1, DJF: 1, GNF: 1, JPY: 1, KMF: 1, KRW: 1, MGA: 1, PYG: 1,
  RWF: 1, UGX: 1, VND: 1, VUV: 1, XAF: 1, XOF: 1, XPF: 1,
  // 3-decimal currencies (rare)
  BHD: 1000, JOD: 1000, KWD: 1000, OMR: 1000, TND: 1000,
};

function minorUnitsFor(currency?: string): number {
  const c = String(currency || "EUR").toUpperCase();
  return minorUnitsMap[c] ?? 100;
}

export function formatMoney(
  amountMinor: number | string,
  currency: string,
  locale: "fr-FR" | "en"
) {
  const minor = typeof amountMinor === "string" ? Number(amountMinor) : amountMinor;
  const divisor = minorUnitsFor(currency);
  const value = Number.isFinite(minor as number) ? Number(minor) / divisor : 0;
  const loc = locale === "fr-FR" ? "fr-FR" : "en-US";
  const cur = String(currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(value);
  } catch {
    return new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(value);
  }
}
