import type { DayOfWeek } from '../../lib/schedule-slots';

/** Grid geometry shared by the droppable cells and the placed-block math. */
export const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};

/** Grid runs 7AM → 8PM (the last droppable half-hour cell starts at 7:30PM). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 20;
/** Pixels per hour row — the whole grid's top/height math derives from this. */
export const HOUR_HEIGHT = 48;
export const HALF_HOUR_HEIGHT = HOUR_HEIGHT / 2;
export const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

/** Offsets within an hour: 0 = :00, 1 = :30. */
export type HalfHourOffset = 0 | 1;

/** Droppable ids are `cell:<DAY>:<hour>:<offset>` so both pointer and keyboard
 *  drops resolve to a specific half-hour slot. `offset` is 0 (:00) or 1 (:30). */
export function cellId(day: DayOfWeek, hour: number, offset: HalfHourOffset = 0): string {
  return `cell:${day}:${hour}:${offset}`;
}

export function parseCellId(id: string): { day: DayOfWeek; hour: number; offset: HalfHourOffset } | null {
  if (!id.startsWith('cell:')) {
    return null;
  }
  const parts = id.split(':');
  if (parts.length !== 4) {
    return null;
  }
  const [, day, hourStr, offsetStr] = parts;
  const hourNum = Number(hourStr);
  const offsetNum = Number(offsetStr);
  if (!DAYS.includes(day as DayOfWeek)) {
    return null;
  }
  if (!Number.isInteger(hourNum) || hourNum < DAY_START_HOUR || hourNum >= DAY_END_HOUR) {
    return null;
  }
  if (offsetNum !== 0 && offsetNum !== 1) {
    return null;
  }
  return { day: day as DayOfWeek, hour: hourNum, offset: offsetNum as HalfHourOffset };
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** "14:30" → "2:30 PM" for block labels. */
export function formatTime12h(time: string): string {
  const total = timeToMinutes(time);
  const h24 = Math.floor(total / 60);
  const mins = total % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${period}`;
}

/** Absolute `top` (px) of a block inside its day column. */
export function slotTop(startMinutes: number): number {
  return ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

/** Absolute `height` (px); floored so short blocks stay grabbable. */
export function slotHeight(startMinutes: number, endMinutes: number): number {
  return Math.max(18, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT);
}

export function hourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

/** Clamps a drop to the grid and snaps the end time to a half-hour boundary. */
export function placementRange(hour: number, offset: HalfHourOffset, durationHours: number): { start: string; end: string } {
  const startMinutes = (hour + offset * 0.5) * 60;
  const rawEnd = startMinutes + Math.max(0.5, durationHours) * 60;
  const endMinutes = Math.min(rawEnd, DAY_END_HOUR * 60);
  return { start: minutesToTime(startMinutes), end: minutesToTime(endMinutes) };
}

/**
 * Cell ids the drop preview highlights: the anchor half-hour cell plus however many
 * half-hour cells the dragged duration spans (1.5h → 3 cells, 0.5h → 1 cell, 3h → 6),
 * clamped to the grid's last half-hour — so the preview matches the placement.
 */
export function previewCellIds(
  dragHours: number,
  anchorDay: DayOfWeek,
  anchorHour: number,
  anchorOffset: HalfHourOffset,
): string[] {
  const span = Math.max(1, Math.ceil(Math.max(0, dragHours) * 2));
  const cells: string[] = [];
  for (let i = 0; i < span; i++) {
    const totalHalfHours = anchorOffset + i;
    const hour = anchorHour + Math.floor(totalHalfHours / 2);
    const off = totalHalfHours % 2 ? 1 : 0;
    if (hour < DAY_END_HOUR) {
      cells.push(cellId(anchorDay, hour, off));
    }
  }
  return cells;
}
