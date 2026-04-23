'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { auth, ApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ── Verify Email Page Wrapper ────────────────────────────────────────────────

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mb-4 animate-pulse" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto animate-pulse" />
      </div>
    </div>
  );
}

// ── Verify Email Content ─────────────────────────────────────────────────────

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUserFromVerification } = useAuth();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const verifyAttempted = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React Strict Mode
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    async function verify() {
      try {
        const response = await auth.verifyEmail(token);

        // Set auth state (user is now logged in)
        setUserFromVerification(response.user, response.accessToken);

        setStatus('success');

        // Auto-redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (err) {
        setStatus('error');
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('An unexpected error occurred during verification.');
        }
      }
    }

    verify();
  }, [token, setUserFromVerification, router]);

  // ── Loading State ──────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <svg className="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verifying your email...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  // ── Success State ──────────────────────────────────────────────────────────

  if (status === 'success') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <svg
              className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email verified! ✅
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account is now active. Redirecting to dashboard...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-1 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verification failed
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {errorMessage || 'This verification link is invalid or has expired.'}
        </p>

        <div className="space-y-3">
          <Link
            href="/check-email"
            className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Request a new verification link
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
