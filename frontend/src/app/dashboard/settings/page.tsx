'use client';

import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account preferences and security settings.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Profile Information</h2>
          <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
              <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300">
                {user?.fullName || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email Address</label>
              <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300">
                {user?.email || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
              <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 capitalize">
                {user?.role || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Security</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Advanced security settings and 2FA will be available in the next update.
          </p>
          <button className="mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md font-medium text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors" disabled>
            Change Password (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
