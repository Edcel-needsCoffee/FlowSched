import { useCallback } from 'react';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { uploadAvatar } from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { selectSelectedTerm, useTermStore } from '../store/term.store';
import { EmailForm } from './AccountEmailForm';
import { PasswordForm } from './AccountPasswordForm';
import { AccountForgotPasswordCard } from './AccountForgotCard';

/**
 * Account Settings — profile photo, editable email, and password change.
 * Credential edits require the current password (server re-verifies it).
 */
export function AccountSettingsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const setAvatarUrl = useAuthStore((s) => s.setAvatarUrl);
  const term = useTermStore(selectSelectedTerm);

  const handleUpload = useCallback(
    async (file: File) => {
      const res = await uploadAvatar(file);
      setAvatarUrl(res.avatar_url);
    },
    [setAvatarUrl],
  );

  return (
    <section aria-labelledby="account-title" className="space-y-4">
      <div>
        <h1 id="account-title" className="text-2xl font-semibold text-brand-500">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage how you appear across FlowSched.
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        <ProfileCard user={user} termLabel={term?.label ?? null} onUpload={handleUpload} />
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Account details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="truncate font-mono text-xs text-slate-900">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Role</dt>
              <dd className="text-xs font-semibold text-slate-900">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Working term</dt>
              <dd className="text-xs text-slate-900">{term?.label ?? 'No active term'}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-brand-500/10 px-3 py-2 text-[11px] text-brand-500">
            Photo tips: JPG, PNG or WebP, up to 2MB. Your photo appears on the dashboard
            and faculty load panels.
          </p>
        </div>
        <EmailForm />
        <PasswordForm />
        {user?.role === 'CHAIR' ? <AccountForgotPasswordCard /> : null}
      </div>
    </section>
  );
}

