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
    <span className="inline-flex items-center gap-2 rounded-full border border-leaf-100 bg-white px-3 py-1.5 text-xs shadow-sm">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-leaf-500" />
      <span className="font-medium text-ink/60">{label}</span>
      <span className="font-mono font-semibold text-ink">{value}</span>
    </span>
  );
}

function CountCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/60">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold text-ink">{value}</p>
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
        <h1 id="dashboard-title" className="text-2xl font-semibold text-primary-dark">
          {greetingForHour(now.getHours())}, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
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
