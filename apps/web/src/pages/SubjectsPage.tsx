import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
  type Subject,
  type SubjectListResult,
  type SubjectSortBy,
  type SubjectSortDir,
} from '../lib/subjects';
import { useAuthStore } from '../store/auth.store';

// Mirrors apps/api/src/validation/subject.validation.ts (units > 0, hours >= 0).
const subjectFormSchema = z.object({
  code: z.string().trim().min(1, 'Subject code is required').max(40, 'Subject code must be at most 40 characters'),
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  units: z.coerce
    .number({ invalid_type_error: 'Units must be a number' })
    .positive('Units must be greater than 0')
    .max(99, 'Units must be 99 or less'),
  lecture_hours: z.coerce
    .number({ invalid_type_error: 'Lecture hours must be a number' })
    .min(0, 'Lecture hours cannot be negative')
    .max(99, 'Lecture hours must be 99 or less'),
  lab_hours: z.coerce
    .number({ invalid_type_error: 'Lab hours must be a number' })
    .min(0, 'Lab hours cannot be negative')
    .max(99, 'Lab hours must be 99 or less'),
});

interface SubjectFormValues {
  code: string;
  title: string;
  units: string;
  lecture_hours: string;
  lab_hours: string;
}

const EMPTY_FORM: SubjectFormValues = { code: '', title: '', units: '', lecture_hours: '', lab_hours: '' };

type SortState = { sortBy: SubjectSortBy; sortDir: SubjectSortDir };

interface ModalState {
  mode: 'create' | 'edit' | 'closed';
  subject: Subject | null;
}

const SEARCH_DEBOUNCE_MS = 300;

export function SubjectsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { pushToast } = useToast();
  const canEdit = user?.role === 'CHAIR';

  const [result, setResult] = useState<SubjectListResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sortBy: 'code', sortDir: 'asc' });
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState<ModalState>({ mode: 'closed', subject: null });
  const [formValues, setFormValues] = useState<SubjectFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SubjectFormValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestIdRef = useRef(0);

  // Debounced search (ui-ux.md §7: search filters the table without reload).
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    try {
      const res = await listSubjects({
        search: search || undefined,
        page,
        pageSize: 10,
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
      });
      if (requestId !== requestIdRef.current) {
        return; // a newer request superseded this one
      }
      // Deleting the last row of the last page can leave an empty page — clamp.
      if (res.meta.total > 0 && res.meta.pageCount < page) {
        setPage(res.meta.pageCount);
        return;
      }
      setResult(res);
      setStatus('ready');
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setStatus('error');
    }
  }, [search, page, sort]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  function toggleSort(sortBy: SubjectSortBy): void {
    setSort((current) =>
      current.sortBy === sortBy
        ? { sortBy, sortDir: current.sortDir === 'asc' ? 'desc' : 'asc' }
        : { sortBy, sortDir: 'asc' },
    );
  }

  function openCreate(): void {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setModal({ mode: 'create', subject: null });
  }

  function openEdit(subject: Subject): void {
    setFormValues({
      code: subject.code,
      title: subject.title,
      units: String(subject.units),
      lecture_hours: String(subject.lecture_hours),
      lab_hours: String(subject.lab_hours),
    });
    setFieldErrors({});
    setFormError(null);
    setModal({ mode: 'edit', subject });
  }

  function closeModal(): void {
    setModal({ mode: 'closed', subject: null });
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = subjectFormSchema.safeParse(formValues);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        code: flat.code?.[0],
        title: flat.title?.[0],
        units: flat.units?.[0],
        lecture_hours: flat.lecture_hours?.[0],
        lab_hours: flat.lab_hours?.[0],
      });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createSubject(parsed.data);
        pushToast('success', 'Subject created.');
      } else if (modal.mode === 'edit' && modal.subject) {
        await updateSubject(modal.subject.id, parsed.data);
        pushToast('success', 'Subject saved.');
      }
      closeModal();
      setReloadKey((key) => key + 1); // refresh the table in place — no reload
    } catch (err) {
      // e.g. 409 duplicate code from the API — shown inline, modal stays open.
      setFormError(err instanceof Error ? err.message : 'Could not save the subject.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingSubject) {
      return;
    }
    setDeleting(true);
    try {
      await deleteSubject(deletingSubject.id);
      pushToast('success', 'Subject deleted.');
      setDeletingSubject(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Could not delete the subject.');
    } finally {
      setDeleting(false);
    }
  }

  const rows = result?.data ?? [];
  const meta = result?.meta ?? null;

  return (
    <section aria-labelledby="subjects-title">
      <div className="flex items-center justify-between gap-4">
        <h1 id="subjects-title" className="text-2xl font-semibold text-primary-dark">
          Subjects
        </h1>
        {canEdit ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            Add Subject
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <label htmlFor="subjects-search" className="block text-sm font-medium text-slate-700">
          Search
        </label>
        <input
          id="subjects-search"
          type="search"
          placeholder="Search by code or title…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="mt-1 w-full max-w-sm rounded border border-slate-300 px-3 py-2"
        />
      </div>

      {status === 'error' ? (
        <div role="alert" className="mt-6 rounded border border-red-300 bg-red-50 p-6 text-center">
          <p className="text-red-800">Couldn&apos;t load subjects.</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading');
              setReloadKey((key) => key + 1);
            }}
            className="mt-3 rounded border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div aria-busy="true" className="mt-6 space-y-2">
          <span className="sr-only">Loading subjects…</span>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-surface-muted" />
          ))}
        </div>
      ) : null}

      {status === 'ready' ? (
        <>
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" aria-sort={sortHeaderState('code', sort)} className="py-2 pr-4">
                  <SortButton label="Code" column="code" sort={sort} onToggle={toggleSort} />
                </th>
                <th scope="col" aria-sort={sortHeaderState('title', sort)} className="py-2 pr-4">
                  <SortButton label="Title" column="title" sort={sort} onToggle={toggleSort} />
                </th>
                <th scope="col" aria-sort={sortHeaderState('units', sort)} className="py-2 pr-4">
                  <SortButton label="Units" column="units" sort={sort} onToggle={toggleSort} />
                </th>
                <th scope="col" className="py-2 pr-4">Lecture hrs</th>
                <th scope="col" className="py-2 pr-4">Lab hrs</th>
                {canEdit ? <th scope="col" className="py-2 pr-4">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="py-8 text-center text-slate-500">
                    {search ? 'No subjects match your search.' : 'No subjects in the catalog yet.'}
                  </td>
                </tr>
              ) : (
                rows.map((subject) => (
                  <tr key={subject.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-mono">{subject.code}</td>
                    <td className="py-2 pr-4">{subject.title}</td>
                    <td className="py-2 pr-4">{subject.units}</td>
                    <td className="py-2 pr-4">{subject.lecture_hours}</td>
                    <td className="py-2 pr-4">{subject.lab_hours}</td>
                    {canEdit ? (
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={() => openEdit(subject)}
                          className="text-primary-dark hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSubject(subject)}
                          className="ml-3 text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {meta ? (
            <nav aria-label="Table pagination" className="mt-4 flex items-center gap-4 text-sm text-slate-600">
              <button
                type="button"
                disabled={meta.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {meta.page} of {meta.pageCount} · {meta.total} subject{meta.total === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                disabled={meta.page >= meta.pageCount}
                onClick={() => setPage((current) => current + 1)}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      <Modal
        open={modal.mode !== 'closed'}
        title={modal.mode === 'edit' ? 'Edit Subject' : 'Add Subject'}
        onClose={saving ? () => undefined : closeModal}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="subject-code" className="block text-sm font-medium text-slate-700">
              Subject code
            </label>
            <input
              id="subject-code"
              type="text"
              value={formValues.code}
              onChange={(event) => setFormValues((v) => ({ ...v, code: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono"
            />
            {fieldErrors.code ? <p className="mt-1 text-sm text-red-600">{fieldErrors.code}</p> : null}
          </div>
          <div>
            <label htmlFor="subject-title" className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="subject-title"
              type="text"
              value={formValues.title}
              onChange={(event) => setFormValues((v) => ({ ...v, title: event.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
            {fieldErrors.title ? <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="subject-units" className="block text-sm font-medium text-slate-700">
                Units
              </label>
              <input
                id="subject-units"
                type="number"
                min="0"
                step="0.5"
                value={formValues.units}
                onChange={(event) => setFormValues((v) => ({ ...v, units: event.target.value }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
              {fieldErrors.units ? <p className="mt-1 text-sm text-red-600">{fieldErrors.units}</p> : null}
            </div>
            <div>
              <label htmlFor="subject-lecture-hours" className="block text-sm font-medium text-slate-700">
                Lecture hrs
              </label>
              <input
                id="subject-lecture-hours"
                type="number"
                min="0"
                step="0.5"
                value={formValues.lecture_hours}
                onChange={(event) => setFormValues((v) => ({ ...v, lecture_hours: event.target.value }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
              {fieldErrors.lecture_hours ? (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.lecture_hours}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="subject-lab-hours" className="block text-sm font-medium text-slate-700">
                Lab hrs
              </label>
              <input
                id="subject-lab-hours"
                type="number"
                min="0"
                step="0.5"
                value={formValues.lab_hours}
                onChange={(event) => setFormValues((v) => ({ ...v, lab_hours: event.target.value }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
              {fieldErrors.lab_hours ? <p className="mt-1 text-sm text-red-600">{fieldErrors.lab_hours}</p> : null}
            </div>
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingSubject !== null}
        title="Delete subject"
        message={
          deletingSubject
            ? `Delete ${deletingSubject.code} — ${deletingSubject.title}? This removes it from the catalog.`
            : ''
        }
        pending={deleting}
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setDeletingSubject(null)}
      />
    </section>
  );
}

function sortHeaderState(column: SubjectSortBy, sort: SortState): 'ascending' | 'descending' | 'none' {
  if (sort.sortBy !== column) {
    return 'none';
  }
  return sort.sortDir === 'asc' ? 'ascending' : 'descending';
}

function SortButton({
  label,
  column,
  sort,
  onToggle,
}: {
  label: string;
  column: SubjectSortBy;
  sort: SortState;
  onToggle: (column: SubjectSortBy) => void;
}): JSX.Element {
  const active = sort.sortBy === column;
  const arrow = active ? (sort.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <button
      type="button"
      onClick={() => onToggle(column)}
      className={`font-medium ${active ? 'text-primary-dark' : 'text-slate-600 hover:text-slate-900'}`}
    >
      {label}
      {arrow}
    </button>
  );
}