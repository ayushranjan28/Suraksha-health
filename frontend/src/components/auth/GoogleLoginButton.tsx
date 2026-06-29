'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function GoogleLoginButton() {
  const router = useRouter();
  const { googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuccess(credentialResponse: CredentialResponse) {
    const idToken = credentialResponse.credential;

    if (!idToken) {
      setError('No credential received from Google.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await googleLogin(idToken);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleError() {
    setError('Google sign-in was cancelled or failed.');
  }

  return (
    <div className="w-full">
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
      )}

      {isLoading ? (
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-3 px-4 h-12 sm:h-11 rounded-lg font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 opacity-70 cursor-not-allowed transition-colors"
        >
          <svg
            className="animate-spin h-5 w-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Signing in with Google...
        </button>
      ) : (
        <div className="flex justify-center [&>div]:!w-full">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            size="large"
            width="400"
            text="continue_with"
            shape="rectangular"
            theme="outline"
          />
        </div>
      )}
    </div>
  );
}
