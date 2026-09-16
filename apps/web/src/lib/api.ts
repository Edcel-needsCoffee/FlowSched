import { useAuthStore } from '../store/auth.store';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

interface ApiError extends Error {
  status: number;
}

function toApiError(status: number, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

export interface ApiOptions extends RequestInit {
  /** Set false to skip the Authorization header / refresh retry (e.g. login itself). */
  auth?: boolean;
}

/**
 * Shared API client: attaches the in-memory access token to every request
 * and attempts one silent refresh on a 401 before failing.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, ...init } = options;

  const doFetch = async (token: string | null): Promise<Response> =>
    fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let token = auth ? useAuthStore.getState().accessToken : null;
  let res = await doFetch(token);

  if (res.status === 401 && auth) {
    try {
      token = await refreshAccessToken();
    } catch (err) {
      throw err instanceof Error ? err : toApiError(401, 'Unauthorized');
    }
    res = await doFetch(token);
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = JSON.parse(await res.text()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw toApiError(res.status, message);
  }

  // 204 No Content (e.g. DELETE) has no body — don't try to parse it.
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: 'CHAIR' | 'FACULTY' | 'ACADEMIC_ADMIN'; facultyId: string | null };
}

export interface RefreshResponse {
  accessToken: string;
  /** Current user, re-read from the DB — lets a reload fully restore state. */
  user: LoginResponse['user'];
}

/**
 * Exchange a refresh token for a fresh access token + the current user.
 * Used by SessionBootstrap to restore the session on page reload and by the
 * silent 401 retry below. Throws an ApiError (with `status`) when the server
 * rejects the token, so callers can distinguish "invalid token" (401) from
 * network/server failures.
 */
export async function refreshSessionRequest(refreshToken: string): Promise<RefreshResponse> {
  const res = await fetch(`${apiBase}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    throw toApiError(res.status, 'Session expired. Please log in again.');
  }
  const body = (await res.json()) as Partial<RefreshResponse>;
  if (typeof body.accessToken !== 'string' || !body.user) {
    throw toApiError(500, 'Malformed refresh response');
  }
  return body as RefreshResponse;
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw toApiError(401, 'No refresh token available');
  }
  const res = await fetch(`${apiBase}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    useAuthStore.getState().logout();
    throw toApiError(res.status, 'Session expired. Please log in again.');
  }
  const body = (await res.json()) as Partial<RefreshResponse>;
  if (typeof body.accessToken !== 'string' || !body.user) {
    throw toApiError(500, 'Malformed refresh response');
  }
  // Re-read from the DB on every refresh, so role changes / deactivation
  // become visible mid-session without waiting for the next reload.
  useAuthStore.getState().setUser(body.user);
  useAuthStore.getState().setAccessToken(body.accessToken);
  return body.accessToken;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as LoginResponse & { error?: { message?: string } };
  if (!res.ok) {
    // Backend already returns the generic "Invalid email or password".
    throw toApiError(res.status, body.error?.message ?? 'Invalid email or password');
  }
  return body;
}

export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) {
    return;
  }
  try {
    await fetch(`${apiBase}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Logout is best-effort from the client; local state clears regardless.
  }
}
