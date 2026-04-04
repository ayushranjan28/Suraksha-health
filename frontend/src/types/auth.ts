// ── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'patient' | 'doctor' | 'admin';
  abhaId?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ── Auth Payloads ────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role?: 'patient' | 'doctor' | 'admin';
}

// ── Auth Responses ───────────────────────────────────────────────────────────

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface MeResponse {
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LogoutResponse {
  message: string;
}

// ── Error Response ───────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  errors?: Array<{ field: string; message: string }>;
}
