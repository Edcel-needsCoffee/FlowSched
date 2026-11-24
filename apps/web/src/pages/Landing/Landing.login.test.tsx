import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './Landing';
import { LoginModal } from '../../components/auth/LoginModal';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

beforeEach(() => {
  useAuthStore.getState().logout();
  useUiStore.getState().closeLoginModal();
});
afterEach(() => {
  cleanup();
  useUiStore.getState().closeLoginModal();
});

function openPage(path: string) {
  render(<MemoryRouter initialEntries={[path]}><LoginModal/><Landing/></MemoryRouter>);
}

describe('landing login visibility', () => {
  it.each(['/', '/login'])('sends an authenticated faculty opening %s to Dashboard', path => {
    useAuthStore.getState().login({ user: { id: 'u', email: 'f@example.com', role: 'FACULTY', facultyId: 'f' }, accessToken: 'a', refreshToken: 'r' });
    render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={<Landing/>}/><Route path="/dashboard" element={<div>Dashboard route</div>}/><Route path="/workload" element={<div>Teaching Load route</div>}/></Routes></MemoryRouter>);
    expect(screen.getByText('Dashboard route')).toBeInTheDocument();
    expect(screen.queryByText('Teaching Load route')).not.toBeInTheDocument();
  });
  it.each(['/', '/login'])('keeps login closed when opening %s directly', (path) => {
    openPage(path);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useUiStore.getState().isLoginModalOpen).toBe(false);
  });

  it('opens only on the landing login action and stays closed after dismissal', () => {
    openPage('/');
    const frame = screen.getByTestId('landing-page') as HTMLIFrameElement;
    fireEvent(window, new MessageEvent('message', {
      source: frame.contentWindow,
      origin: window.location.origin,
      data: { type: 'flowsched-login' },
    }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close login dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useUiStore.getState().isLoginModalOpen).toBe(false);
  });
});
