import { useCallback } from 'react';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { uploadAvatar } from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { selectSelectedTerm, useTermStore } from '../store/term.store';

/**
 * Account Settings — profile photo management (same upload logic as the
 * Dashboard profile card) plus the account's identity details. Phase 3:
 * password/email changes are out of scope here.
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
        <h1 id="account-title" className="text-2xl font-semibold text-primary-dark">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Manage how you appear across FlowSched.
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        <ProfileCard user={user} termLabel={term?.label ?? null} onUpload={handleUpload} />
        <div className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Account details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/60">Email</dt>
              <dd className="truncate font-mono text-xs text-ink">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/60">Role</dt>
              <dd className="text-xs font-semibold text-ink">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/60">Working term</dt>
              <dd className="text-xs text-ink">{term?.label ?? 'No active term'}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-[11px] text-leaf-800">
            Photo tips: JPG, PNG or WebP, up to 2MB. Your photo appears on the dashboard
            and faculty load panels.
          </p>
        </div>
      </div>
    </section>
  );
}

