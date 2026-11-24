import type { AuthRole } from '../store/auth.store';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles: AuthRole[];
  group: 'Workspace' | 'Management' | 'Administration' | 'Account';
}

export const ALL_ROLES: AuthRole[] = ['CHAIR', 'FACULTY'];
export const MANAGEMENT_ROLES: AuthRole[] = ['CHAIR'];

/**
 * Single source of truth for authenticated sidebar navigation
 * (ui-ux.md §2.2/§3, requirements.md §3).
 * Role visibility mirrors the RequireAuth allowedRoles in App.tsx.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', allowedRoles: ALL_ROLES, group: 'Workspace' },
  { label: 'Schedule', path: '/schedule', icon: 'schedule', allowedRoles: MANAGEMENT_ROLES, group: 'Workspace' },
  { label: 'Teaching Load', path: '/workload', icon: 'workload', allowedRoles: ALL_ROLES, group: 'Workspace' },
  { label: 'Weekly Function Planner', path: '/function-planner', icon: 'schedule', allowedRoles: ['FACULTY'], group: 'Workspace' },
  { label: 'Workload Assignment', path: '/workload-assignment', icon: 'assignment', allowedRoles: MANAGEMENT_ROLES, group: 'Management' },
  { label: 'Section Management', path: '/sections', icon: 'sections', allowedRoles: MANAGEMENT_ROLES, group: 'Management' },
  { label: 'Faculty Management', path: '/faculty', icon: 'faculty', allowedRoles: MANAGEMENT_ROLES, group: 'Management' },
  { label: 'Subjects', path: '/subjects', icon: 'subjects', allowedRoles: MANAGEMENT_ROLES, group: 'Management' },
  { label: 'Room Management', path: '/rooms', icon: 'rooms', allowedRoles: MANAGEMENT_ROLES, group: 'Management' },
  { label: 'Form Settings', path: '/form-settings', icon: 'account', allowedRoles: ['CHAIR'], group: 'Administration' },
  { label: 'Account Settings', path: '/account', icon: 'account', allowedRoles: ALL_ROLES, group: 'Account' },
];

const GROUP_ORDER: NavItem['group'][] = ['Workspace', 'Management', 'Administration', 'Account'];

export function navGroupsForRole(role: AuthRole | null | undefined): { label: NavItem['group']; items: NavItem[] }[] {
  if (!role) return [];
  return GROUP_ORDER.map((label) => ({
    label,
    items: NAV_ITEMS.filter((item) => item.group === label && item.allowedRoles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

export function navItemsForRole(role: AuthRole | null | undefined): NavItem[] {
  return navGroupsForRole(role).flatMap((group) => group.items);
}

export function navLabelForPath(pathname: string): string {
  const match = NAV_ITEMS.find((item) => item.path === pathname);
  if (match) return match.label;
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/not-authorized') return 'Not Authorized';
  return 'Dashboard';
}
