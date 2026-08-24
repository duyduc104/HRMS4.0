import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'inactive' | 'pending' | 'danger' | 'info' | 'default';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface-alt text-text-primary border border-border',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-surface-alt text-text-muted',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
      danger: 'bg-red-100 text-red-700 dark:bg-red-900/30',
      info: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30',
    };

    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
            variants[variant],
            className
          )
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
