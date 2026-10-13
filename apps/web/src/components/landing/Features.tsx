import { motion } from 'framer-motion';
import { Reveal, Stagger, StaggerItem } from './motion';

const FEATURES: Array<{ title: string; body: string; icon: string }> = [
  {
    title: 'Drag-and-drop weekly grid',
    body: 'Plot classes onto a Mon–Sat board and rearrange the whole term by dragging blocks, not editing cells.',
    icon: '▦',
  },
  {
    title: 'Automatic conflict detection',
    body: 'Overlapping faculty, room, or section assignments surface the moment they happen — never at midterm.',
    icon: '⚡',
  },
  {
    title: 'Self-calculating workloads',
    body: 'Units and hours roll up per faculty member as you assign, so totals are always current.',
    icon: '∑',
  },
  {
    title: 'Role-scoped views',
    body: 'Chairs edit everything, faculty see their own load, admins get read-only oversight of the term.',
    icon: '◉',
  },
  {
    title: 'Room-aware scheduling',
    body: 'Every block carries its room, so double-booked labs and maintenance closures stand out early.',
    icon: '▭',
  },
  {
    title: 'One-click reports',
    body: 'Export per-faculty or per-section summaries for deliberation season without rebuilding pivots.',
    icon: '≡',
  },
];

export function Features(): JSX.Element {
  return (
    <section id="features" aria-labelledby="features-title" className="bg-navy-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
        <p className="font-mono text-xs uppercase tracking-widest text-signal-300">Features</p>
        <h2 id="features-title" className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">
          Everything the spreadsheet was trying to be.
        </h2>
        </Reveal>
        <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title}>
            <motion.article
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="group h-full rounded-xl border border-glass-border bg-glass-fill p-5 backdrop-blur transition-colors duration-200 hover:border-glass-border-strong hover:bg-glass-fill-strong"
            >
              <div
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-base font-bold text-white transition-transform duration-200 group-hover:scale-110"
              >
                {feature.icon}
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-ink-100">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{feature.body}</p>
            </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
