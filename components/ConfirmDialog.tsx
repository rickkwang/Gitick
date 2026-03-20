import React, { useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { cn } from '../lib/utils';

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

// Type-specific icons
const DialogIcon: React.FC<{ tone: 'default' | 'danger' }> = ({ tone }) => {
  if (tone === 'danger') {
    return (
      <div className="w-10 h-10 rounded-full bg-[var(--status-danger-bg)] flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--status-danger-text)]"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--accent)]"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>
  );
};

const ConfirmDialogComponent: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'default',
  onConfirm,
  onCancel,
}) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      previousActiveElement.current?.focus();
      previousActiveElement.current = null;
      return;
    }

    previousActiveElement.current = document.activeElement as HTMLElement;

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
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-200" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl border border-primary-200 dark:border-dark-border bg-primary-50 dark:bg-dark-bg shadow-xl overflow-hidden animate-view-breathe">
        <div className="p-6">
          {/* Icon and Title Row */}
          <div className="flex items-start gap-4">
            <DialogIcon tone={confirmTone} />
            <div className="flex-1 min-w-0">
              <h3 id="confirm-dialog-title" className="text-lg font-semibold text-primary-900 dark:text-dark-text leading-tight">
                {title}
              </h3>
              <p className="mt-2 text-sm text-primary-600 dark:text-dark-muted leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'h-10 rounded-xl border px-4 text-sm font-medium transition-all duration-200',
              'border-primary-200 text-primary-700',
              'hover:bg-primary-100 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border',
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'h-10 rounded-xl px-4 text-sm font-semibold text-white transition-all duration-200',
              confirmTone === 'danger'
                ? 'bg-[var(--status-danger-text)] hover:brightness-95 shadow-sm'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-strong)] shadow-sm',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmDialog = React.memo(ConfirmDialogComponent);
