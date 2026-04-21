'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  const roleBadgeColors: Record<string, string> = {
    patient: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
    doctor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
    admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Welcome back, {user?.fullName || 'User'}
            </h1>
            {user?.role && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  roleBadgeColors[user.role] || roleBadgeColors.patient
                }`}
              >
                {user.role}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Here&apos;s an overview of your health vault
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={user?.role === 'doctor' ? "Patient Records" : "My Health Records"}
          subtitle="Manage health records"
          href="/dashboard/records"
          icon={<FolderIcon />}
        />
        <DashboardCard
          title="Recent Activity"
          subtitle="No recent activity"
          icon={<ActivityIcon />}
          comingSoon
        />
        <DashboardCard
          title="Emergency Access"
          subtitle="Manage emergency requests"
          href="/dashboard/emergency"
          icon={<UsersIcon />}
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
}

function DashboardCard({ title, subtitle, icon, href, comingSoon }: DashboardCardProps & { comingSoon?: boolean }) {
  const content = (
    <div className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-emerald-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white dark:bg-emerald-900 dark:text-emerald-400 dark:group-hover:bg-emerald-600">
          {icon}
        </div>
        {comingSoon && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-400">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
