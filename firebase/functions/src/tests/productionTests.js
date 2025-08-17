"use strict";
// firebase/functions/src/tests/productionTests.ts
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
exports.runCriticalTests = runCriticalTests;
exports.runIntegrationTest = runIntegrationTest;
exports.runPerformanceTest = runPerformanceTest;
exports.runAllProductionTests = runAllProductionTests;
var paymentValidators_1 = require("../utils/paymentValidators");
// Couleurs pour la console
var colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};
/**
 * Helper pour afficher les résultats
 */
function logTest(name, passed, details) {
    var status = passed ? "".concat(colors.green, "\u2705 PASS").concat(colors.reset) : "".concat(colors.red, "\u274C FAIL").concat(colors.reset);
    console.log("  ".concat(status, " ").concat(name));
    if (details) {
        console.log("      ".concat(colors.cyan, "\u2192 ").concat(details).concat(colors.reset));
    }
}
/**
 * Test unitaire avec gestion d'erreur
 */
function runTest(name, testFn) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, testFn()];
                case 1:
                    _a.sent();
                    logTest(name, true);
                    return [2 /*return*/, true];
                case 2:
                    error_1 = _a.sent();
                    logTest(name, false, error_1 instanceof Error ? error_1.message : String(error_1));
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Suite de tests critiques pour la production avec multi-devises
 */
function runCriticalTests() {
    return __awaiter(this, void 0, void 0, function () {
        var results, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, passed, failed, total, allPassed;
        var _this = this;
        return __generator(this, function (_22) {
            switch (_22.label) {
                case 0:
                    console.log("\n".concat(colors.bright).concat(colors.blue, "\uD83E\uDDEA TESTS CRITIQUES DE PRODUCTION (MULTI-DEVISES)").concat(colors.reset, "\n"));
                    results = [];
                    // =====================================
                    // 1. TESTS DE CONVERSION EUR
                    // =====================================
                    console.log("".concat(colors.yellow, "\uD83D\uDCCA Tests de Conversion EUR (Euros/Centimes):").concat(colors.reset));
                    _b = (_a = results).push;
                    return [4 /*yield*/, runTest('Conversion 49€ → 4900 centimes', function () {
                            var cents = (0, paymentValidators_1.toCents)(49, 'eur');
                            if (cents !== 4900)
                                throw new Error("Expected 4900, got ".concat(cents));
                        })];
                case 1:
                    _b.apply(_a, [_22.sent()]);
                    _d = (_c = results).push;
                    return [4 /*yield*/, runTest('Conversion 19€ → 1900 centimes', function () {
                            var cents = (0, paymentValidators_1.toCents)(19, 'eur');
                            if (cents !== 1900)
                                throw new Error("Expected 1900, got ".concat(cents));
                        })];
                case 2:
                    _d.apply(_c, [_22.sent()]);
                    _f = (_e = results).push;
                    return [4 /*yield*/, runTest('Conversion inverse 4900 → 49€', function () {
                            var euros = (0, paymentValidators_1.fromCents)(4900, 'eur');
                            if (euros !== 49)
                                throw new Error("Expected 49, got ".concat(euros));
                        })];
                case 3:
                    _f.apply(_e, [_22.sent()]);
                    // =====================================
                    // 2. TESTS DE CONVERSION USD  
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDCB2 Tests de Conversion USD (Dollars/Cents):").concat(colors.reset));
                    _h = (_g = results).push;
                    return [4 /*yield*/, runTest('Conversion 55$ → 5500 cents', function () {
                            var cents = (0, paymentValidators_1.toCents)(55, 'usd');
                            if (cents !== 5500)
                                throw new Error("Expected 5500, got ".concat(cents));
                        })];
                case 4:
                    _h.apply(_g, [_22.sent()]);
                    _k = (_j = results).push;
                    return [4 /*yield*/, runTest('Conversion 25$ → 2500 cents', function () {
                            var cents = (0, paymentValidators_1.toCents)(25, 'usd');
                            if (cents !== 2500)
                                throw new Error("Expected 2500, got ".concat(cents));
                        })];
                case 5:
                    _k.apply(_j, [_22.sent()]);
                    _m = (_l = results).push;
                    return [4 /*yield*/, runTest('Conversion inverse 5500 → 55$', function () {
                            var dollars = (0, paymentValidators_1.fromCents)(5500, 'usd');
                            if (dollars !== 55)
                                throw new Error("Expected 55, got ".concat(dollars));
                        })];
                case 6:
                    _m.apply(_l, [_22.sent()]);
                    // =====================================
                    // 3. TESTS DE VALIDATION EUR
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDCB0 Tests de Validation EUR:").concat(colors.reset));
                    _p = (_o = results).push;
                    return [4 /*yield*/, runTest('Montant avocat valide EUR (49€)', function () {
                            var result = (0, paymentValidators_1.validateAmount)(49, 'lawyer', 'eur');
                            if (!result.valid)
                                throw new Error(result.error);
                        })];
                case 7:
                    _p.apply(_o, [_22.sent()]);
                    _r = (_q = results).push;
                    return [4 /*yield*/, runTest('Montant expat valide EUR (19€)', function () {
                            var result = (0, paymentValidators_1.validateAmount)(19, 'expat', 'eur');
                            if (!result.valid)
                                throw new Error(result.error);
                        })];
                case 8:
                    _r.apply(_q, [_22.sent()]);
                    // ⚠️ Ce test suppose un warning si l’écart dépasse la TOLERANCE.
                    _t = (_s = results).push;
                    return [4 /*yield*/, runTest('Montant avec warning EUR (55€ pour avocat)', function () {
                            var result = (0, paymentValidators_1.validateAmount)(55, 'lawyer', 'eur');
                            if (!result.valid)
                                throw new Error('Should be valid with warning');
                            if (!result.warning)
                                throw new Error('Should have warning');
                        })];
                case 9:
                    // ⚠️ Ce test suppose un warning si l’écart dépasse la TOLERANCE.
                    _t.apply(_s, [_22.sent()]);
                    // =====================================
                    // 4. TESTS DE VALIDATION USD
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDCB2 Tests de Validation USD:").concat(colors.reset));
                    _v = (_u = results).push;
                    return [4 /*yield*/, runTest('Montant avocat valide USD (55$)', function () {
                            var result = (0, paymentValidators_1.validateAmount)(55, 'lawyer', 'usd');
                            if (!result.valid)
                                throw new Error(result.error);
                        })];
                case 10:
                    _v.apply(_u, [_22.sent()]);
                    _x = (_w = results).push;
                    return [4 /*yield*/, runTest('Montant expat valide USD (25$)', function () {
                            var result = (0, paymentValidators_1.validateAmount)(25, 'expat', 'usd');
                            if (!result.valid)
                                throw new Error(result.error);
                        })];
                case 11:
                    _x.apply(_w, [_22.sent()]);
                    _z = (_y = results).push;
                    return [4 /*yield*/, runTest('Montant avec warning USD (70$ pour avocat)', function () {
                            var result = (0, paymentValidators_1.validateAmount)(70, 'lawyer', 'usd');
                            if (!result.valid)
                                throw new Error('Should be valid with warning');
                            if (!result.warning)
                                throw new Error('Should have warning');
                        })];
                case 12:
                    _z.apply(_y, [_22.sent()]);
                    // =====================================
                    // 5. TESTS DE RÉPARTITION EUR (Frais Fixes)
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDD04 Tests de R\u00E9partition EUR (Frais Fixes):").concat(colors.reset));
                    _1 = (_0 = results).push;
                    return [4 /*yield*/, runTest('Répartition avocat 49€ (19€ frais fixes)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var split;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(49, 'lawyer', 'eur')];
                                    case 1:
                                        split = _a.sent();
                                        if (split.connectionFeeAmount !== 19)
                                            throw new Error("Frais: expected 19\u20AC, got ".concat(split.connectionFeeAmount, "\u20AC"));
                                        if (split.providerAmount !== 30)
                                            throw new Error("Provider: expected 30\u20AC, got ".concat(split.providerAmount, "\u20AC"));
                                        if (!split.isValid)
                                            throw new Error('Split should be valid');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 13:
                    _1.apply(_0, [_22.sent()]);
                    _3 = (_2 = results).push;
                    return [4 /*yield*/, runTest('Répartition expat 19€ (9€ frais fixes)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var split;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(19, 'expat', 'eur')];
                                    case 1:
                                        split = _a.sent();
                                        if (split.connectionFeeAmount !== 9)
                                            throw new Error("Frais: expected 9\u20AC, got ".concat(split.connectionFeeAmount, "\u20AC"));
                                        if (split.providerAmount !== 10)
                                            throw new Error("Provider: expected 10\u20AC, got ".concat(split.providerAmount, "\u20AC"));
                                        if (!split.isValid)
                                            throw new Error('Split should be valid');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 14:
                    _3.apply(_2, [_22.sent()]);
                    // =====================================
                    // 6. TESTS DE RÉPARTITION USD (Frais Fixes)
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDCB2 Tests de R\u00E9partition USD (Frais Fixes):").concat(colors.reset));
                    _5 = (_4 = results).push;
                    return [4 /*yield*/, runTest('Répartition avocat 55$ (25$ frais fixes)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var split;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(55, 'lawyer', 'usd')];
                                    case 1:
                                        split = _a.sent();
                                        if (split.connectionFeeAmount !== 25)
                                            throw new Error("Frais: expected 25$, got ".concat(split.connectionFeeAmount, "$"));
                                        if (split.providerAmount !== 30)
                                            throw new Error("Provider: expected 30$, got ".concat(split.providerAmount, "$"));
                                        if (!split.isValid)
                                            throw new Error('Split should be valid');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 15:
                    _5.apply(_4, [_22.sent()]);
                    _7 = (_6 = results).push;
                    return [4 /*yield*/, runTest('Répartition expat 25$ (15$ frais fixes)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var split;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(25, 'expat', 'usd')];
                                    case 1:
                                        split = _a.sent();
                                        if (split.connectionFeeAmount !== 15)
                                            throw new Error("Frais: expected 15$, got ".concat(split.connectionFeeAmount, "$"));
                                        if (split.providerAmount !== 10)
                                            throw new Error("Provider: expected 10$, got ".concat(split.providerAmount, "$"));
                                        if (!split.isValid)
                                            throw new Error('Split should be valid');
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 16:
                    _7.apply(_6, [_22.sent()]);
                    // =====================================
                    // 7. TESTS DE FORMATAGE
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDCDD Tests de Formatage:").concat(colors.reset));
                    _9 = (_8 = results).push;
                    return [4 /*yield*/, runTest('Format 49€', function () {
                            var formatted = (0, paymentValidators_1.formatAmount)(49, 'eur');
                            if (!formatted.includes('49') || !formatted.includes('€')) {
                                throw new Error("Invalid format: ".concat(formatted));
                            }
                        })];
                case 17:
                    _9.apply(_8, [_22.sent()]);
                    _11 = (_10 = results).push;
                    return [4 /*yield*/, runTest('Format 55$', function () {
                            var formatted = (0, paymentValidators_1.formatAmount)(55, 'usd');
                            if (!formatted.includes('55') || !formatted.includes('$')) {
                                throw new Error("Invalid format: ".concat(formatted));
                            }
                        })];
                case 18:
                    _11.apply(_10, [_22.sent()]);
                    // =====================================
                    // 8. TESTS ANTI-FRAUDE MULTI-DEVISES
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDD12 Tests Anti-Fraude Multi-devises:").concat(colors.reset));
                    _13 = (_12 = results).push;
                    return [4 /*yield*/, runTest('Montant normal EUR non suspect', function () {
                            var result = (0, paymentValidators_1.isSuspiciousAmount)(49, 'lawyer', 'eur');
                            if (result.suspicious)
                                throw new Error("Should not be suspicious: ".concat(result.reasons.join(', ')));
                        })];
                case 19:
                    _13.apply(_12, [_22.sent()]);
                    _15 = (_14 = results).push;
                    return [4 /*yield*/, runTest('Montant normal USD non suspect', function () {
                            var result = (0, paymentValidators_1.isSuspiciousAmount)(55, 'lawyer', 'usd');
                            if (result.suspicious)
                                throw new Error("Should not be suspicious: ".concat(result.reasons.join(', ')));
                        })];
                case 20:
                    _15.apply(_14, [_22.sent()]);
                    _17 = (_16 = results).push;
                    return [4 /*yield*/, runTest('Montant très différent USD suspect', function () {
                            var result = (0, paymentValidators_1.isSuspiciousAmount)(100, 'lawyer', 'usd'); // 55$ attendu
                            if (!result.suspicious)
                                throw new Error('Should detect large deviation');
                        })];
                case 21:
                    _17.apply(_16, [_22.sent()]);
                    // =====================================
                    // 9. TESTS COMPATIBILITÉ ANCIENNES FONCTIONS
                    // =====================================
                    console.log("\n".concat(colors.yellow, "\uD83D\uDD04 Tests Compatibilit\u00E9 (anciennes fonctions):").concat(colors.reset));
                    _19 = (_18 = results).push;
                    return [4 /*yield*/, runTest('eurosToCents compatibilité', function () {
                            var cents = (0, paymentValidators_1.eurosToCents)(49);
                            if (cents !== 4900)
                                throw new Error("Expected 4900, got ".concat(cents));
                        })];
                case 22:
                    _19.apply(_18, [_22.sent()]);
                    _21 = (_20 = results).push;
                    return [4 /*yield*/, runTest('centsToEuros compatibilité', function () {
                            var euros = (0, paymentValidators_1.centsToEuros)(4900);
                            if (euros !== 49)
                                throw new Error("Expected 49, got ".concat(euros));
                        })];
                case 23:
                    _21.apply(_20, [_22.sent()]);
                    passed = results.filter(function (r) { return r; }).length;
                    failed = results.filter(function (r) { return !r; }).length;
                    total = results.length;
                    allPassed = failed === 0;
                    console.log("\n".concat(colors.bright).concat('='.repeat(50)).concat(colors.reset));
                    console.log("".concat(colors.bright, "\uD83D\uDCCA R\u00C9SUM\u00C9 DES TESTS MULTI-DEVISES").concat(colors.reset));
                    console.log("".concat(colors.bright).concat('='.repeat(50)).concat(colors.reset));
                    console.log("  ".concat(colors.green, "\u2705 R\u00E9ussis: ").concat(passed, "/").concat(total).concat(colors.reset));
                    if (failed > 0) {
                        console.log("  ".concat(colors.red, "\u274C \u00C9chou\u00E9s: ").concat(failed, "/").concat(total).concat(colors.reset));
                    }
                    console.log("".concat(colors.bright).concat('='.repeat(50)).concat(colors.reset, "\n"));
                    if (allPassed) {
                        console.log("".concat(colors.green).concat(colors.bright, "\uD83C\uDF89 TOUS LES TESTS MULTI-DEVISES SONT PASS\u00C9S ! Le syst\u00E8me EUR/USD est pr\u00EAt pour la production.").concat(colors.reset, "\n"));
                    }
                    else {
                        console.log("".concat(colors.red).concat(colors.bright, "\u26A0\uFE0F ATTENTION : ").concat(failed, " test(s) ont \u00E9chou\u00E9. Corrigez les erreurs avant la mise en production.").concat(colors.reset, "\n"));
                    }
                    return [2 /*return*/, allPassed];
            }
        });
    });
}
/**
 * TEST D'INTÉGRATION FRAIS FIXES (corrigé)
 */
function runIntegrationTest() {
    return __awaiter(this, void 0, void 0, function () {
        var validationEur, splitEur, validationUsd, splitUsd, splitExpatEur, splitExpatUsd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n".concat(colors.bright).concat(colors.blue, "\uD83D\uDD17 TEST D'INT\u00C9GRATION FRAIS FIXES").concat(colors.reset, "\n"));
                    // Simulation EUR
                    console.log('  Simulation paiement avocat EUR (49€)...');
                    return [4 /*yield*/, (0, paymentValidators_1.validateAmount)(49, 'lawyer', 'eur')];
                case 1:
                    validationEur = _a.sent();
                    if (!validationEur.valid) {
                        console.log("  ".concat(colors.red, "\u274C Validation EUR \u00E9chou\u00E9e: ").concat(validationEur.error).concat(colors.reset));
                        return [2 /*return*/];
                    }
                    console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " Montant EUR valid\u00E9"));
                    return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(49, 'lawyer', 'eur')];
                case 2:
                    splitEur = _a.sent();
                    console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " R\u00E9partition EUR:"));
                    console.log("     \u2022 Total: ".concat((0, paymentValidators_1.formatAmount)(splitEur.totalAmount, 'eur')));
                    console.log("     \u2022 Frais de mise en relation: ".concat((0, paymentValidators_1.formatAmount)(splitEur.connectionFeeAmount, 'eur')));
                    console.log("     \u2022 R\u00E9mun\u00E9ration prestataire: ".concat((0, paymentValidators_1.formatAmount)(splitEur.providerAmount, 'eur')));
                    // Simulation USD
                    console.log('\n  Simulation paiement avocat USD (55$)...');
                    return [4 /*yield*/, (0, paymentValidators_1.validateAmount)(55, 'lawyer', 'usd')];
                case 3:
                    validationUsd = _a.sent();
                    if (!validationUsd.valid) {
                        console.log("  ".concat(colors.red, "\u274C Validation USD \u00E9chou\u00E9e: ").concat(validationUsd.error).concat(colors.reset));
                        return [2 /*return*/];
                    }
                    console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " Montant USD valid\u00E9"));
                    return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(55, 'lawyer', 'usd')];
                case 4:
                    splitUsd = _a.sent();
                    console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " R\u00E9partition USD:"));
                    console.log("     \u2022 Total: ".concat((0, paymentValidators_1.formatAmount)(splitUsd.totalAmount, 'usd')));
                    console.log("     \u2022 Frais de mise en relation: ".concat((0, paymentValidators_1.formatAmount)(splitUsd.connectionFeeAmount, 'usd')));
                    console.log("     \u2022 R\u00E9mun\u00E9ration prestataire: ".concat((0, paymentValidators_1.formatAmount)(splitUsd.providerAmount, 'usd')));
                    // Test expat EUR
                    console.log('\n  Simulation paiement expat EUR (19€)...');
                    return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(19, 'expat', 'eur')];
                case 5:
                    splitExpatEur = _a.sent();
                    console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " R\u00E9partition Expat EUR:"));
                    console.log("     \u2022 Total: ".concat((0, paymentValidators_1.formatAmount)(splitExpatEur.totalAmount, 'eur')));
                    console.log("     \u2022 Frais de mise en relation: ".concat((0, paymentValidators_1.formatAmount)(splitExpatEur.connectionFeeAmount, 'eur')));
                    console.log("     \u2022 R\u00E9mun\u00E9ration prestataire: ".concat((0, paymentValidators_1.formatAmount)(splitExpatEur.providerAmount, 'eur')));
                    // Test expat USD
                    console.log('\n  Simulation paiement expat USD (25$)...');
                    return [4 /*yield*/, (0, paymentValidators_1.calculateSplit)(25, 'expat', 'usd')];
                case 6:
                    splitExpatUsd = _a.sent();
                    console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " R\u00E9partition Expat USD:"));
                    console.log("     \u2022 Total: ".concat((0, paymentValidators_1.formatAmount)(splitExpatUsd.totalAmount, 'usd')));
                    console.log("     \u2022 Frais de mise en relation: ".concat((0, paymentValidators_1.formatAmount)(splitExpatUsd.connectionFeeAmount, 'usd')));
                    console.log("     \u2022 R\u00E9mun\u00E9ration prestataire: ".concat((0, paymentValidators_1.formatAmount)(splitExpatUsd.providerAmount, 'usd')));
                    console.log("\n  ".concat(colors.green).concat(colors.bright, "\u2705 Parcours d'int\u00E9gration frais fixes compl\u00E9t\u00E9 avec succ\u00E8s").concat(colors.reset));
                    console.log("\n  ".concat(colors.cyan, "\uD83D\uDCCA R\u00E9sum\u00E9 des frais:").concat(colors.reset));
                    console.log("     \u2022 Avocat EUR: 19\u20AC de frais sur 49\u20AC (38.8%)");
                    console.log("     \u2022 Avocat USD: 25$ de frais sur 55$ (45.5%)");
                    console.log("     \u2022 Expat EUR: 9\u20AC de frais sur 19\u20AC (47.4%)");
                    console.log("     \u2022 Expat USD: 15$ de frais sur 25$ (60.0%)");
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Test de performance multi-devises
 */
function runPerformanceTest() {
    return __awaiter(this, void 0, void 0, function () {
        var iterations, start, i, amount, type, currency, duration, avgTime;
        return __generator(this, function (_a) {
            console.log("\n".concat(colors.bright).concat(colors.cyan, "\u26A1 TEST DE PERFORMANCE MULTI-DEVISES").concat(colors.reset, "\n"));
            iterations = 10000;
            console.log("  Ex\u00E9cution de ".concat(iterations, " calculs EUR et USD..."));
            start = Date.now();
            for (i = 0; i < iterations; i++) {
                amount = Math.random() * 100 + 5;
                type = i % 2 === 0 ? 'lawyer' : 'expat';
                currency = i % 2 === 0 ? 'eur' : 'usd';
                (0, paymentValidators_1.validateAmount)(amount, type, currency);
                (0, paymentValidators_1.calculateSplit)(amount, type, currency);
                (0, paymentValidators_1.toCents)(amount, currency);
                (0, paymentValidators_1.fromCents)(Math.round(amount * 100), currency);
            }
            duration = Date.now() - start;
            avgTime = duration / iterations;
            console.log("\n  ".concat(colors.green, "\u2705 Performance multi-devises:").concat(colors.reset));
            console.log("     \u2022 Dur\u00E9e totale: ".concat(duration, "ms"));
            console.log("     \u2022 Temps moyen par op\u00E9ration: ".concat(avgTime.toFixed(4), "ms"));
            console.log("     \u2022 Op\u00E9rations par seconde: ".concat(Math.round(1000 / avgTime)));
            if (avgTime > 1) {
                console.log("\n  ".concat(colors.yellow, "\u26A0\uFE0F Performance d\u00E9grad\u00E9e (>1ms par op\u00E9ration)").concat(colors.reset));
            }
            else {
                console.log("\n  ".concat(colors.green, "\u2705 Performance optimale").concat(colors.reset));
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Fonction principale pour lancer tous les tests multi-devises
 */
function runAllProductionTests() {
    return __awaiter(this, void 0, void 0, function () {
        var criticalTestsPassed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n".concat(colors.bright).concat('='.repeat(70)).concat(colors.reset));
                    console.log("".concat(colors.bright, "\uD83D\uDE80 SUITE COMPL\u00C8TE DE TESTS DE PRODUCTION MULTI-DEVISES").concat(colors.reset));
                    console.log("".concat(colors.bright).concat('='.repeat(70)).concat(colors.reset));
                    return [4 /*yield*/, runCriticalTests()];
                case 1:
                    criticalTestsPassed = _a.sent();
                    // Test de performance
                    return [4 /*yield*/, runPerformanceTest()];
                case 2:
                    // Test de performance
                    _a.sent();
                    // Test d'intégration
                    return [4 /*yield*/, runIntegrationTest()];
                case 3:
                    // Test d'intégration
                    _a.sent();
                    return [2 /*return*/, criticalTestsPassed];
            }
        });
    });
}
