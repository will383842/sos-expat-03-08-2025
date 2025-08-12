# 📱 Guide d'Installation - SOS Expat PWA

## 🎯 Objectif
Transformer votre site web SOS Expat en une Progressive Web App (PWA) complète.

## 🛠️ Prérequis

### Serveur Web
- ✅ **HTTPS obligatoire** (certificat SSL)
- ✅ Serveur web (Apache, Nginx, IIS, etc.)
- ✅ Accès aux fichiers racine du site

### Outils de développement
- ✅ Navigateur moderne (Chrome, Firefox, Safari, Edge)
- ✅ Éditeur de code (VS Code recommandé)
- ✅ [Optionnel] ImageMagick pour générer les icônes
- ✅ [Optionnel] Node.js pour les outils de test

## 📋 Checklist d'installation

### Étape 1: Préparer les fichiers
- [ ] Copier `manifest.json` vers la racine du site
- [ ] Copier `sw.js` vers la racine du site  
- [ ] Copier `offline.html` vers la racine du site
- [ ] Copier `browserconfig.xml` vers la racine du site
- [ ] Créer le dossier `/icons/` et y placer toutes les icônes
- [ ] Créer le dossier `/splash/` et y placer les écrans de démarrage

### Étape 2: Modifier votre HTML
Ajouter dans le `<head>` de TOUTES vos pages :

```html
<!-- PWA MANIFEST -->
<link rel="manifest" href="/manifest.json">

<!-- THEME COLOR -->
<meta name="theme-color" content="#dc2626">

<!-- APPLE PWA SUPPORT -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SOS Expat">
<link rel="apple-touch-icon" href="/icons/icon-180x180.png">

<!-- STANDARD ICONS -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
<link rel="shortcut icon" href="/favicon.ico">
```

### Étape 3: Intégrer le JavaScript PWA
Copier le script PWA depuis `templates/complete-pwa-template.html` dans vos pages.

### Étape 4: Générer les icônes
```powershell
# Si vous avez ImageMagick installé :
.\tools\generate-icons.ps1 -SourceImage "votre-logo-512x512.png"

# Sinon, utilisez un service en ligne :
# https://realfavicongenerator.net/
```

### Étape 5: Personnaliser
- [ ] Remplacer `+33 X XX XX XX XX` par votre vrai numéro
- [ ] Modifier les couleurs dans `manifest.json`
- [ ] Ajuster le nom de l'app dans `manifest.json`
- [ ] Personnaliser la page `offline.html`

## 🧪 Test et validation

### Test local
```bash
# Serveur local simple
python -m http.server 8000
# ou
npx serve .
```

### Validation PWA
1. Ouvrir Chrome DevTools (F12)
2. Onglet "Application" > "Manifest"
3. Vérifier que tout est correct
4. Onglet "Lighthouse" > "Generate report" > Cocher "Progressive Web App"

### Test d'installation
1. Ouvrir votre site sur mobile
2. Vérifier l'apparition de la bannière d'installation
3. Installer l'app
4. Tester en mode hors ligne

## 🚀 Déploiement en production

### Configuration serveur
```apache
# Apache .htaccess
<IfModule mod_headers.c>
    # Service Worker avec bon Content-Type
    <Files "sw.js">
        Header set Content-Type "application/javascript"
        Header set Cache-Control "no-cache"
    </Files>
    
    # Manifest avec bon Content-Type
    <Files "manifest.json">
        Header set Content-Type "application/manifest+json"
    </Files>
</IfModule>
```

```nginx
# Nginx
location /sw.js {
    add_header Content-Type application/javascript;
    add_header Cache-Control "no-cache";
}

location /manifest.json {
    add_header Content-Type application/manifest+json;
}
```

### Vérifications finales
- [ ] HTTPS activé et fonctionnel
- [ ] Tous les fichiers accessibles
- [ ] Service Worker s'enregistre sans erreur
- [ ] Manifest valide
- [ ] Installation possible sur mobile
- [ ] Mode hors ligne fonctionnel

## 🐛 Dépannage

### Problèmes courants

**L'installation n'apparaît pas :**
- Vérifiez HTTPS
- Vérifiez que le manifest est accessible
- Vérifiez que le Service Worker s'enregistre

**Mode hors ligne ne fonctionne pas :**
- Vérifiez les URLs dans le Service Worker
- Vérifiez la console pour les erreurs
- Testez la page offline.html directement

**Icônes ne s'affichent pas :**
- Vérifiez les chemins dans le manifest
- Vérifiez que les fichiers existent
- Vérifiez les tailles déclarées

### Outils de debug
```javascript
// Dans la console du navigateur
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));

// Vérifier le manifest
fetch('/manifest.json').then(r => r.json()).then(console.log);

// Forcer la mise à jour du SW
navigator.serviceWorker.getRegistration().then(reg => reg.update());
```

## 📞 Support
Si vous rencontrez des problèmes, n'hésitez pas à :
- Vérifier la console du navigateur (F12)
- Tester avec Lighthouse
- Consulter la documentation MDN sur les PWA

---

🆘 **Bonne chance avec votre PWA SOS Expat !**
