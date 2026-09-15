import { Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuthStore, type AuthRole } from '../store/auth.store';

interface RequireAuthProps {
  children: ReactElement;
  allowedRoles?: AuthRole[];
}

/**
 * Frontend route guard. Unauthenticated users go to /login; authenticated
 * users whose role is not in allowedRoles go to /not-authorized.
 */
export function RequireAuth({ children, allowedRoles }: RequireAuthProps): ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/not-authorized" replace />;
  }
  return children;
}
