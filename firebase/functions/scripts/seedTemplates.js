const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

// serviceAccount.json est dans: firebase/serviceAccount.json
// (__dirname = .../firebase/functions/scripts)
const saPath = path.resolve(__dirname, "..", "..", "serviceAccount.json");

if (!fs.existsSync(saPath)) {
  console.error("❌ serviceAccount.json introuvable à", saPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(saPath)),
});
const db = admin.firestore();

function loadJSON(p) {
  if (!fs.existsSync(p)) {
    throw new Error("Fichier introuvable: " + p);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Fix: forcer les objets simples
function plain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

(async () => {
  try {
    const assetsDir = path.resolve(__dirname, "..", "src", "assets");

    const routingPath = path.join(assetsDir, "sos-expat-message-routing.json");
    const frPath = path.join(assetsDir, "sos-expat-message-templates-fr.json");
    const enPath = path.join(assetsDir, "sos-expat-message-templates-en.json");

    const routing = loadJSON(routingPath);
    const fr = loadJSON(frPath);
    const en = loadJSON(enPath);

    // 1) Routing
    await db.collection("message_routing").doc("config").set(plain(routing), { merge: true });
    console.log("✅ routing written");

    // 2) Templates FR
    const frCol = db.collection("message_templates").doc("fr-FR").collection("items");
    for (const [eventId, doc] of Object.entries(fr)) {
      await frCol.doc(eventId).set(plain(doc), { merge: true });
    }
    console.log("✅ templates FR written");

    // 3) Templates EN
    const enCol = db.collection("message_templates").doc("en").collection("items");
    for (const [eventId, doc] of Object.entries(en)) {
      await enCol.doc(eventId).set(plain(doc), { merge: true });
    }
    console.log("✅ templates EN written");

    console.log("🎉 Seed complete");
    process.exit(0);
  } catch (e) {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  }
})();
