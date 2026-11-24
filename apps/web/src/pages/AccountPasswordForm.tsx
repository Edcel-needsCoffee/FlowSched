import { useState, type FormEvent } from 'react';
import { updateMe } from '../lib/dashboard';
import { useToast } from '../components/Toast';
import { inputCls } from './AccountEmailForm';
import { PasswordEyeButton } from '../components/PasswordField';

/** Password change for the signed-in account (current password required). */
export function PasswordForm(): JSX.Element {
  const { pushToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordChecks = [
    newPassword.length >= 8,
    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    /\d/.test(newPassword),
    /[^A-Za-z0-9]/.test(newPassword),
  ];
  const strength = passwordChecks.filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updateMe({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      pushToast('success', 'Password changed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
      <div>
        <label htmlFor="account-current-password" className="text-xs text-slate-500">Current password</label>
        <div className="relative">
          <input id="account-current-password" type={showCurrent ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`${inputCls} pr-10`} />
          <PasswordEyeButton visible={showCurrent} onToggle={() => setShowCurrent((v) => !v)} label="current password" />
        </div>
      </div>
      <div>
        <label htmlFor="account-new-password" className="text-xs text-slate-500">New password (min 8 characters)</label>
        <div className="relative">
          <input id="account-new-password" type={showNew ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputCls} pr-10`} />
          <PasswordEyeButton visible={showNew} onToggle={() => setShowNew((v) => !v)} label="new password" />
        </div>
        {newPassword ? (
          <div className="mt-2" aria-live="polite">
            <div className="flex gap-1" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength}>
              {passwordChecks.map((passed, index) => (
                <span key={index} className={`h-1.5 flex-1 rounded-full ${passed ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{strengthLabel} · Use 8+ characters, mixed case, a number, and a symbol.</p>
          </div>
        ) : null}
      </div>
      <div>
        <label htmlFor="account-confirm-password" className="text-xs text-slate-500">Confirm new password</label>
        <div className="relative">
          <input id="account-confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputCls} pr-10`} />
          <PasswordEyeButton visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />
        </div>
      </div>
      {error ? (<p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>) : null}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
