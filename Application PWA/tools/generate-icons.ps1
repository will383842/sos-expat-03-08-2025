# Script PowerShell pour générer les icônes PWA
param(
    [Parameter(Mandatory=$true)]
    [string]$SourceImage,
    [string]$OutputDir = "public/icons"
)

Write-Host "🎨 Génération des icônes PWA pour SOS Expat..." -ForegroundColor Cyan

# Vérifier si ImageMagick est installé
try {
    & magick -version | Out-Null
    Write-Host "✅ ImageMagick détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ ImageMagick non trouvé. Installez-le depuis https://imagemagick.org/" -ForegroundColor Red
    Write-Host "💡 Alternative: Utilisez un service en ligne comme https://realfavicongenerator.net/" -ForegroundColor Yellow
    exit 1
}

# Créer le dossier de sortie
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Tailles d'icônes à générer
$iconSizes = @(
    @{size="16x16"; name="favicon-16x16.png"},
    @{size="32x32"; name="favicon-32x32.png"},
    @{size="57x57"; name="icon-57x57.png"},
    @{size="60x60"; name="icon-60x60.png"},
    @{size="70x70"; name="icon-70x70.png"},
    @{size="72x72"; name="icon-72x72.png"},
    @{size="76x76"; name="icon-76x76.png"},
    @{size="96x96"; name="icon-96x96.png"},
    @{size="114x114"; name="icon-114x114.png"},
    @{size="120x120"; name="icon-120x120.png"},
    @{size="128x128"; name="icon-128x128.png"},
    @{size="144x144"; name="icon-144x144.png"},
    @{size="150x150"; name="icon-150x150.png"},
    @{size="152x152"; name="icon-152x152.png"},
    @{size="180x180"; name="icon-180x180.png"},
    @{size="192x192"; name="icon-192x192.png"},
    @{size="310x150"; name="icon-310x150.png"},
    @{size="310x310"; name="icon-310x310.png"},
    @{size="384x384"; name="icon-384x384.png"},
    @{size="512x512"; name="icon-512x512.png"}
)

# Générer chaque icône
foreach ($icon in $iconSizes) {
    $outputPath = Join-Path $OutputDir $icon.name
    try {
        & magick $SourceImage -resize $icon.size $outputPath
        Write-Host "✅ $($icon.name) généré" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors de la génération de $($icon.name)" -ForegroundColor Red
    }
}

# Générer le favicon.ico
try {
    $faviconPath = Join-Path (Split-Path $OutputDir) "favicon.ico"
    & magick $SourceImage -resize 16x16 -resize 32x32 -resize 48x48 $faviconPath
    Write-Host "✅ favicon.ico généré" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la génération du favicon.ico" -ForegroundColor Red
}

Write-Host "🎉 Génération des icônes terminée!" -ForegroundColor Green
Write-Host "📁 Icônes sauvegardées dans: $OutputDir" -ForegroundColor Cyan
