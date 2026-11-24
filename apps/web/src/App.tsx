import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing/Landing';
import { LoginModal } from './components/auth/LoginModal';
import { SessionBootstrap } from './components/auth/SessionBootstrap';
import { AppShell } from './layouts/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { SectionsPage } from './pages/SectionsPage';
import { FacultyPage } from './pages/FacultyPage';
import { SchedulePage } from './pages/Schedule/SchedulePage';
import { TeachingLoadPage } from './pages/TeachingLoadPage';
import { FormSettingsPage } from './pages/FormSettingsPage';
import { ProgramPrintPage } from './pages/ProgramPrintPage';
import { WorkloadAssignmentPage } from './pages/WorkloadAssignment/WorkloadAssignmentPage';
import { RoomsPage } from './pages/RoomsPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotAuthorizedPage } from './pages/NotAuthorizedPage';
import { RequireAuth } from './components/RequireAuth';
import { ToastProvider } from './components/Toast';
import { ALL_ROLES, MANAGEMENT_ROLES } from './config/navigation';
import type { AuthRole } from './store/auth.store';
import { useUiStore } from './store/ui.store';
import './layouts/workspace-theme.css';

/** My Workload: Chair + Faculty. */
const MY_WORKLOAD_ROLES: AuthRole[] = ['CHAIR', 'FACULTY'];

export function App(): JSX.Element {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('flowsched-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      {/* Boot-time session restore — must wrap the router content so the
          check runs before RequireAuth makes any redirect decision. */}
      <SessionBootstrap>
        <ToastProvider>
        <LoginModal />
        <Routes>
          {/* Public landing: full-bleed marketing layout (own nav/footer). */}
          <Route path="/" element={<Landing />} />
          {/* Protected-route redirects land here, but the dialog only opens
              after an explicit click on a Login button. */}
          <Route path="/login" element={<Landing />} />
          {/* Authenticated-app shell (nav + constrained content width). */}
          <Route element={<AppShell />}>
            <Route path="/not-authorized" element={<NotAuthorizedPage />} />
            <Route path="/print/:kind/:id" element={<RequireAuth allowedRoles={ALL_ROLES}><ProgramPrintPage/></RequireAuth>}/>
            <Route path="/form-settings" element={<RequireAuth allowedRoles={['CHAIR']}><FormSettingsPage/></RequireAuth>}/>
            <Route
              path="/dashboard"
              element={
                <RequireAuth allowedRoles={ALL_ROLES}>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/schedule"
              element={
                <RequireAuth allowedRoles={MANAGEMENT_ROLES}>
                  <SchedulePage />
                </RequireAuth>
              }
            />
            <Route
              path="/workload"
              element={
                <RequireAuth allowedRoles={ALL_ROLES}>
                  <TeachingLoadPage />
                </RequireAuth>
              }
            />
            <Route path="/function-planner" element={<RequireAuth allowedRoles={['FACULTY']}><TeachingLoadPage plannerOnly /></RequireAuth>}/>
            <Route
              path="/workload-assignment"
              element={
                <RequireAuth allowedRoles={MANAGEMENT_ROLES}>
                  <WorkloadAssignmentPage />
                </RequireAuth>
              }
            />
            <Route
              path="/rooms"
              element={
                <RequireAuth allowedRoles={MANAGEMENT_ROLES}>
                  <RoomsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/subjects"
              element={
                <RequireAuth allowedRoles={MANAGEMENT_ROLES}>
                  <SubjectsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/sections"
              element={
                <RequireAuth allowedRoles={MANAGEMENT_ROLES}>
                  <SectionsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/faculty"
              element={
                <RequireAuth allowedRoles={MANAGEMENT_ROLES}>
                  <FacultyPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth allowedRoles={ALL_ROLES}>
                  <AccountSettingsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth allowedRoles={ALL_ROLES}>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </ToastProvider>
      </SessionBootstrap>
    </BrowserRouter>
  );
}

