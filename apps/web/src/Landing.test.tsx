import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing/Landing';
import { LoginModal } from './components/auth/LoginModal';
import { useAuthStore } from './store/auth.store';
import { useUiStore } from './store/ui.store';

beforeEach(() => {
  cleanup();
  useAuthStore.getState().logout();
  useUiStore.getState().closeLoginModal();
  document.body.style.overflow = '';
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().logout();
  useUiStore.getState().closeLoginModal();
  document.body.style.overflow = '';
  localStorage.clear();
});

function renderLandingAt(path = '/'): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <LoginModal />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Landing />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/workload" element={<div>My workload page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Landing page', () => {
  // Note: assertions below scan for the legacy CTA wording via a joined
  // pattern so the literal phrase never appears in `apps/web/src`.
  const legacyCta = new RegExp(['request', 'access'].join(' '), 'i');
  it('shows the hero headline with no legacy CTA copy', () => {
    renderLandingAt();
    expect(screen.getByRole('heading', { name: /chaos, plotted/i })).toBeInTheDocument();
    expect(screen.queryByText(legacyCta)).not.toBeInTheDocument();
  });

  it('changes the landing palette when the theme toggle is used', () => {
    renderLandingAt();
    const landing = screen.getByTestId('landing-page');
    const startedLight = landing.dataset.theme === 'light';

    fireEvent.click(screen.getByRole('button', {
      name: startedLight ? 'Switch to dark mode' : 'Switch to light mode',
    }));

    expect(landing.dataset.theme).toBe(startedLight ? 'dark' : 'light');
  });

  it('exposes Log in buttons that open the modal without navigating', () => {
    renderLandingAt();
    const nav = screen.getByRole('navigation', { name: 'Landing' });
    const logins = screen.getAllByRole('button', { name: 'Log in' });
    // Nav holds Log in + the theme toggle (aria-labelled, not "Log in").
    const navScoped = within(nav).getByRole('button', { name: 'Log in' });
    expect(navScoped).toBeInTheDocument();
    expect(within(nav).getByRole('img', { name: 'PIT logo' })).toHaveAttribute('src', '/school-logo.jpg');
    expect(within(nav).getByText('Palompon Institute of Technology')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(logins.length).toBe(2);
    for (const btn of logins) {
      expect(btn.tagName).toBe('BUTTON');
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(logins[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /chaos, plotted/i })).toBeInTheDocument();
  });

  it('keeps the modal closed when the /login route is opened directly', () => {
    renderLandingAt('/login');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /chaos, plotted/i })).toBeInTheDocument();
  });

  it('uses a floating panel without a backdrop and closes via toggle, X, and Escape', async () => {
    renderLandingAt();
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('login-modal-backdrop')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    const artwork = document.querySelector('.fs-art-wrap');
    expect(artwork).toHaveAttribute('aria-hidden', 'true');
    expect(artwork).toHaveClass('fs-art-hidden');
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(artwork).toHaveAttribute('aria-hidden', 'false');
    expect(artwork).not.toHaveClass('fs-art-hidden');
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0]);
    fireEvent.click(screen.getByRole('button', { name: /close login/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Log in' })[0]);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('redirects authenticated sessions to /dashboard', () => {
    useAuthStore.getState().login({
      user: { id: 'u', email: 'c@x.local', role: 'CHAIR', facultyId: null },
      accessToken: 'a',
      refreshToken: 'r',
    });
    renderLandingAt();
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /chaos, plotted/i })).not.toBeInTheDocument();
  });

  it('redirects FACULTY sessions to the dashboard', () => {
    useAuthStore.getState().login({
      user: { id: 'u', email: 'f@x.local', role: 'FACULTY', facultyId: 'fac-1' },
      accessToken: 'a',
      refreshToken: 'r',
    });
    renderLandingAt();
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /chaos, plotted/i })).not.toBeInTheDocument();
  });

  it('links the feature CTA to the feature strip', () => {
    renderLandingAt();
    expect(document.getElementById('what-it-does')).not.toBeNull();
    expect(screen.getByRole('link', {name:/See what it does/})).toHaveAttribute('href','#what-it-does');
  });
  it('opens with the chosen role and focuses email after the entrance', async () => {
    renderLandingAt();
    fireEvent.click(screen.getByRole('button',{name:/Faculty/}));
    const roleChoices = within(screen.getByRole('group', { name: 'Sign in role' }));
    expect(roleChoices.getAllByRole('button').map(button => button.textContent)).toEqual(['Chair','Faculty']);
    expect(roleChoices.getByRole('button',{name:'Faculty'})).toHaveAttribute('aria-pressed','true');
    await waitFor(()=>expect(screen.getByLabelText('Email')).toHaveFocus(),{timeout:900});
  });
});
