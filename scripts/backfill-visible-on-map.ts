import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

(async () => {
  const snap = await db.collection('sos_profiles').get();
  const batch = db.batch();
  let count = 0;
  snap.forEach(docSnap => {
    const data = docSnap.data() || {};
    if (data.isVisibleOnMap === undefined) {
      batch.update(docSnap.ref, { isVisibleOnMap: true });
      count++;
    }
  });
  if (count > 0) await batch.commit();
  console.log(`Backfill terminé. Profils mis à jour: ${count}`);
})();

