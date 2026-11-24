import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  pushToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 4500;
const TOAST_STYLES: Record<ToastType, string> = {
  success: 'toast-success',
  error: 'toast-error',
  warning: 'toast-warning',
  info: 'toast-info',
};
const TOAST_LABELS: Record<ToastType, string> = {
  success: 'Well done!',
  error: 'Oops!',
  warning: 'Heads up!',
  info: 'A little note',
};
const TOAST_ICONS: Record<ToastType, string> = { success: '✿', error: '!', warning: '⚠', info: '✦' };

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduce = useReducedMotion();
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = nextIdRef.current++;
    setToasts((current) => [...current, { id, type, message }]);
    timersRef.current.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS));
  }, [dismiss]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-label="Notifications" aria-live="polite" className="toast-viewport fixed bottom-20 right-8 z-[100] flex w-[min(92vw,28rem)] flex-col items-end gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
              className={`toast-card ${TOAST_STYLES[toast.type]}`}
            >
              {toast.type === 'success' && (
                <span className="toast-confetti" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, i) => <i key={i} />)}
                </span>
              )}
              <span className="toast-icon" aria-hidden="true">{TOAST_ICONS[toast.type]}</span>
              <p className="toast-copy"><strong>{TOAST_LABELS[toast.type]}</strong><span>{toast.message}</span></p>
              <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
