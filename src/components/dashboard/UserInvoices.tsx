import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceRecord {
  id: string;
  clientId: string;
  providerId: string;
  amount: number;
  status: string;
  downloadUrl: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export default function UserInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user?.uid) return;

    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);

      try {
        const roleField = user.role === 'client' ? 'clientId' : 'providerId';

        const q = query(
          collection(db, 'invoice_records'),
          where(roleField, '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        const snapshot = await getDocs(q);
        const fetchedInvoices: InvoiceRecord[] = [];

        snapshot.forEach((doc) => {
          fetchedInvoices.push({
            id: doc.id,
            ...(doc.data() as Omit<InvoiceRecord, 'id'>),
          });
        });

        setInvoices(fetchedInvoices);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.size === PAGE_SIZE);
      } catch (err: any) {
        console.error('Erreur chargement factures:', err);
        setError('Erreur lors du chargement des factures.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user]);

  const fetchMore = async () => {
    if (!lastDoc || !user?.uid) return;
    setLoadingMore(true);

    try {
      const roleField = user.role === 'client' ? 'clientId' : 'providerId';

      const q = query(
        collection(db, 'invoice_records'),
        where(roleField, '==', user.uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const moreInvoices: InvoiceRecord[] = [];

      snapshot.forEach((doc) => {
        moreInvoices.push({
          id: doc.id,
          ...(doc.data() as Omit<InvoiceRecord, 'id'>),
        });
      });

      setInvoices((prev) => [...prev, ...moreInvoices]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.size === PAGE_SIZE);
    } catch (err) {
      console.error('Erreur chargement supplémentaire:', err);
      setError('Impossible de charger plus de factures.');
    } finally {
      setLoadingMore(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Factures SOS Expat', 14, 15);

    const tableData = invoices.map((invoice) => [
      invoice.id,
      invoice.amount.toFixed(2) + ' €',
      invoice.status,
      new Date(invoice.createdAt.seconds * 1000).toLocaleDateString(),
    ]);

    autoTable(doc, {
      head: [['ID', 'Montant', 'Statut', 'Date']],
      body: tableData,
      startY: 20,
    });

    doc.save('mes_factures.pdf');
  };

  if (loading) return <p>Chargement des factures...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (invoices.length === 0) return <p>Aucune facture disponible.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">Mes factures</h2>

      <button
        onClick={exportPDF}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Exporter en PDF
      </button>

      <ul className="space-y-2">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="border p-4 rounded-md shadow-sm">
            <p>
              <strong>Montant :</strong> {invoice.amount.toFixed(2)} €
            </p>
            <p>
              <strong>Statut :</strong> {invoice.status}
            </p>
            <p>
              <strong>Date :</strong>{' '}
              {new Date(invoice.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
            <div className="flex gap-4 mt-2">
  <a
    href={invoice.downloadUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 underline"
  >
    Télécharger la facture
  </a>

  <button
    onClick={() => exportSinglePDF(invoice)}
    className="text-green-600 underline"
  >
    Exporter en PDF
  </button>
</div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={fetchMore}
          disabled={loadingMore}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loadingMore ? 'Chargement...' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}


