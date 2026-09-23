import { motion, useReducedMotion } from 'framer-motion';
import type { WeeklyHoursEntry } from '../../lib/dashboard';

/**
 * WeeklyPlottingCard — Mon–Sat bar chart of plotted hours. Bars grow from 0
 * on mount, staggered ~60ms apart; reduced motion renders the final heights
 * immediately. Empty weeks get a friendly placeholder instead of a flat axis.
 */

const DAY_LABELS: Record<WeeklyHoursEntry['day_of_week'], string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};

export function WeeklyPlottingCard({
  entries,
}: {
  entries: WeeklyHoursEntry[];
}): JSX.Element {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...entries.map((entry) => entry.hours));
  const total = entries.reduce((sum, entry) => sum + entry.hours, 0);
  return (
    <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Weekly plotted hours</h2>
      <p className="mt-0.5 text-xs text-ink/50">Mon–Sat · {total}h plotted this term</p>
      {total === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-leaf-200 px-3 py-6 text-center text-xs text-ink/60">
          Nothing plotted yet this week.
        </p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-3" role="img" aria-label="Plotted hours per day, Monday to Saturday">
          {entries.map((entry, index) => {
            const pct = Math.max(entry.hours > 0 ? 6 : 2, (entry.hours / max) * 100);
            return (
              <div key={entry.day_of_week} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-ink/60">
                  {entry.hours > 0 ? `${entry.hours}h` : ''}
                </span>
                {reduce ? (
                  <div
                    className="w-full rounded-t-md bg-leaf-500"
                    style={{ height: `${pct}%`, backgroundColor: entry.hours === 0 ? '#D7F5E2' : undefined }}
                  />
                ) : (
                  <motion.div
                    className="w-full rounded-t-md bg-leaf-500"
                    style={{ backgroundColor: entry.hours === 0 ? '#D7F5E2' : undefined }}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="text-[10px] font-medium uppercase tracking-wide text-ink/50">
                  {DAY_LABELS[entry.day_of_week]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
