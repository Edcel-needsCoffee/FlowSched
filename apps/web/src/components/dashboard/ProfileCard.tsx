import { useRef, useState, type ChangeEvent } from 'react';
import { AvatarImage } from './AvatarImage';
import { validateAvatarFile } from '../../lib/dashboard';
import type { AuthUser } from '../../store/auth.store';

export const ROLE_LABELS: Record<AuthUser['role'], string> = {
  CHAIR: 'Program Chair',
  FACULTY: 'Faculty',
  ACADEMIC_ADMIN: 'Academic Administrator',
};

/** Derive a display name from the login email (chair accounts have no faculty record). */
export function displayNameForUser(user: Pick<AuthUser, 'email'> | null): string {
  if (!user?.email) return 'There';
  const local = user.email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return 'There';
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * ProfileCard — avatar (or initials fallback), name, role and term badge with
 * a "Change photo" affordance. The upload itself is shared with Account
 * Settings: the parent performs it via uploadAvatar() and updates the store.
 */
export function ProfileCard({
  user,
  termLabel,
  onUpload,
}: {
  user: AuthUser | null;
  termLabel: string | null;
  onUpload?: (file: File) => Promise<void>;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = displayNameForUser(user);
  const canUpload = typeof onUpload === 'function';

  async function handleChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file || !onUpload) return;
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed — try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="glass-card flex items-center gap-4 p-4">
      <AvatarImage src={user?.avatar_url ?? null} name={name} size="lg" />
      <div className="min-w-0">
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
        {canUpload ? (
          <div className="mt-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-brand-500/25 bg-white/60 px-2.5 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-500/10 disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleChange}
              aria-label="Change profile photo"
            />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
