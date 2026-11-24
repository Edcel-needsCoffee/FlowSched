import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { createRoom, deleteRoom, listRooms, updateRoom, type Room } from '../lib/rooms';
import { useAuthStore } from '../store/auth.store';

// Mirrors apps/api/src/validation/room.validation.ts (name required, <=120).
const roomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Room name is required')
    .max(120, 'Room name must be at most 120 characters'),
});

const SEARCH_DEBOUNCE_MS = 300;

interface ModalState {
  mode: 'create' | 'edit' | 'closed';
  room: Room | null;
}

export function RoomsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { pushToast } = useToast();
  const canEdit = user?.role === 'CHAIR';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState<ModalState>({ mode: 'closed', room: null });
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Room ids with an in-flight maintenance PATCH (switch renders as busy). */
  const [toggling, setToggling] = useState<string[]>([]);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [maintenanceRoom, setMaintenanceRoom] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    try {
      const res = await listRooms({ search: search || undefined });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setRooms(res.data);
      setStatus('ready');
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setStatus('error');
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  function closeModal(): void {
    setModal({ mode: 'closed', room: null });
  }

  function openCreate(): void {
    setName('');
    setNameError(undefined);
    setFormError(null);
    setModal({ mode: 'create', room: null });
  }

  function openEdit(room: Room): void {
    setName(room.name);
    setNameError(undefined);
    setFormError(null);
    setModal({ mode: 'edit', room });
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = roomFormSchema.safeParse({ name });
    if (!parsed.success) {
      setNameError(parsed.error.flatten().fieldErrors.name?.[0]);
      return;
    }
    setNameError(undefined);
    setFormError(null);
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createRoom({ name: parsed.data.name });
        pushToast('success', 'Room added.');
      } else if (modal.mode === 'edit' && modal.room) {
        await updateRoom(modal.room.id, { name: parsed.data.name });
        pushToast('success', 'Room saved.');
      }
      closeModal();
      setReloadKey((key) => key + 1);
    } catch (err) {
      // 409 ROOM_DUPLICATE_NAME lands here — shown inline, modal stays open.
      setFormError(err instanceof Error ? err.message : 'Could not save the room.');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Fast maintenance toggle: one PATCH carrying a single field. Applied
   * optimistically (the switch flips instantly) and rolled back if the write
   * fails, so the table never lies about the server state.
   */
  async function toggleMaintenance(room: Room): Promise<void> {
    if (!canEdit || toggling.includes(room.id)) {
      return;
    }
    const next = !room.is_under_maintenance;
    setToggling((ids) => [...ids, room.id]);
    setRooms((current) =>
      current.map((row) => (row.id === room.id ? { ...row, is_under_maintenance: next } : row)),
    );
    try {
      const res = await updateRoom(room.id, { is_under_maintenance: next });
      setRooms((current) => current.map((row) => (row.id === room.id ? res.room : row)));
      pushToast('success', `${room.name} marked ${next ? 'under maintenance' : 'available'}.`);
    } catch (err) {
      setRooms((current) =>
        current.map((row) =>
          row.id === room.id ? { ...row, is_under_maintenance: room.is_under_maintenance } : row,
        ),
      );
      pushToast('error', err instanceof Error ? err.message : 'Could not update the room.');
    } finally {
      setToggling((ids) => ids.filter((id) => id !== room.id));
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingRoom) return;
    setDeleting(true);
    try {
      await deleteRoom(deletingRoom.id);
      pushToast('success', 'Room deleted.');
      setDeletingRoom(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Could not delete the room.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="room-management-title" className="management-neo rooms-management-page space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="room-management-title" className="text-2xl font-semibold text-primary-dark">
            Room Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Classrooms available for scheduling. Rooms under maintenance are blocked from new
            schedule placements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="room-search" className="sr-only">
            Search rooms by name
          </label>
          <input
            id="room-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name…"
            className="w-56 rounded-xl border-[1.5px] border-leaf-100 bg-white/80 px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15"
          />
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-leaf-500 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:scale-[1.03] enabled:hover:bg-leaf-600 enabled:hover:text-white enabled:active:scale-[0.98]"
            >
              + Add room
            </button>
          ) : null}
        </div>
      </div>

      {status === 'loading' ? (
        <p className="rounded-xl border border-leaf-100 bg-white px-4 py-8 text-center text-sm text-ink/60">
          Loading rooms…
        </p>
      ) : status === 'error' ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-red-700">Could not load rooms.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-leaf-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            {search ? 'No rooms match your search.' : 'No rooms yet.'}
          </p>
          {canEdit && !search ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 rounded-lg bg-leaf-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-leaf-600 hover:text-white"
            >
              Add the first room
            </button>
          ) : null}
        </div>
      ) : (
        <div className="management-table overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-leaf-100 bg-leaf-50/60 text-left">
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Room
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Maintenance
                </th>
                {canEdit ? (
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink/60">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-leaf-50 transition-colors last:border-b-0 hover:bg-leaf-50/40">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{room.name}</span>
                    {room.is_under_maintenance ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Under maintenance
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <MaintenanceSwitch
                      label={`Mark ${room.name} under maintenance`}
                      checked={room.is_under_maintenance}
                      busy={toggling.includes(room.id)}
                      disabled={!canEdit}
                      onToggle={() => { if(room.is_under_maintenance) void toggleMaintenance(room); else setMaintenanceRoom(room); }}
                    />
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(room)}
                        className="management-edit-button rounded-lg border border-leaf-100 px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-leaf-300 hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRoom(room)}
                        className="management-delete-button ml-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal.mode !== 'closed'}
        title={modal.mode === 'create' ? 'Add room' : 'Edit room'}
        onClose={saving ? () => undefined : closeModal}
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <RoomNameField value={name} onChange={setName} error={nameError} />
          {formError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-lg border border-leaf-100 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-leaf-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-leaf-500 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-leaf-600 enabled:hover:text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save room'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={maintenanceRoom !== null}
        title="Place room under maintenance?"
        message={maintenanceRoom ? `Mark ${maintenanceRoom.name} as under maintenance? You will not be able to drag or place classes into this room until it is marked available again.` : ''}
        confirmLabel="Mark under maintenance"
        pending={maintenanceRoom ? toggling.includes(maintenanceRoom.id) : false}
        onConfirm={() => { if(maintenanceRoom) { const room=maintenanceRoom; void toggleMaintenance(room).then(()=>setMaintenanceRoom(null)); } }}
        onCancel={() => setMaintenanceRoom(null)}
      />
      <ConfirmDialog
        open={deletingRoom !== null}
        title="Delete room"
        message={deletingRoom ? `Delete ${deletingRoom.name}? A room with scheduled classes cannot be deleted.` : ''}
        pending={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeletingRoom(null)}
      />
    </section>
  );
}

/** Accessible maintenance toggle (role="switch") — each flip is one PATCH. */
function MaintenanceSwitch({
  label,
  checked,
  busy,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  busy: boolean;
  disabled: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onToggle}
      className={`room-maintenance-switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-leaf-500' : 'bg-slate-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function RoomNameField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}): JSX.Element {
  const fieldId = 'room-name';
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-semibold text-ink/70">
        Room name
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Room 301"
        aria-invalid={error ? true : undefined}
        className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-white/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15"
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
import './management-neo.css';
