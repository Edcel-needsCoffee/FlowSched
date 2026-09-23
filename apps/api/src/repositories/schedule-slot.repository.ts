import { Prisma, type DayOfWeek, type ScheduleSlot, type SessionType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { formatTimeOfDay, timeOfDayToMinutes } from '../utils/time.js';

export interface ScheduleSlotListFilters {
  termId: string | null;
  facultyId: string | null;
  sectionId: string | null;
  /**
   * Room scoping for the read-only utilization views ("Classroom Utilization").
   * Omitted = all rooms, so the existing grid list call is unchanged.
   */
  roomId?: string | null;
}

export interface ScheduleSlotCreateData {
  workload_assignment_id: string;
  room_id: string | null;
  session_type: SessionType;
  day_of_week: DayOfWeek;
  start_time: Date;
  end_time: Date;
}

export interface OverlapQuery {
  day: DayOfWeek;
  startTime: Date;
  endTime: Date;
  /** Ignore this slot — used when moving an existing block. */
  excludeSlotId?: string | null;
}

/** ScheduleSlot rows where the typed lecture/lab hour budget applies.
 *  The per-type cap is enforced at the service layer, not as a DB constraint
 *  (the budget is on the related Subject/WorkloadAssignment, not the slot). */
export const scheduleSlotInclude = {
  room: true,
  workload_assignment: {
    include: { faculty: true, subject: true, section: true, term: true },
  },
} satisfies Prisma.ScheduleSlotInclude;

export type ScheduleSlotWithRelations = Prisma.ScheduleSlotGetPayload<{
  include: typeof scheduleSlotInclude;
}>;

/**
 * Reads go through the assignment, so a soft-deleted assignment's slots drop
 * out of the grid (and out of conflict checks) without deleting history.
 */
function listWhere(filters: ScheduleSlotListFilters): Prisma.ScheduleSlotWhereInput {
  return {
    workload_assignment: {
      deleted_at: null,
      ...(filters.termId ? { term_id: filters.termId } : {}),
      ...(filters.facultyId ? { faculty_id: filters.facultyId } : {}),
      ...(filters.sectionId ? { section_id: filters.sectionId } : {}),
    },
    ...(filters.roomId ? { room_id: filters.roomId } : {}),
  };
}

export async function list(filters: ScheduleSlotListFilters): Promise<ScheduleSlotWithRelations[]> {
  return prisma.scheduleSlot.findMany({
    where: listWhere(filters),
    include: scheduleSlotInclude,
    orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
  });
}

export async function findById(id: string): Promise<ScheduleSlotWithRelations | null> {
  return prisma.scheduleSlot.findUnique({ where: { id }, include: scheduleSlotInclude });
}

/** Half-open interval overlap: [start, end) — touching ends do NOT overlap, so
 *  a 10:00–11:00 block may sit directly after a 9:00–10:00 one. */
function overlapWhere(query: OverlapQuery): Prisma.ScheduleSlotWhereInput {
  return {
    day_of_week: query.day,
    ...(query.excludeSlotId ? { id: { not: query.excludeSlotId } } : {}),
    start_time: { lt: query.endTime },
    end_time: { gt: query.startTime },
  };
}

/** Slots already occupying this faculty member's time on that day. */
export async function findFacultyOverlaps(
  facultyId: string,
  query: OverlapQuery,
): Promise<ScheduleSlotWithRelations[]> {
  return prisma.scheduleSlot.findMany({
    where: {
      ...overlapWhere(query),
      workload_assignment: { faculty_id: facultyId, deleted_at: null },
    },
    include: scheduleSlotInclude,
    orderBy: { start_time: 'asc' },
  });
}

/** Slots already booking this room on that day. */
export async function findRoomOverlaps(
  roomId: string,
  query: OverlapQuery,
): Promise<ScheduleSlotWithRelations[]> {
  return prisma.scheduleSlot.findMany({
    where: { ...overlapWhere(query), room_id: roomId },
    include: scheduleSlotInclude,
    orderBy: { start_time: 'asc' },
  });
}

export async function create(data: ScheduleSlotCreateData): Promise<ScheduleSlotWithRelations> {
  return prisma.scheduleSlot.create({ data, include: scheduleSlotInclude });
}

export async function update(
  id: string,
  data: ScheduleSlotUpdateData,
): Promise<ScheduleSlotWithRelations> {
  return prisma.scheduleSlot.update({ where: { id }, data, include: scheduleSlotInclude });
}

export async function remove(id: string): Promise<void> {
  await prisma.scheduleSlot.delete({ where: { id } });
}

export type ScheduleSlotUpdateData = Partial<
  Pick<ScheduleSlotCreateData, 'room_id' | 'session_type' | 'day_of_week' | 'start_time' | 'end_time'>
>;

/** Sum of session_hours already placed for an assignment, broken down by type.
 *  When `excludeSlotId` is given the slot being moved/updated is excluded so the
 *  capacity check doesn't double-count it. */
export async function sumSessionHours(
  assignmentId: string,
  sessionType: SessionType,
  excludeSlotId?: string,
): Promise<number> {
  const rows = await prisma.scheduleSlot.findMany({
    where: {
      workload_assignment_id: assignmentId,
      session_type: sessionType,
      workload_assignment: { deleted_at: null },
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
    },
    select: { start_time: true, end_time: true },
  });
  return rows.reduce((sum, r) => sum + slotHours(r.start_time, r.end_time), 0);
}

/**
 * Length of a stored slot in hours. The columns are `@db.Time`, so Prisma hands
 * them back as Dates anchored on the epoch day in UTC — read the UTC wall clock
 * through the shared helpers (utils/time.ts). Using local getters here would
 * wrap around midnight for any machine east of UTC (e.g. a 15:00–16:30 slot
 * becomes 23:00–00:30 local, i.e. −22.5h, which silently disables the cap).
 */
function slotHours(startTime: Date, endTime: Date): number {
  const minutes =
    timeOfDayToMinutes(formatTimeOfDay(endTime)) - timeOfDayToMinutes(formatTimeOfDay(startTime));
  return Math.round((minutes / 60) * 100) / 100;
}
