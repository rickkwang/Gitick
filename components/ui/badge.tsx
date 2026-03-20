import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 font-semibold rounded-full transition-colors duration-200',
          size === 'sm' && 'text-[10px] px-2 py-0.5',
          size === 'md' && 'text-xs px-2.5 py-1',
          variant === 'default' && 'text-primary-500 dark:text-dark-muted bg-primary-200/50 dark:bg-dark-border border border-primary-200/70 dark:border-dark-border/80',
          variant === 'danger' && 'text-[var(--status-danger-text)] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)]',
          variant === 'warning' && 'text-[var(--status-warn-text)] bg-[var(--status-warn-bg)] border border-[var(--status-warn-border)]',
          variant === 'success' && 'text-[var(--status-success-text)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)]',
          variant === 'info' && 'text-[var(--status-info-text)] bg-[var(--status-info-bg)] border border-[var(--status-info-border)]',
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = 'Badge';
