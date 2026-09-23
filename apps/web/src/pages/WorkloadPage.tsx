import { FacultySchedulePage } from './Views/FacultySchedulePage';

/**
 * "My Workload" — the signed-in user's own Faculty Class Program, powered by
 * the same read-only view as the Faculty Schedule page (self-scoped here, so
 * the placeholder's "coming soon" is replaced by the real thing).
 */
export function WorkloadPage(): JSX.Element {
  return <FacultySchedulePage selfScoped heading="My Workload" />;
}

