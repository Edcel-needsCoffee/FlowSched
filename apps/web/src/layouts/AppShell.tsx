import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useUiStore } from '../store/ui.store';
import { navItemsForRole, navLabelForPath } from '../config/navigation';

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
    rooms: (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
    reports: (<><path d="M3 3v18h18" /><path d="M7 15v-4M12 17V7M17 13v-2" /></>),
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
  const items = navItemsForRole(user?.role);

  async function handleLogout(): Promise<void> {
    await logoutRequest(refreshToken);
    logout();
    onNavigate?.();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pb-5 pt-6">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-leaf-500 shadow-[0_0_0_4px_rgba(47,191,113,0.25)]" />
        <span className="sidebar-label truncate font-display text-lg font-bold tracking-tight text-white">FlowSched</span>
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onNavigate}
                title={item.label}
                className={({ isActive }) =>
                  `sidebar-item group flex items-center gap-3 rounded-r-md border-l-4 px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'border-leaf-500 bg-leaf-500/10 font-semibold text-white'
                      : 'border-transparent font-normal text-white/60 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <SideIcon name={item.icon} />
                <span className="sidebar-label truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf-500/20 text-xs font-bold text-white">
            {initialsFor(user?.email)}
          </span>
          <span className="sidebar-label min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-white">{user?.email ?? ''}</span>
            <span className="block text-[11px] text-white/50">{user?.role ?? ''}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-label mt-3 w-full rounded-md px-3 py-2 text-left text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
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
  const location = useLocation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const pageTitle = navLabelForPath(location.pathname);

  return (
    <div className="flex h-screen bg-surface-muted text-slate-900">
      <aside aria-label="Sidebar" className="hidden w-16 shrink-0 bg-[#132A1D] md:block lg:w-64 lg:[&_span.sidebar-label]:inline md:max-lg:[&_span.sidebar-label]:hidden">
        <SidebarBody />
      </aside>
      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden="true" data-testid="sidebar-backdrop" onClick={closeSidebar} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <aside aria-label="Sidebar" className="absolute inset-y-0 left-0 w-64 bg-[#132A1D]">
            <SidebarBody onNavigate={closeSidebar} />
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-leaf-100 bg-white px-4 py-3">
          <button type="button" onClick={toggleSidebar} aria-label="Open navigation menu" className="rounded-md p-2 text-ink/60 hover:bg-leaf-50 hover:text-ink md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="truncate text-lg font-semibold text-ink">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-3">
            <label className="hidden items-center gap-2 text-xs text-ink/60 sm:flex">
              Term
              <select aria-label="Active academic term" className="rounded-md border border-leaf-100 bg-white px-2 py-1.5 text-xs text-ink">
                <option>2026-2027 - 1st Sem</option>
                <option>2026-2027 - 2nd Sem</option>
              </select>
            </label>
            <button type="button" aria-label="Notifications" className="rounded-md p-2 text-ink/60 hover:bg-leaf-50 hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
