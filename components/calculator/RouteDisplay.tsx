import React from 'react';
import { cn } from '../../lib/utils';
import { ArrowRightIcon } from './Icons';

export const RouteDisplay = ({ route }: { route: string }) => {
  const parts = route.split(' → ');
  return (
    <div className="flex items-center gap-2 text-sm">
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
