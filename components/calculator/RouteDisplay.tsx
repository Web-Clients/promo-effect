import React from 'react';
import { cn } from '../../lib/utils';
import { ArrowRightIcon } from './Icons';

export const RouteDisplay = ({ route }: { route: string }) => {
  const parts = route.split(' → ');
  return (
    /* Wraps rather than overflowing: the offer cards now sit in a grid and a
       three-leg route does not fit on one line in a narrow cell. */
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          <span
            className={cn(
              'px-2 py-1 rounded',
              idx === 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : idx === parts.length - 1
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
            )}
          >
            {part}
          </span>
          {idx < parts.length - 1 && <ArrowRightIcon />}
        </React.Fragment>
      ))}
    </div>
  );
};
