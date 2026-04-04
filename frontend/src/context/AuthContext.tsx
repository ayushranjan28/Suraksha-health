'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type { User, LoginPayload, RegisterPayload } from '@/types/auth';
import { auth, getStoredToken, clearStoredToken, ApiError } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null && accessToken !== null;

  // ── Initialize auth state on mount ─────────────────────────────────────────

  useEffect(() => {
    async function initializeAuth() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setAccessToken(storedToken);

      try {
        // Validate token by fetching user profile
        const response = await auth.me();
        setUser(response.user);
      } catch (error) {
        // Token is invalid or expired — try to refresh
        if (error instanceof ApiError && error.status === 401) {
          try {
            const refreshResponse = await auth.refreshToken();
            setAccessToken(refreshResponse.accessToken);

            // Retry fetching user profile
            const meResponse = await auth.me();
            setUser(meResponse.user);
          } catch {
            // Refresh failed — clear everything
            clearStoredToken();
            setAccessToken(null);
            setUser(null);
          }
        } else {
          // Some other error — clear auth state
          clearStoredToken();
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const payload: LoginPayload = { email, password };
    const response = await auth.login(payload);

    setUser(response.user);
    setAccessToken(response.accessToken);
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────

  const register = useCallback(async (data: RegisterPayload) => {
    const response = await auth.register(data);

    setUser(response.user);
    setAccessToken(response.accessToken);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      // Always clear state, even if API call fails
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // ── Refresh User ───────────────────────────────────────────────────────────

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await auth.me();
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Try to refresh token
        try {
          const refreshResponse = await auth.refreshToken();
          setAccessToken(refreshResponse.accessToken);

          const meResponse = await auth.me();
          setUser(meResponse.user);
        } catch {
          // Refresh failed — log out
          setUser(null);
          setAccessToken(null);
          clearStoredToken();
        }
      }
    }
  }, [accessToken]);

  // ── Memoized Context Value ─────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, accessToken, isLoading, isAuthenticated, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
