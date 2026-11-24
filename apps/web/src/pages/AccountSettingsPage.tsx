import { ProfilePage } from './ProfilePage';
import './account-settings.css';
import { Modal } from '../components/Modal';
import { useCallback, useState } from 'react';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { uploadAvatar } from '../lib/dashboard';
import { useAuthStore } from '../store/auth.store';
import { selectSelectedTerm, useTermStore } from '../store/term.store';
import { EmailForm } from './AccountEmailForm';
import { ChairUsernameForm } from './ChairUsernameForm';
import { TermManagementCard } from './TermManagementCard';

/**
 * Account Settings — profile photo, editable email, and password change.
 * Credential edits require the current password (server re-verifies it).
 */
export function AccountSettingsPage(): JSX.Element {
  const [profileOpen,setProfileOpen]=useState(false);
  const [emailEditing,setEmailEditing]=useState(false);
  const [usernameEditing,setUsernameEditing]=useState(false);
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
    <section aria-labelledby="account-title" className="account-settings-page mx-auto max-w-6xl space-y-5">
      <div className="border-b border-neutral-200 pb-4 dark:border-neutral-700">
        <h1 id="account-title" className="text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage your profile and account security.
        </p>
      </div>

      <div className="account-profile-block"><ProfileCard user={user} termLabel={term?.label ?? null} onUpload={handleUpload} onView={()=>setProfileOpen(true)} /><p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP, up to 2MB. Your photo appears on the dashboard and faculty load panels.</p></div>
      <div className="account-columns grid items-start gap-5">
        <div className="space-y-5">
          <div className="glass-card account-details-card p-5">
          <h2 className="text-base font-semibold text-slate-900">Account details</h2>
          <dl className="account-detail-rows mt-3 text-sm">
            <div>
              <dt className="text-slate-500">Username</dt>
              <dd className="flex min-w-0 items-center gap-2"><span className="break-all text-xs text-slate-900">{user?.username || 'Not set'}</span>{user?.role === 'CHAIR' ? <button type="button" onClick={()=>setUsernameEditing(v=>!v)} className="account-email-edit shrink-0 rounded-lg border-2 border-black px-2 py-1 text-xs font-semibold shadow-[2px_2px_0_#000]" aria-expanded={usernameEditing}>Edit</button> : null}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="flex min-w-0 items-center gap-2"><span className="break-all text-xs text-slate-900">{user?.email ?? '—'}</span><button type="button" onClick={()=>setEmailEditing(true)} className="account-email-edit shrink-0 rounded-lg border-2 border-black bg-green-400 px-2 py-1 text-xs font-semibold text-black shadow-[2px_2px_0_#000]">Edit</button></dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Role</dt>
              <dd className="text-xs font-semibold text-slate-900">{user?.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Working term</dt>
              <dd className="text-right text-xs text-slate-900">{term?.label ?? 'No active term'}</dd>
            </div>
          </dl>
          </div>
        </div>
      </div>
      {user?.role === 'CHAIR' ? <TermManagementCard /> : null}
      <div className="profile-view-dialog"><Modal open={profileOpen} title="Profile" onClose={()=>setProfileOpen(false)}><ProfilePage embedded /></Modal></div>
      <Modal open={usernameEditing} title="Edit username" onClose={()=>setUsernameEditing(false)}><ChairUsernameForm embedded /><button type="button" onClick={()=>setUsernameEditing(false)} className="mt-4 rounded-lg border border-neutral-300 px-3 py-2 text-sm">Cancel</button></Modal>
      <Modal open={emailEditing} title="Edit email" onClose={()=>setEmailEditing(false)}><EmailForm embedded /><button type="button" onClick={()=>setEmailEditing(false)} className="mt-4 rounded-lg border border-neutral-300 px-3 py-2 text-sm">Cancel</button></Modal>
    </section>
  );
}

