/**
 * BookingsBadges — Phase A4
 * Visual TLX (telex release) and DOC (documents uploaded) badges.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface TlxBadgeProps {
  active: boolean;
  className?: string;
}

export const TlxBadge: React.FC<TlxBadgeProps> = ({ active, className }) => {
  if (!active) {
    return <span className={cn('text-neutral-300 dark:text-neutral-600 text-xs', className)}>—</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 text-xs font-semibold rounded',
        className
      )}
      title="Telex release confirmat"
    >
      TLX
    </span>
  );
};

interface DocBadgeProps {
  active: boolean;
  className?: string;
}

export const DocBadge: React.FC<DocBadgeProps> = ({ active, className }) => {
  if (!active) {
    return <span className={cn('text-neutral-300 dark:text-neutral-600 text-xs', className)}>—</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-semibold rounded',
        className
      )}
      title="Documente încărcate"
    >
      DOC
    </span>
  );
};

interface StatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  SUBMITTED: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  CONFIRMED: 'bg-info-100 text-info-700 dark:bg-info-500/20 dark:text-info-400',
  IN_TRANSIT: 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
  DELIVERED: 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500',
  CANCELLED: 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-400',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
        STATUS_COLORS[status] || STATUS_COLORS['DRAFT'],
        className
      )}
    >
      {label}
    </span>
  );
};
