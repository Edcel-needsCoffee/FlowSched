import { motion, useReducedMotion } from 'framer-motion';
import { Reveal } from './motion';
import { useUiStore } from '../../store/ui.store';

export function CtaSection(): JSX.Element {
  const reduce = useReducedMotion();
  const openLoginModal = useUiStore((s) => s.openLoginModal);
  return (
    <section id="get-started" aria-labelledby="cta-title" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
        <motion.div
          whileHover={reduce ? undefined : { y: -3 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-leaf-600 via-leaf-500 to-leaf-400 px-6 py-14 text-center shadow-lg shadow-leaf-200 sm:px-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgb(255 255 255 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.12) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative">
            <h2 id="cta-title" className="mx-auto max-w-xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to plot the term straight?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
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
                className="inline-block rounded-md bg-leaf-500 px-6 py-3 text-sm font-semibold text-[#08130D] shadow transition-colors duration-200 hover:bg-leaf-600 hover:text-white hover:shadow-lg"
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
