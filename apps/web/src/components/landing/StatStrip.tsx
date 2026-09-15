import { Reveal } from './motion';

const STATS: Array<{ value: string; label: string }> = [
  { value: '6-day', label: 'weekly grid, Mon–Sat' },
  { value: '100%', label: 'conflict-checked placements' },
  { value: '3 roles', label: 'Chair, Faculty, Admin' },
];

export function StatStrip(): JSX.Element {
  return (
    <section aria-label="FlowSched at a glance" className="bg-ink">
      <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
        {STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.08}>
          <div className="flex flex-col text-center md:text-left">
            <dt className="order-2 mt-1 text-sm text-leaf-100/70">{stat.label}</dt>
            <dd className="order-1 font-display text-3xl font-bold text-leaf-500">
              {stat.value}
            </dd>
          </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
