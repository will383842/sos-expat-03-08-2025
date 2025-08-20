import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { stripeManager } from './StripeManager';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function pctChange(curr: number, prev: number) {
  if (!prev) return 100;
  return ((curr - prev) / prev) * 100;
}

export const api = onRequest({ region: 'europe-west1', cors: true }, async (req, res) => {
  try {
    // Préflight CORS
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }
    res.set('Access-Control-Allow-Origin', '*');

    const path = req.path.replace(/\/+$/, ''); // trim trailing /
    const now = Date.now();
    const d30 = admin.firestore.Timestamp.fromDate(new Date(now - 30 * 864e5));
    const prevStart = admin.firestore.Timestamp.fromDate(new Date(now - 60 * 864e5));
    const prevEnd = admin.firestore.Timestamp.fromDate(new Date(now - 30 * 864e5));

    if (path === '/api/admin/financial-stats') {
      // Stats 30 derniers jours
      const curr = await stripeManager.getPaymentStatistics({ startDate: d30 });
      // Période précédente
      const prev = await stripeManager.getPaymentStatistics({ startDate: prevStart, endDate: prevEnd });

      // "Transactions actives" = paiements non finalisés récents
      const pendingSnap = await db.collection('payments')
        .where('createdAt', '>=', d30)
        .where('status', 'in', ['pending', 'authorized', 'requires_capture', 'processing'])
        .get();

      const monthlyRevenue = curr.totalAmountEuros; // déjà en euros
      const totalCommissions = (curr.totalCommission / 100); // convertir en €
      const activeTransactions = pendingSnap.size;
      const conversionRate = curr.paymentCount ? (curr.successfulPayments / curr.paymentCount) * 100 : 0;

      return res.json({
        monthlyRevenue,
        totalCommissions,
        activeTransactions,
        conversionRate,
        changes: {
          revenue: pctChange(curr.totalAmountEuros, prev.totalAmountEuros || 0),
          commissions: pctChange(curr.totalCommission, prev.totalCommission || 0),
          transactions: pctChange(activeTransactions, 0), // simple, faute d’historique
          conversion: pctChange(conversionRate, 0),
        },
      });
    }

    if (path === '/api/admin/last-modifications') {
      // On prend des timestamps simples et lisibles
      const pricingDoc = await db.doc('admin_config/pricing').get().catch(() => null);

      const lastPayment = await db.collection('payments')
        .orderBy('updatedAt', 'desc').limit(1).get().catch(() => null);

      const lastAnalytics = await db.collection('call_sessions')
        .orderBy('updatedAt', 'desc').limit(1).get().catch(() => null);

      const fmt = (ts?: admin.firestore.Timestamp | null) =>
        ts ? ts.toDate().toISOString() : 'N/A';

      return res.json({
        pricing: fmt((pricingDoc?.updateTime as any) ?? pricingDoc?.get('updatedAt')),
        commissions: fmt(lastPayment?.docs[0]?.get('updatedAt') || lastPayment?.docs[0]?.get('createdAt')),
        analytics: fmt(lastAnalytics?.docs[0]?.get('updatedAt') || lastAnalytics?.docs[0]?.get('createdAt')),
      });
    }

    if (path === '/api/admin/system-status') {
      const t0 = Date.now();
      await db.collection('users').limit(1).get(); // simple ping Firestore
      const latency = Date.now() - t0;

      return res.json({
        api: 'online',
        database: latency < 250 ? 'optimal' : latency < 1000 ? 'slow' : 'error',
        cache: 'inactive',
        lastCheck: new Date().toISOString(),
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message ?? 'Internal error' });
  }
});
