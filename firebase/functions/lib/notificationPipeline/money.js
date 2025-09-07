"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMoney = formatMoney;
const minorUnitsMap = {
    // 0-decimal currencies
    BIF: 1, CLP: 1, DJF: 1, GNF: 1, JPY: 1, KMF: 1, KRW: 1, MGA: 1, PYG: 1,
    RWF: 1, UGX: 1, VND: 1, VUV: 1, XAF: 1, XOF: 1, XPF: 1,
    // 3-decimal currencies (rare)
    BHD: 1000, JOD: 1000, KWD: 1000, OMR: 1000, TND: 1000
};
function minorUnitsFor(currency) {
    const c = String(currency || "EUR").toUpperCase();
    return minorUnitsMap[c] ?? 100;
}
function formatMoney(amountMinor, currency, locale) {
    const minor = typeof amountMinor === "string" ? Number(amountMinor) : amountMinor;
    const divisor = minorUnitsFor(currency);
    const value = Number.isFinite(minor) ? Number(minor) / divisor : 0;
    const loc = locale === "fr-FR" ? "fr-FR" : "en-US";
    const cur = String(currency || "EUR").toUpperCase();
    try {
        return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(value);
    }
    catch {
        return new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(value);
    }
}
//# sourceMappingURL=money.js.map