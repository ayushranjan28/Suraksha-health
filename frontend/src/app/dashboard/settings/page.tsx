'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { delegates } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [delegateList, setDelegateList] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'patient') {
      fetchDelegates();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDelegates = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await delegates.get();
      setDelegateList(data.delegates);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch delegates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await delegates.add(email);
      setSuccess('Delegate added successfully!');
      setEmail('');
      fetchDelegates();
    } catch (err: any) {
      setError(err.message || 'Failed to add delegate');
    }
  };

  const handleRemoveDelegate = async (id: string) => {
    try {
      setError('');
      setSuccess('');
      await delegates.remove(id);
      setSuccess('Delegate removed successfully!');
      fetchDelegates();
    } catch (err: any) {
      setError(err.message || 'Failed to remove delegate');
    }
  };

  if (user?.role !== 'patient') {
    return <div className="p-4">Only patients can access settings.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Settings</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded">{success}</div>}

      <div className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <h2 className="text-lg font-medium mb-2">Family & Guardian Delegation</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Add a trusted family member or guardian. They will be able to approve emergency break-glass requests on your behalf if you are unable to.
        </p>

        <form onSubmit={handleAddDelegate} className="flex gap-4 mb-8">
          <input
            type="email"
            required
            placeholder="Enter delegate's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
          />
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700">
            Add Delegate
          </button>
        </form>

        <h3 className="font-medium mb-3">Active Delegates</h3>
        {loading ? (
          <p>Loading...</p>
        ) : delegateList.length === 0 ? (
          <p className="text-zinc-500 text-sm">You have no active delegates.</p>
        ) : (
          <ul className="space-y-3">
            {delegateList.map((item) => (
              <li key={item.id} className="flex items-center justify-between p-3 border rounded dark:border-zinc-700">
                <div>
                  <p className="font-medium">{item.delegate?.full_name}</p>
                  <p className="text-sm text-zinc-500">{item.delegate?.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveDelegate(item.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
