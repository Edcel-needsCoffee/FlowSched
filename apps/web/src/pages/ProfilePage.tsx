import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProfilePhoto } from '../components/dashboard/ProfilePhoto';
import { profileNameForUser, ROLE_LABELS } from '../components/dashboard/ProfileCard';
import { useAvatarUpload } from '../components/dashboard/useAvatarUpload';
import { uploadAvatar } from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { selectSelectedTerm, useTermStore } from '../store/term.store';

/** Dedicated profile page reached from the avatar in Account Settings. */
export function ProfilePage({embedded=false}: {embedded?:boolean}): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
  const term = useTermStore(selectSelectedTerm);
  const handleUpload = useCallback(async (file: File) => {
    const result = await uploadAvatar(file);
    setAvatarUrl(result.avatar_url);
  }, [setAvatarUrl]);
  const upload = useAvatarUpload(handleUpload);
  const username = profileNameForUser(user);
  const role = user ? ROLE_LABELS[user.role] : '—';
  const photoUrl = upload.previewUrl ?? user?.avatar_url ?? null;

  return (
    <section aria-label="Profile details" className="mx-auto max-w-xl space-y-5">
      {!embedded&&<header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-700">
        <div>
          <h1 id="profile-title" className="text-2xl font-semibold text-neutral-950 dark:text-neutral-50">Profile</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Your profile photo and account details.</p>
        </div>
        <Link to="/account" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
          Account settings
        </Link>
      </header>}

      <div className={embedded?"space-y-4":"glass-card space-y-5 p-5 sm:p-6"}>
        <ProfilePhoto
          src={photoUrl}
          name={username}
          alt={`${username}'s profile photo`}
          className="mx-auto aspect-square w-full max-w-[390px] rounded-2xl"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={upload.openPicker}
            disabled={upload.uploading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            {upload.uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input
            ref={upload.inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={upload.handleChange}
            aria-label="Choose profile photo"
          />
        </div>
        {upload.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{upload.error}</p> : null}

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-50">{username}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold">{role}</span>
            <span className="rounded-full border border-neutral-200 bg-white/60 px-3 py-1 font-mono text-xs text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
              {term?.label ?? 'No active term'}
            </span>
          </div>
        </div>

        <dl className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
          <ProfileDetail label="Username" value={username} />
          <ProfileDetail label="Email" value={user?.email ?? '—'} mono />
          <ProfileDetail label="Role" value={role} />
        </dl>
      </div>
    </section>
  );
}

function ProfileDetail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="shrink-0 text-slate-500 dark:text-neutral-400">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-slate-900 dark:text-neutral-100 ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </dd>
    </div>
  );
}
