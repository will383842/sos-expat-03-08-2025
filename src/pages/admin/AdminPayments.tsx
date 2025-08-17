// src/pages/admin/AdminPayments.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  where,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import { RefreshCw, Search, CheckCircle, XCircle } from 'lucide-react';

type PaymentStatus = 'paid' | 'refunded' | 'failed' | 'pending';

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerId: string;
  providerName?: string;
  clientId: string;
  clientName?: string;
  createdAt: Date; // on normalise en Date pour l’UI
}

const PAGE_SIZE = 25;

const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [startDate, setStartDate] = useState<string>(''); // yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>(''); // yyyy-mm-dd
  const [search, setSearch] = useState<string>('');

  // Conversion sécurisée Date -> Timestamp (pour where)
  const startTs = useMemo(() => {
    if (!startDate) return undefined;
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return undefined;
    // début de journée
    d.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(d);
  }, [startDate]);

  const endTs = useMemo(() => {
    if (!endDate) return undefined;
    const d = new Date(endDate);
    if (Number.isNaN(d.getTime())) return undefined;
    // fin de journée
    d.setHours(23, 59, 59, 999);
    return Timestamp.fromDate(d);
  }, [endDate]);

  const mapSnapToPayment = (docSnap: QueryDocumentSnapshot<DocumentData>): PaymentRecord => {
    const data = docSnap.data() as {
      amount?: number;
      currency?: string;
      status?: PaymentStatus;
      providerId?: string;
      providerName?: string;
      clientId?: string;
      clientName?: string;
      createdAt?: Timestamp | Date;
    };

    // createdAt: on accepte Timestamp | Date | undefined
    let createdAtDate: Date = new Date();
    const val = data.createdAt;
    if (val instanceof Timestamp) {
      createdAtDate = val.toDate();
    } else if (val instanceof Date) {
      createdAtDate = val;
    }

    return {
      id: docSnap.id,
      amount: data.amount ?? 0,
      currency: data.currency ?? 'EUR',
      status: (data.status ?? 'pending') as PaymentStatus,
      providerId: data.providerId ?? '',
      providerName: data.providerName,
      clientId: data.clientId ?? '',
      clientName: data.clientName,
      createdAt: createdAtDate,
    };
  };

  const buildQuery = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      try {
        const colRef = collection(db, 'payments'); // adapte le nom si besoin
        const constraints: Parameters<typeof query>[1][] = [];

        // Filtres WHERE
        if (statusFilter !== 'all') {
          constraints.push(where('status', '==', statusFilter));
        }
        if (startTs) {
          constraints.push(where('createdAt', '>=', startTs));
        }
        if (endTs) {
          constraints.push(where('createdAt', '<=', endTs));
        }

        // Tri
        constraints.push(orderBy('createdAt', 'desc'));

        // Pagination
        if (!reset && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        // Limite
        constraints.push(limit(PAGE_SIZE));

        const q = query(colRef, ...constraints);
        const snap = await getDocs(q);

        const pageItems = snap.docs.map(mapSnapToPayment);
        setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);

        setHasMore(snap.docs.length === PAGE_SIZE);

        if (reset) {
          setPayments(pageItems);
        } else {
          setPayments((prev) => [...prev, ...pageItems]);
        }
      } catch (err) {
        console.error('Error loading payments:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, startTs, endTs, lastDoc]
  );

  // Chargement initial et à chaque changement de filtres
  useEffect(() => {
    // on remet la pagination à zéro quand les filtres changent
    setLastDoc(null);
    setHasMore(true);
    void buildQuery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, startTs, endTs]);

  const filteredBySearch = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return payments;
    return payments.filter((p) =>
      [p.id, p.providerId, p.providerName, p.clientId, p.clientName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [payments, search]);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Paiements</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void buildQuery(true)}>
              <RefreshCw size={16} className="mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
              >
                <option value="all">Tous</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
                <option value="failed">Échec</option>
                <option value="refunded">Remboursé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Du</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Au</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Recherche</label>
              <div className="flex">
                <input
                  className="flex-1 border rounded-l px-3 py-2"
                  placeholder="id / client / prestataire…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="border border-l-0 rounded-r px-3 py-2 grid place-items-center">
                  <Search size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  Date
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  Montant
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  Client
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  Prestataire
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBySearch.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {p.amount.toFixed(2)} {p.currency}
                  </td>
                  <td className="px-4 py-3">{p.clientName ?? p.clientId}</td>
                  <td className="px-4 py-3">{p.providerName ?? p.providerId}</td>
                  <td className="px-4 py-3">
                    {p.status === 'paid' ? (
                      <span className="inline-flex items-center text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded">
                        <CheckCircle size={14} className="mr-1" /> Payé
                      </span>
                    ) : p.status === 'refunded' ? (
                      <span className="inline-flex items-center text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded">
                        Remboursé
                      </span>
                    ) : p.status === 'failed' ? (
                      <span className="inline-flex items-center text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded">
                        <XCircle size={14} className="mr-1" /> Échec
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                        En attente
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!isLoading && filteredBySearch.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Aucun paiement trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {isLoading && (
            <div className="p-4 text-center text-gray-600">Chargement…</div>
          )}
        </div>

        {hasMore && !isLoading && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => void buildQuery(false)}>Charger plus</Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
