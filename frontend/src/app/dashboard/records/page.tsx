'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { records as recordsApi, patientProfile as profileApi, PatientProfileData } from '@/lib/api';
import type { HealthRecord } from '@/types/records';

export default function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [patientId, setPatientId] = useState(''); // for doctors

  useEffect(() => {
    if (user?.role === 'patient') {
      fetchRecords();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRecords = async (pid?: string) => {
    try {
      setLoading(true);
      setError('');
      setProfile(null);
      const data = await recordsApi.getRecords(pid);
      setRecords(data.records);
      
      if (!pid && user?.role === 'patient') {
        const pData = await profileApi.getProfile();
        setProfile(pData.profile || {} as PatientProfileData);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch records');
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
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create record');
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
            <label className="block text-sm font-medium">Patient UUID</label>
            <input type="text" id="viewPatientId" className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" placeholder="UUID" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium">Patient Name</label>
            <input type="text" id="viewPatientName" className="w-full mt-1 border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700" placeholder="Name for verification" />
          </div>
          <button 
            onClick={() => {
              const pid = (document.getElementById('viewPatientId') as HTMLInputElement).value;
              const pname = (document.getElementById('viewPatientName') as HTMLInputElement).value;
              
              setLoading(true);
              setError('');
              setProfile(null);
              recordsApi.getRecords(pid, pname)
                .then(data => {
                  setRecords(data.records);
                  if (pid && pname) {
                    profileApi.getPatientProfileByDoctor(pid, pname)
                      .then(pData => {
                        setProfile(pData.profile || {} as PatientProfileData);
                      })
                      .catch(() => {
                        // On failure, display empty profile or handle gracefully
                        setProfile({} as PatientProfileData);
                      });
                  }
                })
                .catch(err => setError((err as Error).message || 'Failed to fetch records'))
                .finally(() => setLoading(false));
            }} 
            className="bg-zinc-800 text-white px-4 py-2 rounded h-10"
          >
            Load Records
          </button>
        </div>
      )}

      <div className={profile ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : "space-y-4"}>
        <div className={profile ? "lg:col-span-2 space-y-4 order-2 lg:order-1" : "space-y-4"}>
          {loading ? (
          <p>Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-zinc-500">No records found.</p>
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
