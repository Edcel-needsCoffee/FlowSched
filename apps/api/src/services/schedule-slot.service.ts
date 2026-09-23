import type { DayOfWeek } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from '../errors/apiError.js';
import * as roomRepository from '../repositories/room.repository.js';
import * as scheduleSlotRepository from '../repositories/schedule-slot.repository.js';
import type { ScheduleSlotWithRelations } from '../repositories/schedule-slot.repository.js';
import * as workloadAssignmentRepository from '../repositories/workload-assignment.repository.js';
import { detectPlacementConflict, type ConflictResult } from './conflict.service.js';
import { formatTimeOfDay, parseTimeOfDay, timeOfDayToMinutes } from '../utils/time.js';
import {
  confirmOverrideSchema,
  createScheduleSlotSchema,
  scheduleSlotQuerySchema,
  updateScheduleSlotSchema,
  type ConfirmOverrideInput,
  type CreateScheduleSlotInput,
  type UpdateScheduleSlotInput,
} from '../validation/schedule-slot.validation.js';
import { overScheduledError } from './over-scheduled.error.js';

export interface ScheduleSlotDto {
  id: string;
  workload_assignment_id: string;
  room_id: string | null;
  room_name: string | null;
  session_type: 'LECTURE' | 'LAB';
  day_of_week: DayOfWeek;
  /** "HH:MM" 24-hour — the grid does all of its own positioning math. */
  start_time: string;
  end_time: string;
  session_hours: number;
  faculty_id: string;
  faculty_name: string;
  subject_code: string;
  subject_title: string;
  subject_units: number;
  subject_lecture_hours: number;
  subject_lab_hours: number;
  section_id: string;
  section_label: string;
  term_id: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSlotListDto {
  data: ScheduleSlotDto[];
  meta: { total: number };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface OverrideActor {
  userId: string;
  role: string;
}

function parseOrBadRequest<T extends z.ZodTypeAny>(schema: T, payload: unknown): z.infer<T> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid request', parsed.error.flatten());
  }
  return parsed.data as z.infer<T>;
}

export function toScheduleSlotDto(slot: ScheduleSlotWithRelations): ScheduleSlotDto {
  const { workload_assignment: assignment } = slot;
  const lectureHours = Number(assignment.subject.lecture_hours || 0);
  const labHours = Number(assignment.subject.lab_hours || 0);
  const slotHours = (timeOfDayToMinutes(formatTimeOfDay(slot.end_time)) -
    timeOfDayToMinutes(formatTimeOfDay(slot.start_time))) / 60;
  return {
    id: slot.id,
    workload_assignment_id: slot.workload_assignment_id,
    room_id: slot.room_id,
    room_name: slot.room?.name ?? null,
    session_type: slot.session_type,
    day_of_week: slot.day_of_week,
    start_time: formatTimeOfDay(slot.start_time),
    end_time: formatTimeOfDay(slot.end_time),
    session_hours: round2(slotHours),
    faculty_id: assignment.faculty_id,
    faculty_name: `${assignment.faculty.first_name} ${assignment.faculty.last_name}`,
    subject_code: assignment.subject.code,
    subject_title: assignment.subject.title,
    subject_units: Number(assignment.subject.units),
    subject_lecture_hours: lectureHours,
    subject_lab_hours: labHours,
    section_id: assignment.section_id,
    section_label: `${assignment.section.name} (Year ${assignment.section.year_level})`,
    term_id: assignment.term_id,
    color: assignment.color ?? null,
    created_at: slot.created_at.toISOString(),
    updated_at: slot.updated_at.toISOString(),
  };
}

export async function listScheduleSlots(rawQuery: unknown): Promise<ScheduleSlotListDto> {
  const query = parseOrBadRequest(scheduleSlotQuerySchema, rawQuery);
  const rows = await scheduleSlotRepository.list({
    termId: query.termId ?? null,
    facultyId: query.facultyId ?? null,
    sectionId: query.sectionId ?? null,
  });
  return { data: rows.map(toScheduleSlotDto), meta: { total: rows.length } };
}

/** Unknown room ids are a 400 (bad input), not a 404 — the room is a field. */
async function assertRoomExists(roomId: string | null): Promise<void> {
  if (!roomId) {
    return;
  }
  const room = await roomRepository.findById(roomId);
  if (!room) {
    throw ApiError.badRequest('Unknown room_id', { field: 'room_id' });
  }
}

/**
 * Rejects a placement whose session-type hours would exceed the subject's
 * budgeted lecture/lab hours (database-specification.md §4.3).
 */
async function assertWithinSessionCapacity(
  assignment: { subject: { lecture_hours: unknown; lab_hours: unknown; code: string }; id: string },
  sessionType: 'LECTURE' | 'LAB',
  placedHours: number,
  excludeSlotId?: string,
): Promise<void> {
  const limit = sessionType === 'LECTURE'
    ? Number(assignment.subject.lecture_hours)
    : Number(assignment.subject.lab_hours);
  if (limit === 0) {
    return; // No budget tracked for this type — allow any placement.
  }
  const alreadyPlaced = await scheduleSlotRepository.sumSessionHours(
    assignment.id,
    sessionType,
    excludeSlotId,
  );
  const totalAfter = alreadyPlaced + placedHours;
  if (totalAfter > limit) {
    throw overScheduledError(
      assignment.subject.code as string,
      sessionType,
      alreadyPlaced,
      placedHours,
      limit,
    );
  }
}

/** Conflict → 409 with the structured `{ code, details }` body the UI's
 *  override flow reads (FACULTY_CONFLICT / ROOM_CONFLICT / ROOM_MAINTENANCE). */
export function conflictToApiError(conflict: ConflictResult): ApiError {
  return ApiError.conflict(conflict.code, conflict.message, conflict.details);
}

export async function createScheduleSlot(rawBody: unknown): Promise<ScheduleSlotDto> {
  const input: CreateScheduleSlotInput = parseOrBadRequest(createScheduleSlotSchema, rawBody);
  const assignment = await workloadAssignmentRepository.findActiveById(input.workload_assignment_id);
  if (!assignment) {
    throw ApiError.notFound('Workload assignment not found');
  }
  const roomId = input.room_id ?? null;
  await assertRoomExists(roomId);

  const sessionType = input.session_type;
  const hours = (timeOfDayToMinutes(input.end_time) -
    timeOfDayToMinutes(input.start_time)) / 60;

  await assertWithinSessionCapacity(assignment, sessionType, hours);

  const conflict = await detectPlacementConflict({
    facultyId: assignment.faculty_id,
    roomId,
    day: input.day_of_week,
    startTime: parseTimeOfDay(input.start_time),
    endTime: parseTimeOfDay(input.end_time),
  });
  if (conflict) {
    // Nothing is written: the client must explicitly confirm the override.
    throw conflictToApiError(conflict);
  }

  const slot = await scheduleSlotRepository.create({
    workload_assignment_id: assignment.id,
    room_id: roomId,
    session_type: input.session_type,
    day_of_week: input.day_of_week,
    start_time: parseTimeOfDay(input.start_time),
    end_time: parseTimeOfDay(input.end_time),
  });
  return toScheduleSlotDto(slot);
}

/**
 * Move/resize a placed block. The conflict check uses the merged placement
 * (incoming field falling back to the stored value) and excludes the slot
 * itself, so nudging a block by one hour never "conflicts with itself".
 */
export async function updateScheduleSlot(id: string, rawBody: unknown): Promise<ScheduleSlotDto> {
  const input: UpdateScheduleSlotInput = parseOrBadRequest(updateScheduleSlotSchema, rawBody);
  const existing = await scheduleSlotRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound('Schedule slot not found');
  }

  const startTime =
    input.start_time !== undefined ? parseTimeOfDay(input.start_time) : existing.start_time;
  const endTime = input.end_time !== undefined ? parseTimeOfDay(input.end_time) : existing.end_time;
  if (timeOfDayToMinutes(formatTimeOfDay(endTime)) <= timeOfDayToMinutes(formatTimeOfDay(startTime))) {
    throw ApiError.badRequest('End time must be after start time', { field: 'end_time' });
  }
  const roomId = input.room_id === undefined ? existing.room_id : (input.room_id ?? null);
  await assertRoomExists(roomId);

  const sessionType =
    input.session_type !== undefined ? input.session_type : existing.session_type;
  const hours = (timeOfDayToMinutes(formatTimeOfDay(endTime)) -
    timeOfDayToMinutes(formatTimeOfDay(startTime))) / 60;

  await assertWithinSessionCapacity(existing.workload_assignment, sessionType, hours, id);

  const conflict = await detectPlacementConflict({
    facultyId: existing.workload_assignment.faculty_id,
    roomId,
    day: input.day_of_week ?? existing.day_of_week,
    startTime,
    endTime,
    excludeSlotId: id,
  });
  if (conflict) {
    throw conflictToApiError(conflict);
  }

  const slot = await scheduleSlotRepository.update(id, {
    room_id: roomId,
    session_type: sessionType,
    day_of_week: input.day_of_week ?? existing.day_of_week,
    start_time: startTime,
    end_time: endTime,
  });
  return toScheduleSlotDto(slot);
}

/**
 * Deliberate override: places the class even though the placement conflicts
 * (or the room is under maintenance). Same payload as the rejected request,
 * plus an optional reason.
 *
 * `:id` is the *workload assignment* being scheduled — the identity the UI
 * drags. Omit `slot_id` to create a new block; pass `slot_id` to move an
 * existing block that the PATCH conflict check rejected.
 *
 * Audit trail: there is no override table in database-specification.md, so the
 * override is recorded as a structured `console.warn` line carrying the actor,
 * the conflict that was bypassed, and the placement. Swapping that for a
 * dedicated audit table later only means replacing `logOverride`.
 */
export async function confirmOverride(
  assignmentId: string,
  rawBody: unknown,
  actor: OverrideActor,
): Promise<{ slot: ScheduleSlotDto; override: { applied: boolean; conflict: ConflictResult | null } }> {
  const input: ConfirmOverrideInput = parseOrBadRequest(confirmOverrideSchema, rawBody);
  const assignment = await workloadAssignmentRepository.findActiveById(assignmentId);
  if (!assignment) {
    throw ApiError.notFound('Workload assignment not found');
  }
  const roomId = input.room_id ?? null;
  await assertRoomExists(roomId);

  const startTime = parseTimeOfDay(input.start_time);
  const endTime = parseTimeOfDay(input.end_time);

  // Re-evaluated only so the audit line records what was bypassed — this path
  // never throws on a conflict.
  const conflict = await detectPlacementConflict({
    facultyId: assignment.faculty_id,
    roomId,
    day: input.day_of_week,
    startTime,
    endTime,
    excludeSlotId: input.slot_id ?? null,
  });

  let slot: ScheduleSlotWithRelations;
  let action: 'created' | 'moved';
  if (input.slot_id) {
    const existing = await scheduleSlotRepository.findById(input.slot_id);
    if (!existing) {
      throw ApiError.notFound('Schedule slot not found');
    }
    if (existing.workload_assignment_id !== assignment.id) {
      throw ApiError.badRequest('Slot does not belong to this workload assignment', {
        field: 'slot_id',
      });
    }
    slot = await scheduleSlotRepository.update(input.slot_id, {
      room_id: roomId,
      session_type: input.session_type ?? existing.session_type,
      day_of_week: input.day_of_week,
      start_time: startTime,
      end_time: endTime,
    });
    action = 'moved';
  } else {
    slot = await scheduleSlotRepository.create({
      workload_assignment_id: assignment.id,
      room_id: roomId,
      session_type: input.session_type ?? 'LECTURE',
      day_of_week: input.day_of_week,
      start_time: startTime,
      end_time: endTime,
    });
    action = 'created';
  }

  logOverride({
    action,
    actor_user_id: actor.userId,
    actor_role: actor.role,
    workload_assignment_id: assignment.id,
    slot_id: slot.id,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    room_id: roomId,
    overridden_code: conflict?.code ?? null,
    overridden_message: conflict?.message ?? null,
    overridden_slot_ids: conflict?.details.conflicting_slots.map((row) => row.slot_id) ?? [],
    reason: input.override_reason ?? null,
  });
  return { slot: toScheduleSlotDto(slot), override: { applied: conflict !== null, conflict } };
}

export async function deleteScheduleSlot(id: string): Promise<void> {
  const existing = await scheduleSlotRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound('Schedule slot not found');
  }
  await scheduleSlotRepository.remove(id);
}

function logOverride(payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(`[schedule-slot] override ${JSON.stringify(payload)}`);
}