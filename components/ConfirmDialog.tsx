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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-black dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-300">{description}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors dark:text-black ${
              confirmTone === 'danger'
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-400 dark:hover:bg-red-300'
                : 'bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
