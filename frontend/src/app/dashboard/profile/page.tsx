'use client';

import { useEffect, useState } from 'react';
import { patientProfile as profileApi, PatientProfileData } from '@/lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<PatientProfileData>({
    bloodGroup: '',
    allergies: '',
    pastAccidents: '',
    trauma: '',
    otherInfo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await profileApi.getProfile();
      if (data.profile) {
        setProfile({
          bloodGroup: data.profile.bloodGroup || '',
          allergies: data.profile.allergies || '',
          pastAccidents: data.profile.pastAccidents || '',
          trauma: data.profile.trauma || '',
          otherInfo: data.profile.otherInfo || ''
        });
      }
    } catch (err: unknown) {
      if ((err as { status?: number }).status !== 404) {
        setError((err as Error).message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      setError('');
      await profileApi.updateProfile(profile);
      setMessage('Profile updated successfully!');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Emergency Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Fill in your crucial medical information to save time during an emergency.</p>
      </div>

      {error && <div className="text-red-500 bg-red-100 p-3 rounded">{error}</div>}
      {message && <div className="text-green-600 bg-green-100 p-3 rounded">{message}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Blood Group</label>
          <select 
            name="bloodGroup" 
            value={profile.bloodGroup} 
            onChange={handleChange}
            className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Allergies</label>
          <textarea 
            name="allergies" 
            value={profile.allergies} 
            onChange={handleChange}
            placeholder="E.g., Penicillin, Peanuts, Pollen"
            className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Past Accidents / Surgeries</label>
          <textarea 
            name="pastAccidents" 
            value={profile.pastAccidents} 
            onChange={handleChange}
            placeholder="Mention any significant past medical events"
            className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Trauma / Chronic Conditions</label>
          <textarea 
            name="trauma" 
            value={profile.trauma} 
            onChange={handleChange}
            placeholder="Asthma, Diabetes, Hypertension, etc."
            className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Other Relevant Information</label>
          <textarea 
            name="otherInfo" 
            value={profile.otherInfo} 
            onChange={handleChange}
            placeholder="Any other crucial details"
            className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
            rows={2}
          />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="bg-emerald-600 text-white px-6 py-2 rounded font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Emergency Profile'}
        </button>
      </form>
    </div>
  );
}
