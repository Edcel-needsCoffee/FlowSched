import { Link } from 'react-router-dom';
import { formatTime12h } from './Schedule/schedule-time';
import { useCallback, useEffect, useState } from 'react';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { selectSelectedTerm, useTermStore } from '../store/term.store';
import { DashboardStagger, DashboardStaggerItem } from '../components/dashboard/motion';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { WeeklyPlottingCard } from '../components/dashboard/WeeklyPlottingCard';
import { TermProgressCard } from '../components/dashboard/TermProgressCard';
import { RoomUtilizationCard } from '../components/dashboard/RoomUtilizationCard';
import { FacultyLoadPanel } from '../components/dashboard/FacultyLoadPanel';
import { WeekSchedulePreview } from '../components/dashboard/WeekSchedulePreview';
import { RoomsStatusList } from '../components/dashboard/RoomsStatusList';
import { ProfilePhoto } from '../components/dashboard/ProfilePhoto';
import { downloadProgramWorkbook } from '../lib/program-download';
import './dashboard.css';

type Status = 'loading' | 'ready' | 'error';

export const cardCls = 'dashboard-card rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.035)]';
export const statValueCls = 'mt-1 text-3xl font-bold tracking-tight text-neutral-950';
export const statLabelCls = 'text-xs font-medium uppercase tracking-wide text-neutral-500';
export const sectionTitleCls = 'text-base font-semibold text-neutral-900';
export const sectionSubCls = 'text-xs text-slate-500';

/**
 * Dashboard — department overview (ui-ux.md section 4, FR-06/FR-08).
 * Chair sees live department-wide panels; Faculty see only
 * their own summary. All numbers come from GET /api/dashboard/summary.
 */
export function DashboardPage(): JSX.Element {
  // The summary is role-scoped server-side, so it must be re-fetched whenever
  // the signed-in identity changes — otherwise a login that swaps users inside
  // one SPA session (chair → faculty) would keep showing the previous user's
  // department-wide payload under the new account.
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const termStatus = useTermStore((s) => s.status);
  const loadTerms = useTermStore((s) => s.loadTerms);
  const selectedTermId = useTermStore((s) => s.selectedTermId);
  const term = useTermStore(selectSelectedTerm);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (termStatus === 'idle') {
      void loadTerms();
    }
  }, [termStatus, loadTerms]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await getDashboardSummary(selectedTermId ?? undefined);
      setSummary(res.summary);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [selectedTermId, reloadTick, userId, role]);

  useEffect(() => {
    if (termStatus === 'ready') {
      void load();
    }
  }, [termStatus, load]);

  return (
    <section aria-labelledby="dashboard-title" className="dashboard-page space-y-5 font-body text-neutral-900">
      {status === 'error' ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-red-700">Couldn&apos;t load the dashboard</p>
          <button
            type="button"
            onClick={() => setReloadTick((tick) => tick + 1)}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : status === 'loading' || !summary ? (
        <LoadingSkeleton scope={summary?.scope ?? (role === 'FACULTY' ? 'personal' : 'department')} />
      ) : summary.scope === 'department' ? (
        <ChairDashboard summary={summary} termLabel={term?.label ?? null} />
      ) : (
        <PersonalView summary={summary} />
      )}
    </section>
  );
}

function LoadingSkeleton({ scope }: { scope: 'department' | 'personal' }): JSX.Element {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-4">
      <div className="flex items-center gap-4">
        <div aria-hidden="true" className="h-20 w-20 animate-pulse rounded-full bg-leaf-100" />
        <div className="space-y-2" aria-hidden="true">
          <div className="h-4 w-40 rounded bg-leaf-100" />
          <div className="h-3 w-24 rounded bg-leaf-100" />
        </div>
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${cardCls} animate-pulse`}>
            <div className="h-3 w-24 rounded bg-leaf-100" />
            <div className="mt-3 h-8 w-16 rounded bg-leaf-100" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className={`grid gap-4 ${scope === 'department' ? 'lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${cardCls} h-48 animate-pulse`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Chair dashboard — mockup-matching composition with the
 * app's leaf/ink theme: header, weekly bars, term ring, room
 * utilization, dark load panel, week preview and rooms list, all fed from
 * the (real) summary payload and animated in top-to-bottom.
 */
function ChairDashboard({
  summary,
  termLabel,
}: {
  summary: Extract<DashboardSummary, { scope: 'department' }>;
  termLabel: string | null;
}): JSX.Element {
  const user = useAuthStore((s) => s.user);

  return (
    <DashboardStagger className="space-y-4">
      <DashboardStaggerItem>
        <DashboardHeader
          greetingName={user?.role === 'CHAIR' && user.username
            ? user.username
            : user?.email?.split('@')[0] ?? 'there'}
          termLabel={termLabel}
          scheduledPercent={summary.term_scheduled_percent}
          roomsInUsePercent={summary.rooms_in_use_percent}
          nearOrOverCount={summary.near_or_over_count}
          facultyCount={summary.faculty_count}
          subjectCount={summary.subject_count}
          roomCount={summary.room_count}
        />
      </DashboardStaggerItem>
      <DashboardStaggerItem>
        <div className="grid gap-4 lg:grid-cols-3">
          <WeeklyPlottingCard entries={summary.weekly_plotted_hours} />
          <TermProgressCard percent={summary.term_scheduled_percent} />
          <RoomUtilizationCard utilization={summary.room_utilization} />
        </div>
      </DashboardStaggerItem>
      <DashboardStaggerItem>
        <FacultyLoadPanel entries={summary.faculty_load} />
      </DashboardStaggerItem>
      <DashboardStaggerItem>
        <WeekSchedulePreview preview={summary.this_week_preview} />
      </DashboardStaggerItem>
      <DashboardStaggerItem>
        <RoomsStatusList rooms={summary.rooms_status} />
      </DashboardStaggerItem>
    </DashboardStagger>
  );
}

export function PersonalView({ summary }: { summary: Extract<DashboardSummary, { scope: 'personal' }> }): JSX.Element {
  const term = useTermStore(selectSelectedTerm);
  const user = useAuthStore(state => state.user);
  const total = summary.total_faculty_time ?? 0;
  const target = summary.weekly_hours ?? 40;
  const percent = Math.max(0, Math.min(100, target > 0 ? total / target * 100 : 0));
  const hours = (value: number) => Number(value.toFixed(1)).toString();
  const remaining = Math.max(0, target - total);
  const profile = summary.profile;
  const employment = profile?.employment_status === 'FULL_TIME' ? 'Full-time' : profile?.employment_status === 'PART_TIME' ? 'Part-time' : profile?.employment_status || 'Not set';
  if (!summary.faculty_id) return <div className={cardCls}><h1 id="dashboard-title">Faculty dashboard</h1><p>Your account is not linked to a faculty record yet. Ask the department chair to link your login.</p></div>;
  return <div className="personal-dashboard faculty-dashboard">
    <header className="fd-header"><div><h1 id="dashboard-title">Faculty dashboard</h1><p>{term?.label ?? 'No academic term selected'}</p></div><Link to="/workload" className="fd-open-load">Open Teaching Load</Link></header>
    <div className="fd-grid">
      <aside className="fd-profile fd-card" aria-label="Faculty profile">
        <div className="fd-portrait"><div className="fd-portrait-outline" aria-hidden="true"/><ProfilePhoto src={user?.avatar_url ?? summary.avatar_url} name={summary.faculty_name} alt={summary.faculty_name + ' profile photo'} className="fd-photo"/><span className="fd-role">Faculty</span></div>
        <h2>{summary.faculty_name}</h2><p className="fd-department">{profile?.department || 'Department not set'}</p>
        <dl>{[['Employee ID', profile?.employee_no || 'Not set'], ['Program', profile?.program || 'Not set'], ['Sections', profile?.sections.length ? profile.sections.join(', ') : 'None assigned'], ['Status', employment]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </aside>
      <div className="fd-main">
        <div className="fd-metrics">
          <section className="fd-card fd-weekly" aria-labelledby="fd-weekly-label"><h2 id="fd-weekly-label">Weekly faculty time</h2><p className="fd-value">{hours(total)}h <span>/ {hours(target)}</span></p><div className="fd-progress" role="progressbar" aria-label="Faculty time vs weekly target" aria-valuenow={Number(percent.toFixed(1))} aria-valuemin={0} aria-valuemax={100}><span style={{width: percent + '%'}}/></div><p className="fd-remaining">{total > target ? hours(total - target) + 'h above target' : remaining === 0 ? 'Weekly target met' : hours(remaining) + 'h remaining'}</p></section>
          <section className="fd-card fd-assigned" aria-labelledby="fd-assigned-label"><h2 id="fd-assigned-label">Assigned teaching hours</h2><p className="fd-secondary">{hours(summary.my_total_hours)}h</p></section>
        </div>
        <section className="fd-card fd-upcoming" aria-labelledby="fd-upcoming-title"><h2 id="fd-upcoming-title">Upcoming classes</h2><p className="fd-subtitle">Today’s classes · Philippine time</p>
          {summary.todays_classes.length === 0 ? <p className="fd-empty">No classes scheduled for today.</p> : <ul>{summary.todays_classes.map((entry, index) => {
            const next = summary.my_next_class;
            const isNext = next !== null && entry.day_of_week === next.day_of_week && entry.start_time === next.start_time && entry.subject_code === next.subject_code && entry.section_label === next.section_label;
            return <li key={entry.day_of_week + entry.start_time + entry.subject_code + index} className={isNext ? 'fd-class fd-next' : 'fd-class'}><div className="fd-class-time"><strong>{entry.day_of_week.slice(0, 1).toUpperCase() + entry.day_of_week.slice(1).toLowerCase()}</strong><span>{formatTime12h(entry.start_time)}–{formatTime12h(entry.end_time)}</span></div><div className="fd-class-details"><strong>{entry.subject_code} · {entry.subject_title}</strong><span>{entry.section_label} · {entry.room_name ?? 'Room TBA'}</span></div><span className="fd-class-badge">{isNext ? 'Next class' : 'Today'}</span></li>;
          })}</ul>}
        </section>
      </div>
    </div>
  </div>;
}

export function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }): JSX.Element {
  return (
    <div className={cardCls}>
      <p className={statLabelCls}>{label}</p>
      <p className={statValueCls}>
        {value}
        {suffix ? <span className="text-base font-medium text-ink/50">{suffix}</span> : null}
      </p>
    </div>
  );
}
