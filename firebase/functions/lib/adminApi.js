"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const StripeManager_1 = require("./StripeManager");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
function pctChange(curr, prev) {
    if (!prev)
        return 100;
    return ((curr - prev) / prev) * 100;
}
exports.api = (0, https_1.onRequest)({ region: 'europe-west1', cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        // Préflight CORS
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'GET');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send('');
            return; // ✅ Retour explicite void
        }
        res.set('Access-Control-Allow-Origin', '*');
        const path = req.path.replace(/\/+$/, ''); // trim trailing /
        const now = Date.now();
        const d30 = admin.firestore.Timestamp.fromDate(new Date(now - 30 * 864e5));
        const prevStart = admin.firestore.Timestamp.fromDate(new Date(now - 60 * 864e5));
        const prevEnd = admin.firestore.Timestamp.fromDate(new Date(now - 30 * 864e5));
        if (path === '/api/admin/financial-stats') {
            // Stats 30 derniers jours
            const curr = await StripeManager_1.stripeManager.getPaymentStatistics({ startDate: d30 });
            // Période précédente
            const prev = await StripeManager_1.stripeManager.getPaymentStatistics({ startDate: prevStart, endDate: prevEnd });
            // "Transactions actives" = paiements non finalisés récents
            const pendingSnap = await db.collection('payments')
                .where('createdAt', '>=', d30)
                .where('status', 'in', ['pending', 'authorized', 'requires_capture', 'processing'])
                .get();
            const monthlyRevenue = curr.totalAmountEuros; // déjà en euros
            const totalCommissions = (curr.totalCommission / 100); // convertir en €
            const activeTransactions = pendingSnap.size;
            const conversionRate = curr.paymentCount ? (curr.successfulPayments / curr.paymentCount) * 100 : 0;
            res.json({
                monthlyRevenue,
                totalCommissions,
                activeTransactions,
                conversionRate,
                changes: {
                    revenue: pctChange(curr.totalAmountEuros, prev.totalAmountEuros || 0),
                    commissions: pctChange(curr.totalCommission, prev.totalCommission || 0),
                    transactions: pctChange(activeTransactions, 0), // simple, faute d'historique
                    conversion: pctChange(conversionRate, 0),
                },
            });
            return; // ✅ Retour explicite void
        }
        if (path === '/api/admin/last-modifications') {
            // On prend des timestamps simples et lisibles
            const pricingDoc = await db.doc('admin_config/pricing').get().catch(() => null);
            const lastPayment = await db.collection('payments')
                .orderBy('updatedAt', 'desc').limit(1).get().catch(() => null);
            const lastAnalytics = await db.collection('call_sessions')
                .orderBy('updatedAt', 'desc').limit(1).get().catch(() => null);
            const fmt = (ts) => ts ? ts.toDate().toISOString() : 'N/A';
            res.json({
                pricing: fmt((_a = pricingDoc === null || pricingDoc === void 0 ? void 0 : pricingDoc.updateTime) !== null && _a !== void 0 ? _a : pricingDoc === null || pricingDoc === void 0 ? void 0 : pricingDoc.get('updatedAt')),
                commissions: fmt(((_b = lastPayment === null || lastPayment === void 0 ? void 0 : lastPayment.docs[0]) === null || _b === void 0 ? void 0 : _b.get('updatedAt')) || ((_c = lastPayment === null || lastPayment === void 0 ? void 0 : lastPayment.docs[0]) === null || _c === void 0 ? void 0 : _c.get('createdAt'))),
                analytics: fmt(((_d = lastAnalytics === null || lastAnalytics === void 0 ? void 0 : lastAnalytics.docs[0]) === null || _d === void 0 ? void 0 : _d.get('updatedAt')) || ((_e = lastAnalytics === null || lastAnalytics === void 0 ? void 0 : lastAnalytics.docs[0]) === null || _e === void 0 ? void 0 : _e.get('createdAt'))),
            });
            return; // ✅ Retour explicite void
        }
        if (path === '/api/admin/system-status') {
            const t0 = Date.now();
            await db.collection('users').limit(1).get(); // simple ping Firestore
            const latency = Date.now() - t0;
            res.json({
                api: 'online',
                database: latency < 250 ? 'optimal' : latency < 1000 ? 'slow' : 'error',
                cache: 'inactive',
                lastCheck: new Date().toISOString(),
            });
            return; // ✅ Retour explicite void
        }
        res.status(404).json({ error: 'Not found' });
        return; // ✅ Retour explicite void
    }
    catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'Internal error';
        res.status(500).json({ error: errorMessage });
        return; // ✅ Retour explicite void
    }
});
//# sourceMappingURL=adminApi.js.map