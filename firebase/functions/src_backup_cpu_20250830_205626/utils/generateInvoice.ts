import { db, storage, FieldValue } from './firebase';
import { InvoiceRecord } from './types';
import { logError } from '../utils/logs/logError';

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

    const invoiceData = {
      ...invoice,
      downloadUrl: url,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
      environment: process.env.NODE_ENV || 'development'
    };

    await db.collection('invoice_records').doc(invoice.invoiceNumber).set(invoiceData);

    return url;
  } catch (e) {
    await logError('generateInvoice:failure', { invoice, error: e });
    throw e;
  }
};
