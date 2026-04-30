import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn('animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded', className)}
    aria-hidden="true"
  />
);

/** Skeleton preset for a table row */
export const SkeletonTableRow = ({ cols = 6 }: { cols?: number }) => (
  <tr aria-hidden="true">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

/** Skeleton preset for a stat/KPI card */
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('p-4 space-y-3', className)} aria-hidden="true">
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-7 w-2/3" />
    <Skeleton className="h-3 w-1/3" />
  </div>
);
