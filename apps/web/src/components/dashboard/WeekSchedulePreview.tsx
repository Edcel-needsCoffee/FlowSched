import type { WeekPreviewRoom } from '../../lib/dashboard';

/**
 * WeekSchedulePreview — compact read-only mini grid of the busiest room's
 * plotted slots (Mon–Sat columns, subject + time chips). Purely informational;
 * editing happens on the Schedule page.
 */

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};

export function WeekSchedulePreview({
  preview,
}: {
  preview: WeekPreviewRoom | null;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">This week</h2>
        <span className="text-xs text-ink/50">
          {preview ? `${preview.room_name} — busiest room` : 'No bookings yet'}
        </span>
      </div>
      {!preview || preview.slots.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-leaf-200 px-3 py-6 text-center text-xs text-ink/60">
          Nothing plotted yet this week.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {DAY_ORDER.map((day) => {
            const daySlots = preview.slots.filter((slot) => slot.day_of_week === day);
            return (
              <div key={day} className="min-w-0 rounded-lg bg-surface-muted p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">
                  {DAY_LABELS[day]}
                </p>
                {daySlots.length === 0 ? (
                  <p className="mt-1 text-[10px] text-ink/30">—</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {daySlots.map((slot, index) => (
                      <li
                        key={`${slot.start_time}-${slot.subject_code}-${index}`}
                        title={`${slot.subject_code} · ${slot.section_label} · ${slot.start_time}–${slot.end_time}`}
                        className={`block truncate rounded px-1.5 py-1 text-[10px] leading-tight ${
                          slot.session_type === 'LAB'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-leaf-100 text-leaf-800'
                        }`}
                      >
                        <span className="font-mono font-semibold">{slot.subject_code}</span>
                        <span className="block text-[9px] opacity-80">
                          {slot.start_time}–{slot.end_time}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
