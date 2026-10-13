/**
 * DashboardHeader — greeting + live department stat pills + the
 * Faculty / Subjects / Rooms counts (mockup top band, app leaf/ink theme).
 * All values come from the summary payload — nothing hardcoded.
 */

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatPill({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <span className="glass-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-500" />
      <span className="font-medium text-slate-600">{label}</span>
      <span className="font-mono font-semibold text-slate-900">{value}</span>
    </span>
  );
}

function CountCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function DashboardHeader({
  greetingName,
  termLabel,
  scheduledPercent,
  roomsInUsePercent,
  nearOrOverCount,
  facultyCount,
  subjectCount,
  roomCount,
  now = new Date(),
}: {
  greetingName: string;
  termLabel: string | null;
  scheduledPercent: number;
  roomsInUsePercent: number;
  nearOrOverCount: number;
  facultyCount: number;
  subjectCount: number;
  roomCount: number;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h1 id="dashboard-title" className="text-2xl font-semibold text-brand-500">
          {greetingForHour(now.getHours())}, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Here&apos;s how the department is doing{termLabel ? ` — ${termLabel}` : ''}.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Department stat pills">
        <StatPill label="Term scheduled" value={`${scheduledPercent}%`} />
        <StatPill label="Rooms in use" value={`${roomsInUsePercent}%`} />
        <StatPill
          label="Near/over load"
          value={String(nearOrOverCount)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CountCard label="Faculty" value={facultyCount} />
        <CountCard label="Subjects" value={subjectCount} />
        <CountCard label="Rooms" value={roomCount} />
      </div>
    </div>
  );
}
