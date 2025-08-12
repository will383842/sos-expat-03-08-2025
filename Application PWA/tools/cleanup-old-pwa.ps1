# Script PowerShell pour nettoyer l'ancienne PWA
Write-Host "🧹 Nettoyage de l'ancienne PWA SOS Expat..." -ForegroundColor Cyan

# Rechercher et supprimer les fichiers PWA existants
$filesToFind = @(
    "manifest.json",
    "sw.js", 
    "service-worker.js",
    "pwa-sw.js"
)

$foldersToSearch = @(".", "public", "assets", "static")

foreach ($folder in $foldersToSearch) {
    if (Test-Path $folder) {
        foreach ($file in $filesToFind) {
            $fullPath = Join-Path $folder $file
            if (Test-Path $fullPath) {
                Write-Host "🗑️  Fichier trouvé: $fullPath" -ForegroundColor Yellow
                $response = Read-Host "Supprimer ce fichier ? (y/N)"
                if ($response -eq "y" -or $response -eq "Y") {
                    Remove-Item $fullPath -Force
                    Write-Host "✅ Supprimé: $fullPath" -ForegroundColor Green
                }
            }
        }
    }
}

# Rechercher dans les fichiers HTML
Write-Host "`n🔍 Recherche de références PWA dans les fichiers HTML..." -ForegroundColor Cyan

$htmlFiles = Get-ChildItem -Path . -Filter "*.html" -Recurse -ErrorAction SilentlyContinue

foreach ($htmlFile in $htmlFiles) {
    $content = Get-Content $htmlFile.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "manifest\.json|beforeinstallprompt|serviceWorker|pwa") {
        Write-Host "📄 Références PWA trouvées dans: $($htmlFile.FullName)" -ForegroundColor Yellow
    }
}

# Rechercher dans les fichiers JavaScript
Write-Host "`n🔍 Recherche de code PWA dans les fichiers JavaScript..." -ForegroundColor Cyan

$jsFiles = Get-ChildItem -Path . -Filter "*.js" -Recurse -ErrorAction SilentlyContinue

foreach ($jsFile in $jsFiles) {
    $content = Get-Content $jsFile.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "beforeinstallprompt|deferredPrompt|serviceWorker\.register") {
        Write-Host "📄 Code PWA trouvé dans: $($jsFile.FullName)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Analyse terminée!" -ForegroundColor Green
Write-Host "💡 Vérifiez manuellement les fichiers listés ci-dessus" -ForegroundColor Cyan
