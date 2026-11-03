import { useState, type FormEvent } from 'react';
import { forgotPasswordRequest, verifyPinRequest, resetPasswordRequest } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';
import { inputCls } from './AccountEmailForm';
import { PasswordEyeButton } from '../components/PasswordField';

type Step = 'idle' | 'pin' | 'password' | 'done';


/**
 * Forgot-password card for Account Settings (signed-in users, e.g. CHAIR).
 * Same Gmail 6-digit PIN flow as the login modal: send PIN to the account
 * email, verify it, then set a new password. No current password needed
 * because the email PIN itself proves ownership.
 */
export function AccountForgotPasswordCard(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { pushToast } = useToast();
  const [step, setStep] = useState<Step>('idle');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accountEmail = user?.email ?? '';
  const isChair = user?.role === 'CHAIR';

  async function handleSend(): Promise<void> {
    if (!accountEmail) return;
    if (!isChair) {
      setError('Only CHAIR accounts can use the forgot-password PIN.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await forgotPasswordRequest(accountEmail);
      setStep('pin');
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await verifyPinRequest(accountEmail, code.trim());
      setResetToken(res.resetToken);
      setStep('password');
      setInfo(null);
    } catch {
      setError('Invalid or expired code. Check the PIN and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (!resetToken) {
      setError('Session expired. Request a new code.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resetPasswordRequest(resetToken, newPassword);
      setStep('done');
      setCode('');
      setNewPassword('');
      setConfirm('');
      setResetToken(null);
      pushToast('success', 'Password changed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card space-y-3 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Forgot password (email PIN)</h2>
      <p className="text-xs text-slate-500">
        Send a 6-digit PIN to <span className="font-mono">{accountEmail || 'your account email'}</span>, then set a new password.
      </p>
      {step === 'idle' ? (
        isChair ? (
          <div className="flex justify-end">
            <button type="button" onClick={handleSend} disabled={busy || !accountEmail} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              {busy ? 'Sending…' : 'Send 6-digit code'}
            </button>
          </div>
        ) : (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Only CHAIR accounts can use the forgot-password PIN.
          </p>
        )
      ) : null}
      {step === 'pin' ? (
        <form onSubmit={handleVerify} className="space-y-3">
          {info ? <p role="status" className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-700">{info}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div>
            <label htmlFor="account-pin" className="text-xs text-slate-500">6-digit PIN</label>
            <input id="account-pin" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" className={`${inputCls} text-center text-xl font-bold tracking-[0.5em]`} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleSend} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Resend</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{busy ? 'Verifying…' : 'Verify code'}</button>
          </div>
        </form>
      ) : null}
      {step === 'password' ? (
        <form onSubmit={handleReset} className="space-y-3">
          {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div>
            <label htmlFor="account-pin-new" className="text-xs text-slate-500">New password (min 8 characters)</label>
            <div className="relative">
              <input id="account-pin-new" type={showNew ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputCls} pr-10`} />
              <PasswordEyeButton visible={showNew} onToggle={() => setShowNew((v) => !v)} label="new password" />
            </div>
          </div>
          <div>
            <label htmlFor="account-pin-confirm" className="text-xs text-slate-500">Confirm new password</label>
            <div className="relative">
              <input id="account-pin-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputCls} pr-10`} />
              <PasswordEyeButton visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{busy ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      ) : null}
      {step === 'done' ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password changed. Use it next time you sign in.</p>
      ) : null}
    </div>
  );
}
