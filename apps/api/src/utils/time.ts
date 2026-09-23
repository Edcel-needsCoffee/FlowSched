/**
 * Time-of-day helpers shared by ScheduleSlot validation and the conflict
 * service.
 *
 * `ScheduleSlot.start_time` / `end_time` are Prisma `DateTime` fields mapped to
 * PostgreSQL `time` columns (schema.prisma), so Prisma reads/writes them as
 * `Date` objects anchored on the epoch day (1970-01-01) in UTC. Everything
 * that crosses the API boundary is a plain "HH:MM" string instead — the DB
 * representation never leaks into request/response bodies.
 */

/** Matches "HH:MM" / "HH:MM:SS" in 24-hour clock form. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/** Epoch day Prisma uses for `@db.Time` columns when handed a Date. */
const EPOCH_DAY_UTC = '1970-01-01';

/**
 * "HH:MM" (or "HH:MM:SS") → Date on the epoch day in UTC, ready for a
 * `@db.Time` column. Callers must validate the format first
 * (validation/schedule-slot.validation.ts): an unparseable string yields an
 * Invalid Date, which the DB would reject as a range error instead of a
 * clean 400.
 */
export function parseTimeOfDay(value: string): Date {
  const [hours = '0', minutes = '0', seconds = '0'] = value.split(':');
  const hh = hours.padStart(2, '0');
  const mm = minutes.padStart(2, '0');
  const ss = seconds.padStart(2, '0');
  return new Date(`${EPOCH_DAY_UTC}T${hh}:${mm}:${ss}.000Z`);
}

/**
 * Date from a `@db.Time` column → "HH:MM" display/serialization value.
 * Reads the UTC wall clock, which is how Prisma hands time-typed columns back
 * (and how parseTimeOfDay wrote them), and tolerates the epoch offset PG
 * applies for negative timezone offsets by normalizing into the same day.
 */
export function formatTimeOfDay(value: Date): string {
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** "07:00" → "7:00 AM" for human-readable conflict messages. */
export function humanizeTimeOfDay(value: string): string {
  const [hours = '0', minutes = '00'] = value.split(':');
  const hour = Number(hours);
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minutes} ${suffix}`;
}

/** Minutes since midnight for a validated "HH:MM" string. */
export function timeOfDayToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}