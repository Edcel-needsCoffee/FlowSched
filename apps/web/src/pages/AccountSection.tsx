import type { ReactNode } from 'react';

/**
 * Shared chrome for the Account Settings cards — icon tile + title +
 * description header over a glass surface — plus the form style tokens the
 * three sections (email, password, PIN reset) reuse so they stay consistent.
 */

export const inputCls = 'glass-input';
export const btnPrimaryCls =
  'rounded-xl bg-gradient-to-b from-brand-400 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(50,100,230,0.6)] transition-shadow hover:shadow-[0_14px_26px_-10px_rgba(50,100,230,0.75)] disabled:opacity-50';
export const btnSecondaryCls =
  'rounded-xl border border-brand-500/25 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-500/10 disabled:opacity-50';
export const fieldErrorCls =
  'rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700';

export function AccountSectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="glass-card animate-fade-up p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-brand-400/20 to-brand-500/10 text-brand-500 ring-1 ring-brand-500/20"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icon}
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Lucide-style 24×24 stroke icons for the account sections. */
export const accountIcons = {
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </>
  ),
  key: (
    <>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
};
