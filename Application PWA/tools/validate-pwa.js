// Script de validation PWA pour SOS Expat
console.log("🔍 Validation PWA SOS Expat...");

const checks = {
    manifest: false,
    serviceWorker: false,
    https: false,
    icons: false,
    offline: false
};

// 1. Vérifier le manifest
fetch('/manifest.json')
    .then(response => response.json())
    .then(manifest => {
        checks.manifest = true;
        console.log("✅ Manifest trouvé:", manifest.name);
        
        // Vérifier les icônes du manifest
        if (manifest.icons && manifest.icons.length > 0) {
            checks.icons = true;
            console.log(`✅ ${manifest.icons.length} icônes déclarées`);
        }
    })
    .catch(err => {
        console.error("❌ Manifest non trouvé:", err);
    });

// 2. Vérifier le Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration()
        .then(registration => {
            if (registration) {
                checks.serviceWorker = true;
                console.log("✅ Service Worker enregistré");
            } else {
                console.error("❌ Service Worker non enregistré");
            }
        });
} else {
    console.error("❌ Service Worker non supporté");
}

// 3. Vérifier HTTPS
if (location.protocol === 'https:' || location.hostname === 'localhost') {
    checks.https = true;
    console.log("✅ HTTPS activé");
} else {
    console.error("❌ HTTPS requis pour les PWA");
}

// 4. Vérifier la page offline
fetch('/offline.html')
    .then(response => {
        if (response.ok) {
            checks.offline = true;
            console.log("✅ Page offline disponible");
        }
    })
    .catch(err => {
        console.error("❌ Page offline non trouvée");
    });

// 5. Résumé après 2 secondes
setTimeout(() => {
    console.log("\n📊 === RÉSUMÉ VALIDATION PWA ===");
    
    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    
    Object.entries(checks).forEach(([check, status]) => {
        console.log(`${status ? '✅' : '❌'} ${check}`);
    });
    
    console.log(`\n🎯 Score: ${passed}/${total}`);
    
    if (passed === total) {
        console.log("🎉 PWA prête pour la production!");
    } else {
        console.log("⚠️  Corrections nécessaires avant déploiement");
    }
    
    // Recommandations
    console.log("\n💡 RECOMMANDATIONS:");
    if (!checks.manifest) console.log("- Ajouter le fichier manifest.json");
    if (!checks.serviceWorker) console.log("- Enregistrer le Service Worker");
    if (!checks.https) console.log("- Activer HTTPS");
    if (!checks.icons) console.log("- Ajouter des icônes PWA");
    if (!checks.offline) console.log("- Créer une page offline.html");
}, 2000);
