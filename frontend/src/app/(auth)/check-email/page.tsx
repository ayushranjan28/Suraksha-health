'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { auth } from '@/lib/api';

// ── Check Email Page Wrapper ─────────────────────────────────────────────────

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailSkeleton />}>
      <CheckEmailContent />
    </Suspense>
  );
}

function CheckEmailSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto animate-pulse">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto" />
      </div>
    </div>
  );
}

// ── Check Email Content ──────────────────────────────────────────────────────

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-clear "sent" status after 3 seconds
  useEffect(() => {
    if (resendStatus !== 'sent') return;
    const timer = setTimeout(() => setResendStatus('idle'), 3000);
    return () => clearTimeout(timer);
  }, [resendStatus]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || !email) return;

    setResendStatus('sending');
    try {
      await auth.resendVerification(email);
      setResendStatus('sent');
      setCooldown(60);
    } catch {
      setResendStatus('idle');
    }
  }, [email, cooldown]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto">
      <div className="text-center">
        {/* Envelope Icon */}
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Check your email
        </h2>

        {/* Subtext */}
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {email}
          </p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Click the link in the email to activate your account.
        </p>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

        {/* Didn't receive it? */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Didn&apos;t receive it?
          </p>

          {/* Resend Button */}
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resendStatus === 'sending' || !email}
            className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendStatus === 'sending' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              'Resend verification email'
            )}
          </button>

          {/* Sent confirmation */}
          {resendStatus === 'sent' && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Email sent! Check your inbox.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

        {/* Links */}
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Wrong email? <span className="font-medium text-indigo-600 dark:text-indigo-400">Go back to register</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Already verified? <span className="font-medium text-indigo-600 dark:text-indigo-400">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
