import { useState, type FormEvent } from 'react';
import { updateMe } from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

export function ChairUsernameForm({ embedded = false }: { embedded?: boolean }): JSX.Element {
  const username = useAuthStore((state) => state.user?.username ?? '');
  const setUser = useAuthStore((state) => state.setUser);
  const { pushToast } = useToast();
  const [value, setValue] = useState(username);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      setError('Enter a username.');
      return;
    }
    setError('');
    setConfirmOpen(true);
  }

  async function confirmSave(): Promise<void> {
    const next = value.trim();
    setConfirmOpen(false);
    setBusy(true);
    try {
      const result = await updateMe({ username: next });
      setUser(result.user);
      setValue(result.user.username ?? next);
      pushToast('success', 'Profile username updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update username.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={embedded ? 'space-y-3' : 'glass-card space-y-3 p-5'}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Profile username</h2>
        <p className="mt-1 text-xs text-slate-500">Shown as your profile name. This is separate from your sign-in email.</p>
      </div>
      <div>
        <label htmlFor="chair-username" className="text-xs text-slate-600">Username</label>
        <input id="chair-username" autoComplete="nickname" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
      </div>
      {error ? <p role="alert" className="text-sm text-neutral-700">{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy || value.trim() === username} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">
          {busy ? 'Saving…' : 'Save username'}
        </button>
      </div>
      <Modal open={confirmOpen} title="Confirm username change" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm text-slate-700 dark:text-neutral-300">Change your profile username to <span className="font-semibold">{value.trim()}</span>? Your email address will not change.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
          <button type="button" onClick={() => void confirmSave()} disabled={busy} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">Confirm change</button>
        </div>
      </Modal>
    </form>
  );
}
