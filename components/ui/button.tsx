import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Size variants
          size === 'sm' && 'h-8 px-3 text-xs',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-sm',
          // Style variants
          variant === 'default' && 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] shadow-sm',
          variant === 'danger' && 'bg-[var(--status-danger-text)] text-white hover:brightness-95',
          variant === 'ghost' && 'bg-transparent text-primary-700 dark:text-dark-muted hover:bg-primary-100 dark:hover:bg-dark-border/50',
          variant === 'outline' && 'border border-primary-200 dark:border-dark-border bg-transparent text-primary-700 dark:text-dark-muted hover:bg-primary-100 dark:hover:bg-dark-border/50',
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
