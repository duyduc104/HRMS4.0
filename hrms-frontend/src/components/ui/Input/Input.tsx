import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, leftIcon, rightIcon, inputSize = 'md', label, ...props }, ref) => {
    const sizes = {
      sm: 'h-8 text-sm px-3',
      md: 'h-9 text-sm px-3',
      lg: 'h-11 text-base px-4',
    };

    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {hasLeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              clsx(
                'block w-full rounded-md border text-text-primary bg-surface dark:bg-surface-alt transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-border',
                sizes[inputSize],
                hasLeftIcon ? 'pl-9' : '',
                hasRightIcon ? 'pr-9' : '',
                className
              )
            )}
            {...props}
          />
          {hasRightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p className={clsx('mt-1.5 text-xs', error ? 'text-red-500' : 'text-text-muted')}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
