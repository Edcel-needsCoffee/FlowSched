import { motion, useReducedMotion } from 'framer-motion';
import { Reveal } from './motion';
import { useUiStore } from '../../store/ui.store';

export function CtaSection(): JSX.Element {
  const reduce = useReducedMotion();
  const openLoginModal = useUiStore((s) => s.openLoginModal);
  return (
    <section id="get-started" aria-labelledby="cta-title" className="bg-navy-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
        <motion.div
          whileHover={reduce ? undefined : { y: -3 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative overflow-hidden rounded-2xl border border-glass-border-strong bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-6 py-14 text-center shadow-[0_30px_70px_rgba(4,10,30,0.55)] sm:px-12"
        >
          <div
            aria-hidden="true"
            className="landing-grid pointer-events-none absolute inset-0 opacity-70"
          />
          <div className="relative">
            <h2 id="cta-title" className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">
              Ready to plot the term straight?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-300 sm:text-base">
              Sign in with your department account to open the live schedule board.
            </p>
            <motion.span
              className="mt-7 inline-flex"
              whileHover={reduce ? undefined : { y: -2, scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <button
                type="button"
                onClick={openLoginModal}
                className="inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(79,140,255,0.45)] transition-colors duration-200 hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                Log in
              </button>
            </motion.span>
          </div>
        </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
