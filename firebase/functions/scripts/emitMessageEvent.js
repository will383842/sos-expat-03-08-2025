const admin = require("firebase-admin");
const path = require("path");

// Charge la clé de service localement (relative au dossier "firebase")
const saPath = path.resolve(__dirname, "../..", "serviceAccount.json");
const sa = require(saPath);

// Init Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id,
  });
}
const db = admin.firestore();

// Args rapides: -locale fr-FR|en, -to email
function readArg(name, def) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i+1]) return process.argv[i+1];
  return def;
}

(async () => {
  const locale = readArg("-locale", "fr-FR");  // "fr-FR" ou "en"
  const to = readArg("-to", "ton-email@test.com"); // remplace par ton email réel

  const doc = {
    eventId: "user.signup.success",
    uid: "TEST_UID",
    locale,
    context: {
      user: {
        email: to,
        firstName: locale === "fr-FR" ? "William" : "William",
        preferredLanguage: locale
      },
      payment: { amount: 2599, currency: "EUR" },
      request: { scheduledAt: "2025-09-01T10:00:00Z" }
    },
    createdAt: new Date().toISOString()
  };

  const ref = await db.collection("message_events").add(doc);
  console.log("✅ message_events doc added:", ref.id, "locale=", locale, "to=", to);
  process.exit(0);
})().catch(err => {
  console.error("❌ Failed to add test doc:", err);
  process.exit(1);
});
