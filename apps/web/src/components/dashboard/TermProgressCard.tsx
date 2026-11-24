/** Half-circle gauge of actual assignment hours plotted. */
export function TermProgressCard({percent}:{percent:number}):JSX.Element{
 const clamped=Math.max(0,Math.min(100,Math.round(percent)));
 return <div className="glass-card p-4 db-term-card"><h2 className="text-sm font-semibold text-slate-900">Term progress</h2>
 <div className="db-term-gauge" role="progressbar" aria-label="Term scheduled progress" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
 <svg viewBox="0 0 240 145" aria-hidden="true"><path d="M25 120 A95 95 0 0 1 215 120" fill="none" className="db-gauge-track" strokeWidth="14" strokeLinecap="round"/>
 <path d="M25 120 A95 95 0 0 1 215 120" fill="none" stroke="#24bd86" strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray={`${clamped} 100`} className="db-gauge-fill" style={{opacity:clamped?1:0}}/></svg>
 <span>{clamped}%<small>Scheduled</small></span></div><p className="text-center text-xs text-slate-500">of assignment hours plotted</p></div>;
}
