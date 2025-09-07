"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoice = void 0;
const firebase_1 = require("./firebase");
const logError_1 = require("../utils/logs/logError");
const generateInvoice = async (invoice) => {
    try {
        const content = `Facture #${invoice.invoiceNumber}\nMontant : ${invoice.amount} ${invoice.currency}`;
        const buffer = Buffer.from(content, 'utf-8');
        const filePath = `invoices/${invoice.invoiceNumber}.txt`;
        const file = firebase_1.storage.bucket().file(filePath);
        await file.save(buffer, { contentType: 'text/plain' });
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 jours
        });
        const invoiceData = {
            ...invoice,
            downloadUrl: url,
            timestamp: firebase_1.FieldValue.serverTimestamp(),
            createdAt: new Date(),
            environment: process.env.NODE_ENV || 'development'
        };
        await firebase_1.db.collection('invoice_records').doc(invoice.invoiceNumber).set(invoiceData);
        return url;
    }
    catch (e) {
        await (0, logError_1.logError)('generateInvoice:failure', { invoice, error: e });
        throw e;
    }
};
exports.generateInvoice = generateInvoice;
//# sourceMappingURL=generateInvoice.js.map