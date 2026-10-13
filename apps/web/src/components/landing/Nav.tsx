import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUiStore } from '../../store/ui.store';

/**
 * Landing top nav. Single "Log in" button only — every CTA on this page
 * routes to the real `/login` route.
 */
export function Nav(): JSX.Element {
  const openLoginModal = useUiStore((s) => s.openLoginModal);
  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-glass-border bg-navy-950/85 backdrop-blur"
    >
      <nav aria-label="Landing" className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-signal-300 shadow-[0_0_0_4px_rgba(127,227,255,0.18)] transition-transform duration-300 group-hover:scale-125" />
          <span className="font-display text-lg font-bold tracking-tight text-ink-100">FlowSched</span>
        </Link>
        <div className="mx-auto hidden items-center gap-8 text-sm text-ink-300 md:flex">
          <a href="#features" className="transition-colors duration-200 hover:text-ink-100">
            Features
          </a>
          <a href="#roles" className="transition-colors duration-200 hover:text-ink-100">
            Roles
          </a>
          <a href="#get-started" className="transition-colors duration-200 hover:text-ink-100">
            Get started
          </a>
        </div>
        <motion.span
          className="ml-auto inline-flex items-center gap-2 md:ml-0"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <button
            type="button"
            onClick={openLoginModal}
            className="rounded-xl border border-glass-border-strong bg-glass-fill px-4 py-2 text-sm font-semibold text-ink-100 transition-colors duration-200 hover:border-[rgba(160,190,255,0.45)] hover:bg-glass-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
          >
            Log in
          </button>
        </motion.span>
      </nav>
    </motion.header>
  );
}
