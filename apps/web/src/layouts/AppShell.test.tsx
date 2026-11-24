import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { useAuthStore } from '../store/auth.store';
import { useUiStore } from '../store/ui.store';
import { ToastProvider } from '../components/Toast';
vi.mock('../components/PlannerNotifications',()=>({PlannerNotifications:()=>null}));
vi.mock('../components/FacultyPlannerNotifications',()=>({FacultyPlannerNotifications:()=>null}));

function renderAppAt(path: string, role: 'CHAIR' | 'FACULTY'): void {
  useAuthStore.getState().login({
    user: { id: 'u', email: 'user@flowsched.local', username:'Test User', role, facultyId: null },
    accessToken: 'a',
    refreshToken: 'r',
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider><AppShell /></ToastProvider>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  useAuthStore.getState().logout();
  useUiStore.getState().closeLoginModal();
  useUiStore.getState().closeSidebar();
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().logout();
  useUiStore.getState().closeLoginModal();
  useUiStore.getState().closeSidebar();
});

describe('AppShell sidebar (role-scoped)', () => {
  it('renders Chair nav items', () => {
    renderAppAt('/dashboard', 'CHAIR');
    const items = [
      'Dashboard', 'Schedule', 'Workload Assignment', 'Faculty Management', 'Subjects',
      'Teaching Load', 'Account Settings',
    ];
    for (const item of items) {
      expect(screen.getByRole('link', { name: item })).toBeInTheDocument();
    }
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('renders Faculty nav items only', () => {
    renderAppAt('/dashboard', 'FACULTY');
    for (const item of ['Dashboard', 'Weekly Function Planner', 'Teaching Load', 'Account Settings']) {
      expect(screen.getByRole('link', { name: item })).toBeInTheDocument();
    }
    for (const item of ['Schedule', 'Workload Assignment', 'Faculty Management', 'Subjects']) {
      expect(screen.queryByRole('link', { name: item })).not.toBeInTheDocument();
    }
  });

  it('marks the active route for the glass navigation style', () => {
    renderAppAt('/dashboard', 'CHAIR');
    const active = screen.getByRole('link', { name: 'Dashboard' });
    expect(active).toHaveAttribute('aria-current','page');
    expect(screen.getByRole('complementary',{name:'Sidebar'})).toHaveClass('workspace-sidebar');
  });

  it('does not render the public Landing top nav inside the app shell', () => {
    renderAppAt('/dashboard', 'CHAIR');
    expect(screen.queryByRole('navigation', { name: 'Landing' })).not.toBeInTheDocument();
  });
});
