import * as admin from 'firebase-admin';
import { logError } from '../utils/logError';

const db = admin.firestore();
const storage = admin.storage();

interface InvoiceRecord {
  invoiceNumber: string;
  type: 'platform' | 'provider';
  callId: string;
  clientId: string;
  providerId: string;
  amount: number;
  currency: string;
  downloadUrl: string;
  createdAt: FirebaseFirestore.Timestamp;
  status: 'issued' | 'sent' | 'paid' | 'cancelled';
  sentToAdmin: boolean;
  locale?: string;
}

export const generateInvoice = async (invoice: InvoiceRecord) => {
  try {
    const content = `Facture #${invoice.invoiceNumber}\nMontant : ${invoice.amount} ${invoice.currency}`;

    const buffer = Buffer.from(content, 'utf-8');
    const filePath = `invoices/${invoice.invoiceNumber}.txt`;

    const file = storage.bucket().file(filePath);
    await file.save(buffer, { contentType: 'text/plain' });
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 jours
    });

    await db.collection('invoice_records').doc(invoice.invoiceNumber).set({
      ...invoice,
      downloadUrl: url,
    });

    return url;
  } catch (e) {
    await logError('generateInvoice:failure', { invoice, error: e });
    throw e;
  }
};
