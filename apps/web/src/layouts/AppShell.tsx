import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useUiStore } from '../store/ui.store';
import { navGroupsForRole, navLabelForPath } from '../config/navigation';
import { useTermStore } from '../store/term.store';
import { ThemeToggle } from '../components/ThemeToggle';
import './workspace-glass.css';
import { AvatarImage } from '../components/dashboard/AvatarImage';
import { profileNameForUser } from '../components/dashboard/ProfileCard';

function initialsFor(email: string | undefined): string {
  if (!email) return '?';
  const name = email.split('@')[0] ?? '';
  const parts = name.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0]}${parts[1]?.[0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function SideIcon({ name }: { name: string }): JSX.Element {
  const p: Record<string, JSX.Element> = {
    dashboard: (<><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>),
    schedule: (<><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
    assignment: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M9 12h6M9 16h6" /></>),
    faculty: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>),
    subjects: (<><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></>),
    sections: (<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></>),
    rooms: (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
    workload: (<><path d="M12 20V10M18 20V4M6 20v-4" /></>),
    account: (<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>),
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p[name] ?? p.dashboard}
    </svg>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const navigate = useNavigate();
  const groups = navGroupsForRole(user?.role);

  async function handleLogout(): Promise<void> {
    await logoutRequest(refreshToken);
    logout();
    onNavigate?.();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pb-5 pt-6">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-signal-300 shadow-[0_0_0_4px_rgba(127,227,255,0.18)]" />
        <span className="sidebar-label truncate font-display text-lg font-bold tracking-tight text-ink-100">FlowSched</span>
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-2">
          {groups.map((group, groupIndex) => (
            <li key={group.label} className={groupIndex === 0 ? '' : 'border-t border-slate-200/80 pt-2'}>
              <span className="mb-1 block px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:max-lg:hidden">
                {group.label}
              </span>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      title={item.label}
                      className={({ isActive }) =>
                        `sidebar-item group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                          isActive
                            ? 'border-neutral-400 bg-white/[0.10] font-medium text-ink-100 shadow-sm'
                            : 'border-transparent font-normal text-ink-300 hover:border-white/[0.06] hover:bg-white/[0.045] hover:text-ink-100'
                        }`
                      }
                    >
                      <SideIcon name={item.icon} />
                      <span className="sidebar-label truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto border-t border-glass-border p-4">
        <div className="flex items-center gap-3">
          <AvatarImage key={user?.avatar_url ?? 'sidebar-initials'} src={user?.avatar_url} name={profileNameForUser(user)} className="!h-9 !w-9 !text-xs" />
          <span className="sidebar-label min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-ink-100">{profileNameForUser(user)}</span>
            <span className="block text-[11px] text-ink-300">{user?.role ?? ''}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-logout sidebar-label mt-3 w-full rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-[transform,box-shadow,background-color]"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

/**
 * Authenticated app shell (ui-ux.md 2.2).
 */
export function AppShell(): JSX.Element {
  const userRole = useAuthStore(s=>s.user?.role);
  const location = useLocation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const pageTitle = navLabelForPath(location.pathname);

  return (
    <div className={`app-bg workspace-ui flex h-screen${location.pathname==='/dashboard'?' dashboard-shell':''}`}>
      <aside aria-label="Sidebar" className="workspace-sidebar hidden w-16 shrink-0 border-r border-neutral-200 bg-white/90 shadow-sm backdrop-blur-xl md:block lg:w-64 lg:[&_span.sidebar-label]:inline md:max-lg:[&_span.sidebar-label]:hidden">
        <SidebarBody />
      </aside>
      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" data-testid="sidebar-backdrop" onClick={closeSidebar} className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" />
          <aside aria-label="Sidebar" className="workspace-sidebar absolute inset-y-0 left-0 w-64 border-r border-neutral-200 bg-white/95 shadow-xl backdrop-blur-xl">
            <SidebarBody onNavigate={closeSidebar} />
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-11 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-1 backdrop-blur-[18px]">
          <button type="button" onClick={toggleSidebar} aria-label="Open navigation menu" className="rounded-md p-2 text-slate-600 hover:bg-brand-500/10 hover:text-slate-900 md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <TermSelector />
            <ThemeToggle />
            {(userRole==='CHAIR'||userRole==='FACULTY')&&<NotificationButton/>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Header Term selector — backed by the real terms API. Loads once per shell
 * mount; the selection lives in the shared term store so the Schedule page
 * (and any other page) always agrees on the working term. Defaults to the
 * active term seeded by the API seed script.
 */
function TermSelector(): JSX.Element | null {
  const terms = useTermStore((s) => s.terms);
  const status = useTermStore((s) => s.status);
  const selectedTermId = useTermStore((s) => s.selectedTermId);
  const loadTerms = useTermStore((s) => s.loadTerms);
  const selectTerm = useTermStore((s) => s.selectTerm);

  useEffect(() => {
    if (status === 'idle') {
      void loadTerms();
    }
  }, [status, loadTerms]);

  if (status === 'error' || (status === 'ready' && terms.length === 0)) {
    return null;
  }

  return (
    <label className="hidden items-center gap-2 text-xs text-slate-600 sm:flex">
      Term
      <select
        aria-label="Active academic term"
        value={selectedTermId ?? ''}
        onChange={(event) => selectTerm(event.target.value)}
        className="rounded-md border border-brand-500/20 bg-white/80 px-2 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
      >
        {terms.length === 0 ? (
          <option value="">Loading…</option>
        ) : (
          terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function NotificationButton(): JSX.Element {
  return <details className="relative"><summary aria-label="Notifications" className="header-notifications cursor-pointer list-none rounded-lg border border-current/20 px-2 py-1"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></summary><p className="absolute right-0 z-30 mt-2 w-48 rounded-lg border bg-white p-3 text-sm text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100">No notifications yet.</p></details>;
}
