const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

admin.initializeApp({
  credential: applicationDefault(),
  projectId: 'sos-urgently-ac307',
});

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node grant-admin.js user@example.com');
    process.exit(1);
  }
  const user = await admin.auth().getUserByEmail(email);
  const oldClaims = user.customClaims || {};
  await admin.auth().setCustomUserClaims(user.uid, { ...oldClaims, role: 'admin' });
  console.log(`OK: ${email} (${user.uid}) a maintenant role=admin`);
})();
