import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion, useReducedMotion } from 'framer-motion';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/auth.store';
import { selectSelectedTerm, useTermStore } from '../../store/term.store';
import { CONFLICT_LABELS, toOverrideCandidate } from './schedule-conflict';
import {
  MIN_CHUNK_HOURS,
  clampChunkHours,
  chunkSessionBadge,
  formatHours,
  isChunkDurationValid,
  stepChunkHours,
} from './schedule-duration';
import { listRooms, type Room } from '../../lib/rooms';
import { listFaculty, type FacultyMember } from '../../lib/faculty';
import { listSections, type Section } from '../../lib/sections';
import { listSubjects, type Subject } from '../../lib/subjects';
import {
  createWorkloadAssignment,
  listWorkloadAssignments,
  updateWorkloadAssignment,
  type WorkloadAssignment,
} from '../../lib/workload-assignments';
import {
  COLOR_PRESETS,
  HEX_COLOR_PATTERN,
  assignmentColor,
  readableTextColor,
} from '../../lib/colors';
import {
  confirmOverride,
  createScheduleSlot,
  deleteScheduleSlot,
  listScheduleSlots,
  updateScheduleSlot,
  type ConflictCode,
  type ConflictDetails,
  type DayOfWeek,
  type ScheduleSlot,
  type SessionType,
} from '../../lib/schedule-slots';
import {
  DAYS,
  DAY_END_HOUR,
  DAY_LABELS,
  DAY_START_HOUR,
  GRID_HEIGHT,
  HALF_HOUR_HEIGHT,
  HOUR_HEIGHT,
  cellId,
  formatTime12h,
  hourLabel,
  parseCellId,
  placementRange,
  previewCellIds,
  slotHeight,
  slotTop,
  timeToMinutes,
} from './schedule-time';

/**
 * Combined collision detection (dnd-kit's documented multi-sensor pattern):
 * pointer drags resolve via pointerWithin (precise cursor → hour cell), while
 * keyboard drags have no pointer coordinates and fall back to rectIntersection
 * against the translated active rect.
 */
const scheduleCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

/**
 * What is currently being dragged — an unassigned chunk or a placed block.
 * A "chunk" is one (assignment, session type) pair with hours still to place;
 * `duration` is the hours the card's picker had selected when the drag started.
 */
export interface DragInfoChunk {
  chunkId: string; // `${assignmentId}:${SessionType}` — uniquely identifies one draggable chunk
  assignment: WorkloadAssignment;
  type: 'new';
  sessionType: SessionType;
  /** Hours still placeable for this session type. */
  remaining: number;
  /** Hours this drag will place — the card picker's selected duration. */
  duration: number;
}
type DragInfo = DragInfoChunk | { type: 'move'; slot: ScheduleSlot };

interface Placement {
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room_id: string | null;
  session_type: SessionType;
}

/**
 * The placement a drop produces for an unassigned chunk: exactly the duration
 * the card's picker had selected (falling back to the card's remaining hours
 * when the picker holds an invalid value), anchored at the dropped hour.
 * `placementRange` still clamps the end to the grid's last hour.
 */
export function chunkPlacement(
  info: DragInfoChunk,
  cell: { day: DayOfWeek; hour: number; offset: 0 | 1 },
): Placement {
  const hours = info.duration > 0 ? info.duration : info.remaining;
  const { start, end } = placementRange(cell.hour, cell.offset, hours);
  return {
    day_of_week: cell.day,
    start_time: start,
    end_time: end,
    room_id: null,
    session_type: info.sessionType,
  };
}

/**
 * Height (px) the drag overlay occupies — mirrors the height the placed block
 * will have on the grid (the picker's duration for fresh chunks, the slot's
 * own span for moves), so the dragged block previews its real placement size.
 */
export function overlayHeight(info: DragInfo): number {
  if (info.type === 'new') {
    return Math.max(18, info.duration * HOUR_HEIGHT);
  }
  return slotHeight(timeToMinutes(info.slot.start_time), timeToMinutes(info.slot.end_time));
}



export function sessionSessionLabel(type: SessionType): string {
  return type === 'LECTURE' ? 'LEC' : 'LAB';
}

/** A 409 caught mid-placement, waiting for the Chair to override or cancel. */
interface OverrideState {
  mode: 'create' | 'move';
  assignmentId: string;
  slotId?: string;
  placement: Placement;
  code: ConflictCode;
  message: string;
  details: ConflictDetails | null;
}

export function SchedulePage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { pushToast } = useToast();
  const reduce = useReducedMotion();
  const canEdit = user?.role === 'CHAIR';

  // Term (shared with the header selector).
  const termStatus = useTermStore((s) => s.status);
  const loadTerms = useTermStore((s) => s.loadTerms);
  const selectedTermId = useTermStore((s) => s.selectedTermId);
  const term = useTermStore(selectSelectedTerm);

  useEffect(() => {
    if (termStatus === 'idle') {
      void loadTerms();
    }
  }, [termStatus, loadTerms]);

  // Reference data for dropdowns (filters, quick-assign, drop-room picker).
  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled([
        listRooms(),
        listFaculty({ pageSize: 100 }),
        listSections(),
        listSubjects({ pageSize: 100 }),
      ]);
      if (cancelled) {
        return;
      }
      if (results[0].status === 'fulfilled') setRooms(results[0].value.data);
      if (results[1].status === 'fulfilled') setFaculty(results[1].value.data);
      if (results[2].status === 'fulfilled') setSections(results[2].value.data);
      if (results[3].status === 'fulfilled') setSubjects(results[3].value.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Grid data, reloaded when the term changes or after any placement write.
  const [assignments, setAssignments] = useState<WorkloadAssignment[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [gridStatus, setGridStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadTick, setReloadTick] = useState(0);
  const requestIdRef = useRef(0);

  const loadGrid = useCallback(async () => {
    if (!selectedTermId) {
      setSlots([]);
      setAssignments([]);
      setGridStatus('ready');
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      const [assignmentRes, slotRes] = await Promise.all([
        listWorkloadAssignments({ termId: selectedTermId }),
        listScheduleSlots({ termId: selectedTermId }),
      ]);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setAssignments(assignmentRes.data);
      setSlots(slotRes.data);
      setGridStatus('ready');
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setGridStatus('error');
    }
  }, [selectedTermId]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid, reloadTick]);

  // Filters dim non-matching blocks (transition-opacity) instead of hiding them.
  const [filterFacultyId, setFilterFacultyId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const isDimmed = useCallback(
    (facultyId: string, sectionId: string) =>
      (filterFacultyId !== '' && facultyId !== filterFacultyId) ||
      (filterSectionId !== '' && sectionId !== filterSectionId),
    [filterFacultyId, filterSectionId],
  );

  // The page is always room-scoped: nothing renders until a room is picked,
  // and the selected room is also the drop target for new blocks. Faculty and
  // Section act as secondary filters WITHIN the room (dimming non-matches).
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  // Only the selected room's slots render; switching rooms re-scopes instantly.
  const visibleSlots = useMemo(
    () => (selectedRoomId ? slots.filter((slot) => slot.room_id === selectedRoomId) : []),
    [slots, selectedRoomId],
  );

  // Drag + placement state.
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  /** Cell id under the pointer mid-drag — anchors the multi-cell drop preview. */
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [shakeCell, setShakeCell] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [override, setOverride] = useState<OverrideState | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<ScheduleSlot | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Quick-assign mini-form (stand-in until the full Workload Assignment page).
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [qaFacultyId, setQaFacultyId] = useState('');
  const [qaSubjectId, setQaSubjectId] = useState('');
  const [qaSectionId, setQaSectionId] = useState('');
  const [qaBusy, setQaBusy] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  // PointerSensor with a 4px activation distance so plain clicks still work;
  // KeyboardSensor gives the Tab/Space/arrow-key placement flow for free.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  /**
   * One draggable card per (assignment, session type) with hours still to
   * place — a subject with both lecture and lab hours shows a LECTURE card
   * and a LAB card, each with its own remaining budget and duration picker.
   * Subjects without a lecture/lab budget (hours fall back to units) keep a
   * single card with the weekly-based remaining, since their placements are
   * not hour-capped server-side.
   */
  const unassignedChunks = useMemo(() => {
    const chunks: Array<{
      assignment: WorkloadAssignment;
      sessionType: SessionType;
      remaining: number;
    }> = [];
    for (const assignment of assignments) {
      if (assignment.remaining_hours <= 0) {
        continue;
      }
      if (!(assignment.lecture_hours > 0) && !(assignment.lab_hours > 0)) {
        chunks.push({ assignment, sessionType: 'LAB', remaining: assignment.remaining_hours });
        continue;
      }
      if (assignment.remaining_lecture_hours > 0) {
        chunks.push({
          assignment,
          sessionType: 'LECTURE',
          remaining: assignment.remaining_lecture_hours,
        });
      }
      if (assignment.remaining_lab_hours > 0) {
        chunks.push({
          assignment,
          sessionType: 'LAB',
          remaining: assignment.remaining_lab_hours,
        });
      }
    }
    return chunks;
  }, [assignments]);

  const slotsByDay = useMemo(() => {
    // Placed blocks pull their color live from the assignment record (Part 3
    // Step 12): recoloring a sidebar card repaints its already-placed blocks
    // immediately — no re-drag, no reload.
    const colorByAssignment = new Map(assignments.map((a) => [a.id, a.color]));
    const map = new Map<DayOfWeek, ScheduleSlot[]>();
    for (const day of DAYS) {
      map.set(day, []);
    }
    for (const slot of visibleSlots) {
      const liveColor = colorByAssignment.get(slot.workload_assignment_id);
      map
        .get(slot.day_of_week)
        ?.push(liveColor === undefined ? slot : { ...slot, color: liveColor });
    }
    return map;
  }, [visibleSlots, assignments]);

  // Auto-open quick-assign only when there is nothing to drag yet.
  useEffect(() => {
    setQuickAssignOpen(assignments.length === 0);
  }, [assignments.length]);

  function handleDragStart(event: DragStartEvent): void {
    const info = event.active.data.current as DragInfo | undefined;
    if (info) {
      setActiveDrag(info);
    }
  }

  /**
   * The anchored drop preview: `over` is the cell under the pointer (or the
   * keyboard focus), and the cells its selected duration spans light up too.
   */
  function handleDragOver(event: DragOverEvent): void {
    const overId = event.over?.id;
    setDragOverCell(typeof overId === 'string' ? overId : null);
  }

  function handleDragCancel(): void {
    setActiveDrag(null);
    setDragOverCell(null);
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const info = activeDrag;
    setActiveDrag(null);
    setDragOverCell(null);
    if (!info || !canEdit) {
      return;
    }
    const overId = event.over?.id;
    const cell = typeof overId === 'string' ? parseCellId(overId) : null;
    if (!cell) {
      return; // dropped outside the grid — the overlay just snaps back
    }
    const target = cellId(cell.day, cell.hour, cell.offset);
    if (info.type === 'new') {
      // Exactly the picker's selected duration — not the full remaining chunk.
      // The page-level selected room IS the drop target.
      const placement = chunkPlacement(info, cell);
      await placeNew(
        info.assignment,
        { ...placement, room_id: selectedRoomId || null },
        target,
      );
    } else {
      const durationHours =
        (timeToMinutes(info.slot.end_time) - timeToMinutes(info.slot.start_time)) / 60;
      const { start, end } = placementRange(cell.hour, cell.offset, durationHours);
      await moveSlot(
        info.slot,
        { day_of_week: cell.day, start_time: start, end_time: end, room_id: info.slot.room_id, session_type: info.slot.session_type },
        target,
      );
    }
  }

  async function placeNew(
    assignment: WorkloadAssignment,
    placement: Placement,
    target: string,
  ): Promise<void> {
    try {
      const res = await createScheduleSlot({
        workload_assignment_id: assignment.id,
        ...placement,
      });
      applySlotResult(res.slot);
      const placedHours =
        (timeToMinutes(placement.end_time) - timeToMinutes(placement.start_time)) / 60;
      pushToast(
        'success',
        `${res.slot.subject_code} scheduled ${DAY_LABELS[placement.day_of_week]} ${formatTime12h(placement.start_time)} (${formatHours(placedHours)}h).`,
      );
    } catch (err) {
      handlePlacementError(err, {
        mode: 'create',
        assignmentId: assignment.id,
        placement,
        target,
      });
    }
  }

  async function moveSlot(slot: ScheduleSlot, placement: Placement, target: string): Promise<void> {
    try {
      const res = await updateScheduleSlot(slot.id, placement);
      applySlotResult(res.slot);
      pushToast(
        'success',
        `${slot.subject_code} moved to ${DAY_LABELS[placement.day_of_week]} ${formatTime12h(placement.start_time)}.`,
      );
    } catch (err) {
      handlePlacementError(err, {
        mode: 'move',
        assignmentId: slot.workload_assignment_id,
        slotId: slot.id,
        placement,
        target,
      });
    }
  }

  /** Upserts the slot into grid state and flags it for the springy entrance. */
  function applySlotResult(slot: ScheduleSlot): void {
    setSlots((current) => {
      const index = current.findIndex((existing) => existing.id === slot.id);
      if (index >= 0) {
        const next = [...current];
        next[index] = slot;
        return next;
      }
      return [...current, slot];
    });
    setFlashIds((ids) => (ids.includes(slot.id) ? ids : [...ids, slot.id]));
    void refreshAssignments();
  }

  async function refreshAssignments(): Promise<void> {
    if (!selectedTermId) {
      return;
    }
    try {
      const res = await listWorkloadAssignments({ termId: selectedTermId });
      setAssignments(res.data);
    } catch {
      // Keep the previous list; remaining-hour counts refresh on the next load.
    }
  }

  /**
   * Part 3: recolor one assignment. Optimistic — the sidebar swatch and every
   * already-placed block repaint immediately from `assignments` state, then
   * PATCH confirms (re-authoritative) or the previous color is restored.
   */
  async function handleColorChange(assignmentId: string, hex: string): Promise<void> {
    const previous = assignments.find((assignment) => assignment.id === assignmentId)?.color ?? null;
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, color: hex } : assignment,
      ),
    );
    try {
      const res = await updateWorkloadAssignment(assignmentId, { color: hex });
      setAssignments((current) =>
        current.map((assignment) =>
          assignment.id === assignmentId ? { ...assignment, color: res.assignment.color } : assignment,
        ),
      );
      const subject = assignments.find((assignment) => assignment.id === assignmentId)?.subject_code;
      pushToast('success', `Color saved for ${subject ?? 'assignment'}.`);
    } catch {
      setAssignments((current) =>
        current.map((assignment) =>
          assignment.id === assignmentId ? { ...assignment, color: previous } : assignment,
        ),
      );
      pushToast('error', 'Could not save the color.');
    }
  }

  /**
   * 409 conflict/maintenance responses drive the shake + override dialog
   * instead of a silent failure; anything else surfaces as a toast.
   */
  function handlePlacementError(
    err: unknown,
    context: {
      mode: 'create' | 'move';
      assignmentId: string;
      slotId?: string;
      placement: Placement;
      target: string;
    },
  ): void {
    const candidate = toOverrideCandidate(err);
    if (candidate) {
      if (!reduce) {
        setShakeCell(context.target);
      }
      setOverrideReason('');
      setOverride({
        mode: context.mode,
        assignmentId: context.assignmentId,
        slotId: context.slotId,
        placement: context.placement,
        ...candidate,
      });
      return;
    }
    const apiErr = err as { message?: string };
    pushToast('error', apiErr?.message ?? 'Could not place the class.');
  }

  async function handleOverrideConfirm(): Promise<void> {
    if (!override) {
      return;
    }
    setOverrideBusy(true);
    try {
      const res = await confirmOverride(override.assignmentId, {
        ...(override.slotId ? { slot_id: override.slotId } : {}),
        ...override.placement,
        override_reason: overrideReason.trim() || undefined,
      });
      applySlotResult(res.slot);
      pushToast(
        'warning',
        `Placed with override — ${CONFLICT_LABELS[override.code].toLowerCase()} acknowledged.`,
      );
      setOverride(null);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Override failed.');
    } finally {
      setOverrideBusy(false);
    }
  }

  async function handleDeleteSlot(): Promise<void> {
    if (!deletingSlot) {
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteScheduleSlot(deletingSlot.id);
      setSlots((current) => current.filter((slot) => slot.id !== deletingSlot.id));
      pushToast('success', `${deletingSlot.subject_code} removed from the grid.`);
      setDeletingSlot(null);
      void refreshAssignments();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Could not remove the class.');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleQuickAssign(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!canEdit || !selectedTermId || qaBusy) {
      return;
    }
    if (!qaFacultyId || !qaSubjectId || !qaSectionId) {
      setQaError('Pick a faculty, a subject, and a section.');
      return;
    }
    setQaError(null);
    setQaBusy(true);
    try {
      const res = await createWorkloadAssignment({
        faculty_id: qaFacultyId,
        subject_id: qaSubjectId,
        section_id: qaSectionId,
        term_id: selectedTermId,
      });
      pushToast('success', `${res.assignment.subject_code} assigned to ${res.assignment.faculty_name}.`);
      setQaFacultyId('');
      setQaSubjectId('');
      setQaSectionId('');
      setReloadTick((tick) => tick + 1);
    } catch (err) {
      setQaError(err instanceof Error ? err.message : 'Could not add the assignment.');
    } finally {
      setQaBusy(false);
    }
  }

  function clearFlash(id: string): void {
    setFlashIds((ids) => ids.filter((flashId) => flashId !== id));
  }



  const selectCls =
    'rounded-lg border border-leaf-100 bg-white px-2 py-1.5 text-xs text-ink outline-none transition-colors focus:border-leaf-500 focus:ring-4 focus:ring-leaf-500/15';
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, index) => DAY_START_HOUR + index,
  );

  /**
   * Cells the drop preview lights up: the anchor cell plus however many
   * whole-hour cells the active drag's duration spans (1.5h → 2 cells,
   * 3h → 3 cells), so the preview matches what will actually be placed.
   */
  const dropPreview = useMemo(() => {
    if (!activeDrag || !dragOverCell) {
      return null;
    }
    const anchor = parseCellId(dragOverCell);
    if (!anchor) {
      return null;
    }
    const dragHours =
      activeDrag.type === 'new'
        ? activeDrag.duration
        : (timeToMinutes(activeDrag.slot.end_time) - timeToMinutes(activeDrag.slot.start_time)) / 60;
    return new Set(previewCellIds(dragHours, anchor.day, anchor.hour, anchor.offset));
  }, [activeDrag, dragOverCell]);

  return (
    <section aria-labelledby="schedule-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="schedule-title" className="text-2xl font-semibold text-primary-dark">
            Schedule
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {selectedRoom
              ? `Scheduling ${selectedRoom.name} for ${term ? term.label : '…'}. Drag a class from the panel onto the grid — Tab + Space works too.`
              : `Scheduling for ${term ? term.label : '…'} — select a room to begin.`}
          </p>
        </div>
        {/* Room selection is the page's entry point: everything below scopes to
            it. Faculty/Section act as secondary filters WITHIN the room. */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            Room
            <select
              aria-label="Select room to view its schedule"
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(event.target.value)}
              className={selectCls}
            >
              <option value="">Select a room…</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id} disabled={room.is_under_maintenance}>
                  {room.name}
                  {room.is_under_maintenance ? ' (maintenance)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            Faculty
            <select
              aria-label="Filter by faculty"
              value={filterFacultyId}
              onChange={(event) => setFilterFacultyId(event.target.value)}
              className={selectCls}
            >
              <option value="">All</option>
              {faculty.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.last_name}, {member.first_name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            Section
            <select
              aria-label="Filter by section"
              value={filterSectionId}
              onChange={(event) => setFilterSectionId(event.target.value)}
              className={selectCls}
            >
              <option value="">All</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {termStatus === 'ready' && !selectedTermId ? (
        <div className="rounded-xl border border-dashed border-leaf-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">No active term.</p>
          <p className="mt-1 text-sm text-ink/60">
            Seed or activate an academic term, then reload this page.
          </p>
        </div>
      ) : termStatus === 'ready' && !selectedRoomId ? (
        // Entry gate: no grid, no sidebar — the room choice comes first
        // (ui-ux.md Section 12 empty-state pattern).
        <div
          role="status"
          className="rounded-xl border border-dashed border-leaf-200 bg-white px-4 py-12 text-center"
        >
          <h2 className="text-base font-semibold text-ink">Select a room to view its schedule</h2>
          <p className="mt-2 text-sm text-ink/60">
            Pick a room above — the week grid and the unassigned-classes panel will load for it.
          </p>
        </div>
      ) : gridStatus === 'error' ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-red-700">Could not load the schedule.</p>
          <button
            type="button"
            onClick={() => setReloadTick((tick) => tick + 1)}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : gridStatus === 'loading' && slots.length === 0 ? (
        <p className="rounded-xl border border-leaf-100 bg-white px-4 py-8 text-center text-sm text-ink/60">
          Loading schedule…
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={scheduleCollision}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* An empty room keeps its grid so classes can be dropped into it —
              just with an explicit banner instead of silence. */}
          {visibleSlots.length === 0 ? (
            <p
              role="status"
              className="mb-3 rounded-xl border border-dashed border-leaf-200 bg-white px-4 py-3 text-center text-sm text-ink/60"
            >
              No classes scheduled in {selectedRoom?.name ?? 'this room'} yet — drag a class from
              the panel to place one.
            </p>
          ) : null}
          <div className="flex items-start gap-4" data-testid="schedule-grid">
            {/* Left panel: unassigned classes and quick-assign. The page-level
                room selector is the drop target — no second room picker. */}
            <aside className="w-72 shrink-0 space-y-3 rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-sm font-semibold text-ink">Unassigned classes</h2>
                <p className="text-xs text-ink/50">{term ? term.label : 'Loading term…'}</p>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {unassignedChunks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-leaf-200 px-3 py-4 text-center text-xs text-ink/60">
                    {assignments.length === 0
                      ? 'No workload assignments for this term yet — add one below.'
                      : 'All assigned hours are on the grid.'}
                  </p>
                ) : (
                  unassignedChunks.map(({ assignment, sessionType, remaining }) => {
                    const chunkId = `${assignment.id}:${sessionType}`;
                    return (
                      <UnassignedCard
                        key={chunkId}
                        assignment={assignment}
                        sessionType={sessionType}
                        remaining={remaining}
                        dimmed={isDimmed(assignment.faculty_id, assignment.section_id)}
                        dragging={
                          activeDrag?.type === 'new' && activeDrag.chunkId === chunkId
                        }
                        onColorChange={handleColorChange}
                      />
                    );
                  })
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setQuickAssignOpen((open) => !open)}
                  aria-expanded={quickAssignOpen}
                  className="text-xs font-semibold text-leaf-700 transition-colors hover:text-leaf-800"
                >
                  {quickAssignOpen ? '− Hide quick assign' : '+ Quick assign'}
                </button>
                {quickAssignOpen ? (
                  <QuickAssignForm
                    faculty={faculty}
                    subjects={subjects}
                    sections={sections}
                    facultyId={qaFacultyId}
                    subjectId={qaSubjectId}
                    sectionId={qaSectionId}
                    busy={qaBusy}
                    error={qaError}
                    onFacultyChange={setQaFacultyId}
                    onSubjectChange={setQaSubjectId}
                    onSectionChange={setQaSectionId}
                    onSubmit={handleQuickAssign}
                  />
                ) : null}
              </div>
              {!canEdit ? (
                <p className="rounded-lg bg-leaf-50 px-3 py-2 text-[11px] text-ink/60">
                  View only — Chairs can place and move classes.
                </p>
              ) : null}
            </aside>

            {/* Time-gutter + day columns. Each day column is a droppable hour
                stack; placed blocks are absolutely positioned by start/end
                time (flowsched.html block math). */}
            <div className="flex min-w-0 flex-1 overflow-x-auto rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
              <div className="flex">
                <div className="w-12 shrink-0 pt-7" aria-hidden="true">
                  {hours.map((hour) => (
                    <div key={hour} className="text-right text-[10px] font-medium text-ink/40" style={{ height: HOUR_HEIGHT }}>
                      {hourLabel(hour)}
                    </div>
                  ))}
                </div>
                {DAYS.map((day) => {
                  const shaking = shakeCell?.startsWith(`cell:${day}:`) ?? false;
                  return (
                    <motion.div
                      key={day}
                      className="min-w-[110px] flex-1"
                      animate={
                        shaking && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
                      }
                      transition={
                        shaking && !reduce ? { duration: 0.4 } : { duration: 0 }
                      }
                      onAnimationComplete={() => {
                        if (shaking) {
                          setShakeCell(null);
                        }
                      }}
                    >
                      <div className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-ink/60">
                        {DAY_LABELS[day]}
                      </div>
                      <div className="relative border-l border-leaf-50" style={{ height: GRID_HEIGHT }}>
                        {hours.map((hour) => (
                          <React.Fragment key={`${day}-${hour}`}>
                            {/* :00 half-hour row (top half of the hour) */}
                            <DropCell
                              id={cellId(day, hour, 0)}
                              highlighted={dropPreview?.has(cellId(day, hour, 0)) ?? false}
                            />
                            {/* Dashed half-hour gridline between :00 and :30 */}
                            <div
                              className="absolute left-0 right-0 border-t border-dashed border-leaf-300/60"
                              style={{ top: HALF_HOUR_HEIGHT }}
                            />
                            {/* :30 half-hour row (bottom half of the hour) */}
                            <DropCell
                              id={cellId(day, hour, 1)}
                              highlighted={dropPreview?.has(cellId(day, hour, 1)) ?? false}
                            />
                          </React.Fragment>
                        ))}
                        {(slotsByDay.get(day) ?? []).map((slot) => (
                          <PlacedBlock
                            key={slot.id}
                            slot={slot}
                            justPlaced={flashIds.includes(slot.id)}
                            dimmed={isDimmed(slot.faculty_id, slot.section_id)}
                            dragging={
                              activeDrag?.type === 'move' && activeDrag.slot.id === slot.id
                            }
                            reducedMotion={Boolean(reduce)}
                            onFlashComplete={() => clearFlash(slot.id)}
                            onRemove={() => setDeletingSlot(slot)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Floating clone that follows the pointer/keyboard focus smoothly.
              Its height matches the duration that will actually be placed. */}
          <DragOverlay dropAnimation={reduce ? null : { duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeDrag ? (
              <div
                className="w-56 cursor-grabbing"
                style={{ height: overlayHeight(activeDrag) }}
              >
                <AssignmentCardBody
                  title={
                    activeDrag.type === 'new'
                      ? `${activeDrag.assignment.subject_code} — ${chunkSessionBadge(activeDrag.sessionType)}`
                      : activeDrag.slot.subject_code
                  }
                  subtitle={
                    overlayHeight(activeDrag) >= 56
                      ? activeDrag.type === 'new'
                        ? `${activeDrag.assignment.section_label} · ${activeDrag.assignment.faculty_name}`
                        : `${activeDrag.slot.section_label} · ${activeDrag.slot.faculty_name}`
                      : undefined
                  }
                  meta={
                    activeDrag.type === 'new'
                      ? `${formatHours(activeDrag.duration)}h · ${chunkSessionBadge(activeDrag.sessionType)}`
                      : `${DAY_LABELS[activeDrag.slot.day_of_week]} ${formatTime12h(activeDrag.slot.start_time)}–${formatTime12h(activeDrag.slot.end_time)}`
                  }
                  className="flex h-full flex-col justify-center scale-105 rotate-1 shadow-2xl shadow-leaf-500/30 ring-2 ring-leaf-500/40 transition-transform"
                  color={
                    activeDrag.type === 'new' ? activeDrag.assignment.color : activeDrag.slot.color
                  }
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {override ? (
        <OverrideDialog
          state={override}
          reason={overrideReason}
          busy={overrideBusy}
          onReasonChange={setOverrideReason}
          onConfirm={() => void handleOverrideConfirm()}
          onClose={() => setOverride(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deletingSlot !== null}
        title="Remove scheduled class?"
        message={
          deletingSlot
            ? `${deletingSlot.subject_code} (${DAY_LABELS[deletingSlot.day_of_week]} ${formatTime12h(deletingSlot.start_time)}–${formatTime12h(deletingSlot.end_time)}) will be removed from the grid. The workload assignment stays in the sidebar.`
            : ''
        }
        confirmLabel="Remove"
        pending={deleteBusy}
        onConfirm={() => void handleDeleteSlot()}
        onCancel={() => setDeletingSlot(null)}
      />
    </section>
  );
}

/**
 * One droppable hour cell; lights up (green tint + ring) under a drag — either
 * it is the anchor cell under the pointer, or it is spanned by the active
 * drag's selected duration (the multi-cell drop preview).
 */
function DropCell({ id, highlighted = false }: { id: string; highlighted?: boolean }): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-drop-id={id}
      // Exposed so tests can assert the multi-cell preview without class names.
      data-drop-preview={highlighted ? 'true' : undefined}
      className={`border-b border-leaf-50 transition-colors duration-150 ${
        isOver || highlighted ? 'bg-leaf-50 ring-2 ring-inset ring-leaf-400/50' : ''
      }`}
      style={{ height: HALF_HOUR_HEIGHT }}
    />
  );
}

/** Shared visual body for sidebar cards, placed blocks, and the drag overlay. */
function AssignmentCardBody({
  title,
  subtitle,
  meta,
  className = '',
  color = null,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  className?: string;
  /** Custom assignment color (Part 3). Null renders the default leaf card. */
  color?: string | null;
}): JSX.Element {
  const custom = color && HEX_COLOR_PATTERN.test(color) ? color : null;
  const text = custom ? readableTextColor(custom) : null;
  return (
    <div
      className={`overflow-hidden rounded-lg border p-2.5 shadow-sm ${className} ${
        custom ? '' : 'border-leaf-200 bg-white'
      }`}
      style={custom ? { backgroundColor: custom, borderColor: custom, color: text ?? undefined } : undefined}
    >
      <p className={`truncate text-xs font-semibold ${custom ? '' : 'text-ink'}`}>{title}</p>
      {subtitle ? (
        <p className={`truncate text-[11px] ${custom ? 'opacity-75' : 'text-ink/60'}`}>{subtitle}</p>
      ) : null}
      {meta ? (
        <p className={`mt-0.5 truncate text-[11px] font-medium ${custom ? 'opacity-80' : 'text-leaf-700'}`}>{meta}</p>
      ) : null}
    </div>
  );
}

/**
 * Sidebar card for one (assignment, session type) chunk with hours left.
 * Carries a duration picker: the Chair can place part of the remaining hours
 * now (e.g. 1.5 of 3 lab hours) and drop the rest somewhere else later.
 * Also carries the color swatch (Part 3): picking a preset recolors both this
 * card's marker and every already-placed block of the assignment, live.
 */
function UnassignedCard({
  assignment,
  sessionType,
  remaining,
  dimmed,
  dragging,
  onColorChange,
}: {
  assignment: WorkloadAssignment;
  sessionType: SessionType;
  remaining: number;
  dimmed: boolean;
  dragging: boolean;
  onColorChange: (assignmentId: string, hex: string) => void;
}): JSX.Element {
  const chunkId = `${assignment.id}:${sessionType}`;
  // Defaults to the full remaining hours; the Chair can shave it down before
  // dragging (0.5h steps). A 0 value marks "invalid — dragging disabled".
  const [duration, setDuration] = useState(() => clampChunkHours(remaining, remaining));
  const [note, setNote] = useState<string | null>(null);

  // After a placement (or a slot removal) the remaining budget changes —
  // re-point the picker at it so the card always offers what's placeable.
  useEffect(() => {
    setDuration(clampChunkHours(remaining, remaining));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const valid = isChunkDurationValid(duration, remaining);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assignment:${chunkId}`,
    disabled: !valid,
    data: {
      type: 'new',
      chunkId,
      assignment,
      sessionType,
      remaining,
      duration,
    } as DragInfo,
  });

  return (
    <div
      ref={setNodeRef}
      data-chunk-id={chunkId}
      data-chunk-duration={duration}
      // Card-level drag state, surfaced on the root so the whole card reads as
      // "not draggable" while the picker holds the invalid 0 marker.
      aria-disabled={!valid}
      className={`relative transition-all duration-150 ${dragging ? 'opacity-40 grayscale-[30%]' : ''} ${
        dimmed ? 'opacity-20' : ''
      } ${isDragging ? 'opacity-0' : ''}`}
    >
      <ColorSwatchPicker assignmentId={assignment.id} color={assignment.color} onColorChange={onColorChange} />
      {/* Drag handle = the card body; the picker below stays clickable. */}
      <div
        {...(valid ? { ...listeners, ...attributes } : {})}
        aria-disabled={!valid}
        title={
          valid
            ? 'Drag onto the grid, or Tab here and press Space'
            : 'Set a duration of at least 0.5h to enable dragging'
        }
        className={`touch-none select-none ${valid ? 'cursor-grab' : 'cursor-not-allowed'}`}
      >
        <AssignmentCardBody
          title={`${assignment.subject_code} — ${chunkSessionBadge(sessionType)}`}
          subtitle={`${assignment.section_label} · ${assignment.faculty_name}`}
          meta={`${formatHours(duration)}h selected · ${formatHours(remaining)}h remaining`}
        />
      </div>
      <DurationPicker
        value={duration}
        remaining={remaining}
        note={note}
        onStep={(delta) => {
          setNote(null);
          setDuration((current) => stepChunkHours(current, delta, remaining));
        }}
        onCommit={(raw) => {
          const parsed = Number(raw);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            setDuration(0);
            setNote(
              `Enter at least ${formatHours(Math.min(MIN_CHUNK_HOURS, remaining))}h to place this block.`,
            );
            return;
          }
          const clamped = clampChunkHours(parsed, remaining);
          setDuration(clamped);
          setNote(clamped < parsed ? `Only ${formatHours(remaining)}h remaining.` : null);
        }}
      />
    </div>
  );
}

/**
 * Small color dot on the card's corner (Part 3). Opens a preset palette
 * popover; selecting a preset calls the PATCH-backed onColorChange, outside
 * click and Escape close it. Shows the assignment's current (or default) color.
 */
function ColorSwatchPicker({
  assignmentId,
  color,
  onColorChange,
}: {
  assignmentId: string;
  color: string | null;
  onColorChange: (assignmentId: string, hex: string) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = assignmentColor({ color });

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="absolute -right-1 -top-1 z-20" data-color-picker={assignmentId}>
      <button
        type="button"
        aria-label={`Change color (${current})`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change color"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="block h-5 w-5 cursor-pointer rounded-full border-2 border-white shadow-sm ring-1 ring-leaf-300 transition-transform hover:scale-110"
        style={{ backgroundColor: current }}
      />
      {open ? (
        <div
          role="menu"
          aria-label="Pick a color"
          className="absolute right-0 top-6 w-36 rounded-xl border border-leaf-100 bg-white p-2 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-1.5">
            {COLOR_PRESETS.map((preset) => {
              const selected = current.toUpperCase() === preset.hex.toUpperCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={`${preset.label} color`}
                  title={preset.label}
                  onClick={(event) => {
                    event.stopPropagation();
                    onColorChange(assignmentId, preset.hex);
                    setOpen(false);
                  }}
                  className={`h-7 w-7 cursor-pointer rounded-full border-2 transition-transform hover:scale-110 ${
                    selected ? 'border-ink' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * − / hours / + stepper for a chunk card's placeable duration (0.5h steps).
 * The number field commits on blur or Enter; an over-remaining entry clamps
 * with an inline note; 0/negative leaves the card undraggable until fixed.
 */
function DurationPicker({
  value,
  remaining,
  note,
  onStep,
  onCommit,
}: {
  value: number;
  remaining: number;
  note: string | null;
  onStep: (delta: number) => void;
  onCommit: (raw: string) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatHours(value);
  const atMin = value <= Math.min(MIN_CHUNK_HOURS, remaining) + 1e-9;
  const atMax = value >= remaining - 1e-9;
  const commit = (): void => {
    if (draft === null) {
      return;
    }
    onCommit(draft);
    setDraft(null);
  };
  const stepperBtn =
    'h-6 w-6 rounded-md border border-leaf-200 text-sm font-semibold leading-none text-leaf-700 transition-colors enabled:hover:border-leaf-400 enabled:hover:bg-leaf-50 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="mt-1.5">
      <div
        role="group"
        aria-label={`Hours to place (up to ${formatHours(remaining)}h remaining)`}
        className="flex items-center gap-1.5"
      >
        <button
          type="button"
          aria-label="Fewer hours"
          disabled={atMin}
          onClick={() => onStep(-1)}
          className={stepperBtn}
        >
          −
        </button>
        <input
          aria-label="Hours to place"
          inputMode="decimal"
          value={shown}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          className="w-12 rounded-md border border-leaf-200 bg-white px-1.5 py-1 text-center text-xs font-semibold text-ink outline-none transition-colors focus:border-leaf-500 focus:ring-4 focus:ring-leaf-500/15"
        />
        <button
          type="button"
          aria-label="More hours"
          disabled={atMax}
          onClick={() => onStep(1)}
          className={stepperBtn}
        >
          +
        </button>
        <span className="text-[11px] text-ink/50">hours per block</span>
      </div>
      {note ? (
        <p role="status" className="mt-1 text-[11px] font-medium text-amber-600">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** Placed ScheduleSlot block — draggable to move, spring-animates on entry. */
function PlacedBlock({
  slot,
  justPlaced,
  dimmed,
  dragging,
  reducedMotion,
  onFlashComplete,
  onRemove,
}: {
  slot: ScheduleSlot;
  justPlaced: boolean;
  dimmed: boolean;
  dragging: boolean;
  reducedMotion: boolean;
  onFlashComplete: () => void;
  onRemove: () => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot:${slot.id}`,
    data: { type: 'move', slot } as DragInfo,
  });
  const start = timeToMinutes(slot.start_time);
  const end = timeToMinutes(slot.end_time);
  const entrance = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, scale: 0.9, y: -6 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { type: 'spring' as const, stiffness: 500, damping: 30 },
      };
  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      layout={!reducedMotion}
      initial={entrance.initial}
      animate={entrance.animate}
      {...(reducedMotion ? {} : { transition: entrance.transition })}
      onAnimationComplete={() => {
        if (justPlaced) {
          onFlashComplete();
        }
      }}
      aria-roledescription="Scheduled class. Press space or enter to pick up and move it."
      aria-label={`${slot.subject_code}, ${slot.section_label}, ${slot.faculty_name}, ${DAY_LABELS[slot.day_of_week]} ${formatTime12h(slot.start_time)} to ${formatTime12h(slot.end_time)}`}
      className={`absolute left-1 right-1 z-10 cursor-grab touch-none select-none overflow-hidden rounded-md transition-opacity duration-200 ${
        dragging ? 'opacity-40 grayscale-[30%]' : dimmed ? 'opacity-20' : ''
      } ${isDragging ? 'opacity-0' : ''}`}
      style={{ top: slotTop(start), height: slotHeight(start, end) }}
    >
      <AssignmentCardBody
        title={slot.subject_code}
        subtitle={slot.section_label}
        meta={`${slot.faculty_name} · ${formatTime12h(slot.start_time)}`}
        className={`h-full ${slot.color ? '' : 'border-leaf-300 bg-leaf-50/90'}`}
        color={slot.color}
      />
      <button
        type="button"
        aria-label={`Remove ${slot.subject_code} from the grid`}
        onClick={onRemove}
        className="absolute bottom-0.5 right-0.5 hidden rounded px-1 text-[10px] font-bold text-ink/40 hover:bg-white/70 hover:text-red-600 sm:block"
      >
        ×
      </button>
    </motion.div>
  );
}


/** Exported for direct render tests of the 409 → override flow. */
export function OverrideDialog({
  state,
  reason,
  busy,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  state: OverrideState;
  reason: string;
  busy: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <Modal open title={CONFLICT_LABELS[state.code]} onClose={onClose}>
      <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-semibold">{CONFLICT_LABELS[state.code]}</p>
        <p className="mt-0.5">{state.message}</p>
        <ConflictDetailsList details={state.details} />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        You can still place this class — the conflict is logged as an explicit Chair override.
      </p>
      <label htmlFor="override-reason" className="mb-1.5 mt-3 block text-xs font-semibold text-ink/70">
        Reason (optional, recorded in the audit log)
      </label>
      <input
        id="override-reason"
        type="text"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        placeholder="e.g. Approved by the department head"
        className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-[#FBFEFC] px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15"
      />
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:scale-[1.02] enabled:hover:bg-amber-600 disabled:opacity-60"
        >
          {busy ? 'Placing…' : 'Place anyway'}
        </button>
      </div>
    </Modal>
  );
}

function QuickAssignForm({
  faculty,
  subjects,
  sections,
  facultyId,
  subjectId,
  sectionId,
  busy,
  error,
  onFacultyChange,
  onSubjectChange,
  onSectionChange,
  onSubmit,
}: {
  faculty: FacultyMember[];
  subjects: Subject[];
  sections: Section[];
  facultyId: string;
  subjectId: string;
  sectionId: string;
  busy: boolean;
  error: string | null;
  onFacultyChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}): JSX.Element {
  const selectCls =
    'w-full rounded-lg border border-leaf-100 bg-white px-2 py-1.5 text-xs text-ink outline-none transition-colors focus:border-leaf-500 focus:ring-4 focus:ring-leaf-500/15';
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2" aria-label="Quick assign a workload">
      <div>
        <label htmlFor="qa-faculty" className="mb-1 block text-[11px] font-medium text-ink/60">
          Faculty
        </label>
        <select
          id="qa-faculty"
          value={facultyId}
          onChange={(event) => onFacultyChange(event.target.value)}
          className={selectCls}
        >
          <option value="">Select…</option>
          {faculty.map((member) => (
            <option key={member.id} value={member.id}>
              {member.last_name}, {member.first_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="qa-subject" className="mb-1 block text-[11px] font-medium text-ink/60">
          Subject
        </label>
        <select
          id="qa-subject"
          value={subjectId}
          onChange={(event) => onSubjectChange(event.target.value)}
          className={selectCls}
        >
          <option value="">Select…</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code} — {subject.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="qa-section" className="mb-1 block text-[11px] font-medium text-ink/60">
          Section
        </label>
        <select
          id="qa-section"
          value={sectionId}
          onChange={(event) => onSectionChange(event.target.value)}
          className={selectCls}
        >
          <option value="">Select…</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-leaf-500 px-3 py-1.5 text-xs font-semibold text-[#08130D] transition enabled:hover:bg-leaf-600 enabled:hover:text-white disabled:opacity-60"
      >
        {busy ? 'Adding…' : 'Add assignment'}
      </button>
    </form>
  );
}

/** Renders the structured 409 details (what is already booked in that window). */
export function ConflictDetailsList({ details }: { details: ConflictDetails | null }): JSX.Element | null {
  if (!details || details.conflicting_slots.length === 0) {
    return null;
  }
  return (
    <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
      {details.conflicting_slots.map((conflict) => (
        <li key={conflict.slot_id}>
          <span className="font-medium">
            {DAY_LABELS[conflict.day_of_week]} {formatTime12h(conflict.start_time)}–
            {formatTime12h(conflict.end_time)}:
          </span>{' '}
          {conflict.subject_code} · {conflict.section_label} · {conflict.faculty_name}
          {conflict.room_name ? ` · ${conflict.room_name}` : ''}
        </li>
      ))}
    </ul>
  );
}

