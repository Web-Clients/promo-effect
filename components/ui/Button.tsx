import React from 'react';
import { cn } from '../../lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Primary - Deep Navy (Flexport style)
        variant === 'primary' &&
          'bg-primary-800 text-white hover:bg-primary-700 shadow-sm hover:shadow-md focus:ring-primary-500',

        // Accent - Teal/Green (Call to action)
        variant === 'accent' &&
          'bg-accent-500 text-white hover:bg-accent-600 shadow-sm hover:shadow-md focus:ring-accent-500',

        // Secondary - Light background
        variant === 'secondary' &&
          'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 focus:ring-primary-500',

        // Outline - Border only
        variant === 'outline' &&
          'bg-transparent border-2 border-primary-800 text-primary-800 dark:border-primary-400 dark:text-primary-400 hover:bg-primary-800 hover:text-white dark:hover:bg-primary-400 dark:hover:text-white focus:ring-primary-500',

        // Ghost - No background
        variant === 'ghost' &&
          'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:ring-primary-500',

        // Danger - Red for destructive actions
        variant === 'danger' &&
          'bg-error-500 text-white hover:bg-error-600 shadow-sm hover:shadow-md focus:ring-error-500',

        // Sizes
        size === 'sm' && 'px-3 py-1.5 text-sm rounded-lg',
        size === 'md' && 'px-4 py-2.5 text-sm rounded-lg',
        size === 'lg' && 'px-6 py-3 text-base rounded-xl',
        size === 'icon' && 'min-h-[44px] min-w-[44px] h-11 w-11 rounded-lg',

        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
      <span className={cn('flex items-center justify-center gap-2', loading && 'opacity-0')}>
        {children}
      </span>
    </button>
  );
};
