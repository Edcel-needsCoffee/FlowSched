import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { forgotPasswordRequest, resetPasswordRequest, verifyPinRequest } from '../../lib/api';
import { PasswordEyeButtonDark } from '../PasswordField';

const emailStepSchema = z.object({ email: z.string().email('Kindly provide a registered email address.') });
const pinStepSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email') });
const passwordStepSchema = z
  .object({
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
    confirm: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'New passwords do not match', path: ['confirm'] });

type Step = 'email' | 'pin' | 'password' | 'done';

/**
 * BitsHub-style forgot-password flow: email → 6-digit Gmail PIN → new password.
 * Rendered inside the login modal; opened from "Forgot password?".
 */
export function ForgotPasswordFlow({
  initialEmail,
  onBackToLogin,
  onDone,
}: {
  initialEmail: string;
  onBackToLogin: () => void;
  onDone: () => void;
}): JSX.Element {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEmailSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = emailStepSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0] ?? 'Kindly provide a registered email address.');
      return;
    }
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const res = await forgotPasswordRequest(parsed.data.email);
      setEmail(parsed.data.email);
      setStep('pin');
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kindly provide a registered email address and try again.');
    } finally {
      setPending(false);
    }
  }

  async function handlePinSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = pinStepSchema.safeParse({ code: code.trim() });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.code?.[0] ?? 'Enter the 6-digit code');
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await verifyPinRequest(email.trim(), parsed.data.code);
      setResetToken(res.resetToken);
      setStep('password');
      setInfo(null);
    } catch {
      setError('Invalid or expired code. Check the PIN and try again.');
    } finally {
      setPending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = passwordStepSchema.safeParse({ newPassword, confirm });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setError(flat.confirm?.[0] ?? flat.newPassword?.[0] ?? 'Check your new password');
      return;
    }
    if (!resetToken) {
      setError('Session expired. Go back and request a new code.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await resetPasswordRequest(resetToken, parsed.data.newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setPending(false);
    }
  }

  async function handleResend(): Promise<void> {
    setError(null);
    setPending(true);
    try {
      const res = await forgotPasswordRequest(email.trim());
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} noValidate className="mt-6 space-y-4">
          <p className="text-sm text-ink-300">Enter your CHAIR account email and we will send a 6-digit PIN to your Gmail.</p>
          {error ? <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2.5 text-sm text-red-300">{error}</p> : null}
          <div>
            <label htmlFor="forgot-email" className="glass-label-dark">Email</label>
            <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input-dark py-3 px-3.5" />
          </div>
          <button type="submit" disabled={pending} className="glass-btn-primary-dark">{pending ? 'Sending…' : 'Send 6-digit code'}</button>
          <button type="button" onClick={onBackToLogin} className="glass-link-dark w-full text-center text-xs">Back to sign in</button>
        </form>
      ) : null}

      {step === 'pin' ? (
        <form onSubmit={handlePinSubmit} noValidate className="mt-6 space-y-4">
          <p className="text-sm text-ink-300">Enter the 6-digit code sent to <span className="font-semibold text-ink-100">{email}</span>.</p>
          {info ? <p role="status" className="rounded-lg border border-signal-300/30 bg-signal-300/10 px-3 py-2.5 text-sm text-ink-100">{info}</p> : null}
          {error ? <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2.5 text-sm text-red-300">{error}</p> : null}
          <div>
            <label htmlFor="forgot-pin" className="glass-label-dark">6-digit PIN</label>
            <input id="forgot-pin" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" className="glass-input-dark py-3 px-3.5 text-center text-2xl font-bold tracking-[0.5em]" />
          </div>
          <button type="submit" disabled={pending} className="glass-btn-primary-dark">{pending ? 'Verifying…' : 'Verify code'}</button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={handleResend} disabled={pending} className="glass-link-dark disabled:opacity-50">Resend code</button>
            <button type="button" onClick={onBackToLogin} className="glass-link-dark">Back to sign in</button>
          </div>
        </form>
      ) : null}

      {step === 'password' ? (
        <form onSubmit={handlePasswordSubmit} noValidate className="mt-6 space-y-4">
          <p className="text-sm text-ink-300">Code verified. Choose a new password (min 8 characters).</p>
          {error ? <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2.5 text-sm text-red-300">{error}</p> : null}
          <div>
            <label htmlFor="forgot-new-password" className="glass-label-dark">New password</label>
            <div className="relative">
              <input id="forgot-new-password" type={showNew ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="glass-input-dark py-3 pl-3.5 pr-10" />
              <PasswordEyeButtonDark visible={showNew} onToggle={() => setShowNew((v) => !v)} label="new password" />
            </div>
          </div>
          <div>
            <label htmlFor="forgot-confirm-password" className="glass-label-dark">Confirm new password</label>
            <div className="relative">
              <input id="forgot-confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="glass-input-dark py-3 pl-3.5 pr-10" />
              <PasswordEyeButtonDark visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />
            </div>
          </div>
          <button type="submit" disabled={pending} className="glass-btn-primary-dark">{pending ? 'Saving…' : 'Change password'}</button>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="mt-6 space-y-4 text-center">
          <div aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-xl text-emerald-300">✓</div>
          <p className="text-sm text-ink-100">Password changed. You can now sign in with your new password.</p>
          <button type="button" onClick={onDone} className="glass-btn-primary-dark">Back to sign in</button>
        </div>
      ) : null}
    </div>
  );
}

