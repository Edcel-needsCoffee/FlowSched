import { create } from 'zustand';

export type AuthRole = 'CHAIR' | 'FACULTY' | 'ACADEMIC_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  facultyId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (input: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

const REFRESH_STORAGE_KEY = 'flowsched.refreshToken';

/**
 * Token-storage tradeoff (documented per Phase 2 spec):
 *
 * - Access token lives only in memory (this Zustand store). It is never
 *   written to localStorage, so a stored-XSS payload cannot exfiltrate a
 *   long-lived credential from disk — but the session does not survive a
 *   page reload without a refresh round-trip.
 * - Refresh token is persisted in localStorage so sessions survive reloads.
 *   An httpOnly, Secure, SameSite cookie set by the backend would be
 *   strictly safer (JS cannot read it, CSRF mitigated via SameSite), but
 *   that requires cookie-based refresh endpoints + CSRF handling, which is
 *   out of scope for Phase 2. If the app is ever exposed beyond local dev,
 *   migrate refresh transport to httpOnly cookies.
 */
function readPersistedRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistRefreshToken(token: string | null): void {
  try {
    if (token === null) {
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    } else {
      localStorage.setItem(REFRESH_STORAGE_KEY, token);
    }
  } catch {
    // Storage unavailable (private mode, SSR) — session just won't persist.
  }
}

export function getPersistedRefreshToken(): string | null {
  return readPersistedRefreshToken();
}

/** Hydrate the store's refresh token from localStorage on app boot. */
export function restoreRefreshToken(): string | null {
  return readPersistedRefreshToken();
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  refreshToken: readPersistedRefreshToken(),
  isAuthenticated: false,
  login: ({ user, accessToken, refreshToken }) => {
    persistRefreshToken(refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () => {
    persistRefreshToken(null);
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
