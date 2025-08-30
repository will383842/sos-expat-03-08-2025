"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = render;
const money_1 = require("./money");
function render(tpl, ctx) {
    if (!tpl)
        return "";
    return tpl
        .replace(/\{\{\s*money\s+([^}\s]+)\s+([^}\s]+)\s*\}\}/g, (_m, a, c) => (0, money_1.formatMoney)(get(ctx, a), String(get(ctx, c) || "EUR"), resolveLocale(ctx)))
        .replace(/\{\{\s*date\s+([^}\s]+)\s*\}\}/g, (_m, d) => {
        const iso = String(get(ctx, d) || "");
        if (!iso)
            return "";
        const dt = new Date(iso);
        if (isNaN(dt.getTime()))
            return "";
        const loc = resolveLocale(ctx) === "fr-FR" ? "fr-FR" : "en-US";
        return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(dt);
    })
        .replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_m, p1) => {
        const v = get(ctx, p1);
        return v == null ? "" : String(v);
    });
}
function get(obj, path) {
    return String(path || "").split(".").reduce((acc, k) => (acc != null ? acc[k] : undefined), obj);
}
function resolveLocale(ctx) {
    var _a;
    const pref = ((_a = ctx === null || ctx === void 0 ? void 0 : ctx.user) === null || _a === void 0 ? void 0 : _a.preferredLanguage) || (ctx === null || ctx === void 0 ? void 0 : ctx.locale);
    return String(pref || "").toLowerCase().startsWith("fr") ? "fr-FR" : "en";
}
//# sourceMappingURL=render.js.map