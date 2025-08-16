// switch-env.js
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { execSync } from "child_process";
import path from "path";

// ==== CONFIG ====
const MODE = process.argv[2]; // "dev" ou "prod"

if (!MODE || !["dev", "prod"].includes(MODE)) {
  console.error("❌ Utilisation : node switch-env.js dev|prod");
  process.exit(1);
}

console.log(`🔄 Bascule en mode: ${MODE.toUpperCase()}...`);

// ==== INIT FIREBASE ADMIN ====
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

(async () => {
  try {
    // 1️⃣ Mise à jour Firestore
    await db.collection("settings").doc("env").set({ mode: MODE });
    console.log(`✅ Firestore mis à jour avec mode="${MODE}"`);

    // 2️⃣ Déploiement des règles
    console.log("🚀 Déploiement des règles Storage & Firestore...");
    execSync("firebase deploy --only storage,firestore:rules", { stdio: "inherit" });

    console.log(`🎯 Mode ${MODE.toUpperCase()} activé avec succès.`);
  } catch (err) {
    console.error("❌ Erreur:", err);
  }
})();
