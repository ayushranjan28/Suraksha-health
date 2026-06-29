'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { emergency } from '@/lib/api';
import type { EmergencyRequest } from '@/types/records';

export default function AdminEmergencyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await emergency.getRequests();
      setRequests(data.requests);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${status} this request as an Administrator?`)) return;
    
    try {
      // By default, admin override grants 2 hours (similar to geo-fence override)
      const expiresInHours = status === 'approved' ? 2 : undefined;
      await emergency.updateStatus(id, status, expiresInHours);
      fetchRequests();
    } catch (err: any) {
      setError(err.message || `Failed to ${status} request`);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-4">Unauthorized. Only administrators can view this page.</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Hospital Administration</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review and manage all pending emergency break-glass requests across the hospital.
        </p>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      <div className="bg-white rounded-xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-4 text-red-600">Pending Escalations ({pendingRequests.length})</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending requests.</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="p-4 border rounded-lg bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">Doctor: Dr. {req.doctor?.fullName}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Patient: {req.patient?.fullName} ({req.patient?.email})</p>
                    <p className="text-xs text-zinc-500 mt-1">Requested: {new Date(req.created_at).toLocaleString()}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                    Pending
                  </span>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-3 rounded text-sm text-zinc-700 dark:text-zinc-300 mb-4">
                  <span className="font-medium block mb-1">Reason:</span>
                  {req.reason}
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleStatusUpdate(req.id, 'rejected')}
                    className="px-4 py-2 rounded text-sm font-medium text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(req.id, 'approved')}
                    className="px-4 py-2 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm"
                  >
                    Approve Override (2 Hours)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6 dark:bg-zinc-900 dark:border-zinc-800 mt-8">
        <h2 className="text-lg font-semibold mb-4">Request History</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : pastRequests.length === 0 ? (
          <p className="text-sm text-zinc-500">No past requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {pastRequests.map(req => (
                  <tr key={req.id}>
                    <td className="px-4 py-3">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{req.patient?.fullName}</td>
                    <td className="px-4 py-3">Dr. {req.doctor?.fullName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        req.status === 'approved' 
                          ? 'bg-green-50 text-green-700 ring-green-600/20' 
                          : req.status === 'revoked'
                          ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
                          : 'bg-red-50 text-red-700 ring-red-600/20'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
