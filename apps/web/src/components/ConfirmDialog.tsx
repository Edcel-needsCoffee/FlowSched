import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive-action confirmation (ui-ux.md §5: confirm before delete). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmDanger = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  return (
    <Modal open={open} title={title} onClose={pending ? () => undefined : onCancel} dialogClassName={confirmDanger ? 'confirm-dialog-danger' : ''}>
      {confirmDanger ? (
        <div className="confirm-dialog-danger__content">
          <div className="confirm-dialog-danger__message">
            <span className="confirm-dialog-danger__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5m0 3h.01M10.3 3.9 1.9 18.4A1.8 1.8 0 0 0 3.5 21h17a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
            </span>
            <div>
              <p className="confirm-dialog-danger__eyebrow">Withdrawal notice</p>
              <p className="confirm-dialog-danger__copy">{message}</p>
            </div>
          </div>
          <div className="confirm-dialog-danger__actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="confirm-dialog-danger__cancel"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="confirm-dialog-danger__confirm"
            >
              {pending ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      ) : (
      <>
        <p className="text-sm text-slate-700">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`rounded border px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirmDanger ? 'border-red-800 bg-red-600 hover:bg-red-700' : 'border-[#171717] bg-[#171717] font-medium hover:bg-[#404040]'}`}
        >
          {pending ? 'Working…' : confirmLabel}
        </button>
        </div>
      </>
      )}
    </Modal>
  );
}
