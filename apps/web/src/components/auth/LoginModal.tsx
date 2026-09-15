import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { z } from 'zod';
import { loginRequest } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginModal(): JSX.Element | null {
  const isOpen = useUiStore((s) => s.isLoginModalOpen);
  const closeLoginModal = useUiStore((s) => s.closeLoginModal);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleClose = useCallback(() => {
    closeLoginModal();
  }, [closeLoginModal]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setFieldErrors({});
    setServerError(null);
    setPending(true);
    try {
      const result = await loginRequest(parsed.data.email, parsed.data.password);
      login({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
      handleClose();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setPassword('');
      setServerError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            aria-hidden="true"
            data-testid="login-modal-backdrop"
            onClick={handleClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-20px_rgba(16,36,26,0.35)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.25 }}
          >
            <div aria-hidden="true" className="h-1.5 w-full bg-gradient-to-r from-leaf-500 via-leaf-300 to-leaf-500" />
            <div className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-leaf-500 shadow-[0_0_0_4px_rgba(47,191,113,0.18)]" />
                <span className="text-sm font-bold text-ink">FlowSched</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close login dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-50 text-xl leading-none text-ink/40 hover:bg-leaf-100 hover:text-ink"
              >
                ×
              </button>
            </div>
            <h1 id="login-title" className="mt-6 text-2xl font-bold text-ink">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-ink/50">
              Sign in to your FlowSched account.
            </p>
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              {serverError ? (
                <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    !
                  </span>
                  <span>{serverError}</span>
                </div>
              ) : null}
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-ink/70">
                  Email
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA396]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-[#FBFEFC] py-3 pl-10 pr-3.5 text-sm outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15"
                  />
                </div>
                {fieldErrors.email ? <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p> : null}
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-ink/70">
                  Password
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA396]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-leaf-100 bg-[#FBFEFC] py-3 pl-10 pr-3.5 text-sm outline-none transition-colors focus:border-leaf-500 focus:bg-white focus:ring-4 focus:ring-leaf-500/15"
                  />
                </div>
                {fieldErrors.password ? <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p> : null}
              </div>
              {/* TODO: wire remember-me once backend supports it. Forgot password is a placeholder until a support route exists. */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-ink/70">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-leaf-500" />
                  Remember me
                </label>
                <span className="cursor-pointer font-semibold text-leaf-700">Forgot password?</span>
              </div>
              <motion.button
                type="submit"
                disabled={pending}
                whileHover={reduce ? undefined : { scale: 1.03 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className="w-full rounded-xl bg-gradient-to-b from-leaf-400 to-leaf-600 py-3.5 font-bold text-white shadow-[0_12px_26px_-10px_rgba(31,143,82,0.55)] transition-shadow hover:shadow-[0_16px_30px_-10px_rgba(31,143,82,0.65)] disabled:opacity-50"
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </motion.button>
            </form>
            <div className="mt-6 flex items-center gap-2.5">
              <span aria-hidden="true" className="h-px flex-1 bg-leaf-100" />
              <span className="text-[11px] text-ink/40">FlowSched · Industrial Engineering Dept.</span>
              <span aria-hidden="true" className="h-px flex-1 bg-leaf-100" />
            </div>
            <p className="mt-3 text-center text-xs text-ink/50">
              Having trouble? Contact your <span className="font-bold text-leaf-700">department administrator</span>.
            </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
