import type { RoomStatusEntry } from '../../lib/dashboard';

/**
 * RoomsStatusList — live per-room status: Available / Booked now / Maintenance.
 * Green dot = free, dark-green pulsing dot = class in session, amber = under
 * maintenance.
 */

const STATUS_META: Record<
  RoomStatusEntry['status'],
  { dotCls: string; pulse?: boolean; label: string; textCls: string }
> = {
  available: { dotCls: 'bg-leaf-500', label: 'Available', textCls: 'text-ink/60' },
  booked_now: { dotCls: 'bg-leaf-700', pulse: true, label: 'Booked now', textCls: 'text-leaf-800' },
  maintenance: { dotCls: 'bg-amber-400', label: 'Maintenance', textCls: 'text-amber-700' },
};

export function RoomsStatusList({ rooms }: { rooms: RoomStatusEntry[] }): JSX.Element {
  return (
    <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Rooms status</h2>
        <span className="text-xs text-ink/50">Live right now</span>
      </div>
      {rooms.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-leaf-200 px-3 py-6 text-center text-xs text-ink/60">
          No rooms yet — add them on the Rooms page.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {rooms.map((room) => {
            const meta = STATUS_META[room.status];
            return (
              <li
                key={room.room_id}
                className="flex items-center gap-2.5 rounded-lg border border-leaf-100 px-3 py-2"
              >
                <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
                  {meta.pulse ? (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.dotCls}`} />
                  ) : null}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dotCls}`} />
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-ink">
                  {room.room_name}
                </span>
                <span className={`shrink-0 text-[11px] font-semibold ${meta.textCls}`}>{meta.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
