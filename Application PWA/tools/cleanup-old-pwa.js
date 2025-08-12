// Script de nettoyage pour supprimer l'ancienne PWA
console.log("🧹 Nettoyage de l'ancienne PWA...");

// Supprimer les anciens éléments PWA
const oldSelectors = [
    '#install-banner', '#pwa-banner', '#add-to-home', '#install-prompt',
    '.pwa-install', '.install-banner', '.app-install', '.add-to-home',
    '[data-pwa]', '[data-install]', '[data-banner]'
];

oldSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        el.remove();
        console.log(`✅ Supprimé: ${selector}`);
    });
});

// Nettoyer le localStorage
Object.keys(localStorage).forEach(key => {
    if (key.includes('pwa') || key.includes('install') || key.includes('banner')) {
        localStorage.removeItem(key);
        console.log(`✅ Nettoyé localStorage: ${key}`);
    }
});

// Nettoyer le sessionStorage
Object.keys(sessionStorage).forEach(key => {
    if (key.includes('pwa') || key.includes('install') || key.includes('banner')) {
        sessionStorage.removeItem(key);
        console.log(`✅ Nettoyé sessionStorage: ${key}`);
    }
});

console.log("✅ Nettoyage terminé!");
