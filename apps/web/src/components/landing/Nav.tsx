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
      className="sticky top-0 z-40 border-b border-leaf-100 bg-white/90 backdrop-blur"
    >
      <nav aria-label="Landing" className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-leaf-500 shadow-[0_0_0_4px_rgba(47,191,113,0.18)] transition-transform duration-300 group-hover:scale-125" />
          <span className="font-display text-lg font-bold tracking-tight text-ink">FlowSched</span>
        </Link>
        <div className="mx-auto hidden items-center gap-8 text-sm text-ink/60 md:flex">
          <a href="#features" className="transition-colors duration-200 hover:text-ink">
            Features
          </a>
          <a href="#roles" className="transition-colors duration-200 hover:text-ink">
            Roles
          </a>
          <a href="#get-started" className="transition-colors duration-200 hover:text-ink">
            Get started
          </a>
        </div>
        <motion.span
          className="ml-auto inline-flex md:ml-0"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <button
            type="button"
            onClick={openLoginModal}
            className="rounded-md border border-ink/70 px-4 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
          >
            Log in
          </button>
        </motion.span>
      </nav>
    </motion.header>
  );
}
