import { motion, useReducedMotion } from 'framer-motion';
import { useUiStore } from '../../store/ui.store';

/**
 * Hero + static weekly-schedule mockup visual (illustrative only — not wired
 * to real data; the real Schedule page lands in Phase 3).
 */
export function Hero(): JSX.Element {
  const reduce = useReducedMotion();
  const openLoginModal = useUiStore((s) => s.openLoginModal);
  const entrance = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };
  const float = reduce ? {} : { animate: { y: [0, -6, 0] } };
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-leaf-50/80 via-white to-leaf-50/60">
      {/* drafting-board grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(60 171 84 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(60 171 84 / 0.08) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-2 md:items-center md:pt-20">
        <motion.div
          {...entrance}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-leaf-300 bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-700">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-leaf-500" />
            Built for the IE department
          </p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Workload
            <br />
            chaos, plotted
            <br />
            straight.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/60">
            Drag classes onto a weekly grid, let the system catch every conflict, and let every faculty
            member&apos;s workload calculate itself. No more spreadsheets fighting each other at midterm.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <motion.span
              className="inline-flex"
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <button
                type="button"
                onClick={openLoginModal}
                className="rounded-md bg-leaf-500 px-5 py-3 text-sm font-semibold text-[#08130D] shadow-sm transition-colors duration-200 hover:bg-leaf-600 hover:text-white hover:shadow-md"
              >
                Log in
              </button>
            </motion.span>
            <motion.span
              className="inline-flex"
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <a
                href="#features"
                className="rounded-md border border-ink/15 bg-white px-5 py-3 text-sm font-medium text-ink/80 transition-colors duration-200 hover:border-ink/30 hover:text-ink hover:shadow-sm"
              >
                See what it does
              </a>
            </motion.span>
          </div>
        </motion.div>

        {/* Static schedule mockup card with green glow */}
        <motion.div
          {...entrance}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <motion.div
            aria-hidden="true"
            {...float}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-4 rounded-3xl bg-leaf-300/40 blur-2xl"
          />
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-[0_20px_50px_-20px_rgba(47,191,113,0.35)]"
            whileHover={reduce ? undefined : { y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-2.5 text-xs">
              <span className="font-medium text-ink/70">Weekly schedule — live</span>
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink/40">BSIE 3A</span>
            </div>
            <div className="grid grid-cols-[2.2rem_repeat(5,1fr)] text-center" aria-hidden="true">
              <div />
              {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => (
                <div key={day} className="border-b border-leaf-50 py-1.5 font-mono text-[10px] tracking-wide text-ink/40">
                  {day}
                </div>
              ))}
              {['8AM', '9AM', '10AM', '11AM', '12PM'].map((hour) => (
                <div key={hour} className="contents">
                  <div className="border-b border-leaf-50 py-3 font-mono text-[9px] text-ink/35">{hour}</div>
                  {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => {
                    const key = `${hour}-${day}`;
                    if (key === '8AM-MON' || key === '8AM-THU') {
                      return (
                        <div key={key} className="border-b border-l border-leaf-50 p-0.5">
                          <div className="rounded border border-leaf-700 bg-leaf-500 px-1 py-1.5 text-left font-mono text-[9px] font-semibold leading-tight text-white">
                            IE 411
                            <span className="block font-normal opacity-90">Ramos</span>
                          </div>
                        </div>
                      );
                    }
                    if (key === '10AM-WED') {
                      return (
                        <div key={key} className="border-b border-l border-leaf-50 p-0.5">
                          <div className="rounded border border-leaf-500 bg-leaf-300 px-1 py-1.5 text-left font-mono text-[9px] leading-tight text-ink">
                            OR 1<span className="block">Dela</span>
                            <span className="block">Cruz</span>
                          </div>
                        </div>
                      );
                    }
                    if (key === '11AM-THU') {
                      return (
                        <div key={key} className="border-b border-l border-leaf-50 p-0.5">
                          <div className="rounded-r border border-leaf-500 border-l-2 bg-leaf-100 px-1 py-1 text-left font-mono text-[9px] leading-tight text-ink">
                            Eng<span className="block">Econ</span>
                          </div>
                        </div>
                      );
                    }
                    return <div key={key} className="border-b border-l border-leaf-50" />;
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
