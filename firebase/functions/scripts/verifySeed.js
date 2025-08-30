const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

const saPath = path.resolve(__dirname, "..", "..", "serviceAccount.json");
if (!fs.existsSync(saPath)) {
  console.error("❌ serviceAccount.json introuvable:", saPath);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
const db = admin.firestore();

(async () => {
  try {
    // 1) Routing/config
    const routingRef = db.collection("message_routing").doc("config");
    const routingSnap = await routingRef.get();
    console.log("message_routing/config:", routingSnap.exists ? "✅ existe" : "❌ absent");

    // 2) Templates FR
    const frSnap = await db.collection("message_templates").doc("fr-FR").collection("items").limit(5).get();
    console.log(`message_templates/fr-FR/items: ${frSnap.size} docs (aperçu max 5)`);
    frSnap.forEach(d => console.log("  -", d.id));

    // 3) Templates EN
    const enSnap = await db.collection("message_templates").doc("en").collection("items").limit(5).get();
    console.log(`message_templates/en/items: ${enSnap.size} docs (aperçu max 5)`);
    enSnap.forEach(d => console.log("  -", d.id));

    process.exit(0);
  } catch (e) {
    console.error("❌ Vérif échouée:", e);
    process.exit(1);
  }
})();
