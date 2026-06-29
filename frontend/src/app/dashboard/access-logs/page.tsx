'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auditLogs } from '@/lib/api';

export default function AccessLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'patient') {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await auditLogs.get();
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch access logs');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'patient') {
    return <div className="p-4">Only patients can view their access logs.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Access Logs</h1>
        <p className="text-sm text-zinc-500 mt-1">
          A transparent record of who has viewed your medical records and when.
        </p>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Doctor Name</th>
                <th className="px-4 py-3 font-medium">Doctor UID</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    No access logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      Dr. {log.doctor?.full_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                      {log.doctor?.unique_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20">
                        {log.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
