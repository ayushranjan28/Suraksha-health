'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { records as recordsApi } from '@/lib/api';
import type { HealthRecord } from '@/types/records';

export default function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [patientId, setPatientId] = useState(''); // for doctors

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRecords = async (pid?: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await recordsApi.getRecords(pid);
      setRecords(data.records);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await recordsApi.createRecord({ patientId, title: newTitle, content: newContent });
      setNewTitle('');
      setNewContent('');
      setPatientId('');
      fetchRecords(patientId);
    } catch (err: any) {
      setError(err.message || 'Failed to create record');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Health Records</h1>
      
      {error && <div className="text-red-500 bg-red-100 p-3 rounded">{error}</div>}

      {user?.role === 'doctor' && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <h2 className="text-lg font-medium mb-4">Add New Record</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Patient ID (UUID)</label>
              <input type="text" required value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
            </div>
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
            </div>
            <div>
              <label className="block text-sm font-medium">Content</label>
              <textarea required value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
            </div>
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded">Save Record</button>
          </form>
        </div>
      )}

      {user?.role === 'doctor' && (
        <div className="flex gap-4 items-end bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex-1">
            <label className="block text-sm font-medium">View Patient Records (Enter Patient ID)</label>
            <input type="text" id="viewPatientId" className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" placeholder="Patient UUID" />
          </div>
          <button 
            onClick={() => {
              const pid = (document.getElementById('viewPatientId') as HTMLInputElement).value;
              fetchRecords(pid);
            }} 
            className="bg-zinc-800 text-white px-4 py-2 rounded"
          >
            Load Records
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-zinc-500">No records found.</p>
        ) : (
          records.map(record => (
            <div key={record.id} className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
              <h3 className="font-semibold text-lg">{record.title}</h3>
              <p className="text-sm text-zinc-500 mb-2">By Dr. {record.doctor?.fullName} on {new Date(record.created_at).toLocaleDateString()}</p>
              <p className="mt-2 whitespace-pre-wrap">{record.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
