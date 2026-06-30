'use client';

import { useState } from 'react';
import api, { patientProfile as profileApi, records as recordsApi, PatientProfileData } from '@/lib/api';
import type { HealthRecord } from '@/types/records';

export default function PatientSearchPage() {
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [delegates, setDelegates] = useState<any[]>([]);

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
      setDelegates([]);
      setShowAddRecord(false);
      setHasSearched(false);

      // Fetch Profile
      try {
        const profileData = await profileApi.getPatientProfileByDoctor(patientId, patientName);
        setProfile(profileData.profile || {} as PatientProfileData);
      } catch (e) {
        setProfile({} as PatientProfileData);
      }

      // Fetch Records
      const recordsData = await recordsApi.getRecords(patientId, patientName);
      setRecords(recordsData.records);
      setHasSearched(true);
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

  const handleDeclareEmergency = async () => {
    if (!patientId) {
      setError('Please enter a Patient UUID first to declare an emergency.');
      return;
    }

    if (!confirm("WARNING: You are about to declare a Life-Threatening Emergency. This will immediately notify the patient's emergency contacts and grant you 2 hours of access. Proceed?")) {
      return;
    }

    setOverriding(true);
    setError('');

    try {
      const res = await api.emergency.declare(patientId, 'Life-Threatening Emergency');
      
      setError('Emergency Declared. You have 2 hours of access. Loading records...');
      if (res.delegates && res.delegates.length > 0) {
        setDelegates(res.delegates);
      }
      
      const recordsData = await recordsApi.getRecords(patientId, patientName);
      setRecords(recordsData.records);
      setHasSearched(true);
      
      try {
        const profileData = await profileApi.getPatientProfileByDoctor(patientId, patientName);
        setProfile(profileData.profile || {} as PatientProfileData);
      } catch (e) {
        // Always render profile block even if it fails
        setProfile({} as PatientProfileData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to declare emergency.');
    } finally {
      setOverriding(false);
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
          <button type="submit" disabled={loading || overriding} className="bg-emerald-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50 h-10">
            {loading ? 'Searching...' : 'Search & Verify'}
          </button>
        </form>
        
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-right">
          <button
            onClick={handleDeclareEmergency}
            disabled={loading || overriding}
            className="text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {overriding ? 'Declaring Emergency...' : '🚨 Declare Emergency'}
          </button>
          <p className="text-xs text-zinc-500 mt-2">
            Grants immediate access and notifies patient's emergency contacts. Subject to strict auditing.
          </p>
        </div>
      </div>

      {delegates.length > 0 && (
        <div className="bg-red-50 p-6 rounded-xl border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <h2 className="text-lg font-semibold mb-4 text-red-900 dark:text-red-400">Emergency Contacts Notified</h2>
          <div className="space-y-3">
            {delegates.map((d: any) => (
              <div key={d.id} className="flex flex-col gap-1 text-sm bg-white dark:bg-zinc-900 p-3 rounded border border-red-100 dark:border-red-900/30">
                <p><span className="font-semibold text-zinc-900 dark:text-white">Name:</span> {d.delegate?.full_name || 'Unknown'}</p>
                <p><span className="font-semibold text-zinc-900 dark:text-white">Email:</span> {d.delegate?.email || 'N/A'}</p>
                <p><span className="font-semibold text-zinc-900 dark:text-white">Phone:</span> {d.contact_number || 'Not provided'}</p>
              </div>
            ))}
          </div>
        </div>
      )}



      <div className={profile ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : "space-y-4"}>
        <div className={profile ? "lg:col-span-2 space-y-4 order-2 lg:order-1" : "space-y-4"}>
          {hasSearched && (
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
                  <label className="block text-sm font-medium mb-1">Previous Doctor Name (optional)</label>
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
            <>
              {(() => {
                const pastDocs = Array.from(new Set(records.flatMap(r => {
                  const docs = [];
                  if (r.doctor && (r.doctor as any).full_name) docs.push(`Dr. ${(r.doctor as any).full_name}`);
                  else if (r.doctor && r.doctor.fullName) docs.push(`Dr. ${r.doctor.fullName}`);
                  
                  if (r.previous_doctor_name) {
                    docs.push(r.previous_doctor_name.startsWith('Dr.') ? r.previous_doctor_name : `Dr. ${r.previous_doctor_name}`);
                  }
                  return docs;
                })));
                return pastDocs.length > 0 ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30 mb-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-1">Patient History</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <span className="font-medium">Past Doctors Consulted: </span> 
                      {pastDocs.join(', ')}
                    </p>
                  </div>
                ) : null;
              })()}
              {records.map(record => (
              <div key={record.id} className="bg-white p-6 rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{record.title}</h3>
                  <span className="text-xs text-zinc-500">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 whitespace-pre-wrap">{record.content}</p>
                <div className="text-xs text-zinc-500 space-y-1">
                  <p>Added by: Dr. {(record.doctor as any)?.full_name || record.doctor?.fullName || 'Unknown'} {((record.doctor as any)?.email || record.doctor?.email) ? ` (${(record.doctor as any)?.email || record.doctor?.email})` : ''}</p>
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
            }
            </>
          )}
        </div>
        )}
        </div>
        
        {profile && (
          <div className="lg:col-span-1 bg-amber-50 p-6 rounded-xl border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 sticky top-6 order-1 lg:order-2">
            <h2 className="text-lg font-semibold mb-4 text-amber-900 dark:text-amber-400">Emergency Profile</h2>
            <div className="flex flex-col gap-4 text-sm">
              <div><span className="font-medium text-amber-800 dark:text-amber-500">Blood Group:</span> <br/><span className="text-zinc-800 dark:text-zinc-200">{profile.bloodGroup || 'N/A'}</span></div>
              <div><span className="font-medium text-amber-800 dark:text-amber-500">Allergies:</span> <br/><span className="text-zinc-800 dark:text-zinc-200">{profile.allergies || 'None'}</span></div>
              <div><span className="font-medium text-amber-800 dark:text-amber-500">Past Accidents:</span> <br/><span className="text-zinc-800 dark:text-zinc-200">{profile.pastAccidents || 'None'}</span></div>
              <div><span className="font-medium text-amber-800 dark:text-amber-500">Trauma/Conditions:</span> <br/><span className="text-zinc-800 dark:text-zinc-200">{profile.trauma || 'None'}</span></div>
              <div><span className="font-medium text-amber-800 dark:text-amber-500">Other Info:</span> <br/><span className="text-zinc-800 dark:text-zinc-200">{profile.otherInfo || 'None'}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
