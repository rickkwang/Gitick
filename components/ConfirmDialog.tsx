import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'default',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-lg border border-primary-200 bg-primary-50 p-6 shadow-lg dark:border-dark-border dark:bg-dark-bg">
        <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text">{title}</h3>
        <p className="mt-2 text-sm text-primary-600 dark:text-dark-text">{description}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-primary-200 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
              confirmTone === 'danger'
                ? 'bg-[var(--status-danger-text)] hover:brightness-95'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-strong)] dark:bg-[var(--accent)] dark:hover:bg-[var(--accent-strong)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
