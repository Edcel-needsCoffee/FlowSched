import { useId } from 'react';
import type { WeeklyHoursEntry } from '../../lib/dashboard';

const DAY_LABELS:Record<WeeklyHoursEntry['day_of_week'],string>={MON:'Mon',TUE:'Tue',WED:'Wed',THU:'Thu',FRI:'Fri',SAT:'Sat'};
/** A data-driven line chart: each point is a day's actual plotted hours. */
export function WeeklyPlottingCard({entries}:{entries:WeeklyHoursEntry[]}):JSX.Element{
 const gradient=useId().replace(/:/g,'');
 const max=Math.max(1,...entries.map(e=>e.hours)),total=entries.reduce((sum,e)=>sum+e.hours,0);
 const points=entries.map((entry,index)=>({x:30+index*260/Math.max(1,entries.length-1),y:125-entry.hours/max*92,entry}));
 const line=points.map((p,index)=>`${index?'L':'M'}${p.x},${p.y}`).join(' ');
 return <div className="glass-card p-4 db-weekly-chart"><h2 className="text-sm font-semibold text-slate-900">Weekly plotted hours</h2><p className="mt-0.5 text-xs text-slate-500">Mon–Sat · {total}h plotted this term</p>
 {total===0?<p className="mt-6 rounded-lg border border-dashed border-brand-500/25 bg-brand-500/5 px-3 py-6 text-center text-xs text-slate-600">Nothing plotted yet this week.</p>:<svg className="db-line-chart" viewBox="0 0 320 158" role="img" aria-label="Plotted hours per day, Monday to Saturday">
 <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2bc98d" stopOpacity=".24"/><stop offset="1" stopColor="#2bc98d" stopOpacity="0"/></linearGradient></defs>
 {[0,.5,1].map(r=><g key={r}><line x1="30" x2="300" y1={125-r*92} y2={125-r*92} className="db-chart-grid"/><text x="21" y={129-r*92} textAnchor="end" className="db-chart-axis">{Math.round(max*r*10)/10}</text></g>)}
 {points.length>0&&<path d={`${line} L${points.at(-1)!.x},125 L30,125 Z`} fill={`url(#${gradient})`}/>}
 <path d={line} fill="none" stroke="#149e70" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
 {points.map(p=><g key={p.entry.day_of_week}><title>{DAY_LABELS[p.entry.day_of_week]}: {p.entry.hours}h</title><circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#149e70" strokeWidth="2"/><text x={p.x} y={p.y-10} textAnchor="middle" className="db-chart-value">{p.entry.hours}h</text><text x={p.x} y="151" textAnchor="middle" className="db-chart-axis">{DAY_LABELS[p.entry.day_of_week]}</text></g>)}
 </svg>}</div>;
}
