import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
      secondary: 'bg-surface-alt text-text-primary hover:bg-border',
      ghost: 'text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20',
      danger: 'bg-red-500 text-white hover:bg-red-600',
      outline: 'border border-border text-text-primary hover:bg-surface-alt',
    };

    const sizes = {
      xs: 'h-7 px-2.5 text-xs rounded-sm',
      sm: 'h-8 px-3 text-sm rounded-md',
      md: 'h-9 px-4 text-sm rounded-md',
      lg: 'h-11 px-6 text-base rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
