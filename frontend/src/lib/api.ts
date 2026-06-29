'use client';

import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  RegisterResponse,
  VerifyEmailResponse,
  MeResponse,
  RefreshResponse,
  LogoutResponse,
  ApiErrorResponse,
} from '@/types/auth';

// ── Configuration ────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'suraksha_access_token';

// ── ApiError Class ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code?: string;
  errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    errors?: Array<{ field: string; message: string }>,
    code?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

// ── Token Helpers ────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// ── Core Fetch Wrapper ───────────────────────────────────────────────────────

interface ApiCallOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiCall<T>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const { body, skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    ...customHeaders as Record<string, string>,
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else {
    // Let browser set the Content-Type with boundary for FormData
    delete headers['Content-Type'];
  }

  // Add Authorization header if token exists and not skipped
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include', // Include cookies for refresh token
  };

  if (body !== undefined) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized — clear token and redirect to login
    if (response.status === 401) {
      clearStoredToken();
      
      // Only redirect if we're in a browser context and not already on login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      const errorData = (await response.json().catch(() => ({}))) as ApiErrorResponse;
      throw new ApiError(
        errorData.message || 'Unauthorized. Please log in again.',
        401,
        errorData.errors,
        errorData.code
      );
    }

    // Handle other non-ok responses
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(
        (errorData.error as string) || (errorData.message as string) || `Request failed with status ${response.status}`,
        response.status,
        errorData.errors as Array<{ field: string; message: string }>,
        errorData.code as string
      );
    }

    // Parse and return JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors or JSON parse errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      0
    );
  }
}

// ── Auth API Functions ───────────────────────────────────────────────────────

export const auth = {
  /**
   * Register a new user account.
   * POST /api/auth/register
   * Returns message + email (no accessToken — user must verify first).
   */
  async register(data: RegisterPayload): Promise<RegisterResponse> {
    return apiCall<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: data,
      skipAuth: true,
    });
  },

  /**
   * Log in with email and password.
   * POST /api/auth/login
   */
  async login(data: LoginPayload): Promise<AuthResponse> {
    const response = await apiCall<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: data,
      skipAuth: true,
    });

    // Store the access token
    setStoredToken(response.accessToken);
    return response;
  },

  /**
   * Log out the current user.
   * POST /api/auth/logout
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await apiCall<LogoutResponse>('/api/auth/logout', {
        method: 'POST',
      });
      return response;
    } finally {
      // Always clear the token, even if the API call fails
      clearStoredToken();
    }
  },

  /**
   * Get the current authenticated user's profile.
   * GET /api/auth/me
   */
  async me(): Promise<MeResponse> {
    return apiCall<MeResponse>('/api/auth/me', {
      method: 'GET',
    });
  },

  /**
   * Refresh the access token using the httpOnly refresh cookie.
   * POST /api/auth/refresh-token
   */
  async refreshToken(): Promise<RefreshResponse> {
    const response = await apiCall<RefreshResponse>('/api/auth/refresh-token', {
      method: 'POST',
      skipAuth: true, // Refresh token is sent via cookie, not header
    });

    // Store the new access token
    setStoredToken(response.accessToken);
    return response;
  },

  /**
   * Log in with a Google OAuth ID token.
   * POST /api/auth/google
   */
  async googleLogin(idToken: string, role?: string): Promise<AuthResponse> {
    const response = await apiCall<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: { idToken, role },
      skipAuth: true,
    });

    // Store the access token
    setStoredToken(response.accessToken);
    return response;
  },

  /**
   * Verify an email address using the token from the verification email.
   * GET /api/auth/verify-email?token={token}
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const response = await apiCall<VerifyEmailResponse>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      skipAuth: true,
    });

    // Store the access token (user is now logged in)
    setStoredToken(response.accessToken);
    return response;
  },

  /**
   * Resend the email verification link.
   * POST /api/auth/resend-verification
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    });
  },
};

// ── Records API Functions ────────────────────────────────────────────────────

import type { HealthRecord, EmergencyRequest } from '@/types/records';

export const records = {
  async getRecords(patientId?: string, patientName?: string): Promise<{ records: HealthRecord[] }> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (patientName) params.append('patientName', patientName);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall<{ records: HealthRecord[] }>(`/api/records${query}`, {
      method: 'GET',
    });
  },

  async createRecord(data: { patientId: string; title: string; content: string; fileUrls?: string[]; previousDoctorId?: string; previousDoctorName?: string }): Promise<{ message: string; record: HealthRecord }> {
    return apiCall<{ message: string; record: HealthRecord }>('/api/records', {
      method: 'POST',
      body: data,
    });
  },
};

// ── Emergency API Functions ──────────────────────────────────────────────────

export const emergency = {
  async getRequests(): Promise<{ requests: EmergencyRequest[] }> {
    return apiCall<{ requests: EmergencyRequest[] }>('/api/emergency', {
      method: 'GET',
    });
  },

  async createRequest(data: { patientId: string; reason: string }): Promise<{ message: string; request: EmergencyRequest }> {
    return apiCall<{ message: string; request: EmergencyRequest }>('/api/emergency', {
      method: 'POST',
      body: data,
    });
  },

  async updateStatus(id: string, status: 'approved' | 'rejected' | 'revoked', expiresInHours?: number): Promise<{ message: string; request: EmergencyRequest }> {
    return apiCall<{ message: string; request: EmergencyRequest }>(`/api/emergency/${id}/status`, {
      method: 'PATCH',
      body: { status, expiresInHours },
    });
  },

  async override(patientId: string, reason: string, lat: number, lng: number): Promise<{ message: string; request: any }> {
    return apiCall<{ message: string; request: any }>('/api/emergency/override', {
      method: 'POST',
      body: { patientId, reason, lat, lng },
    });
  },
};

export const delegates = {
  async add(email: string, contactNumber: string): Promise<{ message: string; delegate: any }> {
    return apiCall<{ message: string; delegate: any }>('/api/delegates', {
      method: 'POST',
      body: { email, contactNumber },
    });
  },

  async remove(id: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/api/delegates/${id}`, {
      method: 'DELETE',
    });
  },

  async get(): Promise<{ delegates: any[] }> {
    return apiCall<{ delegates: any[] }>('/api/delegates');
  },
};

export const auditLogs = {
  async get(): Promise<{ logs: any[] }> {
    return apiCall<{ logs: any[] }>('/api/audit-logs');
  }
};

// ── Patient Profile API Functions ─────────────────────────────────────────────

export interface PatientProfileData {
  bloodGroup: string;
  allergies: string;
  pastAccidents: string;
  trauma: string;
  otherInfo: string;
}

export const patientProfile = {
  async getProfile(): Promise<{ profile: PatientProfileData }> {
    return apiCall<{ profile: PatientProfileData }>('/api/patient-profile', {
      method: 'GET',
    });
  },

  async updateProfile(data: PatientProfileData): Promise<{ message: string; profile: PatientProfileData }> {
    return apiCall<{ message: string; profile: PatientProfileData }>('/api/patient-profile', {
      method: 'POST',
      body: data,
    });
  },

  async getPatientProfileByDoctor(patientId: string, patientName: string): Promise<{ profile: PatientProfileData }> {
    const params = new URLSearchParams({ patientName });
    return apiCall<{ profile: PatientProfileData }>(`/api/patient-profile/${patientId}?${params.toString()}`, {
      method: 'GET',
    });
  },
};

// --- Upload API ---
export const upload = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiCall<{ message: string; url: string }>('/upload', {
      method: 'POST',
      body: formData,
      // Do not set Content-Type, let browser set it with boundary
      headers: {
        'Accept': 'application/json',
      }
    });
  }
};

const api = { apiCall, auth, records, emergency, patientProfile, upload, ApiError };
export default api;
