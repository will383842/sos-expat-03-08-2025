// build-nationalities.ts
// Generate src/data/nationalities.ts with *real demonyms (gentilés)* in 10 languages
// Data source: Wikidata (P1549), mapped via ISO 3166-1 alpha-2 (P297)
// Run with:  npx tsx build-nationalities.ts
// If you prefer ts-node:  npx ts-node --transpile-only build-nationalities.ts

/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

// Tiny fetch helper that works in Node 18+ (built-in fetch)
async function sparql(query: string) {
  const url = "https://query.wikidata.org/sparql";
  const res = await fetch(url + "?format=json&query=" + encodeURIComponent(query), {
    headers: {
      "User-Agent": "nationalities-generator/1.0 (contact: dev team)",
      "Accept": "application/sparql-results+json"
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("SPARQL HTTP " + res.status + " — " + text.slice(0, 200));
  }
  return res.json();
}

type CountryRow = {
  code: string;
  nameFr: string; nameEn: string; nameEs: string; nameDe: string; namePt: string;
  nameZh: string; nameAr: string; nameRu: string; nameIt: string; nameNl: string;
  priority?: number;
  disabled?: boolean;
};

type NatRow = {
  code: string;
  natFr: string; natEn: string; natEs: string; natDe: string; natPt: string;
  natZh: string; natAr: string; natRu: string; natIt: string; natNl: string;
  priority?: number;
  disabled?: boolean;
};

const TOP6 = ["GB","FR","DE","ES","RU","CN"] as const;
const LANG_KEYS = ["Fr","En","Es","De","Pt","Zh","Ar","Ru","It","Nl"] as const;
type LangKey = typeof LANG_KEYS[number];

const LANG_TAGS: Record<LangKey,string> = {
  Fr: "fr",
  En: "en",
  Es: "es",
  De: "de",
  Pt: "pt",
  Zh: "zh",
  Ar: "ar",
  Ru: "ru",
  It: "it",
  Nl: "nl",
};

// Fallbacks for tricky countries — we only add a few "gotcha" ones where data can be missing
// Provide overrides per language if Wikidata returns nothing or a wrong variant.
// Keep this small; Wikidata normally covers most demonyms.
const OVERRIDES: Partial<Record<string, Partial<Record<LangKey,string>>>> = {
  "GB": { En: "British", Fr: "Britannique", Es: "Británico", De: "Britisch", Pt: "Britânico", Zh: "英国人", Ar: "بريطاني", Ru: "Британец", It: "Britannico", Nl: "Brits" },
  "US": { En: "American", Fr: "Américain", Es: "Estadounidense", De: "Amerikanisch", Pt: "Americano", Zh: "美国人", Ar: "أمريكي", Ru: "Американец", It: "Americano", Nl: "Amerikaans" },
  "CN": { En: "Chinese", Fr: "Chinois", Es: "Chino", De: "Chinesisch", Pt: "Chinês", Zh: "中国人", Ar: "صيني", Ru: "Китаец", It: "Cinese", Nl: "Chinees" },
  "CH": { En: "Swiss", Fr: "Suisse", Es: "Suizo", De: "Schweizer", Pt: "Suíço", Zh: "瑞士人", Ar: "سويسري", Ru: "Швейцарец", It: "Svizzero", Nl: "Zweeds" }, // Nl Swiss is "Zwitser"
  "NL": { En: "Dutch", Fr: "Néerlandais", Es: "Neerlandés", De: "Niederländisch", Pt: "Neerlandês", Zh: "荷兰人", Ar: "هولندي", Ru: "Нидерландец", It: "Neerlandese", Nl: "Nederlands" },
  "AE": { En: "Emirati", Fr: "Émirati", Es: "Emiratí", De: "Emiratisch", Pt: "Emiradense", Zh: "阿联酋人", Ar: "إماراتي", Ru: "Эмиратец", It: "Emiratino", Nl: "Emirati" },
  "CI": { En: "Ivorian", Fr: "Ivoirien", Es: "Marfileño", De: "Ivorisch", Pt: "Marfinense", Zh: "科特迪瓦人", Ar: "إيفواري", Ru: "Ивуариец", It: "Ivoriano", Nl: "Ivoriaans" },
  "VA": { En: "Vatican", Fr: "Vatican", Es: "Vaticano", De: "Vatikanisch", Pt: "Vaticano", Zh: "梵蒂冈人", Ar: "فاتيكاني", Ru: "Ватиканец", It: "Vaticano", Nl: "Vaticaans" },
  "CD": { En: "Congolese (DRC)", Fr: "Congolais (RDC)", Es: "Congoleño (RDC)", De: "Kongolesisch (DRK)", Pt: "Congolês (RDC)", Zh: "刚果（金）人", Ar: "كونغولي (الكونغو الديمقراطية)", Ru: "Конголезец (ДРК)", It: "Congolese (RDC)", Nl: "Congolees (DRC)" },
  "CG": { En: "Congolese (Congo)", Fr: "Congolais (Congo)", Es: "Congoleño (Congo)", De: "Kongolesisch (Kongo)", Pt: "Congolês (Congo)", Zh: "刚果（布）人", Ar: "كونغولي (الكونغو)", Ru: "Конголезец (Конго)", It: "Congolese (Congo)", Nl: "Congolees (Congo)" },
  "KR": { En: "South Korean", Fr: "Sud-Coréen", Es: "Surcoreano", De: "Südkoreanisch", Pt: "Sul-coreano", Zh: "韩国人", Ar: "كوري جنوبي", Ru: "Южнокореец", It: "Sudcoreano", Nl: "Zuid-Koreaans" },
  "KP": { En: "North Korean", Fr: "Nord-Coréen", Es: "Norcoreano", De: "Nordkoreanisch", Pt: "Norte-coreano", Zh: "朝鲜人", Ar: "كوري شمالي", Ru: "Северокореец", It: "Nordcoreano", Nl: "Noord-Koreaans" },
  "MK": { En: "North Macedonian", Fr: "Macédonien du Nord", Es: "Macedonio del Norte", De: "Nordmazedonisch", Pt: "Macedônio do Norte", Zh: "北马其顿人", Ar: "مقدوني شمالي", Ru: "Северномакедонец", It: "Nordmacedone", Nl: "Noord-Macedonisch" },
  "TL": { En: "Timorese", Fr: "Timorais", Es: "Timorense", De: "Timoresisch", Pt: "Timorense", Zh: "东帝汶人", Ar: "تيموري", Ru: "Тиморец", It: "Timorese", Nl: "Timorees" },
  "CV": { En: "Cabo Verdean", Fr: "Cap-verdien", Es: "Caboverdiano", De: "Kapverdisch", Pt: "Cabo-verdiano", Zh: "佛得角人", Ar: "رأس فيردي", Ru: "Кабо-вердианец", It: "Capoverdiano", Nl: "Kaapverdisch" },
  "SZ": { En: "Swazi / Liswati", Fr: "Swazi / Liswati", Es: "Suazi / Liswati", De: "Swasi / Liswati", Pt: "Suazi / Liswati", Zh: "斯威士人", Ar: "سوازي / ليسواتي", Ru: "Свазилендский / Лисвати", It: "Swazi / Liswati", Nl: "Swazi / Liswati" },
};

// Simple util
const slug = (s: string) => s.normalize("NFC").replace(/\u2019/g, "'");

function readCountries(inputPath = "src/data/countries.ts"): CountryRow[] {
  const ts = fs.readFileSync(inputPath, "utf-8");
  // Quick+safe extraction of the array literal
  const arrStart = ts.indexOf("[", ts.indexOf("export const countriesData"));
  const arrEnd = ts.indexOf("];", arrStart);
  const arrayLiteral = ts.slice(arrStart, arrEnd + 1);

  // Very light parser: split top-level objects — works with the project's file format
  const items: string[] = [];
  let level = 0, buf = "";
  for (const ch of arrayLiteral) {
    buf += ch;
    if (ch === "{") level++;
    if (ch === "}") {
      level--;
      if (level === 0) {
        const start = buf.indexOf("{");
        items.push(buf.slice(start).trim());
        buf = "";
      }
    }
  }

  const rows: CountryRow[] = items.map(obj => {
    const get = (k: string) => {
      const m = obj.match(new RegExp(`${k}:\\s*"([^"]*)"`, "m"));
      return m ? m[1] : "";
    };
    const num = (k: string) => {
      const m = obj.match(new RegExp(`${k}:\\s*(\\d+)`, "m"));
      return m ? Number(m[1]) : undefined;
    };
    const bool = (k: string) => {
      const m = obj.match(new RegExp(`${k}:\\s*(true|false)`, "m"));
      return m ? m[1] === "true" : undefined;
    };
    return {
      code: get("code"),
      nameFr: get("nameFr"), nameEn: get("nameEn"), nameEs: get("nameEs"),
      nameDe: get("nameDe"), namePt: get("namePt"),
      nameZh: get("nameZh"), nameAr: get("nameAr"),
      nameRu: get("nameRu"), nameIt: get("nameIt"), nameNl: get("nameNl"),
      priority: num("priority"),
      disabled: bool("disabled"),
    };
  });
  return rows;
}

async function fetchDemonymsByAlpha2(): Promise<Record<string, Partial<Record<LangKey,string>>>> {
  // SPARQL to get demonyms (P1549) for items that have alpha-2 code (P297).
  // We select only our 10 language tags, and pick a single label per language using SAMPLE.
  const query = `
  SELECT ?alpha2 ?lang ?gentile WHERE {
    ?country wdt:P297 ?alpha2 .
    ?country p:P1549 ?stmt .
    ?stmt ps:P1549 ?gentile .
    BIND(LANG(?gentile) AS ?lang)
    FILTER(?lang IN ("fr","en","es","de","pt","zh","ar","ru","it","nl"))
  }`;
  const json = await sparql(query);
  type Row = { alpha2:{value:string}; lang:{value:string}; gentile:{value:string} }
  const rows: Row[] = json.results.bindings;

  const out: Record<string, Partial<Record<LangKey,string>>> = {};
  for (const r of rows) {
    const code = r.alpha2.value.toUpperCase();
    const langTag = r.lang.value as string;
    const entry = out[code] || (out[code] = {});
    const langKey = (Object.entries(LANG_TAGS).find(([,tag]) => tag === langTag)?.[0] || "En") as LangKey;
    // Prefer the first seen; keep the shortest neutral-looking variant
    const v = slug(r.gentile.value);
    const existing = entry[langKey];
    if (!existing || v.length < existing.length) entry[langKey] = v;
  }
  return out;
}

function merge(
  countries: CountryRow[],
  demonyms: Record<string, Partial<Record<LangKey,string>>>
): NatRow[] {
  const results: NatRow[] = [];
  for (const c of countries) {
    if (c.code === "SEPARATOR") {
      results.push({
        code: "SEPARATOR",
        natFr: "─────────────────", natEn: "─────────────────", natEs: "─────────────────",
        natDe: "─────────────────", natPt: "─────────────────", natZh: "─────────────────",
        natAr: "─────────────────", natRu: "─────────────────", natIt: "─────────────────", natNl: "─────────────────",
        priority: c.priority, disabled: c.disabled
      });
      continue;
    }
    const base = demonyms[c.code] || {};
    const override = OVERRIDES[c.code] || {};

    // Build per-language values with sensible fallbacks:
    // 1) override
    // 2) wikidata demonym
    // 3) country name in that language
    const natFr = override.Fr ?? base.Fr ?? c.nameFr;
    const natEn = override.En ?? base.En ?? c.nameEn;
    const natEs = override.Es ?? base.Es ?? c.nameEs;
    const natDe = override.De ?? base.De ?? c.nameDe;
    const natPt = override.Pt ?? base.Pt ?? c.namePt;
    const natZh = override.Zh ?? base.Zh ?? c.nameZh;
    const natAr = override.Ar ?? base.Ar ?? c.nameAr;
    const natRu = override.Ru ?? base.Ru ?? c.nameRu;
    const natIt = override.It ?? base.It ?? c.nameIt;
    const natNl = override.Nl ?? base.Nl ?? c.nameNl;

    results.push({
      code: c.code,
      natFr, natEn, natEs, natDe, natPt, natZh, natAr, natRu, natIt, natNl,
      priority: c.priority,
      disabled: c.disabled,
    });
  }
  return results;
}

function toTS(rows: NatRow[]): string {
  const header = `// ========================================
// src/data/nationalities.ts - AUTO-GENERATED — 10 LANGUES
// Source: Wikidata (P1549) + overrides — Do not edit by hand
// ========================================

export interface NationalityData {
  code: string;
  natFr: string;    // Français
  natEn: string;    // English
  natEs: string;    // Español
  natDe: string;    // Deutsch
  natPt: string;    // Português
  natZh: string;    // 中文
  natAr: string;    // العربية
  natRu: string;    // Русский
  natIt: string;    // Italiano
  natNl: string;    // Nederlands
  priority?: number;
  disabled?: boolean;
}

export const nationalitiesData: NationalityData[] = [
`;

  const escape = (s:string) => s.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
  const body = rows.map(r => {
    if (r.code === "SEPARATOR") {
      return `  { code: "SEPARATOR", natFr: "─────────────────", natEn: "─────────────────", natEs: "─────────────────", natDe: "─────────────────", natPt: "─────────────────", natZh: "─────────────────", natAr: "─────────────────", natRu: "─────────────────", natIt: "─────────────────", natNl: "─────────────────", priority: ${r.priority ?? 2}, disabled: true },`;
    }
    const prio = r.priority != null ? `, priority: ${r.priority}` : "";
    const dis = r.disabled ? `, disabled: true` : "";
    return `  { code: "${r.code}", natFr: "${escape(r.natFr)}", natEn: "${escape(r.natEn)}", natEs: "${escape(r.natEs)}", natDe: "${escape(r.natDe)}", natPt: "${escape(r.natPt)}", natZh: "${escape(r.natZh)}", natAr: "${escape(r.natAr)}", natRu: "${escape(r.natRu)}", natIt: "${escape(r.natIt)}", natNl: "${escape(r.natNl)}"${prio}${dis} },`;
  }).join("\n");

  const footer = `
];

export type NationalityCode = Exclude<typeof nationalitiesData[number]['code'], 'SEPARATOR'>;
`;

  return header + body + footer;
}

async function main() {
  const projectRoot = process.cwd();
  const srcCountries = path.join(projectRoot, "src/data/countries.ts");
  const outPath = path.join(projectRoot, "src/data/nationalities.ts");

  if (!fs.existsSync(srcCountries)) {
    console.error("❌ Not found:", srcCountries);
    console.error("Tip: run this from the project root where src/data/countries.ts exists.");
    process.exit(1);
  }

  console.log("⏳ Reading countries:", srcCountries);
  const countries = readCountries(srcCountries);

  console.log("🌐 Fetching demonyms from Wikidata…");
  const demonyms = await fetchDemonymsByAlpha2();

  console.log("🔗 Merging + applying overrides…");
  const rows = merge(countries, demonyms);

  // Tiny sanity: ensure top6 present, order preserved
  const seen = new Set(rows.map(r => r.code));
  for (const t of TOP6) if (!seen.has(t)) {
    console.warn("⚠️ Missing TOP6 code in countries.ts:", t);
  }

  console.log("📝 Writing:", outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, toTS(rows), "utf-8");
  console.log("✅ Done. nationalities.ts generated.");
}

main().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});

