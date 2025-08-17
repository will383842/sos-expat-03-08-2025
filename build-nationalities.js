"use strict";
// build-nationalities.ts
// Generate src/data/nationalities.ts with *real demonyms (gentilés)* in 10 languages
// Data source: Wikidata (P1549), mapped via ISO 3166-1 alpha-2 (P297)
// Run with:  npx tsx build-nationalities.ts
// If you prefer ts-node:  npx ts-node --transpile-only build-nationalities.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
// Tiny fetch helper that works in Node 18+ (built-in fetch)
function sparql(query) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "https://query.wikidata.org/sparql";
                    return [4 /*yield*/, fetch(url + "?format=json&query=" + encodeURIComponent(query), {
                            headers: {
                                "User-Agent": "nationalities-generator/1.0 (contact: dev team)",
                                "Accept": "application/sparql-results+json"
                            }
                        })];
                case 1:
                    res = _a.sent();
                    if (!!res.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, res.text()];
                case 2:
                    text = _a.sent();
                    throw new Error("SPARQL HTTP " + res.status + " — " + text.slice(0, 200));
                case 3: return [2 /*return*/, res.json()];
            }
        });
    });
}
var TOP6 = ["GB", "FR", "DE", "ES", "RU", "CN"];
var LANG_KEYS = ["Fr", "En", "Es", "De", "Pt", "Zh", "Ar", "Ru", "It", "Nl"];
var LANG_TAGS = {
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
var OVERRIDES = {
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
var slug = function (s) { return s.normalize("NFC").replace(/\u2019/g, "'"); };
function readCountries(inputPath) {
    if (inputPath === void 0) { inputPath = "src/data/countries.ts"; }
    var ts = node_fs_1.default.readFileSync(inputPath, "utf-8");
    // Quick+safe extraction of the array literal
    var arrStart = ts.indexOf("[", ts.indexOf("export const countriesData"));
    var arrEnd = ts.indexOf("];", arrStart);
    var arrayLiteral = ts.slice(arrStart, arrEnd + 1);
    // Very light parser: split top-level objects — works with the project's file format
    var items = [];
    var level = 0, buf = "";
    for (var _i = 0, arrayLiteral_1 = arrayLiteral; _i < arrayLiteral_1.length; _i++) {
        var ch = arrayLiteral_1[_i];
        buf += ch;
        if (ch === "{")
            level++;
        if (ch === "}") {
            level--;
            if (level === 0) {
                var start = buf.indexOf("{");
                items.push(buf.slice(start).trim());
                buf = "";
            }
        }
    }
    var rows = items.map(function (obj) {
        var get = function (k) {
            var m = obj.match(new RegExp("".concat(k, ":\\s*\"([^\"]*)\""), "m"));
            return m ? m[1] : "";
        };
        var num = function (k) {
            var m = obj.match(new RegExp("".concat(k, ":\\s*(\\d+)"), "m"));
            return m ? Number(m[1]) : undefined;
        };
        var bool = function (k) {
            var m = obj.match(new RegExp("".concat(k, ":\\s*(true|false)"), "m"));
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
function fetchDemonymsByAlpha2() {
    return __awaiter(this, void 0, void 0, function () {
        var query, json, rows, out, _loop_1, _i, rows_1, r;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    query = "\n  SELECT ?alpha2 ?lang ?gentile WHERE {\n    ?country wdt:P297 ?alpha2 .\n    ?country p:P1549 ?stmt .\n    ?stmt ps:P1549 ?gentile .\n    BIND(LANG(?gentile) AS ?lang)\n    FILTER(?lang IN (\"fr\",\"en\",\"es\",\"de\",\"pt\",\"zh\",\"ar\",\"ru\",\"it\",\"nl\"))\n  }";
                    return [4 /*yield*/, sparql(query)];
                case 1:
                    json = _b.sent();
                    rows = json.results.bindings;
                    out = {};
                    _loop_1 = function (r) {
                        var code = r.alpha2.value.toUpperCase();
                        var langTag = r.lang.value;
                        var entry = out[code] || (out[code] = {});
                        var langKey = (((_a = Object.entries(LANG_TAGS).find(function (_a) {
                            var tag = _a[1];
                            return tag === langTag;
                        })) === null || _a === void 0 ? void 0 : _a[0]) || "En");
                        // Prefer the first seen; keep the shortest neutral-looking variant
                        var v = slug(r.gentile.value);
                        var existing = entry[langKey];
                        if (!existing || v.length < existing.length)
                            entry[langKey] = v;
                    };
                    for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                        r = rows_1[_i];
                        _loop_1(r);
                    }
                    return [2 /*return*/, out];
            }
        });
    });
}
function merge(countries, demonyms) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    var results = [];
    for (var _i = 0, countries_1 = countries; _i < countries_1.length; _i++) {
        var c = countries_1[_i];
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
        var base = demonyms[c.code] || {};
        var override = OVERRIDES[c.code] || {};
        // Build per-language values with sensible fallbacks:
        // 1) override
        // 2) wikidata demonym
        // 3) country name in that language
        var natFr = (_b = (_a = override.Fr) !== null && _a !== void 0 ? _a : base.Fr) !== null && _b !== void 0 ? _b : c.nameFr;
        var natEn = (_d = (_c = override.En) !== null && _c !== void 0 ? _c : base.En) !== null && _d !== void 0 ? _d : c.nameEn;
        var natEs = (_f = (_e = override.Es) !== null && _e !== void 0 ? _e : base.Es) !== null && _f !== void 0 ? _f : c.nameEs;
        var natDe = (_h = (_g = override.De) !== null && _g !== void 0 ? _g : base.De) !== null && _h !== void 0 ? _h : c.nameDe;
        var natPt = (_k = (_j = override.Pt) !== null && _j !== void 0 ? _j : base.Pt) !== null && _k !== void 0 ? _k : c.namePt;
        var natZh = (_m = (_l = override.Zh) !== null && _l !== void 0 ? _l : base.Zh) !== null && _m !== void 0 ? _m : c.nameZh;
        var natAr = (_p = (_o = override.Ar) !== null && _o !== void 0 ? _o : base.Ar) !== null && _p !== void 0 ? _p : c.nameAr;
        var natRu = (_r = (_q = override.Ru) !== null && _q !== void 0 ? _q : base.Ru) !== null && _r !== void 0 ? _r : c.nameRu;
        var natIt = (_t = (_s = override.It) !== null && _s !== void 0 ? _s : base.It) !== null && _t !== void 0 ? _t : c.nameIt;
        var natNl = (_v = (_u = override.Nl) !== null && _u !== void 0 ? _u : base.Nl) !== null && _v !== void 0 ? _v : c.nameNl;
        results.push({
            code: c.code,
            natFr: natFr,
            natEn: natEn,
            natEs: natEs,
            natDe: natDe,
            natPt: natPt,
            natZh: natZh,
            natAr: natAr,
            natRu: natRu,
            natIt: natIt,
            natNl: natNl,
            priority: c.priority,
            disabled: c.disabled,
        });
    }
    return results;
}
function toTS(rows) {
    var header = "// ========================================\n// src/data/nationalities.ts - AUTO-GENERATED \u2014 10 LANGUES\n// Source: Wikidata (P1549) + overrides \u2014 Do not edit by hand\n// ========================================\n\nexport interface NationalityData {\n  code: string;\n  natFr: string;    // Fran\u00E7ais\n  natEn: string;    // English\n  natEs: string;    // Espa\u00F1ol\n  natDe: string;    // Deutsch\n  natPt: string;    // Portugu\u00EAs\n  natZh: string;    // \u4E2D\u6587\n  natAr: string;    // \u0627\u0644\u0639\u0631\u0628\u064A\u0629\n  natRu: string;    // \u0420\u0443\u0441\u0441\u043A\u0438\u0439\n  natIt: string;    // Italiano\n  natNl: string;    // Nederlands\n  priority?: number;\n  disabled?: boolean;\n}\n\nexport const nationalitiesData: NationalityData[] = [\n";
    var escape = function (s) { return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'); };
    var body = rows.map(function (r) {
        var _a;
        if (r.code === "SEPARATOR") {
            return "  { code: \"SEPARATOR\", natFr: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natEn: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natEs: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natDe: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natPt: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natZh: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natAr: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natRu: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natIt: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", natNl: \"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\", priority: ".concat((_a = r.priority) !== null && _a !== void 0 ? _a : 2, ", disabled: true },");
        }
        var prio = r.priority != null ? ", priority: ".concat(r.priority) : "";
        var dis = r.disabled ? ", disabled: true" : "";
        return "  { code: \"".concat(r.code, "\", natFr: \"").concat(escape(r.natFr), "\", natEn: \"").concat(escape(r.natEn), "\", natEs: \"").concat(escape(r.natEs), "\", natDe: \"").concat(escape(r.natDe), "\", natPt: \"").concat(escape(r.natPt), "\", natZh: \"").concat(escape(r.natZh), "\", natAr: \"").concat(escape(r.natAr), "\", natRu: \"").concat(escape(r.natRu), "\", natIt: \"").concat(escape(r.natIt), "\", natNl: \"").concat(escape(r.natNl), "\"").concat(prio).concat(dis, " },");
    }).join("\n");
    var footer = "\n];\n\nexport type NationalityCode = Exclude<typeof nationalitiesData[number]['code'], 'SEPARATOR'>;\n";
    return header + body + footer;
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var projectRoot, srcCountries, outPath, countries, demonyms, rows, seen, _i, TOP6_1, t;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    projectRoot = process.cwd();
                    srcCountries = node_path_1.default.join(projectRoot, "src/data/countries.ts");
                    outPath = node_path_1.default.join(projectRoot, "src/data/nationalities.ts");
                    if (!node_fs_1.default.existsSync(srcCountries)) {
                        console.error("❌ Not found:", srcCountries);
                        console.error("Tip: run this from the project root where src/data/countries.ts exists.");
                        process.exit(1);
                    }
                    console.log("⏳ Reading countries:", srcCountries);
                    countries = readCountries(srcCountries);
                    console.log("🌐 Fetching demonyms from Wikidata…");
                    return [4 /*yield*/, fetchDemonymsByAlpha2()];
                case 1:
                    demonyms = _a.sent();
                    console.log("🔗 Merging + applying overrides…");
                    rows = merge(countries, demonyms);
                    seen = new Set(rows.map(function (r) { return r.code; }));
                    for (_i = 0, TOP6_1 = TOP6; _i < TOP6_1.length; _i++) {
                        t = TOP6_1[_i];
                        if (!seen.has(t)) {
                            console.warn("⚠️ Missing TOP6 code in countries.ts:", t);
                        }
                    }
                    console.log("📝 Writing:", outPath);
                    node_fs_1.default.mkdirSync(node_path_1.default.dirname(outPath), { recursive: true });
                    node_fs_1.default.writeFileSync(outPath, toTS(rows), "utf-8");
                    console.log("✅ Done. nationalities.ts generated.");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
});
