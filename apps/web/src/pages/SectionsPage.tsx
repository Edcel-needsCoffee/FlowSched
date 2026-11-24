import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { createSection, deleteSection, listSections, updateSection, type Section } from '../lib/sections';
import { useAuthStore } from '../store/auth.store';
import { useTermStore, selectSelectedTerm } from '../store/term.store';
import { downloadProgramWorkbook } from '../lib/program-download';

const sectionFormSchema = z.object({
  name: z.string().trim().min(1, 'Section name is required').max(60, 'Section name must be at most 60 characters'),
  year_level: z.coerce.number().int().min(1, 'Year level must be between 1 and 6').max(6, 'Year level must be between 1 and 6'),
  student_count: z.preprocess((value) => value === '' || value === undefined ? null : Number(value), z.number().int().min(0, 'Student count cannot be negative').max(200, 'Student count cannot exceed 200').nullable()),
});

interface SectionFormValues {
  name: string;
  year_level: string;
  student_count: string;
}

const EMPTY_FORM: SectionFormValues = { name: '', year_level: '1', student_count: '' };
const SEARCH_DEBOUNCE_MS = 300;

interface ModalState {
  mode: 'create' | 'edit' | 'closed';
  section: Section | null;
}

export function SectionsPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const termId = useTermStore((state) => state.selectedTermId);
  const term = useTermStore(selectSelectedTerm);
  const { pushToast } = useToast();
  const canEdit = user?.role === 'CHAIR';

  const [sections, setSections] = useState<Section[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<ModalState>({ mode: 'closed', section: null });
  const [formValues, setFormValues] = useState<SectionFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SectionFormValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    try {
      const result = await listSections({
        search: search || undefined,
        year_level: yearFilter ? Number(yearFilter) : undefined,
        termId: termId ?? undefined,
      });
      if (requestId !== requestIdRef.current) return;
      setSections(result.data);
      setStatus('ready');
    } catch {
      if (requestId !== requestIdRef.current) return;
      setStatus('error');
    }
  }, [search, yearFilter, termId]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  function openCreate(): void {
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setModal({ mode: 'create', section: null });
  }

  function openEdit(section: Section): void {
    setFormValues({ name: section.name, year_level: String(section.year_level), student_count: section.student_count == null ? '' : String(section.student_count) });
    setFieldErrors({});
    setFormError(null);
    setModal({ mode: 'edit', section });
  }

  function closeModal(): void {
    setModal({ mode: 'closed', section: null });
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = sectionFormSchema.safeParse(formValues);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({ name: errors.name?.[0], year_level: errors.year_level?.[0], student_count: errors.student_count?.[0] });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createSection(parsed.data, termId ?? undefined);
        pushToast('success', 'Section added.');
      } else if (modal.mode === 'edit' && modal.section) {
        await updateSection(modal.section.id, parsed.data, termId ?? undefined);
        pushToast('success', 'Section saved.');
      }
      closeModal();
      setReloadKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the section.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingSection) return;
    setDeleting(true);
    try {
      await deleteSection(deletingSection.id);
      pushToast('success', 'Section deleted.');
      setDeletingSection(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Could not delete the section.');
    } finally {
      setDeleting(false);
    }
  }

  async function exportSchedule(section: Section): Promise<void> {
    if (!termId || exportingId) return;
    setExportingId(section.id);
    try {
      await downloadProgramWorkbook('sections', section.id, termId, `Section Schedule - ${section.name}`);
      pushToast('success', 'Section schedule exported.');
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Could not export the section schedule.');
    } finally {
      setExportingId(null);
    }
  }

  return (
    <section aria-labelledby="section-management-title" className="management-neo section-management-page space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="section-management-title" className="text-2xl font-semibold text-primary-dark">Section Management</h1>
          <p className="mt-1 text-sm text-slate-600">Manage section names and year levels used in schedules and workload assignments.</p>
        </div>
        {canEdit ? (
          <button type="button" onClick={openCreate} className="rounded-lg bg-leaf-500 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:scale-[1.03] enabled:hover:bg-leaf-600 enabled:hover:text-white enabled:active:scale-[0.98]">
            + Add section
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="section-search">Search sections</label>
        <input id="section-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search section names…" className="w-full max-w-sm rounded-xl border-[1.5px] border-leaf-100 bg-white/80 px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15" />
        <label className="sr-only" htmlFor="section-year-filter">Filter by year level</label>
        <select id="section-year-filter" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="rounded-xl border-[1.5px] border-leaf-100 bg-white px-3.5 py-2 text-sm text-ink outline-none focus:border-leaf-500 focus:ring-4 focus:ring-leaf-500/15">
          <option value="">All year levels</option>
          {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
        </select>
      </div>

      {status === 'loading' ? (
        <p role="status" className="rounded-xl border border-leaf-100 bg-white px-4 py-8 text-center text-sm text-ink/60">Loading sections…</p>
      ) : status === 'error' ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-red-700">Could not load sections.</p>
          <button type="button" onClick={() => void load()} className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">Retry</button>
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-leaf-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">{search || yearFilter ? 'No sections match these filters.' : 'No sections yet.'}</p>
          {canEdit && !search && !yearFilter ? <button type="button" onClick={openCreate} className="mt-3 rounded-lg bg-leaf-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-leaf-600 hover:text-white">Add the first section</button> : null}
        </div>
      ) : (
        <div className="management-table overflow-x-auto rounded-2xl border border-leaf-100 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-leaf-100 bg-leaf-50/60 text-left">
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Section</th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Year level</th>
              <th scope="col" className="section-students px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-ink/60">
                Students
                {term?.label && <span className="mt-0.5 block whitespace-nowrap font-normal normal-case tracking-normal">{term.label}</span>}
              </th>
              <th scope="col" className="section-actions-heading px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Actions</th>
            </tr></thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="border-b border-leaf-50 transition-colors last:border-b-0 hover:bg-leaf-50/40">
                  <td className="px-4 py-3"><span className="font-medium text-ink">{section.name}</span></td>
                  <td className="px-4 py-3 text-ink/70">Year {section.year_level}</td>
                  <td className="section-students whitespace-nowrap px-4 py-3 align-middle font-semibold tabular-nums text-ink">{section.student_count ?? <span className="text-xs font-normal text-ink/50">Not entered</span>}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" disabled={!termId || exportingId !== null} aria-label={`Export section schedule for ${section.name}`} title={termId ? 'Download student class program as Excel' : 'Select an academic term to export'} onClick={() => void exportSchedule(section)} className="rounded-lg border border-leaf-200 px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-leaf-500 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">{exportingId === section.id ? 'Exporting…' : 'Export section schedule'}</button>
                    {canEdit ? <>
                    <button type="button" onClick={() => openEdit(section)} className="management-edit-button rounded-lg border border-leaf-100 px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-leaf-300 hover:text-ink">Edit</button>
                    <button type="button" onClick={() => setDeletingSection(section)} className="management-delete-button rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50">Delete</button>
                    </> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.mode !== 'closed'} title={modal.mode === 'create' ? 'Add section' : 'Edit section'} onClose={saving ? () => undefined : closeModal}>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="section-name" className="mb-1.5 block text-xs font-semibold text-ink/70">Section name</label>
            <input id="section-name" type="text" value={formValues.name} onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. BSIE 1A" aria-invalid={fieldErrors.name ? true : undefined} className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-white/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15" />
            {fieldErrors.name ? <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label htmlFor="section-year-level" className="mb-1.5 block text-xs font-semibold text-ink/70">Year level</label>
            <select id="section-year-level" value={formValues.year_level} onChange={(event) => setFormValues((current) => ({ ...current, year_level: event.target.value }))} aria-invalid={fieldErrors.year_level ? true : undefined} className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-leaf-500 focus:ring-4 focus:ring-leaf-500/15">
              {[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}
            </select>
            {fieldErrors.year_level ? <p className="mt-1 text-sm text-red-600">{fieldErrors.year_level}</p> : null}
          </div>
          <div>
            <label htmlFor="section-student-count" className="mb-1.5 block text-xs font-semibold text-ink/70">Number of students{term?.label ? ` · ${term.label}` : ''}</label>
            <input id="section-student-count" type="number" min="0" max="200" step="1" value={formValues.student_count} onChange={(event) => setFormValues((current) => ({ ...current, student_count: event.target.value }))} placeholder={termId ? 'Enter student count' : 'Select a term first'} disabled={!termId} aria-invalid={fieldErrors.student_count ? true : undefined} className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-white/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
            {fieldErrors.student_count ? <p className="mt-1 text-sm text-red-600">{fieldErrors.student_count}</p> : <p className="mt-1 text-xs text-ink/50">This count is saved for the selected term and appears in the Student Class Program print.</p>}
          </div>
          {formError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg border border-leaf-100 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-leaf-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-leaf-500 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-leaf-600 enabled:hover:text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save section'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingSection !== null}
        title="Delete section"
        message={deletingSection ? `Delete ${deletingSection.name} (Year ${deletingSection.year_level})? A section used by a workload assignment cannot be deleted.` : ''}
        pending={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeletingSection(null)}
      />
    </section>
  );
}
import './management-neo.css';
