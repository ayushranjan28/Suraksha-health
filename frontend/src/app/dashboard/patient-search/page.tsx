'use client';

import { useState } from 'react';
import api, { patientProfile as profileApi, records as recordsApi, PatientProfileData } from '@/lib/api';
import type { HealthRecord } from '@/types/records';

export default function PatientSearchPage() {
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);

  // New Record State
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    title: '',
    content: '',
    fileUrls: '',
    previousDoctorId: '',
    previousDoctorName: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addingRecord, setAddingRecord] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setProfile(null);
      setRecords([]);
      setShowAddRecord(false);

      // Fetch Profile
      const profileData = await profileApi.getPatientProfileByDoctor(patientId, patientName);
      if (profileData.profile) {
        setProfile(profileData.profile);
      }

      // Fetch Records
      const recordsData = await recordsApi.getRecords(patientId, patientName);
      setRecords(recordsData.records);
    } catch (err: unknown) {
      setError((err as Error).message || 'Verification failed. Please check UUID and Name.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingRecord(true);
      setError('');
      
      let uploadedUrl = '';
      if (selectedFile) {
        const uploadRes = await api.upload.uploadFile(selectedFile);
        uploadedUrl = uploadRes.url;
      }

      const fileUrlsArray = newRecord.fileUrls.split(',').map(u => u.trim()).filter(Boolean);
      if (uploadedUrl) {
        fileUrlsArray.push(uploadedUrl);
      }

      await recordsApi.createRecord({
        patientId,
        title: newRecord.title,
        content: newRecord.content,
        fileUrls: fileUrlsArray,
        previousDoctorId: newRecord.previousDoctorId || undefined,
        previousDoctorName: newRecord.previousDoctorName || undefined,
      });
      // Refresh records
      const recordsData = await recordsApi.getRecords(patientId, patientName);
      setRecords(recordsData.records);
      setShowAddRecord(false);
      setNewRecord({ title: '', content: '', fileUrls: '', previousDoctorId: '', previousDoctorName: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to add record');
    } finally {
      setAddingRecord(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Patient Search & Verify</h1>

      {error && <div className="text-red-500 bg-red-100 p-3 rounded">{error}</div>}

      <div className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Patient UUID</label>
            <input
              type="text"
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Patient Name</label>
            <input
              type="text"
              required
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50 h-10">
            {loading ? 'Searching...' : 'Search & Verify'}
          </button>
        </form>
      </div>

      {profile && (
        <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <h2 className="text-lg font-semibold mb-4 text-amber-900 dark:text-amber-400">Emergency Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="font-medium">Blood Group:</span> {profile.bloodGroup || 'N/A'}</div>
            <div><span className="font-medium">Allergies:</span> {profile.allergies || 'None'}</div>
            <div><span className="font-medium">Past Accidents:</span> {profile.pastAccidents || 'None'}</div>
            <div><span className="font-medium">Trauma/Conditions:</span> {profile.trauma || 'None'}</div>
            <div className="col-span-2"><span className="font-medium">Other Info:</span> {profile.otherInfo || 'None'}</div>
          </div>
        </div>
      )}

      {profile && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Health Records</h2>
            <button
              onClick={() => setShowAddRecord(!showAddRecord)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
            >
              {showAddRecord ? 'Cancel' : 'Add New Record'}
            </button>
          </div>

          {showAddRecord && (
            <form onSubmit={handleAddRecord} className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 space-y-4">
              <h3 className="font-medium text-lg mb-2">New Health Record</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input required type="text" value={newRecord.title} onChange={e => setNewRecord({ ...newRecord, title: e.target.value })} className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Diagnosis / Content</label>
                <textarea required value={newRecord.content} onChange={e => setNewRecord({ ...newRecord, content: e.target.value })} className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Prescription / Report (PDF or Image)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file && file.type.startsWith('image/')) {
                      setPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPreviewUrl(null);
                    }
                  }} 
                  className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700 cursor-pointer mb-2" 
                />
                {previewUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 mb-1">Preview:</p>
                    <img src={previewUrl} alt="Preview" className="max-w-xs h-auto rounded border border-zinc-300 dark:border-zinc-700 object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">External URLs (Optional, comma separated)</label>
                <input type="text" value={newRecord.fileUrls} onChange={e => setNewRecord({ ...newRecord, fileUrls: e.target.value })} placeholder="https://..." className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Previous Doctor Name</label>
                  <input type="text" value={newRecord.previousDoctorName} onChange={e => setNewRecord({ ...newRecord, previousDoctorName: e.target.value })} className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Previous Doctor UUID (optional)</label>
                  <input type="text" value={newRecord.previousDoctorId} onChange={e => setNewRecord({ ...newRecord, previousDoctorId: e.target.value })} className="w-full border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" />
                </div>
              </div>
              <button type="submit" disabled={addingRecord} className="bg-emerald-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50">
                {addingRecord ? 'Saving...' : 'Save Record'}
              </button>
            </form>
          )}

          {records.length === 0 ? (
            <p className="text-zinc-500">No past records found.</p>
          ) : (
            records.map(record => (
              <div key={record.id} className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{record.title}</h3>
                  <span className="text-xs text-zinc-500">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 whitespace-pre-wrap">{record.content}</p>
                <div className="text-xs text-zinc-500 space-y-1">
                  <p>Added by: Dr. {record.doctor?.fullName || 'Unknown'}</p>
                  {record.previous_doctor_name && <p>Consulted Before: {record.previous_doctor_name}</p>}
                  {record.file_urls && record.file_urls.length > 0 && (
                    <div className="mt-4">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 block mb-2">Attachments: </span>
                      <div className="flex flex-wrap gap-4">
                        {record.file_urls.map((url: string, i: number) => {
                          const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('image');
                          return isImage ? (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block max-w-[200px]">
                              <img src={url} alt={`Report ${i + 1}`} className="w-full h-auto rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover" />
                            </a>
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded">View Document {i + 1}</a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
