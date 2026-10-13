import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

type BlockVariant = 'solid' | 'soft';
type ClassBlock = { day: string; time: string; title: string; sub: string; variant: BlockVariant; ping: boolean; delay: number };

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const HOURS = ['8AM', '9AM', '10AM', '11AM', '12PM'];

const BLOCKS: ClassBlock[] = [
  { day: 'Mon', time: '8AM', title: 'IE 411', sub: 'Ramos', variant: 'solid', ping: true, delay: 0.9 },
  { day: 'Thu', time: '8AM', title: 'IE 411', sub: 'Ramos', variant: 'solid', ping: true, delay: 1.05 },
  { day: 'Wed', time: '10AM', title: 'OR 1', sub: 'Dela Cruz', variant: 'soft', ping: false, delay: 1.2 },
  { day: 'Thu', time: '11AM', title: 'Eng Econ', sub: '', variant: 'soft', ping: false, delay: 1.35 },
];

const DAY_IDX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
const TIME_IDX: Record<string, number> = { '8AM': 0, '9AM': 1, '10AM': 2, '11AM': 3, '12PM': 4 };

const SOLID_CLS = 'bg-gradient-to-br from-brand-500 to-[#2f5fd6] text-white shadow-[0_6px_18px_rgba(50,100,230,0.35)]';
const SOFT_CLS = 'bg-signal-300/10 border border-signal-300/30 text-[#cdeeff]';

/**
 * Weekly-schedule glass card (landing mockup — illustrative only).
 * Tilt is mousemove-driven inline transform; pause-scan toggles
 * sweep + LIVE dot via animationPlayState (utilities are static).
 */
export function ScheduleCard(): JSX.Element {
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState('rotateX(0deg) rotateY(0deg) scale(1)');
  const [tracking, setTracking] = useState(false);
  const frame = useRef<number>(0);

  const handleMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      setTilt(`rotateX(${(-py * 16).toFixed(2)}deg) rotateY(${(px * 16).toFixed(2)}deg) scale(1.015)`);
    });
  }, []);

  const endTrack = (): void => {
    cancelAnimationFrame(frame.current);
    setTracking(false);
    setTilt('rotateX(0deg) rotateY(0deg) scale(1)');
  };

  return (
    <div className="[perspective:1000px]">
      <div
        onMouseMove={handleMove}
        onMouseEnter={() => setTracking(true)}
        onMouseLeave={endTrack}
        style={{ transform: tilt }}
        className={`group relative rounded-[20px] border border-glass-border-strong bg-gradient-to-br from-navy-800/70 to-navy-950/60 shadow-[0_30px_70px_rgba(4,10,30,0.55)] backdrop-blur-[22px] [transform-style:preserve-3d] motion-reduce:transform-none hover:border-[rgba(160,190,255,0.45)] hover:shadow-[0_30px_80px_rgba(50,100,230,0.35)] ${tracking ? 'transition-[border-color,box-shadow] duration-[80ms] ease-linear' : 'transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]'}`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/[0.09] via-transparent to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] before:absolute before:-inset-y-8 before:-left-1/3 before:w-1/2 before:rotate-[18deg] before:bg-gradient-to-r before:from-transparent before:via-white/[0.07] before:to-transparent" />
        <div style={{ transform: 'translateZ(30px)' }} className="relative flex items-center gap-2 px-4 pt-3.5 sm:gap-3 sm:px-5">
          <p className="font-display text-sm font-semibold text-ink-100">Weekly schedule</p>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-widest text-signal-300">
            <span aria-hidden="true" style={paused ? { animationPlayState: 'paused', opacity: 0.25 } : undefined} className="inline-block h-1.5 w-1.5 rounded-full bg-signal-300 animate-pulse-dot motion-reduce:animate-none" />
            LIVE
          </span>
          <span className="font-mono text-[11px] tracking-widest text-ink-500">BSIE 3A</span>
          <button type="button" aria-pressed={paused} onClick={() => setPaused((p) => !p)} className="rounded-full border border-signal-300/25 bg-signal-300/10 px-2.5 py-1.5 font-mono text-xs text-signal-300 transition-colors hover:border-signal-300/50 hover:bg-signal-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950">
            {paused ? '▶ resume scan' : '⏸ pause scan'}
          </button>
        </div>
        <div style={{ transform: 'translateZ(18px)' }} className="relative m-3 overflow-hidden rounded-xl sm:m-4">
          <div className="grid grid-cols-[52px_repeat(5,1fr)]" aria-hidden="true">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="border-b border-r border-[rgba(160,190,255,0.10)] py-2 text-center font-mono text-[10px] tracking-widest text-ink-500 last:border-r-0">{d}</div>
            ))}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="border-b border-r border-[rgba(160,190,255,0.10)] py-3 text-center font-mono text-xs text-ink-500">{h}</div>
                {DAYS.map((d) => (
                  <div key={`${h}-${d}`} className="min-h-[44px] border-b border-r border-[rgba(160,190,255,0.10)] last:border-r-0" />
                ))}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 grid grid-cols-[52px_repeat(5,1fr)] grid-rows-[33px_repeat(5,1fr)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div aria-hidden="true" style={paused ? { animationPlayState: 'paused', opacity: 0.25 } : { transformOrigin: '60% 45%' }} className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,rgba(127,227,255,0.16),transparent_26deg)] animate-sweep-rotate motion-reduce:animate-none" />
              <div aria-hidden="true" style={paused ? { animationPlayState: 'paused', opacity: 0.25 } : { transformOrigin: '60% 45%' }} className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,rgba(127,227,255,0.55)_0deg,transparent_2deg)] animate-sweep-rotate motion-reduce:animate-none" />
            </div>
            {BLOCKS.map((b) => (
              <div key={`${b.day}-${b.time}-${b.title}`} style={{ gridColumn: `${DAY_IDX[b.day] + 2}`, gridRow: `${TIME_IDX[b.time] + 2}`, animationDelay: `${b.delay}s` }} className="relative m-[3px]">
                <div className={`absolute inset-0 rounded-lg px-1.5 py-1 text-left font-mono text-[10px] font-semibold leading-tight opacity-0 animate-block-in motion-reduce:animate-none motion-reduce:opacity-100 ${b.variant === 'solid' ? SOLID_CLS : SOFT_CLS}`}>
                  {b.title}
                  {b.sub ? <span className="block font-normal opacity-90">{b.sub}</span> : null}
                  {b.ping ? (
                    <span className="absolute -right-1 -top-1 flex h-2 w-2">
                      <span aria-hidden="true" style={paused ? { animationPlayState: 'paused', opacity: 0 } : undefined} className="absolute inline-flex h-full w-full rounded-full bg-signal-300 animate-ping-ring" />
                      <span aria-hidden="true" style={paused ? { animationPlayState: 'paused', opacity: 0, animationDelay: '1.2s' } : { animationDelay: '1.2s' }} className="absolute inline-flex h-full w-full rounded-full bg-signal-300 animate-ping-ring" />
                      <span aria-hidden="true" className="relative inline-flex h-2 w-2 rounded-full bg-signal-300" />
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
