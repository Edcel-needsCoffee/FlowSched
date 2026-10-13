import { useUiStore } from '../../store/ui.store';
import { ScheduleCard } from './ScheduleCard';

/**
 * Hero + interactive weekly-schedule glass card (illustrative mockup only —
 * not wired to real data; the real Schedule page lands in Phase 3).
 */
export function Hero(): JSX.Element {
  const openLoginModal = useUiStore((s) => s.openLoginModal);
  return (
    <section className="relative overflow-hidden bg-navy-950 font-body text-ink-100">
      {/* background layer: navy base + two radial glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-navy-950 bg-[radial-gradient(ellipse_90%_60%_at_18%_8%,rgba(79,140,255,0.20),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_85%_15%,rgba(127,227,255,0.10),transparent_60%)]"
      />
      {/* faint 56px grid with radial fade mask */}
      <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0" />
      {/* three drifting orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.28),transparent_65%)] blur-[60px] animate-drift motion-reduce:animate-none" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[8%] top-[38%] h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(127,227,255,0.16),transparent_65%)] blur-[60px] animate-drift motion-reduce:animate-none [animation-delay:-8s] [animation-duration:26s]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-6rem] left-[30%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(124,108,255,0.20),transparent_65%)] blur-[60px] animate-drift motion-reduce:animate-none [animation-delay:-14s] [animation-duration:30s]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass-fill px-3 py-1 font-mono text-xs text-signal-300 opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-signal-300 animate-pulse-dot motion-reduce:animate-none" />
            Built for the IE department
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink-100 sm:text-6xl">
            <span className="block opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100">Workload chaos,</span>
            <span className="block opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:0.18s]">plotted</span>
            <span className="block bg-gradient-to-r from-signal-300 to-brand-400 bg-clip-text text-transparent opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:0.36s]">straight.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-300 opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:0.5s]">
            Drag classes onto a weekly grid, let the system catch every conflict, and let every faculty
            member&apos;s workload calculate itself. No more spreadsheets fighting each other at midterm.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:0.62s]">
            <button
                type="button"
                onClick={openLoginModal}
                className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(79,140,255,0.45)] transition hover:bg-brand-400 hover:shadow-[0_10px_36px_rgba(79,140,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                Log in
              </button>
            <a
                href="#features"
                className="rounded-xl border border-glass-border-strong bg-glass-fill px-5 py-3 text-sm font-medium text-ink-100 backdrop-blur transition hover:border-[rgba(160,190,255,0.45)] hover:bg-glass-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                See what it does
              </a>
          </div>
        </div>

        <div className="relative opacity-0 animate-rise motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:0.4s]">
          <ScheduleCard />
        </div>
      </div>
    </section>
  );
}
