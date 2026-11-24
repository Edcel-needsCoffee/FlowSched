import { create } from 'zustand';

export type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = window.localStorage.getItem('flowsched-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UiState {
  loginRole: 'Chair' | 'Faculty';
  setLoginRole: (role: 'Chair' | 'Faculty') => void;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Lightweight global UI state, kept separate from auth state.
 * Auth store owns credentials/session; this store owns ephemeral
 * modal visibility so any "Log in" button can open the same modal
 * without navigation or prop drilling. It also owns the mobile
 * sidebar drawer open/closed state.
 */
export const useUiStore = create<UiState>()((set) => ({
  loginRole: 'Chair',
  setLoginRole: (loginRole) => set({ loginRole }),
  isLoginModalOpen: false,
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  theme: initialTheme(),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));

