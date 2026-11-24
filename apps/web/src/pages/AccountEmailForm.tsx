import { useState, type FormEvent } from 'react';
import { updateMe } from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';
import { PasswordEyeButton } from '../components/PasswordField';

export const inputCls =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15';

/** Editable email for the signed-in account (current password required). */
export function EmailForm({ embedded = false }: { embedded?: boolean }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const next = email.trim();
    if (!next) {
      setError('Enter a new email address.');
      return;
    }
    if (!password) {
      setError('Enter your current password to confirm.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await updateMe({ email: next, current_password: password });
      setUser({ ...res.user });
      setEmail('');
      setPassword('');
      pushToast('success', 'Email updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={embedded ? "space-y-3" : "glass-card space-y-3 p-4"}>
      <h2 className="text-sm font-semibold text-slate-900">Change email</h2>
      <div>
        <label htmlFor="account-email" className="text-xs text-slate-500">New email</label>
        <input id="account-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={user?.email ?? 'you@flowsched.local'} className={inputCls} />
      </div>
      <div>
        <label htmlFor="account-email-password" className="text-xs text-slate-500">Current password (to confirm)</label>
        <div className="relative">
          <input id="account-email-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} />
          <PasswordEyeButton visible={showPassword} onToggle={() => setShowPassword((v) => !v)} label="current password" />
        </div>
      </div>
      {error ? (<p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>) : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save email'}
        </button>
      </div>
    </form>
  );
}
