import { useEffect, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { createTerm, deleteTerm, type Semester, updateTerm } from '../lib/terms';
import { useTermStore } from '../store/term.store';

const field = 'mt-1 rounded-lg border border-leaf-200 bg-white px-3 py-2 text-sm text-ink';
const button = 'rounded-lg bg-leaf-500 px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50';

interface TermDraft {
  school_year: string;
  semester: Semester;
  is_active: boolean;
}

const emptyDraft: TermDraft = { school_year: '', semester: 'FIRST', is_active: true };

/** Chair-only CRUD and rollback selector for saved, term-scoped program data. */
export function TermManagementCard(): JSX.Element {
  const terms = useTermStore((state) => state.terms);
  const status = useTermStore((state) => state.status);
  const loadTerms = useTermStore((state) => state.loadTerms);
  const selectTerm = useTermStore((state) => state.selectTerm);
  const selectedTermId = useTermStore((state) => state.selectedTermId);
  const [draft, setDraft] = useState<TermDraft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();
  const activeTerm = terms.find((term) => term.is_active);

  useEffect(() => {
    if (status === 'idle') void loadTerms();
  }, [status, loadTerms]);

  function startNewTerm(): void {
    setEditingId(null);
    setDraft({ ...emptyDraft, school_year: activeTerm?.school_year ?? '' });
    setFormOpen(true);
  }

  function startEdit(id: string): void {
    const term = terms.find((item) => item.id === id);
    if (!term) return;
    setEditingId(id);
    setDraft({ school_year: term.school_year, semester: term.semester, is_active: term.is_active });
    setFormOpen(true);
  }

  async function saveTerm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await updateTerm(editingId, draft);
        pushToast('success', 'Term updated. Its saved program data is unchanged.');
      } else {
        const response = await createTerm(draft);
        selectTerm(response.term.id);
        pushToast('success', 'Term created and selected. You can return to saved terms anytime.');
      }
      await loadTerms();
      setEditingId(null);
      setDraft(emptyDraft);
      setFormOpen(false);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Could not save term.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteTerm(deleting.id);
      await loadTerms();
      pushToast('success', 'Empty term deleted.');
      setDeleting(null);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Could not delete term.');
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-card space-y-5 p-5" aria-labelledby="saved-terms-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="saved-terms-title" className="text-base font-semibold text-slate-900">Term Management · Saved Terms</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Each term keeps its own schedules, function sessions, designations, and student counts. Select a saved term to continue where you left off. Term effectivity is managed in Form Settings.
          </p>
        </div>
        <button type="button" className={button} disabled={status === 'loading'} onClick={startNewTerm}>{formOpen && !editingId ? 'Reset new term' : 'New term'}</button>
      </div>

      {formOpen && <form className="grid gap-3 rounded-xl border border-leaf-100 p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => void saveTerm(event)}>
        <label className="text-sm">School year
          <input required pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" aria-label="Term school year" className={`${field} w-full`} value={draft.school_year} onChange={(event) => setDraft({ ...draft, school_year: event.target.value })}/>
        </label>
        <label className="text-sm">Semester
          <select aria-label="Term semester" className={`${field} w-full`} value={draft.semester} onChange={(event) => setDraft({ ...draft, semester: event.target.value as Semester })}>
            <option value="FIRST">1st Semester</option>
            <option value="SECOND">2nd Semester</option>
            <option value="SUMMER">Summer</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={button} disabled={busy || status === 'loading'}>{editingId ? 'Save changes' : 'Create term'}</button>
          <button type="button" className="rounded-lg border border-leaf-200 px-3 py-2 text-sm" onClick={() => { setEditingId(null); setDraft(emptyDraft); setFormOpen(false); }}>Cancel</button>
        </div>
      </form>}

      {status === 'loading' && terms.length === 0 ? <p role="status" className="text-sm text-slate-500">Loading saved terms…</p> : null}
      {status === 'error' ? <div role="alert" className="text-sm text-red-700">Could not load saved terms. <button type="button" className="underline" onClick={() => void loadTerms()}>Retry</button></div> : null}
      {status === 'ready' && terms.length === 0 ? <p className="rounded-xl border border-dashed border-leaf-200 p-4 text-sm text-slate-500">No academic terms yet. Create one to start a saved schedule.</p> : null}

      {terms.length > 0 && <ul className="divide-y divide-leaf-100 rounded-xl border border-leaf-100">
        {terms.map((term) => {
          const selected = selectedTermId === term.id;
          return <li key={term.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="font-medium text-slate-900">{term.label}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {term.is_active && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">Active</span>}
                {selected && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">Selected for work</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!selected && <button type="button" className={button} onClick={() => selectTerm(term.id)}>Use this term</button>}
              <button type="button" className="rounded-lg border border-leaf-200 px-3 py-2 text-sm" onClick={() => startEdit(term.id)}>Edit</button>
              <button type="button" disabled={busy || term.is_active} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40" onClick={() => setDeleting({ id: term.id, label: term.label })}>Delete</button>
            </div>
          </li>;
        })}
      </ul>}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete empty term?"
        message={`Delete ${deleting?.label ?? 'this term'}? Terms with saved schedules, sessions, designations, student counts, or effectivity dates are protected and cannot be deleted.`}
        pending={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
