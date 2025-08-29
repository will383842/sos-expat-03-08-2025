const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: applicationDefault() }); // utilise tes identifiants gcloud locaux
const db = getFirestore();

const [,, id, toNumber, fromNumber, delaySeconds = "0"] = process.argv;

if (!id || !toNumber) {
  console.error("Usage: node createCallSession.js <id> <toNumber> [fromNumber] [delaySeconds]");
  process.exit(1);
}

const data = { toNumber, status: "scheduled" };
if (fromNumber) data.fromNumber = fromNumber;
const d = parseInt(delaySeconds, 10);
if (!Number.isNaN(d)) data.delaySeconds = d;

db.collection("callSessions").doc(id).set(data)
  .then(() => { console.log("created", id, data); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
