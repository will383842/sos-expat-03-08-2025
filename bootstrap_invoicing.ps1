# ================================================
#  bootstrap_invoicing.ps1 - SOS Expat
#  Met en place TOUT le plan (création, suppression, modifs, deps, déploiement)
#  Exécuter en PowerShell 7.x ou Windows PowerShell 5.1
# ================================================

$ErrorActionPreference = "Stop"
$projectRoot = "C:\Users\willi\Downloads\Plateforme web SOS Expat"

Write-Host "➡️  Projet: $projectRoot" -ForegroundColor Cyan
if (-not (Test-Path $projectRoot)) {
  throw "Le dossier projet n'existe pas: $projectRoot"
}
Set-Location $projectRoot

# --- Helpers
function Ensure-Dir($path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path | Out-Null
  }
}
function Safe-Remove($path) {
  if (Test-Path $path)) {
    Write-Host "🗑️  Suppression: $path"
    Remove-Item -Recurse -Force $path
  } else {
    Write-Host "ℹ️  Absent (ok): $path"
  }
}
function Safe-ReplaceInFile($path, $pattern, $replacement) {
  if (-not (Test-Path $path)) { Write-Host "⚠️  Fichier introuvable: $path" -ForegroundColor Yellow; return $false }
  $content = Get-Content $path -Raw -ErrorAction Stop
  $new = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement, 'Singleline')
  if ($new -ne $content) {
    Set-Content -Path $path -Value $new -Encoding UTF8
    Write-Host "✏️  Patch appliqué: $path"
    return $true
  } else {
    Write-Host "ℹ️  Aucun remplacement dans: $path"
    return $false
  }
}
function Safe-AppendOnce($path, $marker, $block) {
  if (-not (Test-Path $path)) { Write-Host "⚠️  Fichier introuvable (création vide): $path" -ForegroundColor Yellow; Set-Content $path "" }
  $content = Get-Content $path -Raw
  if ($content -match [Regex]::Escape($marker)) {
    Write-Host "ℹ️  Bloc déjà présent: $path"
  } else {
    Add-Content -Path $path -Value "`r`n$marker`r`n$block"
    Write-Host "➕ Bloc ajouté dans: $path"
  }
}

# --- 0) Vérifs mini
if (-not (Test-Path "firebase.json")) {
  Write-Host "⚠️  firebase.json introuvable à la racine. Je continue, mais le déploiement échouera sans un projet Firebase." -ForegroundColor Yellow
}

# --- 1) Nettoyage
$obsolete = @(
  "src/pages/PaymentSuccess copy.tsx",
  "firebase/functions/src/utils/generateInvoice.ts",
  "firebase/functions/lib/utils/generateInvoice.js",
  "#", "({", "{",
  "firebase/functions/src_backup",
  "firebase/functions/backups"
)
foreach ($p in $obsolete) { Safe-Remove (Join-Path $projectRoot $p) }

# --- 2) Arborescence
$functionsDir = Join-Path $projectRoot "firebase\functions"
$srcDir       = Join-Path $functionsDir "src"
$invDir       = Join-Path $srcDir "invoices"
Ensure-Dir $functionsDir
Ensure-Dir $srcDir
Ensure-Dir $invDir

# --- 3) Dépendances
Push-Location $functionsDir
if (-not (Test-Path "package.json")) {
  Write-Host "⚠️  Pas de package.json dans firebase/functions. Je lance 'npm init -y'." -ForegroundColor Yellow
  npm init -y | Out-Null
}
npm install pdfkit fontkit --save
npm install @types/pdfkit --save-dev
Pop-Location

# --- 4) pdf.ts
$pdfTsPath = Join-Path $invDir "pdf.ts"
$pdfTs = @"
import PDFDocument from 'pdfkit';

export type Party = 'platform'|'provider';

export interface PdfAmounts {
  amountHT: number; amountTVA: number; amountTTC: number;
  vatRate: number; currency: string;
}
export interface PdfInput {
  invoiceNumber: string;
  type: Party;
  locale: 'fr-FR'|'en-US';
  issueDate: Date;
  call: { id: string; durationSec: number; serviceType: string; clientId: string; providerId: string; };
  issuer: { name: string; address?: string; vatNumber?: string; siret?: string };
  billTo: { name: string; address?: string; vatNumber?: string };
  amounts: PdfAmounts;
}

export async function renderInvoicePDF(input: PdfInput): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: any[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 80).fill('#297fb9');
    doc.fillColor('#fff').fontSize(20).text('FACTURE', 40, 30);
    doc.fontSize(10).text(`N° ${input.invoiceNumber}`, 40, 55);

    doc.fillColor('#000').moveDown().fontSize(12);
    doc.text(`Émise le : ${input.issueDate.toLocaleDateString(input.locale)}`);
    doc.text(`Appel : ${input.call.id} — Durée : ${Math.floor(input.call.durationSec/60)}m ${input.call.durationSec%60}s`);
    doc.text(`Type : ${input.call.serviceType}`);

    doc.moveDown().fontSize(11).text(`Émetteur : ${input.issuer.name}`);
    if (input.issuer.vatNumber) doc.text(`TVA : ${input.issuer.vatNumber}`);
    if (input.issuer.siret) doc.text(`SIRET : ${input.issuer.siret}`);

    doc.moveDown().fontSize(11).text(`Facturé à : ${input.billTo.name}`);

    const { amountHT, amountTVA, amountTTC, vatRate, currency } = input.amounts;
    doc.moveDown().fontSize(12)
      .text(`Sous-total (HT) : ${amountHT.toFixed(2)} ${currency}`)
      .text(`TVA (${vatRate}%) : ${amountTVA.toFixed(2)} ${currency}`)
      .text(`TOTAL TTC : ${amountTTC.toFixed(2)} ${currency}`, { underline: true });

    doc.moveDown().fontSize(8)
      .text('Paiement CB via plateforme sécurisée.')
      .text('Si micro-entreprise : "TVA non applicable, art. 293 B du CGI".');

    doc.end();
  });
}
"@
Set-Content -Path $pdfTsPath -Value $pdfTs -Encoding UTF8
Write-Host "✅ Créé: $pdfTsPath"

# --- 5) generateInvoicesForSession.ts
$genPath = Join-Path $invDir "generateInvoicesForSession.ts"
$genTs = @"
import * as admin from 'firebase-admin';
import { renderInvoicePDF } from './pdf';

const db = admin.firestore();
const storage = admin.storage();

export async function generateInvoicesForSession(sessionId: string) {
  const snap = await db.collection('call_sessions').doc(sessionId).get();
  if (!snap.exists) throw new Error(`call_sessions/${sessionId} introuvable`);
  const s: any = snap.data();

  const duration = Number(s?.conference?.duration || 0);
  if (duration < 120) throw new Error('Durée insuffisante (< 120 s)');
  if ((s?.payment?.status || '') !== 'captured') throw new Error('Paiement non capturé');

  const currency = (s?.payment?.currency || 'EUR').toUpperCase();
  const amountTTC = +(Number(s?.payment?.amount || 0)).toFixed(2);
  const vatRate = 20;
  const amountHT = +(amountTTC / (1 + vatRate/100)).toFixed(2);
  const amountTVA = +(amountTTC - amountHT).toFixed(2);

  const year = new Date().getFullYear();
  const counterRef = db.doc(`counters/invoices-${year}`);
  const counterSnap = await counterRef.get();
  let seq = (counterSnap.exists ? (counterSnap.data() as any).seq : 0) + 1;
  await counterRef.set({ seq: seq + 1 }, { merge: true });

  const pad = (n:number)=> String(n).padStart(6,'0');
  const numPlatform = `${year}-${pad(seq)}`;
  const numProvider = `${year}-${pad(seq+1)}`;

  const base = {
    issueDate: new Date(),
    call: { id: sessionId, durationSec: duration, serviceType: s?.metadata?.serviceType || 'call',
            clientId: s?.metadata?.clientId, providerId: s?.metadata?.providerId },
    amounts: { amountHT, amountTVA, amountTTC, vatRate, currency },
    locale: 'fr-FR' as const
  };

  const issuerPlatform = { name: 'SOS Expat' };
  const clientName = s?.metadata?.clientName || s?.metadata?.clientId || 'Client';
  const providerName = s?.metadata?.providerName || s?.metadata?.providerId || 'Prestataire';

  const pBuf = await renderInvoicePDF({
    invoiceNumber: numPlatform, type: 'platform', issuer: issuerPlatform,
    billTo: { name: clientName }, ...base
  });
  const pPath = `invoices/${year}/${numPlatform}.pdf`;
  await storage.bucket().file(pPath).save(pBuf, { contentType: 'application/pdf' });
  const [pUrl] = await storage.bucket().file(pPath).getSignedUrl({ action: 'read', expires: Date.now()+1000*60*60*24*365 });

  const rBuf = await renderInvoicePDF({
    invoiceNumber: numProvider, type: 'provider', issuer: { name: providerName },
    billTo: { name: clientName }, ...base
  });
  const rPath = `invoices/${year}/${numProvider}.pdf`;
  await storage.bucket().file(rPath).save(rBuf, { contentType: 'application/pdf' });
  const [rUrl] = await storage.bucket().file(rPath).getSignedUrl({ action: 'read', expires: Date.now()+1000*60*60*24*365 });

  const invoices = db.collection('invoices');
  await invoices.add({
    invoiceNumber: numPlatform, type: 'platform', callId: sessionId,
    clientId: s?.metadata?.clientId, providerId: s?.metadata?.providerId,
    amountHT, amountTVA, amountTTC, vatRate, currency,
    downloadUrl: pUrl, status: 'issued', createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  await invoices.add({
    invoiceNumber: numProvider, type: 'provider', callId: sessionId,
    clientId: s?.metadata?.clientId, providerId: s?.metadata?.providerId,
    amountHT, amountTVA, amountTTC, vatRate, currency,
    downloadUrl: rUrl, status: 'issued', createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('admin_invoices').add({
    callId: sessionId,
    clientData: { name: clientName },
    providerData: { name: providerName },
    financialData: { totalAmount: amountTTC, currency },
    invoices: { platform: { url: pUrl, number: numPlatform }, provider: { url: rUrl, number: numProvider } },
    metadata: { generatedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'issued' }
  });

  await db.collection('call_sessions').doc(sessionId).update({
    'metadata.invoicing': { status: 'issued', numbers: { platform: numPlatform, provider: numProvider } },
    'metadata.updatedAt': admin.firestore.FieldValue.serverTimestamp()
  });

  return { numPlatform, numProvider, pUrl, rUrl };
}
"@
Set-Content -Path $genPath -Value $genTs -Encoding UTF8
Write-Host "✅ Créé: $genPath"

# --- 6) Patch TwilioCallManager.ts
$twilioMgr = Join-Path $srcDir "TwilioCallManager.ts"
if (Test-Path $twilioMgr) {
  Safe-ReplaceInFile $twilioMgr "from 'firebase-admin';" "from 'firebase-admin';`r`nimport { generateInvoicesForSession } from './invoices/generateInvoicesForSession';" | Out-Null
  Safe-ReplaceInFile $twilioMgr "captureResult\.success\)\s*\{" "captureResult.success) {`r`n      try { await generateInvoicesForSession(sessionId); } catch (e) { console.error('Invoice gen error', e); }" | Out-Null
} else {
  Write-Host "ℹ️  TwilioCallManager.ts non trouvé (ok selon ton arborescence), fais ce patch manuellement si besoin."
}

# --- 7) Webhook conférence
$webhookFile = Join-Path $srcDir "Webhooks\TwilioConferenceWebhook.ts"
if (Test-Path $webhookFile) {
  Safe-ReplaceInFile $webhookFile "const\s+duration\s*=\s*.*?;" "const durationStr = (body as any).ConferenceDuration || (body as any).Duration || '0';`r`nconst duration = parseInt(String(durationStr), 10) || 0;" | Out-Null
  $marker = "// __INVOICE_SKIP_LT_120__"
  $skipBlock = @"
// __INVOICE_SKIP_LT_120__
if (duration < 120) {
  await admin.firestore().collection('call_sessions').doc(sessionId).update({
    'metadata.invoicing': { status: 'skipped', reason: 'duration_lt_120' }
  });
}
"@
  Safe-AppendOnce $webhookFile $marker $skipBlock
} else {
  Write-Host "ℹ️  TwilioConferenceWebhook.ts non trouvé (ok selon ton arborescence)."
}

# --- 8) Règles Firestore & Storage
$fsRules = Join-Path $projectRoot "firestore.rules"
$stRules = Join-Path $projectRoot "storage.rules"

$fsMarker = "// ==== INVOICES RULES (SOS EXPAT) ===="
$fsBlock = @"
match /databases/{database}/documents {
  match /invoices/{invoiceId} {
    allow read: if request.auth != null && (
      request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.providerId
    ) || isAdmin();
    allow create, update, delete: if isAdmin();
  }
  match /admin_invoices/{docId} {
    allow read, create, update, delete: if isAdmin();
  }
}
"@
Safe-AppendOnce $fsRules $fsMarker $fsBlock

$stMarker = "// ==== INVOICES STORAGE RULES (SOS EXPAT) ===="
$stBlock = @"
match /b/{bucket}/o {
  match /invoices/{year}/{fileName} {
    allow read: if isAdmin();
    allow write, delete: if isAdmin();
  }
}
"@
Safe-AppendOnce $stRules $stMarker $stBlock

# --- 9) Patch UserInvoices.tsx
$uiCandidates = Get-ChildItem -Path (Join-Path $projectRoot "src") -Recurse -Filter "UserInvoices.tsx" -ErrorAction SilentlyContinue
foreach ($f in $uiCandidates) {
  Safe-ReplaceInFile $f.FullName "collection\(\s*db\s*,\s*'invoice_records'\s*\)" "collection(db, 'invoices')" | Out-Null
  Safe-ReplaceInFile $f.FullName "invoice\.amount" "(invoice.amountTTC ?? invoice.amount)" | Out-Null
  Safe-ReplaceInFile $f.FullName "new Date\(\s*invoice\.createdAt\.seconds\s*\*\s*1000\s*\)" "(invoice.createdAt?.toDate?.() ?? new Date(invoice.createdAt))" | Out-Null
}

# --- 10) Patch invoiceGenerator.ts
$svcCandidates = Get-ChildItem -Path (Join-Path $projectRoot "src") -Recurse -Filter "invoiceGenerator.ts" -ErrorAction SilentlyContinue
foreach ($f in $svcCandidates) {
  $marker = "// __SERVER_IS_SOURCE_OF_TRUTH__"
  $block = @"
// __SERVER_IS_SOURCE_OF_TRUTH__
// Les uploads vers Storage et écritures Firestore ont été désactivés côté client.
// L'émission officielle se fait côté serveur (Cloud Functions) après l'appel.
"@
  Safe-AppendOnce $f.FullName $marker $block
  Safe-ReplaceInFile $f.FullName "await\s+uploadBytes\([^\)]*\);\s*" "" | Out-Null
  Safe-ReplaceInFile $f.FullName "await\s+addDoc\([^\)]*\);\s*" "" | Out-Null
  Safe-ReplaceInFile $f.FullName "getDownloadURL\([^\)]*\)" "/* download url côté serveur */ null as any" | Out-Null
}

# --- 11) Build & Deploy
if (Test-Path (Join-Path $functionsDir "tsconfig.json")) {
  Push-Location $functionsDir
  if (Test-Path "package.json")) {}
  if (Test-Path "package.json") {
    try { npm run build | Out-Null } catch { Write-Host "ℹ️  npm run build a échoué (je continue)" -ForegroundColor Yellow }
  }
  Pop-Location
}

Write-Host "🚀 Déploiement Firebase..." -ForegroundColor Cyan
try {
  firebase deploy --only firestore:rules,storage,functions
} catch {
  Write-Host "⚠️  Échec du déploiement Firebase: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "Vérifie 'firebase.json' et 'firebase use <id_projet>' puis relance."
}

Write-Host "`n✅ Terminé. Vérifie:" -ForegroundColor Green
Write-Host " - Firestore: 'invoices' et 'admin_invoices' après un appel facturable"
Write-Host " - Storage: PDFs dans 'invoices/<year>/*.pdf'"
Write-Host " - Front: client voit 2 factures, prestataire voit la sienne"
