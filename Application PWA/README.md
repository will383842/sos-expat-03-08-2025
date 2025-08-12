# 🆘 SOS Expat - Application PWA

## 📱 Progressive Web App pour l'assistance d'expatriés

Cette PWA fournit une assistance d'urgence 24/7 pour les expatriés français dans le monde entier.

## 🚀 Installation rapide

### 1. Copier les fichiers
Copiez tous les fichiers du dossier `public/` vers votre serveur web.

### 2. Intégrer le code
Utilisez le template dans `templates/complete-pwa-template.html` comme base.

### 3. Personnaliser
- Modifiez le numéro d'urgence dans tous les fichiers
- Ajustez les couleurs dans `manifest.json`
- Personnalisez les icônes dans le dossier `icons/`

## 📁 Structure des fichiers

```
public/
├── manifest.json          # Configuration PWA
├── sw.js                 # Service Worker
├── offline.html          # Page hors ligne
├── browserconfig.xml     # Support Microsoft
├── icons/               # Icônes PWA (à générer)
└── splash/              # Écrans de démarrage (à générer)
```

## ✅ Fonctionnalités PWA

- ✅ Installation sur écran d'accueil
- ✅ Fonctionnement hors ligne  
- ✅ Cache intelligent
- ✅ Notifications (prêt pour push)
- ✅ Support multi-navigateurs
- ✅ Responsive design

## 🔧 TODO

1. **Générer les icônes** : Créez toutes les tailles d'icônes requises
2. **Créer les splash screens** : Écrans de démarrage pour iOS
3. **Configurer HTTPS** : Obligatoire pour les PWA
4. **Tester** : Utilisez Lighthouse pour valider

## 📞 Support

**Numéro d'urgence :** +33 X XX XX XX XX (à remplacer par votre vrai numéro)

## 🛠️ Développement

- Testez localement avec `python -m http.server` ou un serveur local
- Utilisez Lighthouse pour auditer la PWA
- Testez sur différents appareils et navigateurs

## 📱 Installation utilisateur

1. Ouvrir le site sur mobile
2. Cliquer sur "Installer l'app" 
3. L'app apparaît sur l'écran d'accueil
4. Fonctionne hors ligne !

---

🆘 **SOS Expat** - Parce que l'aide ne devrait jamais être loin !
