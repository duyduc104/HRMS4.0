import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  status?: 'online' | 'offline' | 'away';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', status, ...props }, ref) => {
    const sizes = {
      xs: 'w-6 h-6 text-[10px]',
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
      xxl: 'w-32 h-32 text-4xl',
    };

    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-yellow-500',
    };

    const statusSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4 text-lg border-2',
      xxl: 'w-6 h-6 border-4',
    };

    return (
      <div
        ref={ref}
        className={twMerge(clsx('relative inline-block', className))}
        {...props}
      >
        <div
          className={clsx(
            'relative flex items-center justify-center overflow-hidden rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 font-medium',
            sizes[size]
          )}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{fallback || (alt ? alt.slice(0, 2).toUpperCase() : '??')}</span>
          )}
        </div>
        {status && (
          <span
            className={clsx(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-surface',
              statusColors[status],
              statusSizes[size]
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
