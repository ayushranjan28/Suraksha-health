'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { emergency as emergencyApi } from '@/lib/api';
import type { EmergencyRequest } from '@/types/records';

export default function EmergencyPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await emergencyApi.getRequests();
      setRequests(data.requests);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await emergencyApi.createRequest({ patientId, reason });
      setPatientId('');
      setReason('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to request emergency access');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected' | 'revoked') => {
    try {
      setError('');
      await emergencyApi.updateStatus(id, status);
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Emergency Access</h1>
      
      {error && <div className="text-red-500 bg-red-100 p-3 rounded">{error}</div>}

      {user?.role === 'doctor' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <h2 className="text-lg font-medium mb-4">Request Access</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Patient ID (UUID)</label>
              <input type="text" required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
            </div>
            <div>
              <label className="block text-sm font-medium">Reason</label>
              <textarea required value={reason} onChange={e => setReason(e.target.value)} className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
            </div>
            <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded font-medium">Request Break-Glass Access</button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Active & Pending Requests</h2>
        {loading ? (
          <p>Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-zinc-500">No emergency requests found.</p>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {req.status}
                  </span>
                  <span className="text-sm text-zinc-500">{new Date(req.created_at).toLocaleString()}</span>
                </div>
                {user?.role === 'patient' ? (
                  <p className="font-medium">Requested by: Dr. {req.doctor?.fullName}</p>
                ) : (
                  <p className="font-medium">Requested for patient: {req.patient?.fullName}</p>
                )}
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">Reason: {req.reason}</p>
                {req.expires_at && new Date(req.expires_at) > new Date() && (
                  <p className="text-xs text-blue-500 mt-2">Expires: {new Date(req.expires_at).toLocaleString()}</p>
                )}
              </div>
              
              {user?.role === 'patient' && req.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleStatusUpdate(req.id, 'approved')} className="bg-green-600 text-white px-4 py-2 rounded text-sm">Approve</button>
                  <button onClick={() => handleStatusUpdate(req.id, 'rejected')} className="bg-zinc-200 text-zinc-800 px-4 py-2 rounded text-sm dark:bg-zinc-800 dark:text-zinc-200">Reject</button>
                </div>
              )}
              {user?.role === 'patient' && req.status === 'approved' && new Date(req.expires_at || '') > new Date() && (
                <div className="flex gap-2">
                  <button onClick={() => handleStatusUpdate(req.id, 'revoked')} className="bg-red-600 text-white px-4 py-2 rounded text-sm">Revoke Access</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
