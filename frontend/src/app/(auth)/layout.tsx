import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
          🏥 Suraksha Health
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Decentralized Emergency Health Vault
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Suraksha Health. Secure medical records.
      </p>
    </div>
  );
}
