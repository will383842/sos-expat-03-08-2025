import { formatMoney } from "./money";

export function render(tpl: string, ctx: any) {
  if (!tpl) return "";
  return tpl
    .replace(/\{\{\s*money\s+([^}\s]+)\s+([^}\s]+)\s*\}\}/g, (_m, a, c) =>
      formatMoney(get(ctx, a), String(get(ctx, c) || "EUR"), resolveLocale(ctx)))
    .replace(/\{\{\s*date\s+([^}\s]+)\s*\}\}/g, (_m, d) => {
      const iso = String(get(ctx, d) || "");
      if (!iso) return "";
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return "";
      const loc = resolveLocale(ctx) === "fr-FR" ? "fr-FR" : "en-US";
      return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(dt);
    })
    .replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_m, p1) => {
      const v = get(ctx, p1);
      return v == null ? "" : String(v);
    });
}

function get(obj: any, path: string) {
  return String(path || "").split(".").reduce((acc: any, k: string) => (acc != null ? acc[k] : undefined), obj);
}
function resolveLocale(ctx: any): "fr-FR" | "en" {
  const pref = ctx?.user?.preferredLanguage || ctx?.locale;
  return String(pref || "").toLowerCase().startsWith("fr") ? "fr-FR" : "en";
}
