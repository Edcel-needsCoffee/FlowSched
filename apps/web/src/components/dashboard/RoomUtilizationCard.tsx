import type { RoomUtilizationSummary } from '../../lib/dashboard';

/**
 * RoomUtilizationCard — 3-segment stacked bar (booked / maintenance / free)
 * over the full room inventory, with a legend. Segment widths animate in
 * (width transition) and collapse gracefully to 0-width when empty.
 */

const SEGMENTS: Array<{
  key: keyof RoomUtilizationSummary;
  label: string;
  barCls: string;
  dotCls: string;
}> = [
  { key: 'booked_pct', label: 'Booked', barCls: 'bg-brand-500', dotCls: 'bg-brand-500' },
  { key: 'maintenance_pct', label: 'Maintenance', barCls: 'bg-amber-400', dotCls: 'bg-amber-400' },
  { key: 'free_pct', label: 'Free', barCls: 'bg-brand-500/20', dotCls: 'bg-brand-500/30' },
];

export function RoomUtilizationCard({
  utilization,
}: {
  utilization: RoomUtilizationSummary;
}): JSX.Element {
  return (
    <div className="glass-card p-4">
      <h2 className="text-sm font-semibold text-slate-900">Room utilization</h2>
      <p className="mt-0.5 text-xs text-slate-500">Share of all rooms by current state</p>
      <div className="db-room-donut" role="img" aria-label={`Rooms: ${utilization.booked_pct}% booked, ${utilization.maintenance_pct}% maintenance, ${utilization.free_pct}% free`}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="45" fill="none" stroke="var(--db-track)" strokeWidth="12"/>{SEGMENTS.map((segment,index)=>{
          const offset=SEGMENTS.slice(0,index).reduce((sum,item)=>sum+utilization[item.key],0);
          return <circle key={segment.key} cx="60" cy="60" r="45" fill="none" stroke={['#169f73','#e5a741','#b7d9c9'][index]} strokeWidth="12" pathLength="100" strokeDasharray={`${utilization[segment.key]} ${100-utilization[segment.key]}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)"/>;
        })}</svg><span>{utilization.booked_pct}%<small>Booked</small></span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {SEGMENTS.map((segment,index) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:['#169f73','#e5a741','#b7d9c9'][index]}} />
            <span className="font-medium">{segment.label}</span>
            <span className="ml-auto font-mono text-slate-900">{utilization[segment.key]}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
