import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'plain' | 'elevated' | 'glass' | 'ai';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface border border-border rounded-lg shadow-card',
      plain: '',
      elevated: 'bg-surface shadow-md rounded-lg',
      glass: 'backdrop-blur-md bg-white/60 dark:bg-black/30 border border-border/50 rounded-lg',
      ai: 'bg-brand-50/50 border-l-[3px] border-l-brand-500 border border-y-border border-r-border rounded-r-lg shadow-sm',
    };

    return (
      <div
        ref={ref}
        className={twMerge(clsx(variants[variant], className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx('flex flex-col space-y-1.5 p-6 pb-4 border-b border-border', className))}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge(clsx('font-semibold leading-none tracking-tight text-h4', className))}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx('p-6 py-4', className))} {...props} />
  )
);
CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(clsx('flex items-center pt-4 p-6 border-t border-border', className))}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
