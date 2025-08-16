// scripts/generate-env-files.cjs
const fs = require("fs");
const path = require("path");

// Config commune pour Dev & Prod
const envConfig = `
# 🔥 FIREBASE (pour le frontend Vite)
VITE_FIREBASE_API_KEY=AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8
VITE_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sos-urgently-ac307
VITE_FIREBASE_STORAGE_BUCKET=sos-urgently-ac307.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=268195823113
VITE_FIREBASE_APP_ID=1:268195823113:web:10bf2e5bacdc1816f182d8

# 💳 STRIPE (clé publique pour Stripe Elements)
VITE_STRIPE_PUBLIC_KEY=pk_test_51RFHjpDF7L3utQbN7DNWM0zdUWGuwmwTvRLP0GhXYVbpQIzDDEfb7RFjDs9egAN7BYhyvX3JCQMtK3CliZFAI3ew00jhRzLul2
`.trim() + "\n";

const rootDir = process.cwd();

// Sauvegarde de l'ancien .env
const oldEnvPath = path.join(rootDir, ".env");
if (fs.existsSync(oldEnvPath)) {
  const backupPath = path.join(rootDir, `.env.backup-${Date.now()}`);
  fs.renameSync(oldEnvPath, backupPath);
  console.log(`💾 Ancien .env sauvegardé sous : ${backupPath}`);
}

// Création .env.development
fs.writeFileSync(path.join(rootDir, ".env.development"), envConfig);
console.log("✅ Fichier .env.development créé");

// Création .env.production
fs.writeFileSync(path.join(rootDir, ".env.production"), envConfig);
console.log("✅ Fichier .env.production créé");

console.log("\n🚀 Configuration prête !");
