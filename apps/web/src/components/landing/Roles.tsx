const ROLES: Array<{ name: string; access: string; points: string[] }> = [
  {
    name: 'Chair',
    access: 'Full edit access',
    points: ['Assign subjects and sections', 'Resolve conflicts and approve the term'],
  },
  {
    name: 'Faculty',
    access: 'Own workload only',
    points: ['View assigned subjects and units', 'Check personal weekly schedule', 'Track load against max hours'],
  },
];

import { motion } from 'framer-motion';
import { Reveal, Stagger, StaggerItem } from './motion';

export function Roles(): JSX.Element {
  return (
    <section id="roles" aria-labelledby="roles-title" className="bg-navy-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-widest text-signal-300">Roles</p>
          <h2 id="roles-title" className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">
            One board, two ways to read it.
          </h2>
        </Reveal>
        <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {ROLES.map((role) => (
            <StaggerItem key={role.name}>
            <motion.article
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="h-full rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-sm backdrop-blur transition-colors duration-200 hover:border-signal-300/40 hover:bg-white/[0.07]"
            >
              <h3 className="font-display text-lg font-semibold text-ink-100">{role.name}</h3>
              <p className="mt-1 inline-block rounded-full bg-signal-300/15 px-2.5 py-0.5 text-xs font-medium text-signal-300">
                {role.access}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-300">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-signal-300">
                      ✓
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
