import { Reveal } from './motion';

const STATS: Array<{ value: string; label: string }> = [
  { value: '6-day', label: 'weekly grid, Mon–Sat' },
  { value: '100%', label: 'conflict-checked placements' },
  { value: '3 roles', label: 'Chair, Faculty, Admin' },
];

export function StatStrip(): JSX.Element {
  return (
    <section aria-label="FlowSched at a glance" className="bg-navy-950">
      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-glass-border bg-glass-fill sm:grid-cols-3">
        {STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.08} className="bg-navy-900/60 px-6 py-8 backdrop-blur">
          <div className="flex flex-col text-center md:text-left">
            <dt className="order-2 mt-1 text-sm text-ink-300">{stat.label}</dt>
            <dd className="order-1 font-display text-3xl font-semibold text-signal-300">
              {stat.value}
            </dd>
          </div>
          </Reveal>
        ))}
      </dl>
      </div>
    </section>
  );
}
