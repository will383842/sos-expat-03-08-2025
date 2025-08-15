"use strict";
// firebase/functions/src/tests/productionTests.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCriticalTests = runCriticalTests;
exports.runPerformanceTest = runPerformanceTest;
exports.runIntegrationTest = runIntegrationTest;
exports.runAllProductionTests = runAllProductionTests;
const paymentValidators_1 = require("../utils/paymentValidators");
// Couleurs pour la console
const colors = {
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
    const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`  ${status} ${name}`);
    if (details) {
        console.log(`      ${colors.cyan}→ ${details}${colors.reset}`);
    }
}
/**
 * Test unitaire avec gestion d'erreur
 */
async function runTest(name, testFn) {
    try {
        await testFn();
        logTest(name, true);
        return true;
    }
    catch (error) {
        logTest(name, false, error instanceof Error ? error.message : String(error));
        return false;
    }
}
/**
 * Suite de tests critiques pour la production
 */
async function runCriticalTests() {
    console.log(`\n${colors.bright}${colors.blue}🧪 TESTS CRITIQUES DE PRODUCTION${colors.reset}\n`);
    const results = [];
    // =====================================
    // 1. TESTS DE CONVERSION
    // =====================================
    console.log(`${colors.yellow}📊 Tests de Conversion Euros/Centimes:${colors.reset}`);
    results.push(await runTest('Conversion 49€ → 4900 centimes', () => {
        const cents = (0, paymentValidators_1.eurosToCents)(49);
        if (cents !== 4900)
            throw new Error(`Expected 4900, got ${cents}`);
    }));
    results.push(await runTest('Conversion 19€ → 1900 centimes', () => {
        const cents = (0, paymentValidators_1.eurosToCents)(19);
        if (cents !== 1900)
            throw new Error(`Expected 1900, got ${cents}`);
    }));
    results.push(await runTest('Conversion inverse 4900 → 49€', () => {
        const euros = (0, paymentValidators_1.centsToEuros)(4900);
        if (euros !== 49)
            throw new Error(`Expected 49, got ${euros}`);
    }));
    results.push(await runTest('Arrondi 49.99€', () => {
        const cents = (0, paymentValidators_1.eurosToCents)(49.99);
        if (cents !== 4999)
            throw new Error(`Expected 4999, got ${cents}`);
    }));
    results.push(await runTest('Arrondi 49.999€', () => {
        const cents = (0, paymentValidators_1.eurosToCents)(49.999);
        if (cents !== 5000)
            throw new Error(`Expected 5000, got ${cents}`);
    }));
    // =====================================
    // 2. TESTS DE VALIDATION DES MONTANTS
    // =====================================
    console.log(`\n${colors.yellow}💰 Tests de Validation des Montants:${colors.reset}`);
    results.push(await runTest('Montant avocat valide (49€)', () => {
        const result = (0, paymentValidators_1.validateAmount)(49, 'lawyer');
        if (!result.valid)
            throw new Error(result.error);
    }));
    results.push(await runTest('Montant expat valide (19€)', () => {
        const result = (0, paymentValidators_1.validateAmount)(19, 'expat');
        if (!result.valid)
            throw new Error(result.error);
    }));
    results.push(await runTest('Montant trop bas (3€)', () => {
        const result = (0, paymentValidators_1.validateAmount)(3, 'lawyer');
        if (result.valid)
            throw new Error('Should reject amount below minimum');
    }));
    results.push(await runTest('Montant trop élevé (600€)', () => {
        const result = (0, paymentValidators_1.validateAmount)(600, 'expat');
        if (result.valid)
            throw new Error('Should reject amount above maximum');
    }));
    results.push(await runTest('Montant avec warning (55€ pour avocat)', () => {
        const result = (0, paymentValidators_1.validateAmount)(55, 'lawyer');
        if (!result.valid)
            throw new Error('Should be valid with warning');
        if (!result.warning)
            throw new Error('Should have warning');
    }));
    // =====================================
    // 3. TESTS DE RÉPARTITION
    // =====================================
    console.log(`\n${colors.yellow}🔄 Tests de Répartition Commission/Prestataire:${colors.reset}`);
    results.push(await runTest('Répartition avocat 49€ (20% commission)', () => {
        const split = (0, paymentValidators_1.calculateSplit)(49, 'lawyer');
        if (split.commissionEuros !== 9.8)
            throw new Error(`Commission: expected 9.8€, got ${split.commissionEuros}€`);
        if (split.providerEuros !== 39.2)
            throw new Error(`Provider: expected 39.2€, got ${split.providerEuros}€`);
        if (!split.isValid)
            throw new Error('Split should be valid');
    }));
    results.push(await runTest('Répartition expat 19€ (20% commission)', () => {
        const split = (0, paymentValidators_1.calculateSplit)(19, 'expat');
        if (split.commissionEuros !== 3.8)
            throw new Error(`Commission: expected 3.8€, got ${split.commissionEuros}€`);
        if (split.providerEuros !== 15.2)
            throw new Error(`Provider: expected 15.2€, got ${split.providerEuros}€`);
        if (!split.isValid)
            throw new Error('Split should be valid');
    }));
    results.push(await runTest('Validation répartition cohérente', () => {
        const result = (0, paymentValidators_1.validateSplit)(49, 9.8, 39.2);
        if (!result.valid)
            throw new Error(result.error);
    }));
    results.push(await runTest('Détection répartition incohérente', () => {
        const result = (0, paymentValidators_1.validateSplit)(49, 10, 40); // 50€ au total au lieu de 49€
        if (result.valid)
            throw new Error('Should detect incoherent split');
    }));
    // =====================================
    // 4. TESTS DE FORMATAGE
    // =====================================
    console.log(`\n${colors.yellow}📝 Tests de Formatage:${colors.reset}`);
    results.push(await runTest('Format 49€', () => {
        const formatted = (0, paymentValidators_1.formatEuros)(49);
        if (!formatted.includes('49') || !formatted.includes('€')) {
            throw new Error(`Invalid format: ${formatted}`);
        }
    }));
    results.push(await runTest('Format 49.99€', () => {
        const formatted = (0, paymentValidators_1.formatEuros)(49.99);
        if (!formatted.includes('49,99')) {
            throw new Error(`Invalid format: ${formatted}`);
        }
    }));
    // =====================================
    // 5. TESTS ANTI-FRAUDE
    // =====================================
    console.log(`\n${colors.yellow}🔒 Tests Anti-Fraude:${colors.reset}`);
    results.push(await runTest('Montant normal non suspect', () => {
        const result = (0, paymentValidators_1.isSuspiciousAmount)(49, 'lawyer');
        if (result.suspicious)
            throw new Error(`Should not be suspicious: ${result.reasons.join(', ')}`);
    }));
    results.push(await runTest('Montant avec trop de décimales suspect', () => {
        const result = (0, paymentValidators_1.isSuspiciousAmount)(49.99999, 'lawyer');
        if (!result.suspicious)
            throw new Error('Should detect too many decimals');
    }));
    results.push(await runTest('Montant très différent suspect', () => {
        const result = (0, paymentValidators_1.isSuspiciousAmount)(100, 'lawyer'); // 49€ attendu
        if (!result.suspicious)
            throw new Error('Should detect large deviation');
    }));
    // =====================================
    // 6. TESTS DE CAS LIMITES
    // =====================================
    console.log(`\n${colors.yellow}⚠️ Tests de Cas Limites:${colors.reset}`);
    results.push(await runTest('Montant négatif rejeté', () => {
        const result = (0, paymentValidators_1.validateAmount)(-10, 'lawyer');
        if (result.valid)
            throw new Error('Should reject negative amount');
    }));
    results.push(await runTest('Montant zéro rejeté', () => {
        const result = (0, paymentValidators_1.validateAmount)(0, 'expat');
        if (result.valid)
            throw new Error('Should reject zero amount');
    }));
    results.push(await runTest('Montant NaN rejeté', () => {
        try {
            (0, paymentValidators_1.eurosToCents)(NaN);
            throw new Error('Should throw on NaN');
        }
        catch (e) {
            if (e instanceof Error && !e.message.includes('invalide')) {
                throw e;
            }
        }
    }));
    results.push(await runTest('String converti en nombre rejeté', () => {
        try {
            (0, paymentValidators_1.eurosToCents)('49');
            // Si on arrive ici, le test échoue car on devrait avoir une erreur
            throw new Error('Should reject string input');
        }
        catch (e) {
            // C'est le comportement attendu
            if (e instanceof Error && e.message === 'Should reject string input') {
                throw e;
            }
            // Sinon c'est OK, on a bien eu une erreur
        }
    }));
    // =====================================
    // RÉSUMÉ
    // =====================================
    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;
    const total = results.length;
    const allPassed = failed === 0;
    console.log(`\n${colors.bright}${'='.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}📊 RÉSUMÉ DES TESTS${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}`);
    console.log(`  ${colors.green}✅ Réussis: ${passed}/${total}${colors.reset}`);
    if (failed > 0) {
        console.log(`  ${colors.red}❌ Échoués: ${failed}/${total}${colors.reset}`);
    }
    console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}\n`);
    if (allPassed) {
        console.log(`${colors.green}${colors.bright}🎉 TOUS LES TESTS SONT PASSÉS ! Le système est prêt pour la production.${colors.reset}\n`);
    }
    else {
        console.log(`${colors.red}${colors.bright}⚠️ ATTENTION : ${failed} test(s) ont échoué. Corrigez les erreurs avant la mise en production.${colors.reset}\n`);
    }
    return allPassed;
}
/**
 * Test de performance
 */
async function runPerformanceTest() {
    console.log(`\n${colors.bright}${colors.cyan}⚡ TEST DE PERFORMANCE${colors.reset}\n`);
    const iterations = 10000;
    console.log(`  Exécution de ${iterations} calculs...`);
    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
        const amount = Math.random() * 100 + 5;
        const type = i % 2 === 0 ? 'lawyer' : 'expat';
        (0, paymentValidators_1.validateAmount)(amount, type);
        (0, paymentValidators_1.calculateSplit)(amount, type);
        (0, paymentValidators_1.eurosToCents)(amount);
        (0, paymentValidators_1.centsToEuros)(Math.round(amount * 100));
    }
    const duration = Date.now() - start;
    const avgTime = duration / iterations;
    console.log(`\n  ${colors.green}✅ Performance:${colors.reset}`);
    console.log(`     • Durée totale: ${duration}ms`);
    console.log(`     • Temps moyen par opération: ${avgTime.toFixed(4)}ms`);
    console.log(`     • Opérations par seconde: ${Math.round(1000 / avgTime)}`);
    if (avgTime > 1) {
        console.log(`\n  ${colors.yellow}⚠️ Performance dégradée (>1ms par opération)${colors.reset}`);
    }
    else {
        console.log(`\n  ${colors.green}✅ Performance optimale${colors.reset}`);
    }
}
/**
 * Test d'intégration simulé
 */
async function runIntegrationTest() {
    console.log(`\n${colors.bright}${colors.blue}🔗 TEST D'INTÉGRATION${colors.reset}\n`);
    // Simulation d'un parcours complet
    console.log('  Simulation d\'un paiement avocat (49€)...');
    // 1. Validation du montant
    const validation = (0, paymentValidators_1.validateAmount)(49, 'lawyer');
    if (!validation.valid) {
        console.log(`  ${colors.red}❌ Validation échouée: ${validation.error}${colors.reset}`);
        return;
    }
    console.log(`  ${colors.green}✓${colors.reset} Montant validé`);
    // 2. Calcul de la répartition
    const split = (0, paymentValidators_1.calculateSplit)(49, 'lawyer');
    if (!split.isValid) {
        console.log(`  ${colors.red}❌ Répartition invalide${colors.reset}`);
        return;
    }
    console.log(`  ${colors.green}✓${colors.reset} Répartition calculée:`);
    console.log(`     • Total: ${(0, paymentValidators_1.formatEuros)(split.totalEuros)}`);
    console.log(`     • Commission: ${(0, paymentValidators_1.formatEuros)(split.commissionEuros)}`);
    console.log(`     • Prestataire: ${(0, paymentValidators_1.formatEuros)(split.providerEuros)}`);
    // 3. Conversion pour Stripe
    console.log(`  ${colors.green}✓${colors.reset} Conversion pour Stripe:`);
    console.log(`     • ${split.totalEuros}€ → ${split.totalCents} centimes`);
    // 4. Vérification anti-fraude
    const fraudCheck = (0, paymentValidators_1.isSuspiciousAmount)(49, 'lawyer');
    if (fraudCheck.suspicious) {
        console.log(`  ${colors.yellow}⚠️ Montant suspect: ${fraudCheck.reasons.join(', ')}${colors.reset}`);
    }
    else {
        console.log(`  ${colors.green}✓${colors.reset} Contrôle anti-fraude passé`);
    }
    console.log(`\n  ${colors.green}${colors.bright}✅ Parcours d'intégration complété avec succès${colors.reset}`);
}
/**
 * Fonction principale pour lancer tous les tests
 */
async function runAllProductionTests() {
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}🚀 SUITE COMPLÈTE DE TESTS DE PRODUCTION${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
    // Tests critiques
    const criticalTestsPassed = await runCriticalTests();
    // Test de performance
    await runPerformanceTest();
    // Test d'intégration
    await runIntegrationTest();
    return criticalTestsPassed;
}
//# sourceMappingURL=productionTests.js.map