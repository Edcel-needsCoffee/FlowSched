import { useNavigate } from 'react-router-dom';
import type { AuthUser } from '../../store/auth.store';
import { ProfilePhoto } from './ProfilePhoto';
import { useAvatarUpload } from './useAvatarUpload';

export const ROLE_LABELS: Record<AuthUser['role'], string> = {
  CHAIR: 'Program Chair',
  FACULTY: 'Faculty',
};

/** Derive a display name from the login email (chair accounts have no faculty record). */
export function displayNameForUser(user: Pick<AuthUser, 'email'> | null): string {
  if (!user?.email) return 'There';
  const local = user.email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return 'There';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function profileNameForUser(user: AuthUser | null): string {
  return user?.username?.trim() || displayNameForUser(user);
}

/** Profile summary on Account Settings. The photo opens the dedicated Profile page. */
export function ProfileCard({
  user,
  termLabel,
  onUpload,
  onView,
}: {
  user: AuthUser | null;
  termLabel: string | null;
  onUpload?: (file: File) => Promise<void>;
  onView?: () => void;
}): JSX.Element {
  const navigate = useNavigate();
  const name = profileNameForUser(user);
  const upload = useAvatarUpload(onUpload ?? (async () => undefined));
  const photoUrl = upload.previewUrl ?? user?.avatar_url ?? null;

  return (
    <div className="glass-card flex items-center gap-4 p-4">
      <button
        type="button"
        aria-label="View profile photo"
        onClick={() => onView ? onView() : navigate('/profile')}
        className="group relative h-28 w-28 shrink-0 cursor-zoom-in rounded-full border-[3px] p-0 ring-2 ring-brand-500/50 transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 focus-visible:outline-none focus-visible:ring-4"
        style={{ borderColor: 'var(--ui-surface)' }}
      >
        <ProfilePhoto src={photoUrl} name={name} className="h-full w-full rounded-full" />
        <span aria-hidden="true" className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--ui-surface)] bg-slate-900 text-sm font-bold leading-none text-white shadow">
          ⤢
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold text-slate-900">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="glass-chip px-2 py-0.5 text-[11px] font-semibold">
            {user ? ROLE_LABELS[user.role] : '—'}
          </span>
          {termLabel ? (
            <span className="rounded-full border border-brand-500/20 bg-white/60 px-2 py-0.5 font-mono text-[11px] text-slate-600">
              {termLabel}
            </span>
          ) : null}
        </div>
        {onUpload ? (
          <div className="mt-2">
            <button
              type="button"
              disabled={upload.uploading}
              onClick={upload.openPicker}
              className="rounded-lg border border-brand-500/25 bg-white/60 px-2.5 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-500/10 disabled:opacity-60"
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
            {upload.error ? <p role="alert" className="mt-2 text-xs font-medium text-red-700">{upload.error}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
