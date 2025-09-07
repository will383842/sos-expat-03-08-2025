// LogsPage.tsx
import React, { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';

interface EmailLog {
  to: string;
  subject: string;
  status: string;
  template: string;
  timestamp: { seconds: number };
  error?: string;
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const snapshot = await getDocs(query(collection(db, 'email_logs'), orderBy('timestamp', 'desc')));
      setLogs(snapshot.docs.map(doc => doc.data() as EmailLog));
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">🕓 Historique des envois</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Destinataire</th>
              <th className="px-4 py-2 border">Sujet</th>
              <th className="px-4 py-2 border">Template</th>
              <th className="px-4 py-2 border">Statut</th>
              <th className="px-4 py-2 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td className="px-4 py-2 border">{log.to}</td>
                <td className="px-4 py-2 border">{log.subject}</td>
                <td className="px-4 py-2 border">{log.template}</td>
                <td className={`px-4 py-2 border ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {log.status}
                </td>
                <td className="px-4 py-2 border">{format(new Date(log.timestamp.seconds * 1000), 'dd/MM/yyyy HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsPage;


